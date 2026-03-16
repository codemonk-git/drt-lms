"""
Assignment repositories
"""
from typing import List, Optional
from .models import Assignment
from ...shared.persistence import JSONPersistenceMixin


class AssignmentRepository(JSONPersistenceMixin):
    """Repository for Assignment entities"""
    
    FILENAME = "assignments.json"
    
    def __init__(self):
        self.data = {}
        super().__init__()
    
    def save(self, assignment: Assignment) -> Assignment:
        """Save assignment"""
        self.data[assignment.id] = assignment
        self._save_to_file()
        return assignment
    
    def get_by_id(self, assignment_id: str) -> Optional[Assignment]:
        """Get assignment by ID"""
        self._ensure_fresh_data()
        return self.data.get(assignment_id)
    
    def get_active_for_entity(self, assignment_type: str, entity_id: str) -> List[Assignment]:
        """Get active assignments for entity"""
        self._ensure_fresh_data()
        return [a for a in self.data.values()
                if a.assignment_type == assignment_type and a.entity_id == entity_id 
                and a.is_active and not a.deleted_at]
    
    def get_assigned_to_user(self, user_id: str, assignment_type: str = None) -> List[Assignment]:
        """Get assignments for user"""
        self._ensure_fresh_data()
        assignments = [a for a in self.data.values()
                      if a.assigned_to_user_id == user_id and a.is_active and not a.deleted_at]
        if assignment_type:
            assignments = [a for a in assignments if a.assignment_type == assignment_type]
        return assignments
    
    def _load_data(self, data: dict):
        """Load assignments from JSON data"""
        for assignment_data in data.get('assignments', []):
            try:
                assignment = Assignment(**assignment_data)
                self.data[assignment.id] = assignment
            except Exception as e:
                print(f"Warning: Could not load assignment {assignment_data.get('id')}: {e}")
    
    def _get_data(self) -> dict:
        """Get data as dictionary for JSON serialization"""
        return {
            'assignments': [a.to_dict() if hasattr(a, 'to_dict') else a.__dict__ 
                           for a in self.data.values() if not a.deleted_at]
        }
