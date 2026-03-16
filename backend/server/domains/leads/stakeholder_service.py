"""
Stakeholder Service - Manage stakeholder relationships for leads
"""
from typing import List, Optional
from datetime import datetime
from .stakeholder_model import Stakeholder, StakeholderRole, StakeholderRecord


class StakeholderService:
    """Service for stakeholder management"""
    
    def __init__(self, lead_repo, stakeholder_repo):
        self.lead_repo = lead_repo
        self.stakeholder_repo = stakeholder_repo
    
    def add_stakeholder(self, company_id: str, lead_id: str, user_id: str, 
                       stage_id: str, role: str = 'observer', notes: Optional[str] = None) -> Stakeholder:
        """Add a stakeholder to a lead"""
        # Check if stakeholder already exists
        existing = self.stakeholder_repo.find_by_lead_and_user(lead_id, user_id)
        if existing:
            # Reactivate if previously removed
            if not existing.is_active:
                existing.is_active = True
                existing.removed_at = None
                self.stakeholder_repo.update(existing)
            return existing
        
        # Create new stakeholder
        stakeholder = Stakeholder(
            company_id=company_id,
            lead_id=lead_id,
            user_id=user_id,
            stage_id=stage_id,
            role=role,
            notes=notes
        )
        
        return self.stakeholder_repo.create(stakeholder)
    
    def get_stakeholders(self, lead_id: str) -> List[Stakeholder]:
        """Get all active stakeholders for a lead"""
        stakeholders = self.stakeholder_repo.find_by_lead(lead_id)
        return [s for s in stakeholders if s.is_active]
    
    def get_stakeholder_by_stage(self, lead_id: str, stage_id: str) -> List[Stakeholder]:
        """Get stakeholders added at a specific stage"""
        return self.stakeholder_repo.find_by_lead_and_stage(lead_id, stage_id)
    
    def remove_stakeholder(self, stakeholder_id: str, reason: Optional[str] = None):
        """Remove a stakeholder from a lead"""
        stakeholder = self.stakeholder_repo.get(stakeholder_id)
        if stakeholder:
            stakeholder.mark_inactive()
            if reason:
                stakeholder.notes = reason
            self.stakeholder_repo.update(stakeholder)
        return stakeholder
    
    def add_form_to_stakeholder(self, stakeholder_id: str, form_id: str) -> Stakeholder:
        """Record that stakeholder filled a form"""
        stakeholder = self.stakeholder_repo.get(stakeholder_id)
        if stakeholder:
            stakeholder.add_form(form_id)
            self.stakeholder_repo.update(stakeholder)
        return stakeholder
    
    def get_stakeholder_role(self, lead_id: str, user_id: str) -> Optional[str]:
        """Get stakeholder's role for a lead"""
        stakeholder = self.stakeholder_repo.find_by_lead_and_user(lead_id, user_id)
        if stakeholder and stakeholder.is_active:
            return stakeholder.role.value if isinstance(stakeholder.role, StakeholderRole) else stakeholder.role
        return None
    
    def record_stakeholder_snapshot(self, company_id: str, lead_id: str, stage_id: str,
                                   stage_name: str, event_type: str) -> StakeholderRecord:
        """Record current stakeholders for audit trail"""
        stakeholders = self.get_stakeholders(lead_id)
        stakeholder_ids = [s.user_id for s in stakeholders]
        
        record = StakeholderRecord(
            company_id=company_id,
            lead_id=lead_id,
            stage_id=stage_id,
            stage_name=stage_name,
            stakeholders=stakeholder_ids,
            event_type=event_type
        )
        
        return self.stakeholder_repo.create_snapshot(record)
    
    def bulk_add_stakeholders(self, company_id: str, lead_id: str, user_ids: List[str],
                             stage_id: str, role: str = 'observer') -> List[Stakeholder]:
        """Add multiple stakeholders at once"""
        stakeholders = []
        for user_id in user_ids:
            stakeholder = self.add_stakeholder(
                company_id=company_id,
                lead_id=lead_id,
                user_id=user_id,
                stage_id=stage_id,
                role=role
            )
            stakeholders.append(stakeholder)
        return stakeholders
