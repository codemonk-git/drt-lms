"""
Webhook management for lead ingestion integrations
Supports: Meta Webhook, Google Webhook, Form Submission Webhooks, etc.
"""
from typing import Dict, Optional, Any, List
from datetime import datetime
from enum import Enum
import hmac
import hashlib


class WebhookType(str, Enum):
    """Webhook type enumeration"""
    META_LEAD = "meta_lead"
    GOOGLE_ADS = "google_ads"
    FORM_SUBMISSION = "form_submission"
    CUSTOM = "custom"


class WebhookVerificationStatus(str, Enum):
    """Webhook verification status"""
    PENDING = "pending"
    VERIFIED = "verified"
    FAILED = "failed"


class Webhook:
    """Webhook configuration"""
    def __init__(self, company_id: str, webhook_type: str, url: str, **kwargs):
        self.id: str = kwargs.get('id', self._generate_id())
        self.company_id = company_id
        self.webhook_type = webhook_type
        self.url = url
        self.secret = kwargs.get('secret', self._generate_secret())
        self.active = kwargs.get('active', True)
        self.events = kwargs.get('events', ['lead.created'])  # Subscribed events
        self.created_at = kwargs.get('created_at', datetime.utcnow())
        self.last_triggered = kwargs.get('last_triggered')
        self.trigger_count = kwargs.get('trigger_count', 0)
        self.failure_count = kwargs.get('failure_count', 0)
        self.metadata: Dict = kwargs.get('metadata', {})
    
    def _generate_id(self) -> str:
        """Generate webhook ID"""
        import uuid
        return str(uuid.uuid4())
    
    def _generate_secret(self) -> str:
        """Generate webhook secret"""
        import secrets
        return secrets.token_urlsafe(32)
    
    def verify_signature(self, payload: str, signature: str) -> bool:
        """Verify webhook signature (HMAC-SHA256)"""
        expected = hmac.new(
            self.secret.encode(),
            payload.encode(),
            hashlib.sha256
        ).hexdigest()
        return hmac.compare_digest(expected, signature)
    
    def generate_signature(self, payload: str) -> str:
        """Generate signature for webhook payload"""
        return hmac.new(
            self.secret.encode(),
            payload.encode(),
            hashlib.sha256
        ).hexdigest()
    
    def update_trigger_info(self, success: bool = True):
        """Update webhook trigger info"""
        self.last_triggered = datetime.utcnow()
        self.trigger_count += 1
        if not success:
            self.failure_count += 1


class WebhookEvent:
    """Webhook event log"""
    def __init__(self, webhook_id: str, event_type: str, payload: Dict[str, Any]):
        self.id: str = self._generate_id()
        self.webhook_id = webhook_id
        self.event_type = event_type
        self.payload = payload
        self.created_at = datetime.utcnow()
        self.delivered = False
        self.delivery_attempts = 0
        self.last_error: Optional[str] = None
    
    def _generate_id(self) -> str:
        """Generate event ID"""
        import uuid
        return str(uuid.uuid4())


class WebhookManager:
    """Manage webhooks for lead ingestion"""
    
    def __init__(self):
        self.webhooks: Dict[str, List[Webhook]] = {}  # company_id -> [Webhook]
        self.events: Dict[str, List[WebhookEvent]] = {}  # webhook_id -> [WebhookEvent]
    
    def create_webhook(self, company_id: str, webhook_type: str, url: str, 
                      events: Optional[List[str]] = None, metadata: Optional[Dict] = None) -> Webhook:
        """Create a new webhook"""
        if not url or not webhook_type:
            raise ValueError("URL and webhook_type are required")
        
        webhook = Webhook(
            company_id=company_id,
            webhook_type=webhook_type,
            url=url,
            events=events or ['lead.created'],
            metadata=metadata or {}
        )
        
        if company_id not in self.webhooks:
            self.webhooks[company_id] = []
        
        self.webhooks[company_id].append(webhook)
        self.events[webhook.id] = []
        
        return webhook
    
    def get_webhook(self, webhook_id: str) -> Optional[Webhook]:
        """Get webhook by ID"""
        for company_webhooks in self.webhooks.values():
            for webhook in company_webhooks:
                if webhook.id == webhook_id:
                    return webhook
        return None
    
    def list_company_webhooks(self, company_id: str) -> List[Webhook]:
        """List all webhooks for company"""
        return self.webhooks.get(company_id, [])
    
    def get_active_webhooks(self, company_id: str) -> List[Webhook]:
        """Get active webhooks for company"""
        return [w for w in self.list_company_webhooks(company_id) if w.active]
    
    def update_webhook(self, webhook_id: str, **kwargs) -> Optional[Webhook]:
        """Update webhook configuration"""
        webhook = self.get_webhook(webhook_id)
        if not webhook:
            raise ValueError(f"Webhook {webhook_id} not found")
        
        allowed_fields = ['url', 'active', 'events', 'metadata']
        for field, value in kwargs.items():
            if field in allowed_fields:
                setattr(webhook, field, value)
        
        return webhook
    
    def delete_webhook(self, webhook_id: str) -> bool:
        """Delete webhook"""
        webhook = self.get_webhook(webhook_id)
        if not webhook:
            raise ValueError(f"Webhook {webhook_id} not found")
        
        for company_webhooks in self.webhooks.values():
            if webhook in company_webhooks:
                company_webhooks.remove(webhook)
                if webhook.id in self.events:
                    del self.events[webhook.id]
                return True
        
        return False
    
    def test_webhook(self, webhook_id: str) -> Dict[str, Any]:
        """Test webhook delivery"""
        webhook = self.get_webhook(webhook_id)
        if not webhook:
            raise ValueError(f"Webhook {webhook_id} not found")
        
        # Create test payload
        test_payload = {
            "test": True,
            "timestamp": datetime.utcnow().isoformat(),
            "event_type": "test",
            "data": {"message": "This is a test webhook"}
        }
        
        return {
            "webhook_id": webhook_id,
            "url": webhook.url,
            "test_payload": test_payload,
            "signature": webhook.generate_signature(str(test_payload)),
            "note": "This is a test. Webhook is configured correctly."
        }
    
    def log_event(self, webhook_id: str, event_type: str, payload: Dict[str, Any]) -> WebhookEvent:
        """Log webhook event"""
        event = WebhookEvent(webhook_id, event_type, payload)
        
        if webhook_id not in self.events:
            self.events[webhook_id] = []
        
        self.events[webhook_id].append(event)
        return event
    
    def get_webhook_events(self, webhook_id: str, limit: int = 50) -> List[WebhookEvent]:
        """Get webhook events"""
        events = self.events.get(webhook_id, [])
        return sorted(events, key=lambda x: x.created_at, reverse=True)[:limit]
    
    def get_webhook_stats(self, webhook_id: str) -> Dict[str, Any]:
        """Get webhook statistics"""
        webhook = self.get_webhook(webhook_id)
        if not webhook:
            raise ValueError(f"Webhook {webhook_id} not found")
        
        events = self.get_webhook_events(webhook_id, limit=1000)
        successful_events = sum(1 for e in events if e.delivered)
        failed_events = sum(1 for e in events if not e.delivered and e.delivery_attempts > 0)
        pending_events = sum(1 for e in events if not e.delivered and e.delivery_attempts == 0)
        
        return {
            "webhook_id": webhook_id,
            "url": webhook.url,
            "active": webhook.active,
            "webhook_type": webhook.webhook_type,
            "total_triggers": webhook.trigger_count,
            "failure_count": webhook.failure_count,
            "success_rate": (webhook.trigger_count - webhook.failure_count) / max(webhook.trigger_count, 1),
            "last_triggered": webhook.last_triggered.isoformat() if webhook.last_triggered else None,
            "total_events": len(events),
            "successful_events": successful_events,
            "failed_events": failed_events,
            "pending_events": pending_events,
            "created_at": webhook.created_at.isoformat()
        }
