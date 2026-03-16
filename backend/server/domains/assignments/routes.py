from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from server.domains.assignments.services import AssignmentService
from server.domains.assignments.repositories import AssignmentRepository
from server.domains.assignments.assignment_view_service import AssignmentViewService
from server.domains.assignments.models import AssignmentStatus, AssignmentPriority

router = APIRouter(prefix="/assignments", tags=["assignments"])
assignment_service = AssignmentService(AssignmentRepository())
assignment_view_service = AssignmentViewService()


# Request models
class CreateAssignmentRequest(BaseModel):
    team_id: str
    assignment_type: str
    entity_id: str
    assigned_to_user_id: str
    assigned_by_user_id: str
    priority: str = "medium"
    due_date: str = None
    notes: str = None


class UpdateStatusRequest(BaseModel):
    status: str


class ReassignRequest(BaseModel):
    new_user_id: str
    reassigned_by_user_id: str
    notes: str = None


# Assignment CRUD endpoints
@router.post("")
def create_assignment(company_id: str, request: CreateAssignmentRequest):
    """Create new assignment"""
    try:
        assignment = assignment_service.assign(
            company_id=company_id,
            team_id=request.team_id,
            assignment_type=request.assignment_type,
            entity_id=request.entity_id,
            assigned_to_user_id=request.assigned_to_user_id,
            assigned_by_user_id=request.assigned_by_user_id,
            priority=request.priority,
            due_date=request.due_date,
            notes=request.notes
        )
        return {
            "status": "success",
            "data": assignment.to_dict() if hasattr(assignment, 'to_dict') else assignment
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{assignment_id}")
def get_assignment(assignment_id: str):
    """Get assignment by ID"""
    try:
        assignment = assignment_service.get_assignment(assignment_id)
        if not assignment:
            raise HTTPException(status_code=404, detail="Assignment not found")
        return {
            "status": "success",
            "data": assignment.to_dict() if hasattr(assignment, 'to_dict') else assignment
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/{assignment_id}/status")
def update_assignment_status(assignment_id: str, request: UpdateStatusRequest):
    """Update assignment status"""
    try:
        assignment = assignment_service.update_status(assignment_id, request.status)
        if not assignment:
            raise HTTPException(status_code=404, detail="Assignment not found")
        return {
            "status": "success",
            "data": assignment.to_dict() if hasattr(assignment, 'to_dict') else assignment
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{assignment_id}/reassign")
def reassign_assignment(assignment_id: str, request: ReassignRequest):
    """Reassign to different user"""
    try:
        assignment = assignment_service.reassign(
            assignment_id=assignment_id,
            new_user_id=request.new_user_id,
            reassigned_by_user_id=request.reassigned_by_user_id,
            notes=request.notes
        )
        if not assignment:
            raise HTTPException(status_code=404, detail="Assignment not found")
        return {
            "status": "success",
            "data": assignment.to_dict() if hasattr(assignment, 'to_dict') else assignment
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{assignment_id}")
def unassign(assignment_id: str):
    """Unassign entity"""
    try:
        success = assignment_service.unassign(assignment_id)
        if not success:
            raise HTTPException(status_code=404, detail="Assignment not found")
        return {"status": "success", "message": "Assignment deleted"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# User and Team endpoints
@router.get("/user/{user_id}/assignments")
def get_user_assignments(user_id: str, assignment_type: str = None, status: str = None):
    """Get assignments for user"""
    try:
        assignments = assignment_service.get_user_assignments(user_id, assignment_type, status)
        return {
            "status": "success",
            "data": [a.to_dict() if hasattr(a, 'to_dict') else a for a in assignments]
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/user/{user_id}/workload")
def get_user_workload(user_id: str):
    """Get user's current workload and capacity"""
    try:
        workload = assignment_service.get_user_workload(user_id)
        return {"status": "success", "data": workload}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/team/{team_id}/workload")
def get_team_workload(team_id: str):
    """Get team's workload distribution"""
    try:
        workload = assignment_service.get_team_workload(team_id)
        return {"status": "success", "data": workload}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# Analytics endpoints
@router.get("/company/{company_id}/performance")
def get_company_performance(company_id: str, team_id: str = None):
    """Get company assignment performance statistics"""
    try:
        stats = assignment_service.get_performance_stats(company_id, team_id)
        return {"status": "success", "data": stats}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/entity/{entity_id}/assignments")
def get_entity_assignments(entity_id: str, assignment_type: str):
    """Get all assignments for specific entity"""
    try:
        assignments = assignment_service.get_entity_assignments(assignment_type, entity_id)
        return {
            "status": "success",
            "data": [a.to_dict() if hasattr(a, 'to_dict') else a for a in assignments]
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# Work Queue / View endpoints
@router.get("/user/{user_id}/workqueue")
def get_user_workqueue(user_id: str, status: str = None):
    """Get user's complete work queue (all assigned items grouped by type)"""
    try:
        workqueue = assignment_view_service.get_user_workqueue(user_id, status)
        return {"status": "success", "data": workqueue}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/user/{user_id}/leads")
def get_user_assigned_leads(user_id: str, status: str = None):
    """Get all assigned leads for user"""
    try:
        leads = assignment_view_service.get_user_leads(user_id, status)
        return {
            "status": "success",
            "data": leads
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/user/{user_id}/followups")
def get_user_assigned_followups(user_id: str, status: str = None):
    """Get all assigned followups for user"""
    try:
        followups = assignment_view_service.get_user_followups(user_id, status)
        return {
            "status": "success",
            "data": followups
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/user/{user_id}/pending")
def get_user_pending_items(user_id: str):
    """Get all pending items (not completed)"""
    try:
        items = assignment_view_service.get_user_pending_items(user_id)
        return {
            "status": "success",
            "data": items
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/user/{user_id}/overdue")
def get_user_overdue_items(user_id: str):
    """Get all overdue items"""
    try:
        items = assignment_view_service.get_user_overdue_items(user_id)
        return {
            "status": "success",
            "data": items
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/user/{user_id}/due-soon")
def get_user_due_soon(user_id: str, days: int = 3):
    """Get items due within N days"""
    try:
        items = assignment_view_service.get_user_due_soon(user_id, days)
        return {
            "status": "success",
            "data": items
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/user/{user_id}/priority")
def get_user_high_priority(user_id: str):
    """Get high and urgent priority items"""
    try:
        items = assignment_view_service.get_user_high_priority(user_id)
        return {
            "status": "success",
            "data": items
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
