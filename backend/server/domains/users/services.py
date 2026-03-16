"""
Users domain services.
"""
from typing import Optional, List
from datetime import datetime
from .models import User, UserStatus, SuperAdmin
from .repositories import UserRepository, SuperAdminRepository
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    """Hash password with bcrypt"""
    return pwd_context.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    """Verify password with bcrypt"""
    return pwd_context.verify(password, password_hash)


class UserService:
    """Service for user management"""

    def __init__(self, user_repo: UserRepository = None):
        self.user_repo = user_repo or UserRepository()

    def create_user(self,
                   company_id: str,
                   email: str,
                   password: str,
                   first_name: str,
                   last_name: str,
                   phone: Optional[str] = None,
                   role: Optional[str] = None) -> User:
        """Create a new user"""
        # Validate inputs
        if not email or len(email.strip()) == 0:
            raise ValueError("Email is required")
        
        if len(password) < 8:
            raise ValueError("Password must be at least 8 characters")
        
        if not first_name or len(first_name.strip()) == 0:
            raise ValueError("First name is required")
        
        if not last_name or len(last_name.strip()) == 0:
            raise ValueError("Last name is required")

        # Check if email already exists in company
        existing = self.user_repo.get_by_email(email, company_id)
        if existing:
            raise ValueError(f"User with email '{email}' already exists in this company")

        # Determine user role (default to USER if not specified)
        from .models import UserRole
        user_role = UserRole.ADMIN if role == 'admin' else UserRole.USER

        # Create user
        user = User(
            company_id=company_id,
            email=email.lower(),
            password_hash=hash_password(password),
            first_name=first_name.strip(),
            last_name=last_name.strip(),
            phone=phone,
            role=user_role,
            status=UserStatus.PENDING
        )

        saved_user = self.user_repo.save(user)
        return saved_user

    def get_user(self, user_id: str) -> Optional[User]:
        """Get user by ID"""
        return self.user_repo.get(user_id)

    def get_user_by_email(self, email: str, company_id: str) -> Optional[User]:
        """Get user by email within a company"""
        return self.user_repo.get_by_email(email.lower(), company_id)

    def list_company_users(self,
                          company_id: str,
                          status: Optional[UserStatus] = None,
                          limit: int = 100,
                          offset: int = 0) -> List[User]:
        """List users in a company"""
        return self.user_repo.list_by_company(company_id, status=status, 
                                             limit=limit, offset=offset)

    def update_user(self,
                   user_id: str,
                   **kwargs) -> Optional[User]:
        """Update user information"""
        user = self.user_repo.get(user_id)
        if not user:
            raise ValueError(f"User {user_id} not found")

        allowed_fields = ['first_name', 'last_name', 'phone', 'avatar_url']
        for field, value in kwargs.items():
            if field in allowed_fields and value is not None:
                setattr(user, field, value)

        user.updated_at = datetime.utcnow()
        updated = self.user_repo.save(user)
        return updated

    def change_password(self, user_id: str, old_password: str, new_password: str) -> bool:
        """Change user password"""
        user = self.user_repo.get(user_id)
        if not user:
            raise ValueError(f"User {user_id} not found")

        if not verify_password(old_password, user.password_hash):
            raise ValueError("Current password is incorrect")

        if len(new_password) < 8:
            raise ValueError("New password must be at least 8 characters")

        user.password_hash = hash_password(new_password)
        user.updated_at = datetime.utcnow()
        self.user_repo.save(user)
        return True

    def reset_password(self, user_id: str, new_password: str) -> bool:
        """Admin reset user password - doesn't require old password"""
        user = self.user_repo.get(user_id)
        if not user:
            raise ValueError(f"User {user_id} not found")

        if len(new_password) < 8:
            raise ValueError("New password must be at least 8 characters")

        user.password_hash = hash_password(new_password)
        user.updated_at = datetime.utcnow()
        self.user_repo.save(user)
        return True

    def verify_email(self, user_id: str) -> User:
        """Mark user email as verified"""
        user = self.user_repo.get(user_id)
        if not user:
            raise ValueError(f"User {user_id} not found")

        user.verify_email()
        updated = self.user_repo.save(user)
        return updated

    def activate_user(self, user_id: str) -> User:
        """Activate user"""
        user = self.user_repo.get(user_id)
        if not user:
            raise ValueError(f"User {user_id} not found")

        user.activate()
        updated = self.user_repo.save(user)
        return updated

    def suspend_user(self, user_id: str) -> User:
        """Suspend user"""
        user = self.user_repo.get(user_id)
        if not user:
            raise ValueError(f"User {user_id} not found")

        user.suspend()
        updated = self.user_repo.save(user)
        return updated

    def delete_user(self, user_id: str) -> bool:
        """Soft delete user"""
        user = self.user_repo.get(user_id)
        if not user:
            raise ValueError(f"User {user_id} not found")

        user.mark_deleted()
        self.user_repo.save(user)
        return True

    def authenticate_user(self, email: str, password: str, company_id: str = None) -> Optional[User]:
        """Authenticate user with email and password"""
        # If no company_id provided, find user by email globally
        if company_id:
            user = self.get_user_by_email(email, company_id)
        else:
            user = self.user_repo.get_by_email_global(email)
        
        print(f"[AUTH] Looking for user with email: {email}")
        print(f"[AUTH] Found user: {user}")
        
        if not user:
            print(f"[AUTH] User not found")
            return None

        # Allow PENDING users to login for development
        # In production, only allow ACTIVE users
        # if user.status != UserStatus.ACTIVE:
        #     return None

        print(f"[AUTH] Verifying password. Hash starts with: {user.password_hash[:20] if user.password_hash else 'None'}...")
        if not verify_password(password, user.password_hash):
            print(f"[AUTH] Password verification failed")
            return None

        print(f"[AUTH] Password verified successfully")
        user.update_last_login()
        self.user_repo.save(user)
        return user


class SuperAdminService:
    """Service for super admin management"""

    def __init__(self, admin_repo: SuperAdminRepository = None):
        self.admin_repo = admin_repo or SuperAdminRepository()

    def create_admin(self, email: str, password: str, full_name: str) -> SuperAdmin:
        """Create a new super admin"""
        if not email:
            raise ValueError("Email is required")
        
        if len(password) < 8:
            raise ValueError("Password must be at least 8 characters")
        
        if not full_name:
            raise ValueError("Full name is required")

        existing = self.admin_repo.get_by_email(email)
        if existing:
            raise ValueError(f"Admin with email '{email}' already exists")

        admin = SuperAdmin(
            email=email.lower(),
            password_hash=hash_password(password),
            full_name=full_name
        )

        return self.admin_repo.save(admin)

    def get_admin(self, admin_id: str) -> Optional[SuperAdmin]:
        """Get admin by ID"""
        return self.admin_repo.get(admin_id)

    def get_admin_by_email(self, email: str) -> Optional[SuperAdmin]:
        """Get admin by email"""
        return self.admin_repo.get_by_email(email.lower())

    def authenticate_admin(self, email: str, password: str) -> Optional[SuperAdmin]:
        """Authenticate admin"""
        admin = self.get_admin_by_email(email)
        if not admin or not admin.is_active:
            return None

        if not verify_password(password, admin.password_hash):
            return None

        return admin
