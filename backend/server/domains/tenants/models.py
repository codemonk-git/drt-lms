"""
Tenant (Company) domain models.
"""
from datetime import datetime
from typing import Optional
from enum import Enum
from ...shared.models.base import BaseModel


class CompanyStatus(str, Enum):
    """Company status enumeration"""
    PENDING = "pending"
    ACTIVE = "active"
    SUSPENDED = "suspended"
    INACTIVE = "inactive"


class Company(BaseModel):
    """Company/Tenant model"""
    def __init__(self, name: str, slug: str, **kwargs):
        super().__init__(**kwargs)
        self.name = name
        self.slug = slug
        self.industry: Optional[str] = kwargs.get('industry')
        self.website: Optional[str] = kwargs.get('website')
        self.logo_url: Optional[str] = kwargs.get('logo_url')
        self.description: Optional[str] = kwargs.get('description')
        self.subscription_plan: str = kwargs.get('subscription_plan', 'free')
        self.status: CompanyStatus = kwargs.get('status', CompanyStatus.PENDING)
        self.owner_id: Optional[str] = kwargs.get('owner_id')

    def activate(self):
        """Activate company"""
        self.status = CompanyStatus.ACTIVE
        self.updated_at = datetime.utcnow()

    def suspend(self):
        """Suspend company"""
        self.status = CompanyStatus.SUSPENDED
        self.updated_at = datetime.utcnow()

    def deactivate(self):
        """Deactivate company"""
        self.status = CompanyStatus.INACTIVE
        self.updated_at = datetime.utcnow()


class CompanySettings(BaseModel):
    """Company settings model"""
    def __init__(self, company_id: str, **kwargs):
        super().__init__(**kwargs)
        self.company_id = company_id
        self.allow_team_creation: bool = kwargs.get('allow_team_creation', True)
        self.allow_user_invitation: bool = kwargs.get('allow_user_invitation', True)
        self.require_email_verification: bool = kwargs.get('require_email_verification', True)
        self.two_factor_authentication: bool = kwargs.get('two_factor_authentication', False)
        self.session_timeout_minutes: int = kwargs.get('session_timeout_minutes', 30)
