import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Stakeholder } from '../models/api.models';

@Injectable({
  providedIn: 'root',
})
export class StakeholderService {
  private apiUrl = '/api/stakeholders';

  constructor(private http: HttpClient) {}

  /**
   * Get all stakeholders for a lead
   */
  getStakeholders(leadId: string): Observable<Stakeholder[]> {
    return this.http.get<any>(`${this.apiUrl}/lead/${leadId}`).pipe(
      map((response) => {
        // Handle both wrapped and direct responses
        if (response.data && Array.isArray(response.data)) {
          return response.data;
        } else if (Array.isArray(response)) {
          return response;
        }
        return [];
      }),
    );
  }

  /**
   * Add a stakeholder to a lead
   */
  addStakeholder(
    leadId: string,
    userId: string,
    stageId: string,
    role: string = 'observer',
    notes?: string,
  ): Observable<Stakeholder> {
    const data = {
      user_id: userId,
      stage_id: stageId,
      role,
      notes,
    };
    return this.http.post<Stakeholder>(`${this.apiUrl}/lead/${leadId}`, data);
  }

  /**
   * Add multiple stakeholders at once
   */
  bulkAddStakeholders(
    leadId: string,
    userIds: string[],
    stageId: string,
    role: string = 'observer',
  ): Observable<Stakeholder[]> {
    const data = {
      user_ids: userIds,
      stage_id: stageId,
      role,
    };
    return this.http.post<Stakeholder[]>(`${this.apiUrl}/lead/${leadId}/bulk`, data);
  }

  /**
   * Remove stakeholder from lead
   */
  removeStakeholder(stakeholderId: string, reason?: string): Observable<void> {
    const data = reason ? { reason } : {};
    return this.http.delete<void>(`${this.apiUrl}/${stakeholderId}`, {
      body: data,
    });
  }

  /**
   * Record form filled by stakeholder
   */
  recordFormFilled(stakeholderId: string, formId: string): Observable<Stakeholder> {
    const data = { form_id: formId };
    return this.http.post<Stakeholder>(`${this.apiUrl}/${stakeholderId}/form`, data);
  }

  /**
   * Get stakeholder role
   */
  getStakeholderRole(leadId: string, userId: string): Observable<{ role: string }> {
    return this.http.get<{ role: string }>(`${this.apiUrl}/lead/${leadId}/user/${userId}/role`);
  }
}
