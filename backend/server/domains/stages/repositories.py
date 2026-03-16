"""
Stage repositories
"""
from typing import List, Optional
from .models import StageDefinition, StageAssignment, StageForm, StageLead, StageHistory
from ...shared.persistence import JSONPersistenceMixin


class StageRepository(JSONPersistenceMixin):
    """Repository for stage pipeline definitions and tracking"""
    
    FILENAME = "stages.json"
    
    def __init__(self):
        self.stages = {}  # Stage definitions
        self.assignments = {}  # Member assignments to stages
        self.forms = {}  # Forms assigned to stages
        self.lead_stages = {}  # Current stage per lead
        self.history = {}  # Transition history
        super().__init__()
    
    # Stage Definition
    def save_stage(self, stage: StageDefinition) -> StageDefinition:
        """Save stage definition"""
        self.stages[stage.id] = stage
        self._save_to_file()
        return stage
    
    def get_stage(self, stage_id: str) -> Optional[StageDefinition]:
        """Get stage by ID"""
        return self.stages.get(stage_id)
    
    def get_company_stages(self, company_id: str) -> List[StageDefinition]:
        """Get all stages for company"""
        return [s for s in self.stages.values() 
                if s.company_id == company_id and s.is_active and not s.deleted_at]
    
    def delete_stage(self, stage_id: str) -> bool:
        """Mark stage as deleted"""
        if stage_id in self.stages:
            self.stages[stage_id].deleted_at = True
            self._save_to_file()
            return True
        return False
    
    # Stage Assignments
    def save_stage_assignment(self, assignment: StageAssignment) -> StageAssignment:
        """Save member assignment to stage"""
        self.assignments[assignment.id] = assignment
        self._save_to_file()
        return assignment
    
    def get_stage_assignments(self, stage_id: str) -> List[StageAssignment]:
        """Get all members assigned to a stage"""
        return [a for a in self.assignments.values()
                if a.stage_id == stage_id and a.is_active and not a.deleted_at]
    
    def get_member_assignments(self, user_id: str) -> List[StageAssignment]:
        """Get all stages where member is assigned"""
        return [a for a in self.assignments.values()
                if a.user_id == user_id and a.is_active and not a.deleted_at]
    
    def delete_stage_assignment(self, assignment_id: str) -> bool:
        """Mark assignment as deleted"""
        if assignment_id in self.assignments:
            self.assignments[assignment_id].deleted_at = True
            self._save_to_file()
            return True
        return False
    
    # Stage Forms
    def save_stage_form(self, stage_form: StageForm) -> StageForm:
        """Save form assignment to stage"""
        self.forms[stage_form.id] = stage_form
        self._save_to_file()
        return stage_form
    
    def get_stage_forms(self, stage_id: str) -> List[StageForm]:
        """Get all forms for a stage"""
        return [f for f in self.forms.values()
                if f.stage_id == stage_id and f.is_active and not f.deleted_at]
    
    def delete_stage_form(self, form_id: str) -> bool:
        """Mark form assignment as deleted"""
        # Find the StageForm by its form_id property (not by dict key)
        for assignment_id, stage_form in self.forms.items():
            if stage_form.form_id == form_id:
                stage_form.deleted_at = True
                self._save_to_file()
                return True
        return False
    
    def delete_form_assignment(self, assignment_id: str) -> bool:
        """Delete form assignment by assignment ID (uniquely identifies which assignment to delete)"""
        if assignment_id in self.forms:
            self.forms[assignment_id].deleted_at = True
            self._save_to_file()
            return True
        return False
    
    # Lead Stage Tracking
    def save_lead_stage(self, lead_stage: StageLead) -> StageLead:
        """Save or update lead's current stage"""
        self.lead_stages[lead_stage.lead_id] = lead_stage
        self._save_to_file()
        return lead_stage
    
    def get_lead_stage(self, lead_id: str) -> Optional[StageLead]:
        """Get lead's current stage"""
        return self.lead_stages.get(lead_id)
    
    def get_company_lead_stages(self, company_id: str) -> List[StageLead]:
        """Get all leads and their current stages for company"""
        return [l for l in self.lead_stages.values()
                if l.company_id == company_id and l.is_active and not l.deleted_at]
    
    def get_stage_leads(self, stage_id: str) -> List[StageLead]:
        """Get all leads currently in a stage"""
        return [l for l in self.lead_stages.values()
                if l.stage_id == stage_id and l.is_active and not l.deleted_at]
    
    def delete_lead_movement(self, lead_id: str) -> bool:
        """Mark lead's stage movement as deleted"""
        if lead_id in self.lead_stages:
            self.lead_stages[lead_id].deleted_at = True
            self._save_to_file()
            return True
        return False
    
    # Stage History
    def save_stage_history(self, history: StageHistory) -> StageHistory:
        """Save stage transition history"""
        self.history[history.id] = history
        self._save_to_file()
        return history
    
    def get_lead_stage_history(self, lead_id: str) -> List[StageHistory]:
        """Get all transitions for a lead"""
        transitions = [h for h in self.history.values()
                      if h.lead_id == lead_id and not h.deleted_at]
        return sorted(transitions, key=lambda x: x.created_at)
    
    def get_company_stage_history(self, company_id: str) -> List[StageHistory]:
        """Get all transitions for company"""
        return [h for h in self.history.values()
                if h.company_id == company_id and not h.deleted_at]
    
    def _load_data(self, data: dict):
        """Load all stage data from JSON"""
        for stage_data in data.get('stages', []):
            try:
                stage = StageDefinition(**stage_data)
                self.stages[stage.id] = stage
            except Exception as e:
                print(f"Warning: Could not load stage {stage_data.get('id')}: {e}")
        
        for assign_data in data.get('assignments', []):
            try:
                assignment = StageAssignment(**assign_data)
                self.assignments[assignment.id] = assignment
            except Exception as e:
                print(f"Warning: Could not load assignment {assign_data.get('id')}: {e}")
        
        for form_data in data.get('forms', []):
            try:
                form = StageForm(**form_data)
                self.forms[form.id] = form
            except Exception as e:
                print(f"Warning: Could not load form {form_data.get('id')}: {e}")
        
        for lead_data in data.get('lead_stages', []):
            try:
                lead = StageLead(**lead_data)
                self.lead_stages[lead.lead_id] = lead
            except Exception as e:
                print(f"Warning: Could not load lead stage {lead_data.get('lead_id')}: {e}")
        
        for hist_data in data.get('history', []):
            try:
                hist = StageHistory(**hist_data)
                self.history[hist.id] = hist
            except Exception as e:
                print(f"Warning: Could not load history {hist_data.get('id')}: {e}")
    
    def _get_data(self) -> dict:
        """Get all data as dictionary for JSON serialization"""
        return {
            'stages': [s.to_dict() if hasattr(s, 'to_dict') else s.__dict__
                      for s in self.stages.values() if not s.deleted_at],
            'assignments': [a.to_dict() if hasattr(a, 'to_dict') else a.__dict__
                           for a in self.assignments.values() if not a.deleted_at],
            'forms': [f.to_dict() if hasattr(f, 'to_dict') else f.__dict__
                     for f in self.forms.values() if not f.deleted_at],
            'lead_stages': [l.to_dict() if hasattr(l, 'to_dict') else l.__dict__
                           for l in self.lead_stages.values() if not l.deleted_at],
            'history': [h.to_dict() if hasattr(h, 'to_dict') else h.__dict__
                       for h in self.history.values() if not h.deleted_at]
        }
