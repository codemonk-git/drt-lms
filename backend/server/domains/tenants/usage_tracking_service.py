"""
Usage tracking and metrics service.
Tracks resource usage per company and enforces quotas.
"""
from typing import Dict, Any, Optional
from datetime import datetime, timedelta
from enum import Enum


class ResourceType(str, Enum):
    """Types of resources that can be tracked"""
    LEADS = "leads"
    USERS = "users"
    TEAMS = "teams"
    FORMS = "forms"
    API_CALLS = "api_calls"
    STORAGE_GB = "storage_gb"
    ATTACHMENTS = "attachments"
    COMMENTS = "comments"


class UsageTrackingService:
    """Service for tracking company resource usage"""
    
    def __init__(self):
        self.usage_data = {}  # company_id -> {resource_type -> count}
        self.metrics_history = {}  # company_id -> {date -> metrics}
    
    def track_usage(self, 
                   company_id: str,
                   resource_type: ResourceType,
                   delta: int = 1) -> Dict[str, Any]:
        """Track resource usage"""
        
        if company_id not in self.usage_data:
            self.usage_data[company_id] = {}
        
        current = self.usage_data[company_id].get(resource_type.value, 0)
        new_count = max(0, current + delta)
        self.usage_data[company_id][resource_type.value] = new_count
        
        return {
            "company_id": company_id,
            "resource_type": resource_type.value,
            "previous_count": current,
            "current_count": new_count,
            "delta": delta,
            "tracked_at": datetime.utcnow().isoformat()
        }
    
    def get_usage(self,
                 company_id: str,
                 resource_type: Optional[ResourceType] = None) -> Dict[str, Any]:
        """Get current usage for company"""
        
        if company_id not in self.usage_data:
            return {}
        
        if resource_type:
            return {
                resource_type.value: self.usage_data[company_id].get(resource_type.value, 0)
            }
        
        return self.usage_data[company_id].copy()
    
    def record_metrics(self, company_id: str, metrics: Dict[str, Any]) -> Dict[str, Any]:
        """Record daily metrics snapshot"""
        
        today = datetime.utcnow().date().isoformat()
        
        if company_id not in self.metrics_history:
            self.metrics_history[company_id] = {}
        
        self.metrics_history[company_id][today] = {
            **metrics,
            "recorded_at": datetime.utcnow().isoformat()
        }
        
        return self.metrics_history[company_id][today]
    
    def get_metrics_for_period(self,
                              company_id: str,
                              days: int = 30) -> Dict[str, Any]:
        """Get metrics for last N days"""
        
        if company_id not in self.metrics_history:
            return {}
        
        cutoff_date = (datetime.utcnow() - timedelta(days=days)).date()
        
        metrics = {}
        for date_str, data in self.metrics_history[company_id].items():
            if date_str >= cutoff_date.isoformat():
                metrics[date_str] = data
        
        return metrics
    
    def get_usage_summary(self, company_id: str) -> Dict[str, Any]:
        """Get comprehensive usage summary"""
        
        current_usage = self.get_usage(company_id)
        metrics = self.get_metrics_for_period(company_id, days=30)
        
        return {
            "company_id": company_id,
            "current_usage": current_usage,
            "metrics_last_30_days": metrics,
            "generated_at": datetime.utcnow().isoformat()
        }
    
    def reset_monthly_counters(self, company_id: str) -> Dict[str, Any]:
        """Reset monthly usage counters (for subscription billing)"""
        
        monthly_counters = {
            ResourceType.API_CALLS.value: 0
        }
        
        if company_id not in self.usage_data:
            self.usage_data[company_id] = {}
        
        # Only reset monthly counters, keep persistent ones
        for resource_type in [ResourceType.API_CALLS]:
            self.usage_data[company_id][resource_type.value] = 0
        
        return {
            "company_id": company_id,
            "reset_at": datetime.utcnow().isoformat(),
            "counters_reset": list(monthly_counters.keys())
        }
