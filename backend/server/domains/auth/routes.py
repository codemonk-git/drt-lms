"""
Authentication routes for signup, login, and onboarding.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any
import secrets
from ...domains.tenants.repositories import CompanyRepository
from ...domains.tenants.services import CompanyService
from ...domains.users.repositories import UserRepository
from ...domains.users.models import User, UserStatus, UserRole
from ...domains.tenants.models import Company, CompanyStatus
from .services import AuthService

router = APIRouter(prefix="/auth", tags=["authentication"])

# Initialize services
user_repo = UserRepository()
company_repo = CompanyRepository()
company_service = CompanyService(company_repo)
auth_service = AuthService(user_repo, company_repo)

# Request models
class SignupRequest(BaseModel):
    email: str
    password: str
    first_name: str
    last_name: str
    company_name: str

# Simple password hashing for development
import hashlib
def hash_password_simple(password: str) -> str:
    """Simple password hash for development (use bcrypt in production)"""
    return hashlib.sha256(password.encode()).hexdigest()

def generate_verification_token() -> str:
    """Generate email verification token"""
    return secrets.token_urlsafe(32)


@router.post("/signup")
def signup(request: SignupRequest):
    """
    Complete signup flow for new tenant
    
    Steps:
    1. Creates company (PENDING status)
    2. Creates user (PENDING status, with ADMIN role)
    3. Generates verification token
    4. Returns onboarding instructions
    
    DEV MODE: verification_token is included in response for development/testing
    """
    try:
        # Use auth_service which handles signup with proper role assignment
        signup_result = auth_service.signup(
            email=request.email,
            password=request.password,
            first_name=request.first_name,
            last_name=request.last_name,
            company_name=request.company_name
        )
        
        # Now enhance the result with ADMIN role for the owner
        user_id = signup_result['user']['id']
        user = user_repo.get(user_id)
        if user:
            user.role = UserRole.ADMIN  # First user is ADMIN
            user_repo.save(user)
            signup_result['user']['role'] = user.role.value if hasattr(user.role, 'value') else str(user.role)
        
        # Add dev verification code for testing
        signup_result['dev_verification_code'] = signup_result.get('verification_token')
        
        return signup_result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/verify-email")
def verify_email(user_id: str, token: str):
    """
    Verify user email with token
    Called after user clicks email verification link
    """
    try:
        user = auth_service.verify_email(user_id, token)
        return {
            "status": "success",
            "message": "Email verified successfully",
            "user": {
                "id": user.id,
                "email": user.email,
                "email_verified": user.email_verified
            }
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/onboarding/{company_id}/company-info")
def update_company_info(
    company_id: str,
    industry: Optional[str] = None,
    website: Optional[str] = None,
    description: Optional[str] = None
):
    """Update company info during onboarding"""
    try:
        company = auth_service.complete_company_onboarding(
            company_id=company_id,
            industry=industry,
            website=website
        )
        return {
            "status": "success",
            "company": {
                "id": company.id,
                "name": company.name,
                "slug": company.slug,
                "industry": company.industry,
                "website": company.website,
            }
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/onboarding/{company_id}/activate")
def activate_company(company_id: str):
    """
    Activate company (final onboarding step)
    Requirements:
    - Owner email must be verified
    - Basic company info filled
    """
    try:
        company = auth_service.activate_company(company_id)
        return {
            "status": "success",
            "message": "Company activated successfully",
            "company": {
                "id": company.id,
                "name": company.name,
                "slug": company.slug,
                "status": company.status,
                "dashboard_url": f"http://{company.slug}.localhost:4200/dashboard"
            },
            "onboarding": {
                "completed": True,
                "redirect_url": f"http://{company.slug}.localhost:4200/dashboard"
            }
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/onboarding/{company_id}/status")
def get_onboarding_status(company_id: str):
    """Get current onboarding status"""
    try:
        company = CompanyRepository().get(company_id)
        if not company:
            raise HTTPException(status_code=404, detail="Company not found")
        
        user = UserRepository().get(company.owner_id)
        if not user:
            raise HTTPException(status_code=404, detail="Owner not found")
        
        # Determine current step
        if not user.email_verified:
            current_step = 2
        elif not company.industry:
            current_step = 3
        elif company.status.value == "pending":
            current_step = 4
        else:
            current_step = 5
        
        return {
            "status": "success",
            "onboarding": {
                "current_step": current_step,
                "total_steps": 4,
                "company_status": company.status.value,
                "email_verified": user.email_verified,
                "company_info_completed": bool(company.industry and company.website),
                "steps": [
                    {"number": 1, "name": "Account Created", "completed": True},
                    {"number": 2, "name": "Verify Email", "completed": user.email_verified},
                    {"number": 3, "name": "Company Info", "completed": bool(company.industry)},
                    {"number": 4, "name": "Complete Setup", "completed": company.status.value == "active"},
                ]
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/companies/by-slug/{slug}")
def get_company_by_slug(slug: str):
    """Get company by slug (for subdomain resolution)"""
    try:
        company = CompanyRepository().get_by_slug(slug)
        if not company:
            raise HTTPException(status_code=404, detail="Company not found")
        
        status_value = company.status.value if hasattr(company.status, 'value') else str(company.status)
        
        return {
            "id": company.id,
            "slug": company.slug,
            "name": company.name,
            "status": status_value,
            "owner_id": company.owner_id,
            "created_at": company.created_at.isoformat() if hasattr(company.created_at, 'isoformat') else str(company.created_at),
            "settings": {
                "industry": company.industry,
                "website": company.website,
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
