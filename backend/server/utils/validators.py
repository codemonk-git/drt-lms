"""
Input validation utilities.
"""
import re
from typing import Optional


def validate_email(email: str) -> bool:
    """Validate email format"""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return bool(re.match(pattern, email))


def validate_company_slug(slug: str) -> bool:
    """Validate company slug format"""
    pattern = r'^[a-z0-9]([a-z0-9-]*[a-z0-9])?$'
    return bool(re.match(pattern, slug)) and len(slug) <= 50


def validate_team_name(name: str) -> bool:
    """Validate team name"""
    return bool(name) and len(name.strip()) > 0 and len(name.strip()) <= 100


def validate_password_strength(password: str) -> tuple[bool, str]:
    """
    Validate password strength.
    
    Returns:
        Tuple of (is_valid, message)
    """
    if len(password) < 8:
        return False, "Password must be at least 8 characters"
    
    if not re.search(r'[A-Z]', password):
        return False, "Password must contain at least one uppercase letter"
    
    if not re.search(r'[a-z]', password):
        return False, "Password must contain at least one lowercase letter"
    
    if not re.search(r'[0-9]', password):
        return False, "Password must contain at least one digit"
    
    if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
        return False, "Password must contain at least one special character"
    
    return True, "Password is strong"


def sanitize_input(value: Optional[str], max_length: int = 255) -> Optional[str]:
    """Sanitize and limit string input"""
    if value is None:
        return None
    
    sanitized = str(value).strip()[:max_length]
    return sanitized if sanitized else None
