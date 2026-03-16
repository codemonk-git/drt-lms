import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormsModule,
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { StageService } from '../../services/stage.service';
import { LeadService } from '../../services/lead.service';
import { FormService } from '../../services/form.service';
import { UserService } from '../../services/user.service';
import { TeamService } from '../../services/team.service';
import { Stage, Lead, Form } from '../../models/api.models';
import { Subject } from 'rxjs';
import { takeUntil, switchMap, map } from 'rxjs/operators';

@Component({
  selector: 'app-stages',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  template: `
    <div class="pipeline-container">
      <div class="pipeline-header">
        <div>
          <h1>Sales Pipeline</h1>
          <p class="subtitle">Manage your sales stages and track leads</p>
        </div>
        <button class="btn-primary" (click)="openNewStageForm()">+ New Stage</button>
      </div>

      <!-- Create/Edit Stage Modal -->
      <div class="modal-overlay" *ngIf="showStageForm" (click)="closeStageForm()">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>{{ editingStageId ? 'Edit Stage' : 'Create New Stage' }}</h3>
            <button class="close-btn" (click)="closeStageForm()">✕</button>
          </div>
          <form [formGroup]="stageForm" (ngSubmit)="saveStage()" class="form">
            <div class="form-group">
              <label>Stage Name *</label>
              <input type="text" formControlName="name" placeholder="e.g., Qualified Lead" />
            </div>
            <div class="form-group">
              <label>Order</label>
              <input type="number" formControlName="order" placeholder="1" />
            </div>

            <!-- Matrix Model Fields -->
            <div class="form-divider">Workflow Responsibility</div>

            <div class="form-group">
              <label>Select Team Responsible for This Stage *</label>
              <select
                formControlName="responsible_team_id"
                class="form-select"
                (change)="onTeamSelected($event)"
              >
                <option value="">-- Select a team --</option>
                <option *ngFor="let team of teams" [value]="team.id">
                  {{ team.name }}
                </option>
              </select>
              <small class="form-help">Choose the team that will handle this stage</small>
            </div>

            <div class="form-group" *ngIf="selectedTeamId || editingStageId">
              <label>Assign Specific Team Members (or leave empty for all)</label>
              <div class="users-checkboxes">
                <div *ngIf="currentTeamMembers.length === 0" class="no-users">
                  No team members available
                </div>
                <div class="checkbox-group-header" *ngIf="currentTeamMembers.length > 0">
                  <button type="button" class="btn-select-all" (click)="selectAllTeamMembers()">
                    Select All
                  </button>
                  <button type="button" class="btn-clear-all" (click)="clearAllTeamMembers()">
                    Clear All
                  </button>
                </div>
                <div *ngFor="let member of currentTeamMembers" class="checkbox-item">
                  <input
                    type="checkbox"
                    [id]="'member_' + member.id"
                    [checked]="selectedUserIds.has(member.id)"
                    (change)="toggleUserSelection(member.id)"
                  />
                  <label [for]="'member_' + member.id" class="checkbox-label">
                    {{ member.first_name }} {{ member.last_name }}
                  </label>
                </div>
              </div>
              <small class="form-help">Leave empty to include all team members</small>
            </div>

            <div class="form-actions">
              <button
                type="submit"
                class="btn-primary"
                [disabled]="stageForm.invalid || isCreating"
              >
                {{ isCreating ? 'Saving...' : editingStageId ? 'Update Stage' : 'Create Stage' }}
              </button>
              <button type="button" class="btn-secondary" (click)="closeStageForm()">Cancel</button>
            </div>
            <div class="error-message" *ngIf="formError">{{ formError }}</div>
          </form>
        </div>
      </div>

      <!-- Form Management Modal -->
      <div class="modal-overlay" *ngIf="showFormManagement" (click)="closeFormManagement()">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>Manage Forms for {{ selectedStageForFormMgmt?.name ?? 'Stage' }}</h3>
            <button class="close-btn" (click)="closeFormManagement()">✕</button>
          </div>
          <div class="modal-body">
            <!-- Assigned Forms -->
            <div class="section">
              <h4>Assigned Forms</h4>
              <div
                *ngIf="(selectedStageForFormMgmt?.assignedForms ?? []).length > 0"
                class="assigned-forms"
              >
                <div
                  *ngFor="let form of selectedStageForFormMgmt?.assignedForms ?? []"
                  class="form-item"
                >
                  <div class="form-item-main">
                    <span>{{ form.name }}</span>
                    <button
                      type="button"
                      class="btn-remove"
                      (click)="
                        removeForm(selectedStageForFormMgmt!.id, form.id, form._assignmentId)
                      "
                      [disabled]="isManagingForms"
                    >
                      ✕
                    </button>
                  </div>
                  <!-- Form Visibility Control -->
                  <div class="form-item-visibility">
                    <label class="visibility-toggle">
                      <input
                        type="checkbox"
                        [checked]="isFormHiddenFromStage(form, selectedStageForFormMgmt?.id)"
                        (change)="toggleFormVisibility(form, selectedStageForFormMgmt?.id, $event)"
                      />
                      <span class="toggle-text">
                        {{
                          isFormHiddenFromStage(form, selectedStageForFormMgmt?.id)
                            ? 'Hidden'
                            : 'Visible'
                        }}
                      </span>
                    </label>
                  </div>
                </div>
              </div>
              <div
                *ngIf="(selectedStageForFormMgmt?.assignedForms ?? []).length === 0"
                class="empty-forms"
              >
                No forms assigned yet
              </div>
            </div>

            <!-- Available Forms to Add -->
            <div class="section">
              <h4>Add Form</h4>
              <div class="form-add-section">
                <select [(ngModel)]="formToAdd" class="form-select" [disabled]="isManagingForms">
                  <option value="">-- Select a form --</option>
                  <option *ngFor="let form of getAvailableFormsToAdd()" [value]="form.id">
                    {{ form.name }}
                  </option>
                </select>
                <button
                  type="button"
                  class="btn-primary"
                  (click)="addForm(selectedStageForFormMgmt!.id, formToAdd)"
                  [disabled]="!formToAdd || isManagingForms"
                >
                  {{ isManagingForms ? 'Adding...' : 'Add Form' }}
                </button>
              </div>
            </div>

            <div class="form-actions">
              <button type="button" class="btn-secondary" (click)="closeFormManagement()">
                Done
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Pipeline Grid -->
      <div class="pipeline-grid">
        <div *ngFor="let stage of stages" class="stage-column">
          <!-- Stage Header -->
          <div class="stage-header">
            <div class="stage-info">
              <h3>{{ stage.name }}</h3>
              <span class="lead-badge">{{ getLeadsInStage(stage.id).length }} leads</span>
              <span
                class="form-count-badge"
                *ngIf="stage.assignedForms && stage.assignedForms.length > 0"
              >
                <span class="material-icons" style="font-size: 16px; vertical-align: middle;"
                  >assignment</span
                >
                {{ stage.assignedForms.length }} form(s)
              </span>

              <!-- Matrix Model Info - Team Based -->
              <div class="matrix-model-info" *ngIf="stage.responsible_team_id">
                <div class="team-badge">
                  <span class="material-icons">groups</span>
                  {{ getTeamName(stage.responsible_team_id) }}
                </div>
                <div
                  class="responsible-users"
                  *ngIf="stage.responsible_user_ids && stage.responsible_user_ids.length > 0"
                >
                  <span class="user-chip" *ngFor="let userId of stage.responsible_user_ids">
                    {{ getUserName(userId) }}
                  </span>
                </div>
                <div
                  class="team-note"
                  *ngIf="!stage.responsible_user_ids || stage.responsible_user_ids.length === 0"
                >
                  <small>All team members can work on this stage</small>
                </div>
              </div>
            </div>
            <div class="stage-actions">
              <button class="btn-icon" (click)="openFormManagement(stage)" title="Manage forms">
                <span class="material-icons">assignment</span>
              </button>
              <button class="btn-icon" (click)="editStage(stage)" title="Edit stage">
                <span class="material-icons">edit</span>
              </button>
              <button
                class="btn-icon btn-danger"
                (click)="deleteStage(stage.id)"
                title="Delete stage"
              >
                <span class="material-icons">delete</span>
              </button>
            </div>
          </div>

          <!-- Leads Container -->
          <div class="leads-list">
            <div *ngFor="let lead of getLeadsInStage(stage.id)" class="lead-card">
              <div class="lead-header">
                <div class="lead-avatar">{{ (lead.name || 'L').charAt(0) }}</div>
                <div class="lead-name">{{ lead.name }}</div>
              </div>
              <div class="lead-details">
                <p class="lead-email">{{ lead.email }}</p>
                <p class="lead-company" *ngIf="lead.company_name">{{ lead.company_name }}</p>
              </div>
              <div class="lead-move">
                <select
                  (change)="moveLead(lead.id, $event)"
                  [value]="lead.stage_id || ''"
                  class="stage-select"
                >
                  <option value="" disabled>Move to...</option>
                  <option
                    *ngFor="let s of stages"
                    [value]="s.id"
                    [selected]="s.id === lead.stage_id"
                  >
                    {{ s.name }}
                  </option>
                </select>
              </div>
            </div>

            <!-- Empty State -->
            <div *ngIf="getLeadsInStage(stage.id).length === 0" class="empty-state">
              <p>No leads in this stage</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div class="loading-overlay" *ngIf="isLoading">
        <div class="spinner"></div>
        <p>Loading pipeline...</p>
      </div>
    </div>
  `,
  styles: [
    `
      .pipeline-container {
        background: linear-gradient(135deg, #f5f7fa 0%, #e9ecef 100%);
        min-height: 100vh;
        padding: 24px;
      }

      .pipeline-header {
        max-width: 1400px;
        margin: 0 auto 32px;
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 20px;
      }

      .pipeline-header h1 {
        margin: 0 0 8px 0;
        color: #1f2937;
        font-size: 32px;
        font-weight: 700;
      }

      .subtitle {
        margin: 0;
        color: #6b7280;
        font-size: 15px;
        font-weight: 500;
      }

      .btn-primary {
        background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);
        color: white;
        border: none;
        padding: 12px 24px;
        border-radius: 6px;
        font-weight: 600;
        font-size: 14px;
        cursor: pointer;
        transition: all 0.2s;
        box-shadow: 0 2px 8px rgba(2, 132, 199, 0.2);
        white-space: nowrap;
      }

      .btn-primary:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(2, 132, 199, 0.3);
      }

      .modal-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        animation: fadeIn 0.15s ease;
      }

      @keyframes fadeIn {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }

      .modal-content {
        background: white;
        border-radius: 12px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        max-width: 600px;
        width: 90%;
        max-height: 90vh;
        overflow-y: auto;
        animation: slideUp 0.2s ease;
      }

      @keyframes slideUp {
        from {
          transform: translateY(20px);
          opacity: 0;
        }
        to {
          transform: translateY(0);
          opacity: 1;
        }
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
        font-weight: 700;
      }

      .close-btn {
        background: none;
        border: none;
        font-size: 24px;
        color: #9ca3af;
        cursor: pointer;
        padding: 0;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
        border-radius: 4px;
      }

      .close-btn:hover {
        background: #f3f4f6;
        color: #1f2937;
      }

      .form {
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

      .form-group input {
        width: 100%;
        padding: 10px 12px;
        border: 1.5px solid #d1d5db;
        border-radius: 6px;
        font-size: 14px;
        box-sizing: border-box;
        font-family: inherit;
        transition: all 0.2s;
      }

      .form-group input:hover {
        border-color: #9ca3af;
      }

      .form-group input:focus {
        outline: none;
        border-color: #0284c7;
        box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.1);
      }

      .form-select {
        width: 100%;
        padding: 10px 12px;
        border: 1.5px solid #d1d5db;
        border-radius: 6px;
        font-size: 14px;
        cursor: pointer;
        background: white;
        box-sizing: border-box;
        font-family: inherit;
        transition: all 0.2s;
      }

      .form-select:hover {
        border-color: #9ca3af;
      }

      .form-select:focus {
        outline: none;
        border-color: #0284c7;
        box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.1);
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
        padding: 10px 16px;
        border: none;
        border-radius: 6px;
        font-weight: 600;
        font-size: 14px;
        cursor: pointer;
        transition: all 0.2s;
      }

      .form-actions .btn-primary {
        background: #0284c7;
        color: white;
      }

      .form-actions .btn-primary:hover {
        background: #0369a1;
      }

      .form-actions .btn-primary:disabled {
        opacity: 0.6;
        cursor: not-allowed;
        transform: none;
      }

      .form-actions .btn-secondary {
        background: #e5e7eb;
        color: #1f2937;
      }

      .form-actions .btn-secondary:hover {
        background: #d1d5db;
      }

      .error-message {
        color: #991b1b;
        background: #fee2e2;
        padding: 12px;
        border-radius: 6px;
        font-size: 14px;
        margin-top: 16px;
        border-left: 4px solid #ef4444;
      }

      .form-divider {
        font-weight: 700;
        color: #1f2937;
        margin: 24px 0 16px 0;
        padding-top: 16px;
        border-top: 1px solid #e5e7eb;
        font-size: 13px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .form-help {
        display: block;
        margin-top: 6px;
        font-size: 12px;
        color: #6b7280;
      }

      .users-checkboxes {
        display: flex;
        flex-direction: column;
        gap: 10px;
        border: 1.5px solid #d1d5db;
        border-radius: 6px;
        padding: 12px;
        background: #fafbfc;
      }

      .no-users {
        color: #9ca3af;
        font-size: 14px;
        padding: 12px;
        text-align: center;
      }

      .checkbox-item {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 6px 0;
      }

      .checkbox-item input[type='checkbox'] {
        width: 18px;
        height: 18px;
        cursor: pointer;
        accent-color: #0284c7;
      }

      .checkbox-label {
        cursor: pointer;
        font-size: 14px;
        color: #374151;
        display: flex;
        align-items: center;
        gap: 8px;
        flex: 1;
      }

      .user-role {
        font-size: 12px;
        color: #9ca3af;
        font-weight: 400;
      }

      .checkbox-group-header {
        display: flex;
        gap: 8px;
        margin-bottom: 12px;
        padding-bottom: 12px;
        border-bottom: 1px solid #e5e7eb;
      }

      .btn-select-all,
      .btn-clear-all {
        flex: 1;
        padding: 8px 12px;
        border: 1px solid #d1d5db;
        background: white;
        border-radius: 4px;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        color: #374151;
        transition: all 0.2s;
      }

      .btn-select-all:hover {
        background: #dbeafe;
        border-color: #0284c7;
        color: #0284c7;
      }

      .btn-clear-all:hover {
        background: #fee2e2;
        border-color: #ef4444;
        color: #ef4444;
      }

      .pipeline-grid {
        max-width: 1400px;
        margin: 0 auto;
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
        gap: 20px;
      }

      .stage-column {
        background: white;
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
        overflow: hidden;
        display: flex;
        flex-direction: column;
        max-height: 70vh;
        transition: all 0.2s;
        border: 1px solid #e5e7eb;
      }

      .stage-column:hover {
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
        border-color: #d1d5db;
      }

      .stage-header {
        padding: 16px;
        border-bottom: 2px solid #e5e7eb;
        background: #f9fafb;
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 12px;
      }

      .stage-info h3 {
        margin: 0 0 8px 0;
        color: #1f2937;
        font-size: 16px;
        font-weight: 600;
      }

      .stage-info {
        flex: 1;
      }

      .lead-badge {
        display: inline-block;
        background: #dbeafe;
        color: #0c4a6e;
        padding: 4px 10px;
        border-radius: 4px;
        font-size: 12px;
        font-weight: 600;
      }

      .form-badge {
        display: inline-block;
        background: #e9d5ff;
        color: #6b21a8;
        padding: 4px 10px;
        border-radius: 4px;
        font-size: 11px;
        font-weight: 600;
        margin-top: 6px;
      }

      .form-count-badge {
        display: inline-block;
        background: #e9d5ff;
        color: #6b21a8;
        padding: 4px 10px;
        border-radius: 4px;
        font-size: 11px;
        font-weight: 600;
        margin-top: 6px;
      }

      .matrix-model-info {
        margin-top: 12px;
        padding-top: 12px;
        border-top: 1px solid #d1d5db;
      }

      .team-badge {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        background: #d1fae5;
        color: #047857;
        padding: 6px 12px;
        border-radius: 4px;
        font-size: 12px;
        font-weight: 600;
      }

      .team-badge .material-icons {
        font-size: 14px;
      }

      .responsible-users {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin-top: 8px;
      }

      .user-chip {
        display: inline-block;
        background: #dbeafe;
        color: #0369a1;
        padding: 4px 10px;
        border-radius: 4px;
        font-size: 12px;
        font-weight: 500;
      }

      .team-note {
        margin-top: 8px;
        padding: 6px 8px;
        background: #f0f9ff;
        border-left: 2px solid #0284c7;
        border-radius: 2px;
        color: #0369a1;
      }

      .team-note small {
        font-size: 11px;
        display: block;
      }

      .modal-body {
        padding: 20px;
      }

      .section {
        margin-bottom: 20px;
      }

      .section h4 {
        margin: 0 0 10px 0;
        color: #1f2937;
        font-size: 14px;
        font-weight: 600;
      }

      .assigned-forms {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .form-item {
        display: flex;
        flex-direction: column;
        gap: 8px;
        padding: 10px;
        background: #f3f4f6;
        border-radius: 6px;
        font-size: 14px;
      }

      .form-item-main {
        display: flex;
        justify-content: space-between;
        align-items: center;
        width: 100%;
      }

      .form-item-visibility {
        display: flex;
        justify-content: flex-start;
        padding-left: 8px;
        border-top: 1px solid #e5e7eb;
        padding-top: 8px;
      }

      .visibility-toggle {
        display: flex;
        align-items: center;
        gap: 6px;
        cursor: pointer;
        user-select: none;
      }

      .visibility-toggle input[type='checkbox'] {
        width: 16px;
        height: 16px;
        cursor: pointer;
      }

      .toggle-text {
        font-size: 12px;
        font-weight: 500;
        color: #6b7280;
      }

      .btn-remove {
        background: none;
        border: none;
        color: #ef4444;
        cursor: pointer;
        font-size: 16px;
        padding: 4px 8px;
        border-radius: 4px;
        transition: all 0.2s;
      }

      .btn-remove:hover {
        background: #fee2e2;
      }

      .btn-remove:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }

      .empty-forms {
        padding: 12px;
        text-align: center;
        color: #9ca3af;
        font-size: 13px;
        background: #f9fafb;
        border-radius: 6px;
      }

      .form-add-section {
        display: flex;
        gap: 10px;
      }

      .form-add-section .form-select {
        flex: 1;
      }

      .form-add-section .btn-primary {
        padding: 10px 16px;
        white-space: nowrap;
      }

      .stage-actions {
        display: flex;
        gap: 8px;
      }

      .btn-icon {
        background: none;
        border: none;
        font-size: 16px;
        cursor: pointer;
        padding: 4px 8px;
        border-radius: 4px;
        transition: all 0.2s;
        color: #6b7280;
      }

      .btn-icon:hover {
        background: #e5e7eb;
        color: #1f2937;
      }

      .btn-icon.btn-danger {
        color: #ef4444;
      }

      .btn-icon.btn-danger:hover {
        background: #fee2e2;
      }

      .leads-list {
        flex: 1;
        overflow-y: auto;
        padding: 12px;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .lead-card {
        background: #f9fafb;
        border: 1px solid #e5e7eb;
        border-radius: 6px;
        padding: 12px;
        transition: all 0.2s;
      }

      .lead-card:hover {
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      }

      .lead-header {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 8px;
      }

      .lead-avatar {
        width: 28px;
        height: 28px;
        border-radius: 50%;
        background: #dbeafe;
        color: #0284c7;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 11px;
        font-weight: 600;
        flex-shrink: 0;
      }

      .lead-name {
        font-weight: 600;
        color: #1f2937;
        font-size: 13px;
      }

      .lead-details {
        margin-bottom: 10px;
      }

      .lead-email {
        font-size: 12px;
        color: #6b7280;
        margin: 4px 0;
      }

      .lead-company {
        font-size: 11px;
        color: #9ca3af;
        margin: 2px 0 0 0;
      }

      .lead-move {
        display: flex;
      }

      .stage-select {
        width: 100%;
        padding: 6px 8px;
        border: 1px solid #d1d5db;
        border-radius: 4px;
        font-size: 12px;
        cursor: pointer;
        background: white;
      }

      .stage-select:focus {
        outline: none;
        border-color: #0284c7;
        box-shadow: 0 0 0 2px rgba(2, 132, 199, 0.1);
      }

      .empty-state {
        padding: 20px;
        text-align: center;
        color: #9ca3af;
        font-size: 13px;
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .empty-state p {
        margin: 0;
      }

      .loading-overlay {
        position: fixed;
        inset: 0;
        background: rgba(255, 255, 255, 0.9);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        z-index: 999;
      }

      .spinner {
        width: 40px;
        height: 40px;
        border: 4px solid #f0f0f0;
        border-top-color: #0284c7;
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }

      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }

      .loading-overlay p {
        margin-top: 12px;
        color: #6b7280;
      }

      @media (max-width: 768px) {
        .pipeline-grid {
          grid-template-columns: 1fr;
        }

        .stage-column {
          max-height: 60vh;
        }
      }
    `,
  ],
})
export class StagesComponent implements OnInit, OnDestroy {
  stages: Stage[] = [];
  allLeads: Lead[] = [];
  availableForms: Form[] = [];
  teams: any[] = [];
  users: any[] = [];
  stageForm: FormGroup;
  showStageForm = false;
  editingStageId: string | null = null;
  isLoading = false;
  isCreating = false;
  formError = '';
  showFormManagement = false;
  selectedStageForFormMgmt: Stage | null = null;
  formToAdd = '';
  isManagingForms = false;
  selectedUserIds: Set<string> = new Set();
  selectedTeamId: string | null = null;
  currentTeamMembers: any[] = [];

  private destroy$ = new Subject<void>();

  constructor(
    private stageService: StageService,
    private leadService: LeadService,
    private formService: FormService,
    private userService: UserService,
    private teamService: TeamService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef,
  ) {
    this.stageForm = this.fb.group({
      name: ['', Validators.required],
      order: [0],
      responsible_team_id: ['', Validators.required],
      responsible_user_ids: [[]],
    });
  }

  ngOnInit(): void {
    // Load teams for the team selector
    this.teamService
      .getTeams()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (teams) => {
          this.teams = teams;
          this.cdr.markForCheck();
        },
        error: () => {
          // Silently fail, teams optional for now
        },
      });

    // Load users for displaying team members
    this.userService
      .getUsers()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (users) => {
          this.users = users;
          this.cdr.markForCheck();
        },
        error: () => {
          // Silently fail, users optional for now
        },
      });

    // Load forms first, then load stages so that availableForms is populated
    // for proper form mapping during stage initialization
    this.formService
      .getForms(0, 100)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (forms) => {
          this.availableForms = forms;
          this.loadStages();
          this.loadLeads();
          this.cdr.markForCheck();
        },
        error: (error) => {
          this.loadStages();
          this.loadLeads();
        },
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadStages(): void {
    this.isLoading = true;
    this.stageService
      .getStages()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (stages) => {
          // Enrich stage forms with real form data from availableForms
          const enrichedStages = stages.map((stage) => {
            if (stage.assignedForms && this.availableForms.length > 0) {
              stage.assignedForms = stage.assignedForms
                .map((form) => {
                  // Find the real form object with full details
                  const realForm = this.availableForms.find((f) => f.id === form.id);
                  if (realForm) {
                    // Merge the real form with the assignment metadata
                    return {
                      ...realForm,
                      _assignmentId: form._assignmentId,
                      _isRequired: form._isRequired,
                    };
                  }
                  return form;
                })
                .filter((form): form is Form => form !== null);
            }
            return stage;
          });

          this.stages = enrichedStages.sort((a, b) => (a.order || 0) - (b.order || 0));
          this.isLoading = false;
          this.cdr.markForCheck();
        },
        error: (error) => {
          this.isLoading = false;
        },
      });
  }

  loadLeads(): void {
    this.leadService
      .getLeads(0, 1000)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (leads) => {
          this.allLeads = leads;
          this.cdr.markForCheck();
        },
        error: (error) => {},
      });
  }

  getLeadsInStage(stageId: string): Lead[] {
    return this.allLeads.filter((lead) => lead.stage_id === stageId);
  }

  openNewStageForm(): void {
    this.editingStageId = null;
    this.showStageForm = true;
    this.formError = '';
    this.selectedUserIds.clear();
    this.selectedTeamId = null;
    this.currentTeamMembers = [];
    this.stageForm.reset({ order: 0, responsible_team_id: '' });
  }

  editStage(stage: Stage): void {
    this.editingStageId = stage.id;
    this.showStageForm = true;
    this.formError = '';
    this.selectedUserIds.clear();
    this.selectedTeamId = stage.responsible_team_id || null;

    // Load team members for this team
    if (stage.responsible_team_id) {
      this.loadTeamMembers(stage.responsible_team_id);
    }

    if (stage.responsible_user_ids) {
      stage.responsible_user_ids.forEach((id) => this.selectedUserIds.add(id));
    }

    this.stageForm.patchValue({
      name: stage.name,
      order: stage.order,
      responsible_team_id: stage.responsible_team_id || '',
      responsible_user_ids: stage.responsible_user_ids || [],
    });
  }

  closeStageForm(): void {
    this.showStageForm = false;
    this.editingStageId = null;
    this.stageForm.reset();
    this.formError = '';
    this.selectedUserIds.clear();
    this.selectedTeamId = null;
    this.currentTeamMembers = [];
  }

  openFormManagement(stage: Stage): void {
    this.selectedStageForFormMgmt = stage;
    this.showFormManagement = true;
    this.formToAdd = '';
    // Load assigned forms if not already loaded
    if (!stage.assignedForms) {
      stage.assignedForms = [];
    }
  }

  closeFormManagement(): void {
    this.showFormManagement = false;
    this.selectedStageForFormMgmt = null;
    this.formToAdd = '';
  }

  getAvailableFormsToAdd(): Form[] {
    if (!this.selectedStageForFormMgmt?.assignedForms) return this.availableForms;
    const assignedFormIds = new Set(this.selectedStageForFormMgmt.assignedForms.map((f) => f.id));
    return this.availableForms.filter((f) => !assignedFormIds.has(f.id));
  }

  addForm(stageId: string, formId: string): void {
    if (!formId || !this.selectedStageForFormMgmt) return;

    this.isManagingForms = true;
    this.stageService
      .addFormToStage(stageId, formId)
      .pipe(
        map(() => {
          // Find the form to add
          return this.availableForms.find((f) => f.id === formId);
        }),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (formToAdd) => {
          if (formToAdd) {
            // Add form to the assignedForms list
            // Note: selectedStageForFormMgmt is a reference to a stage in stages array,
            // so we only need to update it once
            if (!this.selectedStageForFormMgmt!.assignedForms) {
              this.selectedStageForFormMgmt!.assignedForms = [];
            }
            this.selectedStageForFormMgmt!.assignedForms.push(formToAdd);

            this.formToAdd = '';
          }

          this.isManagingForms = false;
          this.cdr.markForCheck();
        },
        error: (error) => {
          this.isManagingForms = false;
        },
      });
  }

  removeForm(stageId: string, formId: string, assignmentId?: string): void {
    if (!this.selectedStageForFormMgmt) return;

    this.isManagingForms = true;

    // Use assignment ID if available, otherwise use form ID
    const idToDelete = assignmentId || formId;

    this.stageService
      .removeFormFromStage(stageId, idToDelete, formId)
      .pipe(
        switchMap(() => {
          // After successful deletion, reload the forms
          return this.stageService.getStageAssignedFormsRaw(stageId);
        }),
        map((assignmentRecords) => {
          // Map assignment records to Form objects

          let forms: Form[];

          if (this.availableForms.length === 0) {
            forms = assignmentRecords
              .map(
                (record: any) =>
                  ({
                    id: record.form_id,
                    name: `Form ${record.form_id.substring(0, 8)}...`,
                    status: 'active',
                    fields: [],
                    company_id: record.company_id,
                    created_at: record.created_at,
                    _assignmentId: record.id,
                  }) as any,
              )
              .filter((f): f is Form => f !== undefined);
          } else {
            forms = assignmentRecords
              .map((record: any) => {
                const foundForm = this.availableForms.find((f) => f.id === record.form_id);
                if (foundForm) {
                  return { ...foundForm, _assignmentId: record.id };
                }
                return {
                  id: record.form_id,
                  name: `Form ${record.form_id.substring(0, 8)}...`,
                  status: 'active',
                  fields: [],
                  company_id: record.company_id,
                  created_at: record.created_at,
                  _assignmentId: record.id,
                } as any;
              })
              .filter((f): f is Form => f !== undefined);
          }

          return forms;
        }),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (forms) => {
          // Update the selected stage (which is a reference to the stage in stages array)
          this.selectedStageForFormMgmt!.assignedForms = forms;

          this.isManagingForms = false;
          this.cdr.markForCheck();
        },
        error: (error) => {
          this.isManagingForms = false;
        },
      });
  }

  saveStage(): void {
    if (this.stageForm.invalid) return;

    this.isCreating = true;
    let formValue = this.stageForm.value;

    // Ensure team ID is included
    formValue.responsible_team_id = formValue.responsible_team_id || this.selectedTeamId || '';

    // Include selected user IDs (or empty array if none selected - means all team members)
    formValue.responsible_user_ids = Array.from(this.selectedUserIds);

    if (this.editingStageId) {
      // Update existing stage
      this.stageService
        .updateStage(this.editingStageId, formValue)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (updatedStage) => {
            const index = this.stages.findIndex((s) => s.id === this.editingStageId);
            if (index > -1) {
              this.stages[index] = updatedStage;
              this.stages.sort((a, b) => (a.order || 0) - (b.order || 0));
            }
            this.closeStageForm();
            this.isCreating = false;
            this.cdr.markForCheck();
          },
          error: (error) => {
            this.formError = error.message || 'Failed to update stage';
            this.isCreating = false;
          },
        });
    } else {
      // Create new stage
      this.stageService
        .createStage(formValue)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (stage) => {
            this.stages.push(stage);
            this.stages.sort((a, b) => (a.order || 0) - (b.order || 0));
            this.closeStageForm();
            this.isCreating = false;
            this.cdr.markForCheck();
          },
          error: (error) => {
            this.formError = error.message || 'Failed to create stage';
            this.isCreating = false;
          },
        });
    }
  }

  deleteStage(stageId: string): void {
    if (!confirm('Are you sure you want to delete this stage?')) return;

    this.stageService
      .deleteStage(stageId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.stages = this.stages.filter((s) => s.id !== stageId);
          this.cdr.markForCheck();
        },
        error: (error) => {},
      });
  }

  moveLead(leadId: string, event: any): void {
    const stageId = event.target.value;
    if (!stageId) return;

    this.leadService
      .moveLead(leadId, stageId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updatedLead) => {
          const leadIndex = this.allLeads.findIndex((l) => l.id === leadId);
          if (leadIndex > -1) {
            this.allLeads[leadIndex] = updatedLead;
            this.cdr.markForCheck();
          }
        },
        error: (error) => {},
      });
  }

  loadForms(): void {
    this.formService
      .getForms()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (forms) => {
          this.availableForms = forms;
          this.cdr.markForCheck();
        },
        error: (error) => {},
      });
  }

  // Matrix Model Helper Methods - Team Based
  toggleUserSelection(userId: string): void {
    if (this.selectedUserIds.has(userId)) {
      this.selectedUserIds.delete(userId);
    } else {
      this.selectedUserIds.add(userId);
    }
    this.cdr.markForCheck();
  }

  selectAllTeamMembers(): void {
    this.currentTeamMembers.forEach((member) => {
      this.selectedUserIds.add(member.id);
    });
    this.cdr.markForCheck();
  }

  clearAllTeamMembers(): void {
    this.selectedUserIds.clear();
    this.cdr.markForCheck();
  }

  onTeamSelected(event: any): void {
    const teamId = event.target.value;
    this.selectedTeamId = teamId || null;
    this.selectedUserIds.clear();

    if (teamId) {
      this.loadTeamMembers(teamId);
    } else {
      this.currentTeamMembers = [];
    }
    this.cdr.markForCheck();
  }

  loadTeamMembers(teamId: string): void {
    // Fetch team members from API
    this.teamService
      .getTeamMembers(teamId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (teamMembers) => {
          // Map team member objects to user objects
          // teamMembers contain user_id, need to enrich with user details
          this.currentTeamMembers = teamMembers
            .map((member: any) => {
              const user = this.users.find((u) => u.id === member.user_id);
              return user || { id: member.user_id, first_name: 'Unknown', last_name: 'User' };
            })
            .filter((user) => user); // Filter out any nulls
          this.cdr.markForCheck();
        },
        error: (error) => {
          // If API call fails, try to extract from local teams data
          const team = this.teams.find((t) => t.id === teamId);
          if (team && (team as any).members) {
            this.currentTeamMembers = this.users.filter((user) =>
              (team as any).members.some(
                (member: any) => member.id === user.id || member.user_id === user.id,
              ),
            );
          } else {
            this.currentTeamMembers = [];
          }
          this.cdr.markForCheck();
        },
      });
  }

  getUserName(userId: string): string {
    const user = this.users.find((u) => u.id === userId);
    return user ? `${user.first_name} ${user.last_name}` : userId;
  }

  getTeamName(teamId: string): string {
    const team = this.teams.find((t) => t.id === teamId);
    return team ? team.name : teamId;
  }

  /**
   * Check if form is hidden from a specific stage
   */
  isFormHiddenFromStage(form: Form, stageId: string | undefined): boolean {
    if (!stageId || !form.hidden_from_stages) return false;
    return form.hidden_from_stages.includes(stageId);
  }

  /**
   * Toggle form visibility for a stage
   */
  toggleFormVisibility(form: Form, stageId: string | undefined, event: any): void {
    if (!stageId || !form.id) return;

    const isChecked = event.target.checked;

    // Initialize hidden_from_stages if not exists
    if (!form.hidden_from_stages) {
      form.hidden_from_stages = [];
    }

    if (isChecked) {
      // Add stage to hidden list if not already there
      if (!form.hidden_from_stages.includes(stageId)) {
        form.hidden_from_stages.push(stageId);
      }
    } else {
      // Remove stage from hidden list
      form.hidden_from_stages = form.hidden_from_stages.filter((id) => id !== stageId);
    }

    // Make a copy for the update call
    const hiddenStages = form.hidden_from_stages ? [...form.hidden_from_stages] : [];

    // Persist to backend
    this.formService
      .updateFormVisibility(form.id, hiddenStages)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          // Success - form visibility updated
          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error('Failed to update form visibility:', error);
          // Revert the change on error
          if (isChecked && form.hidden_from_stages) {
            form.hidden_from_stages = form.hidden_from_stages.filter((id) => id !== stageId);
          } else if (!isChecked && form.hidden_from_stages) {
            form.hidden_from_stages.push(stageId);
          }
          this.cdr.markForCheck();
        },
      });
  }
}
