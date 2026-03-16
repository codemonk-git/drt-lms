import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiService } from './api.service';
import { User, ApiResponse } from '../models/api.models';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  constructor(private apiService: ApiService) {}

  getUser(userId: string): Observable<User | null> {
    return this.apiService.get<User>(`/users/${userId}`).pipe(
      map((response: ApiResponse<User>) => {
        return response.data || null;
      }),
    );
  }

  getUsers(): Observable<User[]> {
    return this.apiService.getPaginated<User>('/users', 0, 1000).pipe(
      map((response: any) => {
        // Handle both array and paginated response
        const users = Array.isArray(response.data) ? response.data : response.data?.data || [];
        return users;
      }),
    );
  }

  createUser(userData: any): Observable<User> {
    // Add company_id from localStorage to the request body (required for /users endpoint)
    const userJson = localStorage.getItem('currentUser');
    const dataWithCompanyId = { ...userData };

    if (userJson) {
      try {
        const user = JSON.parse(userJson);
        if (user?.company_id) {
          dataWithCompanyId.company_id = user.company_id;
        }
      } catch (e) {
        // Silently fail if user parsing fails
      }
    }

    return this.apiService
      .post<User>('/users', dataWithCompanyId)
      .pipe(map((response: ApiResponse<User>) => response.data || userData));
  }

  deleteUser(userId: string): Observable<any> {
    return this.apiService.delete<void>(`/users/${userId}`);
  }

  updateUser(userId: string, userData: Partial<User>): Observable<any> {
    return this.apiService
      .put<User>(`/users/${userId}`, userData)
      .pipe(map((response: ApiResponse<User>) => response.data || userData));
  }

  changePassword(userId: string, oldPassword: string, newPassword: string): Observable<any> {
    return this.apiService.post<any>(`/users/${userId}/change-password`, {
      old_password: oldPassword,
      new_password: newPassword,
    });
  }

  resetPassword(userId: string, newPassword: string): Observable<any> {
    return this.apiService.post<any>(`/users/${userId}/reset-password`, {
      new_password: newPassword,
    });
  }

  suspendUser(userId: string): Observable<any> {
    return this.apiService.post<any>(`/users/${userId}/suspend`, {});
  }

  activateUser(userId: string): Observable<any> {
    return this.apiService.post<any>(`/users/${userId}/activate`, {});
  }
}
