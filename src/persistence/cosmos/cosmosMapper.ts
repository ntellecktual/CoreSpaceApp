import { AppData } from '../../types';
import {
  CosmosDocument,
  CosmosDocumentBase,
  PlatformSnapshot,
  TenantSnapshot,
} from './cosmosTypes';

const SCHEMA_VERSION = 1;
const ISO_NOW = () => new Date().toISOString();

type IgnoredAppDataKeys = 'appName' | 'organizations' | 'activeOrg' | 'activeRoleId' | 'users' | 'session';

type TenantCollectionMappers = {
  shellConfig: (tenant: TenantSnapshot) => CosmosDocument[];
  roles: (tenant: TenantSnapshot) => CosmosDocument[];
  customPermissionTemplates: (tenant: TenantSnapshot) => CosmosDocument[];
  clients: (tenant: TenantSnapshot) => CosmosDocument[];
  workspaces: (tenant: TenantSnapshot) => CosmosDocument[];
  forms: (tenant: TenantSnapshot) => CosmosDocument[];
  records: (tenant: TenantSnapshot) => CosmosDocument[];
  flows: (tenant: TenantSnapshot) => CosmosDocument[];
  tagPolicies: (tenant: TenantSnapshot) => CosmosDocument[];
};

type UnmappedAppDataKeys = Exclude<keyof AppData, keyof TenantCollectionMappers | IgnoredAppDataKeys>;
const _assertAllPotentialDataPointsMapped: UnmappedAppDataKeys extends never ? true : never = true;
void _assertAllPotentialDataPointsMapped;

function base<E extends CosmosDocument['entityType']>(
  tenantId: string,
  entityType: E,
  id: string,
): CosmosDocumentBase & { entityType: E } {
  return {
    id,
    tenantId,
    entityType,
    partitionKey: tenantId,
    schemaVersion: SCHEMA_VERSION,
    updatedAt: ISO_NOW(),
  };
}

const tenantCollectionMappers: TenantCollectionMappers = {
  shellConfig: (tenant) => [
    {
      ...base(tenant.id, 'shellConfig', `shellConfig-${tenant.id}`),
      shellConfig: tenant.data.shellConfig,
      activeRoleId: tenant.data.activeRoleId,
    },
  ],
  roles: (tenant) =>
    tenant.data.roles.map((role) => ({
      ...base(tenant.id, 'role', `role-${tenant.id}-${role.id}`),
      role,
    })),
  customPermissionTemplates: (tenant) =>
    tenant.data.customPermissionTemplates.map((template) => ({
      ...base(tenant.id, 'permissionTemplate', `template-${tenant.id}-${template.id}`),
      template,
    })),
  clients: (tenant) =>
    tenant.data.clients.map((client) => ({
      ...base(tenant.id, 'client', `client-${tenant.id}-${client.id}`),
      client,
    })),
  workspaces: (tenant) =>
    tenant.data.workspaces.map((workspace) => ({
      ...base(tenant.id, 'workspace', `workspace-${tenant.id}-${workspace.id}`),
      workspace,
    })),
  forms: (tenant) =>
    tenant.data.forms.map((form) => ({
      ...base(tenant.id, 'form', `form-${tenant.id}-${form.id}`),
      form,
    })),
  records: (tenant) =>
    tenant.data.records.map((record) => ({
      ...base(tenant.id, 'record', `record-${tenant.id}-${record.id}`),
      record,
    })),
  flows: (tenant) =>
    tenant.data.flows.map((flow) => ({
      ...base(tenant.id, 'flow', `flow-${tenant.id}-${flow.id}`),
      flow,
    })),
  tagPolicies: (tenant) =>
    tenant.data.tagPolicies.map((tagPolicy) => ({
      ...base(tenant.id, 'tagPolicy', `tagPolicy-${tenant.id}-${tagPolicy.id}`),
      tagPolicy,
    })),
};

export function mapTenantSnapshotToCosmosDocuments(tenant: TenantSnapshot): CosmosDocument[] {
  const docs: CosmosDocument[] = [
    {
      ...base(tenant.id, 'tenant', `tenant-${tenant.id}`),
      name: tenant.name,
      branding: tenant.branding,
    },
  ];

  (Object.keys(tenantCollectionMappers) as Array<keyof TenantCollectionMappers>).forEach((key) => {
    docs.push(...tenantCollectionMappers[key](tenant));
  });

  return docs;
}

export function mapPlatformSnapshotToCosmosDocuments(snapshot: PlatformSnapshot): CosmosDocument[] {
  const docs: CosmosDocument[] = [];

  snapshot.tenants.forEach((tenant) => {
    docs.push(...mapTenantSnapshotToCosmosDocuments(tenant));
  });

  snapshot.users.forEach((user) => {
    docs.push({
      ...base(user.tenantId ?? snapshot.activeTenantId, 'authUser', `user-${user.id}`),
      user,
    });
  });

  return docs;
}
