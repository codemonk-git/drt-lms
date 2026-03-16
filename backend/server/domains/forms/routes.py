from fastapi import APIRouter, HTTPException, Query, Depends, Body, Header, Request
from pydantic import BaseModel
from typing import Optional, Dict, Any
from server.domains.forms.services import FormRepository, FormService
from server.domains.leads.repositories import LeadRepository
from server.dependencies import get_company_id, get_user_id

router = APIRouter(prefix="/forms", tags=["forms"])
form_service = FormService(FormRepository())


# Request models
class CreateFormRequest(BaseModel):
    name: str
    description: Optional[str] = None
    form_type: str = "lead"
    assigned_to_stage: Optional[str] = None


class AddFieldRequest(BaseModel):
    label: str
    field_type: str
    placeholder: Optional[str] = None
    help_text: Optional[str] = None
    required: bool = False
    readonly: bool = False
    order: int = 0
    options: Optional[list] = None
    min_length: Optional[int] = None
    max_length: Optional[int] = None
    pattern: Optional[str] = None
    conditional_field_id: Optional[str] = None
    conditional_value: Optional[str] = None
    # Extended properties
    allowed_file_types: Optional[list] = None
    max_file_size_mb: Optional[int] = None
    min_rating: Optional[int] = None
    max_rating: Optional[int] = None
    min_value: Optional[float] = None
    max_value: Optional[float] = None
    likert_options: Optional[list] = None
    date_format: Optional[str] = None
    allow_past_dates: Optional[bool] = None
    allow_future_dates: Optional[bool] = None
    reference_entity_type: Optional[str] = None
    reference_filter: Optional[Dict[str, Any]] = None
    autocomplete_source: Optional[str] = None
    autocomplete_fields: Optional[list] = None
    table_rows: Optional[list] = None
    table_columns: Optional[list] = None
    template_variables: Optional[list] = None
    default_template: Optional[str] = None
    rich_text_toolbar: Optional[list] = None
    color_format: Optional[str] = None
    color_palette: Optional[list] = None
    map_provider: Optional[str] = None
    enable_search: Optional[bool] = None
    default_zoom: Optional[int] = None
    auto_capture_geolocation: Optional[bool] = None
    is_hidden: Optional[bool] = None
    required_accuracy_meters: Optional[int] = None
    capture_method: Optional[str] = None
    rating_labels: Optional[Dict[int, str]] = None


class SubmitFormRequest(BaseModel):
    lead_id: str
    data: Dict[str, Any]


# Form CRUD
@router.post("")
def create_form(request: CreateFormRequest, company_id: str = Depends(get_company_id)):
    """Create new form"""
    try:
        form = form_service.create_form(
            company_id=company_id,
            name=request.name,
            description=request.description,
            form_type=request.form_type,
            assigned_to_stage=request.assigned_to_stage
        )
        return {
            "status": "success",
            "data": form.to_dict() if hasattr(form, 'to_dict') else form.__dict__
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{form_id}")
def get_form(form_id: str, company_id: str = Depends(get_company_id)):
    """Get form with fields"""
    try:
        form = form_service.get_form(form_id)
        if not form:
            raise HTTPException(status_code=404, detail="Form not found")
        
        # Verify form belongs to this company
        if form.company_id != company_id:
            raise HTTPException(status_code=403, detail="Not authorized to access this form")
        
        fields = form_service.repo.get_form_fields(form_id)
        return {
            "status": "success",
            "data": {
                "form": form.to_dict() if hasattr(form, 'to_dict') else form.__dict__,
                "fields": [f.to_dict() if hasattr(f, 'to_dict') else f.__dict__ for f in fields]
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"ERROR in get_form: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Failed to get form: {str(e)}")


@router.get("")
def list_company_forms(company_id: str = Depends(get_company_id)):
    """List all forms for company"""
    try:
        forms = form_service.list_company_forms(company_id)
        return {"status": "success", "data": forms}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/{form_id}")
def update_form(form_id: str, request: CreateFormRequest, company_id: str = Depends(get_company_id)):
    """Update form"""
    try:
        form = form_service.get_form(form_id)
        if not form:
            raise HTTPException(status_code=404, detail="Form not found")
        if form.company_id != company_id:
            raise HTTPException(status_code=403, detail="Not authorized to update this form")
        
        form = form_service.update_form(
            form_id=form_id,
            name=request.name,
            description=request.description,
            form_type=request.form_type,
            assigned_to_stage=request.assigned_to_stage
        )
        return {
            "status": "success",
            "data": form.to_dict() if hasattr(form, 'to_dict') else form.__dict__
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{form_id}")
def delete_form(form_id: str, company_id: str = Depends(get_company_id)):
    """Delete form"""
    try:
        form = form_service.get_form(form_id)
        if not form:
            raise HTTPException(status_code=404, detail="Form not found")
        if form.company_id != company_id:
            raise HTTPException(status_code=403, detail="Not authorized to delete this form")
        
        success = form_service.delete_form(form_id)
        if not success:
            raise HTTPException(status_code=404, detail="Form not found")
        return {"status": "success", "message": "Form deleted"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/{form_id}/visibility")
def update_form_visibility(form_id: str, request: Request):
    """Update form visibility - hide from specific stages"""
    try:
        import asyncio
        data = asyncio.run(request.json())
        hidden_from_stages = data.get('hidden_from_stages', [])
        
        form = form_service.update_form(
            form_id=form_id,
            hidden_from_stages=hidden_from_stages
        )
        if not form:
            raise HTTPException(status_code=404, detail="Form not found")
        return {
            "status": "success",
            "data": form.to_dict() if hasattr(form, 'to_dict') else form.__dict__
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# Form Fields
@router.post("/{form_id}/fields")
def add_field(form_id: str, request: AddFieldRequest, company_id: str = Depends(get_company_id)):
    """Add field to form"""
    try:
        form = form_service.get_form(form_id)
        if not form:
            raise HTTPException(status_code=404, detail="Form not found")
        if form.company_id != company_id:
            raise HTTPException(status_code=403, detail="Not authorized to add fields to this form")
        
        field = form_service.add_field(
            form_id=form_id,
            label=request.label,
            field_type=request.field_type,
            placeholder=request.placeholder,
            help_text=request.help_text,
            required=request.required,
            readonly=request.readonly,
            order=request.order,
            options=request.options,
            min_length=request.min_length,
            max_length=request.max_length,
            pattern=request.pattern,
            conditional_field_id=request.conditional_field_id,
            conditional_value=request.conditional_value,
            # Extended properties
            allowed_file_types=request.allowed_file_types,
            max_file_size_mb=request.max_file_size_mb,
            min_rating=request.min_rating,
            max_rating=request.max_rating,
            min_value=request.min_value,
            max_value=request.max_value,
            likert_options=request.likert_options,
            date_format=request.date_format,
            allow_past_dates=request.allow_past_dates,
            allow_future_dates=request.allow_future_dates,
            reference_entity_type=request.reference_entity_type,
            reference_filter=request.reference_filter,
            autocomplete_source=request.autocomplete_source,
            autocomplete_fields=request.autocomplete_fields,
            table_rows=request.table_rows,
            table_columns=request.table_columns,
            template_variables=request.template_variables,
            default_template=request.default_template,
            rich_text_toolbar=request.rich_text_toolbar,
            color_format=request.color_format,
            color_palette=request.color_palette,
            auto_capture_geolocation=request.auto_capture_geolocation,
            is_hidden=request.is_hidden,
            capture_method=request.capture_method,
            required_accuracy_meters=request.required_accuracy_meters,
            map_provider=request.map_provider,
            rating_labels=request.rating_labels
        )
        return {
            "status": "success",
            "data": field.to_dict() if hasattr(field, 'to_dict') else field.__dict__
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{form_id}/fields")
def get_form_fields(form_id: str, company_id: str = Depends(get_company_id)):
    """Get all fields for form"""
    try:
        form = form_service.get_form(form_id)
        if not form:
            raise HTTPException(status_code=404, detail="Form not found")
        if form.company_id != company_id:
            raise HTTPException(status_code=403, detail="Not authorized to access this form's fields")
        
        fields = form_service.repo.get_form_fields(form_id)
        return {
            "status": "success",
            "data": [f.to_dict() if hasattr(f, 'to_dict') else f.__dict__ for f in fields]
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/{form_id}/fields/{field_id}")
def update_field(form_id: str, field_id: str, request: AddFieldRequest, company_id: str = Depends(get_company_id)):
    """Update form field"""
    try:
        form = form_service.get_form(form_id)
        if not form:
            raise HTTPException(status_code=404, detail="Form not found")
        if form.company_id != company_id:
            raise HTTPException(status_code=403, detail="Not authorized to update fields in this form")
        
        field = form_service.update_field(field_id, **request.dict(exclude_none=True))
        if not field:
            raise HTTPException(status_code=404, detail="Field not found")
        return {
            "status": "success",
            "data": field.to_dict() if hasattr(field, 'to_dict') else field.__dict__
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{form_id}/fields/{field_id}")
def delete_field(form_id: str, field_id: str, company_id: str = Depends(get_company_id)):
    """Delete form field"""
    try:
        form = form_service.get_form(form_id)
        if not form:
            raise HTTPException(status_code=404, detail="Form not found")
        if form.company_id != company_id:
            raise HTTPException(status_code=403, detail="Not authorized to delete fields from this form")
        
        success = form_service.delete_field(field_id)
        if not success:
            raise HTTPException(status_code=404, detail="Field not found")
        return {"status": "success", "message": "Field deleted"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# Form Submissions
@router.post("/{form_id}/submit")
def submit_form(form_id: str, company_id: str = Depends(get_company_id), user_id: str = Depends(get_user_id), request: SubmitFormRequest = Body(...)):
    """Submit form"""
    try:
        form = form_service.get_form(form_id)
        if not form:
            raise HTTPException(status_code=404, detail="Form not found")
        if form.company_id != company_id:
            raise HTTPException(status_code=403, detail="Not authorized to submit this form")
        
        submission = form_service.submit_form(
            form_id=form_id,
            lead_id=request.lead_id,
            user_id=user_id,
            company_id=company_id,
            data=request.data
        )
        return {
            "status": "success",
            "data": submission.to_dict() if hasattr(submission, 'to_dict') else submission.__dict__
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/lead/{lead_id}/history")
def get_lead_form_history(lead_id: str, company_id: str = Depends(get_company_id)):
    """Get form submission history for lead"""
    try:
        history = form_service.get_lead_form_history(lead_id, company_id)
        return {"status": "success", "data": history}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# Analytics
@router.get("/{form_id}/analytics")
def get_form_analytics(form_id: str, company_id: str = Depends(get_company_id)):
    """Get analytics for form"""
    try:
        form = form_service.get_form(form_id)
        if not form:
            raise HTTPException(status_code=404, detail="Form not found")
        if form.company_id != company_id:
            raise HTTPException(status_code=403, detail="Not authorized to view analytics")
        
        analytics = form_service.get_form_analytics(form_id)
        return {"status": "success", "data": analytics}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{form_id}/fields/{field_id}/analytics")
def get_field_analytics(form_id: str, field_id: str, company_id: str = Depends(get_company_id)):
    """Get analytics for specific field"""
    try:
        form = form_service.get_form(form_id)
        if not form:
            raise HTTPException(status_code=404, detail="Form not found")
        if form.company_id != company_id:
            raise HTTPException(status_code=403, detail="Not authorized to view analytics")
        
        analytics = form_service.get_field_analytics(field_id)
        if not analytics:
            raise HTTPException(status_code=404, detail="Field not found")
        return {"status": "success", "data": analytics}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# Versioning
@router.get("/{form_id}/versions")
def get_form_versions(form_id: str, company_id: str = Depends(get_company_id)):
    """Get version history for form"""
    try:
        form = form_service.get_form(form_id)
        if not form:
            raise HTTPException(status_code=404, detail="Form not found")
        if form.company_id != company_id:
            raise HTTPException(status_code=403, detail="Not authorized to view form history")
        
        versions = form_service.get_form_versions(form_id)
        return {"status": "success", "data": versions}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{form_id}/versions/compare")
def compare_form_versions(form_id: str, v1: int = Query(...), v2: int = Query(...), company_id: str = Depends(get_company_id)):
    """Compare two versions of a form"""
    try:
        form = form_service.get_form(form_id)
        if not form:
            raise HTTPException(status_code=404, detail="Form not found")
        if form.company_id != company_id:
            raise HTTPException(status_code=403, detail="Not authorized to view form history")
        
        comparison = form_service.compare_versions(form_id, v1, v2)
        if not comparison:
            raise HTTPException(status_code=400, detail="Invalid versions")
        return {"status": "success", "data": comparison}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# Form Templates
@router.post("/{form_id}/clone")
def clone_form(form_id: str, company_id: str = Depends(get_company_id), new_name: str = None):
    """Clone a form as template"""
    try:
        form = form_service.get_form(form_id)
        if not form:
            raise HTTPException(status_code=404, detail="Form not found")
        if form.company_id != company_id:
            raise HTTPException(status_code=403, detail="Not authorized to clone this form")
        
        cloned = form_service.clone_form(form_id, new_name or f"{form.name} (Copy)")
        if not cloned:
            raise HTTPException(status_code=404, detail="Form not found")
        return {
            "status": "success",
            "data": cloned.to_dict() if hasattr(cloned, 'to_dict') else cloned.__dict__
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
