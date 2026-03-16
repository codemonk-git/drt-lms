from fastapi import APIRouter, HTTPException, Query, Request, Depends
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime

from server.domains.leads.services import LeadService, LeadAssignmentService
from server.domains.leads.repositories import LeadRepository, LeadAssignmentRepository
from server.domains.leads.lead_scoring_service import LeadScoringService
from server.domains.leads.lead_assignment_service import AssignmentRuleService
from server.domains.leads.lead_deduplication_service import LeadDeduplicationService
from server.domains.activities.services import ActivityService
from server.domains.activities.repositories import ActivityRepository
from server.domains.stages.services import StageWorkflowService
from server.domains.stages.repositories import StageRepository
from server.integrations.lead_ingestion import LeadIngestionService
from server.dependencies import get_company_id

router = APIRouter(prefix="/leads", tags=["leads"])

# Initialize services
lead_service = LeadService(LeadRepository())
lead_assignment_service = LeadAssignmentService(LeadAssignmentRepository())
activity_service = ActivityService(ActivityRepository())
stage_service = StageWorkflowService(StageRepository())
ingestion_service = LeadIngestionService(LeadRepository())
scoring_service = LeadScoringService()
assignment_rule_service = AssignmentRuleService()
deduplication_service = LeadDeduplicationService()

# Request models
class CreateLeadRequest(BaseModel):
    company_id: str
    name: str
    phone: str
    email: Optional[str] = None
    source: Optional[str] = None
    # Contact extra
    title: Optional[str] = None
    # Company
    company: Optional[str] = None
    website: Optional[str] = None
    location: Optional[str] = None
    # Lead info
    project: Optional[str] = None
    campaign_name: Optional[str] = None
    description: Optional[str] = None
    stage_id: Optional[str] = None
    # Custom fields
    custom_fields: Optional[Dict[str, Any]] = None
    # Assignment
    assigned_to_user_id: Optional[str] = None
    # Creator tracking
    created_by_user_id: Optional[str] = None

class UpdateLeadRequest(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    source: Optional[str] = None
    stage: Optional[str] = None
    stage_id: Optional[str] = None  # UUID reference to StageDefinition
    status: Optional[str] = None
    call_status: Optional[str] = None
    deal_value: Optional[float] = None
    assigned_team_members: Optional[List[str]] = None  # List of user IDs assigned at stage transition
    assigned_to_user_id: Optional[str] = None  # Individual user assignment
    assigned_at: Optional[str] = None  # Assignment timestamp
    assigned_by: Optional[str] = None  # User who made the assignment

class BulkLeadImportRequest(BaseModel):
    company_id: str
    leads_data: List[Dict[str, Any]]

class BulkLeadUpdateRequest(BaseModel):
    lead_ids: List[str]
    stage: Optional[str] = None
    status: Optional[str] = None

class BulkDeleteRequest(BaseModel):
    lead_ids: List[str]

class BatchGetRequest(BaseModel):
    lead_ids: List[str]

# Ingestion Request Models
class SingleLeadIngestionRequest(BaseModel):
    """Single lead ingestion request"""
    source: str
    data: Dict[str, Any]

class BulkLeadIngestionRequest(BaseModel):
    """Bulk lead ingestion request"""
    source: str
    leads: List[Dict[str, Any]]

class WebhookLeadIngestionRequest(BaseModel):
    """Webhook lead ingestion (from third-party services)"""
    source: str
    lead: Dict[str, Any]
    webhook_id: Optional[str] = None

# Matrix Model Request Models
class SetLeadOwnerRequest(BaseModel):
    """Set lead owner (primary account manager)"""
    owner_id: str

class GetOwnershipHistoryRequest(BaseModel):
    """Get lead ownership history"""
    pass

    timestamp: Optional[str] = None

# Lead Scoring Request Models
class SetScoringRulesRequest(BaseModel):
    """Set custom scoring rules for company"""
    rules: Dict[str, Any]

# Assignment Rule Request Models
class CreateAssignmentRuleRequest(BaseModel):
    """Create assignment rule"""
    team_id: str
    rule_type: str
    name: str
    description: Optional[str] = None
    conditions: Dict[str, Any]
    assignment_user_id: Optional[str] = None
    round_robin_users: Optional[List[str]] = None

class UpdateAssignmentRuleRequest(BaseModel):
    """Update assignment rule"""
    name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None
    priority: Optional[int] = None
    conditions: Optional[Dict[str, Any]] = None
    assignment_user_id: Optional[str] = None
    round_robin_users: Optional[List[str]] = None

# Deduplication Request Models
class MergeLeadsRequest(BaseModel):
    """Merge two leads"""
    surviving_lead_id: str
    merged_lead_id: str
    field_priorities: Optional[Dict[str, str]] = None

# Endpoints
@router.post("")
def create_lead(req: CreateLeadRequest):
    try:
        # Resolve stage name from stage_id if provided
        resolved_stage = None
        resolved_stage_id = req.stage_id
        if req.stage_id:
            stage_obj = stage_service.get_stage(req.stage_id)
            if stage_obj:
                resolved_stage = stage_obj.name

        lead = lead_service.create_lead(
            company_id=req.company_id,
            name=req.name,
            email=req.email,
            phone=req.phone,
            source=req.source,
            title=req.title,
            company=req.company,
            website=req.website,
            location=req.location,
            project=req.project,
            campaign_name=req.campaign_name,
            description=req.description,
            stage=resolved_stage,
            stage_id=resolved_stage_id,
            custom_fields=req.custom_fields or {},
            assigned_to_user_id=req.assigned_to_user_id,
            created_by_user_id=req.created_by_user_id,
        )
        lead_dict = lead.to_dict() if hasattr(lead, 'to_dict') else lead.__dict__
        return {"status": "success", "data": lead_dict}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/{lead_id}")
def get_lead(lead_id: str):
    try:
        lead = lead_service.get_lead(lead_id)
        if not lead:
            raise HTTPException(status_code=404, detail="Lead not found")
        
        # next_followup is already included in the lead object
        lead_dict = lead.to_dict() if hasattr(lead, 'to_dict') else lead.__dict__
        
        return {"status": "success", "data": lead_dict}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("")
def list_leads(skip: int = Query(0), limit: int = Query(50), company_id: str = Depends(get_company_id), assigned_to_user_id: Optional[str] = None):
    try:
        leads = lead_service.list_leads(skip=skip, limit=limit, company_id=company_id)
        
        # Filter by assigned user if provided
        if assigned_to_user_id:
            # Include leads where user is either:
            # 1. The direct assignee (assigned_to_user_id), OR
            # 2. In the team members list for current stage (assigned_team_members)
            leads = [
                lead for lead in leads 
                if lead.assigned_to_user_id == assigned_to_user_id or 
                (hasattr(lead, 'assigned_team_members') and 
                 lead.assigned_team_members and 
                 assigned_to_user_id in lead.assigned_team_members)
            ]
        
        # next_followup is already included in each lead object
        leads_data = [lead.to_dict() if hasattr(lead, 'to_dict') else lead.__dict__ for lead in leads]
        
        return {"status": "success", "data": leads_data, "pagination": {"skip": skip, "limit": limit}}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/{lead_id}")
def update_lead(lead_id: str, req: UpdateLeadRequest):
    try:
        update_data = req.dict(exclude_unset=True)
        print(f"[DEBUG] update_lead called with lead_id={lead_id}, update_data={update_data}")
        
        # Extract assigned_team_members if provided (for logging)
        assigned_team_members = update_data.pop('assigned_team_members', None)
        
        # Map 'status' to 'stage' if status is provided
        if 'status' in update_data:
            update_data['stage'] = update_data.pop('status')
        
        # Handle stage_id parameter (frontend sends UUID)
        if 'stage_id' in update_data and update_data['stage_id']:
            stage_uuid = update_data.pop('stage_id')  # Remove from update_data to avoid confusion
            print(f"[DEBUG] Received stage_id={stage_uuid}")
            
            # Look up the stage name from UUID
            stage_obj = stage_service.get_stage(stage_uuid)
            if stage_obj:
                print(f"[DEBUG] Found stage: {stage_obj.name}")
                update_data['stage'] = stage_obj.name
                update_data['stage_id'] = stage_uuid  # Store the UUID reference
            else:
                raise ValueError(f"Stage {stage_uuid} not found")
        
        # If stage is provided and looks like a UUID, map it to stage name
        if 'stage' in update_data and update_data['stage']:
            stage_value = update_data['stage']
            print(f"[DEBUG] stage_value={stage_value}, len={len(stage_value)}, dashes={stage_value.count('-')}")
            # Check if it's a UUID (stage ID)
            if len(stage_value) == 36 and stage_value.count('-') == 4:
                # It's a stage ID, look up the stage name
                print(f"[DEBUG] Detected UUID, looking up stage name...")
                stage_obj = stage_service.get_stage(stage_value)
                print(f"[DEBUG] stage_obj={stage_obj}")
                if stage_obj:
                    print(f"[DEBUG] Found stage: {stage_obj.name}")
                    update_data['stage'] = stage_obj.name
                    update_data['stage_id'] = stage_value  # Store the UUID reference
                else:
                    raise ValueError(f"Stage {stage_value} not found")
        
        # Put assigned_team_members back in update_data
        if assigned_team_members:
            update_data['assigned_team_members'] = assigned_team_members
        
        print(f"[DEBUG] Final update_data={update_data}")
        lead = lead_service.update_lead(lead_id, **update_data)
        
        # Log team member assignments
        if assigned_team_members:
            try:
                from server.domains.activities.services import ActivityService
                from server.domains.activities.models import ActivityType
                from server.domains.users.repositories import UserRepository
                
                activity_service = ActivityService()
                user_repo = UserRepository()
                
                for user_id in assigned_team_members:
                    # Get user name for better description
                    user_name = 'Unknown'
                    try:
                        user = user_repo.get(user_id)
                        if user:
                            first_name = getattr(user, 'first_name', None) or ''
                            last_name = getattr(user, 'last_name', None) or ''
                            user_name = f"{first_name} {last_name}".strip()
                            if not user_name:
                                user_name = getattr(user, 'email', user_id) or user_id
                    except:
                        user_name = f'User {user_id[-8:] if len(user_id) > 8 else user_id}'
                    
                    print(f"[STAGE_CHANGE_TEAM] Logging team member assignment: Assigned to {user_name}")
                    activity_service.log_activity(
                        company_id=lead.company_id,
                        user_id="system",
                        activity_type=ActivityType.LEAD_ASSIGNED,
                        entity_type='lead',
                        entity_id=lead_id,
                        description=f'Assigned team member: {user_name}',
                        metadata={'assignment_type': 'team_member', 'user_id': user_id}
                    )
            except Exception as e:
                print(f"[STAGE_CHANGE_TEAM] Failed to log team member assignments: {e}")
                import traceback
                traceback.print_exc()
        
        return {"status": "success", "data": lead}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.patch("/{lead_id}/stage")
async def update_lead_stage(lead_id: str, request: Request):
    """Update only the stage of a lead"""
    try:
        data = await request.json()
        stage = data.get("stage")
        
        if not stage:
            raise ValueError("stage is required")
        
        # If stage is a UUID, look up the stage name
        if len(str(stage)) == 36 and str(stage).count('-') == 4:
            stage_obj = stage_service.get_stage(stage)
            if stage_obj:
                stage_name = stage_obj.name
                stage_id = str(stage)
            else:
                raise ValueError(f"Stage {stage} not found")
        else:
            stage_name = stage
            stage_id = stage
        
        # Get old stage name before update for activity metadata
        existing_lead = lead_service.get_lead(lead_id)
        old_stage_name = str(existing_lead.stage) if existing_lead else 'Unknown'

        # Get tenant context for activity logging
        tenant_context = getattr(request.state, 'tenant_context', None) if request else None
        user_id = tenant_context.user_id if tenant_context else "system"

        # Update only the stage (update_lead also logs an activity with metadata)
        lead = lead_service.update_lead(
            lead_id,
            stage=stage_name,
            stage_id=stage_id,
            updated_by_user_id=user_id,
        )
        
        return {"status": "success", "data": lead.to_dict() if hasattr(lead, 'to_dict') else lead.__dict__}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.patch("/{lead_id}/call_status")
async def update_lead_call_status(lead_id: str, request: Request):
    """Update only the call status of a lead"""
    try:
        data = await request.json()
        call_status = data.get("call_status")
        description = data.get("description")
        metadata = data.get("metadata", {})
        
        if not call_status:
            raise ValueError("call_status is required")
        
        # Capture old call status before updating
        existing_lead = lead_service.get_lead(lead_id)
        old_call_status = str(getattr(existing_lead, 'call_status', '') or '')
        if hasattr(existing_lead.call_status, 'value'):
            old_call_status = existing_lead.call_status.value

        # Update only the call status
        lead = lead_service.update_lead(lead_id, call_status=call_status)
        
        # Get tenant context from request for activity logging
        tenant_context = getattr(request.state, 'tenant_context', None) if request else None
        company_id = getattr(request.state, 'company_id', None) if request else None
        user_id = tenant_context.user_id if tenant_context else "system"
        
        # Log activity with old/new call status in metadata
        activity_description = description or f"Call status changed to {call_status}"
        full_metadata = {**metadata, 'old_call_status': old_call_status, 'new_call_status': call_status}
        
        activity_service.log_activity(
            company_id=company_id,
            user_id=user_id,
            activity_type="lead_call_status_changed",
            entity_type="lead",
            entity_id=lead_id,
            description=activity_description,
            metadata=full_metadata
        )
        
        return {"status": "success", "data": lead.to_dict() if hasattr(lead, 'to_dict') else lead.__dict__}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/{lead_id}")
def delete_lead(lead_id: str):
    try:
        result = lead_service.delete_lead(lead_id)
        return {"status": "success", "message": "Lead deleted"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ===== FOLLOWUP MANAGEMENT (Integrated into Leads) =====

class ScheduleFollowupRequest(BaseModel):
    """Request to schedule a followup"""
    scheduled_for: str  # ISO datetime
    notes: str = None


@router.post("/{lead_id}/followup")
def schedule_lead_followup(lead_id: str, request: ScheduleFollowupRequest, company_id: str = Depends(get_company_id)):
    """Schedule a followup for a lead"""
    try:
        updated_lead = lead_service.schedule_followup(
            lead_id=lead_id,
            company_id=company_id,
            scheduled_for=request.scheduled_for,
            notes=request.notes
        )
        
        if not updated_lead:
            raise HTTPException(status_code=404, detail="Lead not found")
        
        lead_dict = updated_lead.to_dict() if hasattr(updated_lead, 'to_dict') else updated_lead.__dict__
        return {"status": "success", "data": lead_dict}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/{lead_id}/followup/complete")
async def complete_lead_followup(lead_id: str):
    """Mark followup as completed"""
    try:
        updated_lead = lead_service.complete_followup(lead_id)
        
        if not updated_lead:
            raise HTTPException(status_code=404, detail="Lead or followup not found")
        
        lead_dict = updated_lead.to_dict() if hasattr(updated_lead, 'to_dict') else updated_lead.__dict__
        return {"status": "success", "data": lead_dict}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{lead_id}/followup")
def delete_lead_followup(lead_id: str):
    """Delete/cancel a followup"""
    try:
        updated_lead = lead_service.delete_followup(lead_id)
        
        if not updated_lead:
            raise HTTPException(status_code=404, detail="Lead or followup not found")
        
        lead_dict = updated_lead.to_dict() if hasattr(updated_lead, 'to_dict') else updated_lead.__dict__
        return {"status": "success", "data": lead_dict}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/{lead_id}/assign")
async def assign_lead(lead_id: str, request: Request):
    try:
        data = await request.json()
        user_id = data.get("assigned_to_user_id")
        company_id = data.get("company_id")
        
        if not user_id:
            raise ValueError("assigned_to_user_id is required")
        
        # Get lead
        lead = lead_service.get_lead(lead_id)
        if not lead:
            raise ValueError(f"Lead {lead_id} not found")
        
        company_id = company_id or lead.company_id
        
        # Update lead with new assignment
        updated_lead = lead_service.update_lead(
            lead_id,
            assigned_to_user_id=user_id,
            assigned_at=__import__('datetime').datetime.utcnow()
        )
            
        # Log activity
        from server.domains.activities.models import ActivityType
        
        # Try to get user name for better description
        user_name = 'Unknown'
        if user_id:
            try:
                from server.domains.users.repositories import UserRepository
                
                user_repo = UserRepository()
                user = user_repo.get(user_id)
                print(f"[ASSIGN_LEAD] User lookup result for {user_id}: {user}")
                
                if user:
                    # Try to build full name
                    first_name = getattr(user, 'first_name', None) or ''
                    last_name = getattr(user, 'last_name', None) or ''
                    full_name = f"{first_name} {last_name}".strip()
                    
                    if full_name and full_name != '':
                        user_name = full_name
                    elif hasattr(user, 'email') and user.email:
                        user_name = user.email
                    else:
                        user_name = str(user) if user else 'Unknown'
                else:
                    user_name = f'User {user_id[-8:] if len(user_id) > 8 else user_id}'
            except Exception as lookup_error:
                print(f"[ASSIGN_LEAD] Failed to lookup user {user_id}: {lookup_error}")
                import traceback
                traceback.print_exc()
                user_name = f'User {user_id[-8:] if len(user_id) > 8 else user_id}'
        
        print(f"[ASSIGN_LEAD] Logging activity: Assigned to {user_name}")
        activity_service.log_activity(
            company_id=company_id,
            user_id="system",
            activity_type=ActivityType.LEAD_ASSIGNED,
            entity_type="lead",
            entity_id=lead_id,
            description=f"Assigned to {user_name}"
        )
        
        return {
            "status": "success", 
            "data": updated_lead.to_dict() if hasattr(updated_lead, 'to_dict') else updated_lead.__dict__
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/{lead_id}/history")
def get_lead_history(lead_id: str, skip: int = Query(0), limit: int = Query(20)):
    try:
        activities = activity_service.get_entity_activities("lead", lead_id)
        # Apply pagination
        paginated = activities[skip:skip + limit]
        return {"status": "success", "data": paginated}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/{lead_id}/stage-history")
def get_stage_history(lead_id: str):
    try:
        history = stage_service.get_lead_stage_history(lead_id)
        return {"status": "success", "data": history}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/bulk-import")
def bulk_import_leads(req: BulkLeadImportRequest):
    try:
        batch_id = f"batch_{datetime.now().timestamp()}"
        results = []
        for lead_data in req.leads_data:
            try:
                lead = lead_service.create_lead(company_id=req.company_id, **lead_data)
                results.append({"status": "success", "data": lead})
            except Exception as item_err:
                results.append({"status": "error", "error": str(item_err)})
        return {"status": "success", "batch_id": batch_id, "results": results}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/bulk-update")
def bulk_update_leads(req: BulkLeadUpdateRequest):
    try:
        results = []
        for lead_id in req.lead_ids:
            try:
                updates = req.dict(exclude={"lead_ids"}, exclude_unset=True)
                # Map 'status' to 'stage' if status is provided
                if 'status' in updates:
                    updates['stage'] = updates.pop('status')
                lead = lead_service.update_lead(lead_id, **updates)
                results.append({"lead_id": lead_id, "status": "success", "data": lead})
            except Exception as item_err:
                results.append({"lead_id": lead_id, "status": "error", "error": str(item_err)})
        return {"status": "success", "results": results}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/bulk-delete")
def bulk_delete_leads(req: BulkDeleteRequest):
    try:
        results = []
        for lead_id in req.lead_ids:
            try:
                lead_service.delete_lead(lead_id)
                results.append({"lead_id": lead_id, "status": "success"})
            except Exception as item_err:
                results.append({"lead_id": lead_id, "status": "error", "error": str(item_err)})
        return {"status": "success", "results": results}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/{lead_id}/notes")
def add_lead_note(lead_id: str, note: str = Query(...), request: Request = None):
    try:
        # Get tenant context from request
        tenant_context = getattr(request.state, 'tenant_context', None) if request else None
        company_id = getattr(request.state, 'company_id', None) if request else None
        user_id = tenant_context.user_id if tenant_context else "system"
        
        result = activity_service.log_activity(
            company_id=company_id,
            user_id=user_id,
            activity_type="note_added",
            entity_type="lead",
            entity_id=lead_id,
            description=note
        )
        return {"status": "success", "data": result}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/{lead_id}/notes")
def get_lead_notes(lead_id: str, skip: int = Query(0), limit: int = Query(20)):
    try:
        activities = activity_service.get_entity_activities("lead", lead_id)
        # Filter for note_added activities and apply pagination
        notes = [a for a in activities if getattr(a, 'activity_type', None) == 'note_added']
        paginated = notes[skip:skip + limit]
        return {"status": "success", "data": paginated}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/{lead_id}/notes/{note_id}")
def delete_lead_note(lead_id: str, note_id: str):
    try:
        # Delete the note activity by ID
        activity_service.delete_activity(note_id)
        return {"status": "success", "message": "Note deleted"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/{lead_id}/notes/{note_id}")
def update_lead_note(lead_id: str, note_id: str, note: str = Query(...)):
    try:
        # Update the note activity
        activity = activity_service.activity_repo.get_by_id(note_id)
        if not activity:
            raise HTTPException(status_code=404, detail="Note not found")
        
        activity.description = note
        activity_service.activity_repo.save(activity)
        return {"status": "success", "data": activity}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/{lead_id}/status-change")
def formal_status_change(lead_id: str, new_status: str = Query(...), reason: Optional[str] = Query(None), request: Request = None):
    try:
        # Map 'status' to 'stage' since Lead model uses stage
        lead = lead_service.update_lead(lead_id, **{"stage": new_status})
        
        # Get tenant context from request
        tenant_context = getattr(request.state, 'tenant_context', None) if request else None
        company_id = getattr(request.state, 'company_id', None) if request else None
        user_id = tenant_context.user_id if tenant_context else "system"
        
        activity_service.log_activity(
            company_id=company_id,
            user_id=user_id,
            activity_type="status_changed",
            entity_type="lead",
            entity_id=lead_id,
            description=f"Status changed to {new_status}" + (f": {reason}" if reason else "")
        )
        return {"status": "success", "data": lead}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/pipeline")
def get_sales_pipeline(company_id: Optional[str] = None):
    try:
        pipeline = lead_service.get_pipeline(company_id)
        return {"status": "success", "data": pipeline}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/{lead_id}/score")
def calculate_lead_score(lead_id: str):
    try:
        score = lead_service.calculate_lead_score(lead_id)
        return {"status": "success", "data": {"lead_id": lead_id, "score": score}}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/batch-get")
def batch_get_leads(req: BatchGetRequest):
    try:
        leads = lead_service.get_multiple_leads(req.lead_ids)
        return {"status": "success", "data": leads, "found": len(leads), "requested": len(req.lead_ids)}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/{lead_id}/attachments")
def get_lead_attachments(lead_id: str):
    try:
        attachments = lead_service.get_lead_attachments(lead_id)
        return {"status": "success", "data": attachments}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# ============================================================================
# LEAD INGESTION ENDPOINTS
# ============================================================================

@router.post("/ingestion/single")
def ingest_single_lead(company_id: str, request: SingleLeadIngestionRequest):
    """
    Ingest a single lead from external source
    
    Supports sources: meta, facebook, google_ads, google, website_form, form, or custom
    """
    try:
        lead, status, error = ingestion_service.ingest_lead(
            company_id=company_id,
            source=request.source,
            data=request.data
        )
        
        if status.value == "success":
            return {"status": "success", "data": lead, "ingestion_status": status.value}
        elif status.value == "duplicate":
            return {"status": "duplicate", "data": lead, "ingestion_status": status.value, "message": error}
        else:
            raise HTTPException(status_code=400, detail=f"{status.value}: {error}")
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/ingestion/bulk")
def ingest_bulk_leads(company_id: str, request: BulkLeadIngestionRequest):
    """
    Ingest multiple leads in batch from external source
    
    Returns ingestion summary with success/duplicate/error counts
    """
    try:
        ingested_leads, log = ingestion_service.ingest_bulk(
            company_id=company_id,
            source=request.source,
            leads_data=request.leads
        )
        
        return {
            "status": "success",
            "data": ingested_leads,
            "summary": {
                "total": log.total,
                "successful": log.successful,
                "duplicates": log.duplicates,
                "invalid": log.invalid,
                "errors": log.errors,
                "source": log.source,
                "ingestion_date": log.ingestion_date.isoformat()
            }
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/ingestion/webhook")
def ingest_webhook_lead(company_id: str, request: WebhookLeadIngestionRequest):
    """
    Webhook endpoint for real-time lead ingestion
    
    Used by external services to push leads in real-time
    """
    try:
        lead, status, error = ingestion_service.ingest_lead(
            company_id=company_id,
            source=request.source,
            data=request.lead
        )
        
        if status.value == "success":
            return {
                "status": "success",
                "lead_id": lead.id,
                "ingestion_status": status.value,
                "webhook_id": request.webhook_id,
                "timestamp": request.timestamp or datetime.utcnow().isoformat()
            }
        else:
            return {
                "status": "received",
                "ingestion_status": status.value,
                "error": error,
                "webhook_id": request.webhook_id
            }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/ingestion/logs")
def get_ingestion_logs(company_id: str, limit: int = Query(50)):
    """Get ingestion logs for company"""
    try:
        logs = ingestion_service.get_ingestion_logs(company_id, limit=limit)
        return {
            "status": "success",
            "data": [{
                "source": log.source,
                "total": log.total,
                "successful": log.successful,
                "duplicates": log.duplicates,
                "invalid": log.invalid,
                "errors": log.errors,
                "ingestion_date": log.ingestion_date.isoformat(),
                "details": log.details
            } for log in logs]
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/ingestion/summary")
def get_ingestion_summary(company_id: str):
    """Get overall ingestion summary for company"""
    try:
        summary = ingestion_service.get_ingestion_summary(company_id)
        return {"status": "success", "data": summary}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ============================================================================
# LEAD SCORING ENDPOINTS
# ============================================================================

@router.post("/{lead_id}/score")
def calculate_lead_score(company_id: str, lead_id: str):
    """Calculate/recalculate lead score"""
    try:
        lead = lead_service.get_lead(lead_id)
        if not lead or lead.company_id != company_id:
            raise HTTPException(status_code=404, detail="Lead not found")
        
        score = scoring_service.calculate_score(lead, company_id)
        return {
            "status": "success",
            "data": {
                "lead_id": lead_id,
                "score": score.score,
                "grade": score.grade,
                "factors": score.factors,
                "updated_at": score.updated_at.isoformat()
            }
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/scoring/set-rules")
def set_scoring_rules(company_id: str, request: SetScoringRulesRequest):
    """Set custom scoring rules for company"""
    try:
        scoring_service.set_company_rules(company_id, request.rules)
        return {
            "status": "success",
            "message": "Scoring rules updated",
            "data": request.rules
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/scoring/hot-leads")
def get_hot_leads(company_id: str, threshold: int = Query(80)):
    """Get high-scoring leads (hot leads) above threshold"""
    try:
        all_leads = lead_service.list_company_leads(company_id)
        hot_leads = scoring_service.get_hot_leads(company_id, all_leads, threshold)
        
        return {
            "status": "success",
            "data": [{
                "lead": {
                    "id": lead.id,
                    "first_name": lead.first_name,
                    "email": lead.email,
                    "phone": lead.phone,
                    "source": lead.source.value if hasattr(lead.source, 'value') else str(lead.source)
                },
                "score": score.score,
                "grade": score.grade,
                "factors": score.factors
            } for lead, score in hot_leads]
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/scoring/distribution")
def get_score_distribution(company_id: str):
    """Get distribution of lead scores"""
    try:
        all_leads = lead_service.list_company_leads(company_id)
        distribution = scoring_service.score_distribution(company_id, all_leads)
        
        return {
            "status": "success",
            "data": distribution
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ============================================================================
# ASSIGNMENT RULE ENDPOINTS
# ============================================================================

@router.post("/assignment-rules")
def create_assignment_rule(company_id: str, request: CreateAssignmentRuleRequest):
    """Create lead assignment rule"""
    try:
        rule = assignment_rule_service.create_rule(
            company_id=company_id,
            team_id=request.team_id,
            rule_type=request.rule_type,
            name=request.name,
            description=request.description,
            conditions=request.conditions,
            assignment_user_id=request.assignment_user_id,
            round_robin_users=request.round_robin_users
        )
        
        return {
            "status": "success",
            "data": {
                "id": rule.id,
                "name": rule.name,
                "rule_type": rule.rule_type,
                "team_id": rule.team_id,
                "is_active": rule.is_active,
                "priority": rule.priority,
                "created_at": rule.created_at.isoformat()
            }
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/assignment-rules")
def list_assignment_rules(company_id: str, active_only: bool = Query(True)):
    """List assignment rules for company"""
    try:
        rules = assignment_rule_service.list_company_rules(company_id, active_only=active_only)
        
        return {
            "status": "success",
            "data": [{
                "id": r.id,
                "name": r.name,
                "rule_type": r.rule_type,
                "team_id": r.team_id,
                "is_active": r.is_active,
                "priority": r.priority,
                "assignment_count": r.assignment_count,
                "created_at": r.created_at.isoformat()
            } for r in rules]
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/assignment-rules/{rule_id}")
def get_assignment_rule(company_id: str, rule_id: str):
    """Get assignment rule details"""
    try:
        rule = assignment_rule_service.get_rule(rule_id)
        if not rule or rule.company_id != company_id:
            raise HTTPException(status_code=404, detail="Rule not found")
        
        return {
            "status": "success",
            "data": {
                "id": rule.id,
                "name": rule.name,
                "rule_type": rule.rule_type,
                "team_id": rule.team_id,
                "conditions": rule.conditions,
                "is_active": rule.is_active,
                "priority": rule.priority,
                "assignment_count": rule.assignment_count,
                "created_at": rule.created_at.isoformat()
            }
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/assignment-rules/{rule_id}")
def update_assignment_rule(company_id: str, rule_id: str, request: UpdateAssignmentRuleRequest):
    """Update assignment rule"""
    try:
        rule = assignment_rule_service.get_rule(rule_id)
        if not rule or rule.company_id != company_id:
            raise HTTPException(status_code=404, detail="Rule not found")
        
        updated = assignment_rule_service.update_rule(
            rule_id=rule_id,
            name=request.name,
            description=request.description,
            is_active=request.is_active,
            priority=request.priority,
            conditions=request.conditions,
            assignment_user_id=request.assignment_user_id,
            round_robin_users=request.round_robin_users
        )
        
        return {"status": "success", "data": {
            "id": updated.id,
            "name": updated.name,
            "is_active": updated.is_active
        }}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/assignment-rules/{rule_id}")
def delete_assignment_rule(company_id: str, rule_id: str):
    """Delete assignment rule"""
    try:
        rule = assignment_rule_service.get_rule(rule_id)
        if not rule or rule.company_id != company_id:
            raise HTTPException(status_code=404, detail="Rule not found")
        
        assignment_rule_service.delete_rule(rule_id)
        return {"status": "success", "message": "Rule deleted"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/assignment-rules/{rule_id}/stats")
def get_rule_stats(company_id: str, rule_id: str):
    """Get assignment rule statistics"""
    try:
        rule = assignment_rule_service.get_rule(rule_id)
        if not rule or rule.company_id != company_id:
            raise HTTPException(status_code=404, detail="Rule not found")
        
        stats = assignment_rule_service.get_rule_stats(rule_id)
        return {"status": "success", "data": stats}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/assignment-rules/company/summary")
def get_assignment_summary(company_id: str):
    """Get assignment rules summary for company"""
    try:
        summary = assignment_rule_service.get_company_assignment_summary(company_id)
        return {"status": "success", "data": summary}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ============================================================================
# LEAD DEDUPLICATION ENDPOINTS
# ============================================================================

@router.get("/{lead_id}/duplicates")
def find_lead_duplicates(company_id: str, lead_id: str, threshold: float = Query(0.85)):
    """Find potential duplicate leads"""
    try:
        lead = lead_service.get_lead(lead_id)
        if not lead or lead.company_id != company_id:
            raise HTTPException(status_code=404, detail="Lead not found")
        
        all_leads = lead_service.list_company_leads(company_id)
        matches = deduplication_service.find_duplicates(lead, all_leads, company_id, threshold)
        
        return {
            "status": "success",
            "data": [{
                "match_id": m.id,
                "lead_id": m.lead_id_2,
                "match_type": m.match_type,
                "confidence": m.confidence,
                "is_confirmed": m.is_confirmed
            } for m in matches]
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/duplicates/company")
def get_company_duplicates(company_id: str, unmerged_only: bool = Query(True)):
    """Get all duplicate matches for company"""
    try:
        matches = deduplication_service.get_company_duplicates(company_id, unmerged_only)
        
        return {
            "status": "success",
            "data": [{
                "match_id": m.id,
                "lead_id_1": m.lead_id_1,
                "lead_id_2": m.lead_id_2,
                "match_type": m.match_type,
                "confidence": m.confidence,
                "is_merged": m.is_merged,
                "created_at": m.created_at.isoformat()
            } for m in matches]
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/merge")
def merge_leads(company_id: str, request: MergeLeadsRequest):
    """Merge two leads"""
    try:
        surviving_lead = lead_service.get_lead(request.surviving_lead_id)
        merged_lead = lead_service.get_lead(request.merged_lead_id)
        
        if not surviving_lead or surviving_lead.company_id != company_id:
            raise HTTPException(status_code=404, detail="Surviving lead not found")
        if not merged_lead or merged_lead.company_id != company_id:
            raise HTTPException(status_code=404, detail="Merged lead not found")
        
        result = deduplication_service.merge_leads(surviving_lead, merged_lead, request.field_priorities)
        deduplication_service.log_merge(company_id, result)
        
        # Save updated lead
        lead_service.update_lead(surviving_lead.id, **surviving_lead.__dict__)
        
        return {
            "status": "success",
            "data": {
                "merge_id": result.id,
                "surviving_lead_id": result.surviving_lead_id,
                "merged_lead_id": result.merged_lead_id,
                "field_updates": result.field_updates,
                "merged_at": result.merged_at.isoformat()
            }
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/deduplication/summary")
def get_dedup_summary(company_id: str):
    """Get deduplication summary for company"""
    try:
        summary = deduplication_service.get_dedup_summary(company_id)
        return {"status": "success", "data": summary}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/deduplication/merge-history")
def get_merge_history(company_id: str, limit: int = Query(50)):
    """Get merge history for company"""
    try:
        history = deduplication_service.get_merge_history(company_id, limit)
        
        return {
            "status": "success",
            "data": [{
                "merge_id": m.id,
                "surviving_lead_id": m.surviving_lead_id,
                "merged_lead_id": m.merged_lead_id,
                "field_updates": m.field_updates,
                "merged_at": m.merged_at.isoformat()
            } for m in history]
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# Matrix Model Endpoints - Lead Ownership & Stage Responsibility
@router.post("/{lead_id}/set-owner")
def set_lead_owner(lead_id: str, request: SetLeadOwnerRequest, company_id: str = Query(...)):
    """Set lead owner (primary account manager responsible for lead)"""
    try:
        # Get the lead
        lead = lead_service.repo.get(lead_id)
        if not lead:
            raise HTTPException(status_code=404, detail="Lead not found")
        
        # Update owner
        lead.owner_id = request.owner_id
        lead.owner_changed_at = datetime.utcnow()
        lead_service.repo.update(lead_id, lead)
        
        # Track in activity/history
        activity_service.repo.create({
            'lead_id': lead_id,
            'company_id': company_id,
            'action_type': 'ownership_change',
            'details': f'Lead owner changed to {request.owner_id}',
            'created_by': company_id  # Should be current user in real implementation
        })
        
        return {
            "status": "success",
            "data": lead.to_dict() if hasattr(lead, 'to_dict') else lead.__dict__
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{lead_id}/ownership-history")
def get_lead_ownership_history(lead_id: str):
    """Get complete ownership history for a lead"""
    try:
        # Get all ownership records for this lead
        history = lead_service.repo.get_ownership_history(lead_id)
        
        return {
            "status": "success",
            "data": [h.to_dict() if hasattr(h, 'to_dict') else h.__dict__ for h in history]
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{lead_id}/current-owner")
def get_current_lead_owner(lead_id: str):
    """Get current owner and stage responsibility for lead"""
    try:
        lead = lead_service.repo.get(lead_id)
        if not lead:
            raise HTTPException(status_code=404, detail="Lead not found")
        
        stage = None
        stage_responsibility = None
        
        if lead.stage_id:
            stage = stage_service.repo.get(lead.stage_id)
            if stage:
                stage_responsibility = {
                    "stage_id": stage.id,
                    "stage_name": stage.name,
                    "responsible_role": stage.responsible_role,
                    "responsible_user_ids": getattr(stage, 'responsible_user_ids', [])
                }
        
        return {
            "status": "success",
            "data": {
                "lead_id": lead_id,
                "owner_id": lead.owner_id,
                "current_stage": stage_responsibility,
                "owner_changed_at": str(lead.owner_changed_at) if hasattr(lead, 'owner_changed_at') else None
            }
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/owner/{owner_id}/leads")
def get_leads_for_owner(owner_id: str, company_id: str = Query(...)):
    """Get all leads assigned to an owner"""
    try:
        leads = lead_service.repo.get_leads_by_owner(owner_id, company_id)
        
        return {
            "status": "success",
            "data": [l.to_dict() if hasattr(l, 'to_dict') else l.__dict__ for l in leads]
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
