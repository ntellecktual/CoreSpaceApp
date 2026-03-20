import React, { useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';
import { InteractivePressable as Pressable } from '../../components/InteractivePressable';
import { useAppState } from '../../context/AppStateContext';
import { useUiTheme } from '../../context/UiThemeContext';
import { ChainStep, FinancialActionType, WorkflowChainDefinition } from '../../types';
import { Card } from './components';
import { GuidedPageProps } from './types';

// ─── Constants ────────────────────────────────────────────────────────────────
const ACCENT = '#6366F1';  // indigo — distinct from Financial amber, Ingestion cyan
const SUCCESS = '#10B981';
const DANGER = '#EF4444';
const WARN = '#F59E0B';
const MUTED = 'rgba(255,255,255,0.5)';

type ChainTab = 'chains' | 'builder' | 'actions' | 'metrics';

const CHAIN_TABS: { id: ChainTab; label: string; icon: string }[] = [
  { id: 'chains', label: 'Chain Library', icon: '🔗' },
  { id: 'builder', label: 'Chain Builder', icon: '🔧' },
  { id: 'actions', label: 'Action Library', icon: '⚡' },
  { id: 'metrics', label: 'Automation Metrics', icon: '📊' },
];

const CHAIN_TYPE_LABELS: Record<WorkflowChainDefinition['chainType'], string> = {
  ap_inbound: 'AP Inbound',
  ar_inbound: 'AR Inbound',
  period_close: 'Period Close',
  exception: 'Exception',
  custom: 'Custom',
};

const CHAIN_TYPE_COLORS: Record<WorkflowChainDefinition['chainType'], string> = {
  ap_inbound: '#F59E0B',
  ar_inbound: '#10B981',
  period_close: '#6366F1',
  exception: '#EF4444',
  custom: '#8C5BF5',
};

const ACTION_DOCS: { type: FinancialActionType; icon: string; label: string; description: string; parameters: string[] }[] = [
  {
    type: 'financial.create_payable',
    icon: '📤',
    label: 'Create Payable',
    description: 'Creates a payable obligation from record fields. Maps field slugs to payable amount, due date, and counterparty.',
    parameters: ['payableToField', 'amountField', 'dueDateField', 'externalRefField', 'liabilityAccountId', 'expenseAccountId'],
  },
  {
    type: 'financial.create_receivable',
    icon: '📥',
    label: 'Create Receivable',
    description: 'Creates an AR receivable from inbound record data. Supports field mapping from ingestion events.',
    parameters: ['amountField', 'fieldMapSource'],
  },
  {
    type: 'financial.post_journal_entry',
    icon: '📒',
    label: 'Post Journal Entry',
    description: 'Auto-generates and posts a double-entry GL journal. Entry lines, account IDs, and amounts are all configurable.',
    parameters: ['entryLines', 'transactionDateSource', 'descriptionTemplate', 'sourceType', 'sourceRefField'],
  },
  {
    type: 'financial.create_waterfall',
    icon: '🌊',
    label: 'Create Distribution Waterfall',
    description: 'Builds a configurable party waterfall from party definitions. Each party role, amount formula, and payment method is stored in data — not code.',
    parameters: ['totalAmountSource', 'sourceRecordIdSource', 'partyDefinitions'],
  },
  {
    type: 'financial.request_period_close',
    icon: '🔒',
    label: 'Request Period Close',
    description: 'Initiates an accounting period close. Validates reconciliation state before locking the period.',
    parameters: [],
  },
  {
    type: 'financial.run_reconciliation_match',
    icon: '🔄',
    label: 'Run Reconciliation Match',
    description: 'Executes automated reconciliation matching against GL entries, bank data, or external source records.',
    parameters: [],
  },
  {
    type: 'signal.push_alert',
    icon: '🔔',
    label: 'Push Alert',
    description: 'Sends a notification to a role target. Message template supports {{field}} interpolation from the trigger event payload.',
    parameters: ['alertSeverity', 'alertRoleTarget', 'alertMessageTemplate'],
  },
  {
    type: 'signal.update_field',
    icon: '✏️',
    label: 'Update Field',
    description: 'Updates a field on the source record. Used to tag status, flag exceptions, or set routing fields.',
    parameters: ['fieldMapSource', 'onPassStatus'],
  },
  {
    type: 'signal.validate_and_route',
    icon: '🚦',
    label: 'Validate & Route',
    description: 'Validates required fields and routes the event based on pass/fail. Human judgment points use this action to pause the chain.',
    parameters: ['requiredFields', 'onPassStatus', 'onFailRoute'],
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
function pct(value: number) {
  return `${Math.round(value)}%`;
}

function humanStepCount(steps: ChainStep[]) {
  return steps.filter((s) => s.isHumanJudgmentPoint).length;
}

function autoStepCount(steps: ChainStep[]) {
  return steps.filter((s) => !s.isHumanJudgmentPoint).length;
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function TabBar({ active, onChange }: { active: ChainTab; onChange: (t: ChainTab) => void }) {
  return (
    <View style={{ flexDirection: 'row', gap: 4, flexWrap: 'wrap', marginBottom: 16 }}>
      {CHAIN_TABS.map((t) => {
        const isActive = t.id === active;
        return (
          <Pressable key={t.id} onPress={() => onChange(t.id)} style={{
            paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8,
            backgroundColor: isActive ? ACCENT : 'rgba(99,102,241,0.1)',
            borderWidth: 1, borderColor: isActive ? ACCENT : 'rgba(99,102,241,0.3)',
          }}>
            <Text style={{ color: isActive ? '#fff' : 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '600' }}>
              {t.icon} {t.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <View style={{ borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, backgroundColor: `${color}22`, borderWidth: 1, borderColor: `${color}55`, alignSelf: 'flex-start' }}>
      <Text style={{ color, fontSize: 10, fontWeight: '700', textTransform: 'uppercase' }}>{label}</Text>
    </View>
  );
}

function AutomationGauge({ value }: { value: number }) {
  const color = value >= 75 ? SUCCESS : value >= 50 ? WARN : DANGER;
  return (
    <View style={{ alignItems: 'center', gap: 2 }}>
      <View style={{ width: 56, height: 56, borderRadius: 28, borderWidth: 4, borderColor: `${color}44`, alignItems: 'center', justifyContent: 'center', backgroundColor: `${color}11` }}>
        <Text style={{ color, fontSize: 14, fontWeight: '800' }}>{pct(value)}</Text>
      </View>
      <Text style={{ color: MUTED, fontSize: 10 }}>auto</Text>
    </View>
  );
}

function StepTimeline({ steps }: { steps: ChainStep[] }) {
  if (!steps.length) return <Text style={{ color: MUTED, fontSize: 12 }}>No steps defined.</Text>;
  return (
    <View style={{ gap: 8 }}>
      {[...steps].sort((a, b) => a.stepOrder - b.stepOrder).map((step, i) => {
        const actionMeta = ACTION_DOCS.find((a) => a.type === step.actionType);
        const isHuman = step.isHumanJudgmentPoint;
        const stepColor = isHuman ? WARN : ACCENT;
        return (
          <View key={step.id} style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
            {/* Step number + connector */}
            <View style={{ alignItems: 'center', gap: 0, width: 28 }}>
              <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: `${stepColor}22`, borderWidth: 2, borderColor: stepColor, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: stepColor, fontSize: 11, fontWeight: '800' }}>{step.stepOrder}</Text>
              </View>
              {i < steps.length - 1 && <View style={{ width: 2, height: 20, backgroundColor: 'rgba(255,255,255,0.1)', marginTop: 2 }} />}
            </View>
            {/* Step content */}
            <View style={{ flex: 1, paddingBottom: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600' }}>
                  {actionMeta?.icon ?? '⚙️'} {actionMeta?.label ?? step.actionType}
                </Text>
                {isHuman && <Badge label="Human Gate" color={WARN} />}
                <Badge label={step.failureBehavior.replace(/_/g, ' ')} color={step.failureBehavior === 'halt_chain' ? DANGER : MUTED.replace('0.5', '1')} />
              </View>
              <Text style={{ color: MUTED, fontSize: 12, marginTop: 2 }}>{step.description}</Text>
              <Text style={{ color: 'rgba(99,102,241,0.7)', fontSize: 11, marginTop: 2 }}>trigger: {step.triggerEvent}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

// ─── Chains Library Tab ───────────────────────────────────────────────────────
function ChainsTab({ chains, onToggle }: { chains: WorkflowChainDefinition[]; onToggle: (id: string, active: boolean) => void }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <View style={{ gap: 12 }}>
      {chains.length === 0 && (
        <Card>
          <Text style={{ color: MUTED, textAlign: 'center', padding: 24 }}>No workflow chains defined yet. Use the Chain Builder to create one.</Text>
        </Card>
      )}
      {chains.map((chain) => {
        const typeColor = CHAIN_TYPE_COLORS[chain.chainType] ?? ACCENT;
        const isOpen = expanded === chain.id;
        return (
          <Card key={chain.id}>
            <Pressable onPress={() => setExpanded(isOpen ? null : chain.id)}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                <AutomationGauge value={chain.automationPct} />
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>{chain.name}</Text>
                    <Badge label={CHAIN_TYPE_LABELS[chain.chainType]} color={typeColor} />
                    {chain.industry && <Badge label={chain.industry} color="rgba(255,255,255,0.4)" />}
                    {!chain.isActive && <Badge label="Inactive" color={DANGER} />}
                  </View>
                  <Text style={{ color: MUTED, fontSize: 12, marginTop: 4 }}>{chain.description}</Text>
                  <View style={{ flexDirection: 'row', gap: 16, marginTop: 6 }}>
                    <Text style={{ color: ACCENT, fontSize: 12 }}>🔗 {chain.steps.length} steps</Text>
                    <Text style={{ color: WARN, fontSize: 12 }}>👤 {humanStepCount(chain.steps)} human gates</Text>
                    <Text style={{ color: SUCCESS, fontSize: 12 }}>⚡ {autoStepCount(chain.steps)} automated</Text>
                  </View>
                </View>
                {/* Active toggle */}
                <Pressable onPress={() => onToggle(chain.id, !chain.isActive)} style={{ alignSelf: 'center' }}>
                  <View style={{ width: 44, height: 24, borderRadius: 12, backgroundColor: chain.isActive ? `${SUCCESS}55` : 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: chain.isActive ? SUCCESS : 'rgba(255,255,255,0.2)', justifyContent: 'center', paddingHorizontal: 2 }}>
                    <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: chain.isActive ? SUCCESS : 'rgba(255,255,255,0.4)', alignSelf: chain.isActive ? 'flex-end' : 'flex-start' }} />
                  </View>
                </Pressable>
              </View>
            </Pressable>
            {isOpen && (
              <View style={{ marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)' }}>
                <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '600', marginBottom: 12 }}>Step Timeline</Text>
                <StepTimeline steps={chain.steps} />
              </View>
            )}
          </Card>
        );
      })}
    </View>
  );
}

// ─── Chain Builder Tab ────────────────────────────────────────────────────────
function BuilderTab({ onAdd }: { onAdd: (chain: Omit<WorkflowChainDefinition, 'id'>) => void }) {
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [chainType, setChainType] = useState<WorkflowChainDefinition['chainType']>('custom');
  const [steps, setSteps] = useState<Partial<ChainStep>[]>([]);
  const [stepTrigger, setStepTrigger] = useState('');
  const [stepAction, setStepAction] = useState<FinancialActionType>('signal.validate_and_route');
  const [stepDesc, setStepDesc] = useState('');
  const [stepHuman, setStepHuman] = useState(false);
  const [saved, setSaved] = useState(false);

  const chainTypes: WorkflowChainDefinition['chainType'][] = ['ap_inbound', 'ar_inbound', 'period_close', 'exception', 'custom'];

  function addStep() {
    if (!stepTrigger.trim() || !stepDesc.trim()) return;
    const newStep: ChainStep = {
      id: `step-${Date.now()}`,
      stepOrder: steps.length + 1,
      triggerEvent: stepTrigger.trim(),
      actionType: stepAction,
      parameters: {},
      isHumanJudgmentPoint: stepHuman,
      failureBehavior: stepHuman ? 'halt_chain' : 'dead_letter',
      description: stepDesc.trim(),
    };
    setSteps([...steps, newStep]);
    setStepTrigger('');
    setStepDesc('');
    setStepHuman(false);
  }

  function saveChain() {
    if (!name.trim() || steps.length === 0) return;
    const autoSteps = steps.filter((s) => !s.isHumanJudgmentPoint).length;
    const automationPct = steps.length ? Math.round((autoSteps / steps.length) * 100) : 0;
    onAdd({
      tenantId: 'tenant-a',
      name: name.trim(),
      description: desc.trim(),
      chainType,
      isActive: true,
      steps: steps as ChainStep[],
      automationPct,
      createdAt: new Date().toISOString(),
      createdBy: 'user-admin',
    });
    setName('');
    setDesc('');
    setSteps([]);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  const inputStyle = {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(99,102,241,0.3)',
    borderRadius: 8,
    padding: 10,
    color: '#fff' as const,
    fontSize: 14,
    marginBottom: 10,
  };

  return (
    <View style={{ gap: 12 }}>
      {saved && (
        <Card>
          <Text style={{ color: SUCCESS, textAlign: 'center', fontWeight: '700' }}>✓ Workflow chain saved to library</Text>
        </Card>
      )}
      <Card>
        <Text style={{ color: ACCENT, fontSize: 14, fontWeight: '700', marginBottom: 12 }}>New Chain Definition</Text>
        <TextInput placeholder="Chain name" placeholderTextColor={MUTED} value={name} onChangeText={setName} style={inputStyle} />
        <TextInput placeholder="Description (optional)" placeholderTextColor={MUTED} value={desc} onChangeText={setDesc} style={inputStyle} multiline numberOfLines={2} />
        <Text style={{ color: MUTED, fontSize: 12, marginBottom: 6 }}>Chain type:</Text>
        <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
          {chainTypes.map((ct) => (
            <Pressable key={ct} onPress={() => setChainType(ct)} style={{
              paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6,
              backgroundColor: chainType === ct ? `${CHAIN_TYPE_COLORS[ct]}33` : 'rgba(255,255,255,0.05)',
              borderWidth: 1, borderColor: chainType === ct ? CHAIN_TYPE_COLORS[ct] : 'rgba(255,255,255,0.1)',
            }}>
              <Text style={{ color: chainType === ct ? CHAIN_TYPE_COLORS[ct] : MUTED, fontSize: 12 }}>{CHAIN_TYPE_LABELS[ct]}</Text>
            </Pressable>
          ))}
        </View>
      </Card>

      <Card>
        <Text style={{ color: ACCENT, fontSize: 14, fontWeight: '700', marginBottom: 12 }}>Add Step</Text>
        <TextInput placeholder="Trigger event (e.g. ap_invoice.created)" placeholderTextColor={MUTED} value={stepTrigger} onChangeText={setStepTrigger} style={inputStyle} />
        <Text style={{ color: MUTED, fontSize: 12, marginBottom: 6 }}>Action type:</Text>
        <View style={{ flexDirection: 'row', gap: 4, flexWrap: 'wrap', marginBottom: 10 }}>
          {ACTION_DOCS.map((a) => (
            <Pressable key={a.type} onPress={() => setStepAction(a.type)} style={{
              paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6,
              backgroundColor: stepAction === a.type ? `${ACCENT}33` : 'rgba(255,255,255,0.04)',
              borderWidth: 1, borderColor: stepAction === a.type ? ACCENT : 'rgba(255,255,255,0.08)',
            }}>
              <Text style={{ color: stepAction === a.type ? ACCENT : MUTED, fontSize: 11 }}>{a.icon} {a.label}</Text>
            </Pressable>
          ))}
        </View>
        <TextInput placeholder="Step description" placeholderTextColor={MUTED} value={stepDesc} onChangeText={setStepDesc} style={inputStyle} />
        <Pressable onPress={() => setStepHuman(!stepHuman)} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <View style={{ width: 18, height: 18, borderRadius: 4, borderWidth: 2, borderColor: stepHuman ? WARN : 'rgba(255,255,255,0.3)', backgroundColor: stepHuman ? `${WARN}33` : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
            {stepHuman && <Text style={{ color: WARN, fontSize: 12, lineHeight: 14 }}>✓</Text>}
          </View>
          <Text style={{ color: stepHuman ? WARN : MUTED, fontSize: 13 }}>Human judgment point (chain pauses for review)</Text>
        </Pressable>
        <Pressable onPress={addStep} style={{ backgroundColor: `${ACCENT}22`, borderWidth: 1, borderColor: ACCENT, borderRadius: 8, padding: 10, alignItems: 'center' }}>
          <Text style={{ color: ACCENT, fontWeight: '700' }}>+ Add Step</Text>
        </Pressable>
      </Card>

      {steps.length > 0 && (
        <Card>
          <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '600', marginBottom: 12 }}>Draft Steps ({steps.length})</Text>
          <StepTimeline steps={steps as ChainStep[]} />
          <Pressable onPress={saveChain} style={{ marginTop: 16, backgroundColor: ACCENT, borderRadius: 8, padding: 12, alignItems: 'center' }}>
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14 }}>Save Chain to Library</Text>
          </Pressable>
        </Card>
      )}
    </View>
  );
}

// ─── Action Library Tab ───────────────────────────────────────────────────────
function ActionsTab() {
  return (
    <View style={{ gap: 10 }}>
      <Card>
        <Text style={{ color: MUTED, fontSize: 13, lineHeight: 20 }}>
          Signal Studio action types are the atomic operations that workflow chain steps execute. Each action type receives parameters from the chain step configuration — no logic is hard-coded in the platform.
        </Text>
      </Card>
      {ACTION_DOCS.map((action) => (
        <Card key={action.type}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <Text style={{ fontSize: 20 }}>{action.icon}</Text>
            <View>
              <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>{action.label}</Text>
              <Text style={{ color: `${ACCENT}bb`, fontSize: 11, fontFamily: 'monospace' }}>{action.type}</Text>
            </View>
          </View>
          <Text style={{ color: MUTED, fontSize: 13, lineHeight: 20 }}>{action.description}</Text>
          {action.parameters.length > 0 && (
            <View style={{ marginTop: 8, flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
              {action.parameters.map((p) => (
                <View key={p} style={{ borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, backgroundColor: `${ACCENT}18`, borderWidth: 1, borderColor: `${ACCENT}33` }}>
                  <Text style={{ color: ACCENT, fontSize: 11, fontFamily: 'monospace' }}>{p}</Text>
                </View>
              ))}
            </View>
          )}
        </Card>
      ))}
    </View>
  );
}

// ─── Metrics Tab ──────────────────────────────────────────────────────────────
function MetricsTab({ chains }: { chains: WorkflowChainDefinition[] }) {
  const active = chains.filter((c) => c.isActive);
  const overallPct = active.length
    ? Math.round(active.reduce((sum, c) => sum + c.automationPct, 0) / active.length)
    : 0;

  const byType = (['ap_inbound', 'ar_inbound', 'period_close', 'exception', 'custom'] as WorkflowChainDefinition['chainType'][])
    .map((ct) => {
      const group = active.filter((c) => c.chainType === ct);
      return {
        type: ct,
        label: CHAIN_TYPE_LABELS[ct],
        color: CHAIN_TYPE_COLORS[ct],
        count: group.length,
        avg: group.length ? Math.round(group.reduce((s, c) => s + c.automationPct, 0) / group.length) : 0,
        humanGates: group.reduce((s, c) => s + humanStepCount(c.steps), 0),
        totalSteps: group.reduce((s, c) => s + c.steps.length, 0),
      };
    })
    .filter((r) => r.count > 0);

  const totalHumanGates = chains.reduce((s, c) => s + humanStepCount(c.steps), 0);
  const totalAutoSteps = chains.reduce((s, c) => s + autoStepCount(c.steps), 0);
  const totalSteps = chains.reduce((s, c) => s + c.steps.length, 0);

  return (
    <View style={{ gap: 12 }}>
      {/* Overall KPIs */}
      <Card>
        <Text style={{ color: ACCENT, fontSize: 14, fontWeight: '700', marginBottom: 12 }}>Automation Summary</Text>
        <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
          {[
            { label: 'Overall Automation', value: pct(overallPct), color: overallPct >= 75 ? SUCCESS : WARN },
            { label: 'Active Chains', value: String(active.length), color: ACCENT },
            { label: 'Total Steps', value: String(totalSteps), color: ACCENT },
            { label: 'Auto Steps', value: String(totalAutoSteps), color: SUCCESS },
            { label: 'Human Gates', value: String(totalHumanGates), color: WARN },
          ].map((kpi) => (
            <View key={kpi.label} style={{ minWidth: 110, flex: 1, backgroundColor: `${kpi.color}0f`, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: `${kpi.color}22` }}>
              <Text style={{ color: kpi.color, fontSize: 22, fontWeight: '800' }}>{kpi.value}</Text>
              <Text style={{ color: MUTED, fontSize: 11, marginTop: 2 }}>{kpi.label}</Text>
            </View>
          ))}
        </View>
      </Card>

      {/* 75% Automation Threshold (WS-049 §5) */}
      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '700' }}>75% Automation Threshold</Text>
          <Badge label={overallPct >= 75 ? 'ACHIEVED' : 'BELOW TARGET'} color={overallPct >= 75 ? SUCCESS : WARN} />
        </View>
        <View style={{ height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
          <View style={{ height: 8, borderRadius: 4, backgroundColor: overallPct >= 75 ? SUCCESS : WARN, width: `${Math.min(overallPct, 100)}%` as any }} />
        </View>
        <Text style={{ color: MUTED, fontSize: 12, marginTop: 6 }}>
          WS-049 target: ≥75% of chain steps run without human intervention. Current: {pct(overallPct)}.
        </Text>
      </Card>

      {/* Breakdown by chain type */}
      {byType.length > 0 && (
        <Card>
          <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '700', marginBottom: 12 }}>By Chain Type</Text>
          <View style={{ gap: 10 }}>
            {byType.map((row) => (
              <View key={row.type} style={{ gap: 4 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ color: '#fff', fontSize: 13 }}>{row.label}</Text>
                  <Text style={{ color: row.color, fontSize: 13, fontWeight: '700' }}>{pct(row.avg)}</Text>
                </View>
                <View style={{ height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                  <View style={{ height: 6, borderRadius: 3, backgroundColor: row.color, width: `${Math.min(row.avg, 100)}%` as any }} />
                </View>
                <Text style={{ color: MUTED, fontSize: 11 }}>
                  {row.count} chain{row.count !== 1 ? 's' : ''} · {row.totalSteps} steps · {row.humanGates} human gate{row.humanGates !== 1 ? 's' : ''}
                </Text>
              </View>
            ))}
          </View>
        </Card>
      )}

      {/* Individual chain breakdown */}
      <Card>
        <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '700', marginBottom: 12 }}>Chain Detail</Text>
        {chains.length === 0 ? (
          <Text style={{ color: MUTED, fontSize: 13 }}>No chains defined.</Text>
        ) : (
          <View style={{ gap: 8 }}>
            {chains.map((chain) => {
              const typeColor = CHAIN_TYPE_COLORS[chain.chainType] ?? ACCENT;
              return (
                <View key={chain.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <AutomationGauge value={chain.automationPct} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600' }}>{chain.name}</Text>
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 2 }}>
                      <Badge label={chain.isActive ? 'Active' : 'Inactive'} color={chain.isActive ? SUCCESS : DANGER} />
                      <Badge label={CHAIN_TYPE_LABELS[chain.chainType]} color={typeColor} />
                    </View>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ color: WARN, fontSize: 12 }}>{humanStepCount(chain.steps)} 👤</Text>
                    <Text style={{ color: SUCCESS, fontSize: 12 }}>{autoStepCount(chain.steps)} ⚡</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </Card>
    </View>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function WorkflowChainsPage({}: GuidedPageProps) {
  const { data, addWorkflowChain, updateWorkflowChain } = useAppState();
  const { styles } = useUiTheme();
  const [tab, setTab] = useState<ChainTab>('chains');

  const chains = data.workflowChains ?? [];

  function handleToggle(id: string, active: boolean) {
    updateWorkflowChain(id, { isActive: active });
  }

  function handleAdd(chain: Omit<WorkflowChainDefinition, 'id'>) {
    addWorkflowChain(chain);
    setTab('chains');
  }

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 80 }}>
      {/* Header */}
      <View style={{ marginBottom: 20 }}>
        <Text style={{ color: ACCENT, fontSize: 22, fontWeight: '800', letterSpacing: -0.5 }}>
          Workflow Chains
        </Text>
        <Text style={{ color: MUTED, fontSize: 13, marginTop: 4 }}>
          Configurable automation chains connecting financial events, GL actions, and alerts. All logic lives in data — no hardcoded rules.
        </Text>
      </View>

      <TabBar active={tab} onChange={setTab} />

      {tab === 'chains' && (
        <ChainsTab chains={chains} onToggle={handleToggle} />
      )}
      {tab === 'builder' && (
        <BuilderTab onAdd={handleAdd} />
      )}
      {tab === 'actions' && (
        <ActionsTab />
      )}
      {tab === 'metrics' && (
        <MetricsTab chains={chains} />
      )}
    </ScrollView>
  );
}
