import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { ApiService } from './api.service';
import { AuthService } from './auth.service';
import { Followup, ApiResponse, PaginatedResponse } from '../models/api.models';

@Injectable({
  providedIn: 'root',
})
export class FollowupService {
  private followupsSubject = new BehaviorSubject<Followup[]>([]);
  followups$ = this.followupsSubject.asObservable();

  constructor(
    private apiService: ApiService,
    private authService: AuthService,
  ) {}

  private getUserId(): string {
    const user = this.authService.getCurrentUser();
    return user?.user_id || user?.id || '';
  }

  private getCompanyId(): string {
    const user = this.authService.getCurrentUser();
    return user?.company_id || '';
  }

  getFollowupsByLead(leadId: string): Observable<Followup[]> {
    return this.apiService.get<Followup[]>(`/followups/lead/${leadId}/pending`).pipe(
      map((response) => response.data || []),
      tap((followups) => this.followupsSubject.next(followups)),
    );
  }

  getFollowupsByUser(userId: string): Observable<Followup[]> {
    return this.apiService.get<Followup[]>(`/followups/user/${userId}/assigned`).pipe(
      map((response) => response.data || []),
      tap((followups) => this.followupsSubject.next(followups)),
    );
  }

  getFollowups(): Observable<Followup[]> {
    const companyId = this.getCompanyId();
    return this.apiService.get<Followup[]>(`/followups/company/${companyId}/all`).pipe(
      map((response) => response.data || []),
      tap((followups) => this.followupsSubject.next(followups)),
    );
  }

  getFollowup(id: string): Observable<Followup> {
    return this.apiService
      .get<Followup>(`/followups/${id}`)
      .pipe(map((response) => response.data!));
  }

  scheduleFollowup(data: {
    lead_id: string;
    assigned_to_user_id?: string;
    followup_type: string;
    scheduled_for: string;
    title: string;
    notes?: string;
  }): Observable<Followup> {
    const assignedUserId = data.assigned_to_user_id || this.getUserId();
    return this.apiService
      .post<Followup>('/followups/schedule', {
        lead_id: data.lead_id,
        assigned_to_user_id: assignedUserId,
        followup_type: data.followup_type,
        scheduled_for: data.scheduled_for,
        title: data.title,
        notes: data.notes,
      })
      .pipe(
        tap(() => {
          this.refreshFollowups();
        }),
      )
      .pipe(map((response) => response.data!));
  }

  scheduleFromTemplate(data: {
    lead_id: string;
    template_id: string;
    assigned_to_user_id?: string;
    delay_hours?: number;
  }): Observable<Followup> {
    const assignedUserId = data.assigned_to_user_id || this.getUserId();
    return this.apiService
      .post<Followup>('/followups/schedule-from-template', {
        lead_id: data.lead_id,
        assigned_to_user_id: assignedUserId,
        template_id: data.template_id,
        delay_hours: data.delay_hours,
      })
      .pipe(
        tap(() => {
          this.refreshFollowups();
        }),
      )
      .pipe(map((response) => response.data!));
  }

  completeFollowup(id: string, outcome?: string): Observable<Followup> {
    return this.apiService
      .post<Followup>(`/followups/${id}/complete`, { outcome })
      .pipe(
        tap(() => {
          this.refreshFollowups();
        }),
      )
      .pipe(map((response) => response.data!));
  }

  cancelFollowup(id: string, reason?: string): Observable<Followup> {
    return this.apiService
      .post<Followup>(`/followups/${id}/cancel`, { reason })
      .pipe(
        tap(() => {
          this.refreshFollowups();
        }),
      )
      .pipe(map((response) => response.data!));
  }

  deleteFollowup(id: string): Observable<any> {
    return this.apiService.delete(`/followups/${id}`).pipe(
      tap(() => {
        this.refreshFollowups();
      }),
    );
  }

  rescheduleFollowup(id: string, scheduled_for: string): Observable<Followup> {
    return this.apiService
      .post<Followup>(`/followups/${id}/reschedule`, { new_scheduled_for: scheduled_for })
      .pipe(
        tap(() => {
          this.refreshFollowups();
        }),
      )
      .pipe(map((response) => response.data!));
  }

  private refreshFollowups(): void {
    this.getFollowups().subscribe();
  }
}
