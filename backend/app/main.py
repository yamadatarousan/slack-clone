from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from typing import List
import json
import asyncio
import logging
from sqlalchemy.orm import Session

from app.routers import auth, channels, messages, files, search
from app.database.base import engine, get_db
from app.database.models import Base, User

# ログ設定
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('logs/app.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

app = FastAPI(title="Slack Clone API", version="1.0.0")

# Create database tables
Base.metadata.create_all(bind=engine)

# CORS設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 本番環境では適切に設定
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API routers
app.include_router(auth.router, prefix="/auth", tags=["authentication"])
app.include_router(channels.router, prefix="/channels", tags=["channels"])
app.include_router(messages.router, prefix="/messages", tags=["messages"])
app.include_router(files.router, prefix="/files", tags=["files"])
app.include_router(search.router, prefix="/search", tags=["search"])

# WebSocket接続管理
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.user_connections: dict = {}  # user_id -> websocket

    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        self.active_connections.append(websocket)
        self.user_connections[user_id] = websocket
        print(f"User {user_id} connected. Total connections: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket, user_id: str):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        if user_id in self.user_connections:
            del self.user_connections[user_id]
        print(f"User {user_id} disconnected. Total connections: {len(self.active_connections)}")

    async def send_personal_message(self, message: str, user_id: str):
        if user_id in self.user_connections:
            websocket = self.user_connections[user_id]
            await websocket.send_text(message)

    async def broadcast(self, message: str):
        print(f"📡 Broadcasting to {len(self.active_connections)} connections: {message}")
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except Exception as e:
                print(f"Failed to send message to connection: {e}")

    async def broadcast_to_channel(self, message: str, channel_id: str):
        # TODO: 本来はチャンネルメンバーのみに送信すべきだが、
        # 現在は簡単化のため全ユーザーに送信
        print(f"📡 Broadcasting to channel {channel_id}: {message}")
        await self.broadcast(message)

manager = ConnectionManager()

@app.get("/")
async def root():
    return {"message": "Slack Clone API Server", "status": "running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

@app.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str):
    await manager.connect(websocket, user_id)
    db = next(get_db())
    try:
        # 接続通知を他のユーザーに送信
        await manager.broadcast(json.dumps({
            "type": "user_connected",
            "user_id": user_id,
            "timestamp": asyncio.get_event_loop().time()
        }))
        
        while True:
            # クライアントからのメッセージを待機
            data = await websocket.receive_text()
            message_data = json.loads(data)
            
            # メッセージタイプに応じて処理
            if message_data["type"] == "message":
                # ユーザー情報を取得
                user = db.query(User).filter(User.id == int(user_id)).first()
                sender_name = user.display_name if user and user.display_name else (user.username if user else f"User{user_id}")
                
                # チャンネルメッセージの場合
                broadcast_message = {
                    "type": "message",
                    "user_id": user_id,
                    "channel_id": message_data.get("channel_id", "general"),
                    "content": message_data["content"],
                    "sender_name": sender_name,
                    "timestamp": asyncio.get_event_loop().time()
                }
                print(f"📨 Sending message from user {user_id} ({sender_name}) to channel {message_data.get('channel_id', 'general')}: {message_data['content']}")
                await manager.broadcast_to_channel(
                    json.dumps(broadcast_message),
                    message_data.get("channel_id", "general")
                )
            
            elif message_data["type"] == "typing":
                # ユーザー情報を取得
                user = db.query(User).filter(User.id == int(user_id)).first()
                user_name = user.display_name if user and user.display_name else (user.username if user else f"User{user_id}")
                
                # タイピング中の通知
                typing_message = {
                    "type": "typing",
                    "user_id": user_id,
                    "channel_id": message_data.get("channel_id", "general"),
                    "is_typing": message_data.get("is_typing", False),
                    "user_name": user_name
                }
                await manager.broadcast_to_channel(
                    json.dumps(typing_message),
                    message_data.get("channel_id", "general")
                )
                
    except WebSocketDisconnect:
        manager.disconnect(websocket, user_id)
        # 切断通知を他のユーザーに送信
        await manager.broadcast(json.dumps({
            "type": "user_disconnected",
            "user_id": user_id,
            "timestamp": asyncio.get_event_loop().time()
        }))
    finally:
        db.close()

# テスト用のREST API
@app.post("/send-message")
async def send_message(message: dict):
    """テスト用: REST APIでメッセージを送信"""
    broadcast_message = {
        "type": "message",
        "user_id": message.get("user_id", "system"),
        "channel_id": message.get("channel_id", "general"),
        "content": message["content"],
        "timestamp": asyncio.get_event_loop().time()
    }
    await manager.broadcast(json.dumps(broadcast_message))
    return {"status": "message sent"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)