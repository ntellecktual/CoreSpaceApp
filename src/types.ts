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
  logoUri?: string;
  brandColors: [string, string, string];
  employeeTitles: string[];
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
  | 'integration';

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
  | 'system';

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
