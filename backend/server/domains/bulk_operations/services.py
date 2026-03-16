"""
Bulk operations service - handles bulk import, update, delete
"""
from typing import List, Dict, Any, Optional
from datetime import datetime


class BulkImportLog:
    """Track bulk import operations"""
    
    def __init__(self,
                 batch_id: str,
                 entity_type: str,
                 total_count: int,
                 successful_count: int = 0,
                 failed_count: int = 0,
                 errors: List[Dict] = None):
        self.batch_id = batch_id
        self.entity_type = entity_type
        self.total_count = total_count
        self.successful_count = successful_count
        self.failed_count = failed_count
        self.errors = errors or []
        self.created_at = datetime.utcnow()
    
    def to_dict(self):
        return {
            "batch_id": self.batch_id,
            "entity_type": self.entity_type,
            "total_count": self.total_count,
            "successful_count": self.successful_count,
            "failed_count": self.failed_count,
            "error_count": len(self.errors),
            "errors": self.errors,
            "created_at": self.created_at.isoformat()
        }


class BulkOperationService:
    """Service for bulk operations"""
    
    def __init__(self):
        self.logs = {}
    
    def create_import_batch(self,
                           entity_type: str,
                           total_count: int) -> str:
        """Create import batch and return batch ID"""
        import uuid
        batch_id = f"batch_{uuid.uuid4().hex[:8]}"
        self.logs[batch_id] = BulkImportLog(batch_id, entity_type, total_count)
        return batch_id
    
    def record_success(self, batch_id: str) -> None:
        """Record successful import"""
        if batch_id in self.logs:
            self.logs[batch_id].successful_count += 1
    
    def record_error(self, batch_id: str, error: Dict) -> None:
        """Record import error"""
        if batch_id in self.logs:
            self.logs[batch_id].failed_count += 1
            self.logs[batch_id].errors.append(error)
    
    def get_batch_status(self, batch_id: str) -> Optional[Dict]:
        """Get batch import status"""
        if batch_id in self.logs:
            return self.logs[batch_id].to_dict()
        return None
    
    def get_completion_percentage(self, batch_id: str) -> float:
        """Get batch completion percentage"""
        if batch_id in self.logs:
            log = self.logs[batch_id]
            processed = log.successful_count + log.failed_count
            if log.total_count == 0:
                return 0
            return (processed / log.total_count) * 100
        return 0
