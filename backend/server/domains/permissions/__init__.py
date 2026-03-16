"""
Permissions domain - Role and permission management
"""
from .models import Permission, Role, RolePermission, UserRole
from .repositories import (
    PermissionRepository, RoleRepository, RolePermissionRepository, 
    UserRoleRepository
)
from .services import PermissionService, RoleService, UserRoleService
from .routes import router

__all__ = [
    # Models
    'Permission',
    'Role',
    'RolePermission',
    'UserRole',
    # Repositories
    'PermissionRepository',
    'RoleRepository',
    'RolePermissionRepository',
    'UserRoleRepository',
    # Services
    'PermissionService',
    'RoleService',
    'UserRoleService',
    'router'
]
