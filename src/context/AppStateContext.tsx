import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { defaultData } from '../data/defaultData';
import { todayFormatted } from '../formatDate';
import { PlatformSnapshot } from '../persistence/cosmos';
import { mapPlatformSnapshotForTargets, normalizePortabilityTargets, PortableDatabaseTarget } from '../persistence/portable';
import {
  AccountingPeriod,
  AppData,
  AuthProvider,
  AuthSession,
  AuthUser,
  BusinessFunction,
  BusinessObject,
  ClientProfile,
  DistributionWaterfall,
  FieldMappingTemplate,
  FieldTagRecord,
  FinancialCounterparty,
  FinancialValidationError,
  FlowRunEntry,
  FormDefinition,
  FormFieldDefinition,
  GlAccount,
  IngestionRecord,
  IngestionReviewStatus,
  IngestionSourceConfig,
  IntegrationActivation,
  JournalEntry,
  Payable,
  PermissionTemplate,
  Receivable,
  RoleDefinition,
  RuntimeRecord,
  ShellConfig,
  SignalFlow,
  SubSpaceBuilderFieldType,
  SubSpaceDefinition,
  TenantBrandingProfile,
  UserPresence,
  WorkspaceDefinition,
} from '../types';

const STORAGE_KEY = 'corespace.crm.v6';
const COSMOS_SHADOW_KEY = 'corespace.cosmos.shadow.v1';
const PORTABILITY_SHADOW_KEY = 'corespace.portability.shadow.v1';
const COSMOS_SHADOW_ENABLED = process.env.EXPO_PUBLIC_ENABLE_COSMOS_SNAPSHOT === 'true';
const PORTABILITY_TARGETS = normalizePortabilityTargets(
  (process.env.EXPO_PUBLIC_DB_PORTABILITY_TARGETS ?? 'cosmos,postgres,mongodb').split(','),
);
const LEGACY_MIGRATION_ENABLED = process.env.EXPO_PUBLIC_ENABLE_LEGACY_STORAGE_MIGRATION === 'true';
const LEGACY_STORAGE_KEYS = ['corespace.crm.v5', 'doowi.crm.v1', 'sheerview.crm.v1'];
const REMOVED_DEFAULT_ROLE_IDS = new Set(['role-operations-user', 'role-read-only']);
const DEFAULT_TENANT_ID = 'tenant-a';
const DEFAULT_TENANT_NAME = 'Tenant A';
const DEFAULT_TENANT_BRAND_COLORS: [string, string, string] = ['#120C23', '#1A1230', '#8C5BF5'];
const DEFAULT_END_USER_TITLES = ['Operations Coordinator', 'Case Specialist', 'Compliance Officer'];
const DEFAULT_WIDGET_TWO_COLUMN_BREAKPOINT = 1280;

type AuthResult = { ok: boolean; message: string };

interface AppStateContextValue {
  data: AppData;
  hydrated: boolean;
  currentUser: AuthUser | null;
  isSuperAdmin: boolean;
  tenants: { id: string; name: string; branding: TenantBrandingProfile }[];
  activeTenantId: string;
  activeTenantName: string;
  activeTenantBranding: TenantBrandingProfile;
  createTenant: (name: string, branding?: Partial<TenantBrandingProfile>) => { ok: boolean; tenantId?: string; reason?: string };
  switchTenant: (tenantId: string) => { ok: boolean; reason?: string };
  renameTenant: (tenantId: string, name: string) => { ok: boolean; reason?: string };
  updateTenantBranding: (tenantId: string, branding: Partial<TenantBrandingProfile>) => { ok: boolean; reason?: string };
  exportTenantDataset: (
    tenantId: string,
    target: PortableDatabaseTarget,
  ) => { ok: boolean; reason?: string; fileName?: string; mimeType?: string; payload?: string };
  copyActiveDataToAllTenants: () => { ok: boolean; reason?: string; count?: number };
  upsertShellConfig: (config: ShellConfig) => void;
  setActiveRoleId: (roleId: string) => void;
  upsertRole: (role: RoleDefinition) => RoleDefinition;
  deleteRole: (roleId: string) => { ok: boolean; reason?: string };
  upsertPermissionTemplate: (template: PermissionTemplate) => PermissionTemplate;
  deletePermissionTemplate: (templateId: string) => { ok: boolean; reason?: string };
  addClient: (client: ClientProfile) => ClientProfile;
  upsertWorkspace: (workspace: WorkspaceDefinition) => void;
  deleteWorkspace: (workspaceId: string) => { ok: boolean; reason?: string };
  addSubSpace: (workspaceId: string, subSpace: SubSpaceDefinition) => { ok: boolean; reason?: string };
  deleteSubSpace: (workspaceId: string, subSpaceId: string) => { ok: boolean; reason?: string };
  updateSubSpace: (workspaceId: string, subSpace: SubSpaceDefinition) => void;
  addRecord: (record: RuntimeRecord) => void;
  updateRecord: (recordId: string, updates: Partial<Omit<RuntimeRecord, 'id'>>) => void;
  deleteRecord: (recordId: string) => { ok: boolean; reason?: string };
  upsertFlow: (flow: SignalFlow) => void;
  getFormForSubSpace: (workspaceId: string, subSpaceId: string) => FormDefinition | undefined;
  activateIntegration: (activation: IntegrationActivation) => void;
  updateIntegration: (id: string, updates: Partial<Omit<IntegrationActivation, 'id'>>) => void;
  deactivateIntegration: (id: string) => { ok: boolean; reason?: string };
  businessFunctions: BusinessFunction[];
  upsertBusinessFunction: (fn: BusinessFunction) => void;
  deleteBusinessFunction: (fnId: string) => { ok: boolean; reason?: string };
  upsertBusinessObject: (fnId: string, obj: BusinessObject) => void;
  deleteBusinessObject: (fnId: string, objId: string) => { ok: boolean; reason?: string };
  addFlowRunEntry: (entry: FlowRunEntry) => void;
  signInWithEmail: (email: string, password: string) => AuthResult;
  signInWithProvider: (provider: Exclude<AuthProvider, 'email'>) => AuthResult;
  createAccount: (fullName: string, email: string, password: string, asAdmin: boolean) => AuthResult;
  signOut: () => void;
  // ─── Financial Operations Engine ───────────────────────────────
  addGlAccount: (account: Omit<GlAccount, 'id'>) => GlAccount;
  updateGlAccount: (id: string, updates: Partial<Omit<GlAccount, 'id'>>) => { ok: boolean; reason?: string };
  addJournalEntry: (entry: Omit<JournalEntry, 'id' | 'entryRef' | 'postingStatus' | 'debitTotal' | 'creditTotal'>) => { ok: boolean; entry?: JournalEntry; errors?: FinancialValidationError[] };
  submitJournalEntryForApproval: (entryId: string) => { ok: boolean; reason?: string };
  postJournalEntry: (entryId: string, posterId: string) => { ok: boolean; errors?: FinancialValidationError[] };
  addPayable: (payable: Omit<Payable, 'id' | 'payableRef'>) => Payable;
  approvePayable: (payableId: string, approverId: string) => { ok: boolean; reason?: string };
  markPayablePaid: (payableId: string, paidAmount: number) => { ok: boolean; reason?: string };
  addReceivable: (receivable: Omit<Receivable, 'id' | 'receivableRef'>) => Receivable;
  confirmReceivable: (receivableId: string, receivedAmount: number) => { ok: boolean; reason?: string };
  addFinancialCounterparty: (cp: Omit<FinancialCounterparty, 'id'>) => FinancialCounterparty;
  addWaterfall: (waterfall: Omit<DistributionWaterfall, 'id' | 'waterfallRef'>) => { ok: boolean; waterfall?: DistributionWaterfall; errors?: FinancialValidationError[] };
  approveWaterfall: (waterfallId: string, approverId: string) => { ok: boolean; errors?: FinancialValidationError[] };
  addAccountingPeriod: (period: Omit<AccountingPeriod, 'id'>) => AccountingPeriod;
  closeAccountingPeriod: (periodId: string, closedBy: string) => { ok: boolean; reason?: string };
  // ─── Ingestion Layer (WS-048) ─────────────────────────────────
  addIngestionRecord: (record: Omit<IngestionRecord, 'id'>) => IngestionRecord;
  confirmIngestionRecord: (recordId: string, correctedValues: Record<string, string>, reviewedBy: string) => { ok: boolean; reason?: string };
  rejectIngestionRecord: (recordId: string, reason: string, rejectedBy: string) => { ok: boolean };
  updateIngestionSourceConfig: (id: string, updates: Partial<Omit<IngestionSourceConfig, 'id'>>) => { ok: boolean };
  applyFieldTag: (tag: Omit<FieldTagRecord, 'id'>) => FieldTagRecord;
  isFieldLocked: (recordType: string, recordId: string, fieldSlug: string) => { locked: boolean; tagName?: string; appliedByEvent?: string };
  updateUserPresence: (userId: string, updates: Partial<Omit<UserPresence, 'userId' | 'tenantId'>>) => void;
}

const AppStateContext = createContext<AppStateContextValue | undefined>(undefined);

type TenantRecord = {
  id: string;
  name: string;
  branding: TenantBrandingProfile;
  data: AppData;
};

type PersistedPlatformState = {
  version: 'tenant-v1' | 'tenant-v2';
  tenants: TenantRecord[];
  activeTenantId: string;
  users: AuthUser[];
  session: AuthSession | null;
};

function uid(prefix: string) {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  const bytes = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${prefix}-${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function normalizeHexColor(value: string | undefined, fallback: string) {
  const next = (value ?? '').trim();
  if (!next) {
    return fallback;
  }
  const withHash = next.startsWith('#') ? next : `#${next}`;
  return /^#[0-9a-fA-F]{6}$/.test(withHash) ? withHash.toUpperCase() : fallback;
}

function normalizeWidgetBreakpoint(value: number | undefined, fallback: number) {
  if (!Number.isFinite(value)) {
    return fallback;
  }
  return Math.max(960, Math.min(1800, Math.round(value as number)));
}

function sanitizeFileName(value: string) {
  const next = value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return next || 'tenant';
}

function normalizeTenantBranding(branding?: Partial<TenantBrandingProfile>): TenantBrandingProfile {
  const colors = branding?.brandColors ?? DEFAULT_TENANT_BRAND_COLORS;
  const employeeTitles = (branding?.employeeTitles ?? DEFAULT_END_USER_TITLES)
    .map((title) => title.trim())
    .filter((title, index, all) => title.length > 0 && all.findIndex((item) => item.toLowerCase() === title.toLowerCase()) === index);

  return {
    logoUri: branding?.logoUri?.trim() || undefined,
    brandColors: [
      normalizeHexColor(colors[0], DEFAULT_TENANT_BRAND_COLORS[0]),
      normalizeHexColor(colors[1], DEFAULT_TENANT_BRAND_COLORS[1]),
      normalizeHexColor(colors[2], DEFAULT_TENANT_BRAND_COLORS[2]),
    ],
    employeeTitles: employeeTitles.length > 0 ? employeeTitles : DEFAULT_END_USER_TITLES,
    widgetTwoColumnBreakpoint: normalizeWidgetBreakpoint(branding?.widgetTwoColumnBreakpoint, DEFAULT_WIDGET_TWO_COLUMN_BREAKPOINT),
  };
}

function mapBuilderTypeToFormType(type: SubSpaceBuilderFieldType): FormFieldDefinition['type'] {
  if (type === 'number') {
    return 'number';
  }
  if (type === 'date' || type === 'datetime') {
    return 'date';
  }
  if (type === 'select' || type === 'checkbox') {
    return 'select';
  }
  return 'text';
}

function deriveFormFromSubSpace(workspace: WorkspaceDefinition, subSpace: SubSpaceDefinition): FormDefinition | undefined {
  const builderFields = subSpace.builderFields ?? [];
  if (builderFields.length === 0) {
    return undefined;
  }

  return {
    id: `derived-${workspace.id}-${subSpace.id}`,
    name: `${subSpace.name} Details`,
    workspaceId: workspace.id,
    subSpaceId: subSpace.id,
    fields: builderFields.map((field) => ({
      id: field.id,
      label: field.label,
      type: mapBuilderTypeToFormType(field.type),
      required: field.required,
      ...(field.type === 'checkbox' ? { options: ['Yes', 'No'] } : {}),
    })),
  };
}

function fallbackRoles(): RoleDefinition[] {
  return [
    {
      id: 'role-platform-admin',
      name: 'Platform Admin',
      description: 'Owns configuration, runtime operations, and automation policy.',
      permissions: ['workspace.manage', 'subspace.manage', 'client.intake', 'record.create', 'flow.publish'],
      workspaceScope: 'all',
      workspaceIds: [],
    },
  ];
}

function createBlankShellConfig(): ShellConfig {
  return {
    subjectSingular: '',
    subjectPlural: '',
    workspaceLabel: '',
    subSpaceLabel: '',
    intakeFields: [],
    personas: [],
    lifecycleStages: [],
    defaultLifecycleStageId: '',
    lifecycleTransitions: [],
  };
}

function createBlankTenantData(): AppData {
  const normalized = normalizeData(defaultData);
  return {
    ...normalized,
    shellConfig: createBlankShellConfig(),
    clients: [],
    workspaces: [],
    forms: [],
    records: [],
    flows: [],
    tagPolicies: [],
    customPermissionTemplates: [],
    activeRoleId: 'role-platform-admin',
    users: [],
    session: null,
    integrations: [],
    businessFunctions: [],
  };
}

function stripGlobalAuthFields(data: AppData): AppData {
  return {
    ...data,
    users: [],
    session: null,
  };
}

function normalizeData(parsed: Partial<AppData> & { activeRole?: string }): AppData {
  const clients = parsed.clients ?? [];
  const parsedRoles = (parsed.roles ?? []).filter((role) => !REMOVED_DEFAULT_ROLE_IDS.has(role.id));
  const roles = parsedRoles.length > 0 ? parsedRoles : fallbackRoles();
  const users = parsed.users && parsed.users.length > 0 ? parsed.users : defaultData.users;
  const session = parsed.session && users.some((user) => user.id === parsed.session?.userId) ? parsed.session : null;
  const sessionRoleId = session ? users.find((user) => user.id === session.userId)?.roleId : undefined;
  const activeRoleId = sessionRoleId ?? parsed.activeRoleId ?? parsed.activeRole ?? roles[0]?.id ?? 'role-platform-admin';
  const lifecycleStages = parsed.shellConfig?.lifecycleStages ?? defaultData.shellConfig.lifecycleStages;
  const defaultLifecycleStageId =
    parsed.shellConfig?.defaultLifecycleStageId &&
    lifecycleStages.some((stage) => stage.id === parsed.shellConfig?.defaultLifecycleStageId)
      ? parsed.shellConfig.defaultLifecycleStageId
      : lifecycleStages[0]?.id ?? (parsed.shellConfig ? '' : defaultData.shellConfig.defaultLifecycleStageId);

  return {
    appName: parsed.appName ?? defaultData.appName,
    organizations: parsed.organizations ?? defaultData.organizations,
    activeOrg: parsed.activeOrg ?? defaultData.activeOrg,
    ...parsed,
    shellConfig: {
      subjectSingular: parsed.shellConfig?.subjectSingular ?? defaultData.shellConfig.subjectSingular,
      subjectPlural: parsed.shellConfig?.subjectPlural ?? defaultData.shellConfig.subjectPlural,
      workspaceLabel: parsed.shellConfig?.workspaceLabel ?? defaultData.shellConfig.workspaceLabel,
      subSpaceLabel: parsed.shellConfig?.subSpaceLabel ?? defaultData.shellConfig.subSpaceLabel,
      functionLabel: parsed.shellConfig?.functionLabel ?? defaultData.shellConfig.functionLabel,
      functionLabelPlural: parsed.shellConfig?.functionLabelPlural ?? defaultData.shellConfig.functionLabelPlural,
      objectLabel: parsed.shellConfig?.objectLabel ?? defaultData.shellConfig.objectLabel,
      objectLabelPlural: parsed.shellConfig?.objectLabelPlural ?? defaultData.shellConfig.objectLabelPlural,
      collectionLabel: parsed.shellConfig?.collectionLabel ?? defaultData.shellConfig.collectionLabel,
      collectionLabelPlural: parsed.shellConfig?.collectionLabelPlural ?? defaultData.shellConfig.collectionLabelPlural,
      intakeFields: parsed.shellConfig?.intakeFields ?? defaultData.shellConfig.intakeFields,
      personas: parsed.shellConfig?.personas ?? defaultData.shellConfig.personas,
      lifecycleStages,
      defaultLifecycleStageId,
      lifecycleTransitions:
        (parsed.shellConfig?.lifecycleTransitions ?? defaultData.shellConfig.lifecycleTransitions).map((transition) => ({
          ...transition,
          personaIds: transition.personaIds ?? [],
        })),
    },
    roles,
    activeRoleId,
    customPermissionTemplates: (parsed.customPermissionTemplates ?? []).map((template) => ({
      ...template,
      version: template.version ?? 1,
      lineageId: template.lineageId ?? template.id,
      createdAt: template.createdAt ?? todayFormatted(),
    })),
    clients,
    records: (parsed.records ?? []).map((record) => ({
      ...record,
      clientId: record.clientId || clients[0]?.id || 'client-unassigned',
    })),
    workspaces: parsed.workspaces ?? defaultData.workspaces,
    forms: parsed.forms ?? defaultData.forms,
    flows: parsed.flows ?? defaultData.flows,
    tagPolicies: parsed.tagPolicies ?? defaultData.tagPolicies,
    users,
    session,
    integrations: parsed.integrations ?? [],
    businessFunctions: parsed.businessFunctions ?? defaultData.businessFunctions ?? [],
    flowRuns: parsed.flowRuns ?? [],
    glAccounts: parsed.glAccounts ?? (defaultData.glAccounts as GlAccount[]) ?? [],
    accountingPeriods: parsed.accountingPeriods ?? (defaultData.accountingPeriods as AccountingPeriod[]) ?? [],
    journalEntries: parsed.journalEntries ?? [],
    payables: parsed.payables ?? [],
    receivables: parsed.receivables ?? [],
    financialCounterparties: parsed.financialCounterparties ?? (defaultData.financialCounterparties as FinancialCounterparty[]) ?? [],
    waterfalls: parsed.waterfalls ?? [],
    ingestionSources: parsed.ingestionSources ?? (defaultData.ingestionSources as IngestionSourceConfig[]) ?? [],
    fieldMappingTemplates: parsed.fieldMappingTemplates ?? (defaultData.fieldMappingTemplates as FieldMappingTemplate[]) ?? [],
    ingestionRecords: parsed.ingestionRecords ?? (defaultData.ingestionRecords as IngestionRecord[]) ?? [],
    fieldTags: parsed.fieldTags ?? (defaultData.fieldTags as FieldTagRecord[]) ?? [],
    userPresence: parsed.userPresence ?? (defaultData.userPresence as UserPresence[]) ?? [],
  };
}

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [tenantRecords, setTenantRecords] = useState<TenantRecord[]>([
    {
      id: DEFAULT_TENANT_ID,
      name: DEFAULT_TENANT_NAME,
      branding: normalizeTenantBranding(),
      data: createBlankTenantData(),
    },
  ]);
  const [activeTenantId, setActiveTenantId] = useState(DEFAULT_TENANT_ID);
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const currentTenantRecord = useMemo(
    () => tenantRecords.find((tenant) => tenant.id === activeTenantId) ?? tenantRecords[0],
    [tenantRecords, activeTenantId],
  );

  const data = useMemo<AppData>(() => {
    const tenantData = currentTenantRecord?.data ?? createBlankTenantData();
    return {
      ...tenantData,
      organizations: tenantRecords.map((tenant) => tenant.name),
      activeOrg: currentTenantRecord?.name ?? DEFAULT_TENANT_NAME,
      users,
      session,
    };
  }, [currentTenantRecord, tenantRecords, users, session]);

  const setTenantData = (updater: (current: AppData) => AppData) => {
    setTenantRecords((current) =>
      current.map((tenant) => {
        if (tenant.id !== activeTenantId) {
          return tenant;
        }
        const currentData = {
          ...tenant.data,
          organizations: current.map((item) => item.name),
          activeOrg: tenant.name,
          users,
          session,
        };
        const nextData = updater(currentData);
        return {
          ...tenant,
          data: stripGlobalAuthFields(nextData),
        };
      }),
    );
  };

  useEffect(() => {
    async function hydrate() {
      try {
        let loadedKey = STORAGE_KEY;
        let raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!raw && LEGACY_MIGRATION_ENABLED) {
          for (const legacyKey of LEGACY_STORAGE_KEYS) {
            raw = await AsyncStorage.getItem(legacyKey);
            if (raw) {
              loadedKey = legacyKey;
              break;
            }
          }
        } else if (!raw) {
          await AsyncStorage.multiRemove(LEGACY_STORAGE_KEYS);
        }
        if (raw) {
          const parsed = JSON.parse(raw) as PersistedPlatformState | (Partial<AppData> & { activeRole?: string });

          if (
            (parsed as PersistedPlatformState).version === 'tenant-v1' ||
            (parsed as PersistedPlatformState).version === 'tenant-v2'
          ) {
            const platformState = parsed as PersistedPlatformState;
            const normalizedTenants = (platformState.tenants ?? []).map((tenant) => ({
              id: tenant.id,
              name: tenant.name,
              branding: normalizeTenantBranding((tenant as Partial<TenantRecord>).branding),
              data: stripGlobalAuthFields(normalizeData(tenant.data)),
            }));

            const nextTenants =
              normalizedTenants.length > 0
                ? normalizedTenants
                : [
                    {
                      id: DEFAULT_TENANT_ID,
                      name: DEFAULT_TENANT_NAME,
                      branding: normalizeTenantBranding(),
                      data: createBlankTenantData(),
                    },
                  ];

            const nextUsers = platformState.users ?? [];
            const nextSession =
              platformState.session && nextUsers.some((user) => user.id === platformState.session?.userId)
                ? platformState.session
                : null;

            const nextActiveTenantId =
              nextTenants.some((tenant) => tenant.id === platformState.activeTenantId)
                ? platformState.activeTenantId
                : nextTenants[0].id;

            setTenantRecords(nextTenants);
            setUsers(nextUsers);
            setSession(nextSession);
            setActiveTenantId(nextActiveTenantId);
          } else {
            const legacy = normalizeData(parsed as Partial<AppData> & { activeRole?: string });
            const tenantName = legacy.activeOrg?.trim() || DEFAULT_TENANT_NAME;
            const tenantData = stripGlobalAuthFields(legacy);
            const nextUsers = legacy.users ?? [];
            const nextSession = legacy.session && nextUsers.some((user) => user.id === legacy.session?.userId) ? legacy.session : null;

            setTenantRecords([
              {
                id: DEFAULT_TENANT_ID,
                name: tenantName,
                branding: normalizeTenantBranding(),
                data: tenantData,
              },
            ]);
            setUsers(nextUsers);
            setSession(nextSession);
            setActiveTenantId(DEFAULT_TENANT_ID);
          }

          if (loadedKey !== STORAGE_KEY) {
            await AsyncStorage.multiRemove(LEGACY_STORAGE_KEYS);
          }
        }
      } catch {
        await AsyncStorage.removeItem(STORAGE_KEY);
        await AsyncStorage.multiRemove(LEGACY_STORAGE_KEYS);
      } finally {
        setHydrated(true);
      }
    }
    hydrate();
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    const payload: PersistedPlatformState = {
      version: 'tenant-v2',
      tenants: tenantRecords.map((tenant) => ({
        ...tenant,
        branding: normalizeTenantBranding(tenant.branding),
        data: stripGlobalAuthFields(tenant.data),
      })),
      activeTenantId,
      users,
      session,
    };

    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(payload));

    if (COSMOS_SHADOW_ENABLED) {
      const snapshot: PlatformSnapshot = {
        activeTenantId: payload.activeTenantId,
        tenants: payload.tenants,
        users: payload.users,
        session: payload.session,
      };
      const portability = mapPlatformSnapshotForTargets(snapshot, PORTABILITY_TARGETS);

      AsyncStorage.setItem(PORTABILITY_SHADOW_KEY, JSON.stringify(portability));

      const cosmosTarget = portability.targets.cosmos;
      const documents = cosmosTarget?.records ?? [];
      AsyncStorage.setItem(
        COSMOS_SHADOW_KEY,
        JSON.stringify({
          generatedAt: portability.generatedAt,
          documentCount: documents.length,
          documents,
        }),
      );
    }
  }, [tenantRecords, activeTenantId, users, session, hydrated]);

  const value = useMemo<AppStateContextValue>(() => {
    const currentUser = session ? users.find((user) => user.id === session.userId) ?? null : null;
    const isSuperAdmin = !!currentUser?.isSuperAdmin;
    const activeTenantName = currentTenantRecord?.name ?? DEFAULT_TENANT_NAME;
    const activeTenantBranding = normalizeTenantBranding(currentTenantRecord?.branding);

    return {
      data,
      hydrated,
      currentUser,
      isSuperAdmin,
      tenants: tenantRecords.map((tenant) => ({
        id: tenant.id,
        name: tenant.name,
        branding: normalizeTenantBranding(tenant.branding),
      })),
      activeTenantId,
      activeTenantName,
      activeTenantBranding,
      createTenant: (name, branding) => {
        if (!isSuperAdmin) {
          return { ok: false, reason: 'Only super admins can create tenants.' };
        }

        const tenantName = name.trim();
        if (!tenantName) {
          return { ok: false, reason: 'Tenant name is required.' };
        }

        if (tenantRecords.some((tenant) => tenant.name.toLowerCase() === tenantName.toLowerCase())) {
          return { ok: false, reason: 'A tenant with this name already exists.' };
        }

        const tenantId = uid('tenant');
        setTenantRecords((current) => [
          ...current,
          {
            id: tenantId,
            name: tenantName,
            branding: normalizeTenantBranding(branding),
            data: createBlankTenantData(),
          },
        ]);
        setActiveTenantId(tenantId);
        return { ok: true, tenantId };
      },
      switchTenant: (tenantId) => {
        const tenant = tenantRecords.find((item) => item.id === tenantId);
        if (!tenant) {
          return { ok: false, reason: 'Tenant not found.' };
        }

        if (!isSuperAdmin) {
          const ownedTenantId = currentUser?.tenantId || activeTenantId;
          if (tenantId !== ownedTenantId) {
            return { ok: false, reason: 'Only super admins can switch tenants.' };
          }
        }

        setActiveTenantId(tenantId);
        return { ok: true };
      },
      renameTenant: (tenantId, name) => {
        if (!isSuperAdmin) {
          return { ok: false, reason: 'Only super admins can rename tenants.' };
        }

        const tenantName = name.trim();
        if (!tenantName) {
          return { ok: false, reason: 'Tenant name is required.' };
        }

        if (!tenantRecords.some((tenant) => tenant.id === tenantId)) {
          return { ok: false, reason: 'Tenant not found.' };
        }

        if (tenantRecords.some((tenant) => tenant.id !== tenantId && tenant.name.toLowerCase() === tenantName.toLowerCase())) {
          return { ok: false, reason: 'Another tenant already uses this name.' };
        }

        setTenantRecords((current) =>
          current.map((tenant) =>
            tenant.id === tenantId
              ? {
                  ...tenant,
                  name: tenantName,
                }
              : tenant,
          ),
        );
        return { ok: true };
      },
      updateTenantBranding: (tenantId, branding) => {
        if (!isSuperAdmin) {
          return { ok: false, reason: 'Only super admins can update tenant branding.' };
        }

        if (!tenantRecords.some((tenant) => tenant.id === tenantId)) {
          return { ok: false, reason: 'Tenant not found.' };
        }

        setTenantRecords((current) =>
          current.map((tenant) => {
            if (tenant.id !== tenantId) {
              return tenant;
            }

            return {
              ...tenant,
              branding: normalizeTenantBranding({
                ...tenant.branding,
                ...branding,
              }),
            };
          }),
        );

        return { ok: true };
      },
      exportTenantDataset: (tenantId, target) => {
        if (!isSuperAdmin) {
          return { ok: false, reason: 'Only super admins can export tenant datasets.' };
        }

        const tenant = tenantRecords.find((item) => item.id === tenantId);
        if (!tenant) {
          return { ok: false, reason: 'Tenant not found.' };
        }

        const snapshot: PlatformSnapshot = {
          activeTenantId: tenant.id,
          tenants: [
            {
              id: tenant.id,
              name: tenant.name,
              branding: normalizeTenantBranding(tenant.branding),
              data: stripGlobalAuthFields(tenant.data),
            },
          ],
          users: users.filter((user) => user.tenantId === tenant.id),
          session: null,
        };

        const bundle = mapPlatformSnapshotForTargets(snapshot, [target]);
        const targetExport = bundle.targets[target];
        if (!targetExport) {
          return { ok: false, reason: `Unable to map tenant data for ${target}.` };
        }

        const payload = JSON.stringify(
          {
            generatedAt: bundle.generatedAt,
            tenant: {
              id: tenant.id,
              name: tenant.name,
            },
            target,
            recordCount: targetExport.recordCount,
            records: targetExport.records,
          },
          null,
          2,
        );

        return {
          ok: true,
          fileName: `${sanitizeFileName(tenant.name)}-${target}-export.json`,
          mimeType: 'application/json',
          payload,
        };
      },
      copyActiveDataToAllTenants: () => {
        if (!isSuperAdmin) {
          return { ok: false, reason: 'Only super admins can seed all tenants.' };
        }
        if (tenantRecords.length < 2) {
          return { ok: false, reason: 'No other tenants to seed.' };
        }
        const sourceData = stripGlobalAuthFields(currentTenantRecord?.data ?? createBlankTenantData());
        setTenantRecords((current) =>
          current.map((tenant) => {
            if (tenant.id === activeTenantId) return tenant;
            return { ...tenant, data: sourceData };
          }),
        );
        return { ok: true, count: tenantRecords.length - 1 };
      },
      upsertShellConfig: (config) => {
        setTenantData((current) => ({
          ...current,
          shellConfig: config,
        }));
      },
      setActiveRoleId: (roleId) => {
        setTenantData((current) => {
          if (!current.roles.some((role) => role.id === roleId)) {
            return current;
          }
          return { ...current, activeRoleId: roleId };
        });
      },
      upsertRole: (role) => {
        const nextRole = {
          ...role,
          id: role.id || uid('role'),
        };
        setTenantData((current) => {
          const exists = current.roles.some((item) => item.id === nextRole.id);
          if (!exists) {
            return {
              ...current,
              roles: [nextRole, ...current.roles],
            };
          }
          return {
            ...current,
            roles: current.roles.map((item) => (item.id === nextRole.id ? nextRole : item)),
          };
        });
        return nextRole;
      },
      deleteRole: (roleId) => {
        let result: { ok: boolean; reason?: string } = { ok: true };
        setTenantData((current) => {
          if (current.roles.length <= 1) {
            result = { ok: false, reason: 'At least one role must remain configured.' };
            return current;
          }

          const nextRoles = current.roles.filter((role) => role.id !== roleId);
          if (nextRoles.length === current.roles.length) {
            result = { ok: false, reason: 'Role not found.' };
            return current;
          }

          return {
            ...current,
            roles: nextRoles,
            activeRoleId: current.activeRoleId === roleId ? nextRoles[0].id : current.activeRoleId,
          };
        });
        return result;
      },
      upsertPermissionTemplate: (template) => {
        const nextTemplate = {
          ...template,
          id: template.id || uid('template'),
          version: template.version ?? 1,
          lineageId: template.lineageId ?? template.id ?? uid('lineage'),
          createdAt: template.createdAt ?? todayFormatted(),
        };
        setTenantData((current) => {
          const exists = current.customPermissionTemplates.some((item) => item.id === nextTemplate.id);
          if (!exists) {
            return {
              ...current,
              customPermissionTemplates: [nextTemplate, ...current.customPermissionTemplates],
            };
          }
          return {
            ...current,
            customPermissionTemplates: current.customPermissionTemplates.map((item) =>
              item.id === nextTemplate.id ? nextTemplate : item,
            ),
          };
        });
        return nextTemplate;
      },
      deletePermissionTemplate: (templateId) => {
        let result: { ok: boolean; reason?: string } = { ok: true };
        setTenantData((current) => {
          const nextTemplates = current.customPermissionTemplates.filter((item) => item.id !== templateId);
          if (nextTemplates.length === current.customPermissionTemplates.length) {
            result = { ok: false, reason: 'Template not found.' };
            return current;
          }
          return {
            ...current,
            customPermissionTemplates: nextTemplates,
          };
        });
        return result;
      },
      addClient: (client) => {
        const nextClient = {
          ...client,
          id: client.id || uid('client'),
        };
        setTenantData((current) => ({
          ...current,
          clients: [nextClient, ...current.clients],
        }));
        return nextClient;
      },
      upsertWorkspace: (workspace) => {
        setTenantData((current) => {
          const exists = current.workspaces.some((item) => item.id === workspace.id);
          if (!exists) {
            return { ...current, workspaces: [...current.workspaces, { ...workspace, id: workspace.id || uid('ws') }] };
          }
          return {
            ...current,
            workspaces: current.workspaces.map((item) => (item.id === workspace.id ? workspace : item)),
          };
        });
      },
      deleteWorkspace: (workspaceId) => {
        let result: { ok: boolean; reason?: string } = { ok: true };
        setTenantData((current) => {
          const exists = current.workspaces.some((item) => item.id === workspaceId);
          if (!exists) {
            result = { ok: false, reason: 'Workspace not found.' };
            return current;
          }

          return {
            ...current,
            workspaces: current.workspaces.filter((item) => item.id !== workspaceId),
            forms: current.forms.filter((form) => form.workspaceId !== workspaceId),
            records: current.records.filter((record) => record.workspaceId !== workspaceId),
            flows: current.flows.filter((flow) => flow.workspaceId !== workspaceId),
          };
        });
        return result;
      },
      addSubSpace: (workspaceId, subSpace) => {
        let result: { ok: boolean; reason?: string } = { ok: true };
        setTenantData((current) => {
          return {
            ...current,
            workspaces: current.workspaces.map((workspace) => {
              if (workspace.id !== workspaceId) {
                return workspace;
              }
              if (workspace.subSpaces.length >= 7) {
                result = { ok: false, reason: 'Maximum of 7 SubSpaces per Workspace reached.' };
                return workspace;
              }
              return {
                ...workspace,
                subSpaces: [...workspace.subSpaces, { ...subSpace, id: subSpace.id || uid('ss') }],
              };
            }),
          };
        });
        return result;
      },
      deleteSubSpace: (workspaceId, subSpaceId) => {
        let result: { ok: boolean; reason?: string } = { ok: true };
        setTenantData((current) => {
          const workspace = current.workspaces.find((item) => item.id === workspaceId);
          if (!workspace) {
            result = { ok: false, reason: 'Workspace not found.' };
            return current;
          }

          const exists = workspace.subSpaces.some((item) => item.id === subSpaceId);
          if (!exists) {
            result = { ok: false, reason: 'SubSpace not found.' };
            return current;
          }

          return {
            ...current,
            workspaces: current.workspaces.map((item) => {
              if (item.id !== workspaceId) {
                return item;
              }
              return {
                ...item,
                subSpaces: item.subSpaces.filter((subSpace) => subSpace.id !== subSpaceId),
              };
            }),
            forms: current.forms.filter((form) => !(form.workspaceId === workspaceId && form.subSpaceId === subSpaceId)),
            records: current.records.filter((record) => !(record.workspaceId === workspaceId && record.subSpaceId === subSpaceId)),
            flows: current.flows.filter((flow) => !(flow.workspaceId === workspaceId && flow.subSpaceId === subSpaceId)),
          };
        });
        return result;
      },
      updateSubSpace: (workspaceId, subSpace) => {
        setTenantData((current) => ({
          ...current,
          workspaces: current.workspaces.map((workspace) => {
            if (workspace.id !== workspaceId) {
              return workspace;
            }
            return {
              ...workspace,
              subSpaces: workspace.subSpaces.map((item) => (item.id === subSpace.id ? subSpace : item)),
            };
          }),
        }));
      },
      addRecord: (record) => {
        setTenantData((current) => ({
          ...current,
          records: [
            {
              ...record,
              id: record.id || uid('record'),
            },
            ...current.records,
          ],
        }));
      },
      updateRecord: (recordId, updates) => {
        setTenantData((current) => ({
          ...current,
          records: current.records.map((r) => (r.id === recordId ? { ...r, ...updates } : r)),
        }));
      },
      deleteRecord: (recordId) => {
        const exists = data.records.some((r) => r.id === recordId);
        if (!exists) return { ok: false, reason: 'Record not found.' };
        setTenantData((current) => ({
          ...current,
          records: current.records.filter((r) => r.id !== recordId),
        }));
        return { ok: true };
      },
      upsertFlow: (flow) => {
        setTenantData((current) => {
          const exists = current.flows.some((item) => item.id === flow.id);
          if (!exists) {
            return {
              ...current,
              flows: [{ ...flow, id: flow.id || uid('flow') }, ...current.flows],
            };
          }
          return {
            ...current,
            flows: current.flows.map((item) => (item.id === flow.id ? flow : item)),
          };
        });
      },
      getFormForSubSpace: (workspaceId, subSpaceId) => {
        const explicitForm = data.forms.find((form) => form.workspaceId === workspaceId && form.subSpaceId === subSpaceId);
        if (explicitForm) {
          return explicitForm;
        }

        const workspace = data.workspaces.find((item) => item.id === workspaceId);
        const subSpace = workspace?.subSpaces.find((item) => item.id === subSpaceId);
        if (!workspace || !subSpace) {
          return undefined;
        }

        return deriveFormFromSubSpace(workspace, subSpace);
      },
      activateIntegration: (activation) => {
        setTenantData((current) => ({
          ...current,
          integrations: [...current.integrations, { ...activation, id: activation.id || uid('intg') }],
        }));
      },
      updateIntegration: (id, updates) => {
        setTenantData((current) => ({
          ...current,
          integrations: current.integrations.map((item) =>
            item.id === id ? { ...item, ...updates } : item,
          ),
        }));
      },
      deactivateIntegration: (id) => {
        let result: { ok: boolean; reason?: string } = { ok: true };
        setTenantData((current) => {
          const exists = current.integrations.some((item) => item.id === id);
          if (!exists) {
            result = { ok: false, reason: 'Integration not found.' };
            return current;
          }
          return {
            ...current,
            integrations: current.integrations.filter((item) => item.id !== id),
          };
        });
        return result;
      },
      businessFunctions: data.businessFunctions ?? [],
      upsertBusinessFunction: (fn) => {
        setTenantData((current) => {
          const existing = (current.businessFunctions ?? []);
          const idx = existing.findIndex((f) => f.id === fn.id);
          return {
            ...current,
            businessFunctions: idx >= 0
              ? existing.map((f) => f.id === fn.id ? fn : f)
              : [...existing, fn],
          };
        });
      },
      deleteBusinessFunction: (fnId) => {
        let result: { ok: boolean; reason?: string } = { ok: true };
        setTenantData((current) => {
          const exists = (current.businessFunctions ?? []).some((f) => f.id === fnId);
          if (!exists) {
            result = { ok: false, reason: 'Business function not found.' };
            return current;
          }
          return {
            ...current,
            businessFunctions: (current.businessFunctions ?? []).filter((f) => f.id !== fnId),
          };
        });
        return result;
      },
      upsertBusinessObject: (fnId, obj) => {
        setTenantData((current) => {
          const fns = current.businessFunctions ?? [];
          return {
            ...current,
            businessFunctions: fns.map((f) => {
              if (f.id !== fnId) return f;
              const idx = f.objects.findIndex((o) => o.id === obj.id);
              return {
                ...f,
                objects: idx >= 0
                  ? f.objects.map((o) => o.id === obj.id ? obj : o)
                  : [...f.objects, obj],
              };
            }),
          };
        });
      },
      deleteBusinessObject: (fnId, objId) => {
        let result: { ok: boolean; reason?: string } = { ok: true };
        setTenantData((current) => {
          const fn = (current.businessFunctions ?? []).find((f) => f.id === fnId);
          if (!fn || !fn.objects.some((o) => o.id === objId)) {
            result = { ok: false, reason: 'Business object not found.' };
            return current;
          }
          return {
            ...current,
            businessFunctions: (current.businessFunctions ?? []).map((f) =>
              f.id === fnId ? { ...f, objects: f.objects.filter((o) => o.id !== objId) } : f,
            ),
          };
        });
        return result;
      },
      signInWithEmail: (email, password) => {
        const normalizedEmail = normalizeEmail(email);
        const user = users.find(
          (item) => normalizeEmail(item.email) === normalizedEmail && item.provider === 'email' &&
            (item.password === btoa(password) || item.password === password),
        );

        if (!user) {
          return { ok: false, message: 'Invalid email or password.' };
        }

        const nextSession: AuthSession = {
          userId: user.id,
          provider: 'email',
          signedInAt: new Date().toISOString(),
        };
        setSession(nextSession);

        if (!user.isSuperAdmin) {
          const tenantId = user.tenantId && tenantRecords.some((tenant) => tenant.id === user.tenantId)
            ? user.tenantId
            : activeTenantId;
          setActiveTenantId(tenantId);
        }

        if (currentTenantRecord?.data.roles.some((role) => role.id === user.roleId)) {
          setTenantData((current) => ({
            ...current,
            activeRoleId: user.roleId,
          }));
        }

        return { ok: true, message: `Welcome back, ${user.fullName}.` };
      },
      signInWithProvider: (provider) => {
        const providerEmail = provider === 'google' ? 'google.user@corespace.app' : 'microsoft.user@corespace.app';
        const providerName = provider === 'google' ? 'Google User' : 'Microsoft User';

        let user = users.find((item) => normalizeEmail(item.email) === providerEmail);

        if (!user) {
          user = {
            id: uid('user'),
            fullName: providerName,
            email: providerEmail,
            roleId: 'role-platform-admin',
            tenantId: activeTenantId,
            isSuperAdmin: false,
            provider,
            createdAt: todayFormatted(),
          };
        }

        const nextUser = user;
        setUsers((current) => (current.some((item) => item.id === nextUser.id) ? current : [nextUser, ...current]));
        setSession({
          userId: nextUser.id,
          provider,
          signedInAt: new Date().toISOString(),
        });
        setTenantData((current) => ({
          ...current,
          activeRoleId: current.roles.some((role) => role.id === nextUser.roleId) ? nextUser.roleId : current.activeRoleId,
        }));

        return { ok: true, message: `${provider === 'google' ? 'Google' : 'Microsoft'} sign-in successful.` };
      },
      createAccount: (fullName, email, password, asAdmin) => {
        const normalizedEmail = normalizeEmail(email);
        if (!fullName.trim() || !normalizedEmail || !password.trim()) {
          return { ok: false, message: 'Full name, email, and password are required.' };
        }

        if (users.some((item) => normalizeEmail(item.email) === normalizedEmail)) {
          return { ok: false, message: 'An account with this email already exists.' };
        }

        const roleId = 'role-platform-admin';
        const isSuperAdmin = asAdmin && !users.some((item) => item.isSuperAdmin);
        const createdUser: AuthUser = {
          id: uid('user'),
          fullName: fullName.trim(),
          email: normalizedEmail,
          password: btoa(password),
          roleId,
          tenantId: activeTenantId,
          isSuperAdmin,
          provider: 'email',
          createdAt: todayFormatted(),
        };

        setUsers((current) => [createdUser, ...current]);
        setSession({
          userId: createdUser.id,
          provider: 'email',
          signedInAt: new Date().toISOString(),
        });
        setTenantData((current) => ({
          ...current,
          activeRoleId: current.roles.some((role) => role.id === roleId) ? roleId : current.activeRoleId,
        }));

        return {
          ok: true,
          message: isSuperAdmin
            ? 'Super admin account created. You can access and switch all tenants.'
            : asAdmin
              ? 'Admin account created. You now have full admin capabilities for this tenant.'
            : 'Account created. You can now use CoreSpace.',
        };
      },
      addFlowRunEntry: (entry) => {
        setTenantData((current) => ({
          ...current,
          flowRuns: [entry, ...(current.flowRuns ?? [])].slice(0, 200),
        }));
      },
      // ─── Financial Operations Engine ─────────────────────────────
      addGlAccount: (account) => {
        const next: GlAccount = { ...account, id: uid('acct') };
        setTenantData((current) => ({
          ...current,
          glAccounts: [...(current.glAccounts ?? []), next],
        }));
        return next;
      },
      updateGlAccount: (id, updates) => {
        let result: { ok: boolean; reason?: string } = { ok: true };
        setTenantData((current) => {
          const accounts = current.glAccounts ?? [];
          if (!accounts.some((a) => a.id === id)) {
            result = { ok: false, reason: 'GL account not found.' };
            return current;
          }
          return { ...current, glAccounts: accounts.map((a) => a.id === id ? { ...a, ...updates } : a) };
        });
        return result;
      },
      addJournalEntry: (entry) => {
        const lines = entry.lines ?? [];
        const debitTotal = lines.reduce((sum, l) => sum + (l.debitAmount ?? 0), 0);
        const creditTotal = lines.reduce((sum, l) => sum + (l.creditAmount ?? 0), 0);
        if (Math.abs(debitTotal - creditTotal) > 0.001) {
          return {
            ok: false,
            errors: [{
              errorCode: 'DOUBLE_ENTRY_IMBALANCE' as const,
              message: `Debits (${debitTotal.toFixed(2)}) must equal credits (${creditTotal.toFixed(2)}).`,
              detail: { debitTotal, creditTotal },
            }],
          };
        }
        const period = (data.accountingPeriods ?? []).find((p) => p.id === entry.periodId);
        if (period?.status === 'closed') {
          return {
            ok: false,
            errors: [{
              errorCode: 'POSTING_PERIOD_CLOSED' as const,
              message: `Period "${period.periodName}" is closed. Use an open period.`,
              detail: { periodId: entry.periodId },
            }],
          };
        }
        const now = new Date().toISOString();
        const yyyymm = now.slice(0, 7).replace('-', '');
        const seq = String(Math.floor(Math.random() * 900000) + 100000);
        const next: JournalEntry = {
          ...entry,
          id: uid('je'),
          entryRef: `JE-${yyyymm}-${seq}`,
          postingStatus: 'draft',
          debitTotal,
          creditTotal,
          lines: lines.map((l, i) => ({ ...l, id: l.id ?? uid('jl'), lineOrder: l.lineOrder ?? i + 1 })),
        };
        setTenantData((current) => ({
          ...current,
          journalEntries: [next, ...(current.journalEntries ?? [])],
        }));
        return { ok: true, entry: next };
      },
      submitJournalEntryForApproval: (entryId) => {
        let result: { ok: boolean; reason?: string } = { ok: true };
        setTenantData((current) => {
          const entries = current.journalEntries ?? [];
          const existing = entries.find((e) => e.id === entryId);
          if (!existing) { result = { ok: false, reason: 'Journal entry not found.' }; return current; }
          if (existing.postingStatus !== 'draft') { result = { ok: false, reason: 'Only draft entries can be submitted for approval.' }; return current; }
          return { ...current, journalEntries: entries.map((e) => e.id === entryId ? { ...e, postingStatus: 'pending_approval' } : e) };
        });
        return result;
      },
      postJournalEntry: (entryId, posterId) => {
        const validationErrors: FinancialValidationError[] = [];
        let result: { ok: boolean; errors?: FinancialValidationError[] } = { ok: true };
        setTenantData((current) => {
          const entries = current.journalEntries ?? [];
          const entry = entries.find((e) => e.id === entryId);
          if (!entry) {
            result = { ok: false, errors: [{ errorCode: 'GL_FIELD_LOCKED', message: 'Journal entry not found.' }] };
            return current;
          }
          if (Math.abs(entry.debitTotal - entry.creditTotal) > 0.001) {
            validationErrors.push({ errorCode: 'DOUBLE_ENTRY_IMBALANCE', message: `Debits (${entry.debitTotal.toFixed(2)}) ≠ Credits (${entry.creditTotal.toFixed(2)}).`, detail: { debitTotal: entry.debitTotal, creditTotal: entry.creditTotal } });
          }
          const period = (current.accountingPeriods ?? []).find((p) => p.id === entry.periodId);
          if (period?.status === 'closed') {
            validationErrors.push({ errorCode: 'POSTING_PERIOD_CLOSED', message: `Period "${period.periodName}" is closed.`, detail: { periodId: entry.periodId } });
          }
          if (entry.createdBy === posterId) {
            validationErrors.push({ errorCode: 'SEGREGATION_OF_DUTIES_VIOLATION', message: 'The entry creator cannot also post it. A different user must approve.', detail: { createdBy: entry.createdBy, posterId } });
          }
          if (validationErrors.length > 0) {
            result = { ok: false, errors: validationErrors };
            return current;
          }
          // WS-047-ADD: Apply gl-locked field tag — pre-write gate will block any
          // subsequent write to this JE's fields. Applied AFTER the write succeeds.
          const glTag: FieldTagRecord = {
            id: uid('ftag'),
            tenantId: activeTenantId,
            recordType: 'journal_entry',
            recordId: entryId,
            fieldSlug: '*',
            tagName: 'gl-locked',
            isActive: true,
            appliedAt: new Date().toISOString(),
            appliedByEvent: 'posting_status:posted',
            appliedByUserId: posterId,
          };
          return {
            ...current,
            journalEntries: entries.map((e) => e.id === entryId ? { ...e, postingStatus: 'posted' } : e),
            fieldTags: [...(current.fieldTags ?? []), glTag],
          };
        });
        return result;
      },
      addPayable: (payable) => {
        const now = new Date().toISOString();
        const yyyymm = now.slice(0, 7).replace('-', '');
        const seq = String(Math.floor(Math.random() * 900000) + 100000);
        const next: Payable = { ...payable, id: uid('ap'), payableRef: `AP-${yyyymm}-${seq}` };
        setTenantData((current) => ({ ...current, payables: [next, ...(current.payables ?? [])] }));
        return next;
      },
      approvePayable: (payableId, _approverId) => {
        let result: { ok: boolean; reason?: string } = { ok: true };
        setTenantData((current) => {
          const payables = current.payables ?? [];
          const p = payables.find((item) => item.id === payableId);
          if (!p) { result = { ok: false, reason: 'Payable not found.' }; return current; }
          if (p.approvalStatus === 'approved' || p.approvalStatus === 'paid') { result = { ok: false, reason: 'Payable is already approved or paid.' }; return current; }
          return { ...current, payables: payables.map((item) => item.id === payableId ? { ...item, approvalStatus: 'approved' } : item) };
        });
        return result;
      },
      markPayablePaid: (payableId, paidAmount) => {
        let result: { ok: boolean; reason?: string } = { ok: true };
        setTenantData((current) => {
          const payables = current.payables ?? [];
          const p = payables.find((item) => item.id === payableId);
          if (!p) { result = { ok: false, reason: 'Payable not found.' }; return current; }
          const newAmountPaid = (p.amountPaid ?? 0) + paidAmount;
          const paymentStatus: Payable['paymentStatus'] = newAmountPaid >= p.amountDue ? 'paid' : 'partial';
          return { ...current, payables: payables.map((item) => item.id === payableId ? { ...item, amountPaid: newAmountPaid, paymentStatus } : item) };
        });
        return result;
      },
      addReceivable: (receivable) => {
        const now = new Date().toISOString();
        const yyyymm = now.slice(0, 7).replace('-', '');
        const seq = String(Math.floor(Math.random() * 900000) + 100000);
        const next: Receivable = { ...receivable, id: uid('ar'), receivableRef: `AR-${yyyymm}-${seq}` };
        setTenantData((current) => ({ ...current, receivables: [next, ...(current.receivables ?? [])] }));
        return next;
      },
      confirmReceivable: (receivableId, receivedAmount) => {
        let result: { ok: boolean; reason?: string } = { ok: true };
        setTenantData((current) => {
          const receivables = current.receivables ?? [];
          const r = receivables.find((item) => item.id === receivableId);
          if (!r) { result = { ok: false, reason: 'Receivable not found.' }; return current; }
          const newReceivedAmount = (r.receivedAmount ?? 0) + receivedAmount;
          const receiptStatus: Receivable['receiptStatus'] = newReceivedAmount >= r.invoicedAmount ? 'received' : 'partial';
          return {
            ...current,
            receivables: receivables.map((item) =>
              item.id === receivableId
                ? { ...item, receivedAmount: newReceivedAmount, receiptStatus, receiptDate: item.receiptDate ?? new Date().toISOString().split('T')[0] }
                : item,
            ),
          };
        });
        return result;
      },
      addFinancialCounterparty: (cp) => {
        const next: FinancialCounterparty = { ...cp, id: uid('cp') };
        setTenantData((current) => ({ ...current, financialCounterparties: [next, ...(current.financialCounterparties ?? [])] }));
        return next;
      },
      addWaterfall: (waterfall) => {
        const partySum = (waterfall.parties ?? []).reduce((sum, p) => sum + p.paymentAmount, 0);
        if (Math.abs(partySum - waterfall.totalAmount) > 0.001) {
          return {
            ok: false,
            errors: [{
              errorCode: 'WATERFALL_IMBALANCE' as const,
              message: `Party payments (${partySum.toFixed(2)}) must equal total amount (${waterfall.totalAmount.toFixed(2)}).`,
              detail: { partySum, totalAmount: waterfall.totalAmount },
            }],
          };
        }
        const now = new Date().toISOString();
        const yyyymm = now.slice(0, 7).replace('-', '');
        const seq = String(Math.floor(Math.random() * 900000) + 100000);
        const next: DistributionWaterfall = { ...waterfall, id: uid('wf'), waterfallRef: `WF-${yyyymm}-${seq}` };
        setTenantData((current) => ({ ...current, waterfalls: [next, ...(current.waterfalls ?? [])] }));
        return { ok: true, waterfall: next };
      },
      approveWaterfall: (waterfallId, _approverId) => {
        let result: { ok: boolean; errors?: FinancialValidationError[] } = { ok: true };
        setTenantData((current) => {
          const waterfalls = current.waterfalls ?? [];
          const wf = waterfalls.find((w) => w.id === waterfallId);
          if (!wf) {
            result = { ok: false, errors: [{ errorCode: 'WATERFALL_IMBALANCE', message: 'Waterfall not found.' }] };
            return current;
          }
          const partySum = (wf.parties ?? []).reduce((sum, p) => sum + p.paymentAmount, 0);
          if (Math.abs(partySum - wf.totalAmount) > 0.001) {
            result = { ok: false, errors: [{ errorCode: 'WATERFALL_IMBALANCE', message: `Party payments (${partySum.toFixed(2)}) ≠ total (${wf.totalAmount.toFixed(2)}).`, detail: { partySum, totalAmount: wf.totalAmount } }] };
            return current;
          }
          return { ...current, waterfalls: waterfalls.map((w) => w.id === waterfallId ? { ...w, executionStatus: 'approved' } : w) };
        });
        return result;
      },
      addAccountingPeriod: (period) => {
        const next: AccountingPeriod = { ...period, id: uid('period') };
        setTenantData((current) => ({ ...current, accountingPeriods: [...(current.accountingPeriods ?? []), next] }));
        return next;
      },
      closeAccountingPeriod: (periodId, closedBy) => {
        let result: { ok: boolean; reason?: string } = { ok: true };
        setTenantData((current) => {
          const periods = current.accountingPeriods ?? [];
          const period = periods.find((p) => p.id === periodId);
          if (!period) { result = { ok: false, reason: 'Accounting period not found.' }; return current; }
          if (period.status === 'closed') { result = { ok: false, reason: 'Period is already closed.' }; return current; }
          return { ...current, accountingPeriods: periods.map((p) => p.id === periodId ? { ...p, status: 'closed', closedBy, closedAt: new Date().toISOString() } : p) };
        });
        return result;
      },

      // ─── Ingestion Layer (WS-048) ─────────────────────────────────────
      addIngestionRecord: (record) => {
        const next: IngestionRecord = { ...record, id: uid('ing') };
        setTenantData((current) => ({ ...current, ingestionRecords: [next, ...(current.ingestionRecords ?? [])] }));
        return next;
      },

      // WS-048-ADD: Reviewer confirms (possibly correcting) fields below threshold.
      // Updates the ingestion_record with corrected values + review_status='reviewed',
      // then the downstream financial workflow can continue as if auto-processed.
      confirmIngestionRecord: (recordId, correctedValues, reviewedBy) => {
        let result: { ok: boolean; reason?: string } = { ok: true };
        setTenantData((current) => {
          const records = current.ingestionRecords ?? [];
          const rec = records.find((r) => r.id === recordId);
          if (!rec) { result = { ok: false, reason: 'Ingestion record not found.' }; return current; }
          if (rec.reviewStatus !== 'pending_review') { result = { ok: false, reason: 'Record is not pending review.' }; return current; }
          // Apply corrected values to the field map and mark all fields as confirmed
          const updatedFields = { ...rec.fieldMap.fields };
          Object.entries(correctedValues).forEach(([slug, value]) => {
            updatedFields[slug] = { value, confidence: 1.0, confirmed: true };
          });
          const updatedRecord: IngestionRecord = {
            ...rec,
            reviewStatus: 'reviewed' as IngestionReviewStatus,
            reviewedBy,
            reviewedAt: new Date().toISOString(),
            fieldsBelowThreshold: [],
            overallConfidence: 1.0,
            fieldMap: { ...rec.fieldMap, fields: updatedFields },
          };
          return { ...current, ingestionRecords: records.map((r) => r.id === recordId ? updatedRecord : r) };
        });
        return result;
      },

      rejectIngestionRecord: (recordId, reason, _rejectedBy) => {
        setTenantData((current) => {
          const records = current.ingestionRecords ?? [];
          return { ...current, ingestionRecords: records.map((r) => r.id === recordId ? { ...r, reviewStatus: 'rejected' as IngestionReviewStatus, rejectionReason: reason } : r) };
        });
        return { ok: true };
      },

      updateIngestionSourceConfig: (id, updates) => {
        setTenantData((current) => {
          const sources = current.ingestionSources ?? [];
          return { ...current, ingestionSources: sources.map((s) => s.id === id ? { ...s, ...updates } : s) };
        });
        return { ok: true };
      },

      // ─── System Field Tags (WS-047-ADD) ────────────────────────────────────
      applyFieldTag: (tag) => {
        const next: FieldTagRecord = { ...tag, id: uid('ftag') };
        setTenantData((current) => ({ ...current, fieldTags: [...(current.fieldTags ?? []), next] }));
        return next;
      },

      // Pre-write gate simulation: checks if a field on a record is locked by a system tag.
      // Returns locked=true immediately if gl-locked or reconciled tag is active.
      // Called by Layer 1 validators before any write proceeds.
      isFieldLocked: (recordType, recordId, fieldSlug) => {
        const tags = tenantData.fieldTags ?? [];
        // Check both record-specific and record_id=null (definition-time) tags
        const match = tags.find((t) =>
          t.isActive &&
          t.recordType === recordType &&
          (t.recordId === recordId || t.recordId === null) &&
          (t.fieldSlug === fieldSlug || t.fieldSlug === '*') &&
          (t.tagName === 'gl-locked' || t.tagName === 'reconciled')
        );
        if (match) return { locked: true, tagName: match.tagName, appliedByEvent: match.appliedByEvent };
        return { locked: false };
      },

      // ─── Presence Registry (WS-048 v2.1) ──────────────────────────────────
      updateUserPresence: (userId, updates) => {
        setTenantData((current) => {
          const presence = current.userPresence ?? [];
          const exists = presence.find((p) => p.userId === userId);
          if (exists) {
            return { ...current, userPresence: presence.map((p) => p.userId === userId ? { ...p, ...updates } : p) };
          }
          return { ...current, userPresence: [...presence, { userId, tenantId: activeTenantId, activityStatus: 'active', lastSeenAt: new Date().toISOString(), connectionCount: 1, ...updates }] };
        });
      },
      signOut: () => {
        setSession(null);
      },
    };
  }, [
    data,
    hydrated,
    session,
    users,
    activeTenantId,
    tenantRecords,
    currentTenantRecord,
  ]);

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const ctx = useContext(AppStateContext);
  if (!ctx) {
    throw new Error('useAppState must be used within AppStateProvider');
  }
  return ctx;
}
