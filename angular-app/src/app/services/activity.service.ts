import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiService } from './api.service';

export interface Activity {
  id: string;
  company_id: string;
  user_id: string;
  activity_type: string;
  entity_type: string;
  entity_id: string;
  description: string;
  metadata: any;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  user_name?: string;
  message?: string;
  type?: string;
}

interface ApiResponse<T> {
  status: string;
  data: T;
}

@Injectable({
  providedIn: 'root',
})
export class ActivityService {
  constructor(private apiService: ApiService) {}

  /**
   * Get activities for a specific lead
   */
  getLeadActivities(leadId: string, skip: number = 0, limit: number = 100): Observable<Activity[]> {
    return this.apiService.get<any>(`/leads/${leadId}/activities?skip=${skip}&limit=${limit}`).pipe(
      map((response) => {
        if (response?.data && Array.isArray(response.data)) {
          // Process activities to extract enum values if needed
          return response.data.map((activity: any) => this.normalizeActivity(activity));
        }
        return [];
      }),
    );
  }

  /**
   * Normalize activity by extracting enum values
   */
  private normalizeActivity(activity: any): Activity {
    // Extract activity_type value if it's an Enum object
    let activityType = activity.activity_type;
    if (typeof activityType === 'object' && activityType !== null) {
      // Try to extract the value from the enum object
      activityType = activityType._value_ || activityType.value || String(activityType);
    }

    return {
      ...activity,
      activity_type: activityType,
    };
  }

  /**
   * Get all activities for a company
   */
  getCompanyActivities(
    companyId: string,
    skip: number = 0,
    limit: number = 100,
  ): Observable<Activity[]> {
    return this.apiService
      .get<any>(`/companies/${companyId}/activities?skip=${skip}&limit=${limit}`)
      .pipe(
        map((response) => {
          if (response?.data && Array.isArray(response.data)) {
            return response.data.map((activity: any) => this.normalizeActivity(activity));
          }
          return [];
        }),
      );
  }

  /**
   * Get activity summary/report for a company within a date range
   */
  getActivitySummary(
    companyId: string,
    dateFrom?: string,
    dateTo?: string,
    userId?: string,
  ): Observable<any> {
    let url = `/companies/${companyId}/activities/summary`;
    const params: string[] = [];
    if (dateFrom) params.push(`date_from=${dateFrom}`);
    if (dateTo) params.push(`date_to=${dateTo}`);
    if (userId) params.push(`user_id=${userId}`);
    if (params.length) url += '?' + params.join('&');

    return this.apiService.get<any>(url).pipe(map((response) => response?.data || {}));
  }

  /**
   * Log an activity (for potential future use)
   */
  logActivity(
    companyId: string,
    userId: string,
    activityType: string,
    entityType: string,
    entityId: string,
    description?: string,
    metadata?: any,
  ): Observable<Activity> {
    return this.apiService
      .post<any>('/activities', {
        company_id: companyId,
        user_id: userId,
        activity_type: activityType,
        entity_type: entityType,
        entity_id: entityId,
        description,
        metadata,
      })
      .pipe(map((response) => response?.data || ({} as Activity)));
  }
}
