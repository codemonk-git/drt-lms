import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';

export interface Company {
  id: string;
  slug: string;
  name: string;
  status: 'PENDING' | 'ACTIVE' | 'SUSPENDED';
  owner_id: string;
  created_at: string;
  settings?: {
    industry?: string;
    website?: string;
  };
}

@Injectable({
  providedIn: 'root',
})
export class TenantService {
  private currentTenant$ = new BehaviorSubject<Company | null>(null);
  private apiUrl = '/api';

  constructor(private http: HttpClient) {
    this.initializeTenant();
  }

  /**
   * Extract subdomain from current hostname
   * Examples:
   * - acme.localhost:4200 → acme
   * - company.example.com → company
   * - localhost:4200 → null (main domain)
   * - 192.168.1.5:4200 → null (IP address, no subdomain)
   */
  extractSubdomain(): string | null {
    const hostname = window.location.hostname;

    // IP addresses have no subdomains — return null immediately
    if (/^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
      return null;
    }

    // If localhost, extract from subdomain (acme.localhost)
    if (hostname.includes('localhost')) {
      const parts = hostname.split('.');
      return parts.length > 1 ? parts[0] : null;
    }

    // If production domain, extract first part
    const parts = hostname.split('.');
    if (parts.length > 2) {
      return parts[0]; // company.example.com → company
    }

    return null; // example.com → null (main domain)
  }

  /**
   * Initialize tenant from subdomain on app load
   */
  private initializeTenant(): void {
    const subdomain = this.extractSubdomain();

    if (subdomain) {
      this.resolveCompanyBySlug(subdomain).subscribe({
        next: (company: Company) => {
          this.currentTenant$.next(company);
          this.storeTenantContext(company);
        },
        error: (error: any) => {
          // Try to restore from session storage as fallback
          let restored = this.restoreTenantContext();
          if (restored) {
            this.currentTenant$.next(restored);
          } else {
            // Try localStorage as second fallback
            restored = this.restoreTenantFromLocalStorage();
            if (restored) {
              this.currentTenant$.next(restored);
              this.storeTenantContext(restored);
            } else {
            }
          }
        },
      });
    } else {
      // No subdomain, try to restore from session storage first, then localStorage

      let restored = this.restoreTenantContext();
      if (restored) {
        this.currentTenant$.next(restored);
      } else {
        // Try localStorage as fallback
        restored = this.restoreTenantFromLocalStorage();
        if (restored) {
          this.currentTenant$.next(restored);
          this.storeTenantContext(restored);
        } else {
        }
      }
    }
  }

  /**
   * Resolve company by slug from API
   */
  resolveCompanyBySlug(slug: string): Observable<Company> {
    return this.http.get<Company>(`${this.apiUrl}/auth/companies/by-slug/${slug}`);
  }

  /**
   * Get current tenant
   */
  getCurrentTenant(): Company | null {
    return this.currentTenant$.value;
  }

  /**
   * Get current tenant as observable
   */
  getCurrentTenant$(): Observable<Company | null> {
    return this.currentTenant$.asObservable();
  }

  /**
   * Switch to a different tenant (used after successful signup/login)
   */
  switchTenant(company: Company): void {
    this.currentTenant$.next(company);
    this.storeTenantContext(company);
  }

  /**
   * Store tenant context in session storage
   */
  private storeTenantContext(company: Company): void {
    sessionStorage.setItem('current_company_id', company.id);
    sessionStorage.setItem('current_company_slug', company.slug);
    sessionStorage.setItem('current_company_name', company.name);
  }

  /**
   * Restore tenant context from session storage
   */
  restoreTenantContext(): Company | null {
    const companyId = sessionStorage.getItem('current_company_id');
    const slug = sessionStorage.getItem('current_company_slug');
    const name = sessionStorage.getItem('current_company_name');

    if (companyId && slug && name) {
      const company: Company = {
        id: companyId,
        slug,
        name,
        status: 'ACTIVE',
        owner_id: '',
        created_at: '',
      };
      this.currentTenant$.next(company);
      return company;
    }

    return null;
  }

  /**
   * Restore tenant from localStorage (fallback)
   */
  private restoreTenantFromLocalStorage(): Company | null {
    try {
      const slug = localStorage.getItem('company_slug');
      const userStr = localStorage.getItem('currentUser');

      if (slug && userStr) {
        const user = JSON.parse(userStr);
        const company: Company = {
          id: user.company_id || '',
          slug,
          name: `${user.first_name} ${user.last_name}'s Company`,
          status: 'PENDING',
          owner_id: user.id || '',
          created_at: new Date().toISOString(),
        };
        return company;
      }
    } catch (error) {}
    return null;
  }

  /**
   * Clear tenant context
   */
  clearTenant(): void {
    this.currentTenant$.next(null);
    sessionStorage.removeItem('current_company_id');
    sessionStorage.removeItem('current_company_slug');
    sessionStorage.removeItem('current_company_name');
  }

  /**
   * Redirect to main domain (logout or subdomain error)
   */
  private redirectToMainDomain(): void {
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    const port = window.location.port ? `:${window.location.port}` : '';
    window.location.href = `${protocol}//${hostname}${port}`;
  }

  /**
   * Generate redirect URL for company dashboard
   */
  getCompanyDashboardUrl(company: Company): string {
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    const port = window.location.port ? `:${window.location.port}` : '';

    // For localhost or subdomain-based access, use subdomain pattern
    if (hostname.includes('localhost') || hostname.includes('.')) {
      return `${protocol}//${company.slug}.localhost${port}/dashboard`;
    }

    // For IP-based access, use query parameter instead
    return `${protocol}//${hostname}${port}/dashboard?company=${company.slug}`;
  }

  /**
   * Check if user is accessing correct tenant
   * Returns true if subdomain matches user's company, false otherwise
   */
  isValidTenantAccess(userCompanyId: string): boolean {
    const currentTenant = this.currentTenant$.value;

    if (!currentTenant) {
      // No subdomain, allow access to main app
      return !this.extractSubdomain();
    }

    // Subdomain exists, verify it matches user's company
    return currentTenant.id === userCompanyId;
  }
}
