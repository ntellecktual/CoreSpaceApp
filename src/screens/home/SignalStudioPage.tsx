import React, { useEffect, useState } from 'react';
import { ScrollView, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { InteractivePressable as Pressable } from '../../components/InteractivePressable';
import { AiChatPanel } from '../../components/AiChatPanel';
import { useUiTheme } from '../../context/UiThemeContext';
import { Card, HintStrip, LabeledInput, ProcessStepper } from './components';
import { signalSteps } from './constants';
import { useRbac } from './hooks/useRbac';
import { useSignalStudioBuilder } from './hooks/useSignalStudioBuilder';
import { useAiFlowBuilder } from '../../ai/useAiHooks';
import { GuidedPageProps } from './types';

export function SignalStudioPage({ guidedMode, onGuide, registerActions, auditLog, addNotification }: GuidedPageProps) {
  const { styles } = useUiTheme();
  const { width: windowWidth } = useWindowDimensions();
  const [signalPane, setSignalPane] = useState<'builder' | 'monitor'>('builder');
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
      ],
    },
  ];

  const signalNavToSection: Record<string, string> = {
    builder: 'design',
    monitor: 'monitoring',
  };

  const signalActiveNavItemKey = signalPane === 'builder' ? 'Build Flow' : 'Active Flows';

  const signalContentHeaders: Record<string, { title: string; description: string }> = {
    builder: {
      title: 'Build Flow',
      description: 'Define the trigger event, add conditional rules, and choose the action the system takes. Tag records to scope which items are affected.',
    },
    monitor: {
      title: 'Active Flows',
      description: 'Review published automations, track total runs and recent failures, and monitor average execution time across your workflows.',
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
            {(builderSelectedWsId ? flowsForWorkspace : flows).length === 0 && <Text style={styles.bodyText}>No published flows yet. Build one in the Flow Designer, or load the DSCSA Supply Chain flow pack to see how it works.</Text>}
            {(builderSelectedWsId ? flowsForWorkspace : flows).map((flow) => {
              const ws = builderWorkspaces.find((w) => w.id === flow.workspaceId);
              const ss = ws?.subSpaces.find((s) => s.id === flow.subSpaceId);
              return (
                <View key={flow.id} style={styles.listCard}>
                  <Text style={styles.listTitle}>{flow.name}</Text>
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
