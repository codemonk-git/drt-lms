"""
Push Notification routes using Web Push / VAPID
"""
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Optional, Dict, Any
import json, os, threading
from datetime import datetime, timezone
from pathlib import Path

# ── VAPID keys ──────────────────────────────────────────────────────────────
_KEYS_PATH = Path(__file__).parents[3] / "vapid_keys.json"
_SUBS_PATH = Path(__file__).parents[3] / "data" / "push_subscriptions.json"

def _load_vapid():
    with open(_KEYS_PATH) as f:
        return json.load(f)

VAPID = _load_vapid()
VAPID_CLAIMS = {"sub": "mailto:admin@example.com"}

# ── Subscription store (JSON file, in-memory cache) ─────────────────────────
_lock = threading.Lock()

def _load_subs() -> Dict:
    if _SUBS_PATH.exists():
        try:
            with open(_SUBS_PATH) as f:
                return json.load(f)
        except Exception:
            return {}
    return {}

def _save_subs(subs: Dict):
    with open(_SUBS_PATH, "w") as f:
        json.dump(subs, f, indent=2)

# ── APScheduler ─────────────────────────────────────────────────────────────
from apscheduler.schedulers.background import BackgroundScheduler
from server.db.json_job_store import JSONJobStore
from pathlib import Path

# Configure scheduler with JSON-based job store for persistence
# Jobs are stored in backend/data/scheduled_jobs.json (same format as other data files)
data_dir = Path(__file__).parents[3] / "data"
job_stores = {
    'default': JSONJobStore(data_dir=str(data_dir))
}

scheduler = BackgroundScheduler(
    timezone="UTC",
    jobstores=job_stores,
    job_defaults={'coalesce': True, 'max_instances': 1}
)
scheduler.start()
print(f"📅 APScheduler initialized with JSON job store at {data_dir}/scheduled_jobs.json")

# ── Router ───────────────────────────────────────────────────────────────────
router = APIRouter(prefix="/push", tags=["push"])


class PushSubscription(BaseModel):
    user_id: str
    subscription: Dict[str, Any]   # {endpoint, keys: {p256dh, auth}}


class SchedulePushRequest(BaseModel):
    user_id: str
    followup_id: str
    title: str
    body: str
    scheduled_for: str   # ISO datetime string


class CancelPushRequest(BaseModel):
    followup_id: str


# ── Helpers ──────────────────────────────────────────────────────────────────
def _send_push(user_id: str, followup_id: str, title: str, body: str):
    """Fire a Web Push notification to all subscriptions for this user."""
    try:
        from pywebpush import webpush, WebPushException
    except ImportError:
        print("[push] pywebpush not installed")
        return

    with _lock:
        subs = _load_subs()
        user_subs = subs.get(user_id, [])

    payload = json.dumps({"title": title, "body": body, "followup_id": followup_id})

    dead = []
    for sub in user_subs:
        try:
            webpush(
                subscription_info=sub,
                data=payload,
                vapid_private_key=VAPID["VAPID_PRIVATE_KEY"],
                vapid_claims=VAPID_CLAIMS,
            )
        except Exception as e:
            print(f"[push] failed for {sub.get('endpoint','?')[:40]}: {e}")
            err_str = str(e)
            if "410" in err_str or "404" in err_str:
                dead.append(sub)

    # Remove expired subscriptions
    if dead:
        with _lock:
            subs = _load_subs()
            user_subs = subs.get(user_id, [])
            subs[user_id] = [s for s in user_subs if s not in dead]
            _save_subs(subs)


# ── Endpoints ────────────────────────────────────────────────────────────────
@router.get("/vapid-public-key")
def get_vapid_public_key():
    return {"publicKey": VAPID["VAPID_PUBLIC_KEY"]}


@router.post("/subscribe")
def subscribe(body: PushSubscription):
    with _lock:
        subs = _load_subs()
        user_subs = subs.get(body.user_id, [])
        endpoint = body.subscription.get("endpoint", "")
        # Avoid duplicate
        if not any(s.get("endpoint") == endpoint for s in user_subs):
            user_subs.append(body.subscription)
        subs[body.user_id] = user_subs
        _save_subs(subs)
    return {"status": "subscribed"}


@router.post("/unsubscribe")
def unsubscribe(body: PushSubscription):
    endpoint = body.subscription.get("endpoint", "")
    with _lock:
        subs = _load_subs()
        user_subs = subs.get(body.user_id, [])
        subs[body.user_id] = [s for s in user_subs if s.get("endpoint") != endpoint]
        _save_subs(subs)
    return {"status": "unsubscribed"}


@router.post("/schedule")
def schedule_push(body: SchedulePushRequest):
    """Schedule a background push at the followup's due time."""
    try:
        due = datetime.fromisoformat(body.scheduled_for.replace("Z", "+00:00"))
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid scheduled_for")

    now = datetime.now(timezone.utc)
    if due <= now:
        return {"status": "skipped", "reason": "already past"}

    job_id = f"followup_{body.followup_id}"
    # Remove existing job for same followup if any
    if scheduler.get_job(job_id):
        scheduler.remove_job(job_id)

    scheduler.add_job(
        _send_push,
        trigger="date",
        run_date=due,
        args=[body.user_id, body.followup_id, body.title, body.body],
        id=job_id,
        misfire_grace_time=300,
    )
    return {"status": "scheduled", "run_at": due.isoformat()}


@router.post("/cancel")
def cancel_push(body: CancelPushRequest):
    job_id = f"followup_{body.followup_id}"
    if scheduler.get_job(job_id):
        scheduler.remove_job(job_id)
    return {"status": "cancelled"}
