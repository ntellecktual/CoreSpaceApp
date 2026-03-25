import React, { useEffect, useMemo, useState } from 'react';
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

const ACTION_STEP_LABELS: Record<ActionStepType, { icon: string; label: string; description: string; placeholder: string }> = {
  notify_team:          { icon: '🔔', label: 'Notify the team',        description: 'Send a notification to a channel or person',           placeholder: 'e.g. #ops-channel or @manager' },
  update_field:         { icon: '✏️', label: 'Update a field',         description: 'Change a field value on the matching records',          placeholder: 'e.g. status = Approved' },
  set_lifecycle_stage:  { icon: '🔄', label: 'Move to a new stage',    description: 'Advance the record to the next stage in its workflow',  placeholder: 'e.g. In Review' },
  create_record:        { icon: '📄', label: 'Create a new record',    description: 'Automatically create a record in a workspace',         placeholder: 'e.g. HR / Onboarding SubSpace' },
  call_webhook:         { icon: '🌐', label: 'Call an outside system', description: 'Send data to an external app or service',              placeholder: 'e.g. https://hooks.zapier.com/...' },
  send_email:           { icon: '✉️', label: 'Send an email',          description: 'Email a person or team automatically',                 placeholder: 'e.g. admin@company.com' },
  add_tag:              { icon: '🏷️', label: 'Add a tag',              description: 'Tag the matching records for easy filtering',           placeholder: 'e.g. High Priority' },
  remove_tag:           { icon: '🗑️', label: 'Remove a tag',           description: 'Remove a tag from the matching records',               placeholder: 'e.g. Pending Review' },
};

const COND_OPS = ['equals', 'not equals', 'contains', 'starts with', '>', '<', '>=', '<=', 'is empty', 'is not empty'];

function makeId() { return Math.random().toString(36).slice(2, 9); }

const TRIGGER_CARDS = [
  { type: 'event' as const,   icon: '📬', title: 'Something happens to a record',         description: 'A record is created, updated, or changes status',                       color: '#FFD332' },
  { type: 'schedule' as const, icon: '⏰', title: 'On a schedule',                         description: 'Run at a set time — hourly, daily, weekly, or custom',                   color: '#F59E0B' },
  { type: 'webhook' as const,  icon: '🌐', title: 'An outside system sends a message',     description: 'An external app triggers this signal via a webhook URL',                 color: '#22C55E' },
];

const EVENT_PRESETS = [
  { icon: '📥', label: 'A new record is created',       value: 'A new record is created' },
  { icon: '✏️', label: 'A record field changes',         value: 'A record field changes value' },
  { icon: '🔄', label: 'A record moves to a new stage',  value: 'A record changes lifecycle stage' },
  { icon: '⚠️', label: 'A record is flagged as risky',   value: 'A record is marked high risk' },
  { icon: '🏷️', label: 'A tag is added to a record',    value: 'A tag is added to a record' },
];

const WIZARD_STEPS = [
  { num: 1, label: 'Where?',  question: 'Where should this signal watch?',         hint: 'Pick the workspace and section (SubSpace) this signal will monitor.' },
  { num: 2, label: 'When?',   question: 'What starts this signal?',                hint: 'Choose the event that kicks off this automation.' },
  { num: 3, label: 'If…',     question: 'Only run this signal when…',              hint: 'Add conditions so the signal only fires for specific records. Optional — you can skip this step.' },
  { num: 4, label: 'Then…',   question: 'What should happen automatically?',       hint: 'Choose one or more actions the system will take, in order.' },
  { num: 5, label: 'Launch',  question: 'Name it and go live!',                    hint: 'Give your signal a name, add optional tags to scope it, then publish.' },
];

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
  const [signalView, setSignalView] = useState<'create' | 'signals'>('create');
  const [wizardStep, setWizardStep] = useState(1);
  const [showEventLog, setShowEventLog] = useState(false);
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

  // Enhanced: action chain, condition groups
  const [actionChain, setActionChain] = useState<ActionStep[]>([
    { id: makeId(), type: 'notify_team', config: '' },
  ]);
  const [condGroups, setCondGroups] = useState<CondGroup[]>([
    { id: makeId(), combinator: 'AND', rows: [{ id: makeId(), field: '', op: 'equals', value: '' }] },
  ]);

  // Real event log from persisted flow run entries
  const flowEvents = useMemo<FlowEvent[]>(
    () =>
      (appData.flowRuns ?? [])
        .slice(0, 50)
        .map((r) => ({
          id: r.id,
          flowName: r.flowName,
          ts: new Date(r.timestamp).toLocaleString(),
          status: r.status,
          durationMs: r.durationMs,
          note: r.error ?? r.actionTaken ?? 'Flow evaluated successfully.',
        })),
    [appData.flowRuns],
  );

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

  // ── Theme helpers ──
  const surface = mode === 'night' ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.90)';
  const border = mode === 'night' ? 'rgba(38,51,116,0.18)' : 'rgba(38,51,116,0.15)';
  const textPrimary = mode === 'night' ? '#E0E4ED' : '#1A2340';
  const textMuted = mode === 'night' ? 'rgba(255,255,255,0.50)' : 'rgba(0,0,0,0.50)';
  const accent = '#FFD332';

  const handlePublish = () => {
    const chainStr = actionChain.map((s, i) => `${i + 1}. ${ACTION_STEP_LABELS[s.type].label}: ${s.config || '(not configured)'}`).join(' → ');
    setAction(chainStr);
    const synthesized = condGroups.flatMap((g) => g.rows.filter((r) => r.field.trim()).map((r) => `${r.field.trim()} ${r.op} ${r.value.trim()}`));
    if (synthesized.length > 0) setRules(synthesized.join('; '));
    publish();
    auditLog?.logEntry({ action: 'publish', entityType: 'flow', entityId: name || 'draft', entityName: name || 'Unnamed Signal', after: { signal, action: chainStr, tags } });
    addNotification?.({ type: 'flow-triggered', title: 'Signal Published ⚡', body: `"${name || 'Unnamed Signal'}" is now live and watching your workspace.`, severity: 'success' });
    setSignalView('signals');
  };

  const currentStep = WIZARD_STEPS[wizardStep - 1];

  return (
    <>
      <ScrollView style={styles.pageWrap} contentContainerStyle={[styles.pageContent, styles.pageContentTight, { gap: 20 }]} keyboardShouldPersistTaps="handled">
        {guidedMode && (
          <>
            <ProcessStepper title="Signal Studio Process" steps={signalSteps} activeIndex={0} />
            <HintStrip steps={signalSteps} onGuide={onGuide} />
          </>
        )}

        {/* ── Top Tab Bar ── */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' as any }}>
          <Pressable
            onPress={() => setSignalView('create')}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: 18, borderRadius: 10, backgroundColor: signalView === 'create' ? accent : surface, borderWidth: 1, borderColor: signalView === 'create' ? accent : border }}
          >
            <Text style={{ fontSize: 15 }}>⚡</Text>
            <Text style={{ fontWeight: '700', fontSize: 14, color: signalView === 'create' ? '#fff' : textPrimary }}>Create a Signal</Text>
          </Pressable>
          <Pressable
            onPress={() => setSignalView('signals')}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: 18, borderRadius: 10, backgroundColor: signalView === 'signals' ? accent : surface, borderWidth: 1, borderColor: signalView === 'signals' ? accent : border }}
          >
            <Text style={{ fontSize: 15 }}>📊</Text>
            <Text style={{ fontWeight: '700', fontSize: 14, color: signalView === 'signals' ? '#fff' : textPrimary }}>My Signals{flows.length > 0 ? ` (${flows.length})` : ''}</Text>
          </Pressable>
          <View style={{ flex: 1 }} />
          <Pressable
            onPress={() => { setAiFlowPanelOpen(true); if (!aiFlow.session) aiFlow.startSession('flow_builder'); }}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 9, paddingHorizontal: 14, borderRadius: 10, backgroundColor: 'rgba(38,51,116,0.12)', borderWidth: 1, borderColor: 'rgba(38,51,116,0.30)' }}
          >
            <Text style={{ fontSize: 13 }}>✦</Text>
            <Text style={{ fontWeight: '700', fontSize: 13, color: accent }}>Ask Bebo to build it</Text>
          </Pressable>
        </View>

        {/* ══ CREATE A SIGNAL — GUIDED WIZARD ══ */}
        {signalView === 'create' && (
          <View style={{ gap: 20 }}>
            {/* Hero heading */}
            <View style={{ gap: 4 }}>
              <Text style={{ fontSize: 26, fontWeight: '900', color: textPrimary, letterSpacing: -0.5 }}>Create a Signal</Text>
              <Text style={{ fontSize: 14, color: textMuted, lineHeight: 20 }}>A Signal watches your workspace and automatically takes action when something happens — no coding required.</Text>
            </View>

            {/* Step progress bar */}
            <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
              {WIZARD_STEPS.map((s, i) => {
                const done = wizardStep > s.num;
                const active = wizardStep === s.num;
                return (
                  <React.Fragment key={s.num}>
                    <Pressable onPress={() => setWizardStep(s.num)} style={{ alignItems: 'center', gap: 4, minWidth: 56 }}>
                      <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: done ? '#22C55E' : active ? accent : surface, borderWidth: done ? 0 : 2, borderColor: active ? accent : border, alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ fontSize: 13, fontWeight: '900', color: done || active ? '#fff' : textMuted }}>{done ? '✓' : s.num}</Text>
                      </View>
                      <Text style={{ fontSize: 10, fontWeight: active ? '800' : '500', color: active ? accent : done ? '#22C55E' : textMuted, textAlign: 'center' }}>{s.label}</Text>
                    </Pressable>
                    {i < WIZARD_STEPS.length - 1 && (
                      <View style={{ flex: 1, height: 2, backgroundColor: wizardStep > s.num ? '#22C55E' : border, marginTop: 17, marginHorizontal: 2 }} />
                    )}
                  </React.Fragment>
                );
              })}
            </View>

            {/* Step Content Card */}
            <View style={{ backgroundColor: surface, borderRadius: 16, borderWidth: 1, borderColor: border }}>
              {/* Step header strip */}
              <View style={{ backgroundColor: `${accent}15`, paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: border, borderTopLeftRadius: 16, borderTopRightRadius: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: accent, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: '#fff', fontSize: 12, fontWeight: '900' }}>{wizardStep}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 17, fontWeight: '800', color: textPrimary }}>{currentStep.question}</Text>
                    <Text style={{ fontSize: 12, color: textMuted, marginTop: 2 }}>{currentStep.hint}</Text>
                  </View>
                </View>
              </View>

              {/* ── STEP 1: Pick Workspace & SubSpace ── */}
              {wizardStep === 1 && (
                <View style={{ padding: 20, gap: 20 }}>
                  <View style={{ gap: 10 }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: textPrimary }}>Workspace</Text>
                    <Text style={{ fontSize: 12, color: textMuted, marginTop: -6 }}>A workspace is a collection of records for a specific process — like "DSCSA Serialization" or "Employee Onboarding".</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap' as any, gap: 10 }}>
                      {builderWorkspaces.map((ws) => {
                        const isSelected = builderSelectedWsId === ws.id;
                        return (
                          <Pressable
                            key={ws.id}
                            onPress={() => { setBuilderSelectedWsId(ws.id); setBuilderSelectedSsId(''); }}
                            style={{ paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, borderWidth: 2, borderColor: isSelected ? accent : border, backgroundColor: isSelected ? `${accent}15` : 'transparent', gap: 4, minWidth: 160, maxWidth: 280 }}
                          >
                            <Text style={{ fontSize: 14, fontWeight: '800', color: isSelected ? accent : textPrimary }}>{ws.name}</Text>
                            <Text style={{ fontSize: 11, color: textMuted }}>{ws.subSpaces.length} section{ws.subSpaces.length !== 1 ? 's' : ''} inside</Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                  {builderSelectedWs ? (
                    <View style={{ gap: 10 }}>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: textPrimary }}>SubSpace (Section)</Text>
                      <Text style={{ fontSize: 12, color: textMuted, marginTop: -6 }}>A SubSpace is a smaller section inside the workspace — like a folder or category of records.</Text>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap' as any, gap: 8 }}>
                        {builderSelectedWs.subSpaces.map((ss) => {
                          const isSelected = builderSelectedSsId === ss.id;
                          return (
                            <Pressable
                              key={ss.id}
                              onPress={() => setBuilderSelectedSsId(ss.id)}
                              style={{ paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, borderWidth: 2, borderColor: isSelected ? accent : border, backgroundColor: isSelected ? `${accent}15` : 'transparent' }}
                            >
                              <Text style={{ fontSize: 13, fontWeight: '700', color: isSelected ? accent : textPrimary }}>{ss.name}</Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    </View>
                  ) : (
                    <View style={{ backgroundColor: `${accent}08`, borderRadius: 10, padding: 14, borderWidth: 1, borderColor: `${accent}20` }}>
                      <Text style={{ fontSize: 12, color: textMuted, textAlign: 'center' }}>👆 Select a workspace above to see its sections</Text>
                    </View>
                  )}
                </View>
              )}

              {/* ── STEP 2: Pick Trigger ── */}
              {wizardStep === 2 && (
                <View style={{ padding: 20, gap: 14 }}>
                  {TRIGGER_CARDS.map((tc) => {
                    const isSelected = triggerType === tc.type;
                    return (
                      <Pressable
                        key={tc.type}
                        onPress={() => setTriggerType(tc.type)}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 16, padding: 18, borderRadius: 14, borderWidth: 2, borderColor: isSelected ? tc.color : border, backgroundColor: isSelected ? `${tc.color}12` : 'transparent' }}
                      >
                        <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: isSelected ? tc.color : `${tc.color}18`, alignItems: 'center', justifyContent: 'center' }}>
                          <Text style={{ fontSize: 26 }}>{tc.icon}</Text>
                        </View>
                        <View style={{ flex: 1, gap: 3 }}>
                          <Text style={{ fontSize: 15, fontWeight: '800', color: isSelected ? tc.color : textPrimary }}>{tc.title}</Text>
                          <Text style={{ fontSize: 12, color: textMuted, lineHeight: 17 }}>{tc.description}</Text>
                        </View>
                        {isSelected && (
                          <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: tc.color, alignItems: 'center', justifyContent: 'center' }}>
                            <Text style={{ color: '#fff', fontSize: 13, fontWeight: '900' }}>✓</Text>
                          </View>
                        )}
                      </Pressable>
                    );
                  })}

                  {/* Event sub-presets */}
                  {triggerType === 'event' && (
                    <View style={{ gap: 10, padding: 14, backgroundColor: `${accent}06`, borderRadius: 12, borderWidth: 1, borderColor: `${accent}15` }}>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: textPrimary }}>What specifically causes it to trigger?</Text>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap' as any, gap: 8 }}>
                        {EVENT_PRESETS.map((ep) => {
                          const isSel = signal === ep.value;
                          return (
                            <Pressable key={ep.value} onPress={() => setSignal(ep.value)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1.5, borderColor: isSel ? accent : border, backgroundColor: isSel ? `${accent}12` : 'transparent' }}>
                              <Text style={{ fontSize: 14 }}>{ep.icon}</Text>
                              <Text style={{ fontSize: 12, fontWeight: isSel ? '700' : '500', color: isSel ? accent : textPrimary }}>{ep.label}</Text>
                            </Pressable>
                          );
                        })}
                        <Pressable onPress={() => setSignal('')} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1.5, borderColor: (!signal || EVENT_PRESETS.every((ep) => ep.value !== signal)) ? accent : border, backgroundColor: (!signal || EVENT_PRESETS.every((ep) => ep.value !== signal)) ? `${accent}12` : 'transparent' }}>
                          <Text style={{ fontSize: 12, color: textMuted }}>✏️ Custom</Text>
                        </Pressable>
                      </View>
                      {(!signal || EVENT_PRESETS.every((ep) => ep.value !== signal)) && (
                        <TextInput style={[styles.input, { marginTop: 2 }]} value={signal} onChangeText={setSignal} placeholder="Describe what happens (e.g. A package is scanned at receiving)" placeholderTextColor={textMuted} />
                      )}
                    </View>
                  )}

                  {/* Webhook config */}
                  {triggerType === 'webhook' && (
                    <View style={{ gap: 10, backgroundColor: `${accent}08`, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: `${accent}20` }}>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: textPrimary }}>Webhook settings</Text>
                      <LabeledInput label="Endpoint path" helperText="The URL path your webhook will listen on (e.g. /hooks/my-signal)." value={webhookConfig.endpointPath} onChangeText={(v) => setWebhookConfig((c) => ({ ...c, endpointPath: v }))} placeholder="/hooks/..." />
                      <Text style={{ fontSize: 12, fontWeight: '600', color: textPrimary }}>HTTP Method</Text>
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        {(['POST', 'GET'] as const).map((m) => (
                          <Pressable key={m} onPress={() => setWebhookConfig((c) => ({ ...c, method: m }))} style={{ paddingVertical: 7, paddingHorizontal: 16, borderRadius: 8, borderWidth: 1.5, borderColor: webhookConfig.method === m ? accent : border, backgroundColor: webhookConfig.method === m ? `${accent}15` : 'transparent' }}>
                            <Text style={{ fontSize: 13, fontWeight: '700', color: webhookConfig.method === m ? accent : textPrimary }}>{m}</Text>
                          </Pressable>
                        ))}
                      </View>
                      <LabeledInput label="Secret (optional)" helperText="A secret key so you can verify the webhook comes from a trusted source." value={webhookConfig.secret ?? ''} onChangeText={(v) => setWebhookConfig((c) => ({ ...c, secret: v || undefined }))} placeholder="optional-secret" />
                    </View>
                  )}

                  {/* Schedule config */}
                  {triggerType === 'schedule' && (
                    <View style={{ gap: 10, backgroundColor: `${accent}08`, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: `${accent}20` }}>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: textPrimary }}>Schedule settings</Text>
                      <Text style={{ fontSize: 12, fontWeight: '600', color: textPrimary }}>How often should this run?</Text>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap' as any, gap: 8 }}>
                        {(['hourly', 'daily', 'weekly', 'monthly', 'custom'] as const).map((f) => (
                          <Pressable key={f} onPress={() => setScheduleConfig((c) => ({ ...c, frequency: f }))} style={{ paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8, borderWidth: 1.5, borderColor: scheduleConfig.frequency === f ? accent : border, backgroundColor: scheduleConfig.frequency === f ? `${accent}15` : 'transparent' }}>
                            <Text style={{ fontSize: 13, fontWeight: '700', color: scheduleConfig.frequency === f ? accent : textPrimary }}>{f.charAt(0).toUpperCase() + f.slice(1)}</Text>
                          </Pressable>
                        ))}
                      </View>
                      {scheduleConfig.frequency !== 'custom' && (
                        <LabeledInput label="Run at time (HH:MM)" helperText="What time of day should this run?" value={scheduleConfig.time ?? ''} onChangeText={(v) => setScheduleConfig((c) => ({ ...c, time: v }))} placeholder="09:00" />
                      )}
                      {scheduleConfig.frequency === 'weekly' && (
                        <LabeledInput label="Day of week (0 = Sunday, 6 = Saturday)" helperText="Which day?" value={String(scheduleConfig.dayOfWeek ?? 1)} onChangeText={(v) => setScheduleConfig((c) => ({ ...c, dayOfWeek: Number(v) || 0 }))} placeholder="1" />
                      )}
                      {scheduleConfig.frequency === 'custom' && (
                        <LabeledInput label="Cron expression" helperText={'Standard cron format (e.g. "0 9 * * 1-5" runs at 9am on weekdays).'} value={scheduleConfig.cronExpression ?? ''} onChangeText={(v) => setScheduleConfig((c) => ({ ...c, cronExpression: v }))} placeholder="0 9 * * 1-5" />
                      )}
                    </View>
                  )}
                </View>
              )}

              {/* ── STEP 3: Conditions (optional) ── */}
              {wizardStep === 3 && (
                <View style={{ padding: 20, gap: 16 }}>
                  <View style={{ backgroundColor: '#F59E0B18', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#F59E0B30' }}>
                    <Text style={{ fontSize: 12, color: '#F59E0B', fontWeight: '600' }}>💡 This step is optional — tap "Next" to skip and run the signal every time without conditions.</Text>
                  </View>
                  {condGroups.map((group, gi) => (
                    <View key={group.id} style={{ backgroundColor: `${accent}06`, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: border, gap: 12 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' as any }}>
                        <Text style={{ fontSize: 14, fontWeight: '800', color: textPrimary, flex: 1 }}>{gi === 0 ? 'Only run if…' : 'And also…'}</Text>
                        <Pressable onPress={() => toggleCombinator(group.id)} style={{ paddingVertical: 5, paddingHorizontal: 10, borderRadius: 6, backgroundColor: accent }}>
                          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 12 }}>{group.combinator === 'AND' ? 'All must match (AND)' : 'Any can match (OR)'}</Text>
                        </Pressable>
                        {condGroups.length > 1 && (
                          <Pressable onPress={() => removeCondGroup(group.id)} style={{ paddingVertical: 5, paddingHorizontal: 10, borderRadius: 6, backgroundColor: '#EF444420', borderWidth: 1, borderColor: '#EF444440' }}>
                            <Text style={{ color: '#EF4444', fontWeight: '700', fontSize: 12 }}>Remove</Text>
                          </Pressable>
                        )}
                      </View>
                      {group.rows.map((row, ri) => (
                        <View key={row.id} style={{ gap: 6 }}>
                          {ri > 0 && <Text style={{ fontSize: 11, fontWeight: '700', color: accent, textAlign: 'center' }}>{group.combinator === 'AND' ? '— AND —' : '— OR —'}</Text>}
                          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' as any }}>
                            <View style={{ flex: 2, minWidth: 100, gap: 3 }}>
                              <Text style={{ fontSize: 10, color: textMuted, fontWeight: '700' }}>FIELD TO CHECK</Text>
                              <TextInput style={styles.input} value={row.field} onChangeText={(v) => updateCondRow(group.id, row.id, 'field', v)} placeholder="e.g. status, priority" placeholderTextColor={textMuted} />
                            </View>
                            <View style={{ flex: 2, minWidth: 120, gap: 3 }}>
                              <Text style={{ fontSize: 10, color: textMuted, fontWeight: '700' }}>HOW TO COMPARE</Text>
                              {Platform.OS === 'web' ? (
                                <select title="Condition operator" value={row.op} onChange={(e) => updateCondRow(group.id, row.id, 'op', e.target.value)} style={{ fontSize: 13, padding: '8px 10px', borderRadius: 8, border: '1px solid rgba(38,51,116,0.22)', background: 'transparent', color: 'inherit', width: '100%', outline: 'none' }}>
                                  {COND_OPS.map((op) => <option key={op} value={op}>{op}</option>)}
                                </select>
                              ) : (
                                <TextInput style={styles.input} value={row.op} onChangeText={(v) => updateCondRow(group.id, row.id, 'op', v)} placeholder="equals" />
                              )}
                            </View>
                            <View style={{ flex: 2, minWidth: 100, gap: 3 }}>
                              <Text style={{ fontSize: 10, color: textMuted, fontWeight: '700' }}>VALUE TO MATCH</Text>
                              <TextInput style={styles.input} value={row.value} onChangeText={(v) => updateCondRow(group.id, row.id, 'value', v)} placeholder="e.g. Active, High" placeholderTextColor={textMuted} />
                            </View>
                            {group.rows.length > 1 && (
                              <Pressable onPress={() => removeCondRow(group.id, row.id)} style={{ paddingHorizontal: 8, paddingBottom: 6 }}>
                                <Text style={{ color: '#EF4444', fontSize: 20, lineHeight: 24 }}>×</Text>
                              </Pressable>
                            )}
                          </View>
                        </View>
                      ))}
                      <Pressable onPress={() => addCondRow(group.id)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: border, alignSelf: 'flex-start' as any }}>
                        <Text style={{ color: accent, fontWeight: '700', fontSize: 13 }}>+ Add another condition</Text>
                      </Pressable>
                    </View>
                  ))}
                  <Pressable onPress={addCondGroup} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10, borderWidth: 1, borderColor: border, alignSelf: 'flex-start' as any }}>
                    <Text style={{ color: textMuted, fontWeight: '600', fontSize: 13 }}>+ Add another condition group</Text>
                  </Pressable>
                </View>
              )}

              {/* ── STEP 4: Actions ── */}
              {wizardStep === 4 && (
                <View style={{ padding: 20, gap: 14 }}>
                  <Text style={{ fontSize: 13, color: textMuted, lineHeight: 18 }}>Choose one or more things that should happen automatically. They run in order, one after the other.</Text>
                  {actionChain.map((step, si) => {
                    const meta = ACTION_STEP_LABELS[step.type];
                    return (
                      <View key={step.id} style={{ backgroundColor: `${accent}06`, borderRadius: 14, borderWidth: 1, borderColor: border }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderBottomWidth: 1, borderBottomColor: border }}>
                          <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: accent, alignItems: 'center', justifyContent: 'center' }}>
                            <Text style={{ color: '#fff', fontSize: 11, fontWeight: '900' }}>{si + 1}</Text>
                          </View>
                          <Text style={{ fontSize: 18 }}>{meta.icon}</Text>
                          <View style={{ flex: 1 }}>
                            {Platform.OS === 'web' ? (
                              <select title="Action type" value={step.type} onChange={(e) => updateActionStep(step.id, 'type', e.target.value)} style={{ fontSize: 13, fontWeight: '700', padding: '6px 8px', borderRadius: 8, border: '1px solid rgba(38,51,116,0.22)', background: 'transparent', color: 'inherit', width: '100%', outline: 'none' }}>
                                {(Object.keys(ACTION_STEP_LABELS) as ActionStepType[]).map((t) => (
                                  <option key={t} value={t}>{ACTION_STEP_LABELS[t].icon} {ACTION_STEP_LABELS[t].label}</option>
                                ))}
                              </select>
                            ) : (
                              <Text style={{ fontSize: 14, fontWeight: '800', color: textPrimary }}>{meta.label}</Text>
                            )}
                          </View>
                          {actionChain.length > 1 && (
                            <Pressable onPress={() => removeActionStep(step.id)} style={{ paddingHorizontal: 8 }}>
                              <Text style={{ color: '#EF4444', fontSize: 20, lineHeight: 24 }}>×</Text>
                            </Pressable>
                          )}
                        </View>
                        <View style={{ padding: 14, gap: 6 }}>
                          <Text style={{ fontSize: 11, color: textMuted }}>{meta.description}</Text>
                          <TextInput style={styles.input} value={step.config} onChangeText={(v) => updateActionStep(step.id, 'config', v)} placeholder={meta.placeholder} placeholderTextColor={textMuted} />
                        </View>
                      </View>
                    );
                  })}
                  <Pressable onPress={addActionStep} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, borderWidth: 2, borderColor: border, justifyContent: 'center' }}>
                    <Text style={{ fontSize: 18, color: accent }}>+</Text>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: accent }}>Add another action</Text>
                  </Pressable>
                </View>
              )}

              {/* ── STEP 5: Name & Launch ── */}
              {wizardStep === 5 && (
                <View style={{ padding: 20, gap: 16 }}>
                  {/* Summary */}
                  <View style={{ backgroundColor: `${accent}08`, borderRadius: 12, padding: 16, gap: 8, borderWidth: 1, borderColor: `${accent}20` }}>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: textPrimary }}>Your signal at a glance</Text>
                    {builderSelectedWs && (
                      <Text style={{ fontSize: 12, color: textMuted }}>📍 <Text style={{ fontWeight: '700', color: textPrimary }}>{builderSelectedWs.name}</Text>{builderSelectedSsId ? ` → ${builderSelectedWs.subSpaces.find((ss) => ss.id === builderSelectedSsId)?.name ?? ''}` : ''}</Text>
                    )}
                    {triggerType && (
                      <Text style={{ fontSize: 12, color: textMuted }}>
                        {triggerType === 'event' ? '📬' : triggerType === 'schedule' ? '⏰' : '🌐'}{' '}
                        <Text style={{ fontWeight: '700', color: textPrimary }}>{TRIGGER_CARDS.find((t) => t.type === triggerType)?.title}</Text>
                        {signal ? ` — "${signal}"` : ''}
                      </Text>
                    )}
                    {actionChain.length > 0 && <Text style={{ fontSize: 12, color: textMuted }}>⚡ {actionChain.length} action{actionChain.length !== 1 ? 's' : ''}: {actionChain.map((a) => ACTION_STEP_LABELS[a.type].label).join(', ')}</Text>}
                  </View>

                  <LabeledInput label="Signal name" helperText="Give this a short, clear name so you can find it later." value={name} onChangeText={setName} placeholder="e.g. Flag high-risk packages for review" />
                  <LabeledInput label="Target tags (optional)" helperText="Only records with these tags will trigger this signal. Leave blank to apply to all records." value={tags} onChangeText={setTags} multiline placeholder="e.g. High Priority, SLA-24h" />

                  <Pressable onPress={toggleRunOnExisting} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: runOnExisting ? accent : border, backgroundColor: runOnExisting ? `${accent}10` : 'transparent' }}>
                    <View style={{ width: 22, height: 22, borderRadius: 4, backgroundColor: runOnExisting ? accent : 'transparent', borderWidth: 2, borderColor: runOnExisting ? accent : border, alignItems: 'center', justifyContent: 'center' }}>
                      {runOnExisting && <Text style={{ color: '#fff', fontSize: 13, fontWeight: '900' }}>✓</Text>}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: textPrimary }}>Also run on existing records</Text>
                      <Text style={{ fontSize: 11, color: textMuted }}>Apply this signal to records that already exist, not just new ones.</Text>
                    </View>
                  </Pressable>

                  {!canPublishFlow && <View style={{ backgroundColor: '#EF444415', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#EF444430' }}><Text style={{ fontSize: 12, color: '#EF4444', fontWeight: '600' }}>⚠️ {deniedMessage('flow.publish')}</Text></View>}
                  {!!info && <Text style={styles.notice}>{info}</Text>}

                  <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' as any }}>
                    <Pressable
                      onPress={() => { saveDraft(); addNotification?.({ type: 'system', title: 'Draft Saved', body: `"${name || 'Unnamed Signal'}" saved as a draft.`, severity: 'info' }); }}
                      style={{ flex: 1, minWidth: 120, paddingVertical: 12, borderRadius: 10, borderWidth: 1.5, borderColor: border, alignItems: 'center' }}
                    >
                      <Text style={{ fontSize: 14, fontWeight: '700', color: textMuted }}>Save Draft</Text>
                    </Pressable>
                    <Pressable
                      disabled={!canPublishFlow}
                      onPress={handlePublish}
                      style={{ flex: 2, minWidth: 180, paddingVertical: 12, borderRadius: 10, backgroundColor: canPublishFlow ? accent : border, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}
                    >
                      <Text style={{ fontSize: 16 }}>⚡</Text>
                      <Text style={{ fontSize: 14, fontWeight: '800', color: '#fff' }}>Publish Signal</Text>
                    </Pressable>
                  </View>
                  <Pressable
                    disabled={!canPublishFlow}
                    onPress={() => { applyWarehouseServiceFlowPack(); addNotification?.({ type: 'system', title: 'Sample Pack Loaded', body: 'Sample supply chain signals loaded. Check My Signals to see them.', severity: 'success' }); }}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 9, paddingHorizontal: 14, borderRadius: 10, backgroundColor: 'rgba(38,51,116,0.08)', borderWidth: 1, borderColor: 'rgba(38,51,116,0.20)', alignSelf: 'flex-start' as any }}
                  >
                    <Text style={{ fontSize: 12 }}>📥</Text>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: accent }}>Load Sample Signal Pack</Text>
                  </Pressable>
                </View>
              )}
            </View>

            {/* Step navigation buttons */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              {wizardStep > 1 && (
                <Pressable onPress={() => setWizardStep((s) => s - 1)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: 18, borderRadius: 10, borderWidth: 1, borderColor: border }}>
                  <Text style={{ fontSize: 13, color: textMuted }}>←</Text>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: textMuted }}>Back</Text>
                </Pressable>
              )}
              <View style={{ flex: 1 }} />
              {wizardStep < 5 && (
                <Pressable onPress={() => setWizardStep((s) => s + 1)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: 22, borderRadius: 10, backgroundColor: accent }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#fff' }}>{wizardStep === 3 ? 'Skip / Next →' : 'Next →'}</Text>
                </Pressable>
              )}
            </View>
          </View>
        )}

        {/* ══ MY SIGNALS ══ */}
        {signalView === 'signals' && (
          <View style={{ gap: 20 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' as any }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 22, fontWeight: '900', color: textPrimary }}>My Signals</Text>
                <Text style={{ fontSize: 13, color: textMuted }}>All published and draft automation signals for your workspaces.</Text>
              </View>
              <Pressable onPress={() => setShowEventLog((v) => !v)} style={{ paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8, borderWidth: 1, borderColor: border, backgroundColor: showEventLog ? `${accent}10` : 'transparent' }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: showEventLog ? accent : textMuted }}>📋 {showEventLog ? 'Show Signals' : 'Show Event Log'}</Text>
              </Pressable>
            </View>

            {/* Workspace filter */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' as any, gap: 8 }}>
              <Pressable onPress={() => setBuilderSelectedWsId('')} style={{ paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: builderSelectedWsId === '' ? accent : border, backgroundColor: builderSelectedWsId === '' ? `${accent}12` : 'transparent' }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: builderSelectedWsId === '' ? accent : textMuted }}>All Workspaces</Text>
              </Pressable>
              {builderWorkspaces.map((ws) => (
                <Pressable key={ws.id} onPress={() => setBuilderSelectedWsId(ws.id)} style={{ paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: builderSelectedWsId === ws.id ? accent : border, backgroundColor: builderSelectedWsId === ws.id ? `${accent}12` : 'transparent' }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: builderSelectedWsId === ws.id ? accent : textMuted }}>{ws.name}</Text>
                </Pressable>
              ))}
            </View>

            {/* Event Log */}
            {showEventLog && (
              <View style={{ gap: 10 }}>
                {flowEvents.length === 0 ? (
                  <View style={{ backgroundColor: surface, borderRadius: 12, padding: 24, borderWidth: 1, borderColor: border, alignItems: 'center', gap: 8 }}>
                    <Text style={{ fontSize: 28 }}>📋</Text>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: textPrimary }}>No events yet</Text>
                    <Text style={{ fontSize: 12, color: textMuted, textAlign: 'center' }}>Once your signals start running, each execution will appear here with its status and duration.</Text>
                  </View>
                ) : (
                  flowEvents.map((evt) => {
                    const statusColor = evt.status === 'success' ? '#22C55E' : evt.status === 'failed' ? '#EF4444' : '#F59E0B';
                    const statusIcon = evt.status === 'success' ? '✅' : evt.status === 'failed' ? '❌' : '⏭️';
                    return (
                      <View key={evt.id} style={{ backgroundColor: surface, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: border, gap: 4 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <Text style={{ fontSize: 14 }}>{statusIcon}</Text>
                          <Text style={{ fontSize: 14, fontWeight: '700', color: textPrimary, flex: 1 }} numberOfLines={1}>{evt.flowName}</Text>
                          <View style={{ backgroundColor: statusColor + '22', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: statusColor + '44' }}>
                            <Text style={{ color: statusColor, fontSize: 11, fontWeight: '700' }}>{evt.status.toUpperCase()}</Text>
                          </View>
                        </View>
                        <Text style={{ fontSize: 12, color: textMuted }}>{evt.ts} · {evt.durationMs} ms</Text>
                        <Text style={{ fontSize: 12, color: textMuted }}>{evt.note}</Text>
                      </View>
                    );
                  })
                )}
              </View>
            )}

            {/* Signals List */}
            {!showEventLog && (
              <>
                {(builderSelectedWsId ? flowsForWorkspace : flows).length === 0 ? (
                  <View style={{ backgroundColor: surface, borderRadius: 16, padding: 32, borderWidth: 1, borderColor: border, alignItems: 'center', gap: 16 }}>
                    <Text style={{ fontSize: 40 }}>⚡</Text>
                    <Text style={{ fontSize: 18, fontWeight: '900', color: textPrimary, textAlign: 'center' }}>No signals yet</Text>
                    <Text style={{ fontSize: 13, color: textMuted, textAlign: 'center', maxWidth: 360, lineHeight: 20 }}>Create your first signal to start automating your workspace, or load a sample pack to see how it works.</Text>
                    <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' as any, justifyContent: 'center' }}>
                      <Pressable onPress={() => setSignalView('create')} style={{ paddingVertical: 10, paddingHorizontal: 20, borderRadius: 10, backgroundColor: accent, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>⚡ Create a Signal</Text>
                      </Pressable>
                      <Pressable
                        disabled={!canPublishFlow}
                        onPress={() => { applyWarehouseServiceFlowPack(); addNotification?.({ type: 'system', title: 'Sample Pack Loaded', body: 'Sample supply chain signals loaded.', severity: 'success' }); }}
                        style={{ paddingVertical: 10, paddingHorizontal: 20, borderRadius: 10, backgroundColor: surface, borderWidth: 1, borderColor: border, flexDirection: 'row', alignItems: 'center', gap: 6 }}
                      >
                        <Text style={{ color: textMuted, fontWeight: '600', fontSize: 13 }}>📥 Load Sample Pack</Text>
                      </Pressable>
                    </View>
                  </View>
                ) : (
                  <View style={{ gap: 12 }}>
                    {(builderSelectedWsId ? flowsForWorkspace : flows).map((flow) => {
                      const ws = builderWorkspaces.find((w) => w.id === flow.workspaceId);
                      const ss = ws?.subSpaces.find((s) => s.id === flow.subSpaceId);
                      const triggerIcon = flow.triggerType === 'schedule' ? '⏰' : flow.triggerType === 'webhook' ? '🌐' : '📬';
                      const statusColor = flow.status === 'active' ? '#22C55E' : '#F59E0B';
                      return (
                        <View key={flow.id} style={{ backgroundColor: surface, borderRadius: 14, borderWidth: 1, borderColor: border }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderBottomWidth: 1, borderBottomColor: border }}>
                            <Text style={{ fontSize: 20 }}>{triggerIcon}</Text>
                            <Text style={{ fontSize: 15, fontWeight: '800', color: textPrimary, flex: 1 }}>{flow.name}</Text>
                            <View style={{ paddingVertical: 3, paddingHorizontal: 8, borderRadius: 6, backgroundColor: statusColor + '20', borderWidth: 1, borderColor: statusColor + '40' }}>
                              <Text style={{ fontSize: 11, fontWeight: '700', color: statusColor }}>{flow.status.toUpperCase()}</Text>
                            </View>
                          </View>
                          <View style={{ padding: 14, gap: 8 }}>
                            <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' as any }}>
                              {ws && <View style={{ paddingVertical: 3, paddingHorizontal: 10, borderRadius: 12, backgroundColor: `${accent}12`, borderWidth: 1, borderColor: `${accent}25` }}><Text style={{ fontSize: 11, fontWeight: '700', color: accent }}>📁 {ws.name}</Text></View>}
                              {ss && <View style={{ paddingVertical: 3, paddingHorizontal: 10, borderRadius: 12, backgroundColor: `${accent}08`, borderWidth: 1, borderColor: `${accent}18` }}><Text style={{ fontSize: 11, fontWeight: '600', color: textMuted }}>↳ {ss.name}</Text></View>}
                            </View>
                            <Text style={{ fontSize: 12, color: textMuted }}>{flow.signal}</Text>
                            <View style={{ flexDirection: 'row', gap: 16, flexWrap: 'wrap' as any }}>
                              <Text style={{ fontSize: 12, color: textMuted }}>🔁 <Text style={{ fontWeight: '700', color: textPrimary }}>{flow.totalRuns.toLocaleString()}</Text> runs</Text>
                              <Text style={{ fontSize: 12, color: flow.failures7d > 0 ? '#EF4444' : textMuted }}>{flow.failures7d > 0 ? '⚠️' : '✅'} <Text style={{ fontWeight: '700', color: flow.failures7d > 0 ? '#EF4444' : textPrimary }}>{flow.failures7d}</Text> failures (7d)</Text>
                              <Text style={{ fontSize: 12, color: textMuted }}>⚡ avg {flow.avgTimeMs.toLocaleString()} ms</Text>
                            </View>
                            {flow.lastRun && <Text style={{ fontSize: 11, color: textMuted }}>Last run: {new Date(flow.lastRun).toLocaleString()}</Text>}
                          </View>
                        </View>
                      );
                    })}
                  </View>
                )}
              </>
            )}
          </View>
        )}
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
          applyLabel="Apply Signal"
          discardLabel="Discard"
          title="Bebo Signal Builder"
        />
      )}
    </>
  );
}
