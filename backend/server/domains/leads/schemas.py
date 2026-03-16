"""
Request and response schemas for the Leads domain.
"""
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime
from uuid import UUID


class LeadBase(BaseModel):
    """Base schema for lead data"""
    name: str = Field(..., min_length=1, max_length=255)
    email: EmailStr
    phone: Optional[str] = Field(None, max_length=20)
    source_id: Optional[UUID] = None
    stage_id: Optional[UUID] = None
    score: int = Field(0, ge=0, le=100)


class LeadCreateRequest(LeadBase):
    """Schema for creating a new lead"""
    company_id: UUID


class LeadUpdateRequest(BaseModel):
    """Schema for updating a lead"""
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    stage_id: Optional[UUID] = None
    score: Optional[int] = None


class LeadResponse(LeadBase):
    """Schema for lead API response"""
    id: UUID
    company_id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class LeadListResponse(BaseModel):
    """Paginated lead list response"""
    data: List[LeadResponse]
    total: int
    limit: int
    offset: int
