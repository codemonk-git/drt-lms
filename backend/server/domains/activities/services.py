"""
Activity services
"""
from typing import List, Optional
from .models import Activity, ActivityType
from .repositories import ActivityRepository


class ActivityService:
    """Service for managing activities"""
    
    def __init__(self, activity_repo: ActivityRepository = None):
        self.activity_repo = activity_repo or ActivityRepository()
    
    def log_activity(self, company_id: str, user_id: str, activity_type: ActivityType,
                     entity_type: str, entity_id: str, description: str = None,
                     metadata: dict = None) -> Activity:
        """Log an activity"""
        activity = Activity(
            company_id=company_id,
            user_id=user_id,
            activity_type=activity_type,
            entity_type=entity_type,
            entity_id=entity_id,
            description=description,
            metadata=metadata or {}
        )
        return self.activity_repo.save(activity)
    
    def get_company_activities(self, company_id: str, skip: int = 0, limit: int = 20) -> List[Activity]:
        """Get all activities for company"""
        activities = self.activity_repo.get_by_company(company_id)
        # Sort by created_at descending (newest first)
        activities = sorted(activities, key=lambda a: a.created_at, reverse=True)
        return activities[skip:skip + limit]

    def get_all_company_activities(self, company_id: str) -> List[Activity]:
        """Get ALL activities for company (no pagination) — for summary/reporting"""
        activities = self.activity_repo.get_by_company(company_id)
        return activities
    
    def get_lead_activities(self, lead_id: str, skip: int = 0, limit: int = 20) -> List[Activity]:
        """Get activities for specific lead"""
        activities = self.activity_repo.get_by_entity('lead', lead_id)
        # Sort by created_at descending (newest first)
        activities = sorted(activities, key=lambda a: a.created_at, reverse=True)
        return activities[skip:skip + limit]
    
    def get_entity_activities(self, entity_type: str, entity_id: str) -> List[Activity]:
        """Get activities for specific entity"""
        return self.activity_repo.get_by_entity(entity_type, entity_id)
    
    def delete_activity(self, activity_id: str) -> bool:
        """Delete an activity"""
        return self.activity_repo.delete(activity_id)
