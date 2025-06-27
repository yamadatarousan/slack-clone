from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from typing import List, Optional
import logging

from app.database.base import get_db
from app.database.models import Message, Channel, User, channel_members, Reaction
from app.models.message import MessageCreate, MessageResponse, MessageUpdate, ReactionCreate
from app.routers.auth import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/", response_model=MessageResponse)
def create_message(
    message: MessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Check if channel exists and user has access
    channel = db.query(Channel).filter(Channel.id == message.channel_id).first()
    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found")
    
    # Check if user is a member of the channel
    member = db.query(channel_members).filter(
        channel_members.c.user_id == current_user.id,
        channel_members.c.channel_id == message.channel_id
    ).first()
    
    if not member and channel.channel_type == 'private':
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Create message
    try:
        logger.info(f"Creating message: content={message.content}, channel_id={message.channel_id}, user_id={current_user.id}")
        db_message = Message(
            content=message.content,
            message_type=message.message_type or "text",
            channel_id=message.channel_id,
            user_id=current_user.id,
            thread_id=message.parent_message_id
        )
        db.add(db_message)
        db.commit()
        db.refresh(db_message)
        logger.info(f"Message created successfully with ID: {db_message.id}")
        
        # Get sender information separately to avoid relationship loading issues
        sender = db.query(User).filter(User.id == db_message.user_id).first()
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
        
        # Manually serialize the response to avoid relationship loading issues
        response_data = {
            "id": db_message.id,
            "content": db_message.content,
            "channel_id": db_message.channel_id,
            "user_id": db_message.user_id,
            "message_type": db_message.message_type,
            "thread_id": db_message.thread_id,
            "edited": db_message.edited,
            "created_at": db_message.created_at,
            "updated_at": db_message.updated_at,
            "sender": sender_data,
            "reactions": [],
            "reply_count": 0
        }
        return response_data
    except Exception as e:
        logger.error(f"Error creating message: {str(e)}", exc_info=True)
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create message: {str(e)}")


@router.get("/channel/{channel_id}", response_model=List[MessageResponse])
def get_channel_messages(
    channel_id: int,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
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
    
    # Get messages
    messages = db.query(Message).filter(
        Message.channel_id == channel_id
    ).order_by(Message.created_at.desc()).offset(skip).limit(limit).all()
    
    # Manually serialize the response to avoid relationship loading issues
    serialized_messages = []
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
            "reactions": [],
            "reply_count": 0
        }
        serialized_messages.append(message_data)
    
    return serialized_messages[::-1]  # Return in chronological order


@router.get("/{message_id}", response_model=MessageResponse)
def get_message(
    message_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    message = db.query(Message).filter(Message.id == message_id).first()
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    
    # Check if user has access to the channel
    channel = db.query(Channel).filter(Channel.id == message.channel_id).first()
    member = db.query(channel_members).filter(
        channel_members.c.user_id == current_user.id,
        channel_members.c.channel_id == message.channel_id
    ).first()
    
    if not member and channel.channel_type == 'private':
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Get sender information separately
    sender = db.query(User).filter(User.id == message.user_id).first()
    sender_data = None
    if sender:
        sender_data = {
            "id": sender.id,
            "username": sender.username,
            "display_name": sender.display_name,
            "avatar_url": sender.avatar_url
        }
    
    # Manually serialize the response to avoid relationship loading issues
    response_data = {
        "id": message.id,
        "content": message.content,
        "channel_id": message.channel_id,
        "user_id": message.user_id,
        "message_type": message.message_type,
        "thread_id": message.thread_id,
        "edited": message.edited,
        "created_at": message.created_at,
        "updated_at": message.updated_at,
        "sender": sender_data,
        "reactions": [],
        "reply_count": 0
    }
    return response_data


@router.put("/{message_id}", response_model=MessageResponse)
def update_message(
    message_id: int,
    message_update: MessageUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    message = db.query(Message).filter(Message.id == message_id).first()
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    
    # Check if user is the sender
    if message.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Can only edit your own messages")
    
    # Update message
    if message_update.content is not None:
        message.content = message_update.content
        message.edited = True
    
    db.commit()
    db.refresh(message)
    
    # Get sender information separately
    sender = db.query(User).filter(User.id == message.user_id).first()
    sender_data = None
    if sender:
        sender_data = {
            "id": sender.id,
            "username": sender.username,
            "display_name": sender.display_name,
            "avatar_url": sender.avatar_url
        }
    
    # Manually serialize the response to avoid relationship loading issues
    response_data = {
        "id": message.id,
        "content": message.content,
        "channel_id": message.channel_id,
        "user_id": message.user_id,
        "message_type": message.message_type,
        "thread_id": message.thread_id,
        "edited": message.edited,
        "created_at": message.created_at,
        "updated_at": message.updated_at,
        "sender": sender_data,
        "reactions": [],
        "reply_count": 0
    }
    return response_data


@router.delete("/{message_id}")
def delete_message(
    message_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        logger.info(f"Attempting to delete message {message_id} by user {current_user.id}")
        
        message = db.query(Message).filter(Message.id == message_id).first()
        if not message:
            logger.warning(f"Message {message_id} not found")
            raise HTTPException(status_code=404, detail="Message not found")
        
        # Check if user is the sender
        if message.user_id != current_user.id:
            logger.warning(f"User {current_user.id} attempted to delete message {message_id} they don't own")
            raise HTTPException(status_code=403, detail="Can only delete your own messages")
        
        # Delete related reactions first to avoid foreign key constraint issues
        db.query(Reaction).filter(Reaction.message_id == message_id).delete()
        
        # Delete the message
        db.delete(message)
        db.commit()
        logger.info(f"Message {message_id} deleted successfully by user {current_user.id}")
        
        return {"message": "Message deleted successfully"}
    except Exception as e:
        logger.error(f"Error deleting message {message_id}: {str(e)}", exc_info=True)
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete message: {str(e)}")


@router.post("/{message_id}/reactions", response_model=dict)
def add_reaction(
    message_id: int,
    reaction: ReactionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Check if message exists and user has access
    message = db.query(Message).filter(Message.id == message_id).first()
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    
    # Check if user has access to the channel
    channel = db.query(Channel).filter(Channel.id == message.channel_id).first()
    member = db.query(channel_members).filter(
        channel_members.c.user_id == current_user.id,
        channel_members.c.channel_id == message.channel_id
    ).first()
    
    if not member and channel.channel_type == 'private':
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Check if reaction already exists
    existing_reaction = db.query(Reaction).filter(
        Reaction.message_id == message_id,
        Reaction.user_id == current_user.id,
        Reaction.emoji == reaction.emoji
    ).first()
    
    if existing_reaction:
        # Remove reaction (toggle)
        db.delete(existing_reaction)
        db.commit()
        return {"message": "Reaction removed"}
    else:
        # Add reaction
        db_reaction = Reaction(
            emoji=reaction.emoji,
            message_id=message_id,
            user_id=current_user.id
        )
        db.add(db_reaction)
        db.commit()
        return {"message": "Reaction added"}


@router.get("/{message_id}/thread", response_model=List[MessageResponse])
def get_message_thread(
    message_id: int,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Check if parent message exists and user has access
    parent_message = db.query(Message).filter(Message.id == message_id).first()
    if not parent_message:
        raise HTTPException(status_code=404, detail="Message not found")
    
    # Check if user has access to the channel
    channel = db.query(Channel).filter(Channel.id == parent_message.channel_id).first()
    member = db.query(channel_members).filter(
        channel_members.c.user_id == current_user.id,
        channel_members.c.channel_id == parent_message.channel_id
    ).first()
    
    if not member and channel.channel_type == 'private':
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Get thread messages
    thread_messages = db.query(Message).filter(
        Message.thread_id == message_id
    ).order_by(Message.created_at.asc()).offset(skip).limit(limit).all()
    
    # Manually serialize the response to avoid relationship loading issues
    serialized_messages = []
    for msg in thread_messages:
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
            "reactions": [],
            "reply_count": 0
        }
        serialized_messages.append(message_data)
    
    return serialized_messages