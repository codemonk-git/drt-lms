"""
Lead auto-assignment service - automatically assign leads based on rules
"""
from typing import Dict, Optional, Any, List
from datetime import datetime
from enum import Enum


class AssignmentRuleType(str, Enum):
    """Assignment rule types"""
    BY_SOURCE = "by_source"  # Assign based on lead source
    BY_LOCATION = "by_location"  # Assign based on geographic location
    BY_SCORE = "by_score"  # Assign based on lead score threshold
    BY_CAMPAIGN = "by_campaign"  # Assign based on campaign
    BY_ROUND_ROBIN = "by_round_robin"  # Rotate through team members
    CUSTOM = "custom"


class AssignmentRule:
    """Lead assignment rule"""
    def __init__(self, company_id: str, team_id: str, rule_type: str, **kwargs):
        self.id: str = kwargs.get('id', self._generate_id())
        self.company_id = company_id
        self.team_id = team_id
        self.rule_type = rule_type
        self.name: str = kwargs.get('name', '')
        self.description: Optional[str] = kwargs.get('description')
        self.is_active: bool = kwargs.get('is_active', True)
        self.priority: int = kwargs.get('priority', 0)  # Higher priority = applied first
        self.conditions: Dict[str, Any] = kwargs.get('conditions', {})  # Rule conditions
        self.assignment_user_id: Optional[str] = kwargs.get('assignment_user_id')  # Specific user
        self.round_robin_users: List[str] = kwargs.get('round_robin_users', [])  # For round-robin
        self.round_robin_index: int = kwargs.get('round_robin_index', 0)
        self.created_at = kwargs.get('created_at', datetime.utcnow())
        self.updated_at = kwargs.get('updated_at', datetime.utcnow())
        self.assignment_count: int = kwargs.get('assignment_count', 0)
    
    def _generate_id(self) -> str:
        import uuid
        return str(uuid.uuid4())
    
    def matches(self, lead: Any) -> bool:
        """Check if lead matches rule conditions"""
        if not self.is_active:
            return False
        
        conditions = self.conditions
        
        if self.rule_type == "by_source":
            lead_source = lead.source.value if hasattr(lead.source, 'value') else str(lead.source)
            return lead_source.lower() == conditions.get('source', '').lower()
        
        elif self.rule_type == "by_location":
            return lead.location == conditions.get('location')
        
        elif self.rule_type == "by_score":
            # Score comparison happens in service
            return True
        
        elif self.rule_type == "by_campaign":
            return lead.campaign_id == conditions.get('campaign_id') or \
                   lead.campaign_name == conditions.get('campaign_name')
        
        elif self.rule_type == "by_round_robin":
            return True
        
        return False
    
    def get_next_user(self) -> str:
        """Get next user in round-robin"""
        if not self.round_robin_users:
            return ""
        
        user = self.round_robin_users[self.round_robin_index]
        self.round_robin_index = (self.round_robin_index + 1) % len(self.round_robin_users)
        return user


class AssignmentRuleService:
    """Service for managing lead assignment rules"""
    
    def __init__(self):
        self.rules: Dict[str, List[AssignmentRule]] = {}  # company_id -> [rules]
        self.rule_assignments: Dict[str, List[Dict]] = {}  # rule_id -> [assignments]
    
    def create_rule(self, company_id: str, team_id: str, rule_type: str, **kwargs) -> AssignmentRule:
        """Create new assignment rule"""
        rule = AssignmentRule(company_id, team_id, rule_type, **kwargs)
        
        if company_id not in self.rules:
            self.rules[company_id] = []
        
        self.rules[company_id].append(rule)
        self.rule_assignments[rule.id] = []
        
        return rule
    
    def get_rule(self, rule_id: str) -> Optional[AssignmentRule]:
        """Get rule by ID"""
        for company_rules in self.rules.values():
            for rule in company_rules:
                if rule.id == rule_id:
                    return rule
        return None
    
    def list_company_rules(self, company_id: str, active_only: bool = True) -> List[AssignmentRule]:
        """List rules for company"""
        rules = self.rules.get(company_id, [])
        if active_only:
            rules = [r for r in rules if r.is_active]
        return sorted(rules, key=lambda x: x.priority, reverse=True)
    
    def update_rule(self, rule_id: str, **kwargs) -> Optional[AssignmentRule]:
        """Update rule"""
        rule = self.get_rule(rule_id)
        if not rule:
            return None
        
        allowed_fields = ['name', 'description', 'is_active', 'priority', 'conditions',
                         'assignment_user_id', 'round_robin_users']
        
        for field, value in kwargs.items():
            if field in allowed_fields:
                setattr(rule, field, value)
        
        rule.updated_at = datetime.utcnow()
        return rule
    
    def delete_rule(self, rule_id: str) -> bool:
        """Delete rule"""
        rule = self.get_rule(rule_id)
        if not rule:
            return False
        
        for company_rules in self.rules.values():
            if rule in company_rules:
                company_rules.remove(rule)
                if rule.id in self.rule_assignments:
                    del self.rule_assignments[rule.id]
                return True
        
        return False
    
    def find_matching_rule(self, lead: Any, company_id: str, lead_score: Optional[int] = None) -> Optional[AssignmentRule]:
        """Find first matching rule for lead"""
        rules = self.list_company_rules(company_id, active_only=True)
        
        for rule in rules:
            # Handle score-based rules separately
            if rule.rule_type == "by_score":
                min_score = rule.conditions.get('min_score', 0)
                if lead_score and lead_score >= min_score:
                    return rule
                continue
            
            # Check other rule types
            if rule.matches(lead):
                return rule
        
        return None
    
    def get_assignment_for_lead(self, lead: Any, company_id: str, lead_score: Optional[int] = None) -> Optional[Dict[str, str]]:
        """Get assignment (team_id, user_id) for lead"""
        rule = self.find_matching_rule(lead, company_id, lead_score)
        
        if not rule:
            return None
        
        # Determine user assignment
        user_id = None
        if rule.assignment_user_id:
            user_id = rule.assignment_user_id
        elif rule.round_robin_users:
            user_id = rule.get_next_user()
        
        # Record assignment
        assignment = {
            'team_id': rule.team_id,
            'user_id': user_id,
            'rule_id': rule.id,
            'assigned_at': datetime.utcnow().isoformat()
        }
        
        rule.assignment_count += 1
        self.rule_assignments[rule.id].append(assignment)
        
        return assignment
    
    def get_rule_stats(self, rule_id: str) -> Dict[str, Any]:
        """Get rule assignment statistics"""
        rule = self.get_rule(rule_id)
        if not rule:
            return {}
        
        assignments = self.rule_assignments.get(rule_id, [])
        
        return {
            'rule_id': rule_id,
            'rule_name': rule.name,
            'rule_type': rule.rule_type,
            'team_id': rule.team_id,
            'is_active': rule.is_active,
            'total_assignments': rule.assignment_count,
            'recent_assignments': assignments[-10:],
            'created_at': rule.created_at.isoformat(),
            'updated_at': rule.updated_at.isoformat()
        }
    
    def get_company_assignment_summary(self, company_id: str) -> Dict[str, Any]:
        """Get summary of all assignments for company"""
        rules = self.list_company_rules(company_id, active_only=False)
        
        total_assignments = sum(r.assignment_count for r in rules)
        active_rules = sum(1 for r in rules if r.is_active)
        
        return {
            'company_id': company_id,
            'total_rules': len(rules),
            'active_rules': active_rules,
            'total_assignments': total_assignments,
            'rules': [{
                'id': r.id,
                'name': r.name,
                'type': r.rule_type,
                'assignments': r.assignment_count,
                'active': r.is_active
            } for r in rules]
        }
