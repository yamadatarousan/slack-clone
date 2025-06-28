from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
import logging

from app.database.base import get_db
from app.database.models import MessageDraft, Channel, User, channel_members, Message
from app.models.draft import DraftCreate, DraftResponse, DraftUpdate
from app.routers.auth import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/channel/{channel_id}", response_model=Optional[DraftResponse])
def get_channel_draft(
    channel_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """指定チャンネルのユーザーのドラフトを取得"""
    # Check if channel exists and user has access
    channel = db.query(Channel).filter(Channel.id == channel_id).first()
    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found")
    
    # Check if user is a member of the channel
    member = db.query(channel_members).filter(
        channel_members.c.user_id == current_user.id,
        channel_members.c.channel_id == channel_id
    ).first()
    
    if not member and channel.channel_type == 'private':
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Get draft
    draft = db.query(MessageDraft).filter(
        MessageDraft.channel_id == channel_id,
        MessageDraft.user_id == current_user.id
    ).first()
    
    if not draft:
        return None
    
    # Get quoted message data if this is a quoted reply
    reply_to_data = None
    if draft.reply_to_id:
        quoted_message = db.query(Message).filter(Message.id == draft.reply_to_id).first()
        if quoted_message:
            quoted_sender = db.query(User).filter(User.id == quoted_message.user_id).first()
            reply_to_data = {
                "id": quoted_message.id,
                "content": quoted_message.content,
                "user_id": quoted_message.user_id,
                "created_at": quoted_message.created_at,
                "sender": {
                    "id": quoted_sender.id,
                    "username": quoted_sender.username,
                    "display_name": quoted_sender.display_name
                } if quoted_sender else None
            }
    
    # Manually serialize the response
    response_data = {
        "id": draft.id,
        "content": draft.content,
        "channel_id": draft.channel_id,
        "user_id": draft.user_id,
        "reply_to_id": draft.reply_to_id,
        "created_at": draft.created_at,
        "updated_at": draft.updated_at,
        "reply_to": reply_to_data
    }
    return response_data


@router.post("/channel/{channel_id}", response_model=DraftResponse)
def save_channel_draft(
    channel_id: int,
    draft: DraftCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """チャンネルのドラフトを保存または更新"""
    # Check if channel exists and user has access
    channel = db.query(Channel).filter(Channel.id == channel_id).first()
    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found")
    
    # Check if user is a member of the channel
    member = db.query(channel_members).filter(
        channel_members.c.user_id == current_user.id,
        channel_members.c.channel_id == channel_id
    ).first()
    
    if not member and channel.channel_type == 'private':
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Empty content means delete draft
    if not draft.content.strip():
        existing_draft = db.query(MessageDraft).filter(
            MessageDraft.channel_id == channel_id,
            MessageDraft.user_id == current_user.id
        ).first()
        if existing_draft:
            db.delete(existing_draft)
            db.commit()
        raise HTTPException(status_code=204, detail="Draft deleted")
    
    # Check if draft already exists
    existing_draft = db.query(MessageDraft).filter(
        MessageDraft.channel_id == channel_id,
        MessageDraft.user_id == current_user.id
    ).first()
    
    if existing_draft:
        # Update existing draft
        existing_draft.content = draft.content
        existing_draft.reply_to_id = draft.reply_to_id
        db.commit()
        db.refresh(existing_draft)
        db_draft = existing_draft
    else:
        # Create new draft
        db_draft = MessageDraft(
            content=draft.content,
            channel_id=channel_id,
            user_id=current_user.id,
            reply_to_id=draft.reply_to_id
        )
        db.add(db_draft)
        db.commit()
        db.refresh(db_draft)
    
    # Get quoted message data if this is a quoted reply
    reply_to_data = None
    if db_draft.reply_to_id:
        quoted_message = db.query(Message).filter(Message.id == db_draft.reply_to_id).first()
        if quoted_message:
            quoted_sender = db.query(User).filter(User.id == quoted_message.user_id).first()
            reply_to_data = {
                "id": quoted_message.id,
                "content": quoted_message.content,
                "user_id": quoted_message.user_id,
                "created_at": quoted_message.created_at,
                "sender": {
                    "id": quoted_sender.id,
                    "username": quoted_sender.username,
                    "display_name": quoted_sender.display_name
                } if quoted_sender else None
            }
    
    # Manually serialize the response
    response_data = {
        "id": db_draft.id,
        "content": db_draft.content,
        "channel_id": db_draft.channel_id,
        "user_id": db_draft.user_id,
        "reply_to_id": db_draft.reply_to_id,
        "created_at": db_draft.created_at,
        "updated_at": db_draft.updated_at,
        "reply_to": reply_to_data
    }
    return response_data


@router.delete("/channel/{channel_id}")
def delete_channel_draft(
    channel_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """チャンネルのドラフトを削除"""
    # Check if channel exists and user has access
    channel = db.query(Channel).filter(Channel.id == channel_id).first()
    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found")
    
    # Check if user is a member of the channel
    member = db.query(channel_members).filter(
        channel_members.c.user_id == current_user.id,
        channel_members.c.channel_id == channel_id
    ).first()
    
    if not member and channel.channel_type == 'private':
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Delete draft
    draft = db.query(MessageDraft).filter(
        MessageDraft.channel_id == channel_id,
        MessageDraft.user_id == current_user.id
    ).first()
    
    if draft:
        db.delete(draft)
        db.commit()
    
    return {"message": "Draft deleted successfully"}


@router.get("/", response_model=List[DraftResponse])
def get_all_drafts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """現在のユーザーの全てのドラフトを取得"""
    drafts = db.query(MessageDraft).filter(
        MessageDraft.user_id == current_user.id
    ).all()
    
    serialized_drafts = []
    for draft in drafts:
        # Get quoted message data if this is a quoted reply
        reply_to_data = None
        if draft.reply_to_id:
            quoted_message = db.query(Message).filter(Message.id == draft.reply_to_id).first()
            if quoted_message:
                quoted_sender = db.query(User).filter(User.id == quoted_message.user_id).first()
                reply_to_data = {
                    "id": quoted_message.id,
                    "content": quoted_message.content,
                    "user_id": quoted_message.user_id,
                    "created_at": quoted_message.created_at,
                    "sender": {
                        "id": quoted_sender.id,
                        "username": quoted_sender.username,
                        "display_name": quoted_sender.display_name
                    } if quoted_sender else None
                }
        
        # Manually serialize the response
        response_data = {
            "id": draft.id,
            "content": draft.content,
            "channel_id": draft.channel_id,
            "user_id": draft.user_id,
            "reply_to_id": draft.reply_to_id,
            "created_at": draft.created_at,
            "updated_at": draft.updated_at,
            "reply_to": reply_to_data
        }
        serialized_drafts.append(response_data)
    
    return serialized_drafts