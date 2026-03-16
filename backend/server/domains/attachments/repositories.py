"""
Attachment repository - persistence layer for attachments
"""
from pathlib import Path
import json
from typing import List, Optional
from .models import Attachment


class AttachmentRepository:
    """Attachment repository"""
    
    def __init__(self):
        self.data_dir = Path(__file__).parent.parent.parent.parent.parent / "data"
        self.data_dir.mkdir(parents=True, exist_ok=True)
        self.file_path = self.data_dir / "attachments.json"
        self._load_data()
    
    def _load_data(self):
        """Load attachments from file"""
        if self.file_path.exists():
            with open(self.file_path, 'r') as f:
                self.data = json.load(f)
        else:
            self.data = {}
    
    def _save_data(self):
        """Save attachments to file"""
        with open(self.file_path, 'w') as f:
            json.dump(self.data, f, indent=2, default=str)
    
    def save(self, attachment: Attachment) -> Attachment:
        """Save attachment"""
        self.data[attachment.attachment_id] = attachment.to_dict()
        self._save_data()
        return attachment
    
    def get_by_id(self, attachment_id: str) -> Optional[Attachment]:
        """Get attachment by ID"""
        if attachment_id in self.data:
            return Attachment.from_dict(self.data[attachment_id])
        return None
    
    def get_by_entity(self, entity_id: str, entity_type: str) -> List[Attachment]:
        """Get attachments for entity"""
        return [
            Attachment.from_dict(data)
            for data in self.data.values()
            if data.get('entity_id') == entity_id and data.get('entity_type') == entity_type
        ]
    
    def delete(self, attachment_id: str) -> bool:
        """Delete attachment"""
        if attachment_id in self.data:
            del self.data[attachment_id]
            self._save_data()
            return True
        return False
