"""
Attachment models - data structures for file attachments
"""
from datetime import datetime
from typing import Optional
import uuid


class Attachment:
    """Attachment model"""
    
    def __init__(self,
                 entity_id: str,
                 entity_type: str,
                 filename: str,
                 file_type: str,
                 file_path: str = None,
                 file_size: int = 0,
                 uploaded_by: str = None,
                 attachment_id: str = None,
                 created_at: datetime = None,
                 metadata: dict = None):
        self.attachment_id = attachment_id or f"attach_{uuid.uuid4().hex[:8]}"
        self.entity_id = entity_id
        self.entity_type = entity_type
        self.filename = filename
        self.file_type = file_type
        self.file_path = file_path or f"/uploads/{self.attachment_id}/{filename}"
        self.file_size = file_size
        self.uploaded_by = uploaded_by
        self.created_at = created_at or datetime.utcnow()
        self.metadata = metadata or {}
    
    def to_dict(self):
        return {
            "attachment_id": self.attachment_id,
            "entity_id": self.entity_id,
            "entity_type": self.entity_type,
            "filename": self.filename,
            "file_type": self.file_type,
            "file_path": self.file_path,
            "file_size": self.file_size,
            "uploaded_by": self.uploaded_by,
            "created_at": self.created_at.isoformat(),
            "metadata": self.metadata
        }
    
    @staticmethod
    def from_dict(data):
        return Attachment(**data)
