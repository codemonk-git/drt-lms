"""
Permission and Role models - Permissions domain
"""
from datetime import datetime
from typing import Optional, List
from ...shared.models.base import BaseModel


class Permission(BaseModel):
    """Permission model - defines what can be done"""
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.company_id = kwargs.get('company_id')
        self.name = kwargs.get('name')
        self.slug = kwargs.get('slug')  # e.g., 'user:create', 'team:manage'
        self.description = kwargs.get('description')
        self.category = kwargs.get('category')  # e.g., 'users', 'teams', 'settings'
        self.resource = kwargs.get('resource')  # The resource type (users, teams, etc.)
        self.action = kwargs.get('action')  # The action (create, read, update, delete)


class Role(BaseModel):
    """Role model - groups permissions together"""
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.company_id = kwargs.get('company_id')
        self.name = kwargs.get('name')
        self.slug = kwargs.get('slug')  # e.g., 'team-lead', 'admin'
        self.description = kwargs.get('description')
        self.permissions = kwargs.get('permissions') or []  # List of permission IDs
        self.is_system = kwargs.get('is_system') or False  # Built-in roles
        self.is_active = kwargs.get('is_active') or True


class RolePermission(BaseModel):
    """Relationship model for Role-Permission many-to-many"""
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.role_id = kwargs.get('role_id')
        self.permission_id = kwargs.get('permission_id')
        self.assigned_at = kwargs.get('assigned_at') or datetime.utcnow()


class UserRole(BaseModel):
    """Assignment of roles to users - may be scoped to teams"""
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.user_id = kwargs.get('user_id')
        self.role_id = kwargs.get('role_id')
        self.company_id = kwargs.get('company_id')
        self.team_id = kwargs.get('team_id')  # Optional - role scoped to a team
        self.assigned_at = kwargs.get('assigned_at') or datetime.utcnow()
        self.assigned_by = kwargs.get('assigned_by')  # User ID who assigned the role
