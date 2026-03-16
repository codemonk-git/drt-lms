import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FollowupNotificationService,
  PendingFollowup,
} from '../../services/followup-notification.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-followup-notification-widget',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="notification-widget">
      <!-- Pending Count -->
      <div class="notification-item pending-badge">
        <span class="badge-icon">⏰</span>
        <div class="badge-content">
          <div class="badge-count">{{ pendingCount }}</div>
          <div class="badge-label">Pending</div>
        </div>
      </div>

      <!-- Overdue Count -->
      <div class="notification-item overdue-badge" *ngIf="overdueCount > 0">
        <span class="badge-icon">⚠️</span>
        <div class="badge-content">
          <div class="badge-count alert">{{ overdueCount }}</div>
          <div class="badge-label">Overdue</div>
        </div>
      </div>

      <!-- Expand/Collapse -->
      <button
        class="expand-btn"
        (click)="toggleExpanded()"
        [title]="expanded ? 'Collapse' : 'Expand'"
      >
        {{ expanded ? '▼' : '▶' }}
      </button>

      <!-- Expanded View -->
      <div class="expanded-panel" *ngIf="expanded">
        <div class="panel-header">
          <h4>Upcoming Followups</h4>
          <button class="close-btn" (click)="toggleExpanded()">✕</button>
        </div>

        <!-- Pending Followups -->
        <div class="followups-section">
          <h5>Due Soon</h5>
          <div *ngIf="pendingFollowups.length === 0" class="empty-message">
            No followups scheduled
          </div>
          <div *ngFor="let followup of pendingFollowups" class="followup-item">
            <div class="followup-time">
              <span class="time-badge">{{ followup.time_until }}</span>
            </div>
            <div class="followup-details">
              <div class="followup-title">{{ followup.title }}</div>
              <div class="followup-lead">{{ followup.lead_name }}</div>
              <div class="followup-type">{{ followup.type }}</div>
            </div>
          </div>
        </div>

        <!-- Overdue Followups -->
        <div class="followups-section" *ngIf="overdueFollowups.length > 0">
          <h5>Overdue</h5>
          <div *ngFor="let followup of overdueFollowups" class="followup-item overdue">
            <div class="followup-time">
              <span class="time-badge alert">{{ followup.time_until }}</span>
            </div>
            <div class="followup-details">
              <div class="followup-title">{{ followup.title }}</div>
              <div class="followup-lead">{{ followup.lead_name }}</div>
              <div class="followup-type">{{ followup.type }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .notification-widget {
        display: flex;
        gap: 10px;
        align-items: center;
        position: relative;
        font-family:
          -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell,
          sans-serif;
      }

      .notification-item {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        background: white;
        border: 1px solid #e5e7eb;
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.2s;
      }

      .notification-item:hover {
        background: #f9fafb;
        border-color: #d1d5db;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      }

      .badge-icon {
        font-size: 18px;
      }

      .badge-content {
        text-align: center;
      }

      .badge-count {
        font-size: 16px;
        font-weight: 600;
        color: #1f2937;
      }

      .badge-count.alert {
        color: #dc2626;
      }

      .badge-label {
        font-size: 11px;
        color: #6b7280;
        margin-top: 2px;
      }

      .pending-badge {
        background: linear-gradient(135deg, #fef3c7 0%, #fef08a 100%);
        border-color: #fcd34d;
      }

      .overdue-badge {
        background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
        border-color: #fca5a5;
      }

      .expand-btn {
        background: none;
        border: none;
        font-size: 14px;
        cursor: pointer;
        color: #6b7280;
        padding: 4px 8px;
        border-radius: 4px;
        transition: all 0.2s;
      }

      .expand-btn:hover {
        background: #f3f4f6;
        color: #1f2937;
      }

      .expanded-panel {
        position: absolute;
        top: 100%;
        right: 0;
        width: 320px;
        background: white;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
        z-index: 1000;
        margin-top: 8px;
        max-height: 500px;
        overflow-y: auto;
      }

      .panel-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px;
        border-bottom: 1px solid #e5e7eb;
      }

      .panel-header h4 {
        margin: 0;
        font-size: 14px;
        font-weight: 600;
        color: #1f2937;
      }

      .close-btn {
        background: none;
        border: none;
        font-size: 16px;
        cursor: pointer;
        color: #9ca3af;
        padding: 0;
      }

      .close-btn:hover {
        color: #1f2937;
      }

      .followups-section {
        padding: 12px;
        border-bottom: 1px solid #f3f4f6;
      }

      .followups-section:last-child {
        border-bottom: none;
      }

      .followups-section h5 {
        margin: 0 0 8px 0;
        font-size: 12px;
        font-weight: 600;
        color: #6b7280;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .empty-message {
        font-size: 13px;
        color: #9ca3af;
        text-align: center;
        padding: 16px;
      }

      .followup-item {
        display: flex;
        gap: 10px;
        padding: 8px;
        background: #f9fafb;
        border-radius: 6px;
        margin-bottom: 8px;
        font-size: 12px;
      }

      .followup-item:last-child {
        margin-bottom: 0;
      }

      .followup-item.overdue {
        background: #fef2f2;
      }

      .followup-time {
        flex-shrink: 0;
      }

      .time-badge {
        display: inline-block;
        background: #f3f4f6;
        color: #374151;
        padding: 4px 8px;
        border-radius: 4px;
        font-weight: 500;
        white-space: nowrap;
        font-size: 11px;
      }

      .time-badge.alert {
        background: #fee2e2;
        color: #991b1b;
      }

      .followup-details {
        flex: 1;
        min-width: 0;
      }

      .followup-title {
        font-weight: 600;
        color: #1f2937;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .followup-lead {
        color: #6b7280;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .followup-type {
        color: #9ca3af;
        font-size: 11px;
        text-transform: capitalize;
      }

      @media (max-width: 640px) {
        .expanded-panel {
          position: fixed;
          right: 10px;
          left: 10px;
          width: auto;
        }
      }
    `,
  ],
})
export class FollowupNotificationWidgetComponent implements OnInit, OnDestroy {
  pendingFollowups: PendingFollowup[] = [];
  overdueFollowups: PendingFollowup[] = [];
  pendingCount = 0;
  overdueCount = 0;
  expanded = false;

  private destroy$ = new Subject<void>();

  constructor(private notificationService: FollowupNotificationService) {}

  ngOnInit(): void {
    this.notificationService.pendingFollowups$
      .pipe(takeUntil(this.destroy$))
      .subscribe((followups) => {
        this.pendingFollowups = followups;
      });

    this.notificationService.overdueFollowups$
      .pipe(takeUntil(this.destroy$))
      .subscribe((followups) => {
        this.overdueFollowups = followups;
      });

    this.notificationService.pendingCount$.pipe(takeUntil(this.destroy$)).subscribe((count) => {
      this.pendingCount = count;
    });

    this.notificationService.overdueCount$.pipe(takeUntil(this.destroy$)).subscribe((count) => {
      this.overdueCount = count;
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  toggleExpanded(): void {
    this.expanded = !this.expanded;
  }
}
