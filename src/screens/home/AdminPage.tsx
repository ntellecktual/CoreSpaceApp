import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Reorder, useDragControls } from 'framer-motion';
import { Platform, ScrollView, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { InteractivePressable as Pressable } from '../../components/InteractivePressable';
import { AiChatPanel } from '../../components/AiChatPanel';
import { AuditLogViewer } from '../../components/NotificationAudit';
import { useUiTheme } from '../../context/UiThemeContext';
import { useAppState } from '../../context/AppStateContext';
import { SubSpaceBuilderFieldType } from '../../types';
import { useAiWorkspaceBuilder } from '../../ai/useAiHooks';
import { Card, LabeledInput } from './components';
import { useAdminEnterpriseInsights } from './hooks/useAdminEnterpriseInsights';
import { useAdminShellDesigner } from './hooks/useAdminShellDesigner';
import { useAdminWorkspace } from './hooks/useAdminWorkspace';
import { useRolePolicyBuilder } from './hooks/useRolePolicyBuilder';
import { useRbac } from './hooks/useRbac';
import { permissionCatalog } from './rbac';
import { GuidedPageProps } from './types';

type AdminWalkthroughStep = {
  id: string;
  title: string;
  goal: string;
  pointer: string;
  checklist: string[];
  adminTab: 'workspace' | 'shell' | 'role' | 'governance';
  workspacePane?: 'workspace' | 'subspaces';
  shellPane?: 'labels' | 'intake' | 'personas' | 'lifecycle';
  rolePane?: 'roles' | 'templates' | 'diff' | 'permissions' | 'scope';
  targetId?: string;
};

const adminWalkthroughSteps: AdminWalkthroughStep[] = [
  {
    id: 'load-template',
    title: 'Step 1: Load the DSCSA Template',
    goal: 'Click "Load DSCSA Serialization Template" to instantly create a workspace with 8 SubSpaces, 3 workspace-level fields, and pre-built data structure — no manual setup required.',
    pointer: 'You are in Workspace Design → Configure Workspace. Look for the "Load DSCSA Serialization Template" button in the Workspace Library section and click it.',
    targetId: 'wt-load-template',
    checklist: [
      'The template creates a workspace named "DSCSA Serialization Workflow".',
      'Root Entity is "Serialized Batch" — every record tracks one drug lot.',
      '8 SubSpaces are added: Carton, Boxes Inside Carton, Individual Units, Lot Information, Manufacturer Serialization, Distributor Verification, Pharmacy Dispense, and Traceability & Exceptions.',
    ],
    adminTab: 'workspace',
    workspacePane: 'workspace',
  },
  {
    id: 'review-subspaces',
    title: 'Step 2: Review the SubSpace Lanes',
    goal: 'After loading the template, switch to SubSpace Lanes & Fields to see all 8 SubSpaces and their tracked fields.',
    pointer: 'Click "SubSpace Lanes & Fields" in the left nav (under Workspace Design). Each lane has pre-configured fields — click a SubSpace pill to see its fields.',
    targetId: 'wt-add-subspace',
    checklist: [
      'Carton: Carton Serial, Lot Number, Expiration Date.',
      'Individual Units: Unit Serial, NDC Product Code, Box Serial.',
      'Distributor Verification: Scanned Carton Serial, Verification Result, Matched Serial Count, Received Time.',
    ],
    adminTab: 'workspace',
    workspacePane: 'subspaces',
  },
  {
    id: 'explore-field-palette',
    title: 'Step 3: Add or Customize Fields',
    goal: 'Use the field palette to add new fields to any SubSpace. Drag a field type into the builder area or click to add.',
    pointer: 'Still in SubSpace Lanes & Fields — select a SubSpace, then use the Field Palette section. Click any field type (text, number, date, select, etc.) to add it.',
    targetId: 'wt-field-palette',
    checklist: [
      'The template pre-loads fields like Unit Serial (text), NDC Product Code (text), and EPCIS Upload Status (select).',
      'You can add more fields: try adding a "Temperature" number field to track cold-chain compliance.',
      'Mark fields as Required when every record must have that data.',
    ],
    adminTab: 'workspace',
    workspacePane: 'subspaces',
  },
  {
    id: 'shell-language',
    title: 'Step 4: Customize App Terminology',
    goal: 'Rename labels so the app speaks your team\'s language — not generic tech words.',
    pointer: 'Click "Language & Intake" in the left nav, then "App Terminology". Change the labels and click "Save App Words".',
    targetId: 'wt-save-app-words',
    checklist: [
      'Subject (single): Serialized Batch — what one record is called.',
      'Subject (plural): Serialized Batches — what multiple records are called.',
      'Workspace label: Supply Chain Workspace. SubSpace label: Traceability Lane.',
    ],
    adminTab: 'shell',
    shellPane: 'labels',
  },
  {
    id: 'intake-schema',
    title: 'Step 5: Build the Intake Form',
    goal: 'Define the fields that every new Serialized Batch record starts with, so data entry is consistent from day one.',
    pointer: 'Click "Intake Form Builder" under Language & Intake. Add a question, choose a field type, and click "Add Intake Field".',
    targetId: 'wt-add-intake-field',
    checklist: [
      'Example: Product Name (type: select) — dropdown of drug products.',
      'Example: Lot Number (type: text) — required for every batch.',
      'Example: Unit Count (type: number) — how many units in this batch.',
    ],
    adminTab: 'shell',
    shellPane: 'intake',
  },
  {
    id: 'role-governance',
    title: 'Step 6: Set Up Access & Permissions',
    goal: 'Create roles so each persona only sees and does what they are authorized for — no more, no less.',
    pointer: 'Click "Access & Permissions" → "Role Manager". Create a role, assign permissions, set workspace scope, then click "Save Role Policy".',
    targetId: 'wt-save-role',
    checklist: [
      'Example role: Distributor Receiver — can view verification records and update scan results.',
      'Example role: Pharmacy Dispense Manager — can create and edit dispense records.',
      'Scope each role to only the workspaces that role needs access to.',
    ],
    adminTab: 'role',
    rolePane: 'roles',
  },
  {
    id: 'governance-review',
    title: 'Step 7: Review Compliance & Publish',
    goal: 'Check the Setup Health Report for any warnings, then use Publish Workspace in the footer to make it live for end users.',
    pointer: 'Click "Compliance & Health" → "Setup Health Report". Fix any warnings, then click "Publish Workspace" in the bottom-right footer bar.',
    targetId: 'wt-setup-health',
    checklist: [
      'Green = good. Fix any yellow warnings before publishing.',
      'Verify all 8 SubSpaces have fields assigned.',
      'After publishing, the workspace appears in the End User view.',
    ],
    adminTab: 'governance',
  },
];

export function AdminPage({ guidedMode, registerActions, auditLog, addNotification, accentPalette }: GuidedPageProps) {
  const { styles, mode } = useUiTheme();
  const { width: windowWidth } = useWindowDimensions();
  const [adminTab, setAdminTab] = useState<'workspace' | 'shell' | 'role' | 'governance' | 'forms' | 'architecture'>('shell');
  const [workspacePane, setWorkspacePane] = useState<'workspace' | 'subspaces'>('workspace');
  const [workspaceBuilderPanelOpen, setWorkspaceBuilderPanelOpen] = useState(true);
  const [draggedFieldType, setDraggedFieldType] = useState<SubSpaceBuilderFieldType | null>(null);
  const [wsDragFromIndex, setWsDragFromIndex] = useState<number | null>(null);
  const [wsDragOverIndex, setWsDragOverIndex] = useState<number | null>(null);
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3 | 4>(1);
  const [wizardActiveFieldType, setWizardActiveFieldType] = useState<SubSpaceBuilderFieldType>('text');
  const [shellPane, setShellPane] = useState<'labels' | 'intake' | 'personas' | 'lifecycle'>('labels');
  const [rolePane, setRolePane] = useState<'roles' | 'templates' | 'diff' | 'permissions' | 'scope'>('roles');
  const [walkthroughIndex, setWalkthroughIndex] = useState(0);
  const [completedWalkthroughStepIds, setCompletedWalkthroughStepIds] = useState<string[]>([]);
  const [showCreateModeBanner, setShowCreateModeBanner] = useState(true);
  const [signalHintFieldId, setSignalHintFieldId] = useState<string | null>(null);
  const [expandedAdminSections, setExpandedAdminSections] = useState<Record<string, boolean>>({
    shell: true,
    workspace: false,
    forms: false,
    role: false,
    governance: false,
    architecture: false,
  });
  const [beboFabOpen, setBeboFabOpen] = useState(false);
  const { can, deniedMessage } = useRbac();
  const {
    workspaces,
    workspace,
    hasWorkspace,
    isCreatingWorkspace,
    selectedWorkspaceId,
    setSelectedWorkspaceId,
    beginCreateWorkspace,
    applyDscsaSerializationTemplate,
    applyWrvasTemplate,
    applyLegalCaseTemplate,
    removeWorkspace,
    workspaceName,
    setWorkspaceName,
    rootEntity,
    setRootEntity,
    route,
    setRoute,
    newSubSpaceName,
    setNewSubSpaceName,
    newSubSpaceEntity,
    setNewSubSpaceEntity,
    newBuilderFieldLabel,
    setNewBuilderFieldLabel,
    newBuilderDropdownOptions,
    setNewBuilderDropdownOptions,
    newBuilderDropdownOptionInput,
    setNewBuilderDropdownOptionInput,
    selectedSubSpaceId,
    setSelectedSubSpaceId,
    selectedSubSpace,
    firstSubSpaceWithoutFormId,
    firstRelatedSubSpaceMissingRelationshipId,
    fieldPalette,
    notice,
    saveWorkspace,
    publishWorkspace,
    createSubSpace,
    removeSubSpace,
    cycleDisplay,
    toggleVisibility,
    addBuilderFieldToWorkspace,
    addBuilderFieldToSubSpace,
    removeBuilderFieldFromWorkspace,
    moveBuilderFieldInWorkspace,
    reorderBuilderFieldInWorkspace,
    removeBuilderFieldFromSubSpace,
    moveBuilderFieldInSubSpace,
    applyBuilderFieldOrderInSubSpace,
    renameBuilderFieldInSubSpace,
    toggleWorkspaceFieldRequired,
    toggleBuilderFieldRequired,
    updateSelectedSubSpace,
    togglePipelineEnabled,
    reorderSubSpace,
    moveSubSpaceToIndex,
    applySubSpaceOrder,
  } = useAdminWorkspace();
  const insights = useAdminEnterpriseInsights(workspace);
  const { activeTenantId, data, isSuperAdmin, currentUser, tenants, copyActiveDataToAllTenants, getFormForSubSpace, upsertBusinessFunction, deleteBusinessFunction, upsertBusinessObject, deleteBusinessObject } = useAppState();

  // ── Tenant accent helpers ───────────────────────────────────────────
  const ac = accentPalette?.accent ?? '#111111';
  const acSoft = `${ac}2E`;
  const acMid = `${ac}40`;
  const acText = (() => {
    const hex = ac.replace('#', '');
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return (0.299 * r + 0.587 * g + 0.114 * b) > 160 ? '#000000' : '#FFFFFF';
  })();
  // rgba helpers for partial opacity
  const acRgba = (a: number) => {
    const hex = ac.replace('#', '');
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return `rgba(${r},${g},${b},${a})`;
  };
  // ───────────────────────────────────────────────────────────────────
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [editingFieldLabel, setEditingFieldLabel] = useState('');
  const [editingFunctionId, setEditingFunctionId] = useState<string | null>(null);
  const [editingObjectKey, setEditingObjectKey] = useState<string | null>(null);
  const [newFnName, setNewFnName] = useState('');
  const [newFnIcon, setNewFnIcon] = useState('');
  const [newFnColor, setNewFnColor] = useState(ac);
  const [newFnDesc, setNewFnDesc] = useState('');
  const [newObjName, setNewObjName] = useState('');
  const [newObjNamePlural, setNewObjNamePlural] = useState('');
  const [newObjIcon, setNewObjIcon] = useState('');
  const [newObjDesc, setNewObjDesc] = useState('');
  const [expandedFnIds, setExpandedFnIds] = useState<Set<string>>(new Set());
  const aiWs = useAiWorkspaceBuilder();
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const canManageWorkspace = can('workspace.manage');
  const canManageSubSpace = can('subspace.manage');
  const isWeb = Platform.OS === 'web';
  const resolvedWorkspaceName = workspaceName.trim() || workspace?.name || 'Untitled Workspace';
  const resolvedRootEntity = rootEntity.trim() || workspace?.rootEntity || 'Core record';
  const workspaceSubSpaces = workspace?.subSpaces ?? [];
  const workspaceBuilderFields = workspace?.builderFields ?? [];
  const hasSubSpaces = (workspace?.subSpaces?.length ?? 0) > 0;
  const hasSelectedSubSpace = !!selectedSubSpace;
  const hasSelectedSubSpaceFields = (selectedSubSpace?.builderFields?.length ?? 0) > 0;
  const hasAnySubSpaceFields = (workspace?.subSpaces ?? []).some((item) => (item.builderFields?.length ?? 0) > 0);
  const totalBuilderFields = workspaceBuilderFields.length + workspaceSubSpaces.reduce((sum, item) => sum + (item.builderFields?.length ?? 0), 0);
  const totalRequiredBuilderFields = workspaceSubSpaces.reduce(
    (sum, item) => sum + (item.builderFields ?? []).filter((field) => field.required).length,
    workspaceBuilderFields.filter((field) => field.required).length,
  );
  const useCompactBuilderSections = windowWidth < 1200;
  const useCompactAdminShell = windowWidth < 900;
  const useTwoColumnDetailsForm = windowWidth >= 1180;
  const isWorkspaceStepComplete = !!workspace && workspaceName.trim().length > 0 && rootEntity.trim().length > 0;
  const isSubSpacesStepComplete = hasSubSpaces;
  const isFieldsStepComplete = hasAnySubSpaceFields;
  const builderStep: 'workspace' | 'subspaces' | 'fields' | 'review' = workspacePane === 'workspace'
    ? 'workspace'
    : !hasSubSpaces
      ? 'subspaces'
      : !hasSelectedSubSpace
        ? 'subspaces'
        : !hasSelectedSubSpaceFields
          ? 'fields'
          : 'review';

  const fieldTypeIcons: Record<SubSpaceBuilderFieldType, string> = {
    text: 'Aa', longText: '¶', number: '#', currency: '$', date: '📅', datetime: '🕐',
    select: '▾', checkbox: '☑', email: '@', phone: '☎', attachment: '📎',
  };

  const buildSignalSuggestion = (fieldLabel: string, fieldType: SubSpaceBuilderFieldType): string => {
    const label = fieldLabel.trim() || 'this field';
    const suggestions: Partial<Record<SubSpaceBuilderFieldType, string>> = {
      date: `When "${label}" passes its due date, move record to "Overdue" stage and notify the assigned owner.`,
      datetime: `When "${label}" is within 24 hours, send a reminder notification to the team channel.`,
      number: `When "${label}" drops below threshold (e.g. < 10), trigger a reorder or escalation flow.`,
      currency: `When "${label}" exceeds a dollar threshold (e.g. > $10,000), trigger an approval or audit flow.`,
      select: `When "${label}" changes to a specific value (e.g. "Rejected"), log the change and notify the reviewer.`,
      checkbox: `When "${label}" is checked, mark the record complete and log an audit entry.`,
      text: `When "${label}" is populated on a new record, auto-assign to the relevant team based on value.`,
      email: `When a record's "${label}" changes, send a confirmation email to the new address.`,
      phone: `When "${label}" is set, add the record to the callback queue and notify the assigned agent.`,
    };
    return suggestions[fieldType] ?? `When "${label}" changes, create a Signal Studio flow to automate the next step in your workflow.`;
  };

  const visualWsFields = useMemo(() => {
    if (wsDragFromIndex === null || wsDragOverIndex === null || wsDragFromIndex === wsDragOverIndex) {
      return workspaceBuilderFields;
    }
    const fields = [...workspaceBuilderFields];
    const [moved] = fields.splice(wsDragFromIndex, 1);
    fields.splice(wsDragOverIndex, 0, moved);
    return fields;
  }, [workspaceBuilderFields, wsDragFromIndex, wsDragOverIndex]);

  const draggedWsFieldId = wsDragFromIndex !== null ? (workspaceBuilderFields[wsDragFromIndex]?.id ?? null) : null;

  const builderStepRail = [
    { key: 'workspace' as const, label: 'Workspace', complete: isWorkspaceStepComplete },
    { key: 'subspaces' as const, label: 'SubSpaces', complete: isSubSpacesStepComplete },
    { key: 'fields' as const, label: 'Fields', complete: isFieldsStepComplete },
    { key: 'review' as const, label: 'Review', complete: isWorkspaceStepComplete && isSubSpacesStepComplete && isFieldsStepComplete },
  ];

  const toggleAdminSection = (section: string) => {
    setExpandedAdminSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const adminNavSections = [
    {
      key: 'shell',
      label: 'Language & Intake',
      description: 'Start here — name your records, build intake forms, define personas, and map lifecycle stages.',
      items: [
        { label: 'App Terminology', detail: 'Rename records, workspaces, and SubSpaces', onPress: () => { setAdminTab('shell'); setShellPane('labels'); } },
        { label: 'Intake Form Builder', detail: 'Define the fields new records start with', onPress: () => { setAdminTab('shell'); setShellPane('intake'); } },
        { label: 'User Personas', detail: 'Create workflow personas and scope them', onPress: () => { setAdminTab('shell'); setShellPane('personas'); } },
        { label: 'Lifecycle Stages', detail: 'Define stages and stage-to-stage transitions', onPress: () => { setAdminTab('shell'); setShellPane('lifecycle'); } },
      ],
    },
    {
      key: 'workspace',
      label: 'Workspace Design',
      description: 'Build your operational core, SubSpaces, and data fields.',
      items: [
        { label: 'Configure Workspace', detail: 'Name, entity, and route', onPress: () => { setAdminTab('workspace'); setWorkspacePane('workspace'); setWizardStep(1); } },
        { label: 'SubSpace Lanes & Fields', detail: 'Create lanes and assign tracked fields', onPress: () => { setAdminTab('workspace'); setWorkspacePane('subspaces'); } },
      ],
    },
    {
      key: 'forms',
      label: 'Form Catalog',
      description: 'Browse all derived and explicit forms across every workspace and SubSpace.',
      items: [
        { label: 'Browse Forms', detail: 'View forms by workspace and SubSpace', onPress: () => { setAdminTab('forms'); } },
      ],
    },
    {
      key: 'role',
      label: 'Access & Permissions',
      description: 'Create roles, assign permissions, scope workspace access, and manage policy templates.',
      items: [
        { label: 'Role Manager', detail: 'Create and edit role profiles', onPress: () => { setAdminTab('role'); setRolePane('roles'); } },
        { label: 'Permission Map', detail: 'Toggle individual permissions per role', onPress: () => { setAdminTab('role'); setRolePane('permissions'); } },
        { label: 'Workspace Scope', detail: 'Limit which workspaces a role can access', onPress: () => { setAdminTab('role'); setRolePane('scope'); } },
        { label: 'Policy Templates', detail: 'Save, clone, and version permission snapshots', onPress: () => { setAdminTab('role'); setRolePane('templates'); } },
        { label: 'Template Diff & Audit', detail: 'Compare and promote template versions', onPress: () => { setAdminTab('role'); setRolePane('diff'); } },
      ],
    },
    {
      key: 'governance',
      label: 'Compliance & Health',
      description: 'Review setup completeness and fix warnings before going live.',
      items: [
        { label: 'Setup Health Report', detail: 'Workspace coverage, form gaps, and action items', onPress: () => { setAdminTab('governance'); } },
        { label: 'Audit Log', detail: 'Track all platform changes and actions', onPress: () => { setAdminTab('governance'); } },
      ],
    },
    {
      key: 'architecture',
      label: 'Business Architecture',
      description: 'Define departments and objects — the layer above workspaces that organises your whole operation.',
      items: [
        { label: 'Departments & Objects', detail: 'Build and manage your business hierarchy', onPress: () => setAdminTab('architecture') },
        { label: 'Architecture Terminology', detail: 'Rename departments, objects, and collections', onPress: () => { setAdminTab('shell'); setShellPane('labels'); } },
      ],
    },
  ];

  const getActiveNavItemKey = (): string => {
    if (adminTab === 'architecture') return 'Departments & Objects';
    if (adminTab === 'workspace') return workspacePane === 'workspace' ? 'Configure Workspace' : 'SubSpace Lanes & Fields';
    if (adminTab === 'shell') {
      if (shellPane === 'labels') return 'App Terminology';
      if (shellPane === 'intake') return 'Intake Form Builder';
      if (shellPane === 'personas') return 'User Personas';
      return 'Lifecycle Stages';
    }
    if (adminTab === 'forms') return 'Browse Forms';
    if (adminTab === 'role') {
      if (rolePane === 'roles') return 'Role Manager';
      if (rolePane === 'permissions') return 'Permission Map';
      if (rolePane === 'scope') return 'Workspace Scope';
      if (rolePane === 'templates') return 'Policy Templates';
      return 'Template Diff & Audit';
    }
    return 'Setup Health Report';
  };

  const activeNavItemKey = getActiveNavItemKey();

  const adminContentHeaders: Record<string, { title: string; description: string }> = {
    architecture: {
      title: 'Business Architecture',
      description: `Define ${data.shellConfig.functionLabelPlural ?? 'Departments'} and ${data.shellConfig.objectLabelPlural ?? 'Objects'} — the layer above workspaces that maps your entire operation before any records are created.`,
    },
    workspace: {
      title: 'Workspace Design',
      description: 'Build from the core out: define your workspace identity, branch into SubSpaces, and configure the data fields each lane captures. The live preview mirrors what end users will see.',
    },
    shell: {
      title: 'Language & Intake',
      description: 'Customize the words your team sees, build the intake form that starts every new record, create user personas, and map out the lifecycle stages records move through.',
    },
    role: {
      title: 'Access & Permissions',
      description: 'Create roles and decide exactly what each one can see and do. Scope access to specific workspaces, save permission snapshots as reusable templates, and audit changes across versions.',
    },
    governance: {
      title: 'Compliance & Health',
      description: 'Your setup report card. Review workspace completeness, identify missing forms or relationships, and resolve warnings so the workspace is safe and ready for your team.',
    },
    forms: {
      title: 'Form Catalog',
      description: 'Browse every form in your platform — both auto-derived from SubSpace fields and explicitly created forms. See field details, types, and required status at a glance.',
    },
  };

  const goToBuilderStep = (step: 'workspace' | 'subspaces' | 'fields' | 'review') => {
    if (step === 'workspace') {
      setWorkspacePane('workspace');
      return;
    }

    setWorkspacePane('subspaces');

    if ((step === 'fields' || step === 'review') && !selectedSubSpaceId && workspace?.subSpaces?.[0]) {
      setSelectedSubSpaceId(workspace.subSpaces[0].id);
    }
  };

  const activeWalkthroughStep = adminWalkthroughSteps[walkthroughIndex];
  const isCurrentWalkthroughStepComplete = completedWalkthroughStepIds.includes(activeWalkthroughStep.id);

  const tryAddDroppedField = (maybeType: string | null | undefined) => {
    if (!maybeType) {
      return;
    }
    if (!fieldPalette.some((item) => item.type === maybeType)) {
      return;
    }
    addBuilderFieldToSubSpace(maybeType as SubSpaceBuilderFieldType);
  };

  const getDetailsFieldPlaceholder = (fieldType: SubSpaceBuilderFieldType) => {
    if (fieldType === 'number') {
      return 'Enter a number';
    }
    if (fieldType === 'currency') {
      return 'Enter dollar amount';
    }
    if (fieldType === 'date') {
      return 'MM / DD / YYYY';
    }
    if (fieldType === 'datetime') {
      return 'MM / DD / YYYY  ·  HH:MM AM/PM';
    }
    if (fieldType === 'select') {
      return 'Choose an option';
    }
    if (fieldType === 'checkbox') {
      return 'Yes / No';
    }
    if (fieldType === 'email') {
      return 'name@company.com';
    }
    if (fieldType === 'phone') {
      return '(555) 123-4567';
    }
    if (fieldType === 'attachment') {
      return 'Upload file';
    }
    if (fieldType === 'longText') {
      return 'Enter details';
    }
    return 'Enter value';
  };

  const goToWalkthroughStep = (index: number) => {
    const nextIndex = Math.max(0, Math.min(index, adminWalkthroughSteps.length - 1));
    const step = adminWalkthroughSteps[nextIndex];

    setWalkthroughIndex(nextIndex);
    setAdminTab(step.adminTab);

    if (step.workspacePane) {
      setWorkspacePane(step.workspacePane);
    }
    if (step.shellPane) {
      setShellPane(step.shellPane);
    }
    if (step.rolePane) {
      setRolePane(step.rolePane);
    }
  };

  const toggleCurrentWalkthroughStep = () => {
    setCompletedWalkthroughStepIds((current) => (
      current.includes(activeWalkthroughStep.id)
        ? current.filter((id) => id !== activeWalkthroughStep.id)
        : [...current, activeWalkthroughStep.id]
    ));
  };

  const goToFindingFix = (findingKey: 'orphanForms' | 'subspacesWithoutForms' | 'missingRelationships' | 'formsMapped' | 'subspacesCovered' | 'relationshipsComplete') => {
    if (findingKey === 'orphanForms') {
      setAdminTab('workspace');
      setWorkspacePane('subspaces');
      return;
    }

    if (findingKey === 'subspacesWithoutForms') {
      setAdminTab('workspace');
      setWorkspacePane('subspaces');
      if (firstSubSpaceWithoutFormId) {
        setSelectedSubSpaceId(firstSubSpaceWithoutFormId);
      }
      return;
    }

    if (findingKey === 'missingRelationships') {
      setAdminTab('workspace');
      setWorkspacePane('subspaces');
      if (firstRelatedSubSpaceMissingRelationshipId) {
        setSelectedSubSpaceId(firstRelatedSubSpaceMissingRelationshipId);
      }
      return;
    }

    setAdminTab('workspace');
    setWorkspacePane('workspace');
  };
  const {
    shellConfig,
    workspaces: shellWorkspaces,
    subjectSingular,
    setSubjectSingular,
    subjectPlural,
    setSubjectPlural,
    workspaceLabel,
    setWorkspaceLabel,
    subSpaceLabel,
    setSubSpaceLabel,
    functionLabel,
    setFunctionLabel,
    functionLabelPlural,
    setFunctionLabelPlural,
    objectLabel: shellObjectLabel,
    setObjectLabel: setShellObjectLabel,
    objectLabelPlural,
    setObjectLabelPlural,
    collectionLabel,
    setCollectionLabel,
    collectionLabelPlural,
    setCollectionLabelPlural,
    newFieldLabel,
    setNewFieldLabel,
    newFieldType,
    setNewFieldType,
    newFieldRequired,
    setNewFieldRequired,
    newFieldOptions,
    setNewFieldOptions,
    personaName,
    setPersonaName,
    personaDescription,
    setPersonaDescription,
    personaWorkspaceScope,
    setPersonaWorkspaceScope,
    personaWorkspaceIds,
    togglePersonaWorkspace,
    personaDefaultTags,
    setPersonaDefaultTags,
    newLifecycleName,
    setNewLifecycleName,
    newLifecycleDescription,
    setNewLifecycleDescription,
    transitionFromStageId,
    setTransitionFromStageId,
    transitionToStageId,
    setTransitionToStageId,
    transitionPersonaScope,
    setTransitionPersonaScope,
    transitionPersonaIds,
    toggleTransitionPersona,
    notice: shellNotice,
    saveLabels,
    addIntakeField,
    removeIntakeField,
    createPersona,
    deletePersona,
    addLifecycleStage,
    addLifecycleTransition,
    deleteLifecycleStage,
    deleteLifecycleTransition,
    setDefaultLifecycleStage,
  } = useAdminShellDesigner();
  const {
    roles,
    workspaces: policyWorkspaces,
    templates,
    templateLineages,
    templateName,
    setTemplateName,
    templateDescription,
    setTemplateDescription,
    selectedRole,
    selectedRoleId,
    setSelectedRoleId,
    newRoleName,
    setNewRoleName,
    roleName,
    setRoleName,
    roleDescription,
    setRoleDescription,
    permissions,
    workspaceScope,
    setWorkspaceScope,
    workspaceIds,
    diffFromTemplateId,
    setDiffFromTemplateId,
    diffToTemplateId,
    setDiffToTemplateId,
    templateDiff,
    promotionNote,
    setPromotionNote,
    message: roleMessage,
    togglePermission,
    applyTemplate,
    clearPermissions,
    saveAsTemplate,
    cloneTemplate,
    createTemplateVersion,
    runSelectedTemplateDiff,
    compareTemplateToLatest,
    promoteCompareAsNewVersion,
    clearTemplateDiff,
    removeCustomTemplate,
    toggleWorkspace,
    createRole,
    saveRole,
    removeRole,
  } = useRolePolicyBuilder();

  const membersInRole = data.users.filter((u) => u.roleId === selectedRoleId);
  const isEditingOwnRole = !!(currentUser && currentUser.roleId === selectedRoleId);

  useEffect(() => {
    if (isCreatingWorkspace) {
      setShowCreateModeBanner(true);
    }
  }, [isCreatingWorkspace]);

  // Auto-advance removed — let users stay on step 1 to create multiple workspaces
  // before drilling into sections/fields. The workspace picker on step 1 already
  // lets them select a workspace and manually navigate forward.

  useEffect(() => {
    const saveDraftLabel =
      adminTab === 'workspace'
        ? 'Save Workspace Design'
        : adminTab === 'shell'
          ? 'Save Language & Intake'
          : adminTab === 'role'
            ? 'Save Access & Permissions'
            : 'Save Compliance Notes';

    const publishLabel =
      adminTab === 'workspace'
        ? 'Publish Workspace'
        : adminTab === 'shell'
          ? 'Publish Language & Intake'
          : adminTab === 'role'
            ? 'Publish Access Policy'
            : 'Publish Compliance';

    registerActions?.({
      saveDraftLabel,
      publishLabel,
      saveDraft: () => {
        if (adminTab === 'workspace') {
          saveWorkspace();
          return 'Workspace draft saved.';
        }
        if (adminTab === 'shell') {
          saveLabels();
          return 'Language & intake draft saved.';
        }
        if (adminTab === 'role') {
          saveRole();
          return 'Access & permissions draft saved.';
        }
        return 'Compliance review is already live.';
      },
      publish: () => {
        if (adminTab === 'workspace') {
          saveWorkspace();
          publishWorkspace();
          return 'Workspace changes published to End User.';
        }
        if (adminTab === 'shell') {
          saveLabels();
          return 'Language & intake published to End User.';
        }
        if (adminTab === 'role') {
          saveRole();
          return 'Access policy published.';
        }
        return 'Compliance review is already live.';
      },
    });
  }, [
    registerActions,
    adminTab,
    saveWorkspace,
    publishWorkspace,
    saveLabels,
    saveRole,
  ]);

  useEffect(() => {
    return () => {
      registerActions?.(null);
    };
  }, [registerActions]);

  // ── Spotlight walkthrough positioning ──
  const [spotlightRect, setSpotlightRect] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  const [walkthroughOpen, setWalkthroughOpen] = useState(guidedMode);
  const spotlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const measureTarget = useCallback(() => {
    if (!guidedMode || !walkthroughOpen || Platform.OS !== 'web') return;
    const step = adminWalkthroughSteps[walkthroughIndex];
    if (!step?.targetId) { setSpotlightRect(null); return; }
    const el = document.getElementById(step.targetId);
    if (!el) { setSpotlightRect(null); return; }
    const rect = el.getBoundingClientRect();
    setSpotlightRect({ top: rect.top, left: rect.left, width: rect.width, height: rect.height });
  }, [guidedMode, walkthroughOpen, walkthroughIndex]);

  useEffect(() => {
    if (!guidedMode || !walkthroughOpen) return;
    // Delay measurement so the DOM has time to render after tab switch
    spotlightTimerRef.current = setTimeout(measureTarget, 180);
    const onScroll = () => measureTarget();
    const onResize = () => measureTarget();
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);
    return () => {
      if (spotlightTimerRef.current) clearTimeout(spotlightTimerRef.current);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
    };
  }, [guidedMode, walkthroughOpen, walkthroughIndex, measureTarget]);

  return (
    <>
    <ScrollView style={styles.pageWrap} contentContainerStyle={[styles.pageContent, styles.pageContentTight]} keyboardShouldPersistTaps="handled">

      <View style={[styles.adminShell, useCompactAdminShell && { flexDirection: 'column' }]}>
        {/* ── Left Pane: Admin Navigation ── */}
        <View style={[styles.adminNavPane, useCompactAdminShell && styles.adminNavPaneCompact]}>
          {adminNavSections.map((section) => {
            const isExpanded = expandedAdminSections[section.key];
            const isSectionActive = adminTab === section.key;
            return (
              <View key={section.key} style={styles.adminNavSection}>
                <Pressable
                  style={[styles.adminNavSectionHeader, isSectionActive && styles.adminNavSectionHeaderActive, isSectionActive && { borderLeftColor: ac }]}
                  onPress={() => {
                    if (section.key === 'role' && !canManageWorkspace) return;
                    toggleAdminSection(section.key);
                    if (!isSectionActive) {
                      section.items[0]?.onPress();
                    }
                  }}
                >
                  <Text style={[styles.adminNavSectionHeaderLabel, section.key === 'role' && !canManageWorkspace && { opacity: 0.55 }, isSectionActive && { color: ac }]}>
                    {section.key === 'role' && !canManageWorkspace ? '🔒 ' : ''}{section.label}
                  </Text>
                  <Text style={[styles.adminNavSectionChevron, isSectionActive && { color: ac }]}>{isExpanded ? '▾' : '▸'}</Text>
                </Pressable>
                {isExpanded && (
                  <>
                    <Text style={styles.adminNavSectionDescription}>{section.description}</Text>
                    {section.items.map((item) => {
                      const isActive = activeNavItemKey === item.label;
                      const isRoleSection = section.key === 'role';
                      const isLocked = isRoleSection && !canManageWorkspace;
                      return (
                        <Pressable
                          key={item.label}
                          disabled={isLocked}
                          style={[styles.adminNavItem, isActive && styles.adminNavItemActive, isActive && { borderLeftColor: ac, backgroundColor: acRgba(0.10) }, isLocked && styles.buttonDisabled]}
                          onPress={isLocked ? undefined : item.onPress}
                        >
                          <Text style={[styles.adminNavItemLabel, isActive && styles.adminNavItemLabelActive, isActive && { color: ac }, isLocked && { opacity: 0.4 }]}>
                            {isLocked ? '🔒 ' : ''}{item.label}
                          </Text>
                          {!!item.detail && !isLocked && <Text style={styles.adminNavItemDetail}>{item.detail}</Text>}
                        </Pressable>
                      );
                    })}
                  </>
                )}
              </View>
            );
          })}
        </View>

        {/* ── Right Pane: Active Section Content ── */}
        <View style={[styles.adminContentPane, useCompactAdminShell && styles.adminContentPaneCompact]}>
          <View style={styles.adminContentHeader}>
            <Text style={styles.adminContentTitle}>{adminContentHeaders[adminTab].title}</Text>
            <Text style={styles.adminContentDescription}>{adminContentHeaders[adminTab].description}</Text>
          </View>

      {adminTab === 'workspace' && <Card title="" blurred>
        {/* ── WORKSPACE WIZARD STEP RAIL ── */}
        <View style={{
          flexDirection: 'row',
          marginBottom: 18,
          borderRadius: 12,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: mode === 'night' ? 'rgba(0,0,0,0.04)' : 'rgba(102,74,154,0.12)',
        }}>
          {([
            { step: 1 as const, icon: '🏷️', label: 'Name' },
            { step: 2 as const, icon: '📂', label: 'Sections' },
            { step: 3 as const, icon: '📝', label: 'Fields' },
            { step: 4 as const, icon: '🚀', label: 'Launch' },
          ]).map(({ step, icon, label }, idx) => {
            const isActive = wizardStep === step;
            const isDone = (step === 1 && isWorkspaceStepComplete) || (step === 2 && isSubSpacesStepComplete) || (step === 3 && isFieldsStepComplete);
            return (
              <Pressable
                key={step}
                onPress={() => { setWizardStep(step); setWorkspacePane(step <= 1 ? 'workspace' : 'subspaces'); }}
                style={{
                  flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                  paddingVertical: 11, paddingHorizontal: 8, gap: 5,
                  backgroundColor: isActive
                    ? acRgba(0.20)
                    : isDone
                      ? mode === 'night' ? 'rgba(34,197,94,0.08)' : 'rgba(34,197,94,0.06)'
                      : mode === 'night' ? 'rgba(0,0,0,0.015)' : 'rgba(0,0,0,0.02)',
                  borderRightWidth: idx < 3 ? 1 : 0,
                  borderRightColor: mode === 'night' ? 'rgba(0,0,0,0.04)' : 'rgba(102,74,154,0.10)',
                }}
              >
                <Text style={{ fontSize: 13 }}>{isDone && !isActive ? '✅' : icon}</Text>
                <Text style={{
                  fontSize: 12, fontWeight: isActive ? '800' : '600',
                  color: isActive ? ac : isDone ? '#22C55E' : mode === 'night' ? 'rgba(0,0,0,0.40)' : 'rgba(0,0,0,0.40)',
                }}>{label}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.builderLayout}>
          {/* ── LEFT: WIZARD STEPS ── */}
          <View style={[styles.builderConfigPane, { gap: 16 }]}>

            {/* STEP 1 — NAME YOUR WORKSPACE */}
            {wizardStep === 1 && (
              <>
                {!canManageWorkspace && (
                  <View style={{ backgroundColor: 'rgba(239,68,68,0.08)', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: 'rgba(239,68,68,0.22)' }}>
                    <Text style={[styles.metaText, { color: '#EF4444' }]}>{deniedMessage('workspace.manage')}</Text>
                  </View>
                )}

                {/* Empty-state hero — no workspaces yet */}
                {workspaces.length === 0 && canManageWorkspace && !isCreatingWorkspace && (
                  <View style={{ gap: 16 }}>
                    <View style={{
                      backgroundColor: mode === 'night' ? 'rgba(0,0,0,0.04)' : 'rgba(0,0,0,0.03)',
                      borderRadius: 16, padding: 24, borderWidth: 1,
                      borderColor: mode === 'night' ? 'rgba(0,0,0,0.06)' : 'rgba(0,0,0,0.06)',
                      alignItems: 'center' as any, gap: 10,
                    }}>
                      <Text style={{ fontSize: 44 }}>🏗️</Text>
                      <Text style={{ color: mode === 'night' ? '#E0E4ED' : '#1A2340', fontSize: 20, fontWeight: '800', textAlign: 'center' }}>Build your first workspace</Text>
                      <Text style={{ color: mode === 'night' ? 'rgba(0,0,0,0.55)' : 'rgba(0,0,0,0.50)', fontSize: 13, textAlign: 'center', lineHeight: 20 }}>
                        A workspace is like a dashboard for one job — it holds your data, sections, and fields.{'\n'}Start with a ready-made template or create your own from scratch.
                      </Text>
                    </View>

                    <Text style={{ color: mode === 'night' ? 'rgba(0,0,0,0.42)' : 'rgba(0,0,0,0.42)', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 }}>Ready-made templates</Text>
                    <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' as any }}>
                      <Pressable
                        nativeID="wt-load-template"
                        style={{ flex: 1, minWidth: 200, backgroundColor: mode === 'night' ? 'rgba(0,0,0,0.03)' : 'rgba(0,0,0,0.03)', borderRadius: 14, padding: 18, gap: 10, borderWidth: 1, borderColor: 'rgba(0,0,0,0.08)' }}
                        onPress={() => {
                          applyDscsaSerializationTemplate();
                          setWizardStep(4);
                          auditLog?.logEntry({ action: 'import', entityType: 'workspace', entityId: 'template', entityName: 'DSCSA Serialization Template', after: { template: 'DSCSA', subSpaces: 8, records: 17, flows: 5 } });
                          addNotification?.({ type: 'system', title: 'Template Loaded!', body: 'DSCSA workspace ready — 8 sections, 17 sample records.', severity: 'success' });
                        }}
                      >
                        <Text style={{ fontSize: 32 }}>💊</Text>
                        <Text style={{ color: mode === 'night' ? '#E0E4ED' : '#1A2340', fontWeight: '700', fontSize: 14 }}>DSCSA Pharma Serialization</Text>
                        <Text style={{ color: mode === 'night' ? 'rgba(0,0,0,0.48)' : 'rgba(0,0,0,0.48)', fontSize: 11, lineHeight: 17 }}>8 sections · 17 sample records · 5 automation flows · Full pharma supply chain</Text>
                        <View style={{ backgroundColor: ac, borderRadius: 10, paddingVertical: 10, alignItems: 'center' as any }}>
                          <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 13 }}>Use This Template →</Text>
                        </View>
                      </Pressable>
                      <Pressable
                        nativeID="wt-load-wrvas-template"
                        style={{ flex: 1, minWidth: 200, backgroundColor: mode === 'night' ? 'rgba(59,130,246,0.10)' : 'rgba(59,130,246,0.05)', borderRadius: 14, padding: 18, gap: 10, borderWidth: 1, borderColor: 'rgba(59,130,246,0.26)' }}
                        onPress={() => {
                          applyWrvasTemplate();
                          setWizardStep(4);
                          auditLog?.logEntry({ action: 'import', entityType: 'workspace', entityId: 'template', entityName: 'WRVAS Service Template', after: { template: 'WRVAS', subSpaces: 12, records: 22, flows: 5 } });
                          addNotification?.({ type: 'system', title: 'Template Loaded!', body: 'WRVAS workspace ready — 12 sections, 22 sample records.', severity: 'success' });
                        }}
                      >
                        <Text style={{ fontSize: 32 }}>🖥️</Text>
                        <Text style={{ color: mode === 'night' ? '#E0E4ED' : '#1A2340', fontWeight: '700', fontSize: 14 }}>WRVAS Service Operations</Text>
                        <Text style={{ color: mode === 'night' ? 'rgba(0,0,0,0.48)' : 'rgba(0,0,0,0.48)', fontSize: 11, lineHeight: 17 }}>12 sections · 22 sample records · 5 automation flows · IT device service</Text>
                        <View style={{ backgroundColor: '#3B82F6', borderRadius: 10, paddingVertical: 10, alignItems: 'center' as any }}>
                          <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 13 }}>Use This Template →</Text>
                        </View>
                      </Pressable>
                      <Pressable
                        nativeID="wt-load-legal-template"
                        style={{ flex: 1, minWidth: 200, backgroundColor: mode === 'night' ? 'rgba(201,168,76,0.10)' : 'rgba(201,168,76,0.06)', borderRadius: 14, padding: 18, gap: 10, borderWidth: 1, borderColor: 'rgba(201,168,76,0.28)' }}
                        onPress={() => {
                          applyLegalCaseTemplate();
                          setWizardStep(4);
                          auditLog?.logEntry({ action: 'import', entityType: 'workspace', entityId: 'template', entityName: 'Legal Case Management Template', after: { template: 'Legal', subSpaces: 5, records: 10, flows: 4 } });
                          addNotification?.({ type: 'system', title: 'Template Loaded!', body: 'Legal Case Management ready — 5 practice areas, 6 sample cases, 4 automation flows.', severity: 'success' });
                        }}
                      >
                        <Text style={{ fontSize: 32 }}>⚖️</Text>
                        <Text style={{ color: mode === 'night' ? '#E0E4ED' : '#1A2340', fontWeight: '700', fontSize: 14 }}>Legal Case Management</Text>
                        <Text style={{ color: mode === 'night' ? 'rgba(0,0,0,0.48)' : 'rgba(0,0,0,0.48)', fontSize: 11, lineHeight: 17 }}>5 practice areas · 6 sample cases · 4 automation flows · Intake → Closed/Archive</Text>
                        <View style={{ backgroundColor: '#C9A84C', borderRadius: 10, paddingVertical: 10, alignItems: 'center' as any }}>
                          <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 13 }}>Use This Template →</Text>
                        </View>
                      </Pressable>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <View style={{ flex: 1, height: 1, backgroundColor: mode === 'night' ? 'rgba(0,0,0,0.06)' : 'rgba(0,0,0,0.08)' }} />
                      <Text style={{ color: mode === 'night' ? 'rgba(0,0,0,0.32)' : 'rgba(0,0,0,0.32)', fontSize: 12 }}>or build from scratch</Text>
                      <View style={{ flex: 1, height: 1, backgroundColor: mode === 'night' ? 'rgba(0,0,0,0.06)' : 'rgba(0,0,0,0.08)' }} />
                    </View>
                    <Pressable style={[styles.primaryButton, { paddingVertical: 14 }]} onPress={beginCreateWorkspace}>
                      <Text style={[styles.primaryButtonText, { fontSize: 15, fontWeight: '700' }]}>+ Create My Own Workspace</Text>
                    </Pressable>
                  </View>
                )}

                {/* Creating from scratch — name form */}
                {isCreatingWorkspace && canManageWorkspace && (
                  <View style={{ gap: 14 }}>
                    <View style={{ backgroundColor: mode === 'night' ? 'rgba(0,0,0,0.03)' : 'rgba(0,0,0,0.03)', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: mode === 'night' ? 'rgba(0,0,0,0.06)' : 'rgba(0,0,0,0.06)' }}>
                      <Text style={{ color: mode === 'night' ? '#111111' : '#111111', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Creating a new workspace</Text>
                      <Text style={{ color: mode === 'night' ? 'rgba(0,0,0,0.58)' : 'rgba(0,0,0,0.50)', fontSize: 12, lineHeight: 18 }}>
                        Think of a workspace like a Jira project — "Sprint Board", "Bug Tracker", "Feature Requests". Keep the name short and clear.
                      </Text>
                    </View>

                    <View style={{ gap: 6 }}>
                      <Text style={{ color: mode === 'night' ? 'rgba(0,0,0,0.75)' : 'rgba(0,0,0,0.70)', fontSize: 14, fontWeight: '700' }}>What's this workspace called? <Text style={{ color: '#EF4444' }}>*</Text></Text>
                      <Text style={{ color: mode === 'night' ? 'rgba(0,0,0,0.40)' : 'rgba(0,0,0,0.40)', fontSize: 12 }}>e.g. "Sprint Board", "Bug Tracker", "Feature Requests", "Release Pipeline"</Text>
                      <LabeledInput label="" value={workspaceName} onChangeText={(v) => { setWorkspaceName(v); setRoute(v.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')); }} placeholder="My Workspace Name" />
                    </View>

                    <View style={{ gap: 6 }}>
                      <Text style={{ color: mode === 'night' ? 'rgba(0,0,0,0.75)' : 'rgba(0,0,0,0.70)', fontSize: 14, fontWeight: '700' }}>Each row in this workspace is a... <Text style={{ color: '#EF4444' }}>*</Text></Text>
                      <Text style={{ color: mode === 'night' ? 'rgba(0,0,0,0.40)' : 'rgba(0,0,0,0.40)', fontSize: 12 }}>One word for what you're tracking — e.g. "Issue", "Bug", "Feature", "Sprint", "Epic"</Text>
                      <LabeledInput label="" value={rootEntity} onChangeText={setRootEntity} placeholder="e.g. Order" />
                    </View>

                    <View style={{ gap: 6 }}>
                      <Text style={{ color: mode === 'night' ? 'rgba(0,0,0,0.35)' : 'rgba(0,0,0,0.32)', fontSize: 11, fontWeight: '600' }}>Quick fill examples:</Text>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap' as any, gap: 6 }}>
                        {[
                          { name: 'Sprint Board', entity: 'Issue' },
                          { name: 'Bug Tracker', entity: 'Bug' },
                          { name: 'Feature Requests', entity: 'Feature' },
                          { name: 'Release Pipeline', entity: 'Release' },
                          { name: 'Backlog', entity: 'Story' },
                          { name: 'Epic Board', entity: 'Epic' },
                          { name: 'QA Test Runs', entity: 'Test' },
                          { name: 'Incident Queue', entity: 'Incident' },
                        ].map((ex) => (
                          <Pressable
                            key={ex.name}
                            style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: mode === 'night' ? 'rgba(0,0,0,0.03)' : 'rgba(0,0,0,0.04)', borderWidth: 1, borderColor: mode === 'night' ? 'rgba(0,0,0,0.10)' : 'rgba(0,0,0,0.08)' }}
                            onPress={() => { setWorkspaceName(ex.name); setRootEntity(ex.entity); setRoute(ex.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')); }}
                          >
                            <Text style={{ fontSize: 11, color: mode === 'night' ? '#111111' : '#111111', fontWeight: '600' }}>{ex.name}</Text>
                          </Pressable>
                        ))}
                      </View>
                    </View>

                    <Pressable
                      nativeID="wt-create-workspace"
                      disabled={!canManageWorkspace || !workspaceName.trim() || !rootEntity.trim()}
                      style={[styles.primaryButton, { paddingVertical: 14 }, (!workspaceName.trim() || !rootEntity.trim()) && styles.buttonDisabled]}
                      onPress={() => {
                        if (!route.trim()) setRoute(workspaceName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-'));
                        saveWorkspace();
                        auditLog?.logEntry({ action: 'create', entityType: 'workspace', entityId: workspace?.id ?? '', entityName: workspaceName.trim() || 'Untitled Workspace', after: { name: workspaceName.trim(), rootEntity: rootEntity.trim(), route: route.trim() } });
                        addNotification?.({ type: 'system', title: 'Workspace Created!', body: `"${workspaceName.trim()}" is ready. Now add sections.`, severity: 'success' });
                        setWizardStep(2);
                        setWorkspacePane('subspaces');
                      }}
                    >
                      <Text style={[styles.primaryButtonText, { fontSize: 15 }]}>Create Workspace & Continue →</Text>
                    </Pressable>
                  </View>
                )}

                {/* Workspace picker — workspaces already exist */}
                {workspaces.length > 0 && canManageWorkspace && !isCreatingWorkspace && (
                  <View style={{ gap: 14 }}>
                    <View style={{ gap: 8 }}>
                      <Text style={{ color: mode === 'night' ? 'rgba(0,0,0,0.70)' : 'rgba(0,0,0,0.65)', fontSize: 13, fontWeight: '700' }}>Choose a workspace to edit</Text>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap' as any, gap: 8 }}>
                        {workspaces.map((ws) => (
                          <Pressable
                            key={ws.id}
                            style={{ paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, backgroundColor: selectedWorkspaceId === ws.id ? acRgba(0.18) : mode === 'night' ? 'rgba(0,0,0,0.02)' : 'rgba(0,0,0,0.03)', borderColor: selectedWorkspaceId === ws.id ? ac : mode === 'night' ? 'rgba(0,0,0,0.08)' : 'rgba(0,0,0,0.10)' }}
                            onPress={() => { setSelectedWorkspaceId(ws.id); setWizardStep(2); setWorkspacePane('subspaces'); }}
                          >
                            <Text style={{ fontSize: 13, fontWeight: '700', color: selectedWorkspaceId === ws.id ? '#111111' : mode === 'night' ? 'rgba(0,0,0,0.75)' : 'rgba(0,0,0,0.68)' }}>{ws.name}</Text>
                            <Text style={{ fontSize: 11, color: mode === 'night' ? 'rgba(0,0,0,0.35)' : 'rgba(0,0,0,0.35)', marginTop: 2 }}>{ws.subSpaces.length} section{ws.subSpaces.length !== 1 ? 's' : ''}</Text>
                          </Pressable>
                        ))}
                      </View>
                    </View>

                    {hasWorkspace && (
                      <View style={{ gap: 10, borderTopWidth: 1, borderTopColor: mode === 'night' ? 'rgba(0,0,0,0.04)' : 'rgba(0,0,0,0.07)', paddingTop: 14 }}>
                        <Text style={{ color: mode === 'night' ? 'rgba(0,0,0,0.65)' : 'rgba(0,0,0,0.60)', fontSize: 13, fontWeight: '700' }}>Edit "{workspace?.name}"</Text>
                        <LabeledInput label="Workspace Name" value={workspaceName} onChangeText={setWorkspaceName} placeholder="Workspace Name" />
                        <LabeledInput label="Each row is a..." helperText="e.g. Order, Patient, Item" value={rootEntity} onChangeText={setRootEntity} placeholder="e.g. Order" />
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                          <Pressable style={[styles.primaryButton, { flex: 1 }]} onPress={() => { saveWorkspace(); addNotification?.({ type: 'system', title: 'Saved!', body: 'Workspace updated.', severity: 'success' }); setWizardStep(2); setWorkspacePane('subspaces'); }}>
                            <Text style={styles.primaryButtonText}>Save & Continue →</Text>
                          </Pressable>
                          <Pressable style={[styles.secondaryButton, { borderColor: 'rgba(239,68,68,0.30)', backgroundColor: 'rgba(239,68,68,0.06)' }]} onPress={() => { if (workspace) { removeWorkspace(workspace.id); addNotification?.({ type: 'system', title: 'Workspace Deleted', body: `"${workspace.name}" removed.`, severity: 'warning' }); } }}>
                            <Text style={[styles.secondaryButtonText, { color: '#EF4444' }]}>Delete</Text>
                          </Pressable>
                        </View>
                      </View>
                    )}

                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <View style={{ flex: 1, height: 1, backgroundColor: mode === 'night' ? 'rgba(0,0,0,0.04)' : 'rgba(0,0,0,0.07)' }} />
                      <Text style={{ color: mode === 'night' ? 'rgba(0,0,0,0.28)' : 'rgba(0,0,0,0.28)', fontSize: 11 }}>or</Text>
                      <View style={{ flex: 1, height: 1, backgroundColor: mode === 'night' ? 'rgba(0,0,0,0.04)' : 'rgba(0,0,0,0.07)' }} />
                    </View>
                    <Pressable style={[styles.secondaryButton, { paddingVertical: 12 }]} onPress={beginCreateWorkspace}>
                      <Text style={[styles.secondaryButtonText, { textAlign: 'center' }]}>+ Create Another Workspace</Text>
                    </Pressable>

                    {/* Templates when workspace exists */}
                    <View style={{ gap: 6, borderTopWidth: 1, borderTopColor: mode === 'night' ? 'rgba(0,0,0,0.04)' : 'rgba(0,0,0,0.06)', paddingTop: 12 }}>
                      <Text style={{ color: mode === 'night' ? 'rgba(0,0,0,0.33)' : 'rgba(0,0,0,0.33)', fontSize: 11, fontWeight: '600' }}>Load a template instead</Text>
                      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' as any }}>
                        <Pressable nativeID="wt-load-template" style={[styles.secondaryButton, { flex: 1 }]} onPress={() => { applyDscsaSerializationTemplate(); setWizardStep(4); addNotification?.({ type: 'system', title: 'Template Loaded!', body: 'DSCSA workspace loaded.', severity: 'success' }); }}>
                          <Text style={styles.secondaryButtonText}>💊 DSCSA Template</Text>
                        </Pressable>
                        <Pressable nativeID="wt-load-wrvas-template" style={[styles.secondaryButton, { flex: 1 }]} onPress={() => { applyWrvasTemplate(); setWizardStep(4); addNotification?.({ type: 'system', title: 'Template Loaded!', body: 'WRVAS workspace loaded.', severity: 'success' }); }}>
                          <Text style={styles.secondaryButtonText}>🖥️ WRVAS Template</Text>
                        </Pressable>
                        <Pressable nativeID="wt-load-legal-template-wizard" style={[styles.secondaryButton, { flex: 1 }]} onPress={() => { applyLegalCaseTemplate(); setWizardStep(4); addNotification?.({ type: 'system', title: 'Template Loaded!', body: 'Legal Case Management loaded.', severity: 'success' }); }}>
                          <Text style={styles.secondaryButtonText}>⚖️ Legal Template</Text>
                        </Pressable>
                      </View>
                      {isSuperAdmin && tenants.length > 1 && (
                        <Pressable nativeID="wt-seed-all-tenants" style={[styles.secondaryButton, { borderColor: ac }]} onPress={() => { const r = copyActiveDataToAllTenants(); if (r.ok) addNotification?.({ type: 'system', title: 'All Tenants Seeded', body: `Data copied to ${r.count} tenant${r.count === 1 ? '' : 's'}.`, severity: 'success' }); else addNotification?.({ type: 'system', title: 'Seed Failed', body: r.reason ?? 'Unable to seed.', severity: 'warning' }); }}>
                          <Text style={[styles.secondaryButtonText, { color: ac }]}>⬆ Seed Data → All Tenants</Text>
                        </Pressable>
                      )}
                    </View>
                  </View>
                )}
              </>
            )}

            {/* STEP 2 — ADD SECTIONS */}
            {wizardStep === 2 && (
              <>
                {!hasWorkspace ? (
                  <View style={{ backgroundColor: 'rgba(245,158,11,0.10)', borderRadius: 10, padding: 14, borderWidth: 1, borderColor: 'rgba(245,158,11,0.25)', gap: 10 }}>
                    <Text style={{ color: '#F59E0B', fontWeight: '700', fontSize: 13 }}>⚠ Create a workspace first</Text>
                    <Text style={{ color: mode === 'night' ? 'rgba(0,0,0,0.55)' : 'rgba(0,0,0,0.50)', fontSize: 12 }}>Go to Step 1 to name your workspace before adding sections.</Text>
                    <Pressable style={[styles.secondaryButton, { alignSelf: 'flex-start' as any }]} onPress={() => { setWizardStep(1); setWorkspacePane('workspace'); }}>
                      <Text style={styles.secondaryButtonText}>← Go to Step 1</Text>
                    </Pressable>
                  </View>
                ) : (
                  <>
                    <View style={{ backgroundColor: mode === 'night' ? 'rgba(0,0,0,0.02)' : 'rgba(0,0,0,0.03)', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: mode === 'night' ? 'rgba(0,0,0,0.06)' : 'rgba(0,0,0,0.05)' }}>
                      <Text style={{ color: mode === 'night' ? '#111111' : '#111111', fontSize: 12, fontWeight: '700', marginBottom: 4 }}>📂 SECTIONS in "{workspace?.name}"</Text>
                      <Text style={{ color: mode === 'night' ? 'rgba(0,0,0,0.55)' : 'rgba(0,0,0,0.48)', fontSize: 12, lineHeight: 18 }}>
                        Sections are like tabs — each holds a different category of data. Example: "Details", "Documents", "Tasks", "Contacts".
                      </Text>
                    </View>

                    {/* Existing sections list */}
                    {workspaceSubSpaces.length > 0 && (
                      <View style={{ gap: 6 }}>
                        <Text style={{ color: mode === 'night' ? 'rgba(0,0,0,0.45)' : 'rgba(0,0,0,0.42)', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 }}>Your sections ({workspaceSubSpaces.length})</Text>
                        <Reorder.Group
                          as="div"
                          axis="y"
                          values={workspaceSubSpaces}
                          onReorder={canManageSubSpace ? applySubSpaceOrder : () => {}}
                          style={{ display: 'flex', flexDirection: 'column', gap: 4, listStyle: 'none', padding: 0, margin: 0 }}
                        >
                          {workspaceSubSpaces.map((ss, ssIdx) => (
                            <Reorder.Item
                              key={ss.id}
                              value={ss}
                              as="div"
                              style={{
                                display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 10,
                                backgroundColor: mode === 'night' ? 'rgba(0,0,0,0.03)' : 'rgba(0,0,0,0.03)',
                                borderRadius: 10, paddingLeft: 12, paddingRight: 12, paddingTop: 10, paddingBottom: 10,
                                borderWidth: 1, borderStyle: 'solid',
                                borderColor: selectedSubSpaceId === ss.id ? ac : mode === 'night' ? acRgba(0.20) : acRgba(0.14),
                                cursor: canManageSubSpace ? 'grab' : 'default',
                                userSelect: 'none',
                                position: 'relative',
                              }}
                              whileDrag={{ scale: 1.02, boxShadow: `0 8px 32px ${acRgba(0.30)}`, zIndex: 50, borderColor: ac }}
                              dragListener={canManageSubSpace}
                            >
                              {/* ⠿ drag handle */}
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: 18, opacity: canManageSubSpace ? 0.45 : 0.15, cursor: canManageSubSpace ? 'grab' : 'default', flexShrink: 0 }}>
                                <span style={{ fontSize: 16, color: '#111111', lineHeight: 1 }}>⠿</span>
                              </div>
                              <View style={{ width: 28, height: 28, borderRadius: 7, backgroundColor: 'rgba(0,0,0,0.08)', alignItems: 'center' as any, justifyContent: 'center' as any }}>
                                <Text style={{ fontSize: 12, color: '#111111', fontWeight: '800' }}>{ssIdx + 1}</Text>
                              </View>
                              <View style={{ flex: 1 }}>
                                <Text style={{ color: mode === 'night' ? '#E0E4ED' : '#1A2340', fontWeight: '700', fontSize: 13 }}>{ss.name}</Text>
                                <Text style={{ color: mode === 'night' ? 'rgba(0,0,0,0.35)' : 'rgba(0,0,0,0.35)', fontSize: 11, marginTop: 1 }}>{(ss.builderFields ?? []).length} field{(ss.builderFields ?? []).length !== 1 ? 's' : ''}</Text>
                              </View>
                              <Pressable
                                style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: selectedSubSpaceId === ss.id ? acRgba(0.28) : 'transparent', borderWidth: 1, borderColor: selectedSubSpaceId === ss.id ? ac : acRgba(0.25) }}
                                onPress={() => { setSelectedSubSpaceId(ss.id); setWizardStep(3); setWorkspacePane('subspaces'); }}
                              >
                                <Text style={{ fontSize: 11, fontWeight: '700', color: '#111111' }}>Add Fields →</Text>
                              </Pressable>
                              <Pressable
                                disabled={!canManageSubSpace}
                                style={{ width: 28, height: 28, borderRadius: 7, alignItems: 'center' as any, justifyContent: 'center' as any, backgroundColor: 'rgba(239,68,68,0.08)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.22)' }}
                                onPress={() => { removeSubSpace(ss.id); addNotification?.({ type: 'system', title: 'Section Removed', body: `"${ss.name}" deleted.`, severity: 'warning' }); }}
                              >
                                <Text style={{ fontSize: 13, color: '#EF4444', fontWeight: '700' }}>✕</Text>
                              </Pressable>
                            </Reorder.Item>
                          ))}
                        </Reorder.Group>
                      </View>
                    )}

                    {/* Add new section */}
                    <View style={{ gap: 8 }}>
                      <Text style={{ color: mode === 'night' ? 'rgba(0,0,0,0.68)' : 'rgba(0,0,0,0.62)', fontSize: 13, fontWeight: '700' }}>+ Add a section</Text>
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <View style={{ flex: 1 }}>
                          <LabeledInput label="" value={newSubSpaceName} onChangeText={(v) => { setNewSubSpaceName(v); setNewSubSpaceEntity(v); }} placeholder="Section name (e.g. Details, Tasks, Documents)" />
                        </View>
                        <Pressable
                          nativeID="wt-add-subspace"
                          disabled={!canManageSubSpace || !hasWorkspace || !newSubSpaceName.trim()}
                          style={{ paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10, backgroundColor: newSubSpaceName.trim() ? ac : acRgba(0.20), justifyContent: 'center' as any, alignItems: 'center' as any, opacity: !canManageSubSpace || !hasWorkspace ? 0.4 : 1 }}
                          onPress={() => {
                            if (!newSubSpaceName.trim()) return;
                            const name = newSubSpaceName.trim();
                            createSubSpace();
                            auditLog?.logEntry({ action: 'create', entityType: 'subspace', entityId: '', entityName: name, after: { workspace: workspace?.name } });
                            addNotification?.({ type: 'system', title: 'Section Added', body: `"${name}" added.`, severity: 'success' });
                            setNewSubSpaceName(''); setNewSubSpaceEntity('');
                          }}
                        >
                          <Text style={{ color: '#FFF', fontWeight: '800', fontSize: 22, lineHeight: 24 }}>+</Text>
                        </Pressable>
                      </View>
                    </View>

                    {/* Quick suggestion chips */}
                    <View style={{ gap: 6 }}>
                      <Text style={{ color: mode === 'night' ? 'rgba(0,0,0,0.33)' : 'rgba(0,0,0,0.32)', fontSize: 11, fontWeight: '600' }}>Quick add:</Text>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap' as any, gap: 6 }}>
                        {['Details', 'Documents', 'Tasks', 'Notes', 'Contacts', 'Timeline', 'Approvals', 'Status Updates', 'Inventory', 'History', 'Issues', 'Checklist']
                          .filter((s) => !workspaceSubSpaces.some((ss) => ss.name.toLowerCase() === s.toLowerCase()))
                          .map((suggestion) => (
                            <Pressable
                              key={suggestion}
                              disabled={!canManageSubSpace || !hasWorkspace}
                              style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: mode === 'night' ? 'rgba(0,0,0,0.03)' : 'rgba(0,0,0,0.04)', borderWidth: 1, borderColor: mode === 'night' ? 'rgba(0,0,0,0.11)' : 'rgba(0,0,0,0.09)' }}
                              onPress={() => { setNewSubSpaceName(suggestion); setNewSubSpaceEntity(suggestion); }}
                            >
                              <Text style={{ fontSize: 12, color: mode === 'night' ? 'rgba(0,0,0,0.62)' : 'rgba(0,0,0,0.56)', fontWeight: '600' }}>+ {suggestion}</Text>
                            </Pressable>
                          ))}
                      </View>
                    </View>

                    {/* Pipeline toggle */}
                    {workspaceSubSpaces.length >= 2 && (
                      <View style={[styles.listCard, { gap: 6 }]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                          <View style={{ gap: 2, flex: 1 }}>
                            <Text style={[styles.listTitle, styles.builderStudioTextPrimary]}>Pipeline Mode</Text>
                            <Text style={[styles.metaText, styles.builderStudioTextSecondary]}>Turn on to make sections flow in order — step 1 → 2 → 3 → done.</Text>
                          </View>
                          <Pressable onPress={togglePipelineEnabled} disabled={!canManageSubSpace} style={[styles.pill, workspace?.pipelineEnabled && styles.pillActive, { minWidth: 54, alignItems: 'center' as any }]} accessibilityRole="switch" accessibilityState={{ checked: !!workspace?.pipelineEnabled }}>
                            <Text style={[styles.pillText, workspace?.pipelineEnabled && styles.pillTextActive]}>{workspace?.pipelineEnabled ? 'ON' : 'OFF'}</Text>
                          </Pressable>
                        </View>
                        {workspace?.pipelineEnabled && (
                          <View style={{ flexDirection: 'row', flexWrap: 'wrap' as any, alignItems: 'center', gap: 4, paddingTop: 4 }}>
                            {(workspace.subSpaces ?? []).map((ss, idx) => (
                              <React.Fragment key={`pipe-${ss.id}`}>
                                {idx > 0 && <Text style={{ fontSize: 12, color: ac, fontWeight: '800' }}>→</Text>}
                                <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: selectedSubSpaceId === ss.id ? acRgba(0.36) : acRgba(0.12), borderWidth: 1, borderColor: selectedSubSpaceId === ss.id ? ac : acRgba(0.22) }}>
                                  <Text style={{ fontSize: 10, fontWeight: '700', color: selectedSubSpaceId === ss.id ? '#FFFFFF' : '#111111' }}>{idx + 1}. {ss.name}</Text>
                                </View>
                              </React.Fragment>
                            ))}
                          </View>
                        )}
                      </View>
                    )}

                    {/* Navigation row */}
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                      <Pressable style={[styles.secondaryButton, { flex: 1 }]} onPress={() => { setWizardStep(1); setWorkspacePane('workspace'); }}>
                        <Text style={[styles.secondaryButtonText, { textAlign: 'center' }]}>← Back</Text>
                      </Pressable>
                      <Pressable
                        disabled={!isSubSpacesStepComplete}
                        style={[styles.primaryButton, { flex: 2 }, !isSubSpacesStepComplete && styles.buttonDisabled]}
                        onPress={() => { if (workspace?.subSpaces?.[0]) setSelectedSubSpaceId(workspace.subSpaces[0].id); setWizardStep(3); setWorkspacePane('subspaces'); }}
                      >
                        <Text style={[styles.primaryButtonText, { textAlign: 'center' }]}>Continue to Fields →</Text>
                      </Pressable>
                    </View>
                    {!isSubSpacesStepComplete && <Text style={{ color: mode === 'night' ? 'rgba(0,0,0,0.32)' : 'rgba(0,0,0,0.32)', fontSize: 11, textAlign: 'center' }}>Add at least one section to continue</Text>}
                  </>
                )}
              </>
            )}

            {/* STEP 3 — ADD FIELDS */}
            {wizardStep === 3 && (
              <>
                {!hasWorkspace || !isSubSpacesStepComplete ? (
                  <View style={{ backgroundColor: 'rgba(245,158,11,0.10)', borderRadius: 10, padding: 14, borderWidth: 1, borderColor: 'rgba(245,158,11,0.25)', gap: 8 }}>
                    <Text style={{ color: '#F59E0B', fontWeight: '700', fontSize: 13 }}>⚠ Add sections first</Text>
                    <Pressable style={[styles.secondaryButton, { alignSelf: 'flex-start' as any }]} onPress={() => { setWizardStep(isSubSpacesStepComplete ? 1 : 2); }}>
                      <Text style={styles.secondaryButtonText}>← Go back</Text>
                    </Pressable>
                  </View>
                ) : (
                  <>
                    <View style={{ backgroundColor: mode === 'night' ? 'rgba(59,130,246,0.08)' : 'rgba(59,130,246,0.05)', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: mode === 'night' ? 'rgba(59,130,246,0.18)' : 'rgba(59,130,246,0.13)' }}>
                      <Text style={{ color: mode === 'night' ? '#60A5FA' : '#2563EB', fontSize: 12, fontWeight: '700', marginBottom: 4 }}>📝 FIELDS — what data you collect</Text>
                      <Text style={{ color: mode === 'night' ? 'rgba(0,0,0,0.55)' : 'rgba(0,0,0,0.48)', fontSize: 12, lineHeight: 18 }}>
                        Fields are the form questions on each record. Pick a section, type the field name, choose a type, and tap Add.
                      </Text>
                    </View>

                    {/* Section picker tabs */}
                    <View style={{ gap: 6 }}>
                      <Text style={{ color: mode === 'night' ? 'rgba(0,0,0,0.45)' : 'rgba(0,0,0,0.42)', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 }}>Select section to add fields to:</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexDirection: 'row', gap: 6 }}>
                        {workspaceSubSpaces.map((ss) => (
                          <Pressable
                            key={ss.id}
                            style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: selectedSubSpaceId === ss.id ? ac : mode === 'night' ? 'rgba(0,0,0,0.03)' : 'rgba(0,0,0,0.04)', borderWidth: 1, borderColor: selectedSubSpaceId === ss.id ? ac : mode === 'night' ? 'rgba(0,0,0,0.11)' : 'rgba(0,0,0,0.09)' }}
                            onPress={() => setSelectedSubSpaceId(ss.id)}
                          >
                            <Text style={{ fontSize: 12, fontWeight: '700', color: selectedSubSpaceId === ss.id ? '#FFFFFF' : mode === 'night' ? 'rgba(0,0,0,0.62)' : 'rgba(0,0,0,0.56)' }}>
                              {ss.name}{(ss.builderFields ?? []).length > 0 ? ` (${(ss.builderFields ?? []).length})` : ''}
                            </Text>
                          </Pressable>
                        ))}
                      </ScrollView>
                    </View>

                    {selectedSubSpace && (
                      <>
                        {/* Field name input */}
                        <View style={{ gap: 6 }}>
                          <Text style={{ color: mode === 'night' ? 'rgba(0,0,0,0.68)' : 'rgba(0,0,0,0.62)', fontSize: 13, fontWeight: '700' }}>Add a field to "{selectedSubSpace.name}"</Text>
                          <View nativeID="wt-field-palette"><LabeledInput label="" value={newBuilderFieldLabel} onChangeText={setNewBuilderFieldLabel} placeholder='Field name (e.g. "Customer Name", "Due Date", "Status")' /></View>
                        </View>

                        {/* Field type grid */}
                        <View style={{ gap: 6 }}>
                          <Text style={{ color: mode === 'night' ? 'rgba(0,0,0,0.45)' : 'rgba(0,0,0,0.42)', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 }}>Field type:</Text>
                          <View style={{ flexDirection: 'row', flexWrap: 'wrap' as any, gap: 6 }}>
                            {([
                              { type: 'text' as const, icon: 'Aa', label: 'Short Text', desc: 'Names, IDs' },
                              { type: 'number' as const, icon: '#', label: 'Number', desc: 'Quantities' },
                              { type: 'currency' as const, icon: '$', label: 'Currency', desc: 'Money values' },
                              { type: 'date' as const, icon: '📅', label: 'Date', desc: 'Deadlines' },
                              { type: 'select' as const, icon: '▾', label: 'Dropdown', desc: 'Choose option' },
                              { type: 'checkbox' as const, icon: '☑', label: 'Yes / No', desc: 'Toggle' },
                              { type: 'longText' as const, icon: '¶', label: 'Paragraph', desc: 'Long notes' },
                              { type: 'email' as const, icon: '@', label: 'Email', desc: 'Email addr' },
                              { type: 'phone' as const, icon: '☎', label: 'Phone', desc: 'Phone no.' },
                              { type: 'attachment' as const, icon: '📎', label: 'File', desc: 'Upload' },
                              { type: 'datetime' as const, icon: '🕐', label: 'Date & Time', desc: 'Timestamp' },
                            ] as Array<{ type: SubSpaceBuilderFieldType; icon: string; label: string; desc: string }>).map(({ type, icon, label, desc }) => (
                              <Pressable
                                key={type}
                                style={{ width: 86, paddingHorizontal: 6, paddingVertical: 9, borderRadius: 10, gap: 3, alignItems: 'center' as any, borderWidth: 1.5, backgroundColor: wizardActiveFieldType === type ? acRgba(0.22) : mode === 'night' ? 'rgba(0,0,0,0.02)' : 'rgba(0,0,0,0.02)', borderColor: wizardActiveFieldType === type ? ac : mode === 'night' ? 'rgba(0,0,0,0.06)' : 'rgba(0,0,0,0.09)' }}
                                onPress={() => setWizardActiveFieldType(type)}
                              >
                                <Text style={{ fontSize: 17, lineHeight: 21 }}>{icon}</Text>
                                <Text style={{ fontSize: 10, fontWeight: '700', textAlign: 'center' as any, color: wizardActiveFieldType === type ? '#111111' : mode === 'night' ? 'rgba(0,0,0,0.68)' : 'rgba(0,0,0,0.62)' }}>{label}</Text>
                                <Text style={{ fontSize: 9, textAlign: 'center' as any, color: mode === 'night' ? 'rgba(0,0,0,0.28)' : 'rgba(0,0,0,0.28)' }}>{desc}</Text>
                              </Pressable>
                            ))}
                          </View>
                        </View>

                        {/* Dropdown options entry — shown when 'select' type is active */}
                        {wizardActiveFieldType === 'select' && (
                          <View style={{ gap: 8 }}>
                            <Text style={{ color: mode === 'night' ? 'rgba(0,0,0,0.55)' : 'rgba(0,0,0,0.48)', fontSize: 11, fontWeight: '700', textTransform: 'uppercase' as any, letterSpacing: 1 }}>
                              Dropdown Options {newBuilderDropdownOptions.length > 0 ? `(${newBuilderDropdownOptions.length})` : ''}
                            </Text>
                            <View style={{ flexDirection: 'row', gap: 6 }}>
                              <TextInput
                                value={newBuilderDropdownOptionInput}
                                onChangeText={setNewBuilderDropdownOptionInput}
                                placeholder="Type an option..."
                                placeholderTextColor={mode === 'night' ? 'rgba(0,0,0,0.25)' : 'rgba(0,0,0,0.25)'}
                                style={{ flex: 1, backgroundColor: mode === 'night' ? 'rgba(0,0,0,0.04)' : 'rgba(0,0,0,0.04)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, color: mode === 'night' ? '#E0E4ED' : '#1A2340', fontSize: 13, borderWidth: 1, borderColor: mode === 'night' ? 'rgba(0,0,0,0.08)' : 'rgba(0,0,0,0.12)' } as any}
                                onSubmitEditing={() => {
                                  const val = newBuilderDropdownOptionInput.trim();
                                  if (val && !newBuilderDropdownOptions.includes(val)) {
                                    setNewBuilderDropdownOptions([...newBuilderDropdownOptions, val]);
                                  }
                                  setNewBuilderDropdownOptionInput('');
                                }}
                              />
                              <Pressable
                                style={{ backgroundColor: acRgba(0.18), borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8, justifyContent: 'center' as any }}
                                onPress={() => {
                                  const val = newBuilderDropdownOptionInput.trim();
                                  if (val && !newBuilderDropdownOptions.includes(val)) {
                                    setNewBuilderDropdownOptions([...newBuilderDropdownOptions, val]);
                                  }
                                  setNewBuilderDropdownOptionInput('');
                                }}
                              >
                                <Text style={{ color: '#111111', fontWeight: '700', fontSize: 13 }}>+ Add</Text>
                              </Pressable>
                            </View>
                            {newBuilderDropdownOptions.length > 0 && (
                              <View style={{ flexDirection: 'row', flexWrap: 'wrap' as any, gap: 6 }}>
                                {newBuilderDropdownOptions.map((opt) => (
                                  <Pressable
                                    key={opt}
                                    onPress={() => setNewBuilderDropdownOptions(newBuilderDropdownOptions.filter((o) => o !== opt))}
                                    style={{ flexDirection: 'row', alignItems: 'center' as any, gap: 4, backgroundColor: acRgba(0.14), borderRadius: 20, paddingVertical: 4, paddingHorizontal: 10, borderWidth: 1, borderColor: acRgba(0.28) }}
                                  >
                                    <Text style={{ color: '#111111', fontSize: 12, fontWeight: '600' }}>{opt}</Text>
                                    <Text style={{ color: 'rgba(0,0,0,0.15)', fontSize: 11 }}>✕</Text>
                                  </Pressable>
                                ))}
                              </View>
                            )}
                            {newBuilderDropdownOptions.length === 0 && (
                              <Text style={{ color: mode === 'night' ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.3)', fontSize: 11, fontStyle: 'italic' as any }}>Add at least one option, then click "Add Field" below.</Text>
                            )}
                          </View>
                        )}

                        {/* Date / DateTime sub-field hint */}
                        {(wizardActiveFieldType === 'date' || wizardActiveFieldType === 'datetime') && (
                          <View style={{ backgroundColor: acRgba(0.08), borderRadius: 10, padding: 10, gap: 6, borderWidth: 1, borderColor: acRgba(0.18) }}>
                            <Text style={{ color: mode === 'night' ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.45)', fontSize: 10, fontWeight: '700', textTransform: 'uppercase' as any, letterSpacing: 1 }}>
                              {wizardActiveFieldType === 'datetime' ? 'Date & Time — Split Entry' : 'Date — Split Entry'}
                            </Text>
                            <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' as any }}>
                              {(['MM', 'DD', 'YYYY'] as const).map((seg, i) => (
                                <React.Fragment key={seg}>
                                  <View style={{ flex: seg === 'YYYY' ? 2 : 1, backgroundColor: mode === 'night' ? 'rgba(0,0,0,0.04)' : 'rgba(0,0,0,0.04)', borderRadius: 8, paddingVertical: 7, alignItems: 'center' as any, borderWidth: 1, borderColor: mode === 'night' ? 'rgba(0,0,0,0.1)' : 'rgba(0,0,0,0.1)' }}>
                                    <Text style={{ color: mode === 'night' ? 'rgba(0,0,0,0.35)' : 'rgba(0,0,0,0.3)', fontSize: 11 }}>{seg}</Text>
                                  </View>
                                  {i < 2 && <Text style={{ color: mode === 'night' ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.25)', fontSize: 13 }}>/</Text>}
                                </React.Fragment>
                              ))}
                              {wizardActiveFieldType === 'datetime' && (
                                <>
                                  <Text style={{ color: mode === 'night' ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.2)', fontSize: 13, marginHorizontal: 2 }}>·</Text>
                                  {(['HH', 'MM'] as const).map((seg, i) => (
                                    <React.Fragment key={`t-${seg}`}>
                                      <View style={{ flex: 1, backgroundColor: mode === 'night' ? 'rgba(0,0,0,0.04)' : 'rgba(0,0,0,0.04)', borderRadius: 8, paddingVertical: 7, alignItems: 'center' as any, borderWidth: 1, borderColor: mode === 'night' ? 'rgba(0,0,0,0.1)' : 'rgba(0,0,0,0.1)' }}>
                                        <Text style={{ color: mode === 'night' ? 'rgba(0,0,0,0.35)' : 'rgba(0,0,0,0.3)', fontSize: 11 }}>{seg}</Text>
                                      </View>
                                      {i < 1 && <Text style={{ color: mode === 'night' ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.25)', fontSize: 13 }}>:</Text>}
                                    </React.Fragment>
                                  ))}
                                  <View style={{ flex: 1.3, backgroundColor: mode === 'night' ? 'rgba(0,0,0,0.04)' : 'rgba(0,0,0,0.04)', borderRadius: 8, paddingVertical: 7, alignItems: 'center' as any, borderWidth: 1, borderColor: mode === 'night' ? 'rgba(0,0,0,0.1)' : 'rgba(0,0,0,0.1)' }}>
                                    <Text style={{ color: mode === 'night' ? 'rgba(0,0,0,0.35)' : 'rgba(0,0,0,0.3)', fontSize: 11 }}>AM/PM</Text>
                                  </View>
                                </>
                              )}
                            </View>
                          </View>
                        )}

                        {/* Add field button */}
                        <Pressable
                          disabled={!canManageSubSpace || !newBuilderFieldLabel.trim()}
                          style={{ backgroundColor: newBuilderFieldLabel.trim() ? ac : acRgba(0.18), borderRadius: 10, paddingVertical: 12, alignItems: 'center' as any, opacity: !canManageSubSpace ? 0.4 : 1 }}
                          onPress={() => {
                            if (!newBuilderFieldLabel.trim()) return;
                            addBuilderFieldToSubSpace(wizardActiveFieldType);
                          }}
                        >
                          <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 14 }}>
                            + Add "{newBuilderFieldLabel.trim() || 'Field'}" as {
                              wizardActiveFieldType === 'datetime' ? 'Date & Time' :
                              wizardActiveFieldType === 'select' ? `Dropdown${newBuilderDropdownOptions.length > 0 ? ` (${newBuilderDropdownOptions.length} options)` : ''}` :
                              wizardActiveFieldType
                            }
                          </Text>
                        </Pressable>

                        {/* Existing fields in selected section */}
                        {(selectedSubSpace.builderFields ?? []).length > 0 && (
                          <View style={{ gap: 4 }}>
                            <Text style={{ color: mode === 'night' ? 'rgba(0,0,0,0.45)' : 'rgba(0,0,0,0.42)', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 }}>Fields in "{selectedSubSpace.name}" — tap name to rename, drag to reorder</Text>
                            <Reorder.Group
                              as="div"
                              axis="y"
                              values={selectedSubSpace.builderFields ?? []}
                              onReorder={canManageSubSpace ? applyBuilderFieldOrderInSubSpace : () => {}}
                              style={{ display: 'flex', flexDirection: 'column', gap: 4, listStyle: 'none', padding: 0, margin: 0 }}
                            >
                            {(selectedSubSpace.builderFields ?? []).map((field) => (
                              <Reorder.Item
                                key={field.id}
                                value={field}
                                as="div"
                                style={{
                                  backgroundColor: editingFieldId === field.id ? (mode === 'night' ? acRgba(0.14) : acRgba(0.08)) : (mode === 'night' ? 'rgba(0,0,0,0.02)' : 'rgba(0,0,0,0.03)'),
                                  borderRadius: 10, borderWidth: 1, borderStyle: 'solid',
                                  borderColor: editingFieldId === field.id ? ac : (mode === 'night' ? 'rgba(0,0,0,0.06)' : 'rgba(0,0,0,0.07)'),
                                  overflow: 'hidden',
                                  cursor: canManageSubSpace ? 'grab' : 'default',
                                  userSelect: 'none',
                                }}
                                whileDrag={{ scale: 1.02, boxShadow: '0 6px 24px rgba(0,0,0,0.28)', zIndex: 50 }}
                                dragListener={canManageSubSpace}
                              >
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10, paddingVertical: 8 }}>
                                  {/* Drag handle */}
                                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: 18, opacity: canManageSubSpace ? 0.45 : 0.15, cursor: canManageSubSpace ? 'grab' : 'default', flexShrink: 0 }}>
                                    <span style={{ fontSize: 16, color: '#111111', lineHeight: 1 }}>⠿</span>
                                  </div>
                                  {/* Type icon */}
                                  <View style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: 'rgba(0,0,0,0.06)', alignItems: 'center' as any, justifyContent: 'center' as any }}>
                                    <Text style={{ fontSize: 13 }}>{fieldTypeIcons[field.type] ?? '?'}</Text>
                                  </View>
                                  {/* Label — tap to edit inline */}
                                  <Pressable
                                    style={{ flex: 1 }}
                                    onPress={() => { if (editingFieldId === field.id) { setEditingFieldId(null); } else { setEditingFieldId(field.id); setEditingFieldLabel(field.label); } }}
                                  >
                                    <Text style={{ color: mode === 'night' ? 'rgba(0,0,0,0.55)' : 'rgba(0,0,0,0.42)', fontSize: 9, fontWeight: '600', textTransform: 'uppercase' as any }}>{field.type} · tap to rename</Text>
                                    <Text style={{ color: mode === 'night' ? '#E0E4ED' : '#1A2340', fontWeight: '700', fontSize: 13 }}>{field.label}</Text>
                                  </Pressable>
                                  {/* Required toggle */}
                                  <Pressable
                                    disabled={!canManageSubSpace}
                                    style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 7, borderWidth: 1, borderColor: field.required ? 'rgba(0,0,0,0.12)' : (mode === 'night' ? 'rgba(0,0,0,0.08)' : 'rgba(0,0,0,0.12)'), backgroundColor: field.required ? 'rgba(0,0,0,0.06)' : 'transparent' }}
                                    onPress={() => toggleBuilderFieldRequired(field.id)}
                                  >
                                    <Text style={{ fontSize: 10, fontWeight: '700', color: field.required ? '#111111' : (mode === 'night' ? 'rgba(0,0,0,0.40)' : 'rgba(0,0,0,0.38)') }}>{field.required ? '★ Req' : '☆ Opt'}</Text>
                                  </Pressable>
                                  {/* Delete */}
                                  <Pressable
                                    disabled={!canManageSubSpace}
                                    style={{ width: 28, height: 28, borderRadius: 7, alignItems: 'center' as any, justifyContent: 'center' as any, backgroundColor: 'rgba(239,68,68,0.08)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.22)' }}
                                    onPress={() => { removeBuilderFieldFromSubSpace(field.id); if (editingFieldId === field.id) setEditingFieldId(null); }}
                                  >
                                    <Text style={{ fontSize: 12, color: '#EF4444', fontWeight: '700' }}>✕</Text>
                                  </Pressable>
                                </View>
                                {/* Inline rename panel — shown when this field is being edited */}
                                {editingFieldId === field.id && (
                                  <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 10, paddingBottom: 10, paddingTop: 2 }}>
                                    <TextInput
                                      value={editingFieldLabel}
                                      onChangeText={setEditingFieldLabel}
                                      placeholder="New field name"
                                      placeholderTextColor={mode === 'night' ? 'rgba(0,0,0,0.25)' : 'rgba(0,0,0,0.25)'}
                                      autoFocus
                                      style={{ flex: 1, backgroundColor: mode === 'night' ? 'rgba(0,0,0,0.30)' : 'rgba(0,0,0,0.85)', borderRadius: 8, borderWidth: 1, borderColor: 'rgba(0,0,0,0.12)', paddingHorizontal: 10, paddingVertical: 7, color: mode === 'night' ? '#E0E4ED' : '#1A2340', fontSize: 13, fontWeight: '600' }}
                                      onSubmitEditing={() => { renameBuilderFieldInSubSpace(field.id, editingFieldLabel); setEditingFieldId(null); }}
                                    />
                                    <Pressable
                                      disabled={!editingFieldLabel.trim()}
                                      style={{ paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8, backgroundColor: editingFieldLabel.trim() ? ac : acRgba(0.20), justifyContent: 'center' as any }}
                                      onPress={() => { renameBuilderFieldInSubSpace(field.id, editingFieldLabel); setEditingFieldId(null); }}
                                    >
                                      <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 12 }}>Save</Text>
                                    </Pressable>
                                    <Pressable
                                      style={{ paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8, borderWidth: 1, borderColor: mode === 'night' ? 'rgba(0,0,0,0.14)' : 'rgba(0,0,0,0.14)', justifyContent: 'center' as any }}
                                      onPress={() => setEditingFieldId(null)}
                                    >
                                      <Text style={{ color: mode === 'night' ? 'rgba(0,0,0,0.55)' : 'rgba(0,0,0,0.48)', fontSize: 12 }}>Cancel</Text>
                                    </Pressable>
                                  </View>
                                )}
                              </Reorder.Item>
                            ))}
                            </Reorder.Group>
                          </View>
                        )}
                      </>
                    )}

                    {/* Navigation */}
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                      <Pressable style={[styles.secondaryButton, { flex: 1 }]} onPress={() => { setWizardStep(2); setWorkspacePane('subspaces'); }}>
                        <Text style={[styles.secondaryButtonText, { textAlign: 'center' }]}>← Back</Text>
                      </Pressable>
                      <Pressable style={[styles.primaryButton, { flex: 2 }]} onPress={() => setWizardStep(4)}>
                        <Text style={[styles.primaryButtonText, { textAlign: 'center' }]}>Review & Launch →</Text>
                      </Pressable>
                    </View>
                  </>
                )}
              </>
            )}

            {/* STEP 4 — REVIEW & LAUNCH */}
            {wizardStep === 4 && (
              <>
                {hasWorkspace ? (
                  <>
                    <View style={{ backgroundColor: mode === 'night' ? 'rgba(34,197,94,0.10)' : 'rgba(34,197,94,0.07)', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: mode === 'night' ? 'rgba(34,197,94,0.24)' : 'rgba(34,197,94,0.18)', alignItems: 'center' as any, gap: 10 }}>
                      <Text style={{ fontSize: 40 }}>🎉</Text>
                      <Text style={{ color: mode === 'night' ? '#E0E4ED' : '#1A2340', fontSize: 18, fontWeight: '800', textAlign: 'center' }}>{workspace?.name} is ready!</Text>
                      <Text style={{ color: mode === 'night' ? 'rgba(0,0,0,0.52)' : 'rgba(0,0,0,0.48)', fontSize: 12, textAlign: 'center', lineHeight: 18 }}>Review everything below, then publish so your team can see it in the End User view.</Text>
                    </View>

                    {/* Summary */}
                    <View style={{ backgroundColor: mode === 'night' ? 'rgba(0,0,0,0.02)' : 'rgba(0,0,0,0.03)', borderRadius: 12, padding: 16, gap: 12, borderWidth: 1, borderColor: mode === 'night' ? 'rgba(0,0,0,0.06)' : 'rgba(0,0,0,0.07)' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.08)', alignItems: 'center' as any, justifyContent: 'center' as any }}>
                          <Text style={{ fontSize: 18 }}>🏗️</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: mode === 'night' ? '#E0E4ED' : '#1A2340', fontWeight: '800', fontSize: 16 }}>{workspace?.name}</Text>
                          <Text style={{ color: mode === 'night' ? 'rgba(0,0,0,0.42)' : 'rgba(0,0,0,0.42)', fontSize: 12 }}>Tracking: {workspace?.rootEntity} · Route: /{workspace?.route}</Text>
                        </View>
                      </View>

                      <View style={{ gap: 4 }}>
                        <Text style={{ color: mode === 'night' ? 'rgba(0,0,0,0.45)' : 'rgba(0,0,0,0.42)', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 }}>{workspaceSubSpaces.length} Section{workspaceSubSpaces.length !== 1 ? 's' : ''} · {totalBuilderFields} Field{totalBuilderFields !== 1 ? 's' : ''}</Text>
                        {workspaceSubSpaces.map((ss) => (
                          <View key={ss.id} style={{ flexDirection: 'row', gap: 10, alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.04)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 }}>
                            <Text style={{ color: '#111111', fontWeight: '700', fontSize: 12, flex: 1 }}>{ss.name}</Text>
                            <Text style={{ color: mode === 'night' ? 'rgba(0,0,0,0.35)' : 'rgba(0,0,0,0.35)', fontSize: 11 }}>{(ss.builderFields ?? []).length} field{(ss.builderFields ?? []).length !== 1 ? 's' : ''}</Text>
                            {(ss.builderFields ?? []).filter((f) => f.required).length > 0 && <Text style={{ color: '#22C55E', fontSize: 10, fontWeight: '600' }}>{(ss.builderFields ?? []).filter((f) => f.required).length} req</Text>}
                            <Pressable onPress={() => { setSelectedSubSpaceId(ss.id); setWizardStep(3); }}>
                              <Text style={{ fontSize: 11, color: '#111111', fontWeight: '600' }}>Edit</Text>
                            </Pressable>
                          </View>
                        ))}
                        {workspaceSubSpaces.length === 0 && (
                          <View style={{ padding: 10, backgroundColor: 'rgba(245,158,11,0.10)', borderRadius: 8, borderWidth: 1, borderColor: 'rgba(245,158,11,0.22)' }}>
                            <Text style={{ color: '#F59E0B', fontSize: 12, fontWeight: '600' }}>⚠ No sections yet — add at least one.</Text>
                            <Pressable style={{ marginTop: 4 }} onPress={() => { setWizardStep(2); }}>
                              <Text style={{ color: '#F59E0B', fontSize: 12, textDecorationLine: 'underline' }}>Add sections →</Text>
                            </Pressable>
                          </View>
                        )}
                        {totalBuilderFields === 0 && workspaceSubSpaces.length > 0 && (
                          <View style={{ padding: 10, backgroundColor: 'rgba(245,158,11,0.10)', borderRadius: 8, borderWidth: 1, borderColor: 'rgba(245,158,11,0.22)' }}>
                            <Text style={{ color: '#F59E0B', fontSize: 12, fontWeight: '600' }}>⚠ No fields yet — sections need fields so users can fill in data.</Text>
                            <Pressable style={{ marginTop: 4 }} onPress={() => { setWizardStep(3); }}>
                              <Text style={{ color: '#F59E0B', fontSize: 12, textDecorationLine: 'underline' }}>Add fields →</Text>
                            </Pressable>
                          </View>
                        )}
                      </View>
                    </View>

                    {/* Publish */}
                    <Pressable
                      nativeID="wt-create-workspace"
                      disabled={!canManageWorkspace}
                      style={[{ backgroundColor: '#22C55E', borderRadius: 12, paddingVertical: 16, alignItems: 'center' as any }, !canManageWorkspace && styles.buttonDisabled, Platform.OS === 'web' ? { boxShadow: '0 4px 18px rgba(34,197,94,0.34)' } as any : {}]}
                      onPress={() => { saveWorkspace(); publishWorkspace(); auditLog?.logEntry({ action: 'publish', entityType: 'workspace', entityId: workspace?.id ?? '', entityName: workspace?.name ?? '', after: { published: true } }); addNotification?.({ type: 'system', title: '🚀 Workspace Published!', body: `"${workspace?.name}" is now live in the End User view.`, severity: 'success' }); }}
                    >
                      <Text style={{ color: '#FFF', fontWeight: '800', fontSize: 16 }}>🚀 Publish to End User</Text>
                    </Pressable>
                    <Pressable style={[styles.secondaryButton, { paddingVertical: 11 }]} onPress={() => { saveWorkspace(); addNotification?.({ type: 'system', title: 'Draft Saved', body: `"${workspace?.name}" saved.`, severity: 'info' }); }}>
                      <Text style={[styles.secondaryButtonText, { textAlign: 'center' }]}>Save as Draft (publish later)</Text>
                    </Pressable>

                    <View style={{ backgroundColor: mode === 'night' ? 'rgba(0,0,0,0.02)' : 'rgba(0,0,0,0.03)', borderRadius: 10, padding: 12, gap: 5, borderWidth: 1, borderColor: mode === 'night' ? 'rgba(0,0,0,0.08)' : 'rgba(0,0,0,0.05)' }}>
                      <Text style={{ color: mode === 'night' ? '#111111' : '#111111', fontWeight: '700', fontSize: 12 }}>What happens after publishing?</Text>
                      <Text style={{ color: mode === 'night' ? 'rgba(0,0,0,0.52)' : 'rgba(0,0,0,0.48)', fontSize: 12, lineHeight: 18 }}>{'→ Your workspace appears in End User (sidebar nav).\n→ Team members can create records, fill in fields, and track status.\n→ You can keep editing — changes publish in real time.'}</Text>
                      <Text style={{ color: mode === 'night' ? 'rgba(0,0,0,0.38)' : 'rgba(0,0,0,0.36)', fontSize: 11, marginTop: 3 }}>Next: Set up lifecycle stages via Language & Intake → Lifecycle Stages</Text>
                    </View>
                  </>
                ) : (
                  <View style={{ gap: 14, alignItems: 'center' as any }}>
                    <Text style={{ color: mode === 'night' ? 'rgba(0,0,0,0.50)' : 'rgba(0,0,0,0.48)', fontSize: 13, textAlign: 'center' }}>Complete steps 1–3 to build your workspace first.</Text>
                    <Pressable style={styles.primaryButton} onPress={() => { setWizardStep(1); setWorkspacePane('workspace'); }}>
                      <Text style={[styles.primaryButtonText, { textAlign: 'center' }]}>Start from Step 1</Text>
                    </Pressable>
                  </View>
                )}
              </>
            )}

          </View>

          {/* ── RIGHT: LIVE PREVIEW PANE ── */}
          <View style={styles.builderPreviewPane}>
            <View style={styles.builderPreviewCard}>
              <Text style={[styles.sectionEyebrow, styles.builderStudioTextSecondary]}>Live Preview</Text>
              <Text style={[styles.listTitle, styles.builderStudioTextPrimary]}>End User Dashboard</Text>
              {!workspace ? (
                <View style={{ gap: 8, paddingTop: 8 }}>
                  <Text style={[styles.metaText, styles.builderStudioTextSecondary]}>Your workspace will appear here as you build it.</Text>
                  <View style={{ height: 130, borderRadius: 12, borderWidth: 2, borderColor: mode === 'night' ? 'rgba(0,0,0,0.06)' : 'rgba(0,0,0,0.03)', alignItems: 'center' as any, justifyContent: 'center' as any, gap: 6 }}>
                    <Text style={{ fontSize: 28, opacity: 0.3 }}>🏗️</Text>
                    <Text style={{ fontSize: 11, color: mode === 'night' ? 'rgba(0,0,0,0.22)' : 'rgba(0,0,0,0.22)', textAlign: 'center' }}>Start building to see preview</Text>
                  </View>
                </View>
              ) : (
                <>
                  <View style={styles.builderPreviewHeroCard}>
                    <Text style={styles.builderPreviewHeroTitle}>{resolvedWorkspaceName}</Text>
                    <Text style={styles.builderPreviewHeroSubtitle}>Tracking: {resolvedRootEntity}</Text>
                    {!!workspace.route && <Text style={[styles.metaText, styles.builderStudioTextSecondary, { fontSize: 10 }]}>/{workspace.route}</Text>}
                  </View>

                  <View style={styles.builderPreviewStatsRow}>
                    <View style={styles.builderPreviewStatCard}>
                      <Text style={styles.builderPreviewStatValue}>{workspaceSubSpaces.length}</Text>
                      <Text style={styles.builderPreviewStatLabel}>Sections</Text>
                    </View>
                    <View style={styles.builderPreviewStatCard}>
                      <Text style={styles.builderPreviewStatValue}>{totalBuilderFields}</Text>
                      <Text style={styles.builderPreviewStatLabel}>Fields</Text>
                    </View>
                    <View style={styles.builderPreviewStatCard}>
                      <Text style={styles.builderPreviewStatValue}>{totalRequiredBuilderFields}</Text>
                      <Text style={styles.builderPreviewStatLabel}>Required</Text>
                    </View>
                  </View>

                  <View style={styles.separator} />
                  <Text style={[styles.metaText, styles.builderStudioTextSecondary, { fontSize: 11 }]}>{workspace.pipelineEnabled ? 'Pipeline flow →' : 'Sections'}</Text>
                  <Reorder.Group
                    as="div"
                    axis="x"
                    values={workspace.subSpaces ?? []}
                    onReorder={canManageSubSpace ? applySubSpaceOrder : () => {}}
                    style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center', listStyle: 'none', padding: 0, margin: 0 }}
                  >
                    {(workspace.subSpaces ?? []).map((ss, idx) => (
                      <Reorder.Item
                        key={`prev-${ss.id}`}
                        value={ss}
                        as="div"
                        style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 4, cursor: canManageSubSpace ? 'grab' : 'default', userSelect: 'none' }}
                        whileDrag={{ scale: 1.06, zIndex: 50 }}
                        dragListener={canManageSubSpace}
                      >
                        {workspace.pipelineEnabled && idx > 0 && <Text style={{ fontSize: 14, color: ac, fontWeight: '800' }}>→</Text>}
                        <Pressable
                          style={[styles.pill, selectedSubSpaceId === ss.id && styles.pillActive]}
                          onPress={() => setSelectedSubSpaceId(ss.id)}
                        >
                          <Text style={[styles.pillText, selectedSubSpaceId === ss.id && styles.pillTextActive]}>{workspace.pipelineEnabled ? `${idx + 1}. ` : ''}{ss.name}</Text>
                        </Pressable>
                      </Reorder.Item>
                    ))}
                  </Reorder.Group>

                  {selectedSubSpace && (
                    <View style={styles.listCard}>
                      <Text style={[styles.listTitle, styles.builderStudioTextPrimary]}>{selectedSubSpace.name}</Text>
                      {(selectedSubSpace.builderFields ?? []).length === 0 ? (
                        <Text style={[styles.metaText, styles.builderStudioTextSecondary]}>No fields yet — add some in Step 3.</Text>
                      ) : (
                        <View style={[styles.builderDetailsFormPanel, useTwoColumnDetailsForm && styles.builderDetailsFormPanelWide]}>
                          {(selectedSubSpace.builderFields ?? []).map((field) => (
                            <View key={`pf-${field.id}`} style={[styles.builderDetailsFormRow, useTwoColumnDetailsForm && field.type !== 'longText' && styles.builderDetailsFormRowHalf]}>
                              <Text style={styles.builderDetailsFormLabel}>{field.label}{field.required ? ' *' : ''}</Text>
                              <View style={[styles.builderDetailsFormInput, field.type === 'longText' && styles.builderDetailsFormInputMulti]}>
                                <Text style={styles.builderDetailsFormInputText}>{getDetailsFieldPlaceholder(field.type)}</Text>
                              </View>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                  )}
                </>
              )}
            </View>
          </View>
        </View>

        {!!notice && <Text style={styles.notice}>{notice}</Text>}
      </Card>}

      {adminTab === 'governance' && <Card title="" blurred>
        <View nativeID="wt-setup-health">

        {/* ── Health Score Dashboard ── */}
        {(() => {
          const warnings = insights.findings.filter((f) => f.level === 'warning').length;
          const passes = insights.findings.filter((f) => f.level !== 'warning').length;
          const total = insights.findings.length || 1;
          const score = Math.round((passes / total) * 100);
          const scoreColor = score >= 80 ? '#22C55E' : score >= 50 ? '#F59E0B' : '#EF4444';
          return (
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16, alignItems: 'stretch' }}>
              {/* Score Ring */}
              <View style={{ width: 120, borderRadius: 14, padding: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: `${scoreColor}30`, backgroundColor: `${scoreColor}0A` }}>
                <Text style={{ fontSize: 36, fontWeight: '800', color: scoreColor }}>{score}</Text>
                <Text style={{ fontSize: 11, fontWeight: '600', color: scoreColor, marginTop: 2 }}>Health</Text>
                <Text style={{ fontSize: 10, color: mode === 'night' ? 'rgba(241,232,255,0.45)' : 'rgba(0,0,0,0.4)', marginTop: 2 }}>{warnings === 0 ? 'Go-Live Ready' : `${warnings} warning${warnings !== 1 ? 's' : ''}`}</Text>
              </View>

              {/* KPI Tiles */}
              <View style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {[
                  { icon: '📦', val: insights.totalWorkspaces, label: 'Workspaces', color: ac },
                  { icon: '🗂️', val: insights.totalSubSpaces, label: 'SubSpaces', color: '#6366F1' },
                  { icon: '🔗', val: insights.workspacesWithRoutes, label: 'Routes', color: '#8B5CF6' },
                  { icon: '🤝', val: insights.subSpacesWithRelationship, label: 'Relationships', color: '#EC4899' },
                  { icon: '📝', val: insights.subSpacesWithForms, label: 'Form Coverage', color: '#14B8A6' },
                  { icon: '⚡', val: insights.publishedFlows, label: 'Flows', color: '#F59E0B' },
                ].map((kpi, i) => (
                  <View key={i} style={{ flex: 1, minWidth: 100, borderRadius: 10, padding: 10, borderWidth: 1, borderColor: `${kpi.color}20`, backgroundColor: `${kpi.color}08` }}>
                    <Text style={{ fontSize: 14, marginBottom: 2 }}>{kpi.icon}</Text>
                    <Text style={{ fontSize: 18, fontWeight: '800', color: mode === 'night' ? '#1A2340' : '#1A2340' }}>{kpi.val}</Text>
                    <Text style={{ fontSize: 10, color: mode === 'night' ? 'rgba(241,232,255,0.5)' : 'rgba(0,0,0,0.45)' }}>{kpi.label}</Text>
                  </View>
                ))}
              </View>
            </View>
          );
        })()}

        {/* ── Form Coverage Strip ── */}
        <View style={{ borderRadius: 12, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: mode === 'night' ? 'rgba(0,0,0,0.06)' : 'rgba(0,0,0,0.08)', backgroundColor: mode === 'night' ? 'rgba(0,0,0,0.02)' : 'rgba(0,0,0,0.02)' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: mode === 'night' ? '#1A2340' : '#1A2340' }}>📝 Form Coverage</Text>
            {insights.selectedWorkspaceSubSpacesMissingForms.length === 0
              ? <View style={{ backgroundColor: 'rgba(34,197,94,0.12)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}><Text style={{ fontSize: 10, fontWeight: '700', color: '#22C55E' }}>ALL COVERED</Text></View>
              : <View style={{ backgroundColor: 'rgba(239,68,68,0.12)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}><Text style={{ fontSize: 10, fontWeight: '700', color: '#EF4444' }}>{insights.selectedWorkspaceSubSpacesMissingForms.length} MISSING</Text></View>
            }
          </View>
          {/* Coverage Bar */}
          {(() => {
            const total = Math.max(insights.totalSubSpaces, 1);
            const covered = insights.subSpacesWithForms;
            const pct = Math.round((covered / total) * 100);
            return (
              <>
                <View style={{ height: 6, borderRadius: 3, backgroundColor: mode === 'night' ? 'rgba(0,0,0,0.06)' : 'rgba(0,0,0,0.08)', marginBottom: 6, overflow: 'hidden' }}>
                  <View style={{ height: 6, borderRadius: 3, width: `${pct}%` as any, backgroundColor: pct === 100 ? '#22C55E' : ac }} />
                </View>
                <Text style={{ fontSize: 11, color: mode === 'night' ? 'rgba(241,232,255,0.5)' : 'rgba(0,0,0,0.45)' }}>{covered} of {total} SubSpaces ({pct}%)</Text>
              </>
            );
          })()}
          {insights.selectedWorkspaceSubSpacesMissingForms.length > 0 && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
              {insights.selectedWorkspaceSubSpacesMissingForms.map((item) => (
                <View key={`${item.workspaceId}-${item.subSpaceId}`} style={{ borderRadius: 6, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: 'rgba(239,68,68,0.08)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)' }}>
                  <Text style={{ fontSize: 11, fontWeight: '600', color: '#EF4444' }}>⚠ {item.subSpaceName}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* ── Findings ── */}
        <Text style={{ fontSize: 13, fontWeight: '700', color: mode === 'night' ? '#1A2340' : '#1A2340', marginBottom: 8 }}>Action Items</Text>
        <Text style={{ fontSize: 11, color: mode === 'night' ? 'rgba(241,232,255,0.5)' : 'rgba(0,0,0,0.45)', marginBottom: 10 }}>Resolve warnings before go-live. Green items are complete.</Text>
        <View style={{ gap: 8, marginBottom: 16 }}>
          {insights.findings.map((finding) => {
            const isWarn = finding.level === 'warning';
            const borderColor = isWarn ? 'rgba(239,68,68,0.25)' : 'rgba(34,197,94,0.25)';
            const bgColor = isWarn ? 'rgba(239,68,68,0.05)' : 'rgba(34,197,94,0.05)';
            return (
              <View key={`${finding.key}-${finding.text}`} style={{ borderRadius: 10, padding: 12, borderWidth: 1, borderColor, backgroundColor: bgColor }}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                  <Text style={{ fontSize: 14, marginTop: 1 }}>{isWarn ? '⚠️' : '✅'}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: isWarn ? '#EF4444' : '#22C55E' }}>{finding.text}</Text>
                    {isWarn && finding.key === 'orphanForms' && <Text style={{ fontSize: 11, color: mode === 'night' ? 'rgba(241,232,255,0.45)' : 'rgba(0,0,0,0.4)', marginTop: 3 }}>Old form links are broken — remove orphan references to keep governance clean.</Text>}
                    {isWarn && finding.key === 'subspacesWithoutForms' && <Text style={{ fontSize: 11, color: mode === 'night' ? 'rgba(241,232,255,0.45)' : 'rgba(0,0,0,0.4)', marginTop: 3 }}>Open Workspace Design → SubSpace Lanes & Fields and add palette fields to create data forms.</Text>}
                    {isWarn && finding.key === 'missingRelationships' && <Text style={{ fontSize: 11, color: mode === 'night' ? 'rgba(241,232,255,0.45)' : 'rgba(0,0,0,0.4)', marginTop: 3 }}>Open Workspace Design and fill in the Relationship Rule field so records connect to the core entity.</Text>}
                  </View>
                  {isWarn && (
                    <Pressable onPress={() => goToFindingFix(finding.key)} style={{ borderRadius: 6, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: acRgba(0.12) }}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: ac }}>Fix →</Text>
                    </Pressable>
                  )}
                </View>
              </View>
            );
          })}
        </View>

        {/* ── Audit Log ── */}
        <View style={{ borderRadius: 12, padding: 14, borderWidth: 1, borderColor: mode === 'night' ? 'rgba(0,0,0,0.06)' : 'rgba(0,0,0,0.08)', backgroundColor: mode === 'night' ? 'rgba(0,0,0,0.02)' : 'rgba(0,0,0,0.02)' }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: mode === 'night' ? '#1A2340' : '#1A2340', marginBottom: 4 }}>📋 Audit Log</Text>
          <Text style={{ fontSize: 11, color: mode === 'night' ? 'rgba(241,232,255,0.45)' : 'rgba(0,0,0,0.4)', marginBottom: 8 }}>All workspace and platform changes in one timeline.</Text>
          <AuditLogViewer
            entries={auditLog?.entries ?? []}
            filterEntity={auditLog?.filterEntity}
            onFilterChange={auditLog?.setFilterEntity ?? (() => {})}
          />
        </View>
      </View>
      </Card>}

      {adminTab === 'forms' && <Card title="" blurred>
        <Text style={styles.bodyText}>Every SubSpace with builder fields automatically generates a form. Explicit forms override derived ones. Browse all forms below.</Text>
        {data.workspaces.length === 0 && <Text style={styles.metaText}>No workspaces yet. Create one in Workspace Design to see forms here.</Text>}
        {data.workspaces.map((ws) => {
          const formsInWs = ws.subSpaces.map((ss) => {
            const form = getFormForSubSpace(ws.id, ss.id);
            return { subSpace: ss, form };
          });
          const hasAnyForms = formsInWs.some((f) => !!f.form);
          return (
            <View key={ws.id} style={styles.listCard}>
              <Text style={styles.listTitle}>{ws.name}</Text>
              {!hasAnyForms && <Text style={styles.metaText}>No forms in this workspace yet. Add builder fields to SubSpaces to auto-generate forms.</Text>}
              {formsInWs.map(({ subSpace: ss, form }) => (
                <View key={ss.id} style={{ marginTop: 8, paddingLeft: 12, borderLeftWidth: 2, borderLeftColor: `${ac}40` }}>
                  <Text style={styles.metaText}>{ss.name}{form ? '' : ' — no form'}</Text>
                  {form && (
                    <>
                      <Text style={[styles.metaText, { fontStyle: 'italic' }]}>{form.id.startsWith('derived-') ? 'Auto-derived from builder fields' : 'Explicit form'}</Text>
                      {form.fields.map((field) => (
                        <Text key={field.id} style={styles.metaText}>
                          {'  '}• {field.label} ({field.type}){field.required ? ' — required' : ''}
                        </Text>
                      ))}
                    </>
                  )}
                </View>
              ))}
            </View>
          );
        })}
        {data.forms.filter((f) => !data.workspaces.some((ws) => ws.id === f.workspaceId)).length > 0 && (
          <View style={styles.listCard}>
            <Text style={styles.listTitle}>Orphaned Forms</Text>
            <Text style={styles.notice}>These forms reference workspaces that no longer exist.</Text>
            {data.forms.filter((f) => !data.workspaces.some((ws) => ws.id === f.workspaceId)).map((form) => (
              <Text key={form.id} style={styles.metaText}>• {form.name} (workspace: {form.workspaceId})</Text>
            ))}
          </View>
        )}
      </Card>}

      {adminTab === 'architecture' && <Card title="" blurred>

        {/* ── Architecture Wizard Banner ── */}
        {(data.businessFunctions ?? []).length === 0 ? (
          <View style={{ gap: 14 }}>
            {/* Hero */}
            <View style={{ backgroundColor: 'rgba(0,0,0,0.02)', borderWidth: 1, borderColor: 'rgba(0,0,0,0.08)', borderRadius: 12, padding: 16, gap: 8 }}>
              <Text style={{ fontSize: 22, textAlign: 'center' }}>🏗️</Text>
              <Text style={[styles.listTitle, { textAlign: 'center', fontSize: 16 }]}>Define Your Business Architecture</Text>
              <Text style={[styles.bodyText, { textAlign: 'center', fontSize: 13 }]}>
                {`The architecture layer sits above all your workspaces and answers: "What does this business do?" An admin who loads this page for the first time can understand your entire operation in under 2 minutes.`}
              </Text>
            </View>

            {/* Hierarchy diagram */}
            <View style={[styles.listCard, { gap: 4, paddingVertical: 12 }]}>
              <Text style={[styles.metaText, { fontWeight: '700', marginBottom: 4 }]}>The 6-Layer Architecture Hierarchy</Text>
              {[
                { icon: '🏢', label: data.shellConfig.functionLabel ?? 'Department', desc: 'A major division of your business (e.g. Supply Chain, Finance, Service Ops)', color: ac },
                { icon: '📦', label: data.shellConfig.objectLabel ?? 'Object', desc: `What each ${data.shellConfig.functionLabel ?? 'Department'} manages (e.g. Drug Inventory, Device Inventory, Policy Book)`, color: '#3B82F6' },
                { icon: '🗂️', label: data.shellConfig.collectionLabel ?? 'Batch', desc: `Groups or collections of ${data.shellConfig.objectLabelPlural ?? 'Objects'} (e.g. Lot XY-1234, Work Order WO-5001)`, color: '#10B981' },
                { icon: '🔲', label: 'Workspace', desc: 'The processing area — each workspace handles one stage of the workflow', color: '#F59E0B' },
                { icon: '📋', label: 'SubSpace', desc: 'A lane inside a workspace (e.g. Distributor Verification, Repair Tasks)', color: '#EF4444' },
                { icon: '📄', label: 'Record', desc: 'A single tracked item with fields, status, and history', color: '#6B7280' },
              ].map((level, i) => (
                <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 5, borderBottomWidth: i < 5 ? 1 : 0, borderBottomColor: 'rgba(0,0,0,0.04)' }}>
                  <View style={{ width: 28, height: 28, borderRadius: 6, backgroundColor: `${level.color}20`, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Text style={{ fontSize: 14 }}>{level.icon}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: level.color }}>{`Layer ${i + 1}`}</Text>
                      <Text style={[styles.listTitle, { fontSize: 13 }]}>{level.label}</Text>
                    </View>
                    <Text style={[styles.metaText, { marginTop: 1 }]}>{level.desc}</Text>
                  </View>
                </View>
              ))}
            </View>

            {/* Step guide */}
            <View style={[styles.listCard, { gap: 10 }]}>
              <Text style={[styles.metaText, { fontWeight: '700' }]}>How to build your architecture in 4 steps:</Text>
              {[
                { step: '1', title: `Define ${data.shellConfig.functionLabelPlural ?? 'Departments'}`, detail: `Name the major areas of your business. Example: "Supply Chain & Regulatory", "Service Operations", "Finance"`, color: ac },
                { step: '2', title: `Add ${data.shellConfig.objectLabelPlural ?? 'Objects'}`, detail: `Under each ${data.shellConfig.functionLabel ?? 'Department'}, define what it tracks. Example: "Drug Inventory" under Supply Chain, "Device Inventory" under Service Ops`, color: '#3B82F6' },
                { step: '3', title: 'Link Workspaces', detail: `Tap each ${data.shellConfig.objectLabel ?? 'Object'} to connect it to the workspaces that process it. This powers the End User navigation and filtering.`, color: '#10B981' },
                { step: '4', title: 'Set Terminology (Optional)', detail: `Go to App Terminology to rename ${data.shellConfig.functionLabel ?? 'Department'}, ${data.shellConfig.objectLabel ?? 'Object'}, and ${data.shellConfig.collectionLabel ?? 'Batch'} to match your industry.`, color: '#F59E0B' },
              ].map((item, i) => (
                <View key={i} style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start', paddingVertical: 4 }}>
                  <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: `${item.color}22`, borderWidth: 1, borderColor: `${item.color}44`, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Text style={{ color: item.color, fontWeight: '800', fontSize: 11 }}>{item.step}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.listTitle, { fontSize: 13 }]}>{item.title}</Text>
                    <Text style={[styles.metaText, { marginTop: 2 }]}>{item.detail}</Text>
                  </View>
                </View>
              ))}
            </View>

            {/* Load Examples */}
            <View style={[styles.listCard, { gap: 10 }]}>
              <Text style={[styles.metaText, { fontWeight: '700' }]}>🚀 Load a Pre-Built Example</Text>
              <Text style={styles.metaText}>One click loads a complete business architecture with Departments, Objects, and terminology pre-configured for your industry.</Text>
              <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                <Pressable
                  style={[styles.secondaryButton, { borderColor: ac, flex: 1 }]}
                  onPress={() => {
                    const dscsaWsId = data.workspaces.find(w => w.name?.toLowerCase().includes('dscsa') || w.name?.toLowerCase().includes('serialization'))?.id ?? '';
                    upsertBusinessFunction({
                      id: 'bfn-supply-chain', name: 'Supply Chain & Regulatory', icon: '🔗', color: ac, order: 0,
                      description: 'End-to-end pharmaceutical serialization from manufacturer to patient dispensing (DSCSA § 582)',
                      objects: [{
                        id: 'bobj-drug-inventory', functionId: 'bfn-supply-chain', name: 'Drug Inventory', namePlural: 'Drug Inventories',
                        icon: '💊', description: 'Track serialized pharmaceutical batches across the DSCSA supply chain from carton to dispensing',
                        workspaceIds: dscsaWsId ? [dscsaWsId] : [],
                      }],
                    });
                    upsertBusinessFunction({
                      id: 'bfn-distribution', name: 'Distribution & Logistics', icon: '🚚', color: '#F59E0B', order: 2,
                      description: 'Last-mile pharmaceutical distribution tracking and verification',
                      objects: [{
                        id: 'bobj-shipment-record', functionId: 'bfn-distribution', name: 'Shipment Record', namePlural: 'Shipment Records',
                        icon: '📦', description: 'EPCIS shipment events and delivery confirmations from distributor to pharmacy',
                        workspaceIds: [],
                      }],
                    });
                  }}
                >
                  <Text style={[styles.secondaryButtonText, { color: ac }]}>💊 Load DSCSA Pharma Example</Text>
                </Pressable>
                <Pressable
                  style={[styles.secondaryButton, { borderColor: '#3B82F6', flex: 1 }]}
                  onPress={() => {
                    const wrvasWsId = data.workspaces.find(w => w.name?.toLowerCase().includes('wrvas') || w.name?.toLowerCase().includes('service') || w.name?.toLowerCase().includes('work order'))?.id ?? '';
                    upsertBusinessFunction({
                      id: 'bfn-service-operations', name: 'Service Operations', icon: '🛠️', color: '#3B82F6', order: 1,
                      description: 'Warrant, Refurbishment, Value-Added Services — full device lifecycle from inbound dock to shipment',
                      objects: [{
                        id: 'bobj-device-inventory', functionId: 'bfn-service-operations', name: 'Device Inventory', namePlural: 'Device Inventories',
                        icon: '🖥️', description: 'Serialized IT hardware assets moving through diagnostic, repair, kitting, QA, and shipping stages',
                        workspaceIds: wrvasWsId ? [wrvasWsId] : [],
                      }],
                    });
                    upsertBusinessFunction({
                      id: 'bfn-quality-assurance', name: 'Quality Assurance', icon: '✅', color: '#10B981', order: 3,
                      description: 'Final inspection, grading, certifications, and pass/fail audit trail',
                      objects: [{
                        id: 'bobj-qa-record', functionId: 'bfn-quality-assurance', name: 'QA Record', namePlural: 'QA Records',
                        icon: '🔍', description: 'Cosmetic grade, diagnostic results, and final pass/fail decisions per device work order',
                        workspaceIds: wrvasWsId ? [wrvasWsId] : [],
                      }],
                    });
                  }}
                >
                  <Text style={[styles.secondaryButtonText, { color: '#3B82F6' }]}>🖥️ Load WRVAS Service Example</Text>
                </Pressable>
              </View>
              <Text style={[styles.metaText, { fontStyle: 'italic' }]}>
                💡 Tip: Load a workspace template first (Workspace Design → Load DSCSA or WRVAS Template) so the example links automatically to active workspaces.
              </Text>
            </View>
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            {/* Summary bar */}
            <View style={{ backgroundColor: 'rgba(0,0,0,0.02)', borderWidth: 1, borderColor: 'rgba(0,0,0,0.08)', borderRadius: 10, padding: 12 }}>
              <Text style={[styles.listTitle, { fontSize: 14, marginBottom: 4 }]}>🏗️ Your Operations Map</Text>
              <View style={{ flexDirection: 'row', gap: 14, flexWrap: 'wrap' }}>
                <Text style={styles.metaText}>
                  <Text style={{ color: ac, fontWeight: '700' }}>{(data.businessFunctions ?? []).length}</Text>
                  {` ${(data.businessFunctions?.length ?? 0) === 1 ? (data.shellConfig.functionLabel ?? 'Department') : (data.shellConfig.functionLabelPlural ?? 'Departments')}`}
                </Text>
                <Text style={styles.metaText}>
                  <Text style={{ color: '#3B82F6', fontWeight: '700' }}>{(data.businessFunctions ?? []).reduce((a, f) => a + f.objects.length, 0)}</Text>
                  {` ${(data.businessFunctions ?? []).reduce((a, f) => a + f.objects.length, 0) === 1 ? (data.shellConfig.objectLabel ?? 'Object') : (data.shellConfig.objectLabelPlural ?? 'Objects')}`}
                </Text>
                <Text style={styles.metaText}>
                  <Text style={{ color: '#10B981', fontWeight: '700' }}>{(data.businessFunctions ?? []).reduce((a, f) => a + f.objects.reduce((b, o) => b + o.workspaceIds.length, 0), 0)}</Text>
                  {' Workspace links'}
                </Text>
              </View>
              <Text style={[styles.metaText, { marginTop: 6, fontSize: 11 }]}>
                {`Hierarchy: ${data.shellConfig.functionLabel ?? 'Department'} → ${data.shellConfig.objectLabel ?? 'Object'} → ${data.shellConfig.collectionLabel ?? 'Batch'} → Workspace → SubSpace → Record`}
              </Text>
            </View>

            {/* Load more examples if < 2 functions */}
            {(data.businessFunctions ?? []).length < 2 && (
              <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                {!(data.businessFunctions ?? []).some(f => f.id === 'bfn-supply-chain') && (
                  <Pressable
                    style={[styles.secondaryButton, { borderColor: ac }]}
                    onPress={() => {
                      const dscsaWsId = data.workspaces.find(w => w.name?.toLowerCase().includes('dscsa') || w.name?.toLowerCase().includes('serialization'))?.id ?? '';
                      upsertBusinessFunction({
                        id: 'bfn-supply-chain', name: 'Supply Chain & Regulatory', icon: '🔗', color: ac, order: 0,
                        description: 'End-to-end pharmaceutical serialization from manufacturer to patient dispensing (DSCSA § 582)',
                        objects: [{ id: 'bobj-drug-inventory', functionId: 'bfn-supply-chain', name: 'Drug Inventory', namePlural: 'Drug Inventories', icon: '💊', description: 'Track serialized pharmaceutical batches across the DSCSA supply chain', workspaceIds: dscsaWsId ? [dscsaWsId] : [] }],
                      });
                    }}
                  >
                    <Text style={[styles.secondaryButtonText, { color: ac }]}>+ Add DSCSA Pharma Function</Text>
                  </Pressable>
                )}
                {!(data.businessFunctions ?? []).some(f => f.id === 'bfn-service-operations') && (
                  <Pressable
                    style={[styles.secondaryButton, { borderColor: '#3B82F6' }]}
                    onPress={() => {
                      const wrvasWsId = data.workspaces.find(w => w.name?.toLowerCase().includes('wrvas') || w.name?.toLowerCase().includes('service') || w.name?.toLowerCase().includes('work order'))?.id ?? '';
                      upsertBusinessFunction({
                        id: 'bfn-service-operations', name: 'Service Operations', icon: '🛠️', color: '#3B82F6', order: 1,
                        description: 'Warrant, Refurbishment, Value-Added Services — full device lifecycle from inbound dock to shipment',
                        objects: [{ id: 'bobj-device-inventory', functionId: 'bfn-service-operations', name: 'Device Inventory', namePlural: 'Device Inventories', icon: '🖥️', description: 'Serialized IT hardware assets moving through diagnostic, repair, kitting, QA, and shipping stages', workspaceIds: wrvasWsId ? [wrvasWsId] : [] }],
                      });
                    }}
                  >
                    <Text style={[styles.secondaryButtonText, { color: '#3B82F6' }]}>+ Add WRVAS Service Function</Text>
                  </Pressable>
                )}
              </View>
            )}
          </View>
        )}

        {(data.businessFunctions ?? []).sort((a, b) => a.order - b.order).map((fn) => {
          const isFnExpanded = expandedFnIds.has(fn.id);
          const isEditingFn = editingFunctionId === fn.id;
          return (
            <View key={fn.id} style={[styles.listCard, { borderLeftWidth: 3, borderLeftColor: fn.color ?? ac }]}>
              <View style={styles.inlineRow}>
                <Pressable onPress={() => setExpandedFnIds((prev) => { const next = new Set(prev); isFnExpanded ? next.delete(fn.id) : next.add(fn.id); return next; })} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  {!!fn.icon && <Text style={{ fontSize: 18 }}>{fn.icon}</Text>}
                  <Text style={styles.listTitle}>{fn.name}</Text>
                  <Text style={styles.metaText}>{fn.objects.length} {fn.objects.length === 1 ? (data.shellConfig.objectLabel ?? 'Object') : (data.shellConfig.objectLabelPlural ?? 'Objects')}</Text>
                  <Text style={styles.metaText}>{isFnExpanded ? '▾' : '▸'}</Text>
                </Pressable>
                <Pressable onPress={() => {
                  setEditingFunctionId(isEditingFn ? null : fn.id);
                  if (!isEditingFn) { setNewFnName(fn.name); setNewFnIcon(fn.icon ?? ''); setNewFnColor(fn.color ?? '#111111'); setNewFnDesc(fn.description ?? ''); }
                }} style={styles.secondaryButton}>
                  <Text style={styles.secondaryButtonText}>{isEditingFn ? 'Cancel' : 'Edit'}</Text>
                </Pressable>
                <Pressable onPress={() => deleteBusinessFunction(fn.id)} style={[styles.secondaryButton, { marginLeft: 4 }]}>
                  <Text style={[styles.secondaryButtonText, { color: '#EF4444' }]}>Delete</Text>
                </Pressable>
              </View>
              {fn.description ? <Text style={styles.metaText}>{fn.description}</Text> : null}

              {isEditingFn && (
                <View style={{ marginTop: 8, gap: 6 }}>
                  <LabeledInput label="Name" value={newFnName} onChangeText={setNewFnName} placeholder="e.g. Supply Chain & Regulatory" />
                  <LabeledInput label="Icon (emoji)" value={newFnIcon} onChangeText={setNewFnIcon} placeholder="🔗" />
                  <LabeledInput label="Accent Color (hex)" value={newFnColor} onChangeText={setNewFnColor} placeholder="#111111" />
                  <LabeledInput label="Description (optional)" value={newFnDesc} onChangeText={setNewFnDesc} placeholder="What this department covers" />
                  <Pressable style={styles.secondaryButton} onPress={() => {
                    if (!newFnName.trim()) return;
                    upsertBusinessFunction({ ...fn, name: newFnName.trim(), icon: newFnIcon.trim() || undefined, color: newFnColor.trim() || fn.color, description: newFnDesc.trim() || undefined });
                    setEditingFunctionId(null);
                  }}>
                    <Text style={styles.secondaryButtonText}>Save Function</Text>
                  </Pressable>
                </View>
              )}

              {isFnExpanded && (
                <View style={{ marginTop: 8, paddingLeft: 12, borderLeftWidth: 2, borderLeftColor: `${ac}40` }}>
                  {fn.objects.length === 0 && (
                    <Text style={styles.metaText}>No {(data.shellConfig.objectLabelPlural ?? 'Objects').toLowerCase()} yet. Add one below.</Text>
                  )}
                  {fn.objects.map((obj) => {
                    const objKey = `${fn.id}::${obj.id}`;
                    const isEditingObj = editingObjectKey === objKey;
                    return (
                      <View key={obj.id} style={[styles.listCard, { marginBottom: 8 }]}>
                        <View style={styles.inlineRow}>
                          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            {!!obj.icon && <Text>{obj.icon}</Text>}
                            <Text style={styles.listTitle}>{obj.name}</Text>
                            {obj.namePlural !== obj.name && <Text style={styles.metaText}>/ {obj.namePlural}</Text>}
                          </View>
                          <Pressable onPress={() => {
                            setEditingObjectKey(isEditingObj ? null : objKey);
                            if (!isEditingObj) { setNewObjName(obj.name); setNewObjNamePlural(obj.namePlural); setNewObjIcon(obj.icon ?? ''); setNewObjDesc(obj.description ?? ''); }
                          }} style={styles.secondaryButton}>
                            <Text style={styles.secondaryButtonText}>{isEditingObj ? 'Cancel' : 'Edit'}</Text>
                          </Pressable>
                          <Pressable onPress={() => deleteBusinessObject(fn.id, obj.id)} style={[styles.secondaryButton, { marginLeft: 4 }]}>
                            <Text style={[styles.secondaryButtonText, { color: '#EF4444' }]}>Delete</Text>
                          </Pressable>
                        </View>
                        {obj.description ? <Text style={styles.metaText}>{obj.description}</Text> : null}

                        {isEditingObj && (
                          <View style={{ marginTop: 8, gap: 6 }}>
                            <LabeledInput label="Name (singular)" value={newObjName} onChangeText={setNewObjName} placeholder="e.g. Drug Inventory" />
                            <LabeledInput label="Name (plural)" value={newObjNamePlural} onChangeText={setNewObjNamePlural} placeholder="e.g. Drug Inventories" />
                            <LabeledInput label="Icon (emoji)" value={newObjIcon} onChangeText={setNewObjIcon} placeholder="💊" />
                            <LabeledInput label="Description (optional)" value={newObjDesc} onChangeText={setNewObjDesc} placeholder="What this object tracks" />
                            <Text style={[styles.metaText, { marginTop: 6 }]}>Linked Workspaces — tap to toggle:</Text>
                            <View style={styles.inlineRow}>
                              {data.workspaces.map((ws) => {
                                const isLinked = obj.workspaceIds.includes(ws.id);
                                return (
                                  <Pressable
                                    key={ws.id}
                                    style={[styles.pill, isLinked && styles.pillActive]}
                                    onPress={() => {
                                      const next = isLinked
                                        ? obj.workspaceIds.filter((id) => id !== ws.id)
                                        : [...obj.workspaceIds, ws.id];
                                      upsertBusinessObject(fn.id, { ...obj, workspaceIds: next });
                                    }}
                                  >
                                    <Text style={[styles.pillText, isLinked && styles.pillTextActive]}>{ws.name}</Text>
                                  </Pressable>
                                );
                              })}
                              {data.workspaces.length === 0 && <Text style={styles.metaText}>No workspaces available yet.</Text>}
                            </View>
                            <Pressable style={styles.secondaryButton} onPress={() => {
                              if (!newObjName.trim()) return;
                              upsertBusinessObject(fn.id, { ...obj, name: newObjName.trim(), namePlural: newObjNamePlural.trim() || newObjName.trim(), icon: newObjIcon.trim() || undefined, description: newObjDesc.trim() || undefined });
                              setEditingObjectKey(null);
                            }}>
                              <Text style={styles.secondaryButtonText}>Save {data.shellConfig.objectLabel ?? 'Object'}</Text>
                            </Pressable>
                          </View>
                        )}

                        {!isEditingObj && obj.workspaceIds.length > 0 && (
                          <View style={[styles.inlineRow, { marginTop: 4 }]}>
                            {obj.workspaceIds.map((wsId) => {
                              const ws = data.workspaces.find((w) => w.id === wsId);
                              return ws ? (
                                <View key={wsId} style={[styles.pill, { opacity: 0.7 }]}>
                                  <Text style={styles.pillText}>{ws.name}</Text>
                                </View>
                              ) : null;
                            })}
                          </View>
                        )}
                      </View>
                    );
                  })}

                  {/* Add new object form */}
                  {editingObjectKey === `${fn.id}::__new__` ? (
                    <View style={[styles.listCard, { marginTop: 4 }]}>
                      <Text style={styles.listTitle}>New {data.shellConfig.objectLabel ?? 'Object'}</Text>
                      <LabeledInput label="Name (singular)" value={newObjName} onChangeText={setNewObjName} placeholder="e.g. Order Book" />
                      <LabeledInput label="Name (plural)" value={newObjNamePlural} onChangeText={setNewObjNamePlural} placeholder="e.g. Order Books" />
                      <LabeledInput label="Icon (emoji)" value={newObjIcon} onChangeText={setNewObjIcon} placeholder="📦" />
                      <LabeledInput label="Description (optional)" value={newObjDesc} onChangeText={setNewObjDesc} placeholder="What this object tracks" />
                      <View style={styles.inlineRow}>
                        <Pressable style={styles.secondaryButton} onPress={() => {
                          if (!newObjName.trim()) return;
                          const id = `bobj-${newObjName.trim().toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;
                          upsertBusinessObject(fn.id, { id, functionId: fn.id, name: newObjName.trim(), namePlural: newObjNamePlural.trim() || newObjName.trim(), icon: newObjIcon.trim() || undefined, description: newObjDesc.trim() || undefined, workspaceIds: [] });
                          setNewObjName(''); setNewObjNamePlural(''); setNewObjIcon(''); setNewObjDesc('');
                          setEditingObjectKey(null);
                        }}>
                          <Text style={styles.secondaryButtonText}>Add {data.shellConfig.objectLabel ?? 'Object'}</Text>
                        </Pressable>
                        <Pressable style={[styles.secondaryButton, { marginLeft: 8 }]} onPress={() => setEditingObjectKey(null)}>
                          <Text style={styles.secondaryButtonText}>Cancel</Text>
                        </Pressable>
                      </View>
                    </View>
                  ) : (
                    <Pressable style={[styles.secondaryButton, { marginTop: 8, alignSelf: 'flex-start' }]} onPress={() => {
                      setNewObjName(''); setNewObjNamePlural(''); setNewObjIcon(''); setNewObjDesc('');
                      setEditingObjectKey(`${fn.id}::__new__`);
                    }}>
                      <Text style={styles.secondaryButtonText}>+ Add {data.shellConfig.objectLabel ?? 'Object'}</Text>
                    </Pressable>
                  )}
                </View>
              )}
            </View>
          );
        })}

        {/* Add new function form */}
        {editingFunctionId === '__new__' ? (
          <View style={[styles.listCard, { marginTop: 8 }]}>
            <Text style={styles.listTitle}>New {data.shellConfig.functionLabel ?? 'Department'}</Text>
            <LabeledInput label="Name" value={newFnName} onChangeText={setNewFnName} placeholder="e.g. Finance" />
            <LabeledInput label="Icon (emoji)" value={newFnIcon} onChangeText={setNewFnIcon} placeholder="💰" />
            <LabeledInput label="Accent Color (hex)" value={newFnColor} onChangeText={setNewFnColor} placeholder="#111111" />
            <LabeledInput label="Description (optional)" value={newFnDesc} onChangeText={setNewFnDesc} placeholder="What this department covers" />
            <View style={styles.inlineRow}>
              <Pressable style={styles.secondaryButton} onPress={() => {
                if (!newFnName.trim()) return;
                const id = `bfn-${newFnName.trim().toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;
                const order = (data.businessFunctions ?? []).length;
                upsertBusinessFunction({ id, name: newFnName.trim(), icon: newFnIcon.trim() || undefined, color: newFnColor.trim() || '#111111', description: newFnDesc.trim() || undefined, order, objects: [] });
                setNewFnName(''); setNewFnIcon(''); setNewFnColor(ac); setNewFnDesc('');
                setEditingFunctionId(null);
              }}>
                <Text style={styles.secondaryButtonText}>Add {data.shellConfig.functionLabel ?? 'Department'}</Text>
              </Pressable>
              <Pressable style={[styles.secondaryButton, { marginLeft: 8 }]} onPress={() => setEditingFunctionId(null)}>
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <Pressable style={[styles.secondaryButton, { marginTop: 12, alignSelf: 'flex-start' }]} onPress={() => {
            setNewFnName(''); setNewFnIcon(''); setNewFnColor(ac); setNewFnDesc('');
            setEditingFunctionId('__new__');
          }}>
            <Text style={styles.secondaryButtonText}>+ Add {data.shellConfig.functionLabel ?? 'Department'}</Text>
          </Pressable>
        )}
      </Card>}

      {adminTab === 'shell' && <Card title="" blurred>
        {/* ── Shell Header ── */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: acRgba(0.14), alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 18 }}>⚙️</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: mode === 'night' ? '#fff' : '#1A2340', fontSize: 17, fontWeight: '800' }}>Language & Intake Designer</Text>
            <Text style={{ color: mode === 'night' ? 'rgba(0,0,0,0.50)' : 'rgba(0,0,0,0.45)', fontSize: 12, lineHeight: 17 }}>Customize terminology, intake forms, personas, and lifecycle stages — no coding needed.</Text>
          </View>
        </View>
        {!canManageWorkspace && <Text style={styles.notice}>{deniedMessage('workspace.manage')}</Text>}

        {/* ── KPI Strip ── */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 10, marginBottom: 14 }}>
          {[
            { icon: '🏷️', label: 'Terms', value: '10', sub: 'app words' },
            { icon: '📝', label: 'Intake Fields', value: String(shellConfig.intakeFields.length), sub: 'configured' },
            { icon: '👤', label: 'Personas', value: String(shellConfig.personas.length), sub: 'defined' },
            { icon: '🔄', label: 'Stages', value: String(shellConfig.lifecycleStages.length), sub: 'mapped' },
          ].map((kpi) => (
            <View key={kpi.label} style={{ flex: 1, minWidth: 120, backgroundColor: mode === 'night' ? 'rgba(0,0,0,0.02)' : 'rgba(0,0,0,0.02)', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: mode === 'night' ? 'rgba(0,0,0,0.04)' : 'rgba(0,0,0,0.06)' }}>
              <Text style={{ fontSize: 16, marginBottom: 4 }}>{kpi.icon}</Text>
              <Text style={{ color: ac, fontSize: 20, fontWeight: '800' }}>{kpi.value}</Text>
              <Text style={{ color: mode === 'night' ? 'rgba(0,0,0,0.50)' : 'rgba(0,0,0,0.45)', fontSize: 11, fontWeight: '600' }}>{kpi.sub}</Text>
            </View>
          ))}
        </View>

        {/* ── Segmented Step Rail ── */}
        <View style={{
          flexDirection: 'row', marginBottom: 18, borderRadius: 12, overflow: 'hidden',
          borderWidth: 1, borderColor: mode === 'night' ? 'rgba(0,0,0,0.04)' : 'rgba(102,74,154,0.12)',
        }}>
          {([
            { key: 'labels' as const, icon: '🏷️', label: 'App Terminology' },
            { key: 'intake' as const, icon: '📝', label: 'Intake Builder' },
            { key: 'personas' as const, icon: '👤', label: 'User Personas' },
            { key: 'lifecycle' as const, icon: '🔄', label: 'Lifecycle Stages' },
          ] as const).map(({ key, icon, label }, idx) => {
            const isActive = shellPane === key;
            return (
              <Pressable key={key} onPress={() => setShellPane(key)} style={{
                flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                paddingVertical: 11, paddingHorizontal: 8, gap: 5,
                backgroundColor: isActive ? acRgba(0.20) : mode === 'night' ? 'rgba(0,0,0,0.015)' : 'rgba(0,0,0,0.02)',
                borderRightWidth: idx < 3 ? 1 : 0,
                borderRightColor: mode === 'night' ? 'rgba(0,0,0,0.04)' : 'rgba(102,74,154,0.10)',
              }}>
                <Text style={{ fontSize: 13 }}>{icon}</Text>
                <Text style={{ fontSize: 12, fontWeight: isActive ? '800' : '600', color: isActive ? ac : mode === 'night' ? 'rgba(0,0,0,0.40)' : 'rgba(0,0,0,0.40)' }}>{label}</Text>
              </Pressable>
            );
          })}
        </View>

        {/* ══════════════════════════════════════════════════════════════
            PANE 1 — APP TERMINOLOGY
           ══════════════════════════════════════════════════════════════ */}
        {shellPane === 'labels' && (
          <>
            {/* Section header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <Text style={{ fontSize: 15 }}>🏷️</Text>
              <Text style={{ color: mode === 'night' ? '#fff' : '#1A2340', fontSize: 15, fontWeight: '800' }}>App Terminology</Text>
            </View>
            <Text style={{ color: mode === 'night' ? 'rgba(0,0,0,0.50)' : 'rgba(0,0,0,0.45)', fontSize: 12, lineHeight: 18, marginBottom: 14 }}>Rename the key labels your team sees across the app. Use words they already say every day.</Text>

            {/* Grouped cards — each card holds a singular/plural pair */}
            {([
              { icon: '📦', title: 'Main Item', fields: [
                { label: 'Singular', helper: 'What is one record called?', value: subjectSingular, setter: setSubjectSingular, ph: 'Batch' },
                { label: 'Plural', helper: 'What do you call multiple records?', value: subjectPlural, setter: setSubjectPlural, ph: 'Batches' },
              ]},
              { icon: '🗂️', title: 'Workspace & SubSpace', fields: [
                { label: 'Workspace name word', helper: 'What should this area be called?', value: workspaceLabel, setter: setWorkspaceLabel, ph: 'Team Workspace' },
                { label: 'SubSpace name word', helper: 'What should each smaller work area be called?', value: subSpaceLabel, setter: setSubSpaceLabel, ph: 'Work Lane' },
              ]},
              { icon: '🏢', title: data.shellConfig.functionLabel ?? 'Department', fields: [
                { label: 'Singular', helper: 'One top-level business division', value: functionLabel, setter: setFunctionLabel, ph: 'Department' },
                { label: 'Plural', helper: 'Plural version', value: functionLabelPlural, setter: setFunctionLabelPlural, ph: 'Departments' },
              ]},
              { icon: '📋', title: data.shellConfig.objectLabel ?? 'Object', fields: [
                { label: 'Singular', helper: 'The type of inventory or asset being tracked', value: shellObjectLabel, setter: setShellObjectLabel, ph: 'Inventory' },
                { label: 'Plural', helper: 'Plural version', value: objectLabelPlural, setter: setObjectLabelPlural, ph: 'Inventories' },
              ]},
              { icon: '📁', title: data.shellConfig.collectionLabel ?? 'Batch', fields: [
                { label: 'Singular', helper: 'An individual tracked collection', value: collectionLabel, setter: setCollectionLabel, ph: 'Batch' },
                { label: 'Plural', helper: 'Plural version', value: collectionLabelPlural, setter: setCollectionLabelPlural, ph: 'Batches' },
              ]},
            ] as const).map((group) => (
              <View key={group.title} style={{ backgroundColor: mode === 'night' ? 'rgba(0,0,0,0.02)' : 'rgba(0,0,0,0.015)', borderRadius: 14, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: mode === 'night' ? 'rgba(0,0,0,0.04)' : 'rgba(0,0,0,0.06)' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <Text style={{ fontSize: 14 }}>{group.icon}</Text>
                  <Text style={{ color: ac, fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 }}>{group.title}</Text>
                </View>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                  {group.fields.map((f) => (
                    <View key={f.label + f.ph} style={{ flex: 1, minWidth: 200 }}>
                      <LabeledInput label={f.label} helperText={f.helper} value={f.value} onChangeText={f.setter as (v: string) => void} placeholder={f.ph} />
                    </View>
                  ))}
                </View>
              </View>
            ))}

            {/* Save button — accent styled */}
            <Pressable nativeID="wt-save-app-words" disabled={!canManageWorkspace} style={{ backgroundColor: canManageWorkspace ? ac : mode === 'night' ? 'rgba(0,0,0,0.04)' : 'rgba(0,0,0,0.06)', borderRadius: 10, paddingVertical: 12, paddingHorizontal: 20, alignItems: 'center', marginTop: 6, opacity: canManageWorkspace ? 1 : 0.45 }} onPress={() => { saveLabels(); auditLog?.logEntry({ action: 'update', entityType: 'shell-config', entityId: 'shell-config', entityName: 'Shell Configuration', after: { subjectSingular, subjectPlural, workspaceLabel, subSpaceLabel } }); addNotification?.({ type: 'system', title: 'Config Updated', body: 'Shell configuration (app terminology) has been saved.', severity: 'info' }); }}>
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13, letterSpacing: 0.3 }}>💾  Save App Words</Text>
            </Pressable>
          </>
        )}

        {/* ══════════════════════════════════════════════════════════════
            PANE 2 — INTAKE FORM BUILDER
           ══════════════════════════════════════════════════════════════ */}
        {shellPane === 'intake' && (
          <>
            {/* Section header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <Text style={{ fontSize: 15 }}>📝</Text>
              <Text style={{ color: mode === 'night' ? '#fff' : '#1A2340', fontSize: 15, fontWeight: '800' }}>Intake Form Builder</Text>
              <View style={{ backgroundColor: acRgba(0.14), borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2, marginLeft: 6 }}>
                <Text style={{ color: ac, fontSize: 11, fontWeight: '700' }}>{shellConfig.intakeFields.length} fields</Text>
              </View>
            </View>
            <Text style={{ color: mode === 'night' ? 'rgba(0,0,0,0.50)' : 'rgba(0,0,0,0.45)', fontSize: 12, lineHeight: 18, marginBottom: 14 }}>Define the fields that every new record starts with. Only ask for information your team actually needs.</Text>

            {/* Existing fields — card grid */}
            {shellConfig.intakeFields.length > 0 && (
              <View style={{ gap: 8, marginBottom: 14 }}>
                {shellConfig.intakeFields.map((field) => {
                  const typeIcon = field.type === 'text' ? '✏️' : field.type === 'number' ? '#️⃣' : field.type === 'date' ? '📅' : '📋';
                  return (
                    <View key={field.id} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: mode === 'night' ? 'rgba(0,0,0,0.02)' : 'rgba(0,0,0,0.015)', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: mode === 'night' ? 'rgba(0,0,0,0.04)' : 'rgba(0,0,0,0.06)', gap: 12 }}>
                      <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: acRgba(0.12), alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ fontSize: 16 }}>{typeIcon}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: mode === 'night' ? '#fff' : '#1A2340', fontWeight: '700', fontSize: 13 }}>{field.label}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 }}>
                          <Text style={{ color: mode === 'night' ? 'rgba(0,0,0,0.45)' : 'rgba(0,0,0,0.40)', fontSize: 11 }}>{field.type}</Text>
                          <View style={{ width: 3, height: 3, borderRadius: 2, backgroundColor: mode === 'night' ? 'rgba(0,0,0,0.20)' : 'rgba(0,0,0,0.20)' }} />
                          <Text style={{ color: field.required ? '#22C55E' : mode === 'night' ? 'rgba(0,0,0,0.35)' : 'rgba(0,0,0,0.35)', fontSize: 11, fontWeight: '600' }}>{field.required ? 'Required' : 'Optional'}</Text>
                          {!!field.options?.length && <>
                            <View style={{ width: 3, height: 3, borderRadius: 2, backgroundColor: mode === 'night' ? 'rgba(0,0,0,0.20)' : 'rgba(0,0,0,0.20)' }} />
                            <Text style={{ color: mode === 'night' ? 'rgba(0,0,0,0.40)' : 'rgba(0,0,0,0.35)', fontSize: 11 }}>{field.options.join(', ')}</Text>
                          </>}
                        </View>
                      </View>
                      <Pressable disabled={!canManageWorkspace} onPress={() => removeIntakeField(field.id)} style={{ opacity: canManageWorkspace ? 0.7 : 0.3, padding: 6 }}>
                        <Text style={{ fontSize: 16 }}>🗑️</Text>
                      </Pressable>
                    </View>
                  );
                })}
              </View>
            )}

            {/* New field builder card */}
            <View style={{ backgroundColor: mode === 'night' ? acRgba(0.06) : acRgba(0.03), borderRadius: 14, padding: 16, borderWidth: 1, borderColor: acRgba(0.15), gap: 10 }}>
              <Text style={{ color: ac, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 2 }}>➕  Add New Field</Text>
              <LabeledInput label="Field Label" helperText="Example: Carton Serial" value={newFieldLabel} onChangeText={setNewFieldLabel} placeholder="Example: NDC Product Code" />

              {/* Type selector cards */}
              <Text style={{ color: mode === 'night' ? 'rgba(0,0,0,0.55)' : 'rgba(0,0,0,0.50)', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 4 }}>Field Type</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {([
                  { type: 'text' as const, icon: '✏️', label: 'Text' },
                  { type: 'number' as const, icon: '#️⃣', label: 'Number' },
                  { type: 'date' as const, icon: '📅', label: 'Date' },
                  { type: 'select' as const, icon: '📋', label: 'Dropdown' },
                ]).map(({ type, icon, label }) => {
                  const sel = newFieldType === type;
                  return (
                    <Pressable key={type} disabled={!canManageWorkspace} onPress={() => setNewFieldType(type)} style={{
                      flex: 1, minWidth: 80, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
                      paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10,
                      backgroundColor: sel ? acRgba(0.18) : mode === 'night' ? 'rgba(0,0,0,0.02)' : 'rgba(0,0,0,0.03)',
                      borderWidth: 1, borderColor: sel ? acRgba(0.35) : mode === 'night' ? 'rgba(0,0,0,0.04)' : 'rgba(0,0,0,0.06)',
                      opacity: canManageWorkspace ? 1 : 0.45,
                    }}>
                      <Text style={{ fontSize: 14 }}>{icon}</Text>
                      <Text style={{ fontSize: 12, fontWeight: sel ? '800' : '600', color: sel ? ac : mode === 'night' ? 'rgba(0,0,0,0.50)' : 'rgba(0,0,0,0.45)' }}>{label}</Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Required toggle */}
              <Pressable disabled={!canManageWorkspace} onPress={() => setNewFieldRequired((c) => !c)} style={{
                flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10,
                backgroundColor: newFieldRequired ? 'rgba(34,197,94,0.10)' : mode === 'night' ? 'rgba(0,0,0,0.02)' : 'rgba(0,0,0,0.03)',
                borderWidth: 1, borderColor: newFieldRequired ? 'rgba(34,197,94,0.25)' : mode === 'night' ? 'rgba(0,0,0,0.04)' : 'rgba(0,0,0,0.06)',
                opacity: canManageWorkspace ? 1 : 0.45,
              }}>
                <Text style={{ fontSize: 13 }}>{newFieldRequired ? '✅' : '⬜'}</Text>
                <Text style={{ color: newFieldRequired ? '#22C55E' : mode === 'night' ? 'rgba(0,0,0,0.50)' : 'rgba(0,0,0,0.45)', fontSize: 12, fontWeight: '700' }}>Required Field</Text>
              </Pressable>

              {newFieldType === 'select' && (
                <LabeledInput label="Dropdown Options (comma separated)" helperText="Example: Match, Mismatch, Pending" value={newFieldOptions} onChangeText={setNewFieldOptions} placeholder="Manufacturer, Distributor, Pharmacy" />
              )}

              <Pressable nativeID="wt-add-intake-field" disabled={!canManageWorkspace} onPress={addIntakeField} style={{ backgroundColor: canManageWorkspace ? ac : mode === 'night' ? 'rgba(0,0,0,0.04)' : 'rgba(0,0,0,0.06)', borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginTop: 4, opacity: canManageWorkspace ? 1 : 0.45 }}>
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>➕  Add Field</Text>
              </Pressable>
            </View>
          </>
        )}

        {/* ══════════════════════════════════════════════════════════════
            PANE 3 — USER PERSONAS
           ══════════════════════════════════════════════════════════════ */}
        {shellPane === 'personas' && (
          <>
            {/* Section header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <Text style={{ fontSize: 15 }}>👤</Text>
              <Text style={{ color: mode === 'night' ? '#fff' : '#1A2340', fontSize: 15, fontWeight: '800' }}>User Personas</Text>
              <View style={{ backgroundColor: acRgba(0.14), borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2, marginLeft: 6 }}>
                <Text style={{ color: ac, fontSize: 11, fontWeight: '700' }}>{shellConfig.personas.length} personas</Text>
              </View>
            </View>
            <Text style={{ color: mode === 'night' ? 'rgba(0,0,0,0.50)' : 'rgba(0,0,0,0.45)', fontSize: 12, lineHeight: 18, marginBottom: 14 }}>Create personas that represent the different workflow roles in your organization. Each persona can be scoped to specific workspaces and tagged for reporting.</Text>

            {/* Existing persona cards */}
            {shellConfig.personas.length > 0 && (
              <View style={{ gap: 8, marginBottom: 14 }}>
                {shellConfig.personas.map((persona) => (
                  <View key={persona.id} style={{ backgroundColor: mode === 'night' ? 'rgba(0,0,0,0.02)' : 'rgba(0,0,0,0.015)', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: mode === 'night' ? 'rgba(0,0,0,0.04)' : 'rgba(0,0,0,0.06)' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                      <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: acRgba(0.14), alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ fontSize: 16 }}>👤</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: mode === 'night' ? '#fff' : '#1A2340', fontWeight: '700', fontSize: 14 }}>{persona.name}</Text>
                        {!!persona.description && <Text style={{ color: mode === 'night' ? 'rgba(0,0,0,0.45)' : 'rgba(0,0,0,0.40)', fontSize: 11, marginTop: 2 }}>{persona.description}</Text>}
                      </View>
                      <Pressable disabled={!canManageWorkspace} onPress={() => deletePersona(persona.id)} style={{ opacity: canManageWorkspace ? 0.7 : 0.3, padding: 6 }}>
                        <Text style={{ fontSize: 16 }}>🗑️</Text>
                      </Pressable>
                    </View>
                    {/* Meta badges */}
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                      <View style={{ backgroundColor: acRgba(0.10), borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
                        <Text style={{ color: ac, fontSize: 10, fontWeight: '700' }}>🌐 {persona.workspaceScope === 'all' ? 'All Workspaces' : `${persona.workspaceIds.length} workspace${persona.workspaceIds.length === 1 ? '' : 's'}`}</Text>
                      </View>
                      {persona.defaultTags.filter(Boolean).map((tag) => (
                        <View key={tag} style={{ backgroundColor: mode === 'night' ? 'rgba(0,0,0,0.04)' : 'rgba(0,0,0,0.05)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
                          <Text style={{ color: mode === 'night' ? 'rgba(0,0,0,0.55)' : 'rgba(0,0,0,0.50)', fontSize: 10, fontWeight: '600' }}>🏷️ {tag}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* New persona builder card */}
            <View style={{ backgroundColor: mode === 'night' ? acRgba(0.06) : acRgba(0.03), borderRadius: 14, padding: 16, borderWidth: 1, borderColor: acRgba(0.15), gap: 10 }}>
              <Text style={{ color: ac, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 2 }}>➕  New Persona</Text>
              <LabeledInput label="Persona Name" helperText="Example: Distributor Receiver" value={personaName} onChangeText={setPersonaName} placeholder="Example: Pharmacy Dispense Manager" />
              <LabeledInput label="Description" helperText="Example: Handles incoming carton scans and serial verification" value={personaDescription} onChangeText={setPersonaDescription} placeholder="Describe what this persona does" multiline />

              {/* Workspace scope selector cards */}
              <Text style={{ color: mode === 'night' ? 'rgba(0,0,0,0.55)' : 'rgba(0,0,0,0.50)', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 4 }}>Workspace Scope</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {([
                  { key: 'all' as const, icon: '🌐', label: 'All Workspaces' },
                  { key: 'selected' as const, icon: '🎯', label: 'Selected Only' },
                ]).map(({ key, icon, label }) => {
                  const sel = personaWorkspaceScope === key;
                  return (
                    <Pressable key={key} disabled={!canManageWorkspace} onPress={() => setPersonaWorkspaceScope(key)} style={{
                      flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
                      paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10,
                      backgroundColor: sel ? acRgba(0.18) : mode === 'night' ? 'rgba(0,0,0,0.02)' : 'rgba(0,0,0,0.03)',
                      borderWidth: 1, borderColor: sel ? acRgba(0.35) : mode === 'night' ? 'rgba(0,0,0,0.04)' : 'rgba(0,0,0,0.06)',
                      opacity: canManageWorkspace ? 1 : 0.45,
                    }}>
                      <Text style={{ fontSize: 13 }}>{icon}</Text>
                      <Text style={{ fontSize: 12, fontWeight: sel ? '800' : '600', color: sel ? ac : mode === 'night' ? 'rgba(0,0,0,0.50)' : 'rgba(0,0,0,0.45)' }}>{label}</Text>
                    </Pressable>
                  );
                })}
              </View>
              {personaWorkspaceScope === 'selected' && (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                  {shellWorkspaces.map((workspaceItem) => {
                    const sel = personaWorkspaceIds.includes(workspaceItem.id);
                    return (
                      <Pressable key={workspaceItem.id} disabled={!canManageWorkspace} onPress={() => togglePersonaWorkspace(workspaceItem.id)} style={{
                        paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8,
                        backgroundColor: sel ? acRgba(0.18) : mode === 'night' ? 'rgba(0,0,0,0.02)' : 'rgba(0,0,0,0.03)',
                        borderWidth: 1, borderColor: sel ? acRgba(0.30) : mode === 'night' ? 'rgba(0,0,0,0.04)' : 'rgba(0,0,0,0.06)',
                        opacity: canManageWorkspace ? 1 : 0.45,
                      }}>
                        <Text style={{ fontSize: 12, fontWeight: sel ? '700' : '500', color: sel ? ac : mode === 'night' ? 'rgba(0,0,0,0.45)' : 'rgba(0,0,0,0.40)' }}>{workspaceItem.name}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}

              <LabeledInput label="Default Tags (comma separated)" helperText="Example: Team:Distributor, Region:US" value={personaDefaultTags} onChangeText={setPersonaDefaultTags} placeholder="Persona:DistributorReceiver, Segment:Traceability" />

              <Pressable disabled={!canManageWorkspace} onPress={createPersona} style={{ backgroundColor: canManageWorkspace ? ac : mode === 'night' ? 'rgba(0,0,0,0.04)' : 'rgba(0,0,0,0.06)', borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginTop: 4, opacity: canManageWorkspace ? 1 : 0.45 }}>
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>👤  Create Persona</Text>
              </Pressable>
            </View>
          </>
        )}

        {/* ══════════════════════════════════════════════════════════════
            PANE 4 — LIFECYCLE STAGES
           ══════════════════════════════════════════════════════════════ */}
        {shellPane === 'lifecycle' && (
          <>
            {/* Section header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <Text style={{ fontSize: 15 }}>🔄</Text>
              <Text style={{ color: mode === 'night' ? '#fff' : '#1A2340', fontSize: 15, fontWeight: '800' }}>Lifecycle Stages</Text>
              <View style={{ backgroundColor: acRgba(0.14), borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2, marginLeft: 6 }}>
                <Text style={{ color: ac, fontSize: 11, fontWeight: '700' }}>{shellConfig.lifecycleStages.length} stages · {shellConfig.lifecycleTransitions.length} rules</Text>
              </View>
            </View>
            <Text style={{ color: mode === 'night' ? 'rgba(0,0,0,0.50)' : 'rgba(0,0,0,0.45)', fontSize: 12, lineHeight: 18, marginBottom: 14 }}>Map out the stages a record moves through from start to finish. Define stages, set a default, and create transition rules.</Text>

            {/* Existing stage cards */}
            {shellConfig.lifecycleStages.length > 0 && (
              <View style={{ gap: 8, marginBottom: 14 }}>
                {shellConfig.lifecycleStages.map((stage) => {
                  const isDefault = stage.id === shellConfig.defaultLifecycleStageId;
                  return (
                    <View key={stage.id} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: mode === 'night' ? 'rgba(0,0,0,0.02)' : 'rgba(0,0,0,0.015)', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: isDefault ? 'rgba(34,197,94,0.25)' : mode === 'night' ? 'rgba(0,0,0,0.04)' : 'rgba(0,0,0,0.06)', gap: 12 }}>
                      <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: isDefault ? 'rgba(34,197,94,0.12)' : acRgba(0.12), alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ fontSize: 16 }}>{isDefault ? '⭐' : '🔄'}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={{ color: mode === 'night' ? '#fff' : '#1A2340', fontWeight: '700', fontSize: 13 }}>{stage.name}</Text>
                          {isDefault && <View style={{ backgroundColor: 'rgba(34,197,94,0.12)', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1 }}><Text style={{ color: '#22C55E', fontSize: 10, fontWeight: '700' }}>DEFAULT</Text></View>}
                        </View>
                        {!!stage.description && <Text style={{ color: mode === 'night' ? 'rgba(0,0,0,0.45)' : 'rgba(0,0,0,0.40)', fontSize: 11, marginTop: 2 }}>{stage.description}</Text>}
                      </View>
                      <View style={{ flexDirection: 'row', gap: 6 }}>
                        {!isDefault && (
                          <Pressable disabled={!canManageWorkspace} onPress={() => setDefaultLifecycleStage(stage.id)} style={{ opacity: canManageWorkspace ? 0.7 : 0.3, padding: 6 }}>
                            <Text style={{ fontSize: 14 }}>⭐</Text>
                          </Pressable>
                        )}
                        <Pressable disabled={!canManageWorkspace} onPress={() => deleteLifecycleStage(stage.id)} style={{ opacity: canManageWorkspace ? 0.7 : 0.3, padding: 6 }}>
                          <Text style={{ fontSize: 14 }}>🗑️</Text>
                        </Pressable>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            {/* Add new stage card */}
            <View style={{ backgroundColor: mode === 'night' ? acRgba(0.06) : acRgba(0.03), borderRadius: 14, padding: 16, borderWidth: 1, borderColor: acRgba(0.15), gap: 10, marginBottom: 14 }}>
              <Text style={{ color: ac, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 2 }}>➕  Add New Stage</Text>
              <LabeledInput label="Stage Name" helperText="Example: Exception Review" value={newLifecycleName} onChangeText={setNewLifecycleName} placeholder="Received by Pharmacy" />
              <LabeledInput label="Description" helperText="Example: Serial event requires investigation" value={newLifecycleDescription} onChangeText={setNewLifecycleDescription} placeholder="Optional context for users" multiline />
              <Pressable disabled={!canManageWorkspace} onPress={addLifecycleStage} style={{ backgroundColor: canManageWorkspace ? ac : mode === 'night' ? 'rgba(0,0,0,0.04)' : 'rgba(0,0,0,0.06)', borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginTop: 4, opacity: canManageWorkspace ? 1 : 0.45 }}>
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>🔄  Add Stage</Text>
              </Pressable>
            </View>

            {/* ── Transition Rules Section ── */}
            <View style={{ height: 1, backgroundColor: mode === 'night' ? 'rgba(0,0,0,0.04)' : 'rgba(0,0,0,0.07)', marginVertical: 8 }} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <Text style={{ fontSize: 14 }}>🔀</Text>
              <Text style={{ color: mode === 'night' ? '#fff' : '#1A2340', fontSize: 14, fontWeight: '800' }}>Transition Rules</Text>
              <View style={{ backgroundColor: acRgba(0.14), borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2, marginLeft: 4 }}>
                <Text style={{ color: ac, fontSize: 11, fontWeight: '700' }}>{shellConfig.lifecycleTransitions.length}</Text>
              </View>
            </View>

            {shellConfig.lifecycleTransitions.length === 0 && (
              <Text style={{ color: mode === 'night' ? 'rgba(0,0,0,0.40)' : 'rgba(0,0,0,0.35)', fontSize: 12, fontStyle: 'italic', marginBottom: 10 }}>No move rules yet. Records can still start in the default stage.</Text>
            )}

            {/* Existing transition cards */}
            {shellConfig.lifecycleTransitions.length > 0 && (
              <View style={{ gap: 8, marginBottom: 14 }}>
                {shellConfig.lifecycleTransitions.map((transition) => {
                  const from = shellConfig.lifecycleStages.find((s) => s.id === transition.fromStageId)?.name ?? transition.fromStageId;
                  const to = shellConfig.lifecycleStages.find((s) => s.id === transition.toStageId)?.name ?? transition.toStageId;
                  const pNames = (transition.personaIds ?? []).map((pid) => shellConfig.personas.find((p) => p.id === pid)?.name ?? pid).join(', ');
                  return (
                    <View key={transition.id} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: mode === 'night' ? 'rgba(0,0,0,0.02)' : 'rgba(0,0,0,0.015)', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: mode === 'night' ? 'rgba(0,0,0,0.04)' : 'rgba(0,0,0,0.06)', gap: 12 }}>
                      <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: acRgba(0.12), alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ fontSize: 16 }}>🔀</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: mode === 'night' ? '#fff' : '#1A2340', fontWeight: '700', fontSize: 13 }}>{from} → {to}</Text>
                        <Text style={{ color: mode === 'night' ? 'rgba(0,0,0,0.45)' : 'rgba(0,0,0,0.40)', fontSize: 11, marginTop: 2 }}>{(transition.personaIds ?? []).length === 0 ? '🌐 All personas' : `👤 ${pNames}`}</Text>
                      </View>
                      <Pressable disabled={!canManageWorkspace} onPress={() => deleteLifecycleTransition(transition.id)} style={{ opacity: canManageWorkspace ? 0.7 : 0.3, padding: 6 }}>
                        <Text style={{ fontSize: 16 }}>🗑️</Text>
                      </Pressable>
                    </View>
                  );
                })}
              </View>
            )}

            {/* Transition builder card */}
            <View style={{ backgroundColor: mode === 'night' ? acRgba(0.06) : acRgba(0.03), borderRadius: 14, padding: 16, borderWidth: 1, borderColor: acRgba(0.15), gap: 10 }}>
              <Text style={{ color: ac, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 2 }}>➕  New Transition Rule</Text>

              <Text style={{ color: mode === 'night' ? 'rgba(0,0,0,0.55)' : 'rgba(0,0,0,0.50)', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 }}>From Stage</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {shellConfig.lifecycleStages.map((stage) => {
                  const sel = transitionFromStageId === stage.id;
                  return (
                    <Pressable key={`from-${stage.id}`} disabled={!canManageWorkspace} onPress={() => setTransitionFromStageId(stage.id)} style={{
                      paddingVertical: 7, paddingHorizontal: 12, borderRadius: 8,
                      backgroundColor: sel ? acRgba(0.18) : mode === 'night' ? 'rgba(0,0,0,0.02)' : 'rgba(0,0,0,0.03)',
                      borderWidth: 1, borderColor: sel ? acRgba(0.35) : mode === 'night' ? 'rgba(0,0,0,0.04)' : 'rgba(0,0,0,0.06)',
                      opacity: canManageWorkspace ? 1 : 0.45,
                    }}>
                      <Text style={{ fontSize: 12, fontWeight: sel ? '700' : '500', color: sel ? ac : mode === 'night' ? 'rgba(0,0,0,0.45)' : 'rgba(0,0,0,0.40)' }}>{stage.name}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={{ color: mode === 'night' ? 'rgba(0,0,0,0.55)' : 'rgba(0,0,0,0.50)', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 4 }}>To Stage</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {shellConfig.lifecycleStages.map((stage) => {
                  const sel = transitionToStageId === stage.id;
                  return (
                    <Pressable key={`to-${stage.id}`} disabled={!canManageWorkspace} onPress={() => setTransitionToStageId(stage.id)} style={{
                      paddingVertical: 7, paddingHorizontal: 12, borderRadius: 8,
                      backgroundColor: sel ? acRgba(0.18) : mode === 'night' ? 'rgba(0,0,0,0.02)' : 'rgba(0,0,0,0.03)',
                      borderWidth: 1, borderColor: sel ? acRgba(0.35) : mode === 'night' ? 'rgba(0,0,0,0.04)' : 'rgba(0,0,0,0.06)',
                      opacity: canManageWorkspace ? 1 : 0.45,
                    }}>
                      <Text style={{ fontSize: 12, fontWeight: sel ? '700' : '500', color: sel ? ac : mode === 'night' ? 'rgba(0,0,0,0.45)' : 'rgba(0,0,0,0.40)' }}>{stage.name}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={{ color: mode === 'night' ? 'rgba(0,0,0,0.55)' : 'rgba(0,0,0,0.50)', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 4 }}>Persona Scope</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {([
                  { key: 'all' as const, icon: '🌐', label: 'All Personas' },
                  { key: 'selected' as const, icon: '🎯', label: 'Selected' },
                ]).map(({ key, icon, label }) => {
                  const sel = transitionPersonaScope === key;
                  return (
                    <Pressable key={key} disabled={!canManageWorkspace} onPress={() => setTransitionPersonaScope(key)} style={{
                      flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
                      paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10,
                      backgroundColor: sel ? acRgba(0.18) : mode === 'night' ? 'rgba(0,0,0,0.02)' : 'rgba(0,0,0,0.03)',
                      borderWidth: 1, borderColor: sel ? acRgba(0.35) : mode === 'night' ? 'rgba(0,0,0,0.04)' : 'rgba(0,0,0,0.06)',
                      opacity: canManageWorkspace ? 1 : 0.45,
                    }}>
                      <Text style={{ fontSize: 13 }}>{icon}</Text>
                      <Text style={{ fontSize: 12, fontWeight: sel ? '800' : '600', color: sel ? ac : mode === 'night' ? 'rgba(0,0,0,0.50)' : 'rgba(0,0,0,0.45)' }}>{label}</Text>
                    </Pressable>
                  );
                })}
              </View>

              {transitionPersonaScope === 'selected' && (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                  {shellConfig.personas.map((persona) => {
                    const sel = transitionPersonaIds.includes(persona.id);
                    return (
                      <Pressable key={`tp-${persona.id}`} disabled={!canManageWorkspace} onPress={() => toggleTransitionPersona(persona.id)} style={{
                        paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8,
                        backgroundColor: sel ? acRgba(0.18) : mode === 'night' ? 'rgba(0,0,0,0.02)' : 'rgba(0,0,0,0.03)',
                        borderWidth: 1, borderColor: sel ? acRgba(0.30) : mode === 'night' ? 'rgba(0,0,0,0.04)' : 'rgba(0,0,0,0.06)',
                        opacity: canManageWorkspace ? 1 : 0.45,
                      }}>
                        <Text style={{ fontSize: 12, fontWeight: sel ? '700' : '500', color: sel ? ac : mode === 'night' ? 'rgba(0,0,0,0.45)' : 'rgba(0,0,0,0.40)' }}>{persona.name}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}

              <Pressable disabled={!canManageWorkspace} onPress={addLifecycleTransition} style={{ backgroundColor: canManageWorkspace ? ac : mode === 'night' ? 'rgba(0,0,0,0.04)' : 'rgba(0,0,0,0.06)', borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginTop: 4, opacity: canManageWorkspace ? 1 : 0.45 }}>
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>🔀  Add Transition Rule</Text>
              </Pressable>
            </View>
          </>
        )}

        {!!shellNotice && <Text style={styles.notice}>{shellNotice}</Text>}
      </Card>}

      {adminTab === 'role' && <Card title="" blurred>
        {/* ── RBAC Dashboard Header ── */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
          {[
            { icon: canManageWorkspace ? '🛡️' : '🔒', label: currentUser ? currentUser.fullName : 'Anonymous', sub: isSuperAdmin ? 'Super Admin' : canManageWorkspace ? 'Admin' : 'No admin access', color: canManageWorkspace ? '#2ECC71' : '#E74C3C' },
            { icon: '👥', label: `${roles.length} Role${roles.length !== 1 ? 's' : ''}`, sub: 'Active profiles', color: ac },
            { icon: '🔑', label: `${permissions.length} Permission${permissions.length !== 1 ? 's' : ''}`, sub: selectedRole ? `on "${selectedRole.name}"` : 'Select a role', color: '#F59E0B' },
            { icon: '📂', label: `${policyWorkspaces.length} Workspace${policyWorkspaces.length !== 1 ? 's' : ''}`, sub: workspaceScope === 'all' ? 'All accessible' : `${workspaceIds.length} scoped`, color: '#6366F1' },
          ].map((kpi, i) => (
            <View key={i} style={{ flex: 1, minWidth: 140, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: `${kpi.color}30`, backgroundColor: `${kpi.color}0C` }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <Text style={{ fontSize: 20 }}>{kpi.icon}</Text>
                <Text style={{ fontSize: 15, fontWeight: '700', color: mode === 'night' ? '#1A2340' : '#1A2340' }}>{kpi.label}</Text>
              </View>
              <Text style={{ fontSize: 11, color: mode === 'night' ? 'rgba(241,232,255,0.55)' : 'rgba(0,0,0,0.5)' }}>{kpi.sub}</Text>
            </View>
          ))}
        </View>

        {!canManageWorkspace && (
          <View style={{ borderRadius: 10, padding: 12, marginBottom: 12, backgroundColor: 'rgba(231,76,60,0.08)', borderWidth: 1, borderColor: 'rgba(231,76,60,0.3)' }}>
            <Text style={{ fontSize: 13, color: '#E74C3C', fontWeight: '600' }}>⚠ You do not have permission to manage access & permissions.</Text>
          </View>
        )}

        {/* ── Sub-tab Navigation ── */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 16, borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: mode === 'night' ? 'rgba(0,0,0,0.04)' : 'rgba(102,74,154,0.12)' }}>
          {([
            { key: 'roles' as const, icon: '👤', label: 'Roles' },
            { key: 'permissions' as const, icon: '🔑', label: 'Permissions' },
            { key: 'scope' as const, icon: '🎯', label: 'Scope' },
            { key: 'templates' as const, icon: '📋', label: 'Templates' },
            { key: 'diff' as const, icon: '🔍', label: 'Diff & Audit' },
          ]).map(({ key, icon, label }, idx) => {
            const isActive = rolePane === key;
            return (
              <Pressable
                key={key}
                onPress={() => setRolePane(key)}
                style={{
                  flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                  paddingVertical: 10, paddingHorizontal: 8, gap: 5, minWidth: 100,
                  backgroundColor: isActive ? acRgba(0.18) : mode === 'night' ? 'rgba(0,0,0,0.015)' : 'rgba(0,0,0,0.02)',
                  borderRightWidth: idx < 4 ? 1 : 0,
                  borderRightColor: mode === 'night' ? 'rgba(0,0,0,0.04)' : 'rgba(102,74,154,0.10)',
                }}
              >
                <Text style={{ fontSize: 13 }}>{icon}</Text>
                <Text style={{ fontSize: 12, fontWeight: isActive ? '800' : '600', color: isActive ? ac : mode === 'night' ? 'rgba(0,0,0,0.45)' : 'rgba(0,0,0,0.45)' }}>{label}</Text>
              </Pressable>
            );
          })}
        </View>

        {rolePane === 'roles' && (
          <>
            {/* ── Role Cards Grid ── */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
              {roles.map((role) => {
                const isSelected = selectedRoleId === role.id;
                const members = data.users.filter((u) => u.roleId === role.id);
                return (
                  <Pressable key={role.id} onPress={() => setSelectedRoleId(role.id)} style={{
                    minWidth: 180, flex: 1, borderRadius: 12, padding: 14,
                    borderWidth: isSelected ? 2 : 1,
                    borderColor: isSelected ? ac : mode === 'night' ? 'rgba(0,0,0,0.06)' : 'rgba(0,0,0,0.08)',
                    backgroundColor: isSelected ? acRgba(0.08) : mode === 'night' ? 'rgba(0,0,0,0.02)' : 'rgba(0,0,0,0.02)',
                  }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: isSelected ? acRgba(0.2) : 'rgba(107,114,128,0.15)', alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ fontSize: 14 }}>👤</Text>
                      </View>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: isSelected ? ac : mode === 'night' ? '#1A2340' : '#1A2340', flex: 1 }}>{role.name}</Text>
                    </View>
                    <Text style={{ fontSize: 11, color: mode === 'night' ? 'rgba(241,232,255,0.5)' : 'rgba(0,0,0,0.45)', marginBottom: 4 }}>{role.description || 'No description'}</Text>
                    <View style={{ flexDirection: 'row', gap: 12 }}>
                      <Text style={{ fontSize: 11, color: mode === 'night' ? 'rgba(241,232,255,0.4)' : 'rgba(0,0,0,0.35)' }}>👥 {members.length} member{members.length !== 1 ? 's' : ''}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>

            {/* ── Create New Role ── */}
            <View style={{ borderRadius: 12, padding: 14, borderWidth: 1, borderColor: mode === 'night' ? 'rgba(0,0,0,0.04)' : 'rgba(0,0,0,0.07)', backgroundColor: mode === 'night' ? 'rgba(0,0,0,0.015)' : 'rgba(0,0,0,0.015)', marginBottom: 12 }}>
              <Text style={[styles.listTitle, { fontSize: 13, marginBottom: 8 }]}>Create New Role</Text>
              <LabeledInput label="Role Name" helperText="Permission profile name" value={newRoleName} onChangeText={setNewRoleName} placeholder="Example: Assembly Supervisor" />
              <Pressable disabled={!canManageWorkspace} style={[styles.secondaryButton, !canManageWorkspace && styles.buttonDisabled]} onPress={createRole}>
                <Text style={styles.secondaryButtonText}>+ Create Role</Text>
              </Pressable>
            </View>

            {/* ── Selected Role Detail ── */}
            {selectedRole && (
              <View style={{ borderRadius: 12, padding: 14, borderWidth: 1, borderColor: acRgba(0.2), backgroundColor: acRgba(0.04) }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: ac, marginBottom: 10 }}>Edit: {selectedRole.name}</Text>
                <LabeledInput label="Role Name" helperText="Example: Line Lead" value={roleName} onChangeText={setRoleName} placeholder="Example: Distributor Verification Lead" />
                <LabeledInput label="Role Description" helperText="Example: Reviews incoming quality" value={roleDescription} onChangeText={setRoleDescription} placeholder="Describe responsibilities" multiline />
                <View style={styles.inlineRow}>
                  <Pressable nativeID="wt-save-role" disabled={!canManageWorkspace} style={[styles.primaryButton, !canManageWorkspace && styles.buttonDisabled]} onPress={() => { saveRole(); auditLog?.logEntry({ action: 'update', entityType: 'role', entityId: selectedRoleId ?? 'new', entityName: roleName || newRoleName || 'Unnamed Role', after: { detail: 'Saved role policy' } }); addNotification?.({ type: 'system', title: 'Role Saved', body: `Role "${roleName || newRoleName || 'Unnamed Role'}" permissions have been saved.`, severity: 'success' }); }}>
                    <Text style={styles.primaryButtonText}>Save Role</Text>
                  </Pressable>
                  <Pressable disabled={!canManageWorkspace} style={[styles.secondaryButton, !canManageWorkspace && styles.buttonDisabled]} onPress={() => { removeRole(); auditLog?.logEntry({ action: 'delete', entityType: 'role', entityId: selectedRoleId ?? '', entityName: roleName || 'Unnamed Role', after: { detail: 'Deleted role' } }); addNotification?.({ type: 'system', title: 'Role Deleted', body: `Role "${roleName || 'Unnamed Role'}" has been removed.`, severity: 'warning' }); }}>
                    <Text style={styles.secondaryButtonText}>Delete Role</Text>
                  </Pressable>
                </View>
              </View>
            )}
          </>
        )}

        {selectedRole && rolePane === 'permissions' && (
          <>
            {/* ── Members Badge ── */}
            <View style={{ borderRadius: 10, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: acRgba(0.15), backgroundColor: acRgba(0.04) }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: mode === 'night' ? '#1A2340' : '#1A2340' }}>Members in "{selectedRole.name}"</Text>
                {isEditingOwnRole && <View style={{ backgroundColor: acRgba(0.15), borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 }}><Text style={{ fontSize: 10, color: ac, fontWeight: '700' }}>YOUR ROLE</Text></View>}
              </View>
              {membersInRole.length === 0 ? (
                <Text style={{ fontSize: 12, color: mode === 'night' ? 'rgba(241,232,255,0.45)' : 'rgba(0,0,0,0.4)' }}>No members assigned.</Text>
              ) : (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {membersInRole.map((member) => (
                    <View key={member.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: mode === 'night' ? 'rgba(0,0,0,0.03)' : 'rgba(0,0,0,0.04)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 }}>
                      <Text style={{ fontSize: 13 }}>{member.isSuperAdmin ? '👑' : '👤'}</Text>
                      <Text style={{ fontSize: 12, fontWeight: '600', color: mode === 'night' ? '#1A2340' : '#1A2340' }}>{member.fullName}{member.id === currentUser?.id ? ' (you)' : ''}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* ── Permission Cards ── */}
            <Text style={{ fontSize: 13, fontWeight: '700', color: mode === 'night' ? '#1A2340' : '#1A2340', marginBottom: 8 }}>Permission Map</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {permissionCatalog.map((permission) => {
                const enabled = permissions.includes(permission.action);
                return (
                  <Pressable
                    key={permission.action}
                    disabled={!canManageWorkspace}
                    onPress={() => togglePermission(permission.action)}
                    style={{
                      minWidth: 200, flex: 1, borderRadius: 10, padding: 12,
                      borderWidth: 1,
                      borderColor: enabled ? `${ac}40` : mode === 'night' ? 'rgba(0,0,0,0.04)' : 'rgba(0,0,0,0.06)',
                      backgroundColor: enabled ? acRgba(0.08) : mode === 'night' ? 'rgba(0,0,0,0.015)' : 'rgba(0,0,0,0.015)',
                      opacity: !canManageWorkspace ? 0.5 : 1,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: enabled ? ac : mode === 'night' ? '#1A2340' : '#1A2340' }}>{permission.label}</Text>
                      <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: enabled ? ac : 'rgba(107,114,128,0.25)', alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ fontSize: 11, color: '#fff', fontWeight: '700' }}>{enabled ? '✓' : ''}</Text>
                      </View>
                    </View>
                    <Text style={{ fontSize: 11, color: mode === 'night' ? 'rgba(241,232,255,0.5)' : 'rgba(0,0,0,0.45)' }}>{permission.detail}</Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        )}

        {selectedRole && rolePane === 'scope' && (
          <>
            {/* ── Members Badge (same as permissions) ── */}
            <View style={{ borderRadius: 10, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: acRgba(0.15), backgroundColor: acRgba(0.04) }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: mode === 'night' ? '#1A2340' : '#1A2340' }}>Members in "{selectedRole.name}"</Text>
                {isEditingOwnRole && <View style={{ backgroundColor: acRgba(0.15), borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 }}><Text style={{ fontSize: 10, color: ac, fontWeight: '700' }}>YOUR ROLE</Text></View>}
              </View>
              {membersInRole.length === 0 ? (
                <Text style={{ fontSize: 12, color: mode === 'night' ? 'rgba(241,232,255,0.45)' : 'rgba(0,0,0,0.4)' }}>No members assigned.</Text>
              ) : (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {membersInRole.map((member) => (
                    <View key={member.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: mode === 'night' ? 'rgba(0,0,0,0.03)' : 'rgba(0,0,0,0.04)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 }}>
                      <Text style={{ fontSize: 13 }}>{member.isSuperAdmin ? '👑' : '👤'}</Text>
                      <Text style={{ fontSize: 12, fontWeight: '600', color: mode === 'night' ? '#1A2340' : '#1A2340' }}>{member.fullName}{member.id === currentUser?.id ? ' (you)' : ''}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* ── Scope Selector ── */}
            <Text style={{ fontSize: 13, fontWeight: '700', color: mode === 'night' ? '#1A2340' : '#1A2340', marginBottom: 8 }}>Workspace Access Scope</Text>
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
              {([
                { key: 'all' as const, icon: '🌐', label: 'All Workspaces', sub: 'Unrestricted access to every workspace' },
                { key: 'selected' as const, icon: '🎯', label: 'Selected Only', sub: 'Limit to specific workspaces below' },
              ]).map(({ key, icon, label, sub }) => {
                const isActive = workspaceScope === key;
                return (
                  <Pressable
                    key={key}
                    disabled={!canManageWorkspace}
                    onPress={() => setWorkspaceScope(key)}
                    style={{
                      flex: 1, borderRadius: 12, padding: 14,
                      borderWidth: isActive ? 2 : 1,
                      borderColor: isActive ? ac : mode === 'night' ? 'rgba(0,0,0,0.06)' : 'rgba(0,0,0,0.08)',
                      backgroundColor: isActive ? acRgba(0.08) : mode === 'night' ? 'rgba(0,0,0,0.015)' : 'rgba(0,0,0,0.015)',
                      opacity: !canManageWorkspace ? 0.5 : 1,
                    }}
                  >
                    <Text style={{ fontSize: 20, marginBottom: 4 }}>{icon}</Text>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: isActive ? ac : mode === 'night' ? '#1A2340' : '#1A2340' }}>{label}</Text>
                    <Text style={{ fontSize: 11, color: mode === 'night' ? 'rgba(241,232,255,0.5)' : 'rgba(0,0,0,0.45)', marginTop: 2 }}>{sub}</Text>
                  </Pressable>
                );
              })}
            </View>

            {workspaceScope === 'selected' && (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                {policyWorkspaces.map((workspaceItem) => {
                  const selected = workspaceIds.includes(workspaceItem.id);
                  return (
                    <Pressable
                      key={workspaceItem.id}
                      disabled={!canManageWorkspace}
                      onPress={() => toggleWorkspace(workspaceItem.id)}
                      style={{
                        borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10,
                        borderWidth: 1,
                        borderColor: selected ? `${ac}40` : mode === 'night' ? 'rgba(0,0,0,0.06)' : 'rgba(0,0,0,0.08)',
                        backgroundColor: selected ? acRgba(0.10) : mode === 'night' ? 'rgba(0,0,0,0.015)' : 'rgba(0,0,0,0.015)',
                        opacity: !canManageWorkspace ? 0.5 : 1,
                      }}
                    >
                      <Text style={{ fontSize: 13, fontWeight: selected ? '700' : '500', color: selected ? ac : mode === 'night' ? '#1A2340' : '#1A2340' }}>{selected ? '✓ ' : ''}{workspaceItem.name}</Text>
                    </Pressable>
                  );
                })}
              </View>
            )}

            <View style={styles.inlineRow}>
              <Pressable disabled={!canManageWorkspace} style={[styles.primaryButton, !canManageWorkspace && styles.buttonDisabled]} onPress={() => { saveRole(); auditLog?.logEntry({ action: 'update', entityType: 'role', entityId: selectedRoleId ?? 'new', entityName: roleName || newRoleName || 'Unnamed Role', after: { detail: 'Saved role policy (scope)' } }); addNotification?.({ type: 'system', title: 'Role Saved', body: `Role "${roleName || newRoleName || 'Unnamed Role'}" scope has been saved.`, severity: 'success' }); }}>
                <Text style={styles.primaryButtonText}>Save Role</Text>
              </Pressable>
              <Pressable disabled={!canManageWorkspace} style={[styles.secondaryButton, !canManageWorkspace && styles.buttonDisabled]} onPress={() => { removeRole(); auditLog?.logEntry({ action: 'delete', entityType: 'role', entityId: selectedRoleId ?? '', entityName: roleName || 'Unnamed Role', after: { detail: 'Deleted role (scope)' } }); addNotification?.({ type: 'system', title: 'Role Deleted', body: `Role "${roleName || 'Unnamed Role'}" has been removed.`, severity: 'warning' }); }}>
                <Text style={styles.secondaryButtonText}>Delete Role</Text>
              </Pressable>
            </View>
          </>
        )}

        {selectedRole && rolePane === 'templates' && (
          <>
            <Text style={{ fontSize: 13, fontWeight: '700', color: mode === 'night' ? '#1A2340' : '#1A2340', marginBottom: 8 }}>Policy Templates</Text>
            <Text style={{ fontSize: 12, color: mode === 'night' ? 'rgba(241,232,255,0.5)' : 'rgba(0,0,0,0.45)', marginBottom: 12 }}>Save permission snapshots as reusable templates. Clone, version, and diff them for audit and rollback.</Text>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
              {templates.map((template) => (
                <View key={template.id} style={{ minWidth: 260, flex: 1, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: mode === 'night' ? 'rgba(0,0,0,0.06)' : 'rgba(0,0,0,0.08)', backgroundColor: mode === 'night' ? 'rgba(0,0,0,0.02)' : 'rgba(0,0,0,0.02)' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    <Text style={{ fontSize: 14 }}>📋</Text>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: mode === 'night' ? '#1A2340' : '#1A2340', flex: 1 }}>{template.name}</Text>
                    <View style={{ backgroundColor: acRgba(0.12), borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 }}>
                      <Text style={{ fontSize: 10, color: ac, fontWeight: '700' }}>v{template.version}</Text>
                    </View>
                  </View>
                  {!!template.description && <Text style={{ fontSize: 11, color: mode === 'night' ? 'rgba(241,232,255,0.5)' : 'rgba(0,0,0,0.45)', marginBottom: 6 }}>{template.description}</Text>}
                  <Text style={{ fontSize: 10, color: mode === 'night' ? 'rgba(241,232,255,0.35)' : 'rgba(0,0,0,0.3)', marginBottom: 8 }}>Source: {template.source}  ·  Lineage: {template.lineageId}</Text>
                  {template.changeNote && <Text style={{ fontSize: 10, color: mode === 'night' ? 'rgba(241,232,255,0.35)' : 'rgba(0,0,0,0.3)', marginBottom: 8 }}>Note: {template.changeNote}</Text>}
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                    {([
                      { label: 'Apply', onPress: () => applyTemplate(template.id) },
                      { label: 'Clone', onPress: () => cloneTemplate(template.id) },
                      { label: 'New Version', onPress: () => createTemplateVersion(template.id) },
                      { label: 'Diff vs Latest', onPress: () => compareTemplateToLatest(template.id) },
                      { label: 'Set Base', onPress: () => setDiffFromTemplateId(template.id) },
                      { label: 'Set Compare', onPress: () => setDiffToTemplateId(template.id) },
                    ]).map((btn) => (
                      <Pressable key={btn.label} disabled={!canManageWorkspace} onPress={btn.onPress} style={{ borderRadius: 6, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: mode === 'night' ? 'rgba(0,0,0,0.04)' : 'rgba(0,0,0,0.05)', opacity: !canManageWorkspace ? 0.5 : 1 }}>
                        <Text style={{ fontSize: 11, fontWeight: '600', color: mode === 'night' ? 'rgba(241,232,255,0.7)' : 'rgba(0,0,0,0.6)' }}>{btn.label}</Text>
                      </Pressable>
                    ))}
                    {template.source === 'custom' && (
                      <Pressable disabled={!canManageWorkspace} onPress={() => removeCustomTemplate(template.id)} style={{ borderRadius: 6, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: 'rgba(239,68,68,0.1)', opacity: !canManageWorkspace ? 0.5 : 1 }}>
                        <Text style={{ fontSize: 11, fontWeight: '600', color: '#EF4444' }}>Delete</Text>
                      </Pressable>
                    )}
                  </View>
                </View>
              ))}
            </View>

            <View style={styles.inlineRow}>
              <Pressable disabled={!canManageWorkspace} style={[styles.secondaryButton, !canManageWorkspace && styles.buttonDisabled]} onPress={clearPermissions}>
                <Text style={styles.secondaryButtonText}>Clear</Text>
              </Pressable>
              <Pressable disabled={!canManageWorkspace} style={[styles.secondaryButton, !canManageWorkspace && styles.buttonDisabled]} onPress={runSelectedTemplateDiff}>
                <Text style={styles.secondaryButtonText}>Run Diff</Text>
              </Pressable>
            </View>

            {/* ── Lineage Viewer ── */}
            <Text style={{ fontSize: 13, fontWeight: '700', color: mode === 'night' ? '#1A2340' : '#1A2340', marginTop: 14, marginBottom: 8 }}>Template Lineage</Text>
            {templateLineages.map((lineage) => (
              <View key={lineage.lineageId} style={{ borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: mode === 'night' ? 'rgba(0,0,0,0.06)' : 'rgba(0,0,0,0.08)', backgroundColor: mode === 'night' ? 'rgba(0,0,0,0.02)' : 'rgba(0,0,0,0.02)' }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: mode === 'night' ? '#1A2340' : '#1A2340' }}>{lineage.name}</Text>
                <Text style={{ fontSize: 11, color: mode === 'night' ? 'rgba(241,232,255,0.45)' : 'rgba(0,0,0,0.4)', marginBottom: 6 }}>{lineage.totalVersions} version{lineage.totalVersions !== 1 ? 's' : ''} · Latest: v{lineage.latestVersion}</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {lineage.versions.map((versionItem) => {
                    const isLatest = versionItem.version === lineage.latestVersion;
                    return (
                      <Pressable key={versionItem.id} disabled={!canManageWorkspace} onPress={() => applyTemplate(versionItem.id)} style={{ borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: isLatest ? acRgba(0.3) : mode === 'night' ? 'rgba(0,0,0,0.06)' : 'rgba(0,0,0,0.08)', backgroundColor: isLatest ? acRgba(0.08) : 'transparent', opacity: !canManageWorkspace ? 0.5 : 1 }}>
                        <Text style={{ fontSize: 12, fontWeight: isLatest ? '700' : '500', color: isLatest ? ac : mode === 'night' ? 'rgba(241,232,255,0.6)' : 'rgba(0,0,0,0.5)' }}>v{versionItem.version}{isLatest ? ' · latest' : ''}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ))}

            {/* ── Save as Template ── */}
            <View style={{ borderRadius: 12, padding: 14, marginTop: 8, borderWidth: 1, borderColor: mode === 'night' ? 'rgba(0,0,0,0.04)' : 'rgba(0,0,0,0.07)', backgroundColor: mode === 'night' ? 'rgba(0,0,0,0.015)' : 'rgba(0,0,0,0.015)' }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: mode === 'night' ? '#1A2340' : '#1A2340', marginBottom: 8 }}>Save Current as Template</Text>
              <LabeledInput label="Template Name" helperText="Example: Receiving Team Basic Access" value={templateName} onChangeText={setTemplateName} placeholder="Template name" />
              <LabeledInput label="Template Description" helperText="Example: Use for new receiving team members" value={templateDescription} onChangeText={setTemplateDescription} placeholder="Describe usage" multiline />
              <Pressable disabled={!canManageWorkspace} style={[styles.secondaryButton, !canManageWorkspace && styles.buttonDisabled]} onPress={saveAsTemplate}>
                <Text style={styles.secondaryButtonText}>Save Template</Text>
              </Pressable>
            </View>
          </>
        )}

        {selectedRole && rolePane === 'diff' && (
          <>
            <Text style={{ fontSize: 12, color: mode === 'night' ? 'rgba(241,232,255,0.5)' : 'rgba(0,0,0,0.45)', marginBottom: 10 }}>Base: {diffFromTemplateId || 'None'} · Compare: {diffToTemplateId || 'None'}</Text>

            {templateDiff && (
              <View style={{ borderRadius: 12, padding: 16, borderWidth: 1, borderColor: mode === 'night' ? 'rgba(0,0,0,0.06)' : 'rgba(0,0,0,0.08)', backgroundColor: mode === 'night' ? 'rgba(0,0,0,0.02)' : 'rgba(0,0,0,0.02)' }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: mode === 'night' ? '#1A2340' : '#1A2340', marginBottom: 8 }}>Diff: {templateDiff.fromTemplateName} → {templateDiff.toTemplateName}</Text>
                <Text style={{ fontSize: 11, color: mode === 'night' ? 'rgba(241,232,255,0.45)' : 'rgba(0,0,0,0.4)', marginBottom: 12 }}>Lineage: {templateDiff.lineageId} · v{templateDiff.fromVersion} → v{templateDiff.toVersion}</Text>

                <Text style={{ fontSize: 12, fontWeight: '700', color: '#22C55E', marginBottom: 4 }}>+ Added</Text>
                {templateDiff.addedInTarget.length === 0 ? <Text style={{ fontSize: 11, color: mode === 'night' ? 'rgba(241,232,255,0.4)' : 'rgba(0,0,0,0.35)', marginBottom: 8 }}>None</Text> : templateDiff.addedInTarget.map((p) => <Text key={`a-${p}`} style={{ fontSize: 12, color: '#22C55E', marginBottom: 2 }}>+ {p}</Text>)}

                <Text style={{ fontSize: 12, fontWeight: '700', color: '#EF4444', marginTop: 8, marginBottom: 4 }}>- Removed</Text>
                {templateDiff.removedFromTarget.length === 0 ? <Text style={{ fontSize: 11, color: mode === 'night' ? 'rgba(241,232,255,0.4)' : 'rgba(0,0,0,0.35)', marginBottom: 8 }}>None</Text> : templateDiff.removedFromTarget.map((p) => <Text key={`r-${p}`} style={{ fontSize: 12, color: '#EF4444', marginBottom: 2 }}>- {p}</Text>)}

                <LabeledInput label="Promotion Note" helperText="Document why this version is being promoted" value={promotionNote} onChangeText={setPromotionNote} placeholder="Promotion note" multiline />
                <View style={styles.inlineRow}>
                  <Pressable disabled={!canManageWorkspace || !promotionNote.trim()} style={[styles.primaryButton, (!canManageWorkspace || !promotionNote.trim()) && styles.buttonDisabled]} onPress={promoteCompareAsNewVersion}>
                    <Text style={styles.primaryButtonText}>Promote Version</Text>
                  </Pressable>
                  <Pressable disabled={!canManageWorkspace} style={[styles.secondaryButton, !canManageWorkspace && styles.buttonDisabled]} onPress={clearTemplateDiff}>
                    <Text style={styles.secondaryButtonText}>Close Diff</Text>
                  </Pressable>
                </View>
              </View>
            )}
          </>
        )}

        {!selectedRole && rolePane !== 'roles' && (
          <View style={{ padding: 24, alignItems: 'center' }}>
            <Text style={{ fontSize: 32, marginBottom: 8 }}>👤</Text>
            <Text style={{ fontSize: 14, fontWeight: '600', color: mode === 'night' ? 'rgba(241,232,255,0.6)' : 'rgba(0,0,0,0.5)', textAlign: 'center' }}>Select a role from the Roles tab to manage permissions, scope, and templates.</Text>
          </View>
        )}

        {!!roleMessage && <Text style={styles.notice}>{roleMessage}</Text>}
      </Card>}

        </View>
      </View>

    </ScrollView>

      {/* ── Spotlight Walkthrough Overlay (web only) ── */}
      {guidedMode && walkthroughOpen && Platform.OS === 'web' && (() => {
        const step = adminWalkthroughSteps[walkthroughIndex];
        const isFirst = walkthroughIndex === 0;
        const isLast = walkthroughIndex === adminWalkthroughSteps.length - 1;
        const pad = 8;
        const hasRect = spotlightRect && spotlightRect.width > 0;

        // Tooltip positioning — prefer right side of target, fall back to below
        const tooltipStyle: React.CSSProperties = hasRect
          ? {
              position: 'fixed',
              top: spotlightRect.top,
              left: spotlightRect.left + spotlightRect.width + 16,
              maxWidth: 370,
              zIndex: 10002,
            }
          : {
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              maxWidth: 370,
              zIndex: 10002,
            };

        // If tooltip would overflow the right edge, place it below
        if (hasRect && spotlightRect.left + spotlightRect.width + 16 + 370 > window.innerWidth) {
          tooltipStyle.left = Math.max(16, spotlightRect.left);
          tooltipStyle.top = spotlightRect.top + spotlightRect.height + 12;
        }

        return (
          <>
            {/* Semi-transparent backdrop with cutout */}
            {hasRect ? (
              <div
                style={{
                  position: 'fixed', inset: 0, zIndex: 10000,
                  background: 'rgba(12, 8, 24, 0.6)',
                  // CSS clip-path creates a rectangular hole around the target
                  clipPath: `polygon(
                    0% 0%, 0% 100%, ${spotlightRect.left - pad}px 100%, ${spotlightRect.left - pad}px ${spotlightRect.top - pad}px,
                    ${spotlightRect.left + spotlightRect.width + pad}px ${spotlightRect.top - pad}px,
                    ${spotlightRect.left + spotlightRect.width + pad}px ${spotlightRect.top + spotlightRect.height + pad}px,
                    ${spotlightRect.left - pad}px ${spotlightRect.top + spotlightRect.height + pad}px,
                    ${spotlightRect.left - pad}px 100%, 100% 100%, 100% 0%
                  )`,
                  pointerEvents: 'auto',
                }}
                onClick={() => setWalkthroughOpen(false)}
              />
            ) : (
              <div
                style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(12, 8, 24, 0.6)', pointerEvents: 'auto' }}
                onClick={() => setWalkthroughOpen(false)}
              />
            )}

            {/* Glowing highlight ring around target */}
            {hasRect && (
              <div style={{
                position: 'fixed',
                top: spotlightRect.top - pad,
                left: spotlightRect.left - pad,
                width: spotlightRect.width + pad * 2,
                height: spotlightRect.height + pad * 2,
                border: '2px solid rgba(140, 91, 245, 0.7)',
                borderRadius: 10,
                boxShadow: '0 0 0 4px rgba(140, 91, 245, 0.15), 0 0 20px rgba(140, 91, 245, 0.25)',
                zIndex: 10001,
                pointerEvents: 'none',
              }} />
            )}

            {/* Tooltip card */}
            <div style={{
              ...tooltipStyle,
              background: 'linear-gradient(168deg, #1A2340 0%, #131D35 100%)',
              border: '1px solid rgba(140, 91, 245, 0.35)',
              borderRadius: 14,
              boxShadow: '0 8px 40px rgba(140, 91, 245, 0.18), 0 2px 12px rgba(0,0,0,0.4)',
              padding: '22px 24px 18px',
              color: '#1A2340',
              fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
            }}>
              {/* Step badge */}
              <span style={{
                display: 'inline-block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const,
                letterSpacing: 1.2, color: '#111111',
                background: 'rgba(232, 120, 246, 0.12)', border: '1px solid rgba(232, 120, 246, 0.25)',
                borderRadius: 6, padding: '3px 10px', marginBottom: 8,
              }}>
                Guided Setup
              </span>

              <span style={{ display: 'block', fontSize: 12, color: 'rgba(241, 232, 255, 0.5)', marginBottom: 4 }}>
                Step {walkthroughIndex + 1} of {adminWalkthroughSteps.length}
              </span>

              <h3 style={{ margin: '0 0 6px', fontSize: 17, fontWeight: 700, color: '#fff', lineHeight: 1.3 }}>
                {step.title}
              </h3>
              <p style={{ margin: '0 0 10px', fontSize: 13, lineHeight: 1.55, color: 'rgba(241, 232, 255, 0.82)' }}>
                {step.goal}
              </p>
              <p style={{ margin: '0 0 12px', fontSize: 12, lineHeight: 1.5, color: '#111111' }}>
                {step.pointer}
              </p>

              {/* Checklist */}
              <div style={{ marginBottom: 14 }}>
                {step.checklist.map((item, i) => (
                  <div key={i} style={{ fontSize: 12, lineHeight: 1.5, color: 'rgba(241, 232, 255, 0.65)', paddingLeft: 8 }}>
                    {'• '}{item}
                  </div>
                ))}
              </div>

              {/* Progress dots */}
              <div style={{ display: 'flex', gap: 5, marginBottom: 14 }}>
                {adminWalkthroughSteps.map((_, i) => (
                  <div
                    key={i}
                    style={{
                      width: 8, height: 8, borderRadius: 4,
                      background: i === walkthroughIndex
                        ? `linear-gradient(135deg, ${ac}, ${accentPalette?.secondary ?? '#111111'})`
                        : completedWalkthroughStepIds.includes(adminWalkthroughSteps[i].id)
                          ? acRgba(0.5)
                          : 'rgba(255, 255, 255, 0.12)',
                      cursor: 'pointer',
                    }}
                    onClick={() => goToWalkthroughStep(i)}
                  />
                ))}
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button
                  disabled={isFirst}
                  onClick={() => goToWalkthroughStep(walkthroughIndex - 1)}
                  style={{
                    border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 12, fontWeight: 600,
                    cursor: isFirst ? 'default' : 'pointer',
                    background: 'rgba(0,0,0,0.06)', color: '#1A2340',
                    opacity: isFirst ? 0.35 : 1,
                  }}
                >
                  Back
                </button>
                {isLast ? (
                  <button
                    onClick={() => { toggleCurrentWalkthroughStep(); setWalkthroughOpen(false); }}
                    style={{
                      border: 'none', borderRadius: 8, padding: '8px 20px', fontSize: 12, fontWeight: 600,
                      cursor: 'pointer', background: `linear-gradient(135deg, ${ac}, ${accentPalette?.secondary ?? '#111111'})`, color: acText,
                    }}
                  >
                    Finish
                  </button>
                ) : (
                  <button
                    onClick={() => goToWalkthroughStep(walkthroughIndex + 1)}
                    style={{
                      border: 'none', borderRadius: 8, padding: '8px 20px', fontSize: 12, fontWeight: 600,
                      cursor: 'pointer', background: `linear-gradient(135deg, ${ac}, ${accentPalette?.secondary ?? '#111111'})`, color: acText,
                    }}
                  >
                    Next ({walkthroughIndex + 1}/{adminWalkthroughSteps.length})
                  </button>
                )}
                <button
                  onClick={() => setWalkthroughOpen(false)}
                  style={{
                    border: 'none', background: 'transparent', color: 'rgba(241,232,255,0.45)',
                    padding: '8px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer', marginLeft: 'auto',
                  }}
                >
                  Skip
                </button>
              </div>
            </div>
          </>
        );
      })()}

      {/* Collapsed walkthrough re-open button */}
      {guidedMode && !walkthroughOpen && Platform.OS === 'web' && (
        <div
          onClick={() => setWalkthroughOpen(true)}
          style={{
            position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
            background: `linear-gradient(135deg, ${ac}, ${accentPalette?.secondary ?? '#111111'})`, color: acText,
            borderRadius: 28, padding: '10px 20px', fontSize: 13, fontWeight: 600,
            cursor: 'pointer', boxShadow: `0 4px 20px ${acRgba(0.35)}`,
          }}
        >
          Resume Walkthrough ({walkthroughIndex + 1}/{adminWalkthroughSteps.length})
        </div>
      )}

      {/* ── Floating Bebo FAB ── */}
      {!aiPanelOpen && Platform.OS === 'web' && (
        <Pressable
          onPress={() => { setAiPanelOpen(true); setBeboFabOpen(true); if (!aiWs.session) aiWs.startSession('workspace_builder'); }}
          style={{
            position: 'absolute' as any,
            bottom: guidedMode && !walkthroughOpen ? 80 : 24,
            right: 24,
            zIndex: 9998,
            width: 56,
            height: 56,
            borderRadius: 28,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: ac,
            shadowColor: ac,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.4,
            shadowRadius: 12,
            elevation: 8,
          }}
        >
          <Text style={{ fontSize: 26 }}>🤖</Text>
        </Pressable>
      )}

      {aiPanelOpen && (
        <AiChatPanel
          session={aiWs.session}
          isThinking={aiWs.isThinking}
          onSend={aiWs.sendMessage}
          onApply={aiWs.proposal ? aiWs.applyProposal : undefined}
          onDiscard={aiWs.proposal ? aiWs.discardProposal : undefined}
          onClose={() => { setAiPanelOpen(false); setBeboFabOpen(false); }}
          hasProposal={!!aiWs.proposal}
          applyLabel="Apply Workspace"
          discardLabel="Discard"
          title={`Bebo · ${adminContentHeaders[adminTab]?.title ?? 'Workspace Builder'}`}
        />
      )}
    </>
  );
}
