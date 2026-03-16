import { Component, OnInit, Output, EventEmitter, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { TeamService } from '../../services/team.service';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

interface MenuItem {
  icon: string;
  label: string;
  route: string;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- Mobile Hamburger Toggle (hidden on desktop) -->
    <button class="hamburger-toggle" (click)="toggleSidebar()" aria-label="Toggle menu">
      <span class="material-icons">{{ sidebarOpen ? 'close' : 'menu' }}</span>
    </button>

    <!-- Overlay backdrop (mobile only) -->
    <div class="sidebar-overlay" *ngIf="sidebarOpen" (click)="closeSidebar()"></div>

    <!-- Sidebar -->
    <aside class="sidebar" [class.open]="sidebarOpen">
      <!-- Logo - Compact -->
      <div class="logo-section">
        <button class="logo-button" [title]="'TSS Global Business Suite'">
          <span class="material-icons logo-icon">dashboard</span>
        </button>
      </div>

      <!-- Navigation - Icon + Label Below -->
      <nav class="nav-menu">
        <button
          *ngFor="let item of menuItems"
          (click)="onMenuClick(item.route)"
          class="nav-item"
          [title]="item.label"
        >
          <span class="material-icons nav-icon">{{ item.icon }}</span>
          <span class="nav-label">{{ item.label }}</span>
        </button>
      </nav>

      <!-- Spacer -->
      <div class="spacer"></div>

      <!-- Footer - Compact -->
      <div class="sidebar-footer">
        <ng-container *ngIf="currentUser$ | async as user">
          <!-- Admin Settings Access -->
          <button
            *ngIf="isAdmin"
            (click)="onSettingsClick()"
            class="user-button admin"
            [title]="user.email"
          >
            <span class="avatar-mini">{{ getInitial(user.email) }}</span>
            <span class="icon-label">Settings</span>
          </button>

          <!-- Regular User Display -->
          <button *ngIf="!isAdmin" class="user-button" [title]="user.email">
            <span class="avatar-mini">{{ getInitial(user.email) }}</span>
          </button>
        </ng-container>

        <!-- Logout Button -->
        <button class="btn-logout" (click)="onLogout()" title="Logout">
          <span class="material-icons">logout</span>
          <span class="icon-label">Logout</span>
        </button>
      </div>
    </aside>
  `,
  styles: [
    `
      .hamburger-toggle {
        display: none;
        position: fixed;
        top: 16px;
        left: 16px;
        z-index: 999;
        background: white;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        width: 44px;
        height: 44px;
        padding: 0;
        cursor: pointer;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
        color: #111827;
      }

      .hamburger-toggle:hover {
        background: #f3f4f6;
        border-color: #9ca3af;
      }

      .hamburger-toggle .material-icons {
        font-size: 24px;
      }

      .sidebar-overlay {
        display: none;
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        z-index: 998;
      }

      .sidebar {
        width: 90px;
        height: 100vh;
        background: white;
        border-right: 1px solid #e5e7eb;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        padding: 0;
      }

      .logo-section {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 16px 0;
        border-bottom: 1px solid #e5e7eb;
        flex-shrink: 0;
      }

      .logo-button {
        width: 56px;
        height: 56px;
        background: transparent;
        border: none;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.2s;
        color: #111827;
      }

      .logo-button:hover {
        background: #f3f4f6;
      }

      .logo-icon {
        font-size: 28px;
      }

      .nav-menu {
        flex: 1;
        overflow-y: auto;
        padding: 8px;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .nav-item {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 6px;
        padding: 8px;
        background: transparent;
        border: none;
        border-radius: 8px;
        color: #6b7280;
        font-size: 11px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
        text-align: center;
        min-height: 70px;
      }

      .nav-item:hover {
        background: #f3f4f6;
        color: #111827;
      }

      .nav-item .nav-icon {
        font-size: 24px;
        color: #6b7280;
        transition: color 0.2s;
      }

      .nav-item:hover .nav-icon {
        color: #111827;
      }

      .nav-label {
        display: block;
        white-space: normal;
        overflow: hidden;
        text-overflow: ellipsis;
        width: 70px;
        line-height: 1.2;
      }

      .spacer {
        flex: 1;
      }

      .sidebar-footer {
        padding: 8px;
        border-top: 1px solid #e5e7eb;
        display: flex;
        flex-direction: column;
        gap: 8px;
        flex-shrink: 0;
      }

      .user-button {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 6px;
        padding: 8px;
        background: white;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s;
        color: #6b7280;
        font-size: 10px;
        font-weight: 600;
      }

      .user-button.admin {
        border-color: #d1d5db;
        background: #f9fafb;
      }

      .user-button.admin:hover {
        border-color: #9ca3af;
        background: #f3f4f6;
      }

      .avatar-mini {
        width: 40px;
        height: 40px;
        background: #e5e7eb;
        color: #374151;
        border-radius: 6px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 700;
        font-size: 14px;
        flex-shrink: 0;
      }

      .icon-label {
        display: block;
        white-space: normal;
        overflow: hidden;
        text-overflow: ellipsis;
        width: 70px;
        text-align: center;
        line-height: 1.1;
      }

      .btn-logout {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 6px;
        padding: 8px;
        background: white;
        color: #dc2626;
        border: 1px solid #fca5a5;
        border-radius: 8px;
        font-size: 10px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
      }

      .btn-logout:hover {
        background: #fef2f2;
        border-color: #f87171;
      }

      .btn-logout .material-icons {
        font-size: 20px;
      }

      .nav-menu::-webkit-scrollbar {
        display: none;
      }

      .nav-menu {
        scrollbar-width: none;
        -ms-overflow-style: none;
      }

      /* Mobile Responsive - Convert to Hamburger Menu */
      @media (max-width: 768px) {
        .hamburger-toggle {
          display: flex;
        }

        .sidebar {
          position: fixed;
          top: 0;
          left: 0;
          width: 250px;
          height: 100vh;
          z-index: 1000;
          transform: translateX(-100%);
          transition: transform 0.3s ease-in-out;
          box-shadow: 2px 0 8px rgba(0, 0, 0, 0.15);
        }

        .sidebar.open {
          transform: translateX(0);
        }

        .sidebar-overlay {
          display: block;
        }

        .sidebar-overlay.hidden {
          display: none;
        }

        .nav-item {
          flex-direction: row;
          justify-content: flex-start;
          gap: 12px;
          padding: 12px 14px;
          min-height: auto;
          width: 100%;
          text-align: left;
        }

        .nav-icon {
          flex-shrink: 0;
          font-size: 20px;
        }

        .nav-label {
          width: auto;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          flex: 1;
          font-size: 14px;
          line-height: 1;
        }

        .logo-button {
          width: 48px;
          height: 48px;
        }

        .logo-icon {
          font-size: 24px;
        }

        .user-button,
        .btn-logout {
          flex-direction: row;
          justify-content: flex-start;
          gap: 12px;
          padding: 12px 14px;
          width: 100%;
        }

        .user-button .icon-label,
        .btn-logout .icon-label {
          width: auto;
          text-align: left;
          font-size: 12px;
        }

        .avatar-mini {
          width: 36px;
          height: 36px;
          flex-shrink: 0;
        }
      }

      @media (max-width: 480px) {
        .hamburger-toggle {
          top: 12px;
          left: 12px;
          width: 40px;
          height: 40px;
        }

        .hamburger-toggle .material-icons {
          font-size: 20px;
        }

        .sidebar {
          width: 220px;
        }
      }
    `,
  ],
})
export class SidebarComponent implements OnInit, OnDestroy {
  @Output() navigate = new EventEmitter<string>();

  currentUser$: Observable<any>;
  isAdmin = false;
  isTeamLead = false;
  sidebarOpen = false;
  private destroy$ = new Subject<void>();

  allMenuItems: MenuItem[] = [
    { icon: 'dashboard', label: 'Overview', route: 'overview' },
    { icon: 'people', label: 'Leads', route: 'leads' },
    { icon: 'group', label: 'Teams', route: 'teams' },
    { icon: 'trending_up', label: 'Pipeline', route: 'stages' },
    { icon: 'assignment', label: 'Forms', route: 'forms' },
    { icon: 'schedule', label: 'Followups', route: 'followups' },
    { icon: 'analytics', label: 'Analytics', route: 'analytics' },
  ];

  menuItems: MenuItem[] = [];

  constructor(
    private authService: AuthService,
    private teamService: TeamService,
    private router: Router,
  ) {
    this.currentUser$ = this.authService.currentUser$;
    // Show all items by default, will be filtered based on role
    this.menuItems = [...this.allMenuItems];
  }

  ngOnInit(): void {
    const currentUser = this.authService.getCurrentUser();

    console.log('[Sidebar ngOnInit] Current user:', currentUser);

    if (currentUser) {
      this.isAdmin = currentUser.role === 'admin';
      console.log('[Sidebar ngOnInit] Is admin?', this.isAdmin);

      if (!this.isAdmin) {
        // Check if team lead - this will filter the menu
        const userId = currentUser.id || currentUser.user_id;
        console.log('[Sidebar ngOnInit] Non-admin user ID:', userId);
        this.checkIfTeamLead(userId);
      } else {
        console.log('[Sidebar ngOnInit] User is admin - showing all items');
        this.updateMenuItems();
      }
    }

    this.currentUser$.pipe(takeUntil(this.destroy$)).subscribe((user) => {
      console.log('[Sidebar subscription] User updated:', user);
      if (user) {
        this.isAdmin = user.role === 'admin';
        if (!this.isAdmin) {
          const userId = user.id || user.user_id;
          console.log('[Sidebar subscription] Checking if team lead for:', userId);
          this.checkIfTeamLead(userId);
        } else {
          this.isTeamLead = false;
          this.updateMenuItems();
        }
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }

  closeSidebar(): void {
    this.sidebarOpen = false;
  }

  private checkIfTeamLead(userId: string | undefined): void {
    if (!userId) {
      this.isTeamLead = false;
      this.updateMenuItems();
      return;
    }

    console.log('[Sidebar] Checking if user is team lead:', userId);

    this.teamService
      .getTeams(0, 1000)
      .pipe(takeUntil(this.destroy$))
      .subscribe((teams) => {
        console.log('[Sidebar] Teams fetched:', teams);
        this.isTeamLead = teams.some((team) => {
          console.log(
            '[Sidebar] Comparing team lead_id:',
            team.team_lead_id,
            'with user id:',
            userId,
          );
          return team.team_lead_id === userId;
        });
        console.log('[Sidebar] Is team lead:', this.isTeamLead);
        this.updateMenuItems();
      });
  }

  private updateMenuItems(): void {
    console.log(
      '[Sidebar] Updating menu items. isAdmin:',
      this.isAdmin,
      'isTeamLead:',
      this.isTeamLead,
    );

    // If user is admin, show all menu items
    if (this.isAdmin) {
      this.menuItems = [...this.allMenuItems];
      console.log('[Sidebar] Admin user - showing all items');
      return;
    }

    // If user is a team lead, hide Pipeline and Forms
    if (this.isTeamLead) {
      this.menuItems = this.allMenuItems.filter(
        (item) => item.route !== 'stages' && item.route !== 'forms',
      );
      console.log('[Sidebar] Team lead user - filtered items:', this.menuItems);
      return;
    }

    // Regular users see all items
    this.menuItems = [...this.allMenuItems];
    console.log('[Sidebar] Regular user - showing all items');
  }

  getInitial(email: string): string {
    return (email?.[0] || 'U').toUpperCase();
  }

  onMenuClick(route: string): void {
    this.navigate.emit(route);
    this.closeSidebar();
  }

  onSettingsClick(): void {
    this.navigate.emit('company-settings');
    this.closeSidebar();
  }

  onLogout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
