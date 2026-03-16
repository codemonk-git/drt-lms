import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page-content">
      <h2>Settings</h2>
      <div class="settings-container">
        <div class="settings-section">
          <h3>Preferences</h3>
          <div class="setting-item">
            <label class="setting-label">
              <input type="checkbox" checked />
              <span>Email Notifications</span>
            </label>
          </div>
          <div class="setting-item">
            <label class="setting-label">
              <input type="checkbox" checked />
              <span>Push Notifications</span>
            </label>
          </div>
          <div class="setting-item">
            <label class="setting-label">
              <input type="checkbox" />
              <span>Marketing Emails</span>
            </label>
          </div>
        </div>

        <div class="settings-section">
          <h3>Privacy</h3>
          <div class="setting-item">
            <label class="setting-label">
              <input type="checkbox" checked />
              <span>Make Profile Public</span>
            </label>
          </div>
          <div class="setting-item">
            <label class="setting-label">
              <input type="checkbox" checked />
              <span>Show Activity Status</span>
            </label>
          </div>
        </div>

        <div class="settings-section">
          <h3>Data & Privacy</h3>
          <button class="btn-secondary">Download My Data</button>
          <button class="btn-danger">Delete Account</button>
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

      .settings-container {
        background: white;
        border-radius: 10px;
        overflow: hidden;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
      }

      .settings-section {
        padding: 25px;
        border-bottom: 1px solid #e0e6ed;
      }

      .settings-section:last-child {
        border-bottom: none;
      }

      .settings-section h3 {
        margin-top: 0;
        margin-bottom: 15px;
        color: #2c3e50;
      }

      .setting-item {
        margin-bottom: 15px;
      }

      .setting-item:last-child {
        margin-bottom: 0;
      }

      .setting-label {
        display: flex;
        align-items: center;
        cursor: pointer;
        color: #555;
      }

      .setting-label input {
        margin-right: 10px;
        cursor: pointer;
      }

      .btn-secondary,
      .btn-danger {
        display: inline-block;
        padding: 10px 20px;
        border: none;
        border-radius: 5px;
        cursor: pointer;
        font-weight: 600;
        margin-right: 10px;
        margin-bottom: 10px;
      }

      .btn-secondary {
        background: #3498db;
        color: white;
      }

      .btn-secondary:hover {
        background: #2980b9;
      }

      .btn-danger {
        background: #e74c3c;
        color: white;
      }

      .btn-danger:hover {
        background: #c0392b;
      }
    `,
  ],
})
export class SettingsComponent {}
