from fastapi import APIRouter, HTTPException, Query, Body
from pydantic import BaseModel
from server.domains.comments.services import CommentService
from server.domains.comments.repositories import CommentRepository

router = APIRouter(prefix="", tags=["comments"])
comment_service = CommentService(CommentRepository())


class AddCommentRequest(BaseModel):
    entity_id: str
    entity_type: str
    author_id: str
    text: str
    is_note: bool = False


@router.post("/comments")
def add_comment(request: AddCommentRequest):
    try:
        comment = comment_service.add_comment(
            entity_id=request.entity_id,
            entity_type=request.entity_type,
            author_id=request.author_id,
            text=request.text,
            is_note=request.is_note
        )
        return {"status": "success", "data": comment.to_dict() if hasattr(comment, 'to_dict') else comment.__dict__}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/comments")
def get_comments(entity_id: str = None, entity_type: str = None, skip: int = Query(0), limit: int = Query(10)):
    try:
        if not entity_id or not entity_type:
            raise HTTPException(status_code=400, detail="entity_id and entity_type are required")
        
        comments = comment_service.get_entity_comments(entity_id, entity_type, include_notes=True)
        # Apply skip/limit pagination
        paginated = comments[skip:skip + limit]
        return {"status": "success", "data": [c.to_dict() if hasattr(c, 'to_dict') else c.__dict__ for c in paginated]}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/comments/{comment_id}")
def delete_comment(comment_id: str):
    try:
        comment_service.delete_comment(comment_id)
        return {"status": "success", "message": "Comment deleted"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
