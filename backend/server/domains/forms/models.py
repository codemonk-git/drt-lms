"""
Dynamic forms domain for customizable lead forms
"""
from datetime import datetime
from typing import Optional, List, Dict, Any
from enum import Enum
from ...shared.models import BaseModel


class FieldType(str, Enum):
    """Form field types"""
    # Basic Text Fields
    TEXT = "text"
    EMAIL = "email"
    PHONE = "phone"
    NUMBER = "number"
    URL = "url"
    
    # Text Areas
    TEXTAREA = "textarea"
    RICH_TEXT = "rich_text"
    
    # Selection Fields
    SELECT = "select"
    MULTI_SELECT = "multi_select"
    RADIO = "radio"
    CHECKBOX = "checkbox"
    TOGGLE = "toggle"
    COMBOBOX = "combobox"
    
    # Date/Time Fields
    DATE = "date"
    DATETIME = "datetime"
    TIME = "time"
    DATETIME_RANGE = "datetime_range"
    
    # Financial
    CURRENCY = "currency"
    
    # File & Media
    FILE = "file"
    IMAGE = "image"
    SIGNATURE = "signature"
    
    # Visual/Rating
    RATING = "rating"
    LIKERT_SCALE = "likert_scale"
    SLIDER = "slider"
    
    # Advanced
    COLOR = "color"
    LOCATION = "location"
    REFERENCE = "reference"
    TABLE = "table"
    AUTOCOMPLETE = "autocomplete"
    TEMPLATE_TEXT = "template_text"


class FormField(BaseModel):
    """Form field definition"""
    
    def __init__(self, form_id: Optional[str] = None, label: Optional[str] = None, field_type: Optional[str] = None, **kwargs):
        super().__init__(**kwargs)
        self.form_id = form_id or kwargs.get('form_id')
        self.label = label or kwargs.get('label')
        field_type_str = field_type or kwargs.get('field_type', 'text')
        self.field_type = FieldType[field_type_str.upper()] if isinstance(field_type_str, str) else field_type_str
        self.placeholder: Optional[str] = kwargs.get('placeholder')
        self.help_text: Optional[str] = kwargs.get('help_text')
        self.required: bool = kwargs.get('required', False)
        self.readonly: bool = kwargs.get('readonly', False)
        self.order: int = kwargs.get('order', 0)
        
        # For select, radio, checkbox, multi_select, combobox
        self.options: List[Dict[str, str]] = kwargs.get('options', [])
        
        # Validation
        self.min_length: Optional[int] = kwargs.get('min_length')
        self.max_length: Optional[int] = kwargs.get('max_length')
        self.pattern: Optional[str] = kwargs.get('pattern')  # Regex
        self.min_value: Optional[float] = kwargs.get('min_value')
        self.max_value: Optional[float] = kwargs.get('max_value')
        
        # Conditional visibility
        self.conditional_field_id: Optional[str] = kwargs.get('conditional_field_id')
        self.conditional_value: Optional[str] = kwargs.get('conditional_value')
        
        # File upload properties
        self.allowed_file_types: List[str] = kwargs.get('allowed_file_types', [])  # e.g., ['pdf', 'doc', 'docx']
        self.max_file_size_mb: Optional[int] = kwargs.get('max_file_size_mb')  # Max size in MB
        
        # Rating/Slider properties
        self.min_rating: int = kwargs.get('min_rating', 1)
        self.max_rating: int = kwargs.get('max_rating', 5)
        self.rating_labels: Dict[int, str] = kwargs.get('rating_labels', {})  # e.g., {1: 'Poor', 5: 'Excellent'}
        
        # Likert scale properties
        self.likert_options: List[str] = kwargs.get('likert_options', [])  # e.g., ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree']
        
        # Date range properties
        self.date_format: str = kwargs.get('date_format', 'YYYY-MM-DD')
        self.allow_past_dates: bool = kwargs.get('allow_past_dates', True)
        self.allow_future_dates: bool = kwargs.get('allow_future_dates', True)
        
        # Reference properties (link to another entity)
        self.reference_entity_type: Optional[str] = kwargs.get('reference_entity_type')  # e.g., 'lead', 'contact', 'company'
        self.reference_filter: Dict[str, Any] = kwargs.get('reference_filter', {})  # e.g., {'status': 'active'}
        
        # Autocomplete properties
        self.autocomplete_source: Optional[str] = kwargs.get('autocomplete_source')  # e.g., 'companies', 'contacts'
        self.autocomplete_fields: List[str] = kwargs.get('autocomplete_fields', [])  # Fields to search in
        
        # Table/Matrix properties
        self.table_rows: List[str] = kwargs.get('table_rows', [])  # Row labels
        self.table_columns: List[str] = kwargs.get('table_columns', [])  # Column labels
        
        # Template text properties
        self.template_variables: List[str] = kwargs.get('template_variables', [])  # e.g., ['{{company_name}}', '{{contact_name}}']
        self.default_template: Optional[str] = kwargs.get('default_template')
        
        # Rich text properties
        self.rich_text_toolbar: List[str] = kwargs.get('rich_text_toolbar', ['bold', 'italic', 'underline', 'link', 'list'])
        
        # Color picker properties
        self.color_format: str = kwargs.get('color_format', 'hex')  # hex, rgb, hsl
        self.color_palette: List[str] = kwargs.get('color_palette', [])  # Predefined colors
        
        # Location properties
        self.map_provider: str = kwargs.get('map_provider', 'google')  # google, mapbox, openstreetmap
        self.enable_search: bool = kwargs.get('enable_search', True)
        self.default_zoom: int = kwargs.get('default_zoom', 12)
        self.auto_capture_geolocation: bool = kwargs.get('auto_capture_geolocation', False)  # Auto-capture GPS from browser
        self.capture_method: str = kwargs.get('capture_method', 'manual')  # 'manual', 'geolocation', 'ip_based'
        self.is_hidden: bool = kwargs.get('is_hidden', False)  # Hide from UI, capture in background
        self.required_accuracy_meters: Optional[int] = kwargs.get('required_accuracy_meters')  # e.g., 50 for 50m accuracy


class Form(BaseModel):
    """Form definition"""
    
    def __init__(self, company_id: Optional[str] = None, name: Optional[str] = None, **kwargs):
        super().__init__(**kwargs)
        self.company_id = company_id or kwargs.get('company_id')
        self.name = name or kwargs.get('name')
        self.description: Optional[str] = kwargs.get('description')
        self.form_type: str = kwargs.get('form_type', 'lead')  # lead, stage, custom
        self.assigned_to_stage: Optional[str] = kwargs.get('assigned_to_stage')
        self.is_default: bool = kwargs.get('is_default', False)
        self.is_active: bool = kwargs.get('is_active', True)
        self.hidden_from_stages: List[str] = kwargs.get('hidden_from_stages', [])  # Stage IDs where form is hidden


class FormSubmission(BaseModel):
    """Form submission/response"""
    
    def __init__(self, form_id: Optional[str] = None, lead_id: Optional[str] = None, user_id: Optional[str] = None, **kwargs):
        super().__init__(**kwargs)
        self.form_id = form_id or kwargs.get('form_id')
        self.lead_id = lead_id or kwargs.get('lead_id')
        self.user_id = user_id or kwargs.get('user_id')  # Who filled the form
        self.company_id: str = kwargs.get('company_id')
        
        # Form data as key-value pairs
        self.data: Dict[str, Any] = kwargs.get('data', {})
        
        # Metadata
        self.stage_at_submission: Optional[str] = kwargs.get('stage_at_submission')
        self.is_readonly: bool = kwargs.get('is_readonly', False)
