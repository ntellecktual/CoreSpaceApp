/**
 * beboEngine.ts
 * Conference-grade demo AI engine for Bebo. Pure logic, no React dependencies.
 * Provides intent classification, rich response generation, fake data, and
 * full workspace apply payloads for 6 industry verticals.
 */

import type {
  WorkspaceDefinition,
  SubSpaceDefinition,
  SignalFlow,
  IntegrationActivation,
  RuntimeRecord,
  SubSpaceBuilderField,
  ShellConfig,
  EndUserPersona,
  LifecycleStage,
  LifecycleTransition,
  BusinessFunction,
} from '../types';

// ─── Public Types ────────────────────────────────────────────────────

export type DemoVertical = 'pharma' | 'sales' | 'healthcare' | 'logistics' | 'legal' | 'insurance';

export type BeboIntent =
  | 'build_workspace'
  | 'build_architecture'
  | 'generate_data'
  | 'show_signals'
  | 'show_orbital'
  | 'cosmograph'
  | 'show_stats'
  | 'greeting'
  | 'general';

export interface BeboCardWorkspaceProposal {
  type: 'workspace_proposal';
  id: string;
  industry: string;
  workspaces: Array<{
    name: string;
    icon: string;
    rootEntity: string;
    subSpaces: Array<{ name: string; sourceEntity: string; displayType: string; fieldCount: number }>;
  }>;
  personas: string[];
  lifecycleStages: string[];
  flows: Array<{ name: string; trigger: string; action: string }>;
  applyPayload: ScenarioApplyPayload;
}

export interface BeboCardDataPreview {
  type: 'data_preview';
  id: string;
  title: string;
  format: 'csv' | 'json';
  headers: string[];
  rows: string[][];
  totalRows: number;
  csvContent: string;
  jsonContent: string;
}

export interface BeboCardIntegrationStatus {
  type: 'integration_status';
  id: string;
  integrations: Array<{
    name: string;
    icon: string;
    vendor: string;
    status: 'active' | 'ready';
    lastSync: string;
    eventsToday: number;
    category: string;
    templateId: string;
  }>;
}

export interface BeboCardSignalFlows {
  type: 'signal_flows';
  id: string;
  flows: Array<{
    name: string;
    trigger: string;
    conditions: string[];
    action: string;
    runsToday: number;
  }>;
  applyPayload: ScenarioApplyPayload;
}

export interface BeboCardStats {
  type: 'stats';
  id: string;
  stats: Array<{ label: string; value: string; delta?: string; positive?: boolean; icon: string }>;
}

export interface BeboCardArchitecture {
  type: 'architecture';
  id: string;
  industry: string;
  functions: Array<{
    fnId: string;
    name: string;
    icon: string;
    color: string;
    description: string;
    objects: Array<{
      name: string;
      namePlural: string;
      icon: string;
      description: string;
      workspaceNames: string[];
    }>;
  }>;
  applyPayload: ScenarioApplyPayload;
}

export type BeboCard =
  | BeboCardWorkspaceProposal
  | BeboCardDataPreview
  | BeboCardIntegrationStatus
  | BeboCardSignalFlows
  | BeboCardStats
  | BeboCardArchitecture;

export interface BeboResponse {
  text: string;
  cards: BeboCard[];
  quickReplies: string[];
}

export interface ScenarioApplyPayload {
  shellConfig: Partial<ShellConfig>;
  workspaces: WorkspaceDefinition[];
  flows: SignalFlow[];
  integrations: IntegrationActivation[];
  records: RuntimeRecord[];
  businessFunctions?: BusinessFunction[];
}

// ─── Internal Helpers ────────────────────────────────────────────────

function cid(): string {
  return `card-${Date.now()}-${Math.floor(Math.random() * 9999)}`;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function fmtDate(offsetDays: number): string {
  const d = new Date('2026-03-17');
  d.setDate(d.getDate() + offsetDays);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${m}/${day}/${d.getFullYear()}`;
}

function mkField(
  id: string,
  label: string,
  type: SubSpaceBuilderField['type'],
  required = false,
): SubSpaceBuilderField {
  return { id, label, type, required };
}

function mkSubSpace(
  id: string,
  name: string,
  sourceEntity: string,
  displayType: SubSpaceDefinition['displayType'],
  fields: SubSpaceBuilderField[],
): SubSpaceDefinition {
  return {
    id,
    name,
    sourceEntity,
    bindMode: 'relatedEntityView',
    displayType,
    visibilityRule: 'always',
    showCount: true,
    countMode: 'direct',
    builderFields: fields,
  };
}

function mkWorkspace(
  id: string,
  name: string,
  rootEntity: string,
  icon: string,
  subSpaces: SubSpaceDefinition[],
  fields?: SubSpaceBuilderField[],
): WorkspaceDefinition {
  return {
    id,
    name,
    rootEntity,
    icon,
    route: id,
    countBadgesEnabled: true,
    countStrategy: 'perSubSpace',
    builderFields: fields ?? [],
    subSpaces,
    published: true,
  };
}

function mkFlow(
  id: string,
  name: string,
  signal: string,
  rules: string[],
  action: string,
  wsId: string,
  ssId: string,
  tags: string[],
): SignalFlow {
  return {
    id,
    name,
    signal,
    triggerType: 'event',
    workspaceId: wsId,
    subSpaceId: ssId,
    rules,
    action,
    runOnExisting: false,
    targetTags: tags,
    status: 'published',
    totalRuns: Math.floor(Math.random() * 400 + 50),
    failures7d: Math.floor(Math.random() * 4),
    avgTimeMs: Math.floor(Math.random() * 800 + 200),
    lastRun: fmtDate(-Math.floor(Math.random() * 3)),
  };
}

function mkIntegration(id: string, templateId: string, activatedDate: string): IntegrationActivation {
  return {
    id,
    tenantId: 'tenant-a',
    templateId,
    templateVersion: '1.0.0',
    connectionConfig: {},
    mappingConfig: {},
    status: 'active',
    activatedAt: activatedDate,
    lastHealthCheck: new Date().toISOString(),
    errorCount: 0,
    totalCalls: Math.floor(Math.random() * 2000 + 100),
    autoShutoffThreshold: 50,
  };
}

function mkRecord(
  id: string,
  clientId: string,
  wsId: string,
  ssId: string,
  title: string,
  status: string,
  amount?: number,
  date?: string,
  tags?: string[],
  data?: Record<string, string | number>,
): RuntimeRecord {
  return { id, clientId, workspaceId: wsId, subSpaceId: ssId, title, status, amount, date, tags: tags ?? [], data: data ?? {} };
}

// ─── Fake Data Generators ─────────────────────────────────────────────

const PHARMA_PRODUCTS = [
  'Lisinopril 10mg', 'Amoxicillin 500mg', 'Metformin 1000mg', 'Atorvastatin 40mg',
  'Omeprazole 20mg', 'Levothyroxine 100mcg', 'Amlodipine 5mg', 'Sertraline 50mg',
  'Gabapentin 300mg', 'Hydrochlorothiazide 25mg',
];
const PHARMA_NDCS = [
  '68180-0517-01', '65862-0007-05', '00093-1094-01', '16477-0203-01',
  '00093-0032-05', '00074-4417-13', '73160-0143-01', '69097-0148-01',
  '00093-0247-01', '00378-2274-01',
];
const PHARMA_STATUS = ['Serialized', 'Shipped to Distributor', 'Received by Distributor', 'Shipped to Pharmacy', 'Received by Pharmacy', 'Dispensed'];
const PHARMA_MFR = ['Pfizer', 'AstraZeneca', 'Merck', 'Abbott', 'Novartis', 'GSK', 'Sanofi', 'Eli Lilly'];

function generatePharmaData(count = 20) {
  const headers = ['Lot Number', 'NDC Product Code', 'Product Name', 'Expiration Date', 'Carton Serial', 'Status', 'Qty Units', 'Manufacturer'];
  const rows: string[][] = Array.from({ length: count }, (_, i) => {
    const idx = i % PHARMA_PRODUCTS.length;
    return [
      `LOT-${String(10000 + Math.floor(Math.random() * 89999))}`,
      PHARMA_NDCS[idx],
      PHARMA_PRODUCTS[idx],
      fmtDate(180 + Math.floor(Math.random() * 720)),
      `CTN-${String(10000 + Math.floor(Math.random() * 89999))}-${String.fromCharCode(65 + (i % 26))}`,
      pick(PHARMA_STATUS),
      String((Math.floor(Math.random() * 5) + 1) * 100),
      pick(PHARMA_MFR),
    ];
  });
  const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
  const json = JSON.stringify(rows.map(r => Object.fromEntries(headers.map((h, i2) => [h, r[i2]]))), null, 2);
  return { headers, rows: rows.slice(0, 6), totalRows: count, csvContent: csv, jsonContent: json };
}

const COMPANIES = [
  'Acme Corp', 'TechStart Inc', 'Redwood Solutions', 'Vantage Systems', 'Blue Ridge Co',
  'Summit Analytics', 'Horizon Medical', 'Delta Logistics', 'Echo Partners', 'Prime Ventures',
  'Nexus Industries', 'Cascade Health', 'Apex Digital', 'Sterling Holdings', 'Pinnacle Group',
];
const SALES_REPS = ['Sarah Chen', 'Marcus Lee', 'Jordan Kim', 'Priya Patel', 'Alex Rivera', 'Dana Thompson'];
const DEAL_STAGES = ['New Lead', 'Qualified', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost'];
const LEAD_SOURCES = ['Inbound', 'Outbound', 'Referral', 'LinkedIn', 'Conference', 'SEO'];

function generateSalesData(count = 20) {
  const headers = ['Company', 'Contact', 'Title', 'Email', 'Deal Value', 'Stage', 'Close Date', 'Owner', 'Lead Source'];
  const rows: string[][] = Array.from({ length: count }, (_, i) => {
    const co = COMPANIES[i % COMPANIES.length];
    const val = (Math.floor(Math.random() * 200 + 10)) * 1000;
    return [
      co,
      `${pick(['John', 'Maria', 'Chris', 'Kim', 'David', 'Emma', 'Raj', 'Zoe'])} ${pick(['Smith', 'Garcia', 'Johnson', 'Williams', 'Brown', 'Davis', 'Patel', 'Nguyen'])}`,
      pick(['CEO', 'VP Sales', 'Director of IT', 'CTO', 'Operations Director', 'CFO']),
      `contact${i + 1}@${co.toLowerCase().replace(/\s+/g, '')}.com`,
      `$${val.toLocaleString()}`,
      pick(DEAL_STAGES),
      fmtDate(Math.floor(Math.random() * 90) + 7),
      pick(SALES_REPS),
      pick(LEAD_SOURCES),
    ];
  });
  const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
  const json = JSON.stringify(rows.map(r => Object.fromEntries(headers.map((h, i2) => [h, r[i2]]))), null, 2);
  return { headers, rows: rows.slice(0, 6), totalRows: count, csvContent: csv, jsonContent: json };
}

const DIAGNOSES = ['Hypertension', 'Type 2 Diabetes', 'GERD', 'Anxiety Disorder', 'Lower Back Pain', 'Asthma', 'Hyperlipidemia', 'Chronic Migraine'];
const INSURERS = ['Blue Cross Blue Shield', 'Aetna', 'UnitedHealth', 'Cigna', 'Humana', 'Kaiser', 'Medicare', 'Medicaid'];
const DOCTORS = ['Dr. Chen', 'Dr. Patel', 'Dr. Williams', 'Dr. Nguyen', 'Dr. Anderson', 'Dr. Martinez'];

function generateHealthcareData(count = 20) {
  const headers = ['Patient ID', 'Patient Name', 'DOB', 'Insurance', 'Last Visit', 'Appointment Date', 'Primary Diagnosis', 'Provider'];
  const rows: string[][] = Array.from({ length: count }, (_, i) => [
    `PAT-${String(1000 + i).padStart(4, '0')}`,
    `${pick(['Eleanor', 'Marcus', 'Diana', 'James', 'Sophia', 'Robert', 'Amelia', 'Carlos', 'Natalie', 'Kevin'])} ${pick(['Johnson', 'Williams', 'Brown', 'Davis', 'Miller', 'Wilson', 'Moore', 'Taylor'])}`,
    fmtDate(-Math.floor(Math.random() * 18250 + 6570)),
    pick(INSURERS),
    fmtDate(-Math.floor(Math.random() * 30 + 1)),
    fmtDate(Math.floor(Math.random() * 30 + 7)),
    pick(DIAGNOSES),
    pick(DOCTORS),
  ]);
  const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
  const json = JSON.stringify(rows.map(r => Object.fromEntries(headers.map((h, i2) => [h, r[i2]]))), null, 2);
  return { headers, rows: rows.slice(0, 6), totalRows: count, csvContent: csv, jsonContent: json };
}

const CARRIERS = ['FedEx', 'UPS', 'DHL', 'USPS', 'Amazon Logistics'];
const WAREHOUSES = ['Chicago IL', 'Dallas TX', 'Phoenix AZ', 'Atlanta GA', 'Seattle WA'];
const SHIP_STATUS = ['Ordered', 'Received', 'Picking', 'Packed', 'Shipped', 'Delivered', 'Returned'];

function generateLogisticsData(count = 20) {
  const headers = ['Order ID', 'SKU', 'Product Description', 'Qty', 'Warehouse', 'Carrier', 'Ship Date', 'Status', 'Destination'];
  const cities = ['New York NY', 'Los Angeles CA', 'Houston TX', 'Miami FL', 'Denver CO', 'Boston MA', 'Chicago IL', 'Seattle WA'];
  const rows: string[][] = Array.from({ length: count }, (_, i) => [
    `ORD-${String(20000 + i)}`,
    `SKU-${String(1000 + (i % 50)).padStart(4, '0')}`,
    pick(['Widget Pro 2.0', 'Sensor Module X4', 'Pump Assembly Unit', 'Valve Control Kit', 'Industrial Filter', 'Motor Drive 3A', 'Circuit Assembly', 'Power Supply 12V']),
    String(Math.floor(Math.random() * 500 + 1)),
    pick(WAREHOUSES),
    pick(CARRIERS),
    fmtDate(Math.random() > 0.5 ? -Math.floor(Math.random() * 10) : Math.floor(Math.random() * 14)),
    pick(SHIP_STATUS),
    pick(cities),
  ]);
  const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
  const json = JSON.stringify(rows.map(r => Object.fromEntries(headers.map((h, i2) => [h, r[i2]]))), null, 2);
  return { headers, rows: rows.slice(0, 6), totalRows: count, csvContent: csv, jsonContent: json };
}

const MATTER_TYPES = ['Commercial Litigation', 'Real Estate', 'Corporate M&A', 'Employment Law', 'IP / Patent', 'Bankruptcy', 'Estate Planning', 'Criminal Defense'];
const ATTORNEYS = ['James Hartley', 'Priya Desai', 'Carlos Mendoza', 'Susan Park', 'Michael O\'Brien'];
const CASE_STATUS = ['Intake', 'Engagement', 'Discovery', 'Litigation', 'Settlement', 'Closed'];

function generateLegalData(count = 20) {
  const headers = ['Case Number', 'Client Name', 'Matter Type', 'Assigned Attorney', 'Filed Date', 'Status', 'Hours Billed', 'Outstanding Balance'];
  const adjectives = ['Greenfield', 'Mountain View', 'Sunrise', 'Pacific', 'Atlantic', 'Northern', 'Western', 'Capital'];
  const orgs = ['LLC', 'Corp.', 'Industries', 'Holdings', 'Group', 'Partners', 'Ventures'];
  const rows: string[][] = Array.from({ length: count }, (_, i) => [
    `CASE-2026-${String(1000 + i)}`,
    `${pick(adjectives)} ${pick(orgs)}`,
    pick(MATTER_TYPES),
    pick(ATTORNEYS),
    fmtDate(-Math.floor(Math.random() * 120)),
    pick(CASE_STATUS),
    String(Math.floor(Math.random() * 200 + 10)),
    `$${(Math.floor(Math.random() * 50 + 5) * 1000).toLocaleString()}`,
  ]);
  const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
  const json = JSON.stringify(rows.map(r => Object.fromEntries(headers.map((h, i2) => [h, r[i2]]))), null, 2);
  return { headers, rows: rows.slice(0, 6), totalRows: count, csvContent: csv, jsonContent: json };
}

const COV_TYPES = ['Auto', 'Homeowners', 'Commercial General Liability', 'Workers Comp', 'Professional Liability', 'Life', 'Health', 'Umbrella'];
const INS_STATUS = ['Application', 'Underwriting', 'Bound', 'Active', 'Renewal Pending', 'Lapsed'];

function generateInsuranceData(count = 20) {
  const headers = ['Policy Number', 'Insured Name', 'Coverage Type', 'Annual Premium', 'Effective Date', 'Expiry Date', 'Status', 'Agent'];
  const prefixes = ['Sunrise', 'Northland', 'Pacific', 'Prairie', 'Valley', 'Metro', 'Coastal', 'Highland'];
  const suffixes = ['LLC', 'Corp', 'Holdings', 'Inc', 'Group', 'Association'];
  const rows: string[][] = Array.from({ length: count }, (_, i) => [
    `POL-2026${String(10000 + i)}`,
    `${pick(prefixes)} ${pick(suffixes)}`,
    pick(COV_TYPES),
    `$${(Math.floor(Math.random() * 50 + 5) * 1000).toLocaleString()}`,
    fmtDate(-Math.floor(Math.random() * 365)),
    fmtDate(Math.floor(Math.random() * 365) + 1),
    pick(INS_STATUS),
    pick(['Alex Johnson', 'Maria Santos', 'Kevin Wu', 'Rachel Green', 'Tyler Morris']),
  ]);
  const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
  const json = JSON.stringify(rows.map(r => Object.fromEntries(headers.map((h, i2) => [h, r[i2]]))), null, 2);
  return { headers, rows: rows.slice(0, 6), totalRows: count, csvContent: csv, jsonContent: json };
}

export function getDataForVertical(vertical: DemoVertical) {
  switch (vertical) {
    case 'pharma': return generatePharmaData();
    case 'sales': return generateSalesData();
    case 'healthcare': return generateHealthcareData();
    case 'logistics': return generateLogisticsData();
    case 'legal': return generateLegalData();
    case 'insurance': return generateInsuranceData();
  }
}

// ─── Scenario Apply Payload Builders ─────────────────────────────────

function mkShellConfig(singular: string, plural: string, wsLabel: string, ssLabel: string, stages: string[]): Partial<ShellConfig> {
  const stageObjs: LifecycleStage[] = stages.map((s, i) => ({ id: `bebo-stage-${i}`, name: s }));
  const transitions: LifecycleTransition[] = stages.slice(0, -1).map((_, i) => ({
    id: `bebo-lt-${i}`,
    fromStageId: `bebo-stage-${i}`,
    toStageId: `bebo-stage-${i + 1}`,
  }));
  return {
    subjectSingular: singular,
    subjectPlural: plural,
    workspaceLabel: wsLabel,
    subSpaceLabel: ssLabel,
    lifecycleStages: stageObjs,
    defaultLifecycleStageId: stageObjs[0]?.id ?? '',
    lifecycleTransitions: transitions,
  };
}

export function buildPharmaPayload(): ScenarioApplyPayload {
  const wsMfr = mkWorkspace('ws-bebo-pharma-mfr', 'Manufacturer Serialization', 'Serialized Batch', '🏭', [
    mkSubSpace('ss-unit-serial', 'Unit Serialization', 'Serialized Unit', 'grid', [
      mkField('f-unit-sn', 'Unit Serial Number', 'text', true),
      mkField('f-ndc', 'NDC Product Code', 'text', true),
      mkField('f-lot', 'Lot Number', 'text', true),
      mkField('f-exp', 'Expiration Date', 'date', true),
    ]),
    mkSubSpace('ss-carton-agg', 'Carton Aggregation', 'Carton Aggregation', 'grid', [
      mkField('f-ctn-sn', 'Carton Serial Number', 'text', true),
      mkField('f-units-box', 'Units per Box', 'number', false),
      mkField('f-agg-date', 'Aggregation Date', 'date', false),
    ]),
    mkSubSpace('ss-epcis', 'EPCIS Upload', 'Compliance Submission', 'grid', [
      mkField('f-sub-id', 'Submission ID', 'text', true),
      mkField('f-sub-date', 'Submission Date', 'date', false),
      mkField('f-upload-status', 'Upload Status', 'select', true),
    ]),
  ]);
  const wsDist = mkWorkspace('ws-bebo-pharma-dist', 'Distributor Verification', 'Serialized Batch', '🚚', [
    mkSubSpace('ss-inbound-scan', 'Inbound Receiving Scan', 'Inbound Scan Event', 'grid', [
      mkField('f-scan-id', 'Scan Event ID', 'text', true),
      mkField('f-scanned-ctn', 'Scanned Carton Serial', 'text', true),
      mkField('f-recv-time', 'Received Time', 'datetime', true),
    ]),
    mkSubSpace('ss-serial-verify', 'Serial Verification', 'Verification Event', 'split', [
      mkField('f-ver-result', 'Verification Result', 'select', true),
      mkField('f-matched', 'Matched Serial Count', 'number', false),
      mkField('f-mismatch', 'Mismatch Count', 'number', false),
    ]),
  ]);
  const wsRx = mkWorkspace('ws-bebo-pharma-rx', 'Pharmacy Dispense Trace', 'Serialized Batch', '💊', [
    mkSubSpace('ss-rx-recv', 'Pharmacy Receiving', 'Pharmacy Receiving Event', 'grid', [
      mkField('f-rx-event', 'Receiving Event ID', 'text', true),
      mkField('f-rx-ctn', 'Received Carton Serial', 'text', true),
      mkField('f-rx-result', 'Verification Result', 'select', true),
    ]),
    mkSubSpace('ss-dispense', 'Dispense Serial Logging', 'Dispense Event', 'timeline', [
      mkField('f-disp-sn', 'Dispensed Unit Serial', 'text', true),
      mkField('f-disp-date', 'Dispense Date', 'date', true),
      mkField('f-rx-ref', 'Rx Reference', 'text', true),
    ]),
  ]);
  const flows = [
    mkFlow('flow-bebo-suspect', 'Suspect Product Alert', 'Verification result = Mismatch', ['verification_result = Mismatch', 'serial_count_delta > 0'], 'Quarantine shipment and notify Compliance team immediately', 'ws-bebo-pharma-dist', 'ss-serial-verify', ['Priority:Critical', 'Type:Serialization']),
    mkFlow('flow-bebo-epcis-fail', 'EPCIS Upload Failure', 'EPCIS upload status = Failed', ['upload_status = Failed'], 'Retry upload and alert Manufacturer Serialization Lead', 'ws-bebo-pharma-mfr', 'ss-epcis', ['Priority:High', 'Type:Compliance']),
    mkFlow('flow-bebo-dispense-log', 'Dispense Serial Capture', 'Unit dispensed at pharmacy', ['status = Dispensed'], 'Log serial event and update traceability record', 'ws-bebo-pharma-rx', 'ss-dispense', ['Type:Dispense']),
  ];
  const integrations = [
    mkIntegration('int-bebo-ds-pharma', 'tpl-docusign', fmtDate(-30)),
    mkIntegration('int-bebo-qb-pharma', 'tpl-quickbooks', fmtDate(-20)),
    mkIntegration('int-bebo-http-pharma', 'tpl-custom-http', fmtDate(-10)),
  ];
  const unitRecords: RuntimeRecord[] = Array.from({ length: 12 }, (_, i) => {
    const product = PHARMA_PRODUCTS[i % PHARMA_PRODUCTS.length];
    const ndc = PHARMA_NDCS[i % PHARMA_NDCS.length];
    const lot = `LOT-${10000 + i}`;
    const expiry = fmtDate(180 + Math.floor(Math.random() * 720));
    return mkRecord(
      `rec-pharma-${i}`, `client-batch-${i}`, 'ws-bebo-pharma-mfr', 'ss-unit-serial',
      `${product} — ${lot}`,
      pick(PHARMA_STATUS), undefined, fmtDate(-i * 3), ['Product:Pharma'],
      {
        'Unit Serial Number': `SN-${String(10000 + Math.floor(Math.random() * 89999))}`,
        'NDC Product Code': ndc,
        'Lot Number': lot,
        'Expiration Date': expiry,
      },
    );
  });
  const cartonRecords: RuntimeRecord[] = Array.from({ length: 4 }, (_, i) => {
    const ctnSn = `CTN-${String(10000 + Math.floor(Math.random() * 89999))}-${String.fromCharCode(65 + i)}`;
    const aggDate = fmtDate(-Math.floor(Math.random() * 30));
    return mkRecord(
      `rec-pharma-ctn-${i}`, `client-batch-${i}`, 'ws-bebo-pharma-mfr', 'ss-carton-agg',
      `${ctnSn} — Aggregation`, 'Aggregated',
      undefined, aggDate, ['Product:Pharma'], {
        'Carton Serial Number': ctnSn,
        'Units per Box': (Math.floor(Math.random() * 5) + 1) * 100,
        'Aggregation Date': aggDate,
      },
    );
  });
  const epcisRecords: RuntimeRecord[] = Array.from({ length: 3 }, (_, i) => {
    const subDate = fmtDate(-Math.floor(Math.random() * 14));
    return mkRecord(
      `rec-pharma-epcis-${i}`, `client-batch-${i}`, 'ws-bebo-pharma-mfr', 'ss-epcis',
      `EPCIS-${20000 + i}`, pick(['Submitted', 'Accepted', 'Failed', 'Pending']),
      undefined, subDate, ['Type:Compliance'], {
        'Submission ID': `EPCIS-${20000 + i}`,
        'Submission Date': subDate,
        'Upload Status': pick(['Submitted', 'Accepted', 'Failed', 'Pending']),
      },
    );
  });
  const scanRecords: RuntimeRecord[] = Array.from({ length: 3 }, (_, i) => {
    const recvTime = fmtDate(-Math.floor(Math.random() * 7));
    return mkRecord(
      `rec-pharma-scan-${i}`, `client-batch-${i}`, 'ws-bebo-pharma-dist', 'ss-inbound-scan',
      `SCAN-${30000 + i}`, 'Received',
      undefined, recvTime, ['Type:Scan'], {
        'Scan Event ID': `SCAN-${30000 + i}`,
        'Scanned Carton Serial': `CTN-${String(10000 + Math.floor(Math.random() * 89999))}-${String.fromCharCode(65 + i)}`,
        'Received Time': recvTime,
      },
    );
  });
  const verifyRecords: RuntimeRecord[] = Array.from({ length: 3 }, (_, i) => {
    const matched = Math.floor(Math.random() * 500 + 100);
    const mismatch = Math.floor(Math.random() * 3);
    return mkRecord(
      `rec-pharma-verify-${i}`, `client-batch-${i}`, 'ws-bebo-pharma-dist', 'ss-serial-verify',
      `Verification Batch ${i + 1}`, mismatch > 0 ? 'Mismatch' : 'Verified',
      undefined, fmtDate(-Math.floor(Math.random() * 7)), ['Type:Verification'], {
        'Verification Result': mismatch > 0 ? 'Mismatch' : 'Match',
        'Matched Serial Count': matched,
        'Mismatch Count': mismatch,
      },
    );
  });
  const rxRecvRecords: RuntimeRecord[] = Array.from({ length: 3 }, (_, i) => mkRecord(
    `rec-pharma-rxrecv-${i}`, `client-batch-${i}`, 'ws-bebo-pharma-rx', 'ss-rx-recv',
    `RX-RECV-${40000 + i}`, 'Verified',
    undefined, fmtDate(-Math.floor(Math.random() * 14)), ['Type:Receiving'], {
      'Receiving Event ID': `RX-RECV-${40000 + i}`,
      'Received Carton Serial': `CTN-${String(10000 + Math.floor(Math.random() * 89999))}-${String.fromCharCode(65 + i)}`,
      'Verification Result': pick(['Match', 'Match', 'Match', 'Mismatch']),
    },
  ));
  const dispRecords: RuntimeRecord[] = Array.from({ length: 3 }, (_, i) => {
    const dispDate = fmtDate(-Math.floor(Math.random() * 7));
    return mkRecord(
      `rec-pharma-disp-${i}`, `client-batch-${i}`, 'ws-bebo-pharma-rx', 'ss-dispense',
      `Dispense — ${PHARMA_PRODUCTS[i % PHARMA_PRODUCTS.length]}`, 'Dispensed',
      undefined, dispDate, ['Type:Dispense'], {
        'Dispensed Unit Serial': `SN-${String(50000 + Math.floor(Math.random() * 49999))}`,
        'Dispense Date': dispDate,
        'Rx Reference': `RX-${String(100000 + Math.floor(Math.random() * 99999))}`,
      },
    );
  });
  const records = [...unitRecords, ...cartonRecords, ...epcisRecords, ...scanRecords, ...verifyRecords, ...rxRecvRecords, ...dispRecords];
  return {
    shellConfig: mkShellConfig('Serialized Batch', 'Serialized Batches', 'Supply Chain Workspace', 'Traceability SubSpace', ['Serialized', 'Shipped to Distributor', 'Received by Distributor', 'Shipped to Pharmacy', 'Received by Pharmacy', 'Dispensed']),
    workspaces: [wsMfr, wsDist, wsRx], flows, integrations, records,
  };
}

export function buildSalesPayload(): ScenarioApplyPayload {
  const wsPipeline = mkWorkspace('ws-bebo-sales', 'Sales Pipeline', 'Account', '💰', [
    mkSubSpace('ss-leads', 'Leads', 'Lead', 'board', [
      mkField('f-co', 'Company', 'text', true),
      mkField('f-contact', 'Contact', 'text', true),
      mkField('f-source', 'Lead Source', 'select', false),
      mkField('f-score', 'Lead Score', 'number', false),
    ]),
    mkSubSpace('ss-opps', 'Opportunities', 'Opportunity', 'board', [
      mkField('f-deal', 'Deal Name', 'text', true),
      mkField('f-value', 'Deal Value', 'number', true),
      mkField('f-close', 'Close Date', 'date', false),
      mkField('f-stage', 'Stage', 'select', true),
    ]),
    mkSubSpace('ss-activities', 'Activities', 'Activity', 'timeline', [
      mkField('f-act-type', 'Activity Type', 'select', true),
      mkField('f-subject', 'Subject', 'text', true),
      mkField('f-act-date', 'Activity Date', 'datetime', true),
    ]),
  ]);
  const flows = [
    mkFlow('flow-bebo-stale-lead', 'Stale Lead Alert', 'Lead untouched for 7 days', ['last_activity_days > 7', 'stage = New Lead'], 'Notify assigned rep and escalate to manager', 'ws-bebo-sales', 'ss-leads', ['Type:Lead', 'Status:Stale']),
    mkFlow('flow-bebo-deal-won', 'Deal Won → Onboarding', 'Opportunity stage changed to Closed Won', ['stage = Closed Won'], 'Create onboarding task and notify CS team', 'ws-bebo-sales', 'ss-opps', ['Type:Deal', 'Status:Won']),
    mkFlow('flow-bebo-proposal-fu', 'Proposal Follow-Up', 'Proposal sent without response for 3 days', ['days_since_proposal > 3', 'stage = Proposal'], 'Auto-send follow-up email and log activity', 'ws-bebo-sales', 'ss-opps', ['Type:Deal', 'Stage:Proposal']),
  ];
  const integrations = [
    mkIntegration('int-bebo-ds-sales', 'tpl-docusign', fmtDate(-45)),
    mkIntegration('int-bebo-qb-sales', 'tpl-quickbooks', fmtDate(-30)),
    mkIntegration('int-bebo-http-sales', 'tpl-custom-http', fmtDate(-15)),
  ];
  const contactFirsts = ['John', 'Maria', 'Chris', 'Kim', 'David', 'Emma', 'Raj', 'Zoe'];
  const contactLasts = ['Smith', 'Garcia', 'Johnson', 'Williams', 'Brown', 'Davis', 'Patel', 'Nguyen'];
  const leadRecords: RuntimeRecord[] = COMPANIES.slice(0, 12).map((co, i) => {
    const contact = `${pick(contactFirsts)} ${pick(contactLasts)}`;
    const source = pick(LEAD_SOURCES);
    const score = Math.floor(Math.random() * 80 + 20);
    const stage = pick(DEAL_STAGES);
    return mkRecord(
      `rec-sales-${i}`, `client-sales-${i}`, 'ws-bebo-sales', 'ss-leads',
      `${co} — ${stage}`, stage,
      Math.floor(Math.random() * 200 + 10) * 1000, fmtDate(Math.floor(Math.random() * 60)),
      ['Type:Lead'], {
        'Company': co,
        'Contact': contact,
        'Lead Source': source,
        'Lead Score': score,
      },
    );
  });
  const oppRecords: RuntimeRecord[] = COMPANIES.slice(0, 6).map((co, i) => {
    const value = Math.floor(Math.random() * 200 + 10) * 1000;
    const stage = pick(['Proposal', 'Negotiation', 'Closed Won']);
    const closeDate = fmtDate(Math.floor(Math.random() * 90) + 7);
    return mkRecord(
      `rec-sales-opp-${i}`, `client-sales-${i}`, 'ws-bebo-sales', 'ss-opps',
      `${co} — $${value.toLocaleString()}`, stage,
      value, closeDate, ['Type:Deal'], {
        'Deal Name': `${co} Enterprise License`,
        'Deal Value': value,
        'Close Date': closeDate,
        'Stage': stage,
      },
    );
  });
  const actTypes = ['Call', 'Email', 'Meeting', 'Demo', 'Proposal Sent', 'Follow-Up'];
  const actSubjects = ['Intro call with VP Sales', 'Follow-up on proposal', 'Product demo', 'Contract review discussion', 'Quarterly business review', 'Renewal negotiation'];
  const actRecords: RuntimeRecord[] = Array.from({ length: 4 }, (_, i) => {
    const actType = pick(actTypes);
    const actDate = fmtDate(-Math.floor(Math.random() * 14));
    return mkRecord(
      `rec-sales-act-${i}`, `client-sales-${i}`, 'ws-bebo-sales', 'ss-activities',
      `${actType} — ${COMPANIES[i]}`, 'Completed',
      undefined, actDate, ['Type:Activity'], {
        'Activity Type': actType,
        'Subject': pick(actSubjects),
        'Activity Date': actDate,
      },
    );
  });
  const records = [...leadRecords, ...oppRecords, ...actRecords];
  return {
    shellConfig: mkShellConfig('Account', 'Accounts', 'Sales Workspace', 'Pipeline Stage', ['New Lead', 'Qualified', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost']),
    workspaces: [wsPipeline], flows, integrations, records,
  };
}

export function buildHealthcarePayload(): ScenarioApplyPayload {
  const wsPatients = mkWorkspace('ws-bebo-health', 'Patient Care', 'Patient', '🏥', [
    mkSubSpace('ss-appts', 'Appointments', 'Appointment', 'board', [
      mkField('f-dr', 'Provider', 'text', true),
      mkField('f-appt-date', 'Appointment Date', 'datetime', true),
      mkField('f-appt-type', 'Visit Type', 'select', false),
      mkField('f-notes', 'Notes', 'longText', false),
    ]),
    mkSubSpace('ss-rx', 'Prescriptions', 'Prescription', 'grid', [
      mkField('f-med', 'Medication', 'text', true),
      mkField('f-dosage', 'Dosage', 'text', true),
      mkField('f-start', 'Start Date', 'date', false),
      mkField('f-end', 'End Date', 'date', false),
    ]),
    mkSubSpace('ss-labs', 'Lab Results', 'Lab Result', 'timeline', [
      mkField('f-test', 'Test Name', 'text', true),
      mkField('f-result', 'Result', 'text', true),
      mkField('f-lab-date', 'Date', 'date', true),
      mkField('f-flag', 'Flag', 'select', false),
    ]),
  ]);
  const flows = [
    mkFlow('flow-bebo-noshow', 'No-Show Follow-Up', 'Appointment marked as No-Show', ['status = No-Show'], 'Send follow-up text and create reschedule task', 'ws-bebo-health', 'ss-appts', ['Type:Appointment']),
    mkFlow('flow-bebo-lab-crit', 'Critical Lab Alert', 'Lab result flagged as Critical', ['flag = Critical'], 'Notify primary physician and schedule urgent follow-up', 'ws-bebo-health', 'ss-labs', ['Priority:Urgent', 'Type:Lab']),
  ];
  const integrations = [
    mkIntegration('int-bebo-ds-health', 'tpl-docusign', fmtDate(-60)),
    mkIntegration('int-bebo-http-health', 'tpl-custom-http', fmtDate(-25)),
  ];
  const visitTypes = ['Annual Physical', 'Follow-Up', 'Urgent Care', 'Specialist Consult', 'Lab Review', 'Telehealth'];
  const apptRecords: RuntimeRecord[] = Array.from({ length: 10 }, (_, i) => {
    const provider = pick(DOCTORS);
    const apptDate = fmtDate(Math.floor(Math.random() * 30) - 5);
    const vType = pick(visitTypes);
    const notes = pick(['BP 120/80, weight stable', 'Follow-up on lab results', 'Renewed medication', 'Referred to specialist', 'Discuss treatment options', 'Annual wellness exam']);
    return mkRecord(
      `rec-health-${i}`, `client-health-${i}`, 'ws-bebo-health', 'ss-appts',
      `PAT-${String(1000 + i)} — ${provider}`, pick(['Scheduled', 'Completed', 'No-Show', 'Cancelled']),
      undefined, apptDate, ['Type:Appointment'], {
        'Provider': provider,
        'Appointment Date': apptDate,
        'Visit Type': vType,
        'Notes': notes,
      },
    );
  });
  const medications = ['Lisinopril 10mg', 'Metformin 500mg', 'Atorvastatin 20mg', 'Omeprazole 20mg', 'Sertraline 50mg', 'Amlodipine 5mg'];
  const rxRecords: RuntimeRecord[] = Array.from({ length: 4 }, (_, i) => {
    const med = pick(medications);
    const dosage = pick(['1 tablet daily', '2 tablets daily', '1 tablet twice daily', 'As needed']);
    const startD = fmtDate(-Math.floor(Math.random() * 90));
    const endD = fmtDate(Math.floor(Math.random() * 180) + 30);
    return mkRecord(
      `rec-health-rx-${i}`, `client-health-${i}`, 'ws-bebo-health', 'ss-rx',
      `${med} — PAT-${String(1000 + i)}`, 'Active',
      undefined, startD, ['Type:Prescription'], {
        'Medication': med,
        'Dosage': dosage,
        'Start Date': startD,
        'End Date': endD,
      },
    );
  });
  const testNames = ['CBC', 'Comprehensive Metabolic Panel', 'Lipid Panel', 'Hemoglobin A1c', 'Thyroid Panel', 'Urinalysis'];
  const labRecords: RuntimeRecord[] = Array.from({ length: 4 }, (_, i) => {
    const testName = pick(testNames);
    const result = pick(['Normal', 'Slightly Elevated', 'Within Range', 'Borderline High', 'Low', 'Critical']);
    const labDate = fmtDate(-Math.floor(Math.random() * 30));
    const flag = result === 'Critical' ? 'Critical' : result === 'Slightly Elevated' || result === 'Borderline High' ? 'Abnormal' : 'Normal';
    return mkRecord(
      `rec-health-lab-${i}`, `client-health-${i}`, 'ws-bebo-health', 'ss-labs',
      `${testName} — PAT-${String(1000 + i)}`, 'Completed',
      undefined, labDate, ['Type:Lab'], {
        'Test Name': testName,
        'Result': result,
        'Date': labDate,
        'Flag': flag,
      },
    );
  });
  const records = [...apptRecords, ...rxRecords, ...labRecords];
  return {
    shellConfig: mkShellConfig('Patient', 'Patients', 'Clinical Workspace', 'Care Area', ['Registered', 'Scheduled', 'In Progress', 'Completed', 'Follow-Up', 'Discharged']),
    workspaces: [wsPatients], flows, integrations, records,
  };
}

export function buildLogisticsPayload(): ScenarioApplyPayload {
  const wsFulfillment = mkWorkspace('ws-bebo-logistics', 'Order Fulfillment', 'Shipment', '🚚', [
    mkSubSpace('ss-receiving', 'Inbound Receiving', 'Receiving Event', 'grid', [
      mkField('f-po', 'PO Number', 'text', true),
      mkField('f-supplier', 'Supplier', 'text', true),
      mkField('f-exp-date', 'Expected Date', 'date', false),
      mkField('f-sku-count', 'SKU Count', 'number', false),
    ]),
    mkSubSpace('ss-pick-pack', 'Pick and Pack', 'Pick Order', 'board', [
      mkField('f-order-id', 'Order ID', 'text', true),
      mkField('f-priority', 'Priority', 'select', true),
      mkField('f-items', 'Items Count', 'number', false),
    ]),
    mkSubSpace('ss-outbound', 'Outbound Shipping', 'Shipment Record', 'timeline', [
      mkField('f-tracking', 'Tracking Number', 'text', true),
      mkField('f-carrier', 'Carrier', 'select', true),
      mkField('f-ship-date', 'Ship Date', 'date', true),
    ]),
  ]);
  const flows = [
    mkFlow('flow-bebo-low-stock', 'Low Stock Alert', 'SKU inventory below reorder threshold', ['quantity < reorder_point'], 'Create purchase order and notify procurement', 'ws-bebo-logistics', 'ss-receiving', ['Priority:Low-Stock', 'Type:Inventory']),
    mkFlow('flow-bebo-late-ship', 'Late Shipment Flag', 'Shipment not dispatched by promised date', ['days_delayed > 1', 'status = Packed'], 'Alert shipping coordinator and update customer ETA', 'ws-bebo-logistics', 'ss-outbound', ['Type:Shipping', 'Status:Late']),
  ];
  const integrations = [
    mkIntegration('int-bebo-http-log', 'tpl-custom-http', fmtDate(-20)),
    mkIntegration('int-bebo-qb-log', 'tpl-quickbooks', fmtDate(-40)),
  ];
  const suppliers = ['Global Parts Ltd', 'Pacific Components', 'Midwest Supply Co', 'Eastern Materials', 'Summit Industrial', 'Tri-State Wholesale'];
  const outboundRecords: RuntimeRecord[] = Array.from({ length: 10 }, (_, i) => {
    const carrier = pick(CARRIERS);
    const warehouse = pick(WAREHOUSES);
    const shipDate = fmtDate(-i);
    const tracking = `TRK-${String(300000 + Math.floor(Math.random() * 99999))}`;
    return mkRecord(
      `rec-logistics-${i}`, `client-logistics-${i}`, 'ws-bebo-logistics', 'ss-outbound',
      `ORD-${20000 + i} — ${carrier}`, pick(SHIP_STATUS),
      undefined, shipDate, ['Type:Shipment'], {
        'Tracking Number': tracking,
        'Carrier': carrier,
        'Ship Date': shipDate,
      },
    );
  });
  const receivingRecords: RuntimeRecord[] = Array.from({ length: 4 }, (_, i) => {
    const expDate = fmtDate(Math.floor(Math.random() * 14) + 1);
    return mkRecord(
      `rec-logistics-recv-${i}`, `client-logistics-${i}`, 'ws-bebo-logistics', 'ss-receiving',
      `PO-${40000 + i} — ${pick(suppliers)}`, pick(['Pending', 'In Transit', 'Received']),
      undefined, expDate, ['Type:Receiving'], {
        'PO Number': `PO-${40000 + i}`,
        'Supplier': pick(suppliers),
        'Expected Date': expDate,
        'SKU Count': Math.floor(Math.random() * 50 + 5),
      },
    );
  });
  const pickRecords: RuntimeRecord[] = Array.from({ length: 4 }, (_, i) => mkRecord(
    `rec-logistics-pick-${i}`, `client-logistics-${i}`, 'ws-bebo-logistics', 'ss-pick-pack',
    `ORD-${20000 + i} — Pick Request`, pick(['Queued', 'Picking', 'Packed', 'Ready']),
    undefined, fmtDate(-Math.floor(Math.random() * 3)), ['Type:PickPack'], {
      'Order ID': `ORD-${20000 + i}`,
      'Priority': pick(['Standard', 'Expedite', 'Rush', 'Same-Day']),
      'Items Count': Math.floor(Math.random() * 20 + 1),
    },
  ));
  const records = [...outboundRecords, ...receivingRecords, ...pickRecords];
  return {
    shellConfig: mkShellConfig('Shipment', 'Shipments', 'Logistics Workspace', 'Operations Lane', ['Ordered', 'Received', 'Picking', 'Packed', 'Shipped', 'Delivered', 'Returned']),
    workspaces: [wsFulfillment], flows, integrations, records,
  };
}

export function buildLegalPayload(): ScenarioApplyPayload {
  const wsCases = mkWorkspace('ws-bebo-legal', 'Case Management', 'Case', '⚖️', [
    mkSubSpace('ss-active-cases', 'Active Cases', 'Case', 'grid', [
      mkField('f-case-no', 'Case Number', 'text', true),
      mkField('f-client', 'Client Name', 'text', true),
      mkField('f-matter', 'Matter Type', 'select', true),
      mkField('f-attorney', 'Assigned Attorney', 'text', true),
    ]),
    mkSubSpace('ss-deadlines', 'Deadlines & Court Dates', 'Calendar Event', 'timeline', [
      mkField('f-event-type', 'Event Type', 'select', true),
      mkField('f-court-date', 'Date', 'datetime', true),
      mkField('f-court', 'Court', 'text', false),
    ]),
    mkSubSpace('ss-billing', 'Time & Billing', 'Time Entry', 'grid', [
      mkField('f-entry-date', 'Date', 'date', true),
      mkField('f-hours', 'Hours', 'number', true),
      mkField('f-rate', 'Hourly Rate', 'number', true),
      mkField('f-desc', 'Description', 'longText', false),
    ]),
  ]);
  const flows = [
    mkFlow('flow-bebo-court-deadline', 'Court Deadline Alert', 'Court date within 7 days', ['event_type = Court Hearing', 'days_until <= 7'], 'Send urgent reminder to attorney and paralegal', 'ws-bebo-legal', 'ss-deadlines', ['Priority:Urgent', 'Type:Deadline']),
    mkFlow('flow-bebo-unbilled', 'Unbilled Time Reminder', 'Time entries older than 30 days not invoiced', ['billed = false', 'age_days > 30'], 'Notify billing department and generate draft invoice', 'ws-bebo-legal', 'ss-billing', ['Type:Billing']),
  ];
  const integrations = [
    mkIntegration('int-bebo-ds-legal', 'tpl-docusign', fmtDate(-90)),
    mkIntegration('int-bebo-qb-legal', 'tpl-quickbooks', fmtDate(-60)),
  ];
  const legalAdj = ['Greenfield', 'Mountain View', 'Sunrise', 'Pacific', 'Atlantic', 'Northern', 'Western', 'Capital'];
  const legalOrgs = ['LLC', 'Corp.', 'Industries', 'Holdings', 'Group', 'Partners', 'Ventures', 'Associates'];
  const caseRecords: RuntimeRecord[] = Array.from({ length: 8 }, (_, i) => {
    const clientName = `${pick(legalAdj)} ${pick(legalOrgs)}`;
    const matter = pick(MATTER_TYPES);
    const attorney = pick(ATTORNEYS);
    const status = pick(CASE_STATUS);
    return mkRecord(
      `rec-legal-${i}`, `client-legal-${i}`, 'ws-bebo-legal', 'ss-active-cases',
      `CASE-2026-${1000 + i} — ${matter}`, status,
      Math.floor(Math.random() * 50 + 10) * 1000, fmtDate(-i * 7),
      ['Type:Case'], {
        'Case Number': `CASE-2026-${1000 + i}`,
        'Client Name': clientName,
        'Matter Type': matter,
        'Assigned Attorney': attorney,
      },
    );
  });
  const courtEventTypes = ['Court Hearing', 'Filing Deadline', 'Deposition', 'Mediation', 'Trial Start', 'Motion Deadline'];
  const courts = ['Southern District NY', 'Central District CA', 'Northern District IL', 'Eastern District PA', 'District of Columbia'];
  const deadlineRecords: RuntimeRecord[] = Array.from({ length: 4 }, (_, i) => {
    const evType = pick(courtEventTypes);
    const dt = fmtDate(Math.floor(Math.random() * 60) + 1);
    return mkRecord(
      `rec-legal-dl-${i}`, `client-legal-${i}`, 'ws-bebo-legal', 'ss-deadlines',
      `${evType} — CASE-2026-${1000 + i}`, pick(CASE_STATUS),
      undefined, dt, ['Type:Deadline'], {
        'Event Type': evType,
        'Date': dt,
        'Court': pick(courts),
      },
    );
  });
  const billingDescs = ['Client meeting re strategy', 'Draft motion for summary judgment', 'Document review and analysis', 'Prepare deposition questions', 'Court appearance', 'Settlement negotiation call', 'Legal research — precedent review'];
  const billingRecords: RuntimeRecord[] = Array.from({ length: 4 }, (_, i) => {
    const hours = Math.floor(Math.random() * 8 + 1);
    const rate = pick([250, 350, 450, 550, 650]);
    const dt = fmtDate(-Math.floor(Math.random() * 30));
    return mkRecord(
      `rec-legal-bill-${i}`, `client-legal-${i}`, 'ws-bebo-legal', 'ss-billing',
      `${hours}h @ $${rate}/hr — CASE-2026-${1000 + i}`, 'Logged',
      hours * rate, dt, ['Type:Billing'], {
        'Date': dt,
        'Hours': hours,
        'Hourly Rate': rate,
        'Description': pick(billingDescs),
      },
    );
  });
  const records = [...caseRecords, ...deadlineRecords, ...billingRecords];
  return {
    shellConfig: mkShellConfig('Case', 'Cases', 'Legal Workspace', 'Practice Area', ['Intake', 'Engagement', 'Discovery', 'Litigation', 'Settlement', 'Closed', 'Archived']),
    workspaces: [wsCases], flows, integrations, records,
  };
}

export function buildInsurancePayload(): ScenarioApplyPayload {
  const wsPolicies = mkWorkspace('ws-bebo-insurance', 'Policy Administration', 'Policy', '🛡️', [
    mkSubSpace('ss-active-pols', 'Active Policies', 'Policy', 'grid', [
      mkField('f-pol-no', 'Policy Number', 'text', true),
      mkField('f-insured', 'Insured Name', 'text', true),
      mkField('f-cov-type', 'Coverage Type', 'select', true),
      mkField('f-premium', 'Annual Premium', 'number', true),
      mkField('f-eff-date', 'Effective Date', 'date', true),
    ]),
    mkSubSpace('ss-claims', 'Open Claims', 'Claim', 'board', [
      mkField('f-claim-no', 'Claim Number', 'text', true),
      mkField('f-claimant', 'Claimant', 'text', true),
      mkField('f-loss-date', 'Date of Loss', 'date', true),
      mkField('f-est-amount', 'Estimated Amount', 'number', true),
    ]),
    mkSubSpace('ss-renewals', 'Renewals', 'Renewal Request', 'board', [
      mkField('f-ren-pol', 'Policy Number', 'text', true),
      mkField('f-ren-date', 'Renewal Date', 'date', true),
      mkField('f-prop-prem', 'Proposed Premium', 'number', false),
    ]),
  ]);
  const flows = [
    mkFlow('flow-bebo-high-claim', 'High-Value Claim Escalation', 'Claim amount exceeds $50,000', ['estimated_amount > 50000', 'status = Open'], 'Escalate to senior adjuster and notify management', 'ws-bebo-insurance', 'ss-claims', ['Priority:High', 'Type:Claim']),
    mkFlow('flow-bebo-renewal', 'Policy Renewal Reminder', 'Policy expiring within 30 days', ['expiry_days <= 30', 'renewal_status = None'], 'Generate renewal quote and notify policyholder', 'ws-bebo-insurance', 'ss-active-pols', ['Type:Policy', 'Status:Expiring']),
  ];
  const integrations = [
    mkIntegration('int-bebo-ds-ins', 'tpl-docusign', fmtDate(-120)),
    mkIntegration('int-bebo-qb-ins', 'tpl-quickbooks', fmtDate(-90)),
    mkIntegration('int-bebo-http-ins', 'tpl-custom-http', fmtDate(-30)),
  ];
  const insPrefixes = ['Sunrise', 'Northland', 'Pacific', 'Prairie', 'Valley', 'Metro', 'Coastal', 'Highland'];
  const insSuffixes = ['LLC', 'Corp', 'Holdings', 'Inc', 'Group', 'Association'];
  const insAgents = ['Alex Johnson', 'Maria Santos', 'Kevin Wu', 'Rachel Green', 'Tyler Morris'];
  const policyRecords: RuntimeRecord[] = Array.from({ length: 8 }, (_, i) => {
    const covType = pick(COV_TYPES);
    const insured = `${pick(insPrefixes)} ${pick(insSuffixes)}`;
    const premium = Math.floor(Math.random() * 50 + 5) * 1000;
    const effDate = fmtDate(-Math.floor(Math.random() * 365));
    return mkRecord(
      `rec-ins-${i}`, `client-ins-${i}`, 'ws-bebo-insurance', 'ss-active-pols',
      `POL-2026${String(10000 + i)} — ${covType}`, pick(INS_STATUS),
      premium, effDate, ['Type:Policy'], {
        'Policy Number': `POL-2026${String(10000 + i)}`,
        'Insured Name': insured,
        'Coverage Type': covType,
        'Annual Premium': premium,
        'Effective Date': effDate,
      },
    );
  });
  const claimRecords: RuntimeRecord[] = Array.from({ length: 4 }, (_, i) => {
    const estAmt = Math.floor(Math.random() * 80 + 5) * 1000;
    const lossDate = fmtDate(-Math.floor(Math.random() * 60));
    return mkRecord(
      `rec-ins-claim-${i}`, `client-ins-${i}`, 'ws-bebo-insurance', 'ss-claims',
      `CLM-2026${String(50000 + i)} — ${pick(COV_TYPES)}`, pick(['Open', 'Under Review', 'Approved', 'Denied']),
      estAmt, lossDate, ['Type:Claim'], {
        'Claim Number': `CLM-2026${String(50000 + i)}`,
        'Claimant': `${pick(insPrefixes)} ${pick(insSuffixes)}`,
        'Date of Loss': lossDate,
        'Estimated Amount': estAmt,
      },
    );
  });
  const renewalRecords: RuntimeRecord[] = Array.from({ length: 4 }, (_, i) => {
    const renDate = fmtDate(Math.floor(Math.random() * 60) + 7);
    const propPrem = Math.floor(Math.random() * 50 + 5) * 1000;
    return mkRecord(
      `rec-ins-ren-${i}`, `client-ins-${i + 4}`, 'ws-bebo-insurance', 'ss-renewals',
      `Renewal — POL-2026${String(10000 + i + 4)}`, 'Renewal Pending',
      propPrem, renDate, ['Type:Renewal'], {
        'Policy Number': `POL-2026${String(10000 + i + 4)}`,
        'Renewal Date': renDate,
        'Proposed Premium': propPrem,
      },
    );
  });
  const records = [...policyRecords, ...claimRecords, ...renewalRecords];
  return {
    shellConfig: mkShellConfig('Policy', 'Policies', 'Insurance Workspace', 'Service Line', ['Application', 'Underwriting', 'Bound', 'Active', 'Renewal Pending', 'Lapsed', 'Cancelled']),
    workspaces: [wsPolicies], flows, integrations, records,
  };
}

// ─── Business Architecture Builders ──────────────────────────────────

function buildPharmaBusinessFunctions(): BusinessFunction[] {
  return [{
    id: 'bfn-supply-chain',
    name: 'Supply Chain & Regulatory',
    icon: '🔗',
    color: '#8C5BF5',
    order: 0,
    description: 'End-to-end pharmaceutical serialization from manufacturer to patient dispensing',
    objects: [{
      id: 'bobj-drug-inventory',
      functionId: 'bfn-supply-chain',
      name: 'Drug Inventory',
      namePlural: 'Drug Inventories',
      icon: '💊',
      description: 'Track serialized pharmaceutical batches across the DSCSA supply chain',
      workspaceIds: ['ws-bebo-pharma-mfr', 'ws-bebo-pharma-dist', 'ws-bebo-pharma-rx'],
    }],
  }];
}

function buildSalesBusinessFunctions(): BusinessFunction[] {
  return [{
    id: 'bfn-revenue-ops',
    name: 'Revenue Operations',
    icon: '💰',
    color: '#10B981',
    order: 0,
    description: 'Full-cycle revenue management from lead capture through closed deal',
    objects: [{
      id: 'bobj-deal-pipeline',
      functionId: 'bfn-revenue-ops',
      name: 'Deal Pipeline',
      namePlural: 'Deal Pipelines',
      icon: '📈',
      description: 'Track opportunities and deals through the sales lifecycle',
      workspaceIds: ['ws-bebo-sales-pipelines'],
    }, {
      id: 'bobj-account',
      functionId: 'bfn-revenue-ops',
      name: 'Account',
      namePlural: 'Accounts',
      icon: '🏢',
      description: 'Company accounts and their contact relationships',
      workspaceIds: ['ws-bebo-sales-accounts'],
    }],
  }];
}

export function getPayloadForVertical(vertical: DemoVertical): ScenarioApplyPayload {
  switch (vertical) {
    case 'pharma': return buildPharmaPayload();
    case 'sales': return buildSalesPayload();
    case 'healthcare': return buildHealthcarePayload();
    case 'logistics': return buildLogisticsPayload();
    case 'legal': return buildLegalPayload();
    case 'insurance': return buildInsurancePayload();
  }
}

// ─── Intent Classification ────────────────────────────────────────────

const INTENT_PATTERNS: Array<{ intent: BeboIntent; keywords: string[] }> = [
  { intent: 'build_workspace', keywords: ['build workspace', 'create workspace', 'generate workspace', 'set up workspace', 'architect', 'scaffold', 'design workspace', 'workspace for', 'configure workspace', 'new workspace', 'workspace structure', 'make workspace', 'build me'] },
  { intent: 'build_architecture', keywords: ['business architecture', 'map my business', 'operations map', 'define functions', 'business map', 'build architecture', 'functions and objects', 'business functions', 'business objects', 'build my ops', 'map operations', 'what are my objects'] },
  { intent: 'generate_data', keywords: ['fake data', 'sample data', 'generate data', 'test records', 'dummy data', 'populate', 'data for cosmograph', 'create records', 'generate records', 'add records', '20 records', '50 records', 'data file', 'test data'] },
  { intent: 'show_signals', keywords: ['signal', 'automation', 'flow', 'workflow', 'trigger', 'alert', 'automate', 'when ', 'notify', 'rules', 'action chain', 'set up flow', 'create flow', 'build flow', 'signal studio'] },
  { intent: 'show_orbital', keywords: ['orbital', 'integration', 'connect to', 'docusign', 'quickbooks', 'salesforce', 'hubspot', 'stripe', 'twilio', 'sap', 'netsuite', 'api', 'webhook', 'third-party', 'plug in', 'connector'] },
  { intent: 'cosmograph', keywords: ['cosmograph', 'import csv', 'upload csv', 'schema detection', 'field mapping', 'csv import', 'upload json', 'data import', 'import to cosmo', 'show cosmograph'] },
  { intent: 'show_stats', keywords: ['stats', 'analytics', 'metrics', 'kpi', 'how many', 'count', 'total records', 'report', 'summary', 'dashboard', 'insights', 'platform stats', 'show me numbers'] },
  { intent: 'greeting', keywords: ['hello', 'hi bebo', 'hey ', 'help me', 'what can you', 'what do you do', 'get started', 'begin', 'demo', 'show me what', 'introduce'] },
];

export function classifyIntent(text: string): BeboIntent {
  const lower = text.toLowerCase();
  for (const { intent, keywords } of INTENT_PATTERNS) {
    if (keywords.some(k => lower.includes(k))) return intent;
  }
  if (/csv|json|file|upload|import/i.test(lower)) return 'cosmograph';
  if (/workspace|subspace|field|role|persona/i.test(lower)) return 'build_workspace';
  return 'general';
}

// ─── Static Catalog ───────────────────────────────────────────────────

export const VERTICAL_META: Record<DemoVertical, { label: string; icon: string; color: string; shortLabel: string }> = {
  pharma: { label: 'Pharmaceutical / DSCSA', icon: '💊', color: '#8C5BF5', shortLabel: 'Pharma' },
  sales: { label: 'Sales CRM', icon: '💰', color: '#10B981', shortLabel: 'Sales' },
  healthcare: { label: 'Healthcare', icon: '🏥', color: '#3B82F6', shortLabel: 'Health' },
  logistics: { label: 'Logistics', icon: '🚚', color: '#F59E0B', shortLabel: 'Logistics' },
  legal: { label: 'Legal', icon: '⚖️', color: '#64748B', shortLabel: 'Legal' },
  insurance: { label: 'Insurance', icon: '🛡️', color: '#EF4444', shortLabel: 'Insurance' },
};

const INTEGRATION_CATALOG: BeboCardIntegrationStatus['integrations'] = [
  { name: 'DocuSign', icon: '📝', vendor: 'DocuSign Inc.', status: 'active', lastSync: '2 min ago', eventsToday: 14, category: 'Documents', templateId: 'tpl-docusign' },
  { name: 'QuickBooks', icon: '📊', vendor: 'Intuit', status: 'active', lastSync: '5 min ago', eventsToday: 31, category: 'Accounting', templateId: 'tpl-quickbooks' },
  { name: 'Custom HTTP / REST', icon: '🔗', vendor: 'CoreSpace', status: 'active', lastSync: '1 min ago', eventsToday: 87, category: 'API', templateId: 'tpl-custom-http' },
  { name: 'Salesforce CRM', icon: '☁️', vendor: 'Salesforce', status: 'ready', lastSync: 'Ready to activate', eventsToday: 0, category: 'CRM', templateId: 'tpl-salesforce' },
  { name: 'SAP Business One', icon: '🏗️', vendor: 'SAP SE', status: 'ready', lastSync: 'Ready to activate', eventsToday: 0, category: 'ERP', templateId: 'tpl-sap' },
  { name: 'Twilio SMS / Voice', icon: '💬', vendor: 'Twilio', status: 'active', lastSync: '8 min ago', eventsToday: 22, category: 'Comms', templateId: 'tpl-twilio' },
  { name: 'Stripe Payments', icon: '💳', vendor: 'Stripe', status: 'ready', lastSync: 'Ready to activate', eventsToday: 0, category: 'Payments', templateId: 'tpl-stripe' },
  { name: 'HubSpot', icon: '🧡', vendor: 'HubSpot', status: 'ready', lastSync: 'Ready to activate', eventsToday: 0, category: 'Marketing', templateId: 'tpl-hubspot' },
];

const WORKSPACE_KPI: Record<DemoVertical, { v1: string; v2: string; v3: string; wsCount: number; flowCount: number }> = {
  pharma: { v1: '247 Serialized Batches', v2: '99.8% Compliance Rate', v3: '3 Workspaces Active', wsCount: 3, flowCount: 3 },
  sales: { v1: '$2.4M Pipeline Value', v2: '34% Win Rate', v3: '183 Tracked Records', wsCount: 1, flowCount: 3 },
  healthcare: { v1: '412 Patient Records', v2: '94% Appointment Show Rate', v3: '38 Visits Today', wsCount: 1, flowCount: 2 },
  logistics: { v1: '891 Shipments Active', v2: '97.2% On-Time Rate', v3: '12 Alerts Today', wsCount: 1, flowCount: 2 },
  legal: { v1: '94 Active Cases', v2: '$1.8M Billed YTD', v3: '8 Court Dates This Month', wsCount: 1, flowCount: 2 },
  insurance: { v1: '318 Active Policies', v2: '$4.2M Annual Premium', v3: '27 Open Claims', wsCount: 1, flowCount: 2 },
};

// ─── Response Generator ───────────────────────────────────────────────

export function generateBeboResponse(userText: string, vertical: DemoVertical): BeboResponse {
  const intent = classifyIntent(userText);
  const { label, icon } = VERTICAL_META[vertical];
  const payload = getPayloadForVertical(vertical);
  const data = getDataForVertical(vertical);
  const kpi = WORKSPACE_KPI[vertical];

  switch (intent) {
    case 'build_workspace': {
      const wsCard: BeboCardWorkspaceProposal = {
        type: 'workspace_proposal',
        id: cid(),
        industry: label,
        workspaces: payload.workspaces.map(ws => ({
          name: ws.name,
          icon: ws.icon ?? '🗂️',
          rootEntity: ws.rootEntity,
          subSpaces: ws.subSpaces.map(ss => ({
            name: ss.name,
            sourceEntity: ss.sourceEntity,
            displayType: ss.displayType,
            fieldCount: ss.builderFields?.length ?? 0,
          })),
        })),
        personas: getPersonasForVertical(vertical),
        lifecycleStages: getStagesForVertical(vertical),
        flows: payload.flows.map(f => ({ name: f.name, trigger: f.signal, action: f.action })),
        applyPayload: payload,
      };
      const ssTotal = wsCard.workspaces.reduce((a, w) => a + w.subSpaces.length, 0);
      return {
        text: `I've designed a complete **${label}** workspace architecture.\n\nThis includes **${wsCard.workspaces.length} workspace${wsCard.workspaces.length > 1 ? 's' : ''}**, **${ssTotal} subspaces**, **${wsCard.personas.length} personas**, and **${wsCard.lifecycleStages.length} lifecycle stages** — all pre-wired and ready to deploy.\n\nClick **Apply Full Scenario** to populate Admin, Signal Studio, Orbital, and End User simultaneously.`,
        cards: [wsCard],
        quickReplies: ['Generate sample data', 'Set up Signal flows', 'Show Orbital integrations', 'Show platform stats'],
      };
    }

    case 'generate_data': {
      const count = /50|hundred|large/i.test(userText) ? 50 : /10\b/i.test(userText) ? 10 : 20;
      const freshData = getDataForVertical(vertical);
      const dataCard: BeboCardDataPreview = {
        type: 'data_preview',
        id: cid(),
        title: `${icon} ${label} — ${count} Sample Records`,
        format: 'csv',
        ...freshData,
        totalRows: count,
      };
      return {
        text: `Here's a realistic **${label}** dataset with **${count} records** — industry-accurate field structures, representative status distributions, and proper data types throughout.\n\nAvailable as **CSV** or **JSON**. Click **Import to Cosmograph** to feed it directly into the schema intelligence engine, or download for external use.`,
        cards: [dataCard],
        quickReplies: ['Import to Cosmograph', 'Build workspace too', 'Set up Signal flows', 'Generate 50 records'],
      };
    }

    case 'show_signals': {
      const flowCard: BeboCardSignalFlows = {
        type: 'signal_flows',
        id: cid(),
        flows: payload.flows.map(f => ({
          name: f.name,
          trigger: f.signal,
          conditions: f.rules,
          action: f.action,
          runsToday: Math.floor(Math.random() * 40 + 5),
        })),
        applyPayload: payload,
      };
      return {
        text: `I've pre-built **${payload.flows.length} Signal Studio automation flows** for your **${label}** workspace.\n\nEach flow has a configured trigger and action chain designed around the highest-impact events in ${label.toLowerCase()} operations. They're **production-ready** — click **Publish All Flows** to activate them.`,
        cards: [flowCard],
        quickReplies: ['Build workspace too', 'Show Orbital integrations', 'Generate sample data', 'Show platform stats'],
      };
    }

    case 'show_orbital': {
      const intCard: BeboCardIntegrationStatus = {
        type: 'integration_status',
        id: cid(),
        integrations: INTEGRATION_CATALOG,
      };
      return {
        text: `Orbital connects CoreSpace to every tool your **${label}** team already uses.\n\n**4 integrations are live** and processing events now. The others are pre-configured — activate with one click, no code required. All integrations are **bi-directional**: data flows in *and* out, with Signal flows reacting to integration events automatically.`,
        cards: [intCard],
        quickReplies: ['Set up automation flows', 'Build workspace structure', 'Generate sample data', 'Show platform stats'],
      };
    }

    case 'cosmograph': {
      const dataCard: BeboCardDataPreview = {
        type: 'data_preview',
        id: cid(),
        title: `${icon} Cosmograph Import — ${label}`,
        format: 'csv',
        ...data,
      };
      return {
        text: `**Cosmograph** is CoreSpace's schema intelligence engine. Drop in any CSV, JSON, or structured text and it will:\n\n**1.** Auto-detect column types (text, number, date, email, PII)\n**2.** Flag private data before import\n**3.** Map columns to workspace fields with AI suggestions\n**4.** Import up to 1,000 records in a single pass\n\nHere's a ${label} dataset ready for direct Cosmograph import:`,
        cards: [dataCard],
        quickReplies: ['Open Cosmograph', 'Build workspace structure', 'Generate more records', 'Import as JSON'],
      };
    }

    case 'show_stats': {
      const statsCard: BeboCardStats = {
        type: 'stats',
        id: cid(),
        stats: [
          { label: kpi.v1.replace(/^[\d$,.]+\s*/, ''), value: kpi.v1.match(/^[\d$,.]+/)?.[0] ?? '—', delta: '+12% this month', positive: true, icon: '📊' },
          { label: 'Signal Flows Active', value: String(kpi.flowCount), delta: `${kpi.flowCount * 47} runs today`, positive: true, icon: '⚡' },
          { label: 'Workspaces', value: String(kpi.wsCount), delta: `${kpi.wsCount * 3} SubSpaces`, positive: true, icon: '🗂️' },
          { label: kpi.v2.replace(/^[\d$,.%]+\s*/, ''), value: kpi.v2.match(/^[\d$,.%]+/)?.[0] ?? '—', icon: '🎯' },
          { label: kpi.v3.replace(/^[\d$,.]+\s*/, ''), value: kpi.v3.match(/^[\d$,.]+/)?.[0] ?? '—', icon: '✅' },
          { label: 'Active Integrations', value: '4', delta: 'All systems operational', positive: true, icon: '🔗' },
        ],
      };
      return {
        text: `Here's a **live platform snapshot** for your **${label}** deployment. All metrics update in real-time as records move through lifecycle stages, Signal flows execute, and Orbital integrations process events.`,
        cards: [statsCard],
        quickReplies: ['Build workspace structure', 'Set up automations', 'Show integrations', 'Generate sample data'],
      };
    }

    case 'build_architecture': {
      const bizFns = vertical === 'pharma' ? buildPharmaBusinessFunctions()
        : vertical === 'sales' ? buildSalesBusinessFunctions()
        : buildPharmaBusinessFunctions();
      const archCard: BeboCardArchitecture = {
        type: 'architecture',
        id: cid(),
        industry: label,
        functions: bizFns.map(fn => ({
          fnId: fn.id,
          name: fn.name,
          icon: fn.icon ?? '🏢',
          color: fn.color ?? '#8C5BF5',
          description: fn.description ?? '',
          objects: fn.objects.map(obj => ({
            name: obj.name,
            namePlural: obj.namePlural,
            icon: obj.icon ?? '📦',
            description: obj.description ?? '',
            workspaceNames: obj.workspaceIds.map(wid => payload.workspaces.find(w => w.id === wid)?.name ?? wid),
          })),
        })),
        applyPayload: { ...payload, businessFunctions: bizFns },
      };
      const totalObjs = bizFns.reduce((a, f) => a + f.objects.length, 0);
      return {
        text: `I've mapped out the complete **${icon} ${label}** business architecture.\n\n**${bizFns.length} Business Function${bizFns.length !== 1 ? 's' : ''}** with **${totalObjs} Business Object${totalObjs !== 1 ? 's' : ''}** — pre-linked to your workspace structure.\n\nClick **Apply Architecture** to load this directly into the Architecture tab in Admin, where you can refine it further.`,
        cards: [archCard],
        quickReplies: ['Apply this architecture', 'Build workspaces too', 'Show Signal flows', 'Show platform stats'],
      };
    }

    case 'greeting': {
      const wsCard: BeboCardWorkspaceProposal = {
        type: 'workspace_proposal',
        id: cid(),
        industry: label,
        workspaces: payload.workspaces.map(ws => ({
          name: ws.name,
          icon: ws.icon ?? '🗂️',
          rootEntity: ws.rootEntity,
          subSpaces: ws.subSpaces.map(ss => ({
            name: ss.name,
            sourceEntity: ss.sourceEntity,
            displayType: ss.displayType,
            fieldCount: ss.builderFields?.length ?? 0,
          })),
        })),
        personas: getPersonasForVertical(vertical),
        lifecycleStages: getStagesForVertical(vertical),
        flows: payload.flows.map(f => ({ name: f.name, trigger: f.signal, action: f.action })),
        applyPayload: payload,
      };
      return {
        text: `Hi! I'm **Bebo**, CoreSpace's AI architect. I'm pre-loaded for **${icon} ${label}**.\n\nHere's what I can do right now:\n• **Build** a complete workspace from scratch\n• **Generate** realistic ${label.toLowerCase()} data (CSV / JSON)\n• **Design** Signal Studio automation flows\n• **Show** Orbital integration status\n• **Import** any dataset via Cosmograph\n\nI've already pre-built your ${label} workspace setup below — want me to apply it?`,
        cards: [wsCard],
        quickReplies: ['Apply workspace now', 'Generate sample data', 'Show Signal flows', 'Show integrations'],
      };
    }

    default: {
      const fallbacks = [
        `I can help with your **${label}** workspace. Try: **build a workspace**, **generate sample data**, **set up automation flows**, or **show integrations**.`,
        `For **${label}**, I'd suggest starting with the workspace structure, then generating realistic data, and finally wiring up your automation flows. Which would you like first?`,
        `Great question for the **${label}** use case — I have complete knowledge of this vertical. Ask me to build a workspace, show signal flows, or generate data.`,
      ];
      return {
        text: pick(fallbacks),
        cards: [],
        quickReplies: ['Build workspace', 'Generate data', 'Show automations', 'Show integrations'],
      };
    }
  }
}

function getPersonasForVertical(v: DemoVertical): string[] {
  const map: Record<DemoVertical, string[]> = {
    pharma: ['Manufacturer Serialization Lead', 'Distributor Receiver', 'Pharmacy Dispense Manager', 'Compliance Trace Analyst'],
    sales: ['Sales Rep', 'Sales Manager', 'SDR', 'Account Executive'],
    healthcare: ['Physician', 'Nurse', 'Front Desk Coordinator', 'Billing Specialist'],
    logistics: ['Warehouse Manager', 'Picker / Packer', 'Shipping Coordinator', 'Procurement Officer'],
    legal: ['Managing Partner', 'Attorney', 'Paralegal', 'Legal Secretary'],
    insurance: ['Underwriter', 'Claims Adjuster', 'Policy Administrator', 'Customer Service Rep'],
  };
  return map[v];
}

function getStagesForVertical(v: DemoVertical): string[] {
  const map: Record<DemoVertical, string[]> = {
    pharma: ['Serialized', 'Shipped to Distributor', 'Received by Distributor', 'Shipped to Pharmacy', 'Dispensed'],
    sales: ['New Lead', 'Qualified', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost'],
    healthcare: ['Registered', 'Scheduled', 'In Progress', 'Completed', 'Follow-Up'],
    logistics: ['Ordered', 'Received', 'Picking', 'Packed', 'Shipped', 'Delivered'],
    legal: ['Intake', 'Engagement', 'Discovery', 'Litigation', 'Settlement', 'Closed'],
    insurance: ['Application', 'Underwriting', 'Bound', 'Active', 'Renewal Pending'],
  };
  return map[v];
}

// ─── Scenario Switch Message ──────────────────────────────────────────

const SCENARIO_INTROS: Record<DemoVertical, string> = {
  pharma: `Switching to **💊 Pharmaceutical / DSCSA** mode.\n\nI have full knowledge of DSCSA serialization requirements, FDA track-and-trace compliance, and supply chain traceability from manufacturer through distributor to pharmacy.\n\nYour **Manufacturer Serialization**, **Distributor Verification**, and **Pharmacy Dispense Trace** workspaces are pre-built and ready to apply.`,
  sales: `Switching to **💰 Sales CRM** mode.\n\nI've pre-built a complete **Sales Pipeline** workspace with Lead tracking, Opportunity management, and Activity logging — plus 3 automation flows: Stale Lead Alert, Deal Won → Onboarding, and Proposal Follow-Up.\n\nReady to deploy to your CoreSpace instance?`,
  healthcare: `Switching to **🏥 Healthcare / Patient Care** mode.\n\nYour **Patient Care** workspace covers Appointments, Prescriptions, and Lab Results — with a No-Show Follow-Up automation and Critical Lab Alert pre-configured.\n\nApply it with one click, or ask me to customize first.`,
  logistics: `Switching to **🚚 Logistics & Warehousing** mode.\n\nYour **Order Fulfillment** workspace has Inbound Receiving, Pick and Pack, and Outbound Shipping lanes — with Low Stock Alert and Late Shipment Flag automations already wired.\n\nWant me to apply the full scenario now?`,
  legal: `Switching to **⚖️ Legal Case Management** mode.\n\nI've designed a complete law firm workspace: **Active Cases**, **Deadlines & Court Dates**, and **Time & Billing** — with Court Deadline Alert and Unbilled Time Reminder automations.\n\nReady to activate across Admin, Signal Studio, and Orbital?`,
  insurance: `Switching to **🛡️ Insurance Operations** mode.\n\nYour **Policy Administration** workspace covers Active Policies, Open Claims, and Renewals — with High-Value Claim Escalation and Policy Renewal Reminder flows ready to publish.\n\nApply it now to see the full insurance demo in action.`,
};

export function getScenarioIntroResponse(vertical: DemoVertical): BeboResponse {
  const payload = getPayloadForVertical(vertical);
  const { icon, label } = VERTICAL_META[vertical];
  const wsCard: BeboCardWorkspaceProposal = {
    type: 'workspace_proposal',
    id: cid(),
    industry: label,
    workspaces: payload.workspaces.map(ws => ({
      name: ws.name,
      icon: ws.icon ?? '🗂️',
      rootEntity: ws.rootEntity,
      subSpaces: ws.subSpaces.map(ss => ({
        name: ss.name,
        sourceEntity: ss.sourceEntity,
        displayType: ss.displayType,
        fieldCount: ss.builderFields?.length ?? 0,
      })),
    })),
    personas: getPersonasForVertical(vertical),
    lifecycleStages: getStagesForVertical(vertical),
    flows: payload.flows.map(f => ({ name: f.name, trigger: f.signal, action: f.action })),
    applyPayload: payload,
  };
  return {
    text: SCENARIO_INTROS[vertical],
    cards: [wsCard],
    quickReplies: ['Apply full scenario now', 'Generate sample data', 'Show Signal flows', 'Show Orbital integrations'],
  };
}
