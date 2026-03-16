import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { ApiResponse, PaginatedResponse } from '../models/api.models';

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private baseUrl: string;

  constructor(private http: HttpClient) {
    this.baseUrl = this.getBackendUrl();
  }

  private getBackendUrl(): string {
    // Use relative path - Angular dev server proxy will forward /api calls to localhost:8000
    return '/api';
  }

  /**
   * Get company ID and user ID from localStorage and create auth headers
   */
  private getAuthHeaders(): HttpHeaders {
    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
    });

    const userJson = localStorage.getItem('currentUser');
    if (userJson) {
      try {
        const user = JSON.parse(userJson);
        if (user?.company_id) {
          headers = headers.set('x-company-id', user.company_id);
        }
        if (user?.id) {
          headers = headers.set('x-user-id', user.id);
        }
        if (user?.role === 'admin') {
          headers = headers.set('x-is-admin', 'true');
        }
      } catch (e) {
        // Silently fail if user parsing fails
      }
    }

    return headers;
  }

  get<T>(endpoint: string, params?: any): Observable<ApiResponse<T>> {
    return this.http
      .get<ApiResponse<T>>(`${this.baseUrl}${endpoint}`, {
        params,
        headers: this.getAuthHeaders(),
      })
      .pipe(catchError((error) => this.handleError(error)));
  }

  getPaginated<T>(
    endpoint: string,
    skip: number = 0,
    limit: number = 10,
  ): Observable<PaginatedResponse<T>> {
    const params: any = { skip: skip.toString(), limit: limit.toString() };

    // Add company_id from localStorage for endpoints that require it (like /users)
    const userJson = localStorage.getItem('currentUser');
    if (userJson) {
      try {
        const user = JSON.parse(userJson);
        if (user?.company_id) {
          params.company_id = user.company_id;
        }
      } catch (e) {
        // Silently fail if user parsing fails
      }
    }

    return this.http
      .get<PaginatedResponse<T>>(`${this.baseUrl}${endpoint}`, {
        params,
        headers: this.getAuthHeaders(),
      })
      .pipe(catchError((error) => this.handleError(error)));
  }

  post<T>(endpoint: string, data: any, params?: any): Observable<ApiResponse<T>> {
    return this.http
      .post<ApiResponse<T>>(`${this.baseUrl}${endpoint}`, data, {
        params,
        headers: this.getAuthHeaders(),
      })
      .pipe(catchError((error) => this.handleError(error)));
  }

  put<T>(endpoint: string, data: any): Observable<ApiResponse<T>> {
    return this.http
      .put<ApiResponse<T>>(`${this.baseUrl}${endpoint}`, data, {
        headers: this.getAuthHeaders(),
      })
      .pipe(catchError((error) => this.handleError(error)));
  }

  delete<T>(endpoint: string, additionalParams?: any): Observable<ApiResponse<T>> {
    const params: any = additionalParams || {};

    return this.http
      .delete<ApiResponse<T>>(`${this.baseUrl}${endpoint}`, {
        params,
        headers: this.getAuthHeaders(),
      })
      .pipe(
        tap((response) => {}),
        catchError((error) => {
          return this.handleError(error);
        }),
      );
  }

  private handleError(error: any): Observable<never> {
    const errorMessage = error?.error?.detail || error?.message || 'An error occurred';
    return throwError(() => ({
      status: error?.status,
      message: errorMessage,
    }));
  }
}
