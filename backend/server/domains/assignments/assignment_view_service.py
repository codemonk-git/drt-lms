"""
Assignment View Service - Provides joined views of assignments with actual entities
"""
from typing import List, Dict, Optional
from datetime import datetime
from .models import Assignment, AssignmentStatus, AssignmentType
from .repositories import AssignmentRepository
from server.domains.leads.repositories import LeadRepository


class AssignmentViewService:
    """Service for viewing assignments with their actual entities"""
    
    def __init__(self, assignment_repo: AssignmentRepository = None,
                 lead_repo: LeadRepository = None):
        self.assignment_repo = assignment_repo or AssignmentRepository()
        self.lead_repo = lead_repo or LeadRepository()
    
    def get_user_workqueue(self, user_id: str, status: str = None) -> Dict:
        """Get user's complete work queue (all assigned items)"""
        assignments = self.assignment_repo.get_assigned_to_user(user_id)
        
        # Filter by status if provided
        if status:
            assignments = [a for a in assignments if a.status == status]
        
        # Group by type
        workqueue = {
            'user_id': user_id,
            'total_items': len(assignments),
            'leads': [],
            'followups': [],
            'tasks': [],
            'accounts': [],
            'campaigns': [],
            'summary': {
                'total': len(assignments),
                'by_status': self._get_status_breakdown(assignments),
                'by_priority': self._get_priority_breakdown(assignments),
                'overdue_count': len([a for a in assignments if a.status == AssignmentStatus.OVERDUE])
            }
        }
        
        # Load entities
        for assignment in assignments:
            entity_data = self._get_entity_with_assignment(assignment)
            if entity_data:
                if assignment.assignment_type == AssignmentType.LEAD:
                    workqueue['leads'].append(entity_data)
                elif assignment.assignment_type == AssignmentType.TASK:
                    workqueue['tasks'].append(entity_data)
                elif assignment.assignment_type == 'followup':
                    workqueue['followups'].append(entity_data)
                elif assignment.assignment_type == AssignmentType.ACCOUNT:
                    workqueue['accounts'].append(entity_data)
                elif assignment.assignment_type == AssignmentType.CAMPAIGN:
                    workqueue['campaigns'].append(entity_data)
        
        return workqueue
    
    def get_user_leads(self, user_id: str, status: str = None) -> List[Dict]:
        """Get all assigned leads for user"""
        assignments = self.assignment_repo.get_assigned_to_user(user_id, AssignmentType.LEAD)
        
        if status:
            assignments = [a for a in assignments if a.status == status]
        
        leads = []
        for assignment in assignments:
            entity_data = self._get_entity_with_assignment(assignment)
            if entity_data:
                leads.append(entity_data)
        
        return leads
    
    def get_user_followups(self, user_id: str, status: str = None) -> List[Dict]:
        """Get all assigned followups for user"""
        assignments = [a for a in self.assignment_repo.get_assigned_to_user(user_id)
                      if a.assignment_type == 'followup']
        
        if status:
            assignments = [a for a in assignments if a.status == status]
        
        followups = []
        for assignment in assignments:
            entity_data = self._get_entity_with_assignment(assignment)
            if entity_data:
                followups.append(entity_data)
        
        return followups
    
    def get_user_pending_items(self, user_id: str) -> List[Dict]:
        """Get all pending items (not completed/overdue)"""
        assignments = self.assignment_repo.get_assigned_to_user(user_id)
        pending = [a for a in assignments if a.status in [AssignmentStatus.PENDING, AssignmentStatus.IN_PROGRESS]]
        
        items = []
        for assignment in pending:
            entity_data = self._get_entity_with_assignment(assignment)
            if entity_data:
                items.append(entity_data)
        
        return sorted(items, key=lambda x: x.get('assignment', {}).get('priority', 'medium'))
    
    def get_user_overdue_items(self, user_id: str) -> List[Dict]:
        """Get all overdue items"""
        assignments = self.assignment_repo.get_assigned_to_user(user_id)
        overdue = [a for a in assignments if a.status == AssignmentStatus.OVERDUE]
        
        items = []
        for assignment in overdue:
            entity_data = self._get_entity_with_assignment(assignment)
            if entity_data:
                items.append(entity_data)
        
        return items
    
    def get_user_due_soon(self, user_id: str, days: int = 3) -> List[Dict]:
        """Get items due within N days"""
        from datetime import datetime, timedelta
        
        assignments = self.assignment_repo.get_assigned_to_user(user_id)
        pending = [a for a in assignments if a.status in [AssignmentStatus.PENDING, AssignmentStatus.IN_PROGRESS]]
        
        now = datetime.utcnow()
        due_soon = []
        
        for assignment in pending:
            if assignment.due_date:
                try:
                    due = datetime.fromisoformat(assignment.due_date.replace('Z', '+00:00'))
                    if now < due <= now + timedelta(days=days):
                        due_soon.append(assignment)
                except:
                    pass
        
        items = []
        for assignment in due_soon:
            entity_data = self._get_entity_with_assignment(assignment)
            if entity_data:
                items.append(entity_data)
        
        return sorted(items, key=lambda x: x.get('assignment', {}).get('due_date', ''))
    
    def get_user_high_priority(self, user_id: str) -> List[Dict]:
        """Get high and urgent priority items"""
        from .models import AssignmentPriority
        
        assignments = self.assignment_repo.get_assigned_to_user(user_id)
        high_priority = [a for a in assignments 
                        if a.priority in [AssignmentPriority.HIGH, AssignmentPriority.URGENT]]
        
        items = []
        for assignment in high_priority:
            entity_data = self._get_entity_with_assignment(assignment)
            if entity_data:
                items.append(entity_data)
        
        return sorted(items, key=lambda x: x.get('assignment', {}).get('priority', 'high'))
    
    def _get_entity_with_assignment(self, assignment: Assignment) -> Optional[Dict]:
        """Get entity with assignment metadata"""
        try:
            if assignment.assignment_type == AssignmentType.LEAD:
                entity = self.lead_repo.get_by_id(assignment.entity_id)
                if entity:
                    return {
                        'type': 'lead',
                        'entity': entity.to_dict() if hasattr(entity, 'to_dict') else entity.__dict__,
                        'assignment': {
                            'id': assignment.id,
                            'status': assignment.status,
                            'priority': assignment.priority,
                            'due_date': assignment.due_date,
                            'completed_at': assignment.completed_at,
                            'assigned_at': str(assignment.created_at),
                            'notes': assignment.notes
                        }
                    }
            
            elif assignment.assignment_type == 'followup':
                # Followups are now embedded in leads, find the lead containing this followup
                leads = self.lead_repo.get_all()
                for lead in leads:
                    if lead.next_followup and lead.next_followup.id == assignment.entity_id:
                        return {
                            'type': 'followup',
                            'entity': lead.next_followup.to_dict() if hasattr(lead.next_followup, 'to_dict') else lead.next_followup.__dict__,
                            'assignment': {
                                'id': assignment.id,
                                'status': assignment.status,
                                'priority': assignment.priority,
                                'due_date': assignment.due_date,
                                'completed_at': assignment.completed_at,
                                'assigned_at': str(assignment.created_at),
                                'notes': assignment.notes
                            }
                        }
            
            # For other types, return just the assignment
            return {
                'type': assignment.assignment_type,
                'entity_id': assignment.entity_id,
                'assignment': {
                    'id': assignment.id,
                    'status': assignment.status,
                    'priority': assignment.priority,
                    'due_date': assignment.due_date,
                    'completed_at': assignment.completed_at,
                    'assigned_at': str(assignment.created_at),
                    'notes': assignment.notes
                }
            }
        except Exception as e:
            # Entity might be deleted, return assignment metadata only
            return {
                'type': assignment.assignment_type,
                'entity_id': assignment.entity_id,
                'assignment': {
                    'id': assignment.id,
                    'status': assignment.status,
                    'priority': assignment.priority,
                    'due_date': assignment.due_date,
                    'completed_at': assignment.completed_at,
                    'assigned_at': str(assignment.created_at),
                    'notes': assignment.notes
                }
            }
    
    def _get_status_breakdown(self, assignments: List[Assignment]) -> Dict:
        """Get breakdown by status"""
        return {
            'pending': len([a for a in assignments if a.status == AssignmentStatus.PENDING]),
            'in_progress': len([a for a in assignments if a.status == AssignmentStatus.IN_PROGRESS]),
            'completed': len([a for a in assignments if a.status == AssignmentStatus.COMPLETED]),
            'overdue': len([a for a in assignments if a.status == AssignmentStatus.OVERDUE]),
            'reassigned': len([a for a in assignments if a.status == AssignmentStatus.REASSIGNED])
        }
    
    def _get_priority_breakdown(self, assignments: List[Assignment]) -> Dict:
        """Get breakdown by priority"""
        from .models import AssignmentPriority
        
        return {
            'urgent': len([a for a in assignments if a.priority == AssignmentPriority.URGENT]),
            'high': len([a for a in assignments if a.priority == AssignmentPriority.HIGH]),
            'medium': len([a for a in assignments if a.priority == AssignmentPriority.MEDIUM]),
            'low': len([a for a in assignments if a.priority == AssignmentPriority.LOW])
        }
