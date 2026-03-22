import { useEffect, useMemo, useState } from 'react';
import { useAppState } from '../../../context/AppStateContext';
import type { RuntimeRecord } from '../../../types';
import { useRbac } from './useRbac';
import { getRecordPlaceholderImage } from '../../../data/pipelineConfig';

function toNumericValue(value: string): string | number {
  const asNumber = Number(value);
  if (Number.isNaN(asNumber) || value.trim() === '') {
    return value;
  }
  return asNumber;
}

export function useEndUserRuntime(selectedClientId: string) {
  const { data, addRecord, updateRecord, deleteRecord, getFormForSubSpace } = useAppState();
  const { can, deniedMessage } = useRbac();
  const shellConfig = data.shellConfig;
  const lifecycleStages = shellConfig.lifecycleStages;
  const defaultLifecycleStage =
    lifecycleStages.find((stage) => stage.id === shellConfig.defaultLifecycleStageId) ?? lifecycleStages[0];
  const lifecycleTransitions = shellConfig.lifecycleTransitions;

  const selectedClient = useMemo(
    () => data.clients.find((client) => client.id === selectedClientId),
    [data.clients, selectedClientId],
  );

  const activePersona = useMemo(() => {
    if (!selectedClient?.personaId) {
      return undefined;
    }
    return data.shellConfig.personas.find((persona) => persona.id === selectedClient.personaId);
  }, [data.shellConfig.personas, selectedClient?.personaId]);

  const workspaces = useMemo(() => {
    const publishedWorkspaces = data.workspaces.filter((ws) => ws.published !== false);
    if (!activePersona || activePersona.workspaceScope === 'all') {
      return publishedWorkspaces;
    }
    return publishedWorkspaces.filter((workspaceItem) => activePersona.workspaceIds.includes(workspaceItem.id));
  }, [data.workspaces, activePersona]);

  const applicableLifecycleTransitions = useMemo(() => {
    return lifecycleTransitions.filter((transition) => {
      const scopedPersonaIds = transition.personaIds ?? [];
      if (scopedPersonaIds.length === 0) {
        return true;
      }
      if (!activePersona) {
        return false;
      }
      return scopedPersonaIds.includes(activePersona.id);
    });
  }, [lifecycleTransitions, activePersona]);

  // All stage names are available when creating a new record (no transition constraint applies
  // to fresh entries — transitions govern existing record movements, not initial status choice).
  const allowedLifecycleStageNames = useMemo(() => {
    return lifecycleStages.map((stage) => stage.name);
  }, [lifecycleStages]);

  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState(workspaces[0]?.id ?? '');

  useEffect(() => {
    setSelectedWorkspaceId((current) => {
      if (workspaces.some((item) => item.id === current)) {
        return current;
      }
      return workspaces[0]?.id ?? '';
    });
  }, [workspaces]);

  const workspace = useMemo(
    () => workspaces.find((item) => item.id === selectedWorkspaceId) ?? workspaces[0],
    [workspaces, selectedWorkspaceId],
  );

  const visibleSubSpaces = useMemo(() => {
    if (!workspace) {
      return [];
    }
    const filtered = workspace.subSpaces.filter((subSpace) => {
      if (subSpace.visibilityRule === 'always') {
        return true;
      }
      return data.records.some(
        (record) =>
          record.clientId === selectedClientId &&
          record.workspaceId === workspace.id &&
          record.subSpaceId === subSpace.id,
      );
    });
    if (workspace.pipelineEnabled) {
      filtered.sort((a, b) => (a.pipelineOrder ?? 0) - (b.pipelineOrder ?? 0));
    }
    return filtered;
  }, [workspace, data.records, selectedClientId]);

  const [selectedSubSpaceId, setSelectedSubSpaceId] = useState(visibleSubSpaces[0]?.id ?? workspace?.subSpaces[0]?.id ?? '');
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!workspace) {
      return;
    }
    setSelectedSubSpaceId((current) => {
      if (workspace.subSpaces.some((subSpace) => subSpace.id === current)) {
        return current;
      }
      return visibleSubSpaces[0]?.id ?? workspace.subSpaces[0]?.id ?? '';
    });
  }, [workspace, visibleSubSpaces]);

  const selectedSubSpace = useMemo(() => {
    if (!workspace) {
      return undefined;
    }
    return workspace.subSpaces.find((item) => item.id === selectedSubSpaceId) ?? visibleSubSpaces[0];
  }, [workspace, selectedSubSpaceId, visibleSubSpaces]);

  const selectedRecords = useMemo(() => {
    if (!workspace || !selectedSubSpace) {
      return [];
    }
    return data.records.filter(
      (record) =>
        record.clientId === selectedClientId &&
        record.workspaceId === workspace.id &&
        record.subSpaceId === selectedSubSpace.id,
    );
  }, [workspace, selectedSubSpace, data.records, selectedClientId]);

  const clientRecords = useMemo(() => data.records.filter((record) => record.clientId === selectedClientId), [data.records, selectedClientId]);

  const clientWorkspaceSummary = useMemo(() => {
    return workspaces.map((workspaceItem) => {
      const recordsForWorkspace = clientRecords.filter((record) => record.workspaceId === workspaceItem.id);
      const activeSubSpaces = new Set(recordsForWorkspace.map((record) => record.subSpaceId)).size;
      return {
        workspaceId: workspaceItem.id,
        workspaceName: workspaceItem.name,
        totalSubSpaces: workspaceItem.subSpaces.length,
        activeSubSpaces,
        totalRecords: recordsForWorkspace.length,
      };
    });
  }, [workspaces, clientRecords]);

  const clientTimeline = useMemo(() => {
    return clientRecords
      .map((record) => {
        const workspaceItem = data.workspaces.find((item) => item.id === record.workspaceId);
        const subSpace = workspaceItem?.subSpaces.find((item) => item.id === record.subSpaceId);
        return {
          id: record.id,
          title: record.title,
          status: record.status,
          date: record.date || 'Unknown date',
          workspaceName: workspaceItem?.name ?? 'Unknown workspace',
          subSpaceName: subSpace?.name ?? 'Unknown subspace',
          amount: record.amount,
        };
      })
      .sort((a, b) => String(b.date).localeCompare(String(a.date)))
      .slice(0, 8);
  }, [clientRecords, data.workspaces]);

  const recordCountBySubSpace = useMemo(() => {
    if (!workspace) {
      return {} as Record<string, number>;
    }
    return data.records
      .filter((record) => record.clientId === selectedClientId && record.workspaceId === workspace.id)
      .reduce<Record<string, number>>((acc, record) => {
        acc[record.subSpaceId] = (acc[record.subSpaceId] ?? 0) + 1;
        return acc;
      }, {});
  }, [workspace, data.records, selectedClientId]);

  const allRecordsForWorkspace = useMemo(() => {
    if (!workspace) { return []; }
    return data.records.filter((r) => r.clientId === selectedClientId && r.workspaceId === workspace.id);
  }, [workspace, data.records, selectedClientId]);

  const recordsBySubSpaceName = useMemo(() => {
    if (!workspace) { return {} as Record<string, typeof allRecordsForWorkspace>; }
    const map: Record<string, typeof allRecordsForWorkspace> = {};
    for (const ss of workspace.subSpaces) {
      map[ss.name] = allRecordsForWorkspace.filter((r) => r.subSpaceId === ss.id);
    }
    return map;
  }, [workspace, allRecordsForWorkspace]);

  const dashboardKpis = useMemo(() => {
    const dashRecs = recordsBySubSpaceName.Dashboard ?? [];
    if (dashRecs.length > 0) {
      const r = dashRecs[0];
      return {
        totalUnits: Number(r.data.totalUnits ?? 0),
        pendingRevenue: Number(r.data.pendingRevenue ?? 0),
        inRepair: Number(r.data.inRepair ?? 0),
        slaRisk: Number(r.data.slaRisk ?? 0),
      };
    }
    const repairRecs = recordsBySubSpaceName.Repairs ?? [];
    const watchRecs = recordsBySubSpaceName.Watchlist ?? [];
    const productRecs = recordsBySubSpaceName.Products ?? [];
    const totalUnits = productRecs.reduce((s, r) => s + Number(r.data.unitCount ?? 0), 0);
    const pendingRevenue = repairRecs.reduce((s, r) => s + Number(r.data.serviceTotal ?? r.amount ?? 0), 0);
    return {
      totalUnits,
      pendingRevenue,
      inRepair: repairRecs.filter((r) => r.status === 'Repair' || r.status === 'Triage').length,
      slaRisk: watchRecs.length,
    };
  }, [recordsBySubSpaceName]);

  const stageDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const r of allRecordsForWorkspace) {
      counts[r.status] = (counts[r.status] ?? 0) + 1;
    }
    return counts;
  }, [allRecordsForWorkspace]);

  const activeForm = useMemo(() => {
    if (!workspace || !selectedSubSpace) {
      return undefined;
    }
    const explicit = getFormForSubSpace(workspace.id, selectedSubSpace.id);

    // ── Synthesise a form from builderFields when no explicit FormDefinition exists ──
    // Merge workspace-level fields + subspace-level fields into a unified create form.
    const wsFields = workspace.builderFields ?? [];
    const ssFields = selectedSubSpace.builderFields ?? [];
    const allBuilderFields = [...wsFields, ...ssFields];

    const baseForm = explicit ?? (allBuilderFields.length > 0 ? {
      id: `auto-form-${selectedSubSpace.id}`,
      name: `${selectedSubSpace.name} Form`,
      workspaceId: workspace.id,
      subSpaceId: selectedSubSpace.id,
      fields: allBuilderFields.map((bf) => {
        // Map the richer SubSpaceBuilderFieldType to the narrower FormFieldDefinition type
        type FType = 'text' | 'number' | 'date' | 'select';
        let fType: FType = 'text';
        if (bf.type === 'number') fType = 'number';
        else if (bf.type === 'date' || bf.type === 'datetime') fType = 'date';
        else if (bf.type === 'select') fType = 'select';
        else if (bf.type === 'checkbox') { fType = 'select'; }
        return {
          id: bf.id,
          label: bf.label,
          type: fType,
          required: bf.required,
          options: bf.type === 'checkbox' ? ['Yes', 'No'] : bf.options,
        };
      }),
    } : undefined);

    if (!baseForm) return undefined;

    // Strip any explicit 'status' field — lifecycle is set via the stage pill picker, not a text input.
    const fields = baseForm.fields.filter((f) => f.id !== 'status');

    return { ...baseForm, fields };
  }, [workspace, selectedSubSpace, getFormForSubSpace, allowedLifecycleStageNames]);

  const userProgress = selectedRecords.length > 0 ? 1 : 0;

  const setField = (fieldId: string, value: string) => {
    setFormValues((current) => ({ ...current, [fieldId]: value }));
  };

  const setLifecycleStatus = (value: string) => {
    setField('status', value);
  };

  const submit = () => {
    if (!can('record.create', workspace?.id)) {
      setMessage(deniedMessage('record.create'));
      return;
    }

    if (!selectedClientId) {
      setMessage(`Select a ${shellConfig.subjectSingular.toLowerCase()} before creating entries.`);
      return;
    }

    if (!workspace || !selectedSubSpace || !activeForm) {
      return;
    }

    for (const field of activeForm.fields) {
      if (field.required && !formValues[field.id]) {
        setMessage(`Field required: ${field.label}`);
        return;
      }
    }

    const amountRaw = formValues.amount ?? formValues.amountDemanded;
    const amount = amountRaw ? Number(amountRaw) : undefined;
    const tagCarrier = formValues.carrier ? `Carrier:${String(formValues.carrier).replace(/\s+/g, '')}` : undefined;
    const workspaceTag = `Workspace:${workspace.name.replace(/\s+/g, '')}`;
    const subSpaceTag = `SubSpace:${selectedSubSpace.name.replace(/\s+/g, '')}`;
    const clientTag = `Client:${selectedClientId}`;

    const requestedStatus = formValues.status?.trim();
    const allowedStatuses = new Set(lifecycleStages.map((stage) => stage.name));
    // Any valid lifecycle stage may be set on a brand-new record — transition rules
    // apply only when moving an *existing* record between stages, not on initial creation.
    if (requestedStatus && !allowedStatuses.has(requestedStatus)) {
      setMessage('Status must match an admin-defined lifecycle stage.');
      return;
    }
    const normalizedStatus =
      requestedStatus && allowedStatuses.has(requestedStatus)
        ? requestedStatus
        : defaultLifecycleStage?.name ?? lifecycleStages[0]?.name ?? 'Record';

    const recordId = `record-${Date.now()}-${Math.floor(Math.random() * 100000)}`;

    // Derive a meaningful title from the form values (first non-status, non-trivial value)
    const TITLE_KEYS = /serial|lot|order|product|name|title|device|patient|reference|item|batch|subject|case/i;
    const derivedTitle = (() => {
      const entries = Object.entries(formValues).filter(([k, v]) => k !== 'status' && v && TITLE_KEYS.test(k));
      if (entries.length > 0) {
        const [, val] = entries[0];
        return `${selectedSubSpace.name} — ${val}`;
      }
      const firstVal = Object.entries(formValues).find(([k, v]) => k !== 'status' && v);
      return firstVal ? `${selectedSubSpace.name} — ${firstVal[1]}` : `${selectedSubSpace.name} item`;
    })();

    const newRecord: RuntimeRecord = {
      id: recordId,
      clientId: selectedClientId,
      workspaceId: workspace.id,
      subSpaceId: selectedSubSpace.id,
      title: derivedTitle,
      status: normalizedStatus,
      amount,
      date: formValues.date,
      tags: [clientTag, workspaceTag, subSpaceTag, ...(tagCarrier ? [tagCarrier] : [])],
      imageUri: getRecordPlaceholderImage(workspace.name),
      data: Object.entries(formValues).reduce<Record<string, string | number>>((acc, [key, value]) => {
        acc[key] = toNumericValue(value);
        return acc;
      }, {}),
    };

    addRecord(newRecord);
    setFormValues({});
    setMessage('Entry created through governed form.');
    return newRecord;
  };

  const moveRecordToSubSpace = (recordId: string, targetSubSpaceId: string) => {
    if (!can('record.update', workspace?.id)) {
      return;
    }
    updateRecord(recordId, { subSpaceId: targetSubSpaceId });
  };

  return {
    shellConfig,
    workspaces,
    workspace,
    selectedWorkspaceId,
    setSelectedWorkspaceId,
    visibleSubSpaces,
    selectedSubSpaceId,
    setSelectedSubSpaceId,
    selectedSubSpace,
    selectedRecords,
    clientWorkspaceSummary,
    clientTimeline,
    recordCountBySubSpace,
    allRecordsForWorkspace,
    recordsBySubSpaceName,
    dashboardKpis,
    stageDistribution,
    activeForm,
    lifecycleStages,
    lifecycleTransitions: applicableLifecycleTransitions,
    allowedLifecycleStageNames,
    defaultLifecycleStageName: defaultLifecycleStage?.name ?? '',
    formValues,
    message,
    userProgress,
    flows: data.flows,
    setField,
    setLifecycleStatus,
    submit,
    moveRecordToSubSpace,
    updateRecord,
    deleteRecord,
  };
}
