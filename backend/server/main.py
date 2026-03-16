# Load environment variables from .env file FIRST, before any imports
import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env from backend directory
env_file = Path(__file__).parent.parent / ".env"
load_dotenv(env_file)
print(f"📋 Loaded environment from {env_file}")

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

# Import middleware
from server.middleware.tenant_context import TenantContextMiddleware

# Import all domain routers
from server.domains.auth.routes import router as auth_router
from server.domains.tenants.routes import router as tenants_router
from server.domains.users.routes import router as users_router
from server.domains.leads.routes import router as leads_router
from server.domains.leads.stakeholder_routes import router as stakeholder_router
from server.domains.teams.routes import router as teams_router
from server.domains.forms.routes import router as forms_router
from server.domains.permissions.routes import router as permissions_router
from server.domains.activities.routes import router as activities_router
from server.domains.assignments.routes import router as assignments_router
# from server.domains.analytics.routes import router as analytics_router  # TODO: Implement analytics
# from server.domains.attachments.routes import router as attachments_router  # TODO: Implement attachments
# from server.domains.comments.routes import router as comments_router  # TODO: Implement comments
# from server.domains.notifications.routes import router as notifications_router  # TODO: Implement notifications
from server.domains.stages.routes import router as stages_router
from server.domains.push_notifications.routes import router as push_router
from server.domains.push_notifications.fcm_routes import router as fcm_router
# from server.domains.bulk_operations.routes import router as bulk_operations_router  # TODO: Implement bulk_operations

# Initialize FastAPI app
app = FastAPI(
    title="Business Suite API",
    description="Comprehensive CRM and business management system with multi-tenancy, subscriptions, and usage tracking",
    version="2.1.0"
)

# Add middleware (order matters - CORS should be first so it wraps everything)
# Middleware added last executes first in the request pipeline
app.add_middleware(TenantContextMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)
# Note: In FastAPI, middleware wrapping order is: last added = outermost = executes first on request
# So CORS will wrap TenantContext, ensuring CORS headers are always added

# Include all routers with /api prefix
app.include_router(auth_router, prefix="/api")
app.include_router(tenants_router, prefix="/api")
app.include_router(users_router, prefix="/api")
app.include_router(leads_router, prefix="/api")
app.include_router(teams_router, prefix="/api")
app.include_router(forms_router, prefix="/api")
app.include_router(permissions_router, prefix="/api")
app.include_router(activities_router, prefix="/api")
app.include_router(assignments_router, prefix="/api")
app.include_router(stakeholder_router, prefix="/api")
# app.include_router(analytics_router, prefix="/api")
# app.include_router(attachments_router, prefix="/api")
# app.include_router(comments_router, prefix="/api")
# app.include_router(notifications_router, prefix="/api")
app.include_router(stages_router, prefix="/api")
app.include_router(push_router, prefix="/api")
app.include_router(fcm_router, prefix="/api")
# app.include_router(bulk_operations_router, prefix="/api")

# Startup event - initialize Firebase and other services
@app.on_event("startup")
def startup_event():
    """Initialize services on startup"""
    # Initialize Firebase for FCM
    from server.services.fcm_service import FCMService
    fcm = FCMService()
    print("🔥 Firebase Cloud Messaging initialized")
    
    # Verify scheduler is running
    from server.domains.push_notifications.routes import scheduler
    if scheduler.running:
        print("📅 APScheduler is running with JSON job store")
    print("✅ All services initialized")

# Health check endpoint
@app.get("/health")
def health_check():
    return {"status": "ok", "service": "Business Suite API"}

# Root endpoint
@app.get("/")
def root():
    return {"message": "Business Suite API v2.0.0", "endpoints": "/docs"}

# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    return JSONResponse(
        status_code=500,
        content={"status": "error", "detail": str(exc)}
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
