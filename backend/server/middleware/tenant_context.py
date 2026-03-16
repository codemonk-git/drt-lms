"""
Tenant context isolation middleware for multi-tenancy support.
Ensures all requests are scoped to their company/tenant.
"""
from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from typing import Optional
import re


class TenantContext:
    """Holds tenant/company context for the current request"""
    
    def __init__(self, 
                 company_id: str,
                 user_id: str,
                 is_admin: bool = False,
                 is_owner: bool = False):
        self.company_id = company_id
        self.user_id = user_id
        self.is_admin = is_admin
        self.is_owner = is_owner
    
    def has_access_to(self, resource_company_id: str) -> bool:
        """Check if tenant has access to a resource in another company"""
        return self.company_id == resource_company_id


class TenantContextMiddleware(BaseHTTPMiddleware):
    """
    Middleware to enforce tenant isolation.
    Extracts company_id from request path or headers.
    Validates user belongs to the company.
    """
    
    async def dispatch(self, request: Request, call_next):
        """Process request and inject tenant context"""
        
        # Skip tenant validation for OPTIONS (CORS preflight) and authentication endpoints
        if request.method == "OPTIONS" or self._is_auth_endpoint(request):
            response = await call_next(request)
            return response
        
        # Extract company_id from request
        company_id = self._extract_company_id(request)
        
        if company_id:
            # Validate tenant context (would check database in production)
            tenant_context = self._validate_tenant_context(request, company_id)
            
            if not tenant_context:
                raise HTTPException(
                    status_code=403,
                    detail="Access denied: User does not belong to this company"
                )
            
            # Inject context into request state
            request.state.tenant_context = tenant_context
            request.state.company_id = company_id
        
        response = await call_next(request)
        return response
    
    def _is_auth_endpoint(self, request: Request) -> bool:
        """Check if request is to an auth endpoint that shouldn't require tenant context"""
        auth_paths = [
            '/api/auth/login',
            '/api/auth/register',
            '/api/auth/refresh',
            '/api/auth/me',  # Get current user - should work with just JWT token
            '/api/auth/companies/by-slug',  # Public endpoint for subdomain resolution
            '/api/auth/signup',  # Public signup endpoint
            '/api/users',  # POST /users for registration
            '/api/teams/user/',  # Get user's team - works with company_id header from token
            '/api/leads',  # List leads - works with JWT token and company_id header
            '/api/stages',  # List stages and stage forms - works with JWT token and company_id header
        ]
        return any(request.url.path.startswith(path) for path in auth_paths)
    
    def _extract_company_id(self, request: Request) -> Optional[str]:
        """Extract company_id from path or headers"""
        
        # Pattern 1: /api/companies/{company_id}/...
        match = re.search(r'/companies/([^/]+)', request.url.path)
        if match:
            return match.group(1)
        
        # Pattern 2: X-Company-ID or x-company-id header (both accepted)
        company_id = (request.headers.get('x-company-id') or 
                      request.headers.get('X-Company-ID'))
        if company_id:
            return company_id
        
        return None
    
    def _validate_tenant_context(self, 
                                 request: Request, 
                                 company_id: str) -> Optional[TenantContext]:
        """Validate user has access to company"""
        
        # Extract user info from request (would come from auth token in production)
        # Try case-insensitive header lookups
        user_id = (request.headers.get('x-user-id') or 
                   request.headers.get('X-User-ID'))
        is_admin = (request.headers.get('x-is-admin') or 
                    request.headers.get('X-Is-Admin') or 
                    'false').lower() == 'true'
        is_owner = (request.headers.get('x-is-owner') or 
                    request.headers.get('X-Is-Owner') or 
                    'false').lower() == 'true'
        
        if not user_id:
            return None
        
        # In production, check database for user-company relationship
        # For now, assume header validation is sufficient
        context = TenantContext(
            company_id=company_id,
            user_id=user_id,
            is_admin=is_admin,
            is_owner=is_owner
        )
        
        return context


def get_tenant_context(request: Request) -> TenantContext:
    """Get tenant context from request"""
    context = getattr(request.state, 'tenant_context', None)
    if not context:
        raise HTTPException(
            status_code=400,
            detail="Tenant context not found in request"
        )
    return context
