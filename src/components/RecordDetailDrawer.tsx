import React, { useMemo, useState } from 'react';
import { Image, Modal, Platform, Pressable as RNPressable, ScrollView, Text, TextInput, View } from 'react-native';
import { InteractivePressable as Pressable } from './InteractivePressable';
// RNPressable is used for the modal backdrop so the CSS [data-interactive] :active
// transform (scale 0.97) on the full-screen overlay does not shift buttons mid-click
import { useUiTheme } from '../context/UiThemeContext';
import { formatDate } from '../formatDate';
import { formatCurrency } from '../api';
import type { RuntimeRecord, SubSpaceBuilderField, SubSpaceDefinition } from '../types';
import { getOrderedSubSpaces } from '../data/pipelineConfig';

// ─── Record Detail Drawer ───────────────────────────────────────────
// Slide-out right panel displaying full record details, fields, tags,
// timeline, and quick actions — with inline CRUD (edit + delete).

export const RecordDetailDrawer = React.memo(function RecordDetailDrawer({
  visible,
  record,
  fields,
  onClose,
  onTransition,
  onUpdate,
  onDelete,
  lifecycleStages,
  lifecycleTransitions,
  formatAmount,
  subSpaces,
  workspaceName,
  onMoveToSubSpace,
  tenantAccent,
}: {
  visible: boolean;
  record: RuntimeRecord | null;
  fields?: SubSpaceBuilderField[];
  onClose: () => void;
  onTransition?: (recordId: string, newStatus: string) => void;
  onUpdate?: (recordId: string, updates: Partial<Omit<RuntimeRecord, 'id'>>) => void;
  onDelete?: (recordId: string) => void;
  lifecycleStages?: { id: string; name: string }[];
  lifecycleTransitions?: { fromStageId: string; toStageId: string }[];
  formatAmount?: (amount: number) => string;
  subSpaces?: SubSpaceDefinition[];
  workspaceName?: string;
  onMoveToSubSpace?: (recordId: string, targetSubSpaceId: string) => void;
  /** Optional tenant brand accent hex — used for interactive elements when branded. */
  tenantAccent?: string;
}) {
  const { mode } = useUiTheme();
  const isDark = mode === 'night';

  const bg = isDark ? 'rgba(14,10,28,0.97)' : 'rgba(255,255,255,0.98)';
  const border = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)';
  const textColor = isDark ? '#E2D9F3' : '#1A1230';
  const dimText = isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)';
  const sectionBg = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)';
  // Use tenant brand accent when available, otherwise fall back to CoreSpace purple
  const accent = tenantAccent ?? (isDark ? '#E878F6' : '#8C5BF5');
  const tagBg = isDark ? `${accent}2E` : `${accent}1A`;
  const tagText = accent;

  const dataEntries = useMemo(() => {
    if (!record) return [];
    return Object.entries(record.data).filter(([, v]) => v !== undefined && v !== '');
  }, [record]);

  // Detect a person-name client field for the care banner
  const personClientName = useMemo(() => {
    if (!record) return null;
    const nameVal = String(
      record.data['Client Name'] ?? record.data['Insured Name'] ?? record.data['Patient Name'] ?? '',
    ).trim();
    if (!nameVal) return null;
    // Heuristic: looks like a real person if it has 2 space-separated words and no corp keywords
    const corpKeywords = /\b(LLC|Corp|Inc|Ltd|Holdings|Industries|Group|Partners|Associates|Ventures|Co\.)\b/i;
    const wordCount = nameVal.trim().split(/\s+/).length;
    if (wordCount >= 2 && wordCount <= 4 && !corpKeywords.test(nameVal)) return nameVal;
    return null;
  }, [record]);

  /* Section card wrapper for consistent modular sections */
  const SectionCard = useMemo(() => {
    return function SectionCardInner({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
      return (
        <View style={{ gap: 8, borderRadius: 12, borderWidth: 1, borderColor: border, backgroundColor: sectionBg, padding: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ fontSize: 13 }}>{icon}</Text>
            <Text style={{ fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', color: dimText }}>{title}</Text>
          </View>
          {children}
        </View>
      );
    };
  }, [border, sectionBg, dimText]);

  /* Compute valid next lifecycle stages from current status */
  const validNextStages = useMemo(() => {
    if (!record || !lifecycleStages?.length || !lifecycleTransitions?.length) return [];
    const currentStage = lifecycleStages.find((s) => s.name === record.status);
    if (!currentStage) return [];
    return lifecycleTransitions
      .filter((t) => t.fromStageId === currentStage.id)
      .map((t) => lifecycleStages.find((s) => s.id === t.toStageId))
      .filter((s): s is { id: string; name: string } => !!s && s.name !== record.status);
  }, [record, lifecycleStages, lifecycleTransitions]);

  const [editMode, setEditMode] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [editData, setEditData] = useState<Record<string, string>>({});
  const [confirmDelete, setConfirmDelete] = useState(false);

  const startEdit = () => {
    if (!record) return;
    setEditTitle(record.title);
    setEditStatus(record.status);
    const stringified: Record<string, string> = {};
    for (const [k, v] of Object.entries(record.data)) {
      stringified[k] = String(v ?? '');
    }
    setEditData(stringified);
    setEditMode(true);
    setConfirmDelete(false);
  };

  const cancelEdit = () => {
    setEditMode(false);
    setConfirmDelete(false);
  };

  const saveEdit = () => {
    if (!record || !onUpdate) return;
    const parsedData: Record<string, string | number> = {};
    for (const [k, v] of Object.entries(editData)) {
      const num = Number(v);
      parsedData[k] = v !== '' && !isNaN(num) && String(num) === v.trim() ? num : v;
    }
    onUpdate(record.id, {
      title: editTitle.trim() || record.title,
      status: editStatus.trim() || record.status,
      data: parsedData,
    });
    setEditMode(false);
  };

  const handleDelete = () => {
    if (!record || !onDelete) return;
    onDelete(record.id);
    setConfirmDelete(false);
    onClose();
  };

  const handleClose = () => {
    setEditMode(false);
    setConfirmDelete(false);
    onClose();
  };

  if (!visible || !record) return null;

  return (
    <Modal transparent visible animationType="fade" onRequestClose={handleClose}>
      <RNPressable
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'transparent',
        }}
        onPress={handleClose}
      >
        <View
          {...(Platform.OS === 'web' ? { onClick: (e: any) => e.stopPropagation() } as any : {})}
          style={{
            width: '94%',
            maxWidth: 540,
            maxHeight: '90%',
            backgroundColor: isDark ? '#110D1F' : '#FFFFFF',
            borderRadius: 20,
            borderWidth: 1,
            borderColor: isDark ? 'rgba(140,91,245,0.18)' : 'rgba(0,0,0,0.08)',
            overflow: 'hidden',
            ...(Platform.OS === 'web' ? { boxShadow: isDark ? '0 24px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(140,91,245,0.12)' : '0 24px 80px rgba(0,0,0,0.18)' } : { elevation: 24 }),
          } as any}
        >
          {/* Header */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              paddingHorizontal: 20,
              paddingTop: 18,
              paddingBottom: 14,
              borderBottomWidth: 1,
              borderBottomColor: border,
              backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)',
            }}
          >
            {record.imageUri && (
              <Image
                source={{ uri: record.imageUri }}
                style={{ width: 44, height: 44, borderRadius: 10, flexShrink: 0 }}
                resizeMode="cover"
              />
            )}
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: textColor, letterSpacing: -0.3 }} numberOfLines={2}>
                {record.title}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 }}>
                <View style={{ paddingHorizontal: 9, paddingVertical: 3, borderRadius: 6, backgroundColor: tagBg }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: tagText }}>{record.status}</Text>
                </View>
                {record.amount !== undefined && (
                  <Text style={{ fontSize: 13, fontWeight: '600', color: accent }}>
                    {(formatAmount ?? formatCurrency)(record.amount)}
                  </Text>
                )}
                {record.date && (
                  <Text style={{ fontSize: 11, color: dimText }}>{formatDate(record.date)}</Text>
                )}
              </View>
            </View>
            <Pressable
              onPress={handleClose}
              {...(Platform.OS === 'web' ? { onClick: handleClose } as any : {})}
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              accessibilityRole="button"
              accessibilityLabel="Close drawer"
            >
              <Text style={{ fontSize: 14, fontWeight: '600', color: dimText }}>✕</Text>
            </Pressable>
          </View>

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: 18, gap: 14 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Care Banner — shown when the client is a real person */}
            {personClientName && (
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                paddingHorizontal: 14,
                paddingVertical: 10,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: `${accent}33`,
                backgroundColor: isDark ? `${accent}12` : `${accent}0D`,
              }}>
                {/* Initials circle */}
                <View style={{
                  width: 38, height: 38, borderRadius: 19,
                  backgroundColor: accent,
                  alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <Text style={{ fontSize: 14, fontWeight: '800', color: '#FFFFFF' }}>
                    {personClientName.split(' ').slice(0, 2).map((s) => s[0]).join('').toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: textColor }}>{personClientName}</Text>
                  <Text style={{ fontSize: 11, color: dimText, marginTop: 1 }}>💙 Real person. This work matters to them.</Text>
                </View>
              </View>
            )}

            {/* ── CRUD Action Bar ── */}
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
              {onUpdate && !editMode && (
                <Pressable
                  onPress={startEdit}
                  style={{
                    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8,
                    borderWidth: 1, borderColor: accent, backgroundColor: tagBg,
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '700', color: accent }}>✎ Edit Record</Text>
                </Pressable>
              )}
              {editMode && (
                <>
                  <Pressable
                    onPress={saveEdit}
                    style={{
                      paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8,
                      backgroundColor: accent,
                    }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#FFF' }}>✓ Save Changes</Text>
                  </Pressable>
                  <Pressable
                    onPress={cancelEdit}
                    style={{
                      paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8,
                      borderWidth: 1, borderColor: border,
                    }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '600', color: dimText }}>Cancel</Text>
                  </Pressable>
                </>
              )}
              {onDelete && !editMode && (
                <>
                  {!confirmDelete ? (
                    <Pressable
                      onPress={() => setConfirmDelete(true)}
                      style={{
                        paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8,
                        borderWidth: 1, borderColor: 'rgba(239,68,68,0.4)', backgroundColor: 'rgba(239,68,68,0.08)',
                      }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#EF4444' }}>✕ Delete Record</Text>
                    </Pressable>
                  ) : (
                    <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                      <Text style={{ fontSize: 12, color: '#EF4444', fontWeight: '600' }}>Confirm delete?</Text>
                      <Pressable
                        onPress={handleDelete}
                        style={{
                          paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8,
                          backgroundColor: '#EF4444',
                        }}
                      >
                        <Text style={{ fontSize: 12, fontWeight: '700', color: '#FFF' }}>Yes, Delete</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => setConfirmDelete(false)}
                        style={{
                          paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8,
                          borderWidth: 1, borderColor: border,
                        }}
                      >
                        <Text style={{ fontSize: 12, fontWeight: '600', color: dimText }}>Cancel</Text>
                      </Pressable>
                    </View>
                  )}
                </>
              )}
            </View>

            {/* ── Edit Mode: Inline Form ── */}
            {editMode && (
              <View style={{ gap: 10, borderRadius: 12, borderWidth: 1, borderColor: accent, backgroundColor: tagBg, padding: 14 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', color: accent }}>
                  Editing Record
                </Text>
                <View style={{ gap: 4 }}>
                  <Text style={{ fontSize: 12, color: dimText }}>Title</Text>
                  <TextInput
                    style={{ fontSize: 13, color: textColor, borderWidth: 1, borderColor: border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#FFF' }}
                    value={editTitle}
                    onChangeText={setEditTitle}
                    placeholderTextColor={dimText}
                  />
                </View>
                <View style={{ gap: 4 }}>
                  <Text style={{ fontSize: 12, color: dimText }}>Status</Text>
                  {validNextStages.length > 0 ? (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                      <Pressable
                        style={{
                          paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
                          borderWidth: 1, borderColor: accent, backgroundColor: tagBg,
                        }}
                      >
                        <Text style={{ fontSize: 12, fontWeight: '700', color: accent }}>{editStatus}</Text>
                      </Pressable>
                      {validNextStages.map((stage) => (
                        <Pressable
                          key={stage.id}
                          onPress={() => setEditStatus(stage.name)}
                          style={{
                            paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
                            borderWidth: 1,
                            borderColor: editStatus === stage.name ? accent : border,
                            backgroundColor: editStatus === stage.name ? tagBg : 'transparent',
                          }}
                        >
                          <Text style={{ fontSize: 12, fontWeight: '600', color: editStatus === stage.name ? accent : dimText }}>
                            → {stage.name}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  ) : (
                    <TextInput
                      style={{ fontSize: 13, color: textColor, borderWidth: 1, borderColor: border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#FFF' }}
                      value={editStatus}
                      onChangeText={setEditStatus}
                      placeholderTextColor={dimText}
                    />
                  )}
                </View>
                {Object.entries(editData).map(([key, val]) => (
                  <View key={`edit-${key}`} style={{ gap: 4 }}>
                    <Text style={{ fontSize: 12, color: dimText }}>{key}</Text>
                    <TextInput
                      style={{ fontSize: 13, color: textColor, borderWidth: 1, borderColor: border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#FFF' }}
                      value={val}
                      onChangeText={(newVal) => setEditData((prev) => ({ ...prev, [key]: newVal }))}
                      placeholderTextColor={dimText}
                    />
                  </View>
                ))}
              </View>
            )}
            {/* Status Badge */}
            {!editMode && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              {record.tags.length > 0 && record.tags.map((tag) => (
                <View
                  key={tag}
                  style={{
                    paddingHorizontal: 9,
                    paddingVertical: 3,
                    borderRadius: 6,
                    backgroundColor: tagBg,
                  }}
                >
                  <Text style={{ fontSize: 11, color: tagText }}>{tag}</Text>
                </View>
              ))}
            </View>
            )}

            {/* Data Fields */}
            {dataEntries.length > 0 && (
              <SectionCard icon="📋" title="Record Data">
                <View
                  style={{
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: border,
                    backgroundColor: sectionBg,
                    overflow: 'hidden',
                  }}
                >
                  {dataEntries.map(([key, value], i) => {
                    const fieldDef = fields?.find((f) => f.id === key || f.label.toLowerCase() === key.toLowerCase());
                    const label = fieldDef?.label ?? key;
                    return (
                      <View
                        key={key}
                        style={{
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          paddingHorizontal: 14,
                          paddingVertical: 10,
                          borderBottomWidth: i < dataEntries.length - 1 ? 1 : 0,
                          borderBottomColor: border,
                        }}
                      >
                        <Text style={{ fontSize: 13, color: dimText, flex: 1 }}>{label}</Text>
                        <Text style={{ fontSize: 13, fontWeight: '500', color: textColor, flex: 1, textAlign: 'right' }} numberOfLines={2}>
                          {fieldDef?.type === 'date' || fieldDef?.type === 'datetime' ? formatDate(String(value)) : String(value)}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </SectionCard>
            )}

            {/* Builder Fields (empty state) */}
            {fields && fields.length > 0 && dataEntries.length === 0 && (
              <SectionCard icon="📝" title="Fields">
                <View
                  style={{
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: border,
                    backgroundColor: sectionBg,
                    overflow: 'hidden',
                  }}
                >
                  {fields.map((field, i) => (
                    <View
                      key={field.id}
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        paddingHorizontal: 14,
                        paddingVertical: 10,
                        borderBottomWidth: i < fields.length - 1 ? 1 : 0,
                        borderBottomColor: border,
                      }}
                    >
                      <Text style={{ fontSize: 13, color: textColor }}>{field.label}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={{ fontSize: 11, color: dimText, fontFamily: 'monospace' }}>{field.type}</Text>
                        {field.required && (
                          <Text style={{ fontSize: 10, color: accent, fontWeight: '700' }}>REQ</Text>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              </SectionCard>
            )}

            {/* Quick Actions */}
            {onTransition && validNextStages.length > 0 && !editMode && (
              <SectionCard icon="⚡" title="Quick Actions">
                <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                  {validNextStages.map((stage) => (
                    <Pressable
                      key={stage.id}
                      onPress={() => onTransition(record.id, stage.name)}
                      style={{
                        paddingHorizontal: 14,
                        paddingVertical: 7,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: border,
                        backgroundColor: 'transparent',
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: '600',
                          color: accent,
                        }}
                      >
                        → {stage.name}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </SectionCard>
            )}

            {/* ── SubSpace Pipeline ── */}
            {subSpaces && subSpaces.length > 1 && onMoveToSubSpace && (() => {
              const ordered = getOrderedSubSpaces(workspaceName ?? '', subSpaces);
              const currentIdx = ordered.findIndex((ss) => ss.id === record.subSpaceId);
              const nextSs = currentIdx >= 0 && currentIdx < ordered.length - 1 ? ordered[currentIdx + 1] : null;
              return (
                <SectionCard icon="🔗" title="SubSpace Pipeline">
                  {/* Pipeline strip */}
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, alignItems: 'center' }}>
                    {ordered.map((ss, idx) => {
                      const isCurrent = ss.id === record.subSpaceId;
                      const isPast = currentIdx >= 0 && idx < currentIdx;
                      return (
                        <View key={ss.id} style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <View
                            style={{
                              paddingHorizontal: 10,
                              paddingVertical: 5,
                              borderRadius: 8,
                              borderWidth: isCurrent ? 1.5 : 1,
                              borderColor: isCurrent ? accent : (isPast ? 'rgba(140,91,245,0.3)' : border),
                              backgroundColor: isCurrent ? (isDark ? 'rgba(140,91,245,0.18)' : 'rgba(140,91,245,0.10)') : 'transparent',
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 10,
                                fontWeight: isCurrent ? '700' : '500',
                                color: isCurrent ? accent : (isPast ? (isDark ? 'rgba(140,91,245,0.6)' : 'rgba(140,91,245,0.5)') : dimText),
                              }}
                              numberOfLines={1}
                            >
                              {isPast ? '✓ ' : ''}{ss.name}
                            </Text>
                          </View>
                          {idx < ordered.length - 1 && (
                            <Text style={{ fontSize: 10, color: dimText, marginHorizontal: 2 }}>›</Text>
                          )}
                        </View>
                      );
                    })}
                  </ScrollView>
                  {/* Advance button */}
                  {nextSs && (
                    <Pressable
                      onPress={() => onMoveToSubSpace(record.id, nextSs.id)}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                        paddingVertical: 10,
                        borderRadius: 10,
                        backgroundColor: accent,
                      }}
                    >
                      <Text style={{ fontSize: 13, fontWeight: '700', color: '#FFF' }}>
                        Advance → {nextSs.name}
                      </Text>
                    </Pressable>
                  )}
                  {/* Jump to any SubSpace */}
                  {ordered.length > 2 && (
                    <View style={{ gap: 6 }}>
                      <Text style={{ fontSize: 10, color: dimText, fontWeight: '600' }}>Jump to SubSpace</Text>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                        {ordered
                          .filter((ss) => ss.id !== record.subSpaceId)
                          .map((ss) => (
                            <Pressable
                              key={ss.id}
                              onPress={() => onMoveToSubSpace(record.id, ss.id)}
                              style={{
                                paddingHorizontal: 10,
                                paddingVertical: 5,
                                borderRadius: 8,
                                borderWidth: 1,
                                borderColor: border,
                              }}
                            >
                              <Text style={{ fontSize: 11, color: dimText }}>→ {ss.name}</Text>
                            </Pressable>
                          ))}
                      </View>
                    </View>
                  )}
                </SectionCard>
              );
            })()}
            {/* ── Metadata (collapsed at bottom) ── */}
            <View style={{ gap: 6, opacity: 0.6 }}>
              <Text style={{ fontSize: 10, fontWeight: '600', letterSpacing: 0.8, textTransform: 'uppercase', color: dimText }}>Metadata</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
                {[
                  ['Record', record.id],
                  ['Client', record.clientId],
                  ['Workspace', record.workspaceId],
                  ['SubSpace', record.subSpaceId],
                ].map(([label, val]) => (
                  <Text key={label} style={{ fontSize: 9, color: dimText, fontFamily: 'monospace' }}>
                    {label}: {val}
                  </Text>
                ))}
              </View>
            </View>
          </ScrollView>
        </View>
      </RNPressable>
    </Modal>
  );
});
