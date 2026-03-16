import { Component, OnInit, ViewChild, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { OverviewComponent } from '../overview/overview.component';
import { LeadsComponent } from '../leads/leads.component';
import { TeamsComponent } from '../teams/teams.component';
import { StagesComponent } from '../stages/stages.component';
import { FormsComponent } from '../forms/forms.component';
import { CompanySettingsComponent } from '../company-settings/company-settings.component';
import { FollowupListComponent } from '../followups/followup-list.component';
import { AnalyticsComponent } from '../analytics/analytics.component';
import { AuthService } from '../../services/auth.service';
import { FollowupNotificationService } from '../../services/followup-notification.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

type TabType =
  | 'overview'
  | 'leads'
  | 'teams'
  | 'stages'
  | 'forms'
  | 'followups'
  | 'analytics'
  | 'company-settings';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    SidebarComponent,
    OverviewComponent,
    LeadsComponent,
    TeamsComponent,
    StagesComponent,
    FormsComponent,
    CompanySettingsComponent,
    FollowupListComponent,
    AnalyticsComponent,
  ],
  template: `
    <div class="dashboard-wrapper">
      <app-sidebar (navigate)="selectTab($event)"></app-sidebar>

      <main class="dashboard-main">
        <!-- Content -->
        <div class="dashboard-content">
          <app-overview
            [style.display]="activeTab === 'overview' ? 'block' : 'none'"
          ></app-overview>
          <app-leads
            [style.display]="activeTab === 'leads' ? 'block' : 'none'"
            #leadsComponent
          ></app-leads>
          <app-teams [style.display]="activeTab === 'teams' ? 'block' : 'none'"></app-teams>
          <app-stages [style.display]="activeTab === 'stages' ? 'block' : 'none'"></app-stages>
          <app-forms [style.display]="activeTab === 'forms' ? 'block' : 'none'"></app-forms>
          <app-followup-list
            [style.display]="activeTab === 'followups' ? 'block' : 'none'"
          ></app-followup-list>
          <app-company-settings
            [style.display]="activeTab === 'company-settings' ? 'block' : 'none'"
          ></app-company-settings>
          <app-analytics
            [style.display]="activeTab === 'analytics' ? 'block' : 'none'"
          ></app-analytics>
        </div>
      </main>
    </div>
  `,
  styles: [
    `
      .dashboard-wrapper {
        display: flex;
        height: 100vh;
        background: #f3f4f6;
      }

      .dashboard-main {
        flex: 1;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }

      .dashboard-content {
        flex: 1;
        overflow-y: auto;
        background: #f3f4f6;
      }

      .analytics-placeholder {
        padding: 40px;
        text-align: center;
        color: #6b7280;
      }

      @media (max-width: 768px) {
        .dashboard-wrapper {
          flex-direction: column;
        }
      }
    `,
  ],
})
export class DashboardComponent implements OnInit, OnDestroy {
  activeTab: TabType = 'overview';
  @ViewChild('leadsComponent') leadsComponent: LeadsComponent | undefined;

  private destroy$ = new Subject<void>();

  constructor(
    private authService: AuthService,
    private notificationService: FollowupNotificationService,
  ) {}

  tabs = [
    { id: 'overview' as TabType, label: 'Overview', icon: 'dashboard' },
    { id: 'leads' as TabType, label: 'Leads', icon: 'people' },
    { id: 'teams' as TabType, label: 'Teams', icon: 'group' },
    { id: 'stages' as TabType, label: 'Pipeline', icon: 'trending_up' },
    { id: 'forms' as TabType, label: 'Forms', icon: 'assignment' },
    { id: 'followups' as TabType, label: 'Followups', icon: 'schedule' },
    { id: 'analytics' as TabType, label: 'Analytics', icon: 'analytics' },
  ];

  ngOnInit(): void {
    // Subscribe to notification navigation events
    this.notificationService.navigateToLead$.pipe(takeUntil(this.destroy$)).subscribe((leadId) => {
      this.openLeadDetail(leadId);
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  selectTab(tabId: any): void {
    // Accept both string and TabType
    const validTabs = [
      'overview',
      'leads',
      'teams',
      'stages',
      'forms',
      'followups',
      'analytics',
      'company-settings',
    ];
    if (validTabs.includes(tabId)) {
      this.activeTab = tabId as TabType;
    }
  }

  openLeadDetail(leadId: string): void {
    // Switch to leads tab first
    this.selectTab('leads');

    // After tab is switched, use a small delay to ensure component is visible
    setTimeout(() => {
      // Call the leads component method to open the detail pane
      if (this.leadsComponent && this.leadsComponent.selectLeadById) {
        this.leadsComponent.selectLeadById(leadId);
      }
    }, 100);
  }
}
