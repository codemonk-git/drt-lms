"""
Base model for all database entities.
Provides common fields and methods for all models.
"""
from datetime import datetime
from typing import Optional
import uuid


class BaseModel:
    """Base model for all entities"""
    
    def __init__(self, **kwargs):
        self.id = kwargs.get('id') or str(uuid.uuid4())
        self.created_at = kwargs.get('created_at') or datetime.utcnow()
        self.updated_at = kwargs.get('updated_at') or datetime.utcnow()
        self.deleted_at = kwargs.get('deleted_at')

    def __post_init__(self):
        if self.id is None:
            self.id = str(uuid.uuid4())
        if self.created_at is None:
            self.created_at = datetime.utcnow()
        if self.updated_at is None:
            self.updated_at = datetime.utcnow()

    def to_dict(self):
        """Convert model to dictionary"""
        result = {}
        for key, value in self.__dict__.items():
            if isinstance(value, datetime):
                result[key] = value.isoformat()
            elif hasattr(value, 'value'):  # For Enum values
                result[key] = value.value
            elif hasattr(value, 'to_dict'):  # For nested models
                result[key] = value.to_dict()
            else:
                result[key] = value
        return result

    def mark_deleted(self):
        """Soft delete the entity"""
        self.deleted_at = datetime.utcnow()
        self.updated_at = datetime.utcnow()

    def restore(self):
        """Restore soft-deleted entity"""
        self.deleted_at = None
        self.updated_at = datetime.utcnow()
