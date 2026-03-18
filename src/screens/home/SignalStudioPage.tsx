import React, { useEffect, useRef, useState } from 'react';
import { Platform, ScrollView, Text, TextInput, View, useWindowDimensions } from 'react-native';

/* ── Local sub-types ────────────────────────────────────────────── */
type ActionStepType =
  | 'notify_team' | 'update_field' | 'set_lifecycle_stage' | 'create_record'
  | 'call_webhook' | 'send_email' | 'add_tag' | 'remove_tag';
interface ActionStep { id: string; type: ActionStepType; config: string }
interface CondRow { id: string; field: string; op: string; value: string }
interface CondGroup { id: string; combinator: 'AND' | 'OR'; rows: CondRow[] }
type FlowEventStatus = 'success' | 'failed' | 'skipped';
interface FlowEvent { id: string; flowName: string; ts: string; status: FlowEventStatus; durationMs: number; note: string }

const ACTION_STEP_LABELS: Record<ActionStepType, { icon: string; label: string; placeholder: string }> = {
  notify_team:          { icon: '🔔', label: 'Notify Team',          placeholder: 'Channel or user…' },
  update_field:         { icon: '✏️', label: 'Update Field',          placeholder: 'field = value…' },
  set_lifecycle_stage:  { icon: '🔄', label: 'Set Lifecycle Stage',   placeholder: 'Stage name…' },
  create_record:        { icon: '📄', label: 'Create Record',         placeholder: 'Workspace / SubSpace…' },
  call_webhook:         { icon: '🌐', label: 'Call Webhook',          placeholder: 'https://…' },
  send_email:           { icon: '✉️', label: 'Send Email',            placeholder: 'Template name or address…' },
  add_tag:              { icon: '🏷️', label: 'Add Tag',               placeholder: 'Tag name…' },
  remove_tag:           { icon: '🗑️', label: 'Remove Tag',            placeholder: 'Tag name…' },
};

const COND_OPS = ['equals', 'not equals', 'contains', 'starts with', '>', '<', '>=', '<=', 'is empty', 'is not empty'];

function makeId() { return Math.random().toString(36).slice(2, 9); }

function seedFlowEvents(flows: { name: string }[]): FlowEvent[] {
  if (!flows.length) return [];
  const statuses: FlowEventStatus[] = ['success', 'success', 'success', 'failed', 'skipped'];
  const notes = [
    'Trigger matched, all actions completed.',
    'Field update applied to 3 records.',
    'Notification dispatched via Slack connector.',
    'Webhook endpoint returned 500.',
    'No matching records for tag filter.',
  ];
  return Array.from({ length: 8 }, (_, i) => {
    const st = statuses[i % statuses.length];
    const fl = flows[i % flows.length];
    const d = new Date(Date.now() - i * 1000 * 60 * 34);
    return {
      id: `evt-${i}`,
      flowName: fl.name,
      ts: d.toLocaleString(),
      status: st,
      durationMs: 80 + Math.round(Math.random() * 420),
      note: notes[i % notes.length],
    };
  });
}
import { InteractivePressable as Pressable } from '../../components/InteractivePressable';
import { AiChatPanel } from '../../components/AiChatPanel';
import { useUiTheme } from '../../context/UiThemeContext';
import { useAppState } from '../../context/AppStateContext';
import { Card, HintStrip, LabeledInput, ProcessStepper } from './components';
import { signalSteps } from './constants';
import { useRbac } from './hooks/useRbac';
import { useSignalStudioBuilder } from './hooks/useSignalStudioBuilder';
import { useAiFlowBuilder } from '../../ai/useAiHooks';
import { GuidedPageProps } from './types';

export function SignalStudioPage({ guidedMode, onGuide, registerActions, auditLog, addNotification }: GuidedPageProps) {
  const { styles, mode } = useUiTheme();
  const { width: windowWidth } = useWindowDimensions();
  const { data: appData } = useAppState();
  const [signalPane, setSignalPane] = useState<'builder' | 'conditions' | 'chain' | 'monitor' | 'eventlog'>('builder');
  const [expandedSignalSections, setExpandedSignalSections] = useState<Record<string, boolean>>({ design: true, monitoring: false });
  const { can, deniedMessage } = useRbac();
  const canPublishFlow = can('flow.publish');
  const {
    flows,
    flowsForWorkspace,
    workspaces: builderWorkspaces,
    selectedWorkspaceId: builderSelectedWsId,
    setSelectedWorkspaceId: setBuilderSelectedWsId,
    selectedWorkspace: builderSelectedWs,
    selectedSubSpaceId: builderSelectedSsId,
    setSelectedSubSpaceId: setBuilderSelectedSsId,
    selectedSubSpace: builderSelectedSs,
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
  } = useSignalStudioBuilder();
  const aiFlow = useAiFlowBuilder();
  const [aiFlowPanelOpen, setAiFlowPanelOpen] = useState(false);

  // Enhanced: action chain, condition groups, event log
  const [actionChain, setActionChain] = useState<ActionStep[]>([
    { id: makeId(), type: 'notify_team', config: '' },
  ]);
  const [condGroups, setCondGroups] = useState<CondGroup[]>([
    { id: makeId(), combinator: 'AND', rows: [{ id: makeId(), field: '', op: 'equals', value: '' }] },
  ]);
  const [flowEvents, setFlowEvents] = useState<FlowEvent[]>([]);
  // Seed event log once flows are available
  const eventsSeeded = useRef(false);
  useEffect(() => {
    if (!eventsSeeded.current && flows.length) {
      setFlowEvents(seedFlowEvents(flows));
      eventsSeeded.current = true;
    }
  }, [flows]);

  const addActionStep = () => setActionChain((c) => [...c, { id: makeId(), type: 'notify_team', config: '' }]);
  const removeActionStep = (id: string) => setActionChain((c) => c.filter((s) => s.id !== id));
  const updateActionStep = (id: string, key: keyof ActionStep, val: string) =>
    setActionChain((c) => c.map((s) => s.id === id ? { ...s, [key]: val } : s));

  const addCondGroup = () =>
    setCondGroups((g) => [...g, { id: makeId(), combinator: 'AND', rows: [{ id: makeId(), field: '', op: 'equals', value: '' }] }]);
  const removeCondGroup = (gid: string) => setCondGroups((g) => g.filter((gr) => gr.id !== gid));
  const toggleCombinator = (gid: string) =>
    setCondGroups((g) => g.map((gr) => gr.id === gid ? { ...gr, combinator: gr.combinator === 'AND' ? 'OR' : 'AND' } : gr));
  const addCondRow = (gid: string) =>
    setCondGroups((g) => g.map((gr) => gr.id === gid ? { ...gr, rows: [...gr.rows, { id: makeId(), field: '', op: 'equals', value: '' }] } : gr));
  const removeCondRow = (gid: string, rid: string) =>
    setCondGroups((g) => g.map((gr) => gr.id === gid ? { ...gr, rows: gr.rows.filter((r) => r.id !== rid) } : gr));
  const updateCondRow = (gid: string, rid: string, key: keyof CondRow, val: string) =>
    setCondGroups((g) => g.map((gr) => gr.id === gid
      ? { ...gr, rows: gr.rows.map((r) => r.id === rid ? { ...r, [key]: val } : r) }
      : gr,
    ));

  useEffect(() => {
    registerActions?.({
      saveDraftLabel: 'Save Flow Draft',
      publishLabel: 'Publish Flow',
      saveDraft: () => { saveDraft(); auditLog?.logEntry({ action: 'create', entityType: 'flow', entityId: name || 'draft', entityName: name || 'Unnamed Flow', after: { status: 'draft' } }); addNotification?.({ type: 'system', title: 'Flow Draft Saved', body: `Flow "${name || 'Unnamed Flow'}" saved as draft.`, severity: 'info' }); },
      publish: () => { publish(); auditLog?.logEntry({ action: 'publish', entityType: 'flow', entityId: name || 'draft', entityName: name || 'Unnamed Flow', after: { signal, action, tags } }); addNotification?.({ type: 'flow-triggered', title: 'Flow Published', body: `Flow "${name || 'Unnamed Flow'}" has been published.`, severity: 'success' }); },
    });
  }, [registerActions, saveDraft, publish, auditLog, addNotification, name, signal, action, tags]);

  useEffect(() => {
    return () => {
      registerActions?.(null);
    };
  }, [registerActions]);

  const useCompactSignalShell = windowWidth < 900;

  const toggleSignalSection = (section: string) => {
    setExpandedSignalSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const signalNavSections = [
    {
      key: 'design',
      label: 'Flow Design',
      description: 'Create automation rules with triggers, conditions, and actions.',
      items: [
        { label: 'Build Flow', detail: 'Create triggers, rules, and automation actions', onPress: () => setSignalPane('builder') },
        { label: 'Condition Groups', detail: 'Visual AND/OR condition builder for complex rules', onPress: () => setSignalPane('conditions') },
        { label: 'Action Chain', detail: 'Multi-step action sequence triggered by this flow', onPress: () => setSignalPane('chain') },
        { label: 'Flow Packs', detail: 'Load pre-built automation templates', onPress: () => { setSignalPane('builder'); applyWarehouseServiceFlowPack(); } },
        { label: 'Bebo Flow Builder', detail: 'Describe a flow in plain English and let Bebo build it', onPress: () => { setAiFlowPanelOpen(true); if (!aiFlow.session) aiFlow.startSession('flow_builder'); } },
      ],
    },
    {
      key: 'monitoring',
      label: 'Flow Monitoring',
      description: 'Track published flow performance, run counts, and failure rates.',
      items: [
        { label: 'Active Flows', detail: 'Published flows, run counts, and SLA metrics', onPress: () => setSignalPane('monitor') },
        { label: 'Flow Event Log', detail: 'Recent executions with status and duration', onPress: () => setSignalPane('eventlog') },
      ],
    },
  ];

  const signalNavToSection: Record<string, string> = {
    builder: 'design',
    conditions: 'design',
    chain: 'design',
    monitor: 'monitoring',
    eventlog: 'monitoring',
  };

  const signalActiveNavItemKey =
    signalPane === 'builder' ? 'Build Flow' :
    signalPane === 'conditions' ? 'Condition Groups' :
    signalPane === 'chain' ? 'Action Chain' :
    signalPane === 'eventlog' ? 'Flow Event Log' : 'Active Flows';

  const signalContentHeaders: Record<string, { title: string; description: string }> = {
    builder: {
      title: 'Build Flow',
      description: 'Define the trigger event, add conditional rules, and choose the action the system takes. Tag records to scope which items are affected.',
    },
    conditions: {
      title: 'Condition Groups',
      description: 'Build visual AND/OR condition groups to precisely control when this flow fires. Each group can have multiple field-level conditions.',
    },
    chain: {
      title: 'Action Chain',
      description: 'Define a sequence of actions that run in order when this flow fires. Drag to reorder, remove steps, or add new action types.',
    },
    monitor: {
      title: 'Active Flows',
      description: 'Review published automations, track total runs and recent failures, and monitor average execution time across your workflows.',
    },
    eventlog: {
      title: 'Flow Event Log',
      description: 'A real-time log of recent flow executions showing trigger timestamps, execution duration, and pass/fail status.',
    },
  };

  return (
    <>
    <ScrollView style={styles.pageWrap} contentContainerStyle={[styles.pageContent, styles.pageContentTight]} keyboardShouldPersistTaps="handled">
      {guidedMode && (
        <>
          <ProcessStepper title="Signal Studio Process" steps={signalSteps} activeIndex={0} />
          <HintStrip steps={signalSteps} onGuide={onGuide} />
        </>
      )}

      <View style={[styles.adminShell, useCompactSignalShell && { flexDirection: 'column' }]}>
        {/* ── Left Pane: Signal Studio Navigation ── */}
        <View style={[styles.adminNavPane, useCompactSignalShell && styles.adminNavPaneCompact]}>
          {signalNavSections.map((section) => {
            const isExpanded = expandedSignalSections[section.key];
            const isSectionActive = signalNavToSection[signalPane] === section.key;
            return (
              <View key={section.key} style={styles.adminNavSection}>
                <Pressable
                  style={[styles.adminNavSectionHeader, isSectionActive && styles.adminNavSectionHeaderActive]}
                  onPress={() => {
                    toggleSignalSection(section.key);
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
                      const isActive = signalActiveNavItemKey === item.label;
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
        <View style={[styles.adminContentPane, useCompactSignalShell && styles.adminContentPaneCompact]}>
          <View style={styles.adminContentHeader}>
            <Text style={styles.adminContentTitle}>{signalContentHeaders[signalPane].title}</Text>
            <Text style={styles.adminContentDescription}>{signalContentHeaders[signalPane].description}</Text>
          </View>

        {!canPublishFlow && <Text style={styles.notice}>{deniedMessage('flow.publish')}</Text>}

        {signalPane === 'builder' && (
          <Card title="Build Flow" blurred>
            <Text style={styles.metaText}>Target Workspace</Text>
            <View style={styles.inlineRow}>
              {builderWorkspaces.map((ws) => (
                <Pressable key={ws.id} style={[styles.pill, builderSelectedWsId === ws.id && styles.pillActive]} onPress={() => setBuilderSelectedWsId(ws.id)}>
                  <Text style={[styles.pillText, builderSelectedWsId === ws.id && styles.pillTextActive]}>{ws.name}</Text>
                </Pressable>
              ))}
            </View>
            {builderSelectedWs && (
              <>
                <Text style={styles.metaText}>Target SubSpace</Text>
                <View style={styles.inlineRow}>
                  {builderSelectedWs.subSpaces.map((ss) => (
                    <Pressable key={ss.id} style={[styles.pill, builderSelectedSsId === ss.id && styles.pillActive]} onPress={() => setBuilderSelectedSsId(ss.id)}>
                      <Text style={[styles.pillText, builderSelectedSsId === ss.id && styles.pillTextActive]}>{ss.name}</Text>
                    </Pressable>
                  ))}
                </View>
              </>
            )}

            <Text style={styles.metaText}>Trigger Type</Text>
            <View style={styles.inlineRow}>
              {(['event', 'webhook', 'schedule'] as const).map((t) => (
                <Pressable key={t} style={[styles.pill, triggerType === t && styles.pillActive]} onPress={() => setTriggerType(t)}>
                  <Text style={[styles.pillText, triggerType === t && styles.pillTextActive]}>{t.charAt(0).toUpperCase() + t.slice(1)}</Text>
                </Pressable>
              ))}
            </View>

            {triggerType === 'webhook' && (
              <View style={{ gap: 6, marginBottom: 8 }}>
                <LabeledInput label="Endpoint path" helperText="Relative path for the webhook (e.g. /hooks/my-flow)." value={webhookConfig.endpointPath} onChangeText={(v) => setWebhookConfig((c) => ({ ...c, endpointPath: v }))} placeholder="/hooks/..." />
                <Text style={styles.metaText}>HTTP Method</Text>
                <View style={styles.inlineRow}>
                  {(['POST', 'GET'] as const).map((m) => (
                    <Pressable key={m} style={[styles.pill, webhookConfig.method === m && styles.pillActive]} onPress={() => setWebhookConfig((c) => ({ ...c, method: m }))}>
                      <Text style={[styles.pillText, webhookConfig.method === m && styles.pillTextActive]}>{m}</Text>
                    </Pressable>
                  ))}
                </View>
                <LabeledInput label="Secret (optional)" helperText="HMAC secret for webhook signature verification." value={webhookConfig.secret ?? ''} onChangeText={(v) => setWebhookConfig((c) => ({ ...c, secret: v || undefined }))} placeholder="optional-secret" />
              </View>
            )}

            {triggerType === 'schedule' && (
              <View style={{ gap: 6, marginBottom: 8 }}>
                <Text style={styles.metaText}>Frequency</Text>
                <View style={styles.inlineRow}>
                  {(['hourly', 'daily', 'weekly', 'monthly', 'custom'] as const).map((f) => (
                    <Pressable key={f} style={[styles.pill, scheduleConfig.frequency === f && styles.pillActive]} onPress={() => setScheduleConfig((c) => ({ ...c, frequency: f }))}>
                      <Text style={[styles.pillText, scheduleConfig.frequency === f && styles.pillTextActive]}>{f.charAt(0).toUpperCase() + f.slice(1)}</Text>
                    </Pressable>
                  ))}
                </View>
                {scheduleConfig.frequency !== 'custom' && (
                  <LabeledInput label="Run at time" helperText="Time of day for the scheduled run (HH:MM)." value={scheduleConfig.time ?? ''} onChangeText={(v) => setScheduleConfig((c) => ({ ...c, time: v }))} placeholder="09:00" />
                )}
                {scheduleConfig.frequency === 'weekly' && (
                  <LabeledInput label="Day of week (0=Sun, 6=Sat)" helperText="Which day should this run?" value={String(scheduleConfig.dayOfWeek ?? 1)} onChangeText={(v) => setScheduleConfig((c) => ({ ...c, dayOfWeek: Number(v) || 0 }))} placeholder="1" />
                )}
                {scheduleConfig.frequency === 'custom' && (
                  <LabeledInput label="Cron expression" helperText="Standard cron expression (e.g. 0 9 * * 1-5)." value={scheduleConfig.cronExpression ?? ''} onChangeText={(v) => setScheduleConfig((c) => ({ ...c, cronExpression: v }))} placeholder="0 9 * * 1-5" />
                )}
              </View>
            )}

            <Pressable disabled={!canPublishFlow} style={[styles.secondaryButton, !canPublishFlow && styles.buttonDisabled]} onPress={() => { applyWarehouseServiceFlowPack(); auditLog?.logEntry({ action: 'import', entityType: 'flow', entityId: 'dscsa-flow-pack', entityName: 'DSCSA Supply Chain Flow Pack', after: { flows: 5 } }); addNotification?.({ type: 'system', title: 'Flow Pack Imported', body: 'DSCSA Supply Chain Flow Pack loaded with 5 automation flows.', severity: 'success' }); }}>
              <Text style={styles.secondaryButtonText}>Load DSCSA Supply Chain Flow Pack</Text>
            </Pressable>
            <LabeledInput label="Flow name" helperText="Give this automation a short name." value={name} onChangeText={setName} placeholder="Example: Auto Triage on Risk" />
            <LabeledInput label="When this happens" helperText="The event that starts this automation." value={signal} onChangeText={setSignal} placeholder="Example: Unit enters risk watchlist" />
            <LabeledInput label="Rules (use ; between rules)" helperText="Each rule should be short and clear." value={rules} onChangeText={setRules} multiline placeholder="Example: stage = Received; sla_due_hours <= 24" />
            <LabeledInput label="Then do this action" helperText="What should the system do next?" value={action} onChangeText={setAction} placeholder="Example: Move to Triage lane and alert owner" />
            <LabeledInput label="Target tags (comma separated)" helperText="Only records with these tags will run this flow." value={tags} onChangeText={setTags} multiline placeholder="Example: Strategic, SLA-24h" />
            <Pressable style={[styles.secondaryButton, runOnExisting && styles.pillActive]} onPress={toggleRunOnExisting}>
              <Text style={[styles.secondaryButtonText, runOnExisting && styles.pillTextActive]}>
                Run on older records too: {runOnExisting ? 'Yes' : 'No'}
              </Text>
            </Pressable>
            <Pressable disabled={!canPublishFlow} style={[styles.primaryButton, !canPublishFlow && styles.buttonDisabled]} onPress={() => { publish(); auditLog?.logEntry({ action: 'publish', entityType: 'flow', entityId: name || 'draft', entityName: name || 'Unnamed Flow', after: { signal, action, tags } }); addNotification?.({ type: 'flow-triggered', title: 'Flow Published', body: `Flow "${name || 'Unnamed Flow'}" has been published.`, severity: 'success' }); }}>
              <Text style={styles.primaryButtonText}>Publish Flow</Text>
            </Pressable>
            {!!info && <Text style={styles.notice}>{info}</Text>}
          </Card>
        )}

        {signalPane === 'monitor' && (
          <Card title="Active Flows" blurred>
            <Text style={styles.metaText}>Filter by Workspace</Text>
            <View style={styles.inlineRow}>
              <Pressable style={[styles.pill, builderSelectedWsId === '' && styles.pillActive]} onPress={() => setBuilderSelectedWsId('')}>
                <Text style={[styles.pillText, builderSelectedWsId === '' && styles.pillTextActive]}>All Workspaces</Text>
              </Pressable>
              {builderWorkspaces.map((ws) => (
                <Pressable key={ws.id} style={[styles.pill, builderSelectedWsId === ws.id && styles.pillActive]} onPress={() => setBuilderSelectedWsId(ws.id)}>
                  <Text style={[styles.pillText, builderSelectedWsId === ws.id && styles.pillTextActive]}>{ws.name}</Text>
                </Pressable>
              ))}
            </View>
            {(builderSelectedWsId ? flowsForWorkspace : flows).length === 0 && (
              <View style={{ backgroundColor: mode === 'night' ? 'rgba(140,91,245,0.07)' : 'rgba(140,91,245,0.04)', borderRadius: 12, padding: 20, borderWidth: 1, borderColor: 'rgba(140,91,245,0.18)', gap: 12 }}>
                <View style={{ alignItems: 'center', gap: 6 }}>
                  <Text style={{ fontSize: 30 }}>⚡</Text>
                  <Text style={{ color: mode === 'night' ? '#E8E4FF' : '#1a1030', fontSize: 15, fontWeight: '800', textAlign: 'center' }}>No automation flows yet</Text>
                  <Text style={{ color: mode === 'night' ? 'rgba(255,255,255,0.50)' : 'rgba(0,0,0,0.50)', fontSize: 12, textAlign: 'center', maxWidth: 440, lineHeight: 18 }}>Load a pre-built flow pack to see how automation works, or build a flow manually in the Flow Designer tab.</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' as any, justifyContent: 'center' }}>
                  <Pressable
                    disabled={!canPublishFlow}
                    style={[{ backgroundColor: '#8C5BF5', borderRadius: 8, paddingVertical: 9, paddingHorizontal: 16, alignItems: 'center' }, !canPublishFlow && { opacity: 0.4 }]}
                    onPress={() => { applyWarehouseServiceFlowPack(); auditLog?.logEntry({ action: 'import', entityType: 'flow', entityId: 'dscsa-flow-pack', entityName: 'DSCSA Supply Chain Flow Pack', after: { flows: 5 } }); addNotification?.({ type: 'system', title: 'Flow Pack Imported', body: 'DSCSA Supply Chain Flow Pack loaded with 5 automation flows.', severity: 'success' }); }}
                  >
                    <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 12 }}>📥 Load DSCSA Flow Pack</Text>
                  </Pressable>
                  <Pressable
                    style={{ backgroundColor: mode === 'night' ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)', borderRadius: 8, paddingVertical: 9, paddingHorizontal: 16, alignItems: 'center', borderWidth: 1, borderColor: mode === 'night' ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.10)' }}
                    onPress={() => setSignalPane('builder')}
                  >
                    <Text style={{ color: mode === 'night' ? 'rgba(255,255,255,0.75)' : 'rgba(0,0,0,0.70)', fontWeight: '600', fontSize: 12 }}>✏️ Build a Flow Manually</Text>
                  </Pressable>
                </View>
              </View>
            )}
            {(builderSelectedWsId ? flowsForWorkspace : flows).map((flow) => {
              const ws = builderWorkspaces.find((w) => w.id === flow.workspaceId);
              const ss = ws?.subSpaces.find((s) => s.id === flow.subSpaceId);
              // Resolve business object context
              const bizObj = flow.businessObjectId
                ? (appData.businessFunctions ?? []).flatMap(f => f.objects).find(o => o.id === flow.businessObjectId)
                : (appData.businessFunctions ?? []).flatMap(f => f.objects).find(o => o.workspaceIds.includes(flow.workspaceId));
              const bizFn = bizObj
                ? (appData.businessFunctions ?? []).find(f => f.objects.some(o => o.id === bizObj.id))
                : null;
              return (
                <View key={flow.id} style={styles.listCard}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <Text style={[styles.listTitle, { flex: 1 }]}>{flow.name}</Text>
                    {bizObj && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: `${bizFn?.color ?? '#8C5BF5'}18`, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2, borderWidth: 1, borderColor: `${bizFn?.color ?? '#8C5BF5'}33` }}>
                        {!!bizObj.icon && <Text style={{ fontSize: 11 }}>{bizObj.icon}</Text>}
                        <Text style={{ fontSize: 10, fontWeight: '700', color: bizFn?.color ?? '#8C5BF5' }}>{bizObj.name}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.metaText}>{ws?.name ?? 'Unknown'} → {ss?.name ?? 'Unknown'}</Text>
                  <Text style={styles.metaText}>{flow.signal} • {flow.status.toUpperCase()} • Trigger: {flow.triggerType ?? 'event'}</Text>
                  <Text style={styles.metaText}>Runs: {flow.totalRuns.toLocaleString()} • Failures (7d): {flow.failures7d} • Avg: {flow.avgTimeMs.toLocaleString()} ms</Text>
                  {flow.lastRun && <Text style={styles.metaText}>Last run: {new Date(flow.lastRun).toLocaleString()}</Text>}
                  <Text style={styles.metaText}>Tags: {flow.targetTags.join(', ')}</Text>
                </View>
              );
            })}
          </Card>
        )}

        {/* ── Condition Groups pane ── */}
        {signalPane === 'conditions' && (
          <Card title="Condition Groups" blurred>
            <Text style={styles.bodyText}>
              Each group is evaluated independently. Within a group, all conditions must match (AND) or any must match (OR). Groups themselves are combined with AND between them.
            </Text>
            {condGroups.map((group, gi) => (
              <View key={group.id} style={[styles.listCard, { gap: 10 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <Text style={[styles.listTitle, { flex: 1 }]}>Group {gi + 1}</Text>
                  <Pressable
                    onPress={() => toggleCombinator(group.id)}
                    style={[styles.pill, styles.pillActive]}
                  >
                    <Text style={styles.pillTextActive}>{group.combinator}</Text>
                  </Pressable>
                  {condGroups.length > 1 && (
                    <Pressable onPress={() => removeCondGroup(group.id)} style={styles.pill}>
                      <Text style={styles.pillText}>Remove Group</Text>
                    </Pressable>
                  )}
                </View>
                {group.rows.map((row) => (
                  <View key={row.id} style={{ flexDirection: 'row', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                    <TextInput
                      style={[styles.input, { flex: 2, minWidth: 80 }]}
                      value={row.field}
                      onChangeText={(v) => updateCondRow(group.id, row.id, 'field', v)}
                      placeholder="field name"
                    />
                    <View style={{ flex: 2, minWidth: 100 }}>
                      {Platform.OS === 'web' ? (
                        <select
                          title="Condition operator"
                          value={row.op}
                          onChange={(e) => updateCondRow(group.id, row.id, 'op', e.target.value)}
                          style={{ fontSize: 13, padding: '7px 8px', borderRadius: 8, border: '1px solid rgba(111,75,207,0.22)', background: 'transparent', color: 'inherit', width: '100%', outline: 'none' }}
                        >
                          {COND_OPS.map((op) => <option key={op} value={op}>{op}</option>)}
                        </select>
                      ) : (
                        <TextInput style={[styles.input]} value={row.op} onChangeText={(v) => updateCondRow(group.id, row.id, 'op', v)} placeholder="operator" />
                      )}
                    </View>
                    <TextInput
                      style={[styles.input, { flex: 2, minWidth: 80 }]}
                      value={row.value}
                      onChangeText={(v) => updateCondRow(group.id, row.id, 'value', v)}
                      placeholder="value"
                    />
                    {group.rows.length > 1 && (
                      <Pressable onPress={() => removeCondRow(group.id, row.id)} style={{ paddingHorizontal: 8 }}>
                        <Text style={{ color: '#EF4444', fontSize: 18, lineHeight: 22 }}>×</Text>
                      </Pressable>
                    )}
                  </View>
                ))}
                <Pressable onPress={() => addCondRow(group.id)} style={styles.secondaryButton}>
                  <Text style={styles.secondaryButtonText}>+ Add Condition</Text>
                </Pressable>
              </View>
            ))}
            <Pressable onPress={addCondGroup} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>+ Add Condition Group</Text>
            </Pressable>
          </Card>
        )}

        {/* ── Action Chain pane ── */}
        {signalPane === 'chain' && (
          <Card title="Action Chain" blurred>
            <Text style={styles.bodyText}>
              Actions run sequentially in order. If any action fails and no retry policy is set, subsequent steps are skipped and the flow is marked failed.
            </Text>
            {actionChain.map((step, si) => {
              const meta = ACTION_STEP_LABELS[step.type];
              return (
                <View key={step.id} style={[styles.listCard, { gap: 8 }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={{ fontSize: 11, color: '#A78BFA', fontWeight: '800', minWidth: 22 }}>#{si + 1}</Text>
                    <Text style={{ fontSize: 16 }}>{meta.icon}</Text>
                    <View style={{ flex: 1 }}>
                      {Platform.OS === 'web' ? (
                        <select
                          title="Action step type"
                          value={step.type}
                          onChange={(e) => updateActionStep(step.id, 'type', e.target.value)}
                          style={{ fontSize: 13, padding: '7px 8px', borderRadius: 8, border: '1px solid rgba(111,75,207,0.22)', background: 'transparent', color: 'inherit', width: '100%', outline: 'none' }}
                        >
                          {(Object.keys(ACTION_STEP_LABELS) as ActionStepType[]).map((t) => (
                            <option key={t} value={t}>{ACTION_STEP_LABELS[t].icon} {ACTION_STEP_LABELS[t].label}</option>
                          ))}
                        </select>
                      ) : (
                        <Text style={styles.listTitle}>{meta.label}</Text>
                      )}
                    </View>
                    {actionChain.length > 1 && (
                      <Pressable onPress={() => removeActionStep(step.id)} style={{ paddingHorizontal: 8 }}>
                        <Text style={{ color: '#EF4444', fontSize: 18, lineHeight: 22 }}>×</Text>
                      </Pressable>
                    )}
                  </View>
                  <TextInput
                    style={styles.input}
                    value={step.config}
                    onChangeText={(v) => updateActionStep(step.id, 'config', v)}
                    placeholder={meta.placeholder}
                  />
                </View>
              );
            })}
            <Pressable onPress={addActionStep} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>+ Add Action Step</Text>
            </Pressable>
            <Pressable
              disabled={!canPublishFlow}
              style={[styles.primaryButton, !canPublishFlow && styles.buttonDisabled]}
              onPress={() => {
                const chainStr = actionChain.map((s, i) => `${i + 1}. ${ACTION_STEP_LABELS[s.type].label}: ${s.config || '(not configured)'}`).join(' → ');
                setAction(chainStr);
                publish();
                addNotification?.({ type: 'flow-triggered', title: 'Flow with Action Chain Published', body: `${actionChain.length} action steps chained and published.`, severity: 'success' });
              }}
            >
              <Text style={styles.primaryButtonText}>Save Chain &amp; Publish Flow</Text>
            </Pressable>
          </Card>
        )}

        {/* ── Flow Event Log pane ── */}
        {signalPane === 'eventlog' && (
          <Card title="Flow Event Log" blurred>
            {flowEvents.length === 0 && (
              <Text style={styles.bodyText}>No flow executions recorded yet. Publish a flow to start logging events.</Text>
            )}
            {flowEvents.map((evt) => {
              const statusColor = evt.status === 'success' ? '#22C55E' : evt.status === 'failed' ? '#EF4444' : '#F59E0B';
              const statusIcon = evt.status === 'success' ? '✅' : evt.status === 'failed' ? '❌' : '⏭️';
              return (
                <View key={evt.id} style={[styles.listCard, { gap: 4 }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={{ fontSize: 14 }}>{statusIcon}</Text>
                    <Text style={[styles.listTitle, { flex: 1 }]} numberOfLines={1}>{evt.flowName}</Text>
                    <View style={{ backgroundColor: statusColor + '22', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: statusColor + '44' }}>
                      <Text style={{ color: statusColor, fontSize: 11, fontWeight: '700' }}>{evt.status.toUpperCase()}</Text>
                    </View>
                  </View>
                  <Text style={styles.metaText}>{evt.ts} · {evt.durationMs} ms</Text>
                  <Text style={styles.metaText}>{evt.note}</Text>
                </View>
              );
            })}
            {flowEvents.length > 0 && (
              <Pressable
                onPress={() => setFlowEvents(seedFlowEvents(flows))}
                style={styles.secondaryButton}
              >
                <Text style={styles.secondaryButtonText}>↻ Simulate New Events</Text>
              </Pressable>
            )}
          </Card>
        )}
        </View>
      </View>

    </ScrollView>

      {aiFlowPanelOpen && (
        <AiChatPanel
          session={aiFlow.session}
          isThinking={aiFlow.isThinking}
          onSend={aiFlow.sendMessage}
          onApply={aiFlow.proposedFlow ? aiFlow.applyFlow : undefined}
          onDiscard={aiFlow.proposedFlow ? aiFlow.resetSession : undefined}
          onClose={() => setAiFlowPanelOpen(false)}
          hasProposal={!!aiFlow.proposedFlow}
          applyLabel="Apply Flow"
          discardLabel="Discard"
          title="Bebo Flow Builder"
        />
      )}
    </>
  );
}
