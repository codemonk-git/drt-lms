import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { map, switchMap, shareReplay, catchError } from 'rxjs/operators';
import { ApiService } from './api.service';
import { StageService } from './stage.service';
import { Lead, CreateLeadRequest, ApiResponse, PaginatedResponse } from '../models/api.models';

@Injectable({
  providedIn: 'root',
})
export class LeadService {
  private stageCache: Map<string, any> = new Map();
  private stagesCached$: Observable<any[]>;

  constructor(
    private apiService: ApiService,
    private stageService: StageService,
  ) {
    // Create a shared observable that caches stages and builds the lookup map
    this.stagesCached$ = this.stageService.getStages().pipe(
      map((stages) => {
        // Build cache map from stages
        stages.forEach((stage) => {
          this.stageCache.set(stage.name.toLowerCase(), stage.id);
        });
        return stages;
      }),
      shareReplay(1), // Cache the result and share with all subscribers
      catchError(() => of([])), // Handle errors gracefully
    );

    // Trigger the load immediately
    this.stagesCached$.subscribe();
  }

  private mapLeadResponse(lead: Lead): Lead {
    // If stage is a UUID, use it as stage_id
    // If stage is a name (like "new"), try to lookup the UUID from cache
    let stageId = lead.stage_id;

    if (!stageId && lead.stage) {
      // Try to find stage ID by name in cache
      const cachedId = this.stageCache.get(lead.stage.toLowerCase());
      if (cachedId) {
        stageId = cachedId;
      } else {
        // If not in cache, use the stage name as-is for now
        // This will show as "(removed)" in UI
        stageId = lead.stage;
      }
    }

    return {
      ...lead,
      stage_id: stageId,
      assigned_to: lead.assigned_to || lead.assigned_to_user_id,
      status: lead.status || (lead.is_lost ? 'lost' : lead.is_won ? 'won' : 'active'),
      // Keep the stage field lowercase for consistent mapping
      stage: lead.stage ? lead.stage.toLowerCase() : lead.stage,
    };
  }

  getLead(id: string): Observable<Lead> {
    // Ensure stages are cached first, then fetch the lead
    return this.stagesCached$.pipe(
      switchMap(() =>
        this.apiService
          .get<Lead>(`/leads/${id}`)
          .pipe(map((response) => this.mapLeadResponse(response.data!))),
      ),
    );
  }

  getLeads(skip: number = 0, limit: number = 10): Observable<Lead[]> {
    // Ensure stages are cached first, then fetch the leads
    return this.stagesCached$.pipe(
      switchMap(() =>
        this.apiService.getPaginated<Lead>('/leads', skip, limit).pipe(
          map((response) => {
            const leads = response.data || [];
            return leads.map((lead) => this.mapLeadResponse(lead));
          }),
        ),
      ),
    );
  }

  getAssignedLeads(userId: string, skip: number = 0, limit: number = 10): Observable<Lead[]> {
    // Fetch leads assigned to specific user from backend
    return this.stagesCached$.pipe(
      switchMap(() =>
        this.apiService
          .getPaginated<Lead>(`/leads?assigned_to_user_id=${userId}`, skip, limit)
          .pipe(
            map((response) => {
              const leads = response.data || [];
              return leads.map((lead) => this.mapLeadResponse(lead));
            }),
          ),
      ),
    );
  }

  createLead(lead: CreateLeadRequest): Observable<Lead> {
    // Add company_id to the request body from localStorage
    const userJson = localStorage.getItem('currentUser');
    const leadWithCompany = { ...lead };

    if (userJson) {
      try {
        const user = JSON.parse(userJson);
        if (user?.company_id) {
          (leadWithCompany as any).company_id = user.company_id;
        }
      } catch (e) {
        // Silently fail if user parsing fails
      }
    }

    // Ensure stages are cached first
    return this.stagesCached$.pipe(
      switchMap(() =>
        this.apiService
          .post<Lead>('/leads', leadWithCompany)
          .pipe(map((response) => this.mapLeadResponse(response.data!))),
      ),
    );
  }

  updateLead(id: string, lead: Partial<Lead>): Observable<Lead> {
    // Ensure stages are cached first
    return this.stagesCached$.pipe(
      switchMap(() =>
        this.apiService
          .put<Lead>(`/leads/${id}`, lead)
          .pipe(map((response) => this.mapLeadResponse(response.data!))),
      ),
    );
  }

  deleteLead(id: string): Observable<void> {
    return this.apiService.delete<void>(`/leads/${id}`).pipe(map(() => undefined));
  }

  bulkImportLeads(leadsData: any[]): Observable<any> {
    const userJson = localStorage.getItem('currentUser');
    let companyId = '';
    if (userJson) {
      try {
        companyId = JSON.parse(userJson)?.company_id || '';
      } catch {}
    }
    return this.apiService.post<any>('/leads/bulk-import', {
      company_id: companyId,
      leads_data: leadsData,
    });
  }

  assignLead(id: string, assignedTo: string): Observable<Lead> {
    return this.stagesCached$.pipe(
      switchMap(() =>
        this.apiService
          .post<Lead>(`/leads/${id}/assign`, { assigned_to_user_id: assignedTo })
          .pipe(map((response) => this.mapLeadResponse(response.data!))),
      ),
    );
  }

  moveLead(id: string, stageId: string): Observable<Lead> {
    return this.stagesCached$.pipe(
      switchMap(() =>
        this.apiService
          .put<Lead>(`/leads/${id}/stage`, { stage_id: stageId })
          .pipe(map((response) => this.mapLeadResponse(response.data!))),
      ),
    );
  }
}
