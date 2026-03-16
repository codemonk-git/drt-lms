"""
JWT Authentication service for token-based auth.
Handles token generation, validation, and refresh.
"""
import jwt
import secrets
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from enum import Enum


class TokenType(str, Enum):
    """Token types"""
    ACCESS = "access"
    REFRESH = "refresh"


class JWTService:
    """Service for JWT token management"""
    
    # In production, use environment variables
    SECRET_KEY = secrets.token_urlsafe(32)
    ACCESS_TOKEN_EXPIRE_MINUTES = 60
    REFRESH_TOKEN_EXPIRE_DAYS = 30
    ALGORITHM = "HS256"
    
    @classmethod
    def create_access_token(cls, 
                           user_id: str,
                           company_id: str,
                           email: str,
                           roles: list = None) -> Dict[str, Any]:
        """Create access token"""
        
        payload = {
            "user_id": user_id,
            "company_id": company_id,
            "email": email,
            "roles": roles or [],
            "token_type": TokenType.ACCESS.value,
            "iat": datetime.utcnow(),
            "exp": datetime.utcnow() + timedelta(minutes=cls.ACCESS_TOKEN_EXPIRE_MINUTES)
        }
        
        token = jwt.encode(payload, cls.SECRET_KEY, algorithm=cls.ALGORITHM)
        
        return {
            "access_token": token,
            "token_type": "bearer",
            "expires_in": cls.ACCESS_TOKEN_EXPIRE_MINUTES * 60
        }
    
    @classmethod
    def create_refresh_token(cls, user_id: str, company_id: str) -> str:
        """Create refresh token"""
        
        payload = {
            "user_id": user_id,
            "company_id": company_id,
            "token_type": TokenType.REFRESH.value,
            "iat": datetime.utcnow(),
            "exp": datetime.utcnow() + timedelta(days=cls.REFRESH_TOKEN_EXPIRE_DAYS)
        }
        
        token = jwt.encode(payload, cls.SECRET_KEY, algorithm=cls.ALGORITHM)
        return token
    
    @classmethod
    def verify_token(cls, token: str) -> Optional[Dict[str, Any]]:
        """Verify and decode token"""
        try:
            payload = jwt.decode(token, cls.SECRET_KEY, algorithms=[cls.ALGORITHM])
            return payload
        except jwt.ExpiredSignatureError:
            raise ValueError("Token expired")
        except jwt.InvalidTokenError:
            raise ValueError("Invalid token")
    
    @classmethod
    def refresh_access_token(cls, refresh_token: str) -> Dict[str, Any]:
        """Create new access token from refresh token"""
        try:
            payload = cls.verify_token(refresh_token)
            
            if payload.get("token_type") != TokenType.REFRESH.value:
                raise ValueError("Not a refresh token")
            
            user_id = payload.get("user_id")
            company_id = payload.get("company_id")
            
            # Get user info from DB in production
            return cls.create_access_token(
                user_id=user_id,
                company_id=company_id,
                email=payload.get("email"),
                roles=payload.get("roles")
            )
        except Exception as e:
            raise ValueError(f"Token refresh failed: {str(e)}")
    
    @classmethod
    def create_password_reset_token(cls, user_id: str, email: str) -> str:
        """Create password reset token (short-lived)"""
        
        payload = {
            "user_id": user_id,
            "email": email,
            "token_type": "password_reset",
            "iat": datetime.utcnow(),
            "exp": datetime.utcnow() + timedelta(hours=1)
        }
        
        token = jwt.encode(payload, cls.SECRET_KEY, algorithm=cls.ALGORITHM)
        return token
    
    @classmethod
    def verify_password_reset_token(cls, token: str) -> Optional[Dict[str, Any]]:
        """Verify password reset token"""
        try:
            payload = cls.verify_token(token)
            
            if payload.get("token_type") != "password_reset":
                raise ValueError("Not a password reset token")
            
            return payload
        except Exception as e:
            raise ValueError(f"Invalid reset token: {str(e)}")
