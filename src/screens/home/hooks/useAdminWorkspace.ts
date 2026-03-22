import { useEffect, useMemo, useState } from 'react';
import { useAppState } from '../../../context/AppStateContext';
import { DisplayType, SubSpaceBuilderField, SubSpaceBuilderFieldType, SubSpaceDefinition, VisibilityRule, WorkspaceDefinition } from '../../../types';
import { useRbac } from './useRbac';
import { getRecordPlaceholderImage } from '../../../data/pipelineConfig';

const displayOrder: DisplayType[] = ['grid', 'split', 'timeline', 'summary'];

const fieldPalette: Array<{ type: SubSpaceBuilderFieldType; label: string; group: 'Core' | 'Choice' | 'Contact' | 'Files'; required?: boolean }> = [
  { type: 'text', label: 'Short text', group: 'Core' },
  { type: 'longText', label: 'Long text', group: 'Core' },
  { type: 'number', label: 'Numeric', group: 'Core' },
  { type: 'date', label: 'Date', group: 'Core' },
  { type: 'datetime', label: 'Datetime', group: 'Core' },
  { type: 'select', label: 'Dropdown', group: 'Choice' },
  { type: 'checkbox', label: 'Checkbox', group: 'Choice' },
  { type: 'email', label: 'Email', group: 'Contact' },
  { type: 'phone', label: 'Phone', group: 'Contact' },
  { type: 'attachment', label: 'Attachment', group: 'Files' },
];

const dscsaSerializationTemplate = {
  name: 'DSCSA Serialization Workflow',
  rootEntity: 'Serialized Batch',
  route: '/workspace/dscsa-serialization',
  workspaceFields: [
    { label: 'Lot Number', type: 'text' as const, required: true },
    { label: 'Expiration Date', type: 'date' as const, required: true },
    { label: 'Carton Serial', type: 'text' as const, required: true },
  ],
  subSpaces: [
    {
      name: 'Carton',
      sourceEntity: 'Carton',
      displayType: 'summary' as const,
      visibilityRule: 'always' as const,
      fields: [
        { label: 'Carton Serial', type: 'text' as const, required: true },
        { label: 'Lot Number', type: 'text' as const, required: true },
        { label: 'Expiration Date', type: 'date' as const, required: true },
      ],
    },
    {
      name: 'Boxes Inside Carton',
      sourceEntity: 'Box',
      displayType: 'grid' as const,
      visibilityRule: 'always' as const,
      fields: [
        { label: 'Box Serial', type: 'text' as const, required: true },
        { label: 'Carton Serial', type: 'text' as const, required: true },
      ],
    },
    {
      name: 'Individual Units',
      sourceEntity: 'Unit',
      displayType: 'grid' as const,
      visibilityRule: 'always' as const,
      fields: [
        { label: 'Unit Serial', type: 'text' as const, required: true },
        { label: 'NDC Product Code', type: 'text' as const, required: true },
        { label: 'Box Serial', type: 'text' as const, required: true },
      ],
    },
    {
      name: 'Lot Information',
      sourceEntity: 'Lot Info',
      displayType: 'summary' as const,
      visibilityRule: 'always' as const,
      fields: [
        { label: 'Lot Number', type: 'text' as const, required: true },
        { label: 'Expiration Date', type: 'date' as const, required: true },
        { label: 'Product Name', type: 'text' as const, required: true },
      ],
    },
    {
      name: 'Manufacturer Serialization',
      sourceEntity: 'Serialization Event',
      displayType: 'timeline' as const,
      visibilityRule: 'always' as const,
      fields: [
        { label: 'Unit Serial Number', type: 'text' as const, required: true },
        { label: 'Carton Serial Number', type: 'text' as const, required: true },
        { label: 'Aggregation Date', type: 'date' as const, required: true },
        { label: 'EPCIS Upload Status', type: 'select' as const, required: true },
      ],
    },
    {
      name: 'Distributor Verification',
      sourceEntity: 'Verification Event',
      displayType: 'split' as const,
      visibilityRule: 'always' as const,
      fields: [
        { label: 'Scanned Carton Serial', type: 'text' as const, required: true },
        { label: 'Verification Result', type: 'select' as const, required: true },
        { label: 'Matched Serial Count', type: 'number' as const, required: true },
        { label: 'Received Time', type: 'datetime' as const, required: true },
      ],
    },
    {
      name: 'Pharmacy Dispense',
      sourceEntity: 'Dispense Event',
      displayType: 'timeline' as const,
      visibilityRule: 'ifRecords' as const,
      fields: [
        { label: 'Dispensed Unit Serial', type: 'text' as const, required: true },
        { label: 'Rx Reference', type: 'text' as const, required: true },
        { label: 'Dispense Date', type: 'date' as const, required: true },
        { label: 'Pharmacist', type: 'text' as const, required: false },
      ],
    },
    {
      name: 'Traceability & Exceptions',
      sourceEntity: 'Trace Event',
      displayType: 'grid' as const,
      visibilityRule: 'ifRecords' as const,
      fields: [
        { label: 'Event Type', type: 'select' as const, required: true },
        { label: 'Impacted Serial', type: 'text' as const, required: true },
        { label: 'Exception Status', type: 'select' as const, required: true },
        { label: 'Investigation Notes', type: 'longText' as const, required: false },
      ],
    },
  ],
};

const wrvasTemplate = {
  name: 'WRVAS Service Workflow',
  rootEntity: 'Service Work Order',
  route: '/workspace/wrvas-service',
  workspaceFields: [
    { label: 'Warehouse Facility', type: 'text' as const, required: true },
    { label: 'Work Order Number', type: 'text' as const, required: true },
    { label: 'Customer Reference', type: 'text' as const, required: true },
  ],
  subSpaces: [
    {
      name: 'Inbound Dock Log',
      sourceEntity: 'Dock Receipt',
      displayType: 'grid' as const,
      visibilityRule: 'always' as const,
      fields: [
        { label: 'Dock Receipt ID', type: 'text' as const, required: true },
        { label: 'Carrier Name', type: 'text' as const, required: true },
        { label: 'Pallet Count', type: 'number' as const, required: true },
        { label: 'Received Date/Time', type: 'datetime' as const, required: true },
      ],
    },
    {
      name: 'Serial Capture & Tagging',
      sourceEntity: 'Serial Capture Event',
      displayType: 'grid' as const,
      visibilityRule: 'always' as const,
      fields: [
        { label: 'Device Serial Number', type: 'text' as const, required: true },
        { label: 'Device Model', type: 'text' as const, required: true },
        { label: 'OEM / Vendor', type: 'text' as const, required: true },
        { label: 'Intake Condition', type: 'select' as const, required: true },
      ],
    },
    {
      name: 'Visual Inspection',
      sourceEntity: 'Inspection Event',
      displayType: 'split' as const,
      visibilityRule: 'always' as const,
      fields: [
        { label: 'Cosmetic Grade', type: 'select' as const, required: true },
        { label: 'Damage Notes', type: 'longText' as const, required: false },
        { label: 'Photos Attached', type: 'checkbox' as const, required: false },
      ],
    },
    {
      name: 'Diagnostic Test Results',
      sourceEntity: 'Diagnostic Event',
      displayType: 'grid' as const,
      visibilityRule: 'always' as const,
      fields: [
        { label: 'Test ID', type: 'text' as const, required: true },
        { label: 'Category', type: 'select' as const, required: true },
        { label: 'Result', type: 'select' as const, required: true },
        { label: 'Notes', type: 'longText' as const, required: false },
      ],
    },
    {
      name: 'Repair Cost Evaluation',
      sourceEntity: 'Cost Evaluation',
      displayType: 'summary' as const,
      visibilityRule: 'always' as const,
      fields: [
        { label: 'Estimated Cost', type: 'number' as const, required: true },
        { label: 'Parts Cost', type: 'number' as const, required: true },
        { label: 'Labor Hours', type: 'number' as const, required: true },
        { label: 'BER Decision', type: 'select' as const, required: true },
      ],
    },
    {
      name: 'Repair Tasks',
      sourceEntity: 'Repair Task',
      displayType: 'timeline' as const,
      visibilityRule: 'always' as const,
      fields: [
        { label: 'Repair Type', type: 'select' as const, required: true },
        { label: 'Technician', type: 'text' as const, required: true },
        { label: 'Parts Replaced', type: 'longText' as const, required: false },
      ],
    },
    {
      name: 'Retest & Validation',
      sourceEntity: 'Retest Event',
      displayType: 'split' as const,
      visibilityRule: 'always' as const,
      fields: [
        { label: 'Result', type: 'select' as const, required: true },
        { label: 'Test Date', type: 'date' as const, required: true },
        { label: 'Notes', type: 'longText' as const, required: false },
      ],
    },
    {
      name: 'Configuration & Firmware',
      sourceEntity: 'Config Event',
      displayType: 'grid' as const,
      visibilityRule: 'ifRecords' as const,
      fields: [
        { label: 'Firmware Version', type: 'text' as const, required: true },
        { label: 'BIOS Version', type: 'text' as const, required: false },
        { label: 'OS Image', type: 'text' as const, required: false },
        { label: 'Config Date', type: 'date' as const, required: true },
      ],
    },
    {
      name: 'Kit BOM & Components',
      sourceEntity: 'Kit BOM',
      displayType: 'grid' as const,
      visibilityRule: 'always' as const,
      fields: [
        { label: 'Kit ID', type: 'text' as const, required: true },
        { label: 'Parent Serial', type: 'text' as const, required: true },
        { label: 'Child Serials', type: 'longText' as const, required: true },
        { label: 'Component Count', type: 'number' as const, required: true },
      ],
    },
    {
      name: 'Final QA Checklist',
      sourceEntity: 'QA Checklist',
      displayType: 'split' as const,
      visibilityRule: 'always' as const,
      fields: [
        { label: 'QA Result', type: 'select' as const, required: true },
        { label: 'Inspector', type: 'text' as const, required: true },
        { label: 'QA Date', type: 'date' as const, required: true },
      ],
    },
    {
      name: 'Packing & Labeling',
      sourceEntity: 'Pack Event',
      displayType: 'summary' as const,
      visibilityRule: 'always' as const,
      fields: [
        { label: 'Pack Slip ID', type: 'text' as const, required: true },
        { label: 'Box Count', type: 'number' as const, required: true },
        { label: 'Weight (lbs)', type: 'number' as const, required: true },
        { label: 'Hazmat Flag', type: 'checkbox' as const, required: false },
      ],
    },
    {
      name: 'Shipping & Tracking',
      sourceEntity: 'Shipment Event',
      displayType: 'timeline' as const,
      visibilityRule: 'ifRecords' as const,
      fields: [
        { label: 'Tracking Number', type: 'text' as const, required: true },
        { label: 'Carrier', type: 'select' as const, required: true },
        { label: 'Ship Date', type: 'date' as const, required: true },
        { label: 'Destination', type: 'text' as const, required: true },
      ],
    },
  ],
};

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function titleCase(value: string) {
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

function createBuilderField(
  prefix: 'wf' | 'sf',
  label: string,
  type: SubSpaceBuilderFieldType,
  required: boolean,
  tags: string[],
): SubSpaceBuilderField {
  return {
    id: `${prefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
    label,
    type,
    required,
    tags,
  };
}

export function useAdminWorkspace() {
  const { data, upsertWorkspace, addSubSpace, deleteSubSpace, updateSubSpace, deleteWorkspace, addClient, addRecord, upsertFlow, upsertBusinessFunction } = useAppState();
  const { can, deniedMessage } = useRbac();
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState(data.workspaces[0]?.id ?? '');
  const [isCreatingWorkspace, setIsCreatingWorkspace] = useState(data.workspaces.length === 0);
  const [pendingCreatedWorkspace, setPendingCreatedWorkspace] = useState<{ name: string; rootEntity: string; route: string } | null>(null);

  const workspace = useMemo(
    () => (
      isCreatingWorkspace
        ? undefined
        : data.workspaces.find((item) => item.id === selectedWorkspaceId) ?? data.workspaces[0]
    ),
    [data.workspaces, selectedWorkspaceId, isCreatingWorkspace],
  );

  const [workspaceName, setWorkspaceName] = useState(workspace?.name ?? '');
  const [rootEntity, setRootEntity] = useState(workspace?.rootEntity ?? '');
  const [route, setRoute] = useState(workspace?.route ?? '');
  const [newSubSpaceName, setNewSubSpaceName] = useState('');
  const [newSubSpaceEntity, setNewSubSpaceEntity] = useState('');
  const [selectedSubSpaceId, setSelectedSubSpaceId] = useState('');
  const [newBuilderFieldLabel, setNewBuilderFieldLabel] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (isCreatingWorkspace) {
      return;
    }

    if (!workspace) {
      return;
    }
    setWorkspaceName(workspace.name);
    setRootEntity(workspace.rootEntity);
    setRoute(workspace.route);
  }, [workspace?.id, isCreatingWorkspace]);

  useEffect(() => {
    if (!pendingCreatedWorkspace) {
      return;
    }

    const createdWorkspace = data.workspaces.find(
      (item) => item.name === pendingCreatedWorkspace.name
        && item.rootEntity === pendingCreatedWorkspace.rootEntity
        && item.route === pendingCreatedWorkspace.route,
    );

    if (!createdWorkspace) {
      return;
    }

    setSelectedWorkspaceId(createdWorkspace.id);
    setIsCreatingWorkspace(false);
    setPendingCreatedWorkspace(null);
    setNotice('Workspace created.');
  }, [data.workspaces, pendingCreatedWorkspace]);

  useEffect(() => {
    if (!workspace) {
      setSelectedSubSpaceId('');
      return;
    }
    if (workspace.subSpaces.length === 0) {
      setSelectedSubSpaceId('');
      return;
    }
    if (!workspace.subSpaces.some((item) => item.id === selectedSubSpaceId)) {
      setSelectedSubSpaceId(workspace.subSpaces[0].id);
    }
  }, [workspace?.id, workspace?.subSpaces.length, selectedSubSpaceId]);

  const selectedSubSpace = useMemo(
    () => workspace?.subSpaces.find((item) => item.id === selectedSubSpaceId) ?? workspace?.subSpaces[0],
    [workspace, selectedSubSpaceId],
  );

  const firstSubSpaceWithoutFormId = useMemo(() => {
    if (!workspace) {
      return '';
    }

    const subSpaceIdsWithForms = new Set(
      data.forms
        .filter((form) => form.workspaceId === workspace.id)
        .map((form) => form.subSpaceId),
    );

    return (
      workspace.subSpaces.find((subSpace) => {
        const hasExplicitForm = subSpaceIdsWithForms.has(subSpace.id);
        const hasBuilderDetails = (subSpace.builderFields?.length ?? 0) > 0;
        return !hasExplicitForm && !hasBuilderDetails;
      })?.id ?? ''
    );
  }, [workspace, data.forms]);

  const firstRelatedSubSpaceMissingRelationshipId = useMemo(() => {
    if (!workspace) {
      return '';
    }

    return (
      workspace.subSpaces.find(
        (subSpace) => subSpace.bindMode === 'relatedEntityView' && !subSpace.relationship?.trim(),
      )?.id ?? ''
    );
  }, [workspace]);

  const adminProgress = useMemo(() => {
    if (!workspace) {
      return 0;
    }
    if (workspace.subSpaces.length >= 1) {
      return 2;
    }
    if (workspaceName.trim() && rootEntity.trim()) {
      return 1;
    }
    return 0;
  }, [workspace, workspaceName, rootEntity]);

  const saveWorkspace = () => {
    if (!can('workspace.manage', workspace?.id)) {
      setNotice(deniedMessage('workspace.manage'));
      return;
    }

    const nextName = workspaceName.trim();
    const nextRootEntity = rootEntity.trim();
    const nextRoute = route.trim();

    if (!nextName || !nextRootEntity) {
      setNotice('Workspace name and root entity are required.');
      return;
    }

    if (!workspace) {
      const routeSegment = slugify(nextName) || 'workspace';
      const nextWorkspaceRoute = nextRoute || `/workspace/${routeSegment}`;
      upsertWorkspace({
        id: '',
        name: nextName,
        rootEntity: nextRootEntity,
        route: nextWorkspaceRoute,
        countBadgesEnabled: true,
        countStrategy: 'perSubSpace',
        builderFields: [],
        subSpaces: [],
      });
      setPendingCreatedWorkspace({
        name: nextName,
        rootEntity: nextRootEntity,
        route: nextWorkspaceRoute,
      });
      setNotice('Creating workspace...');
      return;
    }

    upsertWorkspace({
      ...workspace,
      name: nextName,
      rootEntity: nextRootEntity,
      route: nextRoute || workspace.route,
    });
    setNotice('Workspace updated.');
  };

  const publishWorkspace = () => {
    if (!workspace) return;
    upsertWorkspace({ ...workspace, published: true });
    setNotice('Workspace published to End User.');
  };

  const addBuilderFieldToWorkspace = (fieldType: SubSpaceBuilderFieldType) => {
    if (!can('workspace.manage', workspace?.id)) {
      setNotice(deniedMessage('workspace.manage'));
      return;
    }

    if (!workspace) {
      setNotice('Create a workspace before adding workspace fields.');
      return;
    }

    const paletteEntry = fieldPalette.find((item) => item.type === fieldType);
    if (!paletteEntry) {
      return;
    }

    const nextIndex = (workspace.builderFields?.length ?? 0) + 1;
    const workspaceToken = slugify(workspace.name) || 'workspace';
    const typeToken = slugify(fieldType) || 'field';
    const nextField: SubSpaceBuilderField = {
      id: `wf-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
      label: newBuilderFieldLabel.trim() || `${titleCase(paletteEntry.label)} ${nextIndex}`,
      type: fieldType,
      required: !!paletteEntry.required,
      tags: [
        `Workspace:${workspaceToken}`,
        'Scope:Workspace',
        `FieldType:${typeToken}`,
        `Field:${slugify(`${paletteEntry.label}-${nextIndex}`)}`,
      ],
    };

    upsertWorkspace({
      ...workspace,
      builderFields: [...(workspace.builderFields ?? []), nextField],
    });

    setNewBuilderFieldLabel('');
    setNotice(`${paletteEntry.label} added to workspace core fields.`);
  };

  const removeBuilderFieldFromWorkspace = (fieldId: string) => {
    if (!can('workspace.manage', workspace?.id)) {
      setNotice(deniedMessage('workspace.manage'));
      return;
    }

    if (!workspace) {
      return;
    }

    upsertWorkspace({
      ...workspace,
      builderFields: (workspace.builderFields ?? []).filter((item) => item.id !== fieldId),
    });
    setNotice('Workspace field removed.');
  };

  const toggleWorkspaceFieldRequired = (fieldId: string) => {
    if (!can('workspace.manage', workspace?.id)) {
      setNotice(deniedMessage('workspace.manage'));
      return;
    }

    if (!workspace) {
      return;
    }

    upsertWorkspace({
      ...workspace,
      builderFields: (workspace.builderFields ?? []).map((item) => (
        item.id === fieldId ? { ...item, required: !item.required } : item
      )),
    });
    setNotice('Workspace field requirement updated.');
  };

  const moveBuilderFieldInWorkspace = (fieldId: string, direction: 'up' | 'down') => {
    if (!can('workspace.manage', workspace?.id)) {
      setNotice(deniedMessage('workspace.manage'));
      return;
    }
    if (!workspace) return;
    const fields = [...(workspace.builderFields ?? [])];
    const index = fields.findIndex((item) => item.id === fieldId);
    if (index < 0) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= fields.length) return;
    const temp = fields[index];
    fields[index] = fields[targetIndex];
    fields[targetIndex] = temp;
    upsertWorkspace({ ...workspace, builderFields: fields });
    setNotice(`Field moved ${direction}.`);
  };

  const reorderBuilderFieldInWorkspace = (fromIndex: number, toIndex: number) => {
    if (!can('workspace.manage', workspace?.id)) {
      setNotice(deniedMessage('workspace.manage'));
      return;
    }
    if (!workspace) return;
    const fields = [...(workspace.builderFields ?? [])];
    if (fromIndex < 0 || fromIndex >= fields.length || toIndex < 0 || toIndex >= fields.length) return;
    const [moved] = fields.splice(fromIndex, 1);
    fields.splice(toIndex, 0, moved);
    upsertWorkspace({ ...workspace, builderFields: fields });
    setNotice('Field reordered.');
  };

  const createSubSpace = () => {
    if (!can('subspace.manage', workspace?.id)) {
      setNotice(deniedMessage('subspace.manage'));
      return;
    }

    if (!workspace) {
      return;
    }
    const name = newSubSpaceName.trim();
    const entity = newSubSpaceEntity.trim();
    if (!name || !entity) {
      setNotice('SubSpace name and source entity are required.');
      return;
    }

    const subSpace: SubSpaceDefinition = {
      id: '',
      name,
      sourceEntity: entity,
      bindMode: 'relatedEntityView',
      relationship: `${entity}.${workspace.rootEntity}Id = ${workspace.rootEntity}.Id`,
      displayType: 'grid',
      visibilityRule: 'ifRecords',
      showCount: true,
      countMode: 'direct',
    };

    const result = addSubSpace(workspace.id, subSpace);
    if (!result.ok) {
      setNotice(result.reason ?? 'Could not add SubSpace.');
      return;
    }

    setNewSubSpaceName('');
    setNewSubSpaceEntity('');
    setNotice('SubSpace created.');
  };

  const cycleDisplay = (subSpace: SubSpaceDefinition) => {
    if (!can('subspace.manage', workspace?.id)) {
      setNotice(deniedMessage('subspace.manage'));
      return;
    }

    if (!workspace) {
      return;
    }
    const idx = displayOrder.indexOf(subSpace.displayType);
    const nextDisplay = displayOrder[(idx + 1) % displayOrder.length];
    updateSubSpace(workspace.id, { ...subSpace, displayType: nextDisplay });
  };

  const toggleVisibility = (subSpace: SubSpaceDefinition) => {
    if (!can('subspace.manage', workspace?.id)) {
      setNotice(deniedMessage('subspace.manage'));
      return;
    }

    if (!workspace) {
      return;
    }
    const next: VisibilityRule = subSpace.visibilityRule === 'always' ? 'ifRecords' : 'always';
    updateSubSpace(workspace.id, { ...subSpace, visibilityRule: next });
  };

  const addBuilderFieldToSubSpace = (fieldType: SubSpaceBuilderFieldType) => {
    if (!can('subspace.manage', workspace?.id)) {
      setNotice(deniedMessage('subspace.manage'));
      return;
    }

    if (!workspace || !selectedSubSpace) {
      setNotice('Create and select a SubSpace before assigning fields.');
      return;
    }

    const paletteEntry = fieldPalette.find((item) => item.type === fieldType);
    if (!paletteEntry) {
      return;
    }

    const nextIndex = (selectedSubSpace.builderFields?.length ?? 0) + 1;
    const workspaceToken = slugify(workspace.name) || 'workspace';
    const subSpaceToken = slugify(selectedSubSpace.name) || 'subspace';
    const typeToken = slugify(fieldType) || 'field';
    const nextField: SubSpaceBuilderField = {
      id: `sf-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
      label: newBuilderFieldLabel.trim() || `${titleCase(paletteEntry.label)} ${nextIndex}`,
      type: fieldType,
      required: !!paletteEntry.required,
      tags: [
        `Workspace:${workspaceToken}`,
        `SubSpace:${subSpaceToken}`,
        `FieldType:${typeToken}`,
        `Field:${slugify(`${paletteEntry.label}-${nextIndex}`)}`,
      ],
    };

    updateSubSpace(workspace.id, {
      ...selectedSubSpace,
      builderFields: [...(selectedSubSpace.builderFields ?? []), nextField],
    });
    setNewBuilderFieldLabel('');
    setNotice(`${paletteEntry.label} added to ${selectedSubSpace.name}.`);
  };

  const updateSelectedSubSpace = (subSpaceId: string, patch: Partial<Pick<SubSpaceDefinition, 'name' | 'sourceEntity' | 'relationship'>>) => {
    if (!can('subspace.manage', workspace?.id)) {
      setNotice(deniedMessage('subspace.manage'));
      return;
    }

    if (!workspace) {
      return;
    }

    const target = workspace.subSpaces.find((item) => item.id === subSpaceId);
    if (!target) {
      return;
    }

    const next: SubSpaceDefinition = {
      ...target,
      ...patch,
    };

    updateSubSpace(workspace.id, next);
    setNotice('SubSpace auto-saved.');
  };

  const removeBuilderFieldFromSubSpace = (fieldId: string) => {
    if (!can('subspace.manage', workspace?.id)) {
      setNotice(deniedMessage('subspace.manage'));
      return;
    }

    if (!workspace || !selectedSubSpace) {
      return;
    }

    updateSubSpace(workspace.id, {
      ...selectedSubSpace,
      builderFields: (selectedSubSpace.builderFields ?? []).filter((item) => item.id !== fieldId),
    });
    setNotice('SubSpace field removed.');
  };

  const moveBuilderFieldInSubSpace = (fieldId: string, direction: 'up' | 'down') => {
    if (!can('subspace.manage', workspace?.id)) {
      setNotice(deniedMessage('subspace.manage'));
      return;
    }

    if (!workspace || !selectedSubSpace) {
      return;
    }

    const fields = [...(selectedSubSpace.builderFields ?? [])];
    const index = fields.findIndex((item) => item.id === fieldId);
    if (index < 0) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= fields.length) return;

    const temp = fields[index];
    fields[index] = fields[targetIndex];
    fields[targetIndex] = temp;

    updateSubSpace(workspace.id, {
      ...selectedSubSpace,
      builderFields: fields,
    });
    setNotice(`Field moved ${direction}.`);
  };

  const toggleBuilderFieldRequired = (fieldId: string) => {
    if (!can('subspace.manage', workspace?.id)) {
      setNotice(deniedMessage('subspace.manage'));
      return;
    }

    if (!workspace || !selectedSubSpace) {
      return;
    }

    updateSubSpace(workspace.id, {
      ...selectedSubSpace,
      builderFields: (selectedSubSpace.builderFields ?? []).map((item) => (
        item.id === fieldId ? { ...item, required: !item.required } : item
      )),
    });
    setNotice('Field requirement updated.');
  };

  const renameBuilderFieldInSubSpace = (fieldId: string, newLabel: string) => {
    if (!can('subspace.manage', workspace?.id)) {
      setNotice(deniedMessage('subspace.manage'));
      return;
    }
    if (!workspace || !selectedSubSpace || !newLabel.trim()) return;
    updateSubSpace(workspace.id, {
      ...selectedSubSpace,
      builderFields: (selectedSubSpace.builderFields ?? []).map((item) =>
        item.id === fieldId ? { ...item, label: newLabel.trim() } : item
      ),
    });
  };

  const beginCreateWorkspace = () => {
    if (!can('workspace.manage')) {
      setNotice(deniedMessage('workspace.manage'));
      return;
    }

    setIsCreatingWorkspace(true);
    setSelectedWorkspaceId('');
    setWorkspaceName('');
    setRootEntity('');
    setRoute('');
    setSelectedSubSpaceId('');
    setNotice('Create mode: define a new workspace.');
  };

  const selectWorkspace = (workspaceId: string) => {
    setIsCreatingWorkspace(false);
    setSelectedWorkspaceId(workspaceId);
  };

  const removeWorkspace = (workspaceId: string) => {
    if (!can('workspace.manage', workspaceId)) {
      setNotice(deniedMessage('workspace.manage'));
      return;
    }

    const result = deleteWorkspace(workspaceId);
    if (!result.ok) {
      setNotice(result.reason ?? 'Could not delete workspace.');
      return;
    }

    const remaining = data.workspaces.filter((item) => item.id !== workspaceId);
    setSelectedWorkspaceId(remaining[0]?.id ?? '');
    setSelectedSubSpaceId('');
    setNotice('Workspace deleted.');
  };

  const removeSubSpace = (subSpaceId: string) => {
    if (!workspace) {
      return;
    }

    if (!can('subspace.manage', workspace.id)) {
      setNotice(deniedMessage('subspace.manage'));
      return;
    }

    const result = deleteSubSpace(workspace.id, subSpaceId);
    if (!result.ok) {
      setNotice(result.reason ?? 'Could not delete SubSpace.');
      return;
    }

    const remaining = workspace.subSpaces.filter((item) => item.id !== subSpaceId);
    setSelectedSubSpaceId(remaining[0]?.id ?? '');
    setNotice('SubSpace deleted.');
  };

  const applyDscsaSerializationTemplate = () => {
    if (!can('workspace.manage', workspace?.id)) {
      setNotice(deniedMessage('workspace.manage'));
      return;
    }

    // Determine the base workspace — create one on the fly if needed
    const baseWorkspace: WorkspaceDefinition = workspace ?? {
      id: `ws-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
      name: dscsaSerializationTemplate.name,
      rootEntity: dscsaSerializationTemplate.rootEntity,
      route: dscsaSerializationTemplate.route,
      countBadgesEnabled: true,
      countStrategy: 'perSubSpace' as const,
      builderFields: [],
      subSpaces: [],
      published: false,
    };
    const isNewWorkspace = !workspace;

    const rootToken = slugify(baseWorkspace.rootEntity || dscsaSerializationTemplate.rootEntity) || 'serialized-batch';
    const nextWorkspaceFields = [...(baseWorkspace.builderFields ?? [])];

    for (const field of dscsaSerializationTemplate.workspaceFields) {
      const exists = nextWorkspaceFields.some((item) => item.label.toLowerCase() === field.label.toLowerCase());
      if (exists) continue;
      nextWorkspaceFields.push(
        createBuilderField('wf', field.label, field.type, field.required, [
          `Workspace:${slugify(baseWorkspace.name) || 'workspace'}`,
          'Scope:Workspace',
          `Field:${slugify(field.label)}`,
        ]),
      );
    }

    const existingSubSpaceNames = new Set((baseWorkspace.subSpaces ?? []).map((item) => item.name.toLowerCase()));
    const nextSubSpaces = [...(baseWorkspace.subSpaces ?? [])];

    let addedNewSubSpaces = false;
    for (const templateSubSpace of dscsaSerializationTemplate.subSpaces) {
      if (existingSubSpaceNames.has(templateSubSpace.name.toLowerCase())) continue;

      const sourceToken = slugify(templateSubSpace.sourceEntity) || 'entity';
      const initialFields: SubSpaceBuilderField[] = (templateSubSpace.fields ?? []).map((field) =>
        createBuilderField('sf', field.label, field.type, field.required, [
          `SubSpace:${slugify(templateSubSpace.name)}`,
          `Field:${slugify(field.label)}`,
        ]),
      );

      nextSubSpaces.push({
        id: `ss-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
        name: templateSubSpace.name,
        sourceEntity: templateSubSpace.sourceEntity,
        bindMode: 'relatedEntityView',
        relationship: `${sourceToken}.${rootToken}Id = ${rootToken}.Id`,
        displayType: templateSubSpace.displayType,
        visibilityRule: templateSubSpace.visibilityRule,
        showCount: true,
        countMode: 'direct',
        builderFields: initialFields,
      });
      addedNewSubSpaces = true;
    }

    upsertWorkspace({
      ...baseWorkspace,
      countBadgesEnabled: true,
      countStrategy: 'perSubSpace',
      pipelineEnabled: true,
      builderFields: nextWorkspaceFields,
      subSpaces: nextSubSpaces.map((ss, idx) => ({ ...ss, pipelineOrder: ss.pipelineOrder ?? idx })),
    });

    if (isNewWorkspace) {
      setSelectedWorkspaceId(baseWorkspace.id);
      setIsCreatingWorkspace(false);
      setWorkspaceName(baseWorkspace.name);
      setRootEntity(baseWorkspace.rootEntity);
      setRoute(baseWorkspace.route);
    }

    if (addedNewSubSpaces) {
      const wsId = baseWorkspace.id;
      const ssMap: Record<string, string> = {};
      for (const ss of nextSubSpaces) { ssMap[ss.name] = ss.id; }

      // ── Batch 1: Lisinopril 10mg — Lot XY-1234 ──
      const clLisinopril = addClient({
        id: '',
        firstName: 'Lisinopril 10mg',
        lastName: 'Lot XY-1234',
        caseRef: 'DSCSA-XY1234',
        tags: ['Product:Lisinopril', 'NDC:68180-0517-01', 'Batch:XY-1234'],
        createdAt: '02-27-2026',
        profileData: {
          productName: 'Lisinopril 10mg Tablet',
          lotNumber: 'XY-1234',
          expirationDate: '12-25-2026',
          cartonSerial: 'CTN-78450-A',
        },
      });

      const _phrImg = getRecordPlaceholderImage(baseWorkspace.name);
      const _phrRec = (r: any) => addRecord({ ...r, imageUri: _phrImg });
      // Carton
      if (ssMap.Carton) {
        _phrRec({ id: '', clientId: clLisinopril.id, workspaceId: wsId, subSpaceId: ssMap.Carton, title: 'Carton CTN-78450-A (100 boxes × 24 units)', status: 'Serialized', amount: 2400, tags: ['Product:Lisinopril', 'Level:Carton'], data: { 'carton-serial': 'CTN-78450-A', 'lot-number': 'XY-1234', 'expiration-date': '12-25-2026' } });
      }
      // Boxes
      if (ssMap['Boxes Inside Carton']) {
        _phrRec({ id: '', clientId: clLisinopril.id, workspaceId: wsId, subSpaceId: ssMap['Boxes Inside Carton'], title: 'BOX-78450-001 (24 units)', status: 'Serialized', tags: ['Product:Lisinopril', 'Level:Box'], data: { 'box-serial': 'BOX-78450-001', 'carton-serial': 'CTN-78450-A' } });
        _phrRec({ id: '', clientId: clLisinopril.id, workspaceId: wsId, subSpaceId: ssMap['Boxes Inside Carton'], title: 'BOX-78450-002 (24 units)', status: 'Serialized', tags: ['Product:Lisinopril', 'Level:Box'], data: { 'box-serial': 'BOX-78450-002', 'carton-serial': 'CTN-78450-A' } });
      }
      // Units
      if (ssMap['Individual Units']) {
        _phrRec({ id: '', clientId: clLisinopril.id, workspaceId: wsId, subSpaceId: ssMap['Individual Units'], title: 'SN-LIS-000001 — Lisinopril 10mg', status: 'Serialized', tags: ['Product:Lisinopril', 'Level:Unit', 'NDC:68180-0517-01'], data: { 'unit-serial': 'SN-LIS-000001', 'ndc-product-code': '68180-0517-01', 'box-serial': 'BOX-78450-001' } });
        _phrRec({ id: '', clientId: clLisinopril.id, workspaceId: wsId, subSpaceId: ssMap['Individual Units'], title: 'SN-LIS-000002 — Lisinopril 10mg', status: 'Serialized', tags: ['Product:Lisinopril', 'Level:Unit', 'NDC:68180-0517-01'], data: { 'unit-serial': 'SN-LIS-000002', 'ndc-product-code': '68180-0517-01', 'box-serial': 'BOX-78450-002' } });
      }
      // Lot info
      if (ssMap['Lot Information']) {
        _phrRec({ id: '', clientId: clLisinopril.id, workspaceId: wsId, subSpaceId: ssMap['Lot Information'], title: 'Lot XY-1234 — Lisinopril 10mg Tablet', status: 'Active', tags: ['Product:Lisinopril', 'Level:Lot'], data: { 'lot-number': 'XY-1234', 'expiration-date': '12-25-2026', 'product-name': 'Lisinopril 10mg Tablet' } });
      }
      // Manufacturer serialization event
      if (ssMap['Manufacturer Serialization']) {
        _phrRec({ id: '', clientId: clLisinopril.id, workspaceId: wsId, subSpaceId: ssMap['Manufacturer Serialization'], title: '2,400 units serialized — Lisinopril 10mg', status: 'Serialized', amount: 2400, tags: ['Product:Lisinopril', 'Stage:Manufacturer'], data: { 'unit-serial-number': 'SN-LIS-000001 → SN-LIS-002400', 'carton-serial-number': 'CTN-78450-A', 'aggregation-date': '02-27-2026', 'epcis-upload-status': 'Confirmed' } });
      }
      // Distributor verification — passed
      if (ssMap['Distributor Verification']) {
        _phrRec({ id: '', clientId: clLisinopril.id, workspaceId: wsId, subSpaceId: ssMap['Distributor Verification'], title: 'Verification passed — 2,400 of 2,400 matched', status: 'Received by Distributor', amount: 2400, tags: ['Verification:Passed', 'Facility:McKesson-DC-East'], data: { 'scanned-carton-serial': 'CTN-78450-A', 'verification-result': 'Match', 'matched-serial-count': 2400, 'received-time': '02-28-2026T08:14:00' } });
      }
      // Pharmacy dispense
      if (ssMap['Pharmacy Dispense']) {
        _phrRec({ id: '', clientId: clLisinopril.id, workspaceId: wsId, subSpaceId: ssMap['Pharmacy Dispense'], title: 'Dispensed SN-LIS-000012 to patient — Rx #RX-83014', status: 'Dispensed', amount: 1, tags: ['Lifecycle:Dispensed', 'Trace:Complete'], data: { 'dispensed-unit-serial': 'SN-LIS-000012', 'rx-reference': 'RX-83014', 'dispense-date': '03-03-2026', 'pharmacist': 'Dr. Sarah Kim, PharmD' } });
      }
      // Traceability — full trace + exception
      if (ssMap['Traceability & Exceptions']) {
        _phrRec({ id: '', clientId: clLisinopril.id, workspaceId: wsId, subSpaceId: ssMap['Traceability & Exceptions'], title: 'Full trace: manufacturer → distributor → pharmacy → patient', status: 'Dispensed', amount: 2400, tags: ['Trace:EndToEnd', 'Product:Lisinopril'], data: { 'event-type': 'End-to-End Trace', 'impacted-serial': 'SN-LIS-000001 → SN-LIS-002400', 'exception-status': 'None', 'investigation-notes': 'Complete supply chain traceability verified.' } });
        _phrRec({ id: '', clientId: clLisinopril.id, workspaceId: wsId, subSpaceId: ssMap['Traceability & Exceptions'], title: 'Exception: 1 unit damaged in transit — resolved', status: 'Exception Review', amount: 1, tags: ['Exception:Damage', 'Priority:Low'], data: { 'event-type': 'Damage', 'impacted-serial': 'SN-LIS-000198', 'exception-status': 'Resolved', 'investigation-notes': 'Unit SN-LIS-000198 sustained packaging damage during distributor shipment. Replaced and resolved.' } });
      }

      // ── Batch 2: Amoxicillin 500mg — Lot MZ-9021 ──
      const clAmoxicillin = addClient({
        id: '',
        firstName: 'Amoxicillin 500mg',
        lastName: 'Lot MZ-9021',
        caseRef: 'DSCSA-MZ9021',
        tags: ['Product:Amoxicillin', 'NDC:65862-0007-05', 'Batch:MZ-9021'],
        createdAt: '02-28-2026',
        profileData: {
          productName: 'Amoxicillin 500mg Capsule',
          lotNumber: 'MZ-9021',
          expirationDate: '09-15-2027',
          cartonSerial: 'CTN-92103-B',
        },
      });

      if (ssMap['Manufacturer Serialization']) {
        _phrRec({ id: '', clientId: clAmoxicillin.id, workspaceId: wsId, subSpaceId: ssMap['Manufacturer Serialization'], title: '12,000 capsules serialized — Amoxicillin 500mg', status: 'Serialized', amount: 12000, tags: ['Product:Amoxicillin', 'Stage:Manufacturer'], data: { 'unit-serial-number': 'SN-AMX-000001 → SN-AMX-012000', 'carton-serial-number': 'CTN-92103-B', 'aggregation-date': '02-28-2026', 'epcis-upload-status': 'Confirmed' } });
      }
      if (ssMap['Distributor Verification']) {
        _phrRec({ id: '', clientId: clAmoxicillin.id, workspaceId: wsId, subSpaceId: ssMap['Distributor Verification'], title: '⚠ Verification mismatch — 3 of 12,000 serials flagged', status: 'Received by Distributor', amount: 12000, tags: ['Verification:Mismatch', 'Alert:SerialMismatch', 'Priority:High'], data: { 'scanned-carton-serial': 'CTN-92103-B', 'verification-result': 'Mismatch', 'matched-serial-count': 11997, 'received-time': '03-01-2026T10:30:00' } });
      }

      // ── Batch 3: Epinephrine 1mg/mL — Lot JK-4410 ──
      const clEpinephrine = addClient({
        id: '',
        firstName: 'Epinephrine 1mg/mL',
        lastName: 'Lot JK-4410',
        caseRef: 'DSCSA-JK4410',
        tags: ['Product:Epinephrine', 'NDC:00409-1631-01', 'Batch:JK-4410', 'Cold-Chain'],
        createdAt: '03-01-2026',
        profileData: {
          productName: 'Epinephrine 1mg/mL Injectable',
          lotNumber: 'JK-4410',
          expirationDate: '06-30-2027',
          cartonSerial: 'CTN-44109-C',
        },
      });

      if (ssMap['Manufacturer Serialization']) {
        _phrRec({ id: '', clientId: clEpinephrine.id, workspaceId: wsId, subSpaceId: ssMap['Manufacturer Serialization'], title: '500 injectables serialized — Epinephrine 1mg/mL', status: 'Serialized', amount: 500, tags: ['Product:Epinephrine', 'Stage:Manufacturer', 'Cold-Chain'], data: { 'unit-serial-number': 'SN-EPI-000001 → SN-EPI-000500', 'carton-serial-number': 'CTN-44109-C', 'aggregation-date': '03-01-2026', 'epcis-upload-status': 'Confirmed' } });
      }
      if (ssMap['Traceability & Exceptions']) {
        _phrRec({ id: '', clientId: clEpinephrine.id, workspaceId: wsId, subSpaceId: ssMap['Traceability & Exceptions'], title: '🔴 SUSPECT: Counterfeit serials detected in secondary market', status: 'Exception Review', amount: 500, tags: ['Suspect', 'Quarantine', 'Priority:Critical', 'FDA-Reportable'], data: { 'event-type': 'Suspect Product', 'impacted-serial': 'SN-EPI-000001 → SN-EPI-000500', 'exception-status': 'Open', 'investigation-notes': 'Third-party marketplace listing contained 12 units with serial numbers matching Lot JK-4410 but with duplicate GS1 barcodes. FDA DSCSA Section 582 suspect product notification triggered.' } });
      }

      // ── DSCSA Signal Studio Flows ──
      const flowBase = { triggerType: 'event' as const, runOnExisting: true, status: 'published' as const, totalRuns: 0, failures7d: 0, avgTimeMs: 0 };
      if (ssMap['Distributor Verification']) {
        upsertFlow({ ...flowBase, id: '', name: 'Serial Mismatch Alert', signal: 'Distributor scan reveals serial numbers that don\u2019t match the VRS repository', workspaceId: wsId, subSpaceId: ssMap['Distributor Verification'], rules: ['mismatch-count > 0', 'verification-result = Mismatch'], action: 'Quarantine affected units, flag batch for Exception Review, and push a high-priority notification to the Compliance Trace Analyst', targetTags: ['Alert:SerialMismatch', 'Priority:High'] });
      }
      if (ssMap['Traceability & Exceptions']) {
        upsertFlow({ ...flowBase, id: '', name: 'Suspect Product Escalation (FDA \u00A7582)', signal: 'A suspect product event is reported anywhere in the supply chain', workspaceId: wsId, subSpaceId: ssMap['Traceability & Exceptions'], rules: ['investigation-priority = Critical', 'investigation-outcome contains Pending'], action: 'Immediately quarantine the entire batch, create an investigation case, freeze downstream movement, and alert the FDA liaison', targetTags: ['Suspect', 'Quarantine', 'Priority:Critical', 'FDA-Reportable'] });
      }
      if (ssMap['Pharmacy Dispense']) {
        upsertFlow({ ...flowBase, id: '', name: '90-Day Expiration Warning', signal: 'Pharmacy inventory contains units within 90 days of expiration', workspaceId: wsId, subSpaceId: ssMap['Pharmacy Dispense'], rules: ['days_to_expiration <= 90', 'inventory-status = InStock'], action: 'Tag the unit as Expiring Soon, move it to the priority dispense queue, and alert the Pharmacy Dispense Manager', targetTags: ['Alert:ExpiringSoon', 'Priority:Medium'] });
        upsertFlow({ ...flowBase, id: '', name: 'Dispense-to-Patient Completion Logger', signal: 'Pharmacist dispenses a serialized unit against a valid Rx reference', workspaceId: wsId, subSpaceId: ssMap['Pharmacy Dispense'], rules: ['dispense-unit-serial is set', 'dispense-rx-reference is set'], action: 'Transition lifecycle to Dispensed, post a trace ledger event (FDA-ready), and mark inventory status as consumed', runOnExisting: false, targetTags: ['Lifecycle:Dispensed', 'Trace:Complete'] });
      }
      if (ssMap['Manufacturer Serialization']) {
        upsertFlow({ ...flowBase, id: '', name: 'Auto-Advance Lifecycle on Shipment', signal: 'EPCIS shipping event confirmed against the Verification Router Service', workspaceId: wsId, subSpaceId: ssMap['Manufacturer Serialization'], rules: ['upload-status = Confirmed', 'acknowledgement is set'], action: 'Automatically transition the batch lifecycle to Shipped to Distributor and post the EPCIS ObjectEvent', runOnExisting: false, targetTags: ['Lifecycle:AutoAdvance', 'EPCIS'] });
      }
    }

    // ── Auto-inject pharma business architecture ──
    upsertBusinessFunction({
      id: 'bfn-supply-chain',
      name: 'Supply Chain & Regulatory',
      icon: '🔗',
      color: '#8C5BF5',
      order: 0,
      description: 'End-to-end pharmaceutical serialization from manufacturer to patient dispensing (DSCSA)',
      objects: [
        {
          id: 'bobj-drug-inventory',
          functionId: 'bfn-supply-chain',
          name: 'Drug Inventory',
          namePlural: 'Drug Inventories',
          icon: '💊',
          description: 'Track serialized pharmaceutical batches across the DSCSA supply chain from carton to dispensing',
          workspaceIds: [baseWorkspace.id],
        },
      ],
    });

    setNotice('DSCSA Serialization template applied: Carton, Boxes, Units, Lot Info, Manufacturer, Distributor, Pharmacy, and Traceability lanes are ready. 5 Signal Studio flows created.' + (addedNewSubSpaces ? ' Demo data seeded with Lisinopril, Amoxicillin, and Epinephrine batches.' : ''));
  };

  const applyWrvasTemplate = () => {
    if (!can('workspace.manage', workspace?.id)) {
      setNotice(deniedMessage('workspace.manage'));
      return;
    }

    const baseWorkspace: WorkspaceDefinition = workspace ?? {
      id: `ws-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
      name: wrvasTemplate.name,
      rootEntity: wrvasTemplate.rootEntity,
      route: wrvasTemplate.route,
      countBadgesEnabled: true,
      countStrategy: 'perSubSpace' as const,
      builderFields: [],
      subSpaces: [],
      published: false,
    };
    const isNewWorkspace = !workspace;

    const rootToken = slugify(baseWorkspace.rootEntity || wrvasTemplate.rootEntity) || 'service-work-order';
    const nextWorkspaceFields = [...(baseWorkspace.builderFields ?? [])];

    for (const field of wrvasTemplate.workspaceFields) {
      const exists = nextWorkspaceFields.some((item) => item.label.toLowerCase() === field.label.toLowerCase());
      if (exists) continue;
      nextWorkspaceFields.push(
        createBuilderField('wf', field.label, field.type, field.required, [
          `Workspace:${slugify(baseWorkspace.name) || 'workspace'}`,
          'Scope:Workspace',
          `Field:${slugify(field.label)}`,
        ]),
      );
    }

    const existingSubSpaceNames = new Set((baseWorkspace.subSpaces ?? []).map((item) => item.name.toLowerCase()));
    const nextSubSpaces = [...(baseWorkspace.subSpaces ?? [])];

    let addedNewSubSpaces = false;
    for (const templateSubSpace of wrvasTemplate.subSpaces) {
      if (existingSubSpaceNames.has(templateSubSpace.name.toLowerCase())) continue;

      const sourceToken = slugify(templateSubSpace.sourceEntity) || 'entity';
      const initialFields: SubSpaceBuilderField[] = (templateSubSpace.fields ?? []).map((field) =>
        createBuilderField('sf', field.label, field.type, field.required, [
          `SubSpace:${slugify(templateSubSpace.name)}`,
          `Field:${slugify(field.label)}`,
        ]),
      );

      nextSubSpaces.push({
        id: `ss-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
        name: templateSubSpace.name,
        sourceEntity: templateSubSpace.sourceEntity,
        bindMode: 'relatedEntityView',
        relationship: `${sourceToken}.${rootToken}Id = ${rootToken}.Id`,
        displayType: templateSubSpace.displayType,
        visibilityRule: templateSubSpace.visibilityRule,
        showCount: true,
        countMode: 'direct',
        builderFields: initialFields,
      });
      addedNewSubSpaces = true;
    }

    upsertWorkspace({
      ...baseWorkspace,
      countBadgesEnabled: true,
      countStrategy: 'perSubSpace',
      pipelineEnabled: true,
      builderFields: nextWorkspaceFields,
      subSpaces: nextSubSpaces.map((ss, idx) => ({ ...ss, pipelineOrder: ss.pipelineOrder ?? idx })),
    });

    if (isNewWorkspace) {
      setSelectedWorkspaceId(baseWorkspace.id);
      setIsCreatingWorkspace(false);
      setWorkspaceName(baseWorkspace.name);
      setRootEntity(baseWorkspace.rootEntity);
      setRoute(baseWorkspace.route);
    }

    if (addedNewSubSpaces) {
      const wsId = baseWorkspace.id;
      const ssMap: Record<string, string> = {};
      for (const ss of nextSubSpaces) { ssMap[ss.name] = ss.id; }

      // ── WO-5001: Dell Latitude 5540 — Full lifecycle ──
      const _itImg = getRecordPlaceholderImage(baseWorkspace.name);
      const _itRec = (r: any) => addRecord({ ...r, imageUri: _itImg });
      const clDell = addClient({
        id: '',
        firstName: 'Dell Latitude 5540',
        lastName: 'WO-5001',
        caseRef: 'WRVAS-WO5001',
        tags: ['Device:Laptop', 'OEM:Dell', 'WorkOrder:WO-5001'],
        createdAt: '04-01-2026',
        profileData: {
          deviceModel: 'Dell Latitude 5540',
          serialNumber: 'SVC-DELL-5540-0001',
          workOrderNumber: 'WO-5001',
          customerRef: 'ACME-Corp',
        },
      });

      if (ssMap['Inbound Dock Log']) {
        _itRec({ id: '', clientId: clDell.id, workspaceId: wsId, subSpaceId: ssMap['Inbound Dock Log'], title: 'Dock receipt — 1 pallet, FedEx Freight', status: 'Received', amount: 1, tags: ['Carrier:FedEx', 'Receiving'], data: { 'dock-receipt-id': 'DOCK-2026-0401-001', 'carrier-name': 'FedEx Freight', 'pallet-count': 1, 'received-datetime': '04-01-2026 09:15:00' } });
      }
      if (ssMap['Serial Capture & Tagging']) {
        _itRec({ id: '', clientId: clDell.id, workspaceId: wsId, subSpaceId: ssMap['Serial Capture & Tagging'], title: 'Serial captured — SVC-DELL-5540-0001', status: 'Received', amount: 1, tags: ['Device:Laptop', 'OEM:Dell'], data: { 'device-serial': 'SVC-DELL-5540-0001', 'device-model': 'Dell Latitude 5540', 'oem-vendor': 'Dell Technologies', 'intake-condition': 'Functional — cosmetic damage' } });
      }
      if (ssMap['Visual Inspection']) {
        _itRec({ id: '', clientId: clDell.id, workspaceId: wsId, subSpaceId: ssMap['Visual Inspection'], title: 'Visual inspection — Grade B (minor scratches)', status: 'Triaged', amount: 1, tags: ['Cosmetic:B', 'Triage'], data: { 'cosmetic-grade': 'B', 'damage-notes': 'Minor scratches on lid, keyboard in good condition.', 'photos-attached': true } });
      }
      if (ssMap['Diagnostic Test Results']) {
        _itRec({ id: '', clientId: clDell.id, workspaceId: wsId, subSpaceId: ssMap['Diagnostic Test Results'], title: 'Diagnostics — battery health 62%, SSD passed', status: 'Triaged', amount: 1, tags: ['Diagnostics:Complete', 'Battery:Replace'], data: { 'test-id': 'DIAG-2026-0402-001', 'category': 'Hardware Health', 'result': 'Partial Fail', 'notes': 'Battery health 62% — replace. SSD/RAM/Wi-Fi passed.' } });
      }
      if (ssMap['Repair Cost Evaluation']) {
        _itRec({ id: '', clientId: clDell.id, workspaceId: wsId, subSpaceId: ssMap['Repair Cost Evaluation'], title: 'Cost eval — $145 (parts $85 + 2h labor)', status: 'Triaged', amount: 145, tags: ['Cost:Approved', 'BER:Repair'], data: { 'estimated-cost': 145, 'parts-cost': 85, 'labor-hours': 2, 'ber-decision': 'Repair — below BER threshold' } });
      }
      if (ssMap['Repair Tasks']) {
        _itRec({ id: '', clientId: clDell.id, workspaceId: wsId, subSpaceId: ssMap['Repair Tasks'], title: 'Battery replaced — OEM Dell 54Wh', status: 'Repaired', amount: 1, tags: ['Repair:Battery', 'Technician:Rivera'], data: { 'repair-type': 'Battery Replacement', 'technician': 'James Rivera', 'parts-replaced': 'Dell OEM 54Wh Li-Ion Battery (P/N: 3DDDG)' } });
      }
      if (ssMap['Retest & Validation']) {
        _itRec({ id: '', clientId: clDell.id, workspaceId: wsId, subSpaceId: ssMap['Retest & Validation'], title: 'Retest passed — battery 100%, all systems nominal', status: 'Retested', amount: 1, tags: ['Retest:Passed'], data: { 'result': 'Pass', 'test-date': '04-03-2026', 'notes': 'Battery health 100%. Full diagnostics passed.' } });
      }
      if (ssMap['Configuration & Firmware']) {
        _itRec({ id: '', clientId: clDell.id, workspaceId: wsId, subSpaceId: ssMap['Configuration & Firmware'], title: 'BIOS updated to 1.18.0, Windows 11 Pro image deployed', status: 'Configured', amount: 1, tags: ['Config:BIOS', 'Config:OS'], data: { 'firmware-version': 'Dell BIOS 1.18.0', 'bios-version': '1.18.0', 'os-image': 'Windows 11 Pro 23H2', 'config-date': '04-04-2026' } });
      }
      if (ssMap['Kit BOM & Components']) {
        _itRec({ id: '', clientId: clDell.id, workspaceId: wsId, subSpaceId: ssMap['Kit BOM & Components'], title: 'Kit KIT-5001 — laptop + charger + dock', status: 'Kitting', amount: 3, tags: ['Kit:KIT-5001'], data: { 'kit-id': 'KIT-5001', 'parent-serial': 'SVC-DELL-5540-0001', 'child-serials': 'CHG-DELL-65W-0044, DOCK-WD19S-0112', 'component-count': 3 } });
      }
      if (ssMap['Final QA Checklist']) {
        _itRec({ id: '', clientId: clDell.id, workspaceId: wsId, subSpaceId: ssMap['Final QA Checklist'], title: 'Final QA passed — all checks green', status: 'QA Passed', amount: 1, tags: ['QA:Passed'], data: { 'qa-result': 'Pass', 'inspector': 'Linda Torres', 'qa-date': '04-05-2026' } });
      }
      if (ssMap['Packing & Labeling']) {
        _itRec({ id: '', clientId: clDell.id, workspaceId: wsId, subSpaceId: ssMap['Packing & Labeling'], title: 'Packed — 1 box, 4.2 lbs', status: 'Packed', amount: 1, tags: ['Packing:Complete'], data: { 'pack-slip-id': 'PACK-2026-0405-001', 'box-count': 1, 'weight-lbs': 4.2, 'hazmat-flag': false } });
      }
      if (ssMap['Shipping & Tracking']) {
        _itRec({ id: '', clientId: clDell.id, workspaceId: wsId, subSpaceId: ssMap['Shipping & Tracking'], title: 'Shipped to ACME Corp — UPS 1Z999AA10123456784', status: 'Shipped', amount: 1, tags: ['Carrier:UPS', 'Shipping:Complete'], data: { 'tracking-number': '1Z999AA10123456784', 'carrier': 'UPS Ground', 'ship-date': '04-06-2026', 'destination': 'ACME Corp HQ, Austin TX' } });
      }

      // ── WO-5002: HP Printer — BER ──
      const clHP = addClient({
        id: '',
        firstName: 'HP LaserJet Pro M404',
        lastName: 'WO-5002',
        caseRef: 'WRVAS-WO5002',
        tags: ['Device:Printer', 'OEM:HP', 'WorkOrder:WO-5002'],
        createdAt: '04-02-2026',
        profileData: {
          deviceModel: 'HP LaserJet Pro M404',
          serialNumber: 'SVC-HP-M404-0001',
          workOrderNumber: 'WO-5002',
          customerRef: 'GlobalTech-Inc',
        },
      });

      if (ssMap['Serial Capture & Tagging']) {
        _itRec({ id: '', clientId: clHP.id, workspaceId: wsId, subSpaceId: ssMap['Serial Capture & Tagging'], title: 'Serial captured — SVC-HP-M404-0001', status: 'Received', amount: 1, tags: ['Device:Printer', 'OEM:HP'], data: { 'device-serial': 'SVC-HP-M404-0001', 'device-model': 'HP LaserJet Pro M404', 'oem-vendor': 'HP Inc.', 'intake-condition': 'Non-functional — paper jam mechanism broken' } });
      }
      if (ssMap['Repair Cost Evaluation']) {
        _itRec({ id: '', clientId: clHP.id, workspaceId: wsId, subSpaceId: ssMap['Repair Cost Evaluation'], title: '⚠ BER — repair cost $320 exceeds unit value $280', status: 'BER', amount: 320, tags: ['BER:Exceeded', 'Cost:Denied'], data: { 'estimated-cost': 320, 'parts-cost': 210, 'labor-hours': 3, 'ber-decision': 'BER — Beyond Economical Repair' } });
      }

      // ── WO-5003: Cisco Server — Retest failure ──
      const clCisco = addClient({
        id: '',
        firstName: 'Cisco UCS C220 M6',
        lastName: 'WO-5003',
        caseRef: 'WRVAS-WO5003',
        tags: ['Device:Server', 'OEM:Cisco', 'WorkOrder:WO-5003', 'Priority:High'],
        createdAt: '04-03-2026',
        profileData: {
          deviceModel: 'Cisco UCS C220 M6',
          serialNumber: 'SVC-CISCO-C220-0001',
          workOrderNumber: 'WO-5003',
          customerRef: 'NetServ-LLC',
        },
      });

      if (ssMap['Repair Tasks']) {
        _itRec({ id: '', clientId: clCisco.id, workspaceId: wsId, subSpaceId: ssMap['Repair Tasks'], title: 'RAID controller replaced — Cisco UCS C220', status: 'Repaired', amount: 1, tags: ['Repair:RAID', 'Priority:High'], data: { 'repair-type': 'RAID Controller Replacement', 'technician': 'Amir Patel', 'parts-replaced': 'Cisco 12G SAS RAID Controller (UCSC-RAID-M6)' } });
      }
      if (ssMap['Retest & Validation']) {
        _itRec({ id: '', clientId: clCisco.id, workspaceId: wsId, subSpaceId: ssMap['Retest & Validation'], title: '🔴 Retest FAILED — RAID rebuild incomplete', status: 'Retest Failed', amount: 1, tags: ['Retest:Failed', 'Priority:Critical', 'Escalation'], data: { 'result': 'Fail', 'test-date': '04-05-2026', 'notes': 'RAID rebuild stalled at 78%. Possible firmware incompatibility. Escalated.' } });
      }

      // ── WRVAS Signal Studio Flows ──
      const flowBase = { triggerType: 'event' as const, runOnExisting: true, status: 'published' as const, totalRuns: 0, failures7d: 0, avgTimeMs: 0 };
      if (ssMap['Repair Cost Evaluation']) {
        upsertFlow({ ...flowBase, id: '', name: 'BER Threshold Alert', signal: 'Repair cost evaluation exceeds the unit\u2019s current market value (Beyond Economical Repair)', workspaceId: wsId, subSpaceId: ssMap['Repair Cost Evaluation'], rules: ['ber-decision contains BER', 'estimated-cost > 0'], action: 'Flag work order as BER, halt repair workflow, notify disposition team for parts harvest or recycle', targetTags: ['BER:Exceeded', 'Priority:High'] });
      }
      if (ssMap['Retest & Validation']) {
        upsertFlow({ ...flowBase, id: '', name: 'Retest Failure Escalation', signal: 'Post-repair retest returns a Fail verdict', workspaceId: wsId, subSpaceId: ssMap['Retest & Validation'], rules: ['result = Fail'], action: 'Escalate to senior technician, reopen repair task, and flag for root-cause analysis', targetTags: ['Retest:Failed', 'Priority:Critical', 'Escalation'] });
      }
      if (ssMap['Kit BOM & Components']) {
        upsertFlow({ ...flowBase, id: '', name: 'Kit Assembly Completion', signal: 'All child components for a kit have been scanned and verified', workspaceId: wsId, subSpaceId: ssMap['Kit BOM & Components'], rules: ['component-count > 0', 'kit-id is set'], action: 'Mark kit as assembled, advance work order to QA queue', runOnExisting: false, targetTags: ['Kit:Complete'] });
      }
      if (ssMap['Final QA Checklist']) {
        upsertFlow({ ...flowBase, id: '', name: 'QA Pass \u2192 Ship-Ready Advance', signal: 'Final QA checklist passes all inspection points', workspaceId: wsId, subSpaceId: ssMap['Final QA Checklist'], rules: ['qa-result = Pass'], action: 'Advance work order to Packing & Labeling, generate compliance certificate', runOnExisting: false, targetTags: ['QA:Passed', 'Ship-Ready'] });
      }
      if (ssMap['Shipping & Tracking']) {
        upsertFlow({ ...flowBase, id: '', name: 'Shipment Audit Logger', signal: 'A tracking number is assigned and the shipment leaves the facility', workspaceId: wsId, subSpaceId: ssMap['Shipping & Tracking'], rules: ['tracking-number is set', 'carrier is set'], action: 'Write a tamper-proof audit entry with device serial, tracking number, carrier, and timestamp', runOnExisting: false, targetTags: ['Audit:Shipment', 'Trace:Complete'] });
      }
    }

    // ── Auto-inject service operations business architecture ──
    upsertBusinessFunction({
      id: 'bfn-service-operations',
      name: 'Service Operations',
      icon: '🛠️',
      color: '#3B82F6',
      order: 1,
      description: 'Warrant, Refurbishment, Value-Added Services — full device lifecycle from inbound dock to shipment',
      objects: [
        {
          id: 'bobj-device-inventory',
          functionId: 'bfn-service-operations',
          name: 'Device Inventory',
          namePlural: 'Device Inventories',
          icon: '🖥️',
          description: 'Serialized IT hardware assets moving through diagnostic, repair, kitting, QA, and shipping stages',
          workspaceIds: [baseWorkspace.id],
        },
      ],
    });

    setNotice('WRVAS template applied: Dock Log, Serial Capture, Inspection, Diagnostics, Cost Eval, Repair, Retest, Config, Kitting, QA, Packing, and Shipping lanes are ready. 5 Signal Studio flows created.' + (addedNewSubSpaces ? ' Demo data seeded with Dell Laptop, HP Printer (BER), and Cisco Server (retest fail) work orders.' : ''));
  };

  /* ── Pipeline mode toggle ── */
  const togglePipelineEnabled = () => {
    if (!workspace) return;
    const next = !workspace.pipelineEnabled;
    upsertWorkspace({ ...workspace, pipelineEnabled: next });
    if (next) {
      // Assign pipelineOrder to each SubSpace based on current array position
      workspace.subSpaces.forEach((ss, idx) => {
        updateSubSpace(workspace.id, { ...ss, pipelineOrder: idx });
      });
    }
    setNotice(next ? 'Pipeline mode enabled — SubSpaces are now an ordered flow.' : 'Pipeline mode disabled — SubSpaces display as independent lanes.');
  };

  /* ── Reorder SubSpaces (pipeline) ── */
  const reorderSubSpace = (subSpaceId: string, direction: -1 | 1) => {
    if (!workspace) return;
    const subs = [...workspace.subSpaces];
    const idx = subs.findIndex((s) => s.id === subSpaceId);
    if (idx < 0) return;
    const targetIdx = idx + direction;
    if (targetIdx < 0 || targetIdx >= subs.length) return;
    // Swap
    [subs[idx], subs[targetIdx]] = [subs[targetIdx], subs[idx]];
    // Re-assign pipeline orders
    const reordered = subs.map((s, i) => ({ ...s, pipelineOrder: i }));
    upsertWorkspace({ ...workspace, subSpaces: reordered });
    setNotice('SubSpace order updated.');
  };

  const moveSubSpaceToIndex = (fromIndex: number, toIndex: number) => {
    if (!workspace) return;
    if (fromIndex === toIndex) return;
    const subs = [...workspace.subSpaces];
    const [moved] = subs.splice(fromIndex, 1);
    subs.splice(toIndex, 0, moved);
    const reordered = subs.map((s, i) => ({ ...s, pipelineOrder: i }));
    upsertWorkspace({ ...workspace, subSpaces: reordered });
    setNotice('SubSpace order updated.');
  };

  const applySubSpaceOrder = (ordered: SubSpaceDefinition[]) => {
    if (!workspace) return;
    const reordered = ordered.map((s, i) => ({ ...s, pipelineOrder: i }));
    upsertWorkspace({ ...workspace, subSpaces: reordered });
  };

  return {
    workspaces: data.workspaces,
    workspace,
    hasWorkspace: !!workspace,
    isCreatingWorkspace,
    selectedWorkspaceId,
    setSelectedWorkspaceId: selectWorkspace,
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
    adminProgress,
    saveWorkspace,
    publishWorkspace,
    createSubSpace,
    removeSubSpace,
    cycleDisplay,
    toggleVisibility,
    addBuilderFieldToSubSpace,
    addBuilderFieldToWorkspace,
    removeBuilderFieldFromSubSpace,
    moveBuilderFieldInSubSpace,
    renameBuilderFieldInSubSpace,
    removeBuilderFieldFromWorkspace,
    moveBuilderFieldInWorkspace,
    reorderBuilderFieldInWorkspace,
    toggleBuilderFieldRequired,
    toggleWorkspaceFieldRequired,
    updateSelectedSubSpace,
    togglePipelineEnabled,
    reorderSubSpace,
    moveSubSpaceToIndex,
    applySubSpaceOrder,
  };
}
