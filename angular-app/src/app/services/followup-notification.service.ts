import { Injectable, NgZone, Injector } from '@angular/core';
import { BehaviorSubject, interval, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { FollowupNotificationPopupComponent } from '../components/followup-notification-popup/followup-notification-popup.component';

export interface PendingFollowup {
  id: string;
  lead_id: string;
  title: string;
  lead_name: string;
  type: string;
  scheduled_for: Date;
  is_overdue: boolean;
  time_until: string;
}

@Injectable({
  providedIn: 'root',
})
export class FollowupNotificationService {
  pendingFollowups$ = new BehaviorSubject<PendingFollowup[]>([]);
  overdueFollowups$ = new BehaviorSubject<PendingFollowup[]>([]);
  pendingCount$ = new BehaviorSubject<number>(0);
  overdueCount$ = new BehaviorSubject<number>(0);
  navigateToLead$ = new Subject<string>(); // Emits lead_id when notification clicked

  private destroy$ = new Subject<void>();
  private notifiedFollowups = new Set<string>();
  private popupComponent: FollowupNotificationPopupComponent | null = null;

  constructor(private ngZone: NgZone, private injector: Injector) {
    
    this.requestNotificationPermission();
    this.startPolling();
    this.getOrCreatePopupComponent();
  }

  private getOrCreatePopupComponent(): void {
    // Find or create the popup component
    try {
      const componentRef = this.injector.get(FollowupNotificationPopupComponent, null);
      if (componentRef) {
        this.popupComponent = componentRef;
      }
    } catch (e) {
      // Component might not be in injector yet - that's okay
      
    }
  }

  setPopupComponent(component: FollowupNotificationPopupComponent): void {
    this.popupComponent = component;
  }

  private requestNotificationPermission(): void {
    if ('Notification' in window) {
      

      if (Notification.permission === 'default') {
        
        Notification.requestPermission().then((permission) => {
          
        });
      } else if (Notification.permission === 'denied') {
        
      }
    } else {
      
    }
  }

  private startPolling(): void {
    // Poll every 5 seconds for followup status
    this.ngZone.runOutsideAngular(() => {
      interval(5000)
        .pipe(takeUntil(this.destroy$))
        .subscribe(() => {
          this.ngZone.run(() => {
            this.updateFollowupStatus();
          });
        });
    });
  }

  updateFollowupStatus(): void {
    const now = new Date();
    const pending = this.pendingFollowups$.value;
    const overdue: PendingFollowup[] = [];

    pending.forEach((followup) => {
      const scheduledTime = new Date(followup.scheduled_for);
      const timeDiff = scheduledTime.getTime() - now.getTime();
      const secondsDiff = Math.floor(timeDiff / 1000);

      followup.is_overdue = timeDiff < 0;
      followup.time_until = this.formatTimeUntil(timeDiff);


      if (followup.is_overdue) {
        overdue.push(followup);
      }

      // Notify within 2 minutes before and 5 minutes after scheduled time
      if (secondsDiff <= 120 && secondsDiff >= -300) {
        
        this.sendNotification(followup);
      }
    });

    this.pendingFollowups$.next(pending);
    this.overdueFollowups$.next(overdue);
    this.pendingCount$.next(pending.length - overdue.length);
    this.overdueCount$.next(overdue.length);
  }

  setPendingFollowups(followups: any[]): void {
    const pending: PendingFollowup[] = followups
      .filter((f) => this.getStatusValue(f.status) !== 'completed')
      .map((f) => ({
        id: f.id,
        lead_id: f.lead_id,
        title: f.title,
        lead_name: f.lead_name || 'Unknown Lead',
        type: f.followup_type || f.type || 'call',
        scheduled_for: new Date(f.scheduled_for),
        is_overdue: false,
        time_until: '',
      }));

    // Only clear notification cache if followups actually changed (new/removed followups)
    const currentIds = new Set(this.pendingFollowups$.value.map(f => f.id));
    const newIds = new Set(pending.map(f => f.id));
    
    // Check if followup IDs changed (not just tab navigation)
    const idsChanged = currentIds.size !== newIds.size || 
                       [...currentIds].some(id => !newIds.has(id));
    
    if (idsChanged) {
      // Clear notifications only for followups that were removed
      currentIds.forEach(id => {
        if (!newIds.has(id)) {
          this.notifiedFollowups.delete(id);
        }
      });
    }

    this.pendingFollowups$.next(pending);
    this.updateFollowupStatus();
  }

  private sendNotification(followup: PendingFollowup): void {
    // Only notify once per followup
    if (this.notifiedFollowups.has(followup.id)) {
      
      return;
    }

    this.notifiedFollowups.add(followup.id);
    

    const message = `⏰ FOLLOWUP TIME!\n\n${followup.title}\n📞 ${followup.lead_name}\n🔔 Type: ${followup.type}`;

    // Try browser notification first
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        const notification = new Notification('⏰ Followup Time!', {
          body: `${followup.title}\n📞 ${followup.lead_name} (${followup.type})`,
          icon: '/assets/followup-icon.png',
          badge: '/assets/badge-icon.png',
          tag: `followup-${followup.id}`,
          requireInteraction: true,
        });

        

        this.playNotificationSound();

        notification.onclick = () => {
          window.focus();
          notification.close();
        };

        setTimeout(() => {
          notification.close();
        }, 15000);

        return;
      } catch (error) {
        
      }
    }

    // Fallback to beautiful popup notification
    
    this.playNotificationSound();
    
    // Show popup notification
    if (this.popupComponent) {
      this.popupComponent.showNotification(followup);
    } else {
      // Fallback to alert if popup not available yet
      
      alert(message);
    }
  }

  private playNotificationSound(): void {
    try {
      

      // Method 1: Web Audio API
      try {
        const audioContext =
          new (window as any).AudioContext() || new (window as any).webkitAudioContext();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = 800;
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);

        
        return;
      } catch (e) {
        
      }

      // Method 2: HTML5 Audio with base64 beep
      const audio = new Audio(
        'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAAB9AAACABAAZGF0YQoGAAAAAA==',
      );
      audio.volume = 0.5;
      audio
        .play()
        .then(() => {
          
        })
        .catch((e) => {
          
        });
    } catch (e) {
      
    }
  }

  private formatTimeUntil(timeDiff: number): string {
    if (timeDiff < 0) {
      const minutesAgo = Math.floor(Math.abs(timeDiff) / 60000);
      if (minutesAgo < 60) {
        return `overdue by ${minutesAgo} min`;
      }
      const hoursAgo = Math.floor(minutesAgo / 60);
      return `overdue by ${hoursAgo}h`;
    }

    const minutes = Math.floor(timeDiff / 60000);
    if (minutes < 60) {
      return `in ${minutes} min`;
    }

    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
      return `in ${hours}h ${minutes % 60}m`;
    }

    const days = Math.floor(hours / 24);
    return `in ${days}d`;
  }

  private getStatusValue(status: any): string {
    if (typeof status === 'object' && status?._value_) {
      return status._value_;
    }
    return status || 'unknown';
  }

  markAsNotified(followupId: string): void {
    this.notifiedFollowups.add(followupId);
  }

  clearCache(): void {
    this.notifiedFollowups.clear();
  }

  testNotification(): void {
    
    const testFollowup: PendingFollowup = {
      id: 'test-' + Date.now(),
      lead_id: 'test-lead-id',
      title: '🧪 TEST Notification',
      lead_name: 'Test Lead',
      type: 'test',
      scheduled_for: new Date(),
      is_overdue: false,
      time_until: 'now',
    };
    this.sendNotification(testFollowup);
  }

  openLeadDetail(leadId: string): void {
    
    this.navigateToLead$.next(leadId);
  }

  destroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
