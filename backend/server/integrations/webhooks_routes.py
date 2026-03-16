"""
Webhook integration routes for lead ingestion
"""
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime

from server.integrations.webhooks import WebhookManager, WebhookType

router = APIRouter(prefix="/webhooks", tags=["webhooks"])

# Initialize webhook manager
webhook_manager = WebhookManager()


# Request Models
class CreateWebhookRequest(BaseModel):
    """Create webhook request"""
    webhook_type: str
    url: str
    events: Optional[List[str]] = None
    metadata: Optional[Dict[str, Any]] = None


class UpdateWebhookRequest(BaseModel):
    """Update webhook request"""
    url: Optional[str] = None
    active: Optional[bool] = None
    events: Optional[List[str]] = None
    metadata: Optional[Dict[str, Any]] = None


# Endpoints
@router.post("/{company_id}")
def create_webhook(company_id: str, request: CreateWebhookRequest):
    """Create a new webhook for lead ingestion"""
    try:
        webhook = webhook_manager.create_webhook(
            company_id=company_id,
            webhook_type=request.webhook_type,
            url=request.url,
            events=request.events,
            metadata=request.metadata
        )
        return {
            "status": "success",
            "data": {
                "id": webhook.id,
                "webhook_type": webhook.webhook_type,
                "url": webhook.url,
                "secret": webhook.secret,
                "active": webhook.active,
                "events": webhook.events,
                "created_at": webhook.created_at.isoformat()
            }
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{company_id}")
def list_webhooks(company_id: str):
    """List all webhooks for company"""
    try:
        webhooks = webhook_manager.list_company_webhooks(company_id)
        return {
            "status": "success",
            "data": [{
                "id": w.id,
                "webhook_type": w.webhook_type,
                "url": w.url,
                "active": w.active,
                "events": w.events,
                "trigger_count": w.trigger_count,
                "failure_count": w.failure_count,
                "last_triggered": w.last_triggered.isoformat() if w.last_triggered else None,
                "created_at": w.created_at.isoformat()
            } for w in webhooks]
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{company_id}/{webhook_id}")
def get_webhook(company_id: str, webhook_id: str):
    """Get webhook details"""
    try:
        webhook = webhook_manager.get_webhook(webhook_id)
        if not webhook or webhook.company_id != company_id:
            raise HTTPException(status_code=404, detail="Webhook not found")
        
        return {
            "status": "success",
            "data": {
                "id": webhook.id,
                "webhook_type": webhook.webhook_type,
                "url": webhook.url,
                "active": webhook.active,
                "events": webhook.events,
                "trigger_count": webhook.trigger_count,
                "failure_count": webhook.failure_count,
                "last_triggered": webhook.last_triggered.isoformat() if webhook.last_triggered else None,
                "created_at": webhook.created_at.isoformat()
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/{company_id}/{webhook_id}")
def update_webhook(company_id: str, webhook_id: str, request: UpdateWebhookRequest):
    """Update webhook configuration"""
    try:
        webhook = webhook_manager.get_webhook(webhook_id)
        if not webhook or webhook.company_id != company_id:
            raise HTTPException(status_code=404, detail="Webhook not found")
        
        updated = webhook_manager.update_webhook(
            webhook_id=webhook_id,
            url=request.url,
            active=request.active,
            events=request.events,
            metadata=request.metadata
        )
        
        return {
            "status": "success",
            "data": {
                "id": updated.id,
                "webhook_type": updated.webhook_type,
                "url": updated.url,
                "active": updated.active,
                "events": updated.events,
                "created_at": updated.created_at.isoformat()
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{company_id}/{webhook_id}")
def delete_webhook(company_id: str, webhook_id: str):
    """Delete webhook"""
    try:
        webhook = webhook_manager.get_webhook(webhook_id)
        if not webhook or webhook.company_id != company_id:
            raise HTTPException(status_code=404, detail="Webhook not found")
        
        webhook_manager.delete_webhook(webhook_id)
        return {"status": "success", "message": "Webhook deleted"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{company_id}/{webhook_id}/test")
def test_webhook(company_id: str, webhook_id: str):
    """Test webhook delivery"""
    try:
        webhook = webhook_manager.get_webhook(webhook_id)
        if not webhook or webhook.company_id != company_id:
            raise HTTPException(status_code=404, detail="Webhook not found")
        
        test_result = webhook_manager.test_webhook(webhook_id)
        return {"status": "success", "data": test_result}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{company_id}/{webhook_id}/events")
def get_webhook_events(company_id: str, webhook_id: str, limit: int = Query(50)):
    """Get webhook event logs"""
    try:
        webhook = webhook_manager.get_webhook(webhook_id)
        if not webhook or webhook.company_id != company_id:
            raise HTTPException(status_code=404, detail="Webhook not found")
        
        events = webhook_manager.get_webhook_events(webhook_id, limit=limit)
        return {
            "status": "success",
            "data": [{
                "id": e.id,
                "event_type": e.event_type,
                "delivered": e.delivered,
                "delivery_attempts": e.delivery_attempts,
                "last_error": e.last_error,
                "created_at": e.created_at.isoformat()
            } for e in events]
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{company_id}/{webhook_id}/stats")
def get_webhook_stats(company_id: str, webhook_id: str):
    """Get webhook statistics"""
    try:
        webhook = webhook_manager.get_webhook(webhook_id)
        if not webhook or webhook.company_id != company_id:
            raise HTTPException(status_code=404, detail="Webhook not found")
        
        stats = webhook_manager.get_webhook_stats(webhook_id)
        return {"status": "success", "data": stats}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
