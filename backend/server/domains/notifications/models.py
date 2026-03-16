"""
Notification models - data structures for notifications
"""
from datetime import datetime
from typing import Optional, List
import uuid


class Notification:
    """Notification model"""
    
    def __init__(self,
                 user_id: str,
                 title: str,
                 message: str,
                 notification_type: str = "info",
                 entity_id: str = None,
                 entity_type: str = None,
                 notification_id: str = None,
                 created_at: datetime = None,
                 read: bool = False,
                 read_at: Optional[datetime] = None):
        self.notification_id = notification_id or f"notif_{uuid.uuid4().hex[:8]}"
        self.user_id = user_id
        self.title = title
        self.message = message
        self.notification_type = notification_type
        self.entity_id = entity_id
        self.entity_type = entity_type
        self.created_at = created_at or datetime.utcnow()
        self.read = read
        self.read_at = read_at
    
    def to_dict(self):
        return {
            "notification_id": self.notification_id,
            "user_id": self.user_id,
            "title": self.title,
            "message": self.message,
            "type": self.notification_type,
            "entity_id": self.entity_id,
            "entity_type": self.entity_type,
            "created_at": self.created_at.isoformat(),
            "read": self.read,
            "read_at": self.read_at.isoformat() if self.read_at else None
        }
    
    @staticmethod
    def from_dict(data):
        return Notification(**data)
