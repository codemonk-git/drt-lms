"""
API Key management service for third-party integrations.
Manages API keys, tokens, and access control.
"""
import secrets
import hashlib
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
from enum import Enum


class APIKeyScope(str, Enum):
    """Scopes for API keys"""
    READ_ONLY = "read:*"
    READ_WRITE = "write:*"
    ADMIN = "admin:*"
    LEADS_READ = "read:leads"
    LEADS_WRITE = "write:leads"
    CONTACTS_READ = "read:contacts"
    CONTACTS_WRITE = "write:contacts"
    FORMS_READ = "read:forms"
    FORMS_WRITE = "write:forms"


class APIKey:
    """API Key model"""
    
    def __init__(self, 
                 company_id: str,
                 name: str,
                 scopes: List[str],
                 **kwargs):
        self.id = secrets.token_urlsafe(16)
        self.company_id = company_id
        self.name = name
        self.scopes = scopes
        self.secret_hash = kwargs.get('secret_hash')
        self.created_at = datetime.utcnow()
        self.expires_at = kwargs.get('expires_at')
        self.last_used_at = kwargs.get('last_used_at')
        self.is_active = kwargs.get('is_active', True)
        self.created_by = kwargs.get('created_by')
    
    def to_dict(self, include_secret=False) -> Dict[str, Any]:
        """Convert to dict"""
        data = {
            "id": self.id,
            "company_id": self.company_id,
            "name": self.name,
            "scopes": self.scopes,
            "created_at": self.created_at.isoformat(),
            "expires_at": self.expires_at.isoformat() if self.expires_at else None,
            "last_used_at": self.last_used_at.isoformat() if self.last_used_at else None,
            "is_active": self.is_active,
            "created_by": self.created_by
        }
        if include_secret:
            data["secret_hash"] = self.secret_hash
        return data


class APIKeyManagementService:
    """Service for managing API keys"""
    
    def __init__(self):
        self.keys = {}  # id -> APIKey
        self.company_keys = {}  # company_id -> [key_ids]
    
    def create_api_key(self,
                      company_id: str,
                      name: str,
                      scopes: List[str],
                      created_by: str,
                      expires_in_days: Optional[int] = None) -> Dict[str, str]:
        """
        Create new API key for company.
        Returns the key details with secret (only shown once).
        """
        
        # Generate secret
        secret = secrets.token_urlsafe(32)
        secret_hash = hashlib.sha256(secret.encode()).hexdigest()
        
        # Calculate expiration
        expires_at = None
        if expires_in_days:
            expires_at = datetime.utcnow() + timedelta(days=expires_in_days)
        
        # Create key object
        api_key = APIKey(
            company_id=company_id,
            name=name,
            scopes=scopes,
            secret_hash=secret_hash,
            expires_at=expires_at,
            created_by=created_by
        )
        
        # Store key
        self.keys[api_key.id] = api_key
        
        if company_id not in self.company_keys:
            self.company_keys[company_id] = []
        self.company_keys[company_id].append(api_key.id)
        
        return {
            "key_id": api_key.id,
            "secret": secret,
            "warning": "Save this secret securely. You won't be able to see it again.",
            **api_key.to_dict()
        }
    
    def get_api_key(self, key_id: str) -> Optional[APIKey]:
        """Get API key by ID"""
        return self.keys.get(key_id)
    
    def list_company_keys(self, company_id: str) -> List[Dict[str, Any]]:
        """List all API keys for company"""
        key_ids = self.company_keys.get(company_id, [])
        return [self.keys[kid].to_dict() for kid in key_ids if kid in self.keys]
    
    def revoke_key(self, key_id: str) -> bool:
        """Revoke/disable API key"""
        key = self.keys.get(key_id)
        if not key:
            return False
        
        key.is_active = False
        return True
    
    def verify_key(self, key_id: str, secret: str) -> bool:
        """Verify API key and secret"""
        key = self.keys.get(key_id)
        if not key or not key.is_active:
            return False
        
        # Check expiration
        if key.expires_at and datetime.utcnow() > key.expires_at:
            return False
        
        # Verify secret
        secret_hash = hashlib.sha256(secret.encode()).hexdigest()
        return key.secret_hash == secret_hash
    
    def has_scope(self, key_id: str, required_scope: str) -> bool:
        """Check if key has required scope"""
        key = self.keys.get(key_id)
        if not key:
            return False
        
        # Admin scope covers everything
        if APIKeyScope.ADMIN.value in key.scopes:
            return True
        
        # Check for wildcard scopes
        base_scope = required_scope.split(":")[0]
        wildcard = f"{base_scope}:*"
        
        return required_scope in key.scopes or wildcard in key.scopes
    
    def record_key_usage(self, key_id: str) -> bool:
        """Record that key was used"""
        key = self.keys.get(key_id)
        if not key:
            return False
        
        key.last_used_at = datetime.utcnow()
        return True
