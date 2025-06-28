from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class DraftBase(BaseModel):
    content: str
    channel_id: int
    reply_to_id: Optional[int] = None

class DraftCreate(DraftBase):
    pass

class DraftUpdate(BaseModel):
    content: Optional[str] = None
    reply_to_id: Optional[int] = None

class DraftResponse(BaseModel):
    id: int
    content: str
    channel_id: int
    user_id: int
    reply_to_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    reply_to: Optional[dict] = None  # 引用元メッセージ
    
    class Config:
        from_attributes = True