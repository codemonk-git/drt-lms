import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page-content">
      <h2>User Profile</h2>
      <div class="profile-card" *ngIf="currentUser$ | async as user">
        <div class="profile-header">
          <div class="avatar">{{ user.name | slice: 0 : 1 }}</div>
          <div class="user-details">
            <h3>{{ user.name }}</h3>
            <p>{{ user.email }}</p>
          </div>
        </div>
        <div class="profile-info">
          <div class="info-item">
            <label>User ID</label>
            <p>{{ user.id }}</p>
          </div>
          <div class="info-item">
            <label>Email</label>
            <p>{{ user.email }}</p>
          </div>
          <div class="info-item">
            <label>Account Status</label>
            <p class="status-active">Active</p>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .page-content {
        padding: 20px;
      }

      h2 {
        margin-top: 0;
        color: #2c3e50;
      }

      .profile-card {
        background: white;
        border-radius: 10px;
        padding: 30px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
      }

      .profile-header {
        display: flex;
        align-items: center;
        margin-bottom: 30px;
        padding-bottom: 20px;
        border-bottom: 1px solid #e0e6ed;
      }

      .avatar {
        width: 80px;
        height: 80px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 32px;
        font-weight: 600;
        margin-right: 20px;
      }

      .user-details h3 {
        margin: 0;
        color: #2c3e50;
      }

      .user-details p {
        margin: 5px 0 0 0;
        color: #7f8c8d;
      }

      .profile-info {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 20px;
      }

      .info-item label {
        display: block;
        color: #7f8c8d;
        font-size: 12px;
        font-weight: 600;
        margin-bottom: 8px;
        text-transform: uppercase;
      }

      .info-item p {
        margin: 0;
        color: #2c3e50;
        font-size: 16px;
      }

      .status-active {
        color: #27ae60;
        font-weight: 600;
      }
    `,
  ],
})
export class ProfileComponent {
  currentUser$: Observable<any>;

  constructor(private authService: AuthService) {
    this.currentUser$ = this.authService.currentUser$;
  }
}
