import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../services/user.service';
import { ActivityService } from '../../services/activity.service';
import { TenantService } from '../../services/tenant.service';
import { DatePipe } from '@angular/common';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet" />
    <div class="analytics-page">
      <!-- Activity Report Section -->
      <div class="arp-container">
        <div class="arp-header">
          <div class="arp-title-row">
            <span class="material-icons arp-icon">bar_chart</span>
            <h2 class="arp-title">Activity Report</h2>
          </div>

          <!-- Controls: date preset + assignee -->
          <div class="arp-controls">
            <div class="arp-date-presets">
              <button
                class="arp-preset"
                [class.active]="arDatePreset === 'today'"
                (click)="setArPreset('today')"
              >
                Today
              </button>
              <button
                class="arp-preset"
                [class.active]="arDatePreset === 'yesterday'"
                (click)="setArPreset('yesterday')"
              >
                Yesterday
              </button>
              <button
                class="arp-preset"
                [class.active]="arDatePreset === 'this_week'"
                (click)="setArPreset('this_week')"
              >
                This Week
              </button>
              <button
                class="arp-preset"
                [class.active]="arDatePreset === 'this_month'"
                (click)="setArPreset('this_month')"
              >
                This Month
              </button>
              <button
                class="arp-preset"
                [class.active]="arDatePreset === 'custom'"
                (click)="setArPreset('custom')"
              >
                Custom
              </button>
            </div>

            <ng-container *ngIf="arDatePreset === 'custom'">
              <input
                type="date"
                [(ngModel)]="arDateFrom"
                (ngModelChange)="loadActivityReport()"
                class="arp-date-input"
              />
              <span class="arp-sep">→</span>
              <input
                type="date"
                [(ngModel)]="arDateTo"
                (ngModelChange)="loadActivityReport()"
                class="arp-date-input"
              />
            </ng-container>

            <select
              [(ngModel)]="arUserId"
              (ngModelChange)="loadActivityReport()"
              class="arp-user-select"
            >
              <option value="">All Team Members</option>
              <option *ngFor="let u of users" [value]="u.id">
                {{ u.name || (u.first_name || '') + ' ' + (u.last_name || '') }}
              </option>
            </select>

            <button
              class="arp-refresh-btn"
              (click)="loadActivityReport()"
              title="Refresh"
              [class.spinning]="arLoading"
            >
              <span class="material-icons">refresh</span>
            </button>
          </div>

          <div class="arp-range-label" *ngIf="arReport">
            {{ arReport.date_from | date: 'MMM d' }} – {{ arReport.date_to | date: 'MMM d, y' }}
            <span class="arp-total-badge">{{ arReport.total }} activities</span>
          </div>
        </div>

        <!-- Loading -->
        <div class="arp-loading" *ngIf="arLoading">
          <span class="material-icons arp-spinner">hourglass_empty</span>
          Loading report…
        </div>

        <!-- Error -->
        <div class="arp-error" *ngIf="!arLoading && arError">
          <span class="material-icons">error_outline</span> {{ arError }}
        </div>

        <!-- Content -->
        <div class="arp-body" *ngIf="!arLoading && arReport">
          <!-- ── Stat Cards ── -->
          <div class="arp-stat-cards">
            <div class="arp-stat-card">
              <span class="arp-stat-icon" style="background:#dbeafe;color:#1d4ed8">
                <span class="material-icons">bolt</span>
              </span>
              <div class="arp-stat-info">
                <span class="arp-stat-value">{{ arReport.total }}</span>
                <span class="arp-stat-label">Total</span>
              </div>
            </div>
            <div class="arp-stat-card">
              <span class="arp-stat-icon" style="background:#dcfce7;color:#15803d">
                <span class="material-icons">person_add</span>
              </span>
              <div class="arp-stat-info">
                <span class="arp-stat-value">{{ arReport.by_type?.lead_created || 0 }}</span>
                <span class="arp-stat-label">New Leads</span>
              </div>
            </div>
            <div class="arp-stat-card">
              <span class="arp-stat-icon" style="background:#fef9c3;color:#a16207">
                <span class="material-icons">swap_horiz</span>
              </span>
              <div class="arp-stat-info">
                <span class="arp-stat-value">{{ arReport.by_type?.lead_stage_changed || 0 }}</span>
                <span class="arp-stat-label">Stage Changes</span>
              </div>
            </div>
            <div class="arp-stat-card">
              <span class="arp-stat-icon" style="background:#f3e8ff;color:#7c3aed">
                <span class="material-icons">event</span>
              </span>
              <div class="arp-stat-info">
                <span class="arp-stat-value">{{ arReport.by_type?.followup_scheduled || 0 }}</span>
                <span class="arp-stat-label">Followups Scheduled</span>
              </div>
            </div>
            <div class="arp-stat-card">
              <span class="arp-stat-icon" style="background:#fce7f3;color:#be185d">
                <span class="material-icons">call</span>
              </span>
              <div class="arp-stat-info">
                <span class="arp-stat-value">{{ arReport.by_type?.call_logged || 0 }}</span>
                <span class="arp-stat-label">Calls</span>
              </div>
            </div>
            <div class="arp-stat-card">
              <span class="arp-stat-icon" style="background:#d1fae5;color:#047857">
                <span class="material-icons">chat</span>
              </span>
              <div class="arp-stat-info">
                <span class="arp-stat-value">{{ arReport.by_type?.whatsapp_sent || 0 }}</span>
                <span class="arp-stat-label">WhatsApp</span>
              </div>
            </div>
            <div class="arp-stat-card">
              <span class="arp-stat-icon" style="background:#e0e7ff;color:#4338ca">
                <span class="material-icons">assignment_ind</span>
              </span>
              <div class="arp-stat-info">
                <span class="arp-stat-value">{{
                  (arReport.by_type?.lead_assigned || 0) + (arReport.by_type?.lead_reassigned || 0)
                }}</span>
                <span class="arp-stat-label">Assignments</span>
              </div>
            </div>
            <div class="arp-stat-card">
              <span class="arp-stat-icon" style="background:#fef3c7;color:#b45309">
                <span class="material-icons">note</span>
              </span>
              <div class="arp-stat-info">
                <span class="arp-stat-value">{{ arReport.by_type?.note_added || 0 }}</span>
                <span class="arp-stat-label">Notes</span>
              </div>
            </div>
          </div>

          <div class="arp-two-col">
            <!-- ── Stage Changes Breakdown ── -->
            <div class="arp-section" *ngIf="arReport.stage_changes?.length">
              <div class="arp-section-header">
                <span class="material-icons">swap_horiz</span>
                Stage Changes Breakdown
              </div>
              <div class="arp-stage-list">
                <div class="arp-stage-row" *ngFor="let s of arReport.stage_changes">
                  <span class="arp-stage-name">{{ s.stage }}</span>
                  <div class="arp-stage-bar-wrap">
                    <div
                      class="arp-stage-bar"
                      [style.width.%]="(s.count / arReport.by_type?.lead_stage_changed) * 100"
                    ></div>
                  </div>
                  <span class="arp-stage-count">{{ s.count }}</span>
                </div>
              </div>
            </div>

            <!-- ── Followup Types ── -->
            <div class="arp-section" *ngIf="arReport.followup_types?.length">
              <div class="arp-section-header">
                <span class="material-icons">event</span>
                Followup Types
              </div>
              <div class="arp-stage-list">
                <div class="arp-stage-row" *ngFor="let f of arReport.followup_types">
                  <span class="arp-stage-name" style="text-transform:capitalize">{{ f.type }}</span>
                  <div class="arp-stage-bar-wrap">
                    <div
                      class="arp-stage-bar"
                      style="background:#7c3aed"
                      [style.width.%]="(f.count / arReport.by_type?.followup_scheduled) * 100"
                    ></div>
                  </div>
                  <span class="arp-stage-count">{{ f.count }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- ── Per-User Breakdown Table ── -->
          <div class="arp-section" *ngIf="arReport.by_user?.length">
            <div class="arp-section-header">
              <span class="material-icons">people</span>
              Team Performance
            </div>
            <div class="arp-table-wrap">
              <table class="arp-table">
                <thead>
                  <tr>
                    <th>Member</th>
                    <th title="Total activities">Total</th>
                    <th title="New leads created">Leads</th>
                    <th title="Stage changes">Stages</th>
                    <th title="Followups scheduled">Followups</th>
                    <th title="Calls logged">Calls</th>
                    <th title="WhatsApp sent">WA</th>
                    <th title="Lead assignments">Assign</th>
                    <th title="Notes added">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    *ngFor="let u of arReport.by_user"
                    [class.arp-system-row]="u.user_id === 'system'"
                  >
                    <td class="arp-user-cell">
                      <span class="arp-avatar" [style.background]="getArUserColor(u.user_id)">
                        {{
                          getArUserInitials(
                            u.user_id === 'system' ? 'System' : resolveUserName(u.user_id)
                          )
                        }}
                      </span>
                      <span class="arp-user-name">{{
                        u.user_id === 'system' ? 'System' : resolveUserName(u.user_id)
                      }}</span>
                    </td>
                    <td>
                      <strong>{{ u.total }}</strong>
                    </td>
                    <td>{{ u.new_leads || 0 }}</td>
                    <td>{{ u.stage_changes || 0 }}</td>
                    <td>{{ u.followups_scheduled || 0 }}</td>
                    <td>{{ u.calls || 0 }}</td>
                    <td>{{ u.whatsapp || 0 }}</td>
                    <td>{{ u.assignments || 0 }}</td>
                    <td>{{ u.notes || 0 }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- ── Activity Timeline ── -->
          <div class="arp-section" *ngIf="arReport.timeline?.length">
            <div class="arp-section-header">
              <span class="material-icons">timeline</span>
              Recent Activity Log
              <span class="arp-section-sub">(latest {{ arReport.timeline.length }})</span>
            </div>
            <div class="arp-timeline">
              <div class="arp-tl-item" *ngFor="let t of arReport.timeline">
                <div class="arp-tl-dot" [style.background]="getArTypeColor(t.activity_type)">
                  <span class="material-icons">{{ getArTypeIcon(t.activity_type) }}</span>
                </div>
                <div class="arp-tl-content">
                  <div class="arp-tl-main">
                    <span class="arp-tl-who">{{
                      t.user_id === 'system' ? 'System' : resolveUserName(t.user_id)
                    }}</span>
                    <span class="arp-tl-desc">{{ formatArDescription(t) }}</span>
                  </div>
                  <div class="arp-tl-time">{{ t.created_at | date: 'MMM d, h:mm a' }}</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Empty state -->
          <div class="arp-empty" *ngIf="arReport.total === 0">
            <span class="material-icons">inbox</span>
            <p>No activities found for this period.</p>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .analytics-page {
        padding: 20px 24px;
        background: #f8fafc;
        min-height: 100vh;
      }

      .arp-container {
        max-width: 1400px;
        margin: 0 auto;
      }

      .arp-header {
        background: white;
        border-radius: 10px;
        padding: 20px 24px;
        margin-bottom: 20px;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
      }

      .arp-title-row {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 16px;
      }

      .arp-icon {
        font-size: 28px;
        color: #0284c7;
      }

      .arp-title {
        margin: 0;
        font-size: 24px;
        font-weight: 700;
        color: #0f172a;
      }

      .arp-controls {
        display: flex;
        gap: 12px;
        align-items: center;
        flex-wrap: wrap;
      }

      .arp-date-presets {
        display: flex;
        gap: 4px;
      }
      .arp-preset {
        padding: 5px 11px;
        border: 1px solid #d1d5db;
        border-radius: 20px;
        background: white;
        font-size: 12px;
        font-weight: 500;
        color: #6b7280;
        cursor: pointer;
        transition: all 0.15s;
      }
      .arp-preset:hover {
        border-color: #0284c7;
        color: #0284c7;
      }
      .arp-preset.active {
        background: #0284c7;
        border-color: #0284c7;
        color: white;
      }

      .arp-date-input {
        padding: 5px 8px;
        border: 1px solid #d1d5db;
        border-radius: 6px;
        font-size: 12px;
        color: #374151;
        background: white;
      }
      .arp-sep {
        font-size: 12px;
        color: #9ca3af;
      }

      .arp-user-select {
        padding: 5px 10px;
        border: 1px solid #d1d5db;
        border-radius: 6px;
        font-size: 12px;
        color: #374151;
        background: white;
        cursor: pointer;
        min-width: 160px;
      }
      .arp-refresh-btn {
        background: none;
        border: 1px solid #d1d5db;
        border-radius: 6px;
        padding: 5px 8px;
        cursor: pointer;
        color: #6b7280;
        display: flex;
        align-items: center;
        transition: all 0.2s;
      }
      .arp-refresh-btn:hover {
        background: #f3f4f6;
        border-color: #9ca3af;
      }
      .arp-refresh-btn.spinning .material-icons {
        animation: arpSpin 1s linear infinite;
      }
      @keyframes arpSpin {
        from {
          transform: rotate(0deg);
        }
        to {
          transform: rotate(360deg);
        }
      }

      .arp-range-label {
        margin-top: 10px;
        font-size: 12px;
        color: #6b7280;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .arp-total-badge {
        background: #dbeafe;
        color: #1d4ed8;
        padding: 2px 8px;
        border-radius: 10px;
        font-size: 11px;
        font-weight: 600;
      }

      .arp-loading,
      .arp-error {
        padding: 32px;
        text-align: center;
        color: #6b7280;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
      }
      .arp-spinner {
        animation: arpSpin 1.5s linear infinite;
      }
      .arp-error {
        color: #dc2626;
      }

      .arp-body {
        padding: 20px 24px;
        display: flex;
        flex-direction: column;
        gap: 20px;
      }

      /* Stat cards */
      .arp-stat-cards {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
      }
      .arp-stat-card {
        background: white;
        border: 1px solid #e5e7eb;
        border-radius: 10px;
        padding: 12px 16px;
        display: flex;
        align-items: center;
        gap: 12px;
        flex: 1 1 120px;
        min-width: 120px;
        max-width: 180px;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
      }
      .arp-stat-icon {
        width: 38px;
        height: 38px;
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }
      .arp-stat-icon .material-icons {
        font-size: 20px;
      }
      .arp-stat-info {
        display: flex;
        flex-direction: column;
      }
      .arp-stat-value {
        font-size: 22px;
        font-weight: 700;
        color: #0f172a;
        line-height: 1;
      }
      .arp-stat-label {
        font-size: 11px;
        color: #6b7280;
        margin-top: 3px;
      }

      /* Two-col layout for stage/followup breakdowns */
      .arp-two-col {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
      }
      @media (max-width: 800px) {
        .arp-two-col {
          grid-template-columns: 1fr;
        }
      }

      /* Sections */
      .arp-section {
        background: white;
        border: 1px solid #e5e7eb;
        border-radius: 10px;
        overflow: hidden;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
      }
      .arp-section-header {
        padding: 11px 16px;
        background: #f8fafc;
        border-bottom: 1px solid #e5e7eb;
        font-size: 13px;
        font-weight: 600;
        color: #374151;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .arp-section-header .material-icons {
        font-size: 16px;
        color: #6b7280;
      }
      .arp-section-sub {
        font-size: 11px;
        color: #9ca3af;
        font-weight: 400;
        margin-left: 4px;
      }

      /* Stage bar list */
      .arp-stage-list {
        padding: 10px 16px;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .arp-stage-row {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .arp-stage-name {
        font-size: 12px;
        color: #374151;
        min-width: 110px;
      }
      .arp-stage-bar-wrap {
        flex: 1;
        height: 8px;
        background: #f1f5f9;
        border-radius: 4px;
        overflow: hidden;
      }
      .arp-stage-bar {
        height: 100%;
        background: #f59e0b;
        border-radius: 4px;
        transition: width 0.4s ease;
        min-width: 4px;
      }
      .arp-stage-count {
        font-size: 12px;
        font-weight: 700;
        color: #374151;
        min-width: 24px;
        text-align: right;
      }

      /* User table */
      .arp-table-wrap {
        overflow-x: auto;
      }
      .arp-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 12px;
      }
      .arp-table th {
        padding: 8px 12px;
        text-align: center;
        font-size: 11px;
        font-weight: 600;
        color: #6b7280;
        background: #f8fafc;
        border-bottom: 1px solid #e5e7eb;
        white-space: nowrap;
      }
      .arp-table th:first-child {
        text-align: left;
      }
      .arp-table td {
        padding: 9px 12px;
        text-align: center;
        border-bottom: 1px solid #f1f5f9;
        color: #374151;
      }
      .arp-table tr:last-child td {
        border-bottom: none;
      }
      .arp-table tr:hover td {
        background: #f8fafc;
      }
      .arp-table .arp-system-row td {
        color: #9ca3af;
        font-style: italic;
      }
      .arp-user-cell {
        display: flex;
        align-items: center;
        gap: 8px;
        text-align: left !important;
      }
      .arp-avatar {
        width: 28px;
        height: 28px;
        border-radius: 50%;
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 10px;
        font-weight: 700;
        flex-shrink: 0;
      }
      .arp-user-name {
        font-size: 12px;
        font-weight: 500;
        color: #374151;
      }

      /* Timeline */
      .arp-timeline {
        padding: 12px 16px;
        display: flex;
        flex-direction: column;
        gap: 0;
      }
      .arp-tl-item {
        display: flex;
        gap: 12px;
        padding: 8px 0;
        border-bottom: 1px solid #f1f5f9;
      }
      .arp-tl-item:last-child {
        border-bottom: none;
      }
      .arp-tl-dot {
        width: 30px;
        height: 30px;
        border-radius: 50%;
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0.85;
      }
      .arp-tl-dot .material-icons {
        font-size: 15px;
        color: white;
      }
      .arp-tl-content {
        flex: 1;
      }
      .arp-tl-main {
        display: flex;
        gap: 6px;
        align-items: baseline;
        flex-wrap: wrap;
      }
      .arp-tl-who {
        font-size: 12px;
        font-weight: 600;
        color: #374151;
      }
      .arp-tl-desc {
        font-size: 12px;
        color: #6b7280;
      }
      .arp-tl-time {
        font-size: 11px;
        color: #9ca3af;
        margin-top: 2px;
      }

      /* Empty */
      .arp-empty {
        padding: 40px;
        text-align: center;
        color: #9ca3af;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
      }
      .arp-empty .material-icons {
        font-size: 40px;
      }
    `,
  ],
})
export class AnalyticsComponent implements OnInit {
  users: any[] = [];
  arDatePreset = 'today';
  arDateFrom = '';
  arDateTo = '';
  arUserId = '';
  arLoading = false;
  arError = '';
  arReport: any = null;

  private readonly arUserColors: Record<string, string> = {};
  private readonly arColorPalette = [
    '#6366f1',
    '#0ea5e9',
    '#10b981',
    '#f59e0b',
    '#ef4444',
    '#8b5cf6',
    '#ec4899',
    '#14b8a6',
    '#f97316',
    '#06b6d4',
  ];
  private destroy$ = new Subject<void>();

  constructor(
    private userService: UserService,
    private activityService: ActivityService,
    private tenantService: TenantService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  private loadUsers(): void {
    this.userService
      .getUsers()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (users) => {
          this.users = users || [];
          this.cdr.markForCheck();
          this.loadActivityReport();
        },
        error: (err) => {
          console.error('Failed to load users:', err);
          this.users = [];
          this.cdr.markForCheck();
          this.loadActivityReport();
        },
      });
  }

  setArPreset(preset: string): void {
    this.arDatePreset = preset;
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const todayStr = `${year}-${month}-${day}`;

    switch (preset) {
      case 'today':
        this.arDateFrom = todayStr;
        this.arDateTo = todayStr;
        break;
      case 'yesterday':
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const yd = String(yesterday.getDate()).padStart(2, '0');
        const ym = String(yesterday.getMonth() + 1).padStart(2, '0');
        const yyy = yesterday.getFullYear();
        this.arDateFrom = `${yyy}-${ym}-${yd}`;
        this.arDateTo = `${yyy}-${ym}-${yd}`;
        break;
      case 'this_week':
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        const sdow = String(startOfWeek.getDate()).padStart(2, '0');
        const smow = String(startOfWeek.getMonth() + 1).padStart(2, '0');
        const syow = startOfWeek.getFullYear();
        this.arDateFrom = `${syow}-${smow}-${sdow}`;
        this.arDateTo = todayStr;
        break;
      case 'this_month':
        this.arDateFrom = `${year}-${month}-01`;
        this.arDateTo = todayStr;
        break;
      case 'custom':
        break;
    }
    if (preset !== 'custom') {
      this.loadActivityReport();
    }
  }

  loadActivityReport(): void {
    if (!this.arDateFrom || !this.arDateTo) {
      this.arError = 'Please select a date range';
      this.cdr.markForCheck();
      return;
    }
    const tenant = this.tenantService.getCurrentTenant();
    if (!tenant) {
      this.arError = 'No company context available';
      this.cdr.markForCheck();
      return;
    }
    this.arLoading = true;
    this.arError = '';
    this.cdr.markForCheck();
    this.activityService
      .getActivitySummary(tenant.id, this.arDateFrom, this.arDateTo, this.arUserId || '')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (report) => {
          this.arReport = report;
          this.arLoading = false;
          this.cdr.markForCheck();
        },
        error: (err) => {
          console.error('Failed to load activity report:', err);
          this.arError = 'Failed to load activity report';
          this.arLoading = false;
          this.cdr.markForCheck();
        },
      });
  }

  getArUserColor(userId: string): string {
    if (!this.arUserColors[userId]) {
      this.arUserColors[userId] =
        this.arColorPalette[Object.keys(this.arUserColors).length % this.arColorPalette.length];
    }
    return this.arUserColors[userId];
  }

  getArUserInitials(name: string): string {
    if (!name) return '?';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  resolveUserName(userId: string): string {
    const user = this.users.find((u) => u.id === userId);
    return user
      ? user.name || `${user.first_name || ''} ${user.last_name || ''}`.trim()
      : 'Unknown';
  }

  getArTypeIcon(type: string): string {
    const icons: Record<string, string> = {
      lead_created: 'person_add',
      lead_stage_changed: 'swap_horiz',
      followup_scheduled: 'event',
      call_logged: 'call',
      whatsapp_sent: 'chat',
      lead_assigned: 'assignment_ind',
      lead_reassigned: 'assignment',
      note_added: 'note',
    };
    return icons[type] || 'info';
  }

  getArTypeColor(type: string): string {
    const colors: Record<string, string> = {
      lead_created: '#10b981',
      lead_stage_changed: '#f59e0b',
      followup_scheduled: '#7c3aed',
      call_logged: '#be185d',
      whatsapp_sent: '#047857',
      lead_assigned: '#4338ca',
      lead_reassigned: '#4338ca',
      note_added: '#b45309',
    };
    return colors[type] || '#6b7280';
  }

  formatArDescription(t: any): string {
    const type = t.activity_type;
    const lead = t.lead_name ? `<strong>${t.lead_name}</strong>` : 'a lead';
    const extra = t.extra_info ? ` (${t.extra_info})` : '';

    const descriptions: Record<string, string> = {
      lead_created: `created ${lead}`,
      lead_stage_changed: `moved ${lead} to <strong>${t.extra_info || 'a stage'}</strong>`,
      followup_scheduled: `scheduled a followup for ${lead}${extra}`,
      call_logged: `logged a call with ${lead}${extra}`,
      whatsapp_sent: `sent WhatsApp to ${lead}${extra}`,
      lead_assigned: `assigned ${lead} to <strong>${t.extra_info || 'team member'}</strong>`,
      lead_reassigned: `reassigned ${lead} to <strong>${t.extra_info || 'team member'}</strong>`,
      note_added: `added a note to ${lead}${extra}`,
    };

    return descriptions[type] || `${type.replace(/_/g, ' ')} on ${lead}`;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
