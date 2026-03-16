"""
Activity repositories
"""
from typing import List, Optional
from .models import Activity
from ...shared.persistence import JSONPersistenceMixin


class ActivityRepository(JSONPersistenceMixin):
    """Repository for Activity entities"""
    
    FILENAME = "activities.json"
    
    def __init__(self):
        self.data = {}
        super().__init__()
    
    def save(self, activity: Activity) -> Activity:
        """Save activity"""
        self.data[activity.id] = activity
        self._save_to_file()
        return activity
    
    def get_by_id(self, activity_id: str) -> Optional[Activity]:
        """Get activity by ID"""
        return self.data.get(activity_id)
    
    def get_by_company(self, company_id: str) -> List[Activity]:
        """Get all activities for company"""
        self._ensure_fresh_data()
        return [a for a in self.data.values() if a.company_id == company_id]
    
    def get_by_entity(self, entity_type: str, entity_id: str) -> List[Activity]:
        """Get activities for specific entity"""
        self._ensure_fresh_data()
        return [a for a in self.data.values()
                if a.entity_type == entity_type and a.entity_id == entity_id]
    
    def delete(self, activity_id: str) -> bool:
        """Hard delete activity - completely remove from storage"""
        if activity_id in self.data:
            del self.data[activity_id]
            self._save_to_file()
            return True
        return False
    
    def _get_timestamp(self):
        """Get current timestamp"""
        from datetime import datetime
        return datetime.utcnow().isoformat()
    
    def _load_data(self, data: dict):
        """Load activities from JSON data"""
        self.data.clear()  # Clear old data before loading from file
        for activity_data in data.get('activities', []):
            try:
                activity = Activity(**activity_data)
                self.data[activity.id] = activity
            except Exception as e:
                print(f"Warning: Could not load activity {activity_data.get('id')}: {e}")
    
    def _get_data(self) -> dict:
        """Get data as dictionary for JSON serialization"""
        return {
            'activities': [a.to_dict() if hasattr(a, 'to_dict') else a.__dict__ 
                          for a in self.data.values()]
        }
