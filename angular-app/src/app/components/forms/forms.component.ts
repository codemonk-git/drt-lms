import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectorRef,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormsModule,
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { FormService } from '../../services/form.service';
import { Form, FormField } from '../../models/api.models';
import { FormBuilderComponent } from './form-builder.component';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-forms',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, FormBuilderComponent],
  template: `
    <div class="forms-container">
      <!-- Main View -->
      <div *ngIf="!selectedForm">
        <div class="forms-header">
          <h2>Forms Management</h2>
          <button class="btn-primary" (click)="openNewFormForm()">+ New Form</button>
        </div>

        <!-- New Form Modal -->
        <div class="modal-overlay" *ngIf="showNewFormForm" (click)="closeNewFormForm()">
          <div class="modal" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h3>{{ editingForm ? 'Edit Form' : 'Create New Form' }}</h3>
              <button class="btn-close" (click)="closeNewFormForm()">×</button>
            </div>
            <form [formGroup]="formForm" (ngSubmit)="submitForm()">
              <div class="form-group">
                <label>Form Name *</label>
                <input type="text" formControlName="name" placeholder="Contact Form" />
                <span class="error" *ngIf="isFieldInvalid('name')">Required</span>
              </div>
              <div class="form-group">
                <label>Description</label>
                <textarea
                  formControlName="description"
                  placeholder="Form description..."
                  rows="4"
                ></textarea>
              </div>
              <div class="form-actions">
                <button type="submit" [disabled]="formForm.invalid || isCreating">
                  {{ isCreating ? 'Saving...' : editingForm ? 'Update Form' : 'Create Form' }}
                </button>
                <button type="button" (click)="closeNewFormForm()" class="btn-secondary">
                  Cancel
                </button>
              </div>
              <div class="error-message" *ngIf="formError">{{ formError }}</div>
            </form>
          </div>
        </div>

        <!-- Forms List -->
        <div class="forms-list">
          <div *ngFor="let form of forms" class="form-card">
            <div class="form-card-header">
              <h3>{{ form.name }}</h3>
              <div class="form-actions-header">
                <button (click)="viewForm(form)" class="btn-small">Manage</button>
                <button (click)="editForm(form)" class="btn-small">Edit</button>
                <button (click)="deleteForm(form.id)" class="btn-small btn-danger">Delete</button>
              </div>
            </div>
            <p class="form-description">{{ form.description || 'No description' }}</p>

            <!-- Form Fields -->
            <div class="form-fields">
              <h4>Fields ({{ form.fields?.length || 0 }})</h4>
              <div *ngIf="form.fields && form.fields.length > 0" class="fields-list">
                <div *ngFor="let field of form.fields" class="field-item">
                  <span class="field-label">{{ field.label }}</span>
                  <span class="field-type">{{ field.field_type }}</span>
                  <span class="field-required" *ngIf="field.is_required" title="Required">*</span>
                </div>
              </div>
              <p *ngIf="!form.fields || form.fields.length === 0" class="no-fields">
                No fields added yet
              </p>
            </div>

            <!-- Form Stats -->
            <div class="form-stats">
              <p>Created: {{ form.created_at | date: 'short' }}</p>
              <p>
                Status:
                <span class="status" [class]="'status-' + form.status">{{ form.status }}</span>
              </p>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div *ngIf="forms.length === 0 && !isLoading" class="empty-state">
          <p>No forms found. Create your first form!</p>
        </div>

        <!-- Loading State -->
        <div *ngIf="isLoading" class="loading">
          <p>Loading forms...</p>
        </div>
      </div>

      <!-- Form Detail View -->
      <div *ngIf="selectedForm" class="form-detail-view">
        <button class="btn-back" (click)="backToList()">← Back to Forms</button>
        <app-form-builder [form]="selectedForm"></app-form-builder>
      </div>
    </div>
  `,
  styles: [
    `
      .forms-container {
        padding: 20px;
        max-width: 1400px;
        margin: 0 auto;
      }

      .forms-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 30px;
      }

      .forms-header h2 {
        margin: 0;
        color: #1f2937;
        font-size: 32px;
        font-weight: 700;
      }

      .btn-primary {
        background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);
        color: white;
        border: none;
        padding: 12px 24px;
        border-radius: 6px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
        box-shadow: 0 2px 8px rgba(2, 132, 199, 0.2);
      }

      .btn-primary:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(2, 132, 199, 0.3);
      }

      .btn-primary-small {
        background: #0284c7;
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 4px;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
      }

      .btn-primary-small:hover {
        background: #0369a1;
      }

      .modal-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
      }

      .modal {
        background: white;
        border-radius: 12px;
        padding: 0;
        max-width: 600px;
        width: 90%;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        max-height: 90vh;
        overflow-y: auto;
      }

      .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 24px;
        border-bottom: 1px solid #e5e7eb;
        position: sticky;
        top: 0;
        background: white;
      }

      .modal-header h3 {
        margin: 0;
        color: #1f2937;
        font-size: 20px;
      }

      .btn-close {
        background: none;
        border: none;
        font-size: 28px;
        color: #6b7280;
        cursor: pointer;
        padding: 0;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .btn-close:hover {
        color: #1f2937;
      }

      .modal form {
        padding: 24px;
      }

      .form-group {
        margin-bottom: 20px;
      }

      .form-group label {
        display: block;
        margin-bottom: 8px;
        font-weight: 600;
        color: #374151;
        font-size: 14px;
      }

      .form-group input[type='checkbox'] {
        margin-right: 8px;
        cursor: pointer;
      }

      .form-group input[type='checkbox'] + label {
        display: inline;
        margin-bottom: 0;
      }

      .form-group input,
      .form-group textarea,
      .form-group select {
        width: 100%;
        padding: 10px 12px;
        border: 1.5px solid #d1d5db;
        border-radius: 6px;
        font-size: 14px;
        transition: all 0.2s;
        box-sizing: border-box;
        font-family: inherit;
      }

      .form-group input:focus,
      .form-group textarea:focus,
      .form-group select:focus {
        outline: none;
        border-color: #0284c7;
        box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.1);
      }

      .form-group .error {
        color: #ef4444;
        font-size: 12px;
        margin-top: 4px;
        display: block;
      }

      .form-actions {
        display: flex;
        gap: 12px;
        margin-top: 24px;
        padding-top: 24px;
        border-top: 1px solid #e5e7eb;
      }

      .form-actions button {
        flex: 1;
        padding: 10px 15px;
        border: none;
        border-radius: 6px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
      }

      .form-actions button[type='submit'] {
        background: #0284c7;
        color: white;
      }

      .form-actions button[type='submit']:hover {
        background: #0369a1;
      }

      .form-actions button[type='submit']:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }

      .btn-secondary {
        background: #e5e7eb;
        color: #1f2937;
      }

      .btn-secondary:hover {
        background: #d1d5db;
      }

      .error-message {
        color: #991b1b;
        margin-top: 15px;
        padding: 12px;
        background: #fee2e2;
        border-radius: 6px;
        font-size: 14px;
        border-left: 4px solid #ef4444;
      }

      .forms-list {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
        gap: 24px;
      }

      .form-card {
        background: white;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        padding: 24px;
        transition: all 0.2s;
      }

      .form-card:hover {
        border-color: #0284c7;
        box-shadow: 0 4px 16px rgba(2, 132, 199, 0.12);
      }

      .form-card-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 12px;
        margin-bottom: 12px;
      }

      .form-card-header h3 {
        margin: 0;
        color: #1f2937;
        flex: 1;
        font-size: 18px;
      }

      .form-actions-header {
        display: flex;
        gap: 8px;
      }

      .form-description {
        color: #6b7280;
        font-size: 14px;
        margin: 12px 0 16px;
        line-height: 1.5;
      }

      .form-fields {
        border-top: 1px solid #e5e7eb;
        padding-top: 16px;
        margin-bottom: 16px;
      }

      .form-fields h4 {
        margin: 0 0 12px 0;
        color: #374151;
        font-size: 13px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .fields-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .field-item {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 10px;
        background: #f9fafb;
        border-radius: 4px;
        font-size: 13px;
      }

      .field-label {
        flex: 1;
        color: #374151;
        font-weight: 500;
      }

      .field-type {
        background: #dbeafe;
        color: #0c4a6e;
        padding: 4px 8px;
        border-radius: 3px;
        font-size: 11px;
        font-weight: 600;
      }

      .field-required {
        color: #ef4444;
        font-weight: bold;
      }

      .no-fields {
        color: #9ca3af;
        font-size: 13px;
        margin: 0;
      }

      .form-stats {
        font-size: 12px;
        color: #6b7280;
        border-top: 1px solid #e5e7eb;
        padding-top: 12px;
      }

      .form-stats p {
        margin: 4px 0;
      }

      .status {
        display: inline-block;
        padding: 4px 8px;
        border-radius: 4px;
        font-weight: 600;
        font-size: 12px;
      }

      .status-active {
        background: #dcfce7;
        color: #165e31;
      }

      .status-draft {
        background: #fef3c7;
        color: #78350f;
      }

      .btn-small {
        padding: 6px 12px;
        background: #e5e7eb;
        border: none;
        border-radius: 4px;
        font-size: 12px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
      }

      .btn-small:hover {
        background: #d1d5db;
        color: #1f2937;
      }

      .btn-danger {
        background: #fee2e2;
        color: #991b1b;
      }

      .btn-danger:hover {
        background: #fecaca;
      }

      .btn-icon {
        background: none;
        border: none;
        font-size: 18px;
        cursor: pointer;
        padding: 0;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 4px;
        transition: all 0.2s;
      }

      .btn-icon:hover {
        background: #fee2e2;
      }

      .btn-back {
        background: #e5e7eb;
        border: none;
        padding: 8px 16px;
        border-radius: 4px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
        color: #1f2937;
      }

      .btn-back:hover {
        background: #d1d5db;
      }

      .empty-state {
        padding: 60px 40px;
        text-align: center;
        color: #6b7280;
        background: #f9fafb;
        border-radius: 8px;
        border: 2px dashed #d1d5db;
      }

      .loading {
        text-align: center;
        padding: 60px 40px;
        color: #6b7280;
      }

      /* Form Detail View */
      .form-detail-view {
        background: white;
        border-radius: 8px;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        height: 100%;
      }

      .btn-back {
        padding: 12px 20px;
        background: none;
        border: none;
        color: #0284c7;
        font-weight: 600;
        cursor: pointer;
        font-size: 14px;
        border-bottom: 1px solid #e5e7eb;
      }

      .btn-back:hover {
        color: #0369a1;
      }

      .detail-header {
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 24px;
        border-bottom: 1px solid #e5e7eb;
        background: #f9fafb;
      }

      .detail-header h2 {
        margin: 0;
        color: #1f2937;
        flex: 1;
        font-size: 28px;
      }

      .detail-actions {
        display: flex;
        gap: 12px;
      }

      .detail-content {
        padding: 24px;
      }

      .fields-section {
        background: white;
      }

      .section-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 24px;
        padding-bottom: 16px;
        border-bottom: 2px solid #e5e7eb;
      }

      .section-header h3 {
        margin: 0;
        color: #1f2937;
        font-size: 20px;
      }

      .fields-container {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
        gap: 16px;
      }

      .field-card {
        background: white;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        padding: 16px;
        transition: all 0.2s;
      }

      .field-card:hover {
        border-color: #0284c7;
        box-shadow: 0 4px 12px rgba(2, 132, 199, 0.1);
      }

      .field-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 12px;
      }

      .field-info h4 {
        margin: 0 0 4px 0;
        color: #1f2937;
        font-size: 16px;
      }

      .field-type-label {
        color: #0c4a6e;
        background: #dbeafe;
        display: inline-block;
        padding: 4px 8px;
        border-radius: 3px;
        font-size: 11px;
        font-weight: 600;
        margin: 0 0 8px 0;
      }

      .field-placeholder {
        color: #6b7280;
        font-size: 12px;
        margin: 0;
      }

      .field-meta {
        display: flex;
        gap: 8px;
        align-items: flex-start;
      }

      .badge {
        background: #dcfce7;
        color: #165e31;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 11px;
        font-weight: 600;
      }

      .empty-fields {
        padding: 40px;
        text-align: center;
        color: #6b7280;
        background: #f9fafb;
        border-radius: 8px;
        border: 2px dashed #d1d5db;
      }
    `,
  ],
})
export class FormsComponent implements OnInit, OnDestroy {
  forms: Form[] = [];
  selectedForm: Form | null = null;
  formForm: FormGroup;
  fieldForm: FormGroup;
  showNewFormForm = false;
  showAddFieldModal = false;
  isLoading = false;
  isCreating = false;
  isAddingField = false;
  formError = '';
  fieldError = '';
  editingForm: Form | null = null;
  private destroy$ = new Subject<void>();

  constructor(
    private formService: FormService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef,
  ) {
    this.formForm = this.fb.group({
      name: ['', Validators.required],
      description: [''],
    });
    this.fieldForm = this.fb.group({
      label: ['', Validators.required],
      field_type: ['', Validators.required],
      placeholder: [''],
      is_required: [false],
      // File upload
      allowed_file_types: [''],
      max_file_size_mb: [''],
      // Rating
      min_rating: [1],
      max_rating: [5],
      // Slider
      min_value: [0],
      max_value: [100],
      // Selection
      options_text: [''],
      // Location
      auto_capture_geolocation: [false],
      is_hidden: [false],
      // Likert scale
      likert_options: [''],
    });
  }

  ngOnInit(): void {
    this.loadForms();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadForms(): void {
    this.isLoading = true;
    this.formService
      .getForms(0, 100)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (forms) => {
          this.forms = forms;
          this.isLoading = false;
          this.cdr.markForCheck();
        },
        error: (error) => {
          this.isLoading = false;
          this.cdr.markForCheck();
        },
      });
  }

  openNewFormForm(): void {
    this.editingForm = null;
    this.showNewFormForm = true;
    this.formError = '';
    this.formForm.reset();
  }

  editForm(form: Form): void {
    this.editingForm = form;
    this.showNewFormForm = true;
    this.formError = '';
    this.formForm.patchValue({
      name: form.name,
      description: form.description,
    });
  }

  closeNewFormForm(): void {
    this.showNewFormForm = false;
    this.editingForm = null;
    this.formForm.reset();
    this.formError = '';
  }

  submitForm(): void {
    if (this.formForm.invalid) return;

    this.isCreating = true;
    const formValue = this.formForm.value;

    if (this.editingForm) {
      // Update existing form
      this.formService
        .updateForm(this.editingForm.id, formValue)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (updatedForm) => {
            const index = this.forms.findIndex((f) => f.id === this.editingForm!.id);
            if (index !== -1) {
              this.forms[index] = updatedForm;
            }
            this.closeNewFormForm();
            this.isCreating = false;
            this.cdr.markForCheck();
          },
          error: (error) => {
            this.formError = error.error?.detail || 'Failed to update form';
            this.isCreating = false;
            this.cdr.markForCheck();
          },
        });
    } else {
      // Create new form
      this.formService
        .createForm(formValue)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (form) => {
            this.forms.unshift(form);
            this.closeNewFormForm();
            this.isCreating = false;
            this.cdr.markForCheck();
          },
          error: (error) => {
            this.formError = error.error?.detail || 'Failed to create form';
            this.isCreating = false;
            this.cdr.markForCheck();
          },
        });
    }
  }

  viewForm(form: Form): void {
    // Load the form with all its fields
    this.formService
      .getForm(form.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (loadedForm) => {
          this.selectedForm = loadedForm;
          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error('Error loading form:', error);
          this.cdr.markForCheck();
        },
      });
  }

  editFormName(form: Form): void {
    this.editForm(form);
  }

  backToList(): void {
    this.selectedForm = null;
    // Reload forms to see any changes made in the builder
    this.loadForms();
    this.cdr.markForCheck();
  }

  openAddFieldModal(): void {
    this.showAddFieldModal = true;
    this.fieldError = '';
    this.fieldForm.reset();
  }

  onFieldTypeChange(): void {
    // Called when field type changes to show/hide relevant properties
    this.cdr.markForCheck();
  }

  closeAddFieldModal(): void {
    this.showAddFieldModal = false;
    this.fieldForm.reset();
    this.fieldError = '';
  }

  addField(): void {
    if (this.fieldForm.invalid || !this.selectedForm) return;

    this.isAddingField = true;
    let fieldValue = { ...this.fieldForm.value };

    // Transform options_text to options array for select/multi_select fields
    if (fieldValue.options_text) {
      fieldValue.options = fieldValue.options_text
        .split('\n')
        .filter((opt: string) => opt.trim())
        .map((opt: string) => ({
          label: opt.trim(),
          value: opt.trim().toLowerCase().replace(/\s+/g, '_'),
        }));
      delete fieldValue.options_text;
    }

    // Transform likert_options text to array
    if (fieldValue.likert_options) {
      fieldValue.likert_options = fieldValue.likert_options
        .split('\n')
        .filter((opt: string) => opt.trim());
    }

    // Transform allowed_file_types text to array
    if (fieldValue.allowed_file_types) {
      fieldValue.allowed_file_types = fieldValue.allowed_file_types
        .split(',')
        .map((type: string) => type.trim().toLowerCase());
    }

    this.formService
      .addFieldToForm(this.selectedForm.id, fieldValue)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (field) => {
          if (!this.selectedForm!.fields) {
            this.selectedForm!.fields = [];
          }
          this.selectedForm!.fields.push(field);

          // Update in forms list
          const formIndex = this.forms.findIndex((f) => f.id === this.selectedForm!.id);
          if (formIndex !== -1) {
            if (!this.forms[formIndex].fields) {
              this.forms[formIndex].fields = [];
            }
            this.forms[formIndex].fields.push(field);
          }

          this.closeAddFieldModal();
          this.isAddingField = false;
          this.cdr.markForCheck();
        },
        error: (error) => {
          this.fieldError = error.error?.detail || 'Failed to add field';
          this.isAddingField = false;
          this.cdr.markForCheck();
        },
      });
  }

  deleteField(fieldId: string): void {
    if (!this.selectedForm) return;
    if (!confirm('Are you sure you want to delete this field?')) return;

    this.formService
      .deleteFieldFromForm(this.selectedForm.id, fieldId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          if (this.selectedForm!.fields) {
            this.selectedForm!.fields = this.selectedForm!.fields.filter((f) => f.id !== fieldId);
          }

          // Update in forms list
          const formIndex = this.forms.findIndex((f) => f.id === this.selectedForm!.id);
          if (formIndex !== -1 && this.forms[formIndex].fields) {
            this.forms[formIndex].fields = this.forms[formIndex].fields.filter(
              (f) => f.id !== fieldId,
            );
          }

          this.cdr.markForCheck();
        },
        error: (error) => {},
      });
  }

  deleteForm(formId: string): void {
    if (!confirm('Are you sure you want to delete this form?')) return;

    this.formService
      .deleteForm(formId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.forms = this.forms.filter((f) => f.id !== formId);
          this.cdr.markForCheck();
        },
        error: (error) => {},
      });
  }

  isFieldInvalid(fieldName: string, form: FormGroup = this.formForm): boolean {
    const field = form.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }
}
