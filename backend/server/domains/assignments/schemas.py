"""
Request and response schemas for the Assignments domain.
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from uuid import UUID


class AssignmentBase(BaseModel):
    """Base schema for assignment data"""
    lead_id: UUID
    user_id: UUID


class AssignmentCreateRequest(AssignmentBase):
    """Schema for creating an assignment"""
    reason: Optional[str] = None


class AssignmentResponse(BaseModel):
    """Schema for assignment API response"""
    id: UUID
    lead_id: UUID
    user_id: UUID
    assigned_at: datetime
    reassigned_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class AssignmentListResponse(BaseModel):
    """Paginated assignment list response"""
    data: List[AssignmentResponse]
    total: int
