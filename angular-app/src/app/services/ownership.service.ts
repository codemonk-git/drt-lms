import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiService } from './api.service';

@Injectable({
  providedIn: 'root',
})
export class OwnershipService {
  constructor(private apiService: ApiService) {}

  // Set lead owner
  setLeadOwner(leadId: string, ownerId: string): Observable<any> {
    return this.apiService.post<any>(`/leads/${leadId}/set-owner`, {
      owner_id: ownerId,
    });
  }

  // Get current owner and stage responsibility
  getCurrentOwnerAndStage(leadId: string): Observable<any> {
    return this.apiService
      .get<any>(`/leads/${leadId}/current-owner`)
      .pipe(map((response) => response.data));
  }

  // Get ownership history for lead
  getOwnershipHistory(leadId: string): Observable<any[]> {
    return this.apiService
      .get<any[]>(`/leads/${leadId}/ownership-history`)
      .pipe(map((response) => (Array.isArray(response.data) ? response.data : [])));
  }

  // Get all leads for an owner
  getLeadsForOwner(ownerId: string): Observable<any[]> {
    return this.apiService
      .get<any[]>(`/leads/owner/${ownerId}/leads`)
      .pipe(map((response) => (Array.isArray(response.data) ? response.data : [])));
  }
}
