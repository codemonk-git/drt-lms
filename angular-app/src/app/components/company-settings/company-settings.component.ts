import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormsModule,
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { TenantService } from '../../services/tenant.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-company-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  template: `
    <div class="settings-container">
      <div *ngIf="isAdmin; else notAuthorized">
        <!-- Header -->
        <div class="settings-header">
          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <div>
              <h1>Company Settings</h1>
              <p>Manage your organization details</p>
            </div>
            <button
              type="button"
              (click)="loadCompanySettings()"
              class="refresh-button"
              [disabled]="isLoading"
              title="Refresh settings"
            >
              {{ isLoading ? 'Loading...' : '↻ Refresh' }}
            </button>
          </div>
        </div>

        <!-- Form Card -->
        <div class="form-card">
          <form [formGroup]="companyForm" (ngSubmit)="saveCompany()">
            <div class="form-section">
              <!-- Name -->
              <div class="form-group">
                <label>Company Name</label>
                <input
                  type="text"
                  formControlName="name"
                  [readOnly]="!isEditMode"
                  class="input"
                  [class.readonly]="!isEditMode"
                />
              </div>

              <!-- Slug -->
              <div class="form-group">
                <label>Slug</label>
                <input
                  type="text"
                  formControlName="slug"
                  readonly
                  class="input readonly"
                  title="Auto-generated"
                />
              </div>

              <!-- Industry -->
              <div class="form-group">
                <label>Industry</label>
                <input
                  type="text"
                  formControlName="industry"
                  [readOnly]="!isEditMode"
                  class="input"
                  [class.readonly]="!isEditMode"
                />
              </div>

              <!-- Website -->
              <div class="form-group">
                <label>Website</label>
                <input
                  type="url"
                  formControlName="website"
                  [readOnly]="!isEditMode"
                  class="input"
                  [class.readonly]="!isEditMode"
                />
              </div>

              <!-- Plan & Status Row -->
              <div class="form-row">
                <div class="form-group">
                  <label>Plan</label>
                  <select
                    formControlName="subscription_plan"
                    [disabled]="!isEditMode"
                    class="input"
                  >
                    <option value="free">Free</option>
                    <option value="starter">Starter</option>
                    <option value="professional">Professional</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </div>

                <div class="form-group">
                  <label>Status</label>
                  <div class="status-display" [class]="'status-' + (company?.status || 'pending')">
                    {{ company?.status || 'N/A' }}
                  </div>
                </div>
              </div>

              <!-- Description -->
              <div class="form-group">
                <label>Description</label>
                <textarea
                  formControlName="description"
                  [readOnly]="!isEditMode"
                  class="input"
                  [class.readonly]="!isEditMode"
                  rows="3"
                ></textarea>
              </div>

              <!-- Messages -->
              <div *ngIf="errorMessage" class="alert alert-error">
                {{ errorMessage }}
              </div>
              <div *ngIf="successMessage" class="alert alert-success">
                {{ successMessage }}
              </div>
            </div>

            <!-- Actions -->
            <div class="form-actions">
              <button
                *ngIf="!isEditMode"
                type="button"
                (click)="toggleEditMode()"
                class="btn btn-primary"
              >
                Edit
              </button>

              <div *ngIf="isEditMode" class="btn-group">
                <button type="submit" class="btn btn-primary" [disabled]="isSaving">
                  {{ isSaving ? 'Saving...' : 'Save' }}
                </button>
                <button type="button" class="btn btn-secondary" (click)="toggleEditMode()">
                  Cancel
                </button>
              </div>
            </div>
          </form>
        </div>

        <!-- Info Card -->
        <div class="info-card">
          <h2>Information</h2>
          <div class="info-grid">
            <div class="info-row">
              <span class="info-label">Company ID</span>
              <span class="info-value">{{ company?.id }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Owner</span>
              <span class="info-value">{{ company?.owner_name || 'N/A' }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Owner ID</span>
              <span class="info-value">{{ company?.owner_id }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Created</span>
              <span class="info-value">{{ company?.created_at | date: 'short' }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Updated</span>
              <span class="info-value">{{ company?.updated_at | date: 'short' }}</span>
            </div>
          </div>
        </div>

        <!-- Loading -->
        <div *ngIf="isLoading" class="loading-state">
          <p>Loading...</p>
        </div>
      </div>

      <!-- Not Admin -->
      <ng-template #notAuthorized>
        <div class="unauthorized">
          <p>Access denied. Only administrators can view this page.</p>
        </div>
      </ng-template>
    </div>
  `,
  styles: [
    `
      .settings-container {
        padding: 32px;
        background: #f8f9fa;
        min-height: 100%;
      }

      .settings-header {
        margin-bottom: 32px;
      }

      .settings-header h1 {
        margin: 0 0 8px 0;
        font-size: 32px;
        font-weight: 800;
        color: #111827;
      }

      .settings-header p {
        margin: 0;
        font-size: 14px;
        color: #6b7280;
      }

      .refresh-button {
        padding: 8px 16px;
        background: #f3f4f6;
        border: 1px solid #d1d5db;
        border-radius: 6px;
        font-size: 13px;
        font-weight: 600;
        color: #374151;
        cursor: pointer;
        transition: all 0.2s;
        white-space: nowrap;
      }

      .refresh-button:hover:not(:disabled) {
        background: #e5e7eb;
        border-color: #9ca3af;
      }

      .refresh-button:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }

      .form-card {
        background: white;
        border: 1px solid #e5e7eb;
        border-radius: 10px;
        margin-bottom: 24px;
        overflow: hidden;
      }

      .form-section {
        padding: 24px;
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 20px;
      }

      .form-group {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      .form-group label {
        font-size: 12px;
        font-weight: 700;
        color: #374151;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .input,
      select {
        padding: 10px 12px;
        border: 1px solid #d1d5db;
        border-radius: 6px;
        font-size: 13px;
        font-family: inherit;
        transition: all 0.2s;
      }

      .input:focus,
      select:focus {
        outline: none;
        border-color: #9ca3af;
        box-shadow: 0 0 0 3px rgba(0, 0, 0, 0.05);
      }

      .input.readonly,
      .input[readonly] {
        background: #f3f4f6;
        color: #6b7280;
        cursor: not-allowed;
      }

      select:disabled {
        background: #f3f4f6;
        color: #6b7280;
      }

      textarea {
        resize: vertical;
        font-family: inherit;
      }

      .form-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 20px;
      }

      .status-display {
        padding: 10px 12px;
        background: #f3f4f6;
        border-radius: 6px;
        font-size: 12px;
        font-weight: 600;
        text-transform: uppercase;
        text-align: center;
      }

      .status-active {
        background: #d1fae5;
        color: #065f46;
      }

      .status-pending {
        background: #fef3c7;
        color: #92400e;
      }

      .status-inactive {
        background: #fee2e2;
        color: #991b1b;
      }

      .alert {
        grid-column: 1 / -1;
        padding: 12px;
        border-radius: 6px;
        font-size: 13px;
        margin-top: 8px;
      }

      .alert-error {
        background: #fef2f2;
        color: #b91c1c;
        border-left: 3px solid #dc2626;
      }

      .alert-success {
        background: #f0fdf4;
        color: #166534;
        border-left: 3px solid #16a34a;
      }

      .form-actions {
        padding: 20px 24px;
        border-top: 1px solid #e5e7eb;
        display: flex;
        gap: 12px;
      }

      .btn-group {
        display: flex;
        gap: 12px;
        width: 100%;
      }

      .btn {
        padding: 10px 20px;
        border: 1px solid #d1d5db;
        background: white;
        border-radius: 6px;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .btn-primary {
        background: #111827;
        color: white;
        border-color: #111827;
      }

      .btn-primary:hover:not(:disabled) {
        background: #1f2937;
      }

      .btn-primary:disabled {
        background: #9ca3af;
        border-color: #9ca3af;
        cursor: not-allowed;
      }

      .btn-secondary {
        background: white;
        color: #374151;
        border-color: #d1d5db;
      }

      .btn-secondary:hover {
        background: #f9fafb;
      }

      .btn-group .btn-primary {
        flex: 1;
      }

      .btn-group .btn-secondary {
        flex: 1;
      }

      .info-card {
        background: white;
        border: 1px solid #e5e7eb;
        border-radius: 10px;
        padding: 24px;
      }

      .info-card h2 {
        margin: 0 0 16px 0;
        font-size: 16px;
        font-weight: 700;
        color: #111827;
      }

      .info-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 16px;
      }

      .info-row {
        padding: 12px;
        background: #f9fafb;
        border-radius: 6px;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .info-label {
        font-size: 11px;
        font-weight: 700;
        color: #6b7280;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .info-value {
        font-size: 13px;
        font-weight: 600;
        color: #111827;
        word-break: break-all;
      }

      .loading-state {
        text-align: center;
        padding: 40px;
        color: #6b7280;
      }

      .unauthorized {
        background: white;
        border: 1px solid #e5e7eb;
        border-radius: 10px;
        padding: 40px;
        text-align: center;
        color: #6b7280;
      }

      @media (max-width: 768px) {
        .settings-container {
          padding: 20px;
        }

        .form-section {
          grid-template-columns: 1fr;
          gap: 16px;
        }

        .form-row {
          grid-template-columns: 1fr;
        }

        .info-grid {
          grid-template-columns: 1fr;
        }

        .form-actions {
          flex-direction: column-reverse;
        }

        .btn-group {
          flex-direction: column-reverse;
        }
      }
    `,
  ],
})
export class CompanySettingsComponent implements OnInit, OnDestroy {
  companyForm: FormGroup;
  company: any = null;
  isAdmin = false;
  isEditMode = false;
  isLoading = false;
  isSaving = false;
  errorMessage = '';
  successMessage = '';
  private destroy$ = new Subject<void>();

  constructor(
    private authService: AuthService,
    private tenantService: TenantService,
    private apiService: ApiService,
    private fb: FormBuilder,
  ) {
    this.companyForm = this.fb.group({
      name: ['', Validators.required],
      slug: [{ value: '', disabled: true }],
      industry: [''],
      website: [''],
      description: [''],
      subscription_plan: ['free'],
    });
  }

  ngOnInit(): void {
    const currentUser = this.authService.getCurrentUser();
    this.isAdmin = currentUser?.role === 'admin';

    if (this.isAdmin) {
      this.loadCompanySettings();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadCompanySettings(): void {
    this.isLoading = true;
    const currentTenant = this.tenantService.getCurrentTenant();

    if (currentTenant) {
      this.apiService
        .get<any>(`/companies/${currentTenant.id}`)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            this.company = response.data;
            this.populateForm(this.company);
            this.isLoading = false;
          },
          error: (error) => {
            
            this.errorMessage = 'Failed to load company settings';
            this.isLoading = false;
          },
        });
    }
  }

  populateForm(company: any): void {
    this.companyForm.patchValue({
      name: company.name || '',
      slug: company.slug || '',
      industry: company.industry || '',
      website: company.website || '',
      description: company.description || '',
      subscription_plan: company.subscription_plan || 'free',
    });
  }

  toggleEditMode(): void {
    this.isEditMode = !this.isEditMode;
    this.errorMessage = '';
    this.successMessage = '';

    if (!this.isEditMode) {
      this.populateForm(this.company);
    }
  }

  saveCompany(): void {
    if (this.companyForm.invalid || !this.isAdmin) return;

    this.isSaving = true;
    this.errorMessage = '';
    this.successMessage = '';

    const currentTenant = this.tenantService.getCurrentTenant();
    const formValue = this.companyForm.getRawValue();

    const updateData = {
      name: formValue.name,
      industry: formValue.industry || null,
      website: formValue.website || null,
      description: formValue.description || null,
      subscription_plan: formValue.subscription_plan,
    };

    this.apiService
      .put<any>(`/companies/${currentTenant?.id}`, updateData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.company = response.data;
          this.populateForm(this.company);
          this.isEditMode = false;
          this.successMessage = 'Saved successfully!';
          this.isSaving = false;
          setTimeout(() => (this.successMessage = ''), 3000);
        },
        error: (error) => {
          
          this.errorMessage = error?.error?.detail || 'Failed to save changes';
          this.isSaving = false;
        },
      });
  }
}
