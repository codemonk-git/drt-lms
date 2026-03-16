"""
Enhanced application configuration with environment variable support.
"""
import os
from dataclasses import dataclass
from typing import Optional
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""
    
    # Application
    app_name: str = "Lead Management SaaS API"
    app_version: str = "2.1.0"
    environment: str = os.getenv("ENVIRONMENT", "development")
    debug: bool = environment == "development"
    
    # API Configuration
    api_prefix: str = "/api"
    api_version: str = "v1"
    
    # Database
    database_url: str = os.getenv(
        "DATABASE_URL",
        "sqlite:///./business_suite.db"
    )
    db_pool_size: int = int(os.getenv("DB_POOL_SIZE", "10"))
    
    # JWT / Authentication
    jwt_secret_key: str = os.getenv(
        "JWT_SECRET_KEY",
        "your-secret-key-change-in-production"
    )
    jwt_algorithm: str = os.getenv("JWT_ALGORITHM", "HS256")
    jwt_expiry_hours: int = int(os.getenv("JWT_EXPIRY_HOURS", "24"))
    
    # CORS
    cors_origins: list = [
        "http://localhost:3000",
        "http://localhost:4200",
    ]
    
    class Config:
        env_file = ".env"


@dataclass
class DatabaseConfig:
    """Database configuration"""
    driver: str = "sqlite"  # Options: sqlite, postgresql, mysql
    host: Optional[str] = None
    port: Optional[int] = None
    database: str = "business_suite.db"
    username: Optional[str] = None
    password: Optional[str] = None
    pool_size: int = 10


@dataclass
class JWTConfig:
    """JWT configuration"""
    secret_key: str = "your-secret-key-change-in-production"
    algorithm: str = "HS256"
    expiry_hours: int = 24
    refresh_expiry_hours: int = 7 * 24


@dataclass
class EmailConfig:
    """Email configuration"""
    smtp_server: str = "smtp.gmail.com"
    smtp_port: int = 587
    sender_email: str = "noreply@business-suite.com"
    sender_password: Optional[str] = None
    use_tls: bool = True


@dataclass
class AppConfig:
    """Main application configuration"""
    app_name: str = "Business Suite"
    version: str = "1.0.0"
    debug: bool = True
    environment: str = "development"  # development, staging, production
    
    # Sub-configurations
    database: DatabaseConfig = None
    jwt: JWTConfig = None
    email: EmailConfig = None
    
    # Feature flags
    enable_two_factor_auth: bool = False
    enable_audit_logging: bool = True
    enable_email_verification: bool = True
    
    # Rate limiting
    rate_limit_enabled: bool = False
    rate_limit_requests: int = 100
    rate_limit_window_seconds: int = 60
    
    # CORS
    cors_origins: list = None
    
    def __post_init__(self):
        """Initialize default sub-configs"""
        if self.database is None:
            self.database = DatabaseConfig()
        if self.jwt is None:
            self.jwt = JWTConfig()
        if self.email is None:
            self.email = EmailConfig()
        if self.cors_origins is None:
            self.cors_origins = ["http://localhost:3000", "http://localhost:8000"]

    @classmethod
    def from_env(cls) -> 'AppConfig':
        """Create config from environment variables"""
        return cls(
            app_name=os.getenv("APP_NAME", "Business Suite"),
            debug=os.getenv("DEBUG", "True").lower() == "true",
            environment=os.getenv("ENVIRONMENT", "development"),
            database=DatabaseConfig(
                driver=os.getenv("DB_DRIVER", "sqlite"),
                host=os.getenv("DB_HOST"),
                port=int(os.getenv("DB_PORT", "5432")) if os.getenv("DB_PORT") else None,
                database=os.getenv("DB_NAME", "business_suite.db"),
                username=os.getenv("DB_USER"),
                password=os.getenv("DB_PASSWORD"),
            ),
            jwt=JWTConfig(
                secret_key=os.getenv("JWT_SECRET_KEY", "your-secret-key"),
                algorithm=os.getenv("JWT_ALGORITHM", "HS256"),
                expiry_hours=int(os.getenv("JWT_EXPIRY_HOURS", "24")),
            ),
            enable_audit_logging=os.getenv("ENABLE_AUDIT_LOGGING", "True").lower() == "true",
            enable_email_verification=os.getenv("ENABLE_EMAIL_VERIFICATION", "True").lower() == "true",
        )


# Default configuration instance
config = AppConfig.from_env()
