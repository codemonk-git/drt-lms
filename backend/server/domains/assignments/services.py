"""
Assignment services
"""
from typing import List, Dict, Optional
from datetime import datetime
from .models import Assignment, AssignmentType, AssignmentStatus, AssignmentPriority
from .repositories import AssignmentRepository


class AssignmentService:
    """Service for managing assignments"""
    
    def __init__(self, assignment_repo: AssignmentRepository = None):
        self.assignment_repo = assignment_repo or AssignmentRepository()
    
    def assign(self, company_id: str, team_id: str, assignment_type: AssignmentType, 
               entity_id: str, assigned_to_user_id: str, assigned_by_user_id: str, 
               priority: AssignmentPriority = AssignmentPriority.MEDIUM,
               due_date: str = None, notes: str = None) -> Assignment:
        """Create new assignment"""
        assignment = Assignment(
            company_id=company_id,
            team_id=team_id,
            assignment_type=assignment_type,
            entity_id=entity_id,
            assigned_to_user_id=assigned_to_user_id,
            assigned_by_user_id=assigned_by_user_id,
            status=AssignmentStatus.PENDING,
            priority=priority,
            due_date=due_date,
            notes=notes
        )
        saved_assignment = self.assignment_repo.save(assignment)
        
        # Log activity for assignment (check both enum and string values)
        is_lead_assignment = (assignment_type == AssignmentType.LEAD or 
                             assignment_type == "lead" or 
                             str(assignment_type) == "lead")
        
        if is_lead_assignment:
            try:
                from server.domains.activities.services import ActivityService
                from server.domains.activities.models import ActivityType
                activity_service = ActivityService()
                
                # Get user name for better description
                user_name = 'Unknown'
                if assigned_to_user_id:
                    try:
                        from server.domains.users.repositories import UserRepository
                        
                        user_repo = UserRepository()
                        user = user_repo.get(assigned_to_user_id)
                        print(f"[ASSIGNMENT] User lookup result for {assigned_to_user_id}: {user}")
                        
                        if user:
                            # Try to build full name
                            first_name = getattr(user, 'first_name', None) or ''
                            last_name = getattr(user, 'last_name', None) or ''
                            full_name = f"{first_name} {last_name}".strip()
                            
                            if full_name and full_name != '':
                                user_name = full_name
                            elif hasattr(user, 'email') and user.email:
                                user_name = user.email
                            else:
                                user_name = str(user) if user else 'Unknown'
                        else:
                            user_name = f'User {assigned_to_user_id[-8:] if len(assigned_to_user_id) > 8 else assigned_to_user_id}'
                    except Exception as lookup_error:
                        print(f"[ASSIGNMENT] Failed to lookup user {assigned_to_user_id}: {lookup_error}")
                        import traceback
                        traceback.print_exc()
                        user_name = f'User {assigned_to_user_id[-8:] if len(assigned_to_user_id) > 8 else assigned_to_user_id}'
                
                print(f"[ASSIGNMENT] Logging activity: Assigned to {user_name}")
                activity_service.log_activity(
                    company_id=company_id,
                    user_id=assigned_by_user_id,
                    activity_type=ActivityType.LEAD_ASSIGNED,
                    entity_type='lead',
                    entity_id=entity_id,
                    description=f'Assigned to {user_name}',
                    metadata={'assignment_id': saved_assignment.id, 'priority': str(priority)}
                )
            except Exception as e:
                print(f"[ASSIGNMENT] Failed to log assignment activity: {e}")
        
        return saved_assignment
    
    def update_status(self, assignment_id: str, status: AssignmentStatus) -> Optional[Assignment]:
        """Update assignment status"""
        assignment = self.assignment_repo.get_by_id(assignment_id)
        if not assignment:
            return None
        
        assignment.status = status
        if status == AssignmentStatus.COMPLETED:
            assignment.completed_at = datetime.utcnow().isoformat()
        
        return self.assignment_repo.save(assignment)
    
    def reassign(self, assignment_id: str, new_user_id: str, reassigned_by_user_id: str,
                 notes: str = None) -> Optional[Assignment]:
        """Reassign to different user"""
        assignment = self.assignment_repo.get_by_id(assignment_id)
        if not assignment:
            return None
        
        # Track previous owner
        assignment.previous_owner_id = assignment.assigned_to_user_id
        assignment.assigned_to_user_id = new_user_id
        assignment.assigned_by_user_id = reassigned_by_user_id
        assignment.status = AssignmentStatus.REASSIGNED
        assignment.reassigned_at = datetime.utcnow().isoformat()
        if notes:
            assignment.notes = notes
        
        return self.assignment_repo.save(assignment)
    
    def unassign(self, assignment_id: str) -> bool:
        """Unassign entity"""
        assignment = self.assignment_repo.get_by_id(assignment_id)
        if assignment:
            assignment.is_active = False
            self.assignment_repo.save(assignment)
            return True
        return False
    
    def get_assignment(self, assignment_id: str) -> Optional[Assignment]:
        """Get assignment by ID"""
        return self.assignment_repo.get_by_id(assignment_id)
    
    def get_entity_assignments(self, assignment_type: str, entity_id: str) -> List[Assignment]:
        """Get assignments for entity"""
        return self.assignment_repo.get_active_for_entity(assignment_type, entity_id)
    
    def get_user_assignments(self, user_id: str, assignment_type: str = None,
                            status: AssignmentStatus = None) -> List[Assignment]:
        """Get assignments for user with optional filtering"""
        assignments = self.assignment_repo.get_assigned_to_user(user_id, assignment_type)
        if status:
            assignments = [a for a in assignments if a.status == status]
        return assignments
    
    def get_user_workload(self, user_id: str) -> Dict:
        """Get user's current workload"""
        all_assignments = self.assignment_repo.get_assigned_to_user(user_id)
        
        pending = len([a for a in all_assignments if a.status == AssignmentStatus.PENDING])
        in_progress = len([a for a in all_assignments if a.status == AssignmentStatus.IN_PROGRESS])
        completed = len([a for a in all_assignments if a.status == AssignmentStatus.COMPLETED])
        overdue = len([a for a in all_assignments if a.status == AssignmentStatus.OVERDUE])
        
        urgent = len([a for a in all_assignments if a.priority == AssignmentPriority.URGENT])
        high = len([a for a in all_assignments if a.priority == AssignmentPriority.HIGH])
        
        return {
            'user_id': user_id,
            'total_assignments': len(all_assignments),
            'pending': pending,
            'in_progress': in_progress,
            'completed': completed,
            'overdue': overdue,
            'urgent': urgent,
            'high': high,
            'active_assignments': pending + in_progress,
            'completion_rate': completed / len(all_assignments) if all_assignments else 0
        }
    
    def get_team_workload(self, team_id: str) -> Dict:
        """Get team's workload distribution"""
        user_workloads = {}
        
        all_team_assignments = [a for a in self.assignment_repo.data.values()
                               if a.team_id == team_id and a.is_active and not a.deleted_at]
        
        # Group by user
        for assignment in all_team_assignments:
            if assignment.assigned_to_user_id not in user_workloads:
                user_workloads[assignment.assigned_to_user_id] = self.get_user_workload(assignment.assigned_to_user_id)
        
        total_active = sum(w['active_assignments'] for w in user_workloads.values())
        avg_load = total_active / len(user_workloads) if user_workloads else 0
        
        return {
            'team_id': team_id,
            'total_members': len(user_workloads),
            'total_active_assignments': total_active,
            'average_load': avg_load,
            'user_workloads': user_workloads
        }
    
    def get_performance_stats(self, company_id: str, team_id: str = None) -> Dict:
        """Get assignment performance statistics"""
        # Filter assignments
        assignments = [a for a in self.assignment_repo.data.values()
                      if a.company_id == company_id and a.is_active and not a.deleted_at]
        
        if team_id:
            assignments = [a for a in assignments if a.team_id == team_id]
        
        completed = [a for a in assignments if a.status == AssignmentStatus.COMPLETED]
        overdue = [a for a in assignments if a.status == AssignmentStatus.OVERDUE]
        
        # Calculate times to completion
        completion_times = []
        for assignment in completed:
            if assignment.completed_at:
                try:
                    created = datetime.fromisoformat(str(assignment.created_at).replace('Z', '+00:00'))
                    completed_time = datetime.fromisoformat(assignment.completed_at.replace('Z', '+00:00'))
                    delta = (completed_time - created).total_seconds() / 3600  # hours
                    completion_times.append(delta)
                except:
                    pass
        
        avg_completion_time = sum(completion_times) / len(completion_times) if completion_times else 0
        
        return {
            'total_assignments': len(assignments),
            'completed': len(completed),
            'overdue': len(overdue),
            'pending': len([a for a in assignments if a.status == AssignmentStatus.PENDING]),
            'in_progress': len([a for a in assignments if a.status == AssignmentStatus.IN_PROGRESS]),
            'completion_rate': len(completed) / len(assignments) if assignments else 0,
            'overdue_rate': len(overdue) / len(assignments) if assignments else 0,
            'avg_completion_hours': round(avg_completion_time, 2),
            'assignments_by_type': self._get_type_breakdown(assignments),
            'assignments_by_priority': self._get_priority_breakdown(assignments)
        }
    
    def _get_type_breakdown(self, assignments: List[Assignment]) -> Dict:
        """Get breakdown by assignment type"""
        breakdown = {}
        for assignment in assignments:
            assignment_type = assignment.assignment_type
            if assignment_type not in breakdown:
                breakdown[assignment_type] = 0
            breakdown[assignment_type] += 1
        return breakdown
    
    def _get_priority_breakdown(self, assignments: List[Assignment]) -> Dict:
        """Get breakdown by priority"""
        breakdown = {
            'urgent': len([a for a in assignments if a.priority == AssignmentPriority.URGENT]),
            'high': len([a for a in assignments if a.priority == AssignmentPriority.HIGH]),
            'medium': len([a for a in assignments if a.priority == AssignmentPriority.MEDIUM]),
            'low': len([a for a in assignments if a.priority == AssignmentPriority.LOW])
        }
        return breakdown
