"""
Comment models - data structures for comments and notes
"""
from datetime import datetime
from typing import Optional
import uuid


class Comment:
    """Comment model"""
    
    def __init__(self,
                 entity_id: str,
                 entity_type: str,
                 author_id: str,
                 text: str,
                 comment_id: str = None,
                 created_at: datetime = None,
                 updated_at: datetime = None,
                 is_note: bool = False):
        self.comment_id = comment_id or f"comment_{uuid.uuid4().hex[:8]}"
        self.entity_id = entity_id
        self.entity_type = entity_type
        self.author_id = author_id
        self.text = text
        self.created_at = created_at or datetime.utcnow()
        self.updated_at = updated_at or datetime.utcnow()
        self.is_note = is_note  # Internal note vs public comment
    
    def to_dict(self):
        return {
            "comment_id": self.comment_id,
            "entity_id": self.entity_id,
            "entity_type": self.entity_type,
            "author_id": self.author_id,
            "text": self.text,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
            "is_note": self.is_note
        }
    
    @staticmethod
    def from_dict(data):
        return Comment(**data)
