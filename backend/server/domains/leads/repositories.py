"""
Lead repositories for data persistence
"""
from typing import List, Optional
from .models import Lead, LeadActivity, LeadAssignment
from ...shared.persistence import JSONPersistenceMixin


class LeadRepository(JSONPersistenceMixin):
    """Repository for Lead entities"""
    
    FILENAME = "leads.json"
    
    def __init__(self):
        self.data = {}
        super().__init__()
    
    def save(self, lead: Lead) -> Lead:
        """Save lead"""
        self.data[lead.id] = lead
        self._save_to_file()
        return lead
    
    def get_by_id(self, lead_id: str) -> Optional[Lead]:
        """Get lead by ID"""
        self._ensure_fresh_data()
        return self.data.get(lead_id)
    
    def get_by_company(self, company_id: str) -> List[Lead]:
        """Get all leads for company"""
        self._ensure_fresh_data()
        return [lead for lead in self.data.values() 
                if lead.company_id == company_id and not lead.deleted_at]
    
    def get_assigned_to_user(self, company_id: str, user_id: str) -> List[Lead]:
        """Get leads assigned to user"""
        self._ensure_fresh_data()
        return [lead for lead in self.data.values()
                if lead.company_id == company_id 
                and lead.assigned_to_user_id == user_id 
                and not lead.is_won and not lead.is_lost
                and not lead.deleted_at]
    
    def _load_data(self, data: dict):
        """Load leads from JSON data"""
        for lead_data in data.get('leads', []):
            try:
                lead = Lead(**lead_data)
                self.data[lead.id] = lead
            except Exception as e:
                print(f"Warning: Could not load lead {lead_data.get('id')}: {e}")
    
    def _get_data(self) -> dict:
        """Get data as dictionary for JSON serialization"""
        return {
            'leads': [l.to_dict() if hasattr(l, 'to_dict') else l.__dict__ 
                     for l in self.data.values() if not l.deleted_at]
        }
    
    def get_by_stage(self, company_id: str, stage: str) -> List[Lead]:
        """Get leads in specific stage"""
        self._ensure_fresh_data()
        from .models import LeadStage
        return [lead for lead in self.data.values()
                if lead.company_id == company_id 
                and lead.stage == LeadStage[stage.upper()]
                and not lead.deleted_at]
    
    def get_unassigned(self, company_id: str) -> List[Lead]:
        """Get unassigned leads"""
        self._ensure_fresh_data()
        return [lead for lead in self.data.values()
                if lead.company_id == company_id 
                and not lead.assigned_to_user_id
                and not lead.is_won and not lead.is_lost
                and not lead.deleted_at]
    
    def delete(self, lead_id: str):
        """Soft delete lead"""
        if lead_id in self.data:
            self.data[lead_id].mark_deleted()


class LeadActivityRepository:
    """Repository for LeadActivity entities"""
    
    def __init__(self):
        self.data = {}
    
    def save(self, activity: LeadActivity) -> LeadActivity:
        """Save activity"""
        self.data[activity.id] = activity
        return activity
    
    def get_by_lead(self, lead_id: str) -> List[LeadActivity]:
        """Get all activities for lead"""
        return [act for act in self.data.values()
                if act.lead_id == lead_id
                and not act.deleted_at]
    
    def get_by_lead_and_type(self, lead_id: str, activity_type: str) -> List[LeadActivity]:
        """Get activities by type"""
        return [act for act in self.data.values()
                if act.lead_id == lead_id 
                and act.activity_type == activity_type
                and not act.deleted_at]


class LeadAssignmentRepository(JSONPersistenceMixin):
    """Repository for LeadAssignment entities"""
    
    FILENAME = "lead_assignments.json"
    
    def __init__(self):
        self.data = {}
        super().__init__()
    
    def _load_data(self, data: dict):
        """Load assignments from JSON data"""
        for assign_data in data.get('assignments', []):
            try:
                assignment = LeadAssignment(**assign_data)
                self.data[assignment.id] = assignment
            except Exception as e:
                print(f"Warning: Could not load assignment {assign_data.get('id')}: {e}")
    
    def _get_data(self) -> dict:
        """Get data as dictionary for JSON serialization"""
        return {
            'assignments': [a.to_dict() if hasattr(a, 'to_dict') else a.__dict__ 
                           for a in self.data.values() if not a.deleted_at]
        }
    
    def save(self, assignment: LeadAssignment) -> LeadAssignment:
        """Save assignment"""
        self.data[assignment.id] = assignment
        self._save_to_file()
        return assignment
    
    def get_active_by_lead(self, lead_id: str) -> Optional[LeadAssignment]:
        """Get active assignment for lead"""
        assignments = [a for a in self.data.values()
                      if a.lead_id == lead_id and a.is_active]
        return assignments[0] if assignments else None
    
    def get_history_by_lead(self, lead_id: str) -> List[LeadAssignment]:
        """Get assignment history for lead"""
        return [a for a in self.data.values()
                if a.lead_id == lead_id]
