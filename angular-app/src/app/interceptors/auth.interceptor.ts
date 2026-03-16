import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from '../services/auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private authService: AuthService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // For login endpoint, add default company-id if not available
    if (req.url.includes('/auth/login')) {
      const companyId = sessionStorage.getItem('temp_company_id') || '1';
      req = req.clone({
        setHeaders: {
          'X-Company-ID': companyId,
          'Content-Type': 'application/json',
        },
      });
      return next.handle(req);
    }

    // For authenticated requests, get token and user from storage
    const token = localStorage.getItem('access_token');
    const userJson = localStorage.getItem('currentUser');

    let user = null;
    if (userJson && userJson !== 'undefined') {
      try {
        user = JSON.parse(userJson);
      } catch (e) {
        
      }
    }

    // Always add headers if we have a token
    if (token) {
      const companyId = user?.company_id;
      const userId = user?.id || user?.user_id;

      const headers: any = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      };

      if (companyId) {
        headers['X-Company-ID'] = String(companyId);
      } else {
        headers['X-Company-ID'] = '1';
      }

      if (userId) {
        headers['X-User-ID'] = String(userId);
      }

      req = req.clone({ setHeaders: headers });
    }

    return next.handle(req);
  }
}
