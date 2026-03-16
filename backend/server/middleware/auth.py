"""
Authentication middleware for request handling.
"""
from typing import Optional, Dict, Any
from datetime import datetime, timedelta
import jwt
import json


class AuthContext:
    """Authentication context for current request"""

    def __init__(self,
                 user_id: str,
                 company_id: str,
                 email: str,
                 roles: list,
                 is_super_admin: bool = False,
                 is_company_admin: bool = False):
        self.user_id = user_id
        self.company_id = company_id
        self.email = email
        self.roles = roles
        self.is_super_admin = is_super_admin
        self.is_company_admin = is_company_admin
        self.authenticated_at = datetime.utcnow()


class JWTTokenManager:
    """JWT token generation and validation"""

    def __init__(self, secret_key: str, algorithm: str = "HS256"):
        self.secret_key = secret_key
        self.algorithm = algorithm
        self.expiry_hours = 24

    def generate_token(self,
                      user_id: str,
                      company_id: str,
                      email: str,
                      is_super_admin: bool = False) -> str:
        """
        Generate JWT token for user.
        
        Args:
            user_id: User ID
            company_id: Company ID
            email: User email
            is_super_admin: Whether user is super admin
            
        Returns:
            JWT token
        """
        payload = {
            'user_id': user_id,
            'company_id': company_id,
            'email': email,
            'is_super_admin': is_super_admin,
            'iat': datetime.utcnow(),
            'exp': datetime.utcnow() + timedelta(hours=self.expiry_hours)
        }

        try:
            token = jwt.encode(payload, self.secret_key, algorithm=self.algorithm)
            return token
        except Exception as e:
            raise ValueError(f"Token generation failed: {str(e)}")

    def validate_token(self, token: str) -> Optional[Dict[str, Any]]:
        """
        Validate JWT token.
        
        Args:
            token: JWT token
            
        Returns:
            Token payload if valid, None otherwise
        """
        try:
            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])
            return payload
        except jwt.ExpiredSignatureError:
            return None
        except jwt.InvalidTokenError:
            return None

    def refresh_token(self, token: str) -> Optional[str]:
        """Refresh expired token"""
        payload = self.validate_token(token)
        if payload:
            return self.generate_token(
                user_id=payload['user_id'],
                company_id=payload['company_id'],
                email=payload['email'],
                is_super_admin=payload.get('is_super_admin', False)
            )
        return None


class AuthMiddleware:
    """Authentication middleware for API requests"""

    def __init__(self, token_manager: JWTTokenManager):
        self.token_manager = token_manager

    def extract_token(self, authorization_header: str) -> Optional[str]:
        """Extract token from Authorization header"""
        if not authorization_header:
            return None

        parts = authorization_header.split()
        if len(parts) == 2 and parts[0].lower() == 'bearer':
            return parts[1]
        
        return None

    def authenticate_request(self, authorization_header: str) -> Optional[AuthContext]:
        """
        Authenticate request and return auth context.
        
        Args:
            authorization_header: Authorization header value
            
        Returns:
            AuthContext if valid, None otherwise
        """
        token = self.extract_token(authorization_header)
        if not token:
            return None

        payload = self.token_manager.validate_token(token)
        if not payload:
            return None

        return AuthContext(
            user_id=payload.get('user_id'),
            company_id=payload.get('company_id'),
            email=payload.get('email'),
            roles=payload.get('roles', []),
            is_super_admin=payload.get('is_super_admin', False)
        )
