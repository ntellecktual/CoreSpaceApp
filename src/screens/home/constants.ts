import { GuideStep, Page } from './types';

export type SpotlightGuideStep = {
  id: string;
  title: string;
  detail: string;
  targetId?: string;
  checklist: string[];
  nav?: {
    workspaceIndex?: number;
    subSpaceIndex?: number;
    clientIndex?: number;
    clearSubSpace?: boolean;
    viewMode?: 'list' | 'board';
  };
};

export const pages: { id: Page; label: string; desc: string }[] = [
  { id: 'bebo', label: 'Bebo Ai', desc: 'Assist' },
  { id: 'admin', label: 'Workspace Creator', desc: 'Design' },
  { id: 'signal', label: 'Signal Studio', desc: 'Automate' },
  { id: 'orbital', label: 'Orbital', desc: 'Integrate' },
  { id: 'cosmograph', label: 'Cosmograph', desc: 'Analyze' },
  { id: 'financial', label: 'Financial Ops', desc: 'Finance' },
  { id: 'ingestion', label: 'Ingestion', desc: 'Ingest' },
  { id: 'enduser', label: 'End User', desc: 'Operate' },
];

export const architectureSteps: GuideStep[] = [
  {
    title: 'Platform Purpose',
    detail: 'Admins design how the business runs — no code. End users follow governed workflows that keep everything consistent.',
  },
  {
    title: 'Isolation Model',
    detail: 'Every organization gets its own data boundary. Nothing leaks between tenants.',
  },
  {
    title: 'Tag-Driven Runtime',
    detail: 'Tags control visibility, automation scope, analytics breakdowns, and data retention — one concept, many uses.',
  },
];

export const endUserSteps: GuideStep[] = [
  {
    title: 'Step 1: Select a Product Batch',
    detail: 'Every drug product batch is tracked as its own record — complete with NDC code, lot number, serial ranges, and expiration. Select one to see its full journey.',
  },
  {
    title: 'Step 2: Navigate the Supply Chain',
    detail: 'Switch between Manufacturer, Distributor, Pharmacy, and Supply Chain workspaces to follow the product through each stage of the DSCSA pipeline.',
  },
  {
    title: 'Step 3: Drill Into SubSpaces',
    detail: 'Each workspace is subdivided into specialized work areas — Unit Serialization, Carton Aggregation, EPCIS Upload, Verification, Dispense Logging, and more.',
  },
  {
    title: 'Step 4: View & Edit Records',
    detail: 'Click any record to open the detail drawer. View serial numbers, verification results, and dispense logs. Edit inline and save — changes are instant.',
  },
];
// ── DSCSA Spotlight Walkthrough — end-to-end demo with overlay highlighting ──
export const dscsaCrudWalkthroughSteps: SpotlightGuideStep[] = [
  {
    id: 'data-overview',
    title: '1. Pre-Loaded DSCSA Platform',
    detail: 'The demo ships with 5 published workspaces (DSCSA Serialization Workflow Example, Manufacturer Serialization, Distributor and Wholesaler Verification, Pharmacy and Dispense Trace, Network Traceability and Exceptions), 16 SubSpaces, 7 lifecycle stages, 4 personas, and 5 automation flows — all ready to explore.',
    checklist: [
      '3 live product batches: Lisinopril 10mg, Amoxicillin 500mg, Epinephrine 1mg/mL.',
      '17 records across all workspaces with real serial numbers and NDC codes.',
      '5 Signal Studio flows monitor every batch for alerts and compliance.',
    ],
  },
  {
    id: 'select-batch',
    title: '2. Select a Product Batch',
    detail: 'Three batches are loaded: Lisinopril 10mg Tablet (Lot XY-1234, 2,400 units), Amoxicillin 500mg Capsule (Lot MZ-9021, 12,000 capsules), and Epinephrine 1mg/mL Injectable (Lot JK-4410, 500 units). Select Lisinopril to follow its full supply chain journey.',
    targetId: 'eu-batch-list',
    checklist: [
      'Each batch has a unique Lot Number, NDC code, and serial range.',
      'Selecting a batch filters all workspaces and records to that product.',
      'The batch reference ID (e.g., DSCSA-XY1234) is the intake anchor for all downstream records.',
    ],
    nav: { clientIndex: 0 },
  },
  {
    id: 'browse-enter-workspace',
    title: '3. Browse & Enter Workspaces',
    detail: 'The left rail lists every published workspace. Select the MANUFACTURER workspace — the center stage updates to show SubSpace cards, KPI metrics, and stage distribution for this supply chain node.',
    targetId: 'eu-workspace-list',
    checklist: [
      'MANUFACTURER — unit serialization, carton aggregation, and EPCIS upload.',
      'DISTRIBUTOR — inbound receiving, serial verification, and movement tracking.',
      'PHARMACY — receiving verification, serial inventory, and dispense logging.',
      'The KPI strip shows record count, stage count, SubSpace count, and exception count.',
    ],
    nav: { workspaceIndex: 1, clearSubSpace: true },
  },
  {
    id: 'kpi-subspaces',
    title: '4. KPI Dashboard & SubSpaces',
    detail: 'The top bar shows four real-time KPI tiles: total Records, Stages in use, active SubSpaces, and Exceptions flagged. Click a SubSpace card to dive into its records — the view switches to a filtered record list for that lane.',
    targetId: 'eu-kpi-strip',
    checklist: [
      'Exceptions: count of records in "Exception Review" — 0 is green, >0 is red.',
      'Each SubSpace groups related records — e.g., "Unit Serialization" holds one record per serialized drug unit.',
      'Click "+ Record" to create a new entry directly in this SubSpace.',
    ],
    nav: { workspaceIndex: 1, subSpaceIndex: 0 },
  },
  {
    id: 'records-board',
    title: '5. Records & Board View',
    detail: 'Each record card shows its lifecycle stage chip, title, date, amount, and data fields. Click any record to open the detail drawer. Toggle to Board view — records group into columns by lifecycle stage, a visual workflow for spotting bottlenecks.',
    targetId: 'eu-record-list',
    checklist: [
      'Stage chips are color-coded: Serialized (blue), Shipped (teal), Received (green), Exception Review (red).',
      'Tags appear as small badges — they drive automation scope and analytics breakdowns.',
      'Board view groups records by their current lifecycle stage.',
    ],
    nav: { workspaceIndex: 1, subSpaceIndex: 0, viewMode: 'board' },
  },
  {
    id: 'create-record',
    title: '6. Task: CRUD a Record',
    detail: 'Click "+ Record" to open the creation modal. Pick a lifecycle stage, fill in the form fields, and submit. For DSCSA workspaces, the built-in FDA Drug Lookup auto-fills NDC codes, manufacturer, and dosage from OpenFDA — zero API keys needed.',
    targetId: 'eu-create-record',
    checklist: [
      'Lifecycle stage picker shows only allowed starting stages for this SubSpace.',
      'FDA Drug Lookup is built-in — search by drug name or NDC code, and fields auto-populate.',
      'After creation, view it in the detail drawer, edit fields, then delete. Full create → read → update → delete in seconds.',
    ],
    nav: { workspaceIndex: 1, subSpaceIndex: 0, viewMode: 'list' },
  },
  {
    id: 'signal-flows',
    title: '7. Signal Flows & Trigger a Signal',
    detail: 'Click the green "⚡ Signal Flows" button. Five automation flows are active: Serial Mismatch Alert, Suspect Product Escalation (FDA §582), 90-Day Expiration Warning, Auto-Advance Lifecycle on Shipment, and Dispense-to-Patient Completion Logger. Switch to the DISTRIBUTOR workspace, find the Amoxicillin mismatch record, and edit mismatch-count — the flow fires and sends a notification.',
    targetId: 'eu-flow-button',
    checklist: [
      'Each flow fires automatically when records are created, updated, or transition lifecycle stages.',
      'Editing mismatch-count triggers the Serial Mismatch Alert signal flow.',
      'A notification appears in the bell icon — proof that automation is live.',
    ],
    nav: { workspaceIndex: 1, clearSubSpace: true },
  },
  {
    id: 'lifecycle-governance',
    title: '8. Lifecycle Governance & RBAC',
    detail: 'Open any record\u2019s detail drawer. Quick Actions show only valid next stages: a Serialized batch can move to Shipped to Distributor. Four DSCSA personas control access: Manufacturer Serialization Lead, Distributor Receiver, Pharmacy Dispense Manager, and Compliance Trace Analyst.',
    targetId: 'eu-subspace-list',
    checklist: [
      'Lifecycle transitions are governed — users can only move records to permitted next stages.',
      'Each persona sees only their scoped workspaces and permitted actions.',
      'Exception Review records can resolve to Received by Distributor, Received by Pharmacy, or Dispensed.',
    ],
    nav: { workspaceIndex: 2 },
  },
  {
    id: 'timeline-batch',
    title: '9. Activity Timeline & New Batch',
    detail: 'Click "◷ Activity Timeline" for a chronological feed of every action: creates, updates, transitions, and deletions. Then click "+ New Batch" to register a new product batch with a Batch Reference ID, persona, and intake fields.',
    targetId: 'eu-timeline-button',
    checklist: [
      'Audit entries show action type (Created, Updated, Transitioned, Deleted) with detail text.',
      'The Batch Reference ID is the unique anchor — all records for this batch are linked to it.',
      'Intake fields are admin-defined — every batch starts with consistent, governed data.',
    ],
  },
  {
    id: 'orbital-integrations',
    title: '10. Orbital Integrations',
    detail: 'Switch to the Orbital page to browse the Marketplace. Activate DocuSign or QuickBooks — configure connection credentials, map workspace fields to integration fields, and confirm. Pre-wired signals auto-register as Signal Studio flows.',
    checklist: [
      'DocuSign for e-signatures on compliance documents.',
      'QuickBooks for financial reconciliation of pharmaceutical shipments.',
      'Custom HTTP connectors for any REST API — EPCIS upload, FDA reporting, etc.',
    ],
  },
  {
    id: 'demo-complete',
    title: 'Demo Complete',
    detail: 'You\u2019ve explored the full DSCSA serialization platform: 3 product batches across 5 workspaces, SubSpace drill-downs, record CRUD with lifecycle governance, board view, FDA drug lookup, 5 live Signal flows, activity timeline, batch registration, and Orbital integrations — all in one zero-code platform.',
    checklist: [
      'Every workspace, SubSpace, field, lifecycle, and flow was created by an admin — no developer needed.',
      'Signal flows automate compliance alerts, lifecycle transitions, and audit logging.',
      'The same platform powers any regulated industry — insurance, logistics, healthcare, finance.',
    ],
  },
];
export const signalSteps: GuideStep[] = [
  {
    title: 'Step 1: Name Your Automation',
    detail: 'Give the flow a clear business name — "Serial Mismatch Alert" or "90-Day Expiration Warning" — so any stakeholder instantly understands what it does.',
  },
  {
    title: 'Step 2: Define the Trigger',
    detail: 'Choose what starts the flow: a data event (record created/updated), an inbound webhook from an external system, or a recurring schedule (hourly, daily, weekly, cron).',
  },
  {
    title: 'Step 3: Set Conditional Rules',
    detail: 'Add rules that filter when the flow fires — "mismatch_count > 0" or "days_to_expiration <= 90". Only matching records trigger the action.',
  },
  {
    title: 'Step 4: Publish & Monitor',
    detail: 'Publish the flow and switch to Active Flows to see run counts, failure rates, average execution time, and last-run timestamps — production-grade observability.',
  },
];

export const orbitalSteps: GuideStep[] = [
  {
    title: 'Step 1: Browse the Marketplace',
    detail: 'The Orbital Marketplace lists every available integration — DocuSign, QuickBooks, and custom HTTP connectors. Each card shows the vendor, category, and publisher tier.',
  },
  {
    title: 'Step 2: Activate an Integration',
    detail: 'Click Activate to begin the two-layer configuration: first the Connection layer (credentials, API keys, OAuth), then the Semantic Mapping layer (which workspace fields map to which external fields).',
  },
  {
    title: 'Step 3: Configure Field Mappings',
    detail: 'Map your workspace record fields to the integration\'s expected inputs. Discoverable fields can auto-populate from the external API via schema discovery calls.',
  },
  {
    title: 'Step 4: Monitor & Manage',
    detail: 'Active integrations show real-time health status, call counts, error rates, and auto-shutoff thresholds. Pause or reconfigure any integration at any time.',
  },
];
