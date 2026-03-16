import { Component, OnInit, OnDestroy, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FollowupNotificationService, PendingFollowup } from '../../services/followup-notification.service';

interface NotificationItem {
  id: string;
  followup: PendingFollowup;
  visible: boolean;
  timestamp: number;
}

@Component({
  selector: 'app-followup-notification-popup',
  standalone: true,
  imports: [CommonModule],
  template: `
    <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet" />
    <div class="notification-container">
      <div
        *ngFor="let item of notifications"
        [ngClass]="{ 'is-visible': item.visible }"
        class="notification-popup"
      >
        <!-- Close Button -->
        <button class="close-btn" (click)="dismissNotification(item.id)">
          <span class="material-icons">close</span>
        </button>

        <!-- Header - Clickable to navigate to lead -->
        <div class="notification-header" (click)="openLead(item.followup)" style="cursor: pointer;">
          <div class="header-info">
            <h4 class="lead-name">{{ item.followup.lead_name }}</h4>
            <p class="followup-title">{{ item.followup.title }}</p>
            <p class="followup-type">📞 {{ item.followup.type | titlecase }}</p>
          </div>
          <div class="notification-badge">
            <span class="material-icons">schedule</span>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="action-buttons">
          <button 
            class="action-btn call" 
            title="Call" 
            (click)="callLead(item.followup)"
          >
            <span class="material-icons">call</span>
            <span>Call</span>
          </button>
          <button 
            class="action-btn whatsapp" 
            title="WhatsApp" 
            (click)="whatsappLead(item.followup)"
          >
            <span class="material-icons">message</span>
            <span>WhatsApp</span>
          </button>
          <button 
            class="action-btn email" 
            title="Email" 
            (click)="emailLead(item.followup)"
          >
            <span class="material-icons">mail</span>
            <span>Email</span>
          </button>
        </div>

        <!-- Progress Bar (auto-dismiss) -->
        <div class="progress-bar" [style.animation-duration]="'10s'"></div>
      </div>
    </div>
  `,
  styles: `
    .notification-container {
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 12px;
      max-width: 100%;
      pointer-events: none;

      @media (max-width: 640px) {
        bottom: 10px;
        right: 10px;
        left: 10px;
      }
    }

    .notification-popup {
      background: white;
      border-radius: 12px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.16);
      width: 380px;
      padding: 16px;
      position: relative;
      pointer-events: auto;
      overflow: hidden;
      border-left: 4px solid #10b981;
      animation: slideIn 0.3s ease-in-out;
      opacity: 1;
      transform: translateX(0);

      &.is-visible {
        animation: slideIn 0.3s ease-in-out;
      }

      &:not(.is-visible) {
        animation: slideOut 0.3s ease-in-out forwards;
      }

      @media (max-width: 640px) {
        width: 100%;
        width: calc(100vw - 20px);
      }

      @media (max-width: 500px) {
        width: 100%;
        width: calc(100vw - 20px);
        border-radius: 8px;
      }
    }

    @keyframes slideIn {
      from {
        transform: translateX(420px);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }

    @keyframes slideOut {
      from {
        transform: translateX(0);
        opacity: 1;
      }
      to {
        transform: translateX(420px);
        opacity: 0;
      }
    }

    .close-btn {
      position: absolute;
      top: 8px;
      right: 8px;
      background: none;
      border: none;
      cursor: pointer;
      padding: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #9ca3af;
      transition: color 0.2s ease;
      z-index: 10;

      &:hover {
        color: #ef4444;
      }

      .material-icons {
        font-size: 20px;
      }
    }

    .notification-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 12px;
      margin-bottom: 16px;
      padding-right: 24px;
    }

    .header-info {
      flex: 1;
    }

    .lead-name {
      margin: 0;
      font-size: 16px;
      font-weight: 700;
      color: #1f2937;
      line-height: 1.4;
    }

    .followup-title {
      margin: 4px 0 8px 0;
      font-size: 13px;
      color: #6b7280;
      line-height: 1.4;
    }

    .followup-type {
      margin: 0;
      font-size: 12px;
      color: #10b981;
      font-weight: 600;
    }

    .notification-badge {
      flex-shrink: 0;
      width: 40px;
      height: 40px;
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);

      .material-icons {
        font-size: 22px;
      }
    }

    .action-buttons {
      display: flex;
      gap: 8px;
      margin-bottom: 12px;
    }

    .action-btn {
      flex: 1;
      padding: 10px 12px;
      border: none;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 4px;
      transition: all 0.2s ease;
      color: white;

      .material-icons {
        font-size: 18px;
      }

      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      }

      &:active {
        transform: translateY(0);
      }
    }

    .action-btn.call {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    }

    .action-btn.whatsapp {
      background: linear-gradient(135deg, #25d366 0%, #20ba58 100%);
    }

    .action-btn.email {
      background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
    }

    .progress-bar {
      position: absolute;
      bottom: 0;
      left: 0;
      height: 3px;
      background: linear-gradient(90deg, #10b981 0%, #059669 100%);
      animation: shrink linear forwards;
    }

    @keyframes shrink {
      from {
        width: 100%;
      }
      to {
        width: 0%;
      }
    }
  `,
})
export class FollowupNotificationPopupComponent implements OnInit, OnDestroy {
  notifications: NotificationItem[] = [];
  private notificationTimers = new Map<string, any>();

  constructor(
    private notificationService: FollowupNotificationService,
    private ngZone: NgZone,
  ) {}

  ngOnInit(): void {
    // Subscribe to notification events from the service
    // We'll use a custom observable from the service
    this.setupNotificationListener();
  }

  private setupNotificationListener(): void {
    // This will be called by the notification service when a notification is triggered
    // We'll add a method to the service to emit notification events
  }

  showNotification(followup: PendingFollowup): void {
    const itemId = `notification-${Date.now()}-${Math.random()}`;
    const item: NotificationItem = {
      id: itemId,
      followup,
      visible: true,
      timestamp: Date.now(),
    };

    this.notifications.push(item);

    // Auto-dismiss after 10 seconds
    const timer = setTimeout(() => {
      this.dismissNotification(itemId);
    }, 10000);

    this.notificationTimers.set(itemId, timer);
  }

  dismissNotification(itemId: string): void {
    const item = this.notifications.find(n => n.id === itemId);
    if (item) {
      item.visible = false;

      // Remove from array after animation
      setTimeout(() => {
        this.notifications = this.notifications.filter(n => n.id !== itemId);
      }, 300);
    }

    // Clear timer
    const timer = this.notificationTimers.get(itemId);
    if (timer) {
      clearTimeout(timer);
      this.notificationTimers.delete(itemId);
    }
  }

  openLead(followup: PendingFollowup): void {
    
    this.notificationService.openLeadDetail(followup.lead_id);
    this.dismissNotification(`notification-${followup.id}`);
  }

  callLead(followup: PendingFollowup): void {
    // Opens phone dialer (tel: protocol)
    
    // You would add phone number from lead details here
    // window.location.href = `tel:${lead.phone}`;
    alert(`Call ${followup.lead_name} - Phone action would open dialer`);
    this.dismissNotification(`notification-${followup.id}`);
  }

  whatsappLead(followup: PendingFollowup): void {
    
    // Opens WhatsApp Web or App with message
    // window.open(`https://wa.me/${phone}?text=Hi%20${name}`);
    alert(`WhatsApp ${followup.lead_name} - Would open WhatsApp`);
    this.dismissNotification(`notification-${followup.id}`);
  }

  emailLead(followup: PendingFollowup): void {
    
    // Opens email client
    // window.location.href = `mailto:${lead.email}`;
    alert(`Email ${followup.lead_name} - Would open email client`);
    this.dismissNotification(`notification-${followup.id}`);
  }

  ngOnDestroy(): void {
    // Clear all timers
    this.notificationTimers.forEach(timer => clearTimeout(timer));
    this.notificationTimers.clear();
  }
}
