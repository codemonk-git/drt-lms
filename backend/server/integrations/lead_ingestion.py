"""
Lead ingestion integrations - handles external lead sources
Supports: Meta Ads, Google Ads, Website Forms, and third-party sources
"""
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime
from enum import Enum
from ..domains.leads.models import Lead, LeadSource
from ..domains.leads.repositories import LeadRepository


class IngestionStatus(str, Enum):
    """Ingestion status enumeration"""
    PENDING = "pending"
    SUCCESS = "success"
    DUPLICATE = "duplicate"
    INVALID = "invalid"
    ERROR = "error"


class IngestionLog:
    """Track ingestion results"""
    def __init__(self, source: str, total: int = 0):
        self.source = source
        self.total = total
        self.successful = 0
        self.duplicates = 0
        self.invalid = 0
        self.errors = 0
        self.ingestion_date = datetime.utcnow()
        self.details: List[Dict] = []
    
    def add_result(self, status: IngestionStatus, lead_id: Optional[str] = None, error: Optional[str] = None):
        """Record ingestion result"""
        if status == IngestionStatus.SUCCESS:
            self.successful += 1
        elif status == IngestionStatus.DUPLICATE:
            self.duplicates += 1
        elif status == IngestionStatus.INVALID:
            self.invalid += 1
        elif status == IngestionStatus.ERROR:
            self.errors += 1
        
        self.details.append({
            'status': status,
            'lead_id': lead_id,
            'error': error,
            'timestamp': datetime.utcnow().isoformat()
        })


class LeadIngestionBase:
    """Base class for lead ingestion"""
    
    def __init__(self, lead_repo: LeadRepository = None):
        self.lead_repo = lead_repo or LeadRepository()
    
    def validate_lead_data(self, data: Dict[str, Any]) -> Tuple[bool, Optional[str]]:
        """
        Validate lead data
        Returns: (is_valid, error_message)
        """
        if not data:
            return False, "Data is empty"
        
        first_name = data.get('first_name', '').strip()
        if not first_name:
            return False, "First name is required"
        
        # At least one contact method
        email = data.get('email', '').strip()
        phone = data.get('phone', '').strip()
        if not email and not phone:
            return False, "Either email or phone is required"
        
        return True, None
    
    def check_duplicate(self, company_id: str, email: Optional[str] = None, phone: Optional[str] = None) -> Optional[Lead]:
        """Check if lead already exists"""
        if email:
            existing = self.lead_repo.get_by_email(company_id, email)
            if existing:
                return existing
        
        if phone:
            existing = self.lead_repo.get_by_phone(company_id, phone)
            if existing:
                return existing
        
        return None
    
    def ingest_lead(self, company_id: str, data: Dict[str, Any]) -> Tuple[Optional[Lead], IngestionStatus, Optional[str]]:
        """
        Ingest a lead from external source
        Returns: (lead, status, error_message)
        """
        raise NotImplementedError


class MetaLeadIngestion(LeadIngestionBase):
    """Meta (Facebook) lead ingestion"""
    
    def ingest_lead(self, company_id: str, data: Dict[str, Any]) -> Tuple[Optional[Lead], IngestionStatus, Optional[str]]:
        """
        Ingest lead from Meta Ads
        
        Expected data format:
        {
            'lead_id': 'meta_lead_123',
            'first_name': 'John',
            'last_name': 'Doe',
            'email': 'john@example.com',
            'phone': '+1234567890',
            'campaign_id': 'campaign_123',
            'campaign_name': 'Solar Campaign',
            'custom_fields': {...}
        }
        """
        # Validate
        is_valid, error = self.validate_lead_data(data)
        if not is_valid:
            return None, IngestionStatus.INVALID, error
        
        # Check duplicate
        existing = self.check_duplicate(company_id, data.get('email'), data.get('phone'))
        if existing:
            return existing, IngestionStatus.DUPLICATE, "Lead already exists"
        
        try:
            lead = Lead(
                company_id=company_id,
                first_name=data.get('first_name', 'Unknown'),
                last_name=data.get('last_name'),
                email=data.get('email'),
                phone=data.get('phone'),
                source=LeadSource.FACEBOOK,
                source_id=data.get('lead_id'),
                campaign_id=data.get('campaign_id'),
                campaign_name=data.get('campaign_name'),
                custom_fields=data.get('custom_fields', {})
            )
            saved_lead = self.lead_repo.save(lead)
            return saved_lead, IngestionStatus.SUCCESS, None
        except Exception as e:
            return None, IngestionStatus.ERROR, str(e)


class GoogleAdsLeadIngestion(LeadIngestionBase):
    """Google Ads lead ingestion"""
    
    def ingest_lead(self, company_id: str, data: Dict[str, Any]) -> Tuple[Optional[Lead], IngestionStatus, Optional[str]]:
        """
        Ingest lead from Google Ads
        
        Expected data format:
        {
            'lead_id': 'google_lead_123',
            'first_name': 'John',
            'email': 'john@example.com',
            'phone': '+1234567890',
            'campaign_id': 'campaign_456',
            'campaign_name': 'Solar Ads',
            'location': 'New York'
        }
        """
        # Validate
        is_valid, error = self.validate_lead_data(data)
        if not is_valid:
            return None, IngestionStatus.INVALID, error
        
        # Check duplicate
        existing = self.check_duplicate(company_id, data.get('email'), data.get('phone'))
        if existing:
            return existing, IngestionStatus.DUPLICATE, "Lead already exists"
        
        try:
            lead = Lead(
                company_id=company_id,
                first_name=data.get('first_name', 'Unknown'),
                last_name=data.get('last_name'),
                email=data.get('email'),
                phone=data.get('phone'),
                source=LeadSource.GOOGLE_ADS,
                source_id=data.get('lead_id'),
                campaign_id=data.get('campaign_id'),
                campaign_name=data.get('campaign_name'),
                location=data.get('location'),
                custom_fields=data.get('custom_fields', {})
            )
            saved_lead = self.lead_repo.save(lead)
            return saved_lead, IngestionStatus.SUCCESS, None
        except Exception as e:
            return None, IngestionStatus.ERROR, str(e)


class WebsiteFormLeadIngestion(LeadIngestionBase):
    """Website form lead ingestion"""
    
    def ingest_lead(self, company_id: str, data: Dict[str, Any]) -> Tuple[Optional[Lead], IngestionStatus, Optional[str]]:
        """
        Ingest lead from website form
        
        Expected data format:
        {
            'first_name': 'John',
            'email': 'john@example.com',
            'phone': '+1234567890',
            'form_url': 'https://example.com/contact',
            'timestamp': '2026-01-17T10:30:00'
        }
        """
        # Validate
        is_valid, error = self.validate_lead_data(data)
        if not is_valid:
            return None, IngestionStatus.INVALID, error
        
        # Check duplicate
        existing = self.check_duplicate(company_id, data.get('email'), data.get('phone'))
        if existing:
            return existing, IngestionStatus.DUPLICATE, "Lead already exists"
        
        try:
            lead = Lead(
                company_id=company_id,
                first_name=data.get('first_name', 'Unknown'),
                last_name=data.get('last_name'),
                email=data.get('email'),
                phone=data.get('phone'),
                source=LeadSource.WEBSITE_FORM,
                source_id=data.get('form_id'),
                custom_fields={
                    'form_url': data.get('form_url'),
                    'submission_timestamp': data.get('timestamp', datetime.utcnow().isoformat()),
                    **data.get('custom_fields', {})
                }
            )
            saved_lead = self.lead_repo.save(lead)
            return saved_lead, IngestionStatus.SUCCESS, None
        except Exception as e:
            return None, IngestionStatus.ERROR, str(e)


class ThirdPartyLeadIngestion(LeadIngestionBase):
    """Generic third-party lead ingestion (99acres, MagicBricks, etc.)"""
    
    def ingest_lead(self, company_id: str, data: Dict[str, Any], source: str = "OTHER") -> Tuple[Optional[Lead], IngestionStatus, Optional[str]]:
        """
        Ingest lead from third-party source
        
        Args:
            company_id: Company ID
            data: Lead data
            source: Source identifier (99acres, magicbricks, etc.)
        """
        # Validate
        is_valid, error = self.validate_lead_data(data)
        if not is_valid:
            return None, IngestionStatus.INVALID, error
        
        # Check duplicate
        existing = self.check_duplicate(company_id, data.get('email'), data.get('phone'))
        if existing:
            return existing, IngestionStatus.DUPLICATE, "Lead already exists"
        
        try:
            source_enum = LeadSource[source.upper()] if source.upper() in LeadSource.__members__ else LeadSource.OTHER
            
            lead = Lead(
                company_id=company_id,
                first_name=data.get('first_name', 'Unknown'),
                last_name=data.get('last_name'),
                email=data.get('email'),
                phone=data.get('phone'),
                source=source_enum,
                source_id=data.get('source_id'),
                campaign_id=data.get('campaign_id'),
                campaign_name=data.get('campaign_name'),
                location=data.get('location'),
                custom_fields=data.get('custom_fields', {})
            )
            saved_lead = self.lead_repo.save(lead)
            return saved_lead, IngestionStatus.SUCCESS, None
        except Exception as e:
            return None, IngestionStatus.ERROR, str(e)


class LeadIngestionService:
    """Unified lead ingestion service with validation, deduplication, and batch processing"""
    
    def __init__(self, lead_repo: LeadRepository = None):
        self.lead_repo = lead_repo or LeadRepository()
        
        # Initialize ingestion handlers
        self.handlers = {
            'meta': MetaLeadIngestion(lead_repo),
            'facebook': MetaLeadIngestion(lead_repo),
            'google_ads': GoogleAdsLeadIngestion(lead_repo),
            'google': GoogleAdsLeadIngestion(lead_repo),
            'website_form': WebsiteFormLeadIngestion(lead_repo),
            'form': WebsiteFormLeadIngestion(lead_repo),
        }
        
        # Ingestion logs
        self.ingestion_logs: Dict[str, List[IngestionLog]] = {}
    
    def ingest_lead(self, company_id: str, source: str, data: Dict[str, Any]) -> Tuple[Optional[Lead], IngestionStatus, Optional[str]]:
        """
        Ingest single lead from source
        
        Args:
            company_id: Company ID
            source: Source type (meta, google_ads, website_form, etc.)
            data: Lead data
            
        Returns:
            Tuple of (lead, status, error_message)
        """
        handler = self.handlers.get(source.lower())
        
        if handler:
            return handler.ingest_lead(company_id, data)
        else:
            # Use generic handler for unknown sources
            generic = ThirdPartyLeadIngestion(self.lead_repo)
            return generic.ingest_lead(company_id, data, source)
    
    def ingest_bulk(self, company_id: str, source: str, leads_data: List[Dict]) -> Tuple[List[Lead], IngestionLog]:
        """
        Ingest multiple leads in batch with comprehensive logging
        
        Returns:
            Tuple of (ingested_leads, ingestion_log)
        """
        log = IngestionLog(source, total=len(leads_data))
        ingested = []
        
        for data in leads_data:
            lead, status, error = self.ingest_lead(company_id, source, data)
            log.add_result(status, lead.id if lead else None, error)
            
            if status == IngestionStatus.SUCCESS:
                ingested.append(lead)
        
        # Store log
        if company_id not in self.ingestion_logs:
            self.ingestion_logs[company_id] = []
        self.ingestion_logs[company_id].append(log)
        
        return ingested, log
    
    def get_ingestion_logs(self, company_id: str, limit: int = 50) -> List[IngestionLog]:
        """Get ingestion logs for company"""
        if company_id not in self.ingestion_logs:
            return []
        return self.ingestion_logs[company_id][-limit:]
    
    def get_ingestion_summary(self, company_id: str) -> Dict[str, Any]:
        """Get summary of all ingestions for company"""
        logs = self.get_ingestion_logs(company_id)
        
        total_ingested = sum(log.successful for log in logs)
        total_duplicates = sum(log.duplicates for log in logs)
        total_errors = sum(log.errors + log.invalid for log in logs)
        
        return {
            'total_ingested': total_ingested,
            'total_duplicates': total_duplicates,
            'total_errors': total_errors,
            'total_ingestions': len(logs),
            'logs': logs
        }
