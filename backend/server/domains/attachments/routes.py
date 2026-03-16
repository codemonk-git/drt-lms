from fastapi import APIRouter, HTTPException
from server.domains.attachments.services import AttachmentService
from server.domains.attachments.repositories import AttachmentRepository

router = APIRouter(prefix="", tags=["attachments"])
attachment_service = AttachmentService(AttachmentRepository())

@router.post("/attachments/upload")
def upload_attachment(lead_id: str, filename: str, file_type: str):
    try:
        attachment = attachment_service.upload_attachment(lead_id, "lead", filename, file_type)
        return {"status": "success", "data": attachment}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/attachments/{attachment_id}")
def get_attachment(attachment_id: str):
    try:
        attachment = attachment_service.get_attachment(attachment_id)
        if not attachment:
            raise HTTPException(status_code=404, detail="Attachment not found")
        return {"status": "success", "data": attachment}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/attachments/{attachment_id}")
def delete_attachment(attachment_id: str):
    try:
        attachment_service.delete_attachment(attachment_id)
        return {"status": "success", "message": "Attachment deleted"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
