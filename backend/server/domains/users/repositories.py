"""
Users domain repositories.
"""
from typing import Optional, List
from .models import User, UserStatus, SuperAdmin
from ...shared.persistence import JSONPersistenceMixin


class UserRepository(JSONPersistenceMixin):
    """Repository for User entities"""
    
    FILENAME = "users.json"
    
    def __init__(self):
        self.data = {}
        super().__init__()
    
    def save(self, user: User) -> User:
        """Save user"""
        self.data[user.id] = user
        self._save_to_file()
        return user
    
    def get(self, user_id: str) -> Optional[User]:
        """Get user by ID"""
        # Reload from file to ensure we have the latest data
        self._ensure_fresh_data()
        return self.data.get(user_id)
    
    def get_by_email(self, email: str, company_id: str) -> Optional[User]:
        """Get user by email within a company"""
        # Reload from file to ensure we have the latest data
        self._load_from_file()
        for user in self.data.values():
            if user.email == email and user.company_id == company_id and not user.deleted_at:
                return user
        return None
    
    def get_by_email_global(self, email: str) -> Optional[User]:
        """Get user by email across all companies"""
        # Reload from file to ensure we have the latest data
        self._load_from_file()
        for user in self.data.values():
            if user.email == email and not user.deleted_at:
                return user
        return None
    
    def _load_data(self, data: dict):
        """Load users from JSON data"""
        for user_data in data.get('users', []):
            try:
                user = User(**user_data)
                self.data[user.id] = user
            except Exception as e:
                print(f"Warning: Could not load user {user_data.get('id')}: {e}")
    
    def _get_data(self) -> dict:
        """Get data as dictionary for JSON serialization"""
        return {
            'users': [u.to_dict() if hasattr(u, 'to_dict') else u.__dict__ 
                     for u in self.data.values() if not u.deleted_at]
        }
    
    def list_by_company(self, company_id: str, 
                       status: Optional[UserStatus] = None,
                       limit: int = 100, offset: int = 0) -> List[User]:
        """List users in a company"""
        users = [u for u in self.data.values() 
                if u.company_id == company_id and not u.deleted_at]
        if status:
            users = [u for u in users if u.status == status]
        return users[offset:offset + limit]
    
    def delete(self, user_id: str) -> bool:
        """Delete user"""
        if user_id in self.data:
            del self.data[user_id]
            return True
        return False


class SuperAdminRepository:
    """Repository for SuperAdmin entities"""
    
    def __init__(self):
        self.data = {}
    
    def save(self, admin: SuperAdmin) -> SuperAdmin:
        """Save super admin"""
        self.data[admin.id] = admin
        return admin
    
    def get(self, admin_id: str) -> Optional[SuperAdmin]:
        """Get super admin by ID"""
        return self.data.get(admin_id)
    
    def get_by_email(self, email: str) -> Optional[SuperAdmin]:
        """Get super admin by email"""
        for admin in self.data.values():
            if admin.email == email and not admin.deleted_at:
                return admin
        return None
    
    def delete(self, admin_id: str) -> bool:
        """Delete super admin"""
        if admin_id in self.data:
            del self.data[admin_id]
            return True
        return False
