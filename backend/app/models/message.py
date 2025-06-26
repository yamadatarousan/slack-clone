from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from enum import Enum

class MessageType(str, Enum):
    TEXT = "text"
    IMAGE = "image"
    FILE = "file"
    SYSTEM = "system"

class MessageBase(BaseModel):
    content: str
    channel_id: int
    message_type: Optional[str] = "text"
    parent_message_id: Optional[int] = None  # スレッド返信の場合

class MessageCreate(MessageBase):
    pass

class MessageResponse(BaseModel):
    id: int
    content: str
    channel_id: int
    user_id: int  # Updated field name
    message_type: str = "text"
    thread_id: Optional[int] = None  # Updated field name
    edited: bool = False  # Updated field name
    created_at: datetime
    updated_at: datetime
    
    # Relationships
    sender: Optional[dict] = None
    reactions: Optional[List[dict]] = None
    reply_count: Optional[int] = 0
    
    class Config:
        from_attributes = True

class MessageUpdate(BaseModel):
    content: Optional[str] = None

class ReactionBase(BaseModel):
    emoji: str

class ReactionCreate(ReactionBase):
    pass