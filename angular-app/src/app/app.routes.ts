import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { SignupComponent } from './components/signup/signup.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { AnalyticsComponent } from './components/analytics/analytics.component';
import { authGuard } from './guards/auth.guard';
import { SubdomainGuard, MainDomainGuard } from './guards/subdomain.guard';

export const routes: Routes = [
  /**
   * Main Domain Routes (no subdomain)
   * These routes should NOT be accessed via subdomain
   */
  {
    path: 'login',
    canActivate: [MainDomainGuard],
    component: LoginComponent,
  },
  {
    path: 'signup',
    canActivate: [MainDomainGuard],
    component: SignupComponent,
  },

  /**
   * Tenant-Specific Routes (with subdomain)
   * These routes require a subdomain and verified tenant context
   * Example: acme.localhost:4200/dashboard
   */
  {
    path: 'dashboard',
    component: DashboardComponent,
    canActivate: [authGuard, SubdomainGuard],
  },

  {
    path: 'analytics',
    component: AnalyticsComponent,
    canActivate: [authGuard, SubdomainGuard],
  },

  /**
   * Default redirect to login
   */
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },

  /**
   * Fallback: Send unknown routes to login
   */
  {
    path: '**',
    redirectTo: 'login',
  },
];
