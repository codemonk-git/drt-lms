from fastapi import APIRouter, HTTPException, Query, Body
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, date, timedelta
from server.domains.activities.services import ActivityService
from server.domains.activities.repositories import ActivityRepository
from server.domains.activities.models import ActivityType

router = APIRouter(prefix="", tags=["activities"])
activity_service = ActivityService(ActivityRepository())


class LogActivityRequest(BaseModel):
    company_id: str
    user_id: str
    activity_type: str
    entity_type: str
    entity_id: str
    description: str = None
    metadata: dict = None


@router.post("/activities")
def log_activity(request: LogActivityRequest):
    """Log a new activity"""
    try:
        # Convert string activity_type to enum if it's a valid type
        activity_type_str = request.activity_type.lower()
        try:
            activity_type = ActivityType[activity_type_str.upper()]
        except KeyError:
            # Try with value matching
            activity_type = activity_type_str
        
        activity = activity_service.log_activity(
            company_id=request.company_id,
            user_id=request.user_id,
            activity_type=activity_type,
            entity_type=request.entity_type,
            entity_id=request.entity_id,
            description=request.description,
            metadata=request.metadata or {}
        )
        serialized = activity.to_dict() if hasattr(activity, 'to_dict') else activity.__dict__
        return JSONResponse(content={"status": "success", "data": serialized})
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/companies/{company_id}/activities")
def get_company_activities(company_id: str, skip: int = Query(0), limit: int = Query(20)):
    try:
        activities = activity_service.get_company_activities(company_id, skip, limit)
        # Serialize activities to dictionaries
        serialized = [a.to_dict() if hasattr(a, 'to_dict') else a.__dict__ for a in activities]
        return JSONResponse(content={"status": "success", "data": serialized})
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/leads/{lead_id}/activities")
def get_lead_activities(lead_id: str, skip: int = Query(0), limit: int = Query(20)):
    try:
        activities = activity_service.get_lead_activities(lead_id, skip, limit)
        # Serialize activities to dictionaries
        serialized = [a.to_dict() if hasattr(a, 'to_dict') else a.__dict__ for a in activities]
        return JSONResponse(content={"status": "success", "data": serialized})
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/companies/{company_id}/activities/summary")
def get_activity_summary(
    company_id: str,
    date_from: Optional[str] = Query(None, description="Start date YYYY-MM-DD (default: today)"),
    date_to: Optional[str] = Query(None, description="End date YYYY-MM-DD (default: today)"),
    user_id: Optional[str] = Query(None, description="Filter by user ID"),
):
    """
    Return aggregated activity statistics for a company within a date range.
    Used by the Activity Report panel on the frontend.
    """
    try:
        # Parse date range
        today = date.today()
        if date_from:
            dt_from = datetime.strptime(date_from, "%Y-%m-%d")
        else:
            dt_from = datetime.combine(today, datetime.min.time())

        if date_to:
            dt_to = datetime.strptime(date_to, "%Y-%m-%d").replace(hour=23, minute=59, second=59)
        else:
            dt_to = datetime.combine(today, datetime.max.time().replace(microsecond=0))

        # Fetch all company activities and filter
        all_activities = activity_service.get_all_company_activities(company_id)

        def parse_dt(ts):
            if not ts:
                return None
            try:
                # Handle microseconds and timezone suffixes
                ts_clean = str(ts).split('+')[0].strip()
                for fmt in ("%Y-%m-%d %H:%M:%S.%f", "%Y-%m-%d %H:%M:%S", "%Y-%m-%dT%H:%M:%S.%f", "%Y-%m-%dT%H:%M:%S"):
                    try:
                        return datetime.strptime(ts_clean, fmt)
                    except ValueError:
                        continue
            except Exception:
                pass
            return None

        filtered = []
        for a in all_activities:
            if a.deleted_at:
                continue
            dt = parse_dt(a.created_at)
            if dt is None:
                continue
            if dt < dt_from or dt > dt_to:
                continue
            if user_id and a.user_id != user_id:
                continue
            filtered.append(a)

        # Count by type
        type_counts: dict = {}
        stage_changes: dict = {}   # stage_name -> count
        followup_types: dict = {}  # followup_type -> count
        by_user: dict = {}         # user_id -> { user_name, counts }

        for a in filtered:
            atype = a.activity_type
            if hasattr(atype, 'value'):
                atype = atype.value
            elif hasattr(atype, '_value_'):
                atype = atype._value_

            type_counts[atype] = type_counts.get(atype, 0) + 1

            # Stage changes breakdown
            if atype == 'lead_stage_changed':
                stage_name = (a.metadata or {}).get('new_stage_name', 'Unknown')
                stage_changes[stage_name] = stage_changes.get(stage_name, 0) + 1

            # Followup type breakdown
            if atype == 'followup_scheduled':
                ftype = (a.metadata or {}).get('followup_type', 'other')
                followup_types[ftype] = followup_types.get(ftype, 0) + 1

            # Per-user aggregation (use user_id + user_name)
            uid = a.user_id or 'system'
            uname = getattr(a, 'user_name', None) or uid
            if uid not in by_user:
                by_user[uid] = {
                    'user_id': uid,
                    'user_name': uname,
                    'total': 0,
                    'calls': 0,
                    'whatsapp': 0,
                    'stage_changes': 0,
                    'followups_scheduled': 0,
                    'new_leads': 0,
                    'assignments': 0,
                    'notes': 0,
                }
            entry = by_user[uid]
            entry['total'] += 1
            if atype == 'call_logged':
                entry['calls'] += 1
            elif atype == 'whatsapp_sent':
                entry['whatsapp'] += 1
            elif atype == 'lead_stage_changed':
                entry['stage_changes'] += 1
            elif atype == 'followup_scheduled':
                entry['followups_scheduled'] += 1
            elif atype == 'lead_created':
                entry['new_leads'] += 1
            elif atype in ('lead_assigned', 'lead_reassigned'):
                entry['assignments'] += 1
            elif atype == 'note_added':
                entry['notes'] += 1

        # Recent timeline (latest 50)
        recent = sorted(filtered, key=lambda a: str(a.created_at), reverse=True)[:50]
        timeline = []
        for a in recent:
            atype = a.activity_type
            if hasattr(atype, 'value'):
                atype = atype.value
            elif hasattr(atype, '_value_'):
                atype = atype._value_
            timeline.append({
                'id': a.id,
                'created_at': str(a.created_at),
                'user_id': a.user_id,
                'user_name': getattr(a, 'user_name', None) or a.user_id,
                'activity_type': atype,
                'description': a.description,
                'entity_id': a.entity_id,
                'metadata': a.metadata or {},
            })

        return JSONResponse(content={
            "status": "success",
            "data": {
                "total": len(filtered),
                "by_type": type_counts,
                "stage_changes": [{"stage": k, "count": v} for k, v in sorted(stage_changes.items(), key=lambda x: -x[1])],
                "followup_types": [{"type": k, "count": v} for k, v in sorted(followup_types.items(), key=lambda x: -x[1])],
                "by_user": sorted(by_user.values(), key=lambda x: -x['total']),
                "timeline": timeline,
                "date_from": dt_from.strftime("%Y-%m-%d"),
                "date_to": dt_to.strftime("%Y-%m-%d"),
            }
        })
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=str(e))
