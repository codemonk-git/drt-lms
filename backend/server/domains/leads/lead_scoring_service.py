"""
Lead scoring service - auto-score leads based on behavior and engagement
"""
from typing import Dict, Optional, Any, List
from datetime import datetime
from enum import Enum


class ScoreFactor(str, Enum):
    """Lead scoring factors"""
    ENGAGEMENT = "engagement"  # Email opens, form fills, etc.
    INTERACTION = "interaction"  # Calls, meetings, etc.
    ACTIVITY_RECENCY = "activity_recency"  # How recently they engaged
    CAMPAIGN_QUALITY = "campaign_quality"  # Which campaign they came from
    CONTACT_COMPLETENESS = "contact_completeness"  # Data quality
    CUSTOM = "custom"  # Custom scoring rules


class LeadScore:
    """Lead scoring model"""
    def __init__(self, lead_id: str, company_id: str, **kwargs):
        self.id: str = kwargs.get('id', self._generate_id())
        self.lead_id = lead_id
        self.company_id = company_id
        self.score: int = kwargs.get('score', 0)  # 0-100
        self.grade: str = kwargs.get('grade', 'D')  # A, B, C, D, F
        self.factors: Dict[str, int] = kwargs.get('factors', {})  # Score breakdown
        self.created_at = kwargs.get('created_at', datetime.utcnow())
        self.updated_at = kwargs.get('updated_at', datetime.utcnow())
        self.next_review_at: Optional[datetime] = kwargs.get('next_review_at')
        self.metadata: Dict = kwargs.get('metadata', {})
    
    def _generate_id(self) -> str:
        import uuid
        return str(uuid.uuid4())
    
    def get_grade(self) -> str:
        """Get letter grade based on score"""
        if self.score >= 90:
            return 'A'
        elif self.score >= 80:
            return 'B'
        elif self.score >= 70:
            return 'C'
        elif self.score >= 60:
            return 'D'
        else:
            return 'F'
    
    def update_score(self, new_score: int, factors: Dict[str, int] = None):
        """Update lead score"""
        self.score = min(100, max(0, new_score))  # Clamp between 0-100
        self.grade = self.get_grade()
        if factors:
            self.factors = factors
        self.updated_at = datetime.utcnow()


class LeadScoringService:
    """Service for calculating and managing lead scores"""
    
    def __init__(self):
        self.scores: Dict[str, LeadScore] = {}  # lead_id -> LeadScore
        self.rules: Dict[str, Dict[str, Any]] = {}  # company_id -> scoring rules
        self.default_rules = self._get_default_rules()
    
    def _get_default_rules(self) -> Dict[str, Any]:
        """Get default scoring rules"""
        return {
            'engagement': {
                'form_submission': 20,
                'email_open': 5,
                'link_click': 10,
                'page_visit': 2
            },
            'interaction': {
                'call_completed': 25,
                'meeting_scheduled': 30,
                'email_sent': 10,
                'sms_sent': 8
            },
            'recency': {
                'last_24h': 15,
                'last_7d': 10,
                'last_30d': 5,
                'older': -5
            },
            'contact_completeness': {
                'has_email': 10,
                'has_phone': 10,
                'has_company': 5,
                'has_title': 5,
                'full_profile': 10  # Bonus for complete profile
            },
            'source_quality': {
                'facebook': 20,
                'google_ads': 25,
                'website_form': 30,
                'email': 20,
                'phone': 25,
                'import': 10,
                'manual': 15,
                'other': 5
            }
        }
    
    def set_company_rules(self, company_id: str, rules: Dict[str, Any]):
        """Set custom scoring rules for company"""
        self.rules[company_id] = rules
    
    def get_company_rules(self, company_id: str) -> Dict[str, Any]:
        """Get scoring rules for company"""
        return self.rules.get(company_id, self.default_rules)
    
    def calculate_score(self, lead: Any, company_id: str) -> LeadScore:
        """Calculate lead score based on lead attributes and rules"""
        rules = self.get_company_rules(company_id)
        factors = {}
        total_score = 0
        
        # 1. Contact completeness (max 40 points)
        completeness_score = 0
        if lead.email:
            completeness_score += rules['contact_completeness'].get('has_email', 10)
        if lead.phone:
            completeness_score += rules['contact_completeness'].get('has_phone', 10)
        if lead.company:
            completeness_score += rules['contact_completeness'].get('has_company', 5)
        if lead.title:
            completeness_score += rules['contact_completeness'].get('has_title', 5)
        
        if completeness_score >= 30:
            completeness_score += rules['contact_completeness'].get('full_profile', 10)
        
        factors['contact_completeness'] = min(40, completeness_score)
        total_score += factors['contact_completeness']
        
        # 2. Source quality (max 30 points)
        source_name = lead.source.value if hasattr(lead.source, 'value') else str(lead.source)
        source_score = rules['source_quality'].get(source_name.lower(), 5)
        factors['source_quality'] = min(30, source_score)
        total_score += factors['source_quality']
        
        # 3. Engagement level (max 20 points)
        # Based on custom_fields interactions
        engagement_score = 0
        if hasattr(lead, 'custom_fields') and lead.custom_fields:
            if lead.custom_fields.get('form_submissions', 0) > 0:
                engagement_score += rules['engagement'].get('form_submission', 20)
            if lead.custom_fields.get('email_opens', 0) > 0:
                engagement_score += rules['engagement'].get('email_open', 5)
            if lead.custom_fields.get('link_clicks', 0) > 0:
                engagement_score += rules['engagement'].get('link_click', 10)
        
        factors['engagement'] = min(20, engagement_score)
        total_score += factors['engagement']
        
        # 4. Stage progression (max 10 points)
        stage_name = lead.stage.value if hasattr(lead.stage, 'value') else str(lead.stage)
        stage_progression = {
            'new': 0,
            'contacted': 2,
            'interested': 5,
            'quotation_requested': 8,
            'quotation_sent': 8,
            'site_visit_requested': 10,
            'site_visit_scheduled': 10,
            'won': 10,
            'lost': -10
        }
        stage_score = stage_progression.get(stage_name.lower(), 0)
        factors['stage_progression'] = stage_score
        total_score += factors['stage_progression']
        
        # Clamp score between 0-100
        total_score = min(100, max(0, total_score))
        
        # Create score record
        score = LeadScore(lead.id, company_id, score=total_score, factors=factors)
        self.scores[lead.id] = score
        
        return score
    
    def get_lead_score(self, lead_id: str) -> Optional[LeadScore]:
        """Get cached lead score"""
        return self.scores.get(lead_id)
    
    def recalculate_company_scores(self, company_id: str, leads: List[Any]) -> List[LeadScore]:
        """Recalculate scores for all company leads"""
        scores = []
        for lead in leads:
            score = self.calculate_score(lead, company_id)
            scores.append(score)
        return scores
    
    def get_hot_leads(self, company_id: str, leads: List[Any], threshold: int = 80) -> List[Any]:
        """Get leads above score threshold (hot leads)"""
        hot_leads = []
        for lead in leads:
            score = self.calculate_score(lead, company_id)
            if score.score >= threshold:
                hot_leads.append((lead, score))
        
        return sorted(hot_leads, key=lambda x: x[1].score, reverse=True)
    
    def score_distribution(self, company_id: str, leads: List[Any]) -> Dict[str, int]:
        """Get distribution of lead scores"""
        distribution = {
            'A': 0,  # 90-100
            'B': 0,  # 80-89
            'C': 0,  # 70-79
            'D': 0,  # 60-69
            'F': 0   # 0-59
        }
        
        for lead in leads:
            score = self.calculate_score(lead, company_id)
            distribution[score.grade] += 1
        
        return distribution
