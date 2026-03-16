"""
Firebase Cloud Messaging (FCM) service for sending push notifications
"""
import os
import json
from typing import Optional
from datetime import datetime, timezone

try:
    import firebase_admin
    from firebase_admin import credentials, messaging
    FIREBASE_AVAILABLE = True
except ImportError:
    FIREBASE_AVAILABLE = False


class FCMService:
    """Service for sending Firebase Cloud Messaging notifications"""
    
    _instance = None
    _initialized = False
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self):
        if not FCMService._initialized:
            self._initialize_firebase()
            FCMService._initialized = True
    
    @staticmethod
    def _initialize_firebase():
        """Initialize Firebase Admin SDK"""
        if not FIREBASE_AVAILABLE:
            print("⚠️ firebase-admin not installed. Install with: pip install firebase-admin")
            return
        
        # Check if already initialized
        if firebase_admin._apps:
            return
        
        try:
            # Try to load credentials from environment or file
            creds_path = os.getenv('FIREBASE_CREDENTIALS_PATH')
            
            if creds_path and os.path.exists(creds_path):
                creds = credentials.Certificate(creds_path)
                firebase_admin.initialize_app(creds)
                print("✅ Firebase initialized from credentials file")
            else:
                # Try to use application default credentials
                try:
                    firebase_admin.initialize_app()
                    print("✅ Firebase initialized with default credentials")
                except Exception:
                    print("⚠️ Firebase credentials not found. Set FIREBASE_CREDENTIALS_PATH or configure default credentials")
        except Exception as e:
            print(f"⚠️ Failed to initialize Firebase: {e}")
    
    @staticmethod
    def send_notification(
        device_token: str,
        title: str,
        body: str,
        payload: Optional[dict] = None,
        data: Optional[dict] = None
    ) -> bool:
        """
        Send a notification to a device via FCM
        
        Args:
            device_token: FCM device token
            title: Notification title
            body: Notification body
            payload: Additional data payload
            data: Custom data fields
        
        Returns:
            True if successful, False otherwise
        """
        if not FIREBASE_AVAILABLE:
            print("⚠️ Firebase not available for sending notifications")
            return False
        
        if not firebase_admin._apps:
            print("⚠️ Firebase not initialized")
            return False
        
        try:
            # Prepare message data
            message_data = data or {}
            if payload:
                message_data['payload'] = json.dumps(payload) if isinstance(payload, dict) else payload
            
            # Create message with Android-specific config
            message = messaging.Message(
                notification=messaging.Notification(
                    title=title,
                    body=body,
                ),
                android=messaging.AndroidConfig(
                    priority="high",
                    notification=messaging.AndroidNotification(
                        sound="default",
                        channel_id="followup_notifications",
                    ),
                ),
                data=message_data,
                token=device_token,
            )
            
            # Send message
            response = messaging.send(message)
            print(f"✅ FCM notification sent: {response}")
            return True
        except Exception as e:
            print(f"❌ Failed to send FCM notification: {e}")
            return False
    
    @staticmethod
    def send_multicast(
        device_tokens: list,
        title: str,
        body: str,
        payload: Optional[dict] = None,
        data: Optional[dict] = None
    ) -> dict:
        """
        Send a notification to multiple devices
        
        Args:
            device_tokens: List of FCM device tokens
            title: Notification title
            body: Notification body
            payload: Additional data payload
            data: Custom data fields
        
        Returns:
            Dictionary with success_count and failure_count
        """
        if not FIREBASE_AVAILABLE or not firebase_admin._apps:
            return {"success_count": 0, "failure_count": len(device_tokens)}
        
        try:
            message_data = data or {}
            if payload:
                message_data['payload'] = json.dumps(payload) if isinstance(payload, dict) else payload
            
            message = messaging.MulticastMessage(
                notification=messaging.Notification(
                    title=title,
                    body=body,
                ),
                android=messaging.AndroidConfig(
                    priority="high",
                    notification=messaging.AndroidNotification(
                        sound="default",
                        channel_id="followup_notifications",
                    ),
                ),
                data=message_data,
                tokens=device_tokens,
            )
            
            response = messaging.send_multicast(message)
            print(f"✅ Multicast sent: {response.success_count} successful, {response.failure_count} failed")
            return {
                "success_count": response.success_count,
                "failure_count": response.failure_count
            }
        except Exception as e:
            print(f"❌ Failed to send multicast: {e}")
            return {"success_count": 0, "failure_count": len(device_tokens)}
    
    @staticmethod
    def send_scheduled_notification(
        device_token: str,
        title: str,
        body: str,
        scheduled_for: datetime,
        payload: Optional[dict] = None
    ) -> str:
        """
        Schedule a notification - returns a job ID that can be used with APScheduler
        
        Args:
            device_token: FCM device token
            title: Notification title
            body: Notification body
            scheduled_for: When to send (datetime)
            payload: Additional data
        
        Returns:
            A tuple of (function, args, job_id) to be used with APScheduler
        """
        job_id = f"fcm_{payload.get('followup_id', 'unknown') if isinstance(payload, dict) else 'unknown'}"
        
        return (
            FCMService.send_notification,
            [device_token, title, body, payload],
            job_id
        )
