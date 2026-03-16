import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LeadService } from '../../services/lead.service';
import { TeamService } from '../../services/team.service';
import { StageService } from '../../services/stage.service';
import { FollowupService } from '../../services/followup.service';
import { FollowupNotificationService } from '../../services/followup-notification.service';
import { FollowupNotificationWidgetComponent } from '../followup-notification-widget/followup-notification-widget.component';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-overview',
  standalone: true,
  imports: [CommonModule, FollowupNotificationWidgetComponent],
  template: `
    <div class="overview-container">
      <div class="overview-header">
        <div class="header-content">
          <h1 class="page-title">Overview</h1>
          <p class="page-subtitle">Welcome back! Here's your business snapshot.</p>
        </div>
        <app-followup-notification-widget class="header-widget"></app-followup-notification-widget>
      </div>

      <!-- Stats Grid -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon-wrapper material-icons">people</div>
          <h3 class="stat-label">Total Leads</h3>
          <p class="stat-value">{{ totalLeads }}</p>
          <p class="stat-meta" [class.positive]="leadTrend > 0">
            {{ leadTrend > 0 ? '+' : '' }}{{ leadTrend }}% from last month
          </p>
        </div>

        <div class="stat-card">
          <div class="stat-icon-wrapper material-icons">group</div>
          <h3 class="stat-label">Active Teams</h3>
          <p class="stat-value">{{ activeTeams }}</p>
          <p class="stat-meta">{{ teamMembers }} members</p>
        </div>

        <div class="stat-card">
          <div class="stat-icon-wrapper material-icons">trending_up</div>
          <h3 class="stat-label">Pipeline Stages</h3>
          <p class="stat-value">{{ pipelineStages }}</p>
          <p class="stat-meta">{{ leadsByStage }} in progress</p>
        </div>

        <div class="stat-card">
          <div class="stat-icon-wrapper material-icons">assignment</div>
          <h3 class="stat-label">Forms Created</h3>
          <p class="stat-value">{{ formsCount }}</p>
          <p class="stat-meta">Active forms</p>
        </div>
      </div>

      <!-- Recent Leads Section -->
      <div class="recent-section">
        <div class="section-header">
          <h2>Recent Leads</h2>
        </div>
        <div class="leads-preview">
          <table *ngIf="recentLeads.length > 0" class="leads-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Company</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let lead of recentLeads" class="lead-row">
                <td class="name-cell">{{ lead.name }}</td>
                <td class="email-cell">{{ lead.email }}</td>
                <td>{{ lead.company_name || '—' }}</td>
                <td>
                  <span class="status-badge" [class]="'status-' + lead.status">{{
                    lead.status
                  }}</span>
                </td>
              </tr>
            </tbody>
          </table>
          <div *ngIf="recentLeads.length === 0" class="empty-state">
            <p>No leads yet</p>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div *ngIf="isLoading" class="loading">
        <p>Loading data...</p>
      </div>
    </div>
  `,
  styles: [
    `
      .overview-container {
        padding: 32px;
        background: #f8f9fa;
        min-height: 100%;
      }

      .overview-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 32px;
        gap: 20px;
      }

      .header-content {
        flex: 1;
      }

      .header-widget {
        flex-shrink: 0;
      }

      .page-title {
        margin: 0 0 8px 0;
        font-size: 32px;
        font-weight: 800;
        color: #111827;
      }

      .page-subtitle {
        margin: 0;
        font-size: 14px;
        color: #6b7280;
      }

      .stats-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 20px;
        margin-bottom: 40px;
      }

      .stat-card {
        background: white;
        border: 1px solid #e5e7eb;
        border-radius: 10px;
        padding: 24px;
        transition: all 0.3s ease;
      }

      .stat-card:hover {
        border-color: #d1d5db;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
      }

      .stat-icon-wrapper {
        font-size: 28px;
        margin-bottom: 12px;
      }

      .stat-label {
        margin: 0;
        font-size: 12px;
        font-weight: 600;
        color: #6b7280;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .stat-value {
        margin: 12px 0 8px 0;
        font-size: 28px;
        font-weight: 700;
        color: #111827;
      }

      .stat-meta {
        margin: 0;
        font-size: 12px;
        color: #9ca3af;
      }

      .stat-meta.positive {
        color: #059669;
      }

      .recent-section {
        background: white;
        border: 1px solid #e5e7eb;
        border-radius: 10px;
        overflow: hidden;
      }

      .section-header {
        padding: 24px;
        border-bottom: 1px solid #e5e7eb;
      }

      .section-header h2 {
        margin: 0;
        font-size: 18px;
        font-weight: 700;
        color: #111827;
      }

      .leads-preview {
        overflow-x: auto;
      }

      .leads-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 13px;
      }

      .leads-table thead {
        background: #f9fafb;
        border-bottom: 1px solid #e5e7eb;
      }

      .leads-table th {
        padding: 12px 24px;
        text-align: left;
        font-weight: 600;
        color: #6b7280;
        text-transform: uppercase;
        font-size: 11px;
        letter-spacing: 0.5px;
      }

      .lead-row {
        border-bottom: 1px solid #f3f4f6;
        transition: background-color 0.2s;
      }

      .lead-row:hover {
        background: #f9fafb;
      }

      .lead-row:last-child {
        border-bottom: none;
      }

      .leads-table td {
        padding: 12px 24px;
        color: #374151;
      }

      .name-cell {
        font-weight: 600;
      }

      .email-cell {
        color: #6b7280;
      }

      .status-badge {
        display: inline-block;
        padding: 4px 10px;
        border-radius: 4px;
        font-size: 11px;
        font-weight: 600;
        text-transform: capitalize;
      }

      .status-active {
        background: #d1fae5;
        color: #065f46;
      }

      .status-pending {
        background: #fef3c7;
        color: #92400e;
      }

      .status-lost {
        background: #fee2e2;
        color: #991b1b;
      }

      .status-won {
        background: #dbeafe;
        color: #0c4a6e;
      }

      .empty-state {
        padding: 48px 24px;
        text-align: center;
        color: #9ca3af;
      }

      .loading {
        padding: 32px;
        text-align: center;
        color: #9ca3af;
      }
    `,
  ],
})
export class OverviewComponent implements OnInit, OnDestroy {
  totalLeads = 0;
  activeTeams = 0;
  pipelineStages = 0;
  formsCount = 0;
  teamMembers = 0;
  leadsByStage = 0;
  leadTrend = 8;
  recentLeads: any[] = [];
  isLoading = false;
  Math = Math;
  private destroy$ = new Subject<void>();

  constructor(
    private leadService: LeadService,
    private teamService: TeamService,
    private stageService: StageService,
    private followupService: FollowupService,
    private notificationService: FollowupNotificationService,
  ) {}

  ngOnInit(): void {
    this.loadOverviewData();
    this.loadFollowups();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadOverviewData(): void {
    this.isLoading = true;
    let completedRequests = 0;
    const totalRequests = 3;

    const markComplete = () => {
      completedRequests++;
      if (completedRequests === totalRequests) {
        this.isLoading = false;
      }
    };

    // Load leads
    this.leadService
      .getLeads(0, 100)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (leads) => {
          this.totalLeads = leads.length;
          this.recentLeads = leads.slice(0, 5);
          this.leadsByStage = leads.length;
          markComplete();
        },
        error: (error) => {
          markComplete();
        },
      });

    // Load teams
    this.teamService
      .getTeams(0, 100)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (teams) => {
          this.activeTeams = teams.length;
          this.teamMembers = teams.reduce((sum, team) => sum + (team.members?.length || 0), 0);
          markComplete();
        },
        error: (error) => {
          markComplete();
        },
      });

    // Load stages
    this.stageService
      .getStages()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (stages) => {
          this.pipelineStages = stages.length;
          markComplete();
        },
        error: (error) => {
          markComplete();
        },
      });
  }

  loadFollowups(): void {
    this.followupService
      .getFollowups()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (followups) => {
          this.notificationService.setPendingFollowups(followups);
        },
        error: (error) => {},
      });
  }
}
