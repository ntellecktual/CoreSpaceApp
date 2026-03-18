import type { SubSpaceDefinition } from '../types';

// ─────────────────────────────────────────────────────────────────────────────
// Named pipeline orders for each template workspace.
// The keyword is matched (case-insensitive) against the workspace name so this
// works even if the user renames the workspace slightly.
// ─────────────────────────────────────────────────────────────────────────────

export const SUBSPACE_PIPELINE_PATTERNS: Array<{
  workspaceKeywords: string[];
  pipeline: string[];
}> = [
  {
    workspaceKeywords: ['dscsa', 'serialization', 'pharma', 'drug'],
    pipeline: [
      'Manufacturer Serialization',
      'Carton',
      'Boxes Inside Carton',
      'Individual Units',
      'Lot Information',
      'Distributor Verification',
      'Pharmacy Dispense',
      'Traceability & Exceptions',
    ],
  },
  {
    workspaceKeywords: ['wrvas', 'repair', 'service', 'device', 'it service'],
    pipeline: [
      'Inbound Dock Log',
      'Serial Capture & Tagging',
      'Visual Inspection',
      'Diagnostic Test Results',
      'Repair Cost Evaluation',
      'Repair Tasks',
      'Retest & Validation',
      'Configuration & Firmware',
      'Kit BOM & Components',
      'Final QA Checklist',
      'Packing & Labeling',
    ],
  },
];

/**
 * Returns the SubSpaces sorted according to the known pipeline order for the
 * given workspace name. Any SubSpaces not in the pipeline list are appended at
 * the end in their original order.
 */
export function getOrderedSubSpaces(
  workspaceName: string,
  subSpaces: SubSpaceDefinition[],
): SubSpaceDefinition[] {
  const lowerName = workspaceName.toLowerCase();
  const pattern = SUBSPACE_PIPELINE_PATTERNS.find((p) =>
    p.workspaceKeywords.some((kw) => lowerName.includes(kw)),
  );
  if (!pattern) return subSpaces;

  const ordered: SubSpaceDefinition[] = [];
  for (const name of pattern.pipeline) {
    const ss = subSpaces.find((s) => s.name === name);
    if (ss) ordered.push(ss);
  }
  // Append any SubSpaces that are not part of the known pipeline
  subSpaces
    .filter((s) => !ordered.find((o) => o.id === s.id))
    .forEach((s) => ordered.push(s));

  return ordered;
}

/**
 * Returns true if the workspace has a known pipeline pattern.
 */
export function hasPipelinePattern(workspaceName: string): boolean {
  const lowerName = workspaceName.toLowerCase();
  return SUBSPACE_PIPELINE_PATTERNS.some((p) =>
    p.workspaceKeywords.some((kw) => lowerName.includes(kw)),
  );
}

/**
 * Returns a placeholder image URI for a record based on the workspace name.
 * Pharma/DSCSA → blue pill badge, IT/WRVAS → green device badge, generic → purple item badge.
 */
export function getRecordPlaceholderImage(workspaceName: string): string {
  const lower = workspaceName.toLowerCase();
  if (/dscsa|pharma|drug|serial|medication|ndc|lot/.test(lower)) {
    return 'https://placehold.co/80x80/dbeafe/1d4ed8?text=Rx';
  }
  if (/wrvas|repair|device|it service|hardware|firmware/.test(lower)) {
    return 'https://placehold.co/80x80/dcfce7/15803d?text=IT';
  }
  return 'https://placehold.co/80x80/ede9fe/6d28d9?text=Item';
}
