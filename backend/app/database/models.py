from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, ForeignKey, Table
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database.base import Base

# Association table for many-to-many relationship between users and channels
channel_members = Table(
    'channel_members',
    Base.metadata,
    Column('id', Integer, primary_key=True, autoincrement=True),
    Column('user_id', Integer, ForeignKey('users.id')),
    Column('channel_id', Integer, ForeignKey('channels.id')),
    Column('role', String(20), default='member'),  # enum: owner, admin, member
    Column('joined_at', DateTime, default=func.now())
)


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    username = Column(String(50), unique=True, index=True, nullable=False)
    display_name = Column(String(100), nullable=True)
    password_hash = Column(String(255), nullable=False)
    avatar_url = Column(Text, nullable=True)
    status = Column(String(20), default='active')  # enum: active, away, busy, offline
    is_online = Column(Boolean, default=False)
    last_seen = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    # Relationships
    sent_messages = relationship("Message", back_populates="sender")
    channels = relationship("Channel", secondary=channel_members, back_populates="members")
    reactions = relationship("Reaction", back_populates="user")


class Channel(Base):
    __tablename__ = "channels"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(80), nullable=False, index=True)
    description = Column(Text, nullable=True)
    channel_type = Column(String(20), default='public')  # enum: public, private, dm
    is_archived = Column(Boolean, default=False)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    # Relationships
    creator = relationship("User")
    members = relationship("User", secondary=channel_members, back_populates="channels")
    messages = relationship("Message", back_populates="channel")


class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    content = Column(Text, nullable=False)
    message_type = Column(String(20), default="text")  # enum: text, image, file, system
    channel_id = Column(Integer, ForeignKey("channels.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)  # sender
    thread_id = Column(Integer, ForeignKey("messages.id"), nullable=True)  # For threading
    edited = Column(Boolean, default=False)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    # Relationships
    sender = relationship("User", back_populates="sent_messages", foreign_keys=[user_id])
    channel = relationship("Channel", back_populates="messages")
    reactions = relationship("Reaction", back_populates="message")
    replies = relationship("Message", remote_side=[id])  # Self-referential for threading


class Reaction(Base):
    __tablename__ = "reactions"

    id = Column(Integer, primary_key=True, index=True)
    message_id = Column(Integer, ForeignKey("messages.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    emoji = Column(String(10), nullable=False)  # Unicode emoji or custom emoji name
    created_at = Column(DateTime, default=func.now())

    # Relationships
    message = relationship("Message", back_populates="reactions")
    user = relationship("User", back_populates="reactions")

    # Ensure unique reaction per user per message
    __table_args__ = (
        {"mysql_engine": "InnoDB"},
    )