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
  ShellIntakeField,
  EndUserPersona,
  LifecycleStage,
  LifecycleTransition,
  BusinessFunction,
  ClientProfile,
} from '../types';

// ─── Public Types ────────────────────────────────────────────────────

export type DemoVertical = 'pharma' | 'sales' | 'healthcare' | 'logistics' | 'legal' | 'insurance' | 'lifecycle' | 'fulfillment' | 'kitting';

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
  clients?: ClientProfile[];
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

function mkClient(id: string, name: string, caseRef: string, tags: string[] = []): ClientProfile {
  const parts = name.split(' ');
  return {
    id,
    firstName: parts[0] ?? name,
    lastName: parts.slice(1).join(' ') || '',
    caseRef,
    tags,
    createdAt: new Date().toISOString(),
  };
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
  const firstNames = ['James', 'Sofia', 'Marcus', 'Elena', 'David', 'Priya', 'Thomas', 'Natalie', 'Liam', 'Amara', 'Robert', 'Yuki'];
  const lastNames  = ['Morrison', 'Chen', 'Thompson', 'Patel', 'Williams', 'Rodriguez', 'Kim', 'Martinez', 'Okafor', 'Dubois', 'Reyes', 'Nakamura'];
  const rows: string[][] = Array.from({ length: count }, (_, i) => [
    `CASE-2026-${String(1000 + i)}`,
    `${pick(firstNames)} ${pick(lastNames)}`,
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
  const firstNamesIns = ['Angela', 'Carlos', 'Brianna', 'Kevin', 'Fatima', 'Derek', 'Simone', 'Patrick'];
  const lastNamesIns  = ['Jefferson', 'Morales', 'Wallace', 'Huang', 'Osei', 'Larkin', 'Nkosi', 'McLaughlin'];
  const rows: string[][] = Array.from({ length: count }, (_, i) => [
    `POL-2026${String(10000 + i)}`,
    `${pick(firstNamesIns)} ${pick(lastNamesIns)}`,
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

// ─── Lifecycle & Fulfillment Data Generators ─────────────────────

const LIFECYCLE_COMPANIES = [
  'Acme Technologies', 'GlobalTech Inc', 'Summit Systems', 'ProEdge Corp', 'Nexus Digital',
  'Pinnacle Group', 'Apex Enterprises', 'Stellar Holdings', 'Horizon Connect', 'Vertex Solutions',
];
const LIFECYCLE_SERVICES = ['Onboarding', 'Offboarding', 'Advanced Exchange', 'Support Ticket'];
const LIFECYCLE_DEVICES = ['Dell Latitude 5540', 'MacBook Pro 14"', 'Surface Pro 9', 'HP EliteBook 840', 'Lenovo ThinkPad X1', 'iPad Pro 12.9"'];

function generateLifecycleData(count = 20) {
  const headers = ['Customer', 'Contact', 'Service Type', 'Device Model', 'Priority', 'Status', 'Start Date', 'Assigned To'];
  const firstNames = ['Sarah', 'Michael', 'Jessica', 'Robert', 'Emily', 'James', 'Laura', 'Kevin'];
  const lastNames  = ['Chen', 'Johnson', 'Williams', 'Brown', 'Davis', 'Taylor', 'Wilson', 'Moore'];
  const agents = ['Alex Torres', 'Morgan Li', 'Casey Adams', 'Jordan Kim', 'Sam Rivera'];
  const rows: string[][] = Array.from({ length: count }, (_, i) => [
    LIFECYCLE_COMPANIES[i % LIFECYCLE_COMPANIES.length],
    `${pick(firstNames)} ${pick(lastNames)}`,
    pick(LIFECYCLE_SERVICES),
    pick(LIFECYCLE_DEVICES),
    pick(['Standard', 'Urgent', 'Critical']),
    pick(['Submitted', 'In Progress', 'Awaiting Customer', 'Resolved', 'Closed', 'Escalated']),
    fmtDate(-Math.floor(Math.random() * 30)),
    pick(agents),
  ]);
  const csv  = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
  const json = JSON.stringify(rows.map(r => Object.fromEntries(headers.map((h, i2) => [h, r[i2]]))), null, 2);
  return { headers, rows: rows.slice(0, 6), totalRows: count, csvContent: csv, jsonContent: json };
}

const FULFILLMENT_PRODUCTS = [
  'Widget Pro 2.0', 'Sensor Module X4', 'Industrial Filter', 'Valve Control Kit',
  'Motor Drive 3A', 'Power Supply 12V', 'Circuit Assembly', 'Pump Assembly Unit',
];

function generateFulfillmentData(count = 20) {
  const headers = ['Order ID', 'SKU', 'Product', 'Qty', 'Warehouse', 'Step', 'Carrier', 'Status'];
  const steps   = ['Received', 'Inventoried', 'Ordered', 'Picking', 'Packing', 'Shipped', 'Delivered'];
  const rows: string[][] = Array.from({ length: count }, (_, i) => [
    `ORD-RF-${String(50000 + i)}`,
    `SKU-${String(3000 + (i % 80)).padStart(4, '0')}`,
    pick(FULFILLMENT_PRODUCTS),
    String(Math.floor(Math.random() * 200 + 1)),
    pick(WAREHOUSES),
    pick(steps),
    pick(CARRIERS),
    pick(['On Track', 'Delayed', 'Exception', 'Completed']),
  ]);
  const csv  = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
  const json = JSON.stringify(rows.map(r => Object.fromEntries(headers.map((h, i2) => [h, r[i2]]))), null, 2);
  return { headers, rows: rows.slice(0, 6), totalRows: count, csvContent: csv, jsonContent: json };
}

// Kit SKU → [product name, carrier order qty, carrier-standard qty]
const KIT_PRODUCTS = [
  'Samsung Galaxy Z Fold 7 Kit',
  'iPhone 16 Pro Max Kit',
  'iPad Air M3 Kit',
  'Samsung Galaxy S25 Ultra Kit',
  'Google Pixel 9 Pro Kit',
  'Motorola Edge 50 Pro Kit',
  'OnePlus 13 Kit',
  'Samsung Galaxy Tab S10 Ultra Kit',
];

const KIT_SKUS = [
  'KIT-ZF7-200', 'KIT-IP16PM-150', 'KIT-IPAM3-100', 'KIT-S25U-250',
  'KIT-PX9P-75', 'KIT-ME50P-120', 'KIT-OP13-90', 'KIT-TABS10-80',
];

const KIT_QTY_PER_ORDER = [200, 150, 100, 250, 75, 120, 90, 80];

// Z Fold 7 box contents — used as the master BOM component list
const KIT_COMPONENTS = [
  'Samsung Galaxy Z Fold 7 (SM-F956U)',
  '45W USB-C Super Fast Charger',
  'USB-C to USB-C Cable (6ft)',
  'S Pen for Galaxy Z Fold',
  'Samsung Care+ Documentation Packet',
  'Quick Start Guide / User Manual',
  'SIM Eject Tool',
  'Retail Box Insert Card',
  'Anti-Static Device Bag',
  'Foam Tray Insert',
  'Protective Film Kit',
  'In-Box Accessories Bag',
];

const KIT_COMP_SKUS = [
  'SKU-ZF7-DEVICE', 'SKU-ZF7-CHGR', 'SKU-ZF7-CABLE', 'SKU-ZF7-SPEN',
  'SKU-ZF7-CARE', 'SKU-ZF7-QSG', 'SKU-ZF7-SIM', 'SKU-ZF7-INSERT',
  'SKU-ZF7-BAG', 'SKU-ZF7-FOAM', 'SKU-ZF7-FILM', 'SKU-ZF7-ACCS',
];

const KIT_CLIENTS = [
  'T-Mobile', 'Verizon', 'AT&T', 'US Cellular',
  'Cricket Wireless', 'Metro by T-Mobile', 'Boost Mobile', 'Consumer Cellular',
];

function generateKittingData(count = 20) {
  const headers = ['Work Order', 'Client', 'Kit SKU', 'Kit Name', 'Kit Qty', 'BOM Status', 'Stage', 'Technician', 'QC Result', 'Ship Date'];
  const stages  = ['Inbound Receiving', 'Client Order Intake', 'BOM & Allocation', 'Work Order Created', 'Picking', 'Kitting / Assembly', 'Pack & Label', 'Shipped to Client'];
  const techs   = ['J. Rivera', 'K. Thompson', 'M. Santos', 'T. Williams', 'A. Patel', 'D. Nguyen'];
  const rows: string[][] = Array.from({ length: count }, (_, i) => {
    const prodIdx  = i % KIT_PRODUCTS.length;
    const stageIdx = Math.floor(Math.random() * stages.length);
    const bomSt    = stageIdx >= 3 ? 'Validated' : stageIdx >= 2 ? 'In Progress' : 'Pending';
    const qc       = stageIdx >= 7 ? 'Passed' : stageIdx === 6 ? pick(['Passed', 'Passed', 'Passed', 'Failed']) : stageIdx === 5 ? pick(['Passed', 'Passed', 'Pending']) : 'Pending';
    return [
      `WO-${String(10234 + i)}`,
      KIT_CLIENTS[i % KIT_CLIENTS.length],
      KIT_SKUS[prodIdx],
      KIT_PRODUCTS[prodIdx],
      String(KIT_QTY_PER_ORDER[prodIdx]),
      bomSt,
      stages[stageIdx],
      pick(techs),
      qc,
      fmtDate(Math.floor(Math.random() * 12) + 2),
    ];
  });
  const csv  = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
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
    case 'lifecycle': return generateLifecycleData();
    case 'fulfillment': return generateFulfillmentData();
    case 'kitting': return generateKittingData();
  }
}

// ─── Scenario Apply Payload Builders ─────────────────────────────────

function mkShellConfig(
  singular: string, plural: string, wsLabel: string, ssLabel: string, stages: string[],
  extra?: { collectionLabel?: string; collectionLabelPlural?: string; intakeFields?: ShellIntakeField[] },
): Partial<ShellConfig> {
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
    ...(extra?.collectionLabel ? { collectionLabel: extra.collectionLabel } : {}),
    ...(extra?.collectionLabelPlural ? { collectionLabelPlural: extra.collectionLabelPlural } : {}),
    ...(extra?.intakeFields ? { intakeFields: extra.intakeFields } : {}),
  };
}

export function buildPharmaPayload(): ScenarioApplyPayload {
  const wsId = 'ws-bebo-pharma';
  const ssCarton = mkSubSpace('ss-carton', 'Carton', 'Carton', 'summary', [
    mkField('f-ctn-serial', 'Carton Serial', 'text', true),
    mkField('f-ctn-lot', 'Lot Number', 'text', true),
    mkField('f-ctn-exp', 'Expiration Date', 'date', true),
  ]);
  const ssBoxes = mkSubSpace('ss-boxes', 'Boxes Inside Carton', 'Box', 'grid', [
    mkField('f-box-serial', 'Box Serial', 'text', true),
    mkField('f-box-ctn', 'Carton Serial', 'text', true),
  ]);
  const ssUnits = mkSubSpace('ss-units', 'Individual Units', 'Unit', 'grid', [
    mkField('f-unit-serial', 'Unit Serial', 'text', true),
    mkField('f-unit-ndc', 'NDC Product Code', 'text', true),
    mkField('f-unit-box', 'Box Serial', 'text', true),
  ]);
  const ssLot = mkSubSpace('ss-lot-info', 'Lot Information', 'Lot Info', 'summary', [
    mkField('f-lot-num', 'Lot Number', 'text', true),
    mkField('f-lot-exp', 'Expiration Date', 'date', true),
    mkField('f-lot-product', 'Product Name', 'text', true),
  ]);
  const ssMfr = mkSubSpace('ss-mfr-serial', 'Manufacturer Serialization', 'Serialization Event', 'timeline', [
    mkField('f-mfr-unit-sn', 'Unit Serial Number', 'text', true),
    mkField('f-mfr-ctn-sn', 'Carton Serial Number', 'text', true),
    mkField('f-mfr-agg-date', 'Aggregation Date', 'date', true),
    mkField('f-mfr-epcis', 'EPCIS Upload Status', 'select', true),
  ]);
  const ssDist = mkSubSpace('ss-dist-verify', 'Distributor Verification', 'Verification Event', 'split', [
    mkField('f-dist-ctn', 'Scanned Carton Serial', 'text', true),
    mkField('f-dist-result', 'Verification Result', 'select', true),
    mkField('f-dist-matched', 'Matched Serial Count', 'number', true),
    mkField('f-dist-time', 'Received Time', 'datetime', true),
  ]);
  const ssRx = mkSubSpace('ss-rx-dispense', 'Pharmacy Dispense', 'Dispense Event', 'timeline', [
    mkField('f-rx-unit', 'Dispensed Unit Serial', 'text', true),
    mkField('f-rx-ref', 'Rx Reference', 'text', true),
    mkField('f-rx-date', 'Dispense Date', 'date', true),
    mkField('f-rx-pharm', 'Pharmacist', 'text', false),
  ]);
  const ssTrace = mkSubSpace('ss-trace', 'Traceability & Exceptions', 'Trace Event', 'grid', [
    mkField('f-trace-type', 'Event Type', 'select', true),
    mkField('f-trace-serial', 'Impacted Serial', 'text', true),
    mkField('f-trace-status', 'Exception Status', 'select', true),
    mkField('f-trace-notes', 'Investigation Notes', 'longText', false),
  ]);
  const allSS = [ssCarton, ssBoxes, ssUnits, ssLot, ssMfr, ssDist, ssRx, ssTrace];
  allSS.forEach((ss, i) => { (ss as any).pipelineOrder = i; });

  const wsFields = [
    mkField('f-ws-lot', 'Lot Number', 'text', true),
    mkField('f-ws-exp', 'Expiration Date', 'date', true),
    mkField('f-ws-ctn', 'Carton Serial', 'text', true),
  ];
  const ws = { ...mkWorkspace(wsId, 'DSCSA Serialization Workflow', 'Serialized Batch', '💊', allSS, wsFields), pipelineEnabled: true };

  const flows = [
    mkFlow('flow-bebo-mismatch', 'Serial Mismatch Alert', 'Distributor scan reveals serial numbers that don\'t match the VRS repository', ['mismatch-count > 0', 'verification-result = Mismatch'], 'Quarantine affected units, flag batch for Exception Review, and notify Compliance Trace Analyst', wsId, 'ss-dist-verify', ['Alert:SerialMismatch', 'Priority:High']),
    mkFlow('flow-bebo-suspect', 'Suspect Product Escalation (FDA §582)', 'A suspect product event is reported anywhere in the supply chain', ['investigation-priority = Critical', 'investigation-outcome contains Pending'], 'Immediately quarantine the entire batch, create an investigation case, and alert the FDA liaison', wsId, 'ss-trace', ['Suspect', 'Quarantine', 'Priority:Critical', 'FDA-Reportable']),
    mkFlow('flow-bebo-expiry', '90-Day Expiration Warning', 'Pharmacy inventory contains units within 90 days of expiration', ['days_to_expiration <= 90', 'inventory-status = InStock'], 'Tag unit as Expiring Soon, move to priority dispense queue, alert Pharmacy Dispense Manager', wsId, 'ss-rx-dispense', ['Alert:ExpiringSoon', 'Priority:Medium']),
    mkFlow('flow-bebo-dispense-log', 'Dispense-to-Patient Completion Logger', 'Pharmacist dispenses a serialized unit against a valid Rx reference', ['dispense-unit-serial is set', 'dispense-rx-reference is set'], 'Transition lifecycle to Dispensed, post trace ledger event (FDA-ready), mark inventory as consumed', wsId, 'ss-rx-dispense', ['Lifecycle:Dispensed', 'Trace:Complete']),
    mkFlow('flow-bebo-auto-advance', 'Auto-Advance Lifecycle on Shipment', 'EPCIS shipping event confirmed against the Verification Router Service', ['upload-status = Confirmed', 'acknowledgement is set'], 'Automatically transition batch lifecycle to Shipped to Distributor and post the EPCIS ObjectEvent', wsId, 'ss-mfr-serial', ['Lifecycle:AutoAdvance', 'EPCIS']),
  ];
  const integrations = [
    mkIntegration('int-bebo-ds-pharma', 'tpl-docusign', fmtDate(-30)),
    mkIntegration('int-bebo-qb-pharma', 'tpl-quickbooks', fmtDate(-20)),
    mkIntegration('int-bebo-http-pharma', 'tpl-custom-http', fmtDate(-10)),
  ];

  // ── Records distributed across 8 subspaces (12 product batches) ──
  const batches = [
    { name: 'Lisinopril 10mg',         lot: 'XY-1234', ndc: '68180-0517-01', ctn: 'CTN-78450-A', units: 2400,  pfx: 'LIS' },
    { name: 'Amoxicillin 500mg',        lot: 'MZ-9021', ndc: '65862-0007-05', ctn: 'CTN-92103-B', units: 12000, pfx: 'AMX' },
    { name: 'Epinephrine 1mg/mL',       lot: 'JK-4410', ndc: '00409-1631-01', ctn: 'CTN-44109-C', units: 500,   pfx: 'EPI' },
    { name: 'Metformin 1000mg',         lot: 'PQ-5502', ndc: '00093-1094-01', ctn: 'CTN-55024-D', units: 3000,  pfx: 'MET' },
    { name: 'Atorvastatin 40mg',        lot: 'RS-6711', ndc: '16477-0203-01', ctn: 'CTN-67110-E', units: 1800,  pfx: 'ATV' },
    { name: 'Omeprazole 20mg',          lot: 'TU-2289', ndc: '00093-0032-05', ctn: 'CTN-22890-F', units: 2100,  pfx: 'OMP' },
    { name: 'Levothyroxine 100mcg',     lot: 'VW-3345', ndc: '00074-4417-13', ctn: 'CTN-33450-G', units: 900,   pfx: 'LVT' },
    { name: 'Amlodipine 5mg',           lot: 'AB-7890', ndc: '73160-0143-01', ctn: 'CTN-78900-H', units: 1500,  pfx: 'AML' },
    { name: 'Sertraline 50mg',          lot: 'CD-1122', ndc: '69097-0148-01', ctn: 'CTN-11220-I', units: 1200,  pfx: 'SRT' },
    { name: 'Gabapentin 300mg',         lot: 'EF-4456', ndc: '00093-0247-01', ctn: 'CTN-44560-J', units: 2700,  pfx: 'GBP' },
    { name: 'Hydrochlorothiazide 25mg', lot: 'GH-7788', ndc: '00378-2274-01', ctn: 'CTN-77880-K', units: 3600,  pfx: 'HCT' },
    { name: 'Metoprolol 50mg',          lot: 'IJ-9900', ndc: '00378-2074-01', ctn: 'CTN-99000-L', units: 2000,  pfx: 'MPL' },
  ];

  const records: RuntimeRecord[] = [];
  batches.forEach((b, bi) => {
    const cId = `client-batch-${bi}`;
    // Carton
    records.push(mkRecord(`rec-pharma-ctn-${bi}`, cId, wsId, 'ss-carton', `Carton ${b.ctn} (${b.name})`, 'Serialized', b.units, fmtDate(-10 + bi), ['Level:Carton', `Product:${b.pfx}`], { 'Carton Serial': b.ctn, 'Lot Number': b.lot, 'Expiration Date': fmtDate(365 + bi * 60) }));
    // Boxes Inside Carton
    records.push(mkRecord(`rec-pharma-box-${bi}-0`, cId, wsId, 'ss-boxes', `BOX-${b.ctn.slice(4)}-001 (24 units)`, 'Serialized', undefined, fmtDate(-9 + bi), ['Level:Box'], { 'Box Serial': `BOX-${b.ctn.slice(4)}-001`, 'Carton Serial': b.ctn }));
    records.push(mkRecord(`rec-pharma-box-${bi}-1`, cId, wsId, 'ss-boxes', `BOX-${b.ctn.slice(4)}-002 (24 units)`, 'Serialized', undefined, fmtDate(-9 + bi), ['Level:Box'], { 'Box Serial': `BOX-${b.ctn.slice(4)}-002`, 'Carton Serial': b.ctn }));
    // Individual Units
    records.push(mkRecord(`rec-pharma-unit-${bi}-0`, cId, wsId, 'ss-units', `SN-${b.pfx}-000001 — ${b.name}`, 'Serialized', undefined, fmtDate(-8 + bi), ['Level:Unit', `NDC:${b.ndc}`], { 'Unit Serial': `SN-${b.pfx}-000001`, 'NDC Product Code': b.ndc, 'Box Serial': `BOX-${b.ctn.slice(4)}-001` }));
    records.push(mkRecord(`rec-pharma-unit-${bi}-1`, cId, wsId, 'ss-units', `SN-${b.pfx}-000002 — ${b.name}`, 'Serialized', undefined, fmtDate(-8 + bi), ['Level:Unit', `NDC:${b.ndc}`], { 'Unit Serial': `SN-${b.pfx}-000002`, 'NDC Product Code': b.ndc, 'Box Serial': `BOX-${b.ctn.slice(4)}-002` }));
    // Lot Information
    records.push(mkRecord(`rec-pharma-lot-${bi}`, cId, wsId, 'ss-lot-info', `Lot ${b.lot} — ${b.name}`, 'Active', undefined, fmtDate(-7 + bi), ['Level:Lot'], { 'Lot Number': b.lot, 'Expiration Date': fmtDate(365 + bi * 60), 'Product Name': b.name }));
    // Manufacturer Serialization
    records.push(mkRecord(`rec-pharma-mfr-${bi}`, cId, wsId, 'ss-mfr-serial', `${b.units.toLocaleString()} units serialized — ${b.name}`, 'Serialized', b.units, fmtDate(-6 + bi), ['Stage:Manufacturer'], { 'Unit Serial Number': `SN-${b.pfx}-000001 → SN-${b.pfx}-${String(b.units).padStart(6, '0')}`, 'Carton Serial Number': b.ctn, 'Aggregation Date': fmtDate(-6 + bi), 'EPCIS Upload Status': 'Confirmed' }));
    // Distributor Verification
    const mismatch = bi === 1 ? 3 : 0;
    records.push(mkRecord(`rec-pharma-dist-${bi}`, cId, wsId, 'ss-dist-verify', mismatch > 0 ? `⚠ Verification mismatch — ${mismatch} of ${b.units.toLocaleString()} flagged` : `Verification passed — ${b.units.toLocaleString()} matched`, 'Received by Distributor', b.units, fmtDate(-4 + bi), [mismatch > 0 ? 'Verification:Mismatch' : 'Verification:Passed'], { 'Scanned Carton Serial': b.ctn, 'Verification Result': mismatch > 0 ? 'Mismatch' : 'Match', 'Matched Serial Count': b.units - mismatch, 'Received Time': fmtDate(-4 + bi) }));
  });
  // Pharmacy Dispense (Lisinopril dispensed)
  records.push(mkRecord('rec-pharma-rx-0', 'client-batch-0', wsId, 'ss-rx-dispense', 'Dispensed SN-LIS-000012 to patient — Rx #RX-83014', 'Dispensed', 1, fmtDate(-1), ['Lifecycle:Dispensed', 'Trace:Complete'], { 'Dispensed Unit Serial': 'SN-LIS-000012', 'Rx Reference': 'RX-83014', 'Dispense Date': fmtDate(-1), 'Pharmacist': 'Dr. Sarah Kim, PharmD' }));
  // Traceability & Exceptions
  records.push(mkRecord('rec-pharma-trace-0', 'client-batch-0', wsId, 'ss-trace', 'Full trace: manufacturer → distributor → pharmacy → patient', 'Dispensed', 2400, fmtDate(-1), ['Trace:EndToEnd', 'Product:Lisinopril'], { 'Event Type': 'End-to-End Trace', 'Impacted Serial': 'SN-LIS-000001 → SN-LIS-002400', 'Exception Status': 'None', 'Investigation Notes': 'Complete supply chain traceability verified.' }));
  records.push(mkRecord('rec-pharma-trace-1', 'client-batch-0', wsId, 'ss-trace', 'Exception: 1 unit damaged in transit — resolved', 'Exception Review', 1, fmtDate(-2), ['Exception:Damage', 'Priority:Low'], { 'Event Type': 'Damage', 'Impacted Serial': 'SN-LIS-000198', 'Exception Status': 'Resolved', 'Investigation Notes': 'Unit SN-LIS-000198 packaging damage during distributor shipment. Replaced and resolved.' }));
  records.push(mkRecord('rec-pharma-trace-2', 'client-batch-2', wsId, 'ss-trace', '🔴 SUSPECT: Counterfeit serials detected in secondary market', 'Exception Review', 500, fmtDate(0), ['Suspect', 'Quarantine', 'Priority:Critical', 'FDA-Reportable'], { 'Event Type': 'Suspect Product', 'Impacted Serial': 'SN-EPI-000001 → SN-EPI-000500', 'Exception Status': 'Open', 'Investigation Notes': 'Third-party marketplace listing with 12 units matching Lot JK-4410 but duplicate GS1 barcodes. FDA DSCSA §582 notification triggered.' }));

  const clients = batches.map((b, i) => mkClient(`client-batch-${i}`, `Batch ${b.name}`, `LOT-${b.lot}`, ['Vertical:Pharma']));

  return {
    shellConfig: mkShellConfig('Serialized Batch', 'Serialized Batches', 'Supply Chain Workspace', 'Traceability SubSpace', ['Serialized', 'Shipped to Distributor', 'Received by Distributor', 'Shipped to Pharmacy', 'Received by Pharmacy', 'Dispensed', 'Exception Review'], {
        collectionLabel: 'Batch', collectionLabelPlural: 'Batches',
        intakeFields: [
          { id: 'productName', label: 'Product Name', type: 'text', required: true },
          { id: 'lotNumber', label: 'Lot Number', type: 'text', required: true },
          { id: 'expirationDate', label: 'Expiration Date', type: 'date', required: true },
          { id: 'cartonSerial', label: 'Carton Serial', type: 'text', required: false },
        ],
      }),
    workspaces: [ws], flows, integrations, records, clients,
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
  const actSubjects = ['Intro call with VP Sales', 'Follow-up on proposal', 'Product demo', 'Contract review discussion', 'Quarterly business review', 'Renewal negotiation', 'Technical deep-dive', 'Pricing walkthrough', 'Onboarding kickoff', 'Executive sponsor intro'];
  const actRecords: RuntimeRecord[] = Array.from({ length: 12 }, (_, i) => {
    const actType = pick(actTypes);
    const actDate = fmtDate(-Math.floor(Math.random() * 21));
    return mkRecord(
      `rec-sales-act-${i}`, `client-sales-${i % 12}`, 'ws-bebo-sales', 'ss-activities',
      `${actType} — ${COMPANIES[i % 12]}`, pick(['Completed', 'Scheduled', 'Cancelled']),
      undefined, actDate, ['Type:Activity'], {
        'Activity Type': actType,
        'Subject': pick(actSubjects),
        'Activity Date': actDate,
      },
    );
  });
  const records = [...leadRecords, ...oppRecords, ...actRecords];
  const clients = COMPANIES.slice(0, 12).map((co, i) => mkClient(`client-sales-${i}`, co, `ACCT-${1000 + i}`, ['Vertical:Sales']));
  return {
    shellConfig: mkShellConfig('Account', 'Accounts', 'Sales Workspace', 'Pipeline Stage', ['New Lead', 'Qualified', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost'], {
        collectionLabel: 'Account', collectionLabelPlural: 'Accounts',
        intakeFields: [
          { id: 'companyName', label: 'Company Name', type: 'text', required: true },
          { id: 'contactName', label: 'Contact Name', type: 'text', required: true },
          { id: 'email', label: 'Email', type: 'text', required: false },
          { id: 'dealSize', label: 'Estimated Deal Size', type: 'number', required: false },
          { id: 'leadSource', label: 'Lead Source', type: 'select', required: false, options: ['Inbound', 'Outbound', 'Referral', 'Event', 'Partner'] },
        ],
      }),
    workspaces: [wsPipeline], flows, integrations, records, clients,
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
  const medications = ['Lisinopril 10mg', 'Metformin 500mg', 'Atorvastatin 20mg', 'Omeprazole 20mg', 'Sertraline 50mg', 'Amlodipine 5mg', 'Levothyroxine 75mcg', 'Albuterol Inhaler', 'Gabapentin 300mg', 'Losartan 50mg'];
  const rxRecords: RuntimeRecord[] = Array.from({ length: 10 }, (_, i) => {
    const med = pick(medications);
    const dosage = pick(['1 tablet daily', '2 tablets daily', '1 tablet twice daily', 'As needed', '1 tablet at bedtime']);
    const startD = fmtDate(-Math.floor(Math.random() * 90));
    const endD = fmtDate(Math.floor(Math.random() * 180) + 30);
    return mkRecord(
      `rec-health-rx-${i}`, `client-health-${i % 6}`, 'ws-bebo-health', 'ss-rx',
      `${med} — PAT-${String(1000 + (i % 6))}`, pick(['Active', 'Active', 'Active', 'Discontinued', 'Refill Needed']),
      undefined, startD, ['Type:Prescription'], {
        'Medication': med,
        'Dosage': dosage,
        'Start Date': startD,
        'End Date': endD,
      },
    );
  });
  const testNames = ['CBC', 'Comprehensive Metabolic Panel', 'Lipid Panel', 'Hemoglobin A1c', 'Thyroid Panel', 'Urinalysis', 'Vitamin D Level', 'PSA', 'Liver Function Panel', 'Iron Studies'];
  const labRecords: RuntimeRecord[] = Array.from({ length: 10 }, (_, i) => {
    const testName = pick(testNames);
    const result = pick(['Normal', 'Slightly Elevated', 'Within Range', 'Borderline High', 'Low', 'Critical']);
    const labDate = fmtDate(-Math.floor(Math.random() * 30));
    const flag = result === 'Critical' ? 'Critical' : result === 'Slightly Elevated' || result === 'Borderline High' ? 'Abnormal' : 'Normal';
    return mkRecord(
      `rec-health-lab-${i}`, `client-health-${i % 6}`, 'ws-bebo-health', 'ss-labs',
      `${testName} — PAT-${String(1000 + (i % 6))}`, 'Completed',
      undefined, labDate, ['Type:Lab'], {
        'Test Name': testName,
        'Result': result,
        'Date': labDate,
        'Flag': flag,
      },
    );
  });
  const records = [...apptRecords, ...rxRecords, ...labRecords];
  const patientFirsts = ['James', 'Olivia', 'Liam', 'Sophia', 'Noah', 'Ava'];
  const patientLasts = ['Anderson', 'Martinez', 'Thompson', 'Rivera', 'Clark', 'Lee'];
  const clients = Array.from({ length: 6 }, (_, i) => mkClient(`client-health-${i}`, `${patientFirsts[i]} ${patientLasts[i]}`, `PAT-${2000 + i}`, ['Vertical:Healthcare']));
  return {
    shellConfig: mkShellConfig('Patient', 'Patients', 'Clinical Workspace', 'Care Area', ['Registered', 'Scheduled', 'In Progress', 'Completed', 'Follow-Up', 'Discharged'], {
        collectionLabel: 'Patient', collectionLabelPlural: 'Patients',
        intakeFields: [
          { id: 'patientName', label: 'Patient Name', type: 'text', required: true },
          { id: 'dateOfBirth', label: 'Date of Birth', type: 'date', required: true },
          { id: 'insuranceId', label: 'Insurance ID', type: 'text', required: false },
          { id: 'primaryPhysician', label: 'Primary Physician', type: 'text', required: false },
          { id: 'phone', label: 'Contact Phone', type: 'text', required: false },
        ],
      }),
    workspaces: [wsPatients], flows, integrations, records, clients,
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
  const receivingRecords: RuntimeRecord[] = Array.from({ length: 8 }, (_, i) => {
    const expDate = fmtDate(Math.floor(Math.random() * 14) + 1);
    return mkRecord(
      `rec-logistics-recv-${i}`, `client-logistics-${i % 6}`, 'ws-bebo-logistics', 'ss-receiving',
      `PO-${40000 + i} — ${pick(suppliers)}`, pick(['Pending', 'In Transit', 'Received', 'Inspecting', 'Put Away']),
      undefined, expDate, ['Type:Receiving'], {
        'PO Number': `PO-${40000 + i}`,
        'Supplier': pick(suppliers),
        'Expected Date': expDate,
        'SKU Count': Math.floor(Math.random() * 50 + 5),
      },
    );
  });
  const pickRecords: RuntimeRecord[] = Array.from({ length: 10 }, (_, i) => mkRecord(
    `rec-logistics-pick-${i}`, `client-logistics-${i % 6}`, 'ws-bebo-logistics', 'ss-pick-pack',
    `ORD-${20000 + i} — Pick Request`, pick(['Queued', 'Picking', 'Packed', 'Ready', 'Shipped']),
    undefined, fmtDate(-Math.floor(Math.random() * 5)), ['Type:PickPack'], {
      'Order ID': `ORD-${20000 + i}`,
      'Priority': pick(['Standard', 'Expedite', 'Rush', 'Same-Day']),
      'Items Count': Math.floor(Math.random() * 20 + 1),
    },
  ));
  const records = [...outboundRecords, ...receivingRecords, ...pickRecords];
  const shippers = ['FastFreight Co', 'Global Shipping', 'Prime Logistics', 'Express Route', 'Swift Cargo', 'Alliance Transport'];
  const clients = Array.from({ length: 6 }, (_, i) => mkClient(`client-logistics-${i}`, shippers[i], `SHP-${3000 + i}`, ['Vertical:Logistics']));
  return {
    shellConfig: mkShellConfig('Shipment', 'Shipments', 'Logistics Workspace', 'Operations Lane', ['Ordered', 'Received', 'Picking', 'Packed', 'Shipped', 'Delivered', 'Returned'], {
        collectionLabel: 'Shipment', collectionLabelPlural: 'Shipments',
        intakeFields: [
          { id: 'shipperName', label: 'Shipper Name', type: 'text', required: true },
          { id: 'origin', label: 'Origin', type: 'text', required: true },
          { id: 'destination', label: 'Destination', type: 'text', required: true },
          { id: 'weight', label: 'Weight (lbs)', type: 'number', required: false },
          { id: 'carrier', label: 'Carrier', type: 'select', required: false, options: ['FedEx', 'UPS', 'DHL', 'USPS', 'Freight'] },
        ],
      }),
    workspaces: [wsFulfillment], flows, integrations, records, clients,
  };
}

export function buildLegalPayload(): ScenarioApplyPayload {
  // Workspace 1: Case Management (matches useAiHooks Legal template)
  const wsCases = mkWorkspace('ws-bebo-legal-cases', 'Case Management', 'Case', '⚖️', [
    mkSubSpace('ss-active-cases', 'Active Cases', 'Case', 'grid', [
      mkField('f-case-no', 'Case Number', 'text', true),
      mkField('f-client', 'Client Name', 'text', true),
      mkField('f-matter', 'Matter Type', 'select', true),
      mkField('f-attorney', 'Assigned Attorney', 'text', true),
    ]),
    mkSubSpace('ss-deadlines', 'Deadlines & Court Dates', 'Calendar Event', 'timeline', [
      mkField('f-event-type', 'Event Type', 'select', true),
      mkField('f-dl-date', 'Date', 'datetime', true),
      mkField('f-court', 'Court', 'text', false),
      mkField('f-dl-desc', 'Description', 'longText', false),
    ]),
    mkSubSpace('ss-docs', 'Documents', 'Document', 'grid', [
      mkField('f-doc-name', 'Document Name', 'text', true),
      mkField('f-doc-type', 'Type', 'select', true),
      mkField('f-doc-filed', 'Filed Date', 'date', true),
      mkField('f-doc-case', 'Case Reference', 'text', true),
    ]),
  ]);
  // Workspace 2: Billing & Time
  const wsBilling = mkWorkspace('ws-bebo-legal-billing', 'Billing & Time', 'Client', '💰', [
    mkSubSpace('ss-time-entries', 'Time Entries', 'Time Entry', 'grid', [
      mkField('f-entry-date', 'Date', 'date', true),
      mkField('f-hours', 'Hours', 'number', true),
      mkField('f-rate', 'Hourly Rate', 'number', true),
      mkField('f-desc', 'Description', 'longText', false),
    ]),
    mkSubSpace('ss-invoices', 'Invoices', 'Invoice', 'grid', [
      mkField('f-inv-no', 'Invoice Number', 'text', true),
      mkField('f-inv-amt', 'Amount', 'number', true),
      mkField('f-inv-due', 'Due Date', 'date', true),
      mkField('f-inv-status', 'Status', 'select', true),
    ]),
  ]);
  const flows = [
    mkFlow('flow-bebo-court-deadline', 'Court Deadline Alert', 'Court date within 7 days', ['event_type = Court Hearing', 'days_until <= 7'], 'Send urgent reminder to attorney and paralegal', 'ws-bebo-legal-cases', 'ss-deadlines', ['Priority:Urgent', 'Type:Deadline']),
    mkFlow('flow-bebo-unbilled', 'Unbilled Time Reminder', 'Time entries older than 30 days not invoiced', ['billed = false', 'age_days > 30'], 'Notify billing department and generate draft invoice', 'ws-bebo-legal-billing', 'ss-time-entries', ['Type:Billing']),
  ];
  const integrations = [
    mkIntegration('int-bebo-ds-legal', 'tpl-docusign', fmtDate(-90)),
    mkIntegration('int-bebo-qb-legal', 'tpl-quickbooks', fmtDate(-60)),
  ];
  const legalFirst = ['James', 'Sofia', 'Marcus', 'Elena', 'David', 'Priya', 'Thomas', 'Natalie'];
  const legalLast  = ['Morrison', 'Chen', 'Thompson', 'Patel', 'Williams', 'Rodriguez', 'Kim', 'Martinez'];
  // Active Cases
  const caseRecords: RuntimeRecord[] = Array.from({ length: 8 }, (_, i) => {
    const clientName = `${pick(legalFirst)} ${pick(legalLast)}`;
    const matter = pick(MATTER_TYPES);
    const attorney = pick(ATTORNEYS);
    const status = pick(CASE_STATUS);
    return mkRecord(
      `rec-legal-${i}`, `client-legal-${i}`, 'ws-bebo-legal-cases', 'ss-active-cases',
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
  // Deadlines & Court Dates
  const courtEventTypes = ['Court Hearing', 'Filing Deadline', 'Deposition', 'Mediation', 'Trial Start', 'Motion Deadline'];
  const courts = ['Southern District NY', 'Central District CA', 'Northern District IL', 'Eastern District PA', 'District of Columbia'];
  const deadlineRecords: RuntimeRecord[] = Array.from({ length: 4 }, (_, i) => {
    const evType = pick(courtEventTypes);
    const dt = fmtDate(Math.floor(Math.random() * 60) + 1);
    return mkRecord(
      `rec-legal-dl-${i}`, `client-legal-${i}`, 'ws-bebo-legal-cases', 'ss-deadlines',
      `${evType} — CASE-2026-${1000 + i}`, pick(CASE_STATUS),
      undefined, dt, ['Type:Deadline'], {
        'Event Type': evType,
        'Date': dt,
        'Court': pick(courts),
        'Description': pick(['Oral argument on motion to dismiss', 'Response deadline for interrogatories', 'Expert witness deposition', 'Settlement conference', 'Pre-trial motions due', 'Discovery compliance review']),
      },
    );
  });
  // Documents
  const docTypes = ['Motion', 'Brief', 'Exhibit', 'Deposition Transcript', 'Contract', 'Correspondence', 'Court Order'];
  const docRecords: RuntimeRecord[] = Array.from({ length: 4 }, (_, i) => {
    const docType = pick(docTypes);
    const filedDate = fmtDate(-Math.floor(Math.random() * 60));
    return mkRecord(
      `rec-legal-doc-${i}`, `client-legal-${i}`, 'ws-bebo-legal-cases', 'ss-docs',
      `${docType} — CASE-2026-${1000 + i}`, 'Filed',
      undefined, filedDate, ['Type:Document'], {
        'Document Name': `${docType} re ${pick(MATTER_TYPES)}`,
        'Type': docType,
        'Filed Date': filedDate,
        'Case Reference': `CASE-2026-${1000 + i}`,
      },
    );
  });
  // Time Entries (Billing & Time workspace)
  const billingDescs = ['Client meeting re strategy', 'Draft motion for summary judgment', 'Document review and analysis', 'Prepare deposition questions', 'Court appearance', 'Settlement negotiation call', 'Legal research — precedent review'];
  const timeRecords: RuntimeRecord[] = Array.from({ length: 4 }, (_, i) => {
    const hours = Math.floor(Math.random() * 8 + 1);
    const rate = pick([250, 350, 450, 550, 650]);
    const dt = fmtDate(-Math.floor(Math.random() * 30));
    return mkRecord(
      `rec-legal-time-${i}`, `client-legal-${i}`, 'ws-bebo-legal-billing', 'ss-time-entries',
      `${hours}h @ $${rate}/hr — CASE-2026-${1000 + i}`, 'Logged',
      hours * rate, dt, ['Type:TimeEntry'], {
        'Date': dt,
        'Hours': hours,
        'Hourly Rate': rate,
        'Description': pick(billingDescs),
      },
    );
  });
  // Invoices
  const invoiceRecords: RuntimeRecord[] = Array.from({ length: 4 }, (_, i) => {
    const invAmt = Math.floor(Math.random() * 30 + 5) * 1000;
    const dueDate = fmtDate(Math.floor(Math.random() * 30) + 7);
    return mkRecord(
      `rec-legal-inv-${i}`, `client-legal-${i}`, 'ws-bebo-legal-billing', 'ss-invoices',
      `INV-2026-${5000 + i} — $${invAmt.toLocaleString()}`, pick(['Draft', 'Sent', 'Paid', 'Overdue']),
      invAmt, dueDate, ['Type:Invoice'], {
        'Invoice Number': `INV-2026-${5000 + i}`,
        'Amount': invAmt,
        'Due Date': dueDate,
        'Status': pick(['Draft', 'Sent', 'Paid', 'Overdue']),
      },
    );
  });
  const records = [...caseRecords, ...deadlineRecords, ...docRecords, ...timeRecords, ...invoiceRecords];
  const clients = Array.from({ length: 8 }, (_, i) => mkClient(`client-legal-${i}`, `${legalFirst[i % legalFirst.length]} ${legalLast[i % legalLast.length]}`, `CASE-2026-${1000 + i}`, ['Vertical:Legal']));
  return {
    shellConfig: mkShellConfig('Case', 'Cases', 'Legal Workspace', 'Practice Area', ['Intake', 'Engagement', 'Discovery', 'Litigation', 'Settlement', 'Closed', 'Archived'], {
        collectionLabel: 'Case', collectionLabelPlural: 'Cases',
        intakeFields: [
          { id: 'clientName', label: 'Client Name', type: 'text', required: true },
          { id: 'caseType', label: 'Case Type', type: 'select', required: true, options: ['Civil Litigation', 'Corporate', 'Employment', 'Real Estate', 'IP', 'Regulatory'] },
          { id: 'opposingParty', label: 'Opposing Party', type: 'text', required: false },
          { id: 'jurisdiction', label: 'Court / Jurisdiction', type: 'text', required: false },
          { id: 'filingDate', label: 'Filing Date', type: 'date', required: false },
        ],
      }),
    workspaces: [wsCases, wsBilling], flows, integrations, records, clients,
  };
}

export function buildInsurancePayload(): ScenarioApplyPayload {
  // Workspace 1: Policy Administration (matches useAiHooks Insurance template)
  const wsPolicies = mkWorkspace('ws-bebo-ins-policy', 'Policy Administration', 'Policy', '🛡️', [
    mkSubSpace('ss-active-pols', 'Active Policies', 'Policy', 'grid', [
      mkField('f-pol-no', 'Policy Number', 'text', true),
      mkField('f-insured', 'Insured Name', 'text', true),
      mkField('f-cov-type', 'Coverage Type', 'select', true),
      mkField('f-premium', 'Annual Premium', 'number', true),
    ]),
    mkSubSpace('ss-renewals', 'Renewals', 'Renewal Request', 'board', [
      mkField('f-ren-pol', 'Policy Number', 'text', true),
      mkField('f-ren-date', 'Renewal Date', 'date', true),
      mkField('f-ren-pct', 'Change Percentage', 'number', false),
      mkField('f-ren-notes', 'Agent Notes', 'longText', false),
    ]),
    mkSubSpace('ss-endorsements', 'Endorsements', 'Endorsement', 'timeline', [
      mkField('f-end-id', 'Endorsement ID', 'text', true),
      mkField('f-end-eff', 'Effective Date', 'date', true),
      mkField('f-end-desc', 'Change Description', 'longText', true),
      mkField('f-end-impact', 'Premium Impact', 'number', false),
    ]),
  ]);
  // Workspace 2: Claims Processing
  const wsClaims = mkWorkspace('ws-bebo-ins-claims', 'Claims Processing', 'Claim', '📋', [
    mkSubSpace('ss-open-claims', 'Open Claims', 'Claim', 'board', [
      mkField('f-claim-no', 'Claim Number', 'text', true),
      mkField('f-claimant', 'Claimant', 'text', true),
      mkField('f-loss-date', 'Date of Loss', 'date', true),
      mkField('f-est-amount', 'Estimated Amount', 'number', true),
    ]),
    mkSubSpace('ss-payments', 'Payments', 'Payment', 'grid', [
      mkField('f-pay-id', 'Payment ID', 'text', true),
      mkField('f-pay-claim', 'Claim Number', 'text', true),
      mkField('f-pay-amt', 'Amount', 'number', true),
      mkField('f-pay-date', 'Payment Date', 'date', true),
    ]),
    mkSubSpace('ss-claim-docs', 'Documents', 'Document', 'grid', [
      mkField('f-cdoc-name', 'Document Name', 'text', true),
      mkField('f-cdoc-type', 'Document Type', 'select', true),
      mkField('f-cdoc-date', 'Upload Date', 'date', true),
      mkField('f-cdoc-claim', 'Related Claim', 'text', true),
    ]),
  ]);
  const flows = [
    mkFlow('flow-bebo-high-claim', 'High-Value Claim Escalation', 'Claim amount exceeds $50,000', ['estimated_amount > 50000', 'status = Open'], 'Escalate to senior adjuster and notify management', 'ws-bebo-ins-claims', 'ss-open-claims', ['Priority:High', 'Type:Claim']),
    mkFlow('flow-bebo-renewal', 'Policy Renewal Reminder', 'Policy expiring within 30 days', ['expiry_days <= 30', 'renewal_status = None'], 'Generate renewal quote and notify policyholder', 'ws-bebo-ins-policy', 'ss-active-pols', ['Type:Policy', 'Status:Expiring']),
  ];
  const integrations = [
    mkIntegration('int-bebo-ds-ins', 'tpl-docusign', fmtDate(-120)),
    mkIntegration('int-bebo-qb-ins', 'tpl-quickbooks', fmtDate(-90)),
    mkIntegration('int-bebo-http-ins', 'tpl-custom-http', fmtDate(-30)),
  ];
  const insPrefixes = ['Sunrise', 'Northland', 'Pacific', 'Prairie', 'Valley', 'Metro', 'Coastal', 'Highland'];
  const insSuffixes = ['LLC', 'Corp', 'Holdings', 'Inc', 'Group', 'Association'];
  // Active Policies
  const policyRecords: RuntimeRecord[] = Array.from({ length: 8 }, (_, i) => {
    const covType = pick(COV_TYPES);
    const insured = `${pick(insPrefixes)} ${pick(insSuffixes)}`;
    const premium = Math.floor(Math.random() * 50 + 5) * 1000;
    const effDate = fmtDate(-Math.floor(Math.random() * 365));
    return mkRecord(
      `rec-ins-${i}`, `client-ins-${i}`, 'ws-bebo-ins-policy', 'ss-active-pols',
      `POL-2026${String(10000 + i)} — ${covType}`, pick(INS_STATUS),
      premium, effDate, ['Type:Policy'], {
        'Policy Number': `POL-2026${String(10000 + i)}`,
        'Insured Name': insured,
        'Coverage Type': covType,
        'Annual Premium': premium,
      },
    );
  });
  // Renewals
  const renewalRecords: RuntimeRecord[] = Array.from({ length: 4 }, (_, i) => {
    const renDate = fmtDate(Math.floor(Math.random() * 60) + 7);
    const changePct = Math.floor(Math.random() * 15 - 3);
    return mkRecord(
      `rec-ins-ren-${i}`, `client-ins-${i + 4}`, 'ws-bebo-ins-policy', 'ss-renewals',
      `Renewal — POL-2026${String(10000 + i + 4)}`, 'Renewal Pending',
      undefined, renDate, ['Type:Renewal'], {
        'Policy Number': `POL-2026${String(10000 + i + 4)}`,
        'Renewal Date': renDate,
        'Change Percentage': changePct,
        'Agent Notes': pick(['Standard renewal, no changes', 'Client requested higher deductible', 'Adding umbrella coverage', 'Premium increase due to claims history']),
      },
    );
  });
  // Endorsements
  const endorsementRecords: RuntimeRecord[] = Array.from({ length: 3 }, (_, i) => {
    const effDate = fmtDate(-Math.floor(Math.random() * 90));
    const impact = (Math.floor(Math.random() * 10) - 2) * 500;
    return mkRecord(
      `rec-ins-end-${i}`, `client-ins-${i}`, 'ws-bebo-ins-policy', 'ss-endorsements',
      `END-2026-${6000 + i} — POL-2026${String(10000 + i)}`, 'Processed',
      Math.abs(impact), effDate, ['Type:Endorsement'], {
        'Endorsement ID': `END-2026-${6000 + i}`,
        'Effective Date': effDate,
        'Change Description': pick(['Add additional insured', 'Increase liability limit to $2M', 'Remove vehicle from auto policy', 'Add flood coverage rider', 'Update property valuation']),
        'Premium Impact': impact,
      },
    );
  });
  // Open Claims
  const claimRecords: RuntimeRecord[] = Array.from({ length: 4 }, (_, i) => {
    const estAmt = Math.floor(Math.random() * 80 + 5) * 1000;
    const lossDate = fmtDate(-Math.floor(Math.random() * 60));
    return mkRecord(
      `rec-ins-claim-${i}`, `client-ins-${i}`, 'ws-bebo-ins-claims', 'ss-open-claims',
      `CLM-2026${String(50000 + i)} — ${pick(COV_TYPES)}`, pick(['Open', 'Under Review', 'Approved', 'Denied']),
      estAmt, lossDate, ['Type:Claim'], {
        'Claim Number': `CLM-2026${String(50000 + i)}`,
        'Claimant': `${pick(insPrefixes)} ${pick(insSuffixes)}`,
        'Date of Loss': lossDate,
        'Estimated Amount': estAmt,
      },
    );
  });
  // Payments
  const paymentRecords: RuntimeRecord[] = Array.from({ length: 3 }, (_, i) => {
    const payAmt = Math.floor(Math.random() * 40 + 5) * 1000;
    const payDate = fmtDate(-Math.floor(Math.random() * 30));
    return mkRecord(
      `rec-ins-pay-${i}`, `client-ins-${i}`, 'ws-bebo-ins-claims', 'ss-payments',
      `PAY-2026-${7000 + i} — $${payAmt.toLocaleString()}`, 'Issued',
      payAmt, payDate, ['Type:Payment'], {
        'Payment ID': `PAY-2026-${7000 + i}`,
        'Claim Number': `CLM-2026${String(50000 + i)}`,
        'Amount': payAmt,
        'Payment Date': payDate,
      },
    );
  });
  // Claim Documents
  const claimDocRecords: RuntimeRecord[] = Array.from({ length: 3 }, (_, i) => {
    const uploadDate = fmtDate(-Math.floor(Math.random() * 45));
    const docType = pick(['Loss Report', 'Police Report', 'Medical Records', 'Repair Estimate', 'Photos', 'Affidavit']);
    return mkRecord(
      `rec-ins-doc-${i}`, `client-ins-${i}`, 'ws-bebo-ins-claims', 'ss-claim-docs',
      `${docType} — CLM-2026${String(50000 + i)}`, 'Uploaded',
      undefined, uploadDate, ['Type:Document'], {
        'Document Name': `${docType} for CLM-2026${String(50000 + i)}`,
        'Document Type': docType,
        'Upload Date': uploadDate,
        'Related Claim': `CLM-2026${String(50000 + i)}`,
      },
    );
  });
  const records = [...policyRecords, ...renewalRecords, ...endorsementRecords, ...claimRecords, ...paymentRecords, ...claimDocRecords];
  const insNames = ['Lakewood Ins', 'Summit Coverage', 'Pinnacle Shield', 'Harbor Mutual', 'Eagle Assurance', 'Crestview Group', 'Meridian Ins', 'Horizon Union'];
  const clients = Array.from({ length: 8 }, (_, i) => mkClient(`client-ins-${i}`, insNames[i], `POL-${4000 + i}`, ['Vertical:Insurance']));
  return {
    shellConfig: mkShellConfig('Policy', 'Policies', 'Insurance Workspace', 'Service Line', ['Application', 'Underwriting', 'Bound', 'Active', 'Renewal Pending', 'Lapsed', 'Cancelled'], {
        collectionLabel: 'Policy', collectionLabelPlural: 'Policies',
        intakeFields: [
          { id: 'insuredName', label: 'Insured Name', type: 'text', required: true },
          { id: 'coverageType', label: 'Coverage Type', type: 'select', required: true, options: ['Auto', 'Home', 'Life', 'Health', 'Commercial', 'Liability'] },
          { id: 'effectiveDate', label: 'Effective Date', type: 'date', required: true },
          { id: 'annualPremium', label: 'Annual Premium ($)', type: 'number', required: false },
        ],
      }),
    workspaces: [wsPolicies, wsClaims], flows, integrations, records, clients,
  };
}

// ─── LifecycleOS Payload ─────────────────────────────────────────────

export function buildLifecyclePayload(): ScenarioApplyPayload {
  const wsOnboarding = mkWorkspace('ws-bebo-lcos-onboarding', 'Customer Onboarding', 'Account', '🚀', [
    mkSubSpace('ss-onb-list', 'Active Onboardings', 'Onboarding Record', 'grid', [
      mkField('f-onb-company',  'Company Name',       'text',   true),
      mkField('f-onb-contact',  'Primary IT Contact', 'text',   true),
      mkField('f-onb-devices',  'Device Count',       'number', true),
      mkField('f-onb-goLive',   'Target Go-Live',     'date',   false),
    ]),
    mkSubSpace('ss-onb-wizard', 'Wizard Progress', 'Onboarding Step', 'timeline', [
      mkField('f-onb-step',      'Step Name',    'text',     true),
      mkField('f-onb-status',    'Step Status',  'select',   true),
      mkField('f-onb-completed', 'Completed',    'date',     false),
      mkField('f-onb-notes',     'Step Notes',   'longText', false),
    ]),
    mkSubSpace('ss-onb-devices', 'Device Configuration', 'Device Config', 'grid', [
      mkField('f-dev-type',    'Device Type',          'select',   true),
      mkField('f-dev-mdm',     'MDM Platform',         'select',   true),
      mkField('f-dev-count',   'Count',                'number',   true),
      mkField('f-dev-special', 'Special Requirements', 'longText', false),
    ]),
  ]);

  const wsOffboarding = mkWorkspace('ws-bebo-lcos-offboarding', 'Offboarding Management', 'Account', '🔄', [
    mkSubSpace('ss-off-list', 'Offboarding Requests', 'Offboarding Record', 'board', [
      mkField('f-off-company',  'Customer Account',   'text',   true),
      mkField('f-off-reason',   'Offboarding Reason', 'select', true),
      mkField('f-off-lastDate', 'Last Service Date',  'date',   true),
      mkField('f-off-devices',  'Total Device Count', 'number', true),
    ]),
    mkSubSpace('ss-off-assets', 'Asset Returns', 'Return Shipment', 'grid', [
      mkField('f-ret-method',  'Return Method',         'select',   true),
      mkField('f-ret-date',    'Pickup Date',           'date',     false),
      mkField('f-ret-contact', 'Return Contact',        'text',     true),
      mkField('f-ret-notes',   'Asset Condition Notes', 'longText', false),
    ]),
    mkSubSpace('ss-off-checklist', 'Access Revocation', 'Checklist Item', 'summary', [
      mkField('f-chk-sso',      'SSO Revoked',        'checkbox', true),
      mkField('f-chk-mdm',      'MDM Removed',        'checkbox', true),
      mkField('f-chk-licenses', 'Licenses Released',  'checkbox', true),
      mkField('f-chk-data',     'Data Wiped',         'checkbox', true),
    ]),
  ]);

  const wsExchange = mkWorkspace('ws-bebo-lcos-exchange', 'Advanced Exchange', 'Exchange Order', '📦', [
    mkSubSpace('ss-exc-orders', 'Exchange Orders', 'Order', 'board', [
      mkField('f-exc-orderId', 'Order ID',      'text', true),
      mkField('f-exc-company', 'Company',       'text', true),
      mkField('f-exc-model',   'Device Model',  'text', true),
      mkField('f-exc-serial',  'Serial Number', 'text', true),
    ]),
    mkSubSpace('ss-exc-form', 'Exchange Requests', 'Request', 'grid', [
      mkField('f-exc-issue',    'Issue Description', 'longText', true),
      mkField('f-exc-priority', 'Priority Level',    'select',   true),
      mkField('f-exc-addr',     'Delivery Address',  'text',     true),
      mkField('f-exc-recip',    'Recipient Name',    'text',     true),
    ]),
    mkSubSpace('ss-exc-returns', 'Return Tracking', 'Return', 'timeline', [
      mkField('f-ret-trackNo',   'Tracking Number',   'text', true),
      mkField('f-ret-dueDate',   'Return Due Date',   'date', true),
      mkField('f-ret-carrier',   'Carrier',           'select', false),
      mkField('f-ret-returned',  'Returned On',       'date', false),
    ]),
  ]);

  const wsTickets = mkWorkspace('ws-bebo-lcos-tickets', 'Service Tickets', 'Ticket', '🎫', [
    mkSubSpace('ss-tkt-list', 'Open Tickets', 'Ticket', 'board', [
      mkField('f-tkt-id',       'Ticket ID', 'text',   true),
      mkField('f-tkt-company',  'Company',   'text',   true),
      mkField('f-tkt-subject',  'Subject',   'text',   true),
      mkField('f-tkt-priority', 'Priority',  'select', true),
    ]),
    mkSubSpace('ss-tkt-convo', 'Conversations', 'Message', 'timeline', [
      mkField('f-msg-from',     'From',          'text',     true),
      mkField('f-msg-body',     'Message',       'longText', true),
      mkField('f-msg-ts',       'Timestamp',     'datetime', true),
      mkField('f-msg-internal', 'Internal Note', 'checkbox', false),
    ]),
    mkSubSpace('ss-tkt-sla', 'SLA Metrics', 'SLA Record', 'summary', [
      mkField('f-sla-priority', 'Priority Level',      'select', true),
      mkField('f-sla-first',    'First Response (hrs)', 'number', false),
      mkField('f-sla-resolve',  'Resolution (hrs)',     'number', false),
      mkField('f-sla-breach',   'SLA Breached',         'checkbox', false),
    ]),
  ]);

  const flows = [
    mkFlow('flow-lcos-new-onb',       'New Onboarding Submitted',        'Customer submits a new onboarding request',                                              ['step = Company Details', 'contact_email is set'],               'Notify assigned account manager and create kickoff task',                                         'ws-bebo-lcos-onboarding', 'ss-onb-wizard',    ['Type:Onboarding', 'Priority:High']),
    mkFlow('flow-lcos-return-overdue', 'Device Return Overdue',           'Exchange device not returned within 5 business days',                                    ['return_due_days_remaining <= 0', 'returned_on is empty'],        'Alert customer via email and notify account manager for follow-up',                               'ws-bebo-lcos-exchange',   'ss-exc-returns',   ['Type:Exchange', 'Status:Overdue']),
    mkFlow('flow-lcos-high-ticket',   'Critical Ticket Auto-Escalate',    'Support ticket submitted with Critical priority',                                         ['priority = Critical'],                                          'Auto-assign to senior agent and notify manager; SLA clock starts immediately',                    'ws-bebo-lcos-tickets',    'ss-tkt-list',      ['Priority:Critical', 'Type:Ticket']),
    mkFlow('flow-lcos-sla-breach',    'SLA Breach Warning',               'High-priority ticket within 30 min of first-response SLA breach',                        ['priority = High', 'first_response_elapsed_hrs >= 1.5'],         'Send escalation alert to team lead with ticket details',                                          'ws-bebo-lcos-tickets',    'ss-tkt-sla',       ['SLA:Warning', 'Priority:High']),
    mkFlow('flow-lcos-offboard-block', 'Offboarding Checklist Incomplete', 'Final submission attempted without all checklist items marked',                          ['checklist_complete = false', 'status = Confirm'],                'Block submission and prompt user to complete all access revocation items',                         'ws-bebo-lcos-offboarding', 'ss-off-checklist', ['Type:Offboarding', 'Status:Blocked']),
  ];

  const integrations = [
    mkIntegration('int-lcos-sendgrid', 'tpl-custom-http', fmtDate(-30)),
    mkIntegration('int-lcos-docusign', 'tpl-docusign',    fmtDate(-45)),
    mkIntegration('int-lcos-qb',       'tpl-quickbooks',  fmtDate(-20)),
  ];

  const lcContacts = ['Sarah Chen', 'Michael Johnson', 'Emily Williams', 'Robert Brown', 'Laura Davis', 'Kevin Taylor'];
  const lcDevices  = ['Dell Latitude 5540', 'MacBook Pro 14"', 'Surface Pro 9', 'HP EliteBook 840'];
  const lcAgents   = ['Alex Torres', 'Morgan Li', 'Casey Adams'];

  const onbRecords: RuntimeRecord[] = LIFECYCLE_COMPANIES.slice(0, 6).map((co, i) => {
    const goLive = fmtDate(Math.floor(Math.random() * 30) + 7);
    return mkRecord(`rec-lcos-onb-${i}`, `client-lcos-${i}`, 'ws-bebo-lcos-onboarding', 'ss-onb-list',
      `${co} — Onboarding`, pick(['In Progress', 'Pending', 'Complete']),
      undefined, fmtDate(-Math.floor(Math.random() * 14)), ['Type:Onboarding'],
      { 'Company Name': co, 'Primary IT Contact': lcContacts[i % lcContacts.length], 'Device Count': Math.floor(Math.random() * 200 + 10), 'Target Go-Live': goLive });
  });

  const excRecords: RuntimeRecord[] = Array.from({ length: 4 }, (_, i) => {
    const model = pick(lcDevices);
    return mkRecord(`rec-lcos-exc-${i}`, `client-lcos-${i}`, 'ws-bebo-lcos-exchange', 'ss-exc-orders',
      `EXC-${300 + i} — ${model}`, pick(['Processing', 'Shipped', 'Delivered']),
      undefined, fmtDate(-i), ['Type:Exchange'],
      { 'Order ID': `EXC-${300 + i}`, 'Company': LIFECYCLE_COMPANIES[i % LIFECYCLE_COMPANIES.length], 'Device Model': model, 'Serial Number': `SN-${String(9000 + i)}` });
  });

  const tktSubjects = ['Device not booting after exchange', 'Billing inquiry on last invoice', 'Onboarding blocked — SSO issue', 'MDM enrollment failure', 'Return label not received', 'Checklist item unclear'];
  const tktRecords: RuntimeRecord[] = Array.from({ length: 6 }, (_, i) => {
    const prio = pick(['High', 'Medium', 'Low']);
    const cats = ['Technical', 'Billing', 'Exchange', 'Onboarding', 'Account'];
    return mkRecord(`rec-lcos-tkt-${i}`, `client-lcos-${i % 6}`, 'ws-bebo-lcos-tickets', 'ss-tkt-list',
      `TKT-2026-${5000 + i} — ${pick(cats)}`, pick(['Open', 'In Progress', 'Resolved']),
      undefined, fmtDate(-Math.floor(Math.random() * 14)), ['Type:Ticket'],
      { 'Ticket ID': `TKT-2026-${5000 + i}`, 'Company': LIFECYCLE_COMPANIES[i % LIFECYCLE_COMPANIES.length], 'Subject': tktSubjects[i % tktSubjects.length], 'Priority': prio });
  });

  // ── Wizard Progress (ss-onb-wizard) ──
  const wizardSteps = ['Company Details', 'Device Enrollment', 'MDM Configuration', 'SSO Provisioning', 'User Acceptance Testing', 'Go-Live Sign-Off'];
  const wizardRecords: RuntimeRecord[] = wizardSteps.flatMap((step, si) =>
    LIFECYCLE_COMPANIES.slice(0, 3).map((co, ci) => {
      const done = si < 3 + ci;
      return mkRecord(`rec-lcos-wiz-${si}-${ci}`, `client-lcos-${ci}`, 'ws-bebo-lcos-onboarding', 'ss-onb-wizard',
        `${co} — ${step}`, done ? 'Complete' : si === 3 + ci ? 'In Progress' : 'Pending',
        undefined, done ? fmtDate(-14 + si * 2) : undefined, ['Type:WizardStep'],
        { 'Step Name': step, 'Step Status': done ? 'Complete' : si === 3 + ci ? 'In Progress' : 'Pending', 'Completed': done ? fmtDate(-14 + si * 2) : '', 'Step Notes': done ? `${step} completed for ${co}` : '' });
    })
  );

  // ── Device Configuration (ss-onb-devices) ──
  const devTypes = ['Dell Latitude 5540', 'MacBook Pro 14"', 'Surface Pro 9', 'HP EliteBook 840', 'iPad Pro 12.9"'];
  const mdmPlatforms = ['Intune', 'Jamf Pro', 'VMware WS1', 'Kandji'];
  const deviceRecords: RuntimeRecord[] = Array.from({ length: 8 }, (_, i) => {
    const devType = pick(devTypes);
    const mdm = pick(mdmPlatforms);
    return mkRecord(`rec-lcos-dev-${i}`, `client-lcos-${i % 6}`, 'ws-bebo-lcos-onboarding', 'ss-onb-devices',
      `${devType} × ${Math.floor(Math.random() * 50 + 5)} — ${mdm}`, pick(['Configured', 'Pending', 'Enrolled']),
      undefined, fmtDate(-Math.floor(Math.random() * 10)), ['Type:DeviceConfig'],
      { 'Device Type': devType, 'MDM Platform': mdm, 'Count': Math.floor(Math.random() * 50 + 5), 'Special Requirements': pick(['None', 'Kiosk mode required', 'VPN pre-configured', 'Custom certificates', 'BitLocker enforced']) });
  });

  // ── Offboarding Requests (ss-off-list) ──
  const offReasons = ['Contract Ended', 'Merger / Acquisition', 'Downsizing', 'Vendor Switch', 'Budget Reduction'];
  const offRecords: RuntimeRecord[] = LIFECYCLE_COMPANIES.slice(2, 7).map((co, i) =>
    mkRecord(`rec-lcos-off-${i}`, `client-lcos-${(i + 2) % 6}`, 'ws-bebo-lcos-offboarding', 'ss-off-list',
      `${co} — Offboarding`, pick(['Submitted', 'In Progress', 'Complete']),
      undefined, fmtDate(-Math.floor(Math.random() * 20)), ['Type:Offboarding'],
      { 'Customer Account': co, 'Offboarding Reason': pick(offReasons), 'Last Service Date': fmtDate(Math.floor(Math.random() * 30)), 'Total Device Count': Math.floor(Math.random() * 100 + 10) })
  );

  // ── Asset Returns (ss-off-assets) ──
  const retMethods = ['UPS Prepaid Label', 'FedEx Pickup', 'On-Site Collection', 'Customer Drop-Off'];
  const assetRecords: RuntimeRecord[] = Array.from({ length: 6 }, (_, i) =>
    mkRecord(`rec-lcos-asset-${i}`, `client-lcos-${(i + 2) % 6}`, 'ws-bebo-lcos-offboarding', 'ss-off-assets',
      `Return #${i + 1} — ${pick(retMethods)}`, pick(['Scheduled', 'Picked Up', 'Received', 'Processed']),
      undefined, fmtDate(-Math.floor(Math.random() * 14)), ['Type:AssetReturn'],
      { 'Return Method': pick(retMethods), 'Pickup Date': fmtDate(Math.floor(Math.random() * 7) + 1), 'Return Contact': pick(lcContacts), 'Asset Condition Notes': pick(['Good condition', 'Minor cosmetic wear', 'Missing charger', 'Screen protector cracked', 'All accessories included']) })
  );

  // ── Access Revocation Checklist (ss-off-checklist) ──
  const checklistRecords: RuntimeRecord[] = LIFECYCLE_COMPANIES.slice(2, 7).map((co, i) =>
    mkRecord(`rec-lcos-chk-${i}`, `client-lcos-${(i + 2) % 6}`, 'ws-bebo-lcos-offboarding', 'ss-off-checklist',
      `${co} — Access Revocation`, i < 2 ? 'Complete' : 'In Progress',
      undefined, fmtDate(-Math.floor(Math.random() * 10)), ['Type:Checklist'],
      { 'SSO Revoked': i < 3 ? 'Yes' : 'No', 'MDM Removed': i < 2 ? 'Yes' : 'No', 'Licenses Released': i < 4 ? 'Yes' : 'No', 'Data Wiped': i < 2 ? 'Yes' : 'No' })
  );

  // ── Exchange Requests (ss-exc-form) ──
  const excIssues = ['Cracked display after drop', 'Battery draining within 2 hours', 'Keyboard keys unresponsive', 'Trackpad ghost clicking', 'USB-C port not charging', 'Blue screen on boot'];
  const excFormRecords: RuntimeRecord[] = Array.from({ length: 5 }, (_, i) =>
    mkRecord(`rec-lcos-excf-${i}`, `client-lcos-${i % 6}`, 'ws-bebo-lcos-exchange', 'ss-exc-form',
      `EXR-${400 + i} — ${pick(['High', 'Medium', 'Standard'])} Priority`, pick(['Submitted', 'Approved', 'Processing', 'Shipped']),
      undefined, fmtDate(-Math.floor(Math.random() * 10)), ['Type:ExchangeRequest'],
      { 'Issue Description': pick(excIssues), 'Priority Level': pick(['High', 'Medium', 'Standard']), 'Delivery Address': `${100 + i * 10} Enterprise Blvd, Suite ${200 + i}`, 'Recipient Name': pick(lcContacts) })
  );

  // ── Return Tracking (ss-exc-returns) ──
  const excReturnRecords: RuntimeRecord[] = Array.from({ length: 5 }, (_, i) => {
    const returned = i < 3;
    return mkRecord(`rec-lcos-excr-${i}`, `client-lcos-${i % 6}`, 'ws-bebo-lcos-exchange', 'ss-exc-returns',
      `EXC-${300 + i} Return — ${returned ? 'Received' : 'Pending'}`, returned ? 'Returned' : 'Awaiting Return',
      undefined, fmtDate(-i * 2), ['Type:ReturnTracking'],
      { 'Tracking Number': `TRK-EXC-${700000 + i}`, 'Return Due Date': fmtDate(i < 2 ? -1 : 5 + i), 'Carrier': pick(['FedEx', 'UPS', 'USPS']), 'Returned On': returned ? fmtDate(-i * 2) : '' });
  });

  // ── Conversations (ss-tkt-convo) ──
  const msgBodies = ['Hi, I submitted an exchange request but haven\'t received a prepaid label yet.', 'We\'ve sent the label to your email — please check spam.', 'Got it, thank you! I\'ll ship it out today.', 'Our MDM enrollment is failing on 3 devices — error code 0x80070005.', 'This is an access permissions issue. I\'ve escalated to our Intune admin.', 'Follow-up: all 3 devices now show enrolled. Issue resolved.'];
  const convoRecords: RuntimeRecord[] = Array.from({ length: 6 }, (_, i) =>
    mkRecord(`rec-lcos-msg-${i}`, `client-lcos-${Math.floor(i / 3) % 6}`, 'ws-bebo-lcos-tickets', 'ss-tkt-convo',
      `TKT-2026-${5000 + Math.floor(i / 3)} — ${i % 2 === 0 ? 'Customer' : 'Agent'}`, 'Sent',
      undefined, fmtDate(-7 + i), ['Type:Message'],
      { 'From': i % 2 === 0 ? pick(lcContacts) : pick(lcAgents), 'Message': msgBodies[i], 'Timestamp': fmtDate(-7 + i), 'Internal Note': i % 3 === 2 ? 'Yes' : 'No' })
  );

  // ── SLA Metrics (ss-tkt-sla) ──
  const slaRecords: RuntimeRecord[] = ['Critical', 'High', 'Medium', 'Low'].map((prio, i) => {
    const firstResp = prio === 'Critical' ? 0.5 : prio === 'High' ? 2 : prio === 'Medium' ? 4 : 8;
    const resolution = prio === 'Critical' ? 4 : prio === 'High' ? 8 : prio === 'Medium' ? 24 : 48;
    return mkRecord(`rec-lcos-sla-${i}`, `client-lcos-${i}`, 'ws-bebo-lcos-tickets', 'ss-tkt-sla',
      `SLA — ${prio} Priority`, i === 0 ? 'Breached' : 'Met',
      undefined, fmtDate(-i), ['Type:SLA'],
      { 'Priority Level': prio, 'First Response (hrs)': firstResp + (i === 0 ? 1.5 : 0), 'Resolution (hrs)': resolution + (i === 0 ? 6 : 0), 'SLA Breached': i === 0 ? 'Yes' : 'No' });
  });

  const records = [...onbRecords, ...wizardRecords, ...deviceRecords, ...excRecords, ...excFormRecords, ...excReturnRecords, ...offRecords, ...assetRecords, ...checklistRecords, ...tktRecords, ...convoRecords, ...slaRecords];
  const clients = LIFECYCLE_COMPANIES.slice(0, 6).map((co, i) => mkClient(`client-lcos-${i}`, co, `LCOS-${1000 + i}`, ['Vertical:Lifecycle']));

  return {
    shellConfig: mkShellConfig('Account', 'Accounts', 'Lifecycle Workspace', 'Service Area', ['Submitted', 'In Progress', 'Awaiting Customer', 'Resolved', 'Closed', 'Escalated'], {
        collectionLabel: 'Account', collectionLabelPlural: 'Accounts',
        intakeFields: [
          { id: 'companyName', label: 'Company Name', type: 'text', required: true },
          { id: 'contactName', label: 'Primary Contact', type: 'text', required: true },
          { id: 'email', label: 'Email', type: 'text', required: false },
          { id: 'serviceTier', label: 'Service Tier', type: 'select', required: false, options: ['Starter', 'Professional', 'Enterprise', 'Premium'] },
          { id: 'startDate', label: 'Contract Start Date', type: 'date', required: false },
        ],
      }),
    workspaces: [wsOnboarding, wsOffboarding, wsExchange, wsTickets],
    flows, integrations, records, clients,
  };
}

// ─── Pick, Pack, Ship (Fulfillment) Payload ───────────────────────────

export function buildFulfillmentPayload(): ScenarioApplyPayload {
  const wsReceiving = mkWorkspace('ws-bebo-rf-receiving', 'Receiving & Inventory', 'SKU', '📥', [
    mkSubSpace('ss-rf-recv', 'Receiving Queue', 'Receiving Record', 'board', [
      mkField('f-rf-sku',       'SKU',              'text',   true),
      mkField('f-rf-qty',       'Quantity',         'number', true),
      mkField('f-rf-location',  'Assigned Location','text',   true),
      mkField('f-rf-condition', 'Condition',        'select', true),
    ]),
    mkSubSpace('ss-rf-inventory', 'Inventory Catalog', 'Inventory Item', 'grid', [
      mkField('f-inv-sku',       'SKU',                'text',   true),
      mkField('f-inv-desc',      'Product Description','text',   true),
      mkField('f-inv-qty-avail', 'Qty Available',      'number', true),
      mkField('f-inv-qty-alloc', 'Qty Allocated',      'number', false),
      mkField('f-inv-reorder',   'Reorder Point',      'number', false),
    ]),
    mkSubSpace('ss-rf-audit', 'Audit Trail', 'Audit Event', 'timeline', [
      mkField('f-aud-user',   'User',         'text',     true),
      mkField('f-aud-action', 'Action',       'text',     true),
      mkField('f-aud-sku',    'Affected SKU', 'text',     false),
      mkField('f-aud-ts',     'Timestamp',    'datetime', true),
    ]),
  ]);

  const wsOrders = mkWorkspace('ws-bebo-rf-orders', 'Order Management', 'Order', '📋', [
    mkSubSpace('ss-rf-orders', 'Orders', 'Order', 'board', [
      mkField('f-ord-id',       'Order ID',       'text',   true),
      mkField('f-ord-customer', 'Customer',       'text',   true),
      mkField('f-ord-sku',      'SKUs',           'text',   true),
      mkField('f-ord-method',   'Shipping Method','select', true),
      mkField('f-ord-priority', 'Priority',       'select', false),
    ]),
    mkSubSpace('ss-rf-picklist', 'Pick Lists', 'Pick Order', 'grid', [
      mkField('f-pick-orderId',   'Order ID',      'text',   true),
      mkField('f-pick-location',  'Pick Location', 'text',   true),
      mkField('f-pick-sku',       'SKU',           'text',   true),
      mkField('f-pick-qty',       'Qty to Pick',   'number', true),
      mkField('f-pick-scanned',   'Qty Scanned',   'number', false),
    ]),
    mkSubSpace('ss-rf-exceptions', 'Exception Queue', 'Exception', 'board', [
      mkField('f-exc-type',       'Exception Type', 'select',   true),
      mkField('f-exc-orderId',    'Order ID',       'text',     true),
      mkField('f-exc-desc',       'Description',    'longText', true),
      mkField('f-exc-resolution', 'Resolution',     'select',   false),
    ]),
  ]);

  const wsPacking = mkWorkspace('ws-bebo-rf-shipping', 'Packing & Shipping', 'Shipment', '🚚', [
    mkSubSpace('ss-rf-packing', 'Packing Station', 'Pack Record', 'grid', [
      mkField('f-pack-orderId', 'Order ID',           'text',     true),
      mkField('f-pack-box',     'Box Size',           'select',   true),
      mkField('f-pack-weight',  'Actual Weight (lbs)','number',   true),
      mkField('f-pack-valid',   'Items Validated',    'checkbox', true),
    ]),
    mkSubSpace('ss-rf-labels', 'Shipping Labels', 'Shipping Label', 'grid', [
      mkField('f-lbl-orderId', 'Order ID',           'text',   true),
      mkField('f-lbl-carrier', 'Carrier',            'select', true),
      mkField('f-lbl-tracking','Tracking Number',    'text',   false),
      mkField('f-lbl-eta',     'Estimated Delivery', 'date',   false),
    ]),
    mkSubSpace('ss-rf-tracker', 'Shipment Tracker', 'Shipment Event', 'timeline', [
      mkField('f-trk-orderId',  'Order ID',   'text',     true),
      mkField('f-trk-carrier',  'Carrier',    'text',     true),
      mkField('f-trk-event',    'Event',      'text',     true),
      mkField('f-trk-location', 'Location',   'text',     false),
      mkField('f-trk-ts',       'Timestamp',  'datetime', true),
    ]),
  ]);

  const flows = [
    mkFlow('flow-rf-low-stock',    'Low Stock Alert',              'SKU inventory drops below reorder threshold',                   ['qty_available < reorder_point'],                      'Create purchase order draft and notify procurement team',                                          'ws-bebo-rf-receiving', 'ss-rf-inventory', ['Priority:Low-Stock', 'Type:Inventory']),
    mkFlow('flow-rf-address-fail', 'Address Validation Failure',   'Order intake address fails validation check',                   ['address_valid = false'],                               'Route to exception queue — notify customer service for manual correction',                         'ws-bebo-rf-orders',   'ss-rf-exceptions', ['Type:Exception', 'Exception:Address']),
    mkFlow('flow-rf-weight-flag',  'Weight Mismatch Flag',         'Packed box weight is outside expected range (+/- 15%)',         ['weight_deviation_pct > 15'],                           'Flag for quality inspection before label generation — hold shipment',                              'ws-bebo-rf-shipping', 'ss-rf-packing',   ['Type:QC', 'Exception:WeightMismatch']),
    mkFlow('flow-rf-packed-label', 'Auto-Generate Shipping Label', 'Order passes packing validation and items are confirmed',       ['items_validated = true', 'weight_deviation_pct <= 15'],'Auto-generate prepaid shipping label and assign carrier via cost/speed rules',                     'ws-bebo-rf-shipping', 'ss-rf-labels',    ['Type:Shipping', 'Status:LabelReady']),
  ];

  const integrations = [
    mkIntegration('int-rf-http', 'tpl-custom-http', fmtDate(-20)),
    mkIntegration('int-rf-qb',   'tpl-quickbooks',  fmtDate(-35)),
  ];

  const invRecords: RuntimeRecord[] = FULFILLMENT_PRODUCTS.slice(0, 6).map((prod, i) => {
    const qtyAvail = Math.floor(Math.random() * 500 + 50);
    const reorder  = 100;
    return mkRecord(`rec-rf-inv-${i}`, `client-rf-${i}`, 'ws-bebo-rf-receiving', 'ss-rf-inventory',
      `SKU-${String(3000 + i)} — ${prod}`, qtyAvail < reorder ? 'Low Stock' : 'In Stock',
      qtyAvail, fmtDate(-i), ['Type:Inventory'],
      { 'SKU': `SKU-${String(3000 + i)}`, 'Product Description': prod, 'Qty Available': qtyAvail, 'Qty Allocated': Math.floor(qtyAvail * 0.3), 'Reorder Point': reorder });
  });

  const rfSteps = ['Receiving', 'Inventoried', 'Ordered', 'Picking', 'Packing', 'Shipped', 'Delivered'];
  const orderRecords: RuntimeRecord[] = Array.from({ length: 8 }, (_, i) => {
    const step = pick(rfSteps);
    return mkRecord(`rec-rf-ord-${i}`, `client-rf-${i % 6}`, 'ws-bebo-rf-orders', 'ss-rf-orders',
      `ORD-RF-${50000 + i} — ${step}`, step,
      Math.floor(Math.random() * 50 + 1) * 100, fmtDate(-i), ['Type:Order'],
      { 'Order ID': `ORD-RF-${50000 + i}`, 'Customer': COMPANIES[i % COMPANIES.length], 'SKUs': `SKU-${String(3000 + (i % 6))}`, 'Shipping Method': pick(['Standard', 'Expedite', 'Next Day']), 'Priority': pick(['Standard', 'Rush', 'Same-Day']) });
  });

  const shipRecords: RuntimeRecord[] = Array.from({ length: 5 }, (_, i) => {
    const carrier  = pick(CARRIERS);
    const tracking = `TRK-RF-${String(500000 + Math.floor(Math.random() * 99999))}`;
    return mkRecord(`rec-rf-ship-${i}`, `client-rf-${i}`, 'ws-bebo-rf-shipping', 'ss-rf-labels',
      `${carrier} — ORD-RF-${50000 + i}`, pick(['Label Generated', 'Picked Up', 'In Transit', 'Delivered']),
      undefined, fmtDate(-i), ['Type:Shipment'],
      { 'Order ID': `ORD-RF-${50000 + i}`, 'Carrier': carrier, 'Tracking Number': tracking, 'Estimated Delivery': fmtDate(Math.floor(Math.random() * 5) + 1) });
  });

  // ── Receiving Queue (ss-rf-recv) ──
  const rfUsers = ['Alex Kim', 'Pat Warren', 'Jordan Liu', 'Casey Brooks'];
  const recvRecords: RuntimeRecord[] = Array.from({ length: 6 }, (_, i) => {
    const prod = pick(FULFILLMENT_PRODUCTS);
    const sku = `SKU-${String(3000 + i)}`;
    return mkRecord(`rec-rf-recv-${i}`, `client-rf-${i % 6}`, 'ws-bebo-rf-receiving', 'ss-rf-recv',
      `${sku} — ${prod} (Qty ${Math.floor(Math.random() * 200 + 20)})`, pick(['Pending Inspection', 'Accepted', 'Rejected', 'Put Away']),
      undefined, fmtDate(-Math.floor(Math.random() * 10)), ['Type:Receiving'],
      { 'SKU': sku, 'Quantity': Math.floor(Math.random() * 200 + 20), 'Assigned Location': `Aisle ${i + 1}-Rack ${pick(['A', 'B', 'C'])}`, 'Condition': pick(['New', 'Refurbished', 'Damaged', 'Inspecting']) });
  });

  // ── Audit Trail (ss-rf-audit) ──
  const auditActions = ['Stock Received', 'Location Moved', 'Cycle Count Adjusted', 'Reorder Triggered', 'SKU Deactivated', 'Qty Corrected'];
  const auditRecords: RuntimeRecord[] = Array.from({ length: 8 }, (_, i) =>
    mkRecord(`rec-rf-aud-${i}`, `client-rf-${i % 6}`, 'ws-bebo-rf-receiving', 'ss-rf-audit',
      `${pick(auditActions)} — SKU-${3000 + (i % 6)}`, 'Logged',
      undefined, fmtDate(-i), ['Type:Audit'],
      { 'User': pick(rfUsers), 'Action': pick(auditActions), 'Affected SKU': `SKU-${3000 + (i % 6)}`, 'Timestamp': fmtDate(-i) })
  );

  // ── Pick Lists (ss-rf-picklist) ──
  const picklistRecords: RuntimeRecord[] = Array.from({ length: 6 }, (_, i) => {
    const qtyPick = Math.floor(Math.random() * 20 + 2);
    const qtyScan = i < 4 ? qtyPick : Math.floor(qtyPick * 0.6);
    return mkRecord(`rec-rf-pick-${i}`, `client-rf-${i % 6}`, 'ws-bebo-rf-orders', 'ss-rf-picklist',
      `ORD-RF-${50000 + i} — Pick Line`, i < 4 ? 'Complete' : 'In Progress',
      undefined, fmtDate(-i), ['Type:Pick'],
      { 'Order ID': `ORD-RF-${50000 + i}`, 'Pick Location': `Zone ${pick(['A', 'B', 'C'])}-Aisle ${i + 1}`, 'SKU': `SKU-${3000 + (i % 6)}`, 'Qty to Pick': qtyPick, 'Qty Scanned': qtyScan });
  });

  // ── Exception Queue (ss-rf-exceptions) ──
  const excTypes = ['Address Invalid', 'SKU Mismatch', 'Damaged in Warehouse', 'Short Ship', 'Customer Cancel'];
  const exceptionRecords: RuntimeRecord[] = Array.from({ length: 5 }, (_, i) =>
    mkRecord(`rec-rf-exc-${i}`, `client-rf-${i % 6}`, 'ws-bebo-rf-orders', 'ss-rf-exceptions',
      `EXC-${60000 + i} — ${pick(excTypes)}`, pick(['Open', 'Investigating', 'Resolved', 'Escalated']),
      undefined, fmtDate(-Math.floor(Math.random() * 7)), ['Type:Exception'],
      { 'Exception Type': pick(excTypes), 'Order ID': `ORD-RF-${50000 + i}`, 'Description': pick(['Customer-reported address change after label generated', 'Wrong SKU picked — requires re-pick', 'Pallet tipped — 3 units damaged', 'Only 8 of 12 units available', 'Customer requested cancellation before ship']), 'Resolution': pick(['Pending', 'Re-pick Issued', 'Replacement Sent', 'Refunded', 'Address Corrected']) })
  );

  // ── Packing Station (ss-rf-packing) ──
  const packRecords: RuntimeRecord[] = Array.from({ length: 5 }, (_, i) =>
    mkRecord(`rec-rf-pack-${i}`, `client-rf-${i % 6}`, 'ws-bebo-rf-shipping', 'ss-rf-packing',
      `ORD-RF-${50000 + i} — Pack Station`, pick(['Packed', 'Validating', 'Sealed']),
      undefined, fmtDate(-i), ['Type:Packing'],
      { 'Order ID': `ORD-RF-${50000 + i}`, 'Box Size': pick(['Small (12×10×6)', 'Medium (18×14×10)', 'Large (24×18×14)']), 'Actual Weight (lbs)': +(Math.random() * 30 + 2).toFixed(1), 'Items Validated': i < 4 ? 'Yes' : 'No' })
  );

  // ── Shipment Tracker (ss-rf-tracker) ──
  const trackerEvents = ['Label Created', 'Picked Up', 'In Transit — Regional Hub', 'Out for Delivery', 'Delivered'];
  const trackerRecords: RuntimeRecord[] = Array.from({ length: 6 }, (_, i) =>
    mkRecord(`rec-rf-trk-${i}`, `client-rf-${i % 6}`, 'ws-bebo-rf-shipping', 'ss-rf-tracker',
      `ORD-RF-${50000 + Math.floor(i / 2)} — ${trackerEvents[i % trackerEvents.length]}`, trackerEvents[i % trackerEvents.length],
      undefined, fmtDate(-5 + i), ['Type:ShipmentEvent'],
      { 'Order ID': `ORD-RF-${50000 + Math.floor(i / 2)}`, 'Carrier': pick(CARRIERS), 'Event': trackerEvents[i % trackerEvents.length], 'Location': pick(['Memphis, TN', 'Louisville, KY', 'Dallas, TX', 'Chicago, IL', 'Customer Address']), 'Timestamp': fmtDate(-5 + i) })
  );

  const records  = [...invRecords, ...orderRecords, ...shipRecords, ...recvRecords, ...auditRecords, ...picklistRecords, ...exceptionRecords, ...packRecords, ...trackerRecords];
  const rfClients = Array.from({ length: 6 }, (_, i) => mkClient(`client-rf-${i}`, COMPANIES[i], `RF-${2000 + i}`, ['Vertical:Fulfillment']));

  return {
    shellConfig: mkShellConfig('Order', 'Orders', 'Fulfillment Workspace', 'Operations Lane', ['Received', 'Inventoried', 'Ordered', 'Picking', 'Packing', 'Shipped', 'Delivered', 'Returned'], {
        collectionLabel: 'Order', collectionLabelPlural: 'Orders',
        intakeFields: [
          { id: 'customerName', label: 'Customer Name', type: 'text', required: true },
          { id: 'shipToAddress', label: 'Ship-To Address', type: 'text', required: true },
          { id: 'orderPriority', label: 'Order Priority', type: 'select', required: false, options: ['Standard', 'Expedite', 'Rush', 'Same-Day'] },
          { id: 'requestedDate', label: 'Requested Ship Date', type: 'date', required: false },
        ],
      }),
    workspaces: [wsReceiving, wsOrders, wsPacking],
    flows, integrations, records, clients: rfClients,
  };
}

// ─── Universal Tenant Scaffold ────────────────────────────────────────
// Not a template — this is the standard org layer provisioned with every
// tenant. Operations holds the active vertical's workspaces. All other
// departments are empty containers that accept workspaces over time.

export function buildTenantScaffold(verticalPayload?: ScenarioApplyPayload): ScenarioApplyPayload {
  // Operations: subspaces are the active vertical's workspaces (listed by name).
  // When no vertical is loaded yet, Operations is an empty ready container.
  const opsSubSpaces = (verticalPayload?.workspaces ?? []).map(ws =>
    mkSubSpace(`ss-ops-ws-${ws.id}`, ws.name, ws.rootEntity, 'board',
      ws.builderFields?.length ? ws.builderFields : [mkField(`f-ops-ws-${ws.id}`, 'Name', 'text', true)])
  );

  const wsOps            = mkWorkspace('ws-univ-operations',    'Operations',        'Process',    '⚙️', opsSubSpaces);
  const wsFinance        = mkWorkspace('ws-univ-finance',       'Finance',           'Record',     '💰', []);
  const wsHR             = mkWorkspace('ws-univ-hr',            'Human Resources',   'Record',     '👥', []);
  const wsMarketing      = mkWorkspace('ws-univ-marketing',     'Marketing',         'Record',     '📣', []);
  const wsSales          = mkWorkspace('ws-univ-sales',         'Sales',             'Record',     '📈', []);
  const wsLegal          = mkWorkspace('ws-univ-legal',         'Legal',             'Record',     '⚖️', []);
  const wsIT             = mkWorkspace('ws-univ-it',            'IT',                'Record',     '💻', []);
  const wsSustainability = mkWorkspace('ws-univ-sustainability','Sustainability',     'Record',     '🌱', []);

  // Standard cross-department signal flows — wired once the departments are
  // built out; all triggered via the Operations gateway workspace.
  const flows = [
    mkFlow('flow-univ-deal-won',        'Deal Won → Finance & CS',     'Sales opportunity stage closed won',               ['stage = Closed Won'],                          'Create invoice in Finance, notify CS to begin onboarding',     'ws-univ-operations', 'ss-ops-ws-ws-univ-sales',         ['Cross:Sales→Finance']),
    mkFlow('flow-univ-new-employee',    'New Hire → IT + HR',          'New employee record added with Active status',     ['status = Active', 'start_date is set'],        'Create IT asset request, provision accounts',                  'ws-univ-operations', 'ss-ops-ws-ws-univ-hr',            ['Cross:HR→IT']),
    mkFlow('flow-univ-contract-expiry', 'Contract Expiry Warning',     'Legal contract expiring within 30 days',          ['expiration_date_days <= 30'],                  'Notify legal team with renewal task',                          'ws-univ-operations', 'ss-ops-ws-ws-univ-legal',         ['Type:Legal']),
    mkFlow('flow-univ-invoice-overdue', 'Overdue Invoice Escalation',  'Invoice past due with no payment recorded',       ['status = Sent', 'due_days_past > 0'],          'Escalate to Finance Director, send auto-reminder',             'ws-univ-operations', 'ss-ops-ws-ws-univ-finance',       ['Type:Finance']),
    mkFlow('flow-univ-incident-p1',     'P1 Incident → War Room',      'IT incident logged with Critical severity',       ['severity = Critical'],                         'Page on-call lead, create war room, update status page',       'ws-univ-operations', 'ss-ops-ws-ws-univ-it',            ['Priority:Critical']),
    mkFlow('flow-univ-esg-deadline',    'ESG Report Deadline Alert',   'Sustainability report due within 14 days',        ['due_date_days <= 14'],                         'Alert sustainability team, assign completion task',            'ws-univ-operations', 'ss-ops-ws-ws-univ-sustainability', ['Type:ESG']),
  ];

  const clients = ['Operations Corp', 'Finance Group', 'People First HR', 'Brand Labs', 'Revenue Team', 'Legal Partners', 'Tech Division', 'Green Initiatives']
    .map((name, i) => mkClient(`client-univ-${i}`, name, `UNIV-${1000 + i}`, ['Universal:Enterprise']));

  return {
    shellConfig: mkShellConfig('Record', 'Records', 'Enterprise Workspace', 'Department',
      ['Draft', 'Active', 'In Review', 'Completed', 'Archived'], {
        collectionLabel: 'Record', collectionLabelPlural: 'Records',
        intakeFields: [
          { id: 'title', label: 'Title', type: 'text', required: true },
          { id: 'department', label: 'Department', type: 'select', required: true, options: ['Finance', 'HR', 'Marketing', 'Sales', 'Legal', 'IT', 'Sustainability'] },
          { id: 'owner', label: 'Owner', type: 'text', required: false },
          { id: 'priority', label: 'Priority', type: 'select', required: false, options: ['Low', 'Medium', 'High', 'Critical'] },
        ],
      }),
    workspaces: [wsOps, wsFinance, wsHR, wsMarketing, wsSales, wsLegal, wsIT, wsSustainability],
    flows,
    integrations: [],
    records: [],
    clients,
  };
}

/** @deprecated Use buildTenantScaffold() */
export function buildUniversalPayload(): ScenarioApplyPayload {
  return buildTenantScaffold();
}

// ─── Kitting — Samsung Z Fold 7 / T-Mobile BOM-Driven Assembly ───────

export function buildKittingPayload(): ScenarioApplyPayload {

  // ── Workspace 1: Component Receiving ─────────────────────────────
  const wsReceiving = mkWorkspace('ws-kit-receiving', 'Component Receiving', 'Component', '📥', [
    // Matches the "Receiving Screen" — operator scans inbound PO line items
    mkSubSpace('ss-kit-recv-queue', 'Receiving Queue', 'Received Item', 'board', [
      mkField('f-rq-po',        'PO Number',     'text',     true),
      mkField('f-rq-sku',       'SKU',           'text',     true),
      mkField('f-rq-compname',  'Component Name','text',     true),
      mkField('f-rq-qty',       'Qty Received',  'number',   true),
      mkField('f-rq-serial',    'Serial Numbers','text',     false),
      mkField('f-rq-condition', 'Condition',     'select',   true),
      mkField('f-rq-bin',       'Bin Location',  'text',     true),
      mkField('f-rq-rcvby',     'Received By',   'text',     true),
      mkField('f-rq-rcvdate',   'Received Date', 'datetime', true),
    ]),
    // Master component inventory — tracks all Z Fold 7 box contents
    mkSubSpace('ss-kit-catalog', 'Component Catalog', 'Component', 'grid', [
      mkField('f-cat-sku',      'SKU',              'text',   true),
      mkField('f-cat-name',     'Component Name',   'text',   true),
      mkField('f-cat-desc',     'Description',      'text',   false),
      mkField('f-cat-qty',      'Qty On Hand',      'number', true),
      mkField('f-cat-reorder',  'Reorder Point',    'number', true),
      mkField('f-cat-cost',     'Unit Cost ($)',     'number', false),
      mkField('f-cat-bin',      'Primary Bin',      'text',   true),
      mkField('f-cat-supplier', 'Supplier',         'text',   false),
      mkField('f-cat-leadtime', 'Lead Time (Days)', 'number', false),
    ]),
    // Full audit trail of every receiving event
    mkSubSpace('ss-kit-recv-log', 'Receiving Log', 'Receiving Event', 'timeline', [
      mkField('f-rl-po',      'PO Number',     'text',     true),
      mkField('f-rl-sku',     'SKU',           'text',     true),
      mkField('f-rl-name',    'Component',     'text',     true),
      mkField('f-rl-qty',     'Quantity',      'number',   true),
      mkField('f-rl-by',      'Received By',   'text',     true),
      mkField('f-rl-action',  'Action',        'text',     true),
      mkField('f-rl-ts',      'Timestamp',     'datetime', true),
      mkField('f-rl-notes',   'Notes',         'longText', false),
    ]),
  ]);

  // ── Workspace 2: Orders & BOM ──────────────────────────────────────
  const wsOrders = mkWorkspace('ws-kit-orders', 'Orders & BOM', 'Kit Order', '📋', [
    // Client Orders board — matches "Order Intake Screen"
    mkSubSpace('ss-kit-client-orders', 'Client Orders', 'Client Order', 'board', [
      mkField('f-co-po',       'PO Number',  'text',   true),
      mkField('f-co-client',   'Client',     'text',   true),
      mkField('f-co-kitsku',   'Kit SKU',    'select', true),
      mkField('f-co-kitname',  'Kit Name',   'text',   true),
      mkField('f-co-qty',      'Order Qty',  'number', true),
      mkField('f-co-shipdate', 'Ship Date',  'date',   true),
      mkField('f-co-priority', 'Priority',   'select', false),
      mkField('f-co-rep',      'Account Rep','text',   false),
      mkField('f-co-status',   'Status',     'select', true),
    ]),
    // BOM grid — 12 component lines for Samsung Z Fold 7 Kit
    mkSubSpace('ss-kit-bom', 'Bill of Materials', 'BOM Line', 'grid', [
      mkField('f-bom-kitsku',    'Kit SKU',          'select',   true),
      mkField('f-bom-kitname',   'Kit Name',         'text',     true),
      mkField('f-bom-compsku',   'Component SKU',    'text',     true),
      mkField('f-bom-compname',  'Component Name',   'text',     true),
      mkField('f-bom-qty',       'Qty Per Kit',      'number',   true),
      mkField('f-bom-serial',    'Serialized',       'checkbox', false),
      mkField('f-bom-altsku',    'Alt Component SKU','text',     false),
      mkField('f-bom-notes',     'Notes',            'longText', false),
    ]),
    // Allocation check — is inventory sufficient to fulfil each WO?
    mkSubSpace('ss-kit-allocation', 'BOM Allocation', 'Allocation Check', 'board', [
      mkField('f-alloc-wo',      'Work Order',       'text',   true),
      mkField('f-alloc-kitsku',  'Kit SKU',          'text',   true),
      mkField('f-alloc-compsku', 'Component SKU',    'text',   true),
      mkField('f-alloc-comp',    'Component Name',   'text',   true),
      mkField('f-alloc-req',     'Required Qty',     'number', true),
      mkField('f-alloc-avail',   'Available Qty',    'number', true),
      mkField('f-alloc-short',   'Shortage Qty',     'number', false),
      mkField('f-alloc-status',  'Allocation Status','select', true),
    ]),
    // Work Orders — matches "Work Order #10234" screen
    mkSubSpace('ss-kit-workorders', 'Work Orders', 'Work Order', 'board', [
      mkField('f-wo-id',       'Work Order ID',     'text',     true),
      mkField('f-wo-client',   'Client',            'text',     true),
      mkField('f-wo-kitsku',   'Kit SKU',           'text',     true),
      mkField('f-wo-kitname',  'Kit Name',          'text',     true),
      mkField('f-wo-qty',      'Kit Qty',           'number',   true),
      mkField('f-wo-bom',      'BOM Validated',     'checkbox', false),
      mkField('f-wo-status',   'Status',            'select',   true),
      mkField('f-wo-tech',     'Assigned Technician','text',    false),
      mkField('f-wo-due',      'Due Date',          'date',     false),
    ]),
  ]);

  // ── Workspace 3: Picking & Kitting Station ─────────────────────────
  const wsProduction = mkWorkspace('ws-kit-production', 'Picking & Kitting', 'Kit Assembly', '🔧', [
    // Pick list per WO — matches "Picking Screen" (Item, Location, Qty to Pick, Scan Item)
    mkSubSpace('ss-kit-picklist', 'Pick Lists', 'Pick Line', 'grid', [
      mkField('f-pk-wo',       'Work Order',    'text',   true),
      mkField('f-pk-comp',     'Component',     'text',   true),
      mkField('f-pk-compsku',  'Component SKU', 'text',   true),
      mkField('f-pk-bin',      'Bin Location',  'text',   true),
      mkField('f-pk-qtyreq',   'Qty to Pick',   'number', true),
      mkField('f-pk-qtysc',    'Qty Scanned',   'number', false),
      mkField('f-pk-picker',   'Picker',        'text',   false),
      mkField('f-pk-status',   'Scan Status',   'select', false),
    ]),
    // Scan event log — every scan recorded
    mkSubSpace('ss-kit-scan-log', 'Scan & Pick Events', 'Scan Event', 'timeline', [
      mkField('f-sc-wo',      'Work Order',  'text',     true),
      mkField('f-sc-comp',    'Component',   'text',     true),
      mkField('f-sc-bin',     'Bin',         'text',     true),
      mkField('f-sc-qty',     'Qty Scanned', 'number',   true),
      mkField('f-sc-by',      'Scanned By',  'text',     true),
      mkField('f-sc-ts',      'Scan Time',   'datetime', true),
      mkField('f-sc-verify',  'Verified',    'checkbox', false),
    ]),
    // Kitting Station — matches "Kitting Station" screen
    mkSubSpace('ss-kit-station', 'Kitting Station', 'Kit Build', 'grid', [
      mkField('f-ks-wo',           'Work Order',          'text',     true),
      mkField('f-ks-kitid',        'Kit ID',              'text',     true),
      mkField('f-ks-kitsku',       'Kit SKU',             'text',     true),
      mkField('f-ks-kitname',      'Kit Name',            'text',     true),
      mkField('f-ks-tech',         'Kitting Technician',  'text',     true),
      mkField('f-ks-assembled',    'Components Assembled','number',   false),
      mkField('f-ks-serials',      'Serials Assigned',    'checkbox', false),
      mkField('f-ks-status',       'Assembly Status',     'select',   true),
    ]),
    // Step-by-step assembly audit trail per kit
    mkSubSpace('ss-kit-assembly-log', 'Assembly Log', 'Assembly Step', 'timeline', [
      mkField('f-al-kitid',  'Kit ID',       'text',     true),
      mkField('f-al-step',   'Step',         'text',     true),
      mkField('f-al-comp',   'Component',    'text',     false),
      mkField('f-al-by',     'Performed By', 'text',     true),
      mkField('f-al-ts',     'Timestamp',    'datetime', true),
      mkField('f-al-notes',  'Notes',        'longText', false),
    ]),
  ]);

  // ── Workspace 4: QC, Pack & Ship ───────────────────────────────────
  const wsQcShip = mkWorkspace('ws-kit-qcship', 'QC, Pack & Ship', 'Shipment', '🚚', [
    // QC Inspection board — matches "Quality Check" tab
    mkSubSpace('ss-kit-qc', 'QC Inspection', 'QC Record', 'board', [
      mkField('f-qc-kitid',    'Kit ID',           'text',     true),
      mkField('f-qc-wo',       'Work Order',        'text',     true),
      mkField('f-qc-kitsku',   'Kit SKU',           'text',     true),
      mkField('f-qc-inspector','Inspector',         'text',     true),
      mkField('f-qc-result',   'Inspection Result', 'select',   true),
      mkField('f-qc-defects',  'Defects Found',     'longText', false),
      mkField('f-qc-date',     'Inspection Date',   'datetime', false),
      mkField('f-qc-rework',   'Rework Required',   'checkbox', false),
    ]),
    // Pack station — weight, dimensions, box, pack date
    mkSubSpace('ss-kit-pack', 'Pack & Label Station', 'Pack Record', 'grid', [
      mkField('f-pl-kitid',  'Kit ID',        'text',     true),
      mkField('f-pl-orderid','Order ID',      'text',     true),
      mkField('f-pl-kitsku', 'Kit SKU',       'text',     true),
      mkField('f-pl-dims',   'Box Dimensions','text',     false),
      mkField('f-pl-weight', 'Weight (lbs)',  'number',   false),
      mkField('f-pl-date',   'Pack Date',     'datetime', false),
      mkField('f-pl-ltype',  'Label Type',    'select',   false),
      mkField('f-pl-by',     'Packed By',     'text',     false),
    ]),
    // Shipping labels — matches "Shipping" tab
    mkSubSpace('ss-kit-labels', 'Shipping Labels', 'Shipping Label', 'grid', [
      mkField('f-sl-orderid',  'Order ID',           'text',     true),
      mkField('f-sl-kitid',    'Kit ID',             'text',     true),
      mkField('f-sl-carrier',  'Carrier',            'select',   true),
      mkField('f-sl-service',  'Service Level',      'select',   false),
      mkField('f-sl-tracking', 'Tracking Number',    'text',     false),
      mkField('f-sl-generated','Label Generated',    'checkbox', false),
      mkField('f-sl-created',  'Created Date',       'datetime', false),
      mkField('f-sl-eta',      'Estimated Delivery', 'date',     false),
    ]),
    // Live shipment event feed per order
    mkSubSpace('ss-kit-shipment-tracker', 'Shipment Tracker', 'Shipment Event', 'timeline', [
      mkField('f-st-orderid', 'Order ID',          'text',     true),
      mkField('f-st-kitid',   'Kit ID',            'text',     true),
      mkField('f-st-carrier', 'Carrier',           'text',     true),
      mkField('f-st-event',   'Event',             'text',     true),
      mkField('f-st-location','Location',          'text',     false),
      mkField('f-st-ts',      'Timestamp',         'datetime', true),
      mkField('f-st-notify',  'Status Update Sent','checkbox', false),
    ]),
  ]);

  // ── 7 Signal Flows ────────────────────────────────────────────────
  const flows = [
    mkFlow('flow-kit-order-confirmed',
      'Order Confirmed → Draft Work Order',
      'Client order status set to Confirmed',
      ['status = Confirmed'],
      'Run BOM availability check against Component Catalog; auto-create draft Work Order and assign to BOM Coordinator',
      'ws-kit-orders', 'ss-kit-client-orders', ['Type:Order', 'Stage:ClientOrderIntake']),

    mkFlow('flow-kit-low-stock',
      'Component Below Reorder Point',
      'Component Catalog qty_on_hand drops below reorder_point',
      ['qty_on_hand < reorder_point'],
      'Alert Procurement Coordinator with component name, SKU, current qty, and reorder qty; auto-create purchase request',
      'ws-kit-receiving', 'ss-kit-catalog', ['Priority:LowStock', 'Type:Inventory']),

    mkFlow('flow-kit-bom-shortage',
      'BOM Allocation Fails → Block Work Order',
      'BOM Allocation check status set to Shortage',
      ['allocation_status = Shortage'],
      'Block Work Order from advancing to Picking; assign exception to BOM Coordinator with shortage detail',
      'ws-kit-orders', 'ss-kit-allocation', ['Type:Block', 'Exception:BOMShortage']),

    mkFlow('flow-kit-wo-released',
      'Work Order Released → Auto-Generate Pick List',
      'Work Order status set to Released and BOM Validated is checked',
      ['status = Released', 'bom_validated = true'],
      'Auto-create one Pick Line record per BOM component with bin location and qty to pick; notify assigned Picker',
      'ws-kit-orders', 'ss-kit-workorders', ['Type:WorkOrder', 'Stage:Picking']),

    mkFlow('flow-kit-pick-complete',
      'All Pick Lines Complete → Release to Kitting Station',
      'All Pick Lines for a Work Order reach Scan Status = Complete',
      ['all_pick_lines_complete = true'],
      'Update Work Order status to Kitting / Assembly; create Kitting Station record; notify assigned Kitting Technician',
      'ws-kit-production', 'ss-kit-picklist', ['Stage:KittingAssembly', 'Type:PickComplete']),

    mkFlow('flow-kit-qc-pass',
      'QC Passed → Auto-Generate Shipping Label',
      'QC Inspection Result set to Passed',
      ['inspection_result = Passed'],
      'Auto-generate prepaid carrier label (UPS/FedEx based on client SLA); create Pack Record; notify Pack & Label Operator',
      'ws-kit-qcship', 'ss-kit-qc', ['Type:QC', 'Status:Passed']),

    mkFlow('flow-kit-carrier-scan',
      'Carrier Scan → Order Status + Client Notification',
      'Carrier delivers a milestone scan event (Out for Delivery or Delivered)',
      ['carrier_event = Delivered', 'carrier_event = Out for Delivery'],
      'Update Client Order status; append Shipment Tracker event; email Account Manager and client contact with tracking detail',
      'ws-kit-qcship', 'ss-kit-shipment-tracker', ['Type:Shipment', 'Stage:ShippedToClient']),
  ];

  const integrations = [
    mkIntegration('int-kit-carrier', 'tpl-custom-http', fmtDate(-14)),  // UPS / FedEx carrier API
    mkIntegration('int-kit-qb',      'tpl-quickbooks',  fmtDate(-30)),  // billing & invoicing
    mkIntegration('int-kit-docusign','tpl-docusign',    fmtDate(-45)),  // carrier rate agreements
  ];

  // ── Runtime Records — Samsung Z Fold 7 / T-Mobile live scenario ───

  // Component Catalog: all 12 Z Fold 7 box contents
  const compOnHand   = [450, 520, 510, 445, 480, 487, 502, 490, 451, 468, 475, 460];
  const compCosts    = [1099.00, 28.99, 14.99, 49.99, 0.75, 0.50, 0.25, 0.10, 0.30, 0.40, 3.99, 1.20];
  const compSuppliers = ['Samsung Electronics', 'Samsung Electronics', 'Samsung Electronics', 'Samsung Electronics',
    'Samsung Care Print', 'Samsung Print', 'Generic OEM', 'KittingRUs Print', 'Static Solutions Inc',
    'Foam Pack Co', 'Shield Films LLC', 'Accessories Direct'];
  const catalogRecords: RuntimeRecord[] = KIT_COMPONENTS.map((comp, i) => {
    const qty     = compOnHand[i];
    const reorder = 300;
    const status  = qty < reorder ? 'Low Stock' : 'In Stock';
    return mkRecord(`rec-kit-cat-${i}`, 'client-kit-0', 'ws-kit-receiving', 'ss-kit-catalog', `${KIT_COMP_SKUS[i]} — ${comp}`, status, compCosts[i] * qty, fmtDate(-2), ['Type:Component'],
      { 'SKU': KIT_COMP_SKUS[i], 'Component Name': comp, 'Description': `Samsung Galaxy Z Fold 7 Kit — ${comp}`, 'Qty On Hand': qty, 'Reorder Point': reorder, 'Unit Cost ($)': compCosts[i], 'Primary Bin': `A${i + 1}-B${Math.ceil((i + 1) / 3)}`, 'Supplier': compSuppliers[i], 'Lead Time (Days)': i < 4 ? 7 : 3 });
  });

  // Client Orders: 8 real carrier orders across different device kits
  const orderData = [
    { po: 'PO-TM-10234',   client: 'T-Mobile',           sku: KIT_SKUS[0], name: KIT_PRODUCTS[0], qty: 200, status: 'Kitting / Assembly',   ship: fmtDate(5),  rep: 'M. Santos',   priority: 'Standard'  },
    { po: 'PO-VZ-10235',   client: 'Verizon',             sku: KIT_SKUS[1], name: KIT_PRODUCTS[1], qty: 150, status: 'Work Order Created',  ship: fmtDate(6),  rep: 'K. Thompson', priority: 'Standard'  },
    { po: 'PO-ATT-10236',  client: 'AT&T',                sku: KIT_SKUS[3], name: KIT_PRODUCTS[3], qty: 250, status: 'BOM & Allocation',    ship: fmtDate(8),  rep: 'J. Rivera',   priority: 'Expedited' },
    { po: 'PO-TM-10237',   client: 'T-Mobile',            sku: KIT_SKUS[0], name: KIT_PRODUCTS[0], qty: 100, status: 'Picking',             ship: fmtDate(9),  rep: 'M. Santos',   priority: 'Rush'      },
    { po: 'PO-CW-10238',   client: 'Cricket Wireless',    sku: KIT_SKUS[4], name: KIT_PRODUCTS[4], qty: 75,  status: 'Client Order Intake', ship: fmtDate(10), rep: 'A. Patel',    priority: 'Standard'  },
    { po: 'PO-MTM-10239',  client: 'Metro by T-Mobile',   sku: KIT_SKUS[5], name: KIT_PRODUCTS[5], qty: 120, status: 'Inbound Receiving',   ship: fmtDate(12), rep: 'D. Nguyen',   priority: 'Standard'  },
    { po: 'PO-BM-10240',   client: 'Boost Mobile',        sku: KIT_SKUS[7], name: KIT_PRODUCTS[7], qty: 80,  status: 'Pack & Label',        ship: fmtDate(3),  rep: 'T. Williams', priority: 'Expedited' },
    { po: 'PO-USC-10241',  client: 'US Cellular',         sku: KIT_SKUS[2], name: KIT_PRODUCTS[2], qty: 100, status: 'Shipped to Client',  ship: fmtDate(1),  rep: 'A. Patel',    priority: 'Standard'  },
  ];
  const orderRecords: RuntimeRecord[] = orderData.map((o, i) =>
    mkRecord(`rec-kit-ord-${i}`, `client-kit-${i % KIT_CLIENTS.length}`, 'ws-kit-orders', 'ss-kit-client-orders',
      `${o.po} — ${o.name} × ${o.qty}`, o.status, o.qty * (i === 0 ? 1799 : i === 1 ? 1199 : i === 3 ? 499 : 899), fmtDate(-i),
      ['Type:KitOrder'],
      { 'PO Number': o.po, 'Client': o.client, 'Kit SKU': o.sku, 'Kit Name': o.name, 'Order Qty': o.qty, 'Ship Date': o.ship, 'Priority': o.priority, 'Account Rep': o.rep, 'Status': o.status })
  );

  // BOM Lines: 12 components for Samsung Z Fold 7 Kit
  const bomQtyPerKit = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1];
  const bomRecords: RuntimeRecord[] = KIT_COMPONENTS.map((comp, i) =>
    mkRecord(`rec-kit-bom-${i}`, 'client-kit-0', 'ws-kit-orders', 'ss-kit-bom',
      `${KIT_SKUS[0]} BOM — ${comp}`, 'Active', undefined, fmtDate(-30),
      ['Type:BOMLine'],
      { 'Kit SKU': KIT_SKUS[0], 'Kit Name': KIT_PRODUCTS[0], 'Component SKU': KIT_COMP_SKUS[i], 'Component Name': comp, 'Qty Per Kit': bomQtyPerKit[i], 'Serialized': i === 0 ? 'Yes' : 'No', 'Alt Component SKU': '', 'Notes': i === 0 ? 'IMEI serialization required' : '' })
  );

  // Work Orders: 6 active WOs
  const woData = [
    { id: 'WO-10234', client: 'T-Mobile',         sku: KIT_SKUS[0], name: KIT_PRODUCTS[0], qty: 200, status: 'Kitting / Assembly',  tech: 'J. Rivera',   due: fmtDate(5)  },
    { id: 'WO-10235', client: 'Verizon',           sku: KIT_SKUS[1], name: KIT_PRODUCTS[1], qty: 150, status: 'Picking',             tech: 'K. Thompson', due: fmtDate(6)  },
    { id: 'WO-10236', client: 'AT&T',              sku: KIT_SKUS[3], name: KIT_PRODUCTS[3], qty: 250, status: 'Work Order Created',  tech: 'M. Santos',   due: fmtDate(8)  },
    { id: 'WO-10237', client: 'T-Mobile',          sku: KIT_SKUS[0], name: KIT_PRODUCTS[0], qty: 100, status: 'Picking',             tech: 'T. Williams', due: fmtDate(9)  },
    { id: 'WO-10240', client: 'Boost Mobile',      sku: KIT_SKUS[7], name: KIT_PRODUCTS[7], qty: 80,  status: 'Pack & Label',        tech: 'A. Patel',    due: fmtDate(3)  },
    { id: 'WO-10241', client: 'US Cellular',       sku: KIT_SKUS[2], name: KIT_PRODUCTS[2], qty: 100, status: 'Shipped to Client',  tech: 'D. Nguyen',   due: fmtDate(1)  },
  ];
  const woRecords: RuntimeRecord[] = woData.map((w, i) =>
    mkRecord(`rec-kit-wo-${i}`, `client-kit-${i % KIT_CLIENTS.length}`, 'ws-kit-orders', 'ss-kit-workorders',
      `${w.id} — ${w.name}`, w.status, undefined, fmtDate(-i),
      ['Type:WorkOrder'],
      { 'Work Order ID': w.id, 'Client': w.client, 'Kit SKU': w.sku, 'Kit Name': w.name, 'Kit Qty': w.qty, 'BOM Validated': w.status !== 'Work Order Created' ? 'Yes' : 'No', 'Status': w.status, 'Assigned Technician': w.tech, 'Due Date': w.due })
  );

  // Kitting Station: active assembly records for WO-10234 (T-Mobile Z Fold 7 × 200)
  const stationRecords: RuntimeRecord[] = [
    mkRecord('rec-kit-sta-0', 'client-kit-0', 'ws-kit-production', 'ss-kit-station', 'KIT-1001 — Samsung Z Fold 7 Kit', 'Complete',   undefined, fmtDate(-1), ['Type:KitBuild'], { 'Work Order': 'WO-10234', 'Kit ID': 'KIT-1001', 'Kit SKU': KIT_SKUS[0], 'Kit Name': KIT_PRODUCTS[0], 'Kitting Technician': 'J. Rivera',   'Components Assembled': 12, 'Serials Assigned': 'Yes', 'Assembly Status': 'Complete'   }),
    mkRecord('rec-kit-sta-1', 'client-kit-0', 'ws-kit-production', 'ss-kit-station', 'KIT-1002 — Samsung Z Fold 7 Kit', 'Complete',   undefined, fmtDate(-1), ['Type:KitBuild'], { 'Work Order': 'WO-10234', 'Kit ID': 'KIT-1002', 'Kit SKU': KIT_SKUS[0], 'Kit Name': KIT_PRODUCTS[0], 'Kitting Technician': 'J. Rivera',   'Components Assembled': 12, 'Serials Assigned': 'Yes', 'Assembly Status': 'Complete'   }),
    mkRecord('rec-kit-sta-2', 'client-kit-0', 'ws-kit-production', 'ss-kit-station', 'KIT-1003 — Samsung Z Fold 7 Kit', 'In Progress',undefined, fmtDate(0),  ['Type:KitBuild'], { 'Work Order': 'WO-10237', 'Kit ID': 'KIT-1003', 'Kit SKU': KIT_SKUS[0], 'Kit Name': KIT_PRODUCTS[0], 'Kitting Technician': 'T. Williams', 'Components Assembled': 8,  'Serials Assigned': 'No',  'Assembly Status': 'In Progress'}),
    mkRecord('rec-kit-sta-3', 'client-kit-1', 'ws-kit-production', 'ss-kit-station', 'KIT-2001 — iPhone 16 Pro Max Kit','In Progress',undefined, fmtDate(0),  ['Type:KitBuild'], { 'Work Order': 'WO-10235', 'Kit ID': 'KIT-2001', 'Kit SKU': KIT_SKUS[1], 'Kit Name': KIT_PRODUCTS[1], 'Kitting Technician': 'K. Thompson', 'Components Assembled': 5,  'Serials Assigned': 'No',  'Assembly Status': 'In Progress'}),
  ];

  // QC Records — matches QC & Shipping Screen
  const qcData = [
    { kitId: 'KIT-1001', wo: 'WO-10234', sku: KIT_SKUS[0], inspector: 'J. Rivera',   result: 'Passed',  defects: '',                                     rework: false },
    { kitId: 'KIT-1002', wo: 'WO-10234', sku: KIT_SKUS[0], inspector: 'M. Santos',   result: 'Passed',  defects: '',                                     rework: false },
    { kitId: 'KIT-1003', wo: 'WO-10237', sku: KIT_SKUS[0], inspector: 'K. Thompson', result: 'Pending', defects: '',                                     rework: false },
    { kitId: 'KIT-4001', wo: 'WO-10240', sku: KIT_SKUS[7], inspector: 'A. Patel',    result: 'Passed',  defects: '',                                     rework: false },
    { kitId: 'KIT-4002', wo: 'WO-10240', sku: KIT_SKUS[7], inspector: 'D. Nguyen',   result: 'Failed',  defects: 'Missing S Pen — SKU-ZF7-SPEN not found in tray', rework: true  },
  ];
  const qcRecords: RuntimeRecord[] = qcData.map((q, i) =>
    mkRecord(`rec-kit-qc-${i}`, `client-kit-${i % KIT_CLIENTS.length}`, 'ws-kit-qcship', 'ss-kit-qc',
      `${q.kitId} — ${q.result}`, q.result, undefined, fmtDate(-i),
      ['Type:QC'],
      { 'Kit ID': q.kitId, 'Work Order': q.wo, 'Kit SKU': q.sku, 'Inspector': q.inspector, 'Inspection Result': q.result, 'Defects Found': q.defects, 'Inspection Date': fmtDate(-i), 'Rework Required': q.rework ? 'Yes' : 'No' })
  );

  // Shipping Labels for completed orders
  const labelRecords: RuntimeRecord[] = [
    mkRecord('rec-kit-lbl-0', 'client-kit-0', 'ws-kit-qcship', 'ss-kit-labels', 'ORD-10234 — UPS Ground', 'Generated', undefined, fmtDate(-1), ['Type:Label'],
      { 'Order ID': 'PO-TM-10234', 'Kit ID': 'KIT-1001', 'Carrier': 'UPS', 'Service Level': 'Ground', 'Tracking Number': '1Z999AA10123456784', 'Label Generated': 'Yes', 'Created Date': fmtDate(-1), 'Estimated Delivery': fmtDate(5) }),
    mkRecord('rec-kit-lbl-1', 'client-kit-5', 'ws-kit-qcship', 'ss-kit-labels', 'ORD-10241 — FedEx 2Day', 'Generated', undefined, fmtDate(-2), ['Type:Label'],
      { 'Order ID': 'PO-USC-10241', 'Kit ID': 'KIT-3001', 'Carrier': 'FedEx', 'Service Level': '2-Day Air', 'Tracking Number': '7489489230002845523', 'Label Generated': 'Yes', 'Created Date': fmtDate(-2), 'Estimated Delivery': fmtDate(1) }),
  ];

  // ── Receiving Queue (ss-kit-recv-queue) ──
  const kitTechs = ['J. Rivera', 'K. Thompson', 'M. Santos', 'T. Williams', 'A. Patel', 'D. Nguyen'];
  const recvQueueRecords: RuntimeRecord[] = KIT_COMPONENTS.slice(0, 6).map((comp, i) =>
    mkRecord(`rec-kit-rq-${i}`, 'client-kit-0', 'ws-kit-receiving', 'ss-kit-recv-queue',
      `PO-RECV-${8000 + i} — ${comp}`, pick(['Inspecting', 'Accepted', 'Put Away']),
      undefined, fmtDate(-Math.floor(Math.random() * 7)), ['Type:Receiving'],
      { 'PO Number': `PO-RECV-${8000 + i}`, 'SKU': KIT_COMP_SKUS[i], 'Component Name': comp, 'Qty Received': Math.floor(Math.random() * 300 + 100), 'Serial Numbers': i === 0 ? 'SN-ZF7-100001 → SN-ZF7-100500' : '', 'Condition': pick(['New', 'Inspecting', 'Accepted']), 'Bin Location': `A${i + 1}-B${Math.ceil((i + 1) / 3)}`, 'Received By': pick(kitTechs), 'Received Date': fmtDate(-Math.floor(Math.random() * 7)) })
  );

  // ── Receiving Log (ss-kit-recv-log) ──
  const recvLogActions = ['Received & Counted', 'Inspected — Passed', 'Binned', 'Inspected — Rejected (2 units)', 'Recounted — Adjusted +3'];
  const recvLogRecords: RuntimeRecord[] = Array.from({ length: 8 }, (_, i) =>
    mkRecord(`rec-kit-rl-${i}`, 'client-kit-0', 'ws-kit-receiving', 'ss-kit-recv-log',
      `PO-RECV-${8000 + (i % 6)} — ${pick(recvLogActions)}`, 'Logged',
      undefined, fmtDate(-7 + i), ['Type:ReceivingLog'],
      { 'PO Number': `PO-RECV-${8000 + (i % 6)}`, 'SKU': KIT_COMP_SKUS[i % 12], 'Component': KIT_COMPONENTS[i % 12], 'Quantity': Math.floor(Math.random() * 300 + 100), 'Received By': pick(kitTechs), 'Action': pick(recvLogActions), 'Timestamp': fmtDate(-7 + i), 'Notes': pick(['Standard receipt — no issues', 'Minor packaging tear, units intact', 'Qty mismatch resolved', '']) })
  );

  // ── BOM Allocation (ss-kit-allocation) ──
  const allocRecords: RuntimeRecord[] = KIT_COMPONENTS.slice(0, 8).map((comp, i) => {
    const required = 200;
    const avail = compOnHand[i];
    const shortage = Math.max(0, required - avail);
    return mkRecord(`rec-kit-alloc-${i}`, 'client-kit-0', 'ws-kit-orders', 'ss-kit-allocation',
      `WO-10234 — ${comp}`, shortage > 0 ? 'Shortage' : 'Allocated',
      undefined, fmtDate(-3), ['Type:Allocation'],
      { 'Work Order': 'WO-10234', 'Kit SKU': KIT_SKUS[0], 'Component SKU': KIT_COMP_SKUS[i], 'Component Name': comp, 'Required Qty': required, 'Available Qty': avail, 'Shortage Qty': shortage, 'Allocation Status': shortage > 0 ? 'Shortage' : 'Allocated' });
  });

  // ── Pick Lists (ss-kit-picklist) ──
  const pickListRecords: RuntimeRecord[] = KIT_COMPONENTS.slice(0, 8).map((comp, i) => {
    const qtyPick = 200;
    const qtyScan = i < 5 ? 200 : Math.floor(Math.random() * 100 + 50);
    return mkRecord(`rec-kit-pk-${i}`, 'client-kit-0', 'ws-kit-production', 'ss-kit-picklist',
      `WO-10234 — Pick ${comp}`, i < 5 ? 'Complete' : 'In Progress',
      undefined, fmtDate(-2), ['Type:Pick'],
      { 'Work Order': 'WO-10234', 'Component': comp, 'Component SKU': KIT_COMP_SKUS[i], 'Bin Location': `A${i + 1}-B${Math.ceil((i + 1) / 3)}`, 'Qty to Pick': qtyPick, 'Qty Scanned': qtyScan, 'Picker': pick(kitTechs), 'Scan Status': i < 5 ? 'Complete' : 'In Progress' });
  });

  // ── Scan & Pick Events (ss-kit-scan-log) ──
  const scanLogRecords: RuntimeRecord[] = Array.from({ length: 8 }, (_, i) =>
    mkRecord(`rec-kit-sc-${i}`, 'client-kit-0', 'ws-kit-production', 'ss-kit-scan-log',
      `WO-10234 — Scan ${KIT_COMPONENTS[i % 12]}`, 'Logged',
      undefined, fmtDate(-2 + Math.floor(i / 4)), ['Type:ScanEvent'],
      { 'Work Order': 'WO-10234', 'Component': KIT_COMPONENTS[i % 12], 'Bin': `A${(i % 12) + 1}-B${Math.ceil(((i % 12) + 1) / 3)}`, 'Qty Scanned': Math.floor(Math.random() * 50 + 10), 'Scanned By': pick(kitTechs), 'Scan Time': fmtDate(-2 + Math.floor(i / 4)), 'Verified': i < 6 ? 'Yes' : 'No' })
  );

  // ── Assembly Log (ss-kit-assembly-log) ──
  const assemblySteps = ['Unbox device', 'Attach S Pen holster', 'Insert SIM eject tool', 'Place foam tray', 'Add charger & cable', 'Apply protective film', 'Place accessories bag', 'Insert documentation', 'Close & seal box', 'Apply anti-static bag', 'Place retail insert', 'Final visual check'];
  const assemblyLogRecords: RuntimeRecord[] = assemblySteps.slice(0, 8).map((step, i) =>
    mkRecord(`rec-kit-al-${i}`, 'client-kit-0', 'ws-kit-production', 'ss-kit-assembly-log',
      `KIT-1001 — ${step}`, 'Complete',
      undefined, fmtDate(-1), ['Type:AssemblyStep'],
      { 'Kit ID': 'KIT-1001', 'Step': step, 'Component': KIT_COMPONENTS[i % 12], 'Performed By': 'J. Rivera', 'Timestamp': fmtDate(-1), 'Notes': i === 0 ? 'IMEI verified: 353456789012345' : '' })
  );

  // ── Pack & Label Station (ss-kit-pack) ──
  const packKitRecords: RuntimeRecord[] = [
    mkRecord('rec-kit-pk-s0', 'client-kit-0', 'ws-kit-qcship', 'ss-kit-pack', 'KIT-1001 — Packed', 'Packed', undefined, fmtDate(-1), ['Type:Pack'],
      { 'Kit ID': 'KIT-1001', 'Order ID': 'PO-TM-10234', 'Kit SKU': KIT_SKUS[0], 'Box Dimensions': '14×8×6 in', 'Weight (lbs)': 2.8, 'Pack Date': fmtDate(-1), 'Label Type': 'UPS Ground', 'Packed By': 'T. Williams' }),
    mkRecord('rec-kit-pk-s1', 'client-kit-0', 'ws-kit-qcship', 'ss-kit-pack', 'KIT-1002 — Packed', 'Packed', undefined, fmtDate(-1), ['Type:Pack'],
      { 'Kit ID': 'KIT-1002', 'Order ID': 'PO-TM-10234', 'Kit SKU': KIT_SKUS[0], 'Box Dimensions': '14×8×6 in', 'Weight (lbs)': 2.7, 'Pack Date': fmtDate(-1), 'Label Type': 'UPS Ground', 'Packed By': 'T. Williams' }),
    mkRecord('rec-kit-pk-s2', 'client-kit-5', 'ws-kit-qcship', 'ss-kit-pack', 'KIT-3001 — Packed', 'Packed', undefined, fmtDate(-2), ['Type:Pack'],
      { 'Kit ID': 'KIT-3001', 'Order ID': 'PO-USC-10241', 'Kit SKU': KIT_SKUS[2], 'Box Dimensions': '12×10×4 in', 'Weight (lbs)': 2.1, 'Pack Date': fmtDate(-2), 'Label Type': 'FedEx 2-Day Air', 'Packed By': 'A. Patel' }),
    mkRecord('rec-kit-pk-s3', 'client-kit-6', 'ws-kit-qcship', 'ss-kit-pack', 'KIT-4001 — Packed', 'Packed', undefined, fmtDate(-1), ['Type:Pack'],
      { 'Kit ID': 'KIT-4001', 'Order ID': 'PO-BM-10240', 'Kit SKU': KIT_SKUS[7], 'Box Dimensions': '16×12×6 in', 'Weight (lbs)': 3.4, 'Pack Date': fmtDate(-1), 'Label Type': 'FedEx Express', 'Packed By': 'D. Nguyen' }),
  ];

  // ── Shipment Tracker (ss-kit-shipment-tracker) ──
  const kitShipEvents = [
    { orderId: 'PO-USC-10241', kitId: 'KIT-3001', carrier: 'FedEx', event: 'Label Created',          location: 'Dallas, TX',     ts: -3 },
    { orderId: 'PO-USC-10241', kitId: 'KIT-3001', carrier: 'FedEx', event: 'Picked Up',              location: 'Dallas, TX',     ts: -2 },
    { orderId: 'PO-USC-10241', kitId: 'KIT-3001', carrier: 'FedEx', event: 'In Transit — Regional Hub', location: 'Memphis, TN', ts: -1 },
    { orderId: 'PO-USC-10241', kitId: 'KIT-3001', carrier: 'FedEx', event: 'Delivered',              location: 'Chicago, IL',    ts: 0  },
    { orderId: 'PO-TM-10234',  kitId: 'KIT-1001', carrier: 'UPS',   event: 'Label Created',          location: 'Dallas, TX',     ts: -1 },
    { orderId: 'PO-TM-10234',  kitId: 'KIT-1001', carrier: 'UPS',   event: 'Picked Up',              location: 'Dallas, TX',     ts: 0  },
  ];
  const shipTrackerRecords: RuntimeRecord[] = kitShipEvents.map((e, i) =>
    mkRecord(`rec-kit-st-${i}`, `client-kit-${i < 4 ? 5 : 0}`, 'ws-kit-qcship', 'ss-kit-shipment-tracker',
      `${e.orderId} — ${e.event}`, e.event,
      undefined, fmtDate(e.ts), ['Type:ShipmentEvent'],
      { 'Order ID': e.orderId, 'Kit ID': e.kitId, 'Carrier': e.carrier, 'Event': e.event, 'Location': e.location, 'Timestamp': fmtDate(e.ts), 'Status Update Sent': (e.event === 'Delivered' || e.event === 'Out for Delivery') ? 'Yes' : 'No' })
  );

  const records = [...catalogRecords, ...orderRecords, ...bomRecords, ...woRecords, ...stationRecords, ...qcRecords, ...labelRecords, ...recvQueueRecords, ...recvLogRecords, ...allocRecords, ...pickListRecords, ...scanLogRecords, ...assemblyLogRecords, ...packKitRecords, ...shipTrackerRecords];
  const clients = KIT_CLIENTS.map((co, i) => mkClient(`client-kit-${i}`, co, `CARR-${2000 + i}`, ['Vertical:Kitting', 'Type:Carrier']));

  return {
    shellConfig: mkShellConfig('Kit Order', 'Kit Orders', 'Kitting Floor', 'Production Stage',
      ['Inbound Receiving', 'Client Order Intake', 'BOM & Allocation', 'Work Order Created', 'Picking', 'Kitting / Assembly', 'Pack & Label', 'Shipped to Client'], {
        collectionLabel: 'Kit Order', collectionLabelPlural: 'Kit Orders',
        intakeFields: [
          { id: 'clientName', label: 'Client Name', type: 'text', required: true },
          { id: 'kitModel', label: 'Kit Model', type: 'select', required: true, options: ['Galaxy Z Fold 7', 'Galaxy S25 Ultra', 'Galaxy A56', 'Galaxy Tab S10', 'Custom Kit'] },
          { id: 'quantity', label: 'Quantity', type: 'number', required: true },
          { id: 'requiredBy', label: 'Required By', type: 'date', required: false },
        ],
      }),
    workspaces: [wsReceiving, wsOrders, wsProduction, wsQcShip],
    flows, integrations, records, clients,
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
      workspaceIds: ['ws-bebo-pharma'],
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
    case 'lifecycle': return buildLifecyclePayload();
    case 'fulfillment': return buildFulfillmentPayload();
    case 'kitting': return buildKittingPayload();
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

export const VERTICAL_META: Record<DemoVertical, { label: string; icon: string; color: string; shortLabel: string; tenantName: string; tenantLogo: string }> = {
  pharma:      { label: 'Pharmaceutical / DSCSA',  icon: '💊', color: '#F97316', shortLabel: 'Pharma',      tenantName: 'CVS Pharmacy',           tenantLogo: 'https://upload.wikimedia.org/wikipedia/commons/f/f4/CVSPharmacyLogo2014.png' },
  sales:       { label: 'Sales CRM',               icon: '💰', color: '#166534', shortLabel: 'Sales',       tenantName: 'Saleshood',              tenantLogo: 'https://image4.owler.com/logo/saleshood_owler_20220704_010918_original.png' },
  healthcare:  { label: 'Healthcare',              icon: '🏥', color: '#0284C7', shortLabel: 'Health',      tenantName: "Cook Children's",        tenantLogo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/aa/Cook_Children%27s_Medical_Center_logo.svg/1280px-Cook_Children%27s_Medical_Center_logo.svg.png' },
  logistics:   { label: 'Logistics',               icon: '🚚', color: '#0369A1', shortLabel: 'Logistics',   tenantName: 'Hellmann Worldwide',     tenantLogo: 'https://upload.wikimedia.org/wikipedia/commons/4/41/Logo_Hellmann_Worldwide_Logistics.png' },
  legal:       { label: 'Legal',                   icon: '⚖️', color: '#1B3A5C', shortLabel: 'Legal',       tenantName: 'Witherite Law Group',    tenantLogo: 'https://cdn.prod.website-files.com/6700445b076878fb60678d7a/67af6fd009c6d53795d688b3_Witherite%20Law%20Group%20%C2%AE%20white%20.avif' },
  insurance:   { label: 'Insurance',               icon: '🛡️', color: '#1E293B', shortLabel: 'Insurance',   tenantName: 'Farmers Insurance',      tenantLogo: 'https://chambermaster.blob.core.windows.net/images/customers/314/members/3005/logos/MEMBER_PAGE_HEADER/farmers_horizontal_full_color_logo_png.png' },
  lifecycle:   { label: 'Lifecycle Services',      icon: '🔄', color: '#6366F1', shortLabel: 'Lifecycle',   tenantName: 'LifecycleOS',            tenantLogo: '' },
  fulfillment: { label: 'Fulfillment & Warehouse', icon: '📦', color: '#0891B2', shortLabel: 'Fulfillment', tenantName: 'Relentless Fulfillment', tenantLogo: 'https://cdn-ildpoef.nitrocdn.com/qWHnvrhJREiUMFZdGgGGyvsgiuoHGWxV/assets/images/optimized/rev-8bbf9f6/relentlessfulfillment.com/wp-content/uploads/2021/03/RF-Logo.png' },
  kitting:     { label: 'Kitting & Assembly',       icon: '🔧', color: '#1E293B', shortLabel: 'Kitting',     tenantName: 'KittingRUs',             tenantLogo: 'https://images.squarespace-cdn.com/content/v1/633c89732363235190035dae/6663049b-b12c-4fbc-b95c-13abae62e166/MayTec_distributor_logo_engineering_manufacturing_product-development_industrial-services_Birmingham-AL.png' },
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
  pharma:      { v1: '247 Serialized Batches',  v2: '99.8% Compliance Rate',       v3: '1 Pipeline Workspace',        wsCount: 1, flowCount: 5 },
  sales:       { v1: '$2.4M Pipeline Value',    v2: '34% Win Rate',                v3: '183 Tracked Records',         wsCount: 1, flowCount: 3 },
  healthcare:  { v1: '412 Patient Records',     v2: '94% Appointment Show Rate',   v3: '38 Visits Today',             wsCount: 1, flowCount: 2 },
  logistics:   { v1: '891 Shipments Active',    v2: '97.2% On-Time Rate',          v3: '12 Alerts Today',             wsCount: 1, flowCount: 2 },
  legal:       { v1: '94 Active Cases',         v2: '$1.8M Billed YTD',            v3: '8 Court Dates This Month',    wsCount: 2, flowCount: 2 },
  insurance:   { v1: '318 Active Policies',     v2: '$4.2M Annual Premium',        v3: '27 Open Claims',              wsCount: 2, flowCount: 2 },
  lifecycle:   { v1: '47 Active Accounts',      v2: '99.2% SLA Compliance',        v3: '6 Open Exchanges',            wsCount: 4, flowCount: 5 },
  fulfillment: { v1: '312 Orders In Process',   v2: '98.1% On-Time Rate',          v3: '24 Alerts Today',             wsCount: 3, flowCount: 4 },
  kitting:     { v1: '4 Active Work Orders',     v2: '99.4% QC Pass Rate',          v3: '1,200 Kits Shipped MTD',      wsCount: 4, flowCount: 7 },
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
    pharma:      ['Manufacturer Serialization Lead', 'Distributor Receiver', 'Pharmacy Dispense Manager', 'Compliance Trace Analyst'],
    sales:       ['Sales Rep', 'Sales Manager', 'SDR', 'Account Executive'],
    healthcare:  ['Physician', 'Nurse', 'Front Desk Coordinator', 'Billing Specialist'],
    logistics:   ['Warehouse Manager', 'Picker / Packer', 'Shipping Coordinator', 'Procurement Officer'],
    legal:       ['Managing Partner', 'Attorney', 'Paralegal', 'Legal Secretary'],
    insurance:   ['Underwriter', 'Claims Adjuster', 'Policy Administrator', 'Customer Service Rep'],
    lifecycle:   ['IT Admin', 'Procurement / Ops', 'End User (Employee)', 'Account Manager'],
    fulfillment: ['Warehouse Manager', 'Picker', 'Packer', 'Shipping Coordinator', 'Admin', 'Quality Inspector'],
    kitting:     ['Receiving Agent', 'Procurement Coordinator', 'BOM Coordinator', 'Warehouse Picker', 'Kitting Technician', 'QC Inspector', 'Pack & Label Operator', 'Shipping Coordinator', 'Account Manager'],
  };
  return map[v];
}

function getStagesForVertical(v: DemoVertical): string[] {
  const map: Record<DemoVertical, string[]> = {
    pharma:      ['Serialized', 'Shipped to Distributor', 'Received by Distributor', 'Shipped to Pharmacy', 'Dispensed'],
    sales:       ['New Lead', 'Qualified', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost'],
    healthcare:  ['Registered', 'Scheduled', 'In Progress', 'Completed', 'Follow-Up'],
    logistics:   ['Ordered', 'Received', 'Picking', 'Packed', 'Shipped', 'Delivered'],
    legal:       ['Intake', 'Engagement', 'Discovery', 'Litigation', 'Settlement', 'Closed'],
    insurance:   ['Application', 'Underwriting', 'Bound', 'Active', 'Renewal Pending'],
    lifecycle:   ['Submitted', 'In Progress', 'Awaiting Customer', 'Resolved', 'Closed', 'Escalated'],
    fulfillment: ['Received', 'Inventoried', 'Ordered', 'Picking', 'Packing', 'Shipped', 'Delivered', 'Returned'],
    kitting:     ['Inbound Receiving', 'Client Order Intake', 'BOM & Allocation', 'Work Order Created', 'Picking', 'Kitting / Assembly', 'Pack & Label', 'Shipped to Client'],
  };
  return map[v];
}

// ─── Scenario Switch Message ──────────────────────────────────────────

const SCENARIO_INTROS: Record<DemoVertical, string> = {
  kitting: `Switching to **🔧 Kitting & Assembly** mode.\n\nPre-built for **KittingRUs** with a live **Samsung Galaxy Z Fold 7 → T-Mobile** scenario: 200-unit kit orders moving through **Inbound Receiving → Client Order Intake → BOM & Allocation → Work Order Created → Picking → Kitting / Assembly → Pack & Label → Shipped to Client**.\n\nEach kit contains 12 BOM components: device, 45W charger, USB-C cable, S Pen, Care+ docs, quick start guide, SIM tool, retail insert, anti-static bag, foam tray, protective film, and accessories bag.\n\n**4 workspaces · 16 total subspaces · 7 signal flows** wired end-to-end. Ready to deploy or walk through any stage?`,
  lifecycle: `Switching to **🔄 Lifecycle Services** mode.\n\nI've pre-built a complete **LifecycleOS** workflow covering all 4 modules: **Customer Onboarding**, **Offboarding**, **Advanced Exchange**, and **Service Ticketing** — each with guided wizards, SLA tracking, and automation flows.\n\nReady to deploy the full scenario, or ask me to customize a module first?`,
  fulfillment: `Switching to **📦 Fulfillment & Warehouse** mode.\n\nYour **Relentless Fulfillment** workspace covers the full pick-pack-ship lifecycle: **Receiving & Inventory**, **Order Management**, and **Packing & Shipping** — with AI-assisted box sizing, weight validation, carrier selection, and exception handling built in.\n\nApply the full scenario with one click, or ask me to configure the workflow first.`,
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
