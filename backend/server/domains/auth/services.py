"""
Enhanced authentication service with signup and onboarding.
"""
from typing import Optional, Dict, Any
from datetime import datetime, timedelta
import secrets
import re
from ...domains.users.repositories import UserRepository
from ...domains.users.models import User, UserStatus
from ...domains.tenants.repositories import CompanyRepository
from ...domains.tenants.models import Company, CompanyStatus


# Password hashing
from passlib.context import CryptContext
from email_validator import validate_email, EmailNotValidError

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    """Hash password with bcrypt"""
    return pwd_context.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    """Verify password with bcrypt"""
    return pwd_context.verify(password, password_hash)


class AuthService:
    """Enhanced auth service with signup and onboarding"""
    
    def __init__(self, 
                 user_repo: UserRepository = None,
                 company_repo: CompanyRepository = None):
        self.user_repo = user_repo or UserRepository()
        self.company_repo = company_repo or CompanyRepository()
    
    def validate_email(self, email: str) -> str:
        """Validate email format"""
        try:
            valid = validate_email(email)
            return valid.email
        except EmailNotValidError as e:
            raise ValueError(f"Invalid email: {str(e)}")
    
    def validate_slug(self, slug: str) -> bool:
        """Validate company slug format"""
        pattern = r'^[a-z0-9-]{3,32}$'
        if not re.match(pattern, slug):
            raise ValueError(
                "Slug must be 3-32 characters, "
                "lowercase letters, numbers, and hyphens only"
            )
        return True
    
    def generate_verification_token(self) -> str:
        """Generate email verification token"""
        return secrets.token_urlsafe(32)
    
    def signup(self,
               email: str,
               password: str,
               first_name: str,
               last_name: str,
               company_name: str) -> Dict[str, Any]:
        """
        Complete signup flow:
        1. Validate inputs
        2. Create company (PENDING)
        3. Create user (PENDING)
        4. Generate verification token
        5. Return onboarding data
        """
        
        # Validate email
        email = self.validate_email(email)
        
        # Check if email exists globally
        existing_user = self.user_repo.get_by_email_global(email)
        if existing_user:
            raise ValueError("Email already registered")
        
        # Validate password
        if len(password) < 8:
            raise ValueError("Password must be at least 8 characters")
        
        # Validate names
        if not first_name.strip():
            raise ValueError("First name is required")
        if not last_name.strip():
            raise ValueError("Last name is required")
        
        # Generate slug from company name
        slug = self._generate_slug(company_name)
        
        # Check if slug exists
        existing_company = self.company_repo.get_by_slug(slug)
        if existing_company:
            slug = f"{slug}-{secrets.token_hex(3)}"
        
        # Create company
        company = Company(
            name=company_name,
            slug=slug,
            owner_id=None,  # Set after user creation
            status=CompanyStatus.PENDING
        )
        created_company = self.company_repo.save(company)
        
        # Create user
        user = User(
            company_id=created_company.id,
            email=email,
            password_hash=hash_password(password),
            first_name=first_name.strip(),
            last_name=last_name.strip(),
            status=UserStatus.PENDING,
            email_verified=False
        )
        created_user = self.user_repo.save(user)
        
        # Update company owner
        created_company.owner_id = created_user.id
        self.company_repo.save(created_company)
        
        # Generate verification token
        verification_token = self.generate_verification_token()
        
        return {
            "status": "success",
            "user": {
                "id": created_user.id,
                "email": created_user.email,
                "first_name": created_user.first_name,
                "last_name": created_user.last_name,
            },
            "company": {
                "id": created_company.id,
                "name": created_company.name,
                "slug": created_company.slug,
            },
            "verification_token": verification_token,
            "onboarding": {
                "current_step": 1,
                "total_steps": 4,
                "steps": [
                    {"number": 1, "name": "Account Created", "completed": True},
                    {"number": 2, "name": "Verify Email", "completed": False},
                    {"number": 3, "name": "Company Info", "completed": False},
                    {"number": 4, "name": "Complete Setup", "completed": False},
                ]
            }
        }
    
    def verify_email(self, user_id: str, token: str) -> User:
        """Verify user email with token"""
        user = self.user_repo.get(user_id)
        if not user:
            raise ValueError(f"User {user_id} not found")
        
        # TODO: Validate token (check against stored token)
        # For now, just verify the email
        
        user.verify_email()
        updated = self.user_repo.save(user)
        return updated
    
    def complete_company_onboarding(self,
                                    company_id: str,
                                    industry: Optional[str] = None,
                                    website: Optional[str] = None) -> Company:
        """Complete company onboarding step"""
        company = self.company_repo.get(company_id)
        if not company:
            raise ValueError(f"Company {company_id} not found")
        
        if industry:
            company.industry = industry
        if website:
            company.website = website
        
        company.updated_at = datetime.utcnow()
        updated = self.company_repo.save(company)
        return updated
    
    def activate_company(self, company_id: str) -> Company:
        """Activate company (final onboarding step)"""
        company = self.company_repo.get(company_id)
        if not company:
            raise ValueError(f"Company {company_id} not found")
        
        # Check prerequisites
        if company.status != CompanyStatus.PENDING:
            raise ValueError("Company is not in pending state")
        
        # Check that owner exists and is verified
        owner = self.user_repo.get(company.owner_id)
        if not owner:
            raise ValueError("Company owner not found")
        if not owner.email_verified:
            raise ValueError("Owner email must be verified")
        
        # Activate company
        company.activate()
        updated = self.company_repo.save(company)
        
        # Activate owner user
        owner.activate()
        self.user_repo.save(owner)
        
        return updated
    
    def _generate_slug(self, company_name: str) -> str:
        """Generate slug from company name"""
        # Convert to lowercase, replace spaces with hyphens, remove special chars
        slug = company_name.lower()
        slug = re.sub(r'[^\w\s-]', '', slug)
        slug = re.sub(r'[\s_]+', '-', slug)
        slug = slug.strip('-')
        return slug[:32]  # Max 32 chars
