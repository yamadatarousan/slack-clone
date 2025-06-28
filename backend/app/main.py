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
        self.connection_times: dict = {}  # user_id -> timestamp

    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        self.active_connections.append(websocket)
        self.user_connections[user_id] = websocket
        self.connection_times[user_id] = asyncio.get_event_loop().time()
        print(f"User {user_id} connected. Total connections: {len(self.active_connections)}")
        print(f"Currently connected users: {list(self.user_connections.keys())}")

    def disconnect(self, websocket: WebSocket, user_id: str):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        if user_id in self.user_connections:
            del self.user_connections[user_id]
        if user_id in self.connection_times:
            del self.connection_times[user_id]
        print(f"User {user_id} disconnected. Total connections: {len(self.active_connections)}")

    async def send_personal_message(self, message: str, user_id: str):
        if user_id in self.user_connections:
            websocket = self.user_connections[user_id]
            await websocket.send_text(message)

    async def broadcast(self, message: str):
        print(f"📡 Broadcasting to {len(self.active_connections)} connections: {message}")
        print(f"📡 Active user IDs: {list(self.user_connections.keys())}")
        success_count = 0
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
                success_count += 1
            except Exception as e:
                print(f"❌ Failed to send message to connection: {e}")
        print(f"📡 Successfully sent to {success_count}/{len(self.active_connections)} connections")

    async def broadcast_to_channel(self, message: str, channel_id: str):
        # TODO: 本来はチャンネルメンバーのみに送信すべきだが、
        # 現在は簡単化のため全ユーザーに送信
        print(f"📡 Broadcasting to channel {channel_id}: {message}")
        await self.broadcast(message)

manager = ConnectionManager()

# 定期的に古い接続をクリーンアップするタスク
async def cleanup_stale_connections():
    while True:
        await asyncio.sleep(30)  # 30秒ごとにチェック
        current_time = asyncio.get_event_loop().time()
        stale_users = []
        
        for user_id, connect_time in manager.connection_times.items():
            # 5分以上前の接続で、ping応答がない場合は切断とみなす
            if current_time - connect_time > 300:  # 5 minutes
                websocket = manager.user_connections.get(user_id)
                if websocket:
                    try:
                        await websocket.ping()
                        # pingが成功したら接続時間を更新
                        manager.connection_times[user_id] = current_time
                    except:
                        # pingが失敗したら切断とみなす
                        stale_users.append(user_id)
        
        # 古い接続を削除
        for user_id in stale_users:
            websocket = manager.user_connections.get(user_id)
            if websocket:
                manager.disconnect(websocket, user_id)
                
                # 切断通知をブロードキャスト
                db = next(get_db())
                try:
                    user = db.query(User).filter(User.id == int(user_id)).first()
                    user_name = user.username if user else f"User{user_id}"
                    display_name = user.display_name if user and user.display_name else None
                    
                    disconnect_message = json.dumps({
                        "type": "user_disconnected",
                        "user_id": user_id,
                        "username": user_name,
                        "display_name": display_name,
                        "timestamp": current_time
                    })
                    print(f"🧹 Cleanup: Broadcasting disconnect for stale user {user_id}")
                    await manager.broadcast(disconnect_message)
                finally:
                    db.close()

# クリーンアップタスクは後で開始する
cleanup_task = None

@app.on_event("startup")
async def startup_event():
    global cleanup_task
    cleanup_task = asyncio.create_task(cleanup_stale_connections())

@app.on_event("shutdown")
async def shutdown_event():
    global cleanup_task
    if cleanup_task:
        cleanup_task.cancel()

@app.get("/")
async def root():
    return {"message": "Slack Clone API Server", "status": "running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

@app.get("/online-users")
async def get_online_users():
    """現在接続中のユーザーリストを返す"""
    db = next(get_db())
    try:
        online_user_ids = list(manager.user_connections.keys())
        users = []
        for user_id in online_user_ids:
            user = db.query(User).filter(User.id == int(user_id)).first()
            if user:
                users.append({
                    "id": user.id,
                    "username": user.username,
                    "display_name": user.display_name,
                    "is_online": True
                })
        return {"online_users": users, "count": len(users)}
    finally:
        db.close()

@app.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str):
    await manager.connect(websocket, user_id)
    db = next(get_db())
    
    # Set up ping task for heartbeat
    ping_task = None
    
    async def send_ping():
        while True:
            try:
                await asyncio.sleep(30)  # Send ping every 30 seconds
                if websocket.client_state.value == 1:  # CONNECTED
                    await websocket.ping()
                    print(f"📡 Sent ping to user {user_id}")
                else:
                    print(f"🔴 WebSocket not connected for user {user_id}, stopping ping")
                    break
            except Exception as e:
                print(f"🔴 Ping failed for user {user_id}: {e}")
                # Force disconnect handling
                manager.disconnect(websocket, user_id)
                user = db.query(User).filter(User.id == int(user_id)).first()
                user_name = user.username if user else f"User{user_id}"
                display_name = user.display_name if user and user.display_name else None
                
                disconnect_message = json.dumps({
                    "type": "user_disconnected",
                    "user_id": user_id,
                    "username": user_name,
                    "display_name": display_name,
                    "timestamp": asyncio.get_event_loop().time()
                })
                print(f"🔴 Broadcasting user_disconnected event after ping failure: {disconnect_message}")
                await manager.broadcast(disconnect_message)
                break
    
    try:
        # ユーザー情報を取得
        user = db.query(User).filter(User.id == int(user_id)).first()
        user_name = user.username if user else f"User{user_id}"
        display_name = user.display_name if user and user.display_name else None
        
        # 既存のオンラインユーザーリストを新規ユーザーに送信
        for existing_user_id in manager.user_connections.keys():
            if existing_user_id != user_id:  # 自分以外のユーザー
                existing_user = db.query(User).filter(User.id == int(existing_user_id)).first()
                if existing_user:
                    await websocket.send_text(json.dumps({
                        "type": "user_connected",
                        "user_id": existing_user_id,
                        "username": existing_user.username,
                        "display_name": existing_user.display_name,
                        "timestamp": asyncio.get_event_loop().time()
                    }))
        
        # 接続通知を他のユーザーに送信（自分には送らない）
        user_connected_message = json.dumps({
            "type": "user_connected",
            "user_id": user_id,
            "username": user_name,
            "display_name": display_name,
            "timestamp": asyncio.get_event_loop().time()
        })
        print(f"🟢 Broadcasting user_connected event: {user_connected_message}")
        await manager.broadcast(user_connected_message)
        
        # Start ping task
        ping_task = asyncio.create_task(send_ping())
        
        while True:
            try:
                # クライアントからのメッセージを待機（タイムアウト付き）
                data = await asyncio.wait_for(websocket.receive_text(), timeout=60.0)
                message_data = json.loads(data)
            except asyncio.TimeoutError:
                # 60秒間メッセージがなければ接続をチェック
                print(f"🔍 No message received for 60s from user {user_id}, checking connection")
                try:
                    await websocket.ping()
                    print(f"📡 Connection check ping successful for user {user_id}")
                    continue
                except Exception as ping_error:
                    print(f"🔴 Connection check ping failed for user {user_id}: {ping_error}")
                    raise WebSocketDisconnect(code=1001, reason="Connection timeout")
            except Exception as e:
                print(f"🔴 Error receiving message from user {user_id}: {e}")
                raise
            
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
        print(f"🔴 WebSocket disconnect detected for user {user_id}")
        manager.disconnect(websocket, user_id)
        
        # ユーザー情報を取得（既に取得済みの場合はそのまま使用）
        if 'user' not in locals():
            user = db.query(User).filter(User.id == int(user_id)).first()
            user_name = user.username if user else f"User{user_id}"
            display_name = user.display_name if user and user.display_name else None
        
        # 切断通知を他のユーザーに送信
        disconnect_message = json.dumps({
            "type": "user_disconnected",
            "user_id": user_id,
            "username": user_name,
            "display_name": display_name,
            "timestamp": asyncio.get_event_loop().time()
        })
        print(f"🔴 Broadcasting user_disconnected event: {disconnect_message}")
        await manager.broadcast(disconnect_message)
    except Exception as e:
        print(f"🚨 Unexpected error in WebSocket endpoint for user {user_id}: {e}")
        manager.disconnect(websocket, user_id)
        
        # 予期しないエラーでも切断通知を送信
        if 'user' not in locals():
            user = db.query(User).filter(User.id == int(user_id)).first()
            user_name = user.username if user else f"User{user_id}"
            display_name = user.display_name if user and user.display_name else None
        
        disconnect_message = json.dumps({
            "type": "user_disconnected",
            "user_id": user_id,
            "username": user_name,
            "display_name": display_name,
            "timestamp": asyncio.get_event_loop().time()
        })
        print(f"🔴 Broadcasting user_disconnected event after error: {disconnect_message}")
        await manager.broadcast(disconnect_message)
    finally:
        # Cancel ping task if it exists
        if ping_task and not ping_task.done():
            ping_task.cancel()
            print(f"🔴 Cancelled ping task for user {user_id}")
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