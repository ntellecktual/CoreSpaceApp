import { useEffect, useState } from 'react';
import { useAppState } from '../../../context/AppStateContext';
import { EndUserPersona, ShellFieldType } from '../../../types';
import { useRbac } from './useRbac';

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function compactTag(value: string) {
  return value.replace(/\s+/g, '');
}

export function useAdminShellDesigner() {
  const { data, upsertShellConfig } = useAppState();
  const { can, deniedMessage } = useRbac();

  const shellConfig = data.shellConfig;

  const [subjectSingular, setSubjectSingular] = useState(shellConfig.subjectSingular);
  const [subjectPlural, setSubjectPlural] = useState(shellConfig.subjectPlural);
  const [workspaceLabel, setWorkspaceLabel] = useState(shellConfig.workspaceLabel);
  const [subSpaceLabel, setSubSpaceLabel] = useState(shellConfig.subSpaceLabel);
  const [functionLabel, setFunctionLabel] = useState(shellConfig.functionLabel ?? 'Department');
  const [functionLabelPlural, setFunctionLabelPlural] = useState(shellConfig.functionLabelPlural ?? 'Departments');
  const [objectLabel, setObjectLabel] = useState(shellConfig.objectLabel ?? 'Inventory');
  const [objectLabelPlural, setObjectLabelPlural] = useState(shellConfig.objectLabelPlural ?? 'Inventories');
  const [collectionLabel, setCollectionLabel] = useState(shellConfig.collectionLabel ?? 'Batch');
  const [collectionLabelPlural, setCollectionLabelPlural] = useState(shellConfig.collectionLabelPlural ?? 'Batches');

  const [newFieldLabel, setNewFieldLabel] = useState('');
  const [newFieldType, setNewFieldType] = useState<ShellFieldType>('text');
  const [newFieldRequired, setNewFieldRequired] = useState(false);
  const [newFieldOptions, setNewFieldOptions] = useState('');

  const [personaName, setPersonaName] = useState('');
  const [personaDescription, setPersonaDescription] = useState('');
  const [personaWorkspaceScope, setPersonaWorkspaceScope] = useState<'all' | 'selected'>('all');
  const [personaWorkspaceIds, setPersonaWorkspaceIds] = useState<string[]>([]);
  const [personaDefaultTags, setPersonaDefaultTags] = useState('');
  const [newLifecycleName, setNewLifecycleName] = useState('');
  const [newLifecycleDescription, setNewLifecycleDescription] = useState('');
  const [transitionFromStageId, setTransitionFromStageId] = useState(shellConfig.lifecycleStages[0]?.id ?? '');
  const [transitionToStageId, setTransitionToStageId] = useState(shellConfig.lifecycleStages[1]?.id ?? shellConfig.lifecycleStages[0]?.id ?? '');
  const [transitionPersonaScope, setTransitionPersonaScope] = useState<'all' | 'selected'>('all');
  const [transitionPersonaIds, setTransitionPersonaIds] = useState<string[]>([]);

  const [notice, setNotice] = useState('');

  useEffect(() => {
    setSubjectSingular(shellConfig.subjectSingular);
    setSubjectPlural(shellConfig.subjectPlural);
    setWorkspaceLabel(shellConfig.workspaceLabel);
    setSubSpaceLabel(shellConfig.subSpaceLabel);
    setFunctionLabel(shellConfig.functionLabel ?? 'Department');
    setFunctionLabelPlural(shellConfig.functionLabelPlural ?? 'Departments');
    setObjectLabel(shellConfig.objectLabel ?? 'Inventory');
    setObjectLabelPlural(shellConfig.objectLabelPlural ?? 'Inventories');
    setCollectionLabel(shellConfig.collectionLabel ?? 'Batch');
    setCollectionLabelPlural(shellConfig.collectionLabelPlural ?? 'Batches');
  }, [shellConfig.subjectSingular, shellConfig.subjectPlural, shellConfig.workspaceLabel, shellConfig.subSpaceLabel, shellConfig.functionLabel, shellConfig.functionLabelPlural, shellConfig.objectLabel, shellConfig.objectLabelPlural, shellConfig.collectionLabel, shellConfig.collectionLabelPlural]);

  useEffect(() => {
    if (!shellConfig.lifecycleStages.some((stage) => stage.id === transitionFromStageId)) {
      setTransitionFromStageId(shellConfig.lifecycleStages[0]?.id ?? '');
    }
    if (!shellConfig.lifecycleStages.some((stage) => stage.id === transitionToStageId)) {
      setTransitionToStageId(shellConfig.lifecycleStages[1]?.id ?? shellConfig.lifecycleStages[0]?.id ?? '');
    }
  }, [shellConfig.lifecycleStages, transitionFromStageId, transitionToStageId]);

  const saveLabels = () => {
    if (!can('workspace.manage')) {
      setNotice(deniedMessage('workspace.manage'));
      return;
    }

    const singular = subjectSingular.trim();
    const plural = subjectPlural.trim();
    const workspace = workspaceLabel.trim();
    const subSpace = subSpaceLabel.trim();

    if (!singular || !plural || !workspace || !subSpace) {
      setNotice('Please fill in all four word boxes before saving.');
      return;
    }

    upsertShellConfig({
      ...shellConfig,
      subjectSingular: singular,
      subjectPlural: plural,
      workspaceLabel: workspace,
      subSpaceLabel: subSpace,
      functionLabel: functionLabel.trim() || 'Department',
      functionLabelPlural: functionLabelPlural.trim() || 'Departments',
      objectLabel: objectLabel.trim() || 'Inventory',
      objectLabelPlural: objectLabelPlural.trim() || 'Inventories',
      collectionLabel: collectionLabel.trim() || 'Batch',
      collectionLabelPlural: collectionLabelPlural.trim() || 'Batches',
    });

    setNotice('App words saved. People will see the new words right away.');
  };

  const addIntakeField = () => {
    if (!can('workspace.manage')) {
      setNotice(deniedMessage('workspace.manage'));
      return;
    }

    const label = newFieldLabel.trim();
    if (!label) {
      setNotice('Field label is required.');
      return;
    }

    const fieldId = `field-${slugify(label) || Date.now()}`;
    if (shellConfig.intakeFields.some((field) => field.id === fieldId || field.label.toLowerCase() === label.toLowerCase())) {
      setNotice('Field label already exists. Use a unique label.');
      return;
    }

    const options = newFieldType === 'select'
      ? newFieldOptions.split(',').map((item) => item.trim()).filter(Boolean)
      : undefined;

    if (newFieldType === 'select' && (!options || options.length === 0)) {
      setNotice('Select fields require options (comma separated).');
      return;
    }

    upsertShellConfig({
      ...shellConfig,
      intakeFields: [
        ...shellConfig.intakeFields,
        {
          id: fieldId,
          label,
          type: newFieldType,
          required: newFieldRequired,
          options,
        },
      ],
    });

    setNewFieldLabel('');
    setNewFieldType('text');
    setNewFieldRequired(false);
    setNewFieldOptions('');
    setNotice('Intake field added. No-code intake form updated.');
  };

  const removeIntakeField = (fieldId: string) => {
    if (!can('workspace.manage')) {
      setNotice(deniedMessage('workspace.manage'));
      return;
    }

    upsertShellConfig({
      ...shellConfig,
      intakeFields: shellConfig.intakeFields.filter((field) => field.id !== fieldId),
    });
    setNotice('Intake field removed.');
  };

  const togglePersonaWorkspace = (workspaceId: string) => {
    setPersonaWorkspaceIds((current) =>
      current.includes(workspaceId) ? current.filter((item) => item !== workspaceId) : [...current, workspaceId],
    );
  };

  const createPersona = () => {
    if (!can('workspace.manage')) {
      setNotice(deniedMessage('workspace.manage'));
      return;
    }

    const trimmedName = personaName.trim();
    if (!trimmedName) {
      setNotice('Persona name is required.');
      return;
    }

    const personaId = `persona-${slugify(trimmedName) || Date.now()}`;
    if (shellConfig.personas.some((persona) => persona.id === personaId || persona.name.toLowerCase() === trimmedName.toLowerCase())) {
      setNotice('Persona already exists. Use a unique name.');
      return;
    }

    const tags = personaDefaultTags
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => (item.includes(':') ? item : `Persona:${compactTag(item)}`));

    const nextPersona: EndUserPersona = {
      id: personaId,
      name: trimmedName,
      description: personaDescription.trim() || undefined,
      workspaceScope: personaWorkspaceScope,
      workspaceIds: personaWorkspaceScope === 'selected' ? personaWorkspaceIds : [],
      defaultTags: tags.length > 0 ? tags : [`Persona:${compactTag(trimmedName)}`],
    };

    upsertShellConfig({
      ...shellConfig,
      personas: [nextPersona, ...shellConfig.personas],
    });

    setPersonaName('');
    setPersonaDescription('');
    setPersonaWorkspaceScope('all');
    setPersonaWorkspaceIds([]);
    setPersonaDefaultTags('');
    setNotice('Persona created. End-user persona options updated.');
  };

  const deletePersona = (personaId: string) => {
    if (!can('workspace.manage')) {
      setNotice(deniedMessage('workspace.manage'));
      return;
    }

    if (shellConfig.personas.length <= 1) {
      setNotice('At least one persona must remain.');
      return;
    }

    upsertShellConfig({
      ...shellConfig,
      personas: shellConfig.personas.filter((persona) => persona.id !== personaId),
    });

    setNotice('Persona removed.');
  };

  const addLifecycleStage = () => {
    if (!can('workspace.manage')) {
      setNotice(deniedMessage('workspace.manage'));
      return;
    }

    const name = newLifecycleName.trim();
    if (!name) {
      setNotice('Lifecycle stage name is required.');
      return;
    }

    const stageId = `stage-${slugify(name) || Date.now()}`;
    if (shellConfig.lifecycleStages.some((stage) => stage.id === stageId || stage.name.toLowerCase() === name.toLowerCase())) {
      setNotice('Lifecycle stage already exists. Use a unique name.');
      return;
    }

    const nextStages = [
      ...shellConfig.lifecycleStages,
      {
        id: stageId,
        name,
        description: newLifecycleDescription.trim() || undefined,
      },
    ];

    upsertShellConfig({
      ...shellConfig,
      lifecycleStages: nextStages,
      defaultLifecycleStageId: shellConfig.defaultLifecycleStageId || stageId,
    });

    setNewLifecycleName('');
    setNewLifecycleDescription('');
    setNotice('Lifecycle stage added. Runtime status language updated.');
  };

  const addLifecycleTransition = () => {
    if (!can('workspace.manage')) {
      setNotice(deniedMessage('workspace.manage'));
      return;
    }

    if (!transitionFromStageId || !transitionToStageId) {
      setNotice('Select both source and target lifecycle stages.');
      return;
    }

    if (transitionFromStageId === transitionToStageId) {
      setNotice('Transition source and target must be different stages.');
      return;
    }

    const exists = shellConfig.lifecycleTransitions.some(
      (transition) => transition.fromStageId === transitionFromStageId && transition.toStageId === transitionToStageId,
    );

    if (exists) {
      setNotice('Transition rule already exists.');
      return;
    }

    if (transitionPersonaScope === 'selected' && transitionPersonaIds.length === 0) {
      setNotice('Select at least one persona for selected-scope transition rules.');
      return;
    }

    upsertShellConfig({
      ...shellConfig,
      lifecycleTransitions: [
        ...shellConfig.lifecycleTransitions,
        {
          id: `transition-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
          fromStageId: transitionFromStageId,
          toStageId: transitionToStageId,
          personaIds: transitionPersonaScope === 'selected' ? transitionPersonaIds : [],
        },
      ],
    });

    setTransitionPersonaScope('all');
    setTransitionPersonaIds([]);
    setNotice('Lifecycle transition rule added.');
  };

  const toggleTransitionPersona = (personaId: string) => {
    setTransitionPersonaIds((current) =>
      current.includes(personaId) ? current.filter((item) => item !== personaId) : [...current, personaId],
    );
  };

  const deleteLifecycleStage = (stageId: string) => {
    if (!can('workspace.manage')) {
      setNotice(deniedMessage('workspace.manage'));
      return;
    }

    if (shellConfig.lifecycleStages.length <= 1) {
      setNotice('At least one lifecycle stage must remain.');
      return;
    }

    const nextStages = shellConfig.lifecycleStages.filter((stage) => stage.id !== stageId);
    const nextDefault =
      shellConfig.defaultLifecycleStageId === stageId
        ? nextStages[0]?.id ?? shellConfig.defaultLifecycleStageId
        : shellConfig.defaultLifecycleStageId;

    upsertShellConfig({
      ...shellConfig,
      lifecycleStages: nextStages,
      defaultLifecycleStageId: nextDefault,
      lifecycleTransitions: shellConfig.lifecycleTransitions.filter(
        (transition) => transition.fromStageId !== stageId && transition.toStageId !== stageId,
      ),
    });

    setNotice('Lifecycle stage removed.');
  };

  const deleteLifecycleTransition = (transitionId: string) => {
    if (!can('workspace.manage')) {
      setNotice(deniedMessage('workspace.manage'));
      return;
    }

    upsertShellConfig({
      ...shellConfig,
      lifecycleTransitions: shellConfig.lifecycleTransitions.filter((transition) => transition.id !== transitionId),
    });

    setNotice('Lifecycle transition removed.');
  };

  const setDefaultLifecycleStage = (stageId: string) => {
    if (!can('workspace.manage')) {
      setNotice(deniedMessage('workspace.manage'));
      return;
    }

    if (!shellConfig.lifecycleStages.some((stage) => stage.id === stageId)) {
      setNotice('Lifecycle stage not found.');
      return;
    }

    upsertShellConfig({
      ...shellConfig,
      defaultLifecycleStageId: stageId,
    });

    setNotice('Default lifecycle stage updated.');
  };

  return {
    shellConfig,
    workspaces: data.workspaces,
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
    objectLabel,
    setObjectLabel,
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
    notice,
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
  };
}
