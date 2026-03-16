"""
Custom exceptions for the Assignments domain.
"""


class AssignmentException(Exception):
    """Base exception for assignment-related errors"""
    pass


class AssignmentNotFoundError(AssignmentException):
    """Raised when an assignment is not found"""
    pass


class AssignmentConflictError(AssignmentException):
    """Raised when assignment operation conflicts with existing data"""
    pass


class InvalidAssignmentError(AssignmentException):
    """Raised when assignment data is invalid"""
    pass


class UserUnavailableError(AssignmentException):
    """Raised when assigned user is unavailable"""
    pass
