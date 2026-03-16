from fastapi import APIRouter, HTTPException, Query
from server.domains.notifications.services import NotificationService
from server.domains.notifications.repositories import NotificationRepository

router = APIRouter(prefix="", tags=["notifications"])
notification_service = NotificationService(NotificationRepository())

@router.post("/notifications/send")
def send_notification(user_id: str, message: str, notification_type: str):
    try:
        notification = notification_service.send_notification(user_id, message, notification_type)
        return {"status": "success", "data": notification}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/notifications")
def get_notifications(user_id: str, skip: int = Query(0), limit: int = Query(10)):
    try:
        notifications = notification_service.get_notifications(user_id, skip, limit)
        return {"status": "success", "data": notifications}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/notifications/{notification_id}/mark-as-read")
def mark_as_read(notification_id: str):
    try:
        notification = notification_service.mark_as_read(notification_id)
        return {"status": "success", "data": notification}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
