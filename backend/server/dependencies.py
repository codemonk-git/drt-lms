"""
FastAPI dependency injection functions for common request parameters.
"""
from fastapi import Header, HTTPException
from typing import Optional


async def get_company_id(x_company_id: str = Header(...)) -> str:
    """
    Extract company_id from X-Company-ID header.
    Required for all multi-tenant endpoints.
    """
    if not x_company_id:
        raise HTTPException(status_code=400, detail="X-Company-ID header is required")
    return x_company_id


async def get_user_id(x_user_id: str = Header(...)) -> str:
    """
    Extract user_id from X-User-ID header.
    """
    if not x_user_id:
        raise HTTPException(status_code=400, detail="X-User-ID header is required")
    return x_user_id


async def get_optional_company_id(x_company_id: Optional[str] = Header(None)) -> Optional[str]:
    """
    Extract optional company_id from X-Company-ID header.
    """
    return x_company_id
