import React, { useEffect, useState } from 'react';
import { Image, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { InteractivePressable as Pressable } from '../../components/InteractivePressable';
import { AiChatPanel } from '../../components/AiChatPanel';
import { useUiTheme } from '../../context/UiThemeContext';
import { useAiDataAssistant } from '../../ai/useAiHooks';
import { GuidedPageProps } from './types';

const capabilities = [
  {
    icon: '🏗️',
    title: 'Workspace Builder',
    body: 'Describe your industry and Bebo generates workspaces, subspaces, fields, roles, and lifecycle stages in seconds.',
  },
  {
    icon: '⚡',
    title: 'Signal Studio Flows',
    body: 'Build event-driven automation flows with natural language — triggers, conditions, and actions wired up automatically.',
  },
  {
    icon: '📋',
    title: 'Data Assistant',
    body: 'Auto-fill forms, validate records, suggest tags, and summarize client history right from the end-user view.',
  },
  {
    icon: '🔍',
    title: 'Query Engine',
    body: 'Ask plain-English questions about your data and get instant charts, counts, and drill-down insights.',
  },
  {
    icon: '🔗',
    title: 'Orbital Integrations',
    body: 'Connect to external APIs, ERPs, and SaaS platforms. Bebo maps fields and configures webhooks for you.',
  },
  {
    icon: '🛡️',
    title: 'Compliance & Audit',
    body: 'Every AI action is logged. Full audit trail, RBAC-aware suggestions, and DSCSA serialization built-in.',
  },
];

const quickActions = [
  { label: 'Build a workspace', prompt: 'Help me create a workspace for my business' },
  { label: 'Auto-fill a form', prompt: 'Auto-fill form fields using available data' },
  { label: 'Validate records', prompt: 'Validate the current record before saving' },
  { label: 'Suggest tags', prompt: 'Suggest relevant tags for this record' },
];

export function BeboPage({ guidedMode, onGuide }: GuidedPageProps) {
  const { styles, mode } = useUiTheme();
  const { width: windowWidth } = useWindowDimensions();
  const compact = windowWidth < 900;
  const ai = useAiDataAssistant();
  const [aiPanelOpen, setAiPanelOpen] = useState(false);

  const isDark = mode === 'night';

  // Auto-open chat panel on mount
  useEffect(() => {
    setAiPanelOpen(true);
    if (!ai.session) {
      ai.startSession('bebo_assistant');
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleQuickAction = (prompt: string) => {
    if (!ai.session) {
      ai.startSession('bebo_assistant');
    }
    setAiPanelOpen(true);
    setTimeout(() => ai.sendMessage(prompt), 400);
  };

  // ── Theme-aware palette ──
  const palette = isDark
    ? {
        bg: 'transparent',
        heroBg: 'linear-gradient(135deg, rgba(111,75,207,0.18) 0%, rgba(59,130,246,0.10) 50%, rgba(34,197,94,0.06) 100%)',
        cardBg: 'rgba(255,255,255,0.04)',
        cardBorder: 'rgba(255,255,255,0.10)',
        cardShadow: '0 8px 24px rgba(0,0,0,0.35)',
        title: '#FFFFFF',
        subtitle: 'rgba(232,236,255,0.84)',
        body: 'rgba(232,236,255,0.72)',
        accent: '#A78BFA',
        accentBg: 'rgba(167,139,250,0.14)',
        accentBorder: 'rgba(167,139,250,0.28)',
        chipBg: 'rgba(167,139,250,0.12)',
        chipBorder: 'rgba(167,139,250,0.24)',
        chipText: '#C4B5FD',
        quickBg: 'rgba(111,75,207,0.14)',
        quickBorder: 'rgba(111,75,207,0.32)',
        quickText: '#C4B5FD',
        quickHover: 'rgba(111,75,207,0.28)',
        divider: 'rgba(255,255,255,0.08)',
      }
    : {
        bg: 'transparent',
        heroBg: 'linear-gradient(135deg, rgba(111,75,207,0.08) 0%, rgba(59,130,246,0.06) 50%, rgba(34,197,94,0.04) 100%)',
        cardBg: 'rgba(255,255,255,0.72)',
        cardBorder: 'rgba(102,74,154,0.16)',
        cardShadow: '0 4px 16px rgba(102,74,154,0.08)',
        title: '#1E1535',
        subtitle: '#4A3A69',
        body: '#5C477F',
        accent: '#6F4BCF',
        accentBg: 'rgba(111,75,207,0.08)',
        accentBorder: 'rgba(111,75,207,0.20)',
        chipBg: 'rgba(111,75,207,0.08)',
        chipBorder: 'rgba(111,75,207,0.18)',
        chipText: '#6F4BCF',
        quickBg: 'rgba(111,75,207,0.06)',
        quickBorder: 'rgba(111,75,207,0.22)',
        quickText: '#6F4BCF',
        quickHover: 'rgba(111,75,207,0.14)',
        divider: 'rgba(102,74,154,0.12)',
      };

  const gridCols = compact ? 1 : windowWidth < 1200 ? 2 : 3;

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 48, paddingRight: aiPanelOpen && !compact ? 400 : 0 }}
      >
        {/* ── Hero Section ── */}
        <View
          style={{
            backgroundImage: palette.heroBg,
            borderRadius: 16,
            margin: compact ? 12 : 24,
            marginBottom: 0,
            padding: compact ? 20 : 32,
            borderWidth: 1,
            borderColor: palette.cardBorder,
            backdropFilter: 'blur(20px)',
            alignItems: 'center',
            gap: 16,
          } as any}
        >
          <Image
            source={isDark ? require('../../../assets/cs_bebolightlogo.png') : require('../../../assets/cs_bebodarklogo.png')}
            style={{ width: 72, height: 72, borderRadius: 16 }}
            accessibilityLabel="Bebo Ai logo"
          />
          <Text
            style={{
              color: palette.title,
              fontSize: compact ? 26 : 32,
              fontWeight: '800',
              letterSpacing: -0.5,
              textAlign: 'center',
            }}
          >
            Bebo Ai
          </Text>
          <Text
            style={{
              color: palette.subtitle,
              fontSize: compact ? 14 : 16,
              lineHeight: 24,
              textAlign: 'center',
              maxWidth: 560,
            }}
          >
            Your intelligent workspace companion. Bebo understands your business, generates operational
            infrastructure, automates workflows, and assists with everyday data tasks — all through
            natural conversation.
          </Text>

          {/* Status chip */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              backgroundColor: palette.chipBg,
              borderWidth: 1,
              borderColor: palette.chipBorder,
              borderRadius: 999,
              paddingHorizontal: 14,
              paddingVertical: 6,
            }}
          >
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#22C55E' }} />
            <Text style={{ color: palette.chipText, fontSize: 12, fontWeight: '700', letterSpacing: 0.5 }}>
              ONLINE
            </Text>
          </View>

          {/* Open Chat CTA */}
          {!aiPanelOpen && (
            <Pressable
              onPress={() => {
                setAiPanelOpen(true);
                if (!ai.session) {
                  ai.startSession('bebo_assistant');
                }
              }}
              style={{
                backgroundColor: '#6F4BCF',
                borderRadius: 10,
                paddingHorizontal: 24,
                paddingVertical: 12,
                marginTop: 4,
              }}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '700' }}>
                Open Bebo Ai Chat
              </Text>
            </Pressable>
          )}
        </View>

        {/* ── Capabilities Grid ── */}
        <View style={{ padding: compact ? 12 : 24, gap: 16 }}>
          <Text style={{ color: palette.title, fontSize: 18, fontWeight: '700', letterSpacing: -0.2 }}>
            Capabilities
          </Text>
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: 14,
            }}
          >
            {capabilities.map((cap) => (
              <View
                key={cap.title}
                style={{
                  flex: 1,
                  minWidth: gridCols === 1 ? '100%' : gridCols === 2 ? 280 : 220,
                  backgroundColor: palette.cardBg,
                  borderWidth: 1,
                  borderColor: palette.cardBorder,
                  borderRadius: 14,
                  padding: 18,
                  gap: 8,
                  backdropFilter: 'blur(14px)',
                  boxShadow: palette.cardShadow,
                } as any}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Text style={{ fontSize: 22 }}>{cap.icon}</Text>
                  <Text style={{ color: palette.title, fontSize: 14, fontWeight: '700' }}>{cap.title}</Text>
                </View>
                <Text style={{ color: palette.body, fontSize: 13, lineHeight: 20 }}>{cap.body}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Quick Actions + How It Works (condensed) ── */}
        <View style={{ paddingHorizontal: compact ? 12 : 24, paddingTop: 16, paddingBottom: 8, flexDirection: compact ? 'column' : 'row', gap: compact ? 16 : 24 }}>
          {/* Quick Actions */}
          <View style={{ flex: 1, gap: 8 }}>
            <Text style={{ color: palette.title, fontSize: 16, fontWeight: '700', letterSpacing: -0.2 }}>
              Quick Actions
            </Text>
            <Text style={{ color: palette.subtitle, fontSize: 12, lineHeight: 18 }}>
              Click any action below to start a conversation with Bebo Ai.
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {quickActions.map((qa) => (
                <Pressable
                  key={qa.label}
                  onPress={() => handleQuickAction(qa.prompt)}
                  style={{
                    backgroundColor: palette.quickBg,
                    borderWidth: 1,
                    borderColor: palette.quickBorder,
                    borderRadius: 8,
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                  }}
                >
                  <Text style={{ color: palette.quickText, fontSize: 12, fontWeight: '600' }}>
                    {qa.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Divider (vertical on wide, horizontal on compact) */}
          {!compact && <View style={{ width: 1, backgroundColor: palette.divider, alignSelf: 'stretch' }} />}
          {compact && <View style={{ height: 1, backgroundColor: palette.divider }} />}

          {/* How It Works */}
          <View style={{ flex: 1, gap: 6 }}>
            <Text style={{ color: palette.title, fontSize: 16, fontWeight: '700', letterSpacing: -0.2 }}>
              How It Works
            </Text>
            {[
              { step: '1', title: 'Describe', detail: 'Tell Bebo about your business, industry, or what you need in plain English.' },
              { step: '2', title: 'Generate', detail: 'Bebo creates workspaces, fields, roles, automation flows, and integration configs instantly.' },
              { step: '3', title: 'Refine', detail: 'Ask follow-up questions to add fields, rename items, or adjust the proposal before applying.' },
              { step: '4', title: 'Apply', detail: 'One click applies everything to your live tenant — fully audited and reversible.' },
            ].map((item) => (
              <View key={item.step} style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
                <View
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 12,
                    backgroundColor: palette.accentBg,
                    borderWidth: 1,
                    borderColor: palette.accentBorder,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ color: palette.accent, fontSize: 11, fontWeight: '800' }}>{item.step}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: palette.title, fontSize: 13, fontWeight: '700' }}>
                    {item.title} <Text style={{ color: palette.body, fontWeight: '400', fontSize: 12 }}>{item.detail}</Text>
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* ── AI Chat Panel (inline above content) ── */}
      {aiPanelOpen && ai.session && (
        <View style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: compact ? '100%' : 400, zIndex: 10 }}>
          <AiChatPanel
            session={ai.session}
            isThinking={ai.isThinking}
            onSend={ai.sendMessage}
            onClose={() => setAiPanelOpen(false)}
            title="Bebo Ai"
            inline
          />
        </View>
      )}
    </View>
  );
}
