"""
Repository implementations for permissions and roles
"""
from typing import Optional, List
from .models import Permission, Role, RolePermission, UserRole
from ...db.base_repository import InMemoryRepository


class PermissionRepository(InMemoryRepository[Permission]):
    """Repository for Permission model"""

    def get_by_slug(self, company_id: str, slug: str) -> Optional[Permission]:
        """Get permission by slug within company"""
        for perm in self.data.values():
            if perm.company_id == company_id and perm.slug == slug:
                return perm
        return None

    def list_by_company(self, company_id: str, 
                       category: Optional[str] = None) -> List[Permission]:
        """List permissions in company"""
        items = [p for p in self.data.values() if p.company_id == company_id]
        if category:
            items = [p for p in items if p.category == category]
        return items


class RoleRepository(InMemoryRepository[Role]):
    """Repository for Role model"""

    def list_by_company(self, company_id: str) -> List[Role]:
        """List roles in company"""
        return [r for r in self.data.values() 
               if r.company_id == company_id and not r.deleted_at]


class RolePermissionRepository(InMemoryRepository[RolePermission]):
    """Repository for RolePermission model"""

    def get_by_role(self, role_id: str) -> List[RolePermission]:
        """Get all permissions for a role"""
        return [rp for rp in self.data.values() if rp.role_id == role_id]

    def get_by_permission(self, permission_id: str) -> List[RolePermission]:
        """Get all roles with a permission"""
        return [rp for rp in self.data.values() if rp.permission_id == permission_id]


class UserRoleRepository(InMemoryRepository[UserRole]):
    """Repository for UserRole model"""

    def get_by_user(self, user_id: str, team_id: Optional[str] = None) -> List[UserRole]:
        """Get all roles for a user"""
        items = [ur for ur in self.data.values() if ur.user_id == user_id]
        if team_id:
            items = [ur for ur in items if ur.team_id == team_id]
        return items

    def get_by_user_and_role(self, user_id: str, role_id: str, 
                            team_id: Optional[str] = None) -> Optional[UserRole]:
        """Get specific user role assignment"""
        for ur in self.data.values():
            if ur.user_id == user_id and ur.role_id == role_id:
                if team_id is None or ur.team_id == team_id:
                    return ur
        return None

    def get_by_role(self, role_id: str) -> List[UserRole]:
        """Get all users with a role"""
        return [ur for ur in self.data.values() if ur.role_id == role_id]
