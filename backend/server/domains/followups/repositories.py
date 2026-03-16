"""
Followup repositories with templates and reminders support
"""
from typing import List, Optional
from datetime import datetime
from .models import Followup, FollowupTemplate, Reminder, FollowupStatus, ReminderStatus
from ...shared.persistence import JSONPersistenceMixin


class FollowupRepository(JSONPersistenceMixin):
    """Repository for Followup entities"""
    
    FILENAME = "followups.json"
    
    def __init__(self):
        self.followups = {}
        self.templates = {}
        self.reminders = {}
        super().__init__()
    
    # ===== FOLLOWUP OPERATIONS =====
    
    def save(self, followup: Followup) -> Followup:
        """Save followup"""
        print(f"💾 Saving followup {followup.id} for lead {followup.lead_id}")
        self.followups[followup.id] = followup
        print(f"   Total followups in memory: {len(self.followups)}")
        self._save_to_file()
        return followup
    
    def get_by_id(self, followup_id: str) -> Optional[Followup]:
        """Get followup by ID"""
        self._ensure_fresh_data()  # Reload from file to get latest data
        return self.followups.get(followup_id)
    
    def delete(self, followup_id: str) -> bool:
        """Delete followup"""
        self._ensure_fresh_data()  # Reload from file to check latest state
        if followup_id in self.followups:
            del self.followups[followup_id]
            self._save_to_file()
            return True
        return False
    
    def get_by_company(self, company_id: str) -> List[Followup]:
        """Get all followups for company"""
        self._ensure_fresh_data()
        return [f for f in self.followups.values()
                if f.company_id == company_id and not f.deleted_at]
    
    def get_pending_for_lead(self, lead_id: str) -> List[Followup]:
        """Get pending followups for lead"""
        self._ensure_fresh_data()
        return [f for f in self.followups.values()
                if f.lead_id == lead_id and f.status == FollowupStatus.PENDING and not f.deleted_at]
    
    def get_all_for_lead(self, lead_id: str) -> List[Followup]:
        """Get all followups for lead regardless of status"""
        self._ensure_fresh_data()
        result = [f for f in self.followups.values()
                if f.lead_id == lead_id and not f.deleted_at]
        print(f"📊 get_all_for_lead({lead_id}): Found {len(result)} followups (total in memory: {len(self.followups)})")
        return result
    
    def get_assigned_to_user(self, user_id: str) -> List[Followup]:
        """Get followups assigned to user"""
        self._ensure_fresh_data()
        return [f for f in self.followups.values()
                if f.assigned_to_user_id == user_id and f.status == FollowupStatus.PENDING and not f.deleted_at]
    
    def get_overdue(self, company_id: str) -> List[Followup]:
        """Get overdue followups for company"""
        self._ensure_fresh_data()
        return [f for f in self.followups.values()
                if f.company_id == company_id and f.is_overdue() and not f.deleted_at]
    
    def get_by_stage(self, stage_id: str) -> List[Followup]:
        """Get followups for stage"""
        self._ensure_fresh_data()
        return [f for f in self.followups.values()
                if f.stage_id == stage_id and not f.deleted_at]
    
    def get_upcoming(self, company_id: str, days: int = 7) -> List[Followup]:
        """Get upcoming followups in next N days"""
        self._ensure_fresh_data()
        from datetime import timedelta
        now = datetime.now()
        cutoff = now + timedelta(days=days)
        result = []
        for f in self.followups.values():
            if f.company_id == company_id and f.status == FollowupStatus.PENDING and f.scheduled_for and not f.deleted_at:
                try:
                    scheduled = f.scheduled_for if isinstance(f.scheduled_for, datetime) else datetime.fromisoformat(str(f.scheduled_for).replace('Z', '+00:00'))
                    # Convert to naive if timezone-aware for comparison
                    if scheduled.tzinfo is not None:
                        scheduled = scheduled.replace(tzinfo=None)
                    if now <= scheduled <= cutoff:
                        result.append(f)
                except (ValueError, TypeError):
                    pass
        return result
    
    def get_with_status(self, company_id: str, status: FollowupStatus) -> List[Followup]:
        """Get followups with specific status"""
        self._ensure_fresh_data()
        return [f for f in self.followups.values()
                if f.company_id == company_id and f.status == status and not f.deleted_at]
    
    def get_pending_soon(self, user_id: str, minutes: int = 30) -> List[Followup]:
        """Get pending followups for a user scheduled within next N minutes"""
        self._ensure_fresh_data()
        from datetime import timedelta
        now = datetime.now()
        cutoff = now + timedelta(minutes=minutes)
        result = []
        for f in self.followups.values():
            if f.assigned_to_user_id == user_id and f.status == FollowupStatus.PENDING and f.scheduled_for and not f.deleted_at:
                try:
                    scheduled = f.scheduled_for if isinstance(f.scheduled_for, datetime) else datetime.fromisoformat(str(f.scheduled_for).replace('Z', '+00:00'))
                    # Convert to naive if timezone-aware for comparison
                    if scheduled.tzinfo is not None:
                        scheduled = scheduled.replace(tzinfo=None)
                    if now <= scheduled <= cutoff:
                        result.append(f)
                except (ValueError, TypeError):
                    pass
        return result
    
    # ===== TEMPLATE OPERATIONS =====
    
    def save_template(self, template: FollowupTemplate) -> FollowupTemplate:
        """Save template"""
        self.templates[template.id] = template
        self._save_to_file()
        return template
    
    def get_template(self, template_id: str) -> Optional[FollowupTemplate]:
        """Get template by ID"""
        self._ensure_fresh_data()
        return self.templates.get(template_id)
    
    def get_templates_by_company(self, company_id: str) -> List[FollowupTemplate]:
        """Get all templates for company"""
        self._ensure_fresh_data()
        return [t for t in self.templates.values()
                if t.company_id == company_id and t.is_active and not t.deleted_at]
    
    def get_templates_by_type(self, company_id: str, followup_type: str) -> List[FollowupTemplate]:
        """Get templates by type"""
        self._ensure_fresh_data()
        return [t for t in self.templates.values()
                if t.company_id == company_id and t.followup_type == followup_type and 
                   t.is_active and not t.deleted_at]
    
    def delete_template(self, template_id: str) -> bool:
        """Delete template"""
        if template_id in self.templates:
            del self.templates[template_id]
            self._save_to_file()
            return True
        return False
    
    # ===== REMINDER OPERATIONS =====
    
    def save_reminder(self, reminder: Reminder) -> Reminder:
        """Save reminder"""
        self.reminders[reminder.id] = reminder
        self._save_to_file()
        return reminder
    
    def get_reminder(self, reminder_id: str) -> Optional[Reminder]:
        """Get reminder by ID"""
        self._ensure_fresh_data()
        return self.reminders.get(reminder_id)
    
    def get_reminders_for_followup(self, followup_id: str) -> List[Reminder]:
        """Get all reminders for followup"""
        self._ensure_fresh_data()
        return [r for r in self.reminders.values()
                if r.followup_id == followup_id and not r.deleted_at]
    
    def get_pending_reminders(self, company_id: str) -> List[Reminder]:
        """Get pending reminders for company"""
        self._ensure_fresh_data()
        now = datetime.now()
        result = []
        for r in self.reminders.values():
            if r.company_id == company_id and r.status == ReminderStatus.PENDING and r.remind_at and not r.deleted_at:
                try:
                    remind_at = r.remind_at if isinstance(r.remind_at, datetime) else datetime.fromisoformat(str(r.remind_at).replace('Z', '+00:00'))
                    # Convert to naive if timezone-aware for comparison
                    if remind_at.tzinfo is not None:
                        remind_at = remind_at.replace(tzinfo=None)
                    if remind_at <= now:
                        result.append(r)
                except (ValueError, TypeError):
                    pass
        return result
    
    def get_user_pending_reminders(self, user_id: str) -> List[Reminder]:
        """Get pending reminders for user"""
        self._ensure_fresh_data()
        now = datetime.now()
        result = []
        for r in self.reminders.values():
            if r.assigned_to_user_id == user_id and r.status == ReminderStatus.PENDING and r.remind_at and not r.deleted_at:
                try:
                    remind_at = r.remind_at if isinstance(r.remind_at, datetime) else datetime.fromisoformat(str(r.remind_at).replace('Z', '+00:00'))
                    # Convert to naive if timezone-aware for comparison
                    if remind_at.tzinfo is not None:
                        remind_at = remind_at.replace(tzinfo=None)
                    if remind_at <= now:
                        result.append(r)
                except (ValueError, TypeError):
                    pass
        return result
    
    def delete_reminder(self, reminder_id: str) -> bool:
        """Delete reminder"""
        if reminder_id in self.reminders:
            del self.reminders[reminder_id]
            self._save_to_file()
            return True
        return False
    
    # ===== DATA LOADING/SAVING =====
    
    def _load_data(self, data: dict):
        """Load followups, templates, and reminders from JSON data"""
        # Clear old data to ensure fresh load (don't accumulate deleted items)
        self.followups.clear()
        self.templates.clear()
        self.reminders.clear()
        
        # Load followups
        loaded_count = 0
        for followup_data in data.get('followups', []):
            try:
                # Fix status field if it's serialized as an object
                if isinstance(followup_data.get('status'), dict):
                    status_dict = followup_data['status']
                    followup_data['status'] = status_dict.get('_value_', 'pending')
                
                # Remove computed fields that shouldn't be passed to __init__
                followup_data.pop('is_overdue', None)
                
                followup = Followup(**followup_data)
                self.followups[followup.id] = followup
                loaded_count += 1
            except Exception as e:
                print(f"⚠️ Warning: Could not load followup {followup_data.get('id')}: {e}")
                print(f"   Data keys: {list(followup_data.keys())}")
        print(f"✅ Loaded {loaded_count} followups")
        
        # Load templates
        template_count = 0
        for template_data in data.get('templates', []):
            try:
                template = FollowupTemplate(**template_data)
                self.templates[template.id] = template
                template_count += 1
            except Exception as e:
                print(f"⚠️ Warning: Could not load template {template_data.get('id')}: {e}")
        print(f"✅ Loaded {template_count} templates")
        
        # Load reminders
        reminder_count = 0
        for reminder_data in data.get('reminders', []):
            try:
                reminder = Reminder(**reminder_data)
                self.reminders[reminder.id] = reminder
                reminder_count += 1
            except Exception as e:
                print(f"⚠️ Warning: Could not load reminder {reminder_data.get('id')}: {e}")
        print(f"✅ Loaded {reminder_count} reminders")
    
    def _get_data(self) -> dict:
        """Get data as dictionary for JSON serialization"""
        return {
            'followups': [f.to_dict() if hasattr(f, 'to_dict') else f.__dict__ 
                         for f in self.followups.values() if not f.deleted_at],
            'templates': [t.to_dict() if hasattr(t, 'to_dict') else t.__dict__ 
                         for t in self.templates.values() if not t.deleted_at],
            'reminders': [r.to_dict() if hasattr(r, 'to_dict') else r.__dict__ 
                         for r in self.reminders.values() if not r.deleted_at]
        }
