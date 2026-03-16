"""
Session management service for tracking user logins.
Track active sessions per user/device for security.
"""
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
import secrets


class UserSession:
    """User session model"""
    
    def __init__(self,
                 user_id: str,
                 company_id: str,
                 ip_address: str = None,
                 user_agent: str = None,
                 device_name: str = None):
        self.id = secrets.token_urlsafe(16)
        self.user_id = user_id
        self.company_id = company_id
        self.ip_address = ip_address
        self.user_agent = user_agent
        self.device_name = device_name or "Unknown Device"
        self.created_at = datetime.utcnow()
        self.last_activity = datetime.utcnow()
        self.expires_at = datetime.utcnow() + timedelta(hours=24)
        self.is_active = True
    
    def update_activity(self):
        """Update last activity timestamp"""
        self.last_activity = datetime.utcnow()
        # Extend session if still active
        self.expires_at = datetime.utcnow() + timedelta(hours=24)
    
    def is_expired(self) -> bool:
        """Check if session is expired"""
        return datetime.utcnow() > self.expires_at
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dict"""
        return {
            "session_id": self.id,
            "user_id": self.user_id,
            "company_id": self.company_id,
            "ip_address": self.ip_address,
            "device_name": self.device_name,
            "created_at": self.created_at.isoformat(),
            "last_activity": self.last_activity.isoformat(),
            "expires_at": self.expires_at.isoformat(),
            "is_active": self.is_active and not self.is_expired()
        }


class SessionManagementService:
    """Service for managing user sessions"""
    
    def __init__(self):
        self.sessions = {}  # session_id -> UserSession
        self.user_sessions = {}  # user_id -> [session_ids]
    
    def create_session(self,
                      user_id: str,
                      company_id: str,
                      ip_address: str = None,
                      user_agent: str = None,
                      device_name: str = None) -> Dict[str, Any]:
        """Create new session"""
        
        session = UserSession(
            user_id=user_id,
            company_id=company_id,
            ip_address=ip_address,
            user_agent=user_agent,
            device_name=device_name
        )
        
        self.sessions[session.id] = session
        
        if user_id not in self.user_sessions:
            self.user_sessions[user_id] = []
        self.user_sessions[user_id].append(session.id)
        
        return {
            "session_id": session.id,
            "expires_at": session.expires_at.isoformat()
        }
    
    def get_session(self, session_id: str) -> Optional[UserSession]:
        """Get session by ID"""
        session = self.sessions.get(session_id)
        
        if session and session.is_expired():
            session.is_active = False
            return None
        
        return session
    
    def update_session_activity(self, session_id: str) -> bool:
        """Update session activity"""
        session = self.get_session(session_id)
        if not session:
            return False
        
        session.update_activity()
        return True
    
    def get_user_sessions(self, user_id: str) -> List[Dict[str, Any]]:
        """Get all active sessions for user"""
        
        session_ids = self.user_sessions.get(user_id, [])
        sessions = []
        
        for sid in session_ids:
            session = self.sessions.get(sid)
            if session and session.is_active and not session.is_expired():
                sessions.append(session.to_dict())
        
        return sessions
    
    def revoke_session(self, session_id: str) -> bool:
        """Revoke a session (logout from device)"""
        
        session = self.sessions.get(session_id)
        if not session:
            return False
        
        session.is_active = False
        return True
    
    def revoke_all_user_sessions(self, user_id: str) -> int:
        """Revoke all sessions for user (logout from all devices)"""
        
        session_ids = self.user_sessions.get(user_id, [])
        count = 0
        
        for sid in session_ids:
            session = self.sessions.get(sid)
            if session and session.is_active:
                session.is_active = False
                count += 1
        
        return count
    
    def cleanup_expired_sessions(self) -> int:
        """Remove expired sessions"""
        
        expired = []
        for sid, session in self.sessions.items():
            if session.is_expired():
                expired.append(sid)
        
        for sid in expired:
            del self.sessions[sid]
        
        return len(expired)
    
    def get_suspicious_logins(self, user_id: str) -> List[Dict[str, Any]]:
        """Detect suspicious login patterns"""
        
        sessions = self.get_user_sessions(user_id)
        
        # Simple heuristic: multiple IPs in short time
        suspicious = []
        ip_times = {}
        
        for session in sessions:
            ip = session['ip_address']
            if ip:
                if ip not in ip_times:
                    ip_times[ip] = []
                ip_times[ip].append(session['created_at'])
        
        # Flag if multiple IPs with short gaps
        if len(ip_times) > 1:
            for session in sessions:
                session['suspicious'] = True
                suspicious.append(session)
        
        return suspicious
