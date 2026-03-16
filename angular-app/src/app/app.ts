import { Component, ViewChild, AfterViewInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { FollowupNotificationPopupComponent } from './components/followup-notification-popup/followup-notification-popup.component';
import { FollowupNotificationService } from './services/followup-notification.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, FollowupNotificationPopupComponent],
  template: `
    <router-outlet></router-outlet>
    <app-followup-notification-popup></app-followup-notification-popup>
  `,
  styles: [
    `
      :host {
        display: block;
        height: 100%;
      }
    `,
  ],
})
export class App implements AfterViewInit {
  @ViewChild(FollowupNotificationPopupComponent)
  popupComponent!: FollowupNotificationPopupComponent;

  constructor(private notificationService: FollowupNotificationService) {}

  ngAfterViewInit(): void {
    if (this.popupComponent) {
      this.notificationService.setPopupComponent(this.popupComponent);
    }
  }
}
