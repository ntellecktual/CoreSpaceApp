import { mapPlatformSnapshotToCosmosDocuments, PlatformSnapshot } from '../cosmos';
import {
  MongoPortableDocument,
  PortableDatabaseTarget,
  PortableDocument,
  PortableTargetRecordMap,
  PostgresPortableRow,
} from './types';

export function mapPortableDocumentsToPostgresRows(documents: PortableDocument[]): PostgresPortableRow[] {
  return documents.map((document) => ({
    id: document.id,
    tenant_id: document.tenantId,
    entity_type: document.entityType,
    entity_id: document.entityId,
    schema_version: document.schemaVersion,
    updated_at: document.updatedAt,
    payload_json: JSON.stringify(document.payload),
  }));
}

export function mapPortableDocumentsToMongoDocuments(documents: PortableDocument[]): MongoPortableDocument[] {
  return documents.map((document) => ({
    _id: document.id,
    tenantId: document.tenantId,
    entityType: document.entityType,
    entityId: document.entityId,
    schemaVersion: document.schemaVersion,
    updatedAt: document.updatedAt,
    payload: document.payload,
  }));
}

export function mapPlatformSnapshotToTargetRecords<K extends PortableDatabaseTarget>(
  snapshot: PlatformSnapshot,
  canonicalDocuments: PortableDocument[],
  target: K,
): PortableTargetRecordMap[K] {
  if (target === 'cosmos') {
    return mapPlatformSnapshotToCosmosDocuments(snapshot) as PortableTargetRecordMap[K];
  }

  if (target === 'postgres') {
    return mapPortableDocumentsToPostgresRows(canonicalDocuments) as PortableTargetRecordMap[K];
  }

  return mapPortableDocumentsToMongoDocuments(canonicalDocuments) as PortableTargetRecordMap[K];
}
