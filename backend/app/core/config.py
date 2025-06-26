from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    # アプリケーション設定
    app_name: str = "Slack Clone"
    debug: bool = True
    
    # データベース設定
    database_url: str = "mysql+pymysql://root@localhost:3306/slack_clone"
    
    # セキュリティ設定
    secret_key: str = "your-secret-key-change-this-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    
    # CORS設定
    allowed_origins: list = ["*"]
    
    # WebSocket設定
    websocket_heartbeat_interval: int = 30
    
    class Config:
        env_file = ".env"

settings = Settings()