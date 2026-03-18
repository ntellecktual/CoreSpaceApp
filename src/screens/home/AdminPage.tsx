import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, ScrollView, Text, View, useWindowDimensions } from 'react-native';
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
    toggleWorkspaceFieldRequired,
    toggleBuilderFieldRequired,
    updateSelectedSubSpace,
  } = useAdminWorkspace();
  const insights = useAdminEnterpriseInsights(workspace);
  const { activeTenantId, data, isSuperAdmin, tenants, copyActiveDataToAllTenants, getFormForSubSpace, upsertBusinessFunction, deleteBusinessFunction, upsertBusinessObject, deleteBusinessObject } = useAppState();
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
      description: 'Define business functions and objects — the layer above workspaces that organises your whole operation.',
      items: [
        { label: 'Functions & Objects', detail: 'Build and manage your business hierarchy', onPress: () => setAdminTab('architecture') },
        { label: 'Architecture Terminology', detail: 'Rename functions, objects, and collections', onPress: () => { setAdminTab('shell'); setShellPane('labels'); } },
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
    if (adminTab === 'architecture') return 'Functions & Objects';
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
      description: `Define ${data.shellConfig.functionLabelPlural ?? 'Functions'} and ${data.shellConfig.objectLabelPlural ?? 'Objects'} — the layer above workspaces that maps your entire operation before any records are created.`,
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

  useEffect(() => {
    if (isCreatingWorkspace) {
      setShowCreateModeBanner(true);
    }
  }, [isCreatingWorkspace]);

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
                    toggleAdminSection(section.key);
                    if (!isSectionActive) {
                      section.items[0]?.onPress();
                    }
                  }}
                >
                  <Text style={styles.adminNavSectionHeaderLabel}>{section.label}</Text>
                  <Text style={styles.adminNavSectionChevron}>{isExpanded ? '▾' : '▸'}</Text>
                </Pressable>
                {isExpanded && (
                  <>
                    <Text style={styles.adminNavSectionDescription}>{section.description}</Text>
                    {section.items.map((item) => {
                      const isActive = activeNavItemKey === item.label;
                      return (
                        <Pressable
                          key={item.label}
                          style={[styles.adminNavItem, isActive && styles.adminNavItemActive]}
                          onPress={item.onPress}
                        >
                          <Text style={[styles.adminNavItemLabel, isActive && styles.adminNavItemLabelActive]}>{item.label}</Text>
                          {!!item.detail && <Text style={styles.adminNavItemDetail}>{item.detail}</Text>}
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
        {isCreatingWorkspace && showCreateModeBanner && (
          <View style={styles.builderCreateModeBanner}>
            <View style={styles.builderCreateModeBannerRow}>
              <Text style={styles.builderCreateModeBannerText}>You are in Create Mode</Text>
              <Pressable style={styles.builderCreateModeBannerClose} onPress={() => setShowCreateModeBanner(false)}>
                <Text style={styles.builderCreateModeBannerCloseText}>Dismiss</Text>
              </Pressable>
            </View>
          </View>
        )}

        <View style={styles.builderHeaderRow}>
          <View style={styles.builderHeaderMeta}>
            <Text style={styles.bodyText}>Start with the core entity your team tracks, then branch into SubSpaces for each operational lane. The preview on the right shows what end users will see.</Text>
            <Text style={styles.metaText}>Tip: Keep names short and team-friendly. Rename anything later without breaking your setup.</Text>
          </View>
          <Pressable style={styles.secondaryButton} onPress={() => setWorkspaceBuilderPanelOpen((current) => !current)}>
            <Text style={styles.secondaryButtonText}>{workspaceBuilderPanelOpen ? 'Collapse Builder' : 'Open Builder'}</Text>
          </Pressable>
        </View>

        <View style={styles.builderStepRail}>
          {builderStepRail.map((step, index) => {
            const isCurrent = builderStep === step.key;
            const isComplete = step.complete;

            return (
              <Pressable
                key={`builder-step-${step.key}`}
                style={[
                  styles.builderStepItem,
                  isCurrent && styles.builderStepItemCurrent,
                  isComplete && styles.builderStepItemComplete,
                ]}
                onPress={() => goToBuilderStep(step.key)}
              >
                <View
                  style={[
                    styles.builderStepBullet,
                    styles.builderStepBulletPending,
                    isComplete && styles.builderStepBulletComplete,
                    isCurrent && styles.builderStepBulletCurrent,
                  ]}
                />
                <Text style={[styles.builderStepText, isCurrent && styles.builderStepTextCurrent, isComplete && styles.builderStepTextComplete]}>
                  {index + 1}. {step.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.builderLayout}>
          {workspaceBuilderPanelOpen && (
            <View style={styles.builderConfigPane}>
              <View style={styles.inlineRow}>
                <Pressable style={[styles.pill, workspacePane === 'workspace' && styles.pillActive]} onPress={() => setWorkspacePane('workspace')}>
                  <Text style={[styles.pillText, workspacePane === 'workspace' && styles.pillTextActive]}>1. Configure Workspace</Text>
                </Pressable>
                <Pressable style={[styles.pill, workspacePane === 'subspaces' && styles.pillActive]} onPress={() => setWorkspacePane('subspaces')}>
                  <Text style={[styles.pillText, workspacePane === 'subspaces' && styles.pillTextActive]}>2. SubSpace Lanes & Fields</Text>
                </Pressable>
              </View>

              {workspacePane === 'workspace' && (
                <>
                  {!canManageWorkspace && <Text style={styles.notice}>{deniedMessage('workspace.manage')}</Text>}

                  {/* ── Empty-state hero: first visit, no workspaces ── */}
                  {workspaces.length === 0 && canManageWorkspace && (
                    <View style={{
                      backgroundColor: mode === 'night' ? 'rgba(140,91,245,0.07)' : 'rgba(140,91,245,0.05)',
                      borderRadius: 14,
                      padding: 24,
                      marginBottom: 16,
                      borderWidth: 1,
                      borderColor: 'rgba(140,91,245,0.22)',
                      gap: 16,
                    }}>
                      <View style={{ alignItems: 'center', gap: 8 }}>
                        <Text style={{ fontSize: 36 }}>🏗️</Text>
                        <Text style={{ color: mode === 'night' ? '#E8E4FF' : '#1a1030', fontSize: 18, fontWeight: '800', textAlign: 'center' }}>
                          Build your first workspace
                        </Text>
                        <Text style={{ color: mode === 'night' ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.55)', fontSize: 13, textAlign: 'center', maxWidth: 480, lineHeight: 20 }}>
                          Load a pre-built template to get up and running in seconds — complete with SubSpaces, records, Signal flows, and business architecture. Or start from scratch.
                        </Text>
                      </View>
                      <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' as any }}>
                        {/* DSCSA template card */}
                        <Pressable
                          nativeID="wt-load-template"
                          style={{
                            flex: 1, minWidth: 220,
                            backgroundColor: mode === 'night' ? 'rgba(140,91,245,0.14)' : 'rgba(140,91,245,0.08)',
                            borderRadius: 12, padding: 16, gap: 10,
                            borderWidth: 1, borderColor: 'rgba(140,91,245,0.30)',
                          }}
                          onPress={() => {
                            applyDscsaSerializationTemplate();
                            auditLog?.logEntry({ action: 'import', entityType: 'workspace', entityId: 'template', entityName: 'DSCSA Serialization Template', after: { template: 'DSCSA', subSpaces: 8, records: 17, flows: 5 } });
                            addNotification?.({ type: 'system', title: 'Template Imported', body: 'DSCSA Serialization Template loaded with 8 subspaces, 17 records, and 5 flows.', severity: 'success' });
                          }}
                        >
                          <Text style={{ fontSize: 28 }}>💊</Text>
                          <Text style={{ color: mode === 'night' ? '#E8E4FF' : '#1a1030', fontWeight: '700', fontSize: 14 }}>DSCSA Pharma Serialization</Text>
                          <Text style={{ color: mode === 'night' ? 'rgba(255,255,255,0.50)' : 'rgba(0,0,0,0.50)', fontSize: 11, lineHeight: 17 }}>8 SubSpaces · 17 sample records · 5 automation flows · Full supply chain architecture</Text>
                          <View style={{ backgroundColor: '#8C5BF5', borderRadius: 8, paddingVertical: 9, alignItems: 'center' }}>
                            <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 12 }}>Load Template →</Text>
                          </View>
                        </Pressable>
                        {/* WRVAS template card */}
                        <Pressable
                          nativeID="wt-load-wrvas-template"
                          style={{
                            flex: 1, minWidth: 220,
                            backgroundColor: mode === 'night' ? 'rgba(59,130,246,0.10)' : 'rgba(59,130,246,0.06)',
                            borderRadius: 12, padding: 16, gap: 10,
                            borderWidth: 1, borderColor: 'rgba(59,130,246,0.28)',
                          }}
                          onPress={() => {
                            applyWrvasTemplate();
                            auditLog?.logEntry({ action: 'import', entityType: 'workspace', entityId: 'template', entityName: 'WRVAS Service Template', after: { template: 'WRVAS', subSpaces: 12, records: 22, flows: 5 } });
                            addNotification?.({ type: 'system', title: 'Template Imported', body: 'WRVAS Service Template loaded with 12 subspaces, 22 records, and 5 flows.', severity: 'success' });
                          }}
                        >
                          <Text style={{ fontSize: 28 }}>🖥️</Text>
                          <Text style={{ color: mode === 'night' ? '#E8E4FF' : '#1a1030', fontWeight: '700', fontSize: 14 }}>WRVAS Service Operations</Text>
                          <Text style={{ color: mode === 'night' ? 'rgba(255,255,255,0.50)' : 'rgba(0,0,0,0.50)', fontSize: 11, lineHeight: 17 }}>12 SubSpaces · 22 sample records · 5 automation flows · IT device service architecture</Text>
                          <View style={{ backgroundColor: '#3B82F6', borderRadius: 8, paddingVertical: 9, alignItems: 'center' }}>
                            <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 12 }}>Load Template →</Text>
                          </View>
                        </Pressable>
                      </View>
                      <Pressable onPress={beginCreateWorkspace} style={{ alignSelf: 'center' }}>
                        <Text style={{ color: mode === 'night' ? 'rgba(255,255,255,0.40)' : 'rgba(0,0,0,0.40)', fontSize: 12, textDecorationLine: 'underline' }}>Or start from scratch →</Text>
                      </Pressable>
                    </View>
                  )}

                  <View style={[styles.builderFormSection, useCompactBuilderSections && styles.builderFormSectionCompact]}>
                    <View
                      style={[
                        styles.builderFormSectionHeader,
                        !useCompactBuilderSections && styles.builderFormSectionHeaderRail,
                        useCompactBuilderSections && styles.builderFormSectionHeaderCompact,
                      ]}
                    >
                      <Text style={styles.builderFormSectionTitle}>Workspace Library</Text>
                      <Text style={styles.builderFormSectionText}>Choose an existing workspace or start a new one.</Text>
                    </View>
                    <View style={styles.builderFormSectionBody}>
                      <View style={styles.builderActionRow}>
                        <Pressable
                          disabled={!canManageWorkspace}
                          style={[styles.secondaryButton, !canManageWorkspace && styles.buttonDisabled]}
                          onPress={beginCreateWorkspace}
                        >
                          <Text style={styles.secondaryButtonText}>Create New Workspace</Text>
                        </Pressable>
                        <Pressable
                          nativeID="wt-load-template"
                          disabled={!canManageWorkspace}
                          style={[styles.secondaryButton, !canManageWorkspace && styles.buttonDisabled]}
                          onPress={() => { applyDscsaSerializationTemplate(); auditLog?.logEntry({ action: 'import', entityType: 'workspace', entityId: workspace?.id ?? 'template', entityName: 'DSCSA Serialization Template', after: { template: 'DSCSA', subSpaces: 8, records: 17, flows: 5 } }); addNotification?.({ type: 'system', title: 'Template Imported', body: 'DSCSA Serialization Template loaded with 8 subspaces, 17 records, and 5 flows.', severity: 'success' }); }}
                        >
                          <Text style={styles.secondaryButtonText}>Load DSCSA Serialization Template</Text>
                        </Pressable>
                        <Pressable
                          nativeID="wt-load-wrvas-template"
                          disabled={!canManageWorkspace}
                          style={[styles.secondaryButton, !canManageWorkspace && styles.buttonDisabled]}
                          onPress={() => { applyWrvasTemplate(); auditLog?.logEntry({ action: 'import', entityType: 'workspace', entityId: workspace?.id ?? 'template', entityName: 'WRVAS Service Template', after: { template: 'WRVAS', subSpaces: 12, records: 22, flows: 5 } }); addNotification?.({ type: 'system', title: 'Template Imported', body: 'WRVAS Service Template loaded with 12 subspaces, 22 records, and 5 flows.', severity: 'success' }); }}
                        >
                          <Text style={styles.secondaryButtonText}>Load WRVAS Service Template</Text>
                        </Pressable>
                        {isSuperAdmin && tenants.length > 1 && (
                          <Pressable
                            nativeID="wt-seed-all-tenants"
                            style={[styles.secondaryButton, { borderColor: '#8C5BF5' }]}
                            onPress={() => {
                              const result = copyActiveDataToAllTenants();
                              if (result.ok) {
                                addNotification?.({ type: 'system', title: 'All Tenants Seeded', body: `Current workspace data copied to ${result.count} other tenant${result.count === 1 ? '' : 's'}.`, severity: 'success' });
                                auditLog?.logEntry({ action: 'import', entityType: 'workspace', entityId: 'all-tenants', entityName: 'Seed All Tenants', after: { detail: `Copied active tenant data to ${result.count} tenants` } });
                              } else {
                                addNotification?.({ type: 'system', title: 'Seed Failed', body: result.reason ?? 'Unable to seed tenants.', severity: 'warning' });
                              }
                            }}
                          >
                            <Text style={[styles.secondaryButtonText, { color: '#8C5BF5' }]}>⬆ Seed Current Data → All Tenants</Text>
                          </Pressable>
                        )}
                      </View>
                      <View style={styles.builderActionRow}>
                        {workspaces.map((item) => (
                          <Pressable key={item.id} style={[styles.pill, selectedWorkspaceId === item.id && styles.pillActive]} onPress={() => setSelectedWorkspaceId(item.id)}>
                            <Text style={[styles.pillText, selectedWorkspaceId === item.id && styles.pillTextActive]}>{item.name}</Text>
                          </Pressable>
                        ))}
                      </View>
                    </View>
                  </View>

                  {isCreatingWorkspace ? (
                    <View style={[styles.builderFormSection, useCompactBuilderSections && styles.builderFormSectionCompact]}>
                      <View
                        style={[
                          styles.builderFormSectionHeader,
                          !useCompactBuilderSections && styles.builderFormSectionHeaderRail,
                          useCompactBuilderSections && styles.builderFormSectionHeaderCompact,
                        ]}
                      >
                        <Text style={styles.builderFormSectionTitle}>Create Workspace</Text>
                        <Text style={styles.builderFormSectionText}>You are making a new workspace. Think of it like one dashboard for one team job.</Text>
                      </View>
                      <View style={styles.builderFormSectionBody}>
                        <LabeledInput label="Workspace Name" helperText="Name your dashboard so your team knows what this workspace is for." value={workspaceName} onChangeText={setWorkspaceName} placeholder="Example: Manufacturer Tracking" />
                        <LabeledInput label="Root Entity" helperText="What is the main thing you want to track in this workspace?" value={rootEntity} onChangeText={setRootEntity} placeholder="Example: Batch" />
                        <LabeledInput label="Route" helperText="This becomes part of the page link. Use lowercase words with dashes." value={route} onChangeText={setRoute} placeholder="Example: manufacturer-tracking" />

                        <Pressable nativeID="wt-create-workspace" disabled={!canManageWorkspace} style={[styles.primaryButton, !canManageWorkspace && styles.buttonDisabled]} onPress={() => { saveWorkspace(); auditLog?.logEntry({ action: 'create', entityType: 'workspace', entityId: workspace?.id ?? '', entityName: workspaceName.trim() || 'Untitled Workspace', after: { name: workspaceName.trim(), rootEntity: rootEntity.trim(), route: route.trim() } }); addNotification?.({ type: 'system', title: 'Workspace Created', body: `Workspace "${workspaceName.trim() || 'Untitled Workspace'}" has been created.`, severity: 'success' }); }}>
                          <Text style={styles.primaryButtonText}>Create Workspace</Text>
                        </Pressable>
                      </View>
                    </View>
                  ) : hasWorkspace ? (
                    <View style={[styles.builderFormSection, useCompactBuilderSections && styles.builderFormSectionCompact]}>
                      <View
                        style={[
                          styles.builderFormSectionHeader,
                          !useCompactBuilderSections && styles.builderFormSectionHeaderRail,
                          useCompactBuilderSections && styles.builderFormSectionHeaderCompact,
                        ]}
                      >
                        <Text style={styles.builderFormSectionTitle}>Edit Workspace</Text>
                        <Text style={styles.builderFormSectionText}>Update the name, tracked item, or page link for this workspace.</Text>
                      </View>
                      <View style={styles.builderFormSectionBody}>
                        <LabeledInput label="Workspace Name" helperText="Give this workspace a clear name your team will recognize." value={workspaceName} onChangeText={setWorkspaceName} placeholder="Example: Manufacturer Tracking" />
                        <LabeledInput label="Root Entity" helperText="Main thing tracked here (for example: Batch or Shipment)." value={rootEntity} onChangeText={setRootEntity} placeholder="Example: Batch" />
                        <LabeledInput label="Route" helperText="Page link text. Keep it short, lowercase, and use dashes." value={route} onChangeText={setRoute} placeholder="Example: manufacturer-tracking" />
                        <View style={styles.builderActionRow}>
                          <Pressable disabled={!canManageWorkspace} style={[styles.primaryButton, !canManageWorkspace && styles.buttonDisabled]} onPress={() => { saveWorkspace(); auditLog?.logEntry({ action: 'update', entityType: 'workspace', entityId: workspace?.id ?? '', entityName: workspaceName.trim() || workspace?.name || 'Workspace', after: { name: workspaceName.trim(), rootEntity: rootEntity.trim(), route: route.trim() } }); addNotification?.({ type: 'system', title: 'Workspace Saved', body: `Workspace "${workspaceName.trim() || workspace?.name || 'Workspace'}" has been updated.`, severity: 'success' }); }}>
                            <Text style={styles.primaryButtonText}>Save Workspace</Text>
                          </Pressable>
                          <Pressable disabled={!canManageWorkspace} style={[styles.secondaryButton, !canManageWorkspace && styles.buttonDisabled]} onPress={() => { if (workspace) { auditLog?.logEntry({ action: 'delete', entityType: 'workspace', entityId: workspace.id, entityName: workspace.name }); addNotification?.({ type: 'system', title: 'Workspace Deleted', body: `Workspace "${workspace.name}" has been deleted.`, severity: 'warning' }); removeWorkspace(workspace.id); } }}>
                            <Text style={styles.secondaryButtonText}>Delete Workspace</Text>
                          </Pressable>
                        </View>
                      </View>
                    </View>
                  ) : (
                    <Text style={styles.metaText}>Click Create New Workspace to make your first dashboard.</Text>
                  )}

                  {!!workspace && (
                    <>
                      <View style={styles.separator} />
                      <View style={[styles.builderFormSection, useCompactBuilderSections && styles.builderFormSectionCompact]}>
                        <View
                          style={[
                            styles.builderFormSectionHeader,
                            !useCompactBuilderSections && styles.builderFormSectionHeaderRail,
                            useCompactBuilderSections && styles.builderFormSectionHeaderCompact,
                          ]}
                        >
                          <Text style={styles.builderFormSectionTitle}>Workspace Core Fields</Text>
                          <Text style={styles.builderFormSectionText}>Drag to reorder. These fields apply at the workspace level.</Text>
                        </View>
                        <View style={styles.builderFormSectionBody}>
                          {/* Add field input + grouped palette */}
                          <LabeledInput
                            label="New Workspace Field Name"
                            helperText="Example: Planned Build Quantity"
                            value={newBuilderFieldLabel}
                            onChangeText={setNewBuilderFieldLabel}
                            placeholder="Type the field name before adding"
                          />
                          {(['Core', 'Choice', 'Contact', 'Files'] as const).map((groupName) => {
                            const groupItems = fieldPalette.filter((item) => item.group === groupName);
                            if (groupItems.length === 0) return null;
                            return (
                              <View key={`ws-group-${groupName}`} style={{ gap: 4 }}>
                                <Text style={[styles.metaText, styles.builderStudioTextSecondary, { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 }]}>{groupName}</Text>
                                <View style={styles.builderActionRow}>
                                  {groupItems.map((paletteItem) => (
                                    <Pressable
                                      key={`workspace-palette-${paletteItem.type}`}
                                      disabled={!canManageWorkspace || !workspace}
                                      style={[styles.secondaryButton, (!canManageWorkspace || !workspace) && styles.buttonDisabled, { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 }]}
                                      onPress={() => addBuilderFieldToWorkspace(paletteItem.type)}
                                    >
                                      <Text style={styles.secondaryButtonText}>{fieldTypeIcons[paletteItem.type]} {paletteItem.label}</Text>
                                    </Pressable>
                                  ))}
                                </View>
                              </View>
                            );
                          })}

                          {/* Drag-and-drop field list */}
                          {workspaceBuilderFields.length === 0 ? (
                            <View style={[styles.builderDropZone, { alignItems: 'center', paddingVertical: 24 }]}>
                              <Text style={[styles.metaText, styles.builderStudioTextSecondary, { fontSize: 13 }]}>No workspace core fields yet</Text>
                              <Text style={[styles.metaText, styles.builderStudioTextSecondary, { fontSize: 11 }]}>Click a field type above to add your first field</Text>
                            </View>
                          ) : isWeb ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                              {visualWsFields.map((field, visualIndex) => {
                                const originalIndex = workspaceBuilderFields.findIndex((f) => f.id === field.id);
                                return (
                                  <div
                                    key={field.id}
                                    draggable={canManageWorkspace}
                                    onDragStart={(e) => {
                                      e.dataTransfer.setData('text/plain', field.id);
                                      e.dataTransfer.effectAllowed = 'move';
                                      setWsDragFromIndex(originalIndex);
                                    }}
                                    onDragOver={(e) => {
                                      e.preventDefault();
                                      e.dataTransfer.dropEffect = 'move';
                                      if (wsDragFromIndex !== null) {
                                        setWsDragOverIndex(visualIndex);
                                      }
                                    }}
                                    onDrop={(e) => {
                                      e.preventDefault();
                                      if (wsDragFromIndex !== null && wsDragOverIndex !== null && wsDragFromIndex !== wsDragOverIndex) {
                                        reorderBuilderFieldInWorkspace(wsDragFromIndex, wsDragOverIndex);
                                      }
                                      setWsDragFromIndex(null);
                                      setWsDragOverIndex(null);
                                    }}
                                    onDragEnd={() => {
                                      setWsDragFromIndex(null);
                                      setWsDragOverIndex(null);
                                    }}
                                    style={{
                                      display: 'flex',
                                      flexDirection: 'row',
                                      flexWrap: 'wrap',
                                      alignItems: 'center',
                                      gap: 10,
                                      padding: 10,
                                      marginBottom: 6,
                                      borderRadius: 12,
                                      border: '1px solid rgba(255,255,255,0.10)',
                                      background: draggedWsFieldId === field.id
                                        ? 'rgba(167,139,250,0.12)'
                                        : 'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))',
                                      backdropFilter: 'blur(14px)',
                                      opacity: draggedWsFieldId === field.id ? 0.45 : 1,
                                      transition: 'transform 200ms ease, opacity 180ms ease, box-shadow 180ms ease',
                                      transform: draggedWsFieldId === field.id ? 'scale(0.97)' : 'scale(1)',
                                      boxShadow: (wsDragOverIndex === visualIndex && draggedWsFieldId && draggedWsFieldId !== field.id)
                                        ? '0 0 0 2px #A78BFA, 0 4px 16px rgba(167,139,250,0.25)'
                                        : 'none',
                                      cursor: canManageWorkspace ? 'grab' : 'default',
                                    }}
                                  >
                                    {/* Drag handle */}
                                    <span style={{ width: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, color: '#C4B5FD', userSelect: 'none' }}>⠿</span>

                                    {/* Type badge */}
                                    <span style={{
                                      width: 32, height: 32, borderRadius: 8,
                                      background: 'rgba(167,139,250,0.18)',
                                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                                      fontSize: 14, flexShrink: 0,
                                    }}>{fieldTypeIcons[field.type] ?? '?'}</span>

                                    {/* Field info */}
                                    <View style={{ flex: 1, gap: 1 }}>
                                      <Text style={[styles.listTitle, styles.builderStudioTextPrimary, { fontSize: 13, fontWeight: '700' }]}>{field.label}</Text>
                                      <Text style={[styles.metaText, styles.builderStudioTextSecondary, { fontSize: 11 }]}>{field.type}{field.required ? ' • Required' : ''}</Text>
                                    </View>

                                    {/* Actions */}
                                    <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}>
                                      <Pressable
                                        disabled={!canManageWorkspace}
                                        style={[
                                          {
                                            paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6,
                                            borderWidth: 1, borderColor: field.required ? 'rgba(167,139,250,0.5)' : 'rgba(255,255,255,0.12)',
                                            backgroundColor: field.required ? 'rgba(167,139,250,0.18)' : 'transparent',
                                          },
                                          !canManageWorkspace && styles.buttonDisabled,
                                        ]}
                                        onPress={() => toggleWorkspaceFieldRequired(field.id)}
                                      >
                                        <Text style={[styles.secondaryButtonText, { fontSize: 10, fontWeight: '700' }]}>{field.required ? '★ Required' : '☆ Optional'}</Text>
                                      </Pressable>
                                      <Pressable
                                        style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(167,139,250,0.35)', backgroundColor: signalHintFieldId === field.id ? 'rgba(167,139,250,0.18)' : 'transparent' }}
                                        onPress={() => setSignalHintFieldId(signalHintFieldId === field.id ? null : field.id)}
                                      >
                                        <Text style={[styles.secondaryButtonText, { fontSize: 10, color: '#A78BFA' }]}>⚡ Signal</Text>
                                      </Pressable>
                                      <Pressable
                                        disabled={!canManageWorkspace}
                                        style={[
                                          { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)', backgroundColor: 'rgba(239,68,68,0.08)' },
                                          !canManageWorkspace && styles.buttonDisabled,
                                        ]}
                                        onPress={() => removeBuilderFieldFromWorkspace(field.id)}
                                      >
                                        <Text style={[styles.secondaryButtonText, { fontSize: 10, color: '#EF4444' }]}>✕</Text>
                                      </Pressable>
                                    </View>
                                    {signalHintFieldId === field.id && (
                                      <div style={{ width: '100%', padding: '8px 12px 10px', marginTop: 4, borderRadius: 8, background: 'rgba(167,139,250,0.09)', border: '1px solid rgba(167,139,250,0.22)', display: 'flex', flexDirection: 'column', gap: 6 }}>
                                        <span style={{ fontSize: 12, fontWeight: 700, color: '#A78BFA' }}>⚡ Signal Studio Suggestion</span>
                                        <span style={{ fontSize: 12, color: '#C4B5FD', lineHeight: 1.5 }}>{buildSignalSuggestion(field.label, field.type)}</span>
                                        <span style={{ fontSize: 11, color: 'rgba(196,181,253,0.6)' }}>Navigate to Signal Studio → Build Flow to create this automation.</span>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <View style={{ gap: 6 }}>
                              {workspaceBuilderFields.map((field, index) => (
                                <React.Fragment key={field.id}>
                                <View style={[styles.builderPreviewFieldRow, { flexDirection: 'row', alignItems: 'center', gap: 10 }]}>
                                  <View style={{ width: 24, alignItems: 'center', justifyContent: 'center' }}>
                                    <Text style={[styles.builderStudioTextSecondary, { fontSize: 16, lineHeight: 20 }]}>⠿</Text>
                                  </View>
                                  <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: 'rgba(167,139,250,0.18)', alignItems: 'center', justifyContent: 'center' }}>
                                    <Text style={{ fontSize: 14 }}>{fieldTypeIcons[field.type] ?? '?'}</Text>
                                  </View>
                                  <View style={{ flex: 1, gap: 1 }}>
                                    <Text style={[styles.listTitle, styles.builderStudioTextPrimary, { fontSize: 13, fontWeight: '700' }]}>{field.label}</Text>
                                    <Text style={[styles.metaText, styles.builderStudioTextSecondary, { fontSize: 11 }]}>{field.type}{field.required ? ' • Required' : ''}</Text>
                                  </View>
                                  <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}>
                                    <Pressable disabled={!canManageWorkspace} style={[{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: field.required ? 'rgba(167,139,250,0.5)' : 'rgba(255,255,255,0.12)', backgroundColor: field.required ? 'rgba(167,139,250,0.18)' : 'transparent' }, !canManageWorkspace && styles.buttonDisabled]} onPress={() => toggleWorkspaceFieldRequired(field.id)}>
                                      <Text style={[styles.secondaryButtonText, { fontSize: 10, fontWeight: '700' }]}>{field.required ? '★ Required' : '☆ Optional'}</Text>
                                    </Pressable>
                                    <Pressable style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(167,139,250,0.35)', backgroundColor: signalHintFieldId === field.id ? 'rgba(167,139,250,0.18)' : 'transparent' }} onPress={() => setSignalHintFieldId(signalHintFieldId === field.id ? null : field.id)}>
                                      <Text style={{ fontSize: 10, color: '#A78BFA', fontWeight: '700' }}>⚡</Text>
                                    </Pressable>
                                    <Pressable disabled={!canManageWorkspace || index === 0} style={[styles.secondaryButton, { paddingHorizontal: 6, paddingVertical: 4 }, (!canManageWorkspace || index === 0) && styles.buttonDisabled]} onPress={() => moveBuilderFieldInWorkspace(field.id, 'up')}>
                                      <Text style={styles.secondaryButtonText}>↑</Text>
                                    </Pressable>
                                    <Pressable disabled={!canManageWorkspace || index === workspaceBuilderFields.length - 1} style={[styles.secondaryButton, { paddingHorizontal: 6, paddingVertical: 4 }, (!canManageWorkspace || index === workspaceBuilderFields.length - 1) && styles.buttonDisabled]} onPress={() => moveBuilderFieldInWorkspace(field.id, 'down')}>
                                      <Text style={styles.secondaryButtonText}>↓</Text>
                                    </Pressable>
                                    <Pressable disabled={!canManageWorkspace} style={[{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)', backgroundColor: 'rgba(239,68,68,0.08)' }, !canManageWorkspace && styles.buttonDisabled]} onPress={() => removeBuilderFieldFromWorkspace(field.id)}>
                                      <Text style={[styles.secondaryButtonText, { fontSize: 10, color: '#EF4444' }]}>✕</Text>
                                    </Pressable>
                                  </View>
                                </View>
                                {signalHintFieldId === field.id && (
                                  <View style={{ marginTop: 4, marginBottom: 4, padding: 10, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(167,139,250,0.25)', backgroundColor: 'rgba(167,139,250,0.08)', gap: 4 }}>
                                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#A78BFA' }}>⚡ Signal Studio Suggestion</Text>
                                    <Text style={{ fontSize: 11, color: '#C4B5FD', lineHeight: 17 }}>{buildSignalSuggestion(field.label, field.type)}</Text>
                                    <Text style={{ fontSize: 10, color: 'rgba(196,181,253,0.55)' }}>Go to Signal Studio → Build Flow to create this automation.</Text>
                                  </View>
                                )}
                                </React.Fragment>
                              ))}
                            </View>
                          )}

                          {/* Field count summary */}
                          {workspaceBuilderFields.length > 0 && (
                            <Text style={[styles.metaText, styles.builderStudioTextSecondary, { fontSize: 10, textAlign: 'right' }]}>
                              {workspaceBuilderFields.length} field{workspaceBuilderFields.length !== 1 ? 's' : ''} • {workspaceBuilderFields.filter((f) => f.required).length} required
                            </Text>
                          )}
                        </View>
                      </View>
                    </>
                  )}
                </>
              )}

              {workspacePane === 'subspaces' && (
                <>
                  {!canManageSubSpace && <Text style={styles.notice}>{deniedMessage('subspace.manage')}</Text>}
                  <View style={[styles.builderFormSection, useCompactBuilderSections && styles.builderFormSectionCompact]}>
                    <View
                      style={[
                        styles.builderFormSectionHeader,
                        !useCompactBuilderSections && styles.builderFormSectionHeaderRail,
                        useCompactBuilderSections && styles.builderFormSectionHeaderCompact,
                      ]}
                    >
                      <Text style={styles.builderFormSectionTitle}>SubSpace Lanes</Text>
                      <Text style={styles.builderFormSectionText}>Create lanes that branch from your core entity and define operational context.</Text>
                    </View>
                    <View style={styles.builderFormSectionBody}>
                      <LabeledInput label="New SubSpace Name" helperText="Operational lane around your core entity (example: Unit Serialization, Serial Verification, Dispense Logging)" value={newSubSpaceName} onChangeText={setNewSubSpaceName} placeholder="Example: Unit Serialization" />
                      <LabeledInput label="Source Entity" helperText="Data source for this lane (example: Serialized Unit, Verification Event, Dispense Event)" value={newSubSpaceEntity} onChangeText={setNewSubSpaceEntity} placeholder="Example: Serialized Unit" />
                      <Pressable nativeID="wt-add-subspace" disabled={!canManageSubSpace || !hasWorkspace} style={[styles.primaryButton, (!canManageSubSpace || !hasWorkspace) && styles.buttonDisabled]} onPress={() => { createSubSpace(); if (newSubSpaceName.trim()) { auditLog?.logEntry({ action: 'create', entityType: 'subspace', entityId: '', entityName: newSubSpaceName.trim(), after: { workspace: workspace?.name, sourceEntity: newSubSpaceEntity.trim() } }); addNotification?.({ type: 'system', title: 'SubSpace Created', body: `SubSpace "${newSubSpaceName.trim()}" added to workspace.`, severity: 'success' }); } }}>
                        <Text style={styles.primaryButtonText}>Add SubSpace</Text>
                      </Pressable>
                    </View>
                  </View>

                  <View style={styles.separator} />
                  <View nativeID="wt-field-palette" style={[styles.builderFormSection, useCompactBuilderSections && styles.builderFormSectionCompact]}>
                    <View
                      style={[
                        styles.builderFormSectionHeader,
                        !useCompactBuilderSections && styles.builderFormSectionHeaderRail,
                        useCompactBuilderSections && styles.builderFormSectionHeaderCompact,
                      ]}
                    >
                      <Text style={styles.builderFormSectionTitle}>Field Type Palette</Text>
                      <Text style={styles.builderFormSectionText}>Drag to the selected lane in preview on web, or click to add instantly.</Text>
                    </View>
                    <View style={styles.builderFormSectionBody}>
                      <LabeledInput
                        label="New Field Name"
                        helperText="Example: Carton Serial Number"
                        value={newBuilderFieldLabel}
                        onChangeText={setNewBuilderFieldLabel}
                        placeholder="Type the field name before adding"
                      />
                  {(['Core', 'Choice', 'Contact', 'Files'] as const).map((groupName) => {
                    const groupItems = fieldPalette.filter((item) => item.group === groupName);
                    if (groupItems.length === 0) {
                      return null;
                    }
                    return (
                      <View key={`group-${groupName}`} style={styles.listCard}>
                        <Text style={[styles.metaText, styles.builderStudioTextSecondary]}>{groupName} Fields</Text>
                        <View style={styles.builderActionRow}>
                          {groupItems.map((paletteItem) => (
                            <Pressable
                              key={`palette-${paletteItem.type}`}
                              disabled={!canManageSubSpace || !selectedSubSpace}
                              style={[styles.secondaryButton, (!canManageSubSpace || !selectedSubSpace) && styles.buttonDisabled]}
                              onPress={() => addBuilderFieldToSubSpace(paletteItem.type)}
                              onPressIn={() => setDraggedFieldType(paletteItem.type)}
                              {...(isWeb
                                ? ({
                                    draggable: true,
                                    onDragStart: (event: any) => {
                                      const dataTransfer = event?.nativeEvent?.dataTransfer ?? event?.dataTransfer;
                                      if (dataTransfer) {
                                        dataTransfer.setData('application/x-corespace-field-type', paletteItem.type);
                                        dataTransfer.effectAllowed = 'copy';
                                      }
                                      setDraggedFieldType(paletteItem.type);
                                    },
                                  } as any)
                                : {})}
                            >
                              <Text style={styles.secondaryButtonText}>+ {paletteItem.label}</Text>
                            </Pressable>
                          ))}
                        </View>
                      </View>
                    );
                  })}
                    </View>
                  </View>

                  {!!workspace && (workspace.subSpaces ?? []).map((subSpace) => (
                    <View key={subSpace.id} style={styles.listCard}>
                      <Text style={[styles.listTitle, styles.builderStudioTextPrimary]}>{subSpace.name}</Text>
                      <View style={styles.builderActionRow}>
                        <Pressable style={[styles.pill, selectedSubSpaceId === subSpace.id && styles.pillActive]} onPress={() => setSelectedSubSpaceId(subSpace.id)}>
                          <Text style={[styles.pillText, selectedSubSpaceId === subSpace.id && styles.pillTextActive]}>Select</Text>
                        </Pressable>
                        <Pressable disabled={!canManageSubSpace} style={[styles.secondaryButton, !canManageSubSpace && styles.buttonDisabled]} onPress={() => cycleDisplay(subSpace)}>
                          <Text style={styles.secondaryButtonText}>Display: {subSpace.displayType}</Text>
                        </Pressable>
                        <Pressable disabled={!canManageSubSpace} style={[styles.secondaryButton, !canManageSubSpace && styles.buttonDisabled]} onPress={() => toggleVisibility(subSpace)}>
                          <Text style={styles.secondaryButtonText}>Visibility: {subSpace.visibilityRule}</Text>
                        </Pressable>
                        <Pressable disabled={!canManageSubSpace} style={[styles.secondaryButton, !canManageSubSpace && styles.buttonDisabled]} onPress={() => { auditLog?.logEntry({ action: 'delete', entityType: 'subspace', entityId: subSpace.id, entityName: subSpace.name }); addNotification?.({ type: 'system', title: 'SubSpace Deleted', body: `SubSpace "${subSpace.name}" has been removed.`, severity: 'warning' }); removeSubSpace(subSpace.id); }}>
                          <Text style={styles.secondaryButtonText}>Delete SubSpace</Text>
                        </Pressable>
                      </View>
                    </View>
                  ))}
                </>
              )}
            </View>
          )}

          <View style={styles.builderPreviewPane}>
            <View style={styles.builderPreviewCard}>
              <Text style={[styles.sectionEyebrow, styles.builderStudioTextSecondary]}>Live Builder Canvas</Text>
              <Text style={[styles.listTitle, styles.builderStudioTextPrimary]}>End User Dashboard Preview</Text>
              {!workspace ? (
                <Text style={[styles.metaText, styles.builderStudioTextSecondary]}>Create your first workspace to start preview.</Text>
              ) : (
                <>
                  <View style={styles.builderPreviewHeroCard}>
                    <Text style={styles.builderPreviewHeroTitle}>{resolvedWorkspaceName}</Text>
                    <Text style={styles.builderPreviewHeroSubtitle}>Core Entity: {resolvedRootEntity}</Text>
                    <Text style={[styles.metaText, styles.builderStudioTextSecondary]}>Route: {route || workspace.route}</Text>
                    <Text style={[styles.metaText, styles.builderStudioTextSecondary]}>Auto-save is on. Changes save as you type.</Text>
                  </View>

                  <View style={styles.builderPreviewStatsRow}>
                    <View style={styles.builderPreviewStatCard}>
                      <Text style={styles.builderPreviewStatValue}>{workspaceSubSpaces.length}</Text>
                      <Text style={styles.builderPreviewStatLabel}>Operational SubSpaces</Text>
                    </View>
                    <View style={styles.builderPreviewStatCard}>
                      <Text style={styles.builderPreviewStatValue}>{workspaceBuilderFields.length}</Text>
                      <Text style={styles.builderPreviewStatLabel}>Workspace Core Fields</Text>
                    </View>
                    <View style={styles.builderPreviewStatCard}>
                      <Text style={styles.builderPreviewStatValue}>{totalBuilderFields}</Text>
                      <Text style={styles.builderPreviewStatLabel}>Tracked Data Fields</Text>
                    </View>
                    <View style={styles.builderPreviewStatCard}>
                      <Text style={styles.builderPreviewStatValue}>{totalRequiredBuilderFields}</Text>
                      <Text style={styles.builderPreviewStatLabel}>Required Data Controls</Text>
                    </View>
                  </View>

                  <View style={styles.separator} />
                  <Text style={[styles.metaText, styles.builderStudioTextSecondary]}>Workspace core fields</Text>
                  {workspaceBuilderFields.length === 0 ? (
                    <Text style={[styles.metaText, styles.builderStudioTextSecondary]}>No workspace-level fields configured yet.</Text>
                  ) : (
                    workspaceBuilderFields.map((field) => (
                      <View key={`preview-workspace-field-${field.id}`} style={[styles.builderPreviewFieldRow, { flexDirection: 'row', alignItems: 'center', gap: 8 }]}>
                        <View style={{ width: 28, height: 28, borderRadius: 7, backgroundColor: 'rgba(167,139,250,0.14)', alignItems: 'center', justifyContent: 'center' }}>
                          <Text style={{ fontSize: 13 }}>{fieldTypeIcons[field.type] ?? '?'}</Text>
                        </View>
                        <View style={[styles.builderPreviewFieldMeta, { flex: 1 }]}>
                          <Text style={[styles.listTitle, styles.builderStudioTextPrimary, { fontSize: 12, fontWeight: '700' }]}>{field.label}</Text>
                          <Text style={[styles.metaText, styles.builderStudioTextSecondary, { fontSize: 10 }]}>{field.type}{field.required ? ' • Required' : ''}</Text>
                        </View>
                      </View>
                    ))
                  )}

                  <View style={styles.separator} />
                  <Text style={[styles.metaText, styles.builderStudioTextSecondary]}>Operational lanes around your core entity</Text>
                  <View style={styles.inlineRow}>
                    {(workspace.subSpaces ?? []).map((subSpace) => (
                      <Pressable key={`preview-${subSpace.id}`} style={[styles.pill, selectedSubSpaceId === subSpace.id && styles.pillActive]} onPress={() => setSelectedSubSpaceId(subSpace.id)}>
                        <Text style={[styles.pillText, selectedSubSpaceId === subSpace.id && styles.pillTextActive]}>{subSpace.name}</Text>
                      </Pressable>
                    ))}
                  </View>

                  {selectedSubSpace ? (
                    <View style={styles.listCard}>
                      <Text style={[styles.listTitle, styles.builderStudioTextPrimary]}>{selectedSubSpace.name} lane</Text>
                      <Text style={[styles.metaText, styles.builderStudioTextSecondary]}>This lane branches from the core entity. Form Builder fields here generate the Details form for this SubSpace.</Text>
                      <LabeledInput
                        label="SubSpace Name"
                        helperText="Auto-saves"
                        value={selectedSubSpace.name}
                        onChangeText={(value) => updateSelectedSubSpace(selectedSubSpace.id, { name: value })}
                        placeholder="Example: Unit Serialization"
                      />
                      <LabeledInput
                        label="Source Entity"
                        helperText="Auto-saves"
                        value={selectedSubSpace.sourceEntity}
                        onChangeText={(value) => updateSelectedSubSpace(selectedSubSpace.id, { sourceEntity: value })}
                        placeholder="Example: Serialized Unit"
                      />
                      <LabeledInput
                        label="Relationship Rule"
                        helperText="Auto-saves"
                        value={selectedSubSpace.relationship ?? ''}
                        onChangeText={(value) => updateSelectedSubSpace(selectedSubSpace.id, { relationship: value })}
                        placeholder="Example: SerializedUnit.BatchId = SerializedBatch.Id"
                      />
                      <Text style={[styles.metaText, styles.builderStudioTextSecondary]}>Drop zone for fields:</Text>
                      <View
                        style={[styles.builderDropZone, (!canManageSubSpace || !selectedSubSpace) && styles.buttonDisabled]}
                        {...(isWeb
                          ? ({
                              onDragOver: (event: any) => {
                                event.preventDefault();
                              },
                              onDrop: (event: any) => {
                                event.preventDefault();
                                const dataTransfer = event?.nativeEvent?.dataTransfer ?? event?.dataTransfer;
                                const droppedType = dataTransfer?.getData?.('application/x-corespace-field-type');
                                tryAddDroppedField(droppedType || draggedFieldType);
                                setDraggedFieldType(null);
                              },
                            } as any)
                          : {})}
                      >
                        <Text style={[styles.metaText, styles.builderStudioTextSecondary]}>Drop field here to add to {selectedSubSpace.name}</Text>
                        {!!draggedFieldType && (
                          <View style={styles.inlineRow}>
                            <Pressable
                              disabled={!canManageSubSpace}
                              style={[styles.secondaryButton, !canManageSubSpace && styles.buttonDisabled]}
                              onPress={() => {
                                tryAddDroppedField(draggedFieldType);
                                setDraggedFieldType(null);
                              }}
                            >
                              <Text style={styles.secondaryButtonText}>Add Selected: {draggedFieldType}</Text>
                            </Pressable>
                            <Pressable style={styles.secondaryButton} onPress={() => setDraggedFieldType(null)}>
                              <Text style={styles.secondaryButtonText}>Clear</Text>
                            </Pressable>
                          </View>
                        )}
                      </View>

                      <View style={styles.separator} />
                      <Text style={[styles.listTitle, styles.builderStudioTextPrimary]}>Subspace Details Form (Preview)</Text>
                      <Text style={[styles.metaText, styles.builderStudioTextSecondary]}>This is the generated form layout end users see for this SubSpace.</Text>
                      {(selectedSubSpace.builderFields ?? []).length === 0 ? (
                        <View style={styles.builderDetailsFormPanel}>
                          <Text style={[styles.metaText, styles.builderStudioTextSecondary]}>Add Form Builder fields to generate the Details form preview.</Text>
                        </View>
                      ) : (
                        <View style={[styles.builderDetailsFormPanel, useTwoColumnDetailsForm && styles.builderDetailsFormPanelWide]}>
                          {(selectedSubSpace.builderFields ?? []).map((field) => (
                            <View
                              key={`details-form-${field.id}`}
                              style={[
                                styles.builderDetailsFormRow,
                                useTwoColumnDetailsForm && field.type !== 'longText' && styles.builderDetailsFormRowHalf,
                              ]}
                            >
                              <Text style={styles.builderDetailsFormLabel}>
                                {field.label}
                                {field.required ? ' *' : ''}
                              </Text>
                              <View style={[styles.builderDetailsFormInput, field.type === 'longText' && styles.builderDetailsFormInputMulti]}>
                                <Text style={styles.builderDetailsFormInputText}>{getDetailsFieldPlaceholder(field.type)}</Text>
                              </View>
                              <Text style={styles.builderDetailsFormType}>Type: {field.type}</Text>
                            </View>
                          ))}
                        </View>
                      )}

                      {(selectedSubSpace.builderFields ?? []).length === 0 ? (
                        <Text style={[styles.metaText, styles.builderStudioTextSecondary]}>No data fields yet. Add fields to define what end users must capture in this lane.</Text>
                      ) : (
                        (selectedSubSpace.builderFields ?? []).map((field, fieldIndex) => (
                          <View key={field.id} style={styles.builderPreviewFieldRow}>
                            <View style={styles.builderPreviewFieldMeta}>
                              <Text style={[styles.listTitle, styles.builderStudioTextPrimary]}>{field.label}</Text>
                              <Text style={[styles.metaText, styles.builderStudioTextSecondary]}>Type: {field.type} • Required: {field.required ? 'Yes' : 'No'}</Text>
                            </View>
                            <View style={styles.inlineRow}>
                              <Pressable disabled={!canManageSubSpace || fieldIndex === 0} style={[styles.secondaryButton, (!canManageSubSpace || fieldIndex === 0) && styles.buttonDisabled]} onPress={() => moveBuilderFieldInSubSpace(field.id, 'up')}>
                                <Text style={styles.secondaryButtonText}>▲</Text>
                              </Pressable>
                              <Pressable disabled={!canManageSubSpace || fieldIndex === (selectedSubSpace.builderFields ?? []).length - 1} style={[styles.secondaryButton, (!canManageSubSpace || fieldIndex === (selectedSubSpace.builderFields ?? []).length - 1) && styles.buttonDisabled]} onPress={() => moveBuilderFieldInSubSpace(field.id, 'down')}>
                                <Text style={styles.secondaryButtonText}>▼</Text>
                              </Pressable>
                              <Pressable disabled={!canManageSubSpace} style={[styles.secondaryButton, !canManageSubSpace && styles.buttonDisabled]} onPress={() => toggleBuilderFieldRequired(field.id)}>
                                <Text style={styles.secondaryButtonText}>Required: {field.required ? 'Yes' : 'No'}</Text>
                              </Pressable>
                              <Pressable disabled={!canManageSubSpace} style={[styles.secondaryButton, !canManageSubSpace && styles.buttonDisabled]} onPress={() => removeBuilderFieldFromSubSpace(field.id)}>
                                <Text style={styles.secondaryButtonText}>Remove Field</Text>
                              </Pressable>
                            </View>
                          </View>
                        ))
                      )}
                    </View>
                  ) : (
                    <Text style={styles.metaText}>Select a SubSpace to view and assign fields.</Text>
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
                { icon: '🏢', label: data.shellConfig.functionLabel ?? 'Function', desc: 'A major division of your business (e.g. Supply Chain, Finance, Service Ops)', color: '#8C5BF5' },
                { icon: '📦', label: data.shellConfig.objectLabel ?? 'Object', desc: `What each ${data.shellConfig.functionLabel ?? 'Function'} manages (e.g. Drug Inventory, Device Inventory, Policy Book)`, color: '#3B82F6' },
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
                { step: '1', title: `Define ${data.shellConfig.functionLabelPlural ?? 'Functions'}`, detail: `Name the major areas of your business. Example: "Supply Chain & Regulatory", "Service Operations", "Finance"`, color: '#8C5BF5' },
                { step: '2', title: `Add ${data.shellConfig.objectLabelPlural ?? 'Objects'}`, detail: `Under each ${data.shellConfig.functionLabel ?? 'Function'}, define what it tracks. Example: "Drug Inventory" under Supply Chain, "Device Inventory" under Service Ops`, color: '#3B82F6' },
                { step: '3', title: 'Link Workspaces', detail: `Tap each ${data.shellConfig.objectLabel ?? 'Object'} to connect it to the workspaces that process it. This powers the End User navigation and filtering.`, color: '#10B981' },
                { step: '4', title: 'Set Terminology (Optional)', detail: `Go to App Terminology to rename ${data.shellConfig.functionLabel ?? 'Function'}, ${data.shellConfig.objectLabel ?? 'Object'}, and ${data.shellConfig.collectionLabel ?? 'Batch'} to match your industry.`, color: '#F59E0B' },
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
              <Text style={styles.metaText}>One click loads a complete business architecture with Functions, Objects, and terminology pre-configured for your industry.</Text>
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
                  {` ${(data.businessFunctions?.length ?? 0) === 1 ? (data.shellConfig.functionLabel ?? 'Function') : (data.shellConfig.functionLabelPlural ?? 'Functions')}`}
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
                {`Hierarchy: ${data.shellConfig.functionLabel ?? 'Function'} → ${data.shellConfig.objectLabel ?? 'Object'} → ${data.shellConfig.collectionLabel ?? 'Batch'} → Workspace → SubSpace → Record`}
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
                  <LabeledInput label="Description (optional)" value={newFnDesc} onChangeText={setNewFnDesc} placeholder="What this function covers" />
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
            <Text style={styles.listTitle}>New {data.shellConfig.functionLabel ?? 'Function'}</Text>
            <LabeledInput label="Name" value={newFnName} onChangeText={setNewFnName} placeholder="e.g. Finance" />
            <LabeledInput label="Icon (emoji)" value={newFnIcon} onChangeText={setNewFnIcon} placeholder="💰" />
            <LabeledInput label="Accent Color (hex)" value={newFnColor} onChangeText={setNewFnColor} placeholder="#8C5BF5" />
            <LabeledInput label="Description (optional)" value={newFnDesc} onChangeText={setNewFnDesc} placeholder="What this function covers" />
            <View style={styles.inlineRow}>
              <Pressable style={styles.secondaryButton} onPress={() => {
                if (!newFnName.trim()) return;
                const id = `bfn-${newFnName.trim().toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;
                const order = (data.businessFunctions ?? []).length;
                upsertBusinessFunction({ id, name: newFnName.trim(), icon: newFnIcon.trim() || undefined, color: newFnColor.trim() || '#8C5BF5', description: newFnDesc.trim() || undefined, order, objects: [] });
                setNewFnName(''); setNewFnIcon(''); setNewFnColor('#8C5BF5'); setNewFnDesc('');
                setEditingFunctionId(null);
              }}>
                <Text style={styles.secondaryButtonText}>Add {data.shellConfig.functionLabel ?? 'Function'}</Text>
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
            <Text style={styles.secondaryButtonText}>+ Add {data.shellConfig.functionLabel ?? 'Function'}</Text>
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
            <LabeledInput label={`${data.shellConfig.functionLabel ?? 'Function'} (one)`} helperText="How do you call one top-level business division?" value={functionLabel} onChangeText={setFunctionLabel} placeholder="Function" />
            <LabeledInput label={`${data.shellConfig.functionLabel ?? 'Function'} (many)`} helperText="Plural version" value={functionLabelPlural} onChangeText={setFunctionLabelPlural} placeholder="Functions" />
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
        {!canManageWorkspace && <Text style={styles.notice}>{deniedMessage('workspace.manage')}</Text>}

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
