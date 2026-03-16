"""
Comment repository - persistence layer for comments
"""
from pathlib import Path
import json
from typing import List, Optional
from .models import Comment


class CommentRepository:
    """Comment repository"""
    
    def __init__(self):
        self.data_dir = Path(__file__).parent.parent.parent.parent.parent / "data"
        self.data_dir.mkdir(parents=True, exist_ok=True)
        self.file_path = self.data_dir / "comments.json"
        self._load_data()
    
    def _load_data(self):
        """Load comments from file"""
        if self.file_path.exists():
            with open(self.file_path, 'r') as f:
                self.data = json.load(f)
        else:
            self.data = {}
    
    def _save_data(self):
        """Save comments to file"""
        with open(self.file_path, 'w') as f:
            json.dump(self.data, f, indent=2, default=str)
    
    def save(self, comment: Comment) -> Comment:
        """Save comment"""
        self.data[comment.comment_id] = comment.to_dict()
        self._save_data()
        return comment
    
    def get_by_id(self, comment_id: str) -> Optional[Comment]:
        """Get comment by ID"""
        if comment_id in self.data:
            return Comment.from_dict(self.data[comment_id])
        return None
    
    def get_by_entity(self, entity_id: str, entity_type: str) -> List[Comment]:
        """Get comments for entity"""
        return [
            Comment.from_dict(data)
            for data in self.data.values()
            if data.get('entity_id') == entity_id and data.get('entity_type') == entity_type
        ]
    
    def delete(self, comment_id: str) -> bool:
        """Delete comment"""
        if comment_id in self.data:
            del self.data[comment_id]
            self._save_data()
            return True
        return False
