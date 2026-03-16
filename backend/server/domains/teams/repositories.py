"""
Teams domain repositories.
"""
from typing import Optional, List
from .models import Team, TeamMember, HierarchyNode
from ...shared.persistence import JSONPersistenceMixin


class TeamRepository(JSONPersistenceMixin):
    """Repository for Team entities"""
    
    FILENAME = "teams.json"
    
    def __init__(self):
        self.data = {}
        super().__init__()
    
    def save(self, team: Team) -> Team:
        """Save team"""
        self.data[team.id] = team
        self._save_to_file()
        return team
    
    def get(self, team_id: str) -> Optional[Team]:
        """Get team by ID"""
        return self.data.get(team_id)
    
    def get_by_slug(self, company_id: str, slug: str) -> Optional[Team]:
        """Get team by slug within company"""
        self._ensure_fresh_data()
        for team in self.data.values():
            if team.company_id == company_id and team.slug == slug and not team.deleted_at:
                return team
        return None
    
    def _load_data(self, data: dict):
        """Load teams from JSON data"""
        for team_data in data.get('teams', []):
            try:
                team = Team(**team_data)
                self.data[team.id] = team
            except Exception as e:
                print(f"Warning: Could not load team {team_data.get('id')}: {e}")
    
    def _get_data(self) -> dict:
        """Get data as dictionary for JSON serialization"""
        return {
            'teams': [t.to_dict() if hasattr(t, 'to_dict') else t.__dict__ 
                     for t in self.data.values() if not t.deleted_at]
        }
    
    def list_by_company(self, company_id: str, 
                       limit: int = 100, offset: int = 0) -> List[Team]:
        """List teams in a company"""
        teams = [t for t in self.data.values() 
                if t.company_id == company_id and not t.deleted_at]
        return teams[offset:offset + limit]
    
    def delete(self, team_id: str) -> bool:
        """Delete team"""
        if team_id in self.data:
            del self.data[team_id]
            return True
        return False


class TeamMemberRepository(JSONPersistenceMixin):
    """Repository for TeamMember entities"""
    
    FILENAME = "team_members.json"
    
    def __init__(self):
        self.data = {}
        super().__init__()
    
    def save(self, member: TeamMember) -> TeamMember:
        """Save team member"""
        self.data[member.id] = member
        self._save_to_file()
        return member
    
    def get(self, member_id: str) -> Optional[TeamMember]:
        """Get team member by ID"""
        return self.data.get(member_id)
    
    def get_by_team(self, team_id: str) -> List[TeamMember]:
        """Get all members of a team"""
        self._ensure_fresh_data()
        return [m for m in self.data.values() 
               if m.team_id == team_id and not m.deleted_at]
    
    def get_by_team_and_user(self, team_id: str, user_id: str) -> Optional[TeamMember]:
        """Get specific team member"""
        self._ensure_fresh_data()
        for member in self.data.values():
            if member.team_id == team_id and member.user_id == user_id and not member.deleted_at:
                return member
    
    def _load_data(self, data: dict):
        """Load team members from JSON data"""
        for member_data in data.get('team_members', []):
            try:
                member = TeamMember(**member_data)
                self.data[member.id] = member
            except Exception as e:
                print(f"Warning: Could not load team member {member_data.get('id')}: {e}")
    
    def _get_data(self) -> dict:
        """Get data as dictionary for JSON serialization"""
        return {
            'team_members': [m.to_dict() if hasattr(m, 'to_dict') else m.__dict__ 
                            for m in self.data.values() if not m.deleted_at]
        }
    
    def delete(self, member_id: str) -> bool:
        """Delete team member"""
        if member_id in self.data:
            del self.data[member_id]
            return True
        return False


class HierarchyRepository:
    """Repository for HierarchyNode entities"""
    
    def __init__(self):
        self.data = {}
    
    def save(self, node: HierarchyNode) -> HierarchyNode:
        """Save hierarchy node"""
        self.data[node.id] = node
        return node
    
    def get(self, node_id: str) -> Optional[HierarchyNode]:
        """Get hierarchy node by ID"""
        return self.data.get(node_id)
    
    def get_by_company(self, company_id: str) -> List[HierarchyNode]:
        """Get all hierarchy nodes for company"""
        return [n for n in self.data.values() 
               if n.company_id == company_id and not n.deleted_at]
    
    def delete(self, node_id: str) -> bool:
        """Delete hierarchy node"""
        if node_id in self.data:
            del self.data[node_id]
            return True
        return False
