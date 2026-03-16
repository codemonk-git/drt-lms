"""
Global shared exceptions used across all domains.
"""


class DomainException(Exception):
    """Base exception for all domain errors"""
    pass


class NotFoundError(DomainException):
    """Raised when a resource is not found"""
    pass


class ValidationError(DomainException):
    """Raised when input validation fails"""
    pass


class ConflictError(DomainException):
    """Raised when there is a conflict with existing data"""
    pass


class UnauthorizedError(DomainException):
    """Raised when user doesn't have permission"""
    pass


class MultiTenancyError(DomainException):
    """Raised when multi-tenant isolation is violated"""
    pass
