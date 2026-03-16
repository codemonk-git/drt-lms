"""
Activity models
"""
from enum import Enum
from server.shared.models.base import BaseModel


class ActivityType(str, Enum):
    """Types of activities that can be tracked"""
    LEAD_CREATED = "lead_created"
    LEAD_ASSIGNED = "lead_assigned"
    LEAD_REASSIGNED = "lead_reassigned"
    LEAD_STAGE_CHANGED = "lead_stage_changed"
    LEAD_STATUS_CHANGED = "lead_status_changed"
    CALL_LOGGED = "call_logged"
    EMAIL_SENT = "email_sent"
    WHATSAPP_SENT = "whatsapp_sent"
    NOTE_ADDED = "note_added"
    FOLLOWUP_SCHEDULED = "followup_scheduled"
    FOLLOWUP_COMPLETED = "followup_completed"
    FORM_SUBMITTED = "form_submitted"
    USER_JOINED = "user_joined"
    TEAM_CREATED = "team_created"


class Activity(BaseModel):
    """Activity entity"""
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.company_id = kwargs.get('company_id')
        self.user_id = kwargs.get('user_id')
        self.activity_type = kwargs.get('activity_type')
        self.entity_type = kwargs.get('entity_type')  # e.g., 'lead', 'user', 'team'
        self.entity_id = kwargs.get('entity_id')
        self.description = kwargs.get('description')
        self.metadata = kwargs.get('metadata', {})
        self.ip_address = kwargs.get('ip_address')
        self.user_agent = kwargs.get('user_agent')
    
    def to_dict(self):
        """Convert to dictionary"""
        # Convert activity_type enum to string value
        activity_type_value = self.activity_type
        if isinstance(self.activity_type, ActivityType):
            activity_type_value = self.activity_type.value
        elif hasattr(self.activity_type, '_value_'):
            activity_type_value = self.activity_type._value_
        elif hasattr(self.activity_type, 'value'):
            activity_type_value = self.activity_type.value
        
        # Try to get user name from users repository
        user_name = 'System' if (self.user_id == 'system' or not self.user_id) else 'Unknown'
        
        if self.user_id and self.user_id != 'system':
            try:
                from server.domains.users.repositories import UserRepository
                user_repo = UserRepository()
                user = user_repo.get_by_id(self.user_id)
                if user and hasattr(user, 'name'):
                    user_name = user.name if user.name else 'Unknown'
            except Exception:
                user_name = 'Unknown'
        
        return {
            'id': self.id,
            'created_at': str(self.created_at),
            'updated_at': str(self.updated_at),
            'deleted_at': str(self.deleted_at) if self.deleted_at else None,
            'company_id': self.company_id,
            'user_id': self.user_id,
            'user_name': user_name,
            'activity_type': activity_type_value,
            'entity_type': self.entity_type,
            'entity_id': self.entity_id,
            'description': self.description,
            'metadata': self.metadata,
            'ip_address': self.ip_address,
            'user_agent': self.user_agent,
        }
