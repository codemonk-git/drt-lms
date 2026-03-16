"""
Password hashing and verification utilities.
"""
import hashlib
import secrets


def hash_password(password: str) -> str:
    """
    Hash a password using PBKDF2.
    In production, use bcrypt or argon2.
    
    Args:
        password: Plain text password
        
    Returns:
        Hashed password with salt
    """
    salt = secrets.token_hex(32)
    pwd_hash = hashlib.pbkdf2_hmac(
        'sha256',
        password.encode('utf-8'),
        salt.encode('utf-8'),
        100000
    )
    return f"{salt}${pwd_hash.hex()}"


def verify_password(password: str, hashed: str) -> bool:
    """
    Verify a password against its hash.
    
    Args:
        password: Plain text password
        hashed: Hashed password (salt$hash format)
        
    Returns:
        True if password matches, False otherwise
    """
    try:
        salt, pwd_hash = hashed.split('$')
        new_hash = hashlib.pbkdf2_hmac(
            'sha256',
            password.encode('utf-8'),
            salt.encode('utf-8'),
            100000
        )
        return new_hash.hex() == pwd_hash
    except (ValueError, AttributeError):
        return False
