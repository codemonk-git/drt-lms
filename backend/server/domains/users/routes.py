from fastapi import APIRouter, HTTPException, Query, Request, Depends, Header
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel
from server.domains.users.services import UserService
from server.domains.users.repositories import UserRepository
from server.domains.users.jwt_service import JWTService
from server.domains.users.invitation_service import UserInvitationService, InvitationStatus
from server.domains.users.session_service import SessionManagementService
from server.domains.activities.services import ActivityService
from server.domains.tenants.services import CompanyService
from server.domains.tenants.repositories import CompanyRepository
from server.domains.activities.repositories import ActivityRepository
from server.dependencies import get_company_id

router = APIRouter(prefix="", tags=["users"])
user_service = UserService(UserRepository())
activity_service = ActivityService(ActivityRepository())
invitation_service = UserInvitationService()
session_service = SessionManagementService()

class CreateUserRequest(BaseModel):
    company_id: str
    email: str
    password: str
    first_name: str
    last_name: str
    phone: Optional[str] = None
    role: Optional[str] = None

class UpdateUserRequest(BaseModel):
    email: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None

@router.post("/users")
def create_user(request: CreateUserRequest):
    try:
        user = user_service.create_user(
            company_id=request.company_id,
            email=request.email,
            password=request.password,
            first_name=request.first_name,
            last_name=request.last_name,
            phone=request.phone,
            role=request.role
        )

        user_dict = user.to_dict() if hasattr(user, 'to_dict') else user.__dict__
        return {"status": "success", "data": user_dict}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/users/{user_id}")
def get_user(user_id: str):
    try:
        user = user_service.get_user(user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        return {"status": "success", "data": user}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/users")
def list_users(skip: int = Query(0), limit: int = Query(50), company_id: Optional[str] = Query(None), x_company_id: str = Depends(get_company_id)):
    """List users - company_id can come from query param or header (x-company-id)"""
    # Use query param if provided, otherwise use header
    final_company_id = company_id or x_company_id
    try:
        users = user_service.list_company_users(final_company_id, limit=limit, offset=skip)
        return {"status": "success", "data": [u.to_dict() if hasattr(u, 'to_dict') else u.__dict__ for u in users]}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/users/{user_id}")
def update_user(user_id: str, request: UpdateUserRequest):
    try:
        user = user_service.update_user(
            user_id=user_id,
            first_name=request.first_name,
            last_name=request.last_name,
            email=request.email
        )
#         activity_service.log_activity(
#             user_id=user_id,
#             action="USER_UPDATED",
#             details="User profile updated"
#         )
        return {"status": "success", "data": user}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/users/{user_id}")
def delete_user(user_id: str):
    try:
        # Get user to check if they are a company owner
        user = user_service.get_user(user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Check if this user is the owner of their company
        company_service = CompanyService(CompanyRepository())
        company = company_service.get_company(user.company_id)
        
        if company and company.owner_id == user_id:
            raise HTTPException(
                status_code=403,
                detail="Cannot delete company owner"
            )
        
        user_service.delete_user(user_id)
#         activity_service.log_activity(
#             user_id=user_id,
#             action="USER_DELETED",
#             details="User deleted"
#         )
        return {"status": "success", "message": "User deleted"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/users/{user_id}/password")
def change_password(user_id: str, current_password: str, new_password: str):
    try:
        result = user_service.change_password(
            user_id=user_id,
            current_password=current_password,
            new_password=new_password
        )
#         activity_service.log_activity(
#             user_id=user_id,
#             action="PASSWORD_CHANGED",
#             details="User password changed"
#         )
        return {"status": "success", "message": "Password changed"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/users/{user_id}/reset-password")
def reset_password(user_id: str, new_password: str = None):
    """Admin reset user password - doesn't require old password"""
    try:
        if not new_password:
            raise HTTPException(status_code=400, detail="New password required")
        
        user = user_service.get_user(user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Reset password directly (admin action)
        user_service.reset_password(user_id, new_password)
        
        return {"status": "success", "message": "Password reset successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/users/{user_id}/suspend")
def suspend_user(user_id: str):
    """Suspend a user account"""
    try:
        user = user_service.get_user(user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        user_service.suspend_user(user_id)
        
        return {"status": "success", "message": "User suspended"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/users/{user_id}/activate")
def activate_user(user_id: str):
    """Activate a suspended user account"""
    try:
        user = user_service.get_user(user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        user_service.activate_user(user_id)
        
        return {"status": "success", "message": "User activated"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/auth/login")
def login(email: str, password: str, company_id: Optional[str] = None):
    """Login with email and password - returns JWT tokens"""
    try:
        print(f"[LOGIN] Received email: {email}, password length: {len(password) if password else 0}")
        user = user_service.authenticate_user(email, password, company_id)
        print(f"[LOGIN] Auth result: {user}")
        if not user:
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        user_id = user.id
        company = user.company_id
        
        # Get company slug
        from server.domains.tenants.repositories import CompanyRepository
        company_repo = CompanyRepository()
        company_obj = company_repo.get(company)
        company_slug = company_obj.slug if company_obj else None
        
        # Create JWT tokens
        token_data = JWTService.create_access_token(
            user_id=user_id,
            company_id=company,
            email=email,
            roles=[]  # TODO: Add user roles when implemented
        )
        
        refresh_token = JWTService.create_refresh_token(user_id, company)
        
        # Create session
        session = session_service.create_session(
            user_id=user_id,
            company_id=company
        )
        
        # Log activity (using simplified approach) - DISABLED due to signature mismatch
        # TODO: Fix activity logging with correct parameters
        pass
        
        return {
            "status": "success",
            "data": {
                "user_id": user_id,
                "email": email,
                "company_id": company,
                "company_slug": company_slug,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "role": user.role.value if hasattr(user.role, 'value') else str(user.role)
            },
            "access_token": token_data["access_token"],
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "expires_in": token_data["expires_in"],
            "session_id": session.get("session_id") if isinstance(session, dict) else session.session_id
        }
    except Exception as e:
        print(f"[LOGIN] Error: {e}")
        raise HTTPException(status_code=401, detail=str(e))


@router.get("/auth/me")
def get_current_user(request: Request):
    """Get current authenticated user from JWT token"""
    try:
        # Extract token from Authorization header
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Missing or invalid authorization header")
        
        token = auth_header.replace("Bearer ", "").strip()
        
        # Decode JWT token to get user data
        payload = JWTService.verify_token(token)
        # The token uses 'user_id' not 'sub'
        user_id = payload.get("user_id")
        
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token payload")
        
        # Fetch user from database
        user = user_service.get_user(user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Return user data
        return {
            "status": "success",
            "id": user.id,
            "email": user.email,
            "name": f"{user.first_name} {user.last_name}",
            "first_name": user.first_name,
            "last_name": user.last_name,
            "role": user.role.value if hasattr(user.role, 'value') else str(user.role),
            "company_id": user.company_id,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Authentication failed: {str(e)}")


@router.post("/auth/logout")
def logout(request: Request):
    """Logout - revoke current session"""
    try:
        session_id = request.headers.get("X-Session-ID")
        user_id = request.headers.get("X-User-ID")
        
        if session_id:
            session_service.revoke_session(session_id)
        
        if user_id:
             activity_service.log_activity(
                 user_id=user_id,
                 action="USER_LOGOUT",
                 details="User logged out"
             )
        
        return {"status": "success", "message": "Logged out"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/users/{user_id}/profile")
def get_user_profile(user_id: str):
    try:
        profile = user_service.get_user_profile(user_id)
        if not profile:
            raise HTTPException(status_code=404, detail="Profile not found")
        return {"status": "success", "data": profile}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/users/{user_id}/profile")
def update_user_profile(user_id: str, phone: Optional[str] = None, avatar: Optional[str] = None):
    try:
        profile = user_service.update_user_profile(
            user_id=user_id,
            phone=phone,
            avatar=avatar
        )
#         activity_service.log_activity(
#             user_id=user_id,
#             action="PROFILE_UPDATED",
#             details="User profile updated"
#         )
        return {"status": "success", "data": profile}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/users/{user_id}/activity")
def get_user_activity(user_id: str, skip: int = Query(0), limit: int = Query(20)):
    try:
        activities = activity_service.get_user_activities(user_id, skip, limit)
        return {"status": "success", "data": activities}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/users/search")
def search_users(company_id: str, query: str):
    try:
        results = user_service.search_users(company_id, query)
        return {"status": "success", "data": results}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/users/{user_id}/verify-email")
def verify_email(user_id: str, verification_code: str):
    try:
        result = user_service.verify_email(user_id, verification_code)
#         activity_service.log_activity(
#             user_id=user_id,
#             action="EMAIL_VERIFIED",
#             details="User email verified"
#         )
        return {"status": "success", "message": "Email verified"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/users/{user_id}/roles")
def assign_role(user_id: str, role: str):
    try:
        user = user_service.assign_role(user_id, role)
#         activity_service.log_activity(
#             user_id=user_id,
#             action="ROLE_ASSIGNED",
#             details=f"Role {role} assigned"
#         )
        return {"status": "success", "data": user}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/users/{user_id}/roles/{role_id}")
def remove_role(user_id: str, role_id: str):
    try:
        user = user_service.remove_role(user_id, role_id)
#         activity_service.log_activity(
#             user_id=user_id,
#             action="ROLE_REMOVED",
#             details=f"Role {role_id} removed"
#         )
        return {"status": "success", "data": user}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/users/{user_id}/permissions")
def get_user_permissions(user_id: str):
    try:
        permissions = user_service.get_user_permissions(user_id)
        return {"status": "success", "data": permissions}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# ========== JWT & AUTHENTICATION ==========

@router.post("/auth/refresh")
def refresh_token(refresh_token: str):
    """Refresh access token using refresh token"""
    try:
        new_tokens = JWTService.refresh_access_token(refresh_token)
        return {"status": "success", "data": new_tokens}
    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))


# ========== USER INVITATIONS (Admin Flow) ==========

@router.post("/companies/{company_id}/invitations")
def invite_user(company_id: str,
                email: str,
                invited_by: str,
                teams: List[str] = None,
                roles: List[str] = None,
                message: str = None):
    """Admin invites employee to company"""
    try:
        invitation = invitation_service.create_invitation(
            company_id=company_id,
            email=email,
            invited_by=invited_by,
            teams=teams,
            roles=roles,
            message=message
        )
        
#         activity_service.log_activity(
#             user_id=invited_by,
#             action="USER_INVITED",
#             details=f"User {email} invited to {company_id}"
#         )
        
        return {"status": "success", "data": invitation}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/companies/{company_id}/invitations")
def list_invitations(company_id: str, status: Optional[str] = None):
    """List pending invitations for company"""
    try:
        inv_status = InvitationStatus(status) if status else None
        invitations = invitation_service.list_company_invitations(company_id, inv_status)
        return {"status": "success", "data": invitations}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/auth/accept-invitation")
def accept_invitation(invitation_id: str, token: str, password: str):
    """Employee accepts invitation and sets password"""
    try:
        # Accept invitation
        inv_data = invitation_service.accept_invitation(invitation_id, token, "temp_user_id")
        
        email = inv_data["email"]
        company_id = inv_data["company_id"]
        
        # Create actual user with the password they set
        user = user_service.create_user(
            company_id=company_id,
            email=email,
            password=password,
            first_name=email.split("@")[0],
            last_name="Employee"
        )
        
        # Assign teams and roles
        user_id = user.get("id")
        for team_id in inv_data.get("teams", []):
            user_service.assign_user_to_team(user_id, team_id)
        
        for role in inv_data.get("roles", []):
            user_service.assign_role(user_id, role)
        
#         activity_service.log_activity(
#             user_id=user_id,
#             action="INVITATION_ACCEPTED",
#             details=f"User accepted invitation from {company_id}"
#         )
        
        return {"status": "success", "message": "Invitation accepted", "data": user}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/invitations/{invitation_id}/resend")
def resend_invitation(invitation_id: str, invited_by: str):
    """Resend invitation email"""
    try:
        result = invitation_service.resend_invitation(invitation_id)
        
#         activity_service.log_activity(
#             user_id=invited_by,
#             action="INVITATION_RESENT",
#             details=f"Invitation {invitation_id} resent"
#         )
        
        return {"status": "success", "data": result}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/invitations/{invitation_id}")
def cancel_invitation(invitation_id: str, cancelled_by: str):
    """Cancel pending invitation"""
    try:
        result = invitation_service.cancel_invitation(invitation_id)
        if not result:
            raise HTTPException(status_code=404, detail="Invitation not found or already processed")
        
#         activity_service.log_activity(
#             user_id=cancelled_by,
#             action="INVITATION_CANCELLED",
#             details=f"Invitation {invitation_id} cancelled"
#         )
        
        return {"status": "success", "message": "Invitation cancelled"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ========== SESSION MANAGEMENT ==========

@router.get("/auth/sessions")
def get_active_sessions(user_id: str):
    """Get all active sessions for user"""
    try:
        sessions = session_service.get_user_sessions(user_id)
        return {"status": "success", "data": sessions}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/auth/sessions/{session_id}")
def logout_session(session_id: str, user_id: str):
    """Logout from specific device/session"""
    try:
        result = session_service.revoke_session(session_id)
        if not result:
            raise HTTPException(status_code=404, detail="Session not found")
        
#         activity_service.log_activity(
#             user_id=user_id,
#             action="SESSION_REVOKED",
#             details=f"Session {session_id} revoked"
#         )
        
        return {"status": "success", "message": "Session revoked"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/auth/sessions/logout-all")
def logout_all_sessions(user_id: str):
    """Logout from all devices"""
    try:
        count = session_service.revoke_all_user_sessions(user_id)
        
#         activity_service.log_activity(
#             user_id=user_id,
#             action="ALL_SESSIONS_REVOKED",
#             details=f"All {count} sessions revoked"
#         )
        
        return {"status": "success", "message": f"Logged out from {count} device(s)"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/auth/suspicious-logins")
def check_suspicious_logins(user_id: str):
    """Check for suspicious login patterns"""
    try:
        suspicious = session_service.get_suspicious_logins(user_id)
        return {"status": "success", "data": suspicious, "count": len(suspicious)}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ===== Firebase Cloud Messaging (FCM) =====

class RegisterFCMTokenRequest(BaseModel):
    """Request to register FCM device token"""
    fcm_token: str


@router.post("/users/{user_id}/fcm-token")
def register_fcm_token(user_id: str, request: RegisterFCMTokenRequest):
    """Register or update FCM device token for push notifications"""
    try:
        user = user_service.get_user(user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Update FCM token directly on user object and save
        user.fcm_token = request.fcm_token
        user.updated_at = datetime.utcnow()
        
        # Use repository to save directly
        from server.domains.users.repositories import UserRepository
        repo = UserRepository()
        repo.save(user)
        
        print(f"✅ FCM token registered for user {user_id}")
        return {"status": "success", "message": "FCM token registered"}
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error registering FCM token: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/users/{user_id}/fcm-token")
def get_fcm_token(user_id: str):
    """Get FCM token for a user (for internal use)"""
    try:
        user = user_service.get_user(user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        return {"status": "success", "fcm_token": user.fcm_token}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))