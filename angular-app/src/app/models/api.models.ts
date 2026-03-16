// Auth Models
export interface User {
  id?: string;
  user_id?: string;
  email: string;
  name?: string;
  first_name?: string;
  last_name?: string;
  company_id: string;
  role?: string;
  roles?: string[];
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  status: string;
  data: {
    user_id: string;
    email: string;
    company_id: string;
    company_slug?: string;
    name?: string;
    first_name?: string;
    last_name?: string;
    role?: string;
    roles?: string[];
  };
  access_token: string;
  refresh_token: string;
  token_type?: string;
  expires_in?: number;
  session_id?: string;
}

// Company/Tenant Models
export interface Company {
  id: string;
  name: string;
  slug: string;
  industry: string;
  subscription_plan: string;
  created_at: string;
  status: string;
}

// Lead Models
export interface Lead {
  id: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  company_id: string;
  name: string;
  email?: string;
  phone: string;
  source: string;
  source_id?: string;
  stage: string; // Can be UUID or stage name like "new"
  stage_id?: string; // For UI compatibility
  call_status?: string;
  campaign_id?: string;
  campaign_name?: string;
  location?: string;
  project?: string;
  title?: string;
  company_name?: string;
  company?: string;
  website?: string;
  description?: string;
  custom_fields?: Record<string, any>;
  assigned_to_team_id?: string;
  assigned_to_user_id?: string;
  assigned_to?: string; // For UI compatibility
  assigned_at?: string;
  assigned_team_members?: string[]; // Team members assigned at current stage
  owner_id?: string; // Lead owner - responsible throughout
  stakeholders?: Stakeholder[]; // All stakeholders for this lead
  next_followup?: Followup; // Next pending followup (single)
  last_contacted_at?: string; // When the lead was last contacted
  last_contact_type?: string; // Type of last contact: call, email, sms, message
  is_lost: boolean;
  is_won: boolean;
  won_at?: string;
  lost_at?: string;
  lost_reason?: string;
  status?: string; // Computed from is_lost/is_won
}

export interface CreateLeadRequest {
  name: string;
  phone: string;
  email?: string;
  title?: string;
  company?: string;
  website?: string;
  location?: string;
  source?: string;
  project?: string;
  campaign_name?: string;
  description?: string;
  stage_id?: string;
  custom_fields?: Record<string, string>;
  assigned_to_user_id?: string;
}

// Stage/Pipeline Models
export interface Stage {
  id: string;
  name: string;
  company_id?: string;
  order?: number;
  color?: string;
  form_id?: string; // Legacy field, kept for backward compatibility
  assignedForms?: Form[]; // Forms assigned to this stage (loaded separately)
  lead_count?: number;
  created_at?: string;
  // Matrix Model - Team-based assignment
  responsible_team_id?: string; // Team responsible for this stage
  responsible_user_ids?: string[]; // Specific team members (or all if not specified)
  // Stage visibility control - which roles can see this stage
  visible_to_roles?: string[]; // ['owner', 'quotation_team', 'site_engineer', etc.]
  visible_to_stage_ids?: string[]; // Alternative: specify stages that can see this stage's work
}

// Stage Visibility Policy - define cross-stage visibility
export interface StageVisibilityPolicy {
  role: string; // 'owner', 'quotation_team', 'site_engineer', 'accounts', 'drawing_engineer', 'observer'
  visible_stage_ids: string[]; // Which stage IDs this role can view
  visible_to_self_only?: boolean; // Can only see their own stage
}

// Team Models
export interface Team {
  id: string;
  name: string;
  company_id: string;
  manager_id?: string;
  team_lead_id?: string | null;
  member_count?: number;
  description?: string;
  members?: TeamMember[];
  created_at: string;
}

export interface TeamMember {
  id: string;
  user_id?: string;
  team_id?: string;
  role?: string;
  user?: User;
}

// Stakeholder Models
export interface Stakeholder {
  id: string;
  lead_id: string;
  user_id: string;
  user?: User;
  stage_id?: string;
  role: string; // 'owner', 'quotation_team', 'site_engineer', 'accounts', 'drawing_engineer', 'observer'
  joined_at: string;
  forms_filled: string[];
  is_active: boolean;
  removed_at?: string;
  notes?: string;
}

// Form Models
export interface Form {
  id: string;
  name: string;
  company_id: string;
  description?: string;
  status: string;
  field_count?: number;
  fields?: FormField[];
  created_at: string;
  // Optional assignment metadata
  _assignmentId?: string;
  _isRequired?: boolean;
  // Form visibility control
  hidden_from_stages?: string[]; // Stage IDs where form is hidden
}

export interface FormField {
  id: string;
  form_id?: string;
  name?: string;
  label: string;
  field_type: string;
  placeholder?: string;
  is_required?: boolean;
  required?: boolean;
  help_text?: string;
  readonly?: boolean;
  order?: number;
  options?: Array<{ label: string; value: string }>;
  min_length?: number;
  max_length?: number;
  pattern?: string;
  conditional_field_id?: string;
  conditional_value?: string;
  // File upload
  allowed_file_types?: string[];
  max_file_size_mb?: number;
  // Rating/Slider
  min_rating?: number;
  max_rating?: number;
  rating_labels?: { [key: number]: string };
  min_value?: number;
  max_value?: number;
  // Likert scale
  likert_options?: string[];
  // Date
  date_format?: string;
  allow_past_dates?: boolean;
  allow_future_dates?: boolean;
  // Reference
  reference_entity_type?: string;
  reference_filter?: { [key: string]: any };
  // Autocomplete
  autocomplete_source?: string;
  autocomplete_fields?: string[];
  // Table
  table_rows?: string[];
  table_columns?: string[];
  // Template
  template_variables?: string[];
  default_template?: string;
  // Rich text
  rich_text_toolbar?: string[];
  // Color
  color_format?: string;
  color_palette?: string[];
  // Location
  map_provider?: string;
  enable_search?: boolean;
  default_zoom?: number;
  auto_capture_geolocation?: boolean;
  is_hidden?: boolean;
  required_accuracy_meters?: number;
  capture_method?: string;
}

// Assignment Models
export interface Assignment {
  id: string;
  title: string;
  description: string;
  assigned_to: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  due_date: string;
  created_at: string;
}

// Followup Models
export interface Followup {
  id: string;
  lead_id: string;
  scheduled_for: string;
  type: string;
  followup_type?: string;
  subject?: string;
  title?: string;
  body?: string;
  notes?: string;
  status: string;
  created_at: string;
  completed_at?: string;
  outcome?: string;
}

// Activity Models
export interface Activity {
  id: string;
  user_id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  changes: Record<string, any>;
  created_at: string;
}

// Generic Response Models
export interface ApiResponse<T> {
  status: 'success' | 'error';
  data?: T;
  detail?: string;
}

export interface PaginatedResponse<T> {
  status: 'success' | 'error';
  data: T[];
  pagination?: {
    skip: number;
    limit: number;
    total?: number;
  };
}

// Notes and Communication Models
export interface LeadNote {
  id: string;
  lead_id: string;
  content: string;
  author_id: string;
  author_name: string;
  created_at: string;
  updated_at: string;
}

export interface LeadCommunication {
  id: string;
  lead_id: string;
  type: 'call' | 'email' | 'sms' | 'message' | 'note';
  message: string;
  created_at: string;
  user_id: string;
  user_name?: string;
}
