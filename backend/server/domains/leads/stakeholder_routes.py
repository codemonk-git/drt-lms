"""
Stakeholder routes - API endpoints for stakeholder management
"""
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import List, Optional
from .stakeholder_service import StakeholderService
from .stakeholder_model import Stakeholder
from server.domains.leads.repositories import LeadRepository

router = APIRouter(prefix="/stakeholders", tags=["stakeholders"])

# Initialize service and repo
lead_repo = LeadRepository()
stakeholder_repo = None  # Will be created when we set up DB


class AddStakeholderRequest(BaseModel):
    """Add stakeholder to lead"""
    user_id: str
    stage_id: str
    role: str = 'observer'
    notes: Optional[str] = None


class BulkAddStakeholdersRequest(BaseModel):
    """Add multiple stakeholders"""
    user_ids: List[str]
    stage_id: str
    role: str = 'observer'


class RemoveStakeholderRequest(BaseModel):
    """Remove stakeholder from lead"""
    reason: Optional[str] = None


class RecordFormRequest(BaseModel):
    """Record form filled by stakeholder"""
    form_id: str


# Placeholder routes - implement with actual DB
@router.get("/lead/{lead_id}")
def get_stakeholders(lead_id: str):
    """Get all stakeholders for a lead"""
    try:
        # TODO: Implement with real stakeholder repo
        # Return mock data for demo
        from datetime import datetime, timedelta
        mock_stakeholders = [
            {
                "id": "stakeholder_1",
                "lead_id": lead_id,
                "user_id": "user_1",
                "stage_id": "stage_1",
                "role": "owner",
                "joined_at": (datetime.now() - timedelta(days=5)).isoformat(),
                "forms_filled": ["form_1", "form_2"],
                "is_active": True
            },
            {
                "id": "stakeholder_2",
                "lead_id": lead_id,
                "user_id": "user_2",
                "stage_id": "stage_2",
                "role": "quotation_team",
                "joined_at": (datetime.now() - timedelta(days=3)).isoformat(),
                "forms_filled": ["form_3"],
                "is_active": True
            },
            {
                "id": "stakeholder_3",
                "lead_id": lead_id,
                "user_id": "user_3",
                "stage_id": "stage_3",
                "role": "site_engineer",
                "joined_at": (datetime.now() - timedelta(days=1)).isoformat(),
                "forms_filled": [],
                "is_active": True
            }
        ]
        return {
            "status": "success",
            "data": mock_stakeholders
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/lead/{lead_id}")
def add_stakeholder(lead_id: str, req: AddStakeholderRequest):
    """Add stakeholder to lead"""
    try:
        # TODO: Implement with real stakeholder repo
        return {
            "status": "success",
            "data": {
                "id": "temp_id",
                "lead_id": lead_id,
                "user_id": req.user_id,
                "stage_id": req.stage_id,
                "role": req.role,
                "joined_at": None,
                "forms_filled": [],
                "is_active": True
            }
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/lead/{lead_id}/bulk")
def bulk_add_stakeholders(lead_id: str, req: BulkAddStakeholdersRequest):
    """Add multiple stakeholders to lead"""
    try:
        # TODO: Implement with real stakeholder repo
        stakeholders = []
        for user_id in req.user_ids:
            stakeholders.append({
                "id": "temp_id",
                "lead_id": lead_id,
                "user_id": user_id,
                "stage_id": req.stage_id,
                "role": req.role,
                "joined_at": None,
                "forms_filled": [],
                "is_active": True
            })
        return {
            "status": "success",
            "data": stakeholders
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{stakeholder_id}")
def remove_stakeholder(stakeholder_id: str, req: RemoveStakeholderRequest):
    """Remove stakeholder from lead"""
    try:
        # TODO: Implement with real stakeholder repo
        return {
            "status": "success",
            "message": "Stakeholder removed"
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{stakeholder_id}/form")
def record_form_filled(stakeholder_id: str, req: RecordFormRequest):
    """Record that stakeholder filled a form"""
    try:
        # TODO: Implement with real stakeholder repo
        return {
            "status": "success",
            "data": {
                "id": stakeholder_id,
                "forms_filled": [req.form_id]
            }
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/lead/{lead_id}/user/{user_id}/role")
def get_stakeholder_role(lead_id: str, user_id: str):
    """Get stakeholder's role for a lead"""
    try:
        # TODO: Implement with real stakeholder repo
        return {
            "status": "success",
            "data": {
                "role": "observer"
            }
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
