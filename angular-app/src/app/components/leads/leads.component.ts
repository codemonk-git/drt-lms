import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectorRef,
  ChangeDetectionStrategy,
  HostListener,
  ElementRef,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormsModule,
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { LeadService } from '../../services/lead.service';
import { StageService } from '../../services/stage.service';
import { FormService } from '../../services/form.service';
import { UserService } from '../../services/user.service';
import { TeamService } from '../../services/team.service';
import { AuthService } from '../../services/auth.service';
import { FollowupService } from '../../services/followup.service';
import { OwnershipService } from '../../services/ownership.service';
import { VisibilityService } from '../../services/visibility.service';
import { ActivityService } from '../../services/activity.service';
import { Lead, Stage, CreateLeadRequest, Stakeholder } from '../../models/api.models';
import { Subject } from 'rxjs';
import { takeUntil, switchMap } from 'rxjs/operators';

@Component({
  selector: 'app-leads',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet" />
    <div class="leads-layout">
      <!-- Main Content Area -->
      <div class="leads-main" [style.margin-right]="selectedLead ? '420px' : '0'">
        <!-- Header -->
        <div class="leads-header">
          <div class="header-left">
            <h1>Leads</h1>
            <p class="subtitle">Manage and track all your leads</p>
          </div>
          <div class="header-actions-group">
            <button
              class="btn-import-lead"
              (click)="openImportModal()"
              title="Import leads from Excel / CSV"
            >
              <span class="material-icons">upload_file</span><span class="btn-label"> Import</span>
            </button>
            <button class="btn-create-lead" (click)="openNewLeadForm()">
              <span class="material-icons">add</span><span class="btn-label"> New Lead</span>
            </button>
          </div>
        </div>

        <!-- Stage Filter Pipeline - Full Width -->
        <div class="stage-filter-pipeline-bar">
          <div class="pipeline-wrapper">
            <div class="pipeline-item-wrapper" [class.active]="filterStage.size === 0">
              <div
                class="stage-filter-item pipeline-start"
                role="button"
                tabindex="0"
                [class.active]="filterStage.size === 0"
                (click)="filterStage.clear(); applyFilters()"
                (keydown.enter)="filterStage.clear(); applyFilters()"
                (keydown.space)="filterStage.clear(); applyFilters()"
              >
                <span class="pipeline-icon">⊕</span>
                <span>All</span>
                <span class="stage-count-badge">{{ filteredLeads.length }}</span>
              </div>
              <div class="pipeline-active-line" *ngIf="filterStage.size === 0"></div>
            </div>
            <div
              *ngFor="let stage of stages; let i = index"
              class="pipeline-item-wrapper"
              [class.active]="filterStage.has(stage.id)"
              [style.--stage-color]="getStageColor(stage.id)"
            >
              <div
                class="stage-filter-item pipeline-stage"
                role="button"
                tabindex="0"
                [class.active]="filterStage.has(stage.id)"
                [style.--stage-color]="getStageColor(stage.id)"
                (click)="toggleFilterStage(stage.id)"
                (keydown.enter)="toggleFilterStage(stage.id)"
                (keydown.space)="toggleFilterStage(stage.id)"
              >
                {{ stage.name }}
                <span class="stage-count-badge">{{ getLeadCountForStage(stage.id) }}</span>
              </div>
              <div class="pipeline-active-line" *ngIf="filterStage.has(stage.id)"></div>
            </div>
          </div>

          <!-- Call Status Filter Chips -->
          <div class="call-status-filter-bar">
            <div class="call-status-filter-chips">
              <button
                class="call-status-filter-chip"
                [class.active]="!filterCallStatus"
                (click)="filterCallStatus = ''; applyFilters()"
                title="All Call Statuses"
              >
                All
                <span class="count-badge">{{ getLeadCountByCallStatus('') }}</span>
              </button>
              <button
                class="call-status-filter-chip"
                [class.active]="filterCallStatus === 'picked'"
                (click)="filterCallStatus = 'picked'; applyFilters()"
                title="Picked"
              >
                <span class="material-icons">phone</span>
                <span class="count-badge">{{ getLeadCountByCallStatus('picked') }}</span>
              </button>
              <button
                class="call-status-filter-chip"
                [class.active]="filterCallStatus === 'not_picked'"
                (click)="filterCallStatus = 'not_picked'; applyFilters()"
                title="Not Picked"
              >
                <span class="material-icons">phone_missed</span>
                <span class="count-badge">{{ getLeadCountByCallStatus('not_picked') }}</span>
              </button>
              <button
                class="call-status-filter-chip"
                [class.active]="filterCallStatus === 'busy'"
                (click)="filterCallStatus = 'busy'; applyFilters()"
                title="Busy/Callback"
              >
                <span class="material-icons">schedule</span>
                <span class="count-badge">{{ getLeadCountByCallStatus('busy') }}</span>
              </button>
              <button
                class="call-status-filter-chip important"
                [class.active]="filterCallStatus === 'switched_off'"
                (click)="filterCallStatus = 'switched_off'; applyFilters()"
                title="Switched Off"
              >
                <span class="material-icons">phone_disabled</span>
                <span class="count-badge">{{ getLeadCountByCallStatus('switched_off') }}</span>
              </button>
              <button
                class="call-status-filter-chip important"
                [class.active]="filterCallStatus === 'invalid'"
                (click)="filterCallStatus = 'invalid'; applyFilters()"
                title="Invalid"
              >
                <span class="material-icons">error</span>
                <span class="count-badge">{{ getLeadCountByCallStatus('invalid') }}</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Filters & Actions -->
        <div class="filters-bar">
          <!-- Search -->
          <div class="filter-group search-group">
            <span class="search-icon material-icons">search</span>
            <input
              type="text"
              placeholder="Search by name, phone or email…"
              [(ngModel)]="searchQuery"
              (ngModelChange)="applyFilters()"
              class="search-input"
            />
            <button
              *ngIf="searchQuery"
              class="search-clear"
              (click)="searchQuery = ''; applyFilters()"
              title="Clear"
            >
              <span class="material-icons">close</span>
            </button>
          </div>

          <!-- Assignee (quick) -->
          <select
            [(ngModel)]="filterAssignee"
            (ngModelChange)="applyFilters()"
            class="quick-select"
          >
            <option value="">All Assignees</option>
            <option value="__unassigned__">Unassigned</option>
            <option *ngFor="let u of getFilteredUsers()" [value]="u.id">
              {{ u.name || (u.first_name || '') + ' ' + (u.last_name || '') }}
            </option>
          </select>

          <!-- Followup (quick) -->
          <select
            [(ngModel)]="filterFollowup"
            (ngModelChange)="applyFilters()"
            class="quick-select"
          >
            <option value="">All Followups</option>
            <optgroup label="Status">
              <option value="has">Has Followup</option>
              <option value="none">No Followup</option>
              <option value="overdue">⚠ Overdue</option>
            </optgroup>
            <optgroup label="Date">
              <option value="today">Today</option>
              <option value="tomorrow">Tomorrow</option>
              <option value="this_week">This Week</option>
              <option value="next_week">Next Week</option>
              <option value="this_month">This Month</option>
              <option value="next_month">Next Month</option>
            </optgroup>
            <optgroup label="Custom">
              <option value="custom">Custom Range…</option>
            </optgroup>
          </select>

          <!-- Followup custom date range (inline) -->
          <ng-container *ngIf="filterFollowup === 'custom'">
            <input
              type="date"
              [(ngModel)]="filterFollowupFrom"
              (ngModelChange)="applyFilters()"
              class="quick-date"
              title="Followup from"
            />
            <span class="quick-sep">→</span>
            <input
              type="date"
              [(ngModel)]="filterFollowupTo"
              (ngModelChange)="applyFilters()"
              class="quick-date"
              title="Followup to"
            />
          </ng-container>

          <!-- Source (quick) -->
          <select [(ngModel)]="filterSource" (ngModelChange)="applyFilters()" class="quick-select">
            <option value="">All Sources</option>
            <option value="website">Website</option>
            <option value="email">Email</option>
            <option value="phone">Phone</option>
            <option value="referral">Referral</option>
            <option value="social">Social</option>
            <option value="ads">Ads</option>
            <option value="cold_call">Cold Call</option>
            <option value="event">Event</option>
            <option value="other">Other</option>
          </select>

          <!-- More filters button (pushed to right) -->
          <div class="filter-bar-spacer"></div>
          <button
            class="btn-icon advanced-filter-btn"
            [class.active]="showFilters"
            (click)="toggleFilters()"
            title="More filters"
          >
            <span class="material-icons">tune</span>
            <span class="adv-btn-label">More</span>
            <span class="adv-filter-badge" *ngIf="advancedFilterCount > 0">{{
              advancedFilterCount
            }}</span>
          </button>
        </div>

        <!-- Advanced Filter Panel -->
        <div class="afp-backdrop" *ngIf="showFilters" (click)="toggleFilters()"></div>
        <div class="advanced-filter-panel" *ngIf="showFilters">
          <div class="afp-drag-handle"></div>
          <div class="afp-header">
            <span class="afp-title">
              <span class="material-icons">tune</span>
              Filters
              <span class="afp-count" *ngIf="advancedFilterCount > 0">{{
                advancedFilterCount
              }}</span>
            </span>
            <div class="afp-header-actions">
              <button class="afp-clear-btn" (click)="resetFilters()" *ngIf="activeFilterCount > 0">
                <span class="material-icons">clear_all</span>
                Clear
              </button>
              <button class="afp-close-btn" (click)="toggleFilters()">
                <span class="material-icons">close</span>
              </button>
            </div>
          </div>

          <div class="afp-grid">
            <!-- Assigned To -->
            <div class="afp-field">
              <label class="afp-label">Assigned To</label>
              <select
                [(ngModel)]="filterAssignee"
                (ngModelChange)="applyFilters()"
                class="afp-input afp-select"
              >
                <option value="">All Assignees</option>
                <option value="__unassigned__">Unassigned</option>
                <option *ngFor="let u of getFilteredUsers()" [value]="u.id">
                  {{ u.name || (u.first_name || '') + ' ' + (u.last_name || '') }}
                </option>
              </select>
            </div>

            <!-- Source -->
            <div class="afp-field">
              <label class="afp-label">Source</label>
              <select
                [(ngModel)]="filterSource"
                (ngModelChange)="applyFilters()"
                class="afp-input afp-select"
              >
                <option value="">All Sources</option>
                <option value="website">Website</option>
                <option value="email">Email</option>
                <option value="phone">Phone</option>
                <option value="referral">Referral</option>
                <option value="social">Social</option>
                <option value="ads">Ads</option>
                <option value="cold_call">Cold Call</option>
                <option value="event">Event</option>
                <option value="other">Other</option>
              </select>
            </div>

            <!-- Followup -->
            <div class="afp-field afp-field-wide">
              <label class="afp-label">Followup</label>
              <select
                [(ngModel)]="filterFollowup"
                (ngModelChange)="applyFilters()"
                class="afp-input afp-select"
              >
                <option value="">All Followups</option>
                <optgroup label="Status">
                  <option value="has">Has Followup</option>
                  <option value="none">No Followup</option>
                  <option value="overdue">⚠ Overdue</option>
                </optgroup>
                <optgroup label="Date">
                  <option value="today">Today</option>
                  <option value="tomorrow">Tomorrow</option>
                  <option value="this_week">This Week</option>
                  <option value="next_week">Next Week</option>
                  <option value="this_month">This Month</option>
                  <option value="next_month">Next Month</option>
                </optgroup>
                <optgroup label="Custom">
                  <option value="custom">Custom Range…</option>
                </optgroup>
              </select>
              <div class="afp-date-range" *ngIf="filterFollowup === 'custom'">
                <div class="afp-date-wrap">
                  <span class="afp-date-lbl">From</span>
                  <input
                    type="date"
                    [(ngModel)]="filterFollowupFrom"
                    (ngModelChange)="applyFilters()"
                    class="afp-date"
                  />
                </div>
                <span class="afp-sep">→</span>
                <div class="afp-date-wrap">
                  <span class="afp-date-lbl">To</span>
                  <input
                    type="date"
                    [(ngModel)]="filterFollowupTo"
                    (ngModelChange)="applyFilters()"
                    class="afp-date"
                  />
                </div>
              </div>
            </div>

            <!-- Lead Status -->
            <div class="afp-field">
              <label class="afp-label">Lead Status</label>
              <div class="afp-toggle-group">
                <button
                  class="afp-toggle"
                  [class.on]="filterStatus === ''"
                  (click)="filterStatus = ''; applyFilters()"
                >
                  All
                </button>
                <button
                  class="afp-toggle"
                  [class.on]="filterStatus === 'active'"
                  (click)="filterStatus = 'active'; applyFilters()"
                >
                  Active
                </button>
                <button
                  class="afp-toggle"
                  [class.on]="filterStatus === 'won'"
                  (click)="filterStatus = 'won'; applyFilters()"
                >
                  <span class="material-icons" style="font-size:13px;color:#16a34a"
                    >emoji_events</span
                  >
                  Won
                </button>
                <button
                  class="afp-toggle"
                  [class.on]="filterStatus === 'lost'"
                  (click)="filterStatus = 'lost'; applyFilters()"
                >
                  <span class="material-icons" style="font-size:13px;color:#dc2626">close</span>
                  Lost
                </button>
              </div>
            </div>

            <!-- Location -->
            <div class="afp-field">
              <label class="afp-label">Location</label>
              <input
                type="text"
                [(ngModel)]="filterLocation"
                (ngModelChange)="applyFilters()"
                class="afp-input"
                placeholder="City, state or region…"
              />
            </div>

            <!-- Project -->
            <div class="afp-field">
              <label class="afp-label">Project</label>
              <input
                type="text"
                [(ngModel)]="filterProject"
                (ngModelChange)="applyFilters()"
                class="afp-input"
                placeholder="Project name…"
              />
            </div>

            <!-- Campaign -->
            <div class="afp-field">
              <label class="afp-label">Campaign</label>
              <input
                type="text"
                [(ngModel)]="filterCampaign"
                (ngModelChange)="applyFilters()"
                class="afp-input"
                placeholder="Campaign name…"
              />
            </div>

            <!-- Created Date -->
            <div class="afp-field afp-field-wide">
              <label class="afp-label">Created Date</label>
              <div class="afp-date-range">
                <div class="afp-date-wrap">
                  <span class="afp-date-lbl">From</span>
                  <input
                    type="date"
                    [(ngModel)]="filterCreatedFrom"
                    (ngModelChange)="applyFilters()"
                    class="afp-date"
                  />
                </div>
                <span class="afp-sep">→</span>
                <div class="afp-date-wrap">
                  <span class="afp-date-lbl">To</span>
                  <input
                    type="date"
                    [(ngModel)]="filterCreatedTo"
                    (ngModelChange)="applyFilters()"
                    class="afp-date"
                  />
                </div>
              </div>
            </div>

            <!-- Last Contacted -->
            <div class="afp-field afp-field-wide">
              <label class="afp-label">Last Contacted</label>
              <div class="afp-date-range">
                <div class="afp-date-wrap">
                  <span class="afp-date-lbl">From</span>
                  <input
                    type="date"
                    [(ngModel)]="filterLastContactedFrom"
                    (ngModelChange)="applyFilters()"
                    class="afp-date"
                  />
                </div>
                <span class="afp-sep">→</span>
                <div class="afp-date-wrap">
                  <span class="afp-date-lbl">To</span>
                  <input
                    type="date"
                    [(ngModel)]="filterLastContactedTo"
                    (ngModelChange)="applyFilters()"
                    class="afp-date"
                  />
                </div>
              </div>
            </div>

            <!-- Activity -->
            <div class="afp-field afp-field-wide">
              <label class="afp-label">Recent Activity</label>
              <div class="afp-activity-presets">
                <button
                  class="afp-preset-btn"
                  [class.active]="filterActivityPreset === ''"
                  (click)="
                    filterActivityPreset = '';
                    filterActivityFrom = '';
                    filterActivityTo = '';
                    applyFilters()
                  "
                >
                  All
                </button>
                <button
                  class="afp-preset-btn"
                  [class.active]="filterActivityPreset === 'today'"
                  (click)="setActivityPreset('today')"
                >
                  Today
                </button>
                <button
                  class="afp-preset-btn"
                  [class.active]="filterActivityPreset === 'yesterday'"
                  (click)="setActivityPreset('yesterday')"
                >
                  Yesterday
                </button>
                <button
                  class="afp-preset-btn"
                  [class.active]="filterActivityPreset === 'this_week'"
                  (click)="setActivityPreset('this_week')"
                >
                  This Week
                </button>
                <button
                  class="afp-preset-btn"
                  [class.active]="filterActivityPreset === 'this_month'"
                  (click)="setActivityPreset('this_month')"
                >
                  This Month
                </button>
                <button
                  class="afp-preset-btn"
                  [class.active]="filterActivityPreset === 'custom'"
                  (click)="filterActivityPreset = 'custom'; applyFilters()"
                >
                  Custom
                </button>
              </div>
              <div class="afp-date-range" *ngIf="filterActivityPreset === 'custom'">
                <div class="afp-date-wrap">
                  <span class="afp-date-lbl">From</span>
                  <input
                    type="date"
                    [(ngModel)]="filterActivityFrom"
                    (ngModelChange)="applyFilters()"
                    class="afp-date"
                  />
                </div>
                <span class="afp-sep">→</span>
                <div class="afp-date-wrap">
                  <span class="afp-date-lbl">To</span>
                  <input
                    type="date"
                    [(ngModel)]="filterActivityTo"
                    (ngModelChange)="applyFilters()"
                    class="afp-date"
                  />
                </div>
              </div>
              <div class="afp-activity-types" style="margin-top: 8px;">
                <button
                  class="afp-type-btn"
                  [class.active]="filterActivityType === ''"
                  (click)="filterActivityType = ''; applyFilters()"
                  title="All activity types"
                >
                  All
                </button>
                <button
                  class="afp-type-btn"
                  [class.active]="filterActivityType === 'call_logged'"
                  (click)="filterActivityType = 'call_logged'; applyFilters()"
                  title="Calls"
                >
                  <span class="material-icons">call</span>
                </button>
                <button
                  class="afp-type-btn"
                  [class.active]="filterActivityType === 'lead_stage_changed'"
                  (click)="filterActivityType = 'lead_stage_changed'; applyFilters()"
                  title="Stage changes"
                >
                  <span class="material-icons">swap_horiz</span>
                </button>
                <button
                  class="afp-type-btn"
                  [class.active]="filterActivityType === 'followup_scheduled'"
                  (click)="filterActivityType = 'followup_scheduled'; applyFilters()"
                  title="Followups"
                >
                  <span class="material-icons">event</span>
                </button>
                <button
                  class="afp-type-btn"
                  [class.active]="filterActivityType === 'note_added'"
                  (click)="filterActivityType = 'note_added'; applyFilters()"
                  title="Notes"
                >
                  <span class="material-icons">note</span>
                </button>
                <button
                  class="afp-type-btn"
                  [class.active]="filterActivityType === 'lead_assigned'"
                  (click)="filterActivityType = 'lead_assigned'; applyFilters()"
                  title="Assignments"
                >
                  <span class="material-icons">assignment_ind</span>
                </button>
                <button
                  class="afp-type-btn"
                  [class.active]="filterActivityType === 'whatsapp_sent'"
                  (click)="filterActivityType = 'whatsapp_sent'; applyFilters()"
                  title="WhatsApp"
                >
                  <span class="material-icons">chat</span>
                </button>
              </div>
            </div>
          </div>

          <div class="afp-footer">
            <span class="afp-result-count"
              >{{ filteredLeads.length }} lead{{
                filteredLeads.length !== 1 ? 's' : ''
              }}
              match</span
            >
          </div>
        </div>

        <!-- Bulk Action Bar -->
        <!-- Floating Bulk Action Capsule -->
        <div class="bulk-capsule" *ngIf="selectedLeadIds.size > 0">
          <span class="bulk-capsule-count">
            <span class="material-icons" style="font-size:14px;vertical-align:middle"
              >check_circle</span
            >
            {{ selectedLeadIds.size }}
          </span>
          <div class="bulk-capsule-divider"></div>
          <div class="bulk-capsule-action" title="Move to stage">
            <span class="material-icons">swap_horiz</span>
            <select
              class="bulk-inline-select"
              [(ngModel)]="bulkStageId"
              (change)="bulkAssignStage()"
            >
              <option value="">Stage</option>
              <option *ngFor="let s of stages" [value]="s.id">{{ s.name }}</option>
            </select>
          </div>
          <div class="bulk-capsule-divider"></div>
          <div class="bulk-capsule-action" title="Assign to user">
            <span class="material-icons">person_add</span>
            <select class="bulk-inline-select" [(ngModel)]="bulkUserId" (change)="bulkAssignUser()">
              <option value="">Assign</option>
              <option *ngFor="let u of getFilteredUsers()" [value]="u.id">
                {{ u.name || (u.first_name || '') + ' ' + (u.last_name || '') }}
              </option>
            </select>
          </div>
          <div class="bulk-capsule-divider" *ngIf="!userIsTeamLead"></div>
          <button
            *ngIf="!userIsTeamLead"
            class="bulk-capsule-btn"
            (click)="copySelectedPhones()"
            title="Copy phone numbers"
          >
            <span class="material-icons">{{ phoneCopied ? 'check' : 'content_copy' }}</span>
          </button>
          <div class="bulk-capsule-divider" *ngIf="!userIsTeamLead"></div>
          <button
            *ngIf="!userIsTeamLead"
            class="bulk-capsule-btn danger"
            (click)="bulkDelete()"
            title="Delete selected"
          >
            <span class="material-icons">delete_outline</span>
          </button>
          <button class="bulk-capsule-btn" (click)="clearSelection()" title="Clear selection">
            <span class="material-icons">close</span>
          </button>
        </div>

        <!-- Leads List -->
        <div class="leads-list-container" #leadsScroll (dragstart)="$event.preventDefault()">
          <!-- Select-all header -->
          <div class="leads-list-header" *ngIf="filteredLeads.length > 0">
            <label class="select-all-checkbox" title="Select all (Ctrl+A)">
              <input
                type="checkbox"
                [checked]="isAllSelected()"
                [indeterminate]="isSomeSelected()"
                (change)="toggleSelectAll($event)"
              />
            </label>
            <span class="list-count">{{ filteredLeads.length }} leads</span>
            <span class="select-hint" *ngIf="selectedLeadIds.size === 0"
              >Shift+click · drag · Ctrl+A</span
            >
            <span class="select-hint selected" *ngIf="selectedLeadIds.size > 0">Esc to clear</span>
          </div>
          <div class="leads-list">
            <div *ngIf="filteredLeads.length === 0" class="empty-state">
              <p>No leads found</p>
            </div>

            <div
              *ngFor="let lead of filteredLeads; let i = index"
              class="lead-item"
              [attr.data-lead-id]="lead.id"
              [class.active]="selectedLead?.id === lead.id && selectedLeadIds.size === 0"
              [class.checked]="selectedLeadIds.has(lead.id)"
              (click)="handleLeadClick(lead, $event, i)"
              (mousedown)="startDragSelect(lead.id, i, $event)"
              (mouseenter)="onDragEnter(lead.id, i)"
              (mouseup)="endDragSelect()"
            >
              <label class="lead-checkbox" (click)="$event.stopPropagation()">
                <input
                  type="checkbox"
                  [checked]="selectedLeadIds.has(lead.id)"
                  (change)="toggleLeadSelection(lead.id, i, $event)"
                />
              </label>
              <div class="lead-item-body">
                <!-- Row 1: Name + source -->
                <div class="li-row li-row-1">
                  <span class="li-name">{{ lead.name }}</span>
                  <span class="li-source source-{{ lead.source }}">{{ lead.source }}</span>
                </div>
                <!-- Row 2: Phone + company -->
                <div class="li-row li-row-2">
                  <span class="li-chip" *ngIf="lead.phone">
                    <span class="material-icons">call</span>{{ lead.phone }}
                  </span>
                  <span class="li-chip li-chip-muted" *ngIf="lead.company">
                    <span class="material-icons">business</span>{{ lead.company }}
                  </span>
                </div>
                <!-- Row 3: Stage + quick actions -->
                <div class="li-row li-row-3" (click)="$event.stopPropagation()">
                  <span class="li-stage">{{
                    getStageLabel(lead.stage_id || '') || lead.stage || '—'
                  }}</span>
                  <div class="li-actions">
                    <button
                      class="li-act li-act-call"
                      title="Call"
                      (click)="quickCall(lead, $event)"
                      [disabled]="!lead.phone"
                    >
                      <span class="material-icons">call</span>
                    </button>
                    <button
                      class="li-act li-act-wa"
                      title="WhatsApp"
                      (click)="quickWhatsApp(lead, $event)"
                      [disabled]="!lead.phone"
                    >
                      <span class="material-icons">chat</span>
                    </button>
                    <button
                      class="li-act li-act-fu"
                      title="Followup"
                      (click)="quickFollowup(lead, $event)"
                    >
                      <span class="material-icons">event</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Side Panel - Lead Details -->
      <div class="side-panel" *ngIf="selectedLead">
        <!-- Thin top bar: just close + assign, always visible -->
        <div class="panel-header">
          <div class="header-actions">
            <div class="header-right">
              <button class="btn-close" title="Close" (click)="closeSidePanel()">
                <span class="material-icons">close</span>
              </button>
              <!-- Assign to User - Compact -->
              <select
                class="assign-user-select-compact"
                [(ngModel)]="selectedAssignedUserId"
                (change)="assignLeadToUser()"
                title="Assign to User"
              >
                <option value="">Unassigned</option>
                <option *ngFor="let user of getFilteredUsers()" [value]="user.id">
                  {{ user.name || (user.first_name || '') + ' ' + (user.last_name || '') }}
                </option>
              </select>
            </div>
          </div>
        </div>

        <!-- Panel Content - Scrollable (all content incl. contact info + actions) -->
        <div class="panel-content">
          <!-- Contact hero - scrolls with content -->
          <div class="contact-info">
            <h3 class="lead-name">{{ selectedLead.name }}</h3>
            <p class="lead-email">{{ selectedLead.email }}</p>
            <p class="lead-phone">{{ selectedLead.phone || '—' }}</p>
          </div>

          <!-- Action Buttons - scrollable, not fixed -->
          <div class="action-buttons-row">
            <button class="action-btn-circle call" title="Call" (click)="callLead()">
              <span class="material-icons">call</span>
            </button>
            <button class="action-btn-circle whatsapp" title="WhatsApp" (click)="whatsappLead()">
              <span class="material-icons">message</span>
            </button>
            <button class="action-btn-circle note" title="Add Note" (click)="addNote()">
              <span class="material-icons">note_add</span>
            </button>
            <button
              class="action-btn-circle followup"
              title="Set Followup"
              (click)="openSetFollowupModal()"
            >
              <span class="material-icons">schedule</span>
            </button>
          </div>
          <!-- Call Status Selection as Chips -->
          <div class="call-status-chips-section">
            <label class="chips-label">Call Status</label>
            <div class="call-status-chips">
              <button
                class="call-status-chip"
                [class.active]="selectedLead.call_status === 'picked'"
                (click)="updateCallStatus('picked')"
                title="Picked"
              >
                <span class="material-icons">phone</span> Picked
              </button>
              <button
                class="call-status-chip"
                [class.active]="selectedLead.call_status === 'not_picked'"
                (click)="updateCallStatus('not_picked')"
                title="Not Picked"
              >
                <span class="material-icons">phone_missed</span> Not Picked
              </button>
              <button
                class="call-status-chip"
                [class.active]="selectedLead.call_status === 'busy'"
                (click)="updateCallStatus('busy')"
                title="Busy / Callback"
              >
                <span class="material-icons">schedule</span> Busy/Callback
              </button>
              <button
                class="call-status-chip important"
                [class.active]="selectedLead.call_status === 'switched_off'"
                (click)="updateCallStatus('switched_off')"
                title="Switched Off"
              >
                <span class="material-icons">phone_disabled</span> Switched Off
              </button>
              <button
                class="call-status-chip important"
                [class.active]="selectedLead.call_status === 'invalid'"
                (click)="updateCallStatus('invalid')"
                title="Invalid"
              >
                <span class="material-icons">error</span> Invalid
              </button>
            </div>
          </div>

          <!-- Stage Selection as Chips -->
          <div class="stage-chips-section">
            <label class="chips-label">Pipeline Stage</label>
            <div class="stage-chips">
              <button
                *ngFor="let stage of stages"
                class="stage-chip"
                [class.active]="selectedLead.stage_id === stage.id"
                (click)="changeStage(stage.id)"
              >
                {{ stage.name }}
              </button>
              <!-- Show current stage if not found in loaded stages -->
              <button
                *ngIf="isStageUnlinked()"
                class="stage-chip active unlinked"
                (click)="assignToFirstStage()"
                title="Click to assign to first available stage"
              >
                {{ selectedLead.stage }} (removed)
              </button>
            </div>
          </div>

          <!-- Lead Details -->
          <div class="lead-details-section">
            <h3 class="section-title">Lead Details</h3>
            <div class="details-grid">
              <div class="detail-item">
                <span class="detail-label">Phone</span>
                <span class="detail-value">{{ selectedLead.phone || '—' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Company</span>
                <span class="detail-value">{{ selectedLead.company_name || '—' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Source</span>
                <span class="detail-value">
                  <span class="source-badge" [class]="'source-' + selectedLead.source">
                    {{ selectedLead.source }}
                  </span>
                </span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Status</span>
                <span class="detail-value">
                  <span class="status-badge" [class]="'status-' + selectedLead.status">
                    {{ selectedLead.status | titlecase }}
                  </span>
                </span>
              </div>
              <div class="detail-item" *ngIf="selectedLead.last_contacted_at">
                <span class="detail-label">Last Contact</span>
                <span class="detail-value">{{
                  selectedLead.last_contacted_at | date: 'MMM d, yyyy h:mm a'
                }}</span>
              </div>
              <div class="detail-item" *ngIf="selectedLead.last_contact_type">
                <span class="detail-label">Contact Type</span>
                <span class="detail-value">{{ selectedLead.last_contact_type | titlecase }}</span>
              </div>
            </div>

            <!-- Custom Fields -->
            <div
              class="custom-fields-subsection"
              *ngIf="
                selectedLead &&
                selectedLead.custom_fields &&
                (selectedLead.custom_fields | keyvalue).length > 0
              "
            >
              <h4 class="subsection-title">Additional Information</h4>
              <div class="custom-fields-list">
                <div
                  class="custom-field-item"
                  *ngFor="let field of selectedLead.custom_fields | keyvalue"
                >
                  <span class="field-label">{{ field.key | titlecase }}:</span>
                  <span class="field-value">{{ field.value }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- All Stages & Forms Accordion -->
          <div class="stages-accordion-section">
            <h3 class="section-title">Stage Forms</h3>
            <div class="stages-accordion">
              <div
                *ngFor="let stage of stages"
                class="sa-item"
                [class.sa-current]="selectedLead?.stage_id === stage.id"
              >
                <button
                  class="sa-header"
                  (click)="toggleStageAccordion(stage.id)"
                  [class.sa-open]="stageAccordionOpen.has(stage.id)"
                >
                  <div class="sa-header-left">
                    <span
                      class="sa-dot"
                      [class.sa-dot-active]="selectedLead?.stage_id === stage.id"
                    ></span>
                    <span class="sa-name">{{ stage.name }}</span>
                    <span class="sa-current-badge" *ngIf="selectedLead?.stage_id === stage.id"
                      >Current</span
                    >
                  </div>
                  <div class="sa-header-right">
                    <span class="sa-forms-count" *ngIf="stage.assignedForms?.length">
                      <span
                        class="sa-submitted-count"
                        [class.sa-all-done]="
                          getStageSubmittedCount(stage) === stage.assignedForms?.length
                        "
                        >{{ getStageSubmittedCount(stage) }}</span
                      >/{{ stage.assignedForms?.length }}
                    </span>
                    <span class="sa-no-forms" *ngIf="!stage.assignedForms?.length">No forms</span>
                    <span class="material-icons sa-chevron">{{
                      stageAccordionOpen.has(stage.id) ? 'expand_less' : 'expand_more'
                    }}</span>
                  </div>
                </button>
                <div class="sa-body" *ngIf="stageAccordionOpen.has(stage.id)">
                  <div *ngIf="!stage.assignedForms?.length" class="sa-empty">
                    No forms assigned to this stage.
                  </div>
                  <div *ngFor="let form of stage.assignedForms" class="sa-form">
                    <div class="sa-form-header">
                      <span class="sa-form-name">{{ form.name || form.id }}</span>
                      <span *ngIf="submittedForms.has(form.id)" class="sa-submitted-badge"
                        >Submitted</span
                      >
                    </div>
                    <div class="sa-fields" *ngIf="form.fields?.length">
                      <div *ngFor="let field of form.fields" class="sa-field">
                        <label class="sa-field-label">{{ field.label }}</label>
                        <input
                          [type]="field.field_type || 'text'"
                          class="sa-field-input"
                          [class.sa-readonly]="submittedForms.has(form.id)"
                          [placeholder]="
                            formValues[form.id + '_' + field.id] ? '' : field.placeholder || '—'
                          "
                          [(ngModel)]="formValues[form.id + '_' + field.id]"
                          [readOnly]="submittedForms.has(form.id)"
                        />
                      </div>
                    </div>
                    <div *ngIf="!form.fields?.length" class="sa-empty">No fields in this form.</div>
                    <button
                      *ngIf="
                        !submittedForms.has(form.id) &&
                        form.fields?.length &&
                        selectedLead?.stage_id === stage.id
                      "
                      class="sa-submit-btn"
                      (click)="submitForm(selectedLead!.id, form.id)"
                    >
                      Submit
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Scheduled Followups -->
          <div class="followups-section">
            <h3 class="section-title">Scheduled Followups</h3>
            <div *ngIf="selectedLeadFollowups.length === 0" class="empty-followups">
              <p>No followups scheduled</p>
            </div>
            <div *ngFor="let followup of selectedLeadFollowups" class="followup-item">
              <div class="followup-header">
                <span class="followup-type" [class]="'type-' + followup.title?.toLowerCase()">
                  {{ followup.title | titlecase }}
                </span>
                <span class="followup-time">{{
                  followup.scheduled_for | date: 'MMM d, h:mm a'
                }}</span>
                <button
                  class="followup-delete"
                  (click)="deleteFollowup(followup.id)"
                  title="Delete"
                >
                  <span class="material-icons">close</span>
                </button>
              </div>
              <div class="followup-status">
                <span class="status-badge" [class]="'status-' + getFollowupStatus(followup)">
                  {{ getFollowupStatus(followup) | titlecase }}
                </span>
              </div>
            </div>
          </div>

          <!-- Notes Section -->
          <div class="notes-section" *ngIf="selectedLead">
            <div class="notes-header">
              <h3 class="section-title">Notes</h3>
              <button class="btn-icon" (click)="toggleAddNote()" title="Add Note">
                <span class="material-icons">{{ showAddNoteForm ? 'close' : 'add' }}</span>
              </button>
            </div>

            <div class="add-note-form" *ngIf="showAddNoteForm">
              <textarea
                [(ngModel)]="newNote"
                placeholder="Write a note..."
                class="note-textarea"
              ></textarea>
              <div class="note-form-actions">
                <button class="btn-primary" (click)="saveNote()">Save</button>
                <button class="btn-secondary" (click)="toggleAddNote()">Cancel</button>
              </div>
            </div>

            <p *ngIf="leadNotes.length === 0 && !showAddNoteForm" class="empty-notes">
              No notes yet
            </p>
            <div class="notes-list">
              <div *ngFor="let note of leadNotes" class="note-item">
                <div class="note-content">{{ note.content }}</div>
                <div class="note-meta">
                  <span class="note-author">{{ note.author_name }}</span>
                  <span class="note-dot">·</span>
                  <span class="note-time">{{ note.created_at | date: 'MMM d, h:mm a' }}</span>
                  <button class="note-delete" (click)="deleteNote(note.id)" title="Delete">
                    ✕
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Activities Section -->
          <div class="activities-section" *ngIf="selectedLead">
            <h3 class="section-title">Activities Journey</h3>

            <!-- Activity Filter Chips -->
            <div class="activity-filters">
              <button
                class="filter-chip"
                [class.active]="!selectedActivityFilter || selectedActivityFilter === 'all'"
                (click)="filterActivities('all')"
              >
                All
              </button>
              <button
                class="filter-chip"
                [class.active]="selectedActivityFilter === 'call'"
                (click)="filterActivities('call')"
              >
                <span class="material-icons">phone</span> Calls
              </button>
              <button
                class="filter-chip"
                [class.active]="selectedActivityFilter === 'whatsapp'"
                (click)="filterActivities('whatsapp')"
              >
                <span class="material-icons">forum</span> WhatsApp
              </button>
              <button
                class="filter-chip"
                [class.active]="selectedActivityFilter === 'note'"
                (click)="filterActivities('note')"
              >
                <span class="material-icons">note</span> Notes
              </button>
              <button
                class="filter-chip"
                [class.active]="selectedActivityFilter === 'followup'"
                (click)="filterActivities('followup')"
              >
                <span class="material-icons">schedule</span> Followups
              </button>
              <button
                class="filter-chip"
                [class.active]="selectedActivityFilter === 'email'"
                (click)="filterActivities('email')"
              >
                <span class="material-icons">email</span> Emails
              </button>
              <button
                class="filter-chip"
                [class.active]="selectedActivityFilter === 'form_submitted'"
                (click)="filterActivities('form_submitted')"
              >
                <span class="material-icons">done_all</span> Forms
              </button>
              <button
                class="filter-chip"
                [class.active]="selectedActivityFilter === 'stage_changed'"
                (click)="filterActivities('stage_changed')"
              >
                <span class="material-icons">trending_up</span> Stage Changes
              </button>
              <button
                class="filter-chip"
                [class.active]="selectedActivityFilter === 'assigned'"
                (click)="filterActivities('assigned')"
              >
                <span class="material-icons">person_add</span> Assignments
              </button>
            </div>

            <!-- Activities Timeline -->
            <p *ngIf="getFilteredActivities().length === 0" class="empty-log">No activities</p>
            <div class="activities-timeline">
              <div
                *ngFor="let activity of getFilteredActivities()"
                class="activity-item"
                [class]="'activity-' + activity.type"
              >
                <span class="activity-dot"></span>
                <div class="activity-body">
                  <div class="activity-row">
                    <span class="activity-type">{{ getActivityLabel(activity.type) }}</span>
                    <span class="activity-msg" *ngIf="activity.message">
                      · {{ activity.message }}</span
                    >
                  </div>
                  <div class="activity-meta">
                    <span class="activity-by">{{ activity.user_name || 'Unknown' }}</span>
                    <span class="activity-time">{{
                      activity.created_at | date: 'MMM d, h:mm a'
                    }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Panel Footer Actions -->
        <div class="panel-footer">
          <button class="btn-secondary" (click)="editLead()" *ngIf="!userIsTeamLead">
            <span class="material-icons">edit</span> Edit
          </button>
          <button class="btn-danger" (click)="confirmDeleteLead()" *ngIf="!userIsTeamLead">
            <span class="material-icons">delete</span> Delete
          </button>
        </div>
      </div>
    </div>

    <!-- Modal: Create/Edit Lead -->
    <div class="modal" *ngIf="showModal" [@fadeIn]>
      <div class="modal-content modal-wide">
        <!-- Header -->
        <div class="modal-header">
          <div class="modal-title-block">
            <span class="material-icons modal-title-icon">{{
              editingLead ? 'edit' : 'person_add'
            }}</span>
            <h2>{{ editingLead ? 'Edit Lead' : 'Create New Lead' }}</h2>
          </div>
          <button class="btn-close" (click)="closeModal()">
            <span class="material-icons">close</span>
          </button>
        </div>

        <form
          [formGroup]="leadForm"
          (ngSubmit)="saveLead()"
          class="modal-form modal-form-scrollable"
        >
          <!-- ── SECTION: Contact Info ── -->
          <div class="form-section">
            <div class="form-section-label">
              <span class="material-icons">person</span> Contact Info
            </div>
            <div class="form-group required">
              <label>Name</label>
              <input type="text" formControlName="name" placeholder="e.g. Rahul Sharma" />
              <span
                class="field-error"
                *ngIf="leadForm.get('name')?.invalid && leadForm.get('name')?.touched"
                >Required</span
              >
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Email</label>
                <input type="email" formControlName="email" placeholder="e.g. rahul@example.com" />
                <span
                  class="field-error"
                  *ngIf="leadForm.get('email')?.invalid && leadForm.get('email')?.touched"
                  >Valid email required</span
                >
              </div>
              <div class="form-group required">
                <label>Phone</label>
                <input type="tel" formControlName="phone" placeholder="e.g. +91 98765 43210" />
              </div>
            </div>
            <div class="form-group half">
              <label>Job Title</label>
              <input type="text" formControlName="title" placeholder="e.g. Product Manager" />
            </div>
          </div>

          <!-- ── SECTION: Company ── -->
          <div class="form-section">
            <div class="form-section-label">
              <span class="material-icons">business</span> Company
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Company Name</label>
                <input type="text" formControlName="company" placeholder="e.g. Acme Corp" />
              </div>
              <div class="form-group">
                <label>Website</label>
                <input type="url" formControlName="website" placeholder="https://acme.com" />
              </div>
            </div>
            <div class="form-group half">
              <label>Location / City</label>
              <input type="text" formControlName="location" placeholder="e.g. Mumbai, Indore" />
            </div>
          </div>

          <!-- ── SECTION: Lead Info ── -->
          <div class="form-section">
            <div class="form-section-label">
              <span class="material-icons">tune</span> Lead Details
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Source</label>
                <select formControlName="source">
                  <option value="">— Select source —</option>
                  <option value="website">Website</option>
                  <option value="email">Email</option>
                  <option value="phone">Phone</option>
                  <option value="referral">Referral</option>
                  <option value="social">Social Media</option>
                  <option value="campaign">Campaign</option>
                  <option value="walk_in">Walk-in</option>
                  <option value="manual">Manual</option>
                </select>
              </div>
              <div class="form-group">
                <label>Pipeline Stage</label>
                <select formControlName="stage_id">
                  <option value="">— Select stage —</option>
                  <option *ngFor="let s of stages" [value]="s.id">{{ s.name }}</option>
                </select>
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Project</label>
                <input type="text" formControlName="project" placeholder="e.g. 3BHK Apartment" />
              </div>
              <div class="form-group">
                <label>Campaign Name</label>
                <input
                  type="text"
                  formControlName="campaign_name"
                  placeholder="e.g. Diwali Offer 2026"
                />
              </div>
            </div>
            <div class="form-group">
              <label>Description / Notes</label>
              <textarea
                formControlName="description"
                rows="3"
                placeholder="Any extra details about this lead…"
              ></textarea>
            </div>
          </div>

          <!-- ── SECTION: Custom Fields ── -->
          <div class="form-section">
            <div class="form-section-label">
              <span class="material-icons">extension</span> Custom Fields
            </div>
            <div *ngFor="let cf of customFieldEntries; let i = index" class="custom-field-row">
              <input
                type="text"
                class="cf-key-input"
                [(ngModel)]="cf.key"
                [ngModelOptions]="{ standalone: true }"
                placeholder="Field name"
              />
              <input
                type="text"
                class="cf-value-input"
                [(ngModel)]="cf.value"
                [ngModelOptions]="{ standalone: true }"
                placeholder="Value"
              />
              <button
                type="button"
                class="btn-cf-remove"
                (click)="removeCustomField(i)"
                title="Remove"
              >
                <span class="material-icons">remove_circle_outline</span>
              </button>
            </div>
            <button type="button" class="btn-add-cf" (click)="addCustomField()">
              <span class="material-icons">add_circle_outline</span> Add Custom Field
            </button>
          </div>

          <!-- ── SECTION: Assignment ── -->
          <div class="form-section">
            <div class="form-section-label">
              <span class="material-icons">assignment_ind</span> Assignment
            </div>
            <div class="form-group half">
              <label>Assign To</label>
              <select formControlName="assigned_to_user_id">
                <option value="">— Unassigned —</option>
                <option *ngFor="let u of getFilteredUsers()" [value]="u.id || u.user_id">
                  {{ u.name || (u.first_name || '') + ' ' + (u.last_name || '') }} ({{ u.email }})
                </option>
              </select>
            </div>
          </div>

          <!-- Footer actions -->
          <div class="modal-footer">
            <button type="button" class="btn-secondary" (click)="closeModal()">Cancel</button>
            <button type="submit" class="btn-primary" [disabled]="leadForm.invalid || isSaving">
              <span class="material-icons">{{
                isSaving ? 'hourglass_empty' : editingLead ? 'save' : 'person_add'
              }}</span>
              {{ isSaving ? 'Saving…' : editingLead ? 'Save Changes' : 'Create Lead' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- ===================== IMPORT MODAL ===================== -->
    <div class="modal" *ngIf="showImportModal" [@fadeIn]>
      <div class="modal-content modal-import">
        <!-- Header -->
        <div class="modal-header">
          <div class="modal-title-block">
            <span class="material-icons modal-title-icon">upload_file</span>
            <h2>Import Leads</h2>
          </div>
          <button class="btn-close" (click)="closeImportModal()">
            <span class="material-icons">close</span>
          </button>
        </div>

        <!-- Step 1: Input -->
        <div class="import-body" *ngIf="importStep === 1">
          <!-- Tabs: Paste / File -->
          <div class="import-tabs">
            <button
              class="import-tab"
              [class.active]="importInputMode === 'paste'"
              (click)="importInputMode = 'paste'"
            >
              <span class="material-icons">content_paste</span> Paste from Excel
            </button>
            <button
              class="import-tab"
              [class.active]="importInputMode === 'file'"
              (click)="importInputMode = 'file'"
            >
              <span class="material-icons">table_chart</span> Upload CSV / Excel
            </button>
          </div>

          <!-- Paste mode -->
          <div *ngIf="importInputMode === 'paste'" class="import-paste-section">
            <p class="import-hint">
              Copy cells from Excel or Google Sheets (Ctrl+C) then paste below (Ctrl+V).<br />
              <strong>First row must be headers.</strong> Supported columns:
              <span class="col-chip" *ngFor="let c of importKnownColumns">{{ c }}</span>
            </p>
            <textarea
              class="import-textarea"
              [(ngModel)]="importRawPaste"
              [ngModelOptions]="{ standalone: true }"
              placeholder="Paste your copied Excel cells here…"
              rows="10"
              (paste)="onImportPaste($event)"
            ></textarea>
            <div class="import-actions-row">
              <button class="btn-secondary" (click)="closeImportModal()">Cancel</button>
              <button
                class="btn-primary"
                [disabled]="!importRawPaste.trim()"
                (click)="parseImportData()"
              >
                <span class="material-icons">table_view</span> Preview
              </button>
            </div>
          </div>

          <!-- File upload mode -->
          <div *ngIf="importInputMode === 'file'" class="import-file-section">
            <div
              class="file-drop-zone"
              [class.drag-over]="isDragOver"
              (dragover)="$event.preventDefault(); isDragOver = true"
              (dragleave)="isDragOver = false"
              (drop)="onFileDrop($event)"
              (click)="fileInput.click()"
            >
              <span class="material-icons drop-icon">cloud_upload</span>
              <p class="drop-label">
                Drag &amp; drop a <strong>CSV</strong> file here, or click to browse
              </p>
              <p class="drop-sub">Excel: save as CSV first (File → Save As → CSV UTF-8)</p>
              <input
                #fileInput
                type="file"
                accept=".csv,.txt"
                style="display:none"
                (change)="onFileSelect($event)"
              />
            </div>
            <p class="import-hint" style="margin-top:12px">
              <strong>First row must be headers.</strong> Supported columns:
              <span class="col-chip" *ngFor="let c of importKnownColumns">{{ c }}</span>
            </p>
            <div class="import-actions-row" *ngIf="importRawPaste.trim()">
              <button class="btn-secondary" (click)="closeImportModal()">Cancel</button>
              <button class="btn-primary" (click)="parseImportData()">
                <span class="material-icons">table_view</span> Preview
              </button>
            </div>
          </div>
        </div>

        <!-- Step 2: Preview -->
        <div class="import-body" *ngIf="importStep === 2">
          <div class="import-preview-header">
            <div class="import-preview-stats">
              <span class="stat-pill valid">{{ importValidRows }} valid</span>
              <span class="stat-pill invalid" *ngIf="importInvalidRows > 0"
                >{{ importInvalidRows }} skipped (missing required)</span
              >
            </div>
            <button class="btn-link" (click)="importStep = 1">← Back</button>
          </div>

          <div class="import-table-wrap">
            <table class="import-preview-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th *ngFor="let col of importPreviewColumns">{{ col }}</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  *ngFor="let row of importPreviewRows; let i = index"
                  [class.row-invalid]="!row._valid"
                >
                  <td class="row-num">{{ i + 1 }}</td>
                  <td *ngFor="let col of importPreviewColumns">{{ row[col] || '—' }}</td>
                  <td>
                    <span class="row-status" [class.ok]="row._valid" [class.err]="!row._valid">
                      {{ row._valid ? '✓ OK' : '✗ ' + row._error }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="import-actions-row">
            <button class="btn-secondary" (click)="closeImportModal()">Cancel</button>
            <button
              class="btn-primary"
              [disabled]="importValidRows === 0 || isImporting"
              (click)="runBulkImport()"
            >
              <span class="material-icons">{{
                isImporting ? 'hourglass_empty' : 'cloud_upload'
              }}</span>
              {{ isImporting ? 'Importing…' : 'Import ' + importValidRows + ' Leads' }}
            </button>
          </div>
        </div>

        <!-- Step 3: Result -->
        <div class="import-body import-result" *ngIf="importStep === 3">
          <span class="material-icons result-icon success">check_circle</span>
          <h3>Import Complete</h3>
          <p>
            <strong>{{ importResultSuccess }}</strong> leads imported successfully.
          </p>
          <p *ngIf="importResultFailed > 0" class="result-warn">
            {{ importResultFailed }} rows failed and were skipped.
          </p>
          <button class="btn-primary" style="margin-top:20px" (click)="closeImportModal()">
            Done
          </button>
        </div>
      </div>
    </div>
    <!-- ========================================================= -->

    <!-- Modal: Delete Confirmation -->
    <div class="modal" *ngIf="showDeleteConfirm" [@fadeIn]>
      <div class="modal-content modal-small">
        <div class="modal-header">
          <h2>Delete Lead?</h2>
        </div>
        <p class="modal-message">
          Are you sure you want to delete
          <strong>{{ selectedLead?.name }}</strong
          >? This cannot be undone.
        </p>
        <div class="form-actions">
          <button class="btn-secondary" (click)="cancelDelete()">Cancel</button>
          <button class="btn-danger" (click)="deleteLead()">Delete</button>
        </div>
      </div>
    </div>

    <!-- Followup Modal -->
    <div
      class="fu-modal-backdrop"
      *ngIf="showSetFollowupModal"
      (click)="closeSetFollowupModal()"
    ></div>
    <div class="fu-modal" *ngIf="showSetFollowupModal" [formGroup]="followupForm">
      <div class="fu-modal-header">
        <span class="material-icons fu-modal-icon">event</span>
        <h3 class="fu-modal-title">Schedule Followup</h3>
        <button class="fu-modal-close" (click)="closeSetFollowupModal()">
          <span class="material-icons">close</span>
        </button>
      </div>

      <div class="fu-modal-body">
        <!-- Lead name -->
        <div class="fu-lead-name" *ngIf="selectedLead">{{ selectedLead.name }}</div>

        <!-- Type -->
        <div class="fu-field">
          <label class="fu-label">Type</label>
          <div class="fu-type-row">
            <button
              *ngFor="let type of followupTypes"
              class="fu-type-btn"
              [class.fu-type-active]="followupForm.get('type')?.value === type"
              (click)="followupForm.get('type')?.setValue(type)"
            >
              <span class="material-icons">{{
                type === 'call'
                  ? 'call'
                  : type === 'meeting'
                    ? 'groups'
                    : type === 'email'
                      ? 'email'
                      : 'slideshow'
              }}</span>
              {{ type | titlecase }}
            </button>
          </div>
        </div>

        <!-- When -->
        <div class="fu-field">
          <label class="fu-label">When</label>
          <div class="fu-when-row">
            <button
              class="fu-when-btn"
              [class.fu-when-active]="followupForm.get('dateOption')?.value === 'tomorrow'"
              (click)="setFollowupDate('tomorrow')"
            >
              Tomorrow
            </button>
            <button
              class="fu-when-btn"
              [class.fu-when-active]="followupForm.get('dateOption')?.value === 'in3days'"
              (click)="setFollowupDate('in3days')"
            >
              In 3 days
            </button>
            <button
              class="fu-when-btn"
              [class.fu-when-active]="followupForm.get('dateOption')?.value === 'nextweek'"
              (click)="setFollowupDate('nextweek')"
            >
              Next week
            </button>
            <button
              class="fu-when-btn"
              [class.fu-when-active]="followupForm.get('dateOption')?.value === 'custom'"
              (click)="setFollowupDate('custom')"
            >
              Custom
            </button>
          </div>
          <input
            *ngIf="followupForm.get('dateOption')?.value === 'custom'"
            type="date"
            class="fu-date-input"
            formControlName="customDate"
          />
        </div>

        <!-- Time -->
        <div class="fu-field">
          <label class="fu-label">Time</label>
          <input type="time" class="fu-time-input" formControlName="time" />
        </div>
      </div>

      <div class="fu-modal-footer">
        <button class="fu-btn-cancel" (click)="closeSetFollowupModal()">Cancel</button>
        <button class="fu-btn-save" (click)="saveFollowup()">
          <span class="material-icons">check</span> Schedule
        </button>
      </div>
    </div>

    <!-- Modal: Team Member Selection for Stage Transition -->
    <div class="modal" *ngIf="showTeamSelectionDialog" [@fadeIn]>
      <div class="modal-content modal-medium">
        <div class="modal-header">
          <h2>Select Team Members</h2>
          <button class="btn-close" (click)="closeTeamSelectionDialog()">✕</button>
        </div>

        <div class="modal-body">
          <p class="modal-description">
            Multiple team members are assigned to the
            <strong>{{ pendingStageTransition?.stage?.name }}</strong> stage. Please select who will
            work on this lead at this stage.
          </p>

          <div class="team-members-list">
            <div class="list-header">
              <h4>Team Members</h4>
              <div class="list-actions">
                <button class="btn-link" (click)="selectAllTeamMembers()" title="Select All">
                  Select All
                </button>
                <span class="separator">•</span>
                <button class="btn-link" (click)="clearTeamMemberSelection()" title="Clear">
                  Clear
                </button>
              </div>
            </div>

            <div class="members-container">
              <div
                *ngFor="let member of stageTeamMembers"
                class="member-item"
                [class.selected]="selectedTeamMembers.has(member.id)"
              >
                <input
                  type="checkbox"
                  [id]="'member-' + member.id"
                  [checked]="selectedTeamMembers.has(member.id)"
                  (change)="toggleTeamMemberSelection(member.id)"
                  class="member-checkbox"
                />
                <label [for]="'member-' + member.id" class="member-label">
                  <span class="member-name">{{
                    member.name || (member.first_name || '') + ' ' + (member.last_name || '')
                  }}</span>
                  <span class="member-email">{{ member.email }}</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn-secondary" (click)="closeTeamSelectionDialog()">Cancel</button>
          <button
            class="btn-primary"
            (click)="confirmTeamMemberSelection()"
            [disabled]="selectedTeamMembers.size === 0"
          >
            Assign to Lead
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .leads-layout {
        display: flex;
        height: 100%;
        background: #f8f9fa;
        position: relative;
      }

      .leads-main {
        flex: 1;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        border-right: 1px solid #e5e7eb;
      }

      .leads-header {
        padding: 24px;
        background: white;
        border-bottom: 1px solid #e5e7eb;
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
      }

      .header-left h1 {
        margin: 0;
        font-size: 28px;
        font-weight: 800;
        color: #111827;
      }

      .subtitle {
        margin: 4px 0 0 0;
        font-size: 13px;
        color: #6b7280;
      }

      .btn-create-lead {
        padding: 10px 16px;
        background: #0284c7;
        color: white;
        border: none;
        border-radius: 6px;
        font-weight: 600;
        font-size: 13px;
        cursor: pointer;
        transition: all 0.2s;
        display: flex;
        align-items: center;
        gap: 6px;
        white-space: nowrap;
      }

      .btn-create-lead:hover {
        background: #0369a1;
        transform: translateY(-1px);
        box-shadow: 0 2px 4px rgba(2, 132, 199, 0.2);
      }

      /* ── Lead List ── */

      .stage-filter-pipeline-bar {
        padding: 12px 24px;
        background: white;
        border-bottom: 1px solid #e5e7eb;
        overflow-x: auto;
      }

      .filters-bar {
        padding: 10px 24px;
        background: white;
        border-bottom: 1px solid #e5e7eb;
        display: flex;
        gap: 8px;
        align-items: center;
        flex-wrap: nowrap;
      }

      .filter-bar-spacer {
        flex: 1 1 auto;
      }

      .quick-select {
        padding: 7px 10px;
        border: 1px solid #d1d5db;
        border-radius: 6px;
        font-size: 13px;
        color: #374151;
        background: white;
        cursor: pointer;
        transition: border-color 0.2s;
        flex-shrink: 0;
        max-width: 160px;
      }

      .quick-select:focus {
        outline: none;
        border-color: #0284c7;
        box-shadow: 0 0 0 3px rgba(2,132,199,0.1);
      }

      .quick-select[ng-reflect-model]:not([ng-reflect-model=""]) {
        border-color: #0284c7;
        background: #f0f9ff;
        color: #0369a1;
        font-weight: 600;
      }

      .quick-date {
        padding: 7px 8px;
        border: 1px solid #d1d5db;
        border-radius: 6px;
        font-size: 12px;
        color: #374151;
        background: white;
        flex-shrink: 0;
        width: 130px;
        transition: border-color 0.2s;
      }

      .quick-date:focus {
        outline: none;
        border-color: #0284c7;
        box-shadow: 0 0 0 3px rgba(2,132,199,0.1);
      }

      .quick-sep {
        font-size: 12px;
        color: #9ca3af;
        flex-shrink: 0;
      }

      .search-group {
        flex: 1;
        max-width: 380px;
        position: relative;
        display: flex;
        align-items: center;
      }

      .search-icon {
        position: absolute;
        left: 10px;
        font-size: 18px;
        color: #9ca3af;
        pointer-events: none;
      }

      .search-input {
        width: 100%;
        padding: 8px 32px 8px 36px;
        border: 1px solid #d1d5db;
        border-radius: 6px;
        font-size: 13px;
        transition: all 0.2s;
      }

      .search-input:focus {
        outline: none;
        border-color: #0284c7;
        box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.1);
      }

      .search-clear {
        position: absolute;
        right: 8px;
        background: none;
        border: none;
        cursor: pointer;
        color: #9ca3af;
        display: flex;
        align-items: center;
        padding: 0;
        line-height: 1;
      }

      .search-clear:hover { color: #374151; }
      .search-clear .material-icons { font-size: 16px; }

      .filter-bar-right {
        display: flex;
        align-items: center;
        gap: 8px;
        flex: 1;
        overflow: hidden;
      }

      .active-filter-chips {
        display: flex;
        align-items: center;
        gap: 6px;
        flex: 1;
        overflow-x: auto;
        padding: 2px 0;
      }

      .active-chip {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 3px 8px;
        background: #eff6ff;
        border: 1px solid #bfdbfe;
        border-radius: 20px;
        font-size: 11px;
        font-weight: 600;
        color: #1d4ed8;
        white-space: nowrap;
      }

      .chip-remove {
        background: none;
        border: none;
        cursor: pointer;
        color: #60a5fa;
        font-size: 14px;
        line-height: 1;
        padding: 0;
        margin-left: 1px;
      }

      .chip-remove:hover { color: #dc2626; }

      .advanced-filter-btn {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 7px 14px;
        background: white;
        border: 1px solid #d1d5db;
        border-radius: 6px;
        font-size: 13px;
        font-weight: 500;
        color: #374151;
        cursor: pointer;
        white-space: nowrap;
        position: relative;
        transition: all 0.2s;
      }

      .advanced-filter-btn .material-icons { font-size: 18px; }

      .advanced-filter-btn:hover {
        border-color: #0284c7;
        background: #f0f9ff;
        color: #0284c7;
      }

      .advanced-filter-btn.active {
        background: #0284c7;
        border-color: #0284c7;
        color: white;
      }

      .adv-btn-label { font-size: 13px; font-weight: 500; }

      .adv-filter-badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 18px;
        height: 18px;
        padding: 0 5px;
        border-radius: 9px;
        font-size: 11px;
        font-weight: 700;
        background: #dc2626;
        color: white;
        line-height: 1;
      }

      .advanced-filter-btn.active .adv-filter-badge {
        background: rgba(255,255,255,0.3);
      }

      /* Advanced Filter Panel */
      .advanced-filter-panel {
        background: #f8fafc;
        border-bottom: 2px solid #e5e7eb;
        animation: afp-slide-in 0.18s ease;
      }

      @keyframes afp-slide-in {
        from { opacity: 0; transform: translateY(-6px); }
        to   { opacity: 1; transform: translateY(0); }
      }

      .afp-backdrop { display: none; }

      .afp-drag-handle { display: none; }

      .afp-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 24px 0;
      }

      .afp-header-actions {
        display: flex;
        align-items: center;
        gap: 6px;
      }

      .afp-close-btn {
        display: none;
      }

      .afp-title {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 13px;
        font-weight: 700;
        color: #374151;
        letter-spacing: 0.3px;
      }

      .afp-title .material-icons { font-size: 16px; color: #0284c7; }

      .afp-count {
        background: #0284c7;
        color: white;
        font-size: 10px;
        font-weight: 700;
        padding: 1px 7px;
        border-radius: 10px;
        margin-left: 4px;
      }

      .afp-clear-btn {
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 5px 12px;
        background: white;
        border: 1px solid #fca5a5;
        border-radius: 6px;
        font-size: 12px;
        font-weight: 600;
        color: #dc2626;
        cursor: pointer;
        transition: all 0.15s;
      }

      .afp-clear-btn:hover { background: #fef2f2; }
      .afp-clear-btn .material-icons { font-size: 15px; }

      .afp-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
        gap: 16px;
        padding: 16px 24px;
      }

      .afp-field { display: flex; flex-direction: column; gap: 5px; }

      .afp-field-wide {
        grid-column: span 2;
      }

      .afp-label {
        font-size: 11px;
        font-weight: 700;
        color: #6b7280;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .afp-select, .afp-input {
        padding: 7px 10px;
        border: 1px solid #d1d5db;
        border-radius: 6px;
        font-size: 13px;
        color: #111827;
        background: white;
        width: 100%;
        transition: all 0.2s;
      }

      .afp-select:focus, .afp-input:focus {
        outline: none;
        border-color: #0284c7;
        box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.1);
      }

      .afp-toggle-group {
        display: flex;
        gap: 4px;
        flex-wrap: wrap;
      }

      .afp-toggle {
        padding: 5px 10px;
        border: 1px solid #d1d5db;
        border-radius: 5px;
        background: white;
        font-size: 12px;
        font-weight: 500;
        color: #374151;
        cursor: pointer;
        transition: all 0.15s;
        display: flex;
        align-items: center;
        gap: 3px;
      }

      .afp-toggle:hover { border-color: #0284c7; color: #0284c7; }

      .afp-toggle.on {
        background: #0284c7;
        border-color: #0284c7;
        color: white;
      }

      .afp-row-inner {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      .afp-date-range {
        display: flex;
        align-items: flex-end;
        gap: 6px;
      }

      .afp-date-wrap {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 3px;
        min-width: 0;
      }

      .afp-date-lbl {
        font-size: 10px;
        font-weight: 600;
        color: #9ca3af;
        text-transform: uppercase;
        letter-spacing: 0.4px;
      }

      .afp-date {
        width: 100%;
        box-sizing: border-box;
        padding: 6px 8px;
        border: 1px solid #d1d5db;
        border-radius: 6px;
        font-size: 12px;
        color: #374151;
        min-width: 0;
        background: white;
        transition: all 0.2s;
      }

      .afp-date:focus {
        outline: none;
        border-color: #0284c7;
        box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.1);
      }

      .afp-sep {
        font-size: 12px;
        color: #9ca3af;
        flex-shrink: 0;
      }

      .afp-activity-presets {
        display: flex;
        gap: 4px;
        flex-wrap: wrap;
      }

      .afp-preset-btn {
        padding: 5px 10px;
        border: 1px solid #d1d5db;
        border-radius: 5px;
        background: white;
        font-size: 12px;
        font-weight: 500;
        color: #374151;
        cursor: pointer;
        transition: all 0.15s;
        white-space: nowrap;
      }

      .afp-preset-btn:hover {
        border-color: #0284c7;
        color: #0284c7;
      }

      .afp-preset-btn.active {
        background: #0284c7;
        border-color: #0284c7;
        color: white;
      }

      .afp-activity-types {
        display: flex;
        gap: 4px;
        flex-wrap: wrap;
      }

      .afp-type-btn {
        padding: 5px 8px;
        border: 1px solid #d1d5db;
        border-radius: 5px;
        background: white;
        cursor: pointer;
        transition: all 0.15s;
        display: flex;
        align-items: center;
        justify-content: center;
        min-width: 32px;
        min-height: 32px;
        color: #6b7280;
      }

      .afp-type-btn .material-icons {
        font-size: 18px;
      }

      .afp-type-btn:hover {
        border-color: #0284c7;
        color: #0284c7;
      }

      .afp-type-btn.active {
        background: #0284c7;
        border-color: #0284c7;
        color: white;
      }

      .afp-footer {
        padding: 8px 24px 12px;
        border-top: 1px solid #e5e7eb;
        display: flex;
        align-items: center;
        justify-content: flex-end;
      }

      .afp-result-count {
        font-size: 12px;
        color: #6b7280;
        font-weight: 600;
      }

      .stage-filter-pipeline-bar {
        padding: 16px 24px;
        background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
        border-bottom: 2px solid #e5e7eb;
        overflow-x: auto;
        overflow-y: visible;
        padding-bottom: 24px;
        position: relative;
      }

      /* Call Status Filter Bar */
      .call-status-filter-bar {
        margin-top: 8px;
        overflow-x: auto;
      }

      .call-status-filter-chips {
        display: flex;
        gap: 6px;
        padding: 0 24px;
        margin-bottom: 0;
        min-width: fit-content;
      }

      .call-status-filter-chip {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 5px 12px;
        border: 1px solid #d1d5db;
        border-radius: 6px;
        background: white;
        color: #374151;
        font-size: 12px;
        font-weight: 500;
        cursor: pointer;
        white-space: nowrap;
        transition: all 0.2s ease;
      }

      .call-status-filter-chip:hover {
        border-color: #9333ea;
        background: #faf5ff;
        color: #6b21a8;
      }

      .call-status-filter-chip.active {
        background: linear-gradient(135deg, #a855f7 0%, #9333ea 100%);
        color: white;
        border-color: #7e22ce;
        box-shadow: 0 2px 8px rgba(168, 85, 247, 0.3);
      }

      .call-status-filter-chip.important {
        border-color: #fca5a5;
      }

      .call-status-filter-chip.important:hover {
        border-color: #dc2626;
        background: #fef2f2;
        color: #991b1b;
      }

      .call-status-filter-chip.important.active {
        background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
        color: white;
        border-color: #991b1b;
        box-shadow: 0 2px 8px rgba(239, 68, 68, 0.3);
      }

      .call-status-filter-chip .material-icons {
        font-size: 14px;
        line-height: 1;
      }

      .call-status-filter-chip .count-badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 16px;
        height: 16px;
        padding: 0 3px;
        border-radius: 8px;
        font-size: 10px;
        font-weight: 700;
        background: rgba(0, 0, 0, 0.1);
        color: inherit;
      }

      .call-status-filter-chip.active .count-badge {
        background: rgba(255, 255, 255, 0.25);
        color: white;
      }

      .pipeline-wrapper {
        display: flex;
        align-items: center;
        gap: 0;
        min-width: fit-content;
        padding-bottom: 10px;
      }

      .stage-filter-item {
        padding: 10px 20px;
        border: none;
        background: var(--stage-color, #0284c7);
        font-size: 13px;
        font-weight: 600;
        color: white;
        cursor: pointer;
        transition: none;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        white-space: nowrap;
        position: relative;
        clip-path: polygon(0 0, calc(100% - 14px) 0, 100% 50%, calc(100% - 14px) 100%, 0 100%, 12px 50%);
        z-index: 1;
        appearance: none;
        -webkit-appearance: none;
        -moz-appearance: none;
      }

      .stage-filter-item:focus {
        outline: none;
      }

      /* All button - same arrow shape as stages, grey color */
      .pipeline-start {
        background: #e5e7eb;
        color: #374151;
      }

      .pipeline-start:hover {
        background: #d1d5db;
      }

      .pipeline-start.active {
        background: #111827;
        color: white;
      }

      .pipeline-item-wrapper {
        display: flex;
        flex-direction: column;
        align-items: center;
        margin-right: -8px;
        position: relative;
      }

      .pipeline-item-wrapper:last-child {
        margin-right: 0;
      }

      .pipeline-stage {
        background: var(--stage-color, #0284c7);
        border: none;
        color: white;
        margin-right: 0;
      }

      .pipeline-stage:hover {
        background: var(--stage-color, #0284c7);
      }

      .pipeline-active-line {
        position: absolute;
        bottom: -8px;
        left: 50%;
        transform: translateX(-50%);
        height: 3px;
        background: #111827;
        border-radius: 2px;
        width: 40%;
      }

      .pipeline-stage.active {
        background: var(--stage-color, #0284c7) !important;
        color: white;
        outline: none;
        box-shadow: none;
      }

      .pipeline-icon {
        font-size: 14px;
      }

      .stage-count-badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 18px;
        height: 18px;
        padding: 0 5px;
        border-radius: 9px;
        font-size: 11px;
        font-weight: 700;
        line-height: 1;
        background: rgba(255, 255, 255, 0.25);
        color: inherit;
        letter-spacing: 0;
      }

      .pipeline-start .stage-count-badge {
        background: rgba(0, 0, 0, 0.12);
        color: #374151;
      }

      .pipeline-start.active .stage-count-badge {
        background: rgba(255, 255, 255, 0.2);
        color: white;
      }

      .pipeline-name {
        font-weight: 600;
        letter-spacing: 0.2px;
      }

      .stage-filter-pipeline {
        display: flex;
        align-items: center;
        gap: 0;
        overflow-x: auto;
        padding: 4px 0;
      }

      .stage-filter-item-old {
        padding: 8px 16px;
        border: none;
        background: white;
        border: 1px solid #e5e7eb;
        font-size: 13px;
        font-weight: 500;
        color: #6b7280;
        cursor: pointer;
        transition: all 0.2s ease;
        white-space: nowrap;
        position: relative;
      }

      .stage-filter-item-old:first-child {
        border-radius: 6px 0 0 6px;
      }

      .stage-filter-item-old:hover {
        border-color: #0284c7;
        color: #0284c7;
        background: #f0f9ff;
      }

      .stage-filter-item-old.active {
        color: white;
        border-color: currentColor;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        z-index: 2;
      }

      .pipeline-arrow-old {
        width: 24px;
        height: 32px;
        clip-path: polygon(0 0, 100% 50%, 0 100%);
        opacity: 0.8;
        margin: 0 -2px;
        z-index: 1;
      }

      .btn-icon {
        padding: 8px 12px;
        background: white;
        border: 1px solid #d1d5db;
        border-radius: 6px;
        font-size: 16px;
        cursor: pointer;
        transition: all 0.2s;
      }

      .btn-icon:hover,
      .btn-icon.active {
        background: #f3f4f6;
        border-color: #0284c7;
      }

      .leads-list-container {
        flex: 1;
        overflow-y: auto;
        background: #f8f9fa;
      }

      .leads-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
        padding: 12px;
      }

      .lead-item {
        background: white;
        border: none;
        border-bottom: 1px solid #f0f0f0;
        padding: 10px 14px 10px 10px;
        cursor: pointer;
        transition: background 0.12s;
        display: flex;
        align-items: flex-start;
        gap: 8px;
        user-select: none;
        -webkit-user-select: none;
      }

      .lead-item:hover { background: #f9fafb; }

      .lead-item.active {
        background: #f0f9ff;
        border-left: 3px solid #0284c7;
        padding-left: 11px;
      }

      .lead-item.checked {
        background: #f0f9ff;
        border-left: 3px solid #0284c7;
        padding-left: 11px;
      }

      .lead-checkbox {
        display: flex;
        align-items: center;
        padding-top: 1px;
        flex-shrink: 0;
        cursor: pointer;
      }

      .lead-checkbox input[type="checkbox"] {
        width: 15px;
        height: 15px;
        cursor: pointer;
        accent-color: #0284c7;
      }

      .lead-item-body {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 3px;
      }

      /* ── Row layout ── */
      .li-row {
        display: flex;
        align-items: center;
        gap: 6px;
        min-width: 0;
      }

      /* Row 1: name + source */
      .li-name {
        font-size: 13px;
        font-weight: 600;
        color: #111827;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        flex: 1;
        min-width: 0;
      }

      .li-source {
        font-size: 9px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.4px;
        padding: 1px 5px;
        border-radius: 3px;
        flex-shrink: 0;
        white-space: nowrap;
      }

      /* Row 2: contact chips */
      .li-chip {
        display: inline-flex;
        align-items: center;
        gap: 3px;
        font-size: 11px;
        color: #374151;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        min-width: 0;
        max-width: 48%;
      }

      .li-chip .material-icons {
        font-size: 12px;
        color: #9ca3af;
        flex-shrink: 0;
      }

      .li-chip-muted { color: #6b7280; }

      /* Row 3: stage + status dot + actions */
      .li-row-3 {
        justify-content: space-between;
        margin-top: 1px;
      }

      .li-stage {
        font-size: 10px;
        font-weight: 600;
        color: #6b7280;
        text-transform: uppercase;
        letter-spacing: 0.3px;
        flex: 1;
        min-width: 0;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      /* Ghost action icons */
      .li-actions {
        display: flex;
        align-items: center;
        gap: 0;
        flex-shrink: 0;
      }

      .li-act {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 26px;
        height: 26px;
        border: none;
        background: transparent;
        border-radius: 5px;
        cursor: pointer;
        transition: background 0.12s;
        padding: 0;
      }

      .li-act .material-icons { font-size: 15px; }

      .li-act:disabled { opacity: 0.3; cursor: not-allowed; }

      .li-act-call  .material-icons { color: #16a34a; }
      .li-act-wa    .material-icons { color: #059669; }
      .li-act-fu    .material-icons { color: #7c3aed; }

      .li-act-call:hover:not(:disabled)  { background: #f0fdf4; }
      .li-act-wa:hover:not(:disabled)    { background: #f0fdf4; }
      .li-act-fu:hover                   { background: #f5f3ff; }

      /* Bulk action bar */
      /* Floating bulk action capsule */
      .bulk-capsule {
        position: fixed;
        bottom: 28px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 1000;
        display: flex;
        align-items: center;
        gap: 6px;
        background: #0a2342;
        color: white;
        padding: 10px 16px;
        border-radius: 999px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.28), 0 2px 8px rgba(0,0,0,0.18);
        backdrop-filter: blur(8px);
        animation: capsule-in 0.2s cubic-bezier(0.34,1.56,0.64,1);
      }

      @keyframes capsule-in {
        from { opacity: 0; transform: translateX(-50%) translateY(16px) scale(0.92); }
        to   { opacity: 1; transform: translateX(-50%) translateY(0)   scale(1); }
      }

      .bulk-capsule-count {
        display: flex;
        align-items: center;
        gap: 5px;
        font-weight: 700;
        font-size: 14px;
        padding: 0 10px;
        color: #60a5fa;
        white-space: nowrap;
      }

      .bulk-capsule-divider {
        width: 1px;
        height: 24px;
        background: rgba(255,255,255,0.12);
        margin: 0 4px;
      }

      .bulk-capsule-action {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 6px 12px;
        border-radius: 999px;
        cursor: pointer;
        transition: background 0.15s;
        color: #d1d5db;
      }

      .bulk-capsule-action:hover {
        background: rgba(255,255,255,0.1);
        color: white;
      }

      .bulk-capsule-action .material-icons {
        font-size: 18px;
      }

      .bulk-inline-select {
        background: transparent;
        border: none;
        color: inherit;
        font-size: 13px;
        cursor: pointer;
        max-width: 100px;
        outline: none;
        padding: 0;
        appearance: none;
        -webkit-appearance: none;
      }

      .bulk-inline-select option {
        background: #1f2937;
        color: white;
      }

      .bulk-capsule-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 36px;
        height: 36px;
        border-radius: 50%;
        border: none;
        background: transparent;
        color: #d1d5db;
        cursor: pointer;
        transition: background 0.15s, color 0.15s;
      }

      .bulk-capsule-btn:hover {
        background: rgba(255,255,255,0.12);
        color: white;
      }

      .bulk-capsule-btn.danger:hover {
        background: rgba(239,68,68,0.25);
        color: #f87171;
      }

      .bulk-capsule-btn .material-icons {
        font-size: 20px;
      }

      /* Select-all header */
      .leads-list-header {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 6px 12px;
        border-bottom: 1px solid #e5e7eb;
        margin-bottom: 4px;
      }

      .select-all-checkbox {
        display: flex;
        align-items: center;
        cursor: pointer;
      }

      .select-all-checkbox input[type="checkbox"] {
        width: 16px;
        height: 16px;
        cursor: pointer;
        accent-color: #0284c7;
      }

      .list-count {
        font-size: 11px;
        color: #9ca3af;
      }

      .select-hint {
        margin-left: auto;
        font-size: 10px;
        color: #c4b5fd;
        opacity: 0.7;
        letter-spacing: 0.02em;
        white-space: nowrap;
      }

      .select-hint.selected {
        color: #34d399;
        opacity: 0.9;
      }

      /* source badge colors (reused by li-source) */
      .source-website  { background: #dbeafe; color: #0c4a6e; }
      .source-email    { background: #f3f4f6; color: #1f2937; }
      .source-phone    { background: #dcfce7; color: #165e31; }
      .source-referral { background: #fce7f3; color: #831843; }
      .source-social   { background: #ede9fe; color: #4c1d95; }
      .source-ads      { background: #fff7ed; color: #92400e; }
      .source-cold_call { background: #fef2f2; color: #991b1b; }
      .source-event    { background: #ecfdf5; color: #065f46; }
      .source-other    { background: #f3f4f6; color: #374151; }

      .empty-state {
        padding: 48px 24px;
        text-align: center;
        color: #9ca3af;
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .side-panel {
        position: fixed;
        right: 0;
        top: 0;
        width: 420px;
        height: 100vh;
        background: white;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        box-shadow: -2px 0 8px rgba(0, 0, 0, 0.06);
        max-height: 100vh;
        z-index: 50;
      }

      /* Header — close + assign only */
      .panel-header {
        padding: 12px 20px;
        display: flex;
        align-items: center;
        gap: 12px;
        border-bottom: 1px solid #f3f4f6;
        flex-shrink: 0;
        height: 52px;
        min-height: 52px;
      }

      /* Contact info — first block inside panel-content */
      .contact-info {
        padding: 20px 0 16px;
        border-bottom: 1px solid #f3f4f6;
      }

      .header-actions {
        display: flex;
        align-items: center;
        gap: 8px;
        width: 100%;
      }

      .header-right {
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
        width: 100%;
        gap: 8px;
      }

      .assign-user-select-compact {
        padding: 6px 8px;
        border: 1px solid #e5e7eb;
        border-radius: 4px;
        font-size: 12px;
        background: #ffffff;
        color: #374151;
        cursor: pointer;
        transition: all 0.2s ease;
        width: 140px;
      }

      .assign-user-select-compact:hover {
        border-color: #0284c7;
        background: #f0f9ff;
      }

      .assign-user-select-compact:focus {
        outline: none;
        border-color: #0284c7;
        box-shadow: 0 0 0 2px rgba(2, 132, 199, 0.1);
      }

      .lead-name {
        margin: 0;
        font-size: 18px;
        font-weight: 700;
        color: #111827;
        line-height: 1.3;
      }

      .lead-email {
        margin: 8px 0 4px 0;
        font-size: 12px;
        color: #6b7280;
      }

      .lead-phone {
        margin: 0;
        font-size: 12px;
        color: #6b7280;
      }

      .btn-close {
        background: none;
        border: none;
        cursor: pointer;
        color: #6b7280;
        transition: all 0.2s;
        padding: 4px;
        min-width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 4px;
      }

      .btn-close:hover {
        color: #111827;
        background: #f3f4f6;
      }

      .btn-close .material-icons {
        font-size: 24px;
      }

      /* Material Design Action Buttons */
      .action-buttons-row {
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 32px;
        padding: 24px 20px;
        background: #ffffff;
        border-bottom: 1px solid #f3f4f6;
      }

      .action-btn-circle {
        width: 64px;
        height: 64px;
        border-radius: 50%;
        border: none;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.3s ease;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        font-weight: 600;
      }

      .material-icons {
        font-size: 28px;
        font-weight: 500;
        user-select: none;
      }

      .action-btn-circle.call {
        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        color: white;
      }

      .action-btn-circle.call:hover {
        transform: scale(1.1);
        box-shadow: 0 6px 20px rgba(16, 185, 129, 0.4);
      }

      .action-btn-circle.call:active {
        transform: scale(0.95);
      }

      .action-btn-circle.whatsapp {
        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        color: white;
      }

      .action-btn-circle.whatsapp:hover {
        transform: scale(1.1);
        box-shadow: 0 6px 20px rgba(16, 185, 129, 0.4);
      }

      .action-btn-circle.whatsapp:active {
        transform: scale(0.95);
      }

      .action-btn-circle.note {
        background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
        color: white;
      }

      .action-btn-circle.note:hover {
        transform: scale(1.1);
        box-shadow: 0 6px 20px rgba(59, 130, 246, 0.4);
      }

      .action-btn-circle.note:active {
        transform: scale(0.95);
      }

      .action-btn-circle.followup {
        background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
        color: white;
      }

      .action-btn-circle.followup:hover {
        transform: scale(1.1);
        box-shadow: 0 6px 20px rgba(245, 158, 11, 0.4);
      }

      .action-btn-circle.followup:active {
        transform: scale(0.95);
      }

      /* Stage Chips Section */
      .stage-chips-section {
        padding: 12px 0;
        background: white;
        margin-bottom: 16px;
      }

      .call-status-chips-section {
        padding: 12px 0 0 0;
        background: white;
        margin-bottom: 0;
      }

      .call-status-chips {
        display: flex;
        flex-wrap: nowrap;
        gap: 6px;
        overflow-x: auto;
        -ms-overflow-style: none;
        scrollbar-width: none;
      }

      .call-status-chips::-webkit-scrollbar {
        display: none;
      }

      .call-status-chip {
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 5px 12px;
        border: 1px solid #e5e7eb;
        background: #f9fafb;
        border-radius: 16px;
        font-size: 12px;
        font-weight: 500;
        color: #6b7280;
        cursor: pointer;
        transition: all 0.2s ease;
        white-space: nowrap;
      }

      .call-status-chip .material-icons {
        font-size: 14px;
      }

      .call-status-chip:hover {
        border-color: #8b5cf6;
        color: #8b5cf6;
        background: #faf5ff;
        box-shadow: 0 2px 4px rgba(139, 92, 246, 0.1);
      }

      .call-status-chip.active {
        background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
        color: white;
        border-color: #8b5cf6;
        box-shadow: 0 4px 12px rgba(139, 92, 246, 0.2);
      }

      .call-status-chip.important:not(.active) {
        border-color: #ef4444;
        background: #fef2f2;
        color: #991b1b;
      }

      .call-status-chip.important:hover {
        border-color: #dc2626;
        color: #dc2626;
        background: #fee2e2;
        box-shadow: 0 2px 4px rgba(239, 68, 68, 0.2);
      }

      .call-status-chip.important.active {
        background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
        color: white;
        border-color: #ef4444;
        box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
      }
      }

      .chips-label {
        display: block;
        font-size: 11px;
        font-weight: 700;
        color: #6b7280;
        text-transform: uppercase;
        margin-bottom: 6px;
        letter-spacing: 0.3px;
      }

      .stage-chips {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }

      .stage-chip {
        padding: 5px 12px;
        border: 1px solid #e5e7eb;
        background: #f9fafb;
        border-radius: 16px;
        font-size: 12px;
        font-weight: 500;
        color: #6b7280;
        cursor: pointer;
        transition: all 0.2s ease;
        white-space: nowrap;
      }

      .stage-chip:hover {
        border-color: #0284c7;
        color: #0284c7;
        background: #f0f9ff;
        box-shadow: 0 2px 4px rgba(2, 132, 199, 0.1);
      }

      .stage-chip.active {
        background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);
        color: white;
        border-color: #0284c7;
        box-shadow: 0 4px 12px rgba(2, 132, 199, 0.2);
      }

      .stage-chip.unlinked {
        background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
        opacity: 0.7;
        cursor: pointer;
      }

      .stage-chip.unlinked:hover {
        opacity: 1;
        box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
      }

      .stage-chip:disabled {
        cursor: not-allowed;
      }

      .assign-user-section {
        padding: 16px 24px;
        border-bottom: 1px solid #f3f4f6;
        background: white;
      }

      .section-label {
        display: block;
        font-size: 11px;
        font-weight: 700;
        color: #6b7280;
        text-transform: uppercase;
        margin-bottom: 8px;
        letter-spacing: 0.3px;
      }

      .assign-user-select {
        width: 100%;
        padding: 8px 12px;
        border: 1px solid #e5e7eb;
        border-radius: 6px;
        font-size: 14px;
        background: #ffffff;
        color: #374151;
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .assign-user-select:hover {
        border-color: #0284c7;
        background: #f0f9ff;
      }

      .assign-user-select:focus {
        outline: none;
        border-color: #0284c7;
        box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.1);
      }

      .panel-content {
        flex: 1;
        overflow-y: auto;
        overflow-x: hidden;
        padding: 0 24px;
        background: #ffffff;
        display: flex;
        flex-direction: column;
      }

      .panel-content { scrollbar-width: none; }
      .panel-content::-webkit-scrollbar { display: none; }

      /* Sections */
      .section-title {
        margin: 0 0 14px 0;
        font-size: 13px;
        font-weight: 700;
        color: #111827;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      /* Activity Section */
      .activity-section {
        margin-bottom: 28px;
      }

      .activity-list {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }

      .activity-item {
        padding: 8px 0;
        background: none;
        border-radius: 0;
        border-left: none;
        display: flex;
        align-items: flex-start;
        gap: 8px;
      }

      .activity-time {
        font-size: 11px;
        font-weight: 700;
        color: #6b7280;
        text-transform: uppercase;
      }

      .activity-detail {
        font-size: 12px;
        color: #111827;
        font-weight: 500;
      }

      .source-badge {
        padding: 2px 8px;
        border-radius: 4px;
        font-size: 11px;
        font-weight: 600;
      }

      .source-website {
        background: #dbeafe;
        color: #0c4a6e;
      }
      .source-email {
        background: #f3f4f6;
        color: #1f2937;
      }
      .source-phone {
        background: #dcfce7;
        color: #165e31;
      }
      .source-referral {
        background: #fce7f3;
        color: #831843;
      }

      /* Info Section */
      .info-section {
        margin-bottom: 28px;
      }

      .info-section h3 {
        margin: 0 0 12px 0;
        font-size: 13px;
        font-weight: 700;
        color: #111827;
        text-transform: uppercase;
        letter-spacing: 0.3px;
      }

      .info-item {
        padding: 10px;
        background: #f9fafb;
        border-radius: 6px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 12px;
      }

      .info-item .label {
        font-size: 11px;
        font-weight: 700;
        color: #6b7280;
        text-transform: uppercase;
      }

      .info-item .value {
        font-size: 12px;
        color: #111827;
        font-weight: 500;
        text-align: right;
      }

      /* Panel Footer */
      .panel-footer {
        padding: 16px 24px;
        border-top: 1px solid #f3f4f6;
        display: flex;
        gap: 12px;
        background: #fafbfc;
      }

      .btn-secondary,
      .btn-danger {
        flex: 1;
        padding: 10px 14px;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        background: white;
        font-weight: 500;
        font-size: 13px;
        cursor: pointer;
        transition: all 0.2s ease;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
      }

      .btn-secondary .material-icons,
      .btn-danger .material-icons {
        font-size: 18px;
      }

      .btn-secondary {
        color: #374151;
      }

      .btn-secondary:hover {
        background: #f3f4f6;
        border-color: #d1d5db;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
      }

      .btn-secondary:active {
        transform: translateY(1px);
      }

      .btn-danger {
        background: white;
        border-color: #fca5a5;
        color: #dc2626;
      }

      .btn-danger:hover {
        background: #fef2f2;
        border-color: #fca5a5;
        box-shadow: 0 2px 4px rgba(220, 38, 38, 0.1);
      }

      .btn-danger:active {
        transform: translateY(1px);
      }

      .btn-primary {
        padding: 10px 16px;
        background: #0284c7;
        color: white;
        border: none;
        border-radius: 6px;
        font-weight: 600;
        font-size: 13px;
        cursor: pointer;
        transition: all 0.2s;
      }

      .btn-primary:hover:not(:disabled) {
        background: #0369a1;
      }

      .btn-primary:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }

      .modal {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
      }

      .modal-content {
        background: white;
        border-radius: 12px;
        max-width: 600px;
        width: 90%;
        max-height: 90vh;
        overflow-y: auto;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      }

      /* Wide modal for lead create/edit */
      .modal-wide {
        max-width: 760px;
        display: flex;
        flex-direction: column;
        max-height: 92vh;
      }

      .modal-small {
        max-width: 400px;
      }

      .modal-header {
        padding: 20px 24px;
        border-bottom: 1px solid #e5e7eb;
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-shrink: 0;
      }

      .modal-title-block {
        display: flex;
        align-items: center;
        gap: 10px;
      }

      .modal-title-icon {
        font-size: 22px;
        color: #0284c7;
      }

      .modal-header h2 {
        margin: 0;
        font-size: 18px;
        font-weight: 700;
        color: #111827;
      }

      .modal-message {
        padding: 24px;
        color: #6b7280;
        line-height: 1.5;
      }

      .modal-form {
        padding: 24px;
      }

      .modal-form-scrollable {
        flex: 1;
        overflow-y: auto;
        padding: 0;
        display: flex;
        flex-direction: column;
      }

      /* Sections inside wide modal */
      .form-section {
        padding: 20px 24px;
        border-bottom: 1px solid #f3f4f6;
      }

      .form-section:last-child {
        border-bottom: none;
      }

      .form-section-label {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.8px;
        color: #6b7280;
        margin-bottom: 14px;
      }

      .form-section-label .material-icons {
        font-size: 16px;
        color: #9ca3af;
      }

      .form-group.half {
        max-width: 50%;
      }

      .form-group.required label::after {
        content: ' *';
        color: #dc2626;
      }

      .field-error {
        display: block;
        font-size: 11px;
        color: #dc2626;
        margin-top: 4px;
      }

      .form-group textarea {
        width: 100%;
        padding: 10px 12px;
        border: 1px solid #d1d5db;
        border-radius: 6px;
        font-size: 13px;
        font-family: inherit;
        resize: vertical;
        transition: all 0.2s;
      }

      .form-group textarea:focus {
        outline: none;
        border-color: #0284c7;
        box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.1);
      }

      /* Custom field rows */
      .custom-field-row {
        display: flex;
        gap: 8px;
        align-items: center;
        margin-bottom: 8px;
      }

      .cf-key-input {
        flex: 0 0 36%;
        padding: 8px 10px;
        border: 1px solid #d1d5db;
        border-radius: 6px;
        font-size: 13px;
        font-family: inherit;
        transition: border-color 0.2s;
      }

      .cf-value-input {
        flex: 1;
        padding: 8px 10px;
        border: 1px solid #d1d5db;
        border-radius: 6px;
        font-size: 13px;
        font-family: inherit;
        transition: border-color 0.2s;
      }

      .cf-key-input:focus,
      .cf-value-input:focus {
        outline: none;
        border-color: #0284c7;
        box-shadow: 0 0 0 2px rgba(2, 132, 199, 0.1);
      }

      .btn-cf-remove {
        background: none;
        border: none;
        cursor: pointer;
        color: #ef4444;
        padding: 4px;
        display: flex;
        align-items: center;
        border-radius: 4px;
        transition: background 0.15s;
        flex-shrink: 0;
      }

      .btn-cf-remove:hover {
        background: #fee2e2;
      }

      .btn-cf-remove .material-icons {
        font-size: 20px;
      }

      .btn-add-cf {
        display: flex;
        align-items: center;
        gap: 6px;
        background: none;
        border: 1px dashed #d1d5db;
        color: #6b7280;
        font-size: 12px;
        font-weight: 600;
        padding: 7px 12px;
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.2s;
        margin-top: 4px;
      }

      .btn-add-cf:hover {
        border-color: #0284c7;
        color: #0284c7;
        background: #f0f9ff;
      }

      .btn-add-cf .material-icons {
        font-size: 16px;
      }

      /* Modal footer */
      .modal-footer {
        display: flex;
        gap: 12px;
        justify-content: flex-end;
        padding: 16px 24px;
        border-top: 1px solid #e5e7eb;
        background: #fafafa;
        border-radius: 0 0 12px 12px;
        flex-shrink: 0;
      }

      .btn-primary {
        display: flex;
        align-items: center;
        gap: 6px;
      }

      .btn-primary .material-icons {
        font-size: 16px;
      }

      /* ── Import button in header ── */
      .header-actions-group {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-shrink: 0;
      }

      .btn-import-lead {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 8px 16px;
        background: white;
        border: 1px solid #d1d5db;
        border-radius: 6px;
        font-size: 13px;
        font-weight: 500;
        color: #374151;
        cursor: pointer;
        transition: all 0.2s;
        white-space: nowrap;
      }

      .btn-import-lead:hover {
        background: #f3f4f6;
        border-color: #9ca3af;
      }

      .btn-import-lead .material-icons {
        font-size: 18px;
        color: #6b7280;
      }

      /* ── Import modal ── */
      .modal-import {
        max-width: 860px;
        width: 94%;
        max-height: 90vh;
        display: flex;
        flex-direction: column;
      }

      .import-body {
        flex: 1;
        overflow-y: auto;
        padding: 24px;
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      /* Tabs */
      .import-tabs {
        display: flex;
        gap: 0;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        overflow: hidden;
        flex-shrink: 0;
      }

      .import-tab {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        padding: 10px 16px;
        background: #f9fafb;
        border: none;
        font-size: 13px;
        font-weight: 600;
        color: #6b7280;
        cursor: pointer;
        transition: all 0.15s;
      }

      .import-tab:not(:last-child) {
        border-right: 1px solid #e5e7eb;
      }

      .import-tab.active {
        background: white;
        color: #0284c7;
      }

      .import-tab .material-icons {
        font-size: 16px;
      }

      /* Hint */
      .import-hint {
        font-size: 12px;
        color: #6b7280;
        line-height: 1.6;
        margin: 0;
      }

      .col-chip {
        display: inline-block;
        background: #f0f9ff;
        color: #0284c7;
        border: 1px solid #bae6fd;
        border-radius: 4px;
        padding: 1px 6px;
        font-size: 11px;
        font-family: monospace;
        margin: 2px;
      }

      /* Paste textarea */
      .import-paste-section,
      .import-file-section {
        display: flex;
        flex-direction: column;
        gap: 12px;
        flex: 1;
      }

      .import-textarea {
        width: 100%;
        padding: 12px;
        border: 1px solid #d1d5db;
        border-radius: 8px;
        font-size: 12px;
        font-family: monospace;
        resize: vertical;
        min-height: 180px;
        transition: border-color 0.2s;
        box-sizing: border-box;
      }

      .import-textarea:focus {
        outline: none;
        border-color: #0284c7;
        box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.1);
      }

      /* File drop zone */
      .file-drop-zone {
        border: 2px dashed #d1d5db;
        border-radius: 10px;
        padding: 40px 24px;
        text-align: center;
        cursor: pointer;
        transition: all 0.2s;
        background: #fafafa;
      }

      .file-drop-zone:hover,
      .file-drop-zone.drag-over {
        border-color: #0284c7;
        background: #f0f9ff;
      }

      .drop-icon {
        font-size: 40px;
        color: #9ca3af;
        display: block;
        margin-bottom: 8px;
      }

      .drop-label {
        margin: 0 0 4px 0;
        font-size: 14px;
        color: #374151;
        font-weight: 600;
      }

      .drop-sub {
        margin: 0;
        font-size: 12px;
        color: #9ca3af;
      }

      /* Actions row */
      .import-actions-row {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
        margin-top: auto;
        padding-top: 8px;
        flex-shrink: 0;
      }

      /* Preview */
      .import-preview-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-shrink: 0;
      }

      .import-preview-stats {
        display: flex;
        gap: 8px;
      }

      .stat-pill {
        padding: 3px 10px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 700;
      }

      .stat-pill.valid {
        background: #d1fae5;
        color: #065f46;
      }

      .stat-pill.invalid {
        background: #fee2e2;
        color: #991b1b;
      }

      .btn-link {
        background: none;
        border: none;
        cursor: pointer;
        color: #0284c7;
        font-size: 13px;
        font-weight: 600;
        padding: 4px;
      }

      .import-table-wrap {
        flex: 1;
        overflow: auto;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
      }

      .import-preview-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 12px;
      }

      .import-preview-table th {
        position: sticky;
        top: 0;
        background: #f9fafb;
        padding: 8px 10px;
        text-align: left;
        font-weight: 700;
        color: #374151;
        border-bottom: 1px solid #e5e7eb;
        white-space: nowrap;
      }

      .import-preview-table td {
        padding: 7px 10px;
        color: #374151;
        border-bottom: 1px solid #f3f4f6;
        max-width: 180px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .import-preview-table tr.row-invalid td {
        background: #fff7f7;
        color: #9ca3af;
      }

      .row-num {
        color: #9ca3af;
        font-size: 11px;
        min-width: 28px;
      }

      .row-status {
        font-size: 11px;
        font-weight: 700;
        white-space: nowrap;
      }

      .row-status.ok { color: #059669; }
      .row-status.err { color: #dc2626; }

      /* Result step */
      .import-result {
        align-items: center;
        justify-content: center;
        text-align: center;
        padding: 40px 24px;
      }

      .result-icon {
        font-size: 56px;
        display: block;
        margin-bottom: 12px;
      }

      .result-icon.success { color: #059669; }

      .import-result h3 {
        margin: 0 0 8px 0;
        font-size: 20px;
        font-weight: 700;
        color: #111827;
      }

      .import-result p {
        margin: 4px 0;
        color: #6b7280;
        font-size: 14px;
      }

      .result-warn {
        color: #d97706 !important;
      }

      .form-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
        margin-bottom: 16px;
      }

      .form-group {
        margin-bottom: 16px;
      }

      .form-group label {
        display: block;
        margin-bottom: 6px;
        font-weight: 600;
        font-size: 13px;
        color: #374151;
      }

      .form-group input,
      .form-group select {
        width: 100%;
        padding: 10px 12px;
        border: 1px solid #d1d5db;
        border-radius: 6px;
        font-size: 13px;
        transition: all 0.2s;
        font-family: inherit;
      }

      .form-group input:focus,
      .form-group select:focus {
        outline: none;
        border-color: #0284c7;
        box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.1);
      }

      .form-actions {
        display: flex;
        gap: 12px;
        justify-content: flex-end;
        margin-top: 24px;
      }

      /* Followup Modal */
      .fu-modal-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,0.45);
        z-index: 1100;
      }

      .fu-modal {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        z-index: 1101;
        background: white;
        border-radius: 14px;
        width: 340px;
        max-width: calc(100vw - 32px);
        box-shadow: 0 20px 50px rgba(0,0,0,0.18);
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }

      .fu-modal-header {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 16px 18px 14px;
        border-bottom: 1px solid #f0f0f0;
      }

      .fu-modal-icon {
        font-size: 20px;
        color: #7c3aed;
      }

      .fu-modal-title {
        flex: 1;
        margin: 0;
        font-size: 15px;
        font-weight: 700;
        color: #111827;
      }

      .fu-modal-close {
        width: 28px;
        height: 28px;
        border: none;
        background: #f3f4f6;
        border-radius: 50%;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .fu-modal-close .material-icons { font-size: 16px; color: #6b7280; }
      .fu-modal-close:hover { background: #e5e7eb; }

      .fu-modal-body {
        padding: 16px 18px;
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      .fu-lead-name {
        font-size: 13px;
        font-weight: 600;
        color: #0284c7;
        background: #f0f9ff;
        padding: 6px 10px;
        border-radius: 6px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .fu-field {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      .fu-label {
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        color: #6b7280;
      }

      .fu-type-row {
        display: flex;
        gap: 6px;
      }

      .fu-type-btn {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 2px;
        padding: 8px 4px;
        border: 1.5px solid #e5e7eb;
        background: white;
        border-radius: 8px;
        font-size: 10px;
        font-weight: 600;
        color: #6b7280;
        cursor: pointer;
        transition: all 0.15s;
      }

      .fu-type-btn .material-icons { font-size: 18px; }
      .fu-type-btn:hover { border-color: #7c3aed; color: #7c3aed; }

      .fu-type-active {
        border-color: #7c3aed !important;
        background: #f5f3ff !important;
        color: #7c3aed !important;
      }

      .fu-when-row {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
      }

      .fu-when-btn {
        padding: 6px 10px;
        border: 1.5px solid #e5e7eb;
        background: white;
        border-radius: 6px;
        font-size: 11px;
        font-weight: 600;
        color: #6b7280;
        cursor: pointer;
        transition: all 0.15s;
      }

      .fu-when-btn:hover { border-color: #f59e0b; color: #f59e0b; }

      .fu-when-active {
        border-color: #f59e0b !important;
        background: #fffbeb !important;
        color: #b45309 !important;
      }

      .fu-date-input, .fu-time-input {
        padding: 8px 10px;
        border: 1.5px solid #e5e7eb;
        border-radius: 6px;
        font-size: 13px;
        color: #374151;
        outline: none;
        width: 100%;
        box-sizing: border-box;
      }

      .fu-date-input:focus, .fu-time-input:focus { border-color: #7c3aed; }

      .fu-modal-footer {
        display: flex;
        gap: 8px;
        padding: 12px 18px 16px;
        border-top: 1px solid #f0f0f0;
      }

      .fu-btn-cancel {
        flex: 1;
        padding: 9px;
        border: 1.5px solid #e5e7eb;
        background: white;
        border-radius: 8px;
        font-size: 13px;
        font-weight: 600;
        color: #6b7280;
        cursor: pointer;
      }

      .fu-btn-cancel:hover { background: #f3f4f6; }

      .fu-btn-save {
        flex: 2;
        padding: 9px;
        border: none;
        background: #7c3aed;
        color: white;
        border-radius: 8px;
        font-size: 13px;
        font-weight: 700;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 5px;
      }

      .fu-btn-save .material-icons { font-size: 16px; }
      .fu-btn-save:hover { background: #6d28d9; }

      /* Followups Section */
      .followups-section {
        margin-bottom: 20px;
      }

      .empty-followups {
        padding: 12px;
        background: #f3f4f6;
        border-radius: 6px;
        text-align: center;
        color: #9ca3af;
        font-size: 13px;
      }

      .followup-item {
        padding: 10px;
        border: 1px solid #e5e7eb;
        border-radius: 6px;
        margin-bottom: 8px;
        background: #fafafa;
      }

      .followup-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 6px;
      }

      .followup-type {
        font-weight: 600;
        font-size: 12px;
        padding: 4px 8px;
        border-radius: 4px;
        background: #e0e7ff;
        color: #4f46e5;
      }

      .followup-type.type-call {
        background: #dcfce7;
        color: #16a34a;
      }

      .followup-type.type-meeting {
        background: #fef3c7;
        color: #d97706;
      }

      .followup-type.type-email {
        background: #dbeafe;
        color: #0284c7;
      }

      .followup-type.type-demo {
        background: #f3e8ff;
        color: #9333ea;
      }

      .followup-time {
        font-size: 12px;
        color: #6b7280;
      }

      .followup-status {
        display: flex;
        gap: 6px;
      }

      .status-badge {
        font-size: 11px;
        font-weight: 600;
        padding: 3px 6px;
        border-radius: 3px;
      }

      .status-badge.status-pending {
        background: #fef3c7;
        color: #d97706;
      }

      .status-badge.status-completed {
        background: #dcfce7;
        color: #16a34a;
      }

      .status-badge.status-overdue {
        background: #fee2e2;
        color: #dc2626;
      }

      .followup-delete {
        background: none;
        border: none;
        color: #9ca3af;
        cursor: pointer;
        padding: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 4px;
        transition: all 0.2s;
      }

      .followup-delete:hover {
        background: #fee2e2;
        color: #dc2626;
      }

      /* Contact Info Section */
      .contact-info-section {
        margin-bottom: 16px;
      }

      .contact-details {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .contact-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 0;
        border-bottom: 1px solid #e5e7eb;
      }

      .contact-label {
        font-weight: 500;
        color: #4b5563;
        font-size: 13px;
      }

      .contact-value {
        color: #1f2937;
        font-size: 13px;
      }

      /* Custom Fields Section */
      .custom-fields-section {
        margin-bottom: 16px;
      }

      /* ── Stages + Forms Accordion ── */
      .stages-accordion-section {
        margin-bottom: 24px;
      }

      .stages-accordion {
        border: 1px solid #e5e7eb;
        border-radius: 10px;
        overflow: hidden;
      }

      .sa-item {
        border-bottom: 1px solid #e5e7eb;
      }

      .sa-item:last-child {
        border-bottom: none;
      }

      .sa-header {
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 11px 14px;
        background: #fafafa;
        border: none;
        cursor: pointer;
        text-align: left;
        gap: 8px;
        transition: background 0.15s;
      }

      .sa-header:hover { background: #f3f4f6; }
      .sa-header.sa-open { background: #f0f7ff; }

      .sa-item.sa-current > .sa-header {
        background: #f0f7ff;
      }

      .sa-header-left {
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 0;
      }

      .sa-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #d1d5db;
        flex-shrink: 0;
      }

      .sa-dot.sa-dot-active {
        background: #0284c7;
      }

      .sa-name {
        font-size: 13px;
        font-weight: 600;
        color: #111827;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .sa-current-badge {
        font-size: 10px;
        font-weight: 700;
        color: #0284c7;
        background: #e0f2fe;
        border-radius: 20px;
        padding: 1px 7px;
        flex-shrink: 0;
      }

      .sa-header-right {
        display: flex;
        align-items: center;
        gap: 6px;
        flex-shrink: 0;
      }

      .sa-forms-count {
        font-size: 11px;
        color: #6b7280;
        font-weight: 500;
      }

      .sa-submitted-count {
        color: #6b7280;
        font-weight: 700;
      }

      .sa-submitted-count.sa-all-done {
        color: #16a34a;
      }

      .sa-no-forms {
        font-size: 11px;
        color: #9ca3af;
      }

      .sa-chevron {
        font-size: 18px;
        color: #9ca3af;
        transition: transform 0.2s;
      }

      .sa-body {
        padding: 12px 16px 14px;
        background: #fff;
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      .sa-form {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }

      .sa-form-header {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .sa-form-name {
        font-size: 12px;
        font-weight: 700;
        color: #374151;
      }

      .sa-submitted-badge {
        font-size: 10px;
        font-weight: 700;
        color: #16a34a;
        background: #dcfce7;
        border-radius: 20px;
        padding: 1px 7px;
      }

      .sa-fields {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .sa-field {
        display: flex;
        flex-direction: column;
        gap: 3px;
      }

      .sa-field-label {
        font-size: 11px;
        font-weight: 600;
        color: #6b7280;
      }

      .sa-field-input {
        padding: 7px 10px;
        border: 1px solid #e5e7eb;
        border-radius: 6px;
        font-size: 13px;
        color: #111827;
        background: #fff;
        width: 100%;
        box-sizing: border-box;
      }

      .sa-field-input.sa-readonly {
        background: #f9fafb;
        color: #374151;
        cursor: default;
      }

      .sa-empty {
        font-size: 12px;
        color: #9ca3af;
        font-style: italic;
      }

      .sa-submit-btn {
        align-self: flex-start;
        padding: 6px 16px;
        background: #0284c7;
        color: white;
        border: none;
        border-radius: 6px;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        transition: background 0.15s;
      }

      .sa-submit-btn:hover { background: #0369a1; }

      /* ── Lead tile quick actions (kept for backward compat) ── */
      .lead-quick-actions { display: none; }
      .lqa-btn { display: none; }

      /* Lead Details Section */
      .lead-details-section {
        margin-bottom: 28px;
      }

      .details-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
        margin-bottom: 16px;
      }

      .detail-item {
        display: flex;
        flex-direction: column;
        gap: 4px;
        padding: 10px;
        background: #f9fafb;
        border-radius: 6px;
        border: 1px solid #e5e7eb;
      }

      .detail-label {
        font-size: 11px;
        font-weight: 700;
        color: #6b7280;
        text-transform: uppercase;
        letter-spacing: 0.3px;
      }

      .detail-value {
        font-size: 13px;
        color: #111827;
        font-weight: 500;
      }

      .custom-fields-subsection {
        padding: 12px;
        background: #fafbfc;
        border: 1px solid #e5e7eb;
        border-radius: 6px;
        margin-top: 12px;
      }

      .subsection-title {
        margin: 0 0 10px 0;
        font-size: 12px;
        font-weight: 700;
        color: #374151;
        text-transform: uppercase;
        letter-spacing: 0.3px;
      }

      .custom-fields-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .custom-field-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 6px 0;
        border-bottom: 1px solid #e5e7eb;
        font-size: 13px;
      }

      .custom-field-item:last-child {
        border-bottom: none;
      }

      .field-label {
        font-weight: 500;
        color: #4b5563;
      }

      .field-value {
        color: #1f2937;
        word-break: break-word;
        text-align: right;
      }

      /* Notes Section */
      .notes-section {
        margin-bottom: 16px;
      }

      .notes-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
      }

      .btn-icon {
        background: none;
        border: none;
        color: #0284c7;
        cursor: pointer;
        padding: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 4px;
        transition: all 0.2s;
      }

      .btn-icon:hover {
        background: #dbeafe;
      }

      .add-note-form {
        display: flex;
        flex-direction: column;
        gap: 8px;
        margin-bottom: 12px;
        padding: 12px;
        background: #f9fafb;
        border-radius: 4px;
        border: 1px solid #e5e7eb;
      }

      .note-textarea {
        resize: vertical;
        min-height: 72px;
        padding: 10px;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        font-family: inherit;
        font-size: 13px;
        width: 100%;
        box-sizing: border-box;
        outline: none;
        color: #111827;
      }

      .note-textarea:focus { border-color: #0284c7; }

      .note-form-actions {
        display: flex;
        gap: 8px;
        margin-top: 8px;
      }

      .empty-notes {
        color: #9ca3af;
        font-size: 13px;
        padding: 4px 0;
        margin: 0;
      }

      .notes-list {
        display: flex;
        flex-direction: column;
      }

      .note-item {
        padding: 10px 0;
        border-bottom: 1px solid #f3f4f6;
      }

      .note-item:last-child { border-bottom: none; }

      .note-content {
        font-size: 13px;
        color: #111827;
        line-height: 1.5;
        margin: 0 0 4px;
        white-space: pre-wrap;
      }

      .note-meta {
        display: flex;
        align-items: center;
        gap: 4px;
        font-size: 11px;
        color: #9ca3af;
      }

      .note-author { font-weight: 600; color: #6b7280; }
      .note-dot { color: #d1d5db; }

      .note-delete {
        background: none;
        border: none;
        color: #d1d5db;
        cursor: pointer;
        padding: 0;
        font-size: 11px;
        margin-left: auto;
        line-height: 1;
        transition: color 0.15s;
      }

      .note-delete:hover { color: #dc2626; }

      /* Activities Section */
      .activities-section {
        margin-bottom: 16px;
      }

      .activity-filters {
        display: flex;
        gap: 6px;
        margin-bottom: 12px;
        flex-wrap: wrap;
      }

      .filter-chip {
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 4px 10px;
        border: 1px solid #e5e7eb;
        background: #fff;
        border-radius: 20px;
        font-size: 11px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.15s;
        color: #6b7280;
      }

      .filter-chip:hover { background: #f3f4f6; }

      .filter-chip.active {
        background: #0284c7;
        border-color: #0284c7;
        color: #fff;
      }

      .filter-chip .material-icons { font-size: 13px; }

      .empty-log {
        font-size: 13px;
        color: #9ca3af;
        margin: 0;
        padding: 4px 0;
      }

      .activities-timeline {
        display: flex;
        flex-direction: column;
      }

      .activity-item {
        display: flex;
        align-items: flex-start;
        gap: 8px;
        padding: 8px 0;
        border-bottom: 1px solid #f3f4f6;
      }

      .activity-item:last-child { border-bottom: none; }

      .activity-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #d1d5db;
        flex-shrink: 0;
        margin-top: 5px;
      }

      .activity-item.activity-call .activity-dot { background: #0284c7; }
      .activity-item.activity-whatsapp .activity-dot { background: #10b981; }
      .activity-item.activity-email .activity-dot { background: #8b5cf6; }
      .activity-item.activity-note .activity-dot { background: #f59e0b; }
      .activity-item.activity-followup .activity-dot { background: #ec4899; }
      .activity-item.activity-created .activity-dot { background: #6366f1; }
      .activity-item.activity-assigned .activity-dot { background: #06b6d4; }
      .activity-item.activity-stage_changed .activity-dot { background: #14b8a6; }
      .activity-item.activity-status_changed .activity-dot { background: #84cc16; }
      .activity-item.activity-form_submitted .activity-dot { background: #f97316; }

      .activity-body {
        flex: 1;
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 8px;
      }

      .activity-type {
        font-size: 12px;
        font-weight: 600;
        color: #111827;
      }

      .activity-msg {
        font-size: 12px;
        color: #6b7280;
      }

      .activity-row {
        display: flex;
        flex-wrap: wrap;
        align-items: baseline;
        gap: 0;
      }

      .activity-meta {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        font-size: 11px;
        color: #c4c9d4;
        flex-shrink: 0;
        gap: 0;
      }

      .activity-by { color: #c4c9d4; font-weight: 400; }
      .activity-time { color: #c4c9d4; font-weight: 400; }

      .activity-by { color: #c4c9d4; }
      .activity-time { color: #c4c9d4; }

      /* comm-details / stakeholders below */

      .comm-details {
        flex: 1;
      }

      .comm-type {
        font-weight: 500;
        font-size: 12px;
        color: #1f2937;
        margin-bottom: 2px;
      }

      .comm-message {
        font-size: 13px;
        color: #374151;
        margin-bottom: 4px;
      }

      .comm-time {
        font-size: 11px;
        color: #9ca3af;
      }

      /* Stakeholders Section */
      .stakeholders-section {
        margin-bottom: 16px;
        margin-top: 0;
      }

      .stakeholders-section .section-title {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 12px;
        font-size: 14px;
        font-weight: 600;
        color: #1f2937;
      }

      .stakeholders-section .material-icons {
        font-size: 20px;
        color: #6b7280;
      }

      .stakeholders-list {
        border: 1px solid #e5e7eb;
        border-radius: 6px;
        overflow: hidden;
        background: #fafbfc;
      }

      .stakeholder-item {
        padding: 12px;
        border-bottom: 1px solid #e5e7eb;
        background: white;
        transition: background-color 0.2s;
      }

      .stakeholder-item:last-child {
        border-bottom: none;
      }

      .stakeholder-item:hover {
        background: #f9fafb;
      }

      .stakeholder-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 6px;
      }

      .stakeholder-name-role {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .stakeholder-name {
        font-weight: 600;
        color: #1f2937;
        font-size: 14px;
      }

      .stakeholder-role {
        display: inline-block;
        width: fit-content;
        padding: 2px 8px;
        border-radius: 3px;
        font-size: 11px;
        font-weight: 600;
        text-transform: uppercase;
        background: #f3f4f6;
        color: #6b7280;
      }

      .stakeholder-role.role-owner {
        background: #fef3c7;
        color: #b45309;
      }

      .stakeholder-role.role-quotation_team {
        background: #dbeafe;
        color: #0369a1;
      }

      .stakeholder-role.role-site_engineer {
        background: #d1fae5;
        color: #047857;
      }

      .stakeholder-role.role-accounts {
        background: #fae8ff;
        color: #7e22ce;
      }

      .stakeholder-role.role-drawing_engineer {
        background: #fed7aa;
        color: #92400e;
      }

      .stakeholder-role.role-observer {
        background: #f3f4f6;
        color: #6b7280;
      }

      .stakeholder-joined {
        font-size: 12px;
        color: #9ca3af;
      }

      .stakeholder-email {
        font-size: 12px;
        color: #6b7280;
        margin-bottom: 6px;
      }

      .stakeholder-forms {
        font-size: 11px;
      }

      .forms-badge {
        display: inline-block;
        background: #ecfdf5;
        color: #065f46;
        padding: 2px 6px;
        border-radius: 3px;
        font-weight: 500;
      }

      /* Role-Based Visibility Info */
      /* Team Member Selection Dialog */
      .modal-medium {
        width: 450px;
        max-width: 90vw;
      }

      .modal-description {
        margin: 0 0 20px 0;
        font-size: 14px;
        color: #4b5563;
        line-height: 1.5;
      }

      .team-members-list {
        margin-bottom: 20px;
      }

      .list-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
      }

      .list-header h4 {
        margin: 0;
        font-size: 14px;
        font-weight: 600;
        color: #1f2937;
      }

      .list-actions {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 12px;
      }

      .btn-link {
        background: none;
        border: none;
        color: #0284c7;
        cursor: pointer;
        padding: 0;
        font-size: 12px;
        font-weight: 500;
        transition: color 0.2s;
      }

      .btn-link:hover {
        color: #0369a1;
        text-decoration: underline;
      }

      .separator {
        color: #d1d5db;
      }

      .members-container {
        border: 1px solid #e5e7eb;
        border-radius: 6px;
        max-height: 300px;
        overflow-y: auto;
        background: #fafbfc;
      }

      .member-item {
        display: flex;
        align-items: center;
        padding: 12px;
        border-bottom: 1px solid #e5e7eb;
        transition: background-color 0.2s;
        cursor: pointer;
      }

      .member-item:last-child {
        border-bottom: none;
      }

      .member-item:hover {
        background: #f3f4f6;
      }

      .member-item.selected {
        background: #dbeafe;
      }

      .member-checkbox {
        width: 18px;
        height: 18px;
        margin-right: 12px;
        cursor: pointer;
        accent-color: #0284c7;
        flex-shrink: 0;
      }

      .member-label {
        display: flex;
        flex-direction: column;
        gap: 2px;
        cursor: pointer;
        flex: 1;
      }

      .member-name {
        font-weight: 500;
        color: #1f2937;
        font-size: 14px;
      }

      .member-email {
        font-size: 12px;
        color: #6b7280;
      }

      .modal-footer {
        display: flex;
        gap: 12px;
        justify-content: flex-end;
        padding-top: 20px;
        border-top: 1px solid #e5e7eb;
      }

      /* ══════════════════════════════════════════
         MOBILE — ≤768px  (Native-first)
      ══════════════════════════════════════════ */
      @media (max-width: 768px) {

        /* ── Root layout ── */
        .leads-layout {
          display: flex;
          flex-direction: column;
          height: 100%;
          overflow: hidden;
          background: #f2f3f5;
        }

        .leads-main {
          margin-right: 0 !important;
          display: flex;
          flex-direction: column;
          height: 100%;
          overflow: hidden;
          border-right: none;
        }

        /* ── App bar ── */
        .leads-header {
          padding: 0 16px 0 62px;
          height: 56px;
          min-height: 56px;
          background: #ffffff;
          border-bottom: 1px solid #e5e7eb;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          flex-shrink: 0;
        }

        .header-left h1 {
          font-size: 18px;
          font-weight: 700;
          margin: 0;
          color: #111827;
          letter-spacing: -0.3px;
        }

        .subtitle { display: none; }

        .header-actions-group {
          display: flex;
          gap: 8px;
          align-items: center;
          flex-shrink: 0;
        }

        /* Hide button text labels — show icons only */
        .btn-label { display: none; }

        /* Import — icon only */
        .btn-import-lead {
          width: 38px;
          height: 38px;
          padding: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: #f3f4f6;
          border: 1px solid #e5e7eb;
          color: #374151;
        }

        .btn-import-lead span:not(.material-icons) { display: none; }

        /* New Lead — icon only circle */
        .btn-create-lead {
          width: 38px;
          height: 38px;
          padding: 0;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0;
          box-shadow: 0 2px 8px rgba(2,132,199,0.25);
          letter-spacing: 0;
        }

        .btn-create-lead span:not(.material-icons) { display: none; }

        /* ── Stage pipeline → slim horizontal scroll tabs ── */
        .stage-filter-pipeline-bar {
          padding: 10px 0 0 0;
          background: #ffffff;
          border-bottom: 1px solid #e5e7eb;
          overflow: hidden;
          flex-shrink: 0;
          width: 100%;
        }

        .pipeline-wrapper {
          display: flex;
          gap: 4px;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          padding: 0 12px 10px;
          scrollbar-width: none;
          min-width: 0;
        }

        .pipeline-wrapper::-webkit-scrollbar { display: none; }

        /* Override the desktop arrow/clip-path shape with simple pills */
        .stage-filter-item {
          clip-path: none !important;
          border-radius: 20px !important;
          padding: 6px 14px !important;
          font-size: 12px !important;
          font-weight: 600;
          white-space: nowrap;
          flex-shrink: 0;
          height: 32px;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .pipeline-item-wrapper {
          margin-right: 0 !important;
          flex-shrink: 0;
        }

        .pipeline-active-line { display: none; }

        .stage-count-badge {
          min-width: 16px;
          height: 16px;
          font-size: 10px;
          padding: 0 4px;
        }

        /* Call status row — single horizontal scroll line */
        .call-status-filter-bar {
          background: #f8f9fa;
          border-top: 1px solid #f0f0f0;
          margin-top: 0;
          overflow: visible;
        }

        .call-status-filter-chips {
          display: flex;
          gap: 4px;
          padding: 8px 12px;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
          flex-wrap: nowrap;
        }

        .call-status-filter-chips::-webkit-scrollbar { display: none; }

        .call-status-filter-chip {
          padding: 5px 10px;
          font-size: 11px;
          font-weight: 600;
          border-radius: 16px;
          flex-shrink: 0;
          height: 28px;
          display: flex;
          align-items: center;
          gap: 3px;
        }

        .call-status-filter-chip .material-icons {
          font-size: 13px;
        }

        .call-status-filter-chip .count-badge {
          display: none;
        }

        /* ── Filters bar → single search row ── */
        .filters-bar {
          padding: 8px 12px;
          background: #ffffff;
          border-bottom: 1px solid #e5e7eb;
          display: flex;
          gap: 8px;
          align-items: center;
          flex-wrap: nowrap;
          flex-shrink: 0;
        }

        .filter-group.search-group {
          flex: 1;
          max-width: 100%;
        }

        .search-input {
          font-size: 15px;
          height: 40px;
          padding: 0 32px 0 38px;
          border-radius: 20px;
          background: #f3f4f6;
          border-color: transparent;
        }

        .search-input:focus {
          background: #fff;
          border-color: #0284c7;
        }

        /* Hide desktop selects on mobile — they're accessible via More button */
        .filters-bar .quick-select,
        .filters-bar .quick-date,
        .filters-bar .quick-sep {
          display: none;
        }

        .filter-bar-spacer { display: none; }

        .btn-icon.advanced-filter-btn {
          flex-shrink: 0;
          width: 40px;
          height: 40px;
          padding: 0;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid #e5e7eb;
          background: #f3f4f6;
        }

        .adv-btn-label { display: none; }

        /* ── Advanced filter panel — full-width bottom drawer ── */
        .afp-backdrop {
          display: block;
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.45);
          z-index: 299;
          animation: afp-fade-in 0.2s ease;
        }

        @keyframes afp-fade-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }

        @keyframes afp-slide-up {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }

        .advanced-filter-panel {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          max-height: 85vh;
          overflow-y: auto;
          overflow-x: hidden;
          -webkit-overflow-scrolling: touch;
          background: #fff;
          border-radius: 20px 20px 0 0;
          box-shadow: 0 -4px 32px rgba(0,0,0,0.18);
          z-index: 300;
          padding-bottom: env(safe-area-inset-bottom, 16px);
          animation: afp-slide-up 0.28s cubic-bezier(0.32, 0.72, 0, 1);
          box-sizing: border-box;
          width: 100%;
        }

        /* Override desktop slide-in animation */
        @keyframes afp-slide-in {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }

        .afp-drag-handle {
          display: block;
          width: 36px;
          height: 4px;
          background: #d1d5db;
          border-radius: 2px;
          margin: 12px auto 0;
          flex-shrink: 0;
        }

        .afp-header {
          padding: 12px 20px 14px;
          position: sticky;
          top: 0;
          background: #fff;
          border-bottom: 1px solid #f0f0f0;
          z-index: 1;
        }

        /* Remove pseudo-element drag handle (now using real element) */
        .afp-header::before { display: none; }

        .afp-header-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .afp-close-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border: none;
          background: #f3f4f6;
          border-radius: 50%;
          cursor: pointer;
          color: #6b7280;
          flex-shrink: 0;
        }

        .afp-close-btn .material-icons { font-size: 18px; }

        .afp-grid {
          gap: 20px;
          grid-template-columns: 1fr;
          padding: 16px 20px 8px;
        }

        .afp-field-wide { grid-column: span 1; }

        .afp-field {
          min-width: 0;
          overflow: hidden;
        }

        .afp-label {
          font-size: 11px;
          font-weight: 700;
          color: #9ca3af;
          text-transform: uppercase;
          letter-spacing: 0.6px;
          margin-bottom: 2px;
        }

        /* Prevent iOS input zoom + horizontal overflow */
        .afp-input,
        .afp-select {
          font-size: 16px;
          width: 100%;
          box-sizing: border-box;
          min-width: 0;
        }

        /* Stack date ranges vertically on mobile */
        .afp-date-range {
          flex-direction: column;
          align-items: stretch;
          gap: 8px;
          width: 100%;
          box-sizing: border-box;
        }

        .afp-date-wrap {
          flex: none;
          width: 100%;
        }

        .afp-date {
          font-size: 16px;
          width: 100%;
          box-sizing: border-box;
          min-width: 0;
        }

        /* Hide arrow separator when stacked */
        .afp-sep { display: none; }

        .afp-grid {
          width: 100%;
          box-sizing: border-box;
        }

        .afp-toggle-group {
          flex-wrap: wrap;
          gap: 8px;
        }

        .afp-toggle {
          padding: 8px 16px;
          font-size: 13px;
          border-radius: 20px;
          flex: 0 0 auto;
        }

        /* Activity presets — wrap on mobile */
        .afp-activity-presets {
          flex-wrap: wrap;
          overflow-x: visible;
          gap: 8px;
        }

        .afp-preset-btn {
          flex: 0 0 auto;
          padding: 8px 14px;
          font-size: 13px;
          border-radius: 20px;
        }

        /* Activity type buttons — wrap on mobile */
        .afp-activity-types {
          flex-wrap: wrap;
          overflow-x: visible;
          gap: 8px;
        }

        .afp-type-btn {
          flex: 0 0 auto;
          min-width: 44px;
          min-height: 44px;
          border-radius: 10px;
        }

        .afp-type-btn .material-icons { font-size: 20px; }

        .afp-footer {
          padding: 12px 20px 20px;
          position: sticky;
          bottom: 0;
          background: #fff;
          border-top: 1px solid #f0f0f0;
        }


        /* ── Leads list header ── */
        .leads-list-header {
          padding: 8px 12px;
          background: #f2f3f5;
          border-bottom: none;
        }

        .select-hint {
          display: none;
        }

        /* ── Lead cards — proper mobile cards ── */
        .leads-list-container {
          flex: 1;
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
          background: #f2f3f5;
        }

        .leads-list {
          gap: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
        }

        .lead-item {
          background: #ffffff;
          border: none;
          border-radius: 0;
          border-bottom: 1px solid #f0f0f0;
          padding: 10px 14px 10px 12px;
          margin: 0;
          min-height: unset;
          box-shadow: none;
        }

        .lead-item:first-child { border-top: none; }

        .lead-item.active {
          background: #f0f9ff;
          border-left: 3px solid #0284c7;
          box-shadow: none;
          padding-left: 13px;
        }

        .lead-item.checked {
          background: #f0f9ff;
          border-left: 3px solid #0284c7;
          padding-left: 13px;
        }

        .lead-checkbox input[type="checkbox"] {
          width: 18px;
          height: 18px;
        }

        .li-name { font-size: 14px; }

        .li-chip { font-size: 12px; }
        .li-chip .material-icons { font-size: 13px; }

        .li-act { width: 30px; height: 30px; }
        .li-act .material-icons { font-size: 17px; }

        /* ── Bulk capsule ── */
        .bulk-capsule {
          bottom: 0;
          left: 0;
          right: 0;
          width: 100%;
          transform: none;
          border-radius: 0;
          padding: 12px 16px;
          padding-bottom: calc(12px + env(safe-area-inset-bottom, 0px));
          gap: 0;
          justify-content: space-between;
          box-shadow: 0 -4px 20px rgba(0,0,0,0.2);
          animation: none;
        }

        .bulk-capsule-count {
          font-size: 13px;
          padding: 0 4px 0 0;
        }

        .bulk-capsule-action {
          padding: 4px 8px;
          border-radius: 8px;
        }

        .bulk-inline-select {
          font-size: 12px;
          max-width: 72px;
        }

        /* ── Side panel → Full-screen native sheet ── */
        .side-panel {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          width: 100%;
          height: 100%;
          max-height: 100%;
          z-index: 1001; /* above hamburger (999) and sidebar (1000) */
          background: #f2f3f5;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          box-shadow: none;
          border-radius: 0;
          animation: slide-up 0.28s cubic-bezier(0.32,0.72,0,1);
        }

        @keyframes slide-up {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }

        /* ── Panel header — thin close bar only ── */
        .panel-header {
          background: #0284c7;
          padding: 0 12px;
          height: 48px;
          min-height: 48px;
          gap: 0;
          flex-direction: row;
          align-items: center;
          border-bottom: none;
          flex-shrink: 0;
          display: flex;
        }

        .header-actions {
          order: unset;
          display: flex;
          width: 100%;
          margin-bottom: 0;
        }

        .header-right {
          display: flex;
          flex-direction: row;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          gap: 8px;
        }

        .btn-close {
          color: rgba(255,255,255,0.9);
          background: rgba(255,255,255,0.15);
          border-radius: 50%;
          min-width: 36px;
          width: 36px;
          height: 36px;
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .btn-close:hover {
          background: rgba(255,255,255,0.28);
          color: white;
        }

        .btn-close .material-icons { font-size: 20px; }

        .assign-user-select-compact {
          background: rgba(255,255,255,0.2);
          border: 1px solid rgba(255,255,255,0.3);
          color: white;
          border-radius: 20px;
          padding: 6px 12px;
          font-size: 12px;
          font-weight: 600;
          width: auto;
          min-width: 120px;
          max-width: 160px;
        }

        .assign-user-select-compact option {
          color: #111827;
          background: white;
        }

        /* ── Panel content — the full-scroll container ── */
        .panel-content {
          flex: 1;
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
          background: #f2f3f5;
          padding: 0;
          padding-bottom: calc(20px + env(safe-area-inset-bottom, 0px));
          scrollbar-width: none;
        }

        .panel-content::-webkit-scrollbar { display: none; }

        /* Contact hero — first card in scroll, blue banner */
        .contact-info {
          background: #0284c7;
          padding: 16px 16px 20px;
          margin: 0;
          order: unset;
          width: auto;
        }

        .contact-info .lead-name {
          font-size: 20px;
          font-weight: 700;
          color: white;
          margin: 0 0 4px;
        }

        .contact-info .lead-email {
          font-size: 13px;
          color: rgba(255,255,255,0.8);
          margin: 0 0 2px;
        }

        .contact-info .lead-phone {
          font-size: 14px;
          color: rgba(255,255,255,0.9);
          margin: 0;
          font-weight: 500;
        }

        /* ── Action buttons — white card, scrolls with content ── */
        .action-buttons-row {
          background: white;
          margin: 10px 10px 0;
          border-radius: 12px;
          padding: 16px 12px;
          gap: 0;
          justify-content: space-around;
          flex-shrink: unset;
        }

        .action-btn-circle {
          width: 52px;
          height: 52px;
          flex-direction: column;
          gap: 4px;
          border-radius: 14px;
          box-shadow: none !important;
        }

        .action-btn-circle.call { background: #dcfce7 !important; }
        .action-btn-circle.call .material-icons { color: #16a34a !important; }

        .action-btn-circle.whatsapp { background: #dcfce7 !important; }
        .action-btn-circle.whatsapp .material-icons { color: #15803d !important; }

        .action-btn-circle.note { background: #fef9c3 !important; }
        .action-btn-circle.note .material-icons { color: #ca8a04 !important; }

        .action-btn-circle.followup { background: #ede9fe !important; }
        .action-btn-circle.followup .material-icons { color: #7c3aed !important; }

        .action-btn-circle .material-icons {
          font-size: 22px;
        }

        /* Each section in content is a white card with breathing room */
        .call-status-chips-section,
        .stage-chips-section {
          background: white;
          margin: 10px 10px 0;
          border-radius: 12px;
          padding: 14px 14px;
        }

        .chips-label {
          font-size: 10px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.6px;
          color: #9ca3af;
          margin-bottom: 10px;
        }

        .call-status-chips {
          gap: 6px;
          overflow-x: auto;
          flex-wrap: nowrap;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
          padding-bottom: 2px;
        }

        .call-status-chips::-webkit-scrollbar { display: none; }

        .call-status-chip {
          flex-shrink: 0;
          padding: 8px 14px;
          font-size: 12px;
          font-weight: 600;
          border-radius: 20px;
          height: 36px;
        }

        .stage-chips {
          gap: 6px;
          overflow-x: auto;
          flex-wrap: nowrap;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
          padding-bottom: 2px;
        }

        .stage-chips::-webkit-scrollbar { display: none; }

        .stage-chip {
          flex-shrink: 0;
          padding: 8px 14px;
          font-size: 12px;
          font-weight: 600;
          border-radius: 20px;
          height: 36px;
        }

        .info-section,
        .lead-details-section,
        .followups-section,
        .custom-fields-section,
        .notes-section,
        .current-stage-forms,
        .stages-accordion-section {
          background: white;
          margin: 10px 10px 0;
          border-radius: 12px;
          padding: 14px 14px;
        }

        /* Accordion overrides on mobile */
        .stages-accordion {
          border-radius: 8px;
          overflow: hidden;
        }

        .sa-header {
          padding: 12px 12px;
        }

        .sa-body {
          padding: 10px 12px 14px;
        }

        .sa-field-input {
          font-size: 16px; /* prevent iOS zoom */
        }

        .section-title {
          font-size: 12px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #9ca3af;
          margin-bottom: 12px;
        }

        .details-grid {
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }

        .detail-item {
          background: #f8f9fa;
          border-radius: 10px;
          border: none;
          padding: 10px 12px;
        }

        .detail-label {
          font-size: 10px;
          font-weight: 700;
          color: #9ca3af;
          text-transform: uppercase;
          letter-spacing: 0.4px;
        }

        .detail-value {
          font-size: 14px;
          font-weight: 500;
          color: #111827;
          margin-top: 2px;
        }

        /* Notes area */
        .note-textarea {
          font-size: 15px;
          border-radius: 10px;
          padding: 12px;
        }

        .note-item {
          padding: 10px 0;
        }

        .note-content { font-size: 14px; }
        .note-meta { font-size: 12px; }

        /* Activity — white card */
        .activities-section,
        .activity-list {
          background: white;
          margin: 10px 10px 0;
          border-radius: 12px;
          padding: 14px 14px;
        }

        /* Activity filter chips — horizontal scroll */
        .activity-filters {
          display: flex;
          gap: 6px;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
          flex-wrap: nowrap;
          padding-bottom: 10px;
          margin-bottom: 2px;
        }

        .activity-filters::-webkit-scrollbar { display: none; }

        .filter-chip {
          flex-shrink: 0;
          white-space: nowrap;
          padding: 5px 10px;
          font-size: 11px;
          height: 28px;
        }

        /* Activity feed rows */
        .activity-item {
          padding: 7px 0;
          gap: 8px;
        }

        .activity-dot {
          width: 7px;
          height: 7px;
          margin-top: 5px;
        }

        .activity-type { font-size: 12px; }
        .activity-msg { font-size: 12px; }
        .activity-meta { font-size: 11px; }

        /* Stage forms */
        .inline-forms {
          padding: 12px 14px 16px;
        }

        /* ── Modals → bottom sheets ── */
        .modal {
          align-items: flex-end;
        }

        .modal-content {
          width: 100%;
          max-height: 90vh;
          border-radius: 20px 20px 0 0;
          margin: 0;
        }

        .modal-wide {
          width: 100%;
          max-height: 96vh;
          border-radius: 20px 20px 0 0;
          max-width: 100%;
          margin: 0;
        }

        .modal-small {
          width: 100%;
          border-radius: 20px 20px 0 0;
          max-width: 100%;
        }

        .modal-content::before,
        .modal-wide::before,
        .modal-small::before {
          content: '';
          display: block;
          width: 36px;
          height: 4px;
          background: #d1d5db;
          border-radius: 2px;
          margin: 12px auto 0;
        }

        .modal-header {
          padding: 12px 20px 16px;
        }

        .modal-body {
          padding: 12px 20px 16px;
        }

        .modal-footer {
          padding: 12px 20px;
          padding-bottom: calc(16px + env(safe-area-inset-bottom, 0px));
          flex-direction: column;
          gap: 10px;
        }

        .modal-footer button {
          width: 100%;
          justify-content: center;
          padding: 14px;
          font-size: 15px;
          border-radius: 12px;
        }

        /* ── Form rows inside modal ── */
        .form-row {
          flex-direction: column;
          gap: 12px;
        }

        .form-group {
          min-width: 100%;
        }

        .form-group input,
        .form-group select,
        .form-group textarea {
          font-size: 16px;
          padding: 12px;
          border-radius: 10px;
          min-height: 48px;
        }
      }

      /* ══════════════════════════════════════════
         SMALL PHONES — ≤480px
      ══════════════════════════════════════════ */
      @media (max-width: 480px) {

        .header-left h1 { font-size: 16px; }

        .btn-create-lead {
          padding: 0 10px;
          font-size: 12px;
          height: 36px;
        }

        .lead-item { padding: 12px 12px 12px 10px; }

        .contact-info .lead-name { font-size: 18px; }

        .action-btn-circle { width: 50px; height: 50px; }

        .details-grid { grid-template-columns: 1fr; }
      }
    `,
  ],
})
export class LeadsComponent implements OnInit, OnDestroy {
  leads: Lead[] = [];
  filteredLeads: Lead[] = [];

  // ── Multi-select ──
  selectedLeadIds = new Set<string>();
  bulkStageId = '';
  bulkUserId = '';
  lastSelectedLeadId: string | null = null; // anchor for shift+click range (by ID, not index)
  shiftRangeSelected = false; // range was handled in mousedown, skip click
  isDragSelecting = false; // for drag-lasso
  dragMoved = false; // true only after mouse enters a different row
  dragStartIndex = -1; // row index where drag started
  dragSelectMode: 'add' | 'remove' = 'add';
  private dragScrollTimer: any = null;
  private dragCurrentIndex = -1; // track current hovered index during drag
  private ptrMoveListener: ((e: PointerEvent) => void) | null = null;
  private ptrUpListener: (() => void) | null = null;
  private dragScrollContainer: HTMLElement | null = null;
  phoneCopied = false; // brief feedback state
  stages: Stage[] = [];
  users: any[] = [];
  leadForm: FormGroup;
  followupForm: FormGroup;

  selectedLead: Lead | null = null;
  selectedLeadFollowups: any[] = [];
  selectedAssignedUserId: string = '';
  editingLead: Lead | null = null;
  showModal = false;
  showDeleteConfirm = false;
  showSetFollowupModal = false;
  private notificationTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private swReg: ServiceWorkerRegistration | null = null;
  private swBroadcast: BroadcastChannel | null = null;
  // Dynamic custom fields for the create/edit modal
  customFieldEntries: { key: string; value: string }[] = [];

  // ── Bulk Import state ──
  showImportModal = false;
  importStep = 1; // 1=input, 2=preview, 3=result
  importInputMode: 'paste' | 'file' = 'paste';
  importRawPaste = '';
  isDragOver = false;
  isImporting = false;
  importPreviewColumns: string[] = [];
  importPreviewRows: any[] = [];
  importValidRows = 0;
  importInvalidRows = 0;
  importResultSuccess = 0;
  importResultFailed = 0;

  // Columns we recognise when importing — maps to lead fields
  importKnownColumns = [
    'name',
    'email',
    'phone',
    'title',
    'company',
    'website',
    'location',
    'source',
    'project',
    'campaign_name',
    'description',
  ];
  showFilters = false;

  isSaving = false;
  isLoading = false;
  formValues: { [key: string]: string } = {};
  submittedForms: Set<string> = new Set();
  formAttachments: { [key: string]: any[] } = {};

  // Notes and Communication
  leadNotes: any[] = [];
  communicationLog: any[] = [];
  newNote: string = '';
  selectedActivityFilter: string = 'all';
  allActivities: any[] = [];
  showAddNoteForm = false;
  stageAccordionOpen = new Set<string>();

  toggleStageAccordion(stageId: string): void {
    if (this.stageAccordionOpen.has(stageId)) {
      this.stageAccordionOpen.delete(stageId);
    } else {
      this.stageAccordionOpen.add(stageId);
    }
  }

  getStageSubmittedCount(stage: any): number {
    if (!stage.assignedForms) return 0;
    return stage.assignedForms.filter((f: any) => this.submittedForms.has(f.id)).length;
  }

  // Team member selection dialog for stage transitions
  showTeamSelectionDialog = false;
  pendingStageTransition: { stageId: string; stage: Stage } | null = null;
  stageTeamMembers: any[] = [];
  selectedTeamMembers: Set<string> = new Set();

  // Team lead support
  userIsTeamLead = false;
  userTeamId: string | null = null;
  teamMembersForFilterDisplay: any[] = [];
  teamMemberUserIds: Set<string> = new Set(); // For filtering leads by team members

  searchQuery = '';
  filterStage = new Set<string>();
  filterSource = '';
  filterAssignee = '';
  filterFollowup = '';
  filterFollowupFrom = '';
  filterFollowupTo = '';
  filterStatus = ''; // '' | 'active' | 'won' | 'lost'
  filterLocation = '';
  filterProject = '';
  filterCampaign = '';
  filterCreatedFrom = '';
  filterCreatedTo = '';
  filterLastContactedFrom = '';
  filterLastContactedTo = '';
  filterActivityFrom = '';
  filterActivityTo = '';
  filterActivityPreset = ''; // '' | 'today' | 'yesterday' | 'this_week' | 'this_month'
  filterActivityType = ''; // '' | 'call_logged' | 'lead_stage_changed' | 'followup_scheduled' | 'note_added' | 'lead_assigned' | 'whatsapp_sent'
  filterCallStatus = ''; // '' | 'picked' | 'not_picked' | 'busy' | 'switched_off' | 'invalid'
  filterHasPhone = ''; // '' | 'yes' | 'no'
  filterHasEmail = ''; // '' | 'yes' | 'no'

  get activeFilterCount(): number {
    let count = 0;
    if (this.filterSource) count++;
    if (this.filterAssignee) count++;
    if (this.filterFollowup) count++;
    if (this.filterStatus) count++;
    if (this.filterLocation) count++;
    if (this.filterProject) count++;
    if (this.filterCampaign) count++;
    if (this.filterCreatedFrom || this.filterCreatedTo) count++;
    if (this.filterLastContactedFrom || this.filterLastContactedTo) count++;
    return count;
  }

  get advancedFilterCount(): number {
    let count = 0;
    if (this.filterStatus) count++;
    if (this.filterLocation) count++;
    if (this.filterProject) count++;
    if (this.filterCampaign) count++;
    if (this.filterCreatedFrom || this.filterCreatedTo) count++;
    if (this.filterLastContactedFrom || this.filterLastContactedTo) count++;
    return count;
  }
  private followupDatesMap = new Map<string, Date[]>(); // leadId -> all scheduled dates
  private activityDatesMap = new Map<string, Array<{ date: Date; type: string }>>(); // leadId -> activities with dates and types

  followupTypes = ['call', 'meeting', 'email', 'demo'];

  private destroy$ = new Subject<void>();
  private activitiesPollingInterval: any;
  private activitiesPollingIntervalMs = 5000; // Poll every 5 seconds

  get currentStageWithForms() {
    if (!this.selectedLead || !this.stages) {
      return null;
    }
    return this.stages.find((s) => s.id === this.selectedLead?.stage_id) || null;
  }

  trackByStageId(index: number, stage: any): string {
    return stage.id;
  }

  constructor(
    private leadService: LeadService,
    private stageService: StageService,
    private el: ElementRef,
    private formService: FormService,
    private userService: UserService,
    private teamService: TeamService,
    private authService: AuthService,
    private followupService: FollowupService,
    private ownershipService: OwnershipService,
    private visibilityService: VisibilityService,
    private activityService: ActivityService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef,
  ) {
    this.leadForm = this.fb.group({
      // Contact
      name: ['', Validators.required],
      email: ['', [Validators.email]],
      phone: [''],
      title: [''],
      // Company
      company: [''],
      website: [''],
      location: [''],
      // Lead Info
      source: [''],
      stage_id: [''],
      project: [''],
      campaign_name: [''],
      description: [''],
      // Assignment
      assigned_to_user_id: [''],
    });

    this.followupForm = this.fb.group({
      type: ['call', Validators.required],
      dateOption: ['tomorrow', Validators.required],
      customDate: [''],
      time: ['10:00', Validators.required],
    });
  }

  ngOnInit(): void {
    // Request browser notification permission
    this.requestNotificationPermission();
    // First, detect if user is a team lead, then load all data
    this.detectTeamLeadStatus();
  }

  detectTeamLeadStatus(): void {
    const currentUser = this.authService.getCurrentUser();
    console.log(
      '[LeadsComponent] Detecting team lead status for user:',
      currentUser?.id,
      currentUser?.first_name,
    );

    if (!currentUser) {
      // No user logged in, load everything normally
      console.log('[LeadsComponent] No current user, loading normally');
      this.loadLeads();
      this.loadStages();
      this.loadUsers();
      this.loadAllFollowups();
      return;
    }

    // Check if admin
    const isAdmin = currentUser.role === 'admin';
    if (isAdmin) {
      // Admin - load everything normally
      console.log('[LeadsComponent] User is admin, loading all data');
      this.loadLeads();
      this.loadStages();
      this.loadUsers();
      this.loadAllFollowups();
      return;
    }

    // For non-admin, check if they're a team lead
    console.log('[LeadsComponent] User is not admin, checking for team lead status');
    this.teamService
      .getTeams(0, 1000)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (teams) => {
          console.log('[LeadsComponent] Teams loaded:', teams.length, 'teams');
          const userTeam = teams.find((t) => t.team_lead_id === currentUser.id);
          if (userTeam) {
            // User is a team lead
            console.log(
              '[LeadsComponent] User IS a team lead. Team:',
              userTeam.name,
              'ID:',
              userTeam.id,
            );
            this.userIsTeamLead = true;
            this.userTeamId = userTeam.id;

            // Load team members separately (they're not in the teams API response)
            this.teamService
              .getTeamMembers(userTeam.id)
              .pipe(takeUntil(this.destroy$))
              .subscribe({
                next: (members) => {
                  console.log('[LeadsComponent] Team members loaded:', members.length, 'members');
                  console.log('[LeadsComponent] Team members data:', members);
                  this.teamMembersForFilterDisplay = members || [];

                  // Populate the set of team member user IDs for filtering leads
                  this.teamMemberUserIds.clear();
                  if (currentUser.id) {
                    this.teamMemberUserIds.add(currentUser.id); // Include the team lead themselves
                  }
                  members.forEach((member) => {
                    if (member.user_id) {
                      this.teamMemberUserIds.add(member.user_id);
                    }
                  });
                  console.log(
                    '[LeadsComponent] Team member user IDs for filtering:',
                    Array.from(this.teamMemberUserIds),
                  );

                  // By default, show only the team lead's own leads
                  if (currentUser.id) {
                    this.filterAssignee = currentUser.id;
                    console.log(
                      "[LeadsComponent] Setting default filter to team lead's own leads:",
                      currentUser.id,
                    );
                  }

                  // Now load all data with team members available
                  this.loadLeads();
                  this.loadStages();
                  this.loadUsers();
                  this.loadAllFollowups();
                },
                error: (err) => {
                  console.error('[LeadsComponent] Error loading team members:', err);
                  this.teamMembersForFilterDisplay = [];
                  // Still load data even if members fail
                  this.loadLeads();
                  this.loadStages();
                  this.loadUsers();
                  this.loadAllFollowups();
                },
              });
          } else {
            console.log('[LeadsComponent] User is NOT a team lead');
            // Not a team lead, load all data normally
            this.loadLeads();
            this.loadStages();
            this.loadUsers();
            this.loadAllFollowups();
          }
        },
        error: (err) => {
          // Error loading teams, load everything normally
          console.error('[LeadsComponent] Error loading teams:', err);
          this.loadLeads();
          this.loadStages();
          this.loadUsers();
          this.loadAllFollowups();
        },
      });
  }

  ngOnDestroy(): void {
    // Stop polling
    if (this.activitiesPollingInterval) {
      clearInterval(this.activitiesPollingInterval);
    }
    // Clear all pending notification timers
    this.notificationTimers.forEach((t) => clearTimeout(t));
    this.notificationTimers.clear();
    // Close broadcast channel
    try {
      this.swBroadcast?.close();
    } catch (_) {}
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Get visible forms for current stage based on hidden_from_stages
   */
  getVisibleForms(forms: any[] | undefined, stageId: string | undefined): any[] {
    if (!forms || !stageId) return forms || [];

    return forms.filter((form) => {
      // If form has hidden_from_stages and current stage is in it, hide the form
      if (form.hidden_from_stages && Array.isArray(form.hidden_from_stages)) {
        return !form.hidden_from_stages.includes(stageId);
      }
      return true; // Show if no visibility restrictions
    });
  }

  loadLeads(): void {
    this.isLoading = true;

    // Get current user
    const currentUser = this.authService.getCurrentUser();
    console.log('[LeadsComponent:loadLeads] Starting. userIsTeamLead:', this.userIsTeamLead);

    if (!currentUser || !currentUser.id) {
      // Fallback: load all leads if no user is logged in
      console.log('[LeadsComponent:loadLeads] No current user, loading all leads');
      this.leadService
        .getLeads(0, 100)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (leads) => {
            this.leads = leads;
            this.filteredLeads = leads;
            this.isLoading = false;
            this.cdr.markForCheck();
          },
          error: (error) => {
            this.isLoading = false;
            this.cdr.markForCheck();
          },
        });
      return;
    }

    // Check if user is admin - if so, load all leads, otherwise load only assigned leads
    const isAdmin = currentUser.role === 'admin';

    if (isAdmin) {
      // Admins see all leads
      console.log('[LeadsComponent:loadLeads] User is admin, loading all leads');
      this.leadService
        .getLeads(0, 100)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (leads) => {
            this.leads = leads;
            this.filteredLeads = leads;
            this.isLoading = false;
            this.cdr.markForCheck();
          },
          error: (error) => {
            this.isLoading = false;
            this.cdr.markForCheck();
          },
        });
    } else if (this.userIsTeamLead) {
      // Team leads see all leads but default to their assigned ones
      console.log(
        '[LeadsComponent:loadLeads] User is team lead, loading all leads with default filter',
      );
      this.leadService
        .getLeads(0, 200)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (leads) => {
            console.log('[LeadsComponent:loadLeads] Loaded', leads.length, 'leads for team lead');
            // Show all leads for team lead (filtering is handled by applyFilters based on teamMemberUserIds)
            this.leads = leads;
            this.applyFilters(); // Apply automatic team member filtering
            this.loadAllActivities();
            this.isLoading = false;
            this.cdr.markForCheck();
          },
          error: (error) => {
            console.error('[LeadsComponent:loadLeads] Error loading leads for team lead:', error);
            this.isLoading = false;
            this.cdr.markForCheck();
          },
        });
    } else {
      // Regular users see their assigned leads + all unassigned leads
      console.log(
        '[LeadsComponent:loadLeads] User is regular user, loading assigned + unassigned leads',
      );
      this.leadService
        .getLeads(0, 200)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (leads) => {
            console.log(
              '[LeadsComponent:loadLeads] Loaded',
              leads.length,
              'leads, filtering to assigned + unassigned',
            );
            // Show assigned-to-me leads + unassigned leads (company-wide pool)
            this.leads = leads.filter(
              (l) => !l.assigned_to_user_id || l.assigned_to_user_id === currentUser.id,
            );
            console.log(
              '[LeadsComponent:loadLeads] After filter, showing',
              this.leads.length,
              'leads',
            );
            this.filteredLeads = this.leads;
            this.loadAllActivities();
            this.isLoading = false;
            this.cdr.markForCheck();
          },
          error: (error) => {
            console.error('[LeadsComponent:loadLeads] Error loading leads:', error);
            this.isLoading = false;
            this.cdr.markForCheck();
          },
        });
    }
  }

  loadStages(): void {
    this.stageService
      .getStages()
      .pipe(
        switchMap((stages) => {
          // For each stage, load fields for each assigned form
          const stagesWithFields = stages.map((stage) => {
            if (!stage.assignedForms || stage.assignedForms.length === 0) {
              return Promise.resolve(stage);
            }

            // Load fields for all forms in this stage
            const fieldPromises = stage.assignedForms.map((form) =>
              this.formService
                .getFormFields(form.id)
                .toPromise()
                .then((fields) => {
                  form.fields = fields || [];
                  return form;
                })
                .catch((err) => {
                  form.fields = [];
                  return form;
                }),
            );

            return Promise.all(fieldPromises).then(() => stage);
          });

          return Promise.all(stagesWithFields);
        }),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (stages: any) => {
          this.stages = stages;
          this.cdr.markForCheck();
        },
        error: (error) => {},
      });
  }

  loadAllFollowups(): void {
    this.followupService
      .getFollowups()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (followups) => {
          this.followupDatesMap.clear();
          followups.forEach((f) => {
            if (!f.lead_id || !f.scheduled_for) return;
            // Skip soft-deleted followups
            if ((f as any).deleted_at) return;
            // Status comes back as an object { _value_: 'pending' } or as plain string
            const statusVal: string = (f.status as any)?._value_ ?? f.status;
            if (statusVal !== 'pending') return;
            // Backend uses space-separated datetime (not ISO T), fix for Safari
            const dateStr = (f.scheduled_for as string).replace(' ', 'T');
            const due = new Date(dateStr);
            if (isNaN(due.getTime())) return;
            const existing = this.followupDatesMap.get(f.lead_id) || [];
            existing.push(due);
            this.followupDatesMap.set(f.lead_id, existing);
          });
          this.applyFilters();
        },
        error: (err) => {
          console.warn('loadAllFollowups failed:', err);
        },
      });
  }

  loadAllActivities(): void {
    // Get activities for each lead
    this.activityDatesMap.clear();
    this.leads.forEach((lead) => {
      this.activityService
        .getLeadActivities(lead.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (activities: any[]) => {
            if (!activities || activities.length === 0) return;
            const activityList = activities
              .map((a: any) => {
                const createdAt = (a.created_at as string).replace(' ', 'T');
                const date = new Date(createdAt);
                if (isNaN(date.getTime())) return null;
                return { date, type: a.activity_type || '' };
              })
              .filter((a: any) => a !== null) as { date: Date; type: string }[];
            if (activityList.length > 0) {
              this.activityDatesMap.set(lead.id, activityList);
            }
            this.applyFilters();
          },
          error: (err: any) => {
            // Silently skip if activities can't be loaded for a specific lead
          },
        });
    });
  }

  toggleFilterStage(stageId: string): void {
    if (this.filterStage.has(stageId)) {
      this.filterStage.delete(stageId);
    } else {
      this.filterStage.add(stageId);
    }
    this.applyFilters();
  }

  getLeadCountForStage(stageId: string): number {
    return this.filteredLeads.filter((l) => l.stage_id === stageId).length;
  }

  getLeadCountByCallStatus(callStatus: string): number {
    if (!callStatus) {
      // Count all leads when "All" is selected
      return this.filteredLeads.length;
    }
    return this.filteredLeads.filter((l) => l.call_status === callStatus).length;
  }

  resetFilters(): void {
    this.searchQuery = '';
    this.filterSource = '';
    this.filterAssignee = '';
    this.filterFollowup = '';
    this.filterFollowupFrom = '';
    this.filterFollowupTo = '';
    this.filterStatus = '';
    this.filterLocation = '';
    this.filterProject = '';
    this.filterCampaign = '';
    this.filterCreatedFrom = '';
    this.filterCreatedTo = '';
    this.filterLastContactedFrom = '';
    this.filterLastContactedTo = '';
    this.filterActivityFrom = '';
    this.filterActivityTo = '';
    this.filterActivityPreset = '';
    this.filterActivityType = '';
    this.filterCallStatus = '';
    this.applyFilters();
  }

  applyFilters(): void {
    this.filteredLeads = this.leads.filter((lead) => {
      const matchesSearch =
        !this.searchQuery ||
        (lead.name || '').toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        (lead.phone || '').toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        (lead.email || '').toLowerCase().includes(this.searchQuery.toLowerCase());

      const matchesStage = this.filterStage.size === 0 || this.filterStage.has(lead.stage_id || '');
      const matchesSource = !this.filterSource || lead.source === this.filterSource;
      const matchesAssignee = (() => {
        // If there's an explicit filter, use it
        if (this.filterAssignee) {
          return this.filterAssignee === '__unassigned__'
            ? !lead.assigned_to_user_id
            : lead.assigned_to_user_id === this.filterAssignee;
        }
        // For team leads with no explicit filter, show only team member leads
        if (this.userIsTeamLead && this.teamMemberUserIds.size > 0) {
          return this.teamMemberUserIds.has(lead.assigned_to_user_id || '');
        }
        // For admins and regular users, show all leads
        return true;
      })();

      const matchesStatus =
        !this.filterStatus ||
        (this.filterStatus === 'won' && lead.is_won) ||
        (this.filterStatus === 'lost' && lead.is_lost) ||
        (this.filterStatus === 'active' && !lead.is_won && !lead.is_lost);

      const matchesLocation =
        !this.filterLocation ||
        (lead.location || '').toLowerCase().includes(this.filterLocation.toLowerCase());

      const matchesProject =
        !this.filterProject ||
        (lead.project || '').toLowerCase().includes(this.filterProject.toLowerCase());

      const matchesCampaign =
        !this.filterCampaign ||
        (lead.campaign_name || '').toLowerCase().includes(this.filterCampaign.toLowerCase());

      const matchesHasPhone =
        !this.filterHasPhone || (this.filterHasPhone === 'yes' ? !!lead.phone : !lead.phone);

      const matchesHasEmail =
        !this.filterHasEmail || (this.filterHasEmail === 'yes' ? !!lead.email : !lead.email);

      const matchesCreated = (() => {
        if (!this.filterCreatedFrom && !this.filterCreatedTo) return true;
        if (!lead.created_at) return false;
        const d = new Date(lead.created_at);
        const from = this.filterCreatedFrom ? new Date(this.filterCreatedFrom) : null;
        const to = this.filterCreatedTo
          ? new Date(new Date(this.filterCreatedTo).getTime() + 86_400_000)
          : null;
        return (!from || d >= from) && (!to || d < to);
      })();

      const matchesLastContacted = (() => {
        if (!this.filterLastContactedFrom && !this.filterLastContactedTo) return true;
        if (!lead.last_contacted_at) return false;
        const d = new Date(lead.last_contacted_at);
        const from = this.filterLastContactedFrom ? new Date(this.filterLastContactedFrom) : null;
        const to = this.filterLastContactedTo
          ? new Date(new Date(this.filterLastContactedTo).getTime() + 86_400_000)
          : null;
        return (!from || d >= from) && (!to || d < to);
      })();

      const matchesFollowup = (() => {
        if (!this.filterFollowup) return true;
        const dates = this.followupDatesMap.get(lead.id) || [];
        if (this.filterFollowup === 'has') return dates.length > 0;
        if (this.filterFollowup === 'none') return dates.length === 0;
        const n = new Date();
        const todayStart = new Date(n.getFullYear(), n.getMonth(), n.getDate());
        const tomorrowStart = new Date(todayStart.getTime() + 86_400_000);
        const dayAfterTmrw = new Date(tomorrowStart.getTime() + 86_400_000);
        const dow = n.getDay();
        const diffMon = dow === 0 ? -6 : 1 - dow;
        const weekStart = new Date(todayStart.getTime() + diffMon * 86_400_000);
        const weekEnd = new Date(weekStart.getTime() + 7 * 86_400_000);
        const nextWeekStart = weekEnd;
        const nextWeekEnd = new Date(nextWeekStart.getTime() + 7 * 86_400_000);
        const monthStart = new Date(n.getFullYear(), n.getMonth(), 1);
        const monthEnd = new Date(n.getFullYear(), n.getMonth() + 1, 1);
        const nextMonthStart = monthEnd;
        const nextMonthEnd = new Date(n.getFullYear(), n.getMonth() + 2, 1);
        const inRange = (from: Date, to: Date) => dates.some((d) => d >= from && d < to);
        switch (this.filterFollowup) {
          case 'overdue':
            return dates.some((d) => d < todayStart);
          case 'today':
            return inRange(todayStart, tomorrowStart);
          case 'tomorrow':
            return inRange(tomorrowStart, dayAfterTmrw);
          case 'this_week':
            return inRange(weekStart, weekEnd);
          case 'next_week':
            return inRange(nextWeekStart, nextWeekEnd);
          case 'this_month':
            return inRange(monthStart, monthEnd);
          case 'next_month':
            return inRange(nextMonthStart, nextMonthEnd);
          case 'custom': {
            const from = this.filterFollowupFrom ? new Date(this.filterFollowupFrom) : null;
            const to = this.filterFollowupTo
              ? new Date(new Date(this.filterFollowupTo).getTime() + 86_400_000)
              : null;
            if (!from && !to) return true;
            return dates.some((d) => (!from || d >= from) && (!to || d < to));
          }
          default:
            return true;
        }
      })();

      const matchesActivity = (() => {
        if (!this.filterActivityFrom && !this.filterActivityTo && !this.filterActivityType)
          return true;
        const activities = this.activityDatesMap.get(lead.id) || [];
        if (activities.length === 0) return false; // No activities for this lead

        // Filter by type first (if specified)
        let filtered = activities;
        if (this.filterActivityType) {
          filtered = activities.filter((a) => a.type === this.filterActivityType);
          if (filtered.length === 0) return false;
        }

        // Then filter by date range (if specified)
        if (!this.filterActivityFrom && !this.filterActivityTo) return true;
        const from = this.filterActivityFrom ? new Date(this.filterActivityFrom) : null;
        const to = this.filterActivityTo
          ? new Date(new Date(this.filterActivityTo).getTime() + 86_400_000)
          : null;
        return filtered.some((a) => (!from || a.date >= from) && (!to || a.date < to));
      })();

      const matchesCallStatus =
        !this.filterCallStatus || lead.call_status === this.filterCallStatus;

      return (
        matchesSearch &&
        matchesStage &&
        matchesSource &&
        matchesAssignee &&
        matchesStatus &&
        matchesLocation &&
        matchesProject &&
        matchesCampaign &&
        matchesHasPhone &&
        matchesHasEmail &&
        matchesCreated &&
        matchesLastContacted &&
        matchesActivity &&
        matchesFollowup &&
        matchesCallStatus
      );
    });

    console.log(
      '[LeadsComponent:applyFilters] Applied filters. Total leads:',
      this.leads.length,
      'Filtered leads:',
      this.filteredLeads.length,
      'filterAssignee:',
      this.filterAssignee,
    );

    this.cdr.detectChanges();
  }

  toggleFilters(): void {
    this.showFilters = !this.showFilters;
    this.cdr.detectChanges();
  }

  selectLead(lead: Lead): void {
    this.selectedLead = lead;
    this.selectedAssignedUserId = lead.assigned_to_user_id || '';
    this.loadFollowupsForLead(lead.id);
    this.loadNotesForLead(lead.id);
    this.loadCommunicationLog(lead.id);
    // Reload stages to ensure pipeline forms section shows latest forms
    this.loadStages();
    // Load form submission history for this lead
    this.loadFormSubmissionHistory(lead.id);
    // Build activities timeline after data is loaded
    setTimeout(() => this.buildActivitiesTimeline(lead.id), 100);

    // Stop any existing polling
    if (this.activitiesPollingInterval) {
      clearInterval(this.activitiesPollingInterval);
    }

    // Start polling for new activities
    this.activitiesPollingInterval = setInterval(() => {
      this.buildActivitiesTimeline(lead.id);
    }, this.activitiesPollingIntervalMs);

    this.cdr.detectChanges();
  }

  // ── Keyboard shortcuts ──
  @HostListener('document:keydown', ['$event'])
  onKeydown(e: KeyboardEvent): void {
    // Ignore when typing in inputs/textareas
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) return;
    if (e.key === 'Escape') {
      this.clearSelection();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
      e.preventDefault();
      this.filteredLeads.forEach((l) => this.selectedLeadIds.add(l.id));
      this.lastSelectedLeadId = this.filteredLeads.at(-1)?.id ?? null;
      this.selectedLead = null;
      this.cdr.markForCheck();
    }
  }

  handleLeadClick(lead: Lead, event: MouseEvent, index: number): void {
    // If shift+range was already applied in mousedown, just skip
    if (this.shiftRangeSelected) {
      this.shiftRangeSelected = false;
      return;
    }
    // If the mousedown turned into a real drag (moved to another row), swallow the click
    if (this.dragMoved) {
      this.dragMoved = false;
      this.lastSelectedLeadId = lead.id;
      return;
    }
    this.dragMoved = false;
    // If in multi-select mode, row click toggles
    if (this.selectedLeadIds.size > 0) {
      this.toggleLeadSelection(lead.id, index);
      return;
    }
    this.lastSelectedLeadId = lead.id;
    this.selectLead(lead);
  }

  toggleLeadSelection(leadId: string, index?: number, event?: Event): void {
    if (event) event.stopPropagation();
    if (this.selectedLeadIds.has(leadId)) {
      this.selectedLeadIds.delete(leadId);
    } else {
      this.selectedLeadIds.add(leadId);
      if (this.selectedLeadIds.size === 1) this.selectedLead = null;
    }
    this.lastSelectedLeadId = leadId;
    this.cdr.markForCheck();
  }

  // ── Drag-to-lasso ──
  startDragSelect(leadId: string, index: number, event: MouseEvent): void {
    if (event.button !== 0) return; // left button only
    this.dragMoved = false; // always reset on each new mousedown
    this.shiftRangeSelected = false;

    // Shift+click handled here on mousedown (more reliable than in click event)
    if (event.shiftKey) {
      const anchorIdx = this.lastSelectedLeadId
        ? this.filteredLeads.findIndex((l) => l.id === this.lastSelectedLeadId)
        : -1;
      if (anchorIdx >= 0) {
        const from = Math.min(anchorIdx, index);
        const to = Math.max(anchorIdx, index);
        this.filteredLeads.slice(from, to + 1).forEach((l) => this.selectedLeadIds.add(l.id));
      } else {
        this.selectedLeadIds.add(leadId);
      }
      this.selectedLead = null;
      this.lastSelectedLeadId = leadId;
      this.shiftRangeSelected = true; // tell click handler to skip
      this.cdr.markForCheck();
      return;
    }

    if (event.ctrlKey || event.metaKey) return;
    event.preventDefault(); // prevent native drag/text-selection from stealing pointer events
    console.log('🎯 Starting drag select at index', index);
    this.isDragSelecting = true;
    this.dragStartIndex = index;
    this.lastSelectedLeadId = leadId;
    this.dragSelectMode = this.selectedLeadIds.has(leadId) ? 'remove' : 'add';
    // Get scroll container from component host element (always available)
    this.dragScrollContainer = this.el.nativeElement.querySelector(
      '.leads-list-container',
    ) as HTMLElement | null;
    console.log('📦 Scroll container found:', !!this.dragScrollContainer);

    // Attach native pointer listeners for position tracking and lead selection
    this.ptrMoveListener = (e: PointerEvent) => {
      this.currentMouseX = e.clientX;
      this.currentMouseY = e.clientY;
      this.handleDragMove();
    };
    this.ptrUpListener = () => this.endDragSelect();
    document.addEventListener('pointermove', this.ptrMoveListener, { passive: true });
    document.addEventListener('pointerup', this.ptrUpListener);
    document.addEventListener('pointercancel', this.ptrUpListener);

    // Single scroll timer for the entire drag duration
    let scrollDebugCount = 0;
    this.dragScrollTimer = setInterval(() => {
      if (!this.isDragSelecting) {
        clearInterval(this.dragScrollTimer);
        this.dragScrollTimer = null;
        return;
      }
      const list = this.el.nativeElement.querySelector('.leads-list-container') as HTMLElement;
      if (!list) {
        if (scrollDebugCount++ === 0) console.warn('❌ Scroll container not found');
        return;
      }
      const rect = list.getBoundingClientRect();
      const zone = 100;
      const canScrollUp = list.scrollTop > 0;
      const canScrollDown = list.scrollTop < list.scrollHeight - list.clientHeight;

      let scrolled = false;
      // Top zone: mouse Y is within 100px of the top of the container
      if (this.currentMouseY >= rect.top && this.currentMouseY < rect.top + zone && canScrollUp) {
        const depth = Math.max(0, 1 - (this.currentMouseY - rect.top) / zone);
        const speed = Math.round(3 + depth * 25);
        list.scrollTop -= speed;
        scrolled = true;
        console.log('⬆️ Scrolling up at speed', speed, 'scrollTop:', list.scrollTop);
      }
      // Bottom zone: mouse Y is within 100px of the bottom of the container
      else if (
        this.currentMouseY > rect.bottom - zone &&
        this.currentMouseY <= rect.bottom &&
        canScrollDown
      ) {
        const depth = Math.max(0, 1 - (rect.bottom - this.currentMouseY) / zone);
        const speed = Math.round(3 + depth * 25);
        list.scrollTop += speed;
        scrolled = true;
        console.log('⬇️ Scrolling down at speed', speed, 'scrollTop:', list.scrollTop);
      }

      // After scrolling, try to find a new lead under the cursor and update the range
      if (scrolled) {
        // Call handleDragMove to potentially find a new lead under the cursor after scroll
        this.handleDragMove();
        // If we still have a valid dragCurrentIndex, update the range
        if (this.dragCurrentIndex >= 0) {
          this.updateDragRange(this.dragCurrentIndex);
        }
      }
    }, 16);
  }

  onDragEnter(leadId: string, index: number): void {
    // Fallback for visible-area movement via mouseenter; handleDragMove (via pointermove) is the primary path
    if (!this.isDragSelecting) return;
    this.updateDragRange(index);
  }

  private handleDragMove(): void {
    const el = document.elementFromPoint(this.currentMouseX, this.currentMouseY);
    if (!el) return;
    const row = (el as HTMLElement).closest('[data-lead-id]') as HTMLElement | null;
    if (!row) {
      // Mouse is outside lead rows but might be in scroll zone
      return;
    }
    const leadId = row.dataset['leadId'];
    if (!leadId) return;

    // Find the index of this lead in filteredLeads and store it
    const currentIndex = this.filteredLeads.findIndex((l) => l.id === leadId);
    if (currentIndex !== -1) {
      this.dragCurrentIndex = currentIndex;
      this.updateDragRange(currentIndex);
    }
  }

  private updateDragRange(currentIndex: number): void {
    if (!this.isDragSelecting) return;

    // On first move, add the start lead if not already done
    if (!this.dragMoved) {
      this.dragMoved = true;
      const startLead = this.filteredLeads[this.dragStartIndex];
      if (startLead) {
        if (this.dragSelectMode === 'add') {
          this.selectedLeadIds.add(startLead.id);
          this.selectedLead = null;
        } else this.selectedLeadIds.delete(startLead.id);
      }
    }

    // Select/deselect the range from dragStartIndex to currentIndex (like Excel)
    const from = Math.min(this.dragStartIndex, currentIndex);
    const to = Math.max(this.dragStartIndex, currentIndex);

    if (this.dragSelectMode === 'add') {
      // Add all leads in the range
      for (let i = from; i <= to; i++) {
        if (this.filteredLeads[i]) this.selectedLeadIds.add(this.filteredLeads[i].id);
      }
      this.selectedLead = null;
    } else {
      // Remove all leads in the range
      for (let i = from; i <= to; i++) {
        if (this.filteredLeads[i]) this.selectedLeadIds.delete(this.filteredLeads[i].id);
      }
    }

    this.lastSelectedLeadId = this.filteredLeads[currentIndex]?.id ?? null;
    this.cdr.markForCheck();
  }

  endDragSelect(): void {
    console.log('🏁 Ending drag select, selected count:', this.selectedLeadIds.size);
    this.isDragSelecting = false;
    this.dragScrollContainer = null;
    this.dragCurrentIndex = -1;
    if (this.dragScrollTimer !== null) {
      clearInterval(this.dragScrollTimer);
      this.dragScrollTimer = null;
    }
    if (this.ptrMoveListener) {
      document.removeEventListener('pointermove', this.ptrMoveListener);
      this.ptrMoveListener = null;
    }
    if (this.ptrUpListener) {
      document.removeEventListener('pointerup', this.ptrUpListener);
      document.removeEventListener('pointercancel', this.ptrUpListener);
      this.ptrUpListener = null;
    }
  }

  private currentMouseX = 0;
  private currentMouseY = 0;

  toggleSelectAll(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    if (checked) {
      this.filteredLeads.forEach((l) => this.selectedLeadIds.add(l.id));
      this.selectedLead = null;
    } else {
      this.selectedLeadIds.clear();
    }
    this.cdr.markForCheck();
  }

  isAllSelected(): boolean {
    return (
      this.filteredLeads.length > 0 &&
      this.filteredLeads.every((l) => this.selectedLeadIds.has(l.id))
    );
  }

  isSomeSelected(): boolean {
    return this.selectedLeadIds.size > 0 && !this.isAllSelected();
  }

  clearSelection(): void {
    this.selectedLeadIds.clear();
    this.bulkStageId = '';
    this.bulkUserId = '';
    this.cdr.markForCheck();
  }

  bulkAssignStage(): void {
    if (!this.bulkStageId) return;
    const ids = Array.from(this.selectedLeadIds);
    const stage = this.stages.find((s) => s.id === this.bulkStageId);
    const updates = ids.map((id) =>
      this.leadService
        .updateLead(id, { stage_id: this.bulkStageId, stage: stage?.name || 'new' })
        .pipe(takeUntil(this.destroy$)),
    );
    import('rxjs').then(({ forkJoin }) => {
      forkJoin(updates).subscribe({
        next: () => {
          ids.forEach((id) => {
            const lead = this.leads.find((l) => l.id === id);
            if (lead) {
              lead.stage_id = this.bulkStageId;
              lead.stage = (stage?.name || 'new') as any;
            }
          });
          this.bulkStageId = '';
          this.clearSelection();
          this.applyFilters();
        },
      });
    });
  }

  bulkAssignUser(): void {
    if (!this.bulkUserId) return;
    const ids = Array.from(this.selectedLeadIds);
    const updates = ids.map((id) =>
      this.leadService
        .updateLead(id, { assigned_to_user_id: this.bulkUserId })
        .pipe(takeUntil(this.destroy$)),
    );
    import('rxjs').then(({ forkJoin }) => {
      forkJoin(updates).subscribe({
        next: () => {
          ids.forEach((id) => {
            const lead = this.leads.find((l) => l.id === id);
            if (lead) lead.assigned_to_user_id = this.bulkUserId;
          });
          this.bulkUserId = '';
          this.clearSelection();
          this.applyFilters();
        },
      });
    });
  }

  bulkDelete(): void {
    if (!this.selectedLeadIds.size) return;
    if (!confirm(`Delete ${this.selectedLeadIds.size} lead(s)? This cannot be undone.`)) return;
    const ids = Array.from(this.selectedLeadIds);
    const deletes = ids.map((id) => this.leadService.deleteLead(id).pipe(takeUntil(this.destroy$)));
    import('rxjs').then(({ forkJoin }) => {
      forkJoin(deletes).subscribe({
        next: () => {
          this.leads = this.leads.filter((l) => !ids.includes(l.id));
          this.clearSelection();
          this.applyFilters();
        },
      });
    });
  }

  copySelectedPhones(): void {
    const phones = this.leads
      .filter((l) => this.selectedLeadIds.has(l.id) && l.phone)
      .map((l) => l.phone)
      .join('\n');
    if (!phones) {
      alert('No phone numbers found in selected leads.');
      return;
    }
    navigator.clipboard.writeText(phones).then(() => {
      this.phoneCopied = true;
      this.cdr.markForCheck();
      setTimeout(() => {
        this.phoneCopied = false;
        this.cdr.markForCheck();
      }, 1800);
    });
  }

  selectLeadById(leadId: string): void {
    // Find the lead by ID and select it
    const lead =
      this.leads.find((l: Lead) => l.id === leadId) ||
      this.filteredLeads.find((l: Lead) => l.id === leadId);
    if (lead) {
      this.selectLead(lead);
    } else {
    }
  }

  closeSidePanel(): void {
    this.selectedLead = null;
    // Stop polling
    if (this.activitiesPollingInterval) {
      clearInterval(this.activitiesPollingInterval);
      this.activitiesPollingInterval = null;
    }
    this.cdr.detectChanges();
  }

  openNewLeadForm(): void {
    this.editingLead = null;
    this.leadForm.reset();
    this.customFieldEntries = [];
    this.showModal = true;
    this.cdr.detectChanges();
  }

  editLead(): void {
    if (this.selectedLead) {
      this.editingLead = this.selectedLead;
      this.leadForm.patchValue({
        name: this.selectedLead.name,
        email: this.selectedLead.email,
        phone: this.selectedLead.phone || '',
        title: this.selectedLead.title || '',
        company: this.selectedLead.company || '',
        website: this.selectedLead.website || '',
        location: this.selectedLead.location || '',
        source: this.selectedLead.source || '',
        stage_id: this.selectedLead.stage_id || '',
        project: this.selectedLead.project || '',
        campaign_name: this.selectedLead.campaign_name || '',
        description: this.selectedLead.description || '',
        assigned_to_user_id: this.selectedLead.assigned_to_user_id || '',
      });
      // Populate custom field entries
      const cf = this.selectedLead.custom_fields || {};
      this.customFieldEntries = Object.entries(cf).map(([key, value]) => ({
        key,
        value: String(value),
      }));
      this.showModal = true;
      this.cdr.detectChanges();
    }
  }

  closeModal(): void {
    this.showModal = false;
    this.editingLead = null;
    this.leadForm.reset();
    this.customFieldEntries = [];
    this.cdr.detectChanges();
  }

  addCustomField(): void {
    this.customFieldEntries.push({ key: '', value: '' });
  }

  removeCustomField(index: number): void {
    this.customFieldEntries.splice(index, 1);
  }

  // ── Bulk Import Methods ──

  openImportModal(): void {
    this.showImportModal = true;
    this.importStep = 1;
    this.importInputMode = 'paste';
    this.importRawPaste = '';
    this.importPreviewRows = [];
    this.importPreviewColumns = [];
    this.importValidRows = 0;
    this.importInvalidRows = 0;
    this.isImporting = false;
    this.cdr.detectChanges();
  }

  closeImportModal(): void {
    this.showImportModal = false;
    this.cdr.detectChanges();
  }

  /** Called on textarea paste event — auto-preview */
  onImportPaste(event: ClipboardEvent): void {
    const text = event.clipboardData?.getData('text') || '';
    if (text.trim()) {
      // Let the ngModel update first, then parse
      setTimeout(() => {
        this.importRawPaste = text;
        this.parseImportData();
      }, 0);
      event.preventDefault();
    }
  }

  onFileDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver = false;
    const file = event.dataTransfer?.files[0];
    if (file) this.readFile(file);
  }

  onFileSelect(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) this.readFile(file);
  }

  private readFile(file: File): void {
    const reader = new FileReader();
    reader.onload = (e) => {
      this.importRawPaste = e.target?.result as string;
      this.parseImportData();
      this.cdr.markForCheck();
    };
    reader.readAsText(file);
  }

  parseImportData(): void {
    const raw = this.importRawPaste.trim();
    if (!raw) return;

    // Detect delimiter: tab (from Excel copy) or comma (CSV)
    const firstLine = raw.split('\n')[0];
    const delimiter = firstLine.includes('\t') ? '\t' : ',';

    const lines = raw.split('\n').filter((l) => l.trim());
    if (lines.length < 2) return;

    // Parse headers — normalise: lowercase, trim, replace spaces with _
    const rawHeaders = lines[0].split(delimiter).map((h) =>
      h
        .replace(/^["']|["']$/g, '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '_'),
    );

    // Map header aliases to canonical field names
    const headerAliasMap: Record<string, string> = {
      'first name': 'name',
      name: 'name',
      firstname: 'name',
      'full name': 'name',
      fullname: 'name',
      'last name': '_ignore_last',
      lastname: '_ignore_last',
      surname: '_ignore_last',
      'e-mail': 'email',
      'email address': 'email',
      mail: 'email',
      mobile: 'phone',
      mobile_number: 'phone',
      mobilenumber: 'phone',
      'mobile number': 'phone',
      'phone number': 'phone',
      phonenumber: 'phone',
      contact: 'phone',
      cell: 'phone',
      org: 'company',
      organization: 'company',
      organisation: 'company',
      'company name': 'company',
      city: 'location',
      address: 'location',
      'job title': 'title',
      designation: 'title',
      role: 'title',
      url: 'website',
      notes: 'description',
      note: 'description',
      remarks: 'description',
    };

    const headers = rawHeaders.map((h) => headerAliasMap[h] || h);
    this.importPreviewColumns = headers;

    const rows: any[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cells = this.splitCSVLine(lines[i], delimiter);
      const row: any = {};
      headers.forEach((h, idx) => {
        row[h] = (cells[idx] || '').replace(/^["']|["']$/g, '').trim();
      });

      // Validate: name and phone required
      const hasName = !!(row['name'] || row['email']);
      const hasPhone = !!row['phone'];
      row._valid = hasName && hasPhone;
      row._error = !hasName ? 'name required' : !hasPhone ? 'phone required' : '';
      rows.push(row);
    }

    this.importPreviewRows = rows;
    this.importValidRows = rows.filter((r) => r._valid).length;
    this.importInvalidRows = rows.filter((r) => !r._valid).length;
    this.importStep = 2;
    this.cdr.detectChanges();
  }

  /** Properly split a CSV/TSV line respecting quoted values */
  private splitCSVLine(line: string, delimiter: string): string[] {
    if (delimiter === '\t') return line.split('\t');
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === delimiter && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
    result.push(current);
    return result;
  }

  runBulkImport(): void {
    const validRows = this.importPreviewRows.filter((r) => r._valid);
    if (!validRows.length) return;

    this.isImporting = true;

    // Build clean lead objects (strip internal _valid/_error keys)
    const currentUser = this.authService.getCurrentUser();
    const leadsData = validRows.map((row) => {
      const lead: any = {};
      for (const key of Object.keys(row)) {
        if (!key.startsWith('_') && row[key] !== '') {
          lead[key] = row[key];
        }
      }
      // Ensure name exists (use email prefix as fallback)
      if (!lead.name && lead.email) {
        lead.name = lead.email.split('@')[0];
      }
      // Auto-assign to the importing user so they appear after refresh
      if (!lead.assigned_to_user_id && currentUser?.id) {
        lead.assigned_to_user_id = currentUser.id;
      }
      return lead;
    });

    this.leadService
      .bulkImportLeads(leadsData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          const results: any[] = res.results || [];
          this.importResultSuccess = results.filter((r) => r.status === 'success').length;
          this.importResultFailed = results.filter((r) => r.status !== 'success').length;

          // Add successfully imported leads to list
          const newLeads = results
            .filter((r) => r.status === 'success' && r.data)
            .map((r) => r.data as any);
          this.leads.unshift(...newLeads);
          this.applyFilters();

          this.isImporting = false;
          this.importStep = 3;
          this.cdr.markForCheck();
        },
        error: () => {
          this.isImporting = false;
          this.cdr.markForCheck();
        },
      });
  }

  saveLead(): void {
    if (this.leadForm.invalid) return;

    this.isSaving = true;
    const fv = this.leadForm.value;

    // Build custom_fields object from entries (skip blank keys)
    const custom_fields: Record<string, string> = {};
    for (const entry of this.customFieldEntries) {
      if (entry.key.trim()) {
        custom_fields[entry.key.trim()] = entry.value;
      }
    }

    const formData: any = {
      name: fv.name,
      email: fv.email,
      ...(fv.phone && { phone: fv.phone }),
      ...(fv.title && { title: fv.title }),
      ...(fv.company && { company: fv.company }),
      ...(fv.website && { website: fv.website }),
      ...(fv.location && { location: fv.location }),
      ...(fv.source && { source: fv.source }),
      ...(fv.stage_id && { stage_id: fv.stage_id }),
      ...(fv.project && { project: fv.project }),
      ...(fv.campaign_name && { campaign_name: fv.campaign_name }),
      ...(fv.description && { description: fv.description }),
      ...(fv.assigned_to_user_id && { assigned_to_user_id: fv.assigned_to_user_id }),
      ...(Object.keys(custom_fields).length > 0 && { custom_fields }),
    };

    if (this.editingLead) {
      this.leadService
        .updateLead(this.editingLead.id, formData)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (updated) => {
            const index = this.leads.findIndex((l) => l.id === updated.id);
            if (index >= 0) {
              this.leads[index] = updated;
            }
            this.applyFilters();
            this.closeModal();
            this.isSaving = false;
            this.cdr.markForCheck();
          },
          error: (error) => {
            this.isSaving = false;
            this.cdr.markForCheck();
          },
        });
    } else {
      this.leadService
        .createLead(formData)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (created) => {
            this.leads.unshift(created);
            this.applyFilters();
            this.closeModal();
            this.isSaving = false;
            this.cdr.markForCheck();
          },
          error: (error) => {
            this.isSaving = false;
            this.cdr.markForCheck();
          },
        });
    }
  }

  confirmDeleteLead(): void {
    this.showDeleteConfirm = true;
    this.cdr.detectChanges();
  }

  cancelDelete(): void {
    this.showDeleteConfirm = false;
    this.cdr.detectChanges();
  }

  deleteLead(): void {
    if (!this.selectedLead) return;

    this.leadService
      .deleteLead(this.selectedLead.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.leads = this.leads.filter((l) => l.id !== this.selectedLead?.id);
          this.applyFilters();
          this.closeSidePanel();
          this.showDeleteConfirm = false;
          this.cdr.markForCheck();
        },
        error: (error) => {},
      });
  }

  updateLead(): void {
    if (this.selectedLead) {
      this.leadService
        .updateLead(this.selectedLead.id, { stage_id: this.selectedLead.stage_id })
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          error: (error) => {},
        });
    }
  }

  getStageLabel(stageId: string): string {
    return this.stages.find((s) => s.id === stageId)?.name || '';
  }

  getStageColor(stageId: string): string {
    // Generate color based on stage index
    const colors = ['#0284c7', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
    const index = this.stages.findIndex((s) => s.id === stageId);
    return index >= 0 ? colors[index % colors.length] : '#0284c7';
  }

  getCurrentStage(): Stage | null {
    if (!this.selectedLead?.stage_id) return null;
    return this.stages.find((s) => s.id === this.selectedLead?.stage_id) || null;
  }

  isStageUnlinked(): boolean {
    if (!this.selectedLead?.stage_id) return false;
    return !this.stages.some((s) => s.id === this.selectedLead?.stage_id);
  }

  assignToFirstStage(): void {
    if (!this.selectedLead || this.stages.length === 0) return;
    const firstStage = this.stages[0];
    this.changeStage(firstStage.id);
  }

  submitForm(leadId: string, formId: string): void {
    // Collect form values
    const values: { [key: string]: string } = {};
    for (const key in this.formValues) {
      if (key.startsWith(formId + '_')) {
        const fieldId = key.replace(formId + '_', '');
        values[fieldId] = this.formValues[key];
      }
    }

    // Call the API to submit the form
    this.formService
      .submitForm(formId, leadId, values)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          // Mark form as submitted (keeps values visible and read-only)
          this.submittedForms.add(formId);
          this.cdr.markForCheck();
          // Show a success message (can integrate with a toast notification service)
          alert('Form submitted successfully!');
        },
        error: (error) => {
          alert('Error submitting form. Please try again.');
        },
      });
  }

  onFileSelected(event: any, formId: string): void {
    const files: FileList = event.target.files;
    if (!files || files.length === 0) return;

    // Store files for the form (in a real app, you'd upload them)
    const fileArray = Array.from(files).map((file: any) => ({
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified,
    }));

    // Initialize form attachments if not exists
    if (!this.formAttachments) {
      this.formAttachments = {};
    }
    if (!this.formAttachments[formId]) {
      this.formAttachments[formId] = [];
    }

    this.formAttachments[formId].push(...fileArray);
    this.cdr.markForCheck();
  }

  // New action button methods
  changeStage(stageId: string): void {
    if (!this.selectedLead) return;

    // Find the target stage
    const targetStage = this.stages.find((s) => s.id === stageId);
    if (!targetStage) return;

    // Check if stage has multiple team members assigned
    const memberCount = targetStage.responsible_user_ids?.length || 0;

    if (memberCount <= 1) {
      // Single member or no specific members assigned - move directly
      this.proceedWithStageChange(stageId);
    } else {
      // Multiple members - show dialog for selection
      this.showTeamMemberSelectionDialog(stageId, targetStage);
    }
  }

  updateCallStatus(status: string): void {
    if (!this.selectedLead || this.selectedLead.call_status === status) return;

    const updatedLead = { ...this.selectedLead, call_status: status };

    this.leadService.updateLead(updatedLead.id, updatedLead).subscribe({
      next: () => {
        // Reload the lead from backend to get fresh data
        this.leadService.getLead(updatedLead.id).subscribe({
          next: (freshLead: Lead) => {
            this.selectedLead = freshLead;
            const idx = this.leads.findIndex((l) => l.id === freshLead.id);
            if (idx >= 0) {
              this.leads[idx] = freshLead;
            }
            this.cdr.markForCheck();
          },
        });

        // Log activity
        const statusLabel = this.getCallStatusLabel(status);
        try {
          this.activityService
            .logActivity(
              updatedLead.company_id || 'unknown',
              this.authService.getCurrentUser()?.id || 'system',
              'call_status_changed',
              'lead',
              updatedLead.id,
              `Call status updated to: ${statusLabel}`,
              { call_status: status },
            )
            .subscribe({
              error: (err) => console.error('Failed to log call status activity:', err),
            });
        } catch (err) {
          console.error('Error logging call status:', err);
        }
      },
      error: (err) => {
        console.error('Failed to update call status:', err);
      },
    });
  }

  private getCallStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      picked: 'Picked',
      not_picked: 'Not Picked',
      busy: 'Busy/Callback',
      switched_off: 'Switched Off',
      invalid: 'Invalid',
    };
    return labels[status] || status;
  }

  isImportantCallStatus(status: string | undefined): boolean {
    return status === 'switched_off' || status === 'invalid';
  }

  showTeamMemberSelectionDialog(stageId: string, stage: Stage): void {
    // Load team members for this stage
    if (!stage.responsible_team_id) {
      // No team assigned, proceed directly
      this.proceedWithStageChange(stageId);
      return;
    }

    // Set pending transition
    this.pendingStageTransition = { stageId, stage };
    this.stageTeamMembers = [];
    this.selectedTeamMembers.clear();

    // Load team members from the stage's assigned users
    if (stage.responsible_user_ids && stage.responsible_user_ids.length > 0) {
      // Map user IDs to user objects
      this.stageTeamMembers = stage.responsible_user_ids
        .map((userId) => this.users.find((u) => u.id === userId))
        .filter((u) => u != null);

      // Show dialog and trigger change detection immediately
      this.showTeamSelectionDialog = true;
      // Force immediate detection for modal and team members list
      this.cdr.detectChanges();
    } else {
      // No specific users assigned, proceed directly
      this.proceedWithStageChange(stageId);
    }
  }

  proceedWithStageChange(stageId: string): void {
    if (!this.selectedLead) return;

    // Build update payload
    const updateData: any = { stage_id: stageId };

    // If team members were selected, add them to the lead and auto-add as stakeholders
    if (this.selectedTeamMembers.size > 0) {
      updateData.assigned_team_members = Array.from(this.selectedTeamMembers);
    }

    this.leadService
      .updateLead(this.selectedLead.id, updateData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updated) => {
          const index = this.leads.findIndex((l) => l.id === updated.id);
          if (index >= 0) {
            this.leads[index] = updated;
          }
          if (this.selectedLead) {
            this.selectedLead = updated;
          }
          this.closeTeamSelectionDialog();
          this.cdr.markForCheck();
        },
        error: (error) => {
          alert('Failed to change stage');
        },
      });
  }

  toggleTeamMemberSelection(userId: string): void {
    if (this.selectedTeamMembers.has(userId)) {
      this.selectedTeamMembers.delete(userId);
    } else {
      this.selectedTeamMembers.add(userId);
    }
    this.cdr.markForCheck();
  }

  selectAllTeamMembers(): void {
    this.stageTeamMembers.forEach((member) => {
      if (member && member.id) {
        this.selectedTeamMembers.add(member.id);
      }
    });
    this.cdr.markForCheck();
  }

  clearTeamMemberSelection(): void {
    this.selectedTeamMembers.clear();
    this.cdr.markForCheck();
  }

  closeTeamSelectionDialog(): void {
    this.showTeamSelectionDialog = false;
    this.pendingStageTransition = null;
    this.stageTeamMembers = [];
    this.selectedTeamMembers.clear();
    this.cdr.markForCheck();
  }

  confirmTeamMemberSelection(): void {
    if (this.selectedTeamMembers.size === 0) {
      alert('Please select at least one team member');
      return;
    }
    if (this.pendingStageTransition) {
      this.proceedWithStageChange(this.pendingStageTransition.stageId);
    }
  }

  callLead(): void {
    if (!this.selectedLead?.phone) {
      alert('No phone number available');
      return;
    }

    // Show dialog to log call
    const notes = prompt('Add notes about the call (optional):');
    if (notes !== null) {
      // User didn't cancel
      this.logCall(notes);
      // Optionally open phone dialer after logging
      const phoneNumber = this.selectedLead.phone;
      setTimeout(() => {
        window.location.href = `tel:${phoneNumber}`;
      }, 500);
    }
  }

  private logCall(notes: string = ''): void {
    if (!this.selectedLead) return;

    // Create activity entry
    const activity = {
      id: 'call_' + Date.now(),
      type: 'call',
      message: notes || 'Phone call',
      created_at: new Date().toISOString(),
      user_name: 'You',
    };

    this.allActivities.unshift(activity);

    // Log to backend
    try {
      this.activityService
        .logActivity(
          this.selectedLead.company_id || 'unknown',
          this.authService.getCurrentUser()?.id || 'system',
          'call_logged',
          'lead',
          this.selectedLead.id,
          notes || 'Phone call logged',
          { notes: notes },
        )
        .subscribe({
          error: (err) => console.error('Failed to log call activity:', err),
        });
    } catch (err) {
      console.error('Error logging call:', err);
    }

    this.cdr.markForCheck();
  }

  whatsappLead(): void {
    if (!this.selectedLead?.phone) {
      alert('No phone number available');
      return;
    }

    const message = encodeURIComponent(`Hi ${this.selectedLead.name}`);
    this.logWhatsApp(message);
    window.open(`https://wa.me/${this.selectedLead.phone}?text=${message}`, '_blank');
  }

  private logWhatsApp(message: string = ''): void {
    if (!this.selectedLead) return;

    // Create activity entry
    const activity = {
      id: 'whatsapp_' + Date.now(),
      type: 'whatsapp',
      message: message ? `WhatsApp: ${message}` : 'WhatsApp message sent',
      created_at: new Date().toISOString(),
      user_name: 'You',
    };

    this.allActivities.unshift(activity);

    // Log to backend
    try {
      this.activityService
        .logActivity(
          this.selectedLead.company_id || 'unknown',
          this.authService.getCurrentUser()?.id || 'system',
          'whatsapp_sent',
          'lead',
          this.selectedLead.id,
          `WhatsApp message sent: ${message || 'Hi ' + this.selectedLead.name}`,
          { message: message },
        )
        .subscribe({
          error: (err) => console.error('Failed to log WhatsApp activity:', err),
        });
    } catch (err) {
      console.error('Error logging WhatsApp:', err);
    }

    this.cdr.markForCheck();
  }

  addNote(): void {
    if (!this.selectedLead) return;

    const note = prompt('Add a note:');
    if (note) {
      // Future: Save note to backend

      alert('Note added! (Feature coming soon)');
    }
  }

  loadUsers(): void {
    this.userService
      .getUsers()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (users) => {
          this.users = users;
          this.cdr.markForCheck();
        },
        error: (error) => {},
      });
  }

  getFilteredUsers(): any[] {
    // If user is a team lead, return only their team members (+ themselves) for assignee dropdowns
    if (this.userIsTeamLead && this.teamMemberUserIds.size > 0) {
      return this.users.filter((u) => this.teamMemberUserIds.has(u.id));
    }
    // For admins and regular users, return all users
    return this.users;
  }

  loadFollowupsForLead(leadId: string): void {
    // With the new API, the next followup comes from the lead object itself
    // But we can also try the dedicated endpoint for backward compatibility
    this.followupService
      .getFollowupsByLead(leadId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (followups: any) => {
          // Convert to array with single item for backward compatibility with template
          this.selectedLeadFollowups = followups && followups.length > 0 ? [followups[0]] : [];
          this.scheduleFollowupNotifications(this.selectedLeadFollowups, this.selectedLead?.name);
          this.cdr.markForCheck();
        },
        error: () => {
          // Also try to get nextFollowup from the lead object if available
          if (this.selectedLead?.next_followup) {
            this.selectedLeadFollowups = [this.selectedLead.next_followup];
          } else {
            this.selectedLeadFollowups = [];
          }
          this.cdr.markForCheck();
        },
      });
  }

  loadFormSubmissionHistory(leadId: string): void {
    this.formService
      .getLeadFormHistory(leadId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (submissions: any) => {
          // Clear previous submissions
          this.submittedForms.clear();
          this.formValues = {};
          this.stageAccordionOpen.clear();

          // Mark forms as submitted and populate their values from backend
          (submissions || []).forEach((submission: any) => {
            if (submission.form_id) {
              this.submittedForms.add(submission.form_id);
              // Populate form values from submission data
              if (submission.data && typeof submission.data === 'object') {
                Object.keys(submission.data).forEach((fieldId: string) => {
                  const key = submission.form_id + '_' + fieldId;
                  this.formValues[key] = submission.data[fieldId];
                });
              }
            }
          });
          this.cdr.markForCheck();
        },
        error: () => {
          // If history fails to load, just clear submitted forms
          this.submittedForms.clear();
          this.stageAccordionOpen.clear();
          this.cdr.markForCheck();
        },
      });
  }

  /**
   * Safely get status as string (handles case where status might be an object)
   */
  getFollowupStatus(followup: any): string {
    if (!followup) return '';
    if (typeof followup.status === 'string') {
      return followup.status;
    }
    if (followup.status && typeof followup.status === 'object' && followup.status.value) {
      return followup.status.value;
    }
    return String(followup.status || 'pending');
  }

  deleteFollowup(followupId: string): void {
    if (!confirm('Delete this followup?')) return;

    // Optimistic update: remove dates for this followup from the map immediately
    if (this.selectedLead) {
      const leadId = this.selectedLead.id;
      const existing = this.followupDatesMap.get(leadId) || [];
      // Find the scheduled_for of the followup being deleted
      const deletedFollowup = this.selectedLeadFollowups.find((f: any) => f.id === followupId);
      if (deletedFollowup) {
        const deletedDateStr = (deletedFollowup.scheduled_for as string).replace(' ', 'T');
        const deletedTime = new Date(deletedDateStr).getTime();
        const updated = existing.filter((d) => d.getTime() !== deletedTime);
        if (updated.length === 0) {
          this.followupDatesMap.delete(leadId);
        } else {
          this.followupDatesMap.set(leadId, updated);
        }
        this.applyFilters();
      }
    }

    this.followupService
      .deleteFollowup(followupId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          // Clear the followup from the selected lead immediately
          if (this.selectedLead) {
            this.selectedLead.next_followup = undefined;
            this.selectedLeadFollowups = [];

            // Reload followups for the selected lead
            this.loadFollowupsForLead(this.selectedLead.id);
          }

          // Full resync from backend to ensure map is accurate
          this.loadAllFollowups();
          this.cdr.markForCheck();
        },
        error: () => {
          alert('Failed to delete followup');
          // Roll back optimistic update by resyncing from backend
          this.loadAllFollowups();
        },
      });
  }

  assignLeadToUser(): void {
    if (!this.selectedLead) return;

    this.leadService
      .assignLead(this.selectedLead.id, this.selectedAssignedUserId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updatedLead) => {
          this.selectedLead = updatedLead;
          // Update the lead in the list
          const index = this.leads.findIndex((l) => l.id === updatedLead.id);
          if (index !== -1) {
            this.leads[index] = updatedLead;
            this.applyFilters();
          }
          this.cdr.markForCheck();
        },
        error: (error) => {
          alert('Failed to assign lead');
        },
      });
  }

  // Followup Methods
  openSetFollowupModal(): void {
    if (!this.selectedLead) return;
    this.followupForm.reset({
      type: 'call',
      dateOption: 'tomorrow',
      customDate: '',
      time: '10:00',
    });
    this.showSetFollowupModal = true;
    this.cdr.detectChanges();
  }

  quickCall(lead: any, event: Event): void {
    event.stopPropagation();
    if (!lead.phone) {
      alert('No phone number available');
      return;
    }
    window.location.href = `tel:${lead.phone}`;
    // Log call activity
    try {
      this.activityService
        .logActivity(
          lead.company_id || 'unknown',
          this.authService.getCurrentUser()?.id || 'system',
          'call_logged',
          'lead',
          lead.id,
          'Phone call',
          {},
        )
        .subscribe();
    } catch {}
  }

  quickWhatsApp(lead: any, event: Event): void {
    event.stopPropagation();
    if (!lead.phone) {
      alert('No phone number available');
      return;
    }
    const message = encodeURIComponent(`Hi ${lead.name}`);
    window.open(`https://wa.me/${lead.phone}?text=${message}`, '_blank');
    try {
      this.activityService
        .logActivity(
          lead.company_id || 'unknown',
          this.authService.getCurrentUser()?.id || 'system',
          'whatsapp_sent',
          'lead',
          lead.id,
          `WhatsApp: Hi ${lead.name}`,
          {},
        )
        .subscribe();
    } catch {}
  }

  quickFollowup(lead: any, event: Event): void {
    event.stopPropagation();
    // Select the lead silently then open the followup modal
    this.selectedLead = lead;
    this.followupForm.reset({
      type: 'call',
      dateOption: 'tomorrow',
      customDate: '',
      time: '10:00',
    });
    this.showSetFollowupModal = true;
    this.cdr.detectChanges();
  }

  closeSetFollowupModal(): void {
    this.showSetFollowupModal = false;
    this.cdr.detectChanges();
  }

  /** Request notification permission and register the followup service worker */
  requestNotificationPermission(): void {
    if (!('Notification' in window)) {
      this.registerFollowupSW();
      return;
    }
    if (Notification.permission === 'granted') {
      this.registerFollowupSW();
    } else if (Notification.permission === 'default') {
      Notification.requestPermission().then(() => this.registerFollowupSW());
    } else {
      this.registerFollowupSW(); // denied — SW still registered for SW-postMessage path
    }
  }

  private getPushApiBase(): string {
    // Use relative path - Angular dev server proxy will forward to backend
    return '/api/push';
  }

  private registerFollowupSW(): void {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker
      .register('/followup-sw.js')
      .then((reg) => {
        this.swReg = reg;
        // Listen for PLAY_SOUND messages from the SW (for audio beep when tab is visible)
        navigator.serviceWorker.addEventListener('message', (evt) => {
          if (evt.data?.type === 'PLAY_SOUND') this.playFollowupAlert();
        });
        // Also keep BroadcastChannel as fallback
        if (!this.swBroadcast) {
          try {
            this.swBroadcast = new BroadcastChannel('followup-alerts');
            this.swBroadcast.onmessage = (evt) => {
              if (evt.data?.type === 'PLAY_SOUND') this.playFollowupAlert();
            };
          } catch (_) {}
        }
        // Subscribe to Web Push for true native Android notifications
        this.subscribeToWebPush(reg);
      })
      .catch((err) => console.warn('[FollowupSW] registration failed', err));
  }

  private urlBase64ToUint8Array(base64String: string): ArrayBuffer {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = atob(base64);
    const arr = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; i++) arr[i] = rawData.charCodeAt(i);
    return arr.buffer as ArrayBuffer;
  }

  private subscribeToWebPush(reg: ServiceWorkerRegistration): void {
    if (!('PushManager' in window) || Notification.permission !== 'granted') return;
    const apiBase = this.getPushApiBase();

    fetch(`${apiBase}/vapid-public-key`)
      .then((r) => r.json())
      .then(({ publicKey }) => {
        return reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: this.urlBase64ToUint8Array(publicKey),
        });
      })
      .then((subscription) => {
        const currentUser = this.authService.getCurrentUser();
        const userId = currentUser?.user_id || currentUser?.id || 'unknown';
        return fetch(`${apiBase}/subscribe`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: userId, subscription: subscription.toJSON() }),
        });
      })
      .catch((err) => console.warn('[PushSubscribe]', err));
  }

  /**
   * Schedule browser notifications for a list of followups.
   * Delegates to the Service Worker (works in background);
   * keeps a main-thread timer only for the audio beep when the tab is visible.
   */
  scheduleFollowupNotifications(followups: any[], leadName?: string): void {
    if (!followups?.length) return;
    const now = Date.now();

    followups.forEach((f) => {
      if (!f?.id || !f?.scheduled_for) return;

      // Skip already-completed/cancelled
      const statusVal: string = (f.status as any)?._value_ ?? f.status ?? '';
      if (statusVal && statusVal !== 'pending') return;

      const dateStr = (f.scheduled_for as string).replace(' ', 'T');
      const due = new Date(dateStr);
      if (isNaN(due.getTime())) return;

      const delay = due.getTime() - now;
      if (delay <= 0) return;

      const type: string = f.title || f.followup_type || 'Followup';
      const title = `⏰ Followup Reminder`;
      const body = leadName ? `${type} with ${leadName} is due now` : `${type} followup is due now`;

      // -- Backend Web Push (native Android bar, works even when Chrome is minimised) --
      const currentUser = this.authService.getCurrentUser();
      const userId = currentUser?.user_id || currentUser?.id;
      if (userId) {
        fetch(`${this.getPushApiBase()}/schedule`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: userId,
            followup_id: f.id,
            title: title,
            body: body,
            scheduled_for: due.toISOString(),
          }),
        }).catch(() => {
          /* ignore if backend unreachable */
        });
      }

      // -- Service Worker path (background-safe via SW setTimeout) --
      if (this.swReg?.active) {
        this.swReg.active.postMessage({
          type: 'SCHEDULE_FOLLOWUP',
          id: f.id,
          title,
          body,
          scheduledFor: due.toISOString(),
        });
      }

      // -- Main-thread path: play sound + show notification when tab is open --
      if (this.notificationTimers.has(f.id)) {
        clearTimeout(this.notificationTimers.get(f.id)!);
      }
      const timer = setTimeout(() => {
        // Always fire: SW handles background, this covers foreground & SW-miss cases
        this.fireFollowupNotification(f, leadName);
        this.notificationTimers.delete(f.id);
      }, delay);
      this.notificationTimers.set(f.id, timer);
    });
  }

  /** Play a short alert beep using Web Audio API */
  private playFollowupAlert(): void {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const playTone = (freq: number, start: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.5, ctx.currentTime + start);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration);
        osc.start(ctx.currentTime + start);
        osc.stop(ctx.currentTime + start + duration);
      };
      playTone(880, 0, 0.18);
      playTone(1100, 0.2, 0.18);
      playTone(880, 0.4, 0.25);
    } catch (_) {
      // Audio not available — silently ignore
    }
  }

  /** Fire browser notification + sound for a due followup */
  private fireFollowupNotification(followup: any, leadName?: string): void {
    this.playFollowupAlert();

    if (!('Notification' in window) || Notification.permission !== 'granted') return;

    const type: string = followup.title || followup.followup_type || 'Followup';
    const title = `⏰ Followup Reminder`;
    const body = leadName ? `${type} with ${leadName} is due now` : `${type} followup is due now`;

    try {
      const n = new Notification(title, {
        body,
        icon: '/favicon.ico',
        tag: `followup-${followup.id}`,
        requireInteraction: true,
        silent: true,
      });
      n.onclick = () => {
        window.focus();
        n.close();
      };
    } catch (_) {
      // Notification API not supported
    }
  }

  setFollowupDate(option: string): void {
    this.followupForm.get('dateOption')?.setValue(option);
    if (option !== 'custom') {
      this.followupForm.get('customDate')?.reset();
    }
  }

  getFollowupIcon(type: string): string {
    const icons: { [key: string]: string } = {
      call: 'call',
      meeting: 'meeting_room',
      email: 'mail',
      demo: 'play_circle',
    };
    return icons[type] || 'schedule';
  }

  saveFollowup(): void {
    if (!this.selectedLead || !this.followupForm.valid) return;

    const formValue = this.followupForm.value;
    let scheduledDate = new Date();

    // Calculate date based on selection
    switch (formValue.dateOption) {
      case 'tomorrow':
        scheduledDate.setDate(scheduledDate.getDate() + 1);
        break;
      case 'in3days':
        scheduledDate.setDate(scheduledDate.getDate() + 3);
        break;
      case 'nextweek':
        scheduledDate.setDate(scheduledDate.getDate() + 7);
        break;
      case 'custom':
        if (formValue.customDate) {
          scheduledDate = new Date(formValue.customDate);
        }
        break;
    }

    // Set time
    const timeParts = formValue.time.split(':');
    scheduledDate.setHours(parseInt(timeParts[0]), parseInt(timeParts[1]), 0);

    // Get current user ID
    const currentUser = this.authService.getCurrentUser();
    const userId = currentUser?.user_id || currentUser?.id || '';

    // Create followup
    const followupData = {
      lead_id: this.selectedLead.id,
      assigned_to_user_id: userId,
      followup_type: formValue.type,
      title: formValue.type.charAt(0).toUpperCase() + formValue.type.slice(1),
      scheduled_for: scheduledDate.toISOString(),
    };

    console.log('Scheduling followup:', followupData);

    this.followupService
      .scheduleFollowup(followupData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (followup) => {
          console.log('Followup scheduled successfully:', followup);

          // Update the selected lead with the new next_followup
          if (this.selectedLead) {
            this.selectedLead.next_followup = followup;
            this.selectedLeadFollowups = [followup];
          }

          // Schedule browser notification for the new followup
          this.scheduleFollowupNotifications([followup], this.selectedLead?.name);

          // Reload followups for this lead
          this.loadFollowupsForLead(this.selectedLead!.id);

          // Refresh filter map so new followup is immediately filterable
          this.loadAllFollowups();

          this.closeSetFollowupModal();
          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error('Failed to schedule followup:', error);
          const errorMsg = error?.error?.detail || error?.message || 'Failed to schedule followup';
          alert(errorMsg);
        },
      });
  }

  /**
   * Check if a stage should be visible based on role-based access control
   */
  isStageVisibleByRole(stage: Stage, stakeholder: Stakeholder | undefined): boolean {
    if (!stakeholder) {
      return true; // If no stakeholder, show all
    }
    return this.visibilityService.canViewStage(stakeholder, stage);
  }

  /**
   * Get stages visible to a specific stakeholder
   */
  getVisibleStagesToStakeholder(stages: Stage[], stakeholder: Stakeholder | undefined): Stage[] {
    if (!stakeholder) {
      return stages; // If no stakeholder, show all
    }
    return this.visibilityService.getVisibleStages(stakeholder, stages);
  }

  /**
   * Get visibility help text for a role
   */
  getVisibilityHelpText(role: string): string {
    return this.visibilityService.getVisibilityMessage(role, '');
  }

  /**
   * Get all visibility rules for display
   */
  getVisibilityRules() {
    return this.visibilityService.getVisibilityRules();
  }

  /**
   * Load notes for the selected lead
   */
  loadNotesForLead(leadId: string): void {
    // Notes are loaded from backend activities
    this.leadNotes = [];
    this.cdr.markForCheck();
  }

  /**
   * Load communication history for the selected lead
   */
  loadCommunicationLog(leadId: string): void {
    // Communication log is loaded from backend activities
    this.communicationLog = [];
    this.cdr.markForCheck();
  }

  /**
   * Toggle the add note form
   */
  toggleAddNote(): void {
    this.showAddNoteForm = !this.showAddNoteForm;
    if (!this.showAddNoteForm) {
      this.newNote = '';
    }
    this.cdr.markForCheck();
  }

  /**
   * Save a new note for the lead
   */
  saveNote(): void {
    if (!this.selectedLead || !this.newNote.trim()) return;

    // Create note locally first for immediate UI feedback
    const note = {
      id: 'note_' + Date.now(),
      lead_id: this.selectedLead.id,
      content: this.newNote,
      author_name: 'You',
      created_at: new Date().toISOString(),
    };

    this.leadNotes.unshift(note);
    const noteContent = this.newNote;
    this.newNote = '';
    this.showAddNoteForm = false;
    this.cdr.markForCheck();

    // Try to save to backend (optional - if backend endpoint exists)
    // For now just logging locally, but this can be enhanced later
    // to sync with backend
  }

  /**
   * Delete a note
   */
  deleteNote(noteId: string): void {
    this.leadNotes = this.leadNotes.filter((n) => n.id !== noteId);
    this.cdr.markForCheck();
  }

  /**
   * Get icon for communication type
   */
  getCommIcon(type: string): string {
    const icons: { [key: string]: string } = {
      call: 'phone',
      email: 'mail',
      sms: 'sms',
      message: 'chat',
      note: 'note',
    };
    return icons[type] || 'info';
  }

  /**
   * Get activity icon based on type
   */
  getActivityIcon(type: string): string {
    const icons: { [key: string]: string } = {
      call: 'phone',
      email: 'mail',
      whatsapp: 'forum',
      sms: 'sms',
      note: 'note_add',
      followup: 'schedule',
      created: 'add_circle',
      updated: 'edit',
      assigned: 'person_add',
      reassigned: 'person_add',
      stage_changed: 'trending_up',
      status_changed: 'info',
      form_submitted: 'done_all',
      call_logged: 'phone',
      whatsapp_sent: 'forum',
      note_added: 'note_add',
      followup_scheduled: 'schedule',
      followup_completed: 'check_circle',
    };
    return icons[type] || 'info';
  }

  /**
   * Get activity label based on type
   */
  getActivityLabel(type: string): string {
    const labels: { [key: string]: string } = {
      call: 'Phone Call',
      email: 'Email Sent',
      whatsapp: 'WhatsApp Message',
      sms: 'SMS Sent',
      note: 'Note Created',
      followup: 'Followup Scheduled',
      created: 'Lead Created',
      updated: 'Lead Updated',
      assigned: 'Lead Assigned',
      stage_changed: 'Stage Changed',
      status_changed: 'Status Changed',
      form_submitted: 'Form Submitted',
    };

    // If exact match found, return it
    if (labels[type]) {
      return labels[type];
    }

    // Smart label generation for unmapped types
    // Convert snake_case or camelCase to Title Case
    const smartLabel = type
      .replace(/_/g, ' ') // Replace underscores with spaces
      .replace(/([a-z])([A-Z])/g, '$1 $2') // Add space before capitals
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');

    return smartLabel || 'Activity';
  }

  /**
   * Filter activities based on selected type
   */
  filterActivities(type: string): void {
    this.selectedActivityFilter = type;
  }

  /**
   * Get filtered activities based on selected filter
   */
  getFilteredActivities(): any[] {
    if (this.selectedActivityFilter === 'all' || !this.selectedActivityFilter) {
      return this.allActivities.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
    }
    return this.allActivities
      .filter((activity) => activity.type === this.selectedActivityFilter)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  /**
   * Build activities timeline combining all sources
   */
  buildActivitiesTimeline(leadId: string): void {
    this.allActivities = [];

    // Load activities from backend
    this.activityService
      .getLeadActivities(leadId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (activities: any) => {
          if (activities && Array.isArray(activities)) {
            // Map backend activities to frontend format
            this.allActivities = activities.map((activity: any) => ({
              id: activity.id,
              type: this.mapActivityType(activity.activity_type),
              message: activity.description || `${activity.activity_type} event`,
              created_at: activity.created_at,
              user_name: this.resolveUserName(activity.user_id || activity.created_by),
            }));
          }

          // Add notes as activities
          if (this.leadNotes && this.leadNotes.length > 0) {
            this.leadNotes.forEach((note) => {
              this.allActivities.push({
                id: note.id,
                type: 'note',
                message: note.content,
                created_at: note.created_at,
                user_name: note.author_name || 'Unknown',
              });
            });
          }

          // Add communication log activities
          if (this.communicationLog && this.communicationLog.length > 0) {
            this.allActivities.push(...this.communicationLog);
          }

          // Add followups as activities
          if (this.selectedLeadFollowups && this.selectedLeadFollowups.length > 0) {
            const followup = this.selectedLeadFollowups[0];
            this.allActivities.push({
              id: followup.id,
              type: 'followup',
              message: followup.title || 'Followup scheduled',
              created_at:
                followup.follow_up_date || followup.scheduled_for || new Date().toISOString(),
              user_name: followup.created_by || 'Unknown',
            });
          }

          // Sort by date (newest first)
          this.allActivities.sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
          );

          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error('Error loading activities:', error);
          // Fallback to notes and communication log if backend fails
          this.allActivities = [];

          if (this.leadNotes && this.leadNotes.length > 0) {
            this.leadNotes.forEach((note) => {
              this.allActivities.push({
                id: note.id,
                type: 'note',
                message: note.content,
                created_at: note.created_at,
                user_name: note.author_name || 'Unknown',
              });
            });
          }

          if (this.communicationLog && this.communicationLog.length > 0) {
            this.allActivities.push(...this.communicationLog);
          }

          if (this.selectedLeadFollowups && this.selectedLeadFollowups.length > 0) {
            const followup = this.selectedLeadFollowups[0];
            this.allActivities.push({
              id: followup.id,
              type: 'followup',
              message: followup.title || 'Followup scheduled',
              created_at:
                followup.follow_up_date || followup.scheduled_for || new Date().toISOString(),
              user_name: followup.created_by || 'Unknown',
            });
          }

          this.allActivities.sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
          );

          this.cdr.markForCheck();
        },
      });
  }

  /**
   * Map backend activity type to frontend type
   */
  private mapActivityType(backendType: string): string {
    const typeMap: { [key: string]: string } = {
      lead_created: 'created',
      lead_assigned: 'assigned',
      lead_reassigned: 'reassigned',
      lead_stage_changed: 'stage_changed',
      lead_status_changed: 'status_changed',
      call_logged: 'call',
      email_sent: 'email',
      whatsapp_sent: 'whatsapp',
      note_added: 'note',
      followup_scheduled: 'followup',
      followup_completed: 'followup_completed',
      form_submitted: 'form_submitted',
      stage_changed: 'stage_changed',
    };

    // Return mapped type if found
    if (typeMap[backendType]) {
      return typeMap[backendType];
    }

    // If no mapping found, convert from snake_case to simple form
    // e.g., 'lead_assigned' -> 'assigned'
    if (backendType.startsWith('lead_')) {
      return backendType.replace('lead_', '');
    }

    return backendType;
  }

  private resolveUserName(userId: string | undefined): string {
    if (!userId || userId === 'system') {
      return 'System';
    }
    const user = this.users.find((u) => u.id === userId);
    return user
      ? user.name || `${user.first_name || ''} ${user.last_name || ''}`.trim()
      : 'Unknown';
  }

  setActivityPreset(preset: string): void {
    this.filterActivityPreset = preset;
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const todayStr = `${year}-${month}-${day}`;

    switch (preset) {
      case 'today':
        this.filterActivityFrom = todayStr;
        this.filterActivityTo = todayStr;
        break;
      case 'yesterday':
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const yd = String(yesterday.getDate()).padStart(2, '0');
        const ym = String(yesterday.getMonth() + 1).padStart(2, '0');
        const yy = yesterday.getFullYear();
        this.filterActivityFrom = `${yy}-${ym}-${yd}`;
        this.filterActivityTo = `${yy}-${ym}-${yd}`;
        break;
      case 'this_week':
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        const sdow = String(startOfWeek.getDate()).padStart(2, '0');
        const smow = String(startOfWeek.getMonth() + 1).padStart(2, '0');
        const syow = startOfWeek.getFullYear();
        this.filterActivityFrom = `${syow}-${smow}-${sdow}`;
        this.filterActivityTo = todayStr;
        break;
      case 'this_month':
        this.filterActivityFrom = `${year}-${month}-01`;
        this.filterActivityTo = todayStr;
        break;
    }
    this.applyFilters();
  }
}
