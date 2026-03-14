import { FieldVisibilityRule, PermissionAction, RoleDefinition } from '../../types';

export type RbacAction = PermissionAction;

export const permissionCatalog: { action: PermissionAction; label: string; detail: string }[] = [
  { action: 'workspace.manage', label: 'Manage Workspaces', detail: 'Create/update workspace configuration.' },
  { action: 'subspace.manage', label: 'Manage SubSpaces', detail: 'Create/update subspace definitions.' },
  { action: 'client.intake', label: 'Client Intake', detail: 'Create client profiles in runtime intake.' },
  { action: 'record.create', label: 'Create Records', detail: 'Submit workspace/subspace form records.' },
  { action: 'record.edit', label: 'Edit Records', detail: 'Edit existing records in drawer or inline.' },
  { action: 'record.delete', label: 'Delete Records', detail: 'Remove records from workspaces.' },
  { action: 'field.view', label: 'View All Fields', detail: 'See all fields on records. When disabled, field-level rules control visibility.' },
  { action: 'field.edit', label: 'Edit All Fields', detail: 'Edit all fields on records. When disabled, field-level rules control editability.' },
  { action: 'flow.publish', label: 'Publish Flows', detail: 'Publish automation flows in Signal Studio.' },
  { action: 'flow.execute', label: 'Execute Flows', detail: 'Trigger manual flow execution on records.' },
  { action: 'integration.manage', label: 'Manage Integrations', detail: 'Configure and manage Orbital integration connections and mappings.' },
  { action: 'integration.activate', label: 'Activate Integrations', detail: 'Activate or deactivate integrations from the Orbital marketplace.' },
];

export const builtInPermissionTemplates: {
  id: string;
  name: string;
  description: string;
  permissions: PermissionAction[];
}[] = [
  {
    id: 'template-platform-admin',
    name: 'Platform Admin Pack',
    description: 'Full configuration and runtime control across CRM surfaces.',
    permissions: ['workspace.manage', 'subspace.manage', 'client.intake', 'record.create', 'record.edit', 'record.delete', 'field.view', 'field.edit', 'flow.publish', 'flow.execute', 'integration.manage', 'integration.activate'],
  },
  {
    id: 'template-automation-pack',
    name: 'Automation Pack',
    description: 'Flow publishing and record operations without admin configuration rights.',
    permissions: ['record.create', 'record.edit', 'field.view', 'field.edit', 'flow.publish', 'flow.execute'],
  },
  {
    id: 'template-readonly-pack',
    name: 'Read-Only Pack',
    description: 'View-only access to records and fields. Cannot create, edit, or delete.',
    permissions: ['field.view'],
  },
  {
    id: 'template-field-worker-pack',
    name: 'Field Worker Pack',
    description: 'Day-to-day record operations with client intake. No admin access.',
    permissions: ['client.intake', 'record.create', 'record.edit', 'field.view', 'field.edit'],
  },
];

export type PermissionTemplateView = {
  id: string;
  name: string;
  description?: string;
  changeNote?: string;
  permissions: PermissionAction[];
  version: number;
  lineageId: string;
  parentTemplateId?: string;
  createdAt?: string;
  source: 'built-in' | 'custom';
};

export function canRole(role: RoleDefinition | undefined, action: RbacAction, workspaceId?: string) {
  if (!role) {
    return false;
  }

  const hasPermission = role.permissions.includes(action);
  if (!hasPermission) {
    return false;
  }

  if (!workspaceId || role.workspaceScope === 'all') {
    return true;
  }

  return role.workspaceIds.includes(workspaceId);
}

/**
 * Check if a specific field is visible for the current role.
 * If the role has `field.view` permission, all fields are visible.
 * Otherwise, check field-level rules; default to visible if no rules.
 */
export function canViewField(role: RoleDefinition | undefined, fieldId: string): boolean {
  if (!role) return false;
  if (role.permissions.includes('field.view')) return true;
  if (!role.fieldRules || role.fieldRules.length === 0) return true;
  const rule = role.fieldRules.find((r) => r.fieldId === fieldId);
  return rule ? rule.visible : true;
}

/**
 * Check if a specific field is editable for the current role.
 * If the role has `field.edit` permission, all fields are editable.
 * Otherwise, check field-level rules; default to editable if no rules.
 */
export function canEditField(role: RoleDefinition | undefined, fieldId: string): boolean {
  if (!role) return false;
  if (role.permissions.includes('field.edit')) return true;
  if (!role.fieldRules || role.fieldRules.length === 0) return true;
  const rule = role.fieldRules.find((r) => r.fieldId === fieldId);
  return rule ? rule.editable : true;
}

export function deniedMessage(action: RbacAction) {
  switch (action) {
    case 'workspace.manage':
      return 'Current role cannot modify workspace settings.';
    case 'subspace.manage':
      return 'Current role cannot create or modify subspaces.';
    case 'client.intake':
      return 'Current role cannot intake new clients.';
    case 'record.create':
      return 'Current role cannot create client records.';
    case 'record.edit':
      return 'Current role cannot edit records.';
    case 'record.delete':
      return 'Current role cannot delete records.';
    case 'field.view':
      return 'Current role cannot view this field.';
    case 'field.edit':
      return 'Current role cannot edit this field.';
    case 'flow.publish':
      return 'Current role cannot publish automation flows.';
    case 'flow.execute':
      return 'Current role cannot execute flows.';
    case 'integration.manage':
      return 'Current role cannot manage integrations.';
    case 'integration.activate':
      return 'Current role cannot activate integrations.';
    default:
      return 'Action not permitted for current role.';
  }
}
