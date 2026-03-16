"""
Notification services - business logic for notifications
"""
from typing import List, Optional
from datetime import datetime
from .models import Notification
from .repositories import NotificationRepository


class NotificationService:
    """Notification service - handles sending and managing notifications"""
    
    def __init__(self, repo: NotificationRepository = None):
        self.repo = repo or NotificationRepository()
    
    def send_notification(self,
                         user_id: str,
                         title: str,
                         message: str,
                         notification_type: str = "info",
                         entity_id: str = None,
                         entity_type: str = None) -> Notification:
        """Send notification to user"""
        notification = Notification(
            user_id=user_id,
            title=title,
            message=message,
            notification_type=notification_type,
            entity_id=entity_id,
            entity_type=entity_type
        )
        return self.repo.save(notification)
    
    def get_user_notifications(self, user_id: str, page: int = 1, limit: int = 20) -> List[Notification]:
        """Get user notifications with pagination"""
        notifications = self.repo.get_user_notifications(user_id)
        notifications = sorted(notifications, key=lambda x: x.created_at, reverse=True)
        
        start = (page - 1) * limit
        end = start + limit
        return notifications[start:end]
    
    def get_unread_count(self, user_id: str) -> int:
        """Get unread notification count"""
        notifications = self.repo.get_user_notifications(user_id)
        return sum(1 for n in notifications if not n.read)
    
    def mark_as_read(self, notification_id: str) -> Optional[Notification]:
        """Mark notification as read"""
        return self.repo.mark_as_read(notification_id)
    
    def delete_notification(self, notification_id: str) -> bool:
        """Delete notification"""
        return self.repo.delete(notification_id)
    
    def send_bulk_notifications(self, user_ids: List[str], title: str, message: str, notification_type: str = "info") -> List[Notification]:
        """Send notification to multiple users"""
        notifications = []
        for user_id in user_ids:
            notif = self.send_notification(user_id, title, message, notification_type)
            notifications.append(notif)
        return notifications
