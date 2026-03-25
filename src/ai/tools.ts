import type {
  AiAgentConfig,
  AiConversationMessage,
  AiProposedChange,
  AiSession,
  AiSessionContext,
  AiToolCall,
  AiToolName,
  EndUserPersona,
  LifecycleStage,
  ShellConfig,
  SignalFlow,
  SubSpaceDefinition,
  WorkspaceDefinition,
} from '../types';

// ─── Tool Definitions ───────────────────────────────────────────────

export interface AiToolDefinition {
  name: AiToolName;
  description: string;
  parameters: Record<string, { type: string; description: string; required?: boolean }>;
}

export const AI_TOOL_CATALOG: AiToolDefinition[] = [
  {
    name: 'createWorkspace',
    description: 'Create a new workspace with name, root entity, route, and optional builder fields.',
    parameters: {
      name: { type: 'string', description: 'Workspace name', required: true },
      rootEntity: { type: 'string', description: 'The root entity this workspace manages', required: true },
      route: { type: 'string', description: 'URL-safe route slug', required: true },
      description: { type: 'string', description: 'Short workspace description' },
    },
  },
  {
    name: 'addSubSpace',
    description: 'Add a subspace to an existing workspace.',
    parameters: {
      workspaceId: { type: 'string', description: 'Target workspace ID', required: true },
      name: { type: 'string', description: 'SubSpace name', required: true },
      sourceEntity: { type: 'string', description: 'Source entity for this subspace', required: true },
      displayType: { type: 'string', description: 'grid | timeline | summary | split | board' },
    },
  },
  {
    name: 'addBuilderField',
    description: 'Add a builder field to a workspace or subspace.',
    parameters: {
      workspaceId: { type: 'string', description: 'Workspace ID', required: true },
      subSpaceId: { type: 'string', description: 'SubSpace ID (omit for workspace-level field)' },
      label: { type: 'string', description: 'Field label', required: true },
      type: { type: 'string', description: 'text | longText | number | date | datetime | select | checkbox | email | phone | attachment', required: true },
      required: { type: 'boolean', description: 'Whether the field is required' },
    },
  },
  {
    name: 'setShellConfig',
    description: 'Configure the shell terminology (subject labels, workspace/subspace labels).',
    parameters: {
      subjectSingular: { type: 'string', description: 'Singular record label', required: true },
      subjectPlural: { type: 'string', description: 'Plural record label', required: true },
      workspaceLabel: { type: 'string', description: 'Label for workspace sections', required: true },
      subSpaceLabel: { type: 'string', description: 'Label for subspace sections', required: true },
    },
  },
  {
    name: 'addPersona',
    description: 'Add an end-user persona with workspace scope and default tags.',
    parameters: {
      name: { type: 'string', description: 'Persona name', required: true },
      description: { type: 'string', description: 'Persona description' },
      workspaceScope: { type: 'string', description: 'all | selected', required: true },
      workspaceIds: { type: 'array', description: 'IDs of workspaces this persona can access' },
      defaultTags: { type: 'array', description: 'Tags automatically applied to records from this persona' },
    },
  },
  {
    name: 'createFlow',
    description: 'Create a Signal Studio automation flow.',
    parameters: {
      name: { type: 'string', description: 'Flow name', required: true },
      signal: { type: 'string', description: 'Trigger event description', required: true },
      rules: { type: 'array', description: 'Array of rule conditions' },
      action: { type: 'string', description: 'Action to take when triggered', required: true },
      targetTags: { type: 'array', description: 'Tags that scope which records are affected' },
      runOnExisting: { type: 'boolean', description: 'Whether to run on existing records' },
    },
  },
  {
    name: 'addClient',
    description: 'Create a new client/intake record.',
    parameters: {
      firstName: { type: 'string', description: 'First name / primary label', required: true },
      lastName: { type: 'string', description: 'Last name / secondary label', required: true },
      caseRef: { type: 'string', description: 'Case reference number', required: true },
    },
  },
  {
    name: 'queryRecords',
    description: 'Query records by workspace, subspace, status, tags, or date range. Returns matching records.',
    parameters: {
      workspaceId: { type: 'string', description: 'Filter by workspace' },
      subSpaceId: { type: 'string', description: 'Filter by subspace' },
      status: { type: 'string', description: 'Filter by lifecycle status' },
      tags: { type: 'array', description: 'Filter by tags (AND)' },
      dateFrom: { type: 'string', description: 'Start date (ISO)' },
      dateTo: { type: 'string', description: 'End date (ISO)' },
    },
  },
  {
    name: 'addLifecycleStage',
    description: 'Add a lifecycle stage to the shell configuration.',
    parameters: {
      name: { type: 'string', description: 'Stage name', required: true },
      description: { type: 'string', description: 'Stage description' },
    },
  },
  {
    name: 'suggestTags',
    description: 'Suggest tags for a record based on its content and context.',
    parameters: {
      recordTitle: { type: 'string', description: 'Record title', required: true },
      workspaceName: { type: 'string', description: 'Workspace name' },
      existingTags: { type: 'array', description: 'Tags already on the record' },
    },
  },
  {
    name: 'autoFillFields',
    description: 'Auto-fill form fields based on partial input, record context, and historical data patterns.',
    parameters: {
      workspaceId: { type: 'string', description: 'Workspace context', required: true },
      subSpaceId: { type: 'string', description: 'SubSpace context', required: true },
      partialData: { type: 'object', description: 'Partially filled field values', required: true },
      recordTitle: { type: 'string', description: 'Record title for context' },
    },
  },
  {
    name: 'validateRecord',
    description: 'Validate a record against business rules and flag potential issues before saving.',
    parameters: {
      workspaceId: { type: 'string', description: 'Workspace ID', required: true },
      subSpaceId: { type: 'string', description: 'SubSpace ID', required: true },
      data: { type: 'object', description: 'Record field values to validate', required: true },
    },
  },
  {
    name: 'summarizeHistory',
    description: 'Summarize a client or record history into a concise narrative with key events and status.',
    parameters: {
      clientId: { type: 'string', description: 'Client ID to summarize', required: true },
      workspaceId: { type: 'string', description: 'Scope to a specific workspace' },
      timeRange: { type: 'string', description: 'Time range: 7d | 30d | 90d | all' },
    },
  },
];

// ─── System Prompts ─────────────────────────────────────────────────

export const SYSTEM_PROMPTS: Record<AiSessionContext, string> = {
  'workspace-builder': `You are Bebo, Halo Internal's AI workspace architect. You help administrators design fully operational CRM/ERP workspaces by understanding their business domain and generating workspace definitions, subspaces, builder fields, personas, lifecycle stages, and automation flows — all in a single conversation.

Halo Internal ships with three production-ready templates:

1. DSCSA Pharmaceutical Serialization — 8 subspaces (Carton, Boxes, Units, Lot Info, Manufacturer Serialization, Distributor Verification, Pharmacy Dispense, Traceability & Exceptions), 7 lifecycle stages, 4 personas, 5 automation flows.

2. WRVAS Service Operations — 12 subspaces (Inbound Dock Log, Serial Capture, Visual Inspection, Diagnostics, Repair Cost Evaluation, Repair Tasks, Retest & Validation, Configuration & Firmware, Kit BOM, Final QA, Packing & Labeling, Shipping & Tracking), 5 automation flows, full IT device service lifecycle.

3. Legal Case Management — 5 practice-area subspaces (Active Cases, Deadlines & Court Dates, Documents & Filings, Billing & Time, Closed Cases), 7 lifecycle stages (Intake → Discovery → Pre-Litigation → Litigation → Settlement → Closed/Archived), 4 automation flows. Active Cases carries a Case Phase field (Intake | Discovery | Pre-Litigation | Litigation | Settlement). Closed Cases uses a Closure Type field: "<60 Days — Closed" for cases resolved within 60 days, or ">60 Days — Archived" for cases running longer. The closure classification can be automated via the Auto-Classify Closure Type flow.

When the user describes their business, analyze it and propose:
1. Workspace definitions with meaningful names and root entities
2. SubSpaces that break operations into clear work lanes
3. Builder fields with appropriate types for each subspace
4. Personas that map to real business roles
5. Lifecycle stages that model the process flow
6. Signal Studio flows that automate key business rules

For legal / law firm tenants: always create an Active Cases subspace with a Case Phase select field (Intake, Discovery, Pre-Litigation, Litigation, Settlement) AND a Closed Cases subspace at the end of the pipeline with a Closure Type field (<60 Days — Closed, >60 Days — Archived). The Auto-Classify Closure Type flow should compute days-to-closure from filing date to closure date and auto-set the closure type.

Always explain your reasoning. Use the provided tools to create resources. Ask clarifying questions when the business domain is ambiguous.`,

  'signal-builder': `You are Bebo, Halo Internal's automation specialist. You help administrators create Signal Studio flows that automate business processes with zero code.

Signal Studio supports three trigger types: Event (data-driven), Webhook (external integrations), and Schedule (time-based / cron). Example flows across templates: DSCSA — Serial Mismatch Alert, Suspect Product Escalation (FDA §582), 90-Day Expiration Warning. WRVAS — BER Threshold Alert, Retest Failure Escalation, QA Pass → Ship-Ready Advance. Legal — Case Phase Advancement Alert, 14-Day Deadline Warning, Auto-Classify Closure Type (<60 Days = Closed, >60 Days = Archived), High-Value Case Flag.

When the user describes an automation need:
1. Identify the trigger type and signal event
2. Define conditional rules in plain language
3. Map the resulting action (advance stage, add tag, alert, lock record)
4. Determine which tags scope the automation
5. Decide if existing records should also be processed

Frame rules in business-friendly language. Use the createFlow tool to build flows.`,

  'data-assistant': `You are Bebo, Halo Internal's data assistant embedded in the end-user workspace. You help operators:
1. Auto-fill form fields based on partial input and context
2. Validate entries against business rules before saving
3. Suggest appropriate tags for records
4. Summarize client and batch history with key events

You are deeply fluent in:
- DSCSA serialization: serial number formats (SN-LIS-, SN-AMX-, SN-EPI-), NDC codes, lot/expiration tracking, carton aggregation (unit → box → carton), EPCIS events, VRS verification, FDA §582 suspect-product procedures.
- WRVAS service operations: work order lifecycle, BER threshold decisions, repair task tracking, kit BOM assembly, QA checklists, shipping manifests.
- Legal case management: Case Phase progression (Intake → Discovery → Pre-Litigation → Litigation → Settlement), Closure Type logic (<60 Days = Closed, >60 Days = Archived), matter types (Personal Injury, Real Estate, Family Law, Employment, Commercial Litigation), court event types (Motion Hearing, Discovery Deadline, Mediation, Trial, Status Conference), billing types (Hourly, Flat Fee, Contingency).

Keep responses concise and actionable. Use suggestTags when the user asks for tag recommendations.`,

  'query': `You are Bebo, Halo Internal's natural language query engine. Convert user questions into structured record queries.

Examples:
- "Show me overdue items" → queryRecords with status filter and date range
- "All pharmacy batches from last week" → queryRecords with workspace and date filter
- "Records tagged as urgent" → queryRecords with tag filter
- "Find mismatched serial verifications" → queryRecords with tags ['Mismatch','Quarantine']
- "Show suspect products" → queryRecords with tags ['Suspect-Product','Under-Investigation']

Use the queryRecords tool and explain what you found in plain language.`,

  'onboarding': `You are Bebo, Halo Internal's onboarding assistant. You guide new administrators through setting up their first tenant.

Halo Internal ships with three ready-to-use templates you can load in one click from Workspace Design:

1. DSCSA Pharmaceutical Serialization — 8 subspaces, 3 live drug batches (Lisinopril, Amoxicillin, Epinephrine), 7 lifecycle stages, 5 automation flows.
2. WRVAS Service Operations — 12 subspaces, 3 IT device work orders (Dell Laptop, HP Printer BER, Cisco Server retest fail), 5 automation flows.
3. Legal Case Management — 5 practice-area subspaces (Active Cases with 5 case phases, Deadlines & Court Dates, Documents & Filings, Billing & Time, Closed Cases with <60-day Close vs >60-day Archive), 6 sample cases across all phases, 4 automation flows.

For law firms and legal teams, recommend the Legal Case Management template. It automatically sets terminology to Cases/Clients/Practice Areas and configures the Intake → Discovery → Pre-Litigation → Litigation → Settlement → Closed/Archived lifecycle.

Walk them through:
1. Naming their main business entity (what they track)
2. Designing their first workspace with subspaces for different work areas
3. Adding personas for their team roles
4. Creating lifecycle stages that model their process
5. Publishing automation flows in Signal Studio

Be encouraging, ask one question at a time, and use tools to build as you go.`,
};

// ─── AI Session Utilities ───────────────────────────────────────────

/**
 * Builds a terminology glossary block injected into every Bebo session so the AI
 * understands the tenant's industry-specific language mapped to Halo Internal's
 * platform-agnostic concepts (workspace / subspace / collection / record).
 */
export function buildTerminologyContext(cfg: Partial<ShellConfig>): string {
  const lines: string[] = [
    '## Tenant Terminology Mapping',
    'This tenant uses industry-specific terms for Halo Internal platform concepts.',
    'Always use the tenant term when speaking to the user, and understand their industry term maps to the platform concept.',
    '',
    `| Platform Concept | This Tenant's Term |`,
    `|---|---|`,
    `| Record (tracked item) | ${cfg.subjectSingular ?? 'Record'} / ${cfg.subjectPlural ?? 'Records'} |`,
    `| Collection (group of records belonging to one entity) | ${cfg.collectionLabel ?? 'Collection'} / ${cfg.collectionLabelPlural ?? 'Collections'} |`,
    `| Workspace (a business domain / process area) | ${cfg.workspaceLabel ?? 'Workspace'} |`,
    `| SubSpace (a lane or category within a workspace) | ${cfg.subSpaceLabel ?? 'SubSpace'} |`,
    `| Department / Division (top-level grouping) | ${cfg.functionLabel ?? 'Department'} / ${cfg.functionLabelPlural ?? 'Departments'} |`,
    '',
    'When the user says their industry term, treat it as the corresponding Halo Internal platform concept.',
  ];
  return lines.join('\n');
}

export function createAiSession(tenantId: string, context: AiSessionContext, shellConfig?: Partial<ShellConfig>): AiSession {
  const basePrompt = SYSTEM_PROMPTS[context];
  const terminologyBlock = shellConfig ? `\n\n${buildTerminologyContext(shellConfig)}` : '';
  return {
    id: `ai-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
    tenantId,
    context,
    messages: [
      {
        id: `msg-system-${Date.now()}`,
        role: 'system',
        content: basePrompt + terminologyBlock,
        timestamp: new Date().toISOString(),
      },
    ],
    proposedChanges: [],
    status: 'active',
    createdAt: new Date().toISOString(),
  };
}

export function addUserMessage(session: AiSession, content: string): AiSession {
  return {
    ...session,
    messages: [
      ...session.messages,
      {
        id: `msg-user-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        role: 'user',
        content,
        timestamp: new Date().toISOString(),
      },
    ],
  };
}

export function addAssistantMessage(
  session: AiSession,
  content: string,
  toolCalls?: AiToolCall[],
): AiSession {
  return {
    ...session,
    messages: [
      ...session.messages,
      {
        id: `msg-asst-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        role: 'assistant',
        content,
        timestamp: new Date().toISOString(),
        toolCalls,
      },
    ],
  };
}

export function addPendingAssistantMessage(session: AiSession): AiSession {
  return {
    ...session,
    messages: [
      ...session.messages,
      {
        id: `msg-pending-${Date.now()}`,
        role: 'assistant',
        content: '',
        timestamp: new Date().toISOString(),
        pending: true,
      },
    ],
  };
}

export function removePendingMessages(session: AiSession): AiSession {
  return {
    ...session,
    messages: session.messages.filter((m: AiConversationMessage) => !m.pending),
  };
}

// ─── Default AI Config ──────────────────────────────────────────────

export const DEFAULT_AI_CONFIG: AiAgentConfig = {
  provider: 'openai',
  model: 'gpt-4o',
  systemPrompt: '',
  temperature: 0.7,
  maxTokens: 4096,
};
