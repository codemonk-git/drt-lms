"""
Comment services - business logic for comments and notes
"""
from typing import List, Optional
from datetime import datetime
from .models import Comment
from .repositories import CommentRepository


class CommentService:
    """Comment service - handles comments and internal notes"""
    
    def __init__(self, repo: CommentRepository = None):
        self.repo = repo or CommentRepository()
    
    def add_comment(self,
                   entity_id: str,
                   entity_type: str,
                   author_id: str,
                   text: str,
                   is_note: bool = False) -> Comment:
        """Add comment or internal note"""
        comment = Comment(
            entity_id=entity_id,
            entity_type=entity_type,
            author_id=author_id,
            text=text,
            is_note=is_note
        )
        saved_comment = self.repo.save(comment)
        
        # Log activity for notes (only if it's a note for a lead)
        if is_note and entity_type == 'lead':
            try:
                from server.domains.activities.services import ActivityService
                from server.domains.activities.models import ActivityType
                activity_service = ActivityService()
                
                # Get company_id from lead if possible
                try:
                    from server.domains.leads.repositories import LeadRepository
                    lead_repo = LeadRepository()
                    lead = lead_repo.get_by_id(entity_id)
                    company_id = lead.company_id if lead else 'unknown'
                except:
                    company_id = 'unknown'
                
                activity_service.log_activity(
                    company_id=company_id,
                    user_id=author_id,
                    activity_type=ActivityType.NOTE_ADDED,
                    entity_type='lead',
                    entity_id=entity_id,
                    description=f'Note added: {text[:100]}...' if len(text) > 100 else f'Note added: {text}',
                    metadata={'comment_id': saved_comment.id}
                )
            except Exception as e:
                print(f"Failed to log note activity: {e}")
        
        return saved_comment
    
    def get_entity_comments(self, entity_id: str, entity_type: str, include_notes: bool = False) -> List[Comment]:
        """Get comments for entity"""
        comments = self.repo.get_by_entity(entity_id, entity_type)
        if not include_notes:
            comments = [c for c in comments if not c.is_note]
        return sorted(comments, key=lambda x: x.created_at, reverse=True)
    
    def get_entity_notes(self, entity_id: str, entity_type: str) -> List[Comment]:
        """Get internal notes for entity"""
        comments = self.repo.get_by_entity(entity_id, entity_type)
        return [c for c in comments if c.is_note]
    
    def get_comment(self, comment_id: str) -> Optional[Comment]:
        """Get comment by ID"""
        return self.repo.get_by_id(comment_id)
    
    def delete_comment(self, comment_id: str) -> bool:
        """Delete comment"""
        return self.repo.delete(comment_id)
    
    def get_comment_count(self, entity_id: str, entity_type: str) -> int:
        """Get comment count for entity"""
        return len(self.get_entity_comments(entity_id, entity_type, include_notes=True))
