from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Optional

from app.database.base import get_db
from app.database.models import Message, Channel, User, channel_members, Reaction
from app.models.message import MessageResponse
from app.routers.auth import get_current_user

router = APIRouter()


@router.get("/messages", response_model=List[MessageResponse])
def search_messages(
    q: str = Query(..., description="Search query"),
    channel_id: Optional[int] = Query(None, description="Channel ID to search in"),
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """メッセージを検索"""
    if len(q.strip()) < 2:
        raise HTTPException(status_code=400, detail="Search query must be at least 2 characters")
    
    # Build search query
    search_query = db.query(Message)
    
    # Filter by content (case-insensitive search)
    search_query = search_query.filter(Message.content.ilike(f"%{q}%"))
    
    # If channel_id is specified, filter by it
    if channel_id:
        # Check if user has access to the channel
        channel = db.query(Channel).filter(Channel.id == channel_id).first()
        if not channel:
            raise HTTPException(status_code=404, detail="Channel not found")
        
        member = db.query(channel_members).filter(
            channel_members.c.user_id == current_user.id,
            channel_members.c.channel_id == channel_id
        ).first()
        
        if not member and channel.channel_type == 'private':
            raise HTTPException(status_code=403, detail="Access denied to this channel")
        
        search_query = search_query.filter(Message.channel_id == channel_id)
    else:
        # Get all channels the user has access to
        user_channels = db.query(channel_members.c.channel_id).filter(
            channel_members.c.user_id == current_user.id
        ).subquery()
        
        public_channels = db.query(Channel.id).filter(
            Channel.channel_type == 'public'
        ).subquery()
        
        # Filter messages to only those in accessible channels
        accessible_channel_ids = db.query(Channel.id).filter(
            or_(
                Channel.id.in_(user_channels),
                Channel.id.in_(public_channels)
            )
        ).subquery()
        
        search_query = search_query.filter(Message.channel_id.in_(accessible_channel_ids))
    
    # Order by most recent first and apply pagination
    messages = search_query.order_by(Message.created_at.desc()).offset(skip).limit(limit).all()
    
    # Manually serialize the response to avoid relationship loading issues
    search_results = []
    for msg in messages:
        # Get sender information separately
        sender = db.query(User).filter(User.id == msg.user_id).first()
        sender_data = None
        if sender:
            sender_data = {
                "id": sender.id,
                "username": sender.username,
                "display_name": sender.display_name,
                "avatar_url": sender.avatar_url,
                "status": sender.status,
                "is_online": sender.is_online
            }
        
        # Get reactions for this message
        reactions = db.query(Reaction).filter(Reaction.message_id == msg.id).all()
        reaction_data = []
        for reaction in reactions:
            reaction_user = db.query(User).filter(User.id == reaction.user_id).first()
            reaction_data.append({
                "id": reaction.id,
                "emoji": reaction.emoji,
                "user_id": reaction.user_id,
                "user": {
                    "id": reaction_user.id,
                    "username": reaction_user.username,
                    "display_name": reaction_user.display_name
                } if reaction_user else None,
                "created_at": reaction.created_at
            })
        
        message_data = {
            "id": msg.id,
            "content": msg.content,
            "channel_id": msg.channel_id,
            "user_id": msg.user_id,
            "message_type": msg.message_type,
            "thread_id": msg.thread_id,
            "edited": msg.edited,
            "created_at": msg.created_at,
            "updated_at": msg.updated_at,
            "sender": sender_data,
            "reactions": reaction_data,
            "reply_count": 0
        }
        search_results.append(message_data)
    
    return search_results