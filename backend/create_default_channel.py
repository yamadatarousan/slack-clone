#!/usr/bin/env python3
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database.base import get_db
from app.database.models import Channel

def create_default_channel():
    db = next(get_db())
    
    # Check if general channel exists
    general_channel = db.query(Channel).filter(Channel.name == "general").first()
    
    if not general_channel:
        print("Creating default 'general' channel...")
        general_channel = Channel(
            name="general",
            description="General discussion channel",
            channel_type="public",
            is_archived=False
        )
        db.add(general_channel)
        db.commit()
        db.refresh(general_channel)
        print(f"Created general channel with ID: {general_channel.id}")
    else:
        print(f"General channel already exists with ID: {general_channel.id}")
    
    db.close()

if __name__ == "__main__":
    create_default_channel()