export type VisibilityRule = 'always' | 'ifRecords';

export type CountStrategy = 'none' | 'perSubSpace' | 'rollupSummary';

export type DisplayType = 'grid' | 'timeline' | 'summary' | 'split' | 'board' | 'card' | 'list';

export type SubSpaceBuilderFieldType =
  | 'text'
  | 'longText'
  | 'number'
  | 'date'
  | 'datetime'
  | 'select'
  | 'checkbox'
  | 'email'
  | 'phone'
  | 'attachment';

export interface SubSpaceBuilderField {
  id: string;
  label: string;
  type: SubSpaceBuilderFieldType;
  required: boolean;
  tags?: string[];
}

export interface SubSpaceDefinition {
  id: string;
  name: string;
  sourceEntity: string;
  bindMode: 'sameEntityView' | 'relatedEntityView';
  relationship?: string;
  displayType: DisplayType;
  visibilityRule: VisibilityRule;
  showCount: boolean;
  countMode: 'direct' | 'rollup';
  defaultCreateFormId?: string;
  defaultEditFormId?: string;
  builderFields?: SubSpaceBuilderField[];
  pipelineOrder?: number; // Position in the pipeline flow (0-based). Undefined = not in pipeline.
}

export interface WorkspaceDefinition {
  id: string;
  name: string;
  icon?: string;
  description?: string;
  tags?: string[];
  rootEntity: string;
  route: string;
  parentWorkspaceId?: string;
  countBadgesEnabled: boolean;
  countStrategy: CountStrategy;
  builderFields?: SubSpaceBuilderField[];
  subSpaces: SubSpaceDefinition[];
  publisher?: IntegrationPublisher;
  schemaLocked?: boolean;
  published?: boolean;
  pipelineEnabled?: boolean; // When true, subSpaces have a defined order-of-operations flow.
}

// ─── Business Architecture ──────────────────────────────────────────
// The hierarchy above Workspace/SubSpace that covers a full business:
//   BusinessFunction → BusinessObject → (ClientProfile / Batch) → Workspace → SubSpace → Record

export interface BusinessObject {
  id: string;
  functionId: string;
  name: string;              // Fully configurable: "Drug Inventory", "Client Portfolio", "Order Book"
  namePlural: string;        // Plural form
  icon?: string;             // Emoji identifier
  description?: string;
  workspaceIds: string[];    // Workspaces that process items belonging to this object
}

export interface BusinessFunction {
  id: string;
  name: string;              // "Supply Chain", "Distribution", "Finance", "Sales"
  icon?: string;             // Emoji
  description?: string;
  color?: string;            // Optional accent color override
  order: number;             // Display order
  objects: BusinessObject[];
}

export interface FormFieldDefinition {
  id: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select';
  required: boolean;
  options?: string[];
}

export interface FormDefinition {
  id: string;
  name: string;
  workspaceId: string;
  subSpaceId: string;
  fields: FormFieldDefinition[];
}

export interface RuntimeRecord {
  id: string;
  clientId: string;
  workspaceId: string;
  subSpaceId: string;
  title: string;
  status: string;
  amount?: number;
  date?: string;
  tags: string[];
  data: Record<string, string | number>;
  imageUri?: string;
}

export type FlowTriggerType = 'event' | 'webhook' | 'schedule';

export interface WebhookConfig {
  endpointPath: string;
  method: 'POST' | 'GET';
  secret?: string;
}

export interface ScheduleConfig {
  frequency: 'hourly' | 'daily' | 'weekly' | 'monthly' | 'custom';
  cronExpression?: string;
  time?: string;
  dayOfWeek?: number;
}

export interface SignalFlow {
  id: string;
  name: string;
  signal: string;
  triggerType: FlowTriggerType;
  webhookConfig?: WebhookConfig;
  scheduleConfig?: ScheduleConfig;
  workspaceId: string;
  subSpaceId: string;
  businessObjectId?: string;   // Optional link to a BusinessObject
  businessFunctionId?: string; // Optional link to a BusinessFunction
  rules: string[];
  action: string;
  runOnExisting: boolean;
  targetTags: string[];
  status: 'draft' | 'published';
  totalRuns: number;
  failures7d: number;
  avgTimeMs: number;
  lastRun?: string;
}

export interface TagPolicy {
  id: string;
  name: string;
  purpose: 'rbac' | 'analytics' | 'automation' | 'retention';
  description: string;
}

export interface ClientProfile {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  caseRef: string;
  personaId?: string;
  profileData?: Record<string, string>;
  tags: string[];
  createdAt: string;
  objectId?: string;  // Links this batch/collection to a BusinessObject
}

export type ShellFieldType = 'text' | 'number' | 'date' | 'select';

export interface ShellIntakeField {
  id: string;
  label: string;
  type: ShellFieldType;
  required: boolean;
  options?: string[];
}

export interface EndUserPersona {
  id: string;
  name: string;
  description?: string;
  workspaceScope: 'all' | 'selected';
  workspaceIds: string[];
  defaultTags: string[];
}

export interface LifecycleStage {
  id: string;
  name: string;
  description?: string;
}

export interface LifecycleTransition {
  id: string;
  fromStageId: string;
  toStageId: string;
  personaIds?: string[];
}

export interface ShellConfig {
  subjectSingular: string;
  subjectPlural: string;
  workspaceLabel: string;
  subSpaceLabel: string;
  // Business architecture terminology — all optional with sensible defaults
  functionLabel?: string;         // "Department" or custom: "Division", "Domain", "Function"
  functionLabelPlural?: string;
  objectLabel?: string;           // "Registry" or custom: "Inventory", "Ledger", "Portfolio"
  objectLabelPlural?: string;
  collectionLabel?: string;       // "Collection" or custom: "Batch", "Campaign", "Portfolio"
  collectionLabelPlural?: string;
  intakeFields: ShellIntakeField[];
  personas: EndUserPersona[];
  lifecycleStages: LifecycleStage[];
  defaultLifecycleStageId: string;
  lifecycleTransitions: LifecycleTransition[];
}

export type PermissionAction =
  | 'workspace.manage'
  | 'subspace.manage'
  | 'client.intake'
  | 'record.create'
  | 'record.edit'
  | 'record.delete'
  | 'field.view'
  | 'field.edit'
  | 'flow.publish'
  | 'flow.execute'
  | 'integration.manage'
  | 'integration.activate';

export interface FieldVisibilityRule {
  fieldId: string;
  visible: boolean;
  editable: boolean;
}

export interface RoleDefinition {
  id: string;
  name: string;
  description?: string;
  permissions: PermissionAction[];
  workspaceScope: 'all' | 'selected';
  workspaceIds: string[];
  fieldRules?: FieldVisibilityRule[];
}

export interface PermissionTemplate {
  id: string;
  name: string;
  description?: string;
  changeNote?: string;
  permissions: PermissionAction[];
  version: number;
  lineageId: string;
  parentTemplateId?: string;
  createdAt: string;
}

export type AuthProvider = 'email' | 'google' | 'microsoft';

export interface AuthUser {
  id: string;
  fullName: string;
  email: string;
  password?: string;
  roleId: string;
  tenantId?: string;
  isSuperAdmin?: boolean;
  provider: AuthProvider;
  createdAt: string;
}

export interface AuthSession {
  userId: string;
  provider: AuthProvider;
  signedInAt: string;
}

export interface TenantBrandingProfile {
  // ── Identity ──
  logoUri?: string;
  tagline?: string;
  industryVertical?: string;
  // ── Palette ──
  brandColors: [string, string, string];
  accentSecondary?: string;
  successColor?: string;
  warningColor?: string;
  dangerColor?: string;
  surfaceColor?: string;
  // ── Typography ──
  fontFamily?: string;
  headingWeight?: string;
  baseFontSize?: number;
  // ── Shape & Layout ──
  borderRadius?: string;
  uiDensity?: string;
  sidebarStyle?: string;
  cardStyle?: string;
  // ── Dashboard ──
  welcomeMessage?: string;
  heroImageUri?: string;
  dashboardLayout?: string;
  defaultThemeMode?: string;
  animationsEnabled?: boolean;
  // ── Business ──
  employeeTitles: string[];
  departments?: string[];
  timezone?: string;
  dateFormat?: string;
  currencyCode?: string;
  // ── Layout ──
  widgetTwoColumnBreakpoint: number;
}

export interface AppData {
  appName: string;
  organizations: string[];
  activeOrg: string;
  shellConfig: ShellConfig;
  roles: RoleDefinition[];
  activeRoleId: string;
  customPermissionTemplates: PermissionTemplate[];
  clients: ClientProfile[];
  workspaces: WorkspaceDefinition[];
  forms: FormDefinition[];
  records: RuntimeRecord[];
  flows: SignalFlow[];
  tagPolicies: TagPolicy[];
  users: AuthUser[];
  session: AuthSession | null;
  integrations: IntegrationActivation[];
  businessFunctions?: BusinessFunction[];
  flowRuns?: FlowRunEntry[];
  // ─── Financial Operations Engine ───────────────────────────────────
  glAccounts?: GlAccount[];
  accountingPeriods?: AccountingPeriod[];
  journalEntries?: JournalEntry[];
  payables?: Payable[];
  receivables?: Receivable[];
  financialCounterparties?: FinancialCounterparty[];
  waterfalls?: DistributionWaterfall[];
  // ─── Ingestion Layer (WS-048) ─────────────────────────────────────
  ingestionSources?: IngestionSourceConfig[];
  fieldMappingTemplates?: FieldMappingTemplate[];
  ingestionRecords?: IngestionRecord[];
  fieldTags?: FieldTagRecord[];
  userPresence?: UserPresence[];
  // ─── Vendors & AP (WS-049) ────────────────────────────────────────
  vendors?: Vendor[];
  apInvoices?: ApInvoice[];
  workflowChains?: WorkflowChainDefinition[];
}

// ─── Orbital Integration Framework ──────────────────────────────────

export type IntegrationPublisher = 'corespace' | 'org';

export type IntegrationAuthType = 'oauth2' | 'apikey' | 'jwt' | 'none';

export type IntegrationStatus = 'active' | 'paused' | 'error' | 'disabled';

export interface IntegrationFieldDef {
  key: string;
  label: string;
  type: 'text' | 'secret' | 'url' | 'select' | 'boolean';
  required: boolean;
  layer: 'connection' | 'mapping';
  discoverable?: boolean;
  discoveryRef?: string;
  instruction?: string;
  example?: string;
  validationHint?: string;
  impactStatement?: string;
  dependsOn?: string;
  options?: string[];
}

export interface IntegrationActionDef {
  key: string;
  label: string;
  description: string;
  inputFields?: string[];
  outputFields?: string[];
  preflight?: PreflightRuleDef;
}

export interface IntegrationTriggerDef {
  key: string;
  label: string;
  description: string;
  eventType: string;
}

export interface PreflightRuleDef {
  field: string;
  operator: 'exists' | 'eq' | 'neq' | 'regex';
  value?: string;
  message: string;
}

export interface DiscoveryCallDef {
  key: string;
  label: string;
  description: string;
  resultPath: string;
  targetFields: string[];
}

export interface PrewiredSignalDef {
  key: string;
  triggerRef: string;
  label: string;
  defaultAction: string;
  customerEditable: boolean;
}

export interface IntegrationTemplate {
  id: string;
  name: string;
  vendor: string;
  icon?: string;
  description: string;
  category: string;
  publisher: IntegrationPublisher;
  version: string;
  authType: IntegrationAuthType;
  fields: IntegrationFieldDef[];
  actions: IntegrationActionDef[];
  triggers: IntegrationTriggerDef[];
  discoveryCalls?: DiscoveryCallDef[];
  prewiredSignals?: PrewiredSignalDef[];
  documentation?: string;
  businessObjectIds?: string[];  // Business objects this integration serves
}

export interface IntegrationActivation {
  id: string;
  tenantId: string;
  templateId: string;
  templateVersion: string;
  connectionConfig: Record<string, string>;
  mappingConfig: Record<string, string>;
  discoveryCache?: Record<string, unknown>;
  status: IntegrationStatus;
  activatedAt: string;
  lastHealthCheck?: string;
  disabledReason?: string;
  disabledAt?: string;
  errorCount: number;
  totalCalls: number;
  autoShutoffThreshold: number;
}

export interface OrbitalResponse {
  success: boolean;
  integrationId: string;
  actionKey: string;
  tenantId: string;
  executedAt: string;
  durationMs: number;
  result?: Record<string, unknown>;
  error?: string;
}

// ─── Audit Log ───────────────────────────────────────────────────────

export interface AuditLogEntry {
  id: string;
  tenantId: string;
  userId: string;
  userName: string;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string;
  entityName: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  timestamp: string;
}

export type AuditAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'publish'
  | 'transition'
  | 'import'
  | 'export'
  | 'approve'
  | 'post'
  | 'close'
  | 'sign-in'
  | 'sign-out';

export type AuditEntityType =
  | 'workspace'
  | 'subspace'
  | 'record'
  | 'client'
  | 'flow'
  | 'role'
  | 'tenant'
  | 'shell-config'
  | 'form'
  | 'user'
  | 'integration'
  | 'business-function'
  | 'business-object'
  | 'journal-entry'
  | 'payable'
  | 'receivable'
  | 'gl-account'
  | 'accounting-period'
  | 'counterparty'
  | 'waterfall'
  | 'ingestion-record'
  | 'field-tag'
  | 'ingestion-source';

// ─── Notifications ───────────────────────────────────────────────────

export interface AppNotification {
  id: string;
  tenantId: string;
  userId?: string;
  type: NotificationType;
  title: string;
  body: string;
  severity: 'info' | 'success' | 'warning' | 'error';
  sourceEntityType?: AuditEntityType;
  sourceEntityId?: string;
  read: boolean;
  createdAt: string;
}

export type NotificationType =
  | 'flow-triggered'
  | 'flow-failed'
  | 'sla-breach'
  | 'lifecycle-transition'
  | 'record-created'
  | 'tenant-created'
  | 'import-complete'
  | 'integration-triggered'
  | 'integration-failed'
  | 'gl-entry-posted'
  | 'payable-approved'
  | 'receivable-received'
  | 'period-close-requested'
  | 'period-closed'
  | 'waterfall-approved'
  | 'mission-control-action'
  | 'ingestion-auto-processed'
  | 'ingestion-review-required'
  | 'ingestion-reviewed'
  | 'ingestion-rejected'
  | 'system';

export interface FlowRunEntry {
  id: string;
  flowId: string;
  flowName: string;
  recordId: string;
  recordTitle: string;
  event: 'record.created' | 'record.updated' | 'lifecycle.transition';
  status: 'success' | 'failed' | 'skipped';
  actionTaken: string | null;
  durationMs: number;
  error?: string;
  timestamp: string;
}

// ─── AI / Agentic ───────────────────────────────────────────────────

export type AiProvider = 'openai' | 'azure-openai' | 'anthropic' | 'local';

export interface AiAgentConfig {
  provider: AiProvider;
  model: string;
  apiEndpoint?: string;
  apiKey?: string;
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
}

export interface AiConversationMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  toolCalls?: AiToolCall[];
  pending?: boolean;
}

export interface AiToolCall {
  name: AiToolName;
  arguments: Record<string, unknown>;
  result?: Record<string, unknown>;
  status: 'pending' | 'success' | 'error';
}

export type AiToolName =
  | 'createWorkspace'
  | 'addSubSpace'
  | 'addBuilderField'
  | 'setShellConfig'
  | 'addPersona'
  | 'createFlow'
  | 'addClient'
  | 'queryRecords'
  | 'addLifecycleStage'
  | 'suggestTags'
  | 'autoFillFields'
  | 'validateRecord'
  | 'summarizeHistory';

export interface AiSession {
  id: string;
  tenantId: string;
  context: AiSessionContext;
  messages: AiConversationMessage[];
  proposedChanges?: AiProposedChange[];
  status: 'active' | 'applied' | 'discarded';
  createdAt: string;
}

export type AiSessionContext =
  | 'workspace-builder'
  | 'signal-builder'
  | 'data-assistant'
  | 'query'
  | 'onboarding';

export interface AiProposedChange {
  id: string;
  toolName: AiToolName;
  description: string;
  payload: Record<string, unknown>;
  accepted: boolean;
}

// ─── Command Palette ─────────────────────────────────────────────────

export interface CommandPaletteItem {
  id: string;
  label: string;
  description?: string;
  category: CommandCategory;
  keywords: string[];
  action: () => void;
}

export type CommandCategory =
  | 'navigation'
  | 'workspace'
  | 'tenant'
  | 'settings'
  | 'ai'
  | 'record'
  | 'flow';

// ─── Bulk Actions ────────────────────────────────────────────────────

export type BulkActionType =
  | 'tag'
  | 'untag'
  | 'transition'
  | 'reassign'
  | 'export'
  | 'delete';

export interface BulkActionRequest {
  actionType: BulkActionType;
  recordIds: string[];
  payload: Record<string, unknown>;
}

// ─── Webhooks ────────────────────────────────────────────────────────

export interface WebhookDefinition {
  id: string;
  name: string;
  url: string;
  secret?: string;
  events: string[];
  enabled: boolean;
  createdAt: string;
  lastTriggered?: string;
  failureCount: number;
}

// ─── Saved Filters ───────────────────────────────────────────────────

export interface SavedFilter {
  id: string;
  name: string;
  workspaceId: string;
  subSpaceId?: string;
  conditions: FilterCondition[];
  createdAt: string;
}

export interface FilterCondition {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains' | 'startsWith';
  value: string | number;
}

// ─── System Tags (WS-047-ADD) ────────────────────────────────────────
// System tags are applied to specific fields on specific records by the
// platform engine. They enforce immutable constraints at the pre-write gate
// BEFORE any validator runs. Tenants cannot create or remove system tags.

export type SystemTagName = 'gl-locked' | 'period-controlled' | 'reconciled' | 'audit-required';

export interface FieldTagRecord {
  id: string;
  tenantId: string;
  recordType: string;           // 'journal_entry' | 'payable' | 'receivable' | 'disbursement_waterfall'
  recordId: string | null;      // null = definition-time (applies to ALL records of this type)
  fieldSlug: string;            // specific field slug, or '*' = all #gl-locked fields on this type
  tagName: SystemTagName;
  isActive: boolean;
  appliedAt: string;
  appliedByEvent: string;       // 'posting_status:posted' | 'definition_time' | 'reconciliation_session.closed'
  appliedByUserId?: string;
}

// ─── Ingestion System (WS-048) ────────────────────────────────────────
// The universal ingestion layer accepts OCR, CSV, EDI, and webhook formats,
// normalises them to a common field map, and fires events that start the
// financial workflow chain. All formats produce the same output structure.
// Adding a new document source is configuration, not engineering.

export type IngestionFormat = 'ocr' | 'csv' | 'edi' | 'webhook';

export interface IngestionFieldValue {
  value: string;
  confidence: number;     // 0.0–1.0; structured sources always 1.0
  confirmed: boolean;     // true if >= threshold or structured source; false = needs human review
}

export interface NormalizedFieldMap {
  sourceFormat: IngestionFormat;
  sourceRef: string;
  documentId?: string;
  fields: Record<string, IngestionFieldValue>;
  tenantId: string;
  receivedAt: string;
  batchId?: string;
}

export type IngestionReviewStatus = 'auto_processed' | 'pending_review' | 'reviewed' | 'rejected';

export type IngestionEventType =
  | 'ingestion.payable_received'
  | 'ingestion.payment_received'
  | 'ingestion.statement_received'
  | 'ingestion.document_received'
  | 'ingestion.review_required';

export interface IngestionRecord {
  id: string;
  sourceFormat: IngestionFormat;
  sourceRef: string;
  documentId?: string;
  fieldMap: NormalizedFieldMap;
  overallConfidence: number;                    // min confidence across required fields after threshold evaluation
  reviewStatus: IngestionReviewStatus;
  eventFired?: IngestionEventType;
  downstreamRecordType?: string;                // 'payable' | 'receivable' | etc.
  downstreamRecordId?: string;
  fieldsBelowThreshold?: { slug: string; value: string; confidence: number; threshold: number }[];
  reviewedBy?: string;
  reviewedAt?: string;
  rejectionReason?: string;
  receivedAt: string;
  tenantId: string;
}

export interface FieldMappingTemplate {
  id: string;
  name: string;
  sourceFormat: IngestionFormat;
  documentTypeHint?: string;          // e.g. 'vendor_invoice', 'settlement_statement', 'eob'
  mappings: { extractedKey: string; fieldSlug: string; required: boolean }[];
  confidenceThreshold: number;        // 0.0–1.0; default 0.85
}

export interface IngestionSourceConfig {
  id: string;
  name: string;
  sourceRef: string;                  // slug used in webhook URL and event references
  format: IngestionFormat;
  eventType: IngestionEventType;
  fieldMappingTemplateId: string;
  confidenceThresholdOverride?: number;
  isActive: boolean;
  createdAt: string;
  // Format-specific settings
  webhookSecret?: string;
  webhookJsonPaths?: Record<string, string>;
  csvColumnMappings?: Record<string, string>;
  csvDelimiter?: string;
  ediTradingPartnerId?: string;
  ediTransactionTypes?: string[];
}

// ─── Presence Registry (WS-048 v2.1) ────────────────────────────────
// Tracks user activity status. Updated via WebSocket heartbeats.
// Used by routing algorithm to find active approvers.

export type PresenceStatus = 'active' | 'idle' | 'away' | 'offline';

export interface UserPresence {
  userId: string;
  tenantId: string;
  activityStatus: PresenceStatus;
  lastSeenAt: string;
  currentRoute?: string;
  connectionCount: number;
}

// ─── Financial Operations Engine (WS-047) ───────────────────────────
// Universal accounting primitives: GL, AP, AR, periods, waterfalls.
// Industry-agnostic — a "settlement receipt" and "customer payment" are
// the same Receivable; a "lien payoff" and "vendor invoice" are the same Payable.

export type AccountType = 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';

export interface GlAccount {
  id: string;
  accountNumber: string;
  accountName: string;
  accountType: AccountType;
  normalBalance: 'debit' | 'credit'; // auto-set: asset/expense=debit, all others=credit
  parentAccountId?: string;
  isActive: boolean;
}

export interface AccountingPeriod {
  id: string;
  periodName: string;
  periodStart: string;  // ISO date YYYY-MM-DD
  periodEnd: string;    // ISO date YYYY-MM-DD
  fiscalYear: number;
  status: 'open' | 'closed';
  closeApproverRole?: string;
  closedAt?: string;
  closedBy?: string;
}

export interface JournalLine {
  id: string;
  entryId: string;
  accountId: string;
  debitAmount: number;  // >= 0; only one of debit/credit may be > 0 per line
  creditAmount: number;
  memo?: string;
  lineOrder: number;
}

export type PostingStatus = 'draft' | 'pending_approval' | 'approved' | 'posted';
export type JournalSourceType = 'manual' | 'ap_payment' | 'ar_receipt' | 'disbursement' | 'reversal';

export interface JournalEntry {
  id: string;
  entryRef: string;            // auto: JE-YYYYMM-######
  transactionDate: string;     // ISO date
  description: string;
  postingStatus: PostingStatus;
  debitTotal: number;          // SUM of lines.debitAmount
  creditTotal: number;         // SUM of lines.creditAmount — must equal debitTotal to post
  sourceType: JournalSourceType;
  sourceRefId?: string;        // payable, receivable, or waterfall ID that created this
  reversesEntryId?: string;
  periodId: string;
  createdBy: string;
  createdAt: string;
  lines: JournalLine[];
}

export type PaymentStatus = 'outstanding' | 'partial' | 'paid' | 'disputed';
export type ApprovalStatus = 'draft' | 'pending_approval' | 'approved' | 'paid';

export interface Payable {
  id: string;
  payableRef: string;          // auto: AP-YYYYMM-######
  payableTo: string;
  counterpartyId?: string;
  externalRef?: string;        // invoice #, lien ID, PO #
  obligationDate: string;
  dueDate: string;
  amountDue: number;
  amountPaid: number;
  paymentStatus: PaymentStatus;
  approvalStatus: ApprovalStatus;
  glEntryId?: string;
  liabilityAccountId: string;
  expenseAccountId: string;
  notes?: string;
  createdBy: string;
  createdAt: string;
}

export type ReceiptStatus = 'pending' | 'received' | 'partial' | 'written_off';

export interface Receivable {
  id: string;
  receivableRef: string;       // auto: AR-YYYYMM-######
  receivableFrom: string;
  counterpartyId?: string;
  sourceRecordId?: string;
  invoicedAmount: number;
  receivedAmount: number;
  receiptDate?: string;
  receiptStatus: ReceiptStatus;
  glEntryId?: string;
  arAccountId: string;
  revenueAccountId: string;
  notes?: string;
  createdBy: string;
  createdAt: string;
}

export interface FinancialCounterparty {
  id: string;
  name: string;
  counterpartyType: string;    // tenant-defined: "vendor", "customer", "lienholder", etc.
  defaultLiabilityAccountId?: string;
  defaultExpenseAccountId?: string;
  paymentMethod?: 'ach' | 'wire' | 'check';
  isActive: boolean;
}

export type WaterfallStatus = 'draft' | 'pending_approval' | 'approved' | 'executing' | 'complete' | 'failed';

export interface WaterfallParty {
  id: string;
  waterfallId: string;
  partyName: string;
  partyRole: string;           // tenant-defined: "attorney_fee", "client", "lienholder", etc.
  paymentAmount: number;
  paymentMethod?: 'ach' | 'wire' | 'check';
  paymentStatus: 'pending' | 'sent' | 'confirmed';
  counterpartyId?: string;
}

export interface DistributionWaterfall {
  id: string;
  waterfallRef: string;
  sourceRecordId?: string;
  receivableId?: string;
  totalAmount: number;
  executionStatus: WaterfallStatus;
  glEntryId?: string;
  description?: string;
  createdBy: string;
  createdAt: string;
  parties: WaterfallParty[];
}

// Layer 1 validator error codes — enforced synchronously, cannot be bypassed
export type FinancialValidationErrorCode =
  | 'DOUBLE_ENTRY_IMBALANCE'
  | 'POSTING_PERIOD_CLOSED'
  | 'GL_FIELD_LOCKED'
  | 'SEGREGATION_OF_DUTIES_VIOLATION'
  | 'WATERFALL_IMBALANCE'
  | 'LINE_BOTH_SIDES'
  | 'NEGATIVE_CLIENT_NET';

export interface FinancialValidationError {
  errorCode: FinancialValidationErrorCode;
  message: string;
  detail?: Record<string, unknown>;
}

// ─── Automated Workflow Chains & Vendor Management (WS-049) ─────────────────
// Logic lives in data, not code. A deployment configuration defines which
// chain steps run, in what order, with what parameters. No chain step needs
// to know about the full chain — only its trigger event and output action.
// Any business can configure these primitives for their specific workflows.

// ── Configurable waterfall party amount formulas ──────────────────────────────
// pct_of_total:  amount = settlementAmount × pct (or pctField value from record)
// pct_of_party:  amount = otherPartyAmount × pct (for co-counsel splits etc.)
// fixed:         amount = fixedAmount (or amountField value from record)
// remainder:     amount = total − sum of all other party amounts
export type AmountCalcType = 'pct_of_total' | 'pct_of_party' | 'fixed' | 'remainder';

export interface AmountCalculation {
  type: AmountCalcType;
  pct?: number;          // 0.0–1.0 fixed percentage
  pctField?: string;     // field slug carrying the percentage dynamically
  ofPartyRole?: string;  // for pct_of_party — which other party's amount to percentage
  fixedAmount?: number;
  amountField?: string;  // field slug carrying a dynamic fixed amount
}

// A single party definition inside a configurable waterfall template.
// partyRole is any tenant-defined string — not locked to any industry.
export interface WaterfallPartyDefinition {
  partyRole: string;                     // "attorney_fee" | "client" | "lienholder" | any string
  partyLabel: string;                    // human display label
  amountCalculation: AmountCalculation;
  paymentMethodSource?: string;          // 'config:ach' | 'field:{slug}'
  required: boolean;
}

// ── Signal Studio financial action types ─────────────────────────────────────
export type FinancialActionType =
  | 'financial.create_payable'
  | 'financial.create_receivable'
  | 'financial.post_journal_entry'
  | 'financial.create_waterfall'
  | 'financial.request_period_close'
  | 'financial.run_reconciliation_match'
  | 'signal.push_alert'
  | 'signal.update_field'
  | 'signal.validate_and_route';

// All action parameters stored as data — every key is optional because
// different action types use different subsets. Fully extensible.
export interface ChainActionParameters {
  // financial.create_payable
  fieldMapSource?: string;
  payableToField?: string;
  amountField?: string;
  dueDateField?: string;
  externalRefField?: string;
  liabilityAccountId?: string;
  expenseAccountId?: string;
  // financial.create_waterfall
  totalAmountSource?: string;
  sourceRecordIdSource?: string;
  partyDefinitions?: WaterfallPartyDefinition[];
  // financial.post_journal_entry
  entryLines?: Array<{ accountId: string; debitSource: string; creditSource: string; memo: string }>;
  transactionDateSource?: string;
  descriptionTemplate?: string;
  sourceType?: JournalSourceType;
  sourceRefField?: string;
  // signal.push_alert
  alertSeverity?: 'low' | 'medium' | 'high' | 'critical';
  alertRoleTarget?: string;
  alertMessageTemplate?: string;
  // signal.validate_and_route
  requiredFields?: string[];
  onPassStatus?: string;
  onFailRoute?: string;
  [key: string]: unknown;
}

// One step in a workflow chain — trigger event + action + parameters
export interface ChainStep {
  id: string;
  stepOrder: number;
  triggerEvent: string;              // the event this step waits for
  actionType: FinancialActionType;
  parameters: ChainActionParameters;
  isHumanJudgmentPoint: boolean;     // true = chain pauses, human must act
  failureBehavior: 'dead_letter' | 'skip' | 'halt_chain';
  description: string;
}

// A complete workflow chain stored as configuration — not code
export interface WorkflowChainDefinition {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  chainType: 'ap_inbound' | 'ar_inbound' | 'period_close' | 'exception' | 'custom';
  isActive: boolean;
  steps: ChainStep[];
  automationPct: number;   // (non-human steps / total steps) × 100
  industry?: string;       // "legal_pi" etc. — demo labeling only, not logic
  createdAt: string;
  createdBy: string;
}

// ── Vendor Management ─────────────────────────────────────────────────────────
export interface Vendor {
  id: string;
  tenantId: string;
  vendorName: string;
  vendorCode: string;
  defaultExpenseAccountId?: string;
  defaultLiabilityAccountId?: string;
  paymentMethod: 'ach' | 'wire' | 'check';
  paymentInstructions?: string;    // encrypted at rest, masked in API responses
  taxId?: string;                  // encrypted, masked in API responses (#pii)
  isActive: boolean;
  contactName?: string;
  contactEmail?: string;           // #pii
  createdAt: string;
  createdBy: string;
}

// ── AP Invoice (formal vendor invoice tracking, distinct from simple Payable) ─
export type ApInvoiceStatus = 'draft' | 'pending_approval' | 'approved' | 'paid' | 'disputed';

export interface ApInvoice {
  id: string;
  tenantId: string;
  invoiceRef: string;              // auto: API-YYYYMM-######
  vendorId: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  amountDue: number;
  amountPaid: number;
  paymentStatus: 'outstanding' | 'partial' | 'paid' | 'disputed';
  invoiceStatus: ApInvoiceStatus;
  glEntryId?: string;              // populated on approval — auto-GL DEBIT expense / CREDIT ap
  apAccountId: string;
  expenseAccountId: string;
  notes?: string;
  createdAt: string;
  createdBy: string;
}
