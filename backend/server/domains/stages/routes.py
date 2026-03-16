from fastapi import APIRouter, HTTPException, Query, Depends
from pydantic import BaseModel
from typing import Optional, List
from server.domains.stages.services import StageWorkflowService
from server.domains.stages.repositories import StageRepository
from server.dependencies import get_company_id

router = APIRouter(prefix="/stages", tags=["stages"])
workflow_service = StageWorkflowService(StageRepository())


# Request Models
class CreateStageRequest(BaseModel):
    name: str
    description: Optional[str] = None
    order: int = 0
    color: str = "#000000"
    is_default: bool = False
    is_final: bool = False
    # Matrix Model - Team-based assignment
    responsible_team_id: Optional[str] = None
    responsible_user_ids: Optional[List[str]] = None


class AssignMemberRequest(BaseModel):
    team_id: str
    user_id: Optional[str] = None
    role: Optional[str] = None


class AddFormToStageRequest(BaseModel):
    form_id: str
    order: int = 0
    is_required: bool = False


class MoveLeadToStageRequest(BaseModel):
    lead_id: str
    stage_id: str
    assigned_user_id: Optional[str] = None
    reason: Optional[str] = None
    notes: Optional[str] = None


class MarkFormCompleteRequest(BaseModel):
    form_id: str


# ===== Stage Definition Management =====

@router.post("")
def create_stage(request: CreateStageRequest, company_id: Optional[str] = Query(None), x_company_id: str = Depends(get_company_id)):
    """Create pipeline stage - company_id from query param or header"""
    # Use query param if provided, otherwise use header
    final_company_id = company_id or x_company_id
    try:
        stage = workflow_service.create_stage(
            company_id=final_company_id,
            name=request.name,
            order=request.order,
            description=request.description,
            color=request.color,
            is_default=request.is_default,
            is_final=request.is_final,
            responsible_team_id=request.responsible_team_id,
            responsible_user_ids=request.responsible_user_ids or []
        )
        return {
            "status": "success",
            "data": stage.to_dict() if hasattr(stage, 'to_dict') else stage.__dict__
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("")
def list_company_stages(company_id: str = Depends(get_company_id)):
    """Get all stages for company in pipeline order"""
    try:
        stages = workflow_service.list_company_stages(company_id)
        return {
            "status": "success",
            "data": [s.to_dict() if hasattr(s, 'to_dict') else s.__dict__ for s in stages]
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{stage_id}")
def get_stage(stage_id: str):
    """Get stage details"""
    try:
        stage = workflow_service.get_stage(stage_id)
        if not stage:
            raise HTTPException(status_code=404, detail="Stage not found")
        return {
            "status": "success",
            "data": stage.to_dict() if hasattr(stage, 'to_dict') else stage.__dict__
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/{stage_id}")
def update_stage(stage_id: str, request: CreateStageRequest):
    """Update stage"""
    try:
        stage = workflow_service.get_stage(stage_id)
        if not stage:
            raise HTTPException(status_code=404, detail="Stage not found")
        
        # Update using service
        updated_stage = workflow_service.update_stage(
            stage_id,
            name=request.name,
            description=request.description,
            order=request.order,
            color=request.color,
            is_default=request.is_default,
            is_final=request.is_final,
            responsible_team_id=request.responsible_team_id,
            responsible_user_ids=request.responsible_user_ids or []
        )
        
        return {
            "status": "success",
            "data": updated_stage.to_dict() if hasattr(updated_stage, 'to_dict') else updated_stage.__dict__
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{stage_id}")
def delete_stage(stage_id: str):
    """Delete stage"""
    try:
        result = workflow_service.delete_stage(stage_id)
        return {
            "status": "success",
            "data": {"deleted": True, "stage_id": stage_id}
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ===== Stage Assignments =====

@router.post("/{stage_id}/assignments")
def assign_member_to_stage(stage_id: str, company_id: str, request: AssignMemberRequest):
    """Assign team member to stage"""
    try:
        assignment = workflow_service.assign_member_to_stage(
            company_id=company_id,
            stage_id=stage_id,
            team_id=request.team_id,
            user_id=request.user_id,
            role=request.role
        )
        return {
            "status": "success",
            "data": assignment.to_dict() if hasattr(assignment, 'to_dict') else assignment.__dict__
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{stage_id}/assignments")
def get_stage_assignments(stage_id: str):
    """Get all members assigned to stage"""
    try:
        assignments = workflow_service.get_stage_assignments(stage_id)
        return {
            "status": "success",
            "data": [a.to_dict() if hasattr(a, 'to_dict') else a.__dict__ for a in assignments]
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{stage_id}/assignments/{assignment_id}")
def remove_member_from_stage(stage_id: str, assignment_id: str):
    """Remove member assignment from stage"""
    try:
        result = workflow_service.remove_member_from_stage(assignment_id)
        return {
            "status": "success",
            "data": result
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ===== Stage Forms =====

@router.post("/{stage_id}/forms")
def add_form_to_stage(stage_id: str, request: AddFormToStageRequest, company_id: Optional[str] = Query(None), x_company_id: str = Depends(get_company_id)):
    """Assign form to stage - company_id from query param or header"""
    # Use query param if provided, otherwise use header
    final_company_id = company_id or x_company_id
    try:
        stage_form = workflow_service.add_form_to_stage(
            company_id=final_company_id,
            stage_id=stage_id,
            form_id=request.form_id,
            order=request.order,
            is_required=request.is_required
        )
        return {
            "status": "success",
            "data": stage_form.to_dict() if hasattr(stage_form, 'to_dict') else stage_form.__dict__
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{stage_id}/forms")
def get_stage_forms(stage_id: str):
    """Get all forms for stage"""
    try:
        forms = workflow_service.get_stage_forms(stage_id)
        return {
            "status": "success",
            "data": [f.to_dict() if hasattr(f, 'to_dict') else f.__dict__ for f in forms]
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{stage_id}/forms/required")
def get_required_forms(stage_id: str):
    """Get only required forms for stage"""
    try:
        forms = workflow_service.get_required_forms(stage_id)
        return {
            "status": "success",
            "data": [f.to_dict() if hasattr(f, 'to_dict') else f.__dict__ for f in forms]
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{stage_id}/forms/{form_id}")
def remove_form_from_stage(stage_id: str, form_id: str):
    """Remove form from stage (can be form_id or assignment_id)"""
    try:
        # Try removing by assignment_id first (uniquely identifies the assignment)
        # If that fails, try removing by form_id (old behavior)
        result = workflow_service.remove_form_assignment(form_id)
        if not result.get("deleted"):
            result = workflow_service.remove_form_from_stage(form_id)
        return {
            "status": "success",
            "data": result
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{stage_id}/form-assignments/{assignment_id}")
def remove_form_assignment(stage_id: str, assignment_id: str):
    """Remove form assignment by assignment ID (uniquely identifies which assignment to delete)"""
    try:
        result = workflow_service.remove_form_assignment(assignment_id)
        return {
            "status": "success",
            "data": result
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ===== Lead Stage Management =====

@router.post("/lead/move")
def move_lead_to_stage(company_id: str, user_id: str, request: MoveLeadToStageRequest):
    """Move lead to new stage"""
    try:
        stage_lead = workflow_service.move_lead_to_stage(
            company_id=company_id,
            lead_id=request.lead_id,
            stage_id=request.stage_id,
            assigned_user_id=request.assigned_user_id or user_id,
            changed_by_user_id=user_id,
            reason=request.reason,
            notes=request.notes
        )
        return {
            "status": "success",
            "data": stage_lead.to_dict() if hasattr(stage_lead, 'to_dict') else stage_lead.__dict__
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/lead/{lead_id}/current")
def get_lead_current_stage(lead_id: str):
    """Get lead's current stage with forms and assignments"""
    try:
        stage_info = workflow_service.get_lead_current_stage(lead_id)
        if not stage_info:
            raise HTTPException(status_code=404, detail="Lead not in any stage")
        return {
            "status": "success",
            "data": stage_info
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/lead/{lead_id}/forms/mark-complete")
def mark_form_completed(lead_id: str, request: MarkFormCompleteRequest):
    """Mark form completed for lead"""
    try:
        stage_lead = workflow_service.mark_form_completed(lead_id, request.form_id)
        if not stage_lead:
            raise HTTPException(status_code=404, detail="Lead not found")
        return {
            "status": "success",
            "data": stage_lead.to_dict() if hasattr(stage_lead, 'to_dict') else stage_lead.__dict__
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/lead/{lead_id}/workflow")
def get_lead_workflow(lead_id: str):
    """Get complete workflow history for lead"""
    try:
        workflow = workflow_service.get_lead_workflow(lead_id)
        return {
            "status": "success",
            "data": workflow
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/lead/{lead_id}/next-steps")
def get_next_steps(lead_id: str):
    """Get what's required to progress to next stage"""
    try:
        next_steps = workflow_service.get_next_steps(lead_id)
        if not next_steps:
            raise HTTPException(status_code=404, detail="Lead not found")
        return {
            "status": "success",
            "data": next_steps
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ===== User Access Control =====

@router.get("/user/{user_id}/assigned-stages")
def get_member_assigned_stages(user_id: str):
    """Get all stages where member is assigned"""
    try:
        stages = workflow_service.get_member_stages(user_id)
        return {
            "status": "success",
            "data": stages
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/user/{user_id}/accessible-forms")
def get_user_accessible_forms(user_id: str, lead_id: str):
    """Get forms user can access for lead (based on assigned stages)"""
    try:
        forms = workflow_service.get_user_accessible_forms(user_id, lead_id)
        return {
            "status": "success",
            "data": forms
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ===== Analytics & Metrics =====

@router.get("/company/{company_id}/analytics")
def get_pipeline_analytics(company_id: str):
    """Get pipeline analytics and metrics"""
    try:
        analytics = workflow_service.get_pipeline_analytics(company_id)
        return {
            "status": "success",
            "data": analytics
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
