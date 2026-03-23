/**
 * BeboPage — Conference-grade CEO Demo Experience
 * Six industry verticals, inline AI chat, rich card rendering,
 * and one-click workspace/data apply to the live app state.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
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
  generateBeboResponse,
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

const VERTICALS: DemoVertical[] = ['pharma', 'sales', 'healthcare', 'logistics', 'legal', 'insurance'];

const DEMO_QUICK_PROMPTS: Record<DemoVertical, string[]> = {
  pharma:     ['Build workspace architecture', 'Generate DSCSA records', 'Show Signal flows', 'Show Orbital integrations'],
  sales:      ['Build Sales Pipeline workspace', 'Generate deal data', 'Show automation flows', 'Show Orbital'],
  healthcare: ['Build Patient Care workspace',  'Generate patient data', 'Show automation flows', 'Show Orbital'],
  logistics:  ['Build Fulfillment workspace',   'Generate shipment data','Show automation flows', 'Show Orbital'],
  legal:      ['Build Case Management workspace','Generate case data',   'Show deadline automations','Show Orbital'],
  insurance:  ['Build Policy Admin workspace',  'Generate policy data', 'Show claim automations', 'Show Orbital'],
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
    <View style={{ gap: 2 }}>
      {lines.map((line, i) => {
        if (!line.trim()) return <View key={i} style={{ height: 4 }} />;
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
        return <Text key={i} style={{ fontSize: 14, lineHeight: 22 }}>{parts}</Text>;
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
    <View style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: `${accent}44`, borderRadius: 12, padding: 14, marginTop: 10, gap: 10 } as any}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: `${accent}22`, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 15 }}>🗂️</Text>
        </View>
        <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 13, flex: 1 }}>{card.industry} — Workspace Blueprint</Text>
      </View>

      {/* Workspaces */}
      <View style={{ gap: 7 }}>
        {card.workspaces.map((ws, wi) => (
          <View key={wi} style={{ backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: 9, gap: 5 }}>
            <Text style={{ color: '#E8E4FF', fontWeight: '600', fontSize: 12 }}>{ws.icon} {ws.name}</Text>
            <Text style={{ color: 'rgba(232,228,255,0.45)', fontSize: 10 }}>Root Entity: {ws.rootEntity}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 2 }}>
              {ws.subSpaces.map((ss, si) => (
                <View key={si} style={{ backgroundColor: `${accent}18`, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 }}>
                  <Text style={{ color: accent, fontSize: 9, fontWeight: '600' }}>{ss.name} · {ss.fieldCount}f · {ss.displayType}</Text>
                </View>
              ))}
            </View>
          </View>
        ))}
      </View>

      {/* Stats row */}
      <View style={{ flexDirection: 'row', gap: 20 }}>
        {[
          { label: 'Workspaces', v: card.workspaces.length },
          { label: 'SubSpaces', v: totalSS },
          { label: 'Personas', v: card.personas.length },
          { label: 'Stages', v: card.lifecycleStages.length },
          { label: 'Flows', v: card.flows.length },
        ].map((m, i) => (
          <View key={i} style={{ alignItems: 'center' }}>
            <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 15 }}>{m.v}</Text>
            <Text style={{ color: 'rgba(232,228,255,0.45)', fontSize: 9 }}>{m.label}</Text>
          </View>
        ))}
      </View>

      {/* Apply button */}
      <TouchableOpacity
        onPress={() => !applied && onApply(card.applyPayload)}
        activeOpacity={applied ? 1 : 0.8}
        style={{
          backgroundColor: applied ? 'rgba(34,197,94,0.16)' : accent,
          borderWidth: 1, borderColor: applied ? '#22C55E' : 'transparent',
          borderRadius: 8, paddingVertical: 10, alignItems: 'center',
        } as any}
      >
        <Text style={{ color: applied ? '#22C55E' : '#FFFFFF', fontWeight: '700', fontSize: 13 }}>
          {applied ? '✅  Applied to CoreSpace' : 'Apply Full Scenario  →'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

function DataPreviewCard({ card, accent, vertical }: { card: BeboCardDataPreview; accent: string; vertical: DemoVertical }) {
  const [fmt, setFmt] = useState<'csv' | 'json'>('csv');
  const slug = VERTICAL_META[vertical].shortLabel.toLowerCase();
  return (
    <View style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: `${accent}44`, borderRadius: 12, padding: 14, marginTop: 10, gap: 10 } as any}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 12, flex: 1 }}>{card.title}</Text>
        <Text style={{ color: 'rgba(232,228,255,0.4)', fontSize: 10 }}>{card.totalRows} records</Text>
      </View>

      {/* Format toggle */}
      <View style={{ flexDirection: 'row', gap: 5 }}>
        {(['csv', 'json'] as const).map(f => (
          <TouchableOpacity key={f} onPress={() => setFmt(f)}
            style={{ backgroundColor: fmt === f ? accent : 'rgba(255,255,255,0.07)', borderRadius: 5, paddingHorizontal: 9, paddingVertical: 3 }}>
            <Text style={{ color: fmt === f ? '#FFFFFF' : 'rgba(232,228,255,0.5)', fontSize: 10, fontWeight: '700', textTransform: 'uppercase' }}>{f}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* CSV preview table */}
      {fmt === 'csv' && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ borderRadius: 6 }}>
          <View>
            <View style={{ flexDirection: 'row', backgroundColor: `${accent}22`, paddingVertical: 4, borderRadius: 4 }}>
              {card.headers.slice(0, 5).map((h, i) => (
                <Text key={i} style={{ color: accent, fontSize: 9, fontWeight: '700', width: 115, paddingHorizontal: 6 }}>{h}</Text>
              ))}
            </View>
            {card.rows.slice(0, 4).map((row, ri) => (
              <View key={ri} style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)', paddingVertical: 4 }}>
                {row.slice(0, 5).map((cell, ci) => (
                  <Text key={ci} numberOfLines={1} style={{ color: 'rgba(232,228,255,0.60)', fontSize: 9, width: 115, paddingHorizontal: 6 }}>{cell}</Text>
                ))}
              </View>
            ))}
            <Text style={{ color: 'rgba(232,228,255,0.30)', fontSize: 9, paddingTop: 4, paddingHorizontal: 6 }}>
              Showing 4 of {card.totalRows} rows · {card.headers.length} cols
            </Text>
          </View>
        </ScrollView>
      )}

      {/* JSON preview */}
      {fmt === 'json' && (
        <ScrollView style={{ maxHeight: 110, backgroundColor: 'rgba(0,0,0,0.20)', borderRadius: 6, padding: 8 }} showsVerticalScrollIndicator={false}>
          <Text style={{ color: 'rgba(232,228,255,0.60)', fontSize: 9, fontFamily: 'monospace' }}>
            {card.jsonContent.slice(0, 500)}{card.jsonContent.length > 500 ? '\n…' : ''}
          </Text>
        </ScrollView>
      )}

      {/* Actions */}
      <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
        <TouchableOpacity onPress={() => downloadFile(card.csvContent, `corespace-${slug}.csv`, 'text/csv')}
          style={{ backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 6, paddingHorizontal: 9, paddingVertical: 5 }}>
          <Text style={{ color: 'rgba(232,228,255,0.65)', fontSize: 10, fontWeight: '600' }}>⬇ CSV</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => downloadFile(card.jsonContent, `corespace-${slug}.json`, 'application/json')}
          style={{ backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 6, paddingHorizontal: 9, paddingVertical: 5 }}>
          <Text style={{ color: 'rgba(232,228,255,0.65)', fontSize: 10, fontWeight: '600' }}>⬇ JSON</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => downloadFile(card.csvContent, `corespace-${slug}.csv`, 'text/csv')}
          style={{ backgroundColor: `${accent}22`, borderWidth: 1, borderColor: `${accent}55`, borderRadius: 6, paddingHorizontal: 9, paddingVertical: 5 } as any}>
          <Text style={{ color: accent, fontSize: 10, fontWeight: '600' }}>🌐 Import to Cosmograph</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function IntegrationStatusCard({ card, accent }: { card: BeboCardIntegrationStatus; accent: string }) {
  return (
    <View style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: `${accent}44`, borderRadius: 12, padding: 14, marginTop: 10, gap: 10 } as any}>
      <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 12 }}>Orbital Integration Status</Text>
      <View style={{ gap: 7 }}>
        {card.integrations.map((intg, i) => (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: 9, gap: 9 }}>
            <Text style={{ fontSize: 16 }}>{intg.icon}</Text>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ color: '#E8E4FF', fontWeight: '600', fontSize: 11 }}>{intg.name}</Text>
                <View style={{ backgroundColor: intg.status === 'active' ? 'rgba(34,197,94,0.18)' : 'rgba(255,255,255,0.08)', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 }}>
                  <Text style={{ color: intg.status === 'active' ? '#22C55E' : 'rgba(232,228,255,0.40)', fontSize: 8, fontWeight: '700', textTransform: 'uppercase' }}>{intg.status}</Text>
                </View>
              </View>
              <Text style={{ color: 'rgba(232,228,255,0.40)', fontSize: 9 }}>
                {intg.status === 'active' ? `${intg.lastSync} · ${intg.eventsToday} events today` : `${intg.category} · Ready to activate`}
              </Text>
            </View>
            {intg.status === 'active' && <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: '#22C55E' }} />}
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
    <View style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: `${accent}44`, borderRadius: 12, padding: 14, marginTop: 10, gap: 10 } as any}>
      <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 12 }}>⚡ Signal Studio Flows</Text>
      <View style={{ gap: 8 }}>
        {card.flows.map((fl, i) => (
          <View key={i} style={{ backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: 9, gap: 5 }}>
            <Text style={{ color: '#E8E4FF', fontWeight: '600', fontSize: 11 }}>{fl.name}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
              <View style={{ backgroundColor: 'rgba(59,130,246,0.18)', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 }}>
                <Text style={{ color: '#60A5FA', fontSize: 8, fontWeight: '700' }}>TRIGGER</Text>
              </View>
              <Text style={{ color: 'rgba(232,228,255,0.55)', fontSize: 10, flex: 1 }}>{fl.trigger}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 5 }}>
              <View style={{ backgroundColor: `${accent}22`, borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1, marginTop: 1 }}>
                <Text style={{ color: accent, fontSize: 8, fontWeight: '700' }}>ACTION</Text>
              </View>
              <Text style={{ color: 'rgba(232,228,255,0.55)', fontSize: 10, flex: 1, lineHeight: 15 }}>{fl.action}</Text>
            </View>
            <Text style={{ color: 'rgba(232,228,255,0.30)', fontSize: 9 }}>{fl.runsToday} runs today</Text>
          </View>
        ))}
      </View>
      <TouchableOpacity
        onPress={() => !applied && onApply(card.applyPayload)}
        activeOpacity={applied ? 1 : 0.8}
        style={{ backgroundColor: applied ? 'rgba(34,197,94,0.16)' : `${accent}dd`, borderWidth: 1, borderColor: applied ? '#22C55E' : 'transparent', borderRadius: 8, paddingVertical: 9, alignItems: 'center' } as any}
      >
        <Text style={{ color: applied ? '#22C55E' : '#FFFFFF', fontWeight: '700', fontSize: 11 }}>
          {applied ? '✅  Flows Published' : '⚡  Publish All Flows'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

function StatsCard({ card, accent }: { card: BeboCardStats; accent: string }) {
  return (
    <View style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: `${accent}44`, borderRadius: 12, padding: 14, marginTop: 10, gap: 10 } as any}>
      <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 12 }}>📊 Platform Analytics</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>
        {card.stats.map((s, i) => (
          <View key={i} style={{ backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: 10, minWidth: 120, flex: 1, gap: 3 }}>
            <Text style={{ fontSize: 16 }}>{s.icon}</Text>
            <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 18, letterSpacing: -0.5 }}>{s.value}</Text>
            <Text style={{ color: 'rgba(232,228,255,0.50)', fontSize: 10 }}>{s.label}</Text>
            {s.delta && <Text style={{ color: s.positive ? '#22C55E' : '#F87171', fontSize: 9, fontWeight: '600' }}>{s.positive ? '↑' : '↓'} {s.delta}</Text>}
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
    <View style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 16, gap: 12, borderWidth: 1, borderColor: `${accent}30` }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Text style={{ fontSize: 18 }}>🏗️</Text>
        <View style={{ flex: 1 }}>
          <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 14 }}>Business Architecture</Text>
          <Text style={{ color: '#9CA3AF', fontSize: 11 }}>{card.industry}</Text>
        </View>
        <View style={{ backgroundColor: `${accent}20`, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
          <Text style={{ color: accent, fontSize: 10, fontWeight: '700' }}>{card.functions.length} department{card.functions.length !== 1 ? 's' : ''}</Text>
        </View>
      </View>

      {card.functions.map((fn) => (
        <View key={fn.fnId} style={{ borderLeftWidth: 3, borderLeftColor: fn.color, paddingLeft: 12, gap: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ fontSize: 14 }}>{fn.icon}</Text>
            <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 13 }}>{fn.name}</Text>
          </View>
          {!!fn.description && (
            <Text style={{ color: '#9CA3AF', fontSize: 11 }}>{fn.description}</Text>
          )}
          <View style={{ gap: 4 }}>
            {fn.objects.map((obj, oi) => (
              <View key={oi} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: `${fn.color}10`, borderRadius: 8, padding: 8 }}>
                <Text style={{ fontSize: 16 }}>{obj.icon}</Text>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ color: '#E8E4FF', fontWeight: '600', fontSize: 12 }}>{obj.name} <Text style={{ color: '#9CA3AF', fontWeight: '400' }}>({obj.namePlural})</Text></Text>
                  {!!obj.description && <Text style={{ color: '#9CA3AF', fontSize: 10 }}>{obj.description}</Text>}
                  {obj.workspaceNames.length > 0 && (
                    <View style={{ flexDirection: 'row', gap: 4, flexWrap: 'wrap', marginTop: 2 }}>
                      <Text style={{ color: '#6B7280', fontSize: 9, alignSelf: 'center' }}>Links to:</Text>
                      {obj.workspaceNames.map((wn, wi) => (
                        <View key={wi} style={{ backgroundColor: `${fn.color}20`, borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 }}>
                          <Text style={{ color: fn.color, fontSize: 9, fontWeight: '600' }}>{wn}</Text>
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

      <TouchableOpacity
        onPress={() => !applied && onApply(card.applyPayload)}
        style={{ backgroundColor: applied ? '#22C55E' : accent, borderRadius: 8, paddingVertical: 10, alignItems: 'center' }}
      >
        <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 13 }}>
          {applied ? '✅  Architecture Applied' : 'Apply Architecture  →'}
        </Text>
      </TouchableOpacity>
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
        inputText: '#1E1535',
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
      text: `✅ **Applied!** Your **${icon} ${label}** scenario is now live across CoreSpace.\n\n• **${payload.workspaces.length}** workspace${payload.workspaces.length !== 1 ? 's' : ''} created in Admin\n• **${payload.records.length}** records added to End User\n• **${(payload.clients?.length ?? 0)}** collection${(payload.clients?.length ?? 0) !== 1 ? 's' : ''} created\n• **${payload.flows.length}** Signal flows published\n• **${payload.integrations.length}** Orbital integrations activated${(payload.businessFunctions?.length ?? 0) > 0 ? `\n• **${payload.businessFunctions!.length}** department${payload.businessFunctions!.length !== 1 ? 's' : ''} loaded in Architecture` : ''}\n• Shell labels updated to ${label} terminology\n\nNavigate to **Admin** → Workspace Design to inspect the structure, or go to **End User** to interact with live ${label.toLowerCase()} data.`,
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
      <View style={{ backgroundColor: pal.headerBg, borderBottomWidth: 1, borderBottomColor: pal.headerBorder, paddingTop: 10, paddingBottom: 8, paddingHorizontal: compact ? 10 : 18, gap: 8, backdropFilter: 'blur(20px)', zIndex: 10 } as any}>

        {/* Title row */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ width: 30, height: 30, borderRadius: 9, backgroundColor: `${accent}22`, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: `${accent}44` } as any}>
            <Text style={{ fontSize: 16 }}>✦</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: isDark ? '#FFFFFF' : '#1E1535', fontWeight: '800', fontSize: 14, letterSpacing: -0.3 }}>Bebo AI</Text>
            <Text style={{ color: pal.subtleText, fontSize: 10 }}>Ask anything · Build workspaces, flows & data instantly</Text>
          </View>
        </View>

        {/* Scenario tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -3 }}>
          <View style={{ flexDirection: 'row', gap: 5, paddingHorizontal: 3 }}>
            {VERTICALS.map(v => {
              const meta = VERTICAL_META[v];
              const active = v === vertical;
              const hasApplied = appliedVerticals.has(v);
              return (
                <TouchableOpacity
                  key={v}
                  onPress={() => v !== vertical && switchVertical(v)}
                  activeOpacity={0.8}
                  style={{
                    flexDirection: 'row', alignItems: 'center', gap: 4,
                    backgroundColor: active ? meta.color : pal.chipBg,
                    borderWidth: 1, borderColor: active ? meta.color : pal.chipBorder,
                    borderRadius: 7, paddingHorizontal: 9, paddingVertical: 5,
                  } as any}
                >
                  <Text style={{ fontSize: 12 }}>{meta.icon}</Text>
                  <Text style={{ color: active ? '#FFFFFF' : pal.subtleText, fontSize: 10, fontWeight: active ? '700' : '500' }}>{meta.shortLabel}</Text>
                  {hasApplied && <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: '#22C55E' }} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </View>

      {/* ── Messages ── */}
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: compact ? 10 : 18, gap: 10, paddingBottom: 16 }}
        showsVerticalScrollIndicator={false}
      >
        {messages.map(msg => (
          <View key={msg.id} style={{ alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start', gap: 3 }}>
            {msg.role === 'user' ? (
              <View style={{ backgroundColor: accent, borderRadius: 14, borderBottomRightRadius: 4, paddingHorizontal: 14, paddingVertical: 10, maxWidth: compact ? '88%' : 560 }}>
                <Text style={{ color: '#FFFFFF', fontSize: 14, lineHeight: 22 }}>{msg.text}</Text>
              </View>
            ) : (
              <View style={{ maxWidth: compact ? '97%' : Math.min(windowWidth - 56, 700), gap: 0 }}>
                {/* Bot label */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 5 }}>
                  <Text style={{ fontSize: 13 }}>🤖</Text>
                  <Text style={{ color: accent, fontSize: 10, fontWeight: '700' }}>Bebo</Text>
                  <Text style={{ color: pal.subtleText, fontSize: 9 }}>{msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                </View>

                {/* Bubble */}
                <View style={{ backgroundColor: pal.msgBg, borderWidth: 1, borderColor: pal.msgBorder, borderRadius: 14, borderTopLeftRadius: 4, padding: 13, gap: 5 } as any}>
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

                {/* Quick replies */}
                {msg.quickReplies.length > 0 && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }}>
                    <View style={{ flexDirection: 'row', gap: 5, paddingRight: 6 }}>
                      {msg.quickReplies.map((qr, qi) => (
                        <TouchableOpacity
                          key={qi}
                          onPress={() => sendMessage(qr)}
                          activeOpacity={0.75}
                          style={{ backgroundColor: pal.chipBg, borderWidth: 1, borderColor: `${accent}44`, borderRadius: 20, paddingHorizontal: 11, paddingVertical: 5 } as any}
                        >
                          <Text style={{ color: accent, fontSize: 11, fontWeight: '600' }}>{qr}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                )}
              </View>
            )}
          </View>
        ))}

        {/* Thinking indicator */}
        {isThinking && (
          <View style={{ alignItems: 'flex-start', gap: 5 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 4 }}>
              <Text style={{ fontSize: 13 }}>🤖</Text>
              <Text style={{ color: accent, fontSize: 10, fontWeight: '700' }}>Bebo</Text>
            </View>
            <View style={{ backgroundColor: pal.msgBg, borderWidth: 1, borderColor: pal.msgBorder, borderRadius: 14, borderTopLeftRadius: 4, paddingHorizontal: 14, paddingVertical: 11, flexDirection: 'row', gap: 5, alignItems: 'center' } as any}>
              {[0, 1, 2].map(i => (
                <View key={i} style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: accent, opacity: 0.5 + i * 0.15 }} />
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* ── Input Bar ── */}
      <View style={{ backgroundColor: pal.headerBg, borderTopWidth: 1, borderTopColor: pal.headerBorder, padding: compact ? 10 : 14, gap: 8, backdropFilter: 'blur(20px)' } as any}>
        {/* Quick prompt chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: 'row', gap: 5 }}>
            {DEMO_QUICK_PROMPTS[vertical].map((qa, i) => (
              <TouchableOpacity
                key={i}
                onPress={() => sendMessage(qa)}
                activeOpacity={0.75}
                style={{ backgroundColor: pal.chipBg, borderWidth: 1, borderColor: pal.chipBorder, borderRadius: 6, paddingHorizontal: 9, paddingVertical: 4 } as any}
              >
                <Text style={{ color: pal.subtleText, fontSize: 10, fontWeight: '500' }}>{qa}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* Text input + send */}
        <View style={{ flexDirection: 'row', gap: 7, alignItems: 'center' }}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder={`Ask Bebo about ${VERTICAL_META[vertical].label}…`}
            placeholderTextColor={pal.placeholder}
            onSubmitEditing={() => sendMessage(input)}
            returnKeyType="send"
            editable={!isThinking}
            style={{
              flex: 1,
              backgroundColor: pal.inputBg,
              borderWidth: 1,
              borderColor: pal.inputBorder,
              borderRadius: 10,
              paddingHorizontal: 13,
              paddingVertical: 9,
              color: pal.inputText,
              fontSize: 14,
              outline: 'none',
            } as any}
          />
          <TouchableOpacity
            onPress={() => sendMessage(input)}
            disabled={!input.trim() || isThinking}
            activeOpacity={0.8}
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              backgroundColor: input.trim() && !isThinking ? accent : isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 17, color: input.trim() && !isThinking ? '#FFFFFF' : pal.subtleText }}>→</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
