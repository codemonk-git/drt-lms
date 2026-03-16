"""
Tenant (Company) domain services.
"""
from typing import Optional, List, Dict
from datetime import datetime
from .models import Company, CompanySettings, CompanyStatus
from .repositories import CompanyRepository, CompanySettingsRepository


class CompanyService:
    """Service for company/tenant management"""

    def __init__(self, 
                 company_repo: CompanyRepository = None,
                 settings_repo: CompanySettingsRepository = None):
        self.company_repo = company_repo or CompanyRepository()
        self.settings_repo = settings_repo or CompanySettingsRepository()

    def create_company(self, 
                      name: str,
                      slug: str,
                      owner_id: str,
                      industry: Optional[str] = None,
                      website: Optional[str] = None,
                      description: Optional[str] = None,
                      subscription_plan: str = "free") -> Company:
        """Create a new company"""
        if not name or len(name.strip()) == 0:
            raise ValueError("Company name is required")
        
        if not slug or len(slug.strip()) == 0:
            raise ValueError("Company slug is required")
        
        if not owner_id:
            raise ValueError("Owner ID is required")

        # Check if slug already exists
        if self.company_repo.get_by_slug(slug):
            raise ValueError(f"Company with slug '{slug}' already exists")

        # Create company
        company = Company(
            name=name.strip(),
            slug=slug.lower(),
            industry=industry,
            website=website,
            description=description,
            subscription_plan=subscription_plan,
            owner_id=owner_id,
            status=CompanyStatus.PENDING
        )

        # Save company
        saved_company = self.company_repo.save(company)
        
        # Create default settings
        self._create_default_settings(saved_company.id)
        
        return saved_company

    def get_company(self, company_id: str) -> Optional[Company]:
        """Get company by ID"""
        return self.company_repo.get(company_id)

    def get_company_by_slug(self, slug: str) -> Optional[Company]:
        """Get company by slug"""
        return self.company_repo.get_by_slug(slug)

    def list_companies(self, 
                      status: Optional[CompanyStatus] = None,
                      limit: int = 100,
                      offset: int = 0) -> List[Company]:
        """List companies with optional filtering"""
        return self.company_repo.list(status=status, limit=limit, offset=offset)

    def update_company(self, 
                      company_id: str,
                      **kwargs) -> Optional[Company]:
        """Update company information"""
        company = self.company_repo.get(company_id)
        if not company:
            raise ValueError(f"Company {company_id} not found")

        # Update allowed fields
        allowed_fields = ['name', 'industry', 'website', 'logo_url', 'description']
        for field, value in kwargs.items():
            if field in allowed_fields and value is not None:
                setattr(company, field, value)

        company.updated_at = datetime.utcnow()
        updated = self.company_repo.save(company)
        return updated

    def activate_company(self, company_id: str) -> Company:
        """Activate company"""
        company = self.company_repo.get(company_id)
        if not company:
            raise ValueError(f"Company {company_id} not found")
        
        company.activate()
        updated = self.company_repo.save(company)
        return updated

    def suspend_company(self, company_id: str) -> Company:
        """Suspend company"""
        company = self.company_repo.get(company_id)
        if not company:
            raise ValueError(f"Company {company_id} not found")
        
        company.suspend()
        updated = self.company_repo.save(company)
        return updated

    def get_admin_company(self) -> Optional[Company]:
        """Get the admin/main company (first company created)"""
        all_companies = self.company_repo.list(limit=1000)
        if not all_companies:
            return None
        # Sort by created_at to find the first one created
        sorted_companies = sorted(all_companies, key=lambda c: c.created_at)
        return sorted_companies[0] if sorted_companies else None

    def is_admin_company(self, company_id: str) -> bool:
        """Check if a company is the admin/main company"""
        admin_company = self.get_admin_company()
        return admin_company is not None and admin_company.id == company_id

    def delete_company(self, company_id: str) -> bool:
        """Soft delete company (admin company cannot be deleted)"""
        company = self.company_repo.get(company_id)
        if not company:
            raise ValueError(f"Company {company_id} not found")
        
        # Check if this is the admin company
        if self.is_admin_company(company_id):
            raise ValueError("Admin company cannot be deleted")
        
        company.mark_deleted()
        self.company_repo.save(company)
        return True
    
    def list_companies_filtered(self,
                               page: int = 1,
                               limit: int = 10,
                               sort: str = "created_at",
                               order: str = "desc",
                               search: str = None) -> Dict:
        """List companies with filtering, sorting, and pagination"""
        companies = self.company_repo.get_all() if hasattr(self.company_repo, 'get_all') else []
        
        # Apply search filter
        if search:
            search_lower = search.lower()
            companies = [c for c in companies if search_lower in getattr(c, 'name', '').lower() or
                        search_lower in getattr(c, 'slug', '').lower()]
        
        # Apply sorting
        reverse = (order == "desc")
        companies = sorted(companies, key=lambda x: getattr(x, sort, getattr(x, 'created_at', '')), reverse=reverse)
        
        # Apply pagination
        start = (page - 1) * limit
        end = start + limit
        paginated = companies[start:end]
        
        return {
            "data": [c.to_dict() for c in paginated],
            "pagination": {
                "page": page,
                "limit": limit,
                "total": len(companies),
                "pages": (len(companies) + limit - 1) // limit
            }
        }

    def _create_default_settings(self, company_id: str):
        """Create default company settings"""
        settings = CompanySettings(company_id=company_id)
        self.settings_repo.save(settings)

    def get_company_settings(self, company_id: str) -> Optional[CompanySettings]:
        """Get company settings"""
        return self.settings_repo.get_by_company(company_id)

    def update_company_settings(self, 
                               company_id: str,
                               **kwargs) -> Optional[CompanySettings]:
        """Update company settings"""
        settings = self.settings_repo.get_by_company(company_id)
        if not settings:
            raise ValueError(f"Settings for company {company_id} not found")

        allowed_fields = [
            'allow_team_creation',
            'allow_user_invitation',
            'require_email_verification',
            'two_factor_authentication',
            'session_timeout_minutes'
        ]
        
        for field, value in kwargs.items():
            if field in allowed_fields and value is not None:
                setattr(settings, field, value)

        settings.updated_at = datetime.utcnow()
        return self.settings_repo.save(settings)
