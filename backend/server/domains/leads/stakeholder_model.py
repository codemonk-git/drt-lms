"""
Stakeholder model - Track who has worked on a lead at each stage
"""
from datetime import datetime
from typing import Optional, List
from enum import Enum
from ...shared.models.base import BaseModel


class StakeholderRole(str, Enum):
    """Role of stakeholder in lead lifecycle"""
    OWNER = "owner"  # Lead owner - responsible throughout
    QUOTATION_TEAM = "quotation_team"  # Prepared quotation
    SITE_ENGINEER = "site_engineer"  # Conducted site visit
    ACCOUNTS = "accounts"  # Handled accounts/billing
    DRAWING_ENGINEER = "drawing_engineer"  # Prepared drawings
    OBSERVER = "observer"  # General stakeholder (viewed/commented)


class Stakeholder(BaseModel):
    """Stakeholder record - tracks who worked on a lead"""
    
    def __init__(self, company_id: str, lead_id: str, user_id: str, **kwargs):
        super().__init__(**kwargs)
        self.company_id = company_id
        self.lead_id = lead_id
        self.user_id = user_id
        self.stage_id = kwargs.get('stage_id')  # Stage where they were added
        self.role: StakeholderRole = kwargs.get('role', StakeholderRole.OBSERVER)
        self.joined_at = kwargs.get('joined_at', datetime.utcnow())
        self.forms_filled: List[str] = kwargs.get('forms_filled', [])  # Form IDs they completed
        self.is_active: bool = kwargs.get('is_active', True)  # Can still access/edit
        self.removed_at: Optional[datetime] = kwargs.get('removed_at')
        self.notes: Optional[str] = kwargs.get('notes')
    
    def to_dict(self):
        """Convert to dictionary"""
        return {
            'id': self.id,
            'created_at': str(self.created_at),
            'updated_at': str(self.updated_at),
            'company_id': self.company_id,
            'lead_id': self.lead_id,
            'user_id': self.user_id,
            'stage_id': self.stage_id,
            'role': self.role.value if isinstance(self.role, StakeholderRole) else self.role,
            'joined_at': str(self.joined_at) if self.joined_at else None,
            'forms_filled': self.forms_filled,
            'is_active': self.is_active,
            'removed_at': str(self.removed_at) if self.removed_at else None,
            'notes': self.notes,
        }
    
    def mark_inactive(self):
        """Mark stakeholder as removed"""
        self.is_active = False
        self.removed_at = datetime.utcnow()
    
    def add_form(self, form_id: str):
        """Record that this stakeholder filled a form"""
        if form_id not in self.forms_filled:
            self.forms_filled.append(form_id)
            self.updated_at = datetime.utcnow()


class StakeholderRecord(BaseModel):
    """Historical record of stakeholders for a lead at a given time"""
    
    def __init__(self, company_id: str, lead_id: str, **kwargs):
        super().__init__(**kwargs)
        self.company_id = company_id
        self.lead_id = lead_id
        self.stage_id = kwargs.get('stage_id')
        self.stage_name = kwargs.get('stage_name')
        self.stakeholders: List[str] = kwargs.get('stakeholders', [])  # User IDs
        self.timestamp = kwargs.get('timestamp', datetime.utcnow())
        self.event_type = kwargs.get('event_type')  # "stage_change", "form_submitted", etc.
    
    def to_dict(self):
        return {
            'id': self.id,
            'created_at': str(self.created_at),
            'company_id': self.company_id,
            'lead_id': self.lead_id,
            'stage_id': self.stage_id,
            'stage_name': self.stage_name,
            'stakeholders': self.stakeholders,
            'timestamp': str(self.timestamp) if self.timestamp else None,
            'event_type': self.event_type,
        }
