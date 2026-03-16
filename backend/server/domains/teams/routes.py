from fastapi import APIRouter, HTTPException, Query, Depends
from typing import Optional
from pydantic import BaseModel
from server.domains.teams.services import TeamService
from server.domains.teams.repositories import TeamRepository
from server.domains.teams.models import TeamRole
from server.dependencies import get_company_id, get_user_id

router = APIRouter(prefix="/teams", tags=["teams"])
team_service = TeamService(TeamRepository())

class CreateTeamRequest(BaseModel):
    company_id: str
    name: str
    created_by: str
    description: Optional[str] = None
    parent_team_id: Optional[str] = None
    team_lead_id: Optional[str] = None

class AddTeamMemberRequest(BaseModel):
    user_id: str
    role: str = TeamRole.MEMBER
    added_by: Optional[str] = None

class UpdateMemberRoleRequest(BaseModel):
    new_role: str
    updated_by: Optional[str] = None

class UpdateTeamRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    team_lead_id: Optional[str] = None
    updated_by: Optional[str] = None

@router.post("")
def create_team(request: CreateTeamRequest, user_id: str = Depends(get_user_id)):
    try:
        # Check if user is admin
        from server.domains.users.repositories import UserRepository
        user_repo = UserRepository()
        current_user = user_repo.get(user_id) if user_id else None
        is_admin = current_user and getattr(current_user, 'role', None) == 'admin'
        
        if not is_admin:
            raise HTTPException(status_code=403, detail="Only admins can create teams")
        
        team = team_service.create_team(request.company_id, request.name, request.created_by, request.description, request.parent_team_id, request.team_lead_id)
        return {"status": "success", "data": team.to_dict() if hasattr(team, 'to_dict') else team.__dict__}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/{team_id}")
def get_team(team_id: str):
    try:
        team = team_service.get_team(team_id)
        if not team:
            raise HTTPException(status_code=404, detail="Team not found")
        return {"status": "success", "data": team.to_dict() if hasattr(team, 'to_dict') else team.__dict__}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/user/{user_id}")
def get_user_team(user_id: str, company_id: str = Depends(get_company_id)):
    """Get the team for a user (team they lead or are a member of)"""
    try:
        # Get all teams for the company
        teams = team_service.list_company_teams(company_id, limit=1000, offset=0)
        
        print(f"[TEAMS] Fetching team for user {user_id}")
        print(f"[TEAMS] Company {company_id} has {len(teams)} teams")
        
        # Find team where user is team lead
        if teams:
            for team in teams:
                team_lead_id = getattr(team, 'team_lead_id', None)
                print(f"[TEAMS] Checking team {team.name}: team_lead_id={team_lead_id}, user_id={user_id}, match={team_lead_id == user_id}")
                
                # Check if user is team lead
                if team_lead_id == user_id:
                    print(f"[TEAMS] ✅ User is team lead of {team.name}")
                    
                    # Get explicit team members
                    from server.domains.teams.repositories import TeamMemberRepository
                    from server.domains.users.repositories import UserRepository
                    member_repo = TeamMemberRepository()
                    user_repo = UserRepository()
                    
                    explicit_members = member_repo.get_by_team(team.id)
                    
                    # The team lead is implicitly a member of their own team
                    # Build member list: team lead + explicit members
                    all_member_ids = [user_id]  # Include team lead themselves
                    for member in explicit_members:
                        if member.user_id != user_id:  # Don't duplicate
                            all_member_ids.append(member.user_id)
                    
                    print(f"[TEAMS] Team members (including lead): {all_member_ids}")
                    
                    # Fetch user details for all members
                    members_data = []
                    for mid in all_member_ids:
                        user_obj = user_repo.get(mid)
                        members_data.append({
                            "user_id": mid,
                            "role": "lead" if mid == user_id else "member",
                            "user": {
                                "id": user_obj.id if user_obj else mid,
                                "name": f"{user_obj.first_name} {user_obj.last_name}".strip() if user_obj else "",
                                "email": user_obj.email if user_obj else "",
                            } if user_obj else None
                        })
                    
                    return {
                        "status": "success",
                        "data": {
                            "id": team.id,
                            "name": team.name,
                            "team_lead_id": team_lead_id,
                            "members": members_data
                        }
                    }
        
        # No team found for user
        print(f"[TEAMS] No team found where user {user_id} is team lead")
        return {"status": "success", "data": None}
    except Exception as e:
        # Log error but return success with null data
        print(f"[TEAMS] Error fetching user team: {e}")
        import traceback
        traceback.print_exc()
        return {"status": "success", "data": None}

@router.get("")
def list_teams(company_id: str = Depends(get_company_id), user_id: str = Depends(get_user_id), skip: int = Query(0), limit: int = Query(10)):
    try:
        teams = team_service.list_company_teams(company_id, limit, skip)
        
        # Get user role (check from users.json if available)
        from server.domains.users.repositories import UserRepository
        from server.domains.teams.repositories import TeamMemberRepository
        user_repo = UserRepository()
        member_repo = TeamMemberRepository()
        current_user = user_repo.get(user_id) if user_id else None
        is_admin = current_user and getattr(current_user, 'role', None) == 'admin'
        
        # If not admin, filter to only show teams where user is team lead
        # Note: Regular (non-lead, non-admin) users will see no teams, which is consistent with view-only for non-admins
        if not is_admin and user_id:
            teams = [t for t in teams if getattr(t, 'team_lead_id', None) == user_id]
        
        # Populate members for each team
        teams_data = []
        for team in teams:
            team_dict = team.to_dict() if hasattr(team, 'to_dict') else team.__dict__
            
            # Fetch team members
            members_list = member_repo.get_by_team(team.id)
            team_members = []
            for member in members_list:
                member_user = user_repo.get(member.user_id)
                team_members.append({
                    'user_id': member.user_id,
                    'role': member.role,
                    'user': {
                        'id': member_user.id if member_user else member.user_id,
                        'name': f"{member_user.first_name} {member_user.last_name}".strip() if member_user else "",
                        'email': member_user.email if member_user else "",
                    } if member_user else None
                })
            
            team_dict['members'] = team_members
            teams_data.append(team_dict)
        
        return {"status": "success", "data": teams_data}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/{team_id}")
def update_team(team_id: str, request: UpdateTeamRequest, user_id: str = Depends(get_user_id)):
    try:
        # Check if user is admin
        from server.domains.users.repositories import UserRepository
        user_repo = UserRepository()
        current_user = user_repo.get(user_id) if user_id else None
        is_admin = current_user and getattr(current_user, 'role', None) == 'admin'
        
        if not is_admin:
            raise HTTPException(status_code=403, detail="Only admins can edit teams")
        
        team = team_service.update_team(team_id, updated_by=request.updated_by, name=request.name, description=request.description, team_lead_id=request.team_lead_id)
        return {"status": "success", "data": team.to_dict() if hasattr(team, 'to_dict') else team.__dict__}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/{team_id}")
def delete_team(team_id: str, deleted_by: Optional[str] = None, user_id: str = Depends(get_user_id)):
    try:
        # Check if user is admin
        from server.domains.users.repositories import UserRepository
        user_repo = UserRepository()
        current_user = user_repo.get(user_id) if user_id else None
        is_admin = current_user and getattr(current_user, 'role', None) == 'admin'
        
        if not is_admin:
            raise HTTPException(status_code=403, detail="Only admins can delete teams")
        
        team_service.delete_team(team_id, deleted_by=deleted_by)
        return {"status": "success", "message": "Team deleted"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# Member Management with Role Support
@router.post("/{team_id}/members")
def add_team_member(team_id: str, request: AddTeamMemberRequest, user_id: str = Depends(get_user_id)):
    try:
        # Check if user is admin
        from server.domains.users.repositories import UserRepository
        user_repo = UserRepository()
        current_user = user_repo.get(user_id) if user_id else None
        is_admin = current_user and getattr(current_user, 'role', None) == 'admin'
        
        if not is_admin:
            raise HTTPException(status_code=403, detail="Only admins can add team members")
        
        member = team_service.add_team_member(team_id, request.user_id, request.role, added_by=request.added_by)
        return {"status": "success", "data": member}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/{team_id}/members/{user_id}")
def remove_team_member(team_id: str, user_id: str, removed_by: Optional[str] = None, current_user_id: str = Depends(get_user_id)):
    try:
        # Check if user is admin
        from server.domains.users.repositories import UserRepository
        user_repo = UserRepository()
        current_user = user_repo.get(current_user_id) if current_user_id else None
        is_admin = current_user and getattr(current_user, 'role', None) == 'admin'
        
        if not is_admin:
            raise HTTPException(status_code=403, detail="Only admins can remove team members")
        
        team_service.remove_team_member(team_id, user_id, removed_by=removed_by)
        return {"status": "success", "message": "Member removed"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/{team_id}/members")
def get_team_members(team_id: str, skip: int = Query(0), limit: int = Query(10)):
    try:
        members = team_service.get_team_members(team_id)
        return {"status": "success", "data": members[skip:skip+limit]}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/{team_id}/members/{user_id}/role")
def update_member_role(team_id: str, user_id: str, request: UpdateMemberRoleRequest):
    try:
        member = team_service.update_member_role(team_id, user_id, request.new_role, updated_by=request.updated_by)
        return {"status": "success", "data": member}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/{team_id}/members/role/{role}")
def get_members_by_role(team_id: str, role: str, skip: int = Query(0), limit: int = Query(10)):
    try:
        members = team_service.get_member_by_role(team_id, role)
        return {"status": "success", "data": members[skip:skip+limit]}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# Team Settings
@router.get("/{team_id}/settings")
def get_team_settings(team_id: str):
    try:
        settings = team_service.get_team_settings(team_id)
        return {"status": "success", "data": settings}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/{team_id}/settings")
def update_team_settings(team_id: str, updated_by: Optional[str] = None, is_private: Optional[bool] = None, 
                        allow_member_add: Optional[bool] = None, notifications_enabled: Optional[bool] = None):
    try:
        settings = team_service.update_team_settings(team_id, updated_by=updated_by, 
                                                     is_private=is_private, 
                                                     allow_member_add=allow_member_add,
                                                     notifications_enabled=notifications_enabled)
        return {"status": "success", "data": settings}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# Team Activity Log
@router.get("/{team_id}/activity")
def get_team_activity(team_id: str, skip: int = Query(0), limit: int = Query(50)):
    try:
        activities = team_service.get_team_activity(team_id, limit=limit, offset=skip)
        return {"status": "success", "data": activities}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
