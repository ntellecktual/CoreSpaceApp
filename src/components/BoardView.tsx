import React, { useCallback, useMemo, useState } from 'react';
import { Platform, ScrollView, Text, View } from 'react-native';
import { InteractivePressable as Pressable } from './InteractivePressable';
import { useUiTheme } from '../context/UiThemeContext';
import { formatDate } from '../formatDate';
import { formatCurrency } from '../api';
import type { RuntimeRecord, SubSpaceDefinition } from '../types';

// ─── Board Column ───────────────────────────────────────────────────

interface BoardColumn {
  key: string;
  label: string;
  records: RuntimeRecord[];
}

function deriveColumns(records: RuntimeRecord[], subSpace?: SubSpaceDefinition): BoardColumn[] {
  // Use lifecycle status as columns when available
  const statusSet = new Map<string, RuntimeRecord[]>();
  for (const rec of records) {
    const status = rec.status || 'Uncategorized';
    const list = statusSet.get(status) ?? [];
    list.push(rec);
    statusSet.set(status, list);
  }

  // If there's only 1 or 0 statuses, add some defaults
  if (statusSet.size <= 1 && records.length > 0) {
    const defaultStatuses = ['To Do', 'In Progress', 'Done'];
    const existing = [...statusSet.entries()];
    statusSet.clear();
    for (const status of defaultStatuses) {
      statusSet.set(status, []);
    }
    if (existing.length > 0) {
      statusSet.set(existing[0][0], existing[0][1]);
    }
  }

  return Array.from(statusSet.entries()).map(([key, recs]) => ({
    key,
    label: key,
    records: recs,
  }));
}

// ─── Board View ─────────────────────────────────────────────────────

export const BoardView = React.memo(function BoardView({
  records,
  subSpace,
  onRecordPress,
  accentColor,
  formatAmount,
  onRecordDrop,
}: {
  records: RuntimeRecord[];
  subSpace?: SubSpaceDefinition;
  onRecordPress?: (record: RuntimeRecord) => void;
  accentColor?: string;
  formatAmount?: (amount: number) => string;
  onRecordDrop?: (recordId: string, newStatus: string) => void;
}) {
  const { mode } = useUiTheme();
  const isDark = mode === 'night';
  const accent = accentColor ?? (isDark ? '#8C5BF5' : '#8C5BF5');

  const columns = useMemo(() => deriveColumns(records, subSpace), [records, subSpace]);

  const cardBg = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)';
  const cardBorder = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
  const colBg = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.015)';
  const colBorder = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)';
  const textColor = isDark ? '#E2D9F3' : '#1A1230';
  const dimText = isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)';
  const countBg = isDark ? 'rgba(140,91,245,0.2)' : 'rgba(140,91,245,0.12)';
  const countText = isDark ? '#E878F6' : '#8C5BF5';

  /* ── DnD state ── */
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);

  /* ── Web DnD handlers ── */
  const isWeb = Platform.OS === 'web';

  const handleDragStart = useCallback((e: any, rec: RuntimeRecord) => {
    if (!isWeb) return;
    e.dataTransfer.setData('text/plain', rec.id);
    e.dataTransfer.effectAllowed = 'move';
    if (e.currentTarget) e.currentTarget.setAttribute('data-dnd-dragging', '');
  }, [isWeb]);

  const handleDragEnd = useCallback((e: any) => {
    if (!isWeb) return;
    if (e.currentTarget) e.currentTarget.removeAttribute('data-dnd-dragging');
  }, [isWeb]);

  const handleDragOver = useCallback((e: any, colKey: string) => {
    if (!isWeb) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverCol(colKey);
  }, [isWeb]);

  const handleDragLeave = useCallback((e: any, colKey: string) => {
    if (!isWeb) return;
    setDragOverCol((prev) => prev === colKey ? null : prev);
  }, [isWeb]);

  const handleDrop = useCallback((e: any, colKey: string) => {
    if (!isWeb) return;
    e.preventDefault();
    setDragOverCol(null);
    const recordId = e.dataTransfer.getData('text/plain');
    if (recordId && onRecordDrop) {
      onRecordDrop(recordId, colKey);
    }
  }, [isWeb, onRecordDrop]);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ padding: 12, gap: 12, minWidth: '100%' }}
      style={{ flex: 1 }}
    >
      {columns.map((col) => {
        const isDropTarget = dragOverCol === col.key;
        const colStyle: any = {
          width: 260,
          minHeight: 200,
          borderRadius: 14,
          borderWidth: isDropTarget ? 2 : 1,
          borderColor: isDropTarget ? `${accent}99` : colBorder,
          backgroundColor: isDropTarget ? `${accent}0D` : colBg,
          overflow: 'hidden',
          ...(isWeb ? { transition: 'border-color 0.15s, background-color 0.15s' } : {}),
        };

        const webColProps = isWeb ? {
          onDragOver: (e: any) => handleDragOver(e, col.key),
          onDragLeave: (e: any) => handleDragLeave(e, col.key),
          onDrop: (e: any) => handleDrop(e, col.key),
        } : {};

        return (
          <View key={col.key} style={colStyle} {...webColProps as any}>
            {/* Column Header */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: 14,
                paddingVertical: 10,
                borderBottomWidth: 1,
                borderBottomColor: colBorder,
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: '700', color: textColor }} numberOfLines={1}>
                {col.label}
              </Text>
              <View
                style={{
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  borderRadius: 20,
                  backgroundColor: countBg,
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: '700', color: countText }}>{col.records.length}</Text>
              </View>
            </View>

            {/* Column Body */}
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ padding: 8, gap: 8, minHeight: 120 }}
              showsVerticalScrollIndicator={false}
            >
              {col.records.length === 0 ? (
                <View style={{ alignItems: 'center', padding: 16 }}>
                  <Text style={{ fontSize: 12, color: dimText }}>{isDropTarget ? 'Drop here' : 'No items'}</Text>
                </View>
              ) : (
                col.records.map((rec) => {
                  const webCardProps = isWeb ? {
                    draggable: true,
                    onDragStart: (e: any) => handleDragStart(e, rec),
                    onDragEnd: handleDragEnd,
                    'data-dnd-card': '',
                  } : {};

                  return (
                    <Pressable
                      key={rec.id}
                      onPress={() => onRecordPress?.(rec)}
                      style={{
                        borderRadius: 10,
                        borderWidth: 1,
                        borderColor: cardBorder,
                        backgroundColor: cardBg,
                        padding: 12,
                        gap: 4,
                      }}
                      {...webCardProps as any}
                    >
                      <Text style={{ fontSize: 13, fontWeight: '600', color: textColor }} numberOfLines={1}>
                        {rec.title}
                      </Text>
                      {rec.date && (
                        <Text style={{ fontSize: 11, color: dimText }}>
                          {formatDate(rec.date)}
                        </Text>
                      )}
                      {rec.tags.length > 0 && (
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                          {rec.tags.slice(0, 3).map((tag) => (
                            <View
                              key={tag}
                              style={{
                                paddingHorizontal: 6,
                                paddingVertical: 2,
                                borderRadius: 6,
                                backgroundColor: countBg,
                              }}
                            >
                              <Text style={{ fontSize: 10, color: countText }}>{tag}</Text>
                            </View>
                          ))}
                          {rec.tags.length > 3 && (
                            <Text style={{ fontSize: 10, color: dimText }}>+{rec.tags.length - 3}</Text>
                          )}
                        </View>
                      )}
                      {rec.amount !== undefined && (
                        <Text style={{ fontSize: 11, fontWeight: '600', color: accent, marginTop: 2 }}>
                          {(formatAmount ?? formatCurrency)(rec.amount)}
                        </Text>
                      )}
                    </Pressable>
                  );
                })
              )}
            </ScrollView>
          </View>
        );
      })}

      {/* Add Column Placeholder */}
      <View
        style={{
          width: 200,
          minHeight: 200,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: colBorder,
          borderStyle: 'dashed',
          backgroundColor: 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
        }}
      >
        <Text style={{ fontSize: 24, color: dimText }}>+</Text>
        <Text style={{ fontSize: 12, color: dimText }}>Add Stage</Text>
      </View>
    </ScrollView>
  );
});
