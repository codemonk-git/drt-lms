"""
Lead ownership history tracking
"""
from datetime import datetime
from typing import Optional, Dict, Any, List
from server.shared.models.base import BaseModel


class LeadOwnershipRecord(BaseModel):
    """Track ownership changes and actions per stage"""
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.lead_id = kwargs.get('lead_id')
        self.stage_id = kwargs.get('stage_id')
        self.owner_id = kwargs.get('owner_id')  # Who owns/owned this lead
        self.assigned_at = kwargs.get('assigned_at', datetime.utcnow())
        self.completed_at: Optional[datetime] = kwargs.get('completed_at')  # When moved to next stage
        
        # What they did
        self.forms_filled: List[str] = kwargs.get('forms_filled', [])  # Form IDs
        self.notes: Optional[str] = kwargs.get('notes')
        self.actions_taken: List[str] = kwargs.get('actions_taken', [])  # ["filled_form", "moved_stage", "added_note"]
        
        # Time metrics
        self.time_in_stage_seconds: Optional[int] = kwargs.get('time_in_stage_seconds')
        
    @property
    def time_in_stage_hours(self) -> Optional[float]:
        """Get time in stage in hours"""
        if self.time_in_stage_seconds:
            return self.time_in_stage_seconds / 3600
        return None
    
    def to_dict(self):
        """Convert to dictionary"""
        return {
            'id': self.id,
            'created_at': str(self.created_at),
            'updated_at': str(self.updated_at),
            'lead_id': self.lead_id,
            'stage_id': self.stage_id,
            'owner_id': self.owner_id,
            'assigned_at': str(self.assigned_at) if self.assigned_at else None,
            'completed_at': str(self.completed_at) if self.completed_at else None,
            'forms_filled': self.forms_filled,
            'notes': self.notes,
            'actions_taken': self.actions_taken,
            'time_in_stage_seconds': self.time_in_stage_seconds,
            'time_in_stage_hours': self.time_in_stage_hours,
        }
