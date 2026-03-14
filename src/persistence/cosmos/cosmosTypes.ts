import { AppData, AuthSession, AuthUser, TenantBrandingProfile } from '../../types';

export type CosmosEntityType =
  | 'tenant'
  | 'shellConfig'
  | 'role'
  | 'permissionTemplate'
  | 'client'
  | 'workspace'
  | 'form'
  | 'record'
  | 'flow'
  | 'tagPolicy'
  | 'authUser';

export type CosmosDocumentBase = {
  id: string;
  tenantId: string;
  entityType: CosmosEntityType;
  partitionKey: string;
  schemaVersion: number;
  updatedAt: string;
};

export type TenantCosmosDocument = CosmosDocumentBase & {
  entityType: 'tenant';
  name: string;
  branding: TenantBrandingProfile;
};

export type ShellConfigCosmosDocument = CosmosDocumentBase & {
  entityType: 'shellConfig';
  shellConfig: AppData['shellConfig'];
  activeRoleId: string;
};

export type RoleCosmosDocument = CosmosDocumentBase & {
  entityType: 'role';
  role: AppData['roles'][number];
};

export type PermissionTemplateCosmosDocument = CosmosDocumentBase & {
  entityType: 'permissionTemplate';
  template: AppData['customPermissionTemplates'][number];
};

export type ClientCosmosDocument = CosmosDocumentBase & {
  entityType: 'client';
  client: AppData['clients'][number];
};

export type WorkspaceCosmosDocument = CosmosDocumentBase & {
  entityType: 'workspace';
  workspace: AppData['workspaces'][number];
};

export type FormCosmosDocument = CosmosDocumentBase & {
  entityType: 'form';
  form: AppData['forms'][number];
};

export type RecordCosmosDocument = CosmosDocumentBase & {
  entityType: 'record';
  record: AppData['records'][number];
};

export type FlowCosmosDocument = CosmosDocumentBase & {
  entityType: 'flow';
  flow: AppData['flows'][number];
};

export type TagPolicyCosmosDocument = CosmosDocumentBase & {
  entityType: 'tagPolicy';
  tagPolicy: AppData['tagPolicies'][number];
};

export type AuthUserCosmosDocument = CosmosDocumentBase & {
  entityType: 'authUser';
  user: AuthUser;
};

export type CosmosDocument =
  | TenantCosmosDocument
  | ShellConfigCosmosDocument
  | RoleCosmosDocument
  | PermissionTemplateCosmosDocument
  | ClientCosmosDocument
  | WorkspaceCosmosDocument
  | FormCosmosDocument
  | RecordCosmosDocument
  | FlowCosmosDocument
  | TagPolicyCosmosDocument
  | AuthUserCosmosDocument;

export type TenantSnapshot = {
  id: string;
  name: string;
  branding: TenantBrandingProfile;
  data: AppData;
};

export type PlatformSnapshot = {
  activeTenantId: string;
  tenants: TenantSnapshot[];
  users: AuthUser[];
  session: AuthSession | null;
};
