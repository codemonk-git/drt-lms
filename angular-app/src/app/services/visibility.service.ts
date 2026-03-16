import { Injectable } from '@angular/core';
import { Stage, Stakeholder, StageVisibilityPolicy } from '../models/api.models';

/**
 * Visibility Service - Manages role-based access control
 * Defines which roles can see which stages and forms
 */
@Injectable({
  providedIn: 'root',
})
export class VisibilityService {
  // Default visibility policies per role
  // Defines what stages each role can see
  private defaultVisibilityPolicies: Map<string, string[]> = new Map([
    // Owner - can see everything
    ['owner', ['*']],

    // Quotation Team - can see New, Quotation stages (not Site Visit, Drawing, Accounts)
    ['quotation_team', ['new', 'quotation']],

    // Site Engineer - can see Site Visit, Drawing stages (not Quotation pricing, Accounts details)
    ['site_engineer', ['site_visit', 'drawing_engineer']],

    // Accounts - can see Quotation, Accounts, Payment stages
    ['accounts', ['quotation', 'accounts', 'payment']],

    // Drawing Engineer - can see Site Visit, Drawing stages
    ['drawing_engineer', ['site_visit', 'drawing_engineer']],

    // Observer - limited visibility
    ['observer', ['new', 'quotation', 'site_visit']],
  ]);

  constructor() {}

  /**
   * Check if a stakeholder can see a specific stage
   */
  canViewStage(stakeholder: Stakeholder, stage: Stage): boolean {
    // Owner can see everything
    if (stakeholder.role === 'owner') {
      return true;
    }

    // Check explicit visibility policy on stage
    if (stage.visible_to_roles && stage.visible_to_roles.length > 0) {
      return stage.visible_to_roles.includes(stakeholder.role);
    }

    // Check default role-based policy
    const allowedStages = this.defaultVisibilityPolicies.get(stakeholder.role);
    if (!allowedStages) {
      return false;
    }

    // If '*', can see all
    if (allowedStages.includes('*')) {
      return true;
    }

    // Check if stage name matches allowed stages
    const stageName = stage.name.toLowerCase().replace(/\s+/g, '_');
    return allowedStages.includes(stageName);
  }

  /**
   * Get visible stages for a stakeholder
   */
  getVisibleStages(stakeholder: Stakeholder, allStages: Stage[]): Stage[] {
    return allStages.filter((stage) => this.canViewStage(stakeholder, stage));
  }

  /**
   * Get visible stages by stage IDs
   */
  getVisibleStageIds(role: string): string[] {
    // Owner sees all
    if (role === 'owner') {
      return ['*'];
    }

    return this.defaultVisibilityPolicies.get(role) || [];
  }

  /**
   * Check if a stakeholder can view forms at a specific stage
   */
  canViewStageFormsBasedOnRole(stakeholder: Stakeholder, stage: Stage): boolean {
    return this.canViewStage(stakeholder, stage);
  }

  /**
   * Get visibility message explaining why a stage is hidden
   */
  getVisibilityMessage(role: string, stageName: string): string {
    const visibleStages = this.defaultVisibilityPolicies.get(role);

    if (!visibleStages) {
      return `${role} role cannot view stages`;
    }

    if (visibleStages.includes('*')) {
      return `${role} can view all stages`;
    }

    return `${role} can only view: ${visibleStages.join(', ')}`;
  }

  /**
   * Update visibility policy for a role
   */
  setVisibilityPolicy(role: string, visibleStageIds: string[]): void {
    this.defaultVisibilityPolicies.set(role, visibleStageIds);
  }

  /**
   * Get all visibility policies
   */
  getAllVisibilityPolicies(): Map<string, string[]> {
    return this.defaultVisibilityPolicies;
  }

  /**
   * Get description of role-based visibility rules
   */
  getVisibilityRules(): { role: string; canView: string; description: string }[] {
    return [
      {
        role: 'owner',
        canView: 'All stages',
        description: 'Lead owner sees all pipeline stages and forms',
      },
      {
        role: 'quotation_team',
        canView: 'New, Quotation',
        description: 'Cannot see Site Visit, Drawing, or Accounts stages',
      },
      {
        role: 'site_engineer',
        canView: 'Site Visit, Drawing',
        description: 'Cannot see Quotation pricing or Accounts details',
      },
      {
        role: 'accounts',
        canView: 'Quotation, Accounts, Payment',
        description: 'Can see billing info but not site visit details',
      },
      {
        role: 'drawing_engineer',
        canView: 'Site Visit, Drawing',
        description: 'Cannot see sales or accounting information',
      },
      {
        role: 'observer',
        canView: 'New, Quotation, Site Visit',
        description: 'Limited visibility to early pipeline stages',
      },
    ];
  }
}
