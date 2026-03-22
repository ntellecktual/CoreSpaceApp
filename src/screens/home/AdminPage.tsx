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

export function AdminPage({ guidedMode, registerActions, auditLog, addNotification }: GuidedPageProps) {
  const { styles, mode } = useUiTheme();
  const { width: windowWidth } = useWindowDimensions();
  const [adminTab, setAdminTab] = useState<'workspace' | 'shell' | 'role' | 'governance' | 'forms' | 'architecture'>('workspace');
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
    architecture: false,
    workspace: true,
    shell: false,
    forms: false,
    role: false,
    governance: false,
    ai: false,
  });
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
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [editingFieldLabel, setEditingFieldLabel] = useState('');
  const [editingFunctionId, setEditingFunctionId] = useState<string | null>(null);
  const [editingObjectKey, setEditingObjectKey] = useState<string | null>(null);
  const [newFnName, setNewFnName] = useState('');
  const [newFnIcon, setNewFnIcon] = useState('');
  const [newFnColor, setNewFnColor] = useState('#8C5BF5');
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
    text: 'Aa', longText: '¶', number: '#', date: '📅', datetime: '🕐',
    select: '▾', checkbox: '☑', email: '@', phone: '☎', attachment: '📎',
  };

  const buildSignalSuggestion = (fieldLabel: string, fieldType: SubSpaceBuilderFieldType): string => {
    const label = fieldLabel.trim() || 'this field';
    const suggestions: Partial<Record<SubSpaceBuilderFieldType, string>> = {
      date: `When "${label}" passes its due date, move record to "Overdue" stage and notify the assigned owner.`,
      datetime: `When "${label}" is within 24 hours, send a reminder notification to the team channel.`,
      number: `When "${label}" drops below threshold (e.g. < 10), trigger a reorder or escalation flow.`,
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
      key: 'architecture',
      label: 'Business Architecture',
      description: 'Define departments and objects — the layer above workspaces that organises your whole operation.',
      items: [
        { label: 'Departments & Objects', detail: 'Build and manage your business hierarchy', onPress: () => setAdminTab('architecture') },
        { label: 'Architecture Terminology', detail: 'Rename departments, objects, and collections', onPress: () => { setAdminTab('shell'); setShellPane('labels'); } },
      ],
    },
    {
      key: 'workspace',
      label: 'Workspace Design',
      description: 'Build your operational core, SubSpaces, and data fields.',
      items: [
        { label: 'Configure Workspace', detail: 'Name, entity, and route', onPress: () => { setAdminTab('workspace'); setWorkspacePane('workspace'); } },
        { label: 'SubSpace Lanes & Fields', detail: 'Create lanes and assign tracked fields', onPress: () => { setAdminTab('workspace'); setWorkspacePane('subspaces'); } },
      ],
    },
    {
      key: 'shell',
      label: 'Language & Intake',
      description: 'Set terminology, intake forms, personas, and lifecycle stages.',
      items: [
        { label: 'App Terminology', detail: 'Rename records, workspaces, and SubSpaces', onPress: () => { setAdminTab('shell'); setShellPane('labels'); } },
        { label: 'Intake Form Builder', detail: 'Define the fields new records start with', onPress: () => { setAdminTab('shell'); setShellPane('intake'); } },
        { label: 'User Personas', detail: 'Create workflow personas and scope them', onPress: () => { setAdminTab('shell'); setShellPane('personas'); } },
        { label: 'Lifecycle Stages', detail: 'Define stages and stage-to-stage transitions', onPress: () => { setAdminTab('shell'); setShellPane('lifecycle'); } },
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
      key: 'ai',
      label: 'Bebo',
      description: 'Tell Bebo what you need and it builds workspaces, SubSpaces, and fields for you automatically.',
      items: [
        { label: 'Bebo Workspace Builder', detail: 'Describe your workspace and let Bebo build it', onPress: () => { setAiPanelOpen(true); if (!aiWs.session) aiWs.startSession('workspace_builder'); } },
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
    if (fieldType === 'date') {
      return 'Select a date';
    }
    if (fieldType === 'datetime') {
      return 'Select date and time';
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

  useEffect(() => {
    if (hasWorkspace && wizardStep === 1) {
      setWizardStep(2);
      setWorkspacePane('subspaces');
    }
  }, [hasWorkspace, wizardStep]);

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
                  style={[styles.adminNavSectionHeader, isSectionActive && styles.adminNavSectionHeaderActive]}
                  onPress={() => {
                    if (section.key === 'role' && !canManageWorkspace) return;
                    toggleAdminSection(section.key);
                    if (!isSectionActive) {
                      section.items[0]?.onPress();
                    }
                  }}
                >
                  <Text style={[styles.adminNavSectionHeaderLabel, section.key === 'role' && !canManageWorkspace && { opacity: 0.55 }]}>
                    {section.key === 'role' && !canManageWorkspace ? '🔒 ' : ''}{section.label}
                  </Text>
                  <Text style={styles.adminNavSectionChevron}>{isExpanded ? '▾' : '▸'}</Text>
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
                          style={[styles.adminNavItem, isActive && styles.adminNavItemActive, isLocked && styles.buttonDisabled]}
                          onPress={isLocked ? undefined : item.onPress}
                        >
                          <Text style={[styles.adminNavItemLabel, isActive && styles.adminNavItemLabelActive, isLocked && { opacity: 0.4 }]}>
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
          borderColor: mode === 'night' ? 'rgba(255,255,255,0.07)' : 'rgba(102,74,154,0.12)',
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
                    ? 'rgba(140,91,245,0.20)'
                    : isDone
                      ? mode === 'night' ? 'rgba(34,197,94,0.08)' : 'rgba(34,197,94,0.06)'
                      : mode === 'night' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
                  borderRightWidth: idx < 3 ? 1 : 0,
                  borderRightColor: mode === 'night' ? 'rgba(255,255,255,0.07)' : 'rgba(102,74,154,0.10)',
                }}
              >
                <Text style={{ fontSize: 13 }}>{isDone && !isActive ? '✅' : icon}</Text>
                <Text style={{
                  fontSize: 12, fontWeight: isActive ? '800' : '600',
                  color: isActive ? '#A78BFA' : isDone ? '#22C55E' : mode === 'night' ? 'rgba(255,255,255,0.40)' : 'rgba(0,0,0,0.40)',
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
                      backgroundColor: mode === 'night' ? 'rgba(140,91,245,0.09)' : 'rgba(140,91,245,0.05)',
                      borderRadius: 16, padding: 24, borderWidth: 1,
                      borderColor: mode === 'night' ? 'rgba(140,91,245,0.22)' : 'rgba(140,91,245,0.16)',
                      alignItems: 'center' as any, gap: 10,
                    }}>
                      <Text style={{ fontSize: 44 }}>🏗️</Text>
                      <Text style={{ color: mode === 'night' ? '#E8E4FF' : '#1a1030', fontSize: 20, fontWeight: '800', textAlign: 'center' }}>Build your first workspace</Text>
                      <Text style={{ color: mode === 'night' ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.50)', fontSize: 13, textAlign: 'center', lineHeight: 20 }}>
                        A workspace is like a dashboard for one job — it holds your data, sections, and fields.{'\n'}Start with a ready-made template or create your own from scratch.
                      </Text>
                    </View>

                    <Text style={{ color: mode === 'night' ? 'rgba(255,255,255,0.42)' : 'rgba(0,0,0,0.42)', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 }}>Ready-made templates</Text>
                    <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' as any }}>
                      <Pressable
                        nativeID="wt-load-template"
                        style={{ flex: 1, minWidth: 200, backgroundColor: mode === 'night' ? 'rgba(140,91,245,0.12)' : 'rgba(140,91,245,0.06)', borderRadius: 14, padding: 18, gap: 10, borderWidth: 1, borderColor: 'rgba(140,91,245,0.28)' }}
                        onPress={() => {
                          applyDscsaSerializationTemplate();
                          setWizardStep(4);
                          auditLog?.logEntry({ action: 'import', entityType: 'workspace', entityId: 'template', entityName: 'DSCSA Serialization Template', after: { template: 'DSCSA', subSpaces: 8, records: 17, flows: 5 } });
                          addNotification?.({ type: 'system', title: 'Template Loaded!', body: 'DSCSA workspace ready — 8 sections, 17 sample records.', severity: 'success' });
                        }}
                      >
                        <Text style={{ fontSize: 32 }}>💊</Text>
                        <Text style={{ color: mode === 'night' ? '#E8E4FF' : '#1a1030', fontWeight: '700', fontSize: 14 }}>DSCSA Pharma Serialization</Text>
                        <Text style={{ color: mode === 'night' ? 'rgba(255,255,255,0.48)' : 'rgba(0,0,0,0.48)', fontSize: 11, lineHeight: 17 }}>8 sections · 17 sample records · 5 automation flows · Full pharma supply chain</Text>
                        <View style={{ backgroundColor: '#8C5BF5', borderRadius: 10, paddingVertical: 10, alignItems: 'center' as any }}>
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
                        <Text style={{ color: mode === 'night' ? '#E8E4FF' : '#1a1030', fontWeight: '700', fontSize: 14 }}>WRVAS Service Operations</Text>
                        <Text style={{ color: mode === 'night' ? 'rgba(255,255,255,0.48)' : 'rgba(0,0,0,0.48)', fontSize: 11, lineHeight: 17 }}>12 sections · 22 sample records · 5 automation flows · IT device service</Text>
                        <View style={{ backgroundColor: '#3B82F6', borderRadius: 10, paddingVertical: 10, alignItems: 'center' as any }}>
                          <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 13 }}>Use This Template →</Text>
                        </View>
                      </Pressable>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <View style={{ flex: 1, height: 1, backgroundColor: mode === 'night' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }} />
                      <Text style={{ color: mode === 'night' ? 'rgba(255,255,255,0.32)' : 'rgba(0,0,0,0.32)', fontSize: 12 }}>or build from scratch</Text>
                      <View style={{ flex: 1, height: 1, backgroundColor: mode === 'night' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }} />
                    </View>
                    <Pressable style={[styles.primaryButton, { paddingVertical: 14 }]} onPress={beginCreateWorkspace}>
                      <Text style={[styles.primaryButtonText, { fontSize: 15, fontWeight: '700' }]}>+ Create My Own Workspace</Text>
                    </Pressable>
                  </View>
                )}

                {/* Creating from scratch — name form */}
                {isCreatingWorkspace && canManageWorkspace && (
                  <View style={{ gap: 14 }}>
                    <View style={{ backgroundColor: mode === 'night' ? 'rgba(140,91,245,0.10)' : 'rgba(140,91,245,0.06)', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: mode === 'night' ? 'rgba(140,91,245,0.22)' : 'rgba(140,91,245,0.18)' }}>
                      <Text style={{ color: mode === 'night' ? '#A78BFA' : '#6F4BCF', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Creating a new workspace</Text>
                      <Text style={{ color: mode === 'night' ? 'rgba(255,255,255,0.58)' : 'rgba(0,0,0,0.50)', fontSize: 12, lineHeight: 18 }}>
                        Think of a workspace like one team's dashboard — "Customer Requests", "Inventory Tracker", "Employee Onboarding". Keep the name short and clear.
                      </Text>
                    </View>

                    <View style={{ gap: 6 }}>
                      <Text style={{ color: mode === 'night' ? 'rgba(255,255,255,0.75)' : 'rgba(0,0,0,0.70)', fontSize: 14, fontWeight: '700' }}>What's this workspace called? <Text style={{ color: '#EF4444' }}>*</Text></Text>
                      <Text style={{ color: mode === 'night' ? 'rgba(255,255,255,0.40)' : 'rgba(0,0,0,0.40)', fontSize: 12 }}>e.g. "Order Tracker", "Patient Records", "Inventory Management"</Text>
                      <LabeledInput label="" value={workspaceName} onChangeText={(v) => { setWorkspaceName(v); setRoute(v.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')); }} placeholder="My Workspace Name" />
                    </View>

                    <View style={{ gap: 6 }}>
                      <Text style={{ color: mode === 'night' ? 'rgba(255,255,255,0.75)' : 'rgba(0,0,0,0.70)', fontSize: 14, fontWeight: '700' }}>Each row in this workspace is a... <Text style={{ color: '#EF4444' }}>*</Text></Text>
                      <Text style={{ color: mode === 'night' ? 'rgba(255,255,255,0.40)' : 'rgba(0,0,0,0.40)', fontSize: 12 }}>One word for what you're tracking — e.g. "Order", "Patient", "Item", "Employee", "Case"</Text>
                      <LabeledInput label="" value={rootEntity} onChangeText={setRootEntity} placeholder="e.g. Order" />
                    </View>

                    <View style={{ gap: 6 }}>
                      <Text style={{ color: mode === 'night' ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.32)', fontSize: 11, fontWeight: '600' }}>Quick fill examples:</Text>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap' as any, gap: 6 }}>
                        {[
                          { name: 'Order Tracker', entity: 'Order' },
                          { name: 'Customer Requests', entity: 'Request' },
                          { name: 'Employee Onboarding', entity: 'Employee' },
                          { name: 'Inventory Management', entity: 'Item' },
                          { name: 'Project Tracker', entity: 'Project' },
                          { name: 'Support Tickets', entity: 'Ticket' },
                          { name: 'Client Cases', entity: 'Case' },
                          { name: 'Maintenance Logs', entity: 'Log' },
                        ].map((ex) => (
                          <Pressable
                            key={ex.name}
                            style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: mode === 'night' ? 'rgba(140,91,245,0.10)' : 'rgba(140,91,245,0.07)', borderWidth: 1, borderColor: mode === 'night' ? 'rgba(140,91,245,0.25)' : 'rgba(140,91,245,0.20)' }}
                            onPress={() => { setWorkspaceName(ex.name); setRootEntity(ex.entity); setRoute(ex.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')); }}
                          >
                            <Text style={{ fontSize: 11, color: mode === 'night' ? '#A78BFA' : '#6F4BCF', fontWeight: '600' }}>{ex.name}</Text>
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
                      <Text style={{ color: mode === 'night' ? 'rgba(255,255,255,0.70)' : 'rgba(0,0,0,0.65)', fontSize: 13, fontWeight: '700' }}>Choose a workspace to edit</Text>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap' as any, gap: 8 }}>
                        {workspaces.map((ws) => (
                          <Pressable
                            key={ws.id}
                            style={{ paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, backgroundColor: selectedWorkspaceId === ws.id ? 'rgba(140,91,245,0.18)' : mode === 'night' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)', borderColor: selectedWorkspaceId === ws.id ? '#8C5BF5' : mode === 'night' ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.10)' }}
                            onPress={() => { setSelectedWorkspaceId(ws.id); setWizardStep(2); setWorkspacePane('subspaces'); }}
                          >
                            <Text style={{ fontSize: 13, fontWeight: '700', color: selectedWorkspaceId === ws.id ? '#A78BFA' : mode === 'night' ? 'rgba(255,255,255,0.75)' : 'rgba(0,0,0,0.68)' }}>{ws.name}</Text>
                            <Text style={{ fontSize: 11, color: mode === 'night' ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)', marginTop: 2 }}>{ws.subSpaces.length} section{ws.subSpaces.length !== 1 ? 's' : ''}</Text>
                          </Pressable>
                        ))}
                      </View>
                    </View>

                    {hasWorkspace && (
                      <View style={{ gap: 10, borderTopWidth: 1, borderTopColor: mode === 'night' ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)', paddingTop: 14 }}>
                        <Text style={{ color: mode === 'night' ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.60)', fontSize: 13, fontWeight: '700' }}>Edit "{workspace?.name}"</Text>
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
                      <View style={{ flex: 1, height: 1, backgroundColor: mode === 'night' ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)' }} />
                      <Text style={{ color: mode === 'night' ? 'rgba(255,255,255,0.28)' : 'rgba(0,0,0,0.28)', fontSize: 11 }}>or</Text>
                      <View style={{ flex: 1, height: 1, backgroundColor: mode === 'night' ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)' }} />
                    </View>
                    <Pressable style={[styles.secondaryButton, { paddingVertical: 12 }]} onPress={beginCreateWorkspace}>
                      <Text style={[styles.secondaryButtonText, { textAlign: 'center' }]}>+ Create Another Workspace</Text>
                    </Pressable>

                    {/* Templates when workspace exists */}
                    <View style={{ gap: 6, borderTopWidth: 1, borderTopColor: mode === 'night' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)', paddingTop: 12 }}>
                      <Text style={{ color: mode === 'night' ? 'rgba(255,255,255,0.33)' : 'rgba(0,0,0,0.33)', fontSize: 11, fontWeight: '600' }}>Load a template instead</Text>
                      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' as any }}>
                        <Pressable nativeID="wt-load-template" style={[styles.secondaryButton, { flex: 1 }]} onPress={() => { applyDscsaSerializationTemplate(); setWizardStep(4); addNotification?.({ type: 'system', title: 'Template Loaded!', body: 'DSCSA workspace loaded.', severity: 'success' }); }}>
                          <Text style={styles.secondaryButtonText}>💊 DSCSA Template</Text>
                        </Pressable>
                        <Pressable nativeID="wt-load-wrvas-template" style={[styles.secondaryButton, { flex: 1 }]} onPress={() => { applyWrvasTemplate(); setWizardStep(4); addNotification?.({ type: 'system', title: 'Template Loaded!', body: 'WRVAS workspace loaded.', severity: 'success' }); }}>
                          <Text style={styles.secondaryButtonText}>🖥️ WRVAS Template</Text>
                        </Pressable>
                      </View>
                      {isSuperAdmin && tenants.length > 1 && (
                        <Pressable nativeID="wt-seed-all-tenants" style={[styles.secondaryButton, { borderColor: '#8C5BF5' }]} onPress={() => { const r = copyActiveDataToAllTenants(); if (r.ok) addNotification?.({ type: 'system', title: 'All Tenants Seeded', body: `Data copied to ${r.count} tenant${r.count === 1 ? '' : 's'}.`, severity: 'success' }); else addNotification?.({ type: 'system', title: 'Seed Failed', body: r.reason ?? 'Unable to seed.', severity: 'warning' }); }}>
                          <Text style={[styles.secondaryButtonText, { color: '#8C5BF5' }]}>⬆ Seed Data → All Tenants</Text>
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
                    <Text style={{ color: mode === 'night' ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.50)', fontSize: 12 }}>Go to Step 1 to name your workspace before adding sections.</Text>
                    <Pressable style={[styles.secondaryButton, { alignSelf: 'flex-start' as any }]} onPress={() => { setWizardStep(1); setWorkspacePane('workspace'); }}>
                      <Text style={styles.secondaryButtonText}>← Go to Step 1</Text>
                    </Pressable>
                  </View>
                ) : (
                  <>
                    <View style={{ backgroundColor: mode === 'night' ? 'rgba(140,91,245,0.08)' : 'rgba(140,91,245,0.05)', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: mode === 'night' ? 'rgba(140,91,245,0.18)' : 'rgba(140,91,245,0.13)' }}>
                      <Text style={{ color: mode === 'night' ? '#A78BFA' : '#6F4BCF', fontSize: 12, fontWeight: '700', marginBottom: 4 }}>📂 SECTIONS in "{workspace?.name}"</Text>
                      <Text style={{ color: mode === 'night' ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.48)', fontSize: 12, lineHeight: 18 }}>
                        Sections are like tabs — each holds a different category of data. Example: "Details", "Documents", "Tasks", "Contacts".
                      </Text>
                    </View>

                    {/* Existing sections list */}
                    {workspaceSubSpaces.length > 0 && (
                      <View style={{ gap: 6 }}>
                        <Text style={{ color: mode === 'night' ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.42)', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 }}>Your sections ({workspaceSubSpaces.length})</Text>
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
                                backgroundColor: mode === 'night' ? 'rgba(140,91,245,0.10)' : 'rgba(140,91,245,0.06)',
                                borderRadius: 10, paddingLeft: 12, paddingRight: 12, paddingTop: 10, paddingBottom: 10,
                                borderWidth: 1, borderStyle: 'solid',
                                borderColor: selectedSubSpaceId === ss.id ? '#8C5BF5' : mode === 'night' ? 'rgba(140,91,245,0.20)' : 'rgba(140,91,245,0.14)',
                                cursor: canManageSubSpace ? 'grab' : 'default',
                                userSelect: 'none',
                                position: 'relative',
                              }}
                              whileDrag={{ scale: 1.02, boxShadow: '0 8px 32px rgba(140,91,245,0.30)', zIndex: 50, borderColor: '#8C5BF5' }}
                              dragListener={canManageSubSpace}
                            >
                              {/* ⠿ drag handle */}
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: 18, opacity: canManageSubSpace ? 0.45 : 0.15, cursor: canManageSubSpace ? 'grab' : 'default', flexShrink: 0 }}>
                                <span style={{ fontSize: 16, color: '#A78BFA', lineHeight: 1 }}>⠿</span>
                              </div>
                              <View style={{ width: 28, height: 28, borderRadius: 7, backgroundColor: 'rgba(140,91,245,0.20)', alignItems: 'center' as any, justifyContent: 'center' as any }}>
                                <Text style={{ fontSize: 12, color: '#A78BFA', fontWeight: '800' }}>{ssIdx + 1}</Text>
                              </View>
                              <View style={{ flex: 1 }}>
                                <Text style={{ color: mode === 'night' ? '#E8E4FF' : '#1a1030', fontWeight: '700', fontSize: 13 }}>{ss.name}</Text>
                                <Text style={{ color: mode === 'night' ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)', fontSize: 11, marginTop: 1 }}>{(ss.builderFields ?? []).length} field{(ss.builderFields ?? []).length !== 1 ? 's' : ''}</Text>
                              </View>
                              <Pressable
                                style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: selectedSubSpaceId === ss.id ? 'rgba(140,91,245,0.28)' : 'transparent', borderWidth: 1, borderColor: selectedSubSpaceId === ss.id ? '#8C5BF5' : 'rgba(140,91,245,0.25)' }}
                                onPress={() => { setSelectedSubSpaceId(ss.id); setWizardStep(3); setWorkspacePane('subspaces'); }}
                              >
                                <Text style={{ fontSize: 11, fontWeight: '700', color: '#A78BFA' }}>Add Fields →</Text>
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
                      <Text style={{ color: mode === 'night' ? 'rgba(255,255,255,0.68)' : 'rgba(0,0,0,0.62)', fontSize: 13, fontWeight: '700' }}>+ Add a section</Text>
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <View style={{ flex: 1 }}>
                          <LabeledInput label="" value={newSubSpaceName} onChangeText={(v) => { setNewSubSpaceName(v); setNewSubSpaceEntity(v); }} placeholder="Section name (e.g. Details, Tasks, Documents)" />
                        </View>
                        <Pressable
                          nativeID="wt-add-subspace"
                          disabled={!canManageSubSpace || !hasWorkspace || !newSubSpaceName.trim()}
                          style={{ paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10, backgroundColor: newSubSpaceName.trim() ? '#8C5BF5' : 'rgba(140,91,245,0.20)', justifyContent: 'center' as any, alignItems: 'center' as any, opacity: !canManageSubSpace || !hasWorkspace ? 0.4 : 1 }}
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
                      <Text style={{ color: mode === 'night' ? 'rgba(255,255,255,0.33)' : 'rgba(0,0,0,0.32)', fontSize: 11, fontWeight: '600' }}>Quick add:</Text>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap' as any, gap: 6 }}>
                        {['Details', 'Documents', 'Tasks', 'Notes', 'Contacts', 'Timeline', 'Approvals', 'Status Updates', 'Inventory', 'History', 'Issues', 'Checklist']
                          .filter((s) => !workspaceSubSpaces.some((ss) => ss.name.toLowerCase() === s.toLowerCase()))
                          .map((suggestion) => (
                            <Pressable
                              key={suggestion}
                              disabled={!canManageSubSpace || !hasWorkspace}
                              style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: mode === 'night' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', borderWidth: 1, borderColor: mode === 'night' ? 'rgba(255,255,255,0.11)' : 'rgba(0,0,0,0.09)' }}
                              onPress={() => { setNewSubSpaceName(suggestion); setNewSubSpaceEntity(suggestion); }}
                            >
                              <Text style={{ fontSize: 12, color: mode === 'night' ? 'rgba(255,255,255,0.62)' : 'rgba(0,0,0,0.56)', fontWeight: '600' }}>+ {suggestion}</Text>
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
                                {idx > 0 && <Text style={{ fontSize: 12, color: '#8C5BF5', fontWeight: '800' }}>→</Text>}
                                <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: selectedSubSpaceId === ss.id ? 'rgba(140,91,245,0.36)' : 'rgba(140,91,245,0.12)', borderWidth: 1, borderColor: selectedSubSpaceId === ss.id ? '#8C5BF5' : 'rgba(140,91,245,0.22)' }}>
                                  <Text style={{ fontSize: 10, fontWeight: '700', color: selectedSubSpaceId === ss.id ? '#FFFFFF' : '#C4B5FD' }}>{idx + 1}. {ss.name}</Text>
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
                    {!isSubSpacesStepComplete && <Text style={{ color: mode === 'night' ? 'rgba(255,255,255,0.32)' : 'rgba(0,0,0,0.32)', fontSize: 11, textAlign: 'center' }}>Add at least one section to continue</Text>}
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
                      <Text style={{ color: mode === 'night' ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.48)', fontSize: 12, lineHeight: 18 }}>
                        Fields are the form questions on each record. Pick a section, type the field name, choose a type, and tap Add.
                      </Text>
                    </View>

                    {/* Section picker tabs */}
                    <View style={{ gap: 6 }}>
                      <Text style={{ color: mode === 'night' ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.42)', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 }}>Select section to add fields to:</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexDirection: 'row', gap: 6 }}>
                        {workspaceSubSpaces.map((ss) => (
                          <Pressable
                            key={ss.id}
                            style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: selectedSubSpaceId === ss.id ? '#8C5BF5' : mode === 'night' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', borderWidth: 1, borderColor: selectedSubSpaceId === ss.id ? '#8C5BF5' : mode === 'night' ? 'rgba(255,255,255,0.11)' : 'rgba(0,0,0,0.09)' }}
                            onPress={() => setSelectedSubSpaceId(ss.id)}
                          >
                            <Text style={{ fontSize: 12, fontWeight: '700', color: selectedSubSpaceId === ss.id ? '#FFFFFF' : mode === 'night' ? 'rgba(255,255,255,0.62)' : 'rgba(0,0,0,0.56)' }}>
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
                          <Text style={{ color: mode === 'night' ? 'rgba(255,255,255,0.68)' : 'rgba(0,0,0,0.62)', fontSize: 13, fontWeight: '700' }}>Add a field to "{selectedSubSpace.name}"</Text>
                          <View nativeID="wt-field-palette"><LabeledInput label="" value={newBuilderFieldLabel} onChangeText={setNewBuilderFieldLabel} placeholder='Field name (e.g. "Customer Name", "Due Date", "Status")' /></View>
                        </View>

                        {/* Field type grid */}
                        <View style={{ gap: 6 }}>
                          <Text style={{ color: mode === 'night' ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.42)', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 }}>Field type:</Text>
                          <View style={{ flexDirection: 'row', flexWrap: 'wrap' as any, gap: 6 }}>
                            {([
                              { type: 'text' as const, icon: 'Aa', label: 'Short Text', desc: 'Names, IDs' },
                              { type: 'number' as const, icon: '#', label: 'Number', desc: 'Quantities' },
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
                                style={{ width: 86, paddingHorizontal: 6, paddingVertical: 9, borderRadius: 10, gap: 3, alignItems: 'center' as any, borderWidth: 1.5, backgroundColor: wizardActiveFieldType === type ? 'rgba(140,91,245,0.22)' : mode === 'night' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', borderColor: wizardActiveFieldType === type ? '#8C5BF5' : mode === 'night' ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.09)' }}
                                onPress={() => setWizardActiveFieldType(type)}
                              >
                                <Text style={{ fontSize: 17, lineHeight: 21 }}>{icon}</Text>
                                <Text style={{ fontSize: 10, fontWeight: '700', textAlign: 'center' as any, color: wizardActiveFieldType === type ? '#A78BFA' : mode === 'night' ? 'rgba(255,255,255,0.68)' : 'rgba(0,0,0,0.62)' }}>{label}</Text>
                                <Text style={{ fontSize: 9, textAlign: 'center' as any, color: mode === 'night' ? 'rgba(255,255,255,0.28)' : 'rgba(0,0,0,0.28)' }}>{desc}</Text>
                              </Pressable>
                            ))}
                          </View>
                        </View>

                        {/* Add field button */}
                        <Pressable
                          disabled={!canManageSubSpace || !newBuilderFieldLabel.trim()}
                          style={{ backgroundColor: newBuilderFieldLabel.trim() ? '#8C5BF5' : 'rgba(140,91,245,0.18)', borderRadius: 10, paddingVertical: 12, alignItems: 'center' as any, opacity: !canManageSubSpace ? 0.4 : 1 }}
                          onPress={() => {
                            if (!newBuilderFieldLabel.trim()) return;
                            addBuilderFieldToSubSpace(wizardActiveFieldType);
                          }}
                        >
                          <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 14 }}>
                            + Add "{newBuilderFieldLabel.trim() || 'Field'}" as {wizardActiveFieldType}
                          </Text>
                        </Pressable>

                        {/* Existing fields in selected section */}
                        {(selectedSubSpace.builderFields ?? []).length > 0 && (
                          <View style={{ gap: 4 }}>
                            <Text style={{ color: mode === 'night' ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.42)', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 }}>Fields in "{selectedSubSpace.name}" — tap name to rename, use arrows to reorder</Text>
                            {(selectedSubSpace.builderFields ?? []).map((field, fieldIdx, allFields) => (
                              <View key={field.id} style={{ backgroundColor: editingFieldId === field.id ? (mode === 'night' ? 'rgba(140,91,245,0.14)' : 'rgba(140,91,245,0.08)') : (mode === 'night' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'), borderRadius: 10, borderWidth: 1, borderColor: editingFieldId === field.id ? '#8C5BF5' : (mode === 'night' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)'), overflow: 'hidden' as any }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10, paddingVertical: 8 }}>
                                  {/* Move up/down */}
                                  <View style={{ gap: 2 }}>
                                    <Pressable
                                      disabled={!canManageSubSpace || fieldIdx === 0}
                                      style={{ width: 22, height: 20, borderRadius: 5, alignItems: 'center' as any, justifyContent: 'center' as any, backgroundColor: fieldIdx === 0 ? 'transparent' : 'rgba(140,91,245,0.14)', borderWidth: 1, borderColor: fieldIdx === 0 ? 'transparent' : 'rgba(140,91,245,0.26)' }}
                                      onPress={() => moveBuilderFieldInSubSpace(field.id, 'up')}
                                    >
                                      <Text style={{ fontSize: 10, color: fieldIdx === 0 ? 'transparent' : '#A78BFA', lineHeight: 12 }}>▲</Text>
                                    </Pressable>
                                    <Pressable
                                      disabled={!canManageSubSpace || fieldIdx === allFields.length - 1}
                                      style={{ width: 22, height: 20, borderRadius: 5, alignItems: 'center' as any, justifyContent: 'center' as any, backgroundColor: fieldIdx === allFields.length - 1 ? 'transparent' : 'rgba(140,91,245,0.14)', borderWidth: 1, borderColor: fieldIdx === allFields.length - 1 ? 'transparent' : 'rgba(140,91,245,0.26)' }}
                                      onPress={() => moveBuilderFieldInSubSpace(field.id, 'down')}
                                    >
                                      <Text style={{ fontSize: 10, color: fieldIdx === allFields.length - 1 ? 'transparent' : '#A78BFA', lineHeight: 12 }}>▼</Text>
                                    </Pressable>
                                  </View>
                                  {/* Type icon */}
                                  <View style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: 'rgba(140,91,245,0.15)', alignItems: 'center' as any, justifyContent: 'center' as any }}>
                                    <Text style={{ fontSize: 13 }}>{fieldTypeIcons[field.type] ?? '?'}</Text>
                                  </View>
                                  {/* Label — tap to edit inline */}
                                  <Pressable
                                    style={{ flex: 1 }}
                                    onPress={() => { if (editingFieldId === field.id) { setEditingFieldId(null); } else { setEditingFieldId(field.id); setEditingFieldLabel(field.label); } }}
                                  >
                                    <Text style={{ color: mode === 'night' ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.42)', fontSize: 9, fontWeight: '600', textTransform: 'uppercase' as any }}>{field.type} · tap to rename</Text>
                                    <Text style={{ color: mode === 'night' ? '#E8E4FF' : '#1a1030', fontWeight: '700', fontSize: 13 }}>{field.label}</Text>
                                  </Pressable>
                                  {/* Required toggle */}
                                  <Pressable
                                    disabled={!canManageSubSpace}
                                    style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 7, borderWidth: 1, borderColor: field.required ? 'rgba(167,139,250,0.45)' : (mode === 'night' ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)'), backgroundColor: field.required ? 'rgba(167,139,250,0.15)' : 'transparent' }}
                                    onPress={() => toggleBuilderFieldRequired(field.id)}
                                  >
                                    <Text style={{ fontSize: 10, fontWeight: '700', color: field.required ? '#A78BFA' : (mode === 'night' ? 'rgba(255,255,255,0.40)' : 'rgba(0,0,0,0.38)') }}>{field.required ? '★ Req' : '☆ Opt'}</Text>
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
                                      placeholderTextColor={mode === 'night' ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)'}
                                      autoFocus
                                      style={{ flex: 1, backgroundColor: mode === 'night' ? 'rgba(0,0,0,0.30)' : 'rgba(255,255,255,0.85)', borderRadius: 8, borderWidth: 1, borderColor: 'rgba(140,91,245,0.45)', paddingHorizontal: 10, paddingVertical: 7, color: mode === 'night' ? '#E8E4FF' : '#1a1030', fontSize: 13, fontWeight: '600' }}
                                      onSubmitEditing={() => { renameBuilderFieldInSubSpace(field.id, editingFieldLabel); setEditingFieldId(null); }}
                                    />
                                    <Pressable
                                      disabled={!editingFieldLabel.trim()}
                                      style={{ paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8, backgroundColor: editingFieldLabel.trim() ? '#8C5BF5' : 'rgba(140,91,245,0.20)', justifyContent: 'center' as any }}
                                      onPress={() => { renameBuilderFieldInSubSpace(field.id, editingFieldLabel); setEditingFieldId(null); }}
                                    >
                                      <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 12 }}>Save</Text>
                                    </Pressable>
                                    <Pressable
                                      style={{ paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8, borderWidth: 1, borderColor: mode === 'night' ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.14)', justifyContent: 'center' as any }}
                                      onPress={() => setEditingFieldId(null)}
                                    >
                                      <Text style={{ color: mode === 'night' ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.48)', fontSize: 12 }}>Cancel</Text>
                                    </Pressable>
                                  </View>
                                )}
                              </View>
                            ))}
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
                      <Text style={{ color: mode === 'night' ? '#E8E4FF' : '#1a1030', fontSize: 18, fontWeight: '800', textAlign: 'center' }}>{workspace?.name} is ready!</Text>
                      <Text style={{ color: mode === 'night' ? 'rgba(255,255,255,0.52)' : 'rgba(0,0,0,0.48)', fontSize: 12, textAlign: 'center', lineHeight: 18 }}>Review everything below, then publish so your team can see it in the End User view.</Text>
                    </View>

                    {/* Summary */}
                    <View style={{ backgroundColor: mode === 'night' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)', borderRadius: 12, padding: 16, gap: 12, borderWidth: 1, borderColor: mode === 'night' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(140,91,245,0.20)', alignItems: 'center' as any, justifyContent: 'center' as any }}>
                          <Text style={{ fontSize: 18 }}>🏗️</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: mode === 'night' ? '#E8E4FF' : '#1a1030', fontWeight: '800', fontSize: 16 }}>{workspace?.name}</Text>
                          <Text style={{ color: mode === 'night' ? 'rgba(255,255,255,0.42)' : 'rgba(0,0,0,0.42)', fontSize: 12 }}>Tracking: {workspace?.rootEntity} · Route: /{workspace?.route}</Text>
                        </View>
                      </View>

                      <View style={{ gap: 4 }}>
                        <Text style={{ color: mode === 'night' ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.42)', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 }}>{workspaceSubSpaces.length} Section{workspaceSubSpaces.length !== 1 ? 's' : ''} · {totalBuilderFields} Field{totalBuilderFields !== 1 ? 's' : ''}</Text>
                        {workspaceSubSpaces.map((ss) => (
                          <View key={ss.id} style={{ flexDirection: 'row', gap: 10, alignItems: 'center', backgroundColor: 'rgba(140,91,245,0.07)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 }}>
                            <Text style={{ color: '#A78BFA', fontWeight: '700', fontSize: 12, flex: 1 }}>{ss.name}</Text>
                            <Text style={{ color: mode === 'night' ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)', fontSize: 11 }}>{(ss.builderFields ?? []).length} field{(ss.builderFields ?? []).length !== 1 ? 's' : ''}</Text>
                            {(ss.builderFields ?? []).filter((f) => f.required).length > 0 && <Text style={{ color: '#22C55E', fontSize: 10, fontWeight: '600' }}>{(ss.builderFields ?? []).filter((f) => f.required).length} req</Text>}
                            <Pressable onPress={() => { setSelectedSubSpaceId(ss.id); setWizardStep(3); }}>
                              <Text style={{ fontSize: 11, color: '#A78BFA', fontWeight: '600' }}>Edit</Text>
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

                    <View style={{ backgroundColor: mode === 'night' ? 'rgba(140,91,245,0.08)' : 'rgba(140,91,245,0.05)', borderRadius: 10, padding: 12, gap: 5, borderWidth: 1, borderColor: mode === 'night' ? 'rgba(140,91,245,0.20)' : 'rgba(140,91,245,0.13)' }}>
                      <Text style={{ color: mode === 'night' ? '#A78BFA' : '#6F4BCF', fontWeight: '700', fontSize: 12 }}>What happens after publishing?</Text>
                      <Text style={{ color: mode === 'night' ? 'rgba(255,255,255,0.52)' : 'rgba(0,0,0,0.48)', fontSize: 12, lineHeight: 18 }}>{'→ Your workspace appears in End User (sidebar nav).\n→ Team members can create records, fill in fields, and track status.\n→ You can keep editing — changes publish in real time.'}</Text>
                      <Text style={{ color: mode === 'night' ? 'rgba(255,255,255,0.38)' : 'rgba(0,0,0,0.36)', fontSize: 11, marginTop: 3 }}>Next: Set up lifecycle stages via Language & Intake → Lifecycle Stages</Text>
                    </View>
                  </>
                ) : (
                  <View style={{ gap: 14, alignItems: 'center' as any }}>
                    <Text style={{ color: mode === 'night' ? 'rgba(255,255,255,0.50)' : 'rgba(0,0,0,0.48)', fontSize: 13, textAlign: 'center' }}>Complete steps 1–3 to build your workspace first.</Text>
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
                  <View style={{ height: 130, borderRadius: 12, borderWidth: 2, borderColor: mode === 'night' ? 'rgba(140,91,245,0.14)' : 'rgba(140,91,245,0.12)', alignItems: 'center' as any, justifyContent: 'center' as any, gap: 6 }}>
                    <Text style={{ fontSize: 28, opacity: 0.3 }}>🏗️</Text>
                    <Text style={{ fontSize: 11, color: mode === 'night' ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.22)', textAlign: 'center' }}>Start building to see preview</Text>
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
                        {workspace.pipelineEnabled && idx > 0 && <Text style={{ fontSize: 14, color: '#8C5BF5', fontWeight: '800' }}>→</Text>}
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
        <Text style={styles.bodyText}>Your setup report card. Review workspace completeness, identify SubSpaces missing forms or relationships, and resolve all warnings before your team goes live.</Text>

        <View style={styles.listCard}>
          <Text style={styles.listTitle}>Setup Overview</Text>
          <Text style={styles.metaText}>Total Workspaces: {insights.totalWorkspaces}</Text>
          <Text style={styles.metaText}>Total SubSpaces: {insights.totalSubSpaces}</Text>
          <Text style={styles.metaText}>Routes configured: {insights.workspacesWithRoutes} of {insights.totalWorkspaces} workspaces</Text>
          <Text style={styles.metaText}>SubSpaces with relationship rules: {insights.subSpacesWithRelationship}</Text>
          <Text style={styles.metaText}>SubSpaces with form coverage: {insights.subSpacesWithForms}</Text>
          <Text style={styles.metaText}>Published automation flows: {insights.publishedFlows}</Text>
        </View>

        <View style={styles.listCard}>
          <Text style={styles.listTitle}>Form Coverage Analysis</Text>
          <Text style={styles.metaText}>Each SubSpace needs at least one form or Form Builder fields so end users have a data capture screen.</Text>
          {insights.selectedWorkspaceSubSpacesMissingForms.length === 0 ? (
            <Text style={styles.metaText}>All SubSpaces in this workspace have form coverage from Form Builder details.</Text>
          ) : (
            <>
              <Text style={styles.metaText}>SubSpaces missing forms:</Text>
              {insights.selectedWorkspaceSubSpacesMissingForms.map((item) => (
                <Text key={`${item.workspaceId}-${item.subSpaceId}`} style={styles.notice}>
                  • {item.subSpaceName}
                </Text>
              ))}
            </>
          )}
        </View>

        <Text style={styles.listTitle}>Action Items</Text>
        <Text style={styles.metaText}>Fix warnings first — they block a clean go-live. Green checks mean that area is complete.</Text>
        {insights.findings.map((finding) => (
          <View key={`${finding.key}-${finding.text}`} style={styles.listCard}>
            <Text style={finding.level === 'warning' ? styles.notice : styles.metaText}>
              {finding.level === 'warning' ? '⚠ ' : '✓ '}
              {finding.text}
            </Text>
            {finding.level === 'warning' && finding.key === 'orphanForms' && (
              <Text style={styles.metaText}>
                Fix note: This means old form links are broken. A form points to a Workspace/SubSpace that was deleted or renamed.
                Form Builder details still work for valid SubSpaces, but remove orphan links in your saved data to keep governance clean.
              </Text>
            )}
            {finding.level === 'warning' && finding.key === 'subspacesWithoutForms' && (
              <Text style={styles.metaText}>
                Fix note: This SubSpace has no explicit form and no Form Builder fields yet.
                Open Workspace Design → SubSpace Lanes & Fields, select that SubSpace, and add fields from the palette to create its details form.
              </Text>
            )}
            {finding.level === 'warning' && finding.key === 'missingRelationships' && (
              <Text style={styles.metaText}>
                Fix note: This related SubSpace needs a relationship rule so records connect correctly to the workspace core entity. Open Workspace Design → SubSpace Lanes & Fields and fill in the Relationship Rule field.
              </Text>
            )}
            {finding.level === 'warning' && (
              <View style={styles.inlineRow}>
                <Pressable style={styles.secondaryButton} onPress={() => goToFindingFix(finding.key)}>
                  <Text style={styles.secondaryButtonText}>Go Fix</Text>
                </Pressable>
              </View>
            )}
          </View>
        ))}

        <View style={{ marginTop: 16 }}>
          <Text style={styles.listTitle}>Audit Log</Text>
          <Text style={styles.metaText}>Track all workspace and platform changes in one timeline.</Text>
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
                <View key={ss.id} style={{ marginTop: 8, paddingLeft: 12, borderLeftWidth: 2, borderLeftColor: '#8C5BF540' }}>
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
            <View style={{ backgroundColor: 'rgba(140,91,245,0.08)', borderWidth: 1, borderColor: 'rgba(140,91,245,0.24)', borderRadius: 12, padding: 16, gap: 8 }}>
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
                { icon: '🏢', label: data.shellConfig.functionLabel ?? 'Department', desc: 'A major division of your business (e.g. Supply Chain, Finance, Service Ops)', color: '#8C5BF5' },
                { icon: '📦', label: data.shellConfig.objectLabel ?? 'Object', desc: `What each ${data.shellConfig.functionLabel ?? 'Department'} manages (e.g. Drug Inventory, Device Inventory, Policy Book)`, color: '#3B82F6' },
                { icon: '🗂️', label: data.shellConfig.collectionLabel ?? 'Batch', desc: `Groups or collections of ${data.shellConfig.objectLabelPlural ?? 'Objects'} (e.g. Lot XY-1234, Work Order WO-5001)`, color: '#10B981' },
                { icon: '🔲', label: 'Workspace', desc: 'The processing area — each workspace handles one stage of the workflow', color: '#F59E0B' },
                { icon: '📋', label: 'SubSpace', desc: 'A lane inside a workspace (e.g. Distributor Verification, Repair Tasks)', color: '#EF4444' },
                { icon: '📄', label: 'Record', desc: 'A single tracked item with fields, status, and history', color: '#6B7280' },
              ].map((level, i) => (
                <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 5, borderBottomWidth: i < 5 ? 1 : 0, borderBottomColor: 'rgba(255,255,255,0.06)' }}>
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
                { step: '1', title: `Define ${data.shellConfig.functionLabelPlural ?? 'Departments'}`, detail: `Name the major areas of your business. Example: "Supply Chain & Regulatory", "Service Operations", "Finance"`, color: '#8C5BF5' },
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
                  style={[styles.secondaryButton, { borderColor: '#8C5BF5', flex: 1 }]}
                  onPress={() => {
                    const dscsaWsId = data.workspaces.find(w => w.name?.toLowerCase().includes('dscsa') || w.name?.toLowerCase().includes('serialization'))?.id ?? '';
                    upsertBusinessFunction({
                      id: 'bfn-supply-chain', name: 'Supply Chain & Regulatory', icon: '🔗', color: '#8C5BF5', order: 0,
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
                  <Text style={[styles.secondaryButtonText, { color: '#8C5BF5' }]}>💊 Load DSCSA Pharma Example</Text>
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
            <View style={{ backgroundColor: 'rgba(140,91,245,0.08)', borderWidth: 1, borderColor: 'rgba(140,91,245,0.20)', borderRadius: 10, padding: 12 }}>
              <Text style={[styles.listTitle, { fontSize: 14, marginBottom: 4 }]}>🏗️ Your Operations Map</Text>
              <View style={{ flexDirection: 'row', gap: 14, flexWrap: 'wrap' }}>
                <Text style={styles.metaText}>
                  <Text style={{ color: '#8C5BF5', fontWeight: '700' }}>{(data.businessFunctions ?? []).length}</Text>
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
                    style={[styles.secondaryButton, { borderColor: '#8C5BF5' }]}
                    onPress={() => {
                      const dscsaWsId = data.workspaces.find(w => w.name?.toLowerCase().includes('dscsa') || w.name?.toLowerCase().includes('serialization'))?.id ?? '';
                      upsertBusinessFunction({
                        id: 'bfn-supply-chain', name: 'Supply Chain & Regulatory', icon: '🔗', color: '#8C5BF5', order: 0,
                        description: 'End-to-end pharmaceutical serialization from manufacturer to patient dispensing (DSCSA § 582)',
                        objects: [{ id: 'bobj-drug-inventory', functionId: 'bfn-supply-chain', name: 'Drug Inventory', namePlural: 'Drug Inventories', icon: '💊', description: 'Track serialized pharmaceutical batches across the DSCSA supply chain', workspaceIds: dscsaWsId ? [dscsaWsId] : [] }],
                      });
                    }}
                  >
                    <Text style={[styles.secondaryButtonText, { color: '#8C5BF5' }]}>+ Add DSCSA Pharma Function</Text>
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
            <View key={fn.id} style={[styles.listCard, { borderLeftWidth: 3, borderLeftColor: fn.color ?? '#8C5BF5' }]}>
              <View style={styles.inlineRow}>
                <Pressable onPress={() => setExpandedFnIds((prev) => { const next = new Set(prev); isFnExpanded ? next.delete(fn.id) : next.add(fn.id); return next; })} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  {!!fn.icon && <Text style={{ fontSize: 18 }}>{fn.icon}</Text>}
                  <Text style={styles.listTitle}>{fn.name}</Text>
                  <Text style={styles.metaText}>{fn.objects.length} {fn.objects.length === 1 ? (data.shellConfig.objectLabel ?? 'Object') : (data.shellConfig.objectLabelPlural ?? 'Objects')}</Text>
                  <Text style={styles.metaText}>{isFnExpanded ? '▾' : '▸'}</Text>
                </Pressable>
                <Pressable onPress={() => {
                  setEditingFunctionId(isEditingFn ? null : fn.id);
                  if (!isEditingFn) { setNewFnName(fn.name); setNewFnIcon(fn.icon ?? ''); setNewFnColor(fn.color ?? '#8C5BF5'); setNewFnDesc(fn.description ?? ''); }
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
                  <LabeledInput label="Accent Color (hex)" value={newFnColor} onChangeText={setNewFnColor} placeholder="#8C5BF5" />
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
                <View style={{ marginTop: 8, paddingLeft: 12, borderLeftWidth: 2, borderLeftColor: '#8C5BF540' }}>
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
            <LabeledInput label="Accent Color (hex)" value={newFnColor} onChangeText={setNewFnColor} placeholder="#8C5BF5" />
            <LabeledInput label="Description (optional)" value={newFnDesc} onChangeText={setNewFnDesc} placeholder="What this department covers" />
            <View style={styles.inlineRow}>
              <Pressable style={styles.secondaryButton} onPress={() => {
                if (!newFnName.trim()) return;
                const id = `bfn-${newFnName.trim().toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;
                const order = (data.businessFunctions ?? []).length;
                upsertBusinessFunction({ id, name: newFnName.trim(), icon: newFnIcon.trim() || undefined, color: newFnColor.trim() || '#8C5BF5', description: newFnDesc.trim() || undefined, order, objects: [] });
                setNewFnName(''); setNewFnIcon(''); setNewFnColor('#8C5BF5'); setNewFnDesc('');
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
            setNewFnName(''); setNewFnIcon(''); setNewFnColor('#8C5BF5'); setNewFnDesc('');
            setEditingFunctionId('__new__');
          }}>
            <Text style={styles.secondaryButtonText}>+ Add {data.shellConfig.functionLabel ?? 'Department'}</Text>
          </Pressable>
        )}
      </Card>}

      {adminTab === 'shell' && <Card title="" blurred>
        <Text style={styles.bodyText}>Customize the words your team sees across the app, build the intake form that starts every new record, define user personas, and set up lifecycle stages. No coding needed.</Text>
        {!canManageWorkspace && <Text style={styles.notice}>{deniedMessage('workspace.manage')}</Text>}

        <View style={styles.inlineRow}>
          <Pressable style={[styles.pill, shellPane === 'labels' && styles.pillActive]} onPress={() => setShellPane('labels')}>
            <Text style={[styles.pillText, shellPane === 'labels' && styles.pillTextActive]}>App Terminology</Text>
          </Pressable>
          <Pressable style={[styles.pill, shellPane === 'intake' && styles.pillActive]} onPress={() => setShellPane('intake')}>
            <Text style={[styles.pillText, shellPane === 'intake' && styles.pillTextActive]}>Intake Form Builder</Text>
          </Pressable>
          <Pressable style={[styles.pill, shellPane === 'personas' && styles.pillActive]} onPress={() => setShellPane('personas')}>
            <Text style={[styles.pillText, shellPane === 'personas' && styles.pillTextActive]}>User Personas</Text>
          </Pressable>
          <Pressable style={[styles.pill, shellPane === 'lifecycle' && styles.pillActive]} onPress={() => setShellPane('lifecycle')}>
            <Text style={[styles.pillText, shellPane === 'lifecycle' && styles.pillTextActive]}>Lifecycle Stages</Text>
          </Pressable>
        </View>

        {shellPane === 'labels' && (
          <>
            <Text style={styles.metaText}>App Terminology</Text>
            <Text style={styles.metaText}>Rename the key labels your team sees across the app. Use words they already say every day.</Text>
            <LabeledInput label="Main item (one)" helperText="What is one record called?" value={subjectSingular} onChangeText={setSubjectSingular} placeholder="Example: Batch" />
            <LabeledInput label="Main item (many)" helperText="What do you call multiple records?" value={subjectPlural} onChangeText={setSubjectPlural} placeholder="Example: Batches" />
            <LabeledInput label="Workspace name word" helperText="What should this area be called in the app?" value={workspaceLabel} onChangeText={setWorkspaceLabel} placeholder="Example: Team Workspace" />
            <LabeledInput label="SubSpace name word" helperText="What should each smaller work area be called?" value={subSpaceLabel} onChangeText={setSubSpaceLabel} placeholder="Example: Work Lane" />
            <LabeledInput label={`${data.shellConfig.functionLabel ?? 'Department'} (one)`} helperText="How do you call one top-level business division?" value={functionLabel} onChangeText={setFunctionLabel} placeholder="Department" />
            <LabeledInput label={`${data.shellConfig.functionLabel ?? 'Department'} (many)`} helperText="Plural version" value={functionLabelPlural} onChangeText={setFunctionLabelPlural} placeholder="Departments" />
            <LabeledInput label={`${data.shellConfig.objectLabel ?? 'Object'} (one)`} helperText="The type of inventory or asset portfolio being tracked" value={shellObjectLabel} onChangeText={setShellObjectLabel} placeholder="Inventory" />
            <LabeledInput label={`${data.shellConfig.objectLabel ?? 'Object'} (many)`} helperText="Plural version" value={objectLabelPlural} onChangeText={setObjectLabelPlural} placeholder="Inventories" />
            <LabeledInput label={`${data.shellConfig.collectionLabel ?? 'Batch'} (one)`} helperText="An individual tracked collection or client portfolio" value={collectionLabel} onChangeText={setCollectionLabel} placeholder="Batch" />
            <LabeledInput label={`${data.shellConfig.collectionLabel ?? 'Batch'} (many)`} helperText="Plural version" value={collectionLabelPlural} onChangeText={setCollectionLabelPlural} placeholder="Batches" />
            <Pressable nativeID="wt-save-app-words" disabled={!canManageWorkspace} style={[styles.secondaryButton, !canManageWorkspace && styles.buttonDisabled]} onPress={() => { saveLabels(); auditLog?.logEntry({ action: 'update', entityType: 'shell-config', entityId: 'shell-config', entityName: 'Shell Configuration', after: { subjectSingular, subjectPlural, workspaceLabel, subSpaceLabel } }); addNotification?.({ type: 'system', title: 'Config Updated', body: 'Shell configuration (app terminology) has been saved.', severity: 'info' }); }}>
              <Text style={styles.secondaryButtonText}>Save App Words</Text>
            </Pressable>
          </>
        )}

        {shellPane === 'intake' && (
          <>
            <Text style={styles.metaText}>Intake Form Builder</Text>
            <Text style={styles.metaText}>Define the fields that every new record starts with. Only ask for information your team actually needs at the start of a workflow.</Text>
            {shellConfig.intakeFields.map((field) => (
              <View key={field.id} style={styles.listCard}>
                <Text style={styles.listTitle}>{field.label}</Text>
                <Text style={styles.metaText}>Type: {field.type} • Required: {field.required ? 'Yes' : 'No'}</Text>
                {!!field.options?.length && <Text style={styles.metaText}>Options: {field.options.join(', ')}</Text>}
                <Pressable disabled={!canManageWorkspace} style={[styles.secondaryButton, !canManageWorkspace && styles.buttonDisabled]} onPress={() => removeIntakeField(field.id)}>
                  <Text style={styles.secondaryButtonText}>Delete Field</Text>
                </Pressable>
              </View>
            ))}

            <LabeledInput label="New Field Label" helperText="Example: Carton Serial" value={newFieldLabel} onChangeText={setNewFieldLabel} placeholder="Example: NDC Product Code" />
            <Text style={styles.metaText}>Field Type</Text>
            <View style={styles.inlineRow}>
              {(['text', 'number', 'date', 'select'] as const).map((type) => (
                <Pressable
                  key={type}
                  disabled={!canManageWorkspace}
                  style={[styles.pill, newFieldType === type && styles.pillActive, !canManageWorkspace && styles.buttonDisabled]}
                  onPress={() => setNewFieldType(type)}
                >
                  <Text style={[styles.pillText, newFieldType === type && styles.pillTextActive]}>{type}</Text>
                </Pressable>
              ))}
            </View>
            <Pressable
              disabled={!canManageWorkspace}
              style={[styles.secondaryButton, newFieldRequired && styles.pillActive, !canManageWorkspace && styles.buttonDisabled]}
              onPress={() => setNewFieldRequired((current) => !current)}
            >
              <Text style={styles.secondaryButtonText}>Required: {newFieldRequired ? 'Yes' : 'No'}</Text>
            </Pressable>
            {newFieldType === 'select' && (
              <LabeledInput
                label="Options (comma separated)"
                helperText="Example: Match, Mismatch, Pending"
                value={newFieldOptions}
                onChangeText={setNewFieldOptions}
                placeholder="Example: Manufacturer, Distributor, Pharmacy"
              />
            )}
            <Pressable nativeID="wt-add-intake-field" disabled={!canManageWorkspace} style={[styles.secondaryButton, !canManageWorkspace && styles.buttonDisabled]} onPress={addIntakeField}>
              <Text style={styles.secondaryButtonText}>Add Field</Text>
            </Pressable>
          </>
        )}

        {shellPane === 'personas' && (
          <>
            <Text style={styles.metaText}>User Persona Builder</Text>
            <Text style={styles.metaText}>Create personas that represent the different workflow roles in your organization. Each persona can be scoped to specific workspaces and tagged for reporting.</Text>
            {shellConfig.personas.map((persona) => (
              <View key={persona.id} style={styles.listCard}>
                <Text style={styles.listTitle}>{persona.name}</Text>
                {!!persona.description && <Text style={styles.metaText}>{persona.description}</Text>}
                <Text style={styles.metaText}>Workspace Scope: {persona.workspaceScope}</Text>
                {persona.workspaceScope === 'selected' && <Text style={styles.metaText}>Workspace IDs: {persona.workspaceIds.join(', ') || 'None'}</Text>}
                <Text style={styles.metaText}>Default Tags: {persona.defaultTags.join(', ')}</Text>
                <Pressable disabled={!canManageWorkspace} style={[styles.secondaryButton, !canManageWorkspace && styles.buttonDisabled]} onPress={() => deletePersona(persona.id)}>
                  <Text style={styles.secondaryButtonText}>Delete Persona</Text>
                </Pressable>
              </View>
            ))}

            <LabeledInput label="Persona Name" helperText="Example: Distributor Receiver" value={personaName} onChangeText={setPersonaName} placeholder="Example: Pharmacy Dispense Manager" />
            <LabeledInput
              label="Persona Description"
              helperText="Example: Handles incoming carton scans and serial verification"
              value={personaDescription}
              onChangeText={setPersonaDescription}
              placeholder="Describe what this persona does in the workflow"
              multiline
            />
            <Text style={styles.metaText}>Persona Workspace Scope</Text>
            <View style={styles.inlineRow}>
              <Pressable
                disabled={!canManageWorkspace}
                style={[styles.pill, personaWorkspaceScope === 'all' && styles.pillActive, !canManageWorkspace && styles.buttonDisabled]}
                onPress={() => setPersonaWorkspaceScope('all')}
              >
                <Text style={[styles.pillText, personaWorkspaceScope === 'all' && styles.pillTextActive]}>All Workspaces</Text>
              </Pressable>
              <Pressable
                disabled={!canManageWorkspace}
                style={[styles.pill, personaWorkspaceScope === 'selected' && styles.pillActive, !canManageWorkspace && styles.buttonDisabled]}
                onPress={() => setPersonaWorkspaceScope('selected')}
              >
                <Text style={[styles.pillText, personaWorkspaceScope === 'selected' && styles.pillTextActive]}>Selected Workspaces</Text>
              </Pressable>
            </View>
            {personaWorkspaceScope === 'selected' && (
              <View style={styles.inlineRow}>
                {shellWorkspaces.map((workspaceItem) => {
                  const selected = personaWorkspaceIds.includes(workspaceItem.id);
                  return (
                    <Pressable
                      key={workspaceItem.id}
                      disabled={!canManageWorkspace}
                      style={[styles.pill, selected && styles.pillActive, !canManageWorkspace && styles.buttonDisabled]}
                      onPress={() => togglePersonaWorkspace(workspaceItem.id)}
                    >
                      <Text style={[styles.pillText, selected && styles.pillTextActive]}>{workspaceItem.name}</Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
            <LabeledInput
              label="Persona Default Tags (comma separated)"
              helperText="Example: Team:Distributor, Region:US"
              value={personaDefaultTags}
              onChangeText={setPersonaDefaultTags}
              placeholder="Example: Persona:DistributorReceiver, Segment:Traceability"
            />
            <Pressable disabled={!canManageWorkspace} style={[styles.secondaryButton, !canManageWorkspace && styles.buttonDisabled]} onPress={createPersona}>
              <Text style={styles.secondaryButtonText}>Create Persona</Text>
            </Pressable>
          </>
        )}

        {shellPane === 'lifecycle' && (
          <>
            <Text style={styles.metaText}>Lifecycle Stage Designer</Text>
            <Text style={styles.metaText}>Map out the stages a record moves through from start to finish. Define which stages exist, set a default starting stage, and create transition rules that control who can move records between stages.</Text>
            {shellConfig.lifecycleStages.map((stage) => {
              const isDefault = stage.id === shellConfig.defaultLifecycleStageId;
              return (
                <View key={stage.id} style={styles.listCard}>
                  <Text style={styles.listTitle}>{stage.name}</Text>
                  {!!stage.description && <Text style={styles.metaText}>{stage.description}</Text>}
                  <Text style={styles.metaText}>Default: {isDefault ? 'Yes' : 'No'}</Text>
                  <View style={styles.inlineRow}>
                    {!isDefault && (
                      <Pressable
                        disabled={!canManageWorkspace}
                        style={[styles.secondaryButton, !canManageWorkspace && styles.buttonDisabled]}
                        onPress={() => setDefaultLifecycleStage(stage.id)}
                      >
                        <Text style={styles.secondaryButtonText}>Set Default</Text>
                      </Pressable>
                    )}
                    <Pressable
                      disabled={!canManageWorkspace}
                      style={[styles.secondaryButton, !canManageWorkspace && styles.buttonDisabled]}
                      onPress={() => deleteLifecycleStage(stage.id)}
                    >
                      <Text style={styles.secondaryButtonText}>Delete Stage</Text>
                    </Pressable>
                  </View>
                </View>
              );
            })}

            <LabeledInput label="New Stage Name" helperText="Example: Exception Review" value={newLifecycleName} onChangeText={setNewLifecycleName} placeholder="Example: Received by Pharmacy" />
            <LabeledInput
              label="Stage Description"
              helperText="Example: Serial event requires returns/loss/suspect investigation"
              value={newLifecycleDescription}
              onChangeText={setNewLifecycleDescription}
              placeholder="Optional context for users"
              multiline
            />
            <Pressable disabled={!canManageWorkspace} style={[styles.secondaryButton, !canManageWorkspace && styles.buttonDisabled]} onPress={addLifecycleStage}>
              <Text style={styles.secondaryButtonText}>Add Stage</Text>
            </Pressable>

            <View style={styles.separator} />
            <Text style={styles.metaText}>Lifecycle Transition Rules</Text>
            {shellConfig.lifecycleTransitions.length === 0 && (
              <Text style={styles.metaText}>No move rules yet. Records can still start in the default stage.</Text>
            )}
            {shellConfig.lifecycleTransitions.map((transition) => {
              const from = shellConfig.lifecycleStages.find((stage) => stage.id === transition.fromStageId)?.name ?? transition.fromStageId;
              const to = shellConfig.lifecycleStages.find((stage) => stage.id === transition.toStageId)?.name ?? transition.toStageId;
              const personaNames = (transition.personaIds ?? [])
                .map((personaId) => shellConfig.personas.find((persona) => persona.id === personaId)?.name ?? personaId)
                .join(', ');
              return (
                <View key={transition.id} style={styles.listCard}>
                  <Text style={styles.listTitle}>{from} → {to}</Text>
                  <Text style={styles.metaText}>Persona scope: {(transition.personaIds ?? []).length === 0 ? 'All personas' : personaNames}</Text>
                  <Pressable
                    disabled={!canManageWorkspace}
                    style={[styles.secondaryButton, !canManageWorkspace && styles.buttonDisabled]}
                    onPress={() => deleteLifecycleTransition(transition.id)}
                  >
                    <Text style={styles.secondaryButtonText}>Delete Transition</Text>
                  </Pressable>
                </View>
              );
            })}

            <Text style={styles.metaText}>From Stage</Text>
            <View style={styles.inlineRow}>
              {shellConfig.lifecycleStages.map((stage) => (
                <Pressable
                  key={`from-${stage.id}`}
                  disabled={!canManageWorkspace}
                  style={[styles.pill, transitionFromStageId === stage.id && styles.pillActive, !canManageWorkspace && styles.buttonDisabled]}
                  onPress={() => setTransitionFromStageId(stage.id)}
                >
                  <Text style={[styles.pillText, transitionFromStageId === stage.id && styles.pillTextActive]}>{stage.name}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.metaText}>To Stage</Text>
            <View style={styles.inlineRow}>
              {shellConfig.lifecycleStages.map((stage) => (
                <Pressable
                  key={`to-${stage.id}`}
                  disabled={!canManageWorkspace}
                  style={[styles.pill, transitionToStageId === stage.id && styles.pillActive, !canManageWorkspace && styles.buttonDisabled]}
                  onPress={() => setTransitionToStageId(stage.id)}
                >
                  <Text style={[styles.pillText, transitionToStageId === stage.id && styles.pillTextActive]}>{stage.name}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.metaText}>Transition Persona Scope</Text>
            <View style={styles.inlineRow}>
              <Pressable
                disabled={!canManageWorkspace}
                style={[styles.pill, transitionPersonaScope === 'all' && styles.pillActive, !canManageWorkspace && styles.buttonDisabled]}
                onPress={() => setTransitionPersonaScope('all')}
              >
                <Text style={[styles.pillText, transitionPersonaScope === 'all' && styles.pillTextActive]}>All Personas</Text>
              </Pressable>
              <Pressable
                disabled={!canManageWorkspace}
                style={[styles.pill, transitionPersonaScope === 'selected' && styles.pillActive, !canManageWorkspace && styles.buttonDisabled]}
                onPress={() => setTransitionPersonaScope('selected')}
              >
                <Text style={[styles.pillText, transitionPersonaScope === 'selected' && styles.pillTextActive]}>Selected Personas</Text>
              </Pressable>
            </View>

            {transitionPersonaScope === 'selected' && (
              <View style={styles.inlineRow}>
                {shellConfig.personas.map((persona) => {
                  const selected = transitionPersonaIds.includes(persona.id);
                  return (
                    <Pressable
                      key={`transition-persona-${persona.id}`}
                      disabled={!canManageWorkspace}
                      style={[styles.pill, selected && styles.pillActive, !canManageWorkspace && styles.buttonDisabled]}
                      onPress={() => toggleTransitionPersona(persona.id)}
                    >
                      <Text style={[styles.pillText, selected && styles.pillTextActive]}>{persona.name}</Text>
                    </Pressable>
                  );
                })}
              </View>
            )}

            <Pressable disabled={!canManageWorkspace} style={[styles.secondaryButton, !canManageWorkspace && styles.buttonDisabled]} onPress={addLifecycleTransition}>
              <Text style={styles.secondaryButtonText}>Add Rule</Text>
            </Pressable>
          </>
        )}

        {!!shellNotice && <Text style={styles.notice}>{shellNotice}</Text>}
      </Card>}

      {adminTab === 'role' && <Card title="" blurred>
        <Text style={styles.bodyText}>Create roles and define exactly what each one can see and do. Assign permissions, scope access to specific workspaces, save permission snapshots as reusable templates, and audit changes between template versions.</Text>

        {/* ── RBAC status banner ── */}
        <View style={[styles.inlineRow, { flexWrap: 'nowrap', alignItems: 'center', gap: 10, marginBottom: 4 }]}>
          <View style={[
            styles.listCard,
            { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, paddingHorizontal: 12, marginBottom: 0 },
            canManageWorkspace ? { borderColor: 'rgba(46,204,113,0.40)', backgroundColor: 'rgba(46,204,113,0.08)' } : { borderColor: 'rgba(231,76,60,0.40)', backgroundColor: 'rgba(231,76,60,0.08)' },
          ]}>
            <Text style={{ fontSize: 18 }}>{canManageWorkspace ? '🛡️' : '🔒'}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.listTitle, { fontSize: 13 }]}>
                {currentUser ? currentUser.fullName : 'Anonymous'}
                {isSuperAdmin ? '  ·  Super Admin' : canManageWorkspace ? '  ·  Admin' : '  ·  No admin access'}
              </Text>
              {currentUser && (
                <Text style={[styles.metaText, { marginTop: 0 }]}>
                  {currentUser.email}  ·  Role: {data.roles.find((r) => r.id === currentUser.roleId)?.name ?? 'Unassigned'}
                </Text>
              )}
              {!canManageWorkspace && (
                <Text style={[styles.notice, { marginTop: 2 }]}>You do not have permission to manage access &amp; permissions.</Text>
              )}
            </View>
          </View>
        </View>

        <View style={styles.inlineRow}>
          <Pressable style={[styles.pill, rolePane === 'roles' && styles.pillActive]} onPress={() => setRolePane('roles')}>
            <Text style={[styles.pillText, rolePane === 'roles' && styles.pillTextActive]}>Role Manager</Text>
          </Pressable>
          <Pressable style={[styles.pill, rolePane === 'permissions' && styles.pillActive]} onPress={() => setRolePane('permissions')}>
            <Text style={[styles.pillText, rolePane === 'permissions' && styles.pillTextActive]}>Permission Map</Text>
          </Pressable>
          <Pressable style={[styles.pill, rolePane === 'scope' && styles.pillActive]} onPress={() => setRolePane('scope')}>
            <Text style={[styles.pillText, rolePane === 'scope' && styles.pillTextActive]}>Workspace Scope</Text>
          </Pressable>
          <Pressable style={[styles.pill, rolePane === 'templates' && styles.pillActive]} onPress={() => setRolePane('templates')}>
            <Text style={[styles.pillText, rolePane === 'templates' && styles.pillTextActive]}>Policy Templates</Text>
          </Pressable>
          <Pressable style={[styles.pill, rolePane === 'diff' && styles.pillActive]} onPress={() => setRolePane('diff')}>
            <Text style={[styles.pillText, rolePane === 'diff' && styles.pillTextActive]}>Template Diff & Audit</Text>
          </Pressable>
        </View>

        {rolePane === 'roles' && (
          <>
            <View style={styles.inlineRow}>
              {roles.map((role) => (
                <Pressable key={role.id} onPress={() => setSelectedRoleId(role.id)} style={[styles.pill, selectedRoleId === role.id && styles.pillActive]}>
                  <Text style={[styles.pillText, selectedRoleId === role.id && styles.pillTextActive]}>{role.name}</Text>
                </Pressable>
              ))}
            </View>

            <LabeledInput label="New Role Name" helperText="Permission profile name" value={newRoleName} onChangeText={setNewRoleName} placeholder="Example: Assembly Supervisor" />
            <Text style={styles.metaText}>Easy example role: Receiving Coordinator (can intake and record, cannot publish flows).</Text>
            <Pressable disabled={!canManageWorkspace} style={[styles.secondaryButton, !canManageWorkspace && styles.buttonDisabled]} onPress={createRole}>
              <Text style={styles.secondaryButtonText}>Create Role</Text>
            </Pressable>
          </>
        )}

        {selectedRole && (
          <>
            {rolePane === 'roles' && (
              <>
                <View style={styles.separator} />
                <LabeledInput label="Role Name" helperText="Example: Line Lead" value={roleName} onChangeText={setRoleName} placeholder="Example: Distributor Verification Lead" />
                <LabeledInput
                  label="Role Description"
                  helperText="Example: Reviews incoming quality and signs off handoff"
                  value={roleDescription}
                  onChangeText={setRoleDescription}
                  placeholder="Describe responsibilities and limits for this role"
                  multiline
                />
                <View style={styles.inlineRow}>
                  <Pressable nativeID="wt-save-role" disabled={!canManageWorkspace} style={[styles.primaryButton, !canManageWorkspace && styles.buttonDisabled]} onPress={() => { saveRole(); auditLog?.logEntry({ action: 'update', entityType: 'role', entityId: selectedRoleId ?? 'new', entityName: roleName || newRoleName || 'Unnamed Role', after: { detail: 'Saved role policy' } }); addNotification?.({ type: 'system', title: 'Role Saved', body: `Role "${roleName || newRoleName || 'Unnamed Role'}" permissions have been saved.`, severity: 'success' }); }}>
                    <Text style={styles.primaryButtonText}>Save Role</Text>
                  </Pressable>
                  <Pressable disabled={!canManageWorkspace} style={[styles.secondaryButton, !canManageWorkspace && styles.buttonDisabled]} onPress={() => { removeRole(); auditLog?.logEntry({ action: 'delete', entityType: 'role', entityId: selectedRoleId ?? '', entityName: roleName || 'Unnamed Role', after: { detail: 'Deleted role' } }); addNotification?.({ type: 'system', title: 'Role Deleted', body: `Role "${roleName || 'Unnamed Role'}" has been removed.`, severity: 'warning' }); }}>
                    <Text style={styles.secondaryButtonText}>Delete Role</Text>
                  </Pressable>
                </View>
              </>
            )}

            {rolePane === 'templates' && (
              <>
                <Text style={styles.metaText}>Policy Templates</Text>
                <Text style={styles.metaText}>Save the current permission set as a reusable template, clone existing templates, or create new versions for audit and rollback.</Text>
                <View style={styles.inlineRow}>
              {templates.map((template) => (
                <View key={template.id} style={styles.listCard}>
                  <Text style={styles.listTitle}>{template.name} (v{template.version})</Text>
                  {!!template.description && <Text style={styles.metaText}>{template.description}</Text>}
                  <Text style={styles.metaText}>Source: {template.source}</Text>
                  <Text style={styles.metaText}>Lineage: {template.lineageId}</Text>
                  {template.parentTemplateId && <Text style={styles.metaText}>Parent: {template.parentTemplateId}</Text>}
                  {template.changeNote && <Text style={styles.metaText}>Change Note: {template.changeNote}</Text>}
                  <Text style={styles.metaText}>Mode: {diffFromTemplateId === template.id ? 'Base' : diffToTemplateId === template.id ? 'Compare' : 'Unselected'}</Text>
                  <View style={styles.inlineRow}>
                    <Pressable
                      disabled={!canManageWorkspace}
                      style={[styles.secondaryButton, !canManageWorkspace && styles.buttonDisabled]}
                      onPress={() => applyTemplate(template.id)}
                    >
                      <Text style={styles.secondaryButtonText}>Apply</Text>
                    </Pressable>
                    <Pressable
                      disabled={!canManageWorkspace}
                      style={[styles.secondaryButton, !canManageWorkspace && styles.buttonDisabled]}
                      onPress={() => cloneTemplate(template.id)}
                    >
                      <Text style={styles.secondaryButtonText}>Clone</Text>
                    </Pressable>
                    <Pressable
                      disabled={!canManageWorkspace}
                      style={[styles.secondaryButton, !canManageWorkspace && styles.buttonDisabled]}
                      onPress={() => createTemplateVersion(template.id)}
                    >
                      <Text style={styles.secondaryButtonText}>New Version</Text>
                    </Pressable>
                    <Pressable
                      disabled={!canManageWorkspace}
                      style={[styles.secondaryButton, !canManageWorkspace && styles.buttonDisabled]}
                      onPress={() => compareTemplateToLatest(template.id)}
                    >
                      <Text style={styles.secondaryButtonText}>Diff vs Latest</Text>
                    </Pressable>
                    <Pressable
                      disabled={!canManageWorkspace}
                      style={[styles.secondaryButton, !canManageWorkspace && styles.buttonDisabled]}
                      onPress={() => setDiffFromTemplateId(template.id)}
                    >
                      <Text style={styles.secondaryButtonText}>Set Base</Text>
                    </Pressable>
                    <Pressable
                      disabled={!canManageWorkspace}
                      style={[styles.secondaryButton, !canManageWorkspace && styles.buttonDisabled]}
                      onPress={() => setDiffToTemplateId(template.id)}
                    >
                      <Text style={styles.secondaryButtonText}>Set Compare</Text>
                    </Pressable>
                    {template.source === 'custom' && (
                      <Pressable
                        disabled={!canManageWorkspace}
                        style={[styles.secondaryButton, !canManageWorkspace && styles.buttonDisabled]}
                        onPress={() => removeCustomTemplate(template.id)}
                      >
                        <Text style={styles.secondaryButtonText}>Delete</Text>
                      </Pressable>
                    )}
                  </View>
                </View>
              ))}
              <Pressable
                disabled={!canManageWorkspace}
                style={[styles.secondaryButton, !canManageWorkspace && styles.buttonDisabled]}
                onPress={clearPermissions}
              >
                <Text style={styles.secondaryButtonText}>Clear</Text>
              </Pressable>
              <Pressable
                disabled={!canManageWorkspace}
                style={[styles.secondaryButton, !canManageWorkspace && styles.buttonDisabled]}
                onPress={runSelectedTemplateDiff}
              >
                <Text style={styles.secondaryButtonText}>Run Diff</Text>
              </Pressable>
                </View>

                <Text style={styles.metaText}>Template Lineage Viewer</Text>
                {templateLineages.map((lineage) => (
                  <View key={lineage.lineageId} style={styles.listCard}>
                    <Text style={styles.listTitle}>{lineage.name}</Text>
                    <Text style={styles.metaText}>Lineage: {lineage.lineageId}</Text>
                    <Text style={styles.metaText}>Versions: {lineage.totalVersions} • Latest: v{lineage.latestVersion}</Text>
                    {lineage.versions[lineage.versions.length - 1]?.changeNote && (
                      <Text style={styles.metaText}>Latest note: {lineage.versions[lineage.versions.length - 1]?.changeNote}</Text>
                    )}
                    <View style={styles.inlineRow}>
                      {lineage.versions.map((versionItem) => {
                        const isLatest = versionItem.version === lineage.latestVersion;
                        return (
                          <Pressable
                            key={versionItem.id}
                            disabled={!canManageWorkspace}
                            onPress={() => applyTemplate(versionItem.id)}
                            style={[styles.pill, isLatest && styles.pillActive, !canManageWorkspace && styles.buttonDisabled]}
                          >
                            <Text style={[styles.pillText, isLatest && styles.pillTextActive]}>
                              v{versionItem.version}{isLatest ? ' • latest' : ''}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                ))}

                <LabeledInput label="Save as Template Name" helperText="Example: Receiving Team Basic Access" value={templateName} onChangeText={setTemplateName} placeholder="Example: Assembly Supervisor Baseline" />
                <LabeledInput
                  label="Template Description"
                  helperText="Example: Use for new receiving team members"
                  value={templateDescription}
                  onChangeText={setTemplateDescription}
                  placeholder="Describe when teams should use this template"
                  multiline
                />
                <Pressable
                  disabled={!canManageWorkspace}
                  style={[styles.secondaryButton, !canManageWorkspace && styles.buttonDisabled]}
                  onPress={saveAsTemplate}
                >
                  <Text style={styles.secondaryButtonText}>Save Template</Text>
                </Pressable>
              </>
            )}

            {rolePane === 'diff' && (
              <>
                <Text style={styles.metaText}>Selected Base: {diffFromTemplateId || 'None'} • Compare: {diffToTemplateId || 'None'}</Text>

                {templateDiff && (
                  <View style={styles.listCard}>
                <Text style={styles.listTitle}>Template Diff • {templateDiff.fromTemplateName} vs {templateDiff.toTemplateName}</Text>
                <Text style={styles.metaText}>Lineage: {templateDiff.lineageId}</Text>
                <Text style={styles.metaText}>Compared: v{templateDiff.fromVersion} → v{templateDiff.toVersion}</Text>

                <Text style={styles.metaText}>Added in compare version</Text>
                {templateDiff.addedInTarget.length === 0 && <Text style={styles.metaText}>None</Text>}
                {templateDiff.addedInTarget.map((permission) => (
                  <Text key={`add-${permission}`} style={styles.notice}>+ {permission}</Text>
                ))}

                <Text style={styles.metaText}>Missing in compare version</Text>
                {templateDiff.removedFromTarget.length === 0 && <Text style={styles.metaText}>None</Text>}
                {templateDiff.removedFromTarget.map((permission) => (
                  <Text key={`remove-${permission}`} style={styles.metaText}>- {permission}</Text>
                ))}

                <LabeledInput
                  label="Promotion Note"
                  helperText="Example: Added flow publish permission for plant supervisors"
                  value={promotionNote}
                  onChangeText={setPromotionNote}
                  placeholder="Document why this version is being promoted"
                  multiline
                />

                <Pressable
                  disabled={!canManageWorkspace || !promotionNote.trim()}
                  style={[styles.secondaryButton, (!canManageWorkspace || !promotionNote.trim()) && styles.buttonDisabled]}
                  onPress={promoteCompareAsNewVersion}
                >
                  <Text style={styles.secondaryButtonText}>Promote Version</Text>
                </Pressable>

                <Pressable
                  disabled={!canManageWorkspace}
                  style={[styles.secondaryButton, !canManageWorkspace && styles.buttonDisabled]}
                  onPress={clearTemplateDiff}
                >
                  <Text style={styles.secondaryButtonText}>Close Diff</Text>
                </Pressable>
                  </View>
                )}
              </>
            )}

            {rolePane === 'permissions' && (
              <>
                <Text style={styles.metaText}>Permission Map</Text>
                <Text style={styles.metaText}>Toggle individual permissions on or off for the selected role. Each permission controls a specific capability in the app.</Text>

                {/* ── Who is in this role ── */}
                <View style={[styles.listCard, { paddingVertical: 10, marginBottom: 4 }]}>
                  <View style={[styles.inlineRow, { gap: 6, alignItems: 'center', marginBottom: 6 }]}>
                    <Text style={[styles.listTitle, { fontSize: 13 }]}>Members assigned to "{selectedRole?.name}"</Text>
                    {isEditingOwnRole && <Text style={{ fontSize: 11, color: '#8C5BF5', fontWeight: '700' }}>← your role</Text>}
                  </View>
                  {membersInRole.length === 0 ? (
                    <Text style={styles.metaText}>No members currently assigned to this role.</Text>
                  ) : (
                    membersInRole.map((member) => (
                      <View key={member.id} style={[styles.inlineRow, { gap: 8, alignItems: 'center', paddingVertical: 4 }]}>
                        <Text style={{ fontSize: 15 }}>{member.isSuperAdmin ? '👑' : '👤'}</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.listTitle, { fontSize: 12 }]}>
                            {member.fullName}{member.id === currentUser?.id ? '  (you)' : ''}
                          </Text>
                          <Text style={[styles.metaText, { marginTop: 0 }]}>{member.email}</Text>
                        </View>
                        {member.isSuperAdmin && <Text style={{ fontSize: 11, color: '#E8C96A', fontWeight: '700' }}>Super Admin</Text>}
                      </View>
                    ))
                  )}
                </View>

                {permissionCatalog.map((permission) => {
                  const enabled = permissions.includes(permission.action);
                  return (
                    <Pressable
                      key={permission.action}
                      disabled={!canManageWorkspace}
                      style={[styles.listCard, enabled && styles.pillActive, !canManageWorkspace && styles.buttonDisabled]}
                      onPress={() => togglePermission(permission.action)}
                    >
                      <Text style={styles.listTitle}>{permission.label}</Text>
                      <Text style={styles.metaText}>{permission.detail}</Text>
                    </Pressable>
                  );
                })}
              </>
            )}

            {rolePane === 'scope' && (
              <>
                <Text style={styles.metaText}>Workspace Scope</Text>
                <Text style={styles.metaText}>Limit which workspaces this role can access. Choose "All Workspaces" for unrestricted access, or "Selected Workspaces" to pick specific ones.</Text>

                {/* ── Who is in this role ── */}
                <View style={[styles.listCard, { paddingVertical: 10, marginBottom: 4 }]}>
                  <View style={[styles.inlineRow, { gap: 6, alignItems: 'center', marginBottom: 6 }]}>
                    <Text style={[styles.listTitle, { fontSize: 13 }]}>Members assigned to "{selectedRole?.name}"</Text>
                    {isEditingOwnRole && <Text style={{ fontSize: 11, color: '#8C5BF5', fontWeight: '700' }}>← your role</Text>}
                  </View>
                  {membersInRole.length === 0 ? (
                    <Text style={styles.metaText}>No members currently assigned to this role.</Text>
                  ) : (
                    membersInRole.map((member) => (
                      <View key={member.id} style={[styles.inlineRow, { gap: 8, alignItems: 'center', paddingVertical: 4 }]}>
                        <Text style={{ fontSize: 15 }}>{member.isSuperAdmin ? '👑' : '👤'}</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.listTitle, { fontSize: 12 }]}>
                            {member.fullName}{member.id === currentUser?.id ? '  (you)' : ''}
                          </Text>
                          <Text style={[styles.metaText, { marginTop: 0 }]}>{member.email}</Text>
                        </View>
                        {member.isSuperAdmin && <Text style={{ fontSize: 11, color: '#E8C96A', fontWeight: '700' }}>Super Admin</Text>}
                      </View>
                    ))
                  )}
                </View>
                <View style={styles.inlineRow}>
              <Pressable
                disabled={!canManageWorkspace}
                style={[styles.pill, workspaceScope === 'all' && styles.pillActive, !canManageWorkspace && styles.buttonDisabled]}
                onPress={() => setWorkspaceScope('all')}
              >
                <Text style={[styles.pillText, workspaceScope === 'all' && styles.pillTextActive]}>All Workspaces</Text>
              </Pressable>
              <Pressable
                disabled={!canManageWorkspace}
                style={[styles.pill, workspaceScope === 'selected' && styles.pillActive, !canManageWorkspace && styles.buttonDisabled]}
                onPress={() => setWorkspaceScope('selected')}
              >
                <Text style={[styles.pillText, workspaceScope === 'selected' && styles.pillTextActive]}>Selected Workspaces</Text>
              </Pressable>
                </View>

                {workspaceScope === 'selected' && (
                  <View style={styles.inlineRow}>
                {policyWorkspaces.map((workspaceItem) => {
                  const selected = workspaceIds.includes(workspaceItem.id);
                  return (
                    <Pressable
                      key={workspaceItem.id}
                      disabled={!canManageWorkspace}
                      style={[styles.pill, selected && styles.pillActive, !canManageWorkspace && styles.buttonDisabled]}
                      onPress={() => toggleWorkspace(workspaceItem.id)}
                    >
                      <Text style={[styles.pillText, selected && styles.pillTextActive]}>{workspaceItem.name}</Text>
                    </Pressable>
                  );
                })}
                  </View>
                )}

                <View style={styles.inlineRow}>
                  <Pressable disabled={!canManageWorkspace} style={[styles.primaryButton, !canManageWorkspace && styles.buttonDisabled]} onPress={() => { saveRole(); auditLog?.logEntry({ action: 'update', entityType: 'role', entityId: selectedRoleId ?? 'new', entityName: roleName || newRoleName || 'Unnamed Role', after: { detail: 'Saved role policy (template)' } }); addNotification?.({ type: 'system', title: 'Role Saved', body: `Role "${roleName || newRoleName || 'Unnamed Role'}" permissions have been saved.`, severity: 'success' }); }}>
                    <Text style={styles.primaryButtonText}>Save Role</Text>
                  </Pressable>
                  <Pressable disabled={!canManageWorkspace} style={[styles.secondaryButton, !canManageWorkspace && styles.buttonDisabled]} onPress={() => { removeRole(); auditLog?.logEntry({ action: 'delete', entityType: 'role', entityId: selectedRoleId ?? '', entityName: roleName || 'Unnamed Role', after: { detail: 'Deleted role (template)' } }); addNotification?.({ type: 'system', title: 'Role Deleted', body: `Role "${roleName || 'Unnamed Role'}" has been removed.`, severity: 'warning' }); }}>
                    <Text style={styles.secondaryButtonText}>Delete Role</Text>
                  </Pressable>
                </View>
              </>
            )}
          </>
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
              background: 'linear-gradient(168deg, #1A1230 0%, #120C23 100%)',
              border: '1px solid rgba(140, 91, 245, 0.35)',
              borderRadius: 14,
              boxShadow: '0 8px 40px rgba(140, 91, 245, 0.18), 0 2px 12px rgba(0,0,0,0.4)',
              padding: '22px 24px 18px',
              color: '#F1E8FF',
              fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
            }}>
              {/* Step badge */}
              <span style={{
                display: 'inline-block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const,
                letterSpacing: 1.2, color: '#E878F6',
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
              <p style={{ margin: '0 0 12px', fontSize: 12, lineHeight: 1.5, color: '#E878F6' }}>
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
                        ? 'linear-gradient(135deg, #8C5BF5, #E878F6)'
                        : completedWalkthroughStepIds.includes(adminWalkthroughSteps[i].id)
                          ? 'rgba(140, 91, 245, 0.5)'
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
                    background: 'rgba(255,255,255,0.08)', color: '#F1E8FF',
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
                      cursor: 'pointer', background: 'linear-gradient(135deg, #8C5BF5, #E878F6)', color: '#fff',
                    }}
                  >
                    Finish
                  </button>
                ) : (
                  <button
                    onClick={() => goToWalkthroughStep(walkthroughIndex + 1)}
                    style={{
                      border: 'none', borderRadius: 8, padding: '8px 20px', fontSize: 12, fontWeight: 600,
                      cursor: 'pointer', background: 'linear-gradient(135deg, #8C5BF5, #E878F6)', color: '#fff',
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
            background: 'linear-gradient(135deg, #8C5BF5, #E878F6)', color: '#fff',
            borderRadius: 28, padding: '10px 20px', fontSize: 13, fontWeight: 600,
            cursor: 'pointer', boxShadow: '0 4px 20px rgba(140, 91, 245, 0.35)',
          }}
        >
          Resume Walkthrough ({walkthroughIndex + 1}/{adminWalkthroughSteps.length})
        </div>
      )}

      {aiPanelOpen && (
        <AiChatPanel
          session={aiWs.session}
          isThinking={aiWs.isThinking}
          onSend={aiWs.sendMessage}
          onApply={aiWs.proposal ? aiWs.applyProposal : undefined}
          onDiscard={aiWs.proposal ? aiWs.discardProposal : undefined}
          onClose={() => setAiPanelOpen(false)}
          hasProposal={!!aiWs.proposal}
          applyLabel="Apply Workspace"
          discardLabel="Discard"
          title="Bebo Workspace Builder"
        />
      )}
    </>
  );
}
