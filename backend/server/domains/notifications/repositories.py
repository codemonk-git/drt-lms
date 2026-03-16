"""
Notification repository - persistence layer for notifications
"""
from pathlib import Path
import json
from typing import List, Optional
from .models import Notification


class NotificationRepository:
    """Notification repository"""
    
    def __init__(self):
        self.data_dir = Path(__file__).parent.parent.parent.parent.parent / "data"
        self.data_dir.mkdir(parents=True, exist_ok=True)
        self.file_path = self.data_dir / "notifications.json"
        self._load_data()
    
    def _load_data(self):
        """Load notifications from file"""
        if self.file_path.exists():
            with open(self.file_path, 'r') as f:
                self.data = json.load(f)
        else:
            self.data = {}
    
    def _save_data(self):
        """Save notifications to file"""
        with open(self.file_path, 'w') as f:
            json.dump(self.data, f, indent=2, default=str)
    
    def save(self, notification: Notification) -> Notification:
        """Save notification"""
        self.data[notification.notification_id] = notification.to_dict()
        self._save_data()
        return notification
    
    def get_by_id(self, notification_id: str) -> Optional[Notification]:
        """Get notification by ID"""
        if notification_id in self.data:
            return Notification.from_dict(self.data[notification_id])
        return None
    
    def get_user_notifications(self, user_id: str) -> List[Notification]:
        """Get user notifications"""
        return [
            Notification.from_dict(data)
            for data in self.data.values()
            if data.get('user_id') == user_id
        ]
    
    def mark_as_read(self, notification_id: str) -> Optional[Notification]:
        """Mark notification as read"""
        if notification_id in self.data:
            from datetime import datetime
            self.data[notification_id]['read'] = True
            self.data[notification_id]['read_at'] = datetime.utcnow().isoformat()
            self._save_data()
            return Notification.from_dict(self.data[notification_id])
        return None
    
    def delete(self, notification_id: str) -> bool:
        """Delete notification"""
        if notification_id in self.data:
            del self.data[notification_id]
            self._save_data()
            return True
        return False
