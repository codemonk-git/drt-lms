from fastapi import APIRouter, HTTPException, Query
from typing import List
from server.domains.bulk_operations.services import BulkOperationService
from server.domains.bulk_operations.repositories import BulkOperationRepository

router = APIRouter(prefix="", tags=["bulk_operations"])
bulk_service = BulkOperationService(BulkOperationRepository())

@router.get("/leads/batch")
def batch_get_leads(lead_ids: List[str] = Query(...)):
    try:
        leads = bulk_service.batch_get_leads(lead_ids)
        return {"status": "success", "data": leads}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/companies/batch")
def batch_get_companies(company_ids: List[str] = Query(...)):
    try:
        companies = bulk_service.batch_get_companies(company_ids)
        return {"status": "success", "data": companies}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/bulk-assign")
def bulk_assign(lead_ids: List[str], user_id: str):
    try:
        result = bulk_service.bulk_assign(lead_ids, user_id)
        return {"status": "success", "data": result}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
