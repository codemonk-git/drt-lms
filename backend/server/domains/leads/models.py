"""
Lead models for lead lifecycle management
"""
from datetime import datetime
from typing import Optional, Dict, List
from enum import Enum
from ...shared.models import BaseModel


class LeadSource(str, Enum):
    """Lead source enumeration"""
    FACEBOOK = "facebook"
    GOOGLE_ADS = "google_ads"
    WEBSITE_FORM = "website_form"
    MANUAL = "manual"
    IMPORT = "import"
    PHONE = "phone"
    EMAIL = "email"
    OTHER = "other"



class LeadStage(str, Enum):
    """Lead stage in sales pipeline"""
    NEW = "new"
    CONTACTED = "contacted"
    INTERESTED = "interested"
    QUOTATION_REQUESTED = "quotation_requested"
    QUOTATION_SENT = "quotation_sent"
    SITE_VISIT_REQUESTED = "site_visit_requested"
    SITE_VISIT_SCHEDULED = "site_visit_scheduled"
    WON = "won"
    LOST = "lost"


class CallStatus(str, Enum):
    """Call status for lead interaction"""
    NOT_CALLED = "not_called"
    CALL_PICKED = "call_picked"
    BUSY = "busy"
    SWITCHED_OFF = "switched_off"
    NOT_REACHABLE = "not_reachable"
    VOICEMAIL = "voicemail"
    CALLBACK_REQUESTED = "callback_requested"


class Lead(BaseModel):
    """Lead model - core entity"""
    
    def __init__(self, company_id: str, name: str = None, **kwargs):
        super().__init__(**kwargs)
        self.company_id = company_id
        # Support legacy first_name/last_name from existing JSON data
        if name is None:
            first = kwargs.pop('first_name', '') or ''
            last = kwargs.pop('last_name', '') or ''
            name = f"{first} {last}".strip() or 'Unknown'
        else:
            kwargs.pop('first_name', None)
            kwargs.pop('last_name', None)
        self.name: str = name
        self.email: Optional[str] = kwargs.get('email')
        self.phone: Optional[str] = kwargs.get('phone')
        self.source: LeadSource = kwargs.get('source', LeadSource.MANUAL)
        self.source_id: Optional[str] = kwargs.get('source_id')  # Meta lead ID, Google ID, etc.
        self.stage: LeadStage = kwargs.get('stage', LeadStage.NEW)
        self.stage_id: Optional[str] = kwargs.get('stage_id')  # UUID reference to StageDefinition
        self.call_status: CallStatus = kwargs.get('call_status', CallStatus.NOT_CALLED)
        
        # Campaign & segmentation
        self.campaign_id: Optional[str] = kwargs.get('campaign_id')
        self.campaign_name: Optional[str] = kwargs.get('campaign_name')
        self.location: Optional[str] = kwargs.get('location')
        self.project: Optional[str] = kwargs.get('project')
        
        # Lead details
        self.title: Optional[str] = kwargs.get('title')
        self.company: Optional[str] = kwargs.get('company')
        self.website: Optional[str] = kwargs.get('website')
        self.description: Optional[str] = kwargs.get('description')
        self.custom_fields: Dict = kwargs.get('custom_fields', {})
        
        # Assignment tracking
        self.assigned_to_team_id: Optional[str] = kwargs.get('assigned_to_team_id')
        self.assigned_to_user_id: Optional[str] = kwargs.get('assigned_to_user_id')
        self.assigned_at: Optional[datetime] = kwargs.get('assigned_at')
        self.assigned_team_members: List[str] = kwargs.get('assigned_team_members', [])  # Team members assigned at current stage
        
        # Creator tracking
        self.created_by_user_id: Optional[str] = kwargs.get('created_by_user_id')
        
        # Lead ownership (primary account manager responsible for this lead)
        self.owner_id: Optional[str] = kwargs.get('owner_id')
        self.owner_changed_at: Optional[datetime] = kwargs.get('owner_changed_at')
        
        # Stakeholders - everyone who has worked on this lead
        self.stakeholders: List[Dict] = kwargs.get('stakeholders', [])  # List of {user_id, role, joined_at, forms_filled}
        
        # Status
        self.is_lost: bool = kwargs.get('is_lost', False)
        self.is_won: bool = kwargs.get('is_won', False)
        self.won_at: Optional[datetime] = kwargs.get('won_at')
        self.lost_at: Optional[datetime] = kwargs.get('lost_at')
        self.lost_reason: Optional[str] = kwargs.get('lost_reason')
        
        # Followup - simple fields for next followup
        self.next_followup_date_time: Optional[str] = kwargs.get('next_followup_date_time')
        self.followup_notes: Optional[str] = kwargs.get('followup_notes')
    
    @property
    def status(self):
        """Alias for stage - for frontend compatibility"""
        return self.stage

    def assign_to_user(self, team_id: str, user_id: str):
        """Assign lead to a user"""
        self.assigned_to_team_id = team_id
        self.assigned_to_user_id = user_id
        self.assigned_at = datetime.utcnow()
        self.updated_at = datetime.utcnow()

    def update_stage(self, new_stage: LeadStage):
        """Update lead stage"""
        self.stage = new_stage
        self.updated_at = datetime.utcnow()

    def update_call_status(self, status: CallStatus):
        """Update call status"""
        self.call_status = status
        self.updated_at = datetime.utcnow()

    def mark_won(self):
        """Mark lead as won"""
        self.is_won = True
        self.stage = LeadStage.WON
        self.won_at = datetime.utcnow()
        self.updated_at = datetime.utcnow()

    def mark_lost(self, reason: Optional[str] = None):
        """Mark lead as lost"""
        self.is_lost = True
        self.stage = LeadStage.LOST
        self.lost_at = datetime.utcnow()
        self.lost_reason = reason
        self.updated_at = datetime.utcnow()

    def to_dict(self):
        """Convert lead to dictionary, including user name lookup for creator"""
        data = self.__dict__.copy()
        
        # Convert enums to their string values
        if isinstance(data.get('source'), Enum):
            data['source'] = data['source'].value
        if isinstance(data.get('stage'), Enum):
            data['stage'] = data['stage'].value
        if isinstance(data.get('call_status'), Enum):
            data['call_status'] = data['call_status'].value
        if isinstance(data.get('status'), Enum):
            data['status'] = data['status'].value
        
        # Look up creator's user name if created_by_user_id is set
        created_by_user_name = None
        if self.created_by_user_id and self.created_by_user_id != 'system':
            try:
                from server.domains.users.repositories import UserRepository
                user_repo = UserRepository()
                user = user_repo.get_by_id(self.created_by_user_id)
                if user and hasattr(user, 'name'):
                    created_by_user_name = user.name if user.name else None
            except Exception:
                pass
        
        data['created_by_user_name'] = created_by_user_name
        return data


class LeadActivity(BaseModel):
    """Activity log for lead interactions"""
    
    def __init__(self, company_id: str, lead_id: str, user_id: str, **kwargs):
        super().__init__(**kwargs)
        self.company_id = company_id
        self.lead_id = lead_id
        self.user_id = user_id
        self.activity_type: str = kwargs.get('activity_type')  # call, sms, email, stage_change, form_submitted
        self.description: str = kwargs.get('description', '')
        self.metadata: Dict = kwargs.get('metadata', {})
        self.duration_seconds: Optional[int] = kwargs.get('duration_seconds')  # For calls


class LeadAssignment(BaseModel):
    """Track lead assignments and history"""
    
    def __init__(self, company_id: str, lead_id: str, team_id: str, user_id: str, **kwargs):
        super().__init__(**kwargs)
        self.company_id = company_id
        self.lead_id = lead_id
        self.team_id = team_id
        self.user_id = user_id
        self.assigned_by: Optional[str] = kwargs.get('assigned_by')
        self.assigned_at = datetime.utcnow()
        self.is_active: bool = kwargs.get('is_active', True)
        self.unassigned_at: Optional[datetime] = kwargs.get('unassigned_at')
        self.unassign_reason: Optional[str] = kwargs.get('unassign_reason')

    def mark_inactive(self, reason: Optional[str] = None):
        """Mark assignment as inactive"""
        self.is_active = False
        self.unassigned_at = datetime.utcnow()
        self.unassign_reason = reason
