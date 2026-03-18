import React, { useMemo, useState } from 'react';
import { Platform, ScrollView, Text, View } from 'react-native';
import { InteractivePressable as Pressable } from './InteractivePressable';
import { useUiTheme } from '../context/UiThemeContext';
import { Pill } from '../screens/home/components';
import type { AppNotification, AuditLogEntry } from '../types';

// ─── Notification Center ─────────────────────────────────────────────

const SEVERITY_ICONS: Record<string, string> = {
  info: 'ℹ️',
  success: '✅',
  warning: '⚠️',
  error: '❌',
};

const SEVERITY_COLORS: Record<string, { light: string; dark: string }> = {
  info: { light: '#3B82F6', dark: '#60A5FA' },
  success: { light: '#22C55E', dark: '#4ADE80' },
  warning: { light: '#F59E0B', dark: '#FBBF24' },
  error: { light: '#EF4444', dark: '#F87171' },
};

function timeSince(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export function NotificationCenter({
  visible,
  notifications,
  onClose,
  onMarkRead,
  onClearAll,
}: {
  visible: boolean;
  notifications: AppNotification[];
  onClose: () => void;
  onMarkRead: (id: string) => void;
  onClearAll: () => void;
}) {
  const { mode } = useUiTheme();
  const isDark = mode === 'night';

  const panelBg = isDark ? 'rgba(14,10,28,0.92)' : 'rgba(255,255,255,0.95)';
  const border = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)';
  const textColor = isDark ? '#E2D9F3' : '#1A1230';
  const dimText = isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)';
  const accent = isDark ? '#E878F6' : '#8C5BF5';
  const unreadBg = isDark ? 'rgba(140,91,245,0.10)' : 'rgba(140,91,245,0.05)';
  const cardBg = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)';
  const hoverBg = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)';

  const unreadCount = notifications.filter((n) => !n.read).length;

  if (!visible) return null;

  const webGlass = Platform.OS === 'web'
    ? { backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)' } as any
    : {};

  return (
    <>
      {/* Backdrop overlay */}
      <Pressable
        onPress={onClose}
        style={{
          position: 'absolute' as const,
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.35)',
          zIndex: 999,
        }}
      />

      {/* Slide-over panel */}
      <View
        style={{
          position: 'absolute' as const,
          top: 0, right: 0, bottom: 0,
          width: 400,
          maxWidth: '100%',
          backgroundColor: panelBg,
          borderLeftWidth: 1,
          borderLeftColor: border,
          zIndex: 1000,
          ...webGlass,
        }}
      >
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: border }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Text style={{ fontSize: 17, fontWeight: '800', color: textColor, letterSpacing: -0.3 }}>Notifications</Text>
            {unreadCount > 0 && (
              <View style={{ backgroundColor: accent, borderRadius: 10, minWidth: 22, height: 22, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 }}>
                <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '800' }}>{unreadCount}</Text>
              </View>
            )}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {notifications.length > 0 && (
              <Pressable
                onPress={onClearAll}
                style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: border, backgroundColor: cardBg }}
              >
                <Text style={{ fontSize: 12, fontWeight: '600', color: dimText }}>Clear All</Text>
              </Pressable>
            )}
            <Pressable
              onPress={onClose}
              style={{ width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: cardBg }}
            >
              <Text style={{ fontSize: 16, color: dimText }}>✕</Text>
            </Pressable>
          </View>
        </View>

        {/* Notification List */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingVertical: 8, paddingHorizontal: 12, gap: 6 }}
          showsVerticalScrollIndicator={false}
        >
          {notifications.length === 0 ? (
            <View style={{ padding: 48, alignItems: 'center', gap: 8 }}>
              <Text style={{ fontSize: 32 }}>🔔</Text>
              <Text style={{ fontSize: 14, fontWeight: '600', color: textColor }}>All caught up!</Text>
              <Text style={{ fontSize: 12, color: dimText }}>Notifications from your activity will appear here</Text>
            </View>
          ) : (
            notifications.map((notif) => {
              const colors = SEVERITY_COLORS[notif.severity] ?? SEVERITY_COLORS.info;
              const icon = SEVERITY_ICONS[notif.severity] ?? 'ℹ️';
              const sevColor = isDark ? colors.dark : colors.light;
              return (
                <Pressable
                  key={notif.id}
                  onPress={() => onMarkRead(notif.id)}
                  style={{
                    flexDirection: 'row',
                    gap: 12,
                    padding: 14,
                    borderRadius: 12,
                    backgroundColor: notif.read ? 'transparent' : unreadBg,
                    borderWidth: 1,
                    borderColor: notif.read ? 'transparent' : `${sevColor}18`,
                  }}
                >
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      backgroundColor: `${sevColor}18`,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ fontSize: 16 }}>{icon}</Text>
                  </View>
                  <View style={{ flex: 1, gap: 3 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={{ fontSize: 13, fontWeight: notif.read ? '500' : '700', color: textColor, flex: 1 }} numberOfLines={1}>
                        {notif.title}
                      </Text>
                      {!notif.read && (
                        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: accent }} />
                      )}
                    </View>
                    <Text style={{ fontSize: 12, color: dimText, lineHeight: 17 }} numberOfLines={2}>
                      {notif.body}
                    </Text>
                    <Text style={{ fontSize: 10, color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)', marginTop: 1 }}>
                      {timeSince(notif.createdAt)}
                    </Text>
                  </View>
                </Pressable>
              );
            })
          )}
        </ScrollView>
      </View>
    </>
  );
}

// ─── Audit Log Viewer ────────────────────────────────────────────────

const ACTION_ICONS: Record<string, string> = {
  create: '+',
  update: '✎',
  delete: '−',
  publish: '▶',
  transition: '→',
  import: '↓',
  export: '↑',
  'sign-in': '⧫',
  'sign-out': '◇',
};

export function AuditLogViewer({
  entries,
  filterEntity,
  onFilterChange,
}: {
  entries: AuditLogEntry[];
  filterEntity?: string;
  onFilterChange?: (entityType: string | undefined) => void;
}) {
  const { mode } = useUiTheme();
  const isDark = mode === 'night';
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const textColor = isDark ? '#E2D9F3' : '#1A1230';
  const dimText = isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)';
  const border = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
  const rowBg = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.015)';
  const accent = isDark ? '#E878F6' : '#8C5BF5';
  const filterPillBg = isDark ? 'rgba(140,91,245,0.18)' : 'rgba(140,91,245,0.10)';

  const entityTypes = useMemo(() => {
    const set = new Set(entries.map((e) => e.entityType));
    return Array.from(set).sort();
  }, [entries]);

  const filtered = useMemo(() => {
    if (!filterEntity) return entries;
    return entries.filter((e) => e.entityType === filterEntity);
  }, [entries, filterEntity]);

  return (
    <View style={{ flex: 1, gap: 10 }}>
      {/* Filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingHorizontal: 2 }}>
        <Pill
          onPress={() => onFilterChange?.(undefined)}
          selected={!filterEntity}
          label="All"
        />
        {entityTypes.map((et) => (
          <Pill
            key={et}
            onPress={() => onFilterChange?.(et === filterEntity ? undefined : et)}
            selected={filterEntity === et}
            label={et}
          />
        ))}
      </ScrollView>

      {/* Log Entries */}
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        {filtered.length === 0 ? (
          <View style={{ padding: 30, alignItems: 'center' }}>
            <Text style={{ fontSize: 13, color: dimText }}>No audit entries found</Text>
          </View>
        ) : (
          filtered.map((entry) => {
            const icon = ACTION_ICONS[entry.action] ?? '•';
            const isExpanded = expandedId === entry.id;
            return (
              <Pressable
                key={entry.id}
                onPress={() => setExpandedId(isExpanded ? null : entry.id)}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  borderBottomWidth: 1,
                  borderBottomColor: border,
                  backgroundColor: isExpanded ? rowBg : 'transparent',
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: 13,
                      backgroundColor: filterPillBg,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ fontSize: 12, color: accent }}>{icon}</Text>
                  </View>
                  <View style={{ flex: 1, gap: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: textColor }} numberOfLines={1}>
                      {entry.userName} <Text style={{ fontWeight: '400', color: dimText }}>{entry.action}</Text> {entry.entityName}
                    </Text>
                    <Text style={{ fontSize: 11, color: dimText }}>
                      {entry.entityType} · {timeSince(entry.timestamp)}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 11, color: dimText }}>{isExpanded ? '▾' : '▸'}</Text>
                </View>

                {isExpanded && (entry.before || entry.after) && (
                  <View style={{ marginTop: 8, marginLeft: 36, gap: 4 }}>
                    {entry.before && (
                      <View>
                        <Text style={{ fontSize: 10, fontWeight: '700', color: dimText, letterSpacing: 0.6 }}>BEFORE</Text>
                        <Text style={{ fontSize: 11, color: dimText, fontFamily: 'monospace' }}>
                          {JSON.stringify(entry.before, null, 2).slice(0, 300)}
                        </Text>
                      </View>
                    )}
                    {entry.after && (
                      <View>
                        <Text style={{ fontSize: 10, fontWeight: '700', color: dimText, letterSpacing: 0.6 }}>AFTER</Text>
                        <Text style={{ fontSize: 11, color: textColor, fontFamily: 'monospace' }}>
                          {JSON.stringify(entry.after, null, 2).slice(0, 300)}
                        </Text>
                      </View>
                    )}
                  </View>
                )}
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}
