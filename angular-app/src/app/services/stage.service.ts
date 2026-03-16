import { Injectable } from '@angular/core';
import { Observable, forkJoin, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { ApiService } from './api.service';
import { FormService } from './form.service';
import { Stage, Form, ApiResponse } from '../models/api.models';

@Injectable({
  providedIn: 'root',
})
export class StageService {
  constructor(
    private apiService: ApiService,
    private formService: FormService,
  ) {}

  getStages(): Observable<Stage[]> {
    return this.apiService.get<Stage[]>('/stages').pipe(
      map((response) => (Array.isArray(response.data) ? response.data : [])),
      switchMap((stages) => {
        // For each stage, load its assigned forms
        const formsRequests = stages.map((stage) =>
          this.getStageAssignedForms(stage.id).pipe(
            map((forms) => ({ ...stage, assignedForms: forms })),
          ),
        );
        return formsRequests.length > 0 ? forkJoin(formsRequests) : of([]);
      }),
    );
  }

  getStageAssignedForms(stageId: string): Observable<Form[]> {
    return this.apiService.get<any>(`/stages/${stageId}/forms`).pipe(
      switchMap((response) => {
        // The API returns form assignment records with form_id references
        if (Array.isArray(response.data) && response.data.length > 0) {
          // Load full form details (with fields) for each assigned form
          const formRequests = response.data.map((record: any) =>
            this.formService.getForm(record.form_id).pipe(
              map((formData) => {
                return {
                  ...formData,
                  // Preserve assignment metadata
                  _assignmentId: record.id,
                  _isRequired: record.is_required,
                } as Form;
              }),
            ),
          );
          return forkJoin(formRequests);
        }
        return of([]);
      }),
    );
  }

  // Returns the raw assignment records from the API without mapping
  getStageAssignedFormsRaw(stageId: string): Observable<any[]> {
    return this.apiService.get<any>(`/stages/${stageId}/forms`).pipe(
      map((response) => {
        return Array.isArray(response.data) ? response.data : [];
      }),
    );
  }

  getStage(id: string): Observable<Stage> {
    return this.apiService.get<Stage>(`/stages/${id}`).pipe(map((response) => response.data!));
  }

  createStage(stage: Partial<Stage>): Observable<Stage> {
    return this.apiService.post<Stage>('/stages', stage).pipe(map((response) => response.data!));
  }

  updateStage(id: string, stage: Partial<Stage>): Observable<Stage> {
    return this.apiService
      .put<Stage>(`/stages/${id}`, stage)
      .pipe(map((response) => response.data!));
  }

  deleteStage(id: string): Observable<void> {
    return this.apiService.delete<void>(`/stages/${id}`).pipe(map(() => undefined));
  }

  addFormToStage(stageId: string, formId: string): Observable<any> {
    return this.apiService.post<any>(`/stages/${stageId}/forms`, { form_id: formId });
  }

  removeFormFromStage(stageId: string, idToDelete: string, formId?: string): Observable<void> {
    // Use the assignment ID in the URL path - this uniquely identifies which assignment to delete
    // The idToDelete parameter is the assignment ID (e.g., f08f2d70-b259-4ae8-87de-b733530f0ab9)
    return this.apiService
      .delete<void>(`/stages/${stageId}/forms/${idToDelete}`)
      .pipe(map(() => undefined));
  }
}
