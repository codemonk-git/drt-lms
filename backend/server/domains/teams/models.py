"""
Teams domain models.
"""
from datetime import datetime
from typing import Optional
from enum import Enum
from ...shared.models.base import BaseModel


class TeamRole(str, Enum):
    """Team member role enumeration"""
    OWNER = "owner"
    MANAGER = "manager"
    MEMBER = "member"
    VIEWER = "viewer"


class TeamActivityType(str, Enum):
    """Team activity type enumeration"""
    TEAM_CREATED = "team_created"
    TEAM_UPDATED = "team_updated"
    MEMBER_ADDED = "member_added"
    MEMBER_REMOVED = "member_removed"
    MEMBER_ROLE_CHANGED = "member_role_changed"
    SETTINGS_UPDATED = "settings_updated"


class HierarchyType(str, Enum):
    """Hierarchy node type enumeration"""
    DIVISION = "division"
    DEPARTMENT = "department"
    UNIT = "unit"


class Team(BaseModel):
    """Team model"""
    def __init__(self, company_id: str, name: str, **kwargs):
        super().__init__(**kwargs)
        self.company_id = company_id
        self.name = name
        self.description: Optional[str] = kwargs.get('description')
        self.slug: Optional[str] = kwargs.get('slug')
        self.parent_team_id: Optional[str] = kwargs.get('parent_team_id')
        self.team_lead_id: Optional[str] = kwargs.get('team_lead_id')
        self.created_by: Optional[str] = kwargs.get('created_by')

    def add_parent_team(self, parent_team_id: str):
        """Add parent team to create hierarchy"""
        self.parent_team_id = parent_team_id
        self.updated_at = datetime.utcnow()


class TeamMember(BaseModel):
    """Team member model"""
    def __init__(self, team_id: str, user_id: str, role: str = "member", **kwargs):
        super().__init__(**kwargs)
        self.team_id = team_id
        self.user_id = user_id
        self.role: str = role
        self.joined_at: datetime = kwargs.get('joined_at', datetime.utcnow())
        self.added_by: Optional[str] = kwargs.get('added_by')

    def update_role(self, new_role: str):
        """Update member role"""
        valid_roles = [r.value for r in TeamRole]
        if new_role not in valid_roles:
            raise ValueError(f"Invalid role: {new_role}")
        self.role = new_role
        self.updated_at = datetime.utcnow()


class TeamSettings(BaseModel):
    """Team settings model"""
    def __init__(self, team_id: str, **kwargs):
        super().__init__(**kwargs)
        self.team_id = team_id
        self.is_private: bool = kwargs.get('is_private', False)
        self.allow_member_add: bool = kwargs.get('allow_member_add', True)
        self.notifications_enabled: bool = kwargs.get('notifications_enabled', True)


class TeamActivity(BaseModel):
    """Team activity log model"""
    def __init__(self, team_id: str, activity_type: str, **kwargs):
        super().__init__(**kwargs)
        self.team_id = team_id
        self.activity_type = activity_type
        self.performed_by: Optional[str] = kwargs.get('performed_by')
        self.affected_user_id: Optional[str] = kwargs.get('affected_user_id')
        self.details: Optional[dict] = kwargs.get('details', {})
        self.created_at: datetime = datetime.utcnow()


class HierarchyNode(BaseModel):
    """Organizational hierarchy node model"""
    def __init__(self, company_id: str, name: str, type: HierarchyType, **kwargs):
        super().__init__(**kwargs)
        self.company_id = company_id
        self.name = name
        self.type = type
        self.parent_id: Optional[str] = kwargs.get('parent_id')
        self.description: Optional[str] = kwargs.get('description')
        self.metadata: Optional[dict] = kwargs.get('metadata')

    def add_child(self, child_node: 'HierarchyNode'):
        """Add child node to hierarchy"""
        child_node.parent_id = self.id
        return child_node

    def get_path(self, nodes_dict: dict) -> list:
        """Get path from root to this node"""
        path = [self.name]
        current_id = self.parent_id
        while current_id and current_id in nodes_dict:
            path.insert(0, nodes_dict[current_id].name)
            current_id = nodes_dict[current_id].parent_id
        return path
