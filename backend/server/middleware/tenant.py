"""
Tenant isolation middleware for multi-tenant application.
"""
from typing import Optional
from ..utils.logger import logger


class TenantContext:
    """Tenant context for request"""

    def __init__(self, company_id: str):
        self.company_id = company_id


class TenantMiddleware:
    """Middleware for tenant isolation"""

    @staticmethod
    def extract_tenant_id(authorization_header: str) -> Optional[str]:
        """
        Extract tenant ID from auth context.
        Assumes company_id is in JWT token.
        """
        # Implementation depends on token structure
        pass

    @staticmethod
    def validate_tenant_access(user_company_id: str, requested_company_id: str) -> bool:
        """
        Validate user access to requested company.
        
        Args:
            user_company_id: Company ID from auth context
            requested_company_id: Requested company ID
            
        Returns:
            True if access is allowed
        """
        is_allowed = user_company_id == requested_company_id
        if not is_allowed:
            logger.warning(
                f"Tenant access violation: user_company={user_company_id}, "
                f"requested_company={requested_company_id}"
            )
        return is_allowed

    @staticmethod
    def ensure_company_context(user_company_id: str, 
                              requested_company_id: Optional[str]) -> Optional[str]:
        """
        Ensure company context is valid.
        If no company specified, use user's company.
        """
        if requested_company_id:
            if requested_company_id != user_company_id:
                raise ValueError("Cannot access resources from different company")
            return requested_company_id
        
        return user_company_id
