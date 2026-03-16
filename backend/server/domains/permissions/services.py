"""
Permission and Role services - Permissions domain
"""
from typing import Optional, List
from .models import Permission, Role, UserRole
from .repositories import (
    PermissionRepository, RoleRepository, UserRoleRepository,
    RolePermissionRepository
)


class PermissionService:
    """Service for managing permissions"""
    
    def __init__(self, permission_repo: PermissionRepository, 
                 role_repo: RoleRepository = None):
        self.permission_repo = permission_repo
        self.role_repo = role_repo
    
    def create_permission(self, company_id: str, name: str, slug: str,
                         description: str = "", category: str = "",
                         resource: str = "", action: str = "") -> Permission:
        """Create a new permission"""
        permission = Permission(
            company_id=company_id,
            name=name,
            slug=slug,
            description=description,
            category=category,
            resource=resource,
            action=action
        )
        return self.permission_repo.save(permission)
    
    def get_permission(self, permission_id: str) -> Optional[Permission]:
        """Get permission by ID"""
        return self.permission_repo.get(permission_id)
    
    def list_company_permissions(self, company_id: str,
                                category: str = None) -> List[Permission]:
        """List all permissions in a company"""
        return self.permission_repo.list_by_company(company_id, category)
    
    def update_permission(self, permission_id: str, **kwargs) -> Optional[Permission]:
        """Update a permission"""
        permission = self.permission_repo.get(permission_id)
        if not permission:
            return None
        
        for key, value in kwargs.items():
            if hasattr(permission, key):
                setattr(permission, key, value)
        
        return self.permission_repo.save(permission)


class RoleService:
    """Service for managing roles"""
    
    def __init__(self, role_repo: RoleRepository, 
                 permission_repo: PermissionRepository):
        self.role_repo = role_repo
        self.permission_repo = permission_repo
    
    def create_role(self, company_id: str, name: str, slug: str = "",
                   description: str = "", permissions: List[str] = None,
                   is_system: bool = False) -> Role:
        """Create a new role"""
        role = Role(
            company_id=company_id,
            name=name,
            slug=slug or name.lower().replace(" ", "-"),
            description=description,
            permissions=permissions or [],
            is_system=is_system
        )
        return self.role_repo.save(role)
    
    def get_role(self, role_id: str) -> Optional[Role]:
        """Get role by ID"""
        return self.role_repo.get(role_id)
    
    def list_company_roles(self, company_id: str) -> List[Role]:
        """List all roles in a company"""
        return self.role_repo.list_by_company(company_id)
    
    def add_permission_to_role(self, role_id: str, permission_id: str) -> Optional[Role]:
        """Add a permission to a role"""
        role = self.role_repo.get(role_id)
        if not role:
            return None
        
        if permission_id not in role.permissions:
            role.permissions.append(permission_id)
            role = self.role_repo.save(role)
        
        return role
    
    def remove_permission_from_role(self, role_id: str, permission_id: str) -> Optional[Role]:
        """Remove a permission from a role"""
        role = self.role_repo.get(role_id)
        if not role or permission_id not in role.permissions:
            return None
        
        role.permissions.remove(permission_id)
        return self.role_repo.save(role)
    
    def update_role(self, role_id: str, **kwargs) -> Optional[Role]:
        """Update a role"""
        role = self.role_repo.get(role_id)
        if not role:
            return None
        
        for key, value in kwargs.items():
            if hasattr(role, key) and key != 'permissions':
                setattr(role, key, value)
        
        return self.role_repo.save(role)


class UserRoleService:
    """Service for assigning roles to users"""
    
    def __init__(self, user_role_repo: UserRoleRepository,
                 role_repo: RoleRepository):
        self.user_role_repo = user_role_repo
        self.role_repo = role_repo
    
    def assign_role(self, user_id: str, role_id: str, company_id: str,
                   team_id: str = None, assigned_by: str = None) -> UserRole:
        """Assign a role to a user"""
        user_role = UserRole(
            user_id=user_id,
            role_id=role_id,
            company_id=company_id,
            team_id=team_id,
            assigned_by=assigned_by
        )
        return self.user_role_repo.save(user_role)
    
    def revoke_role(self, user_id: str, role_id: str, team_id: str = None) -> bool:
        """Revoke a role from a user"""
        user_role = self.user_role_repo.get_by_user_and_role(user_id, role_id, team_id)
        if not user_role:
            return False
        
        self.user_role_repo.delete(user_role.id)
        return True
    
    def get_user_roles(self, user_id: str, team_id: str = None) -> List[UserRole]:
        """Get all roles for a user"""
        return self.user_role_repo.get_by_user(user_id, team_id)
    
    def has_role(self, user_id: str, role_id: str, team_id: str = None) -> bool:
        """Check if user has a role"""
        return self.user_role_repo.get_by_user_and_role(user_id, role_id, team_id) is not None
