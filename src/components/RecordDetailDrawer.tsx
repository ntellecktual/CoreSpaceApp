import React, { useMemo, useState } from 'react';
import { Image, Modal, Platform, Pressable as RNPressable, ScrollView, Text, TextInput, View } from 'react-native';
import { InteractivePressable as Pressable } from './InteractivePressable';
import { useUiTheme } from '../context/UiThemeContext';
import { formatDate } from '../formatDate';
import { formatCurrency } from '../api';
import type { RuntimeRecord, SubSpaceBuilderField, SubSpaceDefinition } from '../types';
import { getOrderedSubSpaces } from '../data/pipelineConfig';

// ─── Status color mapping (mirrors EndUserPage) ─────────────────────
const STATUS_COLOR: Record<string, string> = {
  Received: '#3B82F6', Serialized: '#3B82F6', Record: '#3B82F6',
  Triage: '#F97316', Dispensed: '#F97316',
  Repair: '#A855F7',
  QC: '#EAB308', 'Received by Distributor': '#EAB308',
  Shipped: '#22C55E', 'Shipped to Distributor': '#22C55E', 'Shipped to Pharmacy': '#22C55E',
  Active: '#22C55E', 'Received by Pharmacy': '#22C55E',
  Risk: '#EF4444', High: '#EF4444', Critical: '#EF4444', 'Exception Review': '#EF4444',
};

// ─── Record Detail Drawer ───────────────────────────────────────────
// True right-edge slide-out drawer with glass morphism, status-aware
// hero banner, staggered sections, and a sticky action footer.

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
  tenantAccent?: string;
}) {
  const { mode } = useUiTheme();
  const isDark = mode === 'night';

  const accent = tenantAccent ?? (isDark ? '#111111' : '#111111');
  const border = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
  const textColor = isDark ? '#E0E4ED' : '#1A2340';
  const dimText = isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)';
  const sectionBg = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.015)';
  const surfaceBg = isDark ? '#FAFBFF' : '#FAFBFF';
  const cardBg = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.018)';
  const acRgba = (a: number) => {
    const hex = accent.replace('#', '');
    const r = parseInt(hex.slice(0, 2), 16); const g = parseInt(hex.slice(2, 4), 16); const b = parseInt(hex.slice(4, 6), 16);
    return `rgba(${r},${g},${b},${a})`;
  };
  const statusColor = STATUS_COLOR[record?.status ?? ''] ?? accent;

  /* ── Data helpers ── */
  const dataEntries = useMemo(() => {
    if (!record) return [];
    return Object.entries(record.data).filter(([, v]) => v !== undefined && v !== '');
  }, [record]);

  const personClientName = useMemo(() => {
    if (!record) return null;
    const nameVal = String(
      record.data['Client Name'] ?? record.data['Insured Name'] ?? record.data['Patient Name'] ?? '',
    ).trim();
    if (!nameVal) return null;
    const corpKeywords = /\b(LLC|Corp|Inc|Ltd|Holdings|Industries|Group|Partners|Associates|Ventures|Co\.)\b/i;
    const words = nameVal.trim().split(/\s+/).length;
    if (words >= 2 && words <= 4 && !corpKeywords.test(nameVal)) return nameVal;
    return null;
  }, [record]);

  const validNextStages = useMemo(() => {
    if (!record || !lifecycleStages?.length || !lifecycleTransitions?.length) return [];
    const cur = lifecycleStages.find((s) => s.name === record.status);
    if (!cur) return [];
    return lifecycleTransitions
      .filter((t) => t.fromStageId === cur.id)
      .map((t) => lifecycleStages.find((s) => s.id === t.toStageId))
      .filter((s): s is { id: string; name: string } => !!s && s.name !== record.status);
  }, [record, lifecycleStages, lifecycleTransitions]);

  /* ── Edit / Delete state ── */
  const [editMode, setEditMode] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [editData, setEditData] = useState<Record<string, string>>({});
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [metaExpanded, setMetaExpanded] = useState(false);

  const startEdit = () => {
    if (!record) return;
    setEditTitle(record.title);
    setEditStatus(record.status);
    const stringified: Record<string, string> = {};
    for (const [k, v] of Object.entries(record.data)) stringified[k] = String(v ?? '');
    setEditData(stringified);
    setEditMode(true);
    setConfirmDelete(false);
  };
  const cancelEdit = () => { setEditMode(false); setConfirmDelete(false); };
  const saveEdit = () => {
    if (!record || !onUpdate) return;
    const parsed: Record<string, string | number> = {};
    for (const [k, v] of Object.entries(editData)) {
      const n = Number(v);
      parsed[k] = v !== '' && !isNaN(n) && String(n) === v.trim() ? n : v;
    }
    onUpdate(record.id, { title: editTitle.trim() || record.title, status: editStatus.trim() || record.status, data: parsed });
    setEditMode(false);
  };
  const handleDelete = () => { if (!record || !onDelete) return; onDelete(record.id); setConfirmDelete(false); onClose(); };
  const handleClose = () => { setEditMode(false); setConfirmDelete(false); onClose(); };

  if (!visible || !record) return null;

  /* ── Initials helper ── */
  const initials = record.title.split(/\s+/).slice(0, 2).map((w) => w[0] ?? '').join('').toUpperCase();

  /* ── Section label ── */
  const SectionLabel = ({ icon, label }: { icon: string; label: string }) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
      <Text style={{ fontSize: 12 }}>{icon}</Text>
      <Text style={{ fontSize: 10, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase' as any, color: dimText }}>{label}</Text>
    </View>
  );

  /* ── Input box style ── */
  const inputStyle = {
    fontSize: 13, color: textColor, borderWidth: 1, borderColor: border,
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8,
    backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#FFF',
  };

  return (
    <Modal transparent visible animationType="none" onRequestClose={handleClose}>
      {/* ── Backdrop with blur ── */}
      <RNPressable
        style={{ flex: 1, flexDirection: 'row', justifyContent: 'flex-end' }}
        onPress={handleClose}
      >
        {Platform.OS === 'web' && (
          <div
            style={{
              position: 'absolute', inset: 0,
              backgroundColor: isDark ? 'rgba(0,0,0,0.55)' : 'rgba(0,0,0,0.22)',
              backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
              animation: 'cs-drawer-backdrop 0.2s ease both',
            } as any}
          />
        )}

        {/* ── Drawer Panel ── */}
        <View
          {...(Platform.OS === 'web' ? { onClick: (e: any) => e.stopPropagation() } as any : {})}
          style={{
            width: '100%',
            maxWidth: 460,
            height: '100%',
            backgroundColor: surfaceBg,
            borderLeftWidth: 1,
            borderLeftColor: isDark ? acRgba(0.12) : 'rgba(0,0,0,0.06)',
            overflow: 'hidden',
            ...(Platform.OS === 'web' ? {
              boxShadow: isDark
                ? '-8px 0 40px rgba(0,0,0,0.50), 0 0 0 1px rgba(0,0,0,0.02)'
                : '-8px 0 40px rgba(0,0,0,0.10)',
              animation: 'cs-drawer-slide 0.28s cubic-bezier(0.16,1,0.3,1) both',
            } : { elevation: 24 }),
          } as any}
        >
          {/* ── Status accent stripe (4px) ── */}
          <View style={{ height: 4, backgroundColor: statusColor }} />

          {/* ── Hero Header ── */}
          <View style={{
            paddingHorizontal: 22, paddingTop: 18, paddingBottom: 16,
            borderBottomWidth: 1, borderBottomColor: border,
            backgroundColor: isDark ? 'rgba(255,255,255,0.015)' : 'rgba(0,0,0,0.008)',
          }}>
            {/* Close + edit row */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <Pressable
                onPress={handleClose}
                {...(Platform.OS === 'web' ? { onClick: handleClose } as any : {})}
                style={{
                  width: 34, height: 34, borderRadius: 10,
                  backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                  alignItems: 'center', justifyContent: 'center',
                }}
                accessibilityRole="button"
                accessibilityLabel="Close drawer"
              >
                <Text style={{ fontSize: 15, fontWeight: '600', color: dimText }}>✕</Text>
              </Pressable>
              {!editMode && (
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {onUpdate && (
                    <Pressable onPress={startEdit} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: acRgba(0.10), borderWidth: 1, borderColor: acRgba(0.20) }}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: accent }}>✎ Edit</Text>
                    </Pressable>
                  )}
                  {onDelete && !confirmDelete && (
                    <Pressable onPress={() => setConfirmDelete(true)} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: 'rgba(239,68,68,0.06)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.20)' }}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#EF4444' }}>🗑</Text>
                    </Pressable>
                  )}
                </View>
              )}
              {editMode && (
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Pressable onPress={saveEdit} style={{ paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8, backgroundColor: accent }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#FFF' }}>✓ Save</Text>
                  </Pressable>
                  <Pressable onPress={cancelEdit} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: border }}>
                    <Text style={{ fontSize: 11, fontWeight: '600', color: dimText }}>Cancel</Text>
                  </Pressable>
                </View>
              )}
            </View>

            {/* Avatar + title block */}
            <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
              {record.imageUri ? (
                <Image source={{ uri: record.imageUri }} style={{ width: 52, height: 52, borderRadius: 14, flexShrink: 0 }} resizeMode="cover" />
              ) : (
                <View style={{ width: 52, height: 52, borderRadius: 14, backgroundColor: acRgba(0.14), borderWidth: 1.5, borderColor: acRgba(0.25), alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Text style={{ fontSize: 17, fontWeight: '800', color: accent }}>{initials}</Text>
                </View>
              )}
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={{ fontSize: 17, fontWeight: '800', color: textColor, letterSpacing: -0.3 }} numberOfLines={2}>{record.title}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  {/* status chip with color dot */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, backgroundColor: acRgba(0.08), borderWidth: 1, borderColor: acRgba(0.15) }}>
                    <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: statusColor }} />
                    <Text style={{ fontSize: 11, fontWeight: '700', color: accent }}>{record.status}</Text>
                  </View>
                  {record.amount !== undefined && (
                    <Text style={{ fontSize: 14, fontWeight: '700', color: isDark ? '#86EFAC' : '#16A34A' }}>
                      {(formatAmount ?? formatCurrency)(record.amount)}
                    </Text>
                  )}
                </View>
              </View>
            </View>

            {/* Date + care banner */}
            {(record.date || personClientName) && (
              <View style={{ marginTop: 12, gap: 8 }}>
                {record.date && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={{ fontSize: 12, color: dimText }}>📅</Text>
                    <Text style={{ fontSize: 12, color: dimText }}>{formatDate(record.date)}</Text>
                  </View>
                )}
                {personClientName && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: acRgba(0.06), borderWidth: 1, borderColor: acRgba(0.12) }}>
                    <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: accent, alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontSize: 11, fontWeight: '800', color: '#FFF' }}>
                        {personClientName.split(' ').slice(0, 2).map((s) => s[0]).join('').toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: textColor }}>{personClientName}</Text>
                      <Text style={{ fontSize: 10, color: dimText }}>💙 This work matters to them.</Text>
                    </View>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* ── Scrollable Body ── */}
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: 20, gap: 20 }}
            showsVerticalScrollIndicator={false}
          >
            {/* ── Delete confirmation banner ── */}
            {confirmDelete && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 12, backgroundColor: 'rgba(239,68,68,0.08)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.25)' }}>
                <Text style={{ fontSize: 12, color: '#EF4444', fontWeight: '600', flex: 1 }}>Delete this record permanently?</Text>
                <Pressable onPress={handleDelete} style={{ paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8, backgroundColor: '#EF4444' }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#FFF' }}>Delete</Text>
                </Pressable>
                <Pressable onPress={() => setConfirmDelete(false)} style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: border }}>
                  <Text style={{ fontSize: 11, fontWeight: '600', color: dimText }}>Cancel</Text>
                </Pressable>
              </View>
            )}

            {/* ── Edit Mode ── */}
            {editMode && (
              <View style={{ gap: 12, borderRadius: 14, borderWidth: 1, borderColor: acRgba(0.20), backgroundColor: acRgba(0.04), padding: 16 }}>
                <SectionLabel icon="✏️" label="Edit Record" />
                <View style={{ gap: 4 }}>
                  <Text style={{ fontSize: 11, fontWeight: '600', color: dimText }}>Title</Text>
                  <TextInput style={inputStyle} value={editTitle} onChangeText={setEditTitle} placeholderTextColor={dimText} />
                </View>
                <View style={{ gap: 4 }}>
                  <Text style={{ fontSize: 11, fontWeight: '600', color: dimText }}>Status</Text>
                  {validNextStages.length > 0 ? (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                      <View style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, backgroundColor: acRgba(0.15), borderWidth: 1, borderColor: accent }}>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: accent }}>{editStatus}</Text>
                      </View>
                      {validNextStages.map((st) => (
                        <Pressable key={st.id} onPress={() => setEditStatus(st.name)} style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: editStatus === st.name ? accent : border, backgroundColor: editStatus === st.name ? acRgba(0.10) : 'transparent' }}>
                          <Text style={{ fontSize: 11, fontWeight: '600', color: editStatus === st.name ? accent : dimText }}>→ {st.name}</Text>
                        </Pressable>
                      ))}
                    </View>
                  ) : (
                    <TextInput style={inputStyle} value={editStatus} onChangeText={setEditStatus} placeholderTextColor={dimText} />
                  )}
                </View>
                {Object.entries(editData).map(([key, val]) => (
                  <View key={`edit-${key}`} style={{ gap: 4 }}>
                    <Text style={{ fontSize: 11, fontWeight: '600', color: dimText }}>{key}</Text>
                    <TextInput style={inputStyle} value={val} onChangeText={(nv) => setEditData((p) => ({ ...p, [key]: nv }))} placeholderTextColor={dimText} />
                  </View>
                ))}
              </View>
            )}

            {/* ── Tags ── */}
            {!editMode && record.tags.length > 0 && (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {record.tags.map((tag) => (
                  <View key={tag} style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, backgroundColor: acRgba(0.10), borderWidth: 1, borderColor: acRgba(0.18) }}>
                    <Text style={{ fontSize: 11, fontWeight: '600', color: accent }}>{tag}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* ── Lifecycle Quick Actions ── */}
            {onTransition && validNextStages.length > 0 && !editMode && (
              <View style={{ gap: 8 }}>
                <SectionLabel icon="⚡" label="Transition" />
                <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                  {validNextStages.map((stage) => {
                    const stColor = STATUS_COLOR[stage.name] ?? accent;
                    return (
                      <Pressable
                        key={stage.id}
                        onPress={() => onTransition(record.id, stage.name)}
                        style={{
                          flex: 1, minWidth: 100,
                          flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
                          paddingVertical: 10, borderRadius: 10,
                          borderWidth: 1, borderColor: border,
                          backgroundColor: cardBg,
                        }}
                      >
                        <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: stColor }} />
                        <Text style={{ fontSize: 12, fontWeight: '600', color: textColor }}>→ {stage.name}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}

            {/* ── Data Fields ── */}
            {!editMode && dataEntries.length > 0 && (
              <View style={{ gap: 8 }}>
                <SectionLabel icon="📋" label="Record Data" />
                <View style={{ borderRadius: 14, borderWidth: 1, borderColor: border, overflow: 'hidden' }}>
                  {dataEntries.map(([key, value], i) => {
                    const fieldDef = fields?.find((f) => f.id === key || f.label.toLowerCase() === key.toLowerCase());
                    const label = fieldDef?.label ?? key;
                    const isEven = i % 2 === 0;
                    return (
                      <View
                        key={key}
                        style={{
                          flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                          paddingHorizontal: 14, paddingVertical: 11,
                          backgroundColor: isEven ? 'transparent' : sectionBg,
                          borderBottomWidth: i < dataEntries.length - 1 ? 1 : 0,
                          borderBottomColor: border,
                        }}
                      >
                        <Text style={{ fontSize: 12, color: dimText, flex: 1, fontWeight: '500' }}>{label}</Text>
                        <Text style={{ fontSize: 12, fontWeight: '600', color: textColor, flex: 1.2, textAlign: 'right' as any }} numberOfLines={2}>
                          {fieldDef?.type === 'date' || fieldDef?.type === 'datetime' ? formatDate(String(value)) : String(value)}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {/* ── Builder Fields (empty state) ── */}
            {!editMode && fields && fields.length > 0 && dataEntries.length === 0 && (
              <View style={{ gap: 8 }}>
                <SectionLabel icon="📝" label="Fields" />
                <View style={{ borderRadius: 14, borderWidth: 1, borderColor: border, overflow: 'hidden' }}>
                  {fields.map((field, i) => (
                    <View key={field.id} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 11, backgroundColor: i % 2 === 0 ? 'transparent' : sectionBg, borderBottomWidth: i < fields.length - 1 ? 1 : 0, borderBottomColor: border }}>
                      <Text style={{ fontSize: 12, fontWeight: '500', color: textColor }}>{field.label}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={{ fontSize: 10, color: dimText, fontFamily: 'monospace' }}>{field.type}</Text>
                        {field.required && <Text style={{ fontSize: 9, color: accent, fontWeight: '800' }}>REQ</Text>}
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* ── SubSpace Pipeline ── */}
            {subSpaces && subSpaces.length > 1 && onMoveToSubSpace && (() => {
              const ordered = getOrderedSubSpaces(workspaceName ?? '', subSpaces);
              const currentIdx = ordered.findIndex((ss) => ss.id === record.subSpaceId);
              const nextSs = currentIdx >= 0 && currentIdx < ordered.length - 1 ? ordered[currentIdx + 1] : null;
              return (
                <View style={{ gap: 10 }}>
                  <SectionLabel icon="🔗" label="Pipeline" />
                  {/* Stepper */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 0, paddingHorizontal: 4 }}>
                    {ordered.map((ss, idx) => {
                      const isCurrent = ss.id === record.subSpaceId;
                      const isPast = currentIdx >= 0 && idx < currentIdx;
                      const isFuture = !isCurrent && !isPast;
                      const dotColor = isCurrent ? accent : isPast ? '#22C55E' : border;
                      return (
                        <React.Fragment key={ss.id}>
                          <View style={{ alignItems: 'center', flex: 1, gap: 4 }}>
                            <View style={{
                              width: isCurrent ? 26 : 20, height: isCurrent ? 26 : 20,
                              borderRadius: 13,
                              backgroundColor: isCurrent ? accent : isPast ? '#22C55E' : 'transparent',
                              borderWidth: isFuture ? 2 : 0, borderColor: border,
                              alignItems: 'center', justifyContent: 'center',
                              ...(Platform.OS === 'web' ? { transition: 'all 0.2s ease' } as any : {}),
                            }}>
                              <Text style={{ fontSize: isCurrent ? 11 : 9, fontWeight: '800', color: (isCurrent || isPast) ? '#FFF' : dimText }}>
                                {isPast ? '✓' : idx + 1}
                              </Text>
                            </View>
                            <Text style={{ fontSize: 9, fontWeight: isCurrent ? '700' : '500', color: isCurrent ? accent : dimText, textAlign: 'center' as any }} numberOfLines={1}>
                              {ss.name}
                            </Text>
                          </View>
                          {idx < ordered.length - 1 && (
                            <View style={{ height: 2, flex: 0.6, backgroundColor: isPast ? '#22C55E' : border, borderRadius: 1, marginTop: -14 }} />
                          )}
                        </React.Fragment>
                      );
                    })}
                  </View>
                  {/* Advance button */}
                  {nextSs && (
                    <Pressable
                      onPress={() => onMoveToSubSpace(record.id, nextSs.id)}
                      style={{
                        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
                        paddingVertical: 11, borderRadius: 12, backgroundColor: accent,
                      }}
                    >
                      <Text style={{ fontSize: 13, fontWeight: '700', color: '#FFF' }}>Advance → {nextSs.name}</Text>
                    </Pressable>
                  )}
                  {/* Jump targets */}
                  {ordered.length > 2 && (
                    <View style={{ gap: 6 }}>
                      <Text style={{ fontSize: 10, color: dimText, fontWeight: '600' }}>Jump to</Text>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                        {ordered.filter((ss) => ss.id !== record.subSpaceId).map((ss) => (
                          <Pressable key={ss.id} onPress={() => onMoveToSubSpace(record.id, ss.id)} style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1, borderColor: border, backgroundColor: cardBg }}>
                            <Text style={{ fontSize: 10, fontWeight: '600', color: dimText }}>→ {ss.name}</Text>
                          </Pressable>
                        ))}
                      </View>
                    </View>
                  )}
                </View>
              );
            })()}

            {/* ── Metadata (collapsible) ── */}
            <View style={{ gap: 6 }}>
              <Pressable onPress={() => setMetaExpanded((p) => !p)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ fontSize: 10, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' as any, color: dimText }}>
                  {metaExpanded ? '▾' : '▸'} Metadata
                </Text>
              </Pressable>
              {metaExpanded && (
                <View style={{ gap: 3, paddingLeft: 4, opacity: 0.7 }}>
                  {[
                    ['Record', record.id],
                    ['Client', record.clientId],
                    ['Workspace', record.workspaceId],
                    ['SubSpace', record.subSpaceId],
                  ].map(([label, val]) => (
                    <Text key={label} style={{ fontSize: 9, color: dimText, fontFamily: 'monospace' }}>{label}: {val}</Text>
                  ))}
                </View>
              )}
            </View>

            {/* Bottom spacing */}
            <View style={{ height: 20 }} />
          </ScrollView>
        </View>
      </RNPressable>
    </Modal>
  );
});
