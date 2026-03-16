"""
Users domain models.
"""
from datetime import datetime
from typing import Optional
from enum import Enum
from ...shared.models.base import BaseModel


class UserStatus(str, Enum):
    """User status enumeration"""
    PENDING = "pending"
    ACTIVE = "active"
    SUSPENDED = "suspended"
    INACTIVE = "inactive"


class UserRole(str, Enum):
    """User role enumeration"""
    ADMIN = "admin"
    USER = "user"


class User(BaseModel):
    """User model"""
    def __init__(self, company_id: str, email: str, password_hash: str, first_name: str, last_name: str, **kwargs):
        super().__init__(**kwargs)
        self.company_id = company_id
        self.email = email
        self.password_hash = password_hash
        self.first_name = first_name
        self.last_name = last_name
        self.phone: Optional[str] = kwargs.get('phone')
        self.avatar_url: Optional[str] = kwargs.get('avatar_url')
        self.status: UserStatus = kwargs.get('status', UserStatus.PENDING)
        self.role: UserRole = kwargs.get('role', UserRole.USER)
        self.email_verified: bool = kwargs.get('email_verified', False)
        self.email_verified_at: Optional[datetime] = kwargs.get('email_verified_at')
        self.last_login: Optional[datetime] = kwargs.get('last_login')
        self.fcm_token: Optional[str] = kwargs.get('fcm_token')  # Firebase Cloud Messaging token

    @property
    def full_name(self) -> str:
        """Get full name"""
        return f"{self.first_name} {self.last_name}".strip()

    def verify_email(self):
        """Mark email as verified"""
        self.email_verified = True
        self.email_verified_at = datetime.utcnow()
        self.updated_at = datetime.utcnow()

    def activate(self):
        """Activate user"""
        self.status = UserStatus.ACTIVE
        self.updated_at = datetime.utcnow()

    def suspend(self):
        """Suspend user"""
        self.status = UserStatus.SUSPENDED
        self.updated_at = datetime.utcnow()

    def update_last_login(self):
        """Update last login timestamp"""
        self.last_login = datetime.utcnow()
        self.updated_at = datetime.utcnow()


class SuperAdmin(BaseModel):
    """Super admin model"""
    def __init__(self, email: str, password_hash: str, full_name: str, **kwargs):
        super().__init__(**kwargs)
        self.email = email
        self.password_hash = password_hash
        self.full_name = full_name
        self.is_active: bool = kwargs.get('is_active', True)

    def activate(self):
        """Activate super admin"""
        self.is_active = True
        self.updated_at = datetime.utcnow()

    def deactivate(self):
        """Deactivate super admin"""
        self.is_active = False
        self.updated_at = datetime.utcnow()
