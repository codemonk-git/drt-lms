"""
Subscription management and enforcement service.
Manages company plans and enforces feature/quota limits.
"""
from enum import Enum
from typing import Optional, Dict, Any
from datetime import datetime, timedelta


class SubscriptionPlan(str, Enum):
    """Available subscription plans"""
    FREE = "free"
    STARTER = "starter"
    PROFESSIONAL = "professional"
    ENTERPRISE = "enterprise"


class PlanLimits:
    """Feature limits and quotas per plan"""
    
    LIMITS = {
        SubscriptionPlan.FREE: {
            "max_leads": 100,
            "max_users": 3,
            "max_teams": 1,
            "max_forms": 5,
            "max_storage_gb": 1,
            "api_calls_per_month": 10000,
            "features": ["basic_crm", "forms"]
        },
        SubscriptionPlan.STARTER: {
            "max_leads": 1000,
            "max_users": 10,
            "max_teams": 5,
            "max_forms": 25,
            "max_storage_gb": 10,
            "api_calls_per_month": 100000,
            "features": ["basic_crm", "forms", "email_integration", "automation"]
        },
        SubscriptionPlan.PROFESSIONAL: {
            "max_leads": 10000,
            "max_users": 50,
            "max_teams": 20,
            "max_forms": 100,
            "max_storage_gb": 100,
            "api_calls_per_month": 500000,
            "features": ["basic_crm", "forms", "email_integration", "automation", 
                        "analytics", "custom_fields", "workflows"]
        },
        SubscriptionPlan.ENTERPRISE: {
            "max_leads": None,  # Unlimited
            "max_users": None,
            "max_teams": None,
            "max_forms": None,
            "max_storage_gb": None,
            "api_calls_per_month": None,
            "features": ["*"]  # All features
        }
    }
    
    @classmethod
    def get_limits(cls, plan: SubscriptionPlan) -> Dict[str, Any]:
        """Get limits for a plan"""
        return cls.LIMITS.get(plan, {})
    
    @classmethod
    def has_feature(cls, plan: SubscriptionPlan, feature: str) -> bool:
        """Check if plan has a feature"""
        limits = cls.get_limits(plan)
        features = limits.get("features", [])
        return "*" in features or feature in features


class SubscriptionService:
    """Service for managing company subscriptions"""
    
    def __init__(self):
        self.subscriptions = {}  # In production: database
    
    def create_subscription(self, 
                           company_id: str,
                           plan: SubscriptionPlan,
                           annual_billing: bool = False) -> Dict[str, Any]:
        """Create subscription for company"""
        
        billing_cycle = 365 if annual_billing else 30
        next_billing = datetime.utcnow() + timedelta(days=billing_cycle)
        
        subscription = {
            "company_id": company_id,
            "plan": plan.value,
            "annual_billing": annual_billing,
            "status": "active",
            "started_at": datetime.utcnow().isoformat(),
            "next_billing_date": next_billing.isoformat(),
            "auto_renew": True
        }
        
        self.subscriptions[company_id] = subscription
        return subscription
    
    def get_subscription(self, company_id: str) -> Optional[Dict[str, Any]]:
        """Get subscription for company"""
        return self.subscriptions.get(company_id)
    
    def upgrade_plan(self, 
                     company_id: str,
                     new_plan: SubscriptionPlan) -> Dict[str, Any]:
        """Upgrade company plan"""
        subscription = self.get_subscription(company_id)
        if not subscription:
            raise ValueError(f"No subscription found for company {company_id}")
        
        subscription["plan"] = new_plan.value
        subscription["upgraded_at"] = datetime.utcnow().isoformat()
        self.subscriptions[company_id] = subscription
        return subscription
    
    def cancel_subscription(self, company_id: str) -> bool:
        """Cancel subscription"""
        subscription = self.get_subscription(company_id)
        if not subscription:
            return False
        
        subscription["status"] = "cancelled"
        subscription["cancelled_at"] = datetime.utcnow().isoformat()
        self.subscriptions[company_id] = subscription
        return True
    
    def check_feature_access(self, 
                            company_id: str,
                            feature: str) -> bool:
        """Check if company has access to feature"""
        subscription = self.get_subscription(company_id)
        if not subscription:
            return False
        
        plan = SubscriptionPlan(subscription["plan"])
        return PlanLimits.has_feature(plan, feature)
    
    def check_quota(self,
                   company_id: str,
                   resource_type: str,
                   current_count: int) -> bool:
        """Check if company has reached quota"""
        subscription = self.get_subscription(company_id)
        if not subscription:
            return False
        
        plan = SubscriptionPlan(subscription["plan"])
        limits = PlanLimits.get_limits(plan)
        
        limit_key = f"max_{resource_type}s"
        limit = limits.get(limit_key)
        
        # Unlimited or not set
        if limit is None:
            return True
        
        return current_count < limit
    
    def get_remaining_quota(self,
                           company_id: str,
                           resource_type: str,
                           current_count: int) -> Optional[int]:
        """Get remaining quota for resource"""
        subscription = self.get_subscription(company_id)
        if not subscription:
            return None
        
        plan = SubscriptionPlan(subscription["plan"])
        limits = PlanLimits.get_limits(plan)
        
        limit_key = f"max_{resource_type}s"
        limit = limits.get(limit_key)
        
        if limit is None:
            return None
        
        return max(0, limit - current_count)
