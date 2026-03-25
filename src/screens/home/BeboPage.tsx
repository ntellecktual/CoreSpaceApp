/**
 * BeboPage — Seamless AI Chat Experience
 * Friendly, intuitive interface with industry verticals, inline AI chat,
 * rich card rendering, and one-click workspace/data apply.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Image,
  Platform,
  ScrollView,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { InteractivePressable as Pressable } from '../../components/InteractivePressable';
import { useAppState } from '../../context/AppStateContext';
import { useUiTheme } from '../../context/UiThemeContext';
import {
  BeboCard,
  BeboCardArchitecture,
  BeboCardDataPreview,
  BeboCardIntegrationStatus,
  BeboCardSignalFlows,
  BeboCardStats,
  BeboCardWorkspaceProposal,
  DemoVertical,
  ScenarioApplyPayload,
  VERTICAL_META,
  buildTenantScaffold,
  generateBeboResponse,
  getPayloadForVertical,
  getScenarioIntroResponse,
} from '../../ai/beboEngine';
import { GuidedPageProps } from './types';

// ─── Types ────────────────────────────────────────────────────────────

interface ChatMsg {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  cards: BeboCard[];
  quickReplies: string[];
  timestamp: Date;
}

// ─── Scenario Config ──────────────────────────────────────────────────

const VERTICALS: DemoVertical[] = ['pharma', 'sales', 'healthcare', 'logistics', 'legal', 'insurance', 'lifecycle', 'fulfillment', 'kitting'];

// Friendly labels a first-time user would understand
const FRIENDLY_LABELS: Record<DemoVertical, string> = {
  pharma: 'Pharmacy', sales: 'Sales', healthcare: 'Healthcare', logistics: 'Shipping',
  legal: 'Legal', insurance: 'Insurance', lifecycle: 'Services', fulfillment: 'Warehouse', kitting: 'Assembly',
};

const DEMO_QUICK_PROMPTS: Record<DemoVertical, string[]> = {
  pharma:      ['Apply full scenario now', 'Generate sample data', 'Show Signal flows', 'Show Orbital integrations'],
  sales:       ['Build Sales Pipeline workspace', 'Generate deal data', 'Show automation flows', 'Show Orbital'],
  healthcare:  ['Build Patient Care workspace',  'Generate patient data', 'Show automation flows', 'Show Orbital'],
  logistics:   ['Build Fulfillment workspace',   'Generate shipment data','Show automation flows', 'Show Orbital'],
  legal:       ['Build Case Management workspace','Generate case data',   'Show deadline automations','Show Orbital'],
  insurance:   ['Build Policy Admin workspace',  'Generate policy data', 'Show claim automations', 'Show Orbital'],
  lifecycle:   ['Build Onboarding workspace', 'Generate service records', 'Show SLA automations', 'Show Orbital'],
  fulfillment: ['Build kitting workspace', 'Generate work order data', 'Show BOM automation flows', 'Show Orbital'],
  kitting:     ['Build Pick-Pack-Ship workspace', 'Generate fulfillment data', 'Show automation flows', 'Show Orbital'],
};

// ─── Helpers ──────────────────────────────────────────────────────────

function uid() {
  return `msg-${Date.now()}-${Math.floor(Math.random() * 99999)}`;
}

function downloadFile(content: string, filename: string, mime: string) {
  if (Platform.OS !== 'web') return;
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function MarkdownText({ text, bodyColor, subtleColor }: { text: string; bodyColor: string; subtleColor: string }) {
  const lines = text.split('\n');
  return (
    <View style={{ gap: 3 }}>
      {lines.map((line, i) => {
        if (!line.trim()) return <View key={i} style={{ height: 6 }} />;
        const parts: React.ReactNode[] = [];
        let rem = line;
        let k = 0;
        while (rem.length > 0) {
          const m = rem.match(/\*\*(.+?)\*\*/);
          if (m && m.index !== undefined) {
            if (m.index > 0) parts.push(<Text key={k++} style={{ color: bodyColor }}>{rem.slice(0, m.index)}</Text>);
            parts.push(<Text key={k++} style={{ color: bodyColor, fontWeight: '700' }}>{m[1]}</Text>);
            rem = rem.slice(m.index + m[0].length);
          } else {
            parts.push(<Text key={k++} style={{ color: rem.startsWith('•') || rem.startsWith('*') ? subtleColor : bodyColor }}>{rem}</Text>);
            break;
          }
        }
        return <Text key={i} style={{ fontSize: 15, lineHeight: 24 }}>{parts}</Text>;
      })}
    </View>
  );
}

// ─── Card Components ──────────────────────────────────────────────────

function WorkspaceProposalCard({
  card, onApply, applied, accent,
}: {
  card: BeboCardWorkspaceProposal;
  onApply: (p: ScenarioApplyPayload) => void;
  applied: boolean;
  accent: string;
}) {
  const totalSS = card.workspaces.reduce((a, w) => a + w.subSpaces.length, 0);
  return (
    <View style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: `${accent}44`, borderRadius: 16, padding: 18, marginTop: 10, gap: 14 } as any}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: `${accent}22`, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 18 }}>🗂️</Text>
        </View>
        <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 15, flex: 1 }}>{card.industry} — Workspace Blueprint</Text>
      </View>

      {/* Workspaces */}
      <View style={{ gap: 8 }}>
        {card.workspaces.map((ws, wi) => (
          <View key={wi} style={{ backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 12, gap: 6 }}>
            <Text style={{ color: '#E0E4ED', fontWeight: '700', fontSize: 14 }}>{ws.icon} {ws.name}</Text>
            <Text style={{ color: 'rgba(232,228,255,0.50)', fontSize: 12 }}>Root Entity: {ws.rootEntity}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 2 }}>
              {ws.subSpaces.map((ss, si) => (
                <View key={si} style={{ backgroundColor: `${accent}18`, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
                  <Text style={{ color: accent, fontSize: 11, fontWeight: '600' }}>{ss.name} · {ss.fieldCount} fields · {ss.displayType}</Text>
                </View>
              ))}
            </View>
          </View>
        ))}
      </View>

      {/* Stats row */}
      <View style={{ flexDirection: 'row', gap: 20, justifyContent: 'center', paddingVertical: 6 }}>
        {[
          { label: 'Workspaces', v: card.workspaces.length },
          { label: 'SubSpaces', v: totalSS },
          { label: 'Personas', v: card.personas.length },
          { label: 'Stages', v: card.lifecycleStages.length },
          { label: 'Flows', v: card.flows.length },
        ].map((m, i) => (
          <View key={i} style={{ alignItems: 'center', gap: 2 }}>
            <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 18 }}>{m.v}</Text>
            <Text style={{ color: 'rgba(232,228,255,0.50)', fontSize: 11 }}>{m.label}</Text>
          </View>
        ))}
      </View>

      {/* Apply button */}
      <Pressable
        onPress={() => !applied && onApply(card.applyPayload)}
        style={{
          backgroundColor: applied ? 'rgba(34,197,94,0.16)' : accent,
          borderWidth: 1, borderColor: applied ? '#22C55E' : 'transparent',
          borderRadius: 12, paddingVertical: 14, alignItems: 'center',
        } as any}
      >
        <Text style={{ color: applied ? '#22C55E' : '#FFFFFF', fontWeight: '700', fontSize: 15 }}>
          {applied ? '✅  Applied to Halo Internal' : 'Apply Full Scenario  →'}
        </Text>
      </Pressable>
    </View>
  );
}

function DataPreviewCard({ card, accent, vertical }: { card: BeboCardDataPreview; accent: string; vertical: DemoVertical }) {
  const [fmt, setFmt] = useState<'csv' | 'json'>('csv');
  const slug = VERTICAL_META[vertical].shortLabel.toLowerCase();
  return (
    <View style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: `${accent}44`, borderRadius: 16, padding: 18, marginTop: 10, gap: 12 } as any}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 14, flex: 1 }}>{card.title}</Text>
        <View style={{ backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
          <Text style={{ color: 'rgba(232,228,255,0.5)', fontSize: 12, fontWeight: '600' }}>{card.totalRows} records</Text>
        </View>
      </View>

      {/* Format toggle */}
      <View style={{ flexDirection: 'row', gap: 6, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: 3, alignSelf: 'flex-start' }}>
        {(['csv', 'json'] as const).map(f => (
          <Pressable key={f} onPress={() => setFmt(f)}
            style={{ backgroundColor: fmt === f ? accent : 'transparent', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 6 }}>
            <Text style={{ color: fmt === f ? '#FFFFFF' : 'rgba(232,228,255,0.5)', fontSize: 12, fontWeight: '700', textTransform: 'uppercase' as any }}>{f}</Text>
          </Pressable>
        ))}
      </View>

      {/* CSV preview table */}
      {fmt === 'csv' && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ borderRadius: 10 }}>
          <View>
            <View style={{ flexDirection: 'row', backgroundColor: `${accent}22`, paddingVertical: 6, borderRadius: 6 }}>
              {card.headers.slice(0, 5).map((h, i) => (
                <Text key={i} style={{ color: accent, fontSize: 11, fontWeight: '700', width: 125, paddingHorizontal: 8 }}>{h}</Text>
              ))}
            </View>
            {card.rows.slice(0, 4).map((row, ri) => (
              <View key={ri} style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)', paddingVertical: 6 }}>
                {row.slice(0, 5).map((cell, ci) => (
                  <Text key={ci} numberOfLines={1} style={{ color: 'rgba(232,228,255,0.65)', fontSize: 11, width: 125, paddingHorizontal: 8 }}>{cell}</Text>
                ))}
              </View>
            ))}
            <Text style={{ color: 'rgba(232,228,255,0.35)', fontSize: 11, paddingTop: 6, paddingHorizontal: 8 }}>
              Showing 4 of {card.totalRows} rows · {card.headers.length} columns
            </Text>
          </View>
        </ScrollView>
      )}

      {/* JSON preview */}
      {fmt === 'json' && (
        <ScrollView style={{ maxHeight: 120, backgroundColor: 'rgba(0,0,0,0.20)', borderRadius: 10, padding: 10 }} showsVerticalScrollIndicator={false}>
          <Text style={{ color: 'rgba(232,228,255,0.65)', fontSize: 11, fontFamily: 'monospace' }}>
            {card.jsonContent.slice(0, 500)}{card.jsonContent.length > 500 ? '\n…' : ''}
          </Text>
        </ScrollView>
      )}

      {/* Actions */}
      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
        <Pressable onPress={() => downloadFile(card.csvContent, `halointernal-${slug}.csv`, 'text/csv')}
          style={{ backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 }}>
          <Text style={{ color: 'rgba(232,228,255,0.70)', fontSize: 12, fontWeight: '600' }}>⬇ CSV</Text>
        </Pressable>
        <Pressable onPress={() => downloadFile(card.jsonContent, `halointernal-${slug}.json`, 'application/json')}
          style={{ backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 }}>
          <Text style={{ color: 'rgba(232,228,255,0.70)', fontSize: 12, fontWeight: '600' }}>⬇ JSON</Text>
        </Pressable>
        <Pressable onPress={() => downloadFile(card.csvContent, `halointernal-${slug}.csv`, 'text/csv')}
          style={{ backgroundColor: `${accent}22`, borderWidth: 1, borderColor: `${accent}55`, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 } as any}>
          <Text style={{ color: accent, fontSize: 12, fontWeight: '600' }}>🌐 Import to Cosmograph</Text>
        </Pressable>
      </View>
    </View>
  );
}

function IntegrationStatusCard({ card, accent }: { card: BeboCardIntegrationStatus; accent: string }) {
  return (
    <View style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: `${accent}44`, borderRadius: 16, padding: 18, marginTop: 10, gap: 12 } as any}>
      <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 14 }}>🔗 Orbital Integrations</Text>
      <View style={{ gap: 8 }}>
        {card.integrations.map((intg, i) => (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 12, gap: 10 }}>
            <Text style={{ fontSize: 20 }}>{intg.icon}</Text>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ color: '#E0E4ED', fontWeight: '700', fontSize: 13 }}>{intg.name}</Text>
                <View style={{ backgroundColor: intg.status === 'active' ? 'rgba(34,197,94,0.18)' : 'rgba(255,255,255,0.08)', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 }}>
                  <Text style={{ color: intg.status === 'active' ? '#22C55E' : 'rgba(232,228,255,0.45)', fontSize: 10, fontWeight: '700', textTransform: 'uppercase' as any }}>{intg.status}</Text>
                </View>
              </View>
              <Text style={{ color: 'rgba(232,228,255,0.45)', fontSize: 11, marginTop: 2 }}>
                {intg.status === 'active' ? `${intg.lastSync} · ${intg.eventsToday} events today` : `${intg.category} · Ready to activate`}
              </Text>
            </View>
            {intg.status === 'active' && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#22C55E' }} />}
          </View>
        ))}
      </View>
    </View>
  );
}

function SignalFlowsCard({
  card, onApply, applied, accent,
}: {
  card: BeboCardSignalFlows;
  onApply: (p: ScenarioApplyPayload) => void;
  applied: boolean;
  accent: string;
}) {
  return (
    <View style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: `${accent}44`, borderRadius: 16, padding: 18, marginTop: 10, gap: 12 } as any}>
      <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 14 }}>⚡ Automation Flows</Text>
      <View style={{ gap: 10 }}>
        {card.flows.map((fl, i) => (
          <View key={i} style={{ backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 12, gap: 6 }}>
            <Text style={{ color: '#E0E4ED', fontWeight: '700', fontSize: 13 }}>{fl.name}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <View style={{ backgroundColor: 'rgba(59,130,246,0.18)', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 }}>
                <Text style={{ color: '#60A5FA', fontSize: 10, fontWeight: '700' }}>TRIGGER</Text>
              </View>
              <Text style={{ color: 'rgba(232,228,255,0.60)', fontSize: 12, flex: 1 }}>{fl.trigger}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6 }}>
              <View style={{ backgroundColor: `${accent}22`, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2, marginTop: 1 }}>
                <Text style={{ color: accent, fontSize: 10, fontWeight: '700' }}>ACTION</Text>
              </View>
              <Text style={{ color: 'rgba(232,228,255,0.60)', fontSize: 12, flex: 1, lineHeight: 18 }}>{fl.action}</Text>
            </View>
            <Text style={{ color: 'rgba(232,228,255,0.35)', fontSize: 11 }}>{fl.runsToday} runs today</Text>
          </View>
        ))}
      </View>
      <Pressable
        onPress={() => !applied && onApply(card.applyPayload)}
        style={{ backgroundColor: applied ? 'rgba(34,197,94,0.16)' : `${accent}dd`, borderWidth: 1, borderColor: applied ? '#22C55E' : 'transparent', borderRadius: 12, paddingVertical: 12, alignItems: 'center' } as any}
      >
        <Text style={{ color: applied ? '#22C55E' : '#FFFFFF', fontWeight: '700', fontSize: 13 }}>
          {applied ? '✅  Flows Published' : '⚡  Publish All Flows'}
        </Text>
      </Pressable>
    </View>
  );
}

function StatsCard({ card, accent }: { card: BeboCardStats; accent: string }) {
  return (
    <View style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: `${accent}44`, borderRadius: 16, padding: 18, marginTop: 10, gap: 12 } as any}>
      <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 14 }}>📊 Platform Analytics</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {card.stats.map((s, i) => (
          <View key={i} style={{ backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 14, padding: 14, minWidth: 130, flex: 1, gap: 4 }}>
            <Text style={{ fontSize: 20 }}>{s.icon}</Text>
            <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 22, letterSpacing: -0.5 }}>{s.value}</Text>
            <Text style={{ color: 'rgba(232,228,255,0.55)', fontSize: 12 }}>{s.label}</Text>
            {s.delta && <Text style={{ color: s.positive ? '#22C55E' : '#F87171', fontSize: 11, fontWeight: '600' }}>{s.positive ? '↑' : '↓'} {s.delta}</Text>}
          </View>
        ))}
      </View>
    </View>
  );
}

function ArchitectureCard({
  card, onApply, applied, accent,
}: {
  card: BeboCardArchitecture;
  onApply: (p: ScenarioApplyPayload) => void;
  applied: boolean;
  accent: string;
}) {
  return (
    <View style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 18, gap: 14, borderWidth: 1, borderColor: `${accent}30` }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Text style={{ fontSize: 22 }}>🏗️</Text>
        <View style={{ flex: 1 }}>
          <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 16 }}>Business Architecture</Text>
          <Text style={{ color: '#9CA3AF', fontSize: 12 }}>{card.industry}</Text>
        </View>
        <View style={{ backgroundColor: `${accent}20`, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 }}>
          <Text style={{ color: accent, fontSize: 12, fontWeight: '700' }}>{card.functions.length} dept{card.functions.length !== 1 ? 's' : ''}</Text>
        </View>
      </View>

      {card.functions.map((fn) => (
        <View key={fn.fnId} style={{ borderLeftWidth: 3, borderLeftColor: fn.color, paddingLeft: 14, gap: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: 16 }}>{fn.icon}</Text>
            <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 15 }}>{fn.name}</Text>
          </View>
          {!!fn.description && (
            <Text style={{ color: '#9CA3AF', fontSize: 12 }}>{fn.description}</Text>
          )}
          <View style={{ gap: 6 }}>
            {fn.objects.map((obj, oi) => (
              <View key={oi} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: `${fn.color}10`, borderRadius: 10, padding: 10 }}>
                <Text style={{ fontSize: 18 }}>{obj.icon}</Text>
                <View style={{ flex: 1, gap: 3 }}>
                  <Text style={{ color: '#E0E4ED', fontWeight: '600', fontSize: 13 }}>{obj.name} <Text style={{ color: '#9CA3AF', fontWeight: '400' }}>({obj.namePlural})</Text></Text>
                  {!!obj.description && <Text style={{ color: '#9CA3AF', fontSize: 11 }}>{obj.description}</Text>}
                  {obj.workspaceNames.length > 0 && (
                    <View style={{ flexDirection: 'row', gap: 5, flexWrap: 'wrap', marginTop: 3 }}>
                      <Text style={{ color: '#6B7280', fontSize: 10, alignSelf: 'center' }}>Links to:</Text>
                      {obj.workspaceNames.map((wn, wi) => (
                        <View key={wi} style={{ backgroundColor: `${fn.color}20`, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 }}>
                          <Text style={{ color: fn.color, fontSize: 10, fontWeight: '600' }}>{wn}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              </View>
            ))}
          </View>
        </View>
      ))}

      <Pressable
        onPress={() => !applied && onApply(card.applyPayload)}
        style={{ backgroundColor: applied ? '#22C55E' : accent, borderRadius: 12, paddingVertical: 14, alignItems: 'center' }}
      >
        <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 15 }}>
          {applied ? '✅  Architecture Applied' : 'Apply Architecture  →'}
        </Text>
      </Pressable>
    </View>
  );
}

function CardRenderer({
  card, onApply, applied, accent, vertical,
}: {
  card: BeboCard; onApply: (p: ScenarioApplyPayload) => void;
  applied: boolean; accent: string; vertical: DemoVertical;
}) {
  switch (card.type) {
    case 'workspace_proposal': return <WorkspaceProposalCard card={card} onApply={onApply} applied={applied} accent={accent} />;
    case 'data_preview':       return <DataPreviewCard card={card} accent={accent} vertical={vertical} />;
    case 'integration_status': return <IntegrationStatusCard card={card} accent={accent} />;
    case 'signal_flows':       return <SignalFlowsCard card={card} onApply={onApply} applied={applied} accent={accent} />;
    case 'stats':              return <StatsCard card={card} accent={accent} />;
    case 'architecture':       return <ArchitectureCard card={card} onApply={onApply} applied={applied} accent={accent} />;
    default:                   return null;
  }
}

// ─── Main BeboPage ────────────────────────────────────────────────────

export function BeboPage({ guidedMode, onGuide, addNotification }: GuidedPageProps) {
  const { mode } = useUiTheme();
  const { width: windowWidth } = useWindowDimensions();
  const compact = windowWidth < 860;
  const isDark = mode === 'night';
  const appState = useAppState();

  const [vertical, setVertical] = useState<DemoVertical>('pharma');
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [appliedCardIds, setAppliedCardIds] = useState<Set<string>>(new Set());
  const [appliedVerticals, setAppliedVerticals] = useState<Set<DemoVertical>>(new Set());
  const scrollRef = useRef<ScrollView>(null);

  const accent = VERTICAL_META[vertical].color;

  const pal = isDark
    ? {
        bg: '#0F0B1B',
        headerBg: 'rgba(15,11,27,0.96)',
        headerBorder: 'rgba(255,255,255,0.08)',
        msgBg: 'rgba(255,255,255,0.04)',
        msgBorder: 'rgba(255,255,255,0.08)',
        inputBg: 'rgba(255,255,255,0.05)',
        inputBorder: 'rgba(255,255,255,0.10)',
        inputText: '#FFFFFF',
        placeholder: 'rgba(255,255,255,0.28)',
        bodyText: 'rgba(232,228,255,0.84)',
        subtleText: 'rgba(232,228,255,0.48)',
        chipBg: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
        chipBorder: 'rgba(255,255,255,0.10)',
      }
    : {
        bg: '#F4F2FF',
        headerBg: 'rgba(255,255,255,0.97)',
        headerBorder: 'rgba(102,74,154,0.12)',
        msgBg: 'rgba(255,255,255,0.88)',
        msgBorder: 'rgba(102,74,154,0.12)',
        inputBg: 'rgba(255,255,255,0.92)',
        inputBorder: 'rgba(102,74,154,0.20)',
        inputText: '#1A2340',
        placeholder: 'rgba(30,21,53,0.35)',
        bodyText: '#3D2B5E',
        subtleText: '#7C6FA0',
        chipBg: 'rgba(0,0,0,0.05)',
        chipBorder: 'rgba(102,74,154,0.14)',
      };

  // Init with pharma welcome message
  useEffect(() => {
    const resp = getScenarioIntroResponse('pharma');
    setMessages([{ id: uid(), role: 'assistant', text: resp.text, cards: resp.cards, quickReplies: resp.quickReplies, timestamp: new Date() }]);
  }, []);

  // Auto-scroll on new message / thinking state
  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
  }, [messages, isThinking]);

  // ── Scenario switch ─────────────────────────────────────────────────
  const switchVertical = useCallback((v: DemoVertical) => {
    setVertical(v);
    const resp = getScenarioIntroResponse(v);
    setMessages(prev => [...prev, { id: uid(), role: 'assistant', text: resp.text, cards: resp.cards, quickReplies: resp.quickReplies, timestamp: new Date() }]);
  }, []);

  // ── Send message ────────────────────────────────────────────────────
  const sendMessage = useCallback((text: string) => {
    if (!text.trim() || isThinking) return;
    setMessages(prev => [...prev, { id: uid(), role: 'user', text: text.trim(), cards: [], quickReplies: [], timestamp: new Date() }]);
    setInput('');
    setIsThinking(true);
    const delay = 1050 + Math.random() * 650;
    setTimeout(() => {
      const resp = generateBeboResponse(text, vertical);
      setMessages(prev => [...prev, { id: uid(), role: 'assistant', text: resp.text, cards: resp.cards, quickReplies: resp.quickReplies, timestamp: new Date() }]);
      setIsThinking(false);
    }, delay);
  }, [isThinking, vertical]);

  // ── Universal Tenant Org Layer ─────────────────────────────────────
  // Universal is NOT a template — it is the standard org scaffold that comes
  // with every tenant. Operations holds the active vertical's workspaces.
  // All other departments are empty containers ready to accept workspaces.
  const handleUniversalSuite = useCallback(() => {
    const verticalPayload = getPayloadForVertical(vertical);
    const scaffold = buildTenantScaffold(verticalPayload);
    const { label, icon } = VERTICAL_META[vertical];

    const wsCard: BeboCardWorkspaceProposal = {
      type: 'workspace_proposal',
      id: `card-universal-${Date.now()}`,
      industry: 'Tenant Org Layer — Universal',
      workspaces: scaffold.workspaces.map(ws => ({
        name: ws.name,
        icon: ws.icon ?? '🗂️',
        rootEntity: ws.rootEntity,
        subSpaces: (ws.subSpaces ?? []).map(ss => ({
          name: ss.name,
          sourceEntity: ss.sourceEntity,
          displayType: ss.displayType,
          fieldCount: ss.builderFields?.length ?? 0,
        })),
      })),
      personas: ['Department Head', 'Team Member', 'Executive', 'Cross-Dept Collaborator'],
      lifecycleStages: ['Draft', 'Active', 'In Review', 'Completed', 'Archived'],
      flows: scaffold.flows.map(f => ({ name: f.name, trigger: f.signal, action: f.action })),
      applyPayload: scaffold,
    };

    setMessages(prev => [...prev, {
      id: uid(),
      role: 'assistant',
      text: `🌐 **Universal is your tenant's org layer** — it ships with every Halo Internal tenant automatically. It is not a template.\n\n**How it works:**\n• **⚙️ Operations** contains your active vertical's workspaces (currently ${icon} **${label}**)\n• **💰 Finance · 👥 HR · 📣 Marketing · 📈 Sales · ⚖️ Legal · 💻 IT · 🌱 Sustainability** — all empty department containers, each ready to accept workspaces as your org grows\n\nAny workspace — whether from a vertical template or manually created — is placed into the department it belongs to. Operations is where your vertical's core workspaces live.\n\n**6 cross-department signal flows are pre-wired** and activate as departments are built out:\n• Deal Won → Finance invoice + CS onboarding\n• New Hire → IT provisioning + HR onboarding checklist\n• Contract Expiry → Legal renewal task\n• Overdue Invoice → Finance Director escalation\n• P1 Incident → IT war room + status page update\n• ESG Deadline → Sustainability team alert`,
      cards: [wsCard],
      quickReplies: [
        `View ${label} workspaces in Operations`,
        'Add workspace to Finance',
        'Preview cross-dept signal flows',
        'How do departments accept workspaces?',
      ],
      timestamp: new Date(),
    }]);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
  }, [vertical]);

  // ── Apply payload ───────────────────────────────────────────────────
  const handleApply = useCallback((payload: ScenarioApplyPayload, cardId: string) => {
    if (payload.shellConfig && appState.data.shellConfig) {
      appState.upsertShellConfig({ ...appState.data.shellConfig, ...payload.shellConfig });
    }
    payload.workspaces.forEach(ws => appState.upsertWorkspace(ws));
    payload.flows.forEach(fl => appState.upsertFlow(fl));
    payload.integrations.forEach(intg => appState.activateIntegration(intg));
    payload.clients?.forEach(cl => appState.addClient(cl));
    payload.records.forEach(rec => appState.addRecord(rec));
    payload.businessFunctions?.forEach(fn => appState.upsertBusinessFunction(fn));

    setAppliedCardIds(prev => new Set([...prev, cardId]));
    setAppliedVerticals(prev => new Set([...prev, vertical]));

    const { label, icon } = VERTICAL_META[vertical];
    setMessages(prev => [...prev, {
      id: uid(),
      role: 'assistant',
      text: `✅ **Applied!** Your **${icon} ${label}** scenario is now live across Halo Internal.\n\n• **${payload.workspaces.length}** workspace${payload.workspaces.length !== 1 ? 's' : ''} created in Admin\n• **${payload.records.length}** records added to End User\n• **${(payload.clients?.length ?? 0)}** collection${(payload.clients?.length ?? 0) !== 1 ? 's' : ''} created\n• **${payload.flows.length}** Signal flows published\n• **${payload.integrations.length}** Orbital integrations activated${(payload.businessFunctions?.length ?? 0) > 0 ? `\n• **${payload.businessFunctions!.length}** department${payload.businessFunctions!.length !== 1 ? 's' : ''} loaded in Architecture` : ''}\n• Shell labels updated to ${label} terminology\n\nNavigate to **Admin** → Workspace Design to inspect the structure, or go to **End User** to interact with live ${label.toLowerCase()} data.`,
      cards: [],
      quickReplies: ['Generate more sample data', 'Show platform analytics', 'Customize workspace fields', 'Try another scenario'],
      timestamp: new Date(),
    }]);

    if (addNotification) {
      addNotification({ type: 'system', severity: 'success', title: `${icon} ${label} applied!`, body: `${payload.workspaces.length} workspaces · ${payload.records.length} records · ${payload.flows.length} flows are now live.` });
    }
  }, [appState, vertical, addNotification]);

  // ─── Render ──────────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: pal.bg }}>

      {/* ── Sticky Header ── */}
      <View style={{ backgroundColor: pal.headerBg, borderBottomWidth: 1, borderBottomColor: pal.headerBorder, paddingTop: 14, paddingBottom: 10, paddingHorizontal: compact ? 12 : 22, gap: 10, backdropFilter: 'blur(20px)', zIndex: 10 } as any}>

        {/* Title row */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: `${accent}22`, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: `${accent}55` } as any}>
            <Text style={{ fontSize: 22 }}>✦</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: isDark ? '#FFFFFF' : '#1A2340', fontWeight: '800', fontSize: 18, letterSpacing: -0.3 }}>Bebo AI</Text>
            <Text style={{ color: pal.subtleText, fontSize: 12, lineHeight: 16 }}>Your AI assistant — ask anything or pick an industry below</Text>
          </View>
          {!!VERTICAL_META[vertical].tenantLogo && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)' } as any}>
              <Image source={{ uri: VERTICAL_META[vertical].tenantLogo }} style={{ width: 52, height: 18, resizeMode: 'contain' } as any} />
            </View>
          )}
          {!VERTICAL_META[vertical].tenantLogo && !!VERTICAL_META[vertical].tenantName && (
            <View style={{ backgroundColor: `${accent}18`, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: `${accent}30` } as any}>
              <Text style={{ color: accent, fontSize: 12, fontWeight: '700' }}>{VERTICAL_META[vertical].tenantName}</Text>
            </View>
          )}
        </View>

        {/* Scenario tabs — friendly labels, bigger pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -4 }}>
          <View style={{ flexDirection: 'row', gap: 6, paddingHorizontal: 4 }}>
            {VERTICALS.map(v => {
              const meta = VERTICAL_META[v];
              const active = v === vertical;
              const hasApplied = appliedVerticals.has(v);
              return (
                <Pressable
                  key={v}
                  onPress={() => v !== vertical && switchVertical(v)}
                  style={{
                    flexDirection: 'row', alignItems: 'center', gap: 6,
                    backgroundColor: active ? meta.color : pal.chipBg,
                    borderWidth: 1, borderColor: active ? meta.color : pal.chipBorder,
                    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7,
                  } as any}
                >
                  <Text style={{ fontSize: 14 }}>{meta.icon}</Text>
                  <Text style={{ color: active ? '#FFFFFF' : pal.subtleText, fontSize: 13, fontWeight: active ? '700' : '500' }}>{FRIENDLY_LABELS[v]}</Text>
                  {hasApplied && <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#22C55E' }} />}
                </Pressable>
              );
            })}
            {/* Org layer button — inline with vertical tabs for discoverability */}
            <Pressable
              onPress={handleUniversalSuite}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 6,
                backgroundColor: isDark ? 'rgba(38,51,116,0.14)' : 'rgba(38,51,116,0.08)',
                borderWidth: 1, borderColor: 'rgba(38,51,116,0.30)',
                borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7,
              } as any}
            >
              <Text style={{ fontSize: 14 }}>🌐</Text>
              <Text style={{ color: isDark ? '#FFD332' : '#263374', fontSize: 13, fontWeight: '600' }}>Org Layer</Text>
            </Pressable>
          </View>
        </ScrollView>
      </View>

      {/* ── Messages ── */}
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: compact ? 12 : 22, gap: 14, paddingBottom: 20 }}
        showsVerticalScrollIndicator={false}
      >
        {messages.map(msg => (
          <View key={msg.id} style={{ alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start', gap: 4 }}>
            {msg.role === 'user' ? (
              <View style={{ backgroundColor: accent, borderRadius: 18, borderBottomRightRadius: 6, paddingHorizontal: 18, paddingVertical: 14, maxWidth: compact ? '88%' : 560 }}>
                <Text style={{ color: '#FFFFFF', fontSize: 15, lineHeight: 23 }}>{msg.text}</Text>
              </View>
            ) : (
              <View style={{ maxWidth: compact ? '97%' : Math.min(windowWidth - 56, 720), gap: 0 }}>
                {/* Bot label row */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 6 }}>
                  <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: `${accent}22`, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 11 }}>✦</Text>
                  </View>
                  <Text style={{ color: accent, fontSize: 12, fontWeight: '700' }}>Bebo</Text>
                  <Text style={{ color: pal.subtleText, fontSize: 10 }}>{msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                </View>

                {/* Bubble */}
                <View style={{ backgroundColor: pal.msgBg, borderWidth: 1, borderColor: pal.msgBorder, borderRadius: 18, borderTopLeftRadius: 6, padding: 18, gap: 6 } as any}>
                  <MarkdownText text={msg.text} bodyColor={pal.bodyText} subtleColor={pal.subtleText} />
                  {msg.cards.map(card => (
                    <CardRenderer
                      key={card.id}
                      card={card}
                      onApply={p => handleApply(p, card.id)}
                      applied={appliedCardIds.has(card.id)}
                      accent={accent}
                      vertical={vertical}
                    />
                  ))}
                </View>

                {/* Quick replies — larger, more obvious */}
                {msg.quickReplies.length > 0 && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
                    <View style={{ flexDirection: 'row', gap: 7, paddingRight: 8 }}>
                      {msg.quickReplies.map((qr, qi) => (
                        <Pressable
                          key={qi}
                          onPress={() => sendMessage(qr)}
                          style={{ backgroundColor: pal.chipBg, borderWidth: 1, borderColor: `${accent}44`, borderRadius: 22, paddingHorizontal: 14, paddingVertical: 8 } as any}
                        >
                          <Text style={{ color: accent, fontSize: 13, fontWeight: '600' }}>{qr}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </ScrollView>
                )}
              </View>
            )}
          </View>
        ))}

        {/* Thinking indicator — animated bouncing dots */}
        {isThinking && (
          <View style={{ alignItems: 'flex-start', gap: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 5 }}>
              <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: `${accent}22`, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 11 }}>✦</Text>
              </View>
              <Text style={{ color: accent, fontSize: 12, fontWeight: '700' }}>Bebo</Text>
            </View>
            <View style={{ backgroundColor: pal.msgBg, borderWidth: 1, borderColor: pal.msgBorder, borderRadius: 18, borderTopLeftRadius: 6, paddingHorizontal: 18, paddingVertical: 14, flexDirection: 'row', gap: 6, alignItems: 'center' } as any}>
              {[0, 1, 2].map(i => (
                <View key={i} style={{
                  width: 9, height: 9, borderRadius: 5, backgroundColor: accent,
                  animationName: 'cs-bebo-dot-bounce',
                  animationDuration: '1.2s',
                  animationTimingFunction: 'ease-in-out',
                  animationIterationCount: 'infinite',
                  animationDelay: `${i * 0.15}s`,
                } as any} />
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* ── Input Bar — prominent, ChatGPT-like ── */}
      <View style={{ backgroundColor: pal.headerBg, borderTopWidth: 1, borderTopColor: pal.headerBorder, padding: compact ? 12 : 16, gap: 10, backdropFilter: 'blur(20px)' } as any}>
        {/* Quick prompt chips — bigger and more inviting */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: 'row', gap: 7 }}>
            {DEMO_QUICK_PROMPTS[vertical].map((qa, i) => (
              <Pressable
                key={i}
                onPress={() => sendMessage(qa)}
                style={{ backgroundColor: pal.chipBg, borderWidth: 1, borderColor: pal.chipBorder, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7 } as any}
              >
                <Text style={{ color: pal.subtleText, fontSize: 12, fontWeight: '500' }}>{qa}</Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>

        {/* Text input + send */}
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder={`What would you like to build?`}
            placeholderTextColor={pal.placeholder}
            onSubmitEditing={() => sendMessage(input)}
            returnKeyType="send"
            editable={!isThinking}
            style={{
              flex: 1,
              backgroundColor: pal.inputBg,
              borderWidth: 1,
              borderColor: pal.inputBorder,
              borderRadius: 14,
              paddingHorizontal: 16,
              paddingVertical: 13,
              color: pal.inputText,
              fontSize: 15,
              outline: 'none',
            } as any}
          />
          <Pressable
            onPress={() => sendMessage(input)}
            disabled={!input.trim() || isThinking}
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              backgroundColor: input.trim() && !isThinking ? accent : isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 20, color: input.trim() && !isThinking ? '#FFFFFF' : pal.subtleText }}>↑</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
