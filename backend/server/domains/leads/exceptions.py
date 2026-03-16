"""
Custom exceptions for the Leads domain.
"""


class LeadException(Exception):
    """Base exception for lead-related errors"""
    pass


class LeadNotFoundError(LeadException):
    """Raised when a lead is not found"""
    pass


class LeadValidationError(LeadException):
    """Raised when lead data validation fails"""
    pass


class LeadScoreError(LeadException):
    """Raised when lead score calculation fails"""
    pass


class InvalidLeadTransitionError(LeadException):
    """Raised when an invalid stage transition is attempted"""
    pass


class LeadAlreadyExistsError(LeadException):
    """Raised when trying to create a duplicate lead"""
    pass
