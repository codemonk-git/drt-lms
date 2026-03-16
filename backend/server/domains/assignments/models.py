"""
Assignment models
"""
from enum import Enum
from datetime import datetime
from server.shared.models.base import BaseModel


class AssignmentType(str, Enum):
    """Types of assignments"""
    LEAD = "lead"
    TASK = "task"
    ACCOUNT = "account"
    CAMPAIGN = "campaign"


class AssignmentStatus(str, Enum):
    """Assignment status"""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    OVERDUE = "overdue"
    REASSIGNED = "reassigned"


class AssignmentPriority(str, Enum):
    """Assignment priority"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"


class Assignment(BaseModel):
    """Assignment entity for assigning work to users"""
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.company_id = kwargs.get('company_id')
        self.team_id = kwargs.get('team_id')
        self.assignment_type = kwargs.get('assignment_type')
        self.entity_id = kwargs.get('entity_id')
        self.assigned_to_user_id = kwargs.get('assigned_to_user_id')
        self.assigned_by_user_id = kwargs.get('assigned_by_user_id')
        self.status = kwargs.get('status', AssignmentStatus.PENDING)
        self.priority = kwargs.get('priority', AssignmentPriority.MEDIUM)
        self.due_date = kwargs.get('due_date')  # ISO format datetime string
        self.completed_at = kwargs.get('completed_at')
        self.is_active = kwargs.get('is_active', True)
        self.notes = kwargs.get('notes')
        self.previous_owner_id = kwargs.get('previous_owner_id')  # For reassignments
        self.reassigned_at = kwargs.get('reassigned_at')  # When reassigned
    
    def to_dict(self):
        """Convert to dictionary"""
        return {
            'id': self.id,
            'created_at': str(self.created_at),
            'updated_at': str(self.updated_at),
            'deleted_at': str(self.deleted_at) if self.deleted_at else None,
            'company_id': self.company_id,
            'team_id': self.team_id,
            'assignment_type': self.assignment_type,
            'entity_id': self.entity_id,
            'assigned_to_user_id': self.assigned_to_user_id,
            'assigned_by_user_id': self.assigned_by_user_id,
            'status': self.status,
            'priority': self.priority,
            'due_date': self.due_date,
            'completed_at': self.completed_at,
            'is_active': self.is_active,
            'notes': self.notes,
            'previous_owner_id': self.previous_owner_id,
            'reassigned_at': self.reassigned_at,
        }
