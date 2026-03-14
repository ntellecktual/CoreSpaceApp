import { PlatformSnapshot } from '../cosmos';
import { PortableDocument } from './types';

const SCHEMA_VERSION = 1;
const ISO_NOW = () => new Date().toISOString();

function toPortableDocument(
  tenantId: string,
  entityType: PortableDocument['entityType'],
  entityId: string,
  payload: unknown,
): PortableDocument {
  return {
    id: `${entityType}-${tenantId}-${entityId}`,
    tenantId,
    entityType,
    entityId,
    schemaVersion: SCHEMA_VERSION,
    updatedAt: ISO_NOW(),
    payload,
  };
}

export function mapPlatformSnapshotToPortableDocuments(snapshot: PlatformSnapshot): PortableDocument[] {
  const documents: PortableDocument[] = [];

  snapshot.tenants.forEach((tenant) => {
    documents.push(toPortableDocument(tenant.id, 'tenant', tenant.id, { name: tenant.name, branding: tenant.branding }));
    documents.push(
      toPortableDocument(tenant.id, 'shellConfig', `shellConfig-${tenant.id}`, {
        shellConfig: tenant.data.shellConfig,
        activeRoleId: tenant.data.activeRoleId,
      }),
    );

    tenant.data.roles.forEach((role) => {
      documents.push(toPortableDocument(tenant.id, 'role', role.id, role));
    });

    tenant.data.customPermissionTemplates.forEach((template) => {
      documents.push(toPortableDocument(tenant.id, 'permissionTemplate', template.id, template));
    });

    tenant.data.clients.forEach((client) => {
      documents.push(toPortableDocument(tenant.id, 'client', client.id, client));
    });

    tenant.data.workspaces.forEach((workspace) => {
      documents.push(toPortableDocument(tenant.id, 'workspace', workspace.id, workspace));
    });

    tenant.data.forms.forEach((form) => {
      documents.push(toPortableDocument(tenant.id, 'form', form.id, form));
    });

    tenant.data.records.forEach((record) => {
      documents.push(toPortableDocument(tenant.id, 'record', record.id, record));
    });

    tenant.data.flows.forEach((flow) => {
      documents.push(toPortableDocument(tenant.id, 'flow', flow.id, flow));
    });

    tenant.data.tagPolicies.forEach((tagPolicy) => {
      documents.push(toPortableDocument(tenant.id, 'tagPolicy', tagPolicy.id, tagPolicy));
    });
  });

  snapshot.users.forEach((user) => {
    documents.push(toPortableDocument(user.tenantId ?? snapshot.activeTenantId, 'authUser', user.id, user));
  });

  return documents;
}
