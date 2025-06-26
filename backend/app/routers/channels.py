from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database.base import get_db
from app.database.models import Channel, User, channel_members
from app.models.channel import ChannelCreate, ChannelResponse, ChannelUpdate
from app.routers.auth import get_current_user

router = APIRouter()


@router.post("/", response_model=ChannelResponse)
def create_channel(
    channel: ChannelCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Check if channel name already exists
    existing_channel = db.query(Channel).filter(Channel.name == channel.name).first()
    if existing_channel:
        raise HTTPException(
            status_code=400,
            detail="Channel name already exists"
        )
    
    # Create new channel
    db_channel = Channel(
        name=channel.name,
        description=channel.description,
        is_private=channel.is_private,
        created_by=current_user.id
    )
    db.add(db_channel)
    db.commit()
    db.refresh(db_channel)
    
    # Add creator as channel member and admin
    db.execute(
        channel_members.insert().values(
            user_id=current_user.id,
            channel_id=db_channel.id,
            is_admin=True
        )
    )
    db.commit()
    
    return db_channel


@router.get("/", response_model=List[ChannelResponse])
def get_channels(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Get channels that user is a member of
    channels = db.query(Channel).join(channel_members).filter(
        channel_members.c.user_id == current_user.id
    ).offset(skip).limit(limit).all()
    
    return channels


@router.get("/{channel_id}", response_model=ChannelResponse)
def get_channel(
    channel_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    channel = db.query(Channel).filter(Channel.id == channel_id).first()
    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found")
    
    # Check if user is a member of the channel
    member = db.query(channel_members).filter(
        channel_members.c.user_id == current_user.id,
        channel_members.c.channel_id == channel_id
    ).first()
    
    if not member and channel.is_private:
        raise HTTPException(status_code=403, detail="Access denied")
    
    return channel


@router.put("/{channel_id}", response_model=ChannelResponse)
def update_channel(
    channel_id: int,
    channel_update: ChannelUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    channel = db.query(Channel).filter(Channel.id == channel_id).first()
    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found")
    
    # Check if user is admin of the channel
    member = db.query(channel_members).filter(
        channel_members.c.user_id == current_user.id,
        channel_members.c.channel_id == channel_id,
        channel_members.c.is_admin == True
    ).first()
    
    if not member:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Update channel
    if channel_update.name is not None:
        # Check if new name already exists
        existing = db.query(Channel).filter(
            Channel.name == channel_update.name,
            Channel.id != channel_id
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Channel name already exists")
        channel.name = channel_update.name
    
    if channel_update.description is not None:
        channel.description = channel_update.description
    
    if channel_update.is_private is not None:
        channel.is_private = channel_update.is_private
    
    db.commit()
    db.refresh(channel)
    return channel


@router.post("/{channel_id}/join")
def join_channel(
    channel_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    channel = db.query(Channel).filter(Channel.id == channel_id).first()
    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found")
    
    if channel.is_private:
        raise HTTPException(status_code=403, detail="Cannot join private channel")
    
    # Check if already a member
    existing_member = db.query(channel_members).filter(
        channel_members.c.user_id == current_user.id,
        channel_members.c.channel_id == channel_id
    ).first()
    
    if existing_member:
        raise HTTPException(status_code=400, detail="Already a member")
    
    # Add user to channel
    db.execute(
        channel_members.insert().values(
            user_id=current_user.id,
            channel_id=channel_id,
            is_admin=False
        )
    )
    db.commit()
    
    return {"message": "Successfully joined channel"}


@router.post("/{channel_id}/leave")
def leave_channel(
    channel_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Check if user is a member
    member = db.query(channel_members).filter(
        channel_members.c.user_id == current_user.id,
        channel_members.c.channel_id == channel_id
    ).first()
    
    if not member:
        raise HTTPException(status_code=400, detail="Not a member of this channel")
    
    # Remove user from channel
    db.execute(
        channel_members.delete().where(
            channel_members.c.user_id == current_user.id,
            channel_members.c.channel_id == channel_id
        )
    )
    db.commit()
    
    return {"message": "Successfully left channel"}