import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { User, LoginRequest, LoginResponse } from '../models/api.models';
import { TenantService } from './tenant.service';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  public currentUserSubject = new BehaviorSubject<User | null>(this.getUserFromStorage());
  public currentUser$ = this.currentUserSubject.asObservable();

  public accessTokenSubject = new BehaviorSubject<string | null>(this.getAccessTokenFromStorage());
  public accessToken$ = this.accessTokenSubject.asObservable();

  private isAuthenticatedSubject = new BehaviorSubject<boolean>(!!this.getUserFromStorage());
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  private baseUrl: string = 'http://localhost:8000/api';

  constructor(
    private http: HttpClient,
    private tenantService: TenantService,
  ) {
    this.baseUrl = this.getBackendUrl();

    // Immediately restore tenant from localStorage if available
    // This is critical for subdomain redirects where the page reloads

    const companySlug = localStorage.getItem('company_slug');
    const userStr = localStorage.getItem('currentUser');

    if (companySlug && userStr) {
      try {
        const user = JSON.parse(userStr);

        const company = {
          id: user.company_id || '',
          slug: companySlug,
          name: `${user.first_name} ${user.last_name}'s Company`,
          status: 'PENDING' as const,
          owner_id: user.id || 'unknown',
          created_at: new Date().toISOString(),
        };

        this.tenantService.switchTenant(company);
      } catch (error) {}
    }
  }

  /**
   * Sign up a new user and company
   */
  signup(signupData: {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
    company_name: string;
  }): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/auth/signup`, signupData);
  }

  /**
   * Verify user email with verification token
   */
  verifyEmail(userId: string, token: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/auth/verify-email`, {
      user_id: userId,
      token,
    });
  }

  /**
   * Complete company onboarding with company info
   */
  completeCompanyOnboarding(
    companyId: string,
    companyInfo: {
      industry?: string;
      website?: string;
    },
  ): Observable<any> {
    return this.http.post<any>(
      `${this.baseUrl}/auth/onboarding/${companyId}/company-info`,
      companyInfo,
    );
  }

  /**
   * Activate company (final step of onboarding)
   */
  activateCompany(companyId: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/auth/onboarding/${companyId}/activate`, {});
  }

  /**
   * Get onboarding status for a company
   */
  getOnboardingStatus(companyId: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/auth/onboarding/${companyId}/status`);
  }

  login(email: string, password: string): Observable<User> {
    const loginUrl = `${this.baseUrl}/auth/login`;

    // Use raw HttpClient to bypass ApiService wrapper since login response has different structure
    // API expects email and password as query parameters
    return this.http.post<LoginResponse>(loginUrl, {}, { params: { email, password } }).pipe(
      map((response) => {
        // Handle the response structure: response has status, data, access_token, refresh_token at root
        if (response && response.data) {
          const data = response.data;

          // Extract tokens from root level
          const accessToken = response.access_token;
          const refreshToken = response.refresh_token;
          const companySlug = data.company_slug;

          // Build user object - data contains user_id, company_id, email, role, etc.
          const user: User = {
            id: data.user_id || 'unknown',
            email: data.email || email,
            company_id: data.company_id || '',
            first_name: data.first_name || '',
            last_name: data.last_name || '',
            role: data.role || 'user', // role from backend
            roles: data.roles || [], // keep roles array for backward compatibility
          };

          if (!accessToken || !refreshToken) {
            throw new Error('Login failed: missing tokens in response');
          }

          this.setSession(accessToken, refreshToken, user, companySlug);
          return user;
        }
        throw new Error('Login failed: no data in response');
      }),
    );
  }

  logout(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('currentUser');
    localStorage.removeItem('company_slug');
    this.currentUserSubject.next(null);
    this.accessTokenSubject.next(null);
    this.isAuthenticatedSubject.next(false);
  }

  isAuthenticated(): boolean {
    return !!this.getUserFromStorage();
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  getAccessToken(): string | null {
    return this.accessTokenSubject.value;
  }

  private setSession(
    accessToken: string,
    refreshToken: string,
    user: User,
    companySlug?: string,
  ): void {
    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('refresh_token', refreshToken);
    localStorage.setItem('currentUser', JSON.stringify(user));
    if (companySlug) {
      localStorage.setItem('company_slug', companySlug);
    }

    // Verify what was actually saved
    const savedToken = localStorage.getItem('access_token');
    const savedUser = localStorage.getItem('currentUser');
    const savedSlug = localStorage.getItem('company_slug');

    this.currentUserSubject.next(user);
    this.accessTokenSubject.next(accessToken);
    this.isAuthenticatedSubject.next(true);

    // Set tenant context for the logged-in user
    if (companySlug && user.company_id) {
      const company = {
        id: user.company_id,
        slug: companySlug,
        name: user.first_name + ' ' + user.last_name + "'s Company", // Placeholder name
        status: 'PENDING' as const,
        owner_id: user.id || 'unknown',
        created_at: new Date().toISOString(),
      };

      this.tenantService.switchTenant(company);
    } else {
    }
  }

  private getBackendUrl(): string {
    const hostname = window.location.hostname;
    // Use localhost for local dev, otherwise use the current IP with port 8000
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:8000/api';
    }
    return `http://${hostname}:8000/api`;
  }

  private getUserFromStorage(): User | null {
    try {
      const user = localStorage.getItem('currentUser');
      return user && user !== 'undefined' ? JSON.parse(user) : null;
    } catch (error) {
      return null;
    }
  }

  private getAccessTokenFromStorage(): string | null {
    const token = localStorage.getItem('access_token');
    return token && token !== 'undefined' ? token : null;
  }
}
