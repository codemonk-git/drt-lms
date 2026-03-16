import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormsModule,
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { MatChipsModule } from '@angular/material/chips';
import { TeamService } from '../../services/team.service';
import { UserService } from '../../services/user.service';
import { AuthService } from '../../services/auth.service';
import { TenantService } from '../../services/tenant.service';
import { ToastService } from '../../services/toast.service';
import { Team, TeamMember, User } from '../../models/api.models';
import { Subject, forkJoin } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-teams',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, MatChipsModule],
  template: `
    <!-- Toast Notifications -->
    <div class="toast-container">
      <div *ngFor="let toast of toasts$ | async" [attr.data-type]="toast.type" class="toast">
        {{ toast.message }}
        <button class="toast-close" (click)="toastService.remove(toast.id)">✕</button>
      </div>
    </div>

    <div class="teams-container">
      <div class="main-header">
        <div style="display: flex; align-items: center; gap: 15px;">
          <h1 style="margin: 0;">Teams & Users Management</h1>
          <div
            *ngIf="userIsTeamLead"
            class="badge-read-only"
            style="padding: 8px 16px; background-color: #fff3cd; border: 1px solid #ffc107; border-radius: 20px; font-size: 13px; font-weight: 500; color: #856404;"
          >
            👁️ View Only Mode
          </div>
        </div>
      </div>

      <!-- Delete Confirmation Dialog -->
      <div
        class="modal-overlay"
        *ngIf="showDeleteConfirmDialog"
        (click)="closeDeleteConfirmDialog()"
      >
        <div class="modal-content confirm-dialog" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>Confirm Delete</h3>
            <button class="close-btn" (click)="closeDeleteConfirmDialog()">✕</button>
          </div>
          <div class="modal-body">
            <p>
              Are you sure you want to delete <strong>{{ deleteConfirmDialog?.name }}</strong
              >?
            </p>
            <p class="warning-text">This action cannot be undone.</p>
          </div>
          <div class="modal-actions">
            <button class="btn-secondary" (click)="closeDeleteConfirmDialog()">Cancel</button>
            <button class="btn-danger" (click)="confirmDelete()">Delete</button>
          </div>
        </div>
      </div>

      <!-- Edit User Modal -->
      <div class="modal-overlay" *ngIf="showEditUserModal" (click)="closeEditUserModal()">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>Edit User</h3>
            <button class="close-btn" (click)="closeEditUserModal()">✕</button>
          </div>
          <form [formGroup]="editUserForm" (ngSubmit)="saveEditUser()" class="form">
            <div class="form-group">
              <label>First Name *</label>
              <input type="text" formControlName="first_name" placeholder="John" />
            </div>
            <div class="form-group">
              <label>Last Name *</label>
              <input type="text" formControlName="last_name" placeholder="Doe" />
            </div>
            <div class="form-group">
              <label>Email *</label>
              <input type="email" formControlName="email" placeholder="john@example.com" />
            </div>
            <div class="form-group">
              <label>Role *</label>
              <select formControlName="role" class="select-input">
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div class="form-actions">
              <button type="submit" class="btn-primary" [disabled]="editUserForm.invalid">
                Save
              </button>
              <button type="button" class="btn-secondary" (click)="closeEditUserModal()">
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Reset Password Modal -->
      <div class="modal-overlay" *ngIf="showResetPasswordModal" (click)="closeResetPasswordModal()">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>Reset Password for {{ editingUser?.first_name }} {{ editingUser?.last_name }}</h3>
            <button class="close-btn" (click)="closeResetPasswordModal()">✕</button>
          </div>
          <form [formGroup]="resetPasswordForm" (ngSubmit)="saveResetPassword()" class="form">
            <div class="form-group">
              <label>New Password *</label>
              <input type="password" formControlName="new_password" placeholder="••••••••" />
            </div>
            <div class="form-group">
              <label>Confirm Password *</label>
              <input type="password" formControlName="confirm_password" placeholder="••••••••" />
            </div>
            <div class="form-actions">
              <button type="submit" class="btn-primary" [disabled]="resetPasswordForm.invalid">
                Reset
              </button>
              <button type="button" class="btn-secondary" (click)="closeResetPasswordModal()">
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Edit Team Modal -->
      <div class="modal-overlay" *ngIf="showEditTeamModal" (click)="closeEditTeamModal()">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>Edit Team</h3>
            <button class="close-btn" (click)="closeEditTeamModal()">✕</button>
          </div>
          <form [formGroup]="editTeamForm" (ngSubmit)="saveEditTeam()" class="form">
            <div class="form-group">
              <label>Team Name *</label>
              <input type="text" formControlName="name" placeholder="Sales Team" />
            </div>
            <div class="form-group">
              <label>Description</label>
              <textarea
                formControlName="description"
                placeholder="Team description..."
                rows="3"
              ></textarea>
            </div>
            <div class="form-group">
              <label>Team Lead (Optional)</label>
              <select formControlName="team_lead_id" class="select-input">
                <option value="">Select team lead...</option>
                <option *ngFor="let user of users" [value]="user.id">
                  {{ user.first_name }} {{ user.last_name }}
                </option>
              </select>
            </div>
            <div class="form-actions">
              <button type="submit" class="btn-primary" [disabled]="editTeamForm.invalid">
                Save
              </button>
              <button type="button" class="btn-secondary" (click)="closeEditTeamModal()">
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Team Activity Modal -->
      <div class="modal-overlay" *ngIf="showTeamActivityModal" (click)="closeTeamActivityModal()">
        <div class="modal-content large-modal" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>Team Activity Log</h3>
            <button class="close-btn" (click)="closeTeamActivityModal()">✕</button>
          </div>
          <div class="activity-log">
            <div *ngIf="selectedTeamActivity.length === 0" class="no-data">
              No activities recorded for this team.
            </div>
            <div *ngFor="let activity of selectedTeamActivity" class="activity-item">
              <div class="activity-type">{{ activity.activity_type }}</div>
              <div class="activity-details">
                <div class="activity-description">
                  {{ activity.details?.description || 'Activity' }}
                </div>
                <div class="activity-meta">{{ activity.created_at | date: 'short' }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Two Column Layout -->
      <div class="management-grid">
        <!-- Users Management Section -->
        <div class="management-panel">
          <div class="panel-header">
            <h2>Users</h2>
            <button class="btn-primary btn-sm" *ngIf="isAdmin" (click)="openNewUserForm()">
              + New User
            </button>
          </div>

          <!-- Create User Modal -->
          <div class="modal-overlay" *ngIf="showNewUserForm" (click)="closeNewUserForm()">
            <div class="modal-content" (click)="$event.stopPropagation()">
              <div class="modal-header">
                <h3>Create New User</h3>
                <button class="close-btn" (click)="closeNewUserForm()">✕</button>
              </div>
              <form [formGroup]="userForm" (ngSubmit)="createNewUser()" class="form">
                <div class="form-group">
                  <label>First Name *</label>
                  <input type="text" formControlName="first_name" placeholder="John" />
                </div>
                <div class="form-group">
                  <label>Last Name *</label>
                  <input type="text" formControlName="last_name" placeholder="Doe" />
                </div>
                <div class="form-group">
                  <label>Email *</label>
                  <input type="email" formControlName="email" placeholder="john@example.com" />
                </div>
                <div class="form-group">
                  <label>Password *</label>
                  <input type="password" formControlName="password" placeholder="••••••••" />
                </div>
                <div class="form-group">
                  <label>Role *</label>
                  <select formControlName="role" class="select-input">
                    <option value="">Select a role</option>
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div class="form-actions">
                  <button
                    type="submit"
                    class="btn-primary"
                    [disabled]="userForm.invalid || isCreatingUser"
                  >
                    {{ isCreatingUser ? 'Creating...' : 'Create User' }}
                  </button>
                  <button type="button" class="btn-secondary" (click)="closeNewUserForm()">
                    Cancel
                  </button>
                </div>
                <div class="error-message" *ngIf="userFormError">{{ userFormError }}</div>
              </form>
            </div>
          </div>

          <!-- User Search -->
          <div class="search-bar">
            <input
              type="text"
              [(ngModel)]="userSearchQuery"
              placeholder="Search users by name or email..."
              class="search-input"
            />
            <button
              *ngIf="userSearchQuery"
              (click)="userSearchQuery = ''"
              class="search-clear-btn"
              title="Clear search"
            >
              ✕
            </button>
          </div>

          <!-- User List Sort Header -->
          <div class="list-header" *ngIf="users && users.length > 0">
            <div class="header-cell name-col" (click)="setUserSort('name')" title="Click to sort">
              Name {{ usersSortBy === 'name' ? (sortAsc ? '↑' : '↓') : '' }}
            </div>
            <div class="header-cell email-col" (click)="setUserSort('email')" title="Click to sort">
              Email {{ usersSortBy === 'email' ? (sortAsc ? '↑' : '↓') : '' }}
            </div>
            <div class="header-cell role-col">Role</div>
            <div class="header-cell actions-col">Actions</div>
          </div>

          <!-- Users List -->
          <div
            class="items-list"
            *ngIf="users && users.length > 0 && getFilteredUsers().length > 0"
          >
            <div *ngFor="let user of getFilteredUsers()" class="list-item user-row">
              <div class="item-content">
                <div class="item-avatar">
                  {{ (user.first_name || 'U').charAt(0) }}{{ (user.last_name || '').charAt(0) }}
                </div>
                <div class="item-details">
                  <div class="item-name">
                    {{ user.first_name }} {{ user.last_name }}
                    <span *ngIf="isUserOwner(user.id!)" class="badge badge-super-admin"
                      >👑 Super Admin</span
                    >
                  </div>
                  <div class="item-meta">{{ user.email }}</div>
                </div>
              </div>

              <div class="item-role">
                <span class="badge badge-role">{{ getRoleLabel(user.role) }}</span>
                <span *ngIf="isUserSuspended(user)" class="badge badge-suspended">Suspended</span>
                <span *ngIf="!isUserSuspended(user)" class="badge badge-active">Active</span>
              </div>

              <div class="item-actions">
                <button
                  class="btn-icon btn-secondary"
                  *ngIf="isAdmin"
                  (click)="openEditUserModal(user)"
                  title="Edit user"
                >
                  ✎
                </button>
                <button
                  class="btn-icon btn-secondary"
                  *ngIf="isAdmin"
                  (click)="openResetPasswordModal(user)"
                  title="Reset password"
                >
                  🔑
                </button>
                <button
                  *ngIf="isUserSuspended(user)"
                  class="btn-icon btn-success"
                  (click)="activateUser(user)"
                  title="Activate user"
                >
                  ✓
                </button>
                <button
                  *ngIf="!isUserSuspended(user) && !isUserOwner(user.id!)"
                  class="btn-icon btn-warning"
                  (click)="suspendUser(user)"
                  title="Suspend user"
                >
                  ⏸
                </button>
                <button
                  class="btn-icon btn-danger"
                  *ngIf="isAdmin && !isUserOwner(user.id!)"
                  (click)="
                    openDeleteConfirmDialog(
                      'user',
                      user.id!,
                      user.first_name + ' ' + user.last_name
                    )
                  "
                  title="Delete user"
                >
                  🗑
                </button>
              </div>
            </div>
          </div>

          <!-- Pagination -->
          <div class="pagination" *ngIf="users && users.length > usersPageSize">
            <button
              (click)="prevUsersPage()"
              [disabled]="usersPage === 0"
              class="btn-sm btn-secondary"
            >
              ← Previous
            </button>
            <span class="page-info">Page {{ usersPage + 1 }}</span>
            <button
              (click)="nextUsersPage()"
              [disabled]="(usersPage + 1) * usersPageSize >= users.length"
              class="btn-sm btn-secondary"
            >
              Next →
            </button>
          </div>

          <div class="empty-state" *ngIf="!users || users.length === 0">
            <p>{{ isLoading ? 'Loading users...' : 'No users yet. Create your first user!' }}</p>
          </div>

          <div
            class="no-results"
            *ngIf="users && users.length > 0 && getFilteredUsers().length === 0"
          >
            <p>No users found matching your search.</p>
          </div>
        </div>

        <!-- Teams Management Section -->
        <div class="management-panel">
          <div class="panel-header">
            <h2>Teams</h2>
            <button class="btn-primary btn-sm" *ngIf="isAdmin" (click)="openNewTeamForm()">
              + New Team
            </button>
          </div>

          <!-- Create Team Modal -->
          <div class="modal-overlay" *ngIf="showNewTeamForm" (click)="closeNewTeamForm()">
            <div class="modal-content" (click)="$event.stopPropagation()">
              <div class="modal-header">
                <h3>Create New Team</h3>
                <button class="close-btn" (click)="closeNewTeamForm()">✕</button>
              </div>
              <form [formGroup]="teamForm" (ngSubmit)="createNewTeam()" class="form">
                <div class="form-group">
                  <label>Team Name *</label>
                  <input type="text" formControlName="name" placeholder="Sales Team" />
                </div>
                <div class="form-group">
                  <label>Description</label>
                  <textarea
                    formControlName="description"
                    placeholder="Team description..."
                    rows="3"
                  ></textarea>
                </div>
                <div class="form-group">
                  <label>Team Lead (Optional)</label>
                  <select formControlName="team_lead_id" class="select-input">
                    <option value="">Select team lead...</option>
                    <option *ngFor="let user of users" [value]="user.id">
                      {{ user.first_name }} {{ user.last_name }}
                    </option>
                  </select>
                </div>
                <div class="form-actions">
                  <button
                    type="submit"
                    class="btn-primary"
                    [disabled]="teamForm.invalid || isCreating"
                  >
                    {{ isCreating ? 'Creating...' : 'Create Team' }}
                  </button>
                  <button type="button" class="btn-secondary" (click)="closeNewTeamForm()">
                    Cancel
                  </button>
                </div>
                <div class="error-message" *ngIf="formError">{{ formError }}</div>
              </form>
            </div>
          </div>

          <!-- Team Search -->
          <div class="search-bar">
            <input
              type="text"
              [(ngModel)]="teamSearchQuery"
              placeholder="Search teams by name..."
              class="search-input"
            />
            <button
              *ngIf="teamSearchQuery"
              (click)="teamSearchQuery = ''"
              class="search-clear-btn"
              title="Clear search"
            >
              ✕
            </button>
          </div>

          <!-- Team List Sort Header -->
          <div class="list-header" *ngIf="teams && teams.length > 0">
            <div class="header-cell name-col" (click)="setTeamSort('name')" title="Click to sort">
              Name {{ teamsSortBy === 'name' ? (sortAsc ? '↑' : '↓') : '' }}
            </div>
            <div
              class="header-cell members-col"
              (click)="setTeamSort('members')"
              title="Click to sort"
            >
              Members {{ teamsSortBy === 'members' ? (sortAsc ? '↑' : '↓') : '' }}
            </div>
            <div class="header-cell actions-col">Actions</div>
          </div>

          <!-- Teams List -->
          <div class="items-list" *ngIf="teams.length > 0 && getFilteredTeams().length > 0">
            <div *ngFor="let team of getFilteredTeams()" class="list-item expandable">
              <div class="item-header" (click)="toggleTeamExpand(team.id)">
                <div class="item-content">
                  <div class="expand-icon">{{ expandedTeamId === team.id ? '▼' : '▶' }}</div>
                  <div class="item-details">
                    <div class="item-name">{{ team.name }}</div>
                    <div class="item-meta">
                      <span class="badge badge-members"
                        >{{ team.members?.length || 0 }} members</span
                      >
                      <span *ngIf="teamLeadMap.get(team.id)" class="badge badge-team-lead"
                        >👑 Team Lead</span
                      >
                    </div>
                    <div class="item-description" *ngIf="team.description">
                      {{ team.description }}
                    </div>
                  </div>
                </div>

                <div class="item-actions">
                  <button
                    class="btn-icon btn-secondary"
                    *ngIf="isAdmin"
                    (click)="openEditTeamModal(team); $event.stopPropagation()"
                    title="Edit team"
                  >
                    ✎
                  </button>
                  <button
                    class="btn-icon btn-secondary"
                    (click)="openTeamActivityModal(team); $event.stopPropagation()"
                    title="View activity log"
                  >
                    📜
                  </button>
                  <button
                    class="btn-icon btn-danger"
                    *ngIf="isAdmin"
                    (click)="
                      openDeleteConfirmDialog('team', team.id, team.name); $event.stopPropagation()
                    "
                    title="Delete team"
                  >
                    🗑
                  </button>
                </div>
              </div>

              <!-- Team Members (Expandable) -->
              <div class="item-details-panel" *ngIf="expandedTeamId === team.id">
                <div class="members-section">
                  <h4>Members</h4>
                  <div *ngIf="team.members && team.members.length > 0" class="sub-list">
                    <div *ngFor="let member of team.members" class="sub-item">
                      <div class="sub-item-content">
                        <span class="member-name"
                          >{{ member.user?.first_name }} {{ member.user?.last_name }}</span
                        >
                        <span
                          class="member-role"
                          [class.team-lead]="isTeamLead(team.id, member.id)"
                          >{{
                            isTeamLead(team.id, member.id)
                              ? '👑 Team Lead'
                              : member.role || 'Member'
                          }}</span
                        >
                      </div>
                      <div class="member-actions" *ngIf="isAdmin">
                        <button
                          class="btn-icon-small"
                          [class.active]="isTeamLead(team.id, member.id)"
                          (click)="setTeamLead(team.id, member.id)"
                          title="Set as team lead"
                        >
                          👑
                        </button>
                        <span class="member-badge">Member</span>
                        <button
                          class="btn-icon btn-small"
                          (click)="removeMember(team.id, member.id)"
                          title="Remove member"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  </div>
                  <p *ngIf="!team.members || team.members.length === 0" class="no-data">
                    No members yet
                  </p>
                </div>

                <!-- Add Member -->
                <div class="add-member-section" *ngIf="isAdmin">
                  <select
                    [ngModel]="selectedUserMap.get(team.id)"
                    (change)="onUserSelected($event, team.id)"
                    class="select-input"
                  >
                    <option value="">Select user to add...</option>
                    <option *ngFor="let user of users" [value]="user.id">
                      {{ user.first_name }} {{ user.last_name }}
                    </option>
                  </select>
                  <button class="btn-primary btn-sm" (click)="addMember(team.id)">
                    Add Member
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Pagination -->
          <div class="pagination" *ngIf="teams && teams.length > teamsPageSize">
            <button
              (click)="prevTeamsPage()"
              [disabled]="teamsPage === 0"
              class="btn-sm btn-secondary"
            >
              ← Previous
            </button>
            <span class="page-info">Page {{ teamsPage + 1 }}</span>
            <button
              (click)="nextTeamsPage()"
              [disabled]="(teamsPage + 1) * teamsPageSize >= teams.length"
              class="btn-sm btn-secondary"
            >
              Next →
            </button>
          </div>

          <div class="empty-state" *ngIf="teams.length === 0 && !isLoading">
            <p>No teams yet. Create your first team!</p>
          </div>

          <div
            class="no-results"
            *ngIf="teams && teams.length > 0 && getFilteredTeams().length === 0"
          >
            <p>No teams found matching your search.</p>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div class="loading-overlay" *ngIf="isLoading">
        <div class="spinner"></div>
        <p>Loading...</p>
      </div>
    </div>
  `,
  styles: [
    `
      .teams-container {
        background: #f5f7fa;
        min-height: 100vh;
        padding: 20px;
      }

      .main-header {
        max-width: 1400px;
        margin: 0 auto 30px;
      }

      .main-header h1 {
        margin: 0;
        color: #1f2937;
        font-size: 28px;
      }

      .management-grid {
        max-width: 1400px;
        margin: 0 auto;
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 24px;
      }

      .management-panel {
        background: white;
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
        overflow: hidden;
      }

      .panel-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 20px;
        border-bottom: 1px solid #e5e7eb;
        background: #f9fafb;
      }

      .panel-header h2 {
        margin: 0;
        color: #1f2937;
        font-size: 18px;
      }

      .btn-primary {
        background: #0284c7;
        color: white;
        border: none;
        padding: 10px 16px;
        border-radius: 6px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
        font-size: 14px;
      }

      .btn-primary:hover {
        background: #0369a1;
      }

      .btn-sm {
        padding: 8px 12px;
        font-size: 13px;
      }

      .btn-secondary {
        background: #e5e7eb;
        color: #1f2937;
        border: none;
        padding: 10px 16px;
        border-radius: 6px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
      }

      .btn-secondary:hover {
        background: #d1d5db;
      }

      .modal-overlay {
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
        border-radius: 8px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        max-width: 500px;
        width: 90%;
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
        color: #1f2937;
      }

      .close-btn {
        background: none;
        border: none;
        font-size: 20px;
        color: #9ca3af;
        cursor: pointer;
        padding: 0;
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
        font-weight: 600;
        color: #374151;
        font-size: 13px;
      }

      .form-group input,
      .form-group textarea,
      .form-group select {
        width: 100%;
        padding: 10px;
        border: 1px solid #d1d5db;
        border-radius: 6px;
        font-size: 14px;
        font-family: inherit;
        box-sizing: border-box;
      }

      .form-group input:focus,
      .form-group textarea:focus,
      .form-group select:focus {
        outline: none;
        border-color: #0284c7;
        box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.1);
      }

      .form-actions {
        display: flex;
        gap: 10px;
        margin-top: 20px;
      }

      .form-actions button {
        flex: 1;
      }

      .error-message {
        color: #991b1b;
        background: #fee2e2;
        padding: 10px;
        border-radius: 6px;
        font-size: 13px;
        margin-top: 12px;
      }

      .items-list {
        display: flex;
        flex-direction: column;
        gap: 0;
        padding: 0;
      }

      .list-item {
        border-bottom: 1px solid #f3f4f6;
        padding: 12px 16px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        transition: all 0.2s;
      }

      .list-item:hover {
        background: #f9fafb;
      }

      .list-item.expandable .item-header {
        width: 100%;
        cursor: pointer;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .item-content {
        display: flex;
        align-items: center;
        gap: 12px;
        flex: 1;
      }

      .item-avatar {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: #dbeafe;
        color: #0284c7;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        font-weight: 600;
        flex-shrink: 0;
      }

      .item-details {
        flex: 1;
      }

      .item-name {
        font-weight: 600;
        color: #1f2937;
        font-size: 14px;
      }

      .item-meta {
        font-size: 12px;
        color: #6b7280;
      }

      .expand-icon {
        color: #9ca3af;
        font-size: 12px;
        margin-right: 8px;
      }

      .btn-icon {
        background: none;
        border: none;
        font-size: 16px;
        cursor: pointer;
        padding: 4px;
        border-radius: 4px;
        transition: all 0.2s;
      }

      .btn-icon:hover {
        background: #f3f4f6;
      }

      .btn-danger {
        color: #ef4444;
      }

      .btn-small {
        font-size: 12px;
      }

      .item-details-panel {
        background: #f9fafb;
        padding: 12px 16px;
        border-top: 1px solid #e5e7eb;
      }

      .members-section h4 {
        margin: 0 0 10px 0;
        color: #374151;
        font-size: 13px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.3px;
      }

      .sub-list {
        display: flex;
        flex-direction: column;
        gap: 6px;
        margin-bottom: 12px;
      }

      .sub-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px;
        background: white;
        border-radius: 4px;
        font-size: 13px;
      }

      .sub-item-content {
        display: flex;
        align-items: center;
        gap: 12px;
        flex: 1;
      }

      .member-name {
        color: #1f2937;
        font-weight: 500;
      }

      .member-role {
        color: #9ca3af;
        font-size: 11px;
      }

      .no-data {
        color: #9ca3af;
        font-size: 12px;
        margin: 0;
      }

      .add-member-section {
        display: flex;
        gap: 8px;
        padding-top: 12px;
        border-top: 1px solid #e5e7eb;
      }

      .select-input {
        flex: 1;
        padding: 8px;
        border: 1px solid #d1d5db;
        border-radius: 4px;
        font-size: 13px;
        cursor: pointer;
      }

      .select-input:focus {
        outline: none;
        border-color: #0284c7;
      }

      .empty-state {
        padding: 40px 20px;
        text-align: center;
        color: #9ca3af;
        font-size: 13px;
      }

      .loading-overlay {
        position: fixed;
        inset: 0;
        background: rgba(255, 255, 255, 0.9);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        z-index: 999;
      }

      .spinner {
        width: 40px;
        height: 40px;
        border: 4px solid #f0f0f0;
        border-top-color: #0284c7;
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }

      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }

      .loading-overlay p {
        margin-top: 12px;
        color: #6b7280;
      }

      .item-description {
        font-size: 12px;
        color: #9ca3af;
        margin-top: 4px;
        max-width: 300px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .member-actions {
        display: flex;
        gap: 8px;
        align-items: center;
      }

      .member-badge {
        color: #9ca3af;
        font-size: 11px;
        background: #f3f4f6;
        padding: 2px 6px;
        border-radius: 3px;
      }

      .btn-icon-small {
        background: none;
        border: none;
        cursor: pointer;
        font-size: 16px;
        padding: 4px;
        border-radius: 4px;
        transition: all 0.2s;
      }

      .btn-icon-small:hover {
        background: #e5e7eb;
      }

      .btn-icon-small.active {
        color: #fbbf24;
        background: #fef3c7;
      }

      .team-lead {
        color: #f59e0b;
        font-weight: 600;
      }

      /* Toast Notifications */
      .toast-container {
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 2000;
        display: flex;
        flex-direction: column;
        gap: 12px;
        max-width: 400px;
      }

      .toast {
        background: white;
        padding: 12px 16px;
        border-radius: 6px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 12px;
        animation: slideIn 0.3s ease-out;
        border-left: 4px solid #0284c7;
        font-size: 14px;
      }

      .toast[data-type='success'] {
        border-left-color: #22c55e;
        color: #15803d;
      }

      .toast[data-type='error'] {
        border-left-color: #ef4444;
        color: #991b1b;
      }

      .toast[data-type='warning'] {
        border-left-color: #f59e0b;
        color: #92400e;
      }

      .toast[data-type='info'] {
        border-left-color: #0284c7;
        color: #0c4a6e;
      }

      .toast-close {
        background: none;
        border: none;
        cursor: pointer;
        color: #9ca3af;
        font-size: 18px;
        padding: 0;
        flex-shrink: 0;
      }

      .toast-close:hover {
        color: #6b7280;
      }

      @keyframes slideIn {
        from {
          transform: translateX(400px);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }

      /* Search Bar */
      .search-bar {
        display: flex;
        gap: 8px;
        margin-bottom: 16px;
        align-items: center;
      }

      .search-input {
        flex: 1;
        padding: 10px 12px;
        border: 1px solid #d1d5db;
        border-radius: 6px;
        font-size: 14px;
        color: #1f2937;
      }

      .search-input::placeholder {
        color: #9ca3af;
      }

      .search-input:focus {
        outline: none;
        border-color: #0284c7;
        box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.1);
      }

      .search-clear-btn {
        background: #e5e7eb;
        border: none;
        width: 36px;
        height: 36px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 16px;
        color: #6b7280;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
      }

      .search-clear-btn:hover {
        background: #d1d5db;
        color: #1f2937;
      }

      /* List Header (Sort) */
      .list-header {
        display: grid;
        grid-template-columns: 2fr 2fr 1fr;
        gap: 16px;
        padding: 12px 16px;
        background: #f3f4f6;
        border-bottom: 1px solid #e5e7eb;
        font-weight: 600;
        font-size: 13px;
        color: #6b7280;
      }

      .list-header .header-cell {
        cursor: pointer;
        user-select: none;
        transition: all 0.2s;
        padding: 4px 0;
      }

      .list-header .header-cell:hover {
        color: #1f2937;
        background: rgba(0, 0, 0, 0.05);
        border-radius: 4px;
      }

      .header-cell.name-col {
        grid-column: 1;
      }

      .header-cell.email-col {
        grid-column: 2;
      }

      .header-cell.role-col {
        grid-column: 3;
      }

      .header-cell.actions-col {
        text-align: right;
      }

      .header-cell.members-col {
        grid-column: 2;
      }

      /* User Row Styling */
      .user-row {
        display: grid;
        grid-template-columns: 2fr 2fr 1fr;
        gap: 16px;
        padding: 12px 16px;
        align-items: center;
      }

      .item-role {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        align-items: center;
      }

      .item-actions {
        display: flex;
        gap: 8px;
        justify-content: flex-end;
      }

      /* Badges */
      .badge {
        display: inline-block;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 11px;
        font-weight: 600;
        white-space: nowrap;
        text-transform: uppercase;
        letter-spacing: 0.3px;
      }

      .badge-super-admin {
        background: #fef3c7;
        color: #92400e;
      }

      .badge-role {
        background: #dbeafe;
        color: #0c4a6e;
      }

      .badge-active {
        background: #dcfce7;
        color: #166534;
      }

      .badge-suspended {
        background: #fee2e2;
        color: #991b1b;
      }

      .badge-members {
        background: #e0e7ff;
        color: #3730a3;
      }

      .badge-team-lead {
        background: #fef3c7;
        color: #92400e;
      }

      /* Button Variants */
      .btn-success {
        color: #22c55e;
      }

      .btn-success:hover {
        background: #dcfce7;
      }

      .btn-warning {
        color: #f59e0b;
      }

      .btn-warning:hover {
        background: #fef3c7;
      }

      .btn-danger:hover {
        background: #fee2e2;
      }

      /* Pagination */
      .pagination {
        display: flex;
        gap: 8px;
        justify-content: center;
        align-items: center;
        padding: 16px;
        margin-top: 16px;
        border-top: 1px solid #e5e7eb;
      }

      .page-info {
        color: #6b7280;
        font-size: 13px;
        font-weight: 500;
        padding: 0 8px;
      }

      .pagination button {
        padding: 8px 12px;
        border: 1px solid #d1d5db;
        background: white;
        border-radius: 4px;
        cursor: pointer;
        font-size: 13px;
        font-weight: 500;
        transition: all 0.2s;
      }

      .pagination button:hover:not(:disabled) {
        background: #f3f4f6;
        border-color: #9ca3af;
      }

      .pagination button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      /* No Results */
      .no-results {
        padding: 20px;
        text-align: center;
        color: #9ca3af;
        font-size: 14px;
      }

      /* Modal Styles */
      .confirm-dialog {
        max-width: 400px;
      }

      .modal-body {
        padding: 20px;
      }

      .modal-body p {
        margin: 0 0 12px 0;
        color: #1f2937;
        font-size: 14px;
        line-height: 1.5;
      }

      .warning-text {
        color: #991b1b;
        font-size: 12px;
        margin: 0;
      }

      .modal-actions {
        display: flex;
        gap: 10px;
        padding: 16px 20px;
        border-top: 1px solid #e5e7eb;
        background: #f9fafb;
      }

      .modal-actions button {
        flex: 1;
      }

      .large-modal {
        max-width: 600px;
      }

      .activity-log {
        max-height: 400px;
        overflow-y: auto;
        padding: 16px;
      }

      .activity-item {
        display: flex;
        gap: 12px;
        padding: 12px;
        border-bottom: 1px solid #e5e7eb;
        font-size: 13px;
      }

      .activity-item:last-child {
        border-bottom: none;
      }

      .activity-type {
        background: #dbeafe;
        color: #0c4a6e;
        padding: 4px 8px;
        border-radius: 4px;
        font-weight: 600;
        white-space: nowrap;
        flex-shrink: 0;
        font-size: 11px;
        text-transform: uppercase;
      }

      .activity-details {
        flex: 1;
      }

      .activity-description {
        color: #1f2937;
        font-weight: 500;
        margin-bottom: 4px;
      }

      .activity-meta {
        color: #9ca3af;
        font-size: 12px;
      }

      @media (max-width: 768px) {
        .management-grid {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class TeamsComponent implements OnInit, OnDestroy {
  teams: Team[] = [];
  users: User[] = [];
  teamForm: FormGroup;
  userForm: FormGroup;
  showNewTeamForm = false;
  showNewUserForm = false;
  expandedTeamId: string | null = null;
  isLoading = false;
  isCreating = false;
  isCreatingUser = false;
  formError = '';
  userFormError = '';
  companyOwnerId: string | null = null;
  isAdmin = false;
  userIsTeamLead = false;
  selectedUserMap: Map<string, string> = new Map();
  teamLeadMap: Map<string, string> = new Map();

  // New Feature Properties
  toasts$: any;
  showDeleteConfirmDialog = false;
  deleteConfirmDialog: { type: 'user' | 'team'; id: string; name: string } | null = null;
  showEditUserModal = false;
  editingUser: User | null = null;
  editUserForm!: FormGroup;
  showResetPasswordModal = false;
  resetPasswordForm!: FormGroup;
  showEditTeamModal = false;
  editingTeam: Team | null = null;
  editTeamForm!: FormGroup;
  showTeamActivityModal = false;
  selectedTeamActivity: any[] = [];

  // Search & Filter
  userSearchQuery = '';
  teamSearchQuery = '';

  // Pagination
  usersPage = 0;
  usersPageSize = 20;
  teamsPage = 0;
  teamsPageSize = 10;

  // Sorting
  usersSortBy: 'name' | 'email' = 'name';
  teamsSortBy: 'name' | 'created_at' | 'members' = 'name';
  sortAsc = true;

  // Track suspended users locally
  suspendedUserIds = new Set<string>();

  private destroy$ = new Subject<void>();

  constructor(
    private teamService: TeamService,
    private userService: UserService,
    private authService: AuthService,
    private tenantService: TenantService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef,
    public toastService: ToastService,
  ) {
    this.teamForm = this.fb.group({
      name: ['', Validators.required],
      description: [''],
      team_lead_id: [''],
    });
    this.userForm = this.fb.group({
      first_name: ['', Validators.required],
      last_name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      role: ['user', Validators.required],
    });
    this.editUserForm = this.fb.group({
      first_name: ['', Validators.required],
      last_name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      role: ['user', Validators.required],
    });
    this.resetPasswordForm = this.fb.group({
      new_password: ['', [Validators.required, Validators.minLength(6)]],
      confirm_password: ['', [Validators.required, Validators.minLength(6)]],
    });
    this.editTeamForm = this.fb.group({
      name: ['', Validators.required],
      description: [''],
      team_lead_id: [''],
    });

    // Subscribe to toast notifications
    this.toasts$ = this.toastService.toasts;
  }

  ngOnInit(): void {
    // Get current user and determine if admin
    const currentUser = this.authService.getCurrentUser();
    this.isAdmin = currentUser?.role === 'admin';

    // Get current company owner
    const currentTenant = this.tenantService.getCurrentTenant();
    if (currentTenant) {
      this.companyOwnerId = currentTenant.owner_id || null;
    }

    this.loadUsers();
    this.loadTeams();

    // Check if current user is a team lead
    if (!this.isAdmin && currentUser) {
      this.teamService
        .getTeams(0, 1000)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (teams) => {
            this.userIsTeamLead = teams.some((team) => team.team_lead_id === currentUser.id);
          },
        });
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadTeams(): void {
    this.isLoading = true;
    this.teamService
      .getTeams(0, 100)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (teams) => {
          this.teams = teams;

          // Load team_lead_id from backend into local map
          teams.forEach((team) => {
            if (team.team_lead_id) {
              this.teamLeadMap.set(team.id, team.team_lead_id);
            }
          });

          // Detect if current user is a team lead
          const currentUser = this.authService.getCurrentUser();
          if (!this.isAdmin && currentUser) {
            this.userIsTeamLead = teams.some((team) => team.team_lead_id === currentUser.id);
          }

          if (teams.length > 0) {
            const memberRequests = teams.map((team) =>
              this.teamService.getTeamMembers(team.id).pipe(takeUntil(this.destroy$)),
            );

            forkJoin(memberRequests).subscribe({
              next: (memberArrays) => {
                const allMembers = memberArrays.flat();
                const uniqueUserIds = Array.from(
                  new Set(allMembers.filter((m) => m.user_id).map((m) => m.user_id)),
                ) as string[];

                if (uniqueUserIds.length > 0) {
                  const userRequests = uniqueUserIds.map((userId) =>
                    this.userService.getUser(userId).pipe(takeUntil(this.destroy$)),
                  );

                  forkJoin(userRequests).subscribe({
                    next: (users: any[]) => {
                      const userMap = new Map(users.filter((u) => u).map((u) => [u.id, u]));

                      teams.forEach((team, teamIndex) => {
                        team.members = (memberArrays[teamIndex] || []).map((member) => ({
                          ...member,
                          user: member.user_id ? userMap.get(member.user_id) : undefined,
                        }));
                      });
                      this.isLoading = false;
                      this.cdr.markForCheck();
                    },
                    error: () => {
                      this.isLoading = false;
                      this.cdr.markForCheck();
                    },
                  });
                } else {
                  this.isLoading = false;
                  this.cdr.markForCheck();
                }
              },
              error: () => {
                this.isLoading = false;
                this.cdr.markForCheck();
              },
            });
          } else {
            this.isLoading = false;
            this.cdr.markForCheck();
          }
        },
        error: () => {
          this.isLoading = false;
          this.cdr.markForCheck();
        },
      });
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
        error: (error) => {
          this.cdr.markForCheck();
        },
      });
  }

  openNewTeamForm(): void {
    this.showNewTeamForm = true;
    this.formError = '';
    this.teamForm.reset();
  }

  closeNewTeamForm(): void {
    this.showNewTeamForm = false;
    this.teamForm.reset();
  }

  createNewTeam(): void {
    if (this.teamForm.invalid) return;

    this.isCreating = true;
    this.formError = '';
    const teamData = this.teamForm.value;

    // Get current user and company info
    const currentUser = this.authService.getCurrentUser();
    const currentTenant = this.tenantService.getCurrentTenant();

    if (!currentUser || !currentTenant) {
      this.formError = 'Missing user or company context';
      this.isCreating = false;
      return;
    }

    // Add required fields for backend
    const teamDataWithContext = {
      ...teamData,
      company_id: currentTenant.id,
      created_by: currentUser.id,
    };

    this.teamService
      .createTeam(teamDataWithContext)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (team) => {
          this.teams.unshift(team);
          // Initialize team_lead_id in map if it exists
          if (team.team_lead_id) {
            this.teamLeadMap.set(team.id, team.team_lead_id);
          }
          this.closeNewTeamForm();
          this.isCreating = false;
        },
        error: (error) => {
          this.formError = error.message || 'Failed to create team';
          this.isCreating = false;
        },
      });
  }

  deleteTeam(teamId: string): void {
    if (!confirm('Are you sure you want to delete this team?')) return;

    this.teamService
      .deleteTeam(teamId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.teams = this.teams.filter((t) => t.id !== teamId);
        },
        error: (error) => {},
      });
  }

  onUserSelected(event: any, teamId: string): void {
    const userId = event.target.value;
    this.selectedUserMap.set(teamId, userId);
  }

  addMember(teamId: string): void {
    const userId = this.selectedUserMap.get(teamId) || '';

    if (!userId.trim()) {
      alert('Please select a user to add');
      return;
    }

    this.teamService
      .addTeamMember(teamId, userId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (member) => {
          const team = this.teams.find((t) => t.id === teamId);
          if (team) {
            if (!team.members) team.members = [];
            this.userService
              .getUser(userId)
              .pipe(takeUntil(this.destroy$))
              .subscribe({
                next: (user: any) => {
                  member.user = user;
                  member.role = 'Member';
                  team.members!.push(member);
                  this.selectedUserMap.set(teamId, '');
                  this.cdr.markForCheck();
                },
              });
          }
        },
        error: (error) => {
          alert('Failed to add member: ' + error?.message || 'Unknown error');
        },
      });
  }

  removeMember(teamId: string, memberId: string): void {
    this.teamService
      .removeTeamMember(teamId, memberId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          const team = this.teams.find((t) => t.id === teamId);
          if (team && team.members) {
            team.members = team.members.filter((m) => m.id !== memberId);
          }
        },
        error: (err: any) => {},
      });
  }

  toggleTeamExpand(teamId: string): void {
    this.expandedTeamId = this.expandedTeamId === teamId ? null : teamId;
  }

  // User Management Methods
  openNewUserForm(): void {
    this.showNewUserForm = true;
    this.userFormError = '';
    this.userForm.reset();
  }

  closeNewUserForm(): void {
    this.showNewUserForm = false;
    this.userForm.reset();
  }

  createNewUser(): void {
    // Only admins can create users
    if (!this.isAdmin) {
      this.userFormError = 'Only admins can create users';
      return;
    }

    if (this.userForm.invalid) return;

    this.isCreatingUser = true;
    this.userFormError = '';
    const userData = this.userForm.value;

    this.userService
      .createUser(userData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (user: any) => {
          this.users.push(user);
          this.closeNewUserForm();
          this.isCreatingUser = false;
          this.cdr.markForCheck();
        },
        error: (error) => {
          this.userFormError = error?.message || 'Failed to create user';
          this.isCreatingUser = false;
        },
      });
  }

  isUserOwner(userId: string): boolean {
    // Check if user is an admin based on role
    // (Note: companyOwnerId check was unreliable, so we use role-based identification)
    const user = this.users.find((u) => u.id === userId);
    return user ? user.role === 'admin' : false;
  }

  deleteUser(userId: string): void {
    // Only admins can delete users
    if (!this.isAdmin) {
      alert('Only admins can delete users');
      return;
    }

    this.userService
      .deleteUser(userId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.users = this.users.filter((u) => u.id !== userId);
          this.cdr.markForCheck();
        },
        error: (error) => {},
      });
  }

  // Team Lead Management
  setTeamLead(teamId: string, memberId: string): void {
    const isCurrentLead = this.isTeamLead(teamId, memberId);
    const newTeamLeadId = isCurrentLead ? null : memberId;

    // Update backend
    this.teamService
      .updateTeam(teamId, { team_lead_id: newTeamLeadId })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updatedTeam) => {
          // Update local state
          const team = this.teams.find((t) => t.id === teamId);
          if (team) {
            team.team_lead_id = updatedTeam.team_lead_id;
            if (newTeamLeadId) {
              this.teamLeadMap.set(teamId, memberId);
            } else {
              this.teamLeadMap.delete(teamId);
            }
          }
          this.cdr.markForCheck();
        },
        error: (error) => {
          alert('Failed to update team lead: ' + error?.message || 'Unknown error');
        },
      });
  }

  isTeamLead(teamId: string, memberId: string): boolean {
    const team = this.teams.find((t) => t.id === teamId);
    return team ? team.team_lead_id === memberId : false;
  }

  // ============ NEW FEATURES: Delete Confirmation ============
  openDeleteConfirmDialog(type: 'user' | 'team', id: string, name: string): void {
    this.deleteConfirmDialog = { type, id, name };
    this.showDeleteConfirmDialog = true;
  }

  closeDeleteConfirmDialog(): void {
    this.showDeleteConfirmDialog = false;
    this.deleteConfirmDialog = null;
  }

  confirmDelete(): void {
    if (!this.deleteConfirmDialog) return;

    const { type, id } = this.deleteConfirmDialog;
    this.closeDeleteConfirmDialog();

    if (type === 'user') {
      this.deleteUserConfirmed(id);
    } else {
      this.deleteTeamConfirmed(id);
    }
  }

  private deleteUserConfirmed(userId: string): void {
    if (!this.isAdmin) {
      this.toastService.error('Only admins can delete users');
      return;
    }

    this.userService
      .deleteUser(userId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.users = this.users.filter((u) => u.id !== userId);
          this.toastService.success('User deleted successfully');
          this.cdr.markForCheck();
        },
        error: (error) => {
          this.toastService.error('Failed to delete user: ' + (error?.message || 'Unknown error'));
        },
      });
  }

  private deleteTeamConfirmed(teamId: string): void {
    if (!this.isAdmin) {
      this.toastService.error('Only admins can delete teams');
      return;
    }

    this.teamService
      .deleteTeam(teamId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.teams = this.teams.filter((t) => t.id !== teamId);
          this.toastService.success('Team deleted successfully');
          this.cdr.markForCheck();
        },
        error: (error) => {
          this.toastService.error('Failed to delete team: ' + (error?.message || 'Unknown error'));
        },
      });
  }

  // ============ NEW FEATURES: Edit User ============
  openEditUserModal(user: User): void {
    this.editingUser = user;
    this.editUserForm.patchValue({
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      role: user.role || 'user',
    });
    this.showEditUserModal = true;
  }

  closeEditUserModal(): void {
    this.showEditUserModal = false;
    this.editingUser = null;
    this.editUserForm.reset();
  }

  saveEditUser(): void {
    if (!this.editingUser || !this.editingUser.id || this.editUserForm.invalid) return;

    const userData = this.editUserForm.value;
    this.userService
      .updateUser(this.editingUser.id, userData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updatedUser) => {
          const index = this.users.findIndex((u) => u.id === this.editingUser!.id);
          if (index !== -1) {
            this.users[index] = updatedUser;
            this.toastService.success('User updated successfully');
          }
          this.closeEditUserModal();
          this.cdr.markForCheck();
        },
        error: (error) => {
          this.toastService.error('Failed to update user: ' + (error?.message || 'Unknown error'));
        },
      });
  }

  // ============ NEW FEATURES: Reset Password ============
  openResetPasswordModal(user: User): void {
    this.editingUser = user;
    this.resetPasswordForm.reset();
    this.showResetPasswordModal = true;
  }

  closeResetPasswordModal(): void {
    this.showResetPasswordModal = false;
    this.editingUser = null;
    this.resetPasswordForm.reset();
  }

  saveResetPassword(): void {
    if (!this.editingUser || !this.editingUser.id || this.resetPasswordForm.invalid) return;

    const { new_password, confirm_password } = this.resetPasswordForm.value;
    if (new_password !== confirm_password) {
      this.toastService.error('Passwords do not match');
      return;
    }

    this.userService
      .resetPassword(this.editingUser.id, new_password)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.toastService.success('Password reset successfully');
          this.closeResetPasswordModal();
        },
        error: (error) => {
          this.toastService.error(
            'Failed to reset password: ' + (error?.message || 'Unknown error'),
          );
        },
      });
  }

  // ============ NEW FEATURES: Edit Team ============
  openEditTeamModal(team: Team): void {
    this.editingTeam = team;
    this.editTeamForm.patchValue({
      name: team.name,
      description: team.description,
      team_lead_id: team.team_lead_id || '',
    });
    this.showEditTeamModal = true;
  }

  closeEditTeamModal(): void {
    this.showEditTeamModal = false;
    this.editingTeam = null;
    this.editTeamForm.reset();
  }

  saveEditTeam(): void {
    if (!this.editingTeam || this.editTeamForm.invalid) return;

    const teamData = this.editTeamForm.value;
    this.teamService
      .updateTeam(this.editingTeam.id, teamData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updatedTeam) => {
          const index = this.teams.findIndex((t) => t.id === this.editingTeam!.id);
          if (index !== -1) {
            this.teams[index] = updatedTeam;
            this.toastService.success('Team updated successfully');
          }
          this.closeEditTeamModal();
          this.cdr.markForCheck();
        },
        error: (error) => {
          this.toastService.error('Failed to update team: ' + (error?.message || 'Unknown error'));
        },
      });
  }

  // ============ NEW FEATURES: Team Activity ============
  openTeamActivityModal(team: Team): void {
    this.showTeamActivityModal = true;
    this.teamService
      .getTeamActivity(team.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (activities) => {
          this.selectedTeamActivity = activities;
          this.cdr.markForCheck();
        },
        error: (error) => {
          this.toastService.error('Failed to load team activity');
        },
      });
  }

  closeTeamActivityModal(): void {
    this.showTeamActivityModal = false;
    this.selectedTeamActivity = [];
  }

  // ============ NEW FEATURES: User Status Management ============
  suspendUser(user: User): void {
    if (!this.isAdmin) {
      this.toastService.error('Only admins can suspend users');
      return;
    }

    if (!user.id) {
      this.toastService.error('Invalid user');
      return;
    }

    this.userService
      .suspendUser(user.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.suspendedUserIds.add(user.id!);
          this.toastService.success('User suspended');
          this.cdr.markForCheck();
        },
        error: (error) => {
          this.toastService.error('Failed to suspend user: ' + (error?.message || 'Unknown error'));
        },
      });
  }

  activateUser(user: User): void {
    if (!this.isAdmin) {
      this.toastService.error('Only admins can activate users');
      return;
    }

    if (!user.id) {
      this.toastService.error('Invalid user');
      return;
    }

    this.userService
      .activateUser(user.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.suspendedUserIds.delete(user.id!);
          this.toastService.success('User activated');
          this.cdr.markForCheck();
        },
        error: (error) => {
          this.toastService.error(
            'Failed to activate user: ' + (error?.message || 'Unknown error'),
          );
        },
      });
  }

  isUserSuspended(user: User): boolean {
    return user.id ? this.suspendedUserIds.has(user.id) : false;
  }

  // ============ NEW FEATURES: Search & Filter ============
  getFilteredUsers(): User[] {
    let userList = this.users;

    // Team leads can only see members of their team
    if (this.userIsTeamLead) {
      const currentUser = this.authService.getCurrentUser();
      if (currentUser) {
        // Find the team where current user is the team lead
        const userTeam = this.teams.find((t) => t.team_lead_id === currentUser.id);
        if (userTeam && userTeam.members) {
          // Get the user IDs of team members
          const teamMemberUserIds = userTeam.members.map((m) => m.user_id).filter((id) => id);
          // Filter users to only include team members
          userList = userList.filter((u) => teamMemberUserIds.includes(u.id));
        } else {
          // No team found for this lead, show empty list
          userList = [];
        }
      }
    }

    let filtered = userList.filter(
      (u) =>
        this.userSearchQuery === '' ||
        u.first_name?.toLowerCase().includes(this.userSearchQuery.toLowerCase()) ||
        u.last_name?.toLowerCase().includes(this.userSearchQuery.toLowerCase()) ||
        u.email?.toLowerCase().includes(this.userSearchQuery.toLowerCase()),
    );

    // Sort
    filtered.sort((a, b) => {
      let compareA: any, compareB: any;
      switch (this.usersSortBy) {
        case 'email':
          compareA = a.email || '';
          compareB = b.email || '';
          break;
        default:
          compareA = `${a.first_name} ${a.last_name}`;
          compareB = `${b.first_name} ${b.last_name}`;
      }

      return this.sortAsc ? (compareA > compareB ? 1 : -1) : compareA < compareB ? 1 : -1;
    });

    // Paginate
    const start = this.usersPage * this.usersPageSize;
    return filtered.slice(start, start + this.usersPageSize);
  }

  getFilteredTeams(): Team[] {
    let teamList = this.teams;

    // Team leads can only see their assigned team
    if (this.userIsTeamLead) {
      const currentUser = this.authService.getCurrentUser();
      if (currentUser) {
        // Filter teams to only include the team where current user is the team lead
        teamList = teamList.filter((t) => t.team_lead_id === currentUser.id);
      }
      // If no currentUser but userIsTeamLead is true, this is a loading/state inconsistency
      // Just return what we have rather than empty list
    }

    let filtered = teamList.filter(
      (t) =>
        this.teamSearchQuery === '' ||
        t.name?.toLowerCase().includes(this.teamSearchQuery.toLowerCase()) ||
        t.description?.toLowerCase().includes(this.teamSearchQuery.toLowerCase()),
    );

    // Sort
    filtered.sort((a, b) => {
      let compareA: any, compareB: any;
      switch (this.teamsSortBy) {
        case 'members':
          compareA = a.members?.length || 0;
          compareB = b.members?.length || 0;
          break;
        case 'created_at':
          compareA = new Date(a.created_at).getTime();
          compareB = new Date(b.created_at).getTime();
          break;
        default:
          compareA = a.name;
          compareB = b.name;
      }

      return this.sortAsc ? (compareA > compareB ? 1 : -1) : compareA < compareB ? 1 : -1;
    });

    // Paginate
    const start = this.teamsPage * this.teamsPageSize;
    return filtered.slice(start, start + this.teamsPageSize);
  }

  setUserSort(field: 'name' | 'email'): void {
    if (this.usersSortBy === field) {
      this.sortAsc = !this.sortAsc;
    } else {
      this.usersSortBy = field;
      this.sortAsc = true;
    }
    this.usersPage = 0;
  }

  setTeamSort(field: 'name' | 'created_at' | 'members'): void {
    if (this.teamsSortBy === field) {
      this.sortAsc = !this.sortAsc;
    } else {
      this.teamsSortBy = field;
      this.sortAsc = true;
    }
    this.teamsPage = 0;
  }

  nextUsersPage(): void {
    const total = this.getFilteredUsers().length;
    if ((this.usersPage + 1) * this.usersPageSize < total) {
      this.usersPage++;
    }
  }

  prevUsersPage(): void {
    if (this.usersPage > 0) {
      this.usersPage--;
    }
  }

  nextTeamsPage(): void {
    const total = this.getFilteredTeams().length;
    if ((this.teamsPage + 1) * this.teamsPageSize < total) {
      this.teamsPage++;
    }
  }

  prevTeamsPage(): void {
    if (this.teamsPage > 0) {
      this.teamsPage--;
    }
  }

  exportTeamsCSV(): void {
    const headers = 'Team Name,Description,Members,Team Lead\n';
    const rows = this.teams
      .map(
        (t) =>
          `"${t.name}","${t.description || ''}",${t.members?.length || 0},"${
            this.users.find((u) => u.id === t.team_lead_id)?.first_name || ''
          }"`,
      )
      .join('\n');

    const csv = headers + rows;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `teams-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  getRoleLabel(role?: string): string {
    const roleMap: Record<string, string> = {
      admin: 'Admin',
      user: 'User',
      manager: 'Manager',
    };
    return roleMap[role || 'user'] || 'User';
  }
}
