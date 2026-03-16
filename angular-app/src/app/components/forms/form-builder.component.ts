import {
  Component,
  Input,
  OnInit,
  ChangeDetectorRef,
  ChangeDetectionStrategy,
  OnDestroy,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormsModule,
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { FormService } from '../../services/form.service';
import { Form, FormField } from '../../models/api.models';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

interface FieldTemplate {
  type: string;
  label: string;
  icon: string;
  category: string;
}

@Component({
  selector: 'app-form-builder',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, DragDropModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="form-builder-container">
      <!-- Left Panel: Field Palette -->
      <div class="field-palette">
        <h3>Field Types</h3>
        <input
          type="search"
          placeholder="Search fields..."
          [(ngModel)]="searchQuery"
          class="search-input"
        />

        <div class="field-categories">
          <ng-container *ngFor="let category of filteredCategories">
            <div class="category" *ngIf="category.fields.length > 0">
              <h4>{{ category.name }}</h4>
              <div class="field-list">
                <div
                  *ngFor="let field of category.fields"
                  class="field-item"
                  draggable="true"
                  (dragstart)="onFieldDragStart($event, field)"
                  title="{{ field.label }}"
                >
                  <span class="field-icon">{{ field.icon }}</span>
                  <span class="field-name">{{ field.label }}</span>
                </div>
              </div>
            </div>
          </ng-container>
        </div>
      </div>

      <!-- Center Panel: Form Canvas -->
      <div class="form-canvas">
        <div class="canvas-header">
          <h2>{{ form.name }}</h2>
          <div class="canvas-actions">
            <button class="btn-save" (click)="saveForm()" [disabled]="isSaving">
              {{ isSaving ? 'Saving...' : 'Save Form' }}
            </button>
            <button class="btn-preview" (click)="togglePreview()">
              {{ showPreview ? 'Edit' : 'Preview' }}
            </button>
          </div>
        </div>

        <!-- Form fields canvas -->
        <div
          class="form-fields-canvas"
          [class.empty]="(!form.fields || form.fields.length === 0) && !showPreview"
          (dragover)="onCanvasDragOver($event)"
          (drop)="onCanvasDrop($event)"
          (dragleave)="onCanvasDragLeave($event)"
        >
          <div
            *ngIf="(!form.fields || form.fields.length === 0) && !showPreview"
            class="canvas-empty"
          >
            <p>Drag fields here to build your form</p>
          </div>

          <div
            *ngFor="let field of form.fields; let i = index"
            class="canvas-field-wrapper"
            [class.selected]="selectedFieldId === field.id && !showPreview"
            [class.preview-mode]="showPreview"
            (click)="!showPreview && selectField(field)"
          >
            <div class="field-preview" [ngSwitch]="field.field_type">
              <!-- Text-like fields -->
              <ng-container *ngSwitchCase="'text'">
                <label
                  >{{ field.label }}
                  <span class="required" *ngIf="field.is_required">*</span></label
                >
                <input
                  type="text"
                  [placeholder]="field.placeholder || ''"
                  [disabled]="!showPreview"
                />
              </ng-container>

              <ng-container *ngSwitchCase="'email'">
                <label
                  >{{ field.label }}
                  <span class="required" *ngIf="field.is_required">*</span></label
                >
                <input
                  type="email"
                  [placeholder]="field.placeholder || ''"
                  [disabled]="!showPreview"
                />
              </ng-container>

              <ng-container *ngSwitchCase="'phone'">
                <label
                  >{{ field.label }}
                  <span class="required" *ngIf="field.is_required">*</span></label
                >
                <input
                  type="tel"
                  [placeholder]="field.placeholder || ''"
                  [disabled]="!showPreview"
                />
              </ng-container>

              <ng-container *ngSwitchCase="'number'">
                <label
                  >{{ field.label }}
                  <span class="required" *ngIf="field.is_required">*</span></label
                >
                <input
                  type="number"
                  [placeholder]="field.placeholder || ''"
                  [disabled]="!showPreview"
                />
              </ng-container>

              <ng-container *ngSwitchCase="'url'">
                <label
                  >{{ field.label }}
                  <span class="required" *ngIf="field.is_required">*</span></label
                >
                <input
                  type="url"
                  [placeholder]="field.placeholder || ''"
                  [disabled]="!showPreview"
                />
              </ng-container>

              <!-- Textarea -->
              <ng-container *ngSwitchCase="'textarea'">
                <label
                  >{{ field.label }}
                  <span class="required" *ngIf="field.is_required">*</span></label
                >
                <textarea
                  [placeholder]="field.placeholder || ''"
                  [disabled]="!showPreview"
                  rows="3"
                ></textarea>
              </ng-container>

              <ng-container *ngSwitchCase="'rich_text'">
                <label
                  >{{ field.label }}
                  <span class="required" *ngIf="field.is_required">*</span></label
                >
                <div class="rich-text-preview">Rich Text Editor</div>
              </ng-container>

              <!-- Selection fields -->
              <ng-container *ngSwitchCase="'select'">
                <label
                  >{{ field.label }}
                  <span class="required" *ngIf="field.is_required">*</span></label
                >
                <select [disabled]="!showPreview">
                  <option value="">Choose an option</option>
                  <option *ngFor="let opt of field.options">{{ opt.label }}</option>
                </select>
              </ng-container>

              <ng-container *ngSwitchCase="'multi_select'">
                <label
                  >{{ field.label }}
                  <span class="required" *ngIf="field.is_required">*</span></label
                >
                <select multiple [disabled]="!showPreview">
                  <option *ngFor="let opt of field.options">{{ opt.label }}</option>
                </select>
              </ng-container>

              <ng-container *ngSwitchCase="'radio'">
                <label
                  >{{ field.label }}
                  <span class="required" *ngIf="field.is_required">*</span></label
                >
                <div class="radio-group">
                  <label *ngFor="let opt of field.options" class="radio-item">
                    <input type="radio" disabled />
                    <span>{{ opt.label }}</span>
                  </label>
                </div>
              </ng-container>

              <ng-container *ngSwitchCase="'checkbox'">
                <label class="checkbox-item">
                  <input type="checkbox" disabled />
                  <span
                    >{{ field.label }}
                    <span class="required" *ngIf="field.is_required">*</span></span
                  >
                </label>
              </ng-container>

              <ng-container *ngSwitchCase="'toggle'">
                <label class="toggle-item">
                  <span
                    >{{ field.label }}
                    <span class="required" *ngIf="field.is_required">*</span></span
                  >
                  <div class="toggle-switch"></div>
                </label>
              </ng-container>

              <!-- Date/Time -->
              <ng-container *ngSwitchCase="'date'">
                <label
                  >{{ field.label }}
                  <span class="required" *ngIf="field.is_required">*</span></label
                >
                <input type="date" disabled />
              </ng-container>

              <ng-container *ngSwitchCase="'datetime'">
                <label
                  >{{ field.label }}
                  <span class="required" *ngIf="field.is_required">*</span></label
                >
                <input type="datetime-local" disabled />
              </ng-container>

              <ng-container *ngSwitchCase="'time'">
                <label
                  >{{ field.label }}
                  <span class="required" *ngIf="field.is_required">*</span></label
                >
                <input type="time" disabled />
              </ng-container>

              <!-- File/Media -->
              <ng-container *ngSwitchCase="'file'">
                <label
                  >{{ field.label }}
                  <span class="required" *ngIf="field.is_required">*</span></label
                >
                <div class="file-upload-preview">📎 Upload File</div>
              </ng-container>

              <ng-container *ngSwitchCase="'image'">
                <label
                  >{{ field.label }}
                  <span class="required" *ngIf="field.is_required">*</span></label
                >
                <div class="image-upload-preview">🖼 Upload Image</div>
              </ng-container>

              <ng-container *ngSwitchCase="'signature'">
                <label
                  >{{ field.label }}
                  <span class="required" *ngIf="field.is_required">*</span></label
                >
                <div class="signature-preview">✎ Sign Here</div>
              </ng-container>

              <!-- Rating/Visual -->
              <ng-container *ngSwitchCase="'rating'">
                <label
                  >{{ field.label }}
                  <span class="required" *ngIf="field.is_required">*</span></label
                >
                <div class="rating-preview">
                  <span *ngFor="let i of [1, 2, 3, 4, 5]" class="star">⭐</span>
                </div>
              </ng-container>

              <ng-container *ngSwitchCase="'slider'">
                <label
                  >{{ field.label }}
                  <span class="required" *ngIf="field.is_required">*</span></label
                >
                <input type="range" disabled />
              </ng-container>

              <ng-container *ngSwitchCase="'color'">
                <label
                  >{{ field.label }}
                  <span class="required" *ngIf="field.is_required">*</span></label
                >
                <input type="color" disabled />
              </ng-container>

              <!-- Advanced -->
              <ng-container *ngSwitchCase="'location'">
                <label
                  >{{ field.label }}
                  <span class="required" *ngIf="field.is_required">*</span></label
                >
                <div class="location-preview">📍 Location Map</div>
              </ng-container>

              <ng-container *ngSwitchCase="'table'">
                <label
                  >{{ field.label }}
                  <span class="required" *ngIf="field.is_required">*</span></label
                >
                <div class="table-preview">📊 Data Table</div>
              </ng-container>

              <!-- Default -->
              <ng-container *ngSwitchDefault>
                <label
                  >{{ field.label }}
                  <span class="required" *ngIf="field.is_required">*</span></label
                >
                <div class="default-preview">{{ field.field_type }}</div>
              </ng-container>
            </div>

            <!-- Field toolbar -->
            <div class="field-toolbar" *ngIf="!showPreview">
              <button class="btn-edit" (click)="editField(field)" title="Edit">✎</button>
              <button class="btn-duplicate" (click)="duplicateField(field)" title="Duplicate">
                ⎘
              </button>
              <button class="btn-delete" (click)="deleteField(field.id)" title="Delete">🗑</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Right Panel: Properties Editor -->
      <div class="properties-panel" *ngIf="selectedField && !showPreview">
        <div class="properties-header">
          <h3>Field Properties</h3>
          <button class="btn-close" (click)="selectedField = null">×</button>
        </div>

        <div class="properties-content">
          <form [formGroup]="propertyForm" (ngSubmit)="updateField()">
            <!-- Basic Properties -->
            <div class="property-group">
              <h4>Basic</h4>
              <div class="form-group">
                <label>Label</label>
                <input type="text" formControlName="label" class="property-input" />
              </div>
              <div class="form-group">
                <label>Placeholder</label>
                <input type="text" formControlName="placeholder" class="property-input" />
              </div>
              <div class="form-group">
                <label>Help Text</label>
                <input type="text" formControlName="help_text" class="property-input" />
              </div>
            </div>

            <!-- Validation -->
            <div class="property-group">
              <h4>Validation</h4>
              <div class="checkbox-group">
                <label>
                  <input type="checkbox" formControlName="is_required" />
                  Required
                </label>
                <label>
                  <input type="checkbox" formControlName="readonly" />
                  Read-only
                </label>
              </div>
            </div>

            <!-- Type-specific Properties -->
            <div class="property-group" *ngIf="selectedField.field_type === 'file'">
              <h4>File Settings</h4>
              <div class="form-group">
                <label>Max File Size (MB)</label>
                <input type="number" formControlName="max_file_size_mb" class="property-input" />
              </div>
              <div class="form-group">
                <label>Allowed Types</label>
                <input
                  type="text"
                  formControlName="allowed_file_types"
                  placeholder="pdf,doc,docx"
                  class="property-input"
                />
              </div>
            </div>

            <div class="property-group" *ngIf="selectedField.field_type === 'rating'">
              <h4>Rating Settings</h4>
              <div class="form-group">
                <label>Min Rating</label>
                <input type="number" formControlName="min_rating" class="property-input" />
              </div>
              <div class="form-group">
                <label>Max Rating</label>
                <input type="number" formControlName="max_rating" class="property-input" />
              </div>
            </div>

            <div class="property-group" *ngIf="selectedField.field_type === 'slider'">
              <h4>Slider Settings</h4>
              <div class="form-group">
                <label>Min Value</label>
                <input type="number" formControlName="min_value" class="property-input" />
              </div>
              <div class="form-group">
                <label>Max Value</label>
                <input type="number" formControlName="max_value" class="property-input" />
              </div>
            </div>

            <div class="property-group" *ngIf="isSelectionField(selectedField.field_type)">
              <h4>Options</h4>
              <div class="form-group">
                <label>Add Option</label>
                <div class="option-input-group">
                  <input
                    type="text"
                    [(ngModel)]="newOptionLabel"
                    [ngModelOptions]="{ standalone: true }"
                    placeholder="Option label"
                  />
                  <button type="button" (click)="addOption()" class="btn-small">+</button>
                </div>
              </div>
              <div class="options-list">
                <div *ngFor="let opt of selectedField.options; let i = index" class="option-item">
                  <span>{{ opt.label }}</span>
                  <button type="button" (click)="removeOption(i)" class="btn-remove">×</button>
                </div>
              </div>
            </div>

            <div class="property-group" *ngIf="selectedField.field_type === 'location'">
              <h4>Location Settings</h4>
              <label>
                <input type="checkbox" formControlName="auto_capture_geolocation" />
                Auto-capture GPS
              </label>
              <label>
                <input type="checkbox" formControlName="is_hidden" />
                Hidden field
              </label>
            </div>

            <!-- Action Buttons -->
            <div class="property-actions">
              <button type="submit" class="btn-update">Update</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .form-builder-container {
        display: grid;
        grid-template-columns: 250px 1fr 300px;
        gap: 1px;
        height: calc(100vh - 120px);
        background: #e5e7eb;
      }

      /* LEFT PANEL: Field Palette */
      .field-palette {
        background: #f9fafb;
        padding: 20px;
        overflow-y: auto;
        border-right: 1px solid #e5e7eb;
      }

      .field-palette h3 {
        margin: 0 0 16px 0;
        font-size: 16px;
        color: #1f2937;
        font-weight: 700;
      }

      .search-input {
        width: 100%;
        padding: 8px 12px;
        border: 1px solid #d1d5db;
        border-radius: 6px;
        font-size: 13px;
        margin-bottom: 16px;
      }

      .field-categories {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .category h4 {
        margin: 0 0 8px 0;
        font-size: 12px;
        text-transform: uppercase;
        color: #6b7280;
        font-weight: 600;
        letter-spacing: 0.5px;
      }

      .field-list {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      .field-item {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 12px;
        background: white;
        border: 1px solid #d1d5db;
        border-radius: 6px;
        cursor: move;
        transition: all 0.2s;
        font-size: 13px;
        user-select: none;
      }

      .field-item:hover {
        border-color: #0284c7;
        background: #dbeafe;
        box-shadow: 0 2px 4px rgba(2, 132, 199, 0.1);
      }

      .cdk-drag-preview {
        box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
        border-radius: 6px;
        padding: 10px 12px;
        background: white;
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 13px;
      }

      .cdk-drop-list-dragging .cdk-drag:not(.cdk-drag-dragging) {
        transition: transform 250ms cubic-bezier(0, 0, 0.2, 1);
      }

      .field-icon {
        font-size: 16px;
      }

      .field-name {
        flex: 1;
        color: #374151;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      /* CENTER PANEL: Form Canvas */
      .form-canvas {
        background: white;
        display: flex;
        flex-direction: column;
        border-right: 1px solid #e5e7eb;
      }

      .canvas-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 20px;
        border-bottom: 1px solid #e5e7eb;
      }

      .canvas-header h2 {
        margin: 0;
        color: #1f2937;
        font-size: 24px;
      }

      .canvas-actions {
        display: flex;
        gap: 12px;
      }

      .btn-save,
      .btn-preview {
        padding: 8px 16px;
        border: none;
        border-radius: 6px;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
      }

      .btn-save {
        background: #0284c7;
        color: white;
      }

      .btn-save:hover:not(:disabled) {
        background: #0369a1;
      }

      .btn-save:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }

      .btn-preview {
        background: #e5e7eb;
        color: #374151;
      }

      .btn-preview:hover {
        background: #d1d5db;
      }

      .form-fields-canvas {
        flex: 1;
        padding: 30px;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 20px;
        min-height: 300px;
      }

      .form-fields-canvas.cdk-drop-list-dragging .canvas-field-wrapper:nth-child(n + 1) {
        transition: transform 250ms cubic-bezier(0, 0, 0.2, 1);
      }

      .form-fields-canvas.empty {
        justify-content: center;
        align-items: center;
        border: 3px dashed #d1d5db;
        border-radius: 8px;
        background: #f9fafb;
      }

      .canvas-empty {
        text-align: center;
        color: #9ca3af;
        font-size: 16px;
      }

      .canvas-field-wrapper {
        position: relative;
        padding: 16px;
        background: #f9fafb;
        border: 2px solid #e5e7eb;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s;
      }

      .canvas-field-wrapper:hover {
        border-color: #0284c7;
        background: #dbeafe;
      }

      .canvas-field-wrapper.selected {
        border-color: #0284c7;
        background: #dbeafe;
        box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.1);
      }

      .canvas-field-wrapper.preview-mode {
        cursor: text;
        border-color: #e5e7eb;
        background: white;
      }

      .canvas-field-wrapper.preview-mode:hover {
        border-color: #e5e7eb;
        background: white;
      }

      .field-preview {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      .field-preview label {
        font-weight: 600;
        font-size: 14px;
        color: #374151;
      }

      .required {
        color: #ef4444;
      }

      .field-preview input[disabled],
      .field-preview select[disabled],
      .field-preview textarea[disabled] {
        background: white;
        border: 1px solid #d1d5db;
        padding: 8px 12px;
        border-radius: 6px;
        font-size: 13px;
        cursor: not-allowed;
        opacity: 0.6;
      }

      .radio-group {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .radio-item,
      .checkbox-item,
      .toggle-item {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 13px;
      }

      .toggle-switch {
        width: 40px;
        height: 20px;
        background: #d1d5db;
        border-radius: 10px;
        position: relative;
      }

      .file-upload-preview,
      .image-upload-preview,
      .signature-preview,
      .location-preview,
      .table-preview,
      .rich-text-preview,
      .default-preview {
        padding: 20px;
        background: white;
        border: 2px dashed #d1d5db;
        border-radius: 6px;
        text-align: center;
        color: #6b7280;
        font-size: 13px;
      }

      .rating-preview {
        display: flex;
        gap: 4px;
      }

      .star {
        font-size: 20px;
        cursor: pointer;
      }

      .field-toolbar {
        position: absolute;
        top: 8px;
        right: 8px;
        display: flex;
        gap: 4px;
      }

      .btn-edit,
      .btn-duplicate,
      .btn-delete {
        width: 28px;
        height: 28px;
        border: none;
        background: white;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
        transition: all 0.2s;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .btn-edit:hover {
        background: #dbeafe;
        color: #0284c7;
      }

      .btn-duplicate:hover {
        background: #fef3c7;
        color: #d97706;
      }

      .btn-delete:hover {
        background: #fee2e2;
        color: #ef4444;
      }

      /* RIGHT PANEL: Properties */
      .properties-panel {
        background: #f9fafb;
        display: flex;
        flex-direction: column;
        border-left: 1px solid #e5e7eb;
        overflow: hidden;
      }

      .properties-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px;
        border-bottom: 1px solid #e5e7eb;
      }

      .properties-header h3 {
        margin: 0;
        font-size: 14px;
        font-weight: 700;
        color: #1f2937;
      }

      .btn-close {
        background: none;
        border: none;
        font-size: 24px;
        color: #6b7280;
        cursor: pointer;
        padding: 0;
        width: 28px;
        height: 28px;
      }

      .btn-close:hover {
        color: #1f2937;
      }

      .properties-content {
        flex: 1;
        overflow-y: auto;
        padding: 16px;
      }

      .property-group {
        margin-bottom: 20px;
        padding-bottom: 16px;
        border-bottom: 1px solid #e5e7eb;
      }

      .property-group h4 {
        margin: 0 0 12px 0;
        font-size: 12px;
        font-weight: 700;
        text-transform: uppercase;
        color: #6b7280;
        letter-spacing: 0.5px;
      }

      .form-group {
        margin-bottom: 12px;
      }

      .form-group label {
        display: block;
        font-size: 12px;
        font-weight: 600;
        color: #374151;
        margin-bottom: 6px;
      }

      .property-input {
        width: 100%;
        padding: 8px 10px;
        border: 1px solid #d1d5db;
        border-radius: 4px;
        font-size: 12px;
        box-sizing: border-box;
      }

      .property-input:focus {
        outline: none;
        border-color: #0284c7;
        box-shadow: 0 0 0 2px rgba(2, 132, 199, 0.1);
      }

      .checkbox-group {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .checkbox-group label {
        display: flex;
        align-items: center;
        gap: 6px;
        font-weight: 500;
        cursor: pointer;
      }

      .option-input-group {
        display: flex;
        gap: 6px;
      }

      .option-input-group input {
        flex: 1;
        padding: 8px 10px;
        border: 1px solid #d1d5db;
        border-radius: 4px;
        font-size: 12px;
      }

      .btn-small {
        padding: 6px 12px;
        background: #0284c7;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
        font-weight: 600;
      }

      .btn-small:hover {
        background: #0369a1;
      }

      .options-list {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      .option-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 10px;
        background: white;
        border: 1px solid #e5e7eb;
        border-radius: 4px;
        font-size: 12px;
      }

      .btn-remove {
        background: none;
        border: none;
        color: #ef4444;
        cursor: pointer;
        font-size: 16px;
        padding: 0;
        width: 20px;
        height: 20px;
      }

      .btn-update {
        width: 100%;
        padding: 10px;
        background: #0284c7;
        color: white;
        border: none;
        border-radius: 6px;
        font-weight: 600;
        cursor: pointer;
        margin-top: 12px;
      }

      .btn-update:hover {
        background: #0369a1;
      }

      .property-actions {
        margin-top: 16px;
        padding-top: 16px;
        border-top: 1px solid #e5e7eb;
      }

      /* Scrollbar styling */
      ::-webkit-scrollbar {
        width: 8px;
      }

      ::-webkit-scrollbar-track {
        background: transparent;
      }

      ::-webkit-scrollbar-thumb {
        background: #d1d5db;
        border-radius: 4px;
      }

      ::-webkit-scrollbar-thumb:hover {
        background: #9ca3af;
      }
    `,
  ],
})
export class FormBuilderComponent implements OnInit, OnDestroy {
  @Input() form!: Form;
  @ViewChild('fieldPalette') fieldPaletteList: any;

  fieldTemplates: FieldTemplate[] = [
    // Basic Text
    { type: 'text', label: 'Text', icon: 'T', category: 'Basic Text' },
    { type: 'email', label: 'Email', icon: '✉', category: 'Basic Text' },
    { type: 'phone', label: 'Phone', icon: '☎', category: 'Basic Text' },
    { type: 'number', label: 'Number', icon: '#', category: 'Basic Text' },
    { type: 'url', label: 'URL', icon: '🔗', category: 'Basic Text' },
    // Text Areas
    { type: 'textarea', label: 'Text Area', icon: '📝', category: 'Text Areas' },
    { type: 'rich_text', label: 'Rich Text', icon: '✨', category: 'Text Areas' },
    // Selection
    { type: 'select', label: 'Dropdown', icon: '▼', category: 'Selection' },
    { type: 'multi_select', label: 'Multi-Select', icon: '☑', category: 'Selection' },
    { type: 'radio', label: 'Radio', icon: '◯', category: 'Selection' },
    { type: 'checkbox', label: 'Checkbox', icon: '☑', category: 'Selection' },
    { type: 'toggle', label: 'Toggle', icon: '⚪', category: 'Selection' },
    { type: 'combobox', label: 'Combobox', icon: '◇', category: 'Selection' },
    // Date/Time
    { type: 'date', label: 'Date', icon: '📅', category: 'Date & Time' },
    { type: 'datetime', label: 'DateTime', icon: '📅🕐', category: 'Date & Time' },
    { type: 'time', label: 'Time', icon: '🕐', category: 'Date & Time' },
    { type: 'datetime_range', label: 'Date Range', icon: '📆', category: 'Date & Time' },
    // Files
    { type: 'file', label: 'File', icon: '📄', category: 'Files & Media' },
    { type: 'image', label: 'Image', icon: '🖼', category: 'Files & Media' },
    { type: 'signature', label: 'Signature', icon: '✍', category: 'Files & Media' },
    // Rating/Visual
    { type: 'rating', label: 'Rating', icon: '⭐', category: 'Rating & Visual' },
    { type: 'likert_scale', label: 'Likert Scale', icon: '📊', category: 'Rating & Visual' },
    { type: 'slider', label: 'Slider', icon: '━━━', category: 'Rating & Visual' },
    { type: 'color', label: 'Color', icon: '🎨', category: 'Rating & Visual' },
    // Advanced
    { type: 'location', label: 'Location', icon: '📍', category: 'Advanced' },
    { type: 'reference', label: 'Reference', icon: '🔗', category: 'Advanced' },
    { type: 'table', label: 'Table', icon: '📊', category: 'Advanced' },
    { type: 'autocomplete', label: 'Autocomplete', icon: '🔍', category: 'Advanced' },
    { type: 'template_text', label: 'Template', icon: '📋', category: 'Advanced' },
  ];

  searchQuery = '';
  selectedField: FormField | null = null;
  selectedFieldId: string | null = null;
  propertyForm: FormGroup;
  newOptionLabel = '';
  showPreview = false;
  isSaving = false;
  private destroy$ = new Subject<void>();
  private originalFieldIds: Set<string> = new Set();

  get filteredCategories() {
    const categories = new Map<string, FieldTemplate[]>();

    this.fieldTemplates.forEach((field) => {
      if (field.label.toLowerCase().includes(this.searchQuery.toLowerCase())) {
        if (!categories.has(field.category)) {
          categories.set(field.category, []);
        }
        categories.get(field.category)!.push(field);
      }
    });

    return Array.from(categories.entries()).map(([name, fields]) => ({ name, fields }));
  }

  constructor(
    private formService: FormService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef,
  ) {
    this.propertyForm = this.fb.group({
      label: [''],
      placeholder: [''],
      help_text: [''],
      is_required: [false],
      readonly: [false],
      max_file_size_mb: [''],
      allowed_file_types: [''],
      min_rating: [1],
      max_rating: [5],
      min_value: [0],
      max_value: [100],
      auto_capture_geolocation: [false],
      is_hidden: [false],
    });
  }

  ngOnInit(): void {
    if (!this.form.fields) {
      this.form.fields = [];
    }
    // Store original field IDs to detect deletions when reopening
    this.originalFieldIds = new Set(this.form.fields.map((f) => f.id));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onFieldDragStart(event: DragEvent, field: FieldTemplate): void {
    event.dataTransfer!.effectAllowed = 'copy';
    event.dataTransfer!.setData('fieldType', field.type);
  }

  onCanvasDragOver(event: DragEvent): void {
    event.preventDefault();
    event.dataTransfer!.dropEffect = 'copy';
  }

  onCanvasDragLeave(event: DragEvent): void {
    // Optional: remove visual feedback
  }

  onCanvasDrop(event: DragEvent): void {
    event.preventDefault();
    const fieldType = event.dataTransfer!.getData('fieldType');
    if (fieldType) {
      this.addNewField(fieldType);
    }
  }

  drop(event: CdkDragDrop<any>): void {
    // Reordering within the canvas
    const fields = this.form.fields as FormField[];
    if (fields && event.previousContainer === event.container) {
      const temp = fields[event.previousIndex];
      fields[event.previousIndex] = fields[event.currentIndex];
      fields[event.currentIndex] = temp;
      this.cdr.markForCheck();
    }
  }

  addNewField(fieldType: string, index?: number): void {
    const template = this.fieldTemplates.find((f) => f.type === fieldType);
    if (!template) return;

    const newField: FormField = {
      id: 'temp_' + Date.now(),
      form_id: this.form.id,
      label: template.label,
      field_type: fieldType as any,
      placeholder: '',
      help_text: '',
      required: false,
      readonly: false,
      order: this.form.fields?.length || 0,
      options: [],
      min_length: undefined,
      max_length: undefined,
      pattern: undefined,
      conditional_field_id: undefined,
      conditional_value: undefined,
    };

    if (index !== undefined && this.form.fields) {
      this.form.fields.splice(index, 0, newField);
    } else {
      if (!this.form.fields) this.form.fields = [];
      this.form.fields.push(newField);
    }

    this.selectedFieldId = newField.id;
    this.selectField(newField);
    this.cdr.markForCheck();
  }

  selectField(field: FormField): void {
    this.selectedField = field;
    this.selectedFieldId = field.id;
    this.propertyForm.patchValue({
      label: field.label,
      placeholder: field.placeholder,
      help_text: field.help_text,
      is_required: field.required,
      readonly: field.readonly,
    });
    this.cdr.markForCheck();
  }

  editField(field: FormField): void {
    this.selectField(field);
  }

  updateField(): void {
    if (!this.selectedField) return;

    const values = this.propertyForm.value;
    this.selectedField.label = values.label;
    this.selectedField.placeholder = values.placeholder;
    this.selectedField.help_text = values.help_text;
    this.selectedField.required = values.is_required;
    this.selectedField.readonly = values.readonly;

    // Type-specific updates
    if (values.max_file_size_mb) this.selectedField.max_file_size_mb = values.max_file_size_mb;
    if (values.allowed_file_types)
      this.selectedField.allowed_file_types = values.allowed_file_types
        .split(',')
        .map((t: string) => t.trim());
    if (values.min_rating) this.selectedField.min_rating = values.min_rating;
    if (values.max_rating) this.selectedField.max_rating = values.max_rating;
    if (values.min_value !== undefined) this.selectedField.min_value = values.min_value;
    if (values.max_value !== undefined) this.selectedField.max_value = values.max_value;
    if (this.selectedField.field_type === 'location') {
      this.selectedField.auto_capture_geolocation = values.auto_capture_geolocation;
      this.selectedField.is_hidden = values.is_hidden;
    }

    this.cdr.markForCheck();
  }

  addOption(): void {
    if (!this.selectedField || !this.newOptionLabel.trim()) return;

    if (!this.selectedField.options) {
      this.selectedField.options = [];
    }

    this.selectedField.options.push({
      label: this.newOptionLabel,
      value: this.newOptionLabel.toLowerCase().replace(/\s+/g, '_'),
    });

    this.newOptionLabel = '';
    this.cdr.markForCheck();
  }

  removeOption(index: number): void {
    if (this.selectedField?.options) {
      this.selectedField.options.splice(index, 1);
      this.cdr.markForCheck();
    }
  }

  duplicateField(field: FormField): void {
    const clone = { ...field, id: 'temp_' + Date.now() };
    const index = this.form.fields?.indexOf(field) ?? -1;
    if (index >= 0 && this.form.fields) {
      this.form.fields.splice(index + 1, 0, clone);
    }
    this.cdr.markForCheck();
  }

  deleteField(fieldId: string): void {
    if (!confirm('Delete this field?')) return;
    this.form.fields = this.form.fields?.filter((f) => f.id !== fieldId) || [];
    if (this.selectedFieldId === fieldId) {
      this.selectedField = null;
      this.selectedFieldId = null;
    }
    this.cdr.markForCheck();
  }

  isSelectionField(fieldType: string): boolean {
    return ['select', 'multi_select', 'radio', 'checkbox', 'combobox'].includes(fieldType);
  }

  togglePreview(): void {
    this.showPreview = !this.showPreview;
    this.cdr.markForCheck();
  }

  saveForm(): void {
    console.log('🔵 saveForm() called', {
      formId: this.form.id,
      fieldCount: this.form.fields?.length,
    });
    this.isSaving = true;
    let saved = 0;

    // Identify deleted fields
    const currentFieldIds = new Set((this.form.fields || []).map((f) => f.id));
    const deletedFieldIds: string[] = [];
    this.originalFieldIds.forEach((id) => {
      if (!currentFieldIds.has(id)) {
        deletedFieldIds.push(id);
      }
    });
    console.log(`🗑️ Deleted fields: ${deletedFieldIds.length}`, deletedFieldIds);

    // Total: 1 form update + N field create/updates + M deletions
    const total = (this.form.fields?.length || 0) + 1 + deletedFieldIds.length;

    // Save form metadata first
    this.formService
      .updateForm(this.form.id, {
        name: this.form.name,
        description: this.form.description,
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('✅ Form metadata saved', response);
          saved++;
          // Then save all fields
          if (this.form.fields && this.form.fields.length > 0) {
            this.form.fields.forEach((field, index) => {
              // For existing fields (not temp_*), update them
              if (!field.id.startsWith('temp_')) {
                console.log(`📝 Updating existing field ${index}:`, field.id);
                this.formService
                  .updateField(this.form.id, field.id, field)
                  .pipe(takeUntil(this.destroy$))
                  .subscribe({
                    next: (resp) => {
                      console.log(`✅ Field ${index} updated`, field.id);
                      saved++;
                      if (saved === total) {
                        this.onSaveComplete();
                      }
                    },
                    error: (err) => {
                      console.error(`❌ Error updating field ${index}:`, err);
                      saved++;
                      if (saved === total) {
                        this.onSaveComplete();
                      }
                    },
                  });
              } else {
                // For new fields, create them
                console.log(`📝 Creating new field ${index}:`, field.id);
                this.formService
                  .addFieldToForm(this.form.id, field)
                  .pipe(takeUntil(this.destroy$))
                  .subscribe({
                    next: (createdField) => {
                      console.log(`✅ Field ${index} created`, createdField.id);
                      field.id = createdField.id;
                      saved++;
                      if (saved === total) {
                        this.onSaveComplete();
                      }
                    },
                    error: (err) => {
                      console.error(`❌ Error creating field ${index}:`, err);
                      saved++;
                      if (saved === total) {
                        this.onSaveComplete();
                      }
                    },
                  });
              }
            });
          } else {
            console.log('ℹ️ No fields to save');
          }

          // Delete removed fields
          if (deletedFieldIds.length > 0) {
            console.log(`🗑️ Deleting ${deletedFieldIds.length} fields...`);
            deletedFieldIds.forEach((fieldId, index) => {
              console.log(`🗑️ Deleting field ${index}: ${fieldId}`);
              this.formService
                .deleteFieldFromForm(this.form.id, fieldId)
                .pipe(takeUntil(this.destroy$))
                .subscribe({
                  next: () => {
                    console.log(`✅ Field ${index} deleted: ${fieldId}`);
                    saved++;
                    if (saved === total) {
                      this.onSaveComplete();
                    }
                  },
                  error: (err) => {
                    console.error(`❌ Error deleting field ${index}:`, err);
                    saved++;
                    if (saved === total) {
                      this.onSaveComplete();
                    }
                  },
                });
            });
          } else if ((this.form.fields?.length || 0) === 0) {
            // No fields and no deletions, complete save
            this.onSaveComplete();
          }
        },
        error: (error) => {
          console.error('❌ Error saving form metadata:', error);
          this.isSaving = false;
          this.cdr.markForCheck();
        },
      });
  }

  private onSaveComplete(): void {
    console.log('✅ Save complete!');
    this.isSaving = false;
    this.cdr.markForCheck();
  }
}
