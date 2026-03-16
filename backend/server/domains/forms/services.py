"""
Forms domain services with analytics and advanced features
"""
from typing import List, Optional, Dict, Any
from datetime import datetime
from .models import Form, FormField, FormSubmission, FieldType
from ...shared.persistence import JSONPersistenceMixin


class FormRepository(JSONPersistenceMixin):
    """Repository for forms, fields, and submissions"""
    
    FILENAME = "forms.json"
    
    def __init__(self):
        self.forms = {}
        self.fields = {}
        self.submissions = {}
        self.form_versions = {}  # Track form history
        super().__init__()
    
    def save_form(self, form: Form) -> Form:
        """Save form and track version"""
        self.forms[form.id] = form
        
        # Create version record
        version_num = len([v for v in self.form_versions.values() if v.get('form_id') == form.id]) + 1
        version_id = f"{form.id}_v{version_num}"
        self.form_versions[version_id] = {
            'id': version_id,
            'form_id': form.id,
            'version': version_num,
            'created_at': datetime.utcnow().isoformat(),
            'snapshot': form.to_dict() if hasattr(form, 'to_dict') else form.__dict__
        }
        
        self._save_to_file()
        return form
    
    def get_form(self, form_id: str) -> Optional[Form]:
        return self.forms.get(form_id)
    
    def list_company_forms(self, company_id: str) -> List[Form]:
        return [f for f in self.forms.values() if f.company_id == company_id]
    
    def save_field(self, field: FormField) -> FormField:
        self.fields[field.id] = field
        self._save_to_file()
        return field
    
    def get_form_fields(self, form_id: str) -> List[FormField]:
        fields = [f for f in self.fields.values() if f.form_id == form_id]
        return sorted(fields, key=lambda x: x.order)
    
    def save_submission(self, submission: FormSubmission) -> FormSubmission:
        self.submissions[submission.id] = submission
        self._save_to_file()
        return submission
    
    def get_submissions_for_form(self, form_id: str) -> List[FormSubmission]:
        return [s for s in self.submissions.values() if s.form_id == form_id]
    
    def get_submissions_for_lead(self, lead_id: str) -> List[FormSubmission]:
        return [s for s in self.submissions.values() if s.lead_id == lead_id]
    
    def get_form_versions(self, form_id: str) -> List[Dict]:
        versions = [v for v in self.form_versions.values() if v.get('form_id') == form_id]
        return sorted(versions, key=lambda x: x.get('version', 0), reverse=True)
    
    def _load_data(self, data: dict):
        """Load forms from JSON data"""
        for form_data in data.get('forms', []):
            try:
                form = Form(**form_data)
                self.forms[form.id] = form
            except Exception as e:
                print(f"Warning: Could not load form {form_data.get('id')}: {e}")
        
        for field_data in data.get('fields', []):
            try:
                field = FormField(**field_data)
                self.fields[field.id] = field
            except Exception as e:
                print(f"Warning: Could not load field {field_data.get('id')}: {e}")
        
        for submission_data in data.get('submissions', []):
            try:
                submission = FormSubmission(**submission_data)
                self.submissions[submission.id] = submission
            except Exception as e:
                print(f"Warning: Could not load submission {submission_data.get('id')}: {e}")
        
        for version_data in data.get('versions', []):
            try:
                self.form_versions[version_data.get('id')] = version_data
            except Exception as e:
                print(f"Warning: Could not load version {version_data.get('id')}: {e}")
    
    def _get_data(self) -> dict:
        """Get data as dictionary for JSON serialization"""
        return {
            'forms': [f.to_dict() if hasattr(f, 'to_dict') else f.__dict__ 
                     for f in self.forms.values() if not f.deleted_at],
            'fields': [f.to_dict() if hasattr(f, 'to_dict') else f.__dict__ 
                      for f in self.fields.values() if not f.deleted_at],
            'submissions': [s.to_dict() if hasattr(s, 'to_dict') else s.__dict__ 
                           for s in self.submissions.values() if not s.deleted_at],
            'versions': list(self.form_versions.values())
        }


class FormService:
    """Form management service with advanced features"""
    
    def __init__(self, repo: FormRepository = None):
        self.repo = repo or FormRepository()
    
    def create_form(self, company_id: str, name: str, **kwargs) -> Form:
        """Create new form"""
        form = Form(company_id=company_id, name=name, **kwargs)
        return self.repo.save_form(form)
    
    def update_form(self, form_id: str, **kwargs) -> Optional[Form]:
        """Update form"""
        form = self.repo.get_form(form_id)
        if not form:
            return None
        
        for key, value in kwargs.items():
            if hasattr(form, key):
                setattr(form, key, value)
        
        return self.repo.save_form(form)
    
    def get_form(self, form_id: str) -> Optional[Form]:
        """Get form with fields"""
        form = self.repo.get_form(form_id)
        if not form:
            return None
        return form
    
    def list_company_forms(self, company_id: str) -> List[Dict]:
        """List all forms for company"""
        forms = self.repo.list_company_forms(company_id)
        return [f.to_dict() if hasattr(f, 'to_dict') else f.__dict__ for f in forms]
    
    def add_field(self, form_id: str, label: str, field_type: str, **kwargs) -> FormField:
        """Add field to form"""
        field = FormField(form_id=form_id, label=label, field_type=field_type, **kwargs)
        return self.repo.save_field(field)
    
    def update_field(self, field_id: str, **kwargs) -> Optional[FormField]:
        """Update form field"""
        for field in self.repo.fields.values():
            if field.id == field_id:
                for key, value in kwargs.items():
                    if hasattr(field, key):
                        setattr(field, key, value)
                return self.repo.save_field(field)
        return None
    
    def delete_field(self, field_id: str) -> bool:
        """Delete form field"""
        if field_id in self.repo.fields:
            del self.repo.fields[field_id]
            self.repo._save_to_file()
            return True
        return False
    
    def submit_form(self, form_id: str, lead_id: str, user_id: str, 
                   data: Dict[str, Any], company_id: str = None) -> FormSubmission:
        """Submit form and create submission record"""
        submission = FormSubmission(
            form_id=form_id,
            lead_id=lead_id,
            user_id=user_id,
            company_id=company_id,
            data=data
        )
        saved_submission = self.repo.save_submission(submission)
        
        # Log activity for form submission
        try:
            from server.domains.activities.services import ActivityService
            from server.domains.activities.models import ActivityType
            activity_service = ActivityService()
            
            # Get form name for description
            form = self.repo.get_form(form_id)
            form_name = form.name if form else 'Unknown Form'
            
            activity_service.log_activity(
                company_id=company_id,
                user_id=user_id,
                activity_type=ActivityType.FORM_SUBMITTED,
                entity_type='lead',
                entity_id=lead_id,
                description=f'Form "{form_name}" submitted',
                metadata={'form_id': form_id, 'submission_id': saved_submission.id}
            )
        except Exception as e:
            print(f"Failed to log form submission activity: {e}")
        
        return saved_submission
    
    def get_form_analytics(self, form_id: str) -> Dict:
        """Get analytics for form"""
        submissions = self.repo.get_submissions_for_form(form_id)
        fields = self.repo.get_form_fields(form_id)
        
        # Field completion stats
        field_completion = {}
        for field in fields:
            completed = len([s for s in submissions if field.label in s.data and s.data[field.label]])
            field_completion[field.label] = {
                'field_type': field.field_type,
                'total_submissions': len(submissions),
                'completed': completed,
                'completion_rate': completed / len(submissions) if submissions else 0,
                'empty_rate': (len(submissions) - completed) / len(submissions) if submissions else 0
            }
        
        # Time-based stats
        submissions_by_day = {}
        for submission in submissions:
            try:
                created = datetime.fromisoformat(str(submission.created_at).replace('Z', '+00:00'))
                day = created.date()
                submissions_by_day[str(day)] = submissions_by_day.get(str(day), 0) + 1
            except:
                pass
        
        return {
            'form_id': form_id,
            'total_submissions': len(submissions),
            'field_completion': field_completion,
            'submissions_by_day': submissions_by_day,
            'avg_fields_completed': sum(f['completed'] for f in field_completion.values()) / len(field_completion) if field_completion else 0,
            'avg_completion_rate': sum(f['completion_rate'] for f in field_completion.values()) / len(field_completion) if field_completion else 0
        }
    
    def get_field_analytics(self, field_id: str) -> Dict:
        """Get analytics for specific field"""
        # Find field
        field = None
        for f in self.repo.fields.values():
            if f.id == field_id:
                field = f
                break
        
        if not field:
            return {}
        
        submissions = self.repo.get_submissions_for_form(field.form_id)
        
        completed = [s for s in submissions if field.label in s.data and s.data[field.label]]
        
        # Value distribution
        value_counts = {}
        for submission in completed:
            value = submission.data.get(field.label)
            if value:
                value_counts[str(value)] = value_counts.get(str(value), 0) + 1
        
        return {
            'field_id': field_id,
            'field_label': field.label,
            'field_type': field.field_type,
            'total_submissions': len(submissions),
            'completed': len(completed),
            'completion_rate': len(completed) / len(submissions) if submissions else 0,
            'value_distribution': value_counts,
            'required': field.required
        }
    
    def get_form_versions(self, form_id: str) -> List[Dict]:
        """Get version history for form"""
        return self.repo.get_form_versions(form_id)
    
    def compare_versions(self, form_id: str, version1: int, version2: int) -> Dict:
        """Compare two versions of a form"""
        versions = self.get_form_versions(form_id)
        
        v1 = next((v for v in versions if v.get('version') == version1), None)
        v2 = next((v for v in versions if v.get('version') == version2), None)
        
        if not v1 or not v2:
            return {}
        
        return {
            'version1': v1['version'],
            'version1_created': v1['created_at'],
            'version2': v2['version'],
            'version2_created': v2['created_at'],
            'v1_snapshot': v1['snapshot'],
            'v2_snapshot': v2['snapshot']
        }
    
    def get_lead_form_history(self, lead_id: str) -> List[Dict]:
        """Get all form submissions for a lead"""
        submissions = self.repo.get_submissions_for_lead(lead_id)
        history = []
        
        for submission in submissions:
            form = self.repo.get_form(submission.form_id)
            history.append({
                'submission_id': submission.id,
                'form_id': submission.form_id,
                'form_name': form.name if form else 'Unknown',
                'submitted_at': str(submission.created_at),
                'submitted_by': submission.user_id,
                'data': submission.data
            })
        
        return sorted(history, key=lambda x: x['submitted_at'], reverse=True)
    
    def clone_form(self, form_id: str, new_name: str) -> Optional[Form]:
        """Clone a form with all fields"""
        original_form = self.repo.get_form(form_id)
        if not original_form:
            return None
        
        # Create new form
        new_form = Form(
            company_id=original_form.company_id,
            name=new_name,
            description=original_form.description,
            form_type=original_form.form_type,
            assigned_to_stage=original_form.assigned_to_stage
        )
        saved_form = self.repo.save_form(new_form)
        
        # Clone fields
        original_fields = self.repo.get_form_fields(form_id)
        for field in original_fields:
            field_copy = FormField(
                form_id=saved_form.id,
                label=field.label,
                field_type=field.field_type,
                placeholder=field.placeholder,
                help_text=field.help_text,
                required=field.required,
                readonly=field.readonly,
                order=field.order,
                options=field.options,
                min_length=field.min_length,
                max_length=field.max_length,
                pattern=field.pattern,
                conditional_field_id=field.conditional_field_id,
                conditional_value=field.conditional_value
            )
            self.repo.save_field(field_copy)
        
        return saved_form
    
    def delete_form(self, form_id: str) -> bool:
        """Delete form and all related data"""
        if form_id not in self.repo.forms:
            return False
        
        # Delete form
        del self.repo.forms[form_id]
        
        # Delete fields
        fields_to_delete = [f.id for f in self.repo.fields.values() if f.form_id == form_id]
        for field_id in fields_to_delete:
            del self.repo.fields[field_id]
        
        self.repo._save_to_file()
        return True
