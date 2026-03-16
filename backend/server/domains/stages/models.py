"""
Stage models - Pipeline stages with forms and assignments
"""
from datetime import datetime
from typing import List, Optional, Dict, Any
from enum import Enum
from server.shared.models.base import BaseModel


class StageDefinition(BaseModel):
    """Pipeline stage definition"""
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.company_id = kwargs.get('company_id')
        self.name = kwargs.get('name')  # "New", "Interested", "Quotation", etc.
        self.description = kwargs.get('description')
        self.order = kwargs.get('order', 0)  # Sort order in pipeline
        self.color = kwargs.get('color', '#000000')  # UI color
        self.is_default = kwargs.get('is_default', False)
        self.is_final = kwargs.get('is_final', False)  # Win/loss stage
        self.is_active = kwargs.get('is_active', True)
        
        # Team-based assignment for Matrix Model
        self.responsible_team_id = kwargs.get('responsible_team_id')  # Team handling this stage
        self.responsible_user_ids = kwargs.get('responsible_user_ids', [])  # Specific team members (or all if not specified)
    
    def to_dict(self):
        """Convert to dictionary"""
        return {
            'id': self.id,
            'created_at': str(self.created_at),
            'updated_at': str(self.updated_at),
            'company_id': self.company_id,
            'name': self.name,
            'description': self.description,
            'order': self.order,
            'color': self.color,
            'is_default': self.is_default,
            'is_final': self.is_final,
            'is_active': self.is_active,
            'responsible_team_id': self.responsible_team_id,
            'responsible_user_ids': self.responsible_user_ids,
        }


class StageAssignment(BaseModel):
    """Assign team member(s) to stage"""
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.company_id = kwargs.get('company_id')
        self.stage_id = kwargs.get('stage_id')
        self.team_id = kwargs.get('team_id')
        self.user_id = kwargs.get('user_id')  # Specific person or null for team
        self.role = kwargs.get('role')  # "sales", "accountant", "quote_manager", etc.
        self.is_default = kwargs.get('is_default', False)  # Default assignee
        self.is_active = kwargs.get('is_active', True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'created_at': str(self.created_at),
            'company_id': self.company_id,
            'stage_id': self.stage_id,
            'team_id': self.team_id,
            'user_id': self.user_id,
            'role': self.role,
            'is_default': self.is_default,
            'is_active': self.is_active,
        }


class StageForm(BaseModel):
    """Associate form with stage"""
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.company_id = kwargs.get('company_id')
        self.stage_id = kwargs.get('stage_id')
        self.form_id = kwargs.get('form_id')
        self.order = kwargs.get('order', 0)  # Order forms appear
        self.is_required = kwargs.get('is_required', False)  # Must complete to move to next
        self.is_active = kwargs.get('is_active', True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'created_at': str(self.created_at),
            'updated_at': str(self.updated_at),
            'deleted_at': str(self.deleted_at) if self.deleted_at else None,
            'company_id': self.company_id,
            'stage_id': self.stage_id,
            'form_id': self.form_id,
            'order': self.order,
            'is_required': self.is_required,
            'is_active': self.is_active,
        }


class StageLead(BaseModel):
    """Lead's current stage and history"""
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.company_id = kwargs.get('company_id')
        self.lead_id = kwargs.get('lead_id')
        self.current_stage_id = kwargs.get('current_stage_id')
        self.assigned_user_id = kwargs.get('assigned_user_id')  # Currently assigned
        self.assigned_team_id = kwargs.get('assigned_team_id')
        self.entered_stage_at = kwargs.get('entered_stage_at')  # When entered current stage
        self.expected_exit_date = kwargs.get('expected_exit_date')  # Target to move to next
        self.forms_completed = kwargs.get('forms_completed', [])  # Form IDs completed
        self.forms_required = kwargs.get('forms_required', [])  # Form IDs required
        self.is_active = kwargs.get('is_active', True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'created_at': str(self.created_at),
            'updated_at': str(self.updated_at),
            'company_id': self.company_id,
            'lead_id': self.lead_id,
            'current_stage_id': self.current_stage_id,
            'assigned_user_id': self.assigned_user_id,
            'assigned_team_id': self.assigned_team_id,
            'entered_stage_at': self.entered_stage_at,
            'expected_exit_date': self.expected_exit_date,
            'forms_completed': self.forms_completed,
            'forms_required': self.forms_required,
            'is_active': self.is_active,
        }


class StageHistory(BaseModel):
    """Audit trail of stage transitions"""
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.company_id = kwargs.get('company_id')
        self.lead_id = kwargs.get('lead_id')
        self.from_stage_id = kwargs.get('from_stage_id')
        self.to_stage_id = kwargs.get('to_stage_id')
        self.changed_by_user_id = kwargs.get('changed_by_user_id')
        self.reason = kwargs.get('reason')  # Manual, auto-trigger, etc.
        self.time_in_stage_hours = kwargs.get('time_in_stage_hours', 0)
        self.notes = kwargs.get('notes')
    
    def to_dict(self):
        return {
            'id': self.id,
            'created_at': str(self.created_at),
            'company_id': self.company_id,
            'lead_id': self.lead_id,
            'from_stage_id': self.from_stage_id,
            'to_stage_id': self.to_stage_id,
            'changed_by_user_id': self.changed_by_user_id,
            'reason': self.reason,
            'time_in_stage_hours': self.time_in_stage_hours,
            'notes': self.notes,
        }
