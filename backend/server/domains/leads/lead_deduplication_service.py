"""
Lead deduplication service - detect and merge duplicate leads
"""
from typing import Dict, List, Optional, Tuple, Any
from datetime import datetime
from enum import Enum


class DuplicateMatchType(str, Enum):
    """Types of duplicate matches"""
    EXACT_EMAIL = "exact_email"  # Same email
    EXACT_PHONE = "exact_phone"  # Same phone
    FUZZY_NAME_EMAIL = "fuzzy_name_email"  # Similar name + same email domain
    FUZZY_PHONE = "fuzzy_phone"  # Similar phone (with formatting variations)
    SIMILAR_NAME_LOCATION = "similar_name_location"  # Similar name + location


class DuplicateMatch:
    """Record of potential duplicate match"""
    def __init__(self, lead_id_1: str, lead_id_2: str, match_type: str, confidence: float):
        self.id: str = self._generate_id()
        self.lead_id_1 = lead_id_1
        self.lead_id_2 = lead_id_2
        self.match_type = match_type
        self.confidence: float = confidence  # 0-1, higher = more confident
        self.is_confirmed: bool = False
        self.is_merged: bool = False
        self.merged_at: Optional[datetime] = None
        self.created_at = datetime.utcnow()
    
    def _generate_id(self) -> str:
        import uuid
        return str(uuid.uuid4())


class LeadMergeResult:
    """Result of merging two leads"""
    def __init__(self, surviving_lead_id: str, merged_lead_id: str):
        self.id: str = self._generate_id()
        self.surviving_lead_id = surviving_lead_id
        self.merged_lead_id = merged_lead_id
        self.merged_at = datetime.utcnow()
        self.field_updates: Dict[str, Any] = {}
        self.merged_activities: List[str] = []  # Activity IDs from merged lead
    
    def _generate_id(self) -> str:
        import uuid
        return str(uuid.uuid4())


class LeadDeduplicationService:
    """Service for detecting and managing duplicate leads"""
    
    def __init__(self):
        self.duplicates: Dict[str, List[DuplicateMatch]] = {}  # company_id -> [matches]
        self.merge_history: Dict[str, List[LeadMergeResult]] = {}  # company_id -> [results]
    
    def normalize_email(self, email: Optional[str]) -> Optional[str]:
        """Normalize email for comparison"""
        if not email:
            return None
        return email.lower().strip()
    
    def normalize_phone(self, phone: Optional[str]) -> Optional[str]:
        """Normalize phone for comparison"""
        if not phone:
            return None
        # Remove non-digits
        return ''.join(filter(str.isdigit, phone))
    
    def similarity_ratio(self, s1: str, s2: str) -> float:
        """Calculate string similarity (0-1)"""
        if not s1 or not s2:
            return 0.0
        
        s1 = s1.lower()
        s2 = s2.lower()
        
        if s1 == s2:
            return 1.0
        
        # Levenshtein-like comparison
        longer = s1 if len(s1) > len(s2) else s2
        shorter = s2 if len(s1) > len(s2) else s1
        
        if len(longer) == 0:
            return 1.0
        
        edit_distance = self._levenshtein(longer, shorter)
        return (len(longer) - edit_distance) / len(longer)
    
    def _levenshtein(self, s1: str, s2: str) -> int:
        """Calculate Levenshtein distance"""
        if len(s1) < len(s2):
            return self._levenshtein(s2, s1)
        
        if len(s2) == 0:
            return len(s1)
        
        previous_row = range(len(s2) + 1)
        for i, c1 in enumerate(s1):
            current_row = [i + 1]
            for j, c2 in enumerate(s2):
                insertions = previous_row[j + 1] + 1
                deletions = current_row[j] + 1
                substitutions = previous_row[j] + (c1 != c2)
                current_row.append(min(insertions, deletions, substitutions))
            previous_row = current_row
        
        return previous_row[-1]
    
    def find_duplicates(self, lead: Any, all_company_leads: List[Any], company_id: str, 
                       threshold: float = 0.85) -> List[DuplicateMatch]:
        """Find potential duplicate leads"""
        matches = []
        
        for other_lead in all_company_leads:
            if lead.id == other_lead.id:
                continue
            
            # Check exact email match
            normalized_email = self.normalize_email(lead.email)
            other_normalized_email = self.normalize_email(other_lead.email)
            
            if normalized_email and normalized_email == other_normalized_email:
                match = DuplicateMatch(lead.id, other_lead.id, DuplicateMatchType.EXACT_EMAIL, 0.99)
                matches.append(match)
                continue
            
            # Check exact phone match
            normalized_phone = self.normalize_phone(lead.phone)
            other_normalized_phone = self.normalize_phone(other_lead.phone)
            
            if normalized_phone and normalized_phone == other_normalized_phone:
                match = DuplicateMatch(lead.id, other_lead.id, DuplicateMatchType.EXACT_PHONE, 0.98)
                matches.append(match)
                continue
            
            # Check fuzzy name + email domain match
            name_similarity = self.similarity_ratio(
                f"{lead.first_name} {lead.last_name or ''}",
                f"{other_lead.first_name} {other_lead.last_name or ''}"
            )
            
            if normalized_email and other_normalized_email:
                email_domain_1 = normalized_email.split('@')[1] if '@' in normalized_email else ''
                email_domain_2 = other_normalized_email.split('@')[1] if '@' in other_normalized_email else ''
                
                if email_domain_1 and email_domain_1 == email_domain_2 and name_similarity > 0.7:
                    confidence = (name_similarity + 0.9) / 2  # Average of name sim and email domain
                    if confidence >= threshold:
                        match = DuplicateMatch(lead.id, other_lead.id, DuplicateMatchType.FUZZY_NAME_EMAIL, confidence)
                        matches.append(match)
                        continue
            
            # Check fuzzy phone
            if normalized_phone and other_normalized_phone:
                phone_similarity = self.similarity_ratio(normalized_phone, other_normalized_phone)
                if phone_similarity > 0.9:
                    match = DuplicateMatch(lead.id, other_lead.id, DuplicateMatchType.FUZZY_PHONE, phone_similarity)
                    matches.append(match)
                    continue
            
            # Check similar name + location
            if lead.location and lead.location == other_lead.location:
                if name_similarity > 0.8:
                    match = DuplicateMatch(lead.id, other_lead.id, DuplicateMatchType.SIMILAR_NAME_LOCATION, 0.75)
                    matches.append(match)
        
        # Store duplicates
        if company_id not in self.duplicates:
            self.duplicates[company_id] = []
        
        for match in matches:
            if match not in self.duplicates[company_id]:
                self.duplicates[company_id].append(match)
        
        return matches
    
    def get_company_duplicates(self, company_id: str, unmerged_only: bool = True) -> List[DuplicateMatch]:
        """Get all duplicate matches for company"""
        matches = self.duplicates.get(company_id, [])
        
        if unmerged_only:
            matches = [m for m in matches if not m.is_merged]
        
        return matches
    
    def merge_leads(self, surviving_lead: Any, merged_lead: Any, 
                   field_priorities: Optional[Dict[str, str]] = None) -> LeadMergeResult:
        """
        Merge two leads, keeping one and updating with data from the other
        
        Args:
            surviving_lead: Lead that will be kept
            merged_lead: Lead that will be merged into surviving_lead
            field_priorities: Dict specifying which lead's field to keep for each field
        """
        result = LeadMergeResult(surviving_lead.id, merged_lead.id)
        
        # Default priorities: prefer non-null values from surviving lead, then merged
        if not field_priorities:
            field_priorities = {}
        
        # Merge fields intelligently
        merge_fields = [
            'first_name', 'last_name', 'email', 'phone', 'company', 'title',
            'location', 'description', 'campaign_id', 'campaign_name'
        ]
        
        for field in merge_fields:
            surviving_val = getattr(surviving_lead, field, None)
            merged_val = getattr(merged_lead, field, None)
            
            # Use field priority if specified
            if field in field_priorities:
                if field_priorities[field] == 'surviving':
                    value = surviving_val
                elif field_priorities[field] == 'merged':
                    value = merged_val
                else:
                    value = surviving_val
            else:
                # Prefer non-null surviving value, otherwise use merged
                value = surviving_val if surviving_val else merged_val
            
            if value and getattr(surviving_lead, field, None) != value:
                setattr(surviving_lead, field, value)
                result.field_updates[field] = value
        
        # Merge custom fields
        surviving_custom = getattr(surviving_lead, 'custom_fields', {}) or {}
        merged_custom = getattr(merged_lead, 'custom_fields', {}) or {}
        
        merged_custom.update(surviving_custom)  # Surviving takes priority
        surviving_lead.custom_fields = merged_custom
        
        # Update merge info
        result.merged_activities = []  # Would normally copy activity IDs from merged lead
        result.merged_at = datetime.utcnow()
        
        return result
    
    def log_merge(self, company_id: str, result: LeadMergeResult):
        """Log merge result"""
        if company_id not in self.merge_history:
            self.merge_history[company_id] = []
        
        self.merge_history[company_id].append(result)
        
        # Mark duplicate as merged
        for match in self.duplicates.get(company_id, []):
            if (match.lead_id_1 == result.surviving_lead_id and match.lead_id_2 == result.merged_lead_id) or \
               (match.lead_id_1 == result.merged_lead_id and match.lead_id_2 == result.surviving_lead_id):
                match.is_merged = True
                match.merged_at = result.merged_at
    
    def get_merge_history(self, company_id: str, limit: int = 50) -> List[LeadMergeResult]:
        """Get merge history for company"""
        history = self.merge_history.get(company_id, [])
        return sorted(history, key=lambda x: x.merged_at, reverse=True)[:limit]
    
    def get_dedup_summary(self, company_id: str) -> Dict[str, Any]:
        """Get deduplication summary for company"""
        all_matches = self.duplicates.get(company_id, [])
        unmerged = [m for m in all_matches if not m.is_merged]
        merged = [m for m in all_matches if m.is_merged]
        
        return {
            'company_id': company_id,
            'total_potential_duplicates': len(all_matches),
            'unmerged_duplicates': len(unmerged),
            'merged_duplicates': len(merged),
            'total_merges': len(self.merge_history.get(company_id, [])),
            'by_type': {
                DuplicateMatchType.EXACT_EMAIL: len([m for m in all_matches if m.match_type == DuplicateMatchType.EXACT_EMAIL]),
                DuplicateMatchType.EXACT_PHONE: len([m for m in all_matches if m.match_type == DuplicateMatchType.EXACT_PHONE]),
                DuplicateMatchType.FUZZY_NAME_EMAIL: len([m for m in all_matches if m.match_type == DuplicateMatchType.FUZZY_NAME_EMAIL]),
                DuplicateMatchType.FUZZY_PHONE: len([m for m in all_matches if m.match_type == DuplicateMatchType.FUZZY_PHONE]),
                DuplicateMatchType.SIMILAR_NAME_LOCATION: len([m for m in all_matches if m.match_type == DuplicateMatchType.SIMILAR_NAME_LOCATION])
            }
        }
