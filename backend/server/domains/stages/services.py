"""
Stage services - Pipeline workflow management with forms and assignments
"""
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from .models import StageDefinition, StageAssignment, StageForm, StageLead, StageHistory
from .repositories import StageRepository


class StageWorkflowService:
    """Service for managing stage pipeline with forms and assignments"""
    
    def __init__(self, stage_repo: StageRepository = None):
        self.stage_repo = stage_repo or StageRepository()
    
    # Stage Definition Management
    def create_stage(self, company_id: str, name: str, order: int = 0, **kwargs) -> StageDefinition:
        """Create pipeline stage"""
        stage = StageDefinition(
            company_id=company_id,
            name=name,
            order=order,
            **kwargs
        )
        return self.stage_repo.save_stage(stage)
    
    def list_company_stages(self, company_id: str) -> List[StageDefinition]:
        """Get all stages for company in order"""
        stages = self.stage_repo.get_company_stages(company_id)
        return sorted(stages, key=lambda x: x.order)
    
    def get_stage(self, stage_id: str) -> Optional[StageDefinition]:
        """Get stage by ID"""
        return self.stage_repo.get_stage(stage_id)
    
    def update_stage(self, stage_id: str, **kwargs) -> Optional[StageDefinition]:
        """Update stage properties"""
        stage = self.stage_repo.get_stage(stage_id)
        if not stage:
            return None
        
        # Update fields
        for key, value in kwargs.items():
            if hasattr(stage, key) and key not in ['id', 'company_id', 'created_at']:
                setattr(stage, key, value)
        
        stage.updated_at = datetime.utcnow()
        return self.stage_repo.save_stage(stage)
    
    def delete_stage(self, stage_id: str) -> Dict:
        """Delete stage and all associated data"""
        # Delete forms associated with stage
        forms = self.stage_repo.get_stage_forms(stage_id)
        for form in forms:
            self.stage_repo.delete_stage_form(form.id)
        
        # Delete assignments
        assignments = self.stage_repo.get_stage_assignments(stage_id)
        for assignment in assignments:
            self.stage_repo.delete_stage_assignment(assignment.id)
        
        # Delete lead movements
        lead_moves = self.stage_repo.get_stage_leads(stage_id)
        for move in lead_moves:
            self.stage_repo.delete_lead_movement(move.id)
        
        # Delete the stage itself
        result = self.stage_repo.delete_stage(stage_id)
        return {"deleted": True, "stage_id": stage_id}
    
    # Stage Assignments
    def assign_member_to_stage(self, company_id: str, stage_id: str, team_id: str,
                               user_id: str = None, role: str = None) -> StageAssignment:
        """Assign team member to handle a stage"""
        assignment = StageAssignment(
            company_id=company_id,
            stage_id=stage_id,
            team_id=team_id,
            user_id=user_id,
            role=role
        )
        return self.stage_repo.save_stage_assignment(assignment)
    
    def get_stage_assignments(self, stage_id: str) -> List[StageAssignment]:
        """Get all members assigned to a stage"""
        return self.stage_repo.get_stage_assignments(stage_id)
    
    def get_member_stages(self, user_id: str) -> List[Dict]:
        """Get all stages where member is assigned"""
        assignments = self.stage_repo.get_member_assignments(user_id)
        result = []
        for assignment in assignments:
            stage = self.get_stage(assignment.stage_id)
            if stage:
                result.append({
                    'stage': stage.to_dict(),
                    'role': assignment.role
                })
        return result
    
    def remove_member_from_stage(self, assignment_id: str) -> Dict:
        """Remove member assignment from stage"""
        result = self.stage_repo.delete_stage_assignment(assignment_id)
        return {"deleted": True, "assignment_id": assignment_id}
    
    # Stage Forms
    def add_form_to_stage(self, company_id: str, stage_id: str, form_id: str,
                         order: int = 0, is_required: bool = False) -> StageForm:
        """Assign form to stage"""
        stage_form = StageForm(
            company_id=company_id,
            stage_id=stage_id,
            form_id=form_id,
            order=order,
            is_required=is_required
        )
        return self.stage_repo.save_stage_form(stage_form)
    
    def get_stage_forms(self, stage_id: str) -> List[StageForm]:
        """Get all forms required at a stage"""
        forms = self.stage_repo.get_stage_forms(stage_id)
        return sorted(forms, key=lambda x: x.order)
    
    def get_required_forms(self, stage_id: str) -> List[StageForm]:
        """Get only required forms for stage"""
        forms = self.get_stage_forms(stage_id)
        return [f for f in forms if f.is_required]
    
    def remove_form_from_stage(self, form_id: str) -> Dict:
        """Remove form assignment from stage"""
        result = self.stage_repo.delete_stage_form(form_id)
        return {"deleted": True, "form_id": form_id}
    
    def remove_form_assignment(self, assignment_id: str) -> Dict:
        """Remove form assignment by assignment ID (uniquely identifies which assignment to delete)"""
        result = self.stage_repo.delete_form_assignment(assignment_id)
        return {"deleted": result, "assignment_id": assignment_id}
    
    # Lead Stage Management
    def move_lead_to_stage(self, company_id: str, lead_id: str, stage_id: str,
                          assigned_user_id: str = None, changed_by_user_id: str = None,
                          reason: str = None, notes: str = None) -> StageLead:
        """Move lead to new stage"""
        # Get current stage
        current_stage = self.stage_repo.get_lead_stage(lead_id)
        from_stage_id = current_stage.current_stage_id if current_stage else None
        
        # Create or update StageLead
        stage_lead = StageLead(
            company_id=company_id,
            lead_id=lead_id,
            current_stage_id=stage_id,
            assigned_user_id=assigned_user_id,
            entered_stage_at=datetime.utcnow().isoformat(),
            forms_completed=[],
            forms_required=[form.form_id for form in self.get_required_forms(stage_id)]
        )
        
        # Save to repository
        saved_lead = self.stage_repo.save_lead_stage(stage_lead)
        
        # Record history
        if from_stage_id:
            time_in_stage = self._calculate_time_in_stage(current_stage)
            self.stage_repo.save_stage_history(StageHistory(
                company_id=company_id,
                lead_id=lead_id,
                from_stage_id=from_stage_id,
                to_stage_id=stage_id,
                changed_by_user_id=changed_by_user_id,
                reason=reason or 'Manual transition',
                time_in_stage_hours=time_in_stage,
                notes=notes
            ))
        
        return saved_lead
    
    def get_lead_current_stage(self, lead_id: str) -> Optional[Dict]:
        """Get lead's current stage with forms and assignments"""
        lead_stage = self.stage_repo.get_lead_stage(lead_id)
        if not lead_stage:
            return None
        
        stage = self.get_stage(lead_stage.current_stage_id)
        forms = self.get_stage_forms(lead_stage.current_stage_id)
        assignments = self.get_stage_assignments(lead_stage.current_stage_id)
        
        return {
            'lead': lead_stage.to_dict(),
            'stage': stage.to_dict() if stage else None,
            'forms': [f.to_dict() for f in forms],
            'forms_completed': lead_stage.forms_completed,
            'forms_required': lead_stage.forms_required,
            'forms_pending': [f for f in lead_stage.forms_required if f not in lead_stage.forms_completed],
            'assigned_members': [a.to_dict() for a in assignments],
            'can_progress': len([f for f in lead_stage.forms_required if f not in lead_stage.forms_completed]) == 0
        }
    
    def mark_form_completed(self, lead_id: str, form_id: str) -> Optional[StageLead]:
        """Mark form as completed for lead in current stage"""
        lead_stage = self.stage_repo.get_lead_stage(lead_id)
        if not lead_stage:
            return None
        
        if form_id not in lead_stage.forms_completed:
            lead_stage.forms_completed.append(form_id)
        
        return self.stage_repo.save_lead_stage(lead_stage)
    
    def get_lead_workflow(self, lead_id: str) -> Dict:
        """Get complete workflow history for lead"""
        history = self.stage_repo.get_lead_stage_history(lead_id)
        
        return {
            'lead_id': lead_id,
            'transitions': [h.to_dict() for h in history],
            'total_transitions': len(history),
            'stage_durations': self._calculate_stage_durations(history)
        }
    
    def get_user_accessible_forms(self, user_id: str, lead_id: str) -> List[Dict]:
        """Get forms user can access for lead (based on assigned stages)"""
        # Get lead's current stage
        lead_stage = self.stage_repo.get_lead_stage(lead_id)
        if not lead_stage:
            return []
        
        # Get forms for current stage
        stage_forms = self.get_stage_forms(lead_stage.current_stage_id)
        
        # Check if user is assigned to this stage
        assignments = self.get_stage_assignments(lead_stage.current_stage_id)
        is_assigned = any(a.user_id == user_id for a in assignments)
        
        if not is_assigned:
            return []
        
        return [
            {
                'form_id': f.form_id,
                'order': f.order,
                'is_required': f.is_required,
                'is_completed': f.form_id in lead_stage.forms_completed
            }
            for f in stage_forms
        ]
    
    def get_next_steps(self, lead_id: str) -> Dict:
        """Get what's needed to progress to next stage"""
        lead_stage = self.stage_repo.get_lead_stage(lead_id)
        if not lead_stage:
            return {}
        
        stage = self.get_stage(lead_stage.current_stage_id)
        pending_forms = [f for f in lead_stage.forms_required if f not in lead_stage.forms_completed]
        
        all_stages = self.list_company_stages(lead_stage.company_id)
        current_index = next((i for i, s in enumerate(all_stages) if s.id == lead_stage.current_stage_id), -1)
        next_stage = all_stages[current_index + 1] if current_index + 1 < len(all_stages) else None
        
        return {
            'current_stage': stage.to_dict() if stage else None,
            'pending_forms': pending_forms,
            'pending_count': len(pending_forms),
            'can_progress': len(pending_forms) == 0,
            'next_stage': next_stage.to_dict() if next_stage else None
        }
    
    def get_pipeline_analytics(self, company_id: str) -> Dict:
        """Get pipeline analytics"""
        stages = self.list_company_stages(company_id)
        all_leads = self.stage_repo.get_company_lead_stages(company_id)
        
        analytics = {
            'total_leads': len(all_leads),
            'by_stage': {}
        }
        
        for stage in stages:
            leads_in_stage = [l for l in all_leads if l.current_stage_id == stage.id]
            avg_time = self._calculate_avg_stage_time(company_id, stage.id)
            
            analytics['by_stage'][stage.name] = {
                'stage_id': stage.id,
                'count': len(leads_in_stage),
                'percentage': len(leads_in_stage) / len(all_leads) * 100 if all_leads else 0,
                'avg_time_hours': avg_time
            }
        
        return analytics
    
    # Private helpers
    def _calculate_time_in_stage(self, stage_lead: StageLead) -> float:
        """Calculate hours spent in stage"""
        if stage_lead.entered_stage_at:
            try:
                entered = datetime.fromisoformat(stage_lead.entered_stage_at.replace('Z', '+00:00'))
                now = datetime.utcnow()
                return (now - entered).total_seconds() / 3600
            except:
                return 0
        return 0
    
    def _calculate_stage_durations(self, history: List[StageHistory]) -> Dict:
        """Calculate time spent in each stage"""
        durations = {}
        for h in history:
            stage_id = h.from_stage_id
            if stage_id:
                if stage_id not in durations:
                    durations[stage_id] = []
                durations[stage_id].append(h.time_in_stage_hours)
        
        averages = {}
        for stage_id, times in durations.items():
            averages[stage_id] = sum(times) / len(times) if times else 0
        
        return averages
    
    def _calculate_avg_stage_time(self, company_id: str, stage_id: str) -> float:
        """Calculate average time leads spend in a stage"""
        histories = self.stage_repo.get_company_stage_history(company_id)
        times = [h.time_in_stage_hours for h in histories if h.from_stage_id == stage_id]
        return sum(times) / len(times) if times else 0
