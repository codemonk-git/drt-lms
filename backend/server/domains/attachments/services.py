"""
Attachment services - business logic for file attachments
"""
from typing import List, Optional
from .models import Attachment
from .repositories import AttachmentRepository


class AttachmentService:
    """Attachment service - handles file uploads and management"""
    
    def __init__(self, repo: AttachmentRepository = None):
        self.repo = repo or AttachmentRepository()
    
    def upload_attachment(self,
                         entity_id: str,
                         entity_type: str,
                         filename: str,
                         file_type: str,
                         file_size: int = 0,
                         uploaded_by: str = None,
                         metadata: dict = None) -> Attachment:
        """Upload file attachment"""
        attachment = Attachment(
            entity_id=entity_id,
            entity_type=entity_type,
            filename=filename,
            file_type=file_type,
            file_size=file_size,
            uploaded_by=uploaded_by,
            metadata=metadata or {}
        )
        return self.repo.save(attachment)
    
    def get_entity_attachments(self, entity_id: str, entity_type: str) -> List[Attachment]:
        """Get all attachments for entity"""
        attachments = self.repo.get_by_entity(entity_id, entity_type)
        return sorted(attachments, key=lambda x: x.created_at, reverse=True)
    
    def get_attachment(self, attachment_id: str) -> Optional[Attachment]:
        """Get attachment by ID"""
        return self.repo.get_by_id(attachment_id)
    
    def delete_attachment(self, attachment_id: str) -> bool:
        """Delete attachment"""
        return self.repo.delete(attachment_id)
    
    def get_total_size(self, entity_id: str, entity_type: str) -> int:
        """Get total attachment size for entity"""
        attachments = self.get_entity_attachments(entity_id, entity_type)
        return sum(a.file_size for a in attachments)
