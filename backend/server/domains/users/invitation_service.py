"""
User invitation service for admin-managed user onboarding.
Company admin invites employees, employees accept and set their password.
"""
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
from enum import Enum
import secrets


class InvitationStatus(str, Enum):
    """Invitation status"""
    PENDING = "pending"
    ACCEPTED = "accepted"
    EXPIRED = "expired"
    REJECTED = "rejected"


class UserInvitation:
    """User invitation model"""
    
    def __init__(self, 
                 company_id: str,
                 email: str,
                 invited_by: str,
                 **kwargs):
        self.id = secrets.token_urlsafe(16)
        self.company_id = company_id
        self.email = email.lower()
        self.invited_by = invited_by
        self.invited_at = datetime.utcnow()
        self.status = InvitationStatus.PENDING
        self.acceptance_token = secrets.token_urlsafe(32)
        self.expires_at = datetime.utcnow() + timedelta(days=7)
        self.accepted_at = kwargs.get('accepted_at')
        self.teams = kwargs.get('teams', [])  # Teams to assign to
        self.roles = kwargs.get('roles', [])  # Roles to assign
        self.message = kwargs.get('message', '')  # Invitation message
    
    def is_expired(self) -> bool:
        """Check if invitation is expired"""
        return datetime.utcnow() > self.expires_at and self.status == InvitationStatus.PENDING
    
    def to_dict(self, include_token=False) -> Dict[str, Any]:
        """Convert to dict"""
        data = {
            "id": self.id,
            "company_id": self.company_id,
            "email": self.email,
            "invited_by": self.invited_by,
            "invited_at": self.invited_at.isoformat(),
            "status": self.status.value,
            "expires_at": self.expires_at.isoformat(),
            "accepted_at": self.accepted_at.isoformat() if self.accepted_at else None,
            "teams": self.teams,
            "roles": self.roles
        }
        if include_token:
            data["acceptance_token"] = self.acceptance_token
        return data


class UserInvitationService:
    """Service for managing user invitations"""
    
    def __init__(self):
        self.invitations = {}  # id -> UserInvitation
        self.company_invitations = {}  # company_id -> [invitation_ids]
        self.email_invitations = {}  # email -> invitation_id (for lookup)
    
    def create_invitation(self,
                         company_id: str,
                         email: str,
                         invited_by: str,
                         teams: List[str] = None,
                         roles: List[str] = None,
                         message: str = None) -> Dict[str, Any]:
        """Create user invitation"""
        
        email = email.lower()
        
        # Check if already invited
        existing = self.email_invitations.get(email)
        if existing:
            inv = self.invitations.get(existing)
            if inv and inv.status == InvitationStatus.PENDING and not inv.is_expired():
                raise ValueError(f"User already invited to {company_id}")
        
        invitation = UserInvitation(
            company_id=company_id,
            email=email,
            invited_by=invited_by,
            teams=teams or [],
            roles=roles or [],
            message=message or ""
        )
        
        # Store invitation
        self.invitations[invitation.id] = invitation
        
        if company_id not in self.company_invitations:
            self.company_invitations[company_id] = []
        self.company_invitations[company_id].append(invitation.id)
        
        self.email_invitations[email] = invitation.id
        
        return {
            "invitation_id": invitation.id,
            "acceptance_token": invitation.acceptance_token,
            "accept_url": f"/auth/accept-invitation?token={invitation.acceptance_token}",
            **invitation.to_dict(include_token=True)
        }
    
    def get_invitation(self, invitation_id: str) -> Optional[UserInvitation]:
        """Get invitation by ID"""
        return self.invitations.get(invitation_id)
    
    def get_invitation_by_token(self, token: str) -> Optional[UserInvitation]:
        """Get invitation by acceptance token"""
        for inv in self.invitations.values():
            if inv.acceptance_token == token:
                return inv
        return None
    
    def list_company_invitations(self,
                                company_id: str,
                                status: Optional[InvitationStatus] = None) -> List[Dict[str, Any]]:
        """List invitations for company"""
        
        invitation_ids = self.company_invitations.get(company_id, [])
        invitations = []
        
        for inv_id in invitation_ids:
            inv = self.invitations.get(inv_id)
            if not inv:
                continue
            
            if inv.is_expired():
                inv.status = InvitationStatus.EXPIRED
            
            if status is None or inv.status == status:
                invitations.append(inv.to_dict())
        
        return invitations
    
    def accept_invitation(self,
                         invitation_id: str,
                         token: str,
                         user_id: str) -> Dict[str, Any]:
        """Accept invitation (user sets password)"""
        
        invitation = self.get_invitation(invitation_id)
        if not invitation:
            raise ValueError("Invitation not found")
        
        if invitation.acceptance_token != token:
            raise ValueError("Invalid acceptance token")
        
        if invitation.is_expired():
            raise ValueError("Invitation expired")
        
        if invitation.status != InvitationStatus.PENDING:
            raise ValueError(f"Invitation already {invitation.status}")
        
        invitation.status = InvitationStatus.ACCEPTED
        invitation.accepted_at = datetime.utcnow()
        
        return {
            "user_id": user_id,
            "company_id": invitation.company_id,
            "email": invitation.email,
            "teams": invitation.teams,
            "roles": invitation.roles,
            "accepted_at": invitation.accepted_at.isoformat()
        }
    
    def reject_invitation(self, invitation_id: str) -> bool:
        """Reject invitation"""
        
        invitation = self.get_invitation(invitation_id)
        if not invitation:
            return False
        
        if invitation.status != InvitationStatus.PENDING:
            return False
        
        invitation.status = InvitationStatus.REJECTED
        return True
    
    def resend_invitation(self, invitation_id: str) -> Dict[str, Any]:
        """Resend invitation (reset expiry)"""
        
        invitation = self.get_invitation(invitation_id)
        if not invitation:
            raise ValueError("Invitation not found")
        
        if invitation.status != InvitationStatus.PENDING:
            raise ValueError("Can only resend pending invitations")
        
        # Reset expiry and token
        invitation.expires_at = datetime.utcnow() + timedelta(days=7)
        invitation.acceptance_token = secrets.token_urlsafe(32)
        
        return {
            "invitation_id": invitation.id,
            "acceptance_token": invitation.acceptance_token,
            "accept_url": f"/auth/accept-invitation?token={invitation.acceptance_token}"
        }
    
    def cancel_invitation(self, invitation_id: str) -> bool:
        """Cancel invitation"""
        
        invitation = self.get_invitation(invitation_id)
        if not invitation:
            return False
        
        if invitation.status != InvitationStatus.PENDING:
            return False
        
        invitation.status = InvitationStatus.EXPIRED
        return True
