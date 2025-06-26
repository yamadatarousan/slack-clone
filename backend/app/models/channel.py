from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from enum import Enum

class ChannelType(str, Enum):
    PUBLIC = "public"
    PRIVATE = "private"
    DIRECT_MESSAGE = "dm"

class ChannelBase(BaseModel):
    name: str
    description: Optional[str] = None
    is_private: bool = False
    is_direct_message: bool = False

class ChannelCreate(ChannelBase):
    pass

class ChannelResponse(ChannelBase):
    id: int
    channel_type: str  # Add the actual field used in database
    is_archived: bool = False
    created_by: int
    created_at: datetime
    updated_at: datetime
    member_count: int = 0
    
    class Config:
        from_attributes = True

class ChannelUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_private: Optional[bool] = None

class ChannelMemberBase(BaseModel):
    channel_id: int
    user_id: int
    role: str = "member"  # member, admin, owner

class ChannelMemberCreate(ChannelMemberBase):
    pass

class ChannelMemberResponse(ChannelMemberBase):
    joined_at: datetime
    
    class Config:
        from_attributes = True