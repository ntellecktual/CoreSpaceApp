import { CosmosDocument, PlatformSnapshot } from '../cosmos';

export type PortableEntityType =
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

export type PortableDatabaseTarget = 'cosmos' | 'postgres' | 'mongodb';

export type PortableDocument = {
  id: string;
  tenantId: string;
  entityType: PortableEntityType;
  entityId: string;
  schemaVersion: number;
  updatedAt: string;
  payload: unknown;
};

export type PostgresPortableRow = {
  id: string;
  tenant_id: string;
  entity_type: PortableEntityType;
  entity_id: string;
  schema_version: number;
  updated_at: string;
  payload_json: string;
};

export type MongoPortableDocument = {
  _id: string;
  tenantId: string;
  entityType: PortableEntityType;
  entityId: string;
  schemaVersion: number;
  updatedAt: string;
  payload: unknown;
};

export type PortableTargetRecordMap = {
  cosmos: CosmosDocument[];
  postgres: PostgresPortableRow[];
  mongodb: MongoPortableDocument[];
};

export type PortableTargetResult<K extends PortableDatabaseTarget> = {
  target: K;
  recordCount: number;
  records: PortableTargetRecordMap[K];
};

export type PortableTargetsResult = Partial<
  Record<PortableDatabaseTarget, PortableTargetResult<PortableDatabaseTarget>>
>;

export type PortableExportBundle = {
  generatedAt: string;
  activeTenantId: PlatformSnapshot['activeTenantId'];
  canonical: {
    recordCount: number;
    documents: PortableDocument[];
  };
  targets: PortableTargetsResult;
};
