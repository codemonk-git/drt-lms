"""
Followup models with templates, reminders, and scheduling
"""
from enum import Enum
from datetime import datetime, timedelta
from typing import Optional, List
from server.shared.models.base import BaseModel


class FollowupStatus(str, Enum):
    """Followup status types"""
    PENDING = "pending"
    OVERDUE = "overdue"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    RESCHEDULED = "rescheduled"


class FollowupType(str, Enum):
    """Followup type"""
    CALL = "call"
    EMAIL = "email"
    MEETING = "meeting"
    SMS = "sms"
    TASK = "task"


class ReminderStatus(str, Enum):
    """Reminder status"""
    PENDING = "pending"
    SENT = "sent"
    CANCELLED = "cancelled"


class FollowupTemplate(BaseModel):
    """Followup template for standardized followups"""
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.company_id = kwargs.get('company_id')
        self.name = kwargs.get('name')  # e.g., "Initial Contact", "Follow-up After Demo"
        self.description = kwargs.get('description')
        self.followup_type = kwargs.get('followup_type')  # call, email, meeting, etc.
        self.template_text = kwargs.get('template_text')  # Template content with placeholders
        self.suggested_delay_hours = kwargs.get('suggested_delay_hours', 24)  # Default 1 day
        self.is_active = kwargs.get('is_active', True)
        self.priority = kwargs.get('priority', 'medium')  # low, medium, high
    
    def to_dict(self):
        """Convert to dictionary"""
        return {
            'id': self.id,
            'created_at': str(self.created_at),
            'updated_at': str(self.updated_at),
            'deleted_at': str(self.deleted_at) if self.deleted_at else None,
            'company_id': self.company_id,
            'name': self.name,
            'description': self.description,
            'followup_type': self.followup_type,
            'template_text': self.template_text,
            'suggested_delay_hours': self.suggested_delay_hours,
            'is_active': self.is_active,
            'priority': self.priority,
        }


class Reminder(BaseModel):
    """Reminder for a followup"""
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.followup_id = kwargs.get('followup_id')
        self.company_id = kwargs.get('company_id')
        self.assigned_to_user_id = kwargs.get('assigned_to_user_id')
        self.remind_at = kwargs.get('remind_at')  # When to remind (e.g., 15 mins before)
        self.status = kwargs.get('status', ReminderStatus.PENDING)
        self.sent_at = kwargs.get('sent_at')
        self.reminder_type = kwargs.get('reminder_type', 'in_app')  # in_app, email, sms
    
    def mark_sent(self):
        """Mark reminder as sent"""
        self.status = ReminderStatus.SENT
        self.sent_at = datetime.utcnow()
    
    def to_dict(self):
        """Convert to dictionary"""
        return {
            'id': self.id,
            'created_at': str(self.created_at),
            'updated_at': str(self.updated_at),
            'deleted_at': str(self.deleted_at) if self.deleted_at else None,
            'followup_id': self.followup_id,
            'company_id': self.company_id,
            'assigned_to_user_id': self.assigned_to_user_id,
            'remind_at': str(self.remind_at) if self.remind_at else None,
            'status': self.status,
            'sent_at': str(self.sent_at) if self.sent_at else None,
            'reminder_type': self.reminder_type,
        }


class Followup(BaseModel):
    """Followup entity with full scheduling and tracking"""
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.company_id = kwargs.get('company_id')
        self.lead_id = kwargs.get('lead_id')
        self.stage_id = kwargs.get('stage_id')  # Optional stage context
        self.assigned_to_user_id = kwargs.get('assigned_to_user_id')
        self.followup_type = kwargs.get('followup_type')  # call, email, meeting, sms, task
        self.scheduled_for = kwargs.get('scheduled_for')  # datetime
        self.status = kwargs.get('status', FollowupStatus.PENDING)
        self.title = kwargs.get('title')  # Short title
        self.notes = kwargs.get('notes')  # Detailed notes
        self.completed_at = kwargs.get('completed_at')
        self.completion_notes = kwargs.get('completion_notes')  # Notes added on completion
        self.template_id = kwargs.get('template_id')  # Reference to template used
        self.parent_followup_id = kwargs.get('parent_followup_id')  # For chained followups
        self.duration_minutes = kwargs.get('duration_minutes')  # For meetings/calls
        self.outcome = kwargs.get('outcome')  # Result of followup (positive, neutral, negative, undecided)
        self.next_action = kwargs.get('next_action')  # What happens next
        self.reminders = kwargs.get('reminders', [])  # List of reminder IDs
        self.response_time_minutes = None  # Calculated on completion
    
    def mark_completed(self, completion_notes: str = None, outcome: str = None, next_action: str = None):
        """Mark followup as completed"""
        self.status = FollowupStatus.COMPLETED
        self.completed_at = datetime.now()
        self.completion_notes = completion_notes
        self.outcome = outcome
        self.next_action = next_action
        
        # Calculate response time if scheduled_for exists
        if self.scheduled_for:
            try:
                scheduled_dt = self.scheduled_for if isinstance(self.scheduled_for, datetime) else datetime.fromisoformat(str(self.scheduled_for).replace('Z', '+00:00'))
                # Convert to naive if timezone-aware
                if scheduled_dt.tzinfo is not None:
                    scheduled_dt = scheduled_dt.replace(tzinfo=None)
                self.response_time_minutes = int((self.completed_at - scheduled_dt).total_seconds() / 60)
            except (ValueError, TypeError):
                pass
    
    def is_overdue(self) -> bool:
        """Check if followup is overdue"""
        if self.status == FollowupStatus.COMPLETED or self.status == FollowupStatus.CANCELLED:
            return False
        if self.scheduled_for:
            try:
                scheduled_dt = self.scheduled_for if isinstance(self.scheduled_for, datetime) else datetime.fromisoformat(str(self.scheduled_for).replace('Z', '+00:00'))
                # Convert to naive if timezone-aware
                if scheduled_dt.tzinfo is not None:
                    scheduled_dt = scheduled_dt.replace(tzinfo=None)
                now = datetime.now()
                return now > scheduled_dt
            except (ValueError, TypeError):
                return False
        return False
    
    def to_dict(self):
        """Convert to dictionary"""
        return {
            'id': self.id,
            'created_at': str(self.created_at),
            'updated_at': str(self.updated_at),
            'deleted_at': str(self.deleted_at) if self.deleted_at else None,
            'company_id': self.company_id,
            'lead_id': self.lead_id,
            'stage_id': self.stage_id,
            'assigned_to_user_id': self.assigned_to_user_id,
            'followup_type': self.followup_type,
            'scheduled_for': str(self.scheduled_for) if self.scheduled_for else None,
            'status': self.status,
            'title': self.title,
            'notes': self.notes,
            'completed_at': str(self.completed_at) if self.completed_at else None,
            'completion_notes': self.completion_notes,
            'template_id': self.template_id,
            'parent_followup_id': self.parent_followup_id,
            'duration_minutes': self.duration_minutes,
            'outcome': self.outcome,
            'next_action': self.next_action,
            'reminders': self.reminders,
            'response_time_minutes': self.response_time_minutes,
        }
