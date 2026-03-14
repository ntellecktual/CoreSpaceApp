import { PlatformSnapshot } from '../cosmos';
import { mapPlatformSnapshotToPortableDocuments } from './portableMapper';
import { mapPlatformSnapshotToTargetRecords } from './targetAdapters';
import {
  PortableDatabaseTarget,
  PortableExportBundle,
  PortableTargetResult,
  PortableTargetsResult,
} from './types';

export * from './types';
export * from './portableMapper';
export * from './targetAdapters';

const VALID_TARGETS: PortableDatabaseTarget[] = ['cosmos', 'postgres', 'mongodb'];

export function normalizePortabilityTargets(targets: string[]): PortableDatabaseTarget[] {
  const normalized = targets
    .map((target) => target.trim().toLowerCase())
    .filter((target): target is PortableDatabaseTarget => VALID_TARGETS.includes(target as PortableDatabaseTarget));

  if (normalized.length === 0) {
    return ['cosmos'];
  }

  return Array.from(new Set(normalized));
}

export function mapPlatformSnapshotForTargets(
  snapshot: PlatformSnapshot,
  targets: PortableDatabaseTarget[],
): PortableExportBundle {
  const canonicalDocuments = mapPlatformSnapshotToPortableDocuments(snapshot);
  const results: PortableTargetsResult = {};

  targets.forEach((target) => {
    const records = mapPlatformSnapshotToTargetRecords(snapshot, canonicalDocuments, target);
    const result: PortableTargetResult<typeof target> = {
      target,
      recordCount: records.length,
      records,
    };
    results[target] = result;
  });

  return {
    generatedAt: new Date().toISOString(),
    activeTenantId: snapshot.activeTenantId,
    canonical: {
      recordCount: canonicalDocuments.length,
      documents: canonicalDocuments,
    },
    targets: results,
  };
}
