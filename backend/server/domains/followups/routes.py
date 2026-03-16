"""
Followup API routes with templates, reminders, and scheduling
"""
from fastapi import APIRouter, HTTPException, Query, Request
from typing import Optional
from datetime import datetime, timezone
from pydantic import BaseModel
from server.domains.followups.services import FollowupService
from server.domains.followups.repositories import FollowupRepository
from server.domains.leads.services import LeadService
from server.domains.leads.repositories import LeadRepository
from server.domains.users.services import UserService
from server.domains.users.repositories import UserRepository

# Import push notification scheduler and FCM service
from server.domains.push_notifications.routes import scheduler, _send_push
from server.services.fcm_service import FCMService

router = APIRouter(prefix="/followups", tags=["followups"])
followup_service = FollowupService(FollowupRepository())
leads_service = LeadService(LeadRepository())
user_service = UserService(UserRepository())
fcm_service = FCMService()


# ===== REQUEST MODELS =====

class ScheduleFollowupRequest(BaseModel):
    """Request to schedule a followup"""
    lead_id: str
    assigned_to_user_id: str
    followup_type: str  # call, email, meeting, sms, task
    scheduled_for: str  # ISO datetime
    title: str = None
    notes: str = None
    stage_id: str = None


class ScheduleFromTemplateRequest(BaseModel):
    """Request to schedule from template"""
    lead_id: str
    assigned_to_user_id: str
    template_id: str
    delay_hours: int = None
    stage_id: str = None


class CompleteFollowupRequest(BaseModel):
    """Request to complete a followup"""
    completion_notes: str = None
    outcome: str = None  # positive, neutral, negative, undecided
    next_action: str = None


class RescheduleFollowupRequest(BaseModel):
    """Request to reschedule a followup"""
    new_scheduled_for: str  # ISO datetime


class CreateTemplateRequest(BaseModel):
    """Request to create a template"""
    name: str
    description: str
    followup_type: str
    template_text: str
    suggested_delay_hours: int = 24
    priority: str = "medium"  # low, medium, high


class UpdateTemplateRequest(BaseModel):
    """Request to update a template"""
    name: str = None
    description: str = None
    template_text: str = None
    suggested_delay_hours: int = None
    is_active: bool = None
    priority: str = None


class AddReminderRequest(BaseModel):
    """Request to add a reminder"""
    remind_at: str  # ISO datetime
    reminder_type: str = "in_app"  # in_app, email, sms


# ===== FOLLOWUP MANAGEMENT (6 endpoints) =====

@router.post("/schedule")
def schedule_followup(request_obj: Request, request: ScheduleFollowupRequest, company_id: Optional[str] = None):
    """Schedule a new followup for a lead"""
    try:
        # Get company_id from request context if not provided
        if not company_id:
            company_id = getattr(request_obj.state, 'company_id', None) if request_obj else None
        
        if not company_id:
            raise HTTPException(status_code=400, detail="company_id is required")
        
        scheduled_for = datetime.fromisoformat(request.scheduled_for)
        followup = followup_service.schedule_followup(
            company_id=company_id,
            lead_id=request.lead_id,
            assigned_to_user_id=request.assigned_to_user_id,
            followup_type=request.followup_type,
            scheduled_for=scheduled_for,
            title=request.title,
            notes=request.notes,
            stage_id=request.stage_id
        )
        
        # Verify followup was persisted
        print(f"✅ Followup created: {followup.id}")
        print(f"   Lead ID: {followup.lead_id}")
        print(f"   Status: {followup.status}")
        print(f"   Scheduled for: {followup.scheduled_for}")
        
        # Schedule FCM notification for this followup
        try:
            print(f"📱 Starting FCM notification scheduling for followup {followup.id}")
            
            # Get user's FCM token
            user = user_service.get_user(request.assigned_to_user_id)
            print(f"🔍 Fetched user: {user}")
            print(f"🔍 User ID: {request.assigned_to_user_id}")
            
            if not user:
                print(f"⚠️ User not found: {request.assigned_to_user_id}")
            elif not hasattr(user, 'fcm_token'):
                print(f"⚠️ User has no fcm_token attribute")
            elif not user.fcm_token:
                print(f"⚠️ No FCM token for user {request.assigned_to_user_id}, skipping notification")
            else:
                print(f"✅ User has FCM token: {user.fcm_token[:50]}...")
                
                lead = leads_service.get_lead(request.lead_id)
                lead_name = lead.name if lead else "Lead"
                print(f"✅ Lead: {lead_name}")
                
                # Make sure scheduled_for is timezone-aware (UTC)
                if scheduled_for.tzinfo is None:
                    scheduled_for_utc = scheduled_for.replace(tzinfo=timezone.utc)
                else:
                    scheduled_for_utc = scheduled_for.astimezone(timezone.utc)
                
                print(f"✅ Scheduled time (UTC): {scheduled_for_utc}")
                
                # Create notification text
                followup_type_display = request.followup_type.capitalize()
                title = f"{followup_type_display} Reminder"
                body = f"Time to follow up with {lead_name}"
                if request.notes:
                    if len(request.notes) > 50:
                        body += f": {request.notes[:50]}..."
                    else:
                        body += f": {request.notes}"

                job_id = f"fcm_followup_{followup.id}"
                print(f"✅ Job ID: {job_id}")
                print(f"✅ Scheduler running: {scheduler.running}")
                print(f"✅ Scheduler job stores: {list(scheduler._jobstores.keys())}")
                
                # Schedule the FCM notification job
                job = scheduler.add_job(
                    FCMService.send_notification,
                    trigger="date",
                    run_date=scheduled_for_utc,
                    args=[user.fcm_token, title, body],
                    kwargs={"payload": {
                        "followup_id": followup.id, 
                        "lead_id": request.lead_id,
                        "lead_name": lead_name
                    }},
                    id=job_id,
                    misfire_grace_time=300,
                    replace_existing=True,
                )
                print(f"✅ Job added: {job}")
                print(f"📱 FCM notification scheduled for {lead_name} at {scheduled_for_utc}")
        except Exception as notif_error:
            print(f"❌ Failed to schedule FCM notification: {notif_error}")
            import traceback
            traceback.print_exc()
            # Don't fail the followup creation if notification scheduling fails
        
        return {"status": "success", "data": followup.to_dict()}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/schedule-from-template")
def schedule_from_template(request_obj: Request, request: ScheduleFromTemplateRequest, company_id: Optional[str] = None):
    """Schedule a followup from a template"""
    try:
        # Get company_id from request context if not provided
        if not company_id:
            company_id = getattr(request_obj.state, 'company_id', None) if request_obj else None
        
        if not company_id:
            raise HTTPException(status_code=400, detail="company_id is required")
        
        followup = followup_service.schedule_from_template(
            company_id=company_id,
            lead_id=request.lead_id,
            assigned_to_user_id=request.assigned_to_user_id,
            template_id=request.template_id,
            delay_hours=request.delay_hours,
            stage_id=request.stage_id
        )
        
        # Schedule FCM notification for this followup
        try:
            print(f"📱 Starting FCM notification scheduling (template) for followup {followup.id}")
            
            # Get user's FCM token
            user = user_service.get_user(request.assigned_to_user_id)
            print(f"🔍 Fetched user: {user}")
            
            if not user:
                print(f"⚠️ User not found: {request.assigned_to_user_id}")
            elif not hasattr(user, 'fcm_token'):
                print(f"⚠️ User has no fcm_token attribute")
            elif not user.fcm_token:
                print(f"⚠️ No FCM token for user {request.assigned_to_user_id}, skipping notification")
            else:
                print(f"✅ User has FCM token: {user.fcm_token[:50]}...")
                
                lead = leads_service.get_lead(request.lead_id)
                lead_name = lead.name if lead else "Lead"
                print(f"✅ Lead: {lead_name}")
                
                # Make sure scheduled_for is timezone-aware (UTC)
                scheduled_for_dt = followup.scheduled_for
                if isinstance(scheduled_for_dt, str):
                    scheduled_for_dt = datetime.fromisoformat(scheduled_for_dt.replace('Z', '+00:00'))
                
                if scheduled_for_dt.tzinfo is None:
                    scheduled_for_utc = scheduled_for_dt.replace(tzinfo=timezone.utc)
                else:
                    scheduled_for_utc = scheduled_for_dt.astimezone(timezone.utc)
                
                print(f"✅ Scheduled time (UTC): {scheduled_for_utc}")
                
                # Create notification text
                followup_type_display = followup.followup_type.capitalize()
                title = f"{followup_type_display} Reminder"
                body = f"Time to follow up with {lead_name}"
                if followup.notes:
                    if len(followup.notes) > 50:
                        body += f": {followup.notes[:50]}..."
                    else:
                        body += f": {followup.notes}"
                
                job_id = f"fcm_followup_{followup.id}"
                print(f"✅ Job ID: {job_id}")
                print(f"✅ Scheduler running: {scheduler.running}")
                print(f"✅ Scheduler job stores: {list(scheduler._jobstores.keys())}")
                
                # Schedule the FCM notification job
                job = scheduler.add_job(
                    FCMService.send_notification,
                    trigger="date",
                    run_date=scheduled_for_utc,
                    args=[user.fcm_token, title, body],
                    kwargs={"payload": {
                        "followup_id": followup.id, 
                        "lead_id": request.lead_id,
                        "lead_name": lead_name
                    }},
                    id=job_id,
                    misfire_grace_time=300,
                    replace_existing=True,
                )
                print(f"✅ Job added: {job}")
                print(f"📱 FCM notification scheduled for {lead_name} (from template) at {scheduled_for_utc}")
        except Exception as notif_error:
            print(f"❌ Failed to schedule FCM notification: {notif_error}")
            import traceback
            traceback.print_exc()
            # Don't fail the followup creation if notification scheduling fails
        
        return {"status": "success", "data": followup.to_dict()}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{followup_id}/complete")
def complete_followup(followup_id: str, request: CompleteFollowupRequest):
    """Mark a followup as completed"""
    try:
        followup = followup_service.complete_followup(
            followup_id=followup_id,
            completion_notes=request.completion_notes,
            outcome=request.outcome,
            next_action=request.next_action
        )
        if not followup:
            raise HTTPException(status_code=404, detail="Followup not found")
        return {"status": "success", "data": followup.to_dict()}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{followup_id}/cancel")
def cancel_followup(followup_id: str):
    """Cancel a followup"""
    try:
        followup = followup_service.cancel_followup(followup_id)
        if not followup:
            raise HTTPException(status_code=404, detail="Followup not found")
        return {"status": "success", "data": followup.to_dict()}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{followup_id}/reschedule")
def reschedule_followup(followup_id: str, request: RescheduleFollowupRequest):
    """Reschedule a followup to a new time"""
    try:
        new_scheduled_for = datetime.fromisoformat(request.new_scheduled_for)
        followup = followup_service.reschedule_followup(followup_id, new_scheduled_for)
        if not followup:
            raise HTTPException(status_code=404, detail="Followup not found")
        
        # Reschedule push notification
        try:
            # Make sure new_scheduled_for is timezone-aware (UTC)
            if new_scheduled_for.tzinfo is None:
                new_scheduled_for_utc = new_scheduled_for.replace(tzinfo=timezone.utc)
            else:
                new_scheduled_for_utc = new_scheduled_for.astimezone(timezone.utc)
            
            # Get lead and assigned user info
            lead = leads_service.get_lead(followup.lead_id)
            lead_name = lead.name if lead else "Lead"
            
            # Cancel old job and schedule new one
            job_id = f"followup_{followup_id}"
            if scheduler.get_job(job_id):
                scheduler.remove_job(job_id)
            
            followup_type_display = followup.followup_type.capitalize()
            title = f"{followup_type_display} Reminder"
            body = f"Time to follow up with {lead_name}"
            if followup.notes:
                if len(followup.notes) > 50:
                    body += f": {followup.notes[:50]}..."
                else:
                    body += f": {followup.notes}"
            
            scheduler.add_job(
                _send_push,
                trigger="date",
                run_date=new_scheduled_for_utc,
                args=[followup.assigned_to_user_id, followup_id, title, body],
                id=job_id,
                misfire_grace_time=300,
                replace_existing=True,
            )
            print(f"📣 Push notification rescheduled for {lead_name} at {new_scheduled_for_utc}")
        except Exception as notif_error:
            print(f"⚠️ Failed to reschedule push notification: {notif_error}")
        
        return {"status": "success", "data": followup.to_dict()}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{followup_id}")
def delete_followup(followup_id: str):
    """Delete a followup permanently"""
    try:
        # Verify followup exists first
        followup = followup_service.get_followup(followup_id)
        if not followup:
            raise HTTPException(status_code=404, detail="Followup not found")
        
        # Cancel push notification if scheduled
        try:
            job_id = f"followup_{followup_id}"
            if scheduler.get_job(job_id):
                scheduler.remove_job(job_id)
                print(f"📣 Cancelled push notification for followup {followup_id}")
        except Exception as notif_error:
            print(f"⚠️ Failed to cancel push notification: {notif_error}")
        
        # Delete the followup
        success = followup_service.delete_followup(followup_id)
        if not success:
            raise HTTPException(status_code=400, detail="Failed to delete followup")
        return {"status": "success", "message": "Followup deleted"}
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=f"Delete error: {str(e)}")


@router.get("/{followup_id}")
def get_followup(followup_id: str):
    """Get a specific followup"""
    try:
        followup = followup_service.get_followup(followup_id)
        if not followup:
            raise HTTPException(status_code=404, detail="Followup not found")
        return {"status": "success", "data": followup.to_dict()}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ===== FOLLOWUP QUERIES (8 endpoints) =====

@router.get("/lead/{lead_id}/pending")
def get_lead_pending_followups(lead_id: str):
    """Get pending followups for a lead"""
    try:
        followups = followup_service.get_pending_for_lead(lead_id)
        return {"status": "success", "data": [f.to_dict() for f in followups]}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/user/{user_id}/assigned")
def get_user_followups(user_id: str):
    """Get followups assigned to a user"""
    try:
        followups = followup_service.get_user_followups(user_id)
        return {"status": "success", "data": [f.to_dict() for f in followups]}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/user/{user_id}/pending-soon")
def get_user_pending_soon(user_id: str, minutes: int = Query(30, description="Minutes to look ahead")):
    """Get pending followups for a user scheduled within next N minutes - for polling notifications"""
    try:
        followups = followup_service.get_pending_soon(user_id, minutes)
        
        # Enrich followups with lead name for notifications
        result = []
        for f in followups:
            followup_dict = f.to_dict()
            try:
                lead = leads_service.get_lead(f.lead_id)
                if lead:
                    followup_dict['lead_name'] = lead.name
                else:
                    followup_dict['lead_name'] = 'Unknown Lead'
            except Exception:
                followup_dict['lead_name'] = 'Unknown Lead'
            result.append(followup_dict)
        
        return {"status": "success", "data": result}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/company/{company_id}/all")
def get_company_followups(company_id: str):
    """Get all followups for a company"""
    try:
        followups = followup_service.get_company_followups(company_id)
        return {"status": "success", "data": [f.to_dict() for f in followups]}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/company/{company_id}/overdue")
def get_overdue_followups(company_id: str):
    """Get overdue followups for a company"""
    try:
        followups = followup_service.get_overdue_followups(company_id)
        return {"status": "success", "data": [f.to_dict() for f in followups]}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/company/{company_id}/upcoming")
def get_upcoming_followups(company_id: str, days: int = Query(7, ge=1)):
    """Get upcoming followups in next N days"""
    try:
        followups = followup_service.get_upcoming_followups(company_id, days)
        return {"status": "success", "data": [f.to_dict() for f in followups]}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/user/{user_id}/upcoming")
def get_user_upcoming(user_id: str, company_id: str, days: int = Query(7, ge=1)):
    """Get user's upcoming followups"""
    try:
        followups = followup_service.get_user_upcoming(user_id, company_id, days)
        return {"status": "success", "data": [f.to_dict() for f in followups]}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/stage/{stage_id}/followups")
def get_stage_followups(stage_id: str):
    """Get all followups for a stage"""
    try:
        followups = followup_service.get_stage_followups(stage_id)
        return {"status": "success", "data": [f.to_dict() for f in followups]}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ===== TEMPLATE MANAGEMENT (6 endpoints) =====

@router.post("/templates/create")
def create_template(request_obj: Request, request: CreateTemplateRequest, company_id: Optional[str] = None):
    """Create a followup template"""
    try:
        # Get company_id from request context if not provided
        if not company_id:
            company_id = getattr(request_obj.state, 'company_id', None) if request_obj else None
        
        if not company_id:
            raise HTTPException(status_code=400, detail="company_id is required")
        
        template = followup_service.create_template(
            company_id=company_id,
            name=request.name,
            description=request.description,
            followup_type=request.followup_type,
            template_text=request.template_text,
            suggested_delay_hours=request.suggested_delay_hours,
            priority=request.priority
        )
        return {"status": "success", "data": template.to_dict()}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/templates/{template_id}")
def get_template(template_id: str):
    """Get a specific template"""
    try:
        template = followup_service.get_template(template_id)
        if not template:
            raise HTTPException(status_code=404, detail="Template not found")
        return {"status": "success", "data": template.to_dict()}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/company/{company_id}/templates")
def get_company_templates(company_id: str):
    """Get all templates for a company"""
    try:
        templates = followup_service.get_company_templates(company_id)
        return {"status": "success", "data": [t.to_dict() for t in templates]}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/company/{company_id}/templates/type/{followup_type}")
def get_templates_by_type(company_id: str, followup_type: str):
    """Get templates by type"""
    try:
        templates = followup_service.get_templates_by_type(company_id, followup_type)
        return {"status": "success", "data": [t.to_dict() for t in templates]}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/templates/{template_id}")
def update_template(template_id: str, request: UpdateTemplateRequest):
    """Update a template"""
    try:
        update_data = {k: v for k, v in request.dict().items() if v is not None}
        template = followup_service.update_template(template_id, **update_data)
        if not template:
            raise HTTPException(status_code=404, detail="Template not found")
        return {"status": "success", "data": template.to_dict()}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/templates/{template_id}")
def delete_template(template_id: str):
    """Delete a template"""
    try:
        success = followup_service.delete_template(template_id)
        if not success:
            raise HTTPException(status_code=404, detail="Template not found")
        return {"status": "success", "message": "Template deleted"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ===== REMINDER MANAGEMENT (4 endpoints) =====

@router.post("/{followup_id}/reminders/add")
def add_reminder(followup_id: str, request_obj: Request, request: AddReminderRequest, 
                 company_id: Optional[str] = None, assigned_to_user_id: Optional[str] = None):
    """Add a reminder for a followup"""
    try:
        # Get company_id from request context if not provided
        if not company_id:
            company_id = getattr(request_obj.state, 'company_id', None) if request_obj else None
        
        if not company_id:
            raise HTTPException(status_code=400, detail="company_id is required")
        
        if not assigned_to_user_id:
            raise HTTPException(status_code=400, detail="assigned_to_user_id is required")
        
        remind_at = datetime.fromisoformat(request.remind_at)
        reminder = followup_service.add_reminder(
            followup_id=followup_id,
            company_id=company_id,
            assigned_to_user_id=assigned_to_user_id,
            remind_at=remind_at,
            reminder_type=request.reminder_type
        )
        return {"status": "success", "data": reminder.to_dict()}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{followup_id}/reminders/auto-schedule")
def auto_schedule_reminder(followup_id: str, request_obj: Request, 
                          company_id: Optional[str] = None, assigned_to_user_id: Optional[str] = None,
                          minutes_before: int = Query(15, ge=1)):
    """Auto-schedule a reminder before followup"""
    try:
        # Get company_id from request context if not provided
        if not company_id:
            company_id = getattr(request_obj.state, 'company_id', None) if request_obj else None
        
        if not company_id:
            raise HTTPException(status_code=400, detail="company_id is required")
        
        if not assigned_to_user_id:
            raise HTTPException(status_code=400, detail="assigned_to_user_id is required")
        
        reminder = followup_service.auto_schedule_reminder(
            followup_id=followup_id,
            company_id=company_id,
            assigned_to_user_id=assigned_to_user_id,
            minutes_before=minutes_before
        )
        return {"status": "success", "data": reminder.to_dict()}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/company/{company_id}/reminders/pending")
def get_pending_reminders(company_id: str):
    """Get pending reminders for company"""
    try:
        reminders = followup_service.get_pending_reminders(company_id)
        return {"status": "success", "data": [r.to_dict() for r in reminders]}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/user/{user_id}/reminders/pending")
def get_user_pending_reminders(user_id: str):
    """Get pending reminders for user"""
    try:
        reminders = followup_service.get_user_pending_reminders(user_id)
        return {"status": "success", "data": [r.to_dict() for r in reminders]}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ===== ANALYTICS (3 endpoints) =====

@router.get("/company/{company_id}/analytics")
def get_company_analytics(company_id: str):
    """Get followup analytics for company"""
    try:
        analytics = followup_service.get_followup_analytics(company_id)
        return {"status": "success", "data": analytics}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/user/{user_id}/analytics")
def get_user_analytics(user_id: str, company_id: str):
    """Get analytics for a user"""
    try:
        analytics = followup_service.get_user_analytics(user_id, company_id)
        return {"status": "success", "data": analytics}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/lead/{lead_id}/history")
def get_lead_followup_history(lead_id: str):
    """Get complete followup history for a lead"""
    try:
        history = followup_service.get_lead_followup_history(lead_id)
        return {"status": "success", "data": history}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
