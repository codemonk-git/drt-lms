"""
Firebase Cloud Messaging test routes
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from server.services.fcm_service import FCMService
from server.domains.push_notifications.routes import scheduler

router = APIRouter(prefix="/fcm", tags=["fcm"])


class SendTestNotificationRequest(BaseModel):
    """Request to send test FCM notification"""
    device_token: str
    title: str = "Test Notification"
    body: str = "This is a test notification from FCM"
    lead_id: str = None
    lead_name: str = None


@router.post("/test-notification")
def send_test_notification(request: SendTestNotificationRequest):
    """Send a test FCM notification to verify setup"""
    try:
        # Build payload with lead info if provided
        payload = {"test": True}
        if request.lead_id:
            payload["lead_id"] = request.lead_id
        if request.lead_name:
            payload["lead_name"] = request.lead_name
        
        result = FCMService.send_notification(
            device_token=request.device_token,
            title=request.title,
            body=request.body,
            payload=payload
        )
        
        if result:
            return {
                "status": "success",
                "message": "Test notification sent successfully",
                "device_token": request.device_token[:50] + "...",
                "payload": payload
            }
        else:
            return {
                "status": "error",
                "message": "Failed to send notification - Firebase credentials may not be configured",
                "solution": "Set FIREBASE_CREDENTIALS_PATH environment variable pointing to your service account JSON"
            }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Test notification error: {str(e)}"
        )


@router.get("/scheduler/jobs")
def get_scheduled_jobs():
    """Get all currently scheduled jobs (debugging endpoint)"""
    try:
        # Get jobs from the job store directly
        job_store = scheduler._jobstores.get('default')
        jobs = job_store.get_all_jobs() if job_store else []
        
        jobs_data = []
        for job in jobs:
            jobs_data.append({
                "id": job.id,
                "func": job.func_ref,
                "next_run_time": str(job.next_run_time) if job.next_run_time else None,
                "trigger": str(job.trigger) if job.trigger else None,
            })
        
        return {
            "status": "success",
            "scheduler_running": scheduler.running,
            "job_store_type": type(job_store).__name__ if job_store else None,
            "total_jobs": len(jobs_data),
            "jobs": jobs_data
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Error getting jobs: {str(e)}"
        )

