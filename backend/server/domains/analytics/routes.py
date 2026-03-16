from fastapi import APIRouter, HTTPException
from typing import Optional
from server.domains.analytics.services import AnalyticsService
from server.domains.leads.services import LeadService
from server.domains.leads.repositories import LeadRepository

router = APIRouter(prefix="/reports", tags=["analytics"])
analytics_service = AnalyticsService()
lead_service = LeadService(LeadRepository())

@router.get("/lead-conversion")
def get_lead_conversion_report(company_id: Optional[str] = None):
    try:
        leads = lead_service.get_all_leads() if not company_id else lead_service.get_company_leads(company_id)
        report = analytics_service.get_lead_conversion_report(leads)
        return {"status": "success", "data": report}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/pipeline-value")
def get_pipeline_value_report(company_id: Optional[str] = None):
    try:
        leads = lead_service.get_all_leads() if not company_id else lead_service.get_company_leads(company_id)
        report = analytics_service.get_pipeline_value_report(leads)
        return {"status": "success", "data": report}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/user-performance")
def get_user_performance_report(user_id: Optional[str] = None):
    try:
        report = analytics_service.get_user_performance_report(user_id)
        return {"status": "success", "data": report}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/activity-summary")
def get_activity_summary_report(company_id: Optional[str] = None):
    try:
        report = analytics_service.get_activity_summary(company_id)
        return {"status": "success", "data": report}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
