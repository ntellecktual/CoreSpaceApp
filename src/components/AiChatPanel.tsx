import React, { useEffect, useRef, useState } from 'react';
import { Image, Platform, ScrollView, Text, TextInput, View } from 'react-native';
import { InteractivePressable as Pressable } from './InteractivePressable';
import { useUiTheme } from '../context/UiThemeContext';

const beboLogoDark = require('../../assets/cs_bebodarklogo.png');
const beboLogoLight = require('../../assets/cs_bebolightlogo.png');
import type { AiConversationMessage, AiSession } from '../types';

// ─── Portal helper (web only) ───────────────────────────────────────
// Renders the panel at document.body level so it escapes parent
// stacking contexts created by backdropFilter / overflow: hidden.
let _createPortal: ((children: React.ReactNode, container: Element) => React.ReactPortal) | null = null;
let _portalRoot: HTMLElement | null = null;

if (Platform.OS === 'web') {
  try {
    _createPortal = require('react-dom').createPortal;
  } catch { /* native – no react-dom */ }
}

function getPortalRoot(): HTMLElement {
  if (!_portalRoot) {
    _portalRoot = document.getElementById('ai-chat-portal');
    if (!_portalRoot) {
      _portalRoot = document.createElement('div');
      _portalRoot.id = 'ai-chat-portal';
      _portalRoot.style.position = 'fixed';
      _portalRoot.style.top = '0';
      _portalRoot.style.left = '0';
      _portalRoot.style.width = '0';
      _portalRoot.style.height = '0';
      _portalRoot.style.overflow = 'visible';
      _portalRoot.style.zIndex = '999999';
      _portalRoot.style.pointerEvents = 'none';
      document.body.appendChild(_portalRoot);
    }
  }
  return _portalRoot;
}

// ─── Markdown-lite renderer ─────────────────────────────────────────
function renderMarkdown(text: string, isDark: boolean) {
  const baseColor = isDark ? '#E0E4ED' : '#1A2340';
  const codeColor = isDark ? '#FFD332' : '#FFD332';
  const dimColor = isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.55)';

  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];

  lines.forEach((line, i) => {
    const key = `md-${i}`;
    const boldParts = line.split(/\*\*(.*?)\*\*/g);
    if (boldParts.length > 1) {
      elements.push(
        <Text key={key} style={{ fontSize: 13, lineHeight: 20, color: baseColor }}>
          {boldParts.map((part, j) =>
            j % 2 === 1
              ? <Text key={`${key}-b${j}`} style={{ fontWeight: '700' }}>{part}</Text>
              : <Text key={`${key}-t${j}`}>{part}</Text>,
          )}
        </Text>,
      );
    } else if (line.startsWith('•') || line.startsWith('-')) {
      elements.push(
        <Text key={key} style={{ fontSize: 13, lineHeight: 20, color: baseColor, paddingLeft: 8 }}>{line}</Text>,
      );
    } else if (line.match(/^`[^`]+`$/)) {
      elements.push(
        <Text key={key} style={{ fontSize: 12, lineHeight: 18, color: codeColor, fontFamily: 'monospace' }}>{line.replace(/`/g, '')}</Text>,
      );
    } else if (line.trim() === '') {
      elements.push(<View key={key} style={{ height: 6 }} />);
    } else {
      const codeParts = line.split(/`([^`]+)`/g);
      if (codeParts.length > 1) {
        elements.push(
          <Text key={key} style={{ fontSize: 13, lineHeight: 20, color: baseColor }}>
            {codeParts.map((part, j) =>
              j % 2 === 1
                ? <Text key={`${key}-c${j}`} style={{ color: codeColor, fontFamily: 'monospace', fontSize: 12 }}>{part}</Text>
                : <Text key={`${key}-p${j}`}>{part}</Text>,
            )}
          </Text>,
        );
      } else {
        const italicParts = line.split(/\*(.*?)\*/g);
        if (italicParts.length > 1) {
          elements.push(
            <Text key={key} style={{ fontSize: 13, lineHeight: 20, color: baseColor }}>
              {italicParts.map((part, j) =>
                j % 2 === 1
                  ? <Text key={`${key}-i${j}`} style={{ fontStyle: 'italic', color: dimColor }}>{part}</Text>
                  : <Text key={`${key}-t${j}`}>{part}</Text>,
              )}
            </Text>,
          );
        } else {
          elements.push(
            <Text key={key} style={{ fontSize: 13, lineHeight: 20, color: baseColor }}>{line}</Text>,
          );
        }
      }
    }
  });

  return elements;
}

// ─── Typing indicator ───────────────────────────────────────────────
function TypingIndicator({ isDark }: { isDark: boolean }) {
  const dotColor = isDark ? '#FFD332' : '#FFD332';
  return (
    <View style={{ flexDirection: 'row', gap: 4, paddingVertical: 6, paddingHorizontal: 4, alignItems: 'center' }}>
      {[0, 1, 2].map((i) => (
        <View
          key={i}
          style={{
            width: 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: dotColor,
            opacity: 0.4 + i * 0.2,
          }}
        />
      ))}
      <Text style={{ fontSize: 11, color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)', marginLeft: 6 }}>
        Bebo is thinking...
      </Text>
    </View>
  );
}

// ─── Quick action chip presets ──────────────────────────────────────
const QUICK_ACTIONS = [
  { label: 'Summarize', prompt: 'Summarize what has been built so far' },
  { label: 'List points', prompt: 'List the key configuration points' },
  { label: 'Suggest next', prompt: 'What should I build next?' },
];

// ─── Floating AI Chat Panel ─────────────────────────────────────────
export const AiChatPanel = React.memo(function AiChatPanel({
  session,
  isThinking,
  onSend,
  onApply,
  onDiscard,
  onClose,
  hasProposal,
  applyLabel = 'Apply All',
  discardLabel = 'Discard',
  title = 'Bebo Ai',
  inline = false,
}: {
  session: AiSession | null;
  isThinking: boolean;
  onSend: (message: string) => void;
  onApply?: () => void;
  onDiscard?: () => void;
  onClose: () => void;
  hasProposal?: boolean;
  applyLabel?: string;
  discardLabel?: string;
  title?: string;
  inline?: boolean;
}) {
  const { mode } = useUiTheme();
  const isDark = mode === 'night';
  const [input, setInput] = useState('');
  const scrollRef = useRef<ScrollView>(null);

  const visibleMessages = (session?.messages ?? []).filter((m) => m.role !== 'system');

  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 150);
  }, [visibleMessages.length, isThinking]);

  const handleSend = (text?: string) => {
    const trimmed = (text ?? input).trim();
    if (!trimmed || isThinking) return;
    onSend(trimmed);
    setInput('');
  };

  const bg = isDark ? 'rgba(14,10,28,0.97)' : 'rgba(255,255,255,0.98)';
  const border = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)';
  const accentBg = isDark ? 'rgba(38,51,116,0.18)' : 'rgba(38,51,116,0.10)';
  const userBg = isDark ? 'rgba(255,211,50,0.16)' : 'rgba(38,51,116,0.12)';
  const accentText = isDark ? '#FFD332' : '#FFD332';
  const chipBg = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)';
  const chipBorder = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.10)';

  const isWeb = Platform.OS === 'web';

  const panel = (
    <View
      style={{
        ...(inline ? {
          flex: 1,
          alignSelf: 'stretch',
        } : isWeb ? {
          position: 'fixed' as any,
          bottom: 76,
          right: 20,
          zIndex: 99999,
          pointerEvents: 'auto' as any,
        } : {
          position: 'absolute',
          bottom: 76,
          right: 20,
        }),
        width: inline ? undefined : 380,
        height: inline ? undefined : 780,
        maxHeight: inline ? undefined : 780,
        backgroundColor: bg,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: border,
        overflow: 'hidden',
        boxShadow: '0 16px 64px rgba(0,0,0,0.45), 0 4px 16px rgba(0,0,0,0.20)',
      } as any}
    >
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 14,
          paddingVertical: 10,
          borderBottomWidth: 1,
          borderBottomColor: border,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Image source={isDark ? beboLogoDark : beboLogoLight} style={{ width: 28, height: 28, borderRadius: 14 }} resizeMode="contain" />
          <Text style={{ fontSize: 13, fontWeight: '700', color: accentText }}>{title}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Pressable
            onPress={onClose}
            style={{
              paddingHorizontal: 8,
              paddingVertical: 4,
              borderRadius: 6,
              backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: '600', color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)' }}>✕</Text>
          </Pressable>
        </View>
      </View>

      {/* Messages */}
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 12, gap: 8, flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {visibleMessages.length === 0 && !isThinking && (
          <View style={{ padding: 16, alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: 24 }}>✦</Text>
            <Text style={{ fontSize: 13, fontWeight: '600', color: accentText, textAlign: 'center' }}>
              {title}
            </Text>
            <Text style={{ fontSize: 12, color: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)', textAlign: 'center', lineHeight: 18 }}>
              Tell Bebo what you want to build or ask anything about your workspace.
            </Text>
          </View>
        )}
        {visibleMessages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} isDark={isDark} userBg={userBg} accentBg={accentBg} />
        ))}
        {isThinking && <TypingIndicator isDark={isDark} />}
      </ScrollView>

      {/* Quick Action Chips */}
      {visibleMessages.length === 0 && !isThinking && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 12, paddingBottom: 8 }}>
          {QUICK_ACTIONS.map((action) => (
            <Pressable
              key={action.label}
              onPress={() => handleSend(action.prompt)}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 20,
                borderWidth: 1,
                borderColor: chipBorder,
                backgroundColor: chipBg,
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: '500', color: accentText }}>{action.label}</Text>
            </Pressable>
          ))}
        </View>
      )}

      {/* Proposal Action Bar */}
      {hasProposal && onApply && onDiscard && (
        <View
          style={{
            flexDirection: 'row',
            gap: 8,
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderTopWidth: 1,
            borderTopColor: border,
          }}
        >
          <Pressable
            onPress={onApply}
            style={{
              flex: 1,
              paddingVertical: 8,
              borderRadius: 10,
              backgroundColor: '#FFD332',
              alignItems: 'center',
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#FBFBFE' }}>{applyLabel}</Text>
          </Pressable>
          <Pressable
            onPress={onDiscard}
            style={{
              flex: 1,
              paddingVertical: 8,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)',
              backgroundColor: 'transparent',
              alignItems: 'center',
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: '600', color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)' }}>
              {discardLabel}
            </Text>
          </Pressable>
        </View>
      )}

      {/* Input */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          paddingHorizontal: 12,
          paddingVertical: 10,
          borderTopWidth: 1,
          borderTopColor: border,
        }}
      >
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Ask Bebo anything..."
          placeholderTextColor={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'}
          onSubmitEditing={() => handleSend()}
          editable={!isThinking}
          multiline={false}
          style={{
            flex: 1,
            fontSize: 13,
            color: isDark ? '#FFFFFF' : '#111111',
            borderWidth: 1,
            borderColor: border,
            borderRadius: 20,
            paddingHorizontal: 14,
            paddingVertical: 8,
            backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
            outlineStyle: 'none',
            outlineWidth: 0,
          } as any}
        />
        <Pressable
          onPress={() => handleSend()}
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: isThinking ? (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)') : '#FFD332',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontSize: 14, fontWeight: '700', color: isThinking ? (isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)') : '#FBFBFE' }}>
            ↑
          </Text>
        </Pressable>
      </View>
    </View>
  );

  // On web, render via portal at document.body level to escape
  // parent stacking contexts (backdropFilter / overflow: hidden).
  // Skip portal when inline – render within parent container.
  if (isWeb && _createPortal && !inline) {
    return _createPortal(panel, getPortalRoot()) as React.ReactElement;
  }
  return panel;
});

// ─── Message Bubble ─────────────────────────────────────────────────
function MessageBubble({
  message,
  isDark,
  userBg,
  accentBg,
}: {
  message: AiConversationMessage;
  isDark: boolean;
  userBg: string;
  accentBg: string;
}) {
  const isUser = message.role === 'user';
  const bubbleBg = isUser ? userBg : accentBg;
  const toolCalls = message.toolCalls ?? [];

  return (
    <View
      style={{
        alignSelf: isUser ? 'flex-end' : 'flex-start',
        maxWidth: '88%',
        backgroundColor: bubbleBg,
        borderRadius: 14,
        paddingHorizontal: 12,
        paddingVertical: 8,
        gap: 4,
      }}
    >
      {!isUser && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 2 }}>
          <Image source={isDark ? beboLogoDark : beboLogoLight} style={{ width: 16, height: 16, borderRadius: 8 }} resizeMode="contain" />
          <Text style={{ fontSize: 10, fontWeight: '700', letterSpacing: 0.8, color: isDark ? '#FFD332' : '#FFD332' }}>
            Bebo
          </Text>
        </View>
      )}
      <View>{renderMarkdown(message.content, isDark)}</View>
      {toolCalls.length > 0 && (
        <View style={{ marginTop: 6, gap: 3 }}>
          {toolCalls.map((tc, i) => (
            <View
              key={`tc-${i}`}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 5,
                paddingVertical: 2,
              }}
            >
              <Text style={{ fontSize: 10, color: tc.status === 'success' ? '#4ADE80' : tc.status === 'error' ? '#F87171' : '#FBBF24' }}>
                {tc.status === 'success' ? '✓' : tc.status === 'error' ? '✗' : '⏳'}
              </Text>
              <Text style={{ fontSize: 11, fontFamily: 'monospace', color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.45)' }}>
                {tc.name}()
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
