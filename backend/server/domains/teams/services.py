"""
Teams domain services.
"""
from typing import Optional, List
from datetime import datetime
from .models import Team, TeamMember, TeamSettings, TeamActivity, HierarchyNode, HierarchyType, TeamRole, TeamActivityType
from .repositories import TeamRepository, TeamMemberRepository, HierarchyRepository


class TeamService:
    """Service for team management"""

    def __init__(self,
                 team_repo: TeamRepository = None,
                 member_repo: TeamMemberRepository = None):
        self.team_repo = team_repo or TeamRepository()
        self.member_repo = member_repo or TeamMemberRepository()
        self.activities = {}  # In-memory activity log
        self.settings = {}  # In-memory team settings

    def create_team(self,
                   company_id: str,
                   name: str,
                   created_by: str,
                   description: Optional[str] = None,
                   slug: Optional[str] = None,
                   parent_team_id: Optional[str] = None,
                   team_lead_id: Optional[str] = None) -> Team:
        """Create a new team"""
        if not name or len(name.strip()) == 0:
            raise ValueError("Team name is required")

        # Auto-generate slug if not provided
        if not slug:
            slug = name.lower().replace(' ', '-')

        # Check if team slug already exists in company
        existing = self.team_repo.get_by_slug(company_id, slug)
        if existing:
            raise ValueError(f"Team with slug '{slug}' already exists in this company")

        team = Team(
            company_id=company_id,
            name=name.strip(),
            slug=slug,
            description=description,
            parent_team_id=parent_team_id,
            team_lead_id=team_lead_id,
            created_by=created_by
        )

        saved_team = self.team_repo.save(team)
        
        # Create default team settings
        settings = TeamSettings(team_id=saved_team.id)
        self.settings[saved_team.id] = settings
        
        # Log activity
        self._log_activity(saved_team.id, TeamActivityType.TEAM_CREATED, created_by)
        
        return saved_team

    def get_team(self, team_id: str) -> Optional[Team]:
        """Get team by ID"""
        return self.team_repo.get(team_id)

    def list_company_teams(self,
                          company_id: str,
                          limit: int = 100,
                          offset: int = 0) -> List[Team]:
        """List all teams in a company"""
        return self.team_repo.list_by_company(company_id, limit=limit, offset=offset)

    def add_team_member(self,
                       team_id: str,
                       user_id: str,
                       role: str = TeamRole.MEMBER,
                       added_by: Optional[str] = None) -> TeamMember:
        """Add member to team with role"""
        # Check if already a member
        existing = self.member_repo.get_by_team_and_user(team_id, user_id)
        if existing:
            raise ValueError(f"User {user_id} is already a member of this team")

        member = TeamMember(
            team_id=team_id,
            user_id=user_id,
            role=role,
            added_by=added_by
        )

        saved_member = self.member_repo.save(member)
        
        # Log activity
        self._log_activity(team_id, TeamActivityType.MEMBER_ADDED, added_by, 
                          affected_user_id=user_id, details={'role': role})
        
        return saved_member

    def remove_team_member(self, team_id: str, user_id: str, removed_by: Optional[str] = None) -> bool:
        """Remove member from team"""
        member = self.member_repo.get_by_team_and_user(team_id, user_id)
        if not member:
            raise ValueError(f"User {user_id} is not a member of this team")

        self.member_repo.delete(member.id)
        
        # Log activity
        self._log_activity(team_id, TeamActivityType.MEMBER_REMOVED, removed_by, 
                          affected_user_id=user_id)
        
        return True

    def update_member_role(self, team_id: str, user_id: str, new_role: str, updated_by: Optional[str] = None) -> TeamMember:
        """Update member role in team"""
        member = self.member_repo.get_by_team_and_user(team_id, user_id)
        if not member:
            raise ValueError(f"User {user_id} is not a member of this team")

        old_role = member.role
        member.update_role(new_role)
        saved_member = self.member_repo.save(member)
        
        # Log activity
        self._log_activity(team_id, TeamActivityType.MEMBER_ROLE_CHANGED, updated_by,
                          affected_user_id=user_id, details={'old_role': old_role, 'new_role': new_role})
        
        return saved_member

    def get_team_members(self, team_id: str) -> List[TeamMember]:
        """Get all members of a team"""
        return self.member_repo.get_by_team(team_id)

    def get_member_by_role(self, team_id: str, role: str) -> List[TeamMember]:
        """Get team members by role"""
        all_members = self.get_team_members(team_id)
        return [m for m in all_members if m.role == role]

    def update_team(self,
                   team_id: str,
                   updated_by: Optional[str] = None,
                   **kwargs) -> Optional[Team]:
        """Update team information"""
        team = self.team_repo.get(team_id)
        if not team:
            raise ValueError(f"Team {team_id} not found")

        allowed_fields = ['name', 'description', 'parent_team_id', 'team_lead_id']
        for field, value in kwargs.items():
            if field in allowed_fields and value is not None:
                setattr(team, field, value)
            elif field == 'team_lead_id' and value is None:
                # Allow explicitly setting team_lead_id to None
                setattr(team, field, None)

        team.updated_at = datetime.utcnow()
        updated = self.team_repo.save(team)
        
        # Log activity
        self._log_activity(team_id, TeamActivityType.TEAM_UPDATED, updated_by, 
                          details=kwargs)
        
        return updated

    def delete_team(self, team_id: str, deleted_by: Optional[str] = None) -> bool:
        """Soft delete team"""
        team = self.team_repo.get(team_id)
        if not team:
            raise ValueError(f"Team {team_id} not found")

        team.mark_deleted()
        self.team_repo.save(team)
        
        # Log activity
        self._log_activity(team_id, TeamActivityType.TEAM_UPDATED, deleted_by, 
                          details={'status': 'deleted'})
        
        return True

    # Team Settings Management
    def get_team_settings(self, team_id: str) -> TeamSettings:
        """Get team settings"""
        if team_id not in self.settings:
            self.settings[team_id] = TeamSettings(team_id=team_id)
        return self.settings[team_id]

    def update_team_settings(self, team_id: str, updated_by: Optional[str] = None, **kwargs) -> TeamSettings:
        """Update team settings"""
        settings = self.get_team_settings(team_id)
        
        allowed_fields = ['is_private', 'allow_member_add', 'notifications_enabled']
        changes = {}
        for field, value in kwargs.items():
            if field in allowed_fields and value is not None:
                changes[field] = value
                setattr(settings, field, value)

        settings.updated_at = datetime.utcnow()
        
        # Log activity
        if changes:
            self._log_activity(team_id, TeamActivityType.SETTINGS_UPDATED, updated_by,
                              details=changes)
        
        return settings

    # Activity Logging
    def _log_activity(self, team_id: str, activity_type: str, performed_by: Optional[str] = None,
                     affected_user_id: Optional[str] = None, details: Optional[dict] = None):
        """Log team activity"""
        activity = TeamActivity(
            team_id=team_id,
            activity_type=activity_type,
            performed_by=performed_by,
            affected_user_id=affected_user_id,
            details=details or {}
        )
        
        if team_id not in self.activities:
            self.activities[team_id] = []
        self.activities[team_id].append(activity)

    def get_team_activity(self, team_id: str, limit: int = 50, offset: int = 0) -> List[TeamActivity]:
        """Get team activity log"""
        if team_id not in self.activities:
            return []
        
        activities = self.activities[team_id]
        return sorted(activities, key=lambda x: x.created_at, reverse=True)[offset:offset+limit]


class HierarchyService:
    """Service for organizational hierarchy management"""

    def __init__(self, hierarchy_repo: HierarchyRepository = None):
        self.hierarchy_repo = hierarchy_repo or HierarchyRepository()

    def create_hierarchy_node(self,
                             company_id: str,
                             name: str,
                             node_type: HierarchyType,
                             parent_id: Optional[str] = None,
                             description: Optional[str] = None,
                             metadata: Optional[dict] = None) -> HierarchyNode:
        """Create organizational hierarchy node"""
        if not name or len(name.strip()) == 0:
            raise ValueError("Node name is required")

        node = HierarchyNode(
            company_id=company_id,
            name=name.strip(),
            type=node_type,
            parent_id=parent_id,
            description=description,
            metadata=metadata or {}
        )

        saved_node = self.hierarchy_repo.save(node)
        return saved_node

    def get_hierarchy_node(self, node_id: str) -> Optional[HierarchyNode]:
        """Get hierarchy node"""
        return self.hierarchy_repo.get(node_id)

    def get_company_hierarchy(self, company_id: str) -> List[HierarchyNode]:
        """Get complete organizational hierarchy for company"""
        return self.hierarchy_repo.get_by_company(company_id)

    def update_hierarchy_node(self,
                             node_id: str,
                             **kwargs) -> Optional[HierarchyNode]:
        """Update hierarchy node"""
        node = self.hierarchy_repo.get(node_id)
        if not node:
            raise ValueError(f"Hierarchy node {node_id} not found")

        allowed_fields = ['name', 'description', 'metadata', 'parent_id']
        for field, value in kwargs.items():
            if field in allowed_fields and value is not None:
                setattr(node, field, value)

        node.updated_at = datetime.utcnow()
        return self.hierarchy_repo.save(node)

    def delete_hierarchy_node(self, node_id: str) -> bool:
        """Delete hierarchy node"""
        node = self.hierarchy_repo.get(node_id)
        if not node:
            raise ValueError(f"Hierarchy node {node_id} not found")
        
        node.mark_deleted()
        self.hierarchy_repo.save(node)
        return True
