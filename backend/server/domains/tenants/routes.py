"""
Tenants Domain - Route handlers
Company/tenant management with subscriptions and usage tracking
"""
from fastapi import APIRouter, HTTPException, Request
from typing import Optional, List
from pydantic import BaseModel

from server.domains.tenants.services import CompanyService
from server.domains.tenants.repositories import CompanyRepository
from server.domains.tenants.subscription_service import SubscriptionService, SubscriptionPlan
from server.domains.tenants.usage_tracking_service import UsageTrackingService
from server.domains.tenants.api_key_service import APIKeyManagementService, APIKeyScope

# Initialize services
company_service = CompanyService(CompanyRepository())
subscription_service = SubscriptionService()
usage_service = UsageTrackingService()
api_key_service = APIKeyManagementService()

# Request models
class UpdateCompanyRequest(BaseModel):
    name: Optional[str] = None
    industry: Optional[str] = None
    website: Optional[str] = None
    description: Optional[str] = None
    logo_url: Optional[str] = None
    subscription_plan: Optional[str] = None

# Create router
router = APIRouter(prefix="/companies", tags=["tenants"])


@router.post("")
def create_company(name: str, slug: str, owner_id: str, industry: str = None):
    """Create a new company"""
    try:
        company = company_service.create_company(
            name=name,
            slug=slug,
            owner_id=owner_id,
            industry=industry
        )
        return {"status": "success", "data": company.to_dict()}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{company_id}")
def get_company(company_id: str):
    """Get company by ID"""
    company = company_service.get_company(company_id)
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    return {"status": "success", "data": company.to_dict()}


@router.get("")
def list_companies(page: int = 1, limit: int = 10, sort: str = "created_at", order: str = "desc", search: str = None):
    """List all companies with pagination, filtering, and sorting"""
    try:
        result = company_service.list_companies_filtered(
            page=page,
            limit=limit,
            sort=sort,
            order=order,
            search=search
        )
        return {
            "status": "success",
            **result
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/{company_id}")
def update_company(company_id: str, request: UpdateCompanyRequest):
    """Update company details"""
    try:
        company = company_service.get_company(company_id)
        if not company:
            raise HTTPException(status_code=404, detail="Company not found")
        
        kwargs = {}
        if request.name:
            kwargs['name'] = request.name
        if request.industry:
            kwargs['industry'] = request.industry
        if request.website:
            kwargs['website'] = request.website
        if request.description:
            kwargs['description'] = request.description
        if request.logo_url:
            kwargs['logo_url'] = request.logo_url
        if request.subscription_plan:
            kwargs['subscription_plan'] = request.subscription_plan
        
        updated = company_service.update_company(company_id, **kwargs)
        return {"status": "success", "data": updated.to_dict()}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{company_id}")
def delete_company(company_id: str):
    """Delete company (admin company cannot be deleted)"""
    try:
        # Check if trying to delete admin company
        if company_service.is_admin_company(company_id):
            raise HTTPException(
                status_code=403, 
                detail="Admin company cannot be deleted"
            )
        
        result = company_service.delete_company(company_id)
        if not result:
            raise HTTPException(status_code=404, detail="Company not found")
        return {"status": "success", "message": "Company deleted"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ========== SUBSCRIPTION MANAGEMENT ==========

@router.post("/{company_id}/subscription")
def create_subscription(company_id: str, plan: str, annual_billing: bool = False):
    """Create or update company subscription"""
    try:
        # Validate plan
        try:
            plan_enum = SubscriptionPlan(plan)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid plan: {plan}")
        
        subscription = subscription_service.create_subscription(
            company_id=company_id,
            plan=plan_enum,
            annual_billing=annual_billing
        )
        return {"status": "success", "data": subscription}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{company_id}/subscription")
def get_subscription(company_id: str):
    """Get company subscription details"""
    subscription = subscription_service.get_subscription(company_id)
    if not subscription:
        raise HTTPException(status_code=404, detail="No subscription found")
    return {"status": "success", "data": subscription}


@router.put("/{company_id}/subscription/upgrade")
def upgrade_subscription(company_id: str, new_plan: str):
    """Upgrade company plan"""
    try:
        try:
            plan_enum = SubscriptionPlan(new_plan)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid plan: {new_plan}")
        
        subscription = subscription_service.upgrade_plan(company_id, plan_enum)
        return {"status": "success", "data": subscription}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{company_id}/subscription/cancel")
def cancel_subscription(company_id: str):
    """Cancel company subscription"""
    try:
        result = subscription_service.cancel_subscription(company_id)
        if not result:
            raise HTTPException(status_code=404, detail="No subscription found")
        return {"status": "success", "message": "Subscription cancelled"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{company_id}/subscription/features")
def check_features(company_id: str):
    """Get available features for company plan"""
    subscription = subscription_service.get_subscription(company_id)
    if not subscription:
        raise HTTPException(status_code=404, detail="No subscription found")
    
    plan = SubscriptionPlan(subscription["plan"])
    limits = subscription_service.PlanLimits.get_limits(plan)
    
    return {"status": "success", "data": limits}


# ========== COMPANY SETTINGS ==========

@router.get("/{company_id}/settings")
def get_settings(company_id: str):
    """Get company settings"""
    try:
        settings = company_service.get_company_settings(company_id)
        if not settings:
            raise HTTPException(status_code=404, detail="Settings not found")
        return {"status": "success", "data": settings.to_dict()}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/{company_id}/settings")
def update_settings(company_id: str, 
                   allow_team_creation: bool = None,
                   allow_user_invitation: bool = None,
                   require_email_verification: bool = None,
                   two_factor_authentication: bool = None,
                   session_timeout_minutes: int = None):
    """Update company settings"""
    try:
        kwargs = {}
        if allow_team_creation is not None:
            kwargs['allow_team_creation'] = allow_team_creation
        if allow_user_invitation is not None:
            kwargs['allow_user_invitation'] = allow_user_invitation
        if require_email_verification is not None:
            kwargs['require_email_verification'] = require_email_verification
        if two_factor_authentication is not None:
            kwargs['two_factor_authentication'] = two_factor_authentication
        if session_timeout_minutes is not None:
            if session_timeout_minutes < 5:
                raise ValueError("Session timeout must be at least 5 minutes")
            kwargs['session_timeout_minutes'] = session_timeout_minutes
        
        settings = company_service.update_company_settings(company_id, **kwargs)
        return {"status": "success", "data": settings.to_dict()}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ========== USAGE TRACKING ==========

@router.get("/{company_id}/usage")
def get_usage(company_id: str):
    """Get current resource usage for company"""
    usage = usage_service.get_usage(company_id)
    return {"status": "success", "data": usage}


@router.get("/{company_id}/usage/summary")
def get_usage_summary(company_id: str):
    """Get comprehensive usage summary"""
    summary = usage_service.get_usage_summary(company_id)
    return {"status": "success", "data": summary}


@router.get("/{company_id}/usage/quotas")
def get_quotas(company_id: str):
    """Get quota limits and remaining quotas"""
    try:
        subscription = subscription_service.get_subscription(company_id)
        if not subscription:
            raise HTTPException(status_code=404, detail="No subscription found")
        
        plan = SubscriptionPlan(subscription["plan"])
        limits = subscription_service.PlanLimits.get_limits(plan)
        usage = usage_service.get_usage(company_id)
        
        quotas = {}
        for resource in ["leads", "users", "teams", "forms"]:
            limit = limits.get(f"max_{resource}s")
            current = usage.get(resource, 0)
            quotas[resource] = {
                "limit": limit,
                "current": current,
                "remaining": None if limit is None else max(0, limit - current),
                "percentage_used": None if limit is None else round((current / limit * 100), 2)
            }
        
        return {"status": "success", "data": quotas}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ========== API KEY MANAGEMENT ==========

@router.post("/{company_id}/api-keys")
def create_api_key(company_id: str,
                   name: str,
                   scopes: List[str],
                   created_by: str,
                   expires_in_days: int = None):
    """Create new API key for integrations"""
    try:
        # Validate scopes
        valid_scopes = [s.value for s in APIKeyScope]
        for scope in scopes:
            if scope not in valid_scopes:
                raise ValueError(f"Invalid scope: {scope}")
        
        key_data = api_key_service.create_api_key(
            company_id=company_id,
            name=name,
            scopes=scopes,
            created_by=created_by,
            expires_in_days=expires_in_days
        )
        return {"status": "success", "data": key_data}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{company_id}/api-keys")
def list_api_keys(company_id: str):
    """List all API keys for company"""
    try:
        keys = api_key_service.list_company_keys(company_id)
        return {"status": "success", "data": keys}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{company_id}/api-keys/{key_id}")
def get_api_key(company_id: str, key_id: str):
    """Get API key details"""
    try:
        key = api_key_service.get_api_key(key_id)
        if not key or key.company_id != company_id:
            raise HTTPException(status_code=404, detail="API key not found")
        return {"status": "success", "data": key.to_dict()}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{company_id}/api-keys/{key_id}/revoke")
def revoke_api_key(company_id: str, key_id: str):
    """Revoke/disable API key"""
    try:
        key = api_key_service.get_api_key(key_id)
        if not key or key.company_id != company_id:
            raise HTTPException(status_code=404, detail="API key not found")
        
        api_key_service.revoke_key(key_id)
        return {"status": "success", "message": "API key revoked"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

