import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FollowupService } from '../../services/followup.service';
import { FollowupNotificationService } from '../../services/followup-notification.service';
import { LeadService } from '../../services/lead.service';
import { AuthService } from '../../services/auth.service';
import { Followup, Lead } from '../../models/api.models';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-followup-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="followup-list-container">
      <div class="main-header">
        <h1>Followups</h1>
        <button class="btn-primary" (click)="openNewFollowupForm()">+ Schedule Followup</button>
      </div>

      <!-- Filters -->
      <div class="filters">
        <select [(ngModel)]="filterStatus" (change)="filterFollowups()" class="filter-select">
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="overdue">Overdue</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <!-- Followups List -->
      <div class="followups-list">
        <div *ngIf="filteredFollowups.length === 0" class="empty-state">
          <p>No followups scheduled</p>
        </div>

        <div
          *ngFor="let followup of filteredFollowups"
          class="followup-card"
          [ngClass]="getStatusClass(followup.status)"
        >
          <div class="followup-header">
            <div class="followup-info">
              <h3>{{ followup.subject || followup.title || 'Untitled Followup' }}</h3>
              <p class="followup-meta">
                Lead: {{ getLeadName(followup.lead_id) }} | Type:
                {{ followup.followup_type || followup.type || '-' }} | Status:
                <span class="status-badge" [ngClass]="getStatusClass(followup.status)">{{
                  getStatusValue(followup.status)
                }}</span>
              </p>
            </div>
            <div class="followup-date">
              <span class="date-label">{{ formatDate(followup.scheduled_for) }}</span>
              <span class="time-label">{{ formatTime(followup.scheduled_for) }}</span>
            </div>
          </div>

          <div class="followup-body">
            <p>{{ followup.body || followup.notes || '-' }}</p>
          </div>

          <div class="followup-actions">
            <button
              *ngIf="followup.status === 'pending' || followup.status === 'overdue'"
              class="btn-small btn-success"
              (click)="completeFollowup(followup)"
            >
              Mark Complete
            </button>
            <button
              *ngIf="followup.status === 'pending' || followup.status === 'overdue'"
              class="btn-small btn-warning"
              (click)="rescheduleFollowup(followup)"
            >
              Reschedule
            </button>
            <button
              *ngIf="followup.status !== 'completed' && followup.status !== 'cancelled'"
              class="btn-small btn-danger"
              (click)="cancelFollowup(followup)"
            >
              Cancel
            </button>
            <button
              class="btn-small btn-delete"
              (click)="deleteFollowup(followup)"
              title="Delete followup"
            >
              Delete
            </button>
          </div>
        </div>
      </div>

      <!-- New Followup Modal -->
      <div class="modal-overlay" *ngIf="showNewFollowupForm" (click)="closeNewFollowupForm()">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>Schedule Followup</h3>
            <button class="close-btn" (click)="closeNewFollowupForm()">✕</button>
          </div>

          <form (ngSubmit)="submitFollowup()" class="form">
            <div class="form-group">
              <label>Lead *</label>
              <input
                type="text"
                [(ngModel)]="newFollowup.lead_id"
                name="lead_id"
                placeholder="Lead ID or select from list"
                required
              />
            </div>

            <div class="form-group">
              <label>Followup Type *</label>
              <select [(ngModel)]="newFollowup.followup_type" name="followup_type" required>
                <option value="">Select Type</option>
                <option value="call">Call</option>
                <option value="email">Email</option>
                <option value="meeting">Meeting</option>
                <option value="sms">SMS</option>
                <option value="task">Task</option>
              </select>
            </div>

            <div class="form-group">
              <label>Title *</label>
              <input
                type="text"
                [(ngModel)]="newFollowup.title"
                name="title"
                placeholder="e.g., Follow up on demo"
                required
              />
            </div>

            <div class="form-group">
              <label>Scheduled For *</label>
              <input
                type="datetime-local"
                [(ngModel)]="newFollowup.scheduled_for"
                name="scheduled_for"
                required
              />
            </div>

            <div class="form-group">
              <label>Notes</label>
              <textarea
                [(ngModel)]="newFollowup.notes"
                name="notes"
                placeholder="Additional notes..."
                rows="4"
              ></textarea>
            </div>

            <div class="form-actions">
              <button type="submit" class="btn-primary" [disabled]="isSubmitting">
                {{ isSubmitting ? 'Scheduling...' : 'Schedule Followup' }}
              </button>
              <button type="button" class="btn-secondary" (click)="closeNewFollowupForm()">
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Reschedule Modal -->
      <div
        class="modal-overlay"
        *ngIf="showRescheduleForm && selectedFollowup"
        (click)="closeRescheduleForm()"
      >
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>Reschedule Followup</h3>
            <button class="close-btn" (click)="closeRescheduleForm()">✕</button>
          </div>

          <form (ngSubmit)="submitReschedule()" class="form">
            <div class="form-group">
              <label>New Scheduled Date/Time *</label>
              <input
                type="datetime-local"
                [(ngModel)]="rescheduleDate"
                name="rescheduleDate"
                required
              />
            </div>

            <div class="form-actions">
              <button type="submit" class="btn-primary" [disabled]="isSubmitting">
                {{ isSubmitting ? 'Rescheduling...' : 'Reschedule' }}
              </button>
              <button type="button" class="btn-secondary" (click)="closeRescheduleForm()">
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .followup-list-container {
        padding: 40px;
        max-width: 1200px;
        margin: 0 auto;
      }

      .main-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 30px;
      }

      .main-header h1 {
        margin: 0;
        font-size: 28px;
        font-weight: 600;
        color: #1f2937;
      }

      .btn-primary {
        background-color: #3b82f6;
        color: white;
        border: none;
        padding: 10px 20px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 500;
        transition: background-color 0.3s;
      }

      .btn-primary:hover:not(:disabled) {
        background-color: #2563eb;
      }

      .btn-primary:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .filters {
        margin-bottom: 20px;
        display: flex;
        gap: 10px;
      }

      .filter-select {
        padding: 8px 12px;
        border: 1px solid #d1d5db;
        border-radius: 6px;
        font-size: 14px;
        background-color: white;
      }

      .followups-list {
        display: grid;
        gap: 16px;
      }

      .empty-state {
        text-align: center;
        padding: 60px 20px;
        background-color: #f9fafb;
        border-radius: 8px;
        color: #9ca3af;
      }

      .followup-card {
        background: white;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        padding: 20px;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        transition: all 0.3s;
      }

      .followup-card:hover {
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      }

      .followup-card.pending {
        border-left: 4px solid #f59e0b;
      }

      .followup-card.overdue {
        border-left: 4px solid #ef4444;
      }

      .followup-card.completed {
        border-left: 4px solid #10b981;
        opacity: 0.7;
      }

      .followup-card.cancelled {
        border-left: 4px solid #9ca3af;
        opacity: 0.6;
      }

      .followup-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 12px;
      }

      .followup-info h3 {
        margin: 0 0 4px 0;
        font-size: 16px;
        font-weight: 600;
        color: #1f2937;
      }

      .followup-meta {
        margin: 0;
        font-size: 13px;
        color: #6b7280;
      }

      .status-badge {
        padding: 2px 8px;
        border-radius: 4px;
        font-size: 12px;
        font-weight: 500;
      }

      .status-badge.pending {
        background-color: #fef3c7;
        color: #b45309;
      }

      .status-badge.overdue {
        background-color: #fee2e2;
        color: #991b1b;
      }

      .status-badge.completed {
        background-color: #d1fae5;
        color: #065f46;
      }

      .status-badge.cancelled {
        background-color: #f3f4f6;
        color: #4b5563;
      }

      .followup-date {
        text-align: right;
      }

      .date-label {
        display: block;
        font-size: 14px;
        font-weight: 600;
        color: #1f2937;
      }

      .time-label {
        display: block;
        font-size: 12px;
        color: #6b7280;
      }

      .followup-body {
        margin-bottom: 16px;
        padding: 12px;
        background-color: #f9fafb;
        border-radius: 6px;
        font-size: 14px;
        line-height: 1.5;
        color: #4b5563;
      }

      .followup-body p {
        margin: 0;
      }

      .followup-actions {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }

      .btn-small {
        padding: 6px 12px;
        font-size: 12px;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-weight: 500;
        transition: all 0.3s;
      }

      .btn-success {
        background-color: #10b981;
        color: white;
      }

      .btn-success:hover {
        background-color: #059669;
      }

      .btn-warning {
        background-color: #f59e0b;
        color: white;
      }

      .btn-warning:hover {
        background-color: #d97706;
      }

      .btn-danger {
        background-color: #ef4444;
        color: white;
      }

      .btn-danger:hover {
        background-color: #dc2626;
      }

      .btn-delete {
        background-color: #6b7280;
        color: white;
      }

      .btn-delete:hover {
        background-color: #4b5563;
      }

      /* Modal Styles */
      .modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
      }

      .modal-content {
        background: white;
        border-radius: 8px;
        max-width: 500px;
        width: 90%;
        max-height: 90vh;
        overflow-y: auto;
        box-shadow: 0 20px 25px rgba(0, 0, 0, 0.15);
      }

      .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 20px;
        border-bottom: 1px solid #e5e7eb;
      }

      .modal-header h3 {
        margin: 0;
        font-size: 18px;
        font-weight: 600;
        color: #1f2937;
      }

      .close-btn {
        background: none;
        border: none;
        font-size: 24px;
        color: #9ca3af;
        cursor: pointer;
      }

      .close-btn:hover {
        color: #1f2937;
      }

      .form {
        padding: 20px;
      }

      .form-group {
        margin-bottom: 16px;
      }

      .form-group label {
        display: block;
        margin-bottom: 6px;
        font-size: 14px;
        font-weight: 500;
        color: #374151;
      }

      .form-group input,
      .form-group textarea,
      .form-group select {
        width: 100%;
        padding: 8px 12px;
        border: 1px solid #d1d5db;
        border-radius: 6px;
        font-size: 14px;
        font-family: inherit;
      }

      .form-group input:focus,
      .form-group textarea:focus,
      .form-group select:focus {
        outline: none;
        border-color: #3b82f6;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
      }

      .form-actions {
        display: flex;
        gap: 10px;
        margin-top: 20px;
      }

      .btn-secondary {
        flex: 1;
        background-color: #e5e7eb;
        color: #1f2937;
        border: none;
        padding: 10px 20px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 500;
        transition: background-color 0.3s;
      }

      .btn-secondary:hover {
        background-color: #d1d5db;
      }

      .form-actions .btn-primary {
        flex: 1;
      }
    `,
  ],
})
export class FollowupListComponent implements OnInit, OnDestroy {
  followups: Followup[] = [];
  filteredFollowups: Followup[] = [];
  filterStatus: string = '';
  showNewFollowupForm = false;
  showRescheduleForm = false;
  selectedFollowup: Followup | null = null;
  isSubmitting = false;
  rescheduleDate = '';

  newFollowup = {
    lead_id: '',
    followup_type: '',
    title: '',
    scheduled_for: '',
    notes: '',
  };

  private destroy$ = new Subject<void>();
  leadCache: Map<string, string> = new Map();

  constructor(
    private followupService: FollowupService,
    private notificationService: FollowupNotificationService,
    private leadService: LeadService,
    private authService: AuthService,
  ) {}

  ngOnInit(): void {
    this.loadFollowups();
    this.loadLeadNames();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadFollowups(): void {
    this.followupService.followups$.pipe(takeUntil(this.destroy$)).subscribe((followups) => {
      this.followups = followups;
      this.filterFollowups();
      // Update notification service
      this.notificationService.setPendingFollowups(followups);
    });

    // Initial load
    this.followupService.getFollowups().pipe(takeUntil(this.destroy$)).subscribe();
  }

  filterFollowups(): void {
    if (this.filterStatus) {
      this.filteredFollowups = this.followups.filter((f) => f.status === this.filterStatus);
    } else {
      this.filteredFollowups = this.followups;
    }
  }

  getLeadName(leadId: string): string {
    if (this.leadCache.has(leadId)) {
      return this.leadCache.get(leadId)!;
    }
    // Return placeholder while loading
    return 'Loading...';
  }

  openNewFollowupForm(): void {
    this.showNewFollowupForm = true;
  }

  closeNewFollowupForm(): void {
    this.showNewFollowupForm = false;
    this.resetForm();
  }

  submitFollowup(): void {
    if (!this.newFollowup.lead_id || !this.newFollowup.followup_type || !this.newFollowup.title) {
      alert('Please fill in all required fields');
      return;
    }

    this.isSubmitting = true;

    this.followupService
      .scheduleFollowup({
        lead_id: this.newFollowup.lead_id,
        followup_type: this.newFollowup.followup_type,
        title: this.newFollowup.title,
        scheduled_for: this.newFollowup.scheduled_for + ':00',
        notes: this.newFollowup.notes,
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.closeNewFollowupForm();
          this.isSubmitting = false;
          alert('Followup scheduled successfully!');
        },
        error: (error) => {
          alert('Failed to schedule followup');
          this.isSubmitting = false;
        },
      });
  }

  completeFollowup(followup: Followup): void {
    this.followupService
      .completeFollowup(followup.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          alert('Followup marked as complete!');
        },
        error: (error) => {
          alert('Failed to complete followup');
        },
      });
  }

  rescheduleFollowup(followup: Followup): void {
    this.selectedFollowup = followup;
    this.rescheduleDate = new Date(followup.scheduled_for).toISOString().slice(0, 16);
    this.showRescheduleForm = true;
  }

  closeRescheduleForm(): void {
    this.showRescheduleForm = false;
    this.selectedFollowup = null;
    this.rescheduleDate = '';
  }

  submitReschedule(): void {
    if (!this.selectedFollowup || !this.rescheduleDate) return;

    this.isSubmitting = true;

    this.followupService
      .rescheduleFollowup(this.selectedFollowup.id, this.rescheduleDate + ':00')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.closeRescheduleForm();
          this.isSubmitting = false;
          alert('Followup rescheduled successfully!');
        },
        error: (error) => {
          alert('Failed to reschedule followup');
          this.isSubmitting = false;
        },
      });
  }

  cancelFollowup(followup: Followup): void {
    if (confirm('Are you sure you want to cancel this followup?')) {
      this.followupService
        .cancelFollowup(followup.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            alert('Followup cancelled');
          },
          error: (error) => {
            alert('Failed to cancel followup');
          },
        });
    }
  }

  deleteFollowup(followup: Followup): void {
    if (confirm('Are you sure you want to permanently delete this followup?')) {
      this.followupService
        .deleteFollowup(followup.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            alert('Followup deleted');
            this.loadFollowups();
          },
          error: () => {
            alert('Failed to delete followup');
          },
        });
    }
  }

  formatDate(dateString: string): string {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateString;
    }
  }

  formatTime(dateString: string): string {
    try {
      const date = new Date(dateString);
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  }

  resetForm(): void {
    this.newFollowup = {
      lead_id: '',
      followup_type: '',
      title: '',
      scheduled_for: '',
      notes: '',
    };
  }

  getStatusValue(status: any): string {
    if (typeof status === 'object' && status?._value_) {
      return status._value_;
    }
    return status || 'unknown';
  }

  getStatusClass(status: any): string {
    const statusValue = this.getStatusValue(status);
    return statusValue.toLowerCase();
  }

  loadLeadNames(): void {
    // Load all leads to build cache
    this.leadService
      .getLeads(0, 100)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (leads) => {
          leads.forEach((lead) => {
            const leadName = lead.name || lead.email || 'Unknown';
            this.leadCache.set(lead.id, leadName);
          });
        },
        error: (err) => {},
      });
  }
}
