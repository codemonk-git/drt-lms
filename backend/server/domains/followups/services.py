"""
Followup services with templates, reminders, and scheduling
"""
from typing import List, Optional
from datetime import datetime, timedelta
import uuid
from .models import Followup, FollowupTemplate, Reminder, FollowupStatus, ReminderStatus
from .repositories import FollowupRepository


class FollowupService:
    """Service for managing followups with scheduling and templates"""
    
    def __init__(self, followup_repo: FollowupRepository = None):
        self.followup_repo = followup_repo or FollowupRepository()
    
    # ===== FOLLOWUP SCHEDULING =====
    
    def schedule_followup(self, company_id: str, lead_id: str, assigned_to_user_id: str,
                         followup_type: str, scheduled_for: datetime, title: str = None,
                         notes: str = None, template_id: str = None, stage_id: str = None) -> Followup:
        """Schedule a new followup"""
        followup = Followup(
            company_id=company_id,
            lead_id=lead_id,
            assigned_to_user_id=assigned_to_user_id,
            followup_type=followup_type,
            scheduled_for=scheduled_for,
            title=title,
            notes=notes,
            template_id=template_id,
            stage_id=stage_id
        )
        saved_followup = self.followup_repo.save(followup)
        
        # Log activity for followup
        try:
            from server.domains.activities.services import ActivityService
            from server.domains.activities.models import ActivityType
            activity_service = ActivityService()
            activity_service.log_activity(
                company_id=company_id,
                user_id=assigned_to_user_id,
                activity_type=ActivityType.FOLLOWUP_SCHEDULED,
                entity_type='lead',
                entity_id=lead_id,
                description=f'Followup scheduled: {title or followup_type}',
                metadata={'followup_id': saved_followup.id, 'followup_type': followup_type, 'scheduled_for': str(scheduled_for)}
            )
        except Exception as e:
            print(f"Failed to log followup activity: {e}")
        
        return saved_followup
    
    def schedule_from_template(self, company_id: str, lead_id: str, assigned_to_user_id: str,
                              template_id: str, delay_hours: int = None, stage_id: str = None) -> Followup:
        """Schedule a followup using a template"""
        template = self.followup_repo.get_template(template_id)
        if not template:
            raise ValueError(f"Template {template_id} not found")
        
        delay = delay_hours if delay_hours is not None else template.suggested_delay_hours
        scheduled_for = datetime.utcnow() + timedelta(hours=delay)
        
        return self.schedule_followup(
            company_id=company_id,
            lead_id=lead_id,
            assigned_to_user_id=assigned_to_user_id,
            followup_type=template.followup_type,
            scheduled_for=scheduled_for,
            title=template.name,
            notes=template.template_text,
            template_id=template_id,
            stage_id=stage_id
        )
    
    # ===== FOLLOWUP COMPLETION =====
    
    def complete_followup(self, followup_id: str, completion_notes: str = None,
                         outcome: str = None, next_action: str = None) -> Optional[Followup]:
        """Mark followup as completed"""
        followup = self.followup_repo.get_by_id(followup_id)
        if followup:
            followup.mark_completed(completion_notes, outcome, next_action)
            self.followup_repo.save(followup)
        return followup
    
    def cancel_followup(self, followup_id: str) -> Optional[Followup]:
        """Cancel a followup"""
        followup = self.followup_repo.get_by_id(followup_id)
        if followup:
            followup.status = FollowupStatus.CANCELLED
            self.followup_repo.save(followup)
        return followup
    
    def delete_followup(self, followup_id: str) -> bool:
        """Delete a followup permanently"""
        return self.followup_repo.delete(followup_id)
    
    def reschedule_followup(self, followup_id: str, new_scheduled_for: datetime) -> Optional[Followup]:
        """Reschedule a followup to a new date/time"""
        followup = self.followup_repo.get_by_id(followup_id)
        if followup:
            followup.scheduled_for = new_scheduled_for
            followup.status = FollowupStatus.RESCHEDULED
            self.followup_repo.save(followup)
        return followup
    
    # ===== FOLLOWUP QUERIES =====
    
    def get_followup(self, followup_id: str) -> Optional[Followup]:
        """Get followup by ID"""
        return self.followup_repo.get_by_id(followup_id)
    
    def get_pending_for_lead(self, lead_id: str) -> List[Followup]:
        """Get pending followups for lead"""
        return self.followup_repo.get_pending_for_lead(lead_id)
    
    def get_next_pending_followup(self, lead_id: str) -> Optional[Followup]:
        """Get the next (earliest) pending followup for a lead"""
        pending = self.get_pending_for_lead(lead_id)
        if not pending:
            return None
        # Sort by scheduled_for and return the first one
        pending.sort(key=lambda f: f.scheduled_for)
        return pending[0]
    
    def get_all_for_lead(self, lead_id: str) -> List[Followup]:
        """Get all followups for lead regardless of status"""
        return self.followup_repo.get_all_for_lead(lead_id)
    
    def get_user_followups(self, user_id: str) -> List[Followup]:
        """Get followups assigned to user"""
        return self.followup_repo.get_assigned_to_user(user_id)
    
    def get_company_followups(self, company_id: str) -> List[Followup]:
        """Get all followups for company"""
        return self.followup_repo.get_by_company(company_id)
    
    def get_overdue_followups(self, company_id: str) -> List[Followup]:
        """Get overdue followups"""
        return self.followup_repo.get_overdue(company_id)
    
    def get_upcoming_followups(self, company_id: str, days: int = 7) -> List[Followup]:
        """Get upcoming followups in next N days"""
        return self.followup_repo.get_upcoming(company_id, days)
    
    def get_user_upcoming(self, user_id: str, company_id: str, days: int = 7) -> List[Followup]:
        """Get user's upcoming followups"""
        all_upcoming = self.get_upcoming_followups(company_id, days)
        return [f for f in all_upcoming if f.assigned_to_user_id == user_id]
    
    def get_stage_followups(self, stage_id: str) -> List[Followup]:
        """Get followups for a stage"""
        return self.followup_repo.get_by_stage(stage_id)
    
    def get_pending_soon(self, user_id: str, minutes: int = 30) -> List[Followup]:
        """Get pending followups for a user scheduled within next N minutes"""
        return self.followup_repo.get_pending_soon(user_id, minutes)
    
    # ===== TEMPLATE MANAGEMENT =====
    
    def create_template(self, company_id: str, name: str, description: str,
                       followup_type: str, template_text: str, suggested_delay_hours: int = 24,
                       priority: str = 'medium') -> FollowupTemplate:
        """Create a followup template"""
        template = FollowupTemplate(
            company_id=company_id,
            name=name,
            description=description,
            followup_type=followup_type,
            template_text=template_text,
            suggested_delay_hours=suggested_delay_hours,
            priority=priority
        )
        return self.followup_repo.save_template(template)
    
    def get_template(self, template_id: str) -> Optional[FollowupTemplate]:
        """Get template by ID"""
        return self.followup_repo.get_template(template_id)
    
    def get_company_templates(self, company_id: str) -> List[FollowupTemplate]:
        """Get all templates for company"""
        return self.followup_repo.get_templates_by_company(company_id)
    
    def get_templates_by_type(self, company_id: str, followup_type: str) -> List[FollowupTemplate]:
        """Get templates by type"""
        return self.followup_repo.get_templates_by_type(company_id, followup_type)
    
    def update_template(self, template_id: str, **kwargs) -> Optional[FollowupTemplate]:
        """Update a template"""
        template = self.followup_repo.get_template(template_id)
        if template:
            for key, value in kwargs.items():
                if hasattr(template, key):
                    setattr(template, key, value)
            self.followup_repo.save_template(template)
        return template
    
    def delete_template(self, template_id: str) -> bool:
        """Delete a template"""
        return self.followup_repo.delete_template(template_id)
    
    # ===== REMINDER MANAGEMENT =====
    
    def add_reminder(self, followup_id: str, company_id: str, assigned_to_user_id: str,
                    remind_at: datetime, reminder_type: str = 'in_app') -> Reminder:
        """Add a reminder for a followup"""
        reminder = Reminder(
            followup_id=followup_id,
            company_id=company_id,
            assigned_to_user_id=assigned_to_user_id,
            remind_at=remind_at,
            reminder_type=reminder_type
        )
        return self.followup_repo.save_reminder(reminder)
    
    def auto_schedule_reminder(self, followup_id: str, company_id: str, assigned_to_user_id: str,
                              minutes_before: int = 15) -> Reminder:
        """Auto-schedule a reminder before followup"""
        followup = self.followup_repo.get_by_id(followup_id)
        if not followup:
            raise ValueError(f"Followup {followup_id} not found")
        
        remind_at = followup.scheduled_for - timedelta(minutes=minutes_before)
        return self.add_reminder(followup_id, company_id, assigned_to_user_id, remind_at)
    
    def get_pending_reminders(self, company_id: str) -> List[Reminder]:
        """Get pending reminders for company"""
        return self.followup_repo.get_pending_reminders(company_id)
    
    def get_user_pending_reminders(self, user_id: str) -> List[Reminder]:
        """Get pending reminders for user"""
        return self.followup_repo.get_user_pending_reminders(user_id)
    
    def mark_reminder_sent(self, reminder_id: str) -> Optional[Reminder]:
        """Mark reminder as sent"""
        reminder = self.followup_repo.get_reminder(reminder_id)
        if reminder:
            reminder.mark_sent()
            self.followup_repo.save_reminder(reminder)
        return reminder
    
    # ===== ANALYTICS =====
    
    def get_followup_analytics(self, company_id: str) -> dict:
        """Get followup analytics for company"""
        followups = self.followup_repo.get_by_company(company_id)
        
        pending = [f for f in followups if f.status == FollowupStatus.PENDING]
        completed = [f for f in followups if f.status == FollowupStatus.COMPLETED]
        overdue = [f for f in followups if f.is_overdue()]
        
        # Calculate average response time
        response_times = [f.response_time_minutes for f in completed if f.response_time_minutes]
        avg_response_time = sum(response_times) / len(response_times) if response_times else 0
        
        # Count by type
        by_type = {}
        for f in followups:
            if f.status != FollowupStatus.CANCELLED:
                by_type[f.followup_type] = by_type.get(f.followup_type, 0) + 1
        
        # Count by outcome
        by_outcome = {}
        for f in completed:
            if f.outcome:
                by_outcome[f.outcome] = by_outcome.get(f.outcome, 0) + 1
        
        return {
            'total': len(followups),
            'pending': len(pending),
            'completed': len(completed),
            'overdue': len(overdue),
            'completion_rate': len(completed) / len(followups) if followups else 0,
            'avg_response_time_minutes': avg_response_time,
            'by_type': by_type,
            'by_outcome': by_outcome,
        }
    
    def get_user_analytics(self, user_id: str, company_id: str) -> dict:
        """Get analytics for a specific user"""
        user_followups = self.followup_repo.get_assigned_to_user(user_id)
        
        pending = [f for f in user_followups if f.status == FollowupStatus.PENDING]
        completed = [f for f in user_followups if f.status == FollowupStatus.COMPLETED]
        overdue = [f for f in user_followups if f.is_overdue()]
        
        response_times = [f.response_time_minutes for f in completed if f.response_time_minutes]
        avg_response_time = sum(response_times) / len(response_times) if response_times else 0
        
        return {
            'total': len(user_followups),
            'pending': len(pending),
            'completed': len(completed),
            'overdue': len(overdue),
            'completion_rate': len(completed) / len(user_followups) if user_followups else 0,
            'avg_response_time_minutes': avg_response_time,
        }
    
    def get_lead_followup_history(self, lead_id: str) -> dict:
        """Get complete followup history for a lead"""
        all_followups = self.followup_repo.get_by_company("")  # Would need company_id in real use
        lead_followups = [f for f in all_followups if f.lead_id == lead_id]
        
        return {
            'total': len(lead_followups),
            'completed': len([f for f in lead_followups if f.status == FollowupStatus.COMPLETED]),
            'pending': len([f for f in lead_followups if f.status == FollowupStatus.PENDING]),
            'followups': lead_followups,
        }
