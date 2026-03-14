/**
 * DSCSA Walkthrough End-to-End Test
 *
 * Validates that the prebuilt DSCSA workspace data, Signal Studio flows,
 * CRUD operations, lifecycle governance, and Orbital integration activation
 * all work correctly — matching every step of the investor demo walkthrough.
 */

import { defaultData } from '../data/defaultData';
import { integrationTemplates } from '../data/integrationTemplates';
import { dscsaCrudWalkthroughSteps } from '../screens/home/constants';
import {
  evaluateRule,
  normalizeFieldKey,
  resolveFieldValue,
  flowMatchesEvent,
  executeAction,
  FlowEvent,
} from '../screens/home/hooks/useFlowEngine';
import type {
  RuntimeRecord,
  SignalFlow,
  IntegrationTemplate,
  IntegrationActivation,
  WorkspaceDefinition,
} from '../types';

// ─── Helpers ─────────────────────────────────────────────────────────

const { shellConfig, workspaces, records, flows, clients } = defaultData;

function countSubSpaces(ws: WorkspaceDefinition[]): number {
  return ws.reduce((sum, w) => sum + w.subSpaces.length, 0);
}

function simulateActivation(
  template: IntegrationTemplate,
  connectionConfig: Record<string, string>,
  mappingConfig: Record<string, string>,
): IntegrationActivation {
  return {
    id: `activation-${template.id}-${Date.now()}`,
    tenantId: 'tenant-demo',
    templateId: template.id,
    templateVersion: template.version,
    connectionConfig,
    mappingConfig,
    status: 'active',
    activatedAt: new Date().toISOString(),
    errorCount: 0,
    totalCalls: 0,
    autoShutoffThreshold: 100,
  };
}

// ════════════════════════════════════════════════════════════════════════
// 1. WORKSPACE LOADING — Steps 1-5
// ════════════════════════════════════════════════════════════════════════

describe('Step 1-5: DSCSA template, product batches, traceability', () => {
  test('Step 1: template has 11 workspaces and 32 subspaces', () => {
    expect(workspaces).toHaveLength(11);
    expect(countSubSpaces(workspaces)).toBe(32);
  });

  test('Step 1: 7 lifecycle stages', () => {
    expect(shellConfig.lifecycleStages).toHaveLength(7);
    const names = shellConfig.lifecycleStages.map((s) => s.name);
    expect(names).toEqual([
      'Serialized',
      'Shipped to Distributor',
      'Received by Distributor',
      'Shipped to Pharmacy',
      'Received by Pharmacy',
      'Dispensed',
      'Exception Review',
    ]);
  });

  test('Step 1: 4 personas', () => {
    expect(shellConfig.personas).toHaveLength(4);
    const names = shellConfig.personas.map((p) => p.name);
    expect(names).toContain('Manufacturer Serialization Lead');
    expect(names).toContain('Distributor Receiver');
    expect(names).toContain('Pharmacy Dispense Manager');
    expect(names).toContain('Compliance Trace Analyst');
  });

  test('Step 1: 10 published flows (5 DSCSA + 5 WRVAS)', () => {
    const published = flows.filter((f) => f.status === 'published');
    expect(published).toHaveLength(10);
  });

  test('Step 2: three product batches with correct amounts', () => {
    const lisinopril = records.find((r) => r.id === 'record-dscsa-1');
    const amoxicillin = records.find((r) => r.id === 'record-dscsa-5');
    const epinephrine = records.find((r) => r.id === 'record-dscsa-6');

    expect(lisinopril).toBeDefined();
    expect(lisinopril!.amount).toBe(2400);
    expect(lisinopril!.title).toContain('2,400 units');

    expect(amoxicillin).toBeDefined();
    expect(amoxicillin!.amount).toBe(12000);
    expect(amoxicillin!.title).toContain('12,000 capsules');

    expect(epinephrine).toBeDefined();
    expect(epinephrine!.amount).toBe(500);
    expect(epinephrine!.title).toContain('500 injectables');
  });

  test('Step 3: Lisinopril full supply chain trace records exist', () => {
    const lisinoprilRecords = records.filter(
      (r) => r.clientId === 'client-batch-tablet-xy1234',
    );
    // manufacturer (3) + distributor (3) + pharmacy (3) + traceability (2) = 11
    expect(lisinoprilRecords.length).toBeGreaterThanOrEqual(10);

    const wsIds = [...new Set(lisinoprilRecords.map((r) => r.workspaceId))];
    expect(wsIds).toContain('ws-manufacturer-serialization');
    expect(wsIds).toContain('ws-distributor-verification');
    expect(wsIds).toContain('ws-pharmacy-dispense');
    expect(wsIds).toContain('ws-network-traceability');
  });

  test('Step 4: Amoxicillin mismatch record exists with mismatch-count > 0', () => {
    const mismatchRec = records.find((r) => r.id === 'record-dscsa-5b');
    expect(mismatchRec).toBeDefined();
    expect(mismatchRec!.data['mismatch-count']).toBe(3);
    expect(mismatchRec!.data['verification-result']).toBe('Mismatch');
    expect(mismatchRec!.tags).toContain('Alert:SerialMismatch');
  });

  test('Step 5: Epinephrine suspect investigation record exists', () => {
    const suspectRec = records.find((r) => r.id === 'record-dscsa-6b');
    expect(suspectRec).toBeDefined();
    expect(suspectRec!.data['investigation-priority']).toBe('Critical');
    expect(String(suspectRec!.data['investigation-outcome'])).toContain('Pending');
    expect(suspectRec!.tags).toContain('Suspect');
    expect(suspectRec!.tags).toContain('FDA-Reportable');
  });
});

// ════════════════════════════════════════════════════════════════════════
// 2. SIGNAL STUDIO — Flow Engine (Steps 6-8)
// ════════════════════════════════════════════════════════════════════════

describe('Step 6-8: Signal Studio flow execution', () => {
  const serialMismatchFlow = flows.find((f) => f.id === 'flow-serial-mismatch-alert')!;
  const suspectFlow = flows.find((f) => f.id === 'flow-suspect-product-escalation')!;
  const expirationFlow = flows.find((f) => f.id === 'flow-expiration-warning')!;
  const autoAdvanceFlow = flows.find((f) => f.id === 'flow-auto-advance-serialized')!;
  const dispenseFlow = flows.find((f) => f.id === 'flow-dispense-completion-log')!;

  test('Step 6: all five published flows exist with correct names', () => {
    expect(serialMismatchFlow).toBeDefined();
    expect(serialMismatchFlow.name).toBe('Serial Mismatch Alert');

    expect(suspectFlow).toBeDefined();
    expect(suspectFlow.name).toBe('Suspect Product Escalation (FDA §582)');

    expect(expirationFlow).toBeDefined();
    expect(expirationFlow.name).toBe('90-Day Expiration Warning');

    expect(autoAdvanceFlow).toBeDefined();
    expect(autoAdvanceFlow.name).toBe('Auto-Advance Lifecycle on Shipment');

    expect(dispenseFlow).toBeDefined();
    expect(dispenseFlow.name).toBe('Dispense-to-Patient Completion Logger');
  });

  test('Step 7: Serial Mismatch Alert flow matches the mismatch record', () => {
    const mismatchRec = records.find((r) => r.id === 'record-dscsa-5b')!;

    // Flow should match workspace/subspace/tags
    const matches = flowMatchesEvent(serialMismatchFlow, 'record.updated', mismatchRec);
    expect(matches).toBe(true);

    // All rules should pass
    for (const rule of serialMismatchFlow.rules) {
      expect(evaluateRule(rule, mismatchRec)).toBe(true);
    }
  });

  test('Step 7: Serial Mismatch Alert flow does NOT match unrelated records', () => {
    // Lisinopril manufacturer record — different workspace/subspace
    const lisinoprilRec = records.find((r) => r.id === 'record-dscsa-1')!;
    const matches = flowMatchesEvent(serialMismatchFlow, 'record.updated', lisinoprilRec);
    expect(matches).toBe(false);
  });

  test('Step 7: Suspect Product flow rules match the suspect record', () => {
    const suspectRec = records.find((r) => r.id === 'record-dscsa-6b')!;

    const matches = flowMatchesEvent(suspectFlow, 'record.created', suspectRec);
    expect(matches).toBe(true);

    for (const rule of suspectFlow.rules) {
      expect(evaluateRule(rule, suspectRec)).toBe(true);
    }
  });

  test('Step 7: Auto-Advance flow rules match the EPCIS record', () => {
    const epcisRec = records.find((r) => r.id === 'record-dscsa-1c')!;

    const matches = flowMatchesEvent(autoAdvanceFlow, 'record.created', epcisRec);
    expect(matches).toBe(true);

    for (const rule of autoAdvanceFlow.rules) {
      expect(evaluateRule(rule, epcisRec)).toBe(true);
    }
  });

  test('Step 7: Dispense Completion flow rules match the dispense record', () => {
    const dispenseRec = records.find((r) => r.id === 'record-dscsa-3c')!;

    const matches = flowMatchesEvent(dispenseFlow, 'record.created', dispenseRec);
    expect(matches).toBe(true);

    for (const rule of dispenseFlow.rules) {
      expect(evaluateRule(rule, dispenseRec)).toBe(true);
    }
  });

  test('Step 8: flow run stats are populated', () => {
    const totalRuns = flows.reduce((sum, f) => sum + f.totalRuns, 0);
    expect(totalRuns).toBeGreaterThan(20000);

    for (const flow of flows) {
      expect(flow.avgTimeMs).toBeGreaterThan(0);
      expect(flow.avgTimeMs).toBeLessThan(1000); // sub-1s
    }
  });
});

// ════════════════════════════════════════════════════════════════════════
// 3. FLOW ENGINE PURE FUNCTIONS — rule evaluation & field resolution
// ════════════════════════════════════════════════════════════════════════

describe('Flow engine: evaluateRule', () => {
  const testRecord: RuntimeRecord = {
    id: 'test-1',
    clientId: 'client-1',
    workspaceId: 'ws-test',
    subSpaceId: 'ss-test',
    title: 'Test Record',
    status: 'Active',
    amount: 500,
    date: '2026-01-01',
    tags: ['Priority:High', 'Alert:SerialMismatch'],
    data: { 'mismatch-count': 3, 'verification-result': 'Mismatch', 'notes': 'Some notes here' },
  };

  test('equality operator: field = value', () => {
    expect(evaluateRule('verification-result = Mismatch', testRecord)).toBe(true);
    expect(evaluateRule('verification-result = Match', testRecord)).toBe(false);
  });

  test('inequality operator: field != value', () => {
    expect(evaluateRule('verification-result != Match', testRecord)).toBe(true);
    expect(evaluateRule('verification-result != Mismatch', testRecord)).toBe(false);
  });

  test('numeric greater-than: mismatch-count > 0', () => {
    expect(evaluateRule('mismatch-count > 0', testRecord)).toBe(true);
    expect(evaluateRule('mismatch-count > 5', testRecord)).toBe(false);
  });

  test('contains operator', () => {
    expect(evaluateRule('notes contains notes', testRecord)).toBe(true);
    expect(evaluateRule('notes contains xyz', testRecord)).toBe(false);
  });

  test('is set operator', () => {
    expect(evaluateRule('notes is set', testRecord)).toBe(true);
    expect(evaluateRule('nonexistent is set', testRecord)).toBe(false);
  });

  test('tag key:value resolution (Priority:High → High)', () => {
    expect(evaluateRule('priority = High', testRecord)).toBe(true);
    expect(evaluateRule('priority = Low', testRecord)).toBe(false);
  });

  test('top-level field resolution: status, amount', () => {
    expect(evaluateRule('status = Active', testRecord)).toBe(true);
    expect(evaluateRule('amount > 100', testRecord)).toBe(true);
    expect(evaluateRule('amount <= 500', testRecord)).toBe(true);
  });
});

describe('Flow engine: normalizeFieldKey', () => {
  test('lowercases and replaces separators', () => {
    expect(normalizeFieldKey('Mismatch-Count')).toBe('mismatch_count');
    expect(normalizeFieldKey('VERIFICATION_RESULT')).toBe('verification_result');
    expect(normalizeFieldKey('  some field  ')).toBe('some_field');
  });
});

describe('Flow engine: resolveFieldValue', () => {
  const rec: RuntimeRecord = {
    id: 'r1', clientId: 'c1', workspaceId: 'w1', subSpaceId: 's1',
    title: 'Test', status: 'Open', amount: 42, tags: ['Team:Alpha', 'urgent'],
    data: { 'investigation-priority': 'Critical', 'investigation-outcome': 'Pending — FDA notified' },
  };

  test('resolves top-level fields', () => {
    expect(resolveFieldValue('status', rec)).toBe('Open');
    expect(resolveFieldValue('amount', rec)).toBe(42);
    expect(resolveFieldValue('title', rec)).toBe('Test');
  });

  test('resolves data fields with normalized key matching', () => {
    expect(resolveFieldValue('investigation_priority', rec)).toBe('Critical');
    expect(resolveFieldValue('investigation_outcome', rec)).toBe('Pending — FDA notified');
  });

  test('resolves tag key:value', () => {
    expect(resolveFieldValue('team', rec)).toBe('Alpha');
  });

  test('returns undefined for missing fields', () => {
    expect(resolveFieldValue('nonexistent', rec)).toBeUndefined();
  });
});

describe('Flow engine: executeAction', () => {
  const rec: RuntimeRecord = {
    id: 'r1', clientId: 'c1', workspaceId: 'w1', subSpaceId: 's1',
    title: 'Test', status: 'Serialized', tags: ['Product:Test'],
    data: {},
  };
  const flow: SignalFlow = {
    id: 'f1', name: 'Test Flow', signal: 's', workspaceId: 'w1', subSpaceId: 's1',
    rules: [], action: 'Move to Exception Review', runOnExisting: false,
    targetTags: [], status: 'published', triggerType: 'event',
    totalRuns: 0, failures7d: 0, avgTimeMs: 0,
  };

  test('parses "move to X" action and updates status', () => {
    const result = executeAction('Move to Exception Review', rec, flow);
    expect(result.recordUpdates).toBeDefined();
    expect(result.recordUpdates!.status).toBe('Exception Review');
    expect(result.notificationType).toBe('flow-triggered');
  });

  test('parses "tag as X" action and appends tag', () => {
    const result = executeAction('Tag as Quarantined', rec, flow);
    expect(result.recordUpdates).toBeDefined();
    // Engine lowercases the tag capture — verify it's present case-insensitively
    expect(result.recordUpdates!.tags!.some((t) => t.toLowerCase() === 'quarantined')).toBe(true);
  });
});

// ════════════════════════════════════════════════════════════════════════
// 4. CRUD OPERATIONS — Step 9
// ════════════════════════════════════════════════════════════════════════

describe('Step 9: CRUD operations on records', () => {
  // Simulate CRUD in memory (no React state required)
  let localRecords: RuntimeRecord[];

  beforeEach(() => {
    localRecords = [...defaultData.records];
  });

  test('CREATE: add a new record to manufacturer serialization', () => {
    const newRecord: RuntimeRecord = {
      id: 'record-test-create',
      clientId: 'client-batch-tablet-xy1234',
      workspaceId: 'ws-manufacturer-serialization',
      subSpaceId: 'ss-unit-serialization',
      title: 'Test Batch — 100 units',
      status: 'Serialized',
      amount: 100,
      date: '2026-04-01',
      tags: ['Product:Test', 'Level:Unit'],
      data: { 'unit-serial': 'SN-TEST-000001 → SN-TEST-000100', 'unit-ndc': '00000-0000-00', 'unit-lot': 'TEST-001', 'unit-expiration': '2027-04-01' },
    };
    localRecords.push(newRecord);

    const found = localRecords.find((r) => r.id === 'record-test-create');
    expect(found).toBeDefined();
    expect(found!.title).toBe('Test Batch — 100 units');
  });

  test('READ: find the created record and verify all fields', () => {
    const newRecord: RuntimeRecord = {
      id: 'record-test-read',
      clientId: 'client-batch-tablet-xy1234',
      workspaceId: 'ws-manufacturer-serialization',
      subSpaceId: 'ss-unit-serialization',
      title: 'Test Batch — 100 units',
      status: 'Serialized',
      amount: 100,
      tags: ['Product:Test'],
      data: { 'unit-serial': 'SN-TEST-000001' },
    };
    localRecords.push(newRecord);

    const found = localRecords.find((r) => r.id === 'record-test-read')!;
    expect(found.workspaceId).toBe('ws-manufacturer-serialization');
    expect(found.subSpaceId).toBe('ss-unit-serialization');
    expect(found.status).toBe('Serialized');
    expect(found.data['unit-serial']).toBe('SN-TEST-000001');
  });

  test('UPDATE: edit a record title and verify change', () => {
    const newRecord: RuntimeRecord = {
      id: 'record-test-update',
      clientId: 'client-batch-tablet-xy1234',
      workspaceId: 'ws-manufacturer-serialization',
      subSpaceId: 'ss-unit-serialization',
      title: 'Test Batch — 100 units',
      status: 'Serialized',
      amount: 100,
      tags: ['Product:Test'],
      data: {},
    };
    localRecords.push(newRecord);

    // Update
    const idx = localRecords.findIndex((r) => r.id === 'record-test-update');
    localRecords[idx] = { ...localRecords[idx], title: 'Test Batch — Lot ABC-123 — 100 units' };

    expect(localRecords[idx].title).toBe('Test Batch — Lot ABC-123 — 100 units');
  });

  test('DELETE: remove a record', () => {
    const newRecord: RuntimeRecord = {
      id: 'record-test-delete',
      clientId: 'client-batch-tablet-xy1234',
      workspaceId: 'ws-manufacturer-serialization',
      subSpaceId: 'ss-unit-serialization',
      title: 'To be deleted',
      status: 'Serialized',
      amount: 1,
      tags: [],
      data: {},
    };
    localRecords.push(newRecord);
    expect(localRecords.find((r) => r.id === 'record-test-delete')).toBeDefined();

    localRecords = localRecords.filter((r) => r.id !== 'record-test-delete');
    expect(localRecords.find((r) => r.id === 'record-test-delete')).toBeUndefined();
  });
});

// ════════════════════════════════════════════════════════════════════════
// 5. LIFECYCLE GOVERNANCE — Step 10
// ════════════════════════════════════════════════════════════════════════

describe('Step 10: Lifecycle governance', () => {
  const { lifecycleStages, lifecycleTransitions } = shellConfig;

  function validNextStages(currentStageName: string): string[] {
    const stage = lifecycleStages.find((s) => s.name === currentStageName);
    if (!stage) return [];
    return lifecycleTransitions
      .filter((t) => t.fromStageId === stage.id)
      .map((t) => lifecycleStages.find((s) => s.id === t.toStageId)!.name);
  }

  test('Serialized can only go to Shipped to Distributor', () => {
    expect(validNextStages('Serialized')).toEqual(['Shipped to Distributor']);
  });

  test('Received by Distributor can go to Shipped to Pharmacy OR Exception Review', () => {
    const next = validNextStages('Received by Distributor');
    expect(next).toContain('Shipped to Pharmacy');
    expect(next).toContain('Exception Review');
    expect(next).toHaveLength(2);
  });

  test('Exception Review can resolve back to 3 stages', () => {
    const next = validNextStages('Exception Review');
    expect(next).toContain('Received by Distributor');
    expect(next).toContain('Received by Pharmacy');
    expect(next).toContain('Dispensed');
    expect(next).toHaveLength(3);
  });

  test('Dispensed is a terminal stage (no outbound transitions)', () => {
    expect(validNextStages('Dispensed')).toHaveLength(0);
  });

  test('10 total lifecycle transitions', () => {
    expect(lifecycleTransitions).toHaveLength(10);
  });
});

// ════════════════════════════════════════════════════════════════════════
// 6. RBAC & PERSONAS — Step 11
// ════════════════════════════════════════════════════════════════════════

describe('Step 11: RBAC personas and workspace scoping', () => {
  const personas = shellConfig.personas;

  test('four personas with correct names', () => {
    expect(personas).toHaveLength(4);
    const names = personas.map((p) => p.name);
    expect(names).toContain('Manufacturer Serialization Lead');
    expect(names).toContain('Distributor Receiver');
    expect(names).toContain('Pharmacy Dispense Manager');
    expect(names).toContain('Compliance Trace Analyst');
  });

  test('each persona scoped to exactly one workspace', () => {
    for (const persona of personas) {
      expect(persona.workspaceScope).toBe('selected');
      expect(persona.workspaceIds).toHaveLength(1);
    }
  });

  test('persona workspace IDs reference valid workspaces', () => {
    const wsIds = workspaces.map((w) => w.id);
    for (const persona of personas) {
      for (const wsId of persona.workspaceIds) {
        expect(wsIds).toContain(wsId);
      }
    }
  });

  test('Manufacturer Lead sees only manufacturer serialization', () => {
    const mfg = personas.find((p) => p.id === 'persona-manufacturer-lead')!;
    expect(mfg.workspaceIds).toEqual(['ws-manufacturer-serialization']);
  });

  test('Compliance Analyst sees only network traceability', () => {
    const comp = personas.find((p) => p.id === 'persona-compliance-analyst')!;
    expect(comp.workspaceIds).toEqual(['ws-network-traceability']);
  });
});

// ════════════════════════════════════════════════════════════════════════
// 7. ORBITAL INTEGRATION — Steps 12-13
// ════════════════════════════════════════════════════════════════════════

describe('Step 12-13: Orbital integration activation', () => {
  test('Step 12: DocuSign and QuickBooks templates exist', () => {
    const docusign = integrationTemplates.find((t) => t.id === 'tpl-docusign');
    const quickbooks = integrationTemplates.find((t) => t.id === 'tpl-quickbooks');

    expect(docusign).toBeDefined();
    expect(docusign!.name).toBe('DocuSign');
    expect(docusign!.authType).toBe('oauth2');
    expect(docusign!.actions.length).toBeGreaterThanOrEqual(3);

    expect(quickbooks).toBeDefined();
    expect(quickbooks!.name).toBe('QuickBooks Online');
  });

  test('Step 12: DocuSign activation produces valid IntegrationActivation', () => {
    const docusign = integrationTemplates.find((t) => t.id === 'tpl-docusign')!;

    const activation = simulateActivation(
      docusign,
      { account_id: 'test-account', base_url: 'https://demo.docusign.net/restapi' },
      { signer_email_field: 'client_email', signer_name_field: 'client_name' },
    );

    expect(activation.status).toBe('active');
    expect(activation.templateId).toBe('tpl-docusign');
    expect(activation.connectionConfig.account_id).toBe('test-account');
    expect(activation.mappingConfig.signer_email_field).toBe('client_email');
    expect(activation.errorCount).toBe(0);
  });

  test('Step 13: DocuSign has pre-wired signals for auto-registration', () => {
    const docusign = integrationTemplates.find((t) => t.id === 'tpl-docusign')!;
    expect(docusign.prewiredSignals).toBeDefined();
    expect(docusign.prewiredSignals!.length).toBeGreaterThanOrEqual(2);

    const autoFile = docusign.prewiredSignals!.find((s) => s.key === 'auto-file-on-complete');
    expect(autoFile).toBeDefined();
    expect(autoFile!.defaultAction).toBe('download-document');
    expect(autoFile!.customerEditable).toBe(true);
  });

  test('Step 13: pre-wired signals can be registered as Signal Studio flows', () => {
    const docusign = integrationTemplates.find((t) => t.id === 'tpl-docusign')!;

    const registeredFlows: SignalFlow[] = docusign.prewiredSignals!.map((signal, i) => ({
      id: `flow-orbital-${signal.key}`,
      name: signal.label,
      signal: `Orbital trigger: ${signal.triggerRef}`,
      workspaceId: 'ws-manufacturer-serialization',
      subSpaceId: 'ss-unit-serialization',
      rules: [],
      action: signal.defaultAction,
      runOnExisting: false,
      targetTags: [],
      status: 'published' as const,
      triggerType: 'event' as const,
      totalRuns: 0,
      failures7d: 0,
      avgTimeMs: 0,
    }));

    expect(registeredFlows).toHaveLength(2);
    expect(registeredFlows[0].name).toBe('Auto-File Signed Document');
    expect(registeredFlows[0].status).toBe('published');
    expect(registeredFlows[1].name).toBe('Alert on Envelope Declined');
  });

  test('Custom HTTP template exists for custom integrations', () => {
    const http = integrationTemplates.find((t) => t.id === 'tpl-custom-http');
    expect(http).toBeDefined();
    expect(http!.authType).toBe('apikey');
    expect(http!.category).toBe('Custom');
  });
});

// ════════════════════════════════════════════════════════════════════════
// 8. FULL TASK FLOW — End-to-End Signal trigger
// ════════════════════════════════════════════════════════════════════════

describe('Full task flow: record update triggers Serial Mismatch Alert', () => {
  test('editing a mismatch record triggers the correct flow and produces action output', () => {
    // Simulate: user edits the Amoxicillin mismatch record, changes mismatch-count to 5
    const mismatchRec: RuntimeRecord = {
      ...records.find((r) => r.id === 'record-dscsa-5b')!,
      data: {
        ...records.find((r) => r.id === 'record-dscsa-5b')!.data,
        'mismatch-count': 5,
      },
    };

    const mismatchFlow = flows.find((f) => f.id === 'flow-serial-mismatch-alert')!;

    // 1. Flow matches workspace/subspace
    expect(flowMatchesEvent(mismatchFlow, 'record.updated', mismatchRec)).toBe(true);

    // 2. All rules pass
    for (const rule of mismatchFlow.rules) {
      expect(evaluateRule(rule, mismatchRec)).toBe(true);
    }

    // 3. Action executes and produces notification
    const result = executeAction(mismatchFlow.action, mismatchRec, mismatchFlow);
    expect(result.notificationType).toBe('flow-triggered');
    expect(result.notificationTitle).toContain('Serial Mismatch Alert');
    expect(result.notificationBody).toContain('Verification mismatch');
  });
});

describe('Full task flow: suspect product triggers FDA §582 escalation', () => {
  test('suspect record triggers escalation flow end-to-end', () => {
    const suspectRec = records.find((r) => r.id === 'record-dscsa-6b')!;
    const suspectFlow = flows.find((f) => f.id === 'flow-suspect-product-escalation')!;

    // Match
    expect(flowMatchesEvent(suspectFlow, 'record.created', suspectRec)).toBe(true);

    // Rules pass
    for (const rule of suspectFlow.rules) {
      expect(evaluateRule(rule, suspectRec)).toBe(true);
    }

    // Action
    const result = executeAction(suspectFlow.action, suspectRec, suspectFlow);
    expect(result.notificationType).toBe('flow-triggered');
    expect(result.notificationTitle).toContain('Suspect Product Escalation');
  });
});

// ════════════════════════════════════════════════════════════════════════
// 9. WALKTHROUGH STEPS — Data/Text Consistency
// ════════════════════════════════════════════════════════════════════════

describe('Walkthrough step text matches actual data', () => {
  test('walkthrough has 11 steps (10 numbered + Demo Complete)', () => {
    expect(dscsaCrudWalkthroughSteps.length).toBe(11);
    expect(dscsaCrudWalkthroughSteps[dscsaCrudWalkthroughSteps.length - 1].title).toBe('Demo Complete');
  });

  test('Step 1 text references 5 workspaces and 16 subspaces', () => {
    const step1 = dscsaCrudWalkthroughSteps[0];
    expect(step1.detail).toContain('5 published workspaces');
    expect(step1.detail).toContain('16 SubSpaces');
  });

  test('Step 2 text references correct amounts', () => {
    const step2 = dscsaCrudWalkthroughSteps[1];
    expect(step2.detail).toContain('2,400 units');
    expect(step2.detail).toContain('12,000 capsules');
    expect(step2.detail).toContain('500 units');
  });

  test('Step 7 text references correct flow names', () => {
    const step7 = dscsaCrudWalkthroughSteps[6];
    expect(step7.detail).toContain('Suspect Product Escalation (FDA §582)');
    expect(step7.detail).toContain('Auto-Advance Lifecycle on Shipment');
    expect(step7.detail).toContain('Dispense-to-Patient Completion Logger');
  });

  test('Step 8 text references full persona names', () => {
    const step8 = dscsaCrudWalkthroughSteps[7];
    expect(step8.detail).toContain('Manufacturer Serialization Lead');
    expect(step8.detail).toContain('Pharmacy Dispense Manager');
    expect(step8.detail).toContain('Compliance Trace Analyst');
  });

  test('walkthrough includes task flow steps (Signal, CRUD, Orbital)', () => {
    const titles = dscsaCrudWalkthroughSteps.map((s) => s.title);
    expect(titles.some((t) => t.includes('Trigger a Signal'))).toBe(true);
    expect(titles.some((t) => t.includes('CRUD'))).toBe(true);
    expect(titles.some((t) => t.includes('Orbital'))).toBe(true);
  });
});

// ════════════════════════════════════════════════════════════════════════
// 7. WRVAS TEMPLATE — Warehouse, Repair, and Value-Added Services
// ════════════════════════════════════════════════════════════════════════

describe('WRVAS template data and flows', () => {
  const wrvasWorkspaces = workspaces.filter((w) => w.id.startsWith('ws-wrvas-'));
  const wrvasRecords = records.filter((r) => r.id.startsWith('record-wrvas-'));
  const wrvasFlows = flows.filter((f) => f.id.startsWith('flow-wrvas-'));
  const wrvasClients = clients.filter((c) => c.id.startsWith('client-wrvas-'));

  test('6 WRVAS workspaces with 16 subspaces', () => {
    expect(wrvasWorkspaces).toHaveLength(6);
    expect(countSubSpaces(wrvasWorkspaces)).toBe(16);
  });

  test('3 WRVAS clients (Dell Laptop, HP Printer, Cisco Server)', () => {
    expect(wrvasClients).toHaveLength(3);
    const refs = wrvasClients.map((c) => c.caseRef);
    expect(refs).toContain('WRVAS-WO5001');
    expect(refs).toContain('WRVAS-WO5002');
    expect(refs).toContain('WRVAS-WO5003');
  });

  test('Dell Laptop WO-5001 has full lifecycle records across workspaces', () => {
    const dellRecords = wrvasRecords.filter((r) => r.clientId === 'client-wrvas-laptop-wo5001');
    expect(dellRecords.length).toBeGreaterThanOrEqual(13);

    const wsIds = [...new Set(dellRecords.map((r) => r.workspaceId))];
    expect(wsIds).toContain('ws-wrvas-receiving');
    expect(wsIds).toContain('ws-wrvas-triage');
    expect(wsIds).toContain('ws-wrvas-repair');
    expect(wsIds).toContain('ws-wrvas-kitting');
    expect(wsIds).toContain('ws-wrvas-qa-shipping');
    expect(wsIds).toContain('ws-wrvas-audit');
  });

  test('HP Printer WO-5002 has BER record', () => {
    const berRec = wrvasRecords.find((r) => r.id === 'record-wrvas-7b');
    expect(berRec).toBeDefined();
    expect(berRec!.status).toBe('BER');
    expect(berRec!.data['ber-decision']).toBe('BER — Beyond Economical Repair');
    expect(berRec!.tags).toContain('BER:Exceeded');
  });

  test('Cisco Server WO-5003 has retest failure record', () => {
    const retestRec = wrvasRecords.find((r) => r.id === 'record-wrvas-8b');
    expect(retestRec).toBeDefined();
    expect(retestRec!.status).toBe('Retest Failed');
    expect(retestRec!.data['retest-result']).toBe('Fail');
    expect(retestRec!.tags).toContain('Retest:Failed');
    expect(retestRec!.tags).toContain('Priority:Critical');
  });

  test('5 WRVAS published flows exist with correct names', () => {
    expect(wrvasFlows).toHaveLength(5);
    const names = wrvasFlows.map((f) => f.name);
    expect(names).toContain('BER Threshold Alert');
    expect(names).toContain('Retest Failure Escalation');
    expect(names).toContain('Kit Assembly Completion');
    expect(names).toContain('QA Pass → Ship-Ready Advance');
    expect(names).toContain('Shipment Audit Logger');
  });

  test('BER Alert flow matches BER record', () => {
    const berFlow = wrvasFlows.find((f) => f.id === 'flow-wrvas-ber-alert')!;
    const berRec = wrvasRecords.find((r) => r.id === 'record-wrvas-7b')!;

    const matches = flowMatchesEvent(berFlow, 'record.created', berRec);
    expect(matches).toBe(true);
  });

  test('Retest Failure flow matches failed retest record', () => {
    const retestFlow = wrvasFlows.find((f) => f.id === 'flow-wrvas-retest-failure')!;
    const retestRec = wrvasRecords.find((r) => r.id === 'record-wrvas-8b')!;

    const matches = flowMatchesEvent(retestFlow, 'record.created', retestRec);
    expect(matches).toBe(true);
  });

  test('WRVAS workspaces all use Service Work Order as rootEntity', () => {
    for (const ws of wrvasWorkspaces) {
      expect(ws.rootEntity).toBe('Service Work Order');
    }
  });

  test('WRVAS workspaces are all published', () => {
    for (const ws of wrvasWorkspaces) {
      expect(ws.published).toBe(true);
    }
  });
});
