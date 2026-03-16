import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { TenantService } from '../services/tenant.service';
import { AuthService } from '../services/auth.service';
import { Observable, of, timer } from 'rxjs';
import { map, catchError, tap, filter, take, timeout, switchMap } from 'rxjs/operators';

/**
 * Guard that ensures:
 * 1. A subdomain is present in the URL
 * 2. The subdomain resolves to a valid company
 * 3. The logged-in user belongs to that company
 *
 * Use this guard on dashboard routes that should only be accessible via subdomain
 * Example: dashboard, settings, reports (company-specific routes)
 */
@Injectable({
  providedIn: 'root',
})
export class SubdomainGuard implements CanActivate {
  constructor(
    private tenantService: TenantService,
    private authService: AuthService,
    private router: Router,
  ) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean> {
    // Add a small delay to allow async initialization to complete
    return timer(100).pipe(switchMap(() => this.performGuardChecks(state)));
  }

  private performGuardChecks(state: RouterStateSnapshot): Observable<boolean> {
    
    

    // Check if subdomain exists
    const subdomain = this.tenantService.extractSubdomain();
    

    // Get current user
    const currentUser = this.authService.getCurrentUser();
    

    if (!currentUser) {
      // No user logged in, redirect to login
      
      this.router.navigate(['/login']);
      return of(false);
    }

    // If no subdomain, we're in development mode - use stored company data
    if (!subdomain) {

      const currentTenant = this.tenantService.getCurrentTenant();

      if (currentTenant) {
        // In development mode, allow access if user has a company
        return of(true);
      }

      // Try to restore from sessionStorage
      const restored = this.tenantService.restoreTenantContext();
      if (restored) {
        
        this.tenantService.switchTenant(restored);
        return of(true);
      }

      this.router.navigate(['/login']);
      return of(false);
    }

    // Production mode with subdomain

    // Get current tenant (or wait for it to be resolved)
    const currentTenant = this.tenantService.getCurrentTenant();
    

    if (currentTenant) {
      // Tenant already resolved
      
      if (!this.tenantService.isValidTenantAccess(currentUser.company_id)) {
        // User belongs to different company, redirect to their company dashboard
        const userCompanySlug = currentTenant.slug;
        this.redirectToCompanyDashboard(userCompanySlug);
        return of(false);
      }
      
      return of(true);
    }

    

    // Tenant not yet resolved, subscribe to changes
    return this.tenantService.getCurrentTenant$().pipe(
      // Wait for tenant to be resolved (skip initial null)
      filter((tenant) => {
        
        return tenant !== null;
      }),
      // Take only the first resolved tenant
      take(1),
      // Map to boolean
      map((tenant) => {
        

        if (!tenant) {
          // Still no tenant, deny access
          
          this.router.navigate(['/login']);
          return false;
        }

        // Verify user belongs to this tenant
        if (!this.tenantService.isValidTenantAccess(currentUser.company_id)) {
          // User belongs to different company
          
          this.redirectToCompanyDashboard(tenant.slug);
          return false;
        }

        
        return true;
      }),
      // Timeout after 5 seconds to prevent hanging
      timeout(5000),
      // If timeout or error, redirect to login
      catchError((error) => {
        
        this.router.navigate(['/login']);
        return of(false);
      }),
    );
  }

  private redirectToMainDomain(): void {
    const protocol = window.location.protocol;
    const port = window.location.port ? `:${window.location.port}` : '';
    window.location.href = `${protocol}//localhost${port}`;
  }

  private redirectToCompanyDashboard(slug: string): void {
    const protocol = window.location.protocol;
    const port = window.location.port ? `:${window.location.port}` : '';
    window.location.href = `${protocol}//${slug}.localhost${port}/dashboard`;
  }
}

/**
 * Optional Guard: Ensure user is in the main app (no subdomain)
 * Use this on routes that should only be accessible without a subdomain
 * Example: signup, login, landing page (public routes)
 */
@Injectable({
  providedIn: 'root',
})
export class MainDomainGuard implements CanActivate {
  constructor(
    private tenantService: TenantService,
    private router: Router,
  ) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    const subdomain = this.tenantService.extractSubdomain();

    if (subdomain) {
      // User is on a subdomain, redirect to main domain
      const protocol = window.location.protocol;
      const port = window.location.port ? `:${window.location.port}` : '';
      window.location.href = `${protocol}//localhost${port}`;
      return false;
    }

    return true;
  }
}
