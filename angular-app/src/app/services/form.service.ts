import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiService } from './api.service';
import { Form, FormField } from '../models/api.models';

@Injectable({
  providedIn: 'root',
})
export class FormService {
  constructor(private apiService: ApiService) {}

  getForms(skip: number = 0, limit: number = 10): Observable<Form[]> {
    return this.apiService
      .getPaginated<Form>('/forms', skip, limit)
      .pipe(map((response) => response.data || []));
  }

  getForm(id: string): Observable<Form> {
    return this.apiService.get<any>(`/forms/${id}`).pipe(
      map((response) => {
        const data = response.data;
        // Handle backend response that includes nested form and fields
        if (data.form && data.fields) {
          return {
            ...data.form,
            fields: data.fields,
          };
        }
        // Fallback for flat response
        return data;
      }),
    );
  }

  createForm(form: Partial<Form>): Observable<Form> {
    return this.apiService.post<Form>('/forms', form).pipe(map((response) => response.data!));
  }

  updateForm(id: string, form: Partial<Form>): Observable<Form> {
    return this.apiService.put<Form>(`/forms/${id}`, form).pipe(map((response) => response.data!));
  }

  deleteForm(id: string): Observable<void> {
    return this.apiService.delete<void>(`/forms/${id}`).pipe(map(() => undefined));
  }

  getFormFields(formId: string): Observable<FormField[]> {
    return this.apiService
      .get<FormField[]>(`/forms/${formId}/fields`)
      .pipe(map((response) => (Array.isArray(response.data) ? response.data : [])));
  }

  addFieldToForm(formId: string, field: Partial<FormField>): Observable<FormField> {
    return this.apiService
      .post<FormField>(`/forms/${formId}/fields`, field)
      .pipe(map((response) => response.data!));
  }

  updateField(formId: string, fieldId: string, field: Partial<FormField>): Observable<FormField> {
    return this.apiService
      .put<FormField>(`/forms/${formId}/fields/${fieldId}`, field)
      .pipe(map((response) => response.data!));
  }

  deleteFieldFromForm(formId: string, fieldId: string): Observable<void> {
    return this.apiService
      .delete<void>(`/forms/${formId}/fields/${fieldId}`)
      .pipe(map(() => undefined));
  }

  submitForm(formId: string, leadId: string, values: { [key: string]: string }): Observable<any> {
    return this.apiService.post<any>(`/forms/${formId}/submit`, {
      lead_id: leadId,
      data: values,
    });
  }

  getLeadFormHistory(leadId: string): Observable<any[]> {
    return this.apiService
      .get<any[]>(`/forms/lead/${leadId}/history`)
      .pipe(map((response) => (Array.isArray(response.data) ? response.data : [])));
  }

  updateFormVisibility(formId: string, hiddenFromStages: string[]): Observable<Form> {
    return this.apiService
      .put<Form>(`/forms/${formId}/visibility`, { hidden_from_stages: hiddenFromStages })
      .pipe(map((response) => response.data!));
  }
}
