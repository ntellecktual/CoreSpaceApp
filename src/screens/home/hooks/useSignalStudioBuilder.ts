import { useMemo, useState } from 'react';
import { useAppState } from '../../../context/AppStateContext';
import { FlowTriggerType, ScheduleConfig, SignalFlow, WebhookConfig } from '../../../types';
import { useRbac } from './useRbac';

export function useSignalStudioBuilder() {
  const { data, upsertFlow } = useAppState();
  const { can, deniedMessage } = useRbac();

  // ── Workspace / SubSpace selector (no longer hardcoded to [0]) ──
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState(data.workspaces[0]?.id ?? '');
  const selectedWorkspace = useMemo(
    () => data.workspaces.find((w) => w.id === selectedWorkspaceId) ?? data.workspaces[0],
    [data.workspaces, selectedWorkspaceId],
  );
  const [selectedSubSpaceId, setSelectedSubSpaceId] = useState(selectedWorkspace?.subSpaces[0]?.id ?? '');
  const selectedSubSpace = useMemo(
    () => selectedWorkspace?.subSpaces.find((ss) => ss.id === selectedSubSpaceId) ?? selectedWorkspace?.subSpaces[0],
    [selectedWorkspace, selectedSubSpaceId],
  );
  const workspaceId = selectedWorkspace?.id ?? '';
  const subSpaceId = selectedSubSpace?.id ?? '';

  const [name, setName] = useState('');
  const [signal, setSignal] = useState('');
  const [rules, setRules] = useState('');
  const [action, setAction] = useState('');
  const [tags, setTags] = useState('');
  const [runOnExisting, setRunOnExisting] = useState(false);
  const [triggerType, setTriggerType] = useState<FlowTriggerType>('event');
  const [webhookConfig, setWebhookConfig] = useState<WebhookConfig>({ endpointPath: '', method: 'POST' });
  const [scheduleConfig, setScheduleConfig] = useState<ScheduleConfig>({ frequency: 'daily', time: '09:00' });
  const [info, setInfo] = useState('');

  // ── Flows filtered to selected workspace ──
  const flowsForWorkspace = useMemo(
    () => data.flows.filter((f) => f.workspaceId === workspaceId),
    [data.flows, workspaceId],
  );

  const parsedRules = useMemo(() => rules.split(';').map((item) => item.trim()).filter(Boolean), [rules]);
  const parsedTags = useMemo(() => tags.split(',').map((item) => item.trim()).filter(Boolean), [tags]);

  const toggleRunOnExisting = () => setRunOnExisting((value) => !value);

  const upsertFlowWithStatus = (status: 'draft' | 'published') => {
    if (!workspaceId || !subSpaceId) {
      const message = 'Create at least one workspace and one subspace before saving a flow.';
      setInfo(message);
      return message;
    }

    if (!can('flow.publish', workspaceId)) {
      const message = deniedMessage('flow.publish');
      setInfo(message);
      return message;
    }

    const resolvedName = name.trim() || 'Untitled Flow';
    const existing = data.flows.find(
      (item) => item.workspaceId === workspaceId && item.subSpaceId === subSpaceId && item.name.toLowerCase() === resolvedName.toLowerCase(),
    );

    const flow: SignalFlow = {
      id: existing?.id ?? '',
      name: resolvedName,
      signal: signal.trim() || 'New item added',
      workspaceId,
      subSpaceId,
      rules: parsedRules,
      action: action.trim() || 'Create item',
      runOnExisting,
      targetTags: parsedTags,
      status,
      triggerType,
      ...(triggerType === 'webhook' ? { webhookConfig } : {}),
      ...(triggerType === 'schedule' ? { scheduleConfig } : {}),
      totalRuns: existing?.totalRuns ?? 0,
      failures7d: existing?.failures7d ?? 0,
      avgTimeMs: existing?.avgTimeMs ?? 0,
      lastRun: existing?.lastRun ?? 'Not yet',
    };

    upsertFlow(flow);
    const message = status === 'published' ? 'Flow published.' : 'Flow draft saved.';
    setInfo(message);
    return message;
  };

  const saveDraft = () => upsertFlowWithStatus('draft');

  const publish = () => {
    upsertFlowWithStatus('published');
  };

  const applyWarehouseServiceFlowPack = () => {
    if (!workspaceId || !subSpaceId) {
      const message = 'Create at least one workspace and one subspace before loading starter flows.';
      setInfo(message);
      return message;
    }

    if (!can('flow.publish', workspaceId)) {
      const message = deniedMessage('flow.publish');
      setInfo(message);
      return message;
    }

    // ── DSCSA Supply Chain Flow Pack (distributed across workspaces) ──
    const dscsaFlows: Array<Pick<SignalFlow, 'name' | 'signal' | 'rules' | 'action' | 'runOnExisting' | 'targetTags'> & { targetWorkspaceId: string; targetSubSpaceId: string }> = [
      {
        name: 'Serial Mismatch Alert',
        signal: 'Verification result contains mismatches',
        rules: ['mismatch-count > 0', 'verification-result = Mismatch'],
        action: 'Flag batch for Exception Review, notify Compliance Trace Analyst',
        runOnExisting: true,
        targetTags: ['Alert:SerialMismatch', 'Priority:High'],
        targetWorkspaceId: 'ws-distributor-verification',
        targetSubSpaceId: 'ss-serial-verification',
      },
      {
        name: 'Suspect Product Escalation',
        signal: 'Exception opened with type Suspect',
        rules: ['exception-type = Suspect', 'exception-status = Open'],
        action: 'Create investigation case, quarantine batch, alert all supply chain personas',
        runOnExisting: true,
        targetTags: ['Suspect', 'Quarantine', 'Priority:Critical'],
        targetWorkspaceId: 'ws-network-traceability',
        targetSubSpaceId: 'ss-suspect-investigation',
      },
      {
        name: 'Expiration Warning',
        signal: 'Inventory unit approaching expiration',
        rules: ['days_to_expiration <= 90', 'inventory-status = InStock'],
        action: 'Tag unit as expiring soon, notify Pharmacy Dispense Manager',
        runOnExisting: true,
        targetTags: ['Alert:ExpiringSoon', 'Priority:Medium'],
        targetWorkspaceId: 'ws-pharmacy-dispense',
        targetSubSpaceId: 'ss-serial-inventory',
      },
      {
        name: 'Auto-Advance on Ship Confirmation',
        signal: 'Shipment document created for batch',
        rules: ['upload-status = Confirmed', 'acknowledgement is set'],
        action: 'Transition lifecycle to Shipped to Distributor, post EPCIS event',
        runOnExisting: false,
        targetTags: ['Lifecycle:AutoAdvance', 'EPCIS'],
        targetWorkspaceId: 'ws-manufacturer-serialization',
        targetSubSpaceId: 'ss-epcis-upload',
      },
      {
        name: 'Dispense Completion Logger',
        signal: 'Unit dispensed to patient',
        rules: ['dispense-unit-serial is set', 'dispense-rx-reference is set'],
        action: 'Transition lifecycle to Dispensed, log trace ledger event, update inventory status',
        runOnExisting: false,
        targetTags: ['Lifecycle:Dispensed', 'Trace:Complete'],
        targetWorkspaceId: 'ws-pharmacy-dispense',
        targetSubSpaceId: 'ss-dispense-logging',
      },
    ];

    for (const template of dscsaFlows) {
      const resolvedWsId = data.workspaces.find((w) => w.id === template.targetWorkspaceId)?.id ?? workspaceId;
      const resolvedSsId = data.workspaces
        .find((w) => w.id === template.targetWorkspaceId)
        ?.subSpaces.find((ss) => ss.id === template.targetSubSpaceId)?.id ?? subSpaceId;

      const existing = data.flows.find(
        (item) => item.workspaceId === resolvedWsId && item.subSpaceId === resolvedSsId && item.name.toLowerCase() === template.name.toLowerCase(),
      );

      upsertFlow({
        id: existing?.id ?? '',
        name: template.name,
        signal: template.signal,
        workspaceId: resolvedWsId,
        subSpaceId: resolvedSsId,
        rules: template.rules,
        action: template.action,
        runOnExisting: template.runOnExisting,
        targetTags: template.targetTags,
        status: 'published',
        triggerType: 'event',
        totalRuns: existing?.totalRuns ?? 0,
        failures7d: existing?.failures7d ?? 0,
        avgTimeMs: existing?.avgTimeMs ?? 0,
        lastRun: existing?.lastRun ?? 'Not yet',
      });
    }

    const message = 'DSCSA Supply Chain flow pack loaded and published across workspaces.';
    setInfo(message);
    return message;
  };

  return {
    flows: data.flows,
    flowsForWorkspace,
    workspaces: data.workspaces,
    selectedWorkspaceId,
    setSelectedWorkspaceId,
    selectedWorkspace,
    selectedSubSpaceId,
    setSelectedSubSpaceId,
    selectedSubSpace,
    name,
    setName,
    signal,
    setSignal,
    rules,
    setRules,
    action,
    setAction,
    tags,
    setTags,
    runOnExisting,
    info,
    toggleRunOnExisting,
    triggerType,
    setTriggerType,
    webhookConfig,
    setWebhookConfig,
    scheduleConfig,
    setScheduleConfig,
    applyWarehouseServiceFlowPack,
    saveDraft,
    publish,
  };
}
