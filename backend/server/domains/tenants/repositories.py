"""
Tenant (Company) domain repositories.
"""
from typing import Optional, List
from .models import Company, CompanySettings, CompanyStatus
from ...shared.persistence import JSONPersistenceMixin


class CompanyRepository(JSONPersistenceMixin):
    """Repository for Company entities"""
    
    FILENAME = "companies.json"
    
    def __init__(self):
        self.data = {}
        super().__init__()
    
    def save(self, company: Company) -> Company:
        """Save company"""
        self.data[company.id] = company
        self._save_to_file()
        return company
    
    def get(self, company_id: str) -> Optional[Company]:
        """Get company by ID"""
        # Reload from file to ensure we have the latest data
        self._ensure_fresh_data()
        return self.data.get(company_id)
    
    def get_by_slug(self, slug: str) -> Optional[Company]:
        """Get company by slug"""
        # Reload from file to ensure we have the latest data
        self._load_from_file()
        for company in self.data.values():
            if company.slug == slug and not company.deleted_at:
                return company
        return None
    
    def _load_data(self, data: dict):
        """Load companies from JSON data"""
        for company_data in data.get('companies', []):
            try:
                company = Company(**company_data)
                self.data[company.id] = company
            except Exception as e:
                print(f"Warning: Could not load company {company_data.get('id')}: {e}")
    
    def _get_data(self) -> dict:
        """Get data as dictionary for JSON serialization"""
        return {
            'companies': [c.to_dict() if hasattr(c, 'to_dict') else c.__dict__ 
                         for c in self.data.values() if not c.deleted_at]
        }
    
    def list(self, status: Optional[CompanyStatus] = None, 
             limit: int = 100, offset: int = 0) -> List[Company]:
        """List companies with optional status filter"""
        companies = [c for c in self.data.values() if not c.deleted_at]
        if status:
            companies = [c for c in companies if c.status == status]
        return companies[offset:offset + limit]
    
    def delete(self, company_id: str) -> bool:
        """Delete company"""
        if company_id in self.data:
            del self.data[company_id]
            return True
        return False


class CompanySettingsRepository:
    """Repository for Company Settings"""
    
    def __init__(self):
        self.data = {}
    
    def save(self, settings: CompanySettings) -> CompanySettings:
        """Save settings"""
        self.data[settings.id] = settings
        return settings
    
    def get(self, settings_id: str) -> Optional[CompanySettings]:
        """Get settings by ID"""
        return self.data.get(settings_id)
    
    def get_by_company(self, company_id: str) -> Optional[CompanySettings]:
        """Get settings by company ID"""
        self._ensure_fresh_data()
        for settings in self.data.values():
            if settings.company_id == company_id and not settings.deleted_at:
                return settings
        return None
    
    def delete(self, settings_id: str) -> bool:
        """Delete settings"""
        if settings_id in self.data:
            del self.data[settings_id]
            return True
        return False
