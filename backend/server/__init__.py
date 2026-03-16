"""
Production-Ready Multi-Tenant SaaS Backend Architecture

A comprehensive, modular, and scalable backend system for a multi-tenant SaaS platform
with complete permission management, organizational hierarchies, and role-based access control.

Project Structure:
================

backend/
├── data/                    # Data files and schemas
│   ├── schemas.json        # Database schemas
│   ├── permissions.json    # Permission definitions
│   └── default_roles.json  # Default role templates
│
├── server/                 # Application server code
│   ├── models/            # Data models
│   │   ├── base.py        # Base model with common functionality
│   │   ├── company.py     # Company and tenant models
│   │   ├── user.py        # User and authentication models
│   │   ├── team.py        # Team and organizational models
│   │   ├── permission.py  # Role and permission models
│   │   ├── audit.py       # Audit and invitation models
│   │   └── __init__.py
│   │
│   ├── services/          # Business logic layer
│   │   ├── company_service.py      # Company management
│   │   ├── user_service.py         # User management
│   │   ├── team_service.py         # Team and hierarchy management
│   │   ├── permission_service.py   # Roles and permissions
│   │   └── __init__.py
│   │
│   ├── routes/            # API endpoints
│   │   ├── response.py             # API response formatting
│   │   ├── company_routes.py       # Company endpoints
│   │   ├── user_routes.py          # User endpoints
│   │   ├── team_routes.py          # Team endpoints
│   │   ├── permission_routes.py    # Permission endpoints
│   │   └── __init__.py
│   │
│   ├── middleware/        # Middleware for request processing
│   │   ├── auth.py        # Authentication and JWT handling
│   │   ├── tenant.py      # Multi-tenant isolation
│   │   └── __init__.py
│   │
│   ├── permissions/       # Permission checking utilities
│   │   ├── permission_checker.py   # Permission validation
│   │   └── __init__.py
│   │
│   ├── db/               # Database abstraction
│   │   ├── base_repository.py      # Repository pattern
│   │   ├── repository.py           # Repository implementations
│   │   └── __init__.py
│   │
│   ├── config/           # Configuration management
│   │   ├── settings.py   # App configuration
│   │   └── __init__.py
│   │
│   ├── utils/            # Utility functions
│   │   ├── logger.py     # Logging utilities
│   │   ├── validators.py # Input validation
│   │   ├── password.py   # Password hashing
│   │   └── __init__.py
│   │
│   └── main.py          # Application entry point
│
└── tests/                # Test files
    ├── test_company.py
    ├── test_user.py
    ├── test_team.py
    ├── test_permissions.py
    └── conftest.py

Key Features:
=============

1. Multi-Tenant Architecture
   - Complete tenant isolation
   - Company-scoped data access
   - Team-based organization

2. User Management
   - User registration and authentication
   - Email verification
   - Password management with hashing
   - User status management

3. Team & Organizational Structure
   - Nested teams and sub-teams
   - Hierarchical organizational structure
   - Division/Department/Unit node types
   - Team member management

4. Role-Based Access Control (RBAC)
   - Flexible role creation
   - Permission management
   - User role assignment
   - Team-specific roles

5. Permission System
   - Granular permissions (create, read, update, delete)
   - Permission categories
   - Role-based permission assignment
   - Permission checking utilities

6. Super Admin Features
   - Company management
   - System-wide administration
   - Company activation/suspension
   - Audit logging

7. Security
   - JWT token authentication
   - Password hashing (PBKDF2)
   - Tenant isolation enforcement
   - Input validation and sanitization

8. Audit & Logging
   - Comprehensive audit logging
   - Action tracking
   - IP address and user agent logging
   - Change history

Data Models:
============

Company: Main tenant entity
├── Company metadata and settings
├── Subscription management
└── Company settings (features, restrictions)

User: Platform users
├── Authentication credentials
├── Profile information
└── Status management

Team: Organizational units
├── Nested team structure
├── Team members
└── Team-specific settings

Role: Access control roles
├── Permission assignment
├── Default system roles
└── Custom company roles

Permission: Granular access controls
├── CRUD operations
├── Resource categories
└── Permission slugs

HierarchyNode: Organizational structure
├── Division, Department, Unit types
├── Hierarchical relationships
└── Metadata storage

API Endpoints (Examples):
========================

Company:
- POST /api/companies - Create company
- GET /api/companies/:id - Get company
- PUT /api/companies/:id - Update company
- GET /api/companies/:id/settings - Get settings
- PUT /api/companies/:id/settings - Update settings

User:
- POST /api/users - Create user
- GET /api/users - List users
- GET /api/users/:id - Get user
- PUT /api/users/:id - Update user
- POST /api/users/:id/change-password - Change password

Team:
- POST /api/teams - Create team
- GET /api/teams - List teams
- GET /api/teams/:id - Get team
- POST /api/teams/:id/members - Add member
- DELETE /api/teams/:id/members/:userId - Remove member

Role:
- POST /api/roles - Create role
- GET /api/roles - List roles
- GET /api/roles/:id - Get role
- POST /api/roles/:id/permissions - Add permission

User Roles:
- POST /api/users/:id/roles - Assign role
- DELETE /api/users/:id/roles/:roleId - Revoke role

Hierarchy:
- POST /api/hierarchy - Create node
- GET /api/hierarchy - Get full hierarchy
- PUT /api/hierarchy/:id - Update node

Configuration:
==============

Set environment variables:
- JWT_SECRET_KEY: JWT signing secret
- ENVIRONMENT: development/staging/production
- DEBUG: true/false
- DB_DRIVER: sqlite/postgresql/mysql
- ENABLE_AUDIT_LOGGING: true/false
- ENABLE_EMAIL_VERIFICATION: true/false

Dependencies:
==============

Core:
- Python 3.8+

Optional (for production):
- PostgreSQL/MySQL for database
- Redis for caching
- PyJWT for JWT tokens
- bcrypt for password hashing
- Flask/FastAPI for API framework

Development:
- pytest for testing
- pytest-cov for coverage
- black for code formatting
- flake8 for linting

Usage Example:
==============

from backend.server.services import CompanyService, UserService
from backend.server.db import CompanyRepository

# Create company
company_service = CompanyService()
company = company_service.create_company(
    name="Acme Corp",
    slug="acme-corp",
    owner_id="user-123",
    industry="Technology"
)

# Create user
user_service = UserService()
user = user_service.create_user(
    company_id=company.id,
    email="john@acme.com",
    password="SecurePassword123!",
    first_name="John",
    last_name="Doe"
)

# Assign role
from backend.server.services import UserRoleService
user_role_service = UserRoleService()
user_role_service.assign_role(
    user_id=user.id,
    role_id="role-123",
    assigned_by=company.owner_id
)

Production Checklist:
====================

[ ] Use production database (PostgreSQL recommended)
[ ] Change JWT secret key
[ ] Enable email verification
[ ] Configure SMTP for emails
[ ] Set up proper logging
[ ] Enable audit logging
[ ] Configure CORS properly
[ ] Add rate limiting
[ ] Implement caching layer
[ ] Set up monitoring/alerts
[ ] Add backup strategy
[ ] Configure SSL/TLS
[ ] Add API documentation (Swagger/OpenAPI)
[ ] Implement API versioning
[ ] Add request validation
[ ] Set up CI/CD pipeline
[ ] Load testing
[ ] Security audit
"""

if __name__ == "__main__":
    print(__doc__)
