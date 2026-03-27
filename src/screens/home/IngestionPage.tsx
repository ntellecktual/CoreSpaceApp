/**
 * IngestionPage -- WS-048: Event Listener & Document Ingestion
 *
 * The universal ingestion layer. Accepts OCR, CSV, EDI, and webhook-format
 * data, normalises it to a common field map, and fires events that start the
 * downstream financial workflow chain.
 *
 * Architecture (WS-048):
 *   - Adding a new document source is configuration, not engineering.
 *   - All four formats produce the same NormalizedFieldMap output.
 *   - Confidence scores drive automatic processing vs. Mission Control routing.
 *   - Structured sources (CSV, EDI, webhook) always have confidence = 1.0.
 *
 * Ingestion -> Mission Control routing (WS-048-ADD):
 *   - Records below confidence threshold appear in the Mission Control review
 *     queue in FinancialPage. The reviewer confirms or corrects each field.
 *   - On confirmation, the downstream chain fires as if auto-processed.
 *
 * Layer 2 rules (Signal Studio) subscribe to ingestion events and create
 * payables, receivables, or reconciliation batches from the field map.
 * Layer 1 validators still enforce on any downstream record created,
 * regardless of how it entered the system.
 */

import React, { useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';
import { InteractivePressable as Pressable } from '../../components/InteractivePressable';
import { useAppState } from '../../context/AppStateContext';
import { useUiTheme } from '../../context/UiThemeContext';
import {
  FieldMappingTemplate,
  IngestionFormat,
  IngestionRecord,
  IngestionSourceConfig,
  UserPresence,
} from '../../types';
import { Card } from './components';
import { GuidedPageProps } from './types';

// --- Constants ---
type IngTab = 'pipeline' | 'sources' | 'mappings' | 'presence';
type SourceSubTab = 'ocr' | 'csv' | 'edi' | 'webhook';

const ING_TABS: { id: IngTab; label: string; icon: string; description: string }[] = [
  { id: 'pipeline',  label: 'Pipeline',       icon: '📋', description: 'All ingestion records, confidence scores, and review status' },
  { id: 'sources',   label: 'Sources',         icon: '📡', description: 'Configure ingestion source endpoints by format' },
  { id: 'mappings',  label: 'Field Mappings',  icon: '🗺', description: 'Map extracted keys to Halo Internal field slugs per document type' },
  { id: 'presence',  label: 'Presence',        icon: '👥', description: 'Active users and routing availability (WS-048 v2.1)' },
];

const FORMAT_INFO: Record<IngestionFormat, { label: string; icon: string; description: string; confidenceNote: string }> = {
  ocr: {
    label: 'OCR',
    icon: 'Ã°Å¸â€œâ€ž',
    description: 'PDF invoices, settlement statements, court documents, EOBs Ã¢â‚¬â€ any image or non-machine-readable document.',
    confidenceNote: 'Confidence computed per field. Fields below threshold are flagged for Mission Control review.',
  },
  csv: {
    label: 'CSV',
    icon: 'Ã°Å¸â€œÅ ',
    description: 'Bank statement exports, payment processor exports, bulk invoice uploads, inventory feeds.',
    confidenceNote: 'Structured flat file Ã¢â‚¬â€ all fields confirmed at 1.0. Column headers mapped in source configuration.',
  },
  edi: {
    label: 'EDI',
    icon: 'Ã°Å¸â€â€”',
    description: 'Healthcare claims (837/835), supply chain (810/850/856), financial transactions. Trading partner formats.',
    confidenceNote: 'Standardised structure Ã¢â‚¬â€ all fields confirmed at 1.0. Transaction types defined per trading partner.',
  },
  webhook: {
    label: 'Webhook',
    icon: 'Ã¢Å¡Â¡',
    description: 'Payment processor callbacks (Stripe, ACH), e-signature completions, CRM events, any system posting JSON to a URL.',
    confidenceNote: 'Structured event payload Ã¢â‚¬â€ all fields confirmed at 1.0. JSON path mappings defined per source.',
  },
};

const ACCENT = '#06B6D4';   // Cyan -- distinct from Financial amber (#F59E0B) and platform accent
const SUCCESS = '#10B981';
const DANGER = '#EF4444';
const WARN = '#F59E0B';
const INFO = '#6366F1';

function fmtDate(iso: string) { return iso.slice(0, 16).replace('T', ' '); }
function fmtConf(c: number) { return `${(c * 100).toFixed(0)}%`; }

function ConfidencePill({ confidence, confirmed }: { confidence: number; confirmed: boolean }) {
  const color = !confirmed ? DANGER : confidence >= 0.9 ? SUCCESS : confidence >= 0.75 ? WARN : DANGER;
  return (
    <View style={{
      borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2,
      backgroundColor: `${color}22`, borderWidth: 1, borderColor: `${color}55`,
      flexDirection: 'row', alignItems: 'center', gap: 4,
    }}>
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color }} />
      <Text style={{ color, fontSize: 11, fontWeight: '700' }}>{fmtConf(confidence)}</Text>
    </View>
  );
}

function ReviewStatusBadge({ status }: { status: IngestionRecord['reviewStatus'] }) {
  const map: Record<string, { color: string; label: string }> = {
    auto_processed: { color: SUCCESS, label: 'Auto-Processed' },
    pending_review: { color: DANGER, label: 'Pending Review' },
    reviewed:       { color: INFO, label: 'Reviewed' },
    rejected:       { color: '#8878AE', label: 'Rejected' },
  };
  const { color, label } = map[status] ?? { color: '#8878AE', label: status };
  return (
    <View style={{ borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, backgroundColor: `${color}22`, borderWidth: 1, borderColor: `${color}55`, alignSelf: 'flex-start' }}>
      <Text style={{ color, fontSize: 11, fontWeight: '700' }}>{label}</Text>
    </View>
  );
}

function PresenceDot({ status }: { status: UserPresence['activityStatus'] }) {
  const colors: Record<string, string> = { active: SUCCESS, idle: WARN, away: '#F97316', offline: '#8878AE' };
  return <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors[status] ?? '#8878AE' }} />;
}

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Main Component Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
export function IngestionPage({}: GuidedPageProps) {
  const { data, addIngestionRecord, confirmIngestionRecord, rejectIngestionRecord, updateIngestionSourceConfig } = useAppState();
  const { styles } = useUiTheme();

  const [tab, setTab] = useState<IngTab>('pipeline');
  const [sourceSubTab, setSourceSubTab] = useState<SourceSubTab>('ocr');

  // Ã¢â€â‚¬Ã¢â€â‚¬ Simulate OCR upload form Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  const [ocrDocType, setOcrDocType] = useState('');
  const [ocrSourceRef, setOcrSourceRef] = useState('ap-ocr-upload');
  const [ocrSimConfidence, setOcrSimConfidence] = useState('0.92');

  // Ã¢â€â‚¬Ã¢â€â‚¬ New source config form Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  const [newSourceName, setNewSourceName] = useState('');
  const [newSourceRef, setNewSourceRef] = useState('');
  const [newSourceEvent, setNewSourceEvent] = useState('ingestion.payable_received');

  // Data aliases
  const ingestionRecords: IngestionRecord[] = data.ingestionRecords ?? [];
  const ingestionSources: IngestionSourceConfig[] = data.ingestionSources ?? [];
  const fieldMappingTemplates: FieldMappingTemplate[] = data.fieldMappingTemplates ?? [];
  const userPresence: UserPresence[] = data.userPresence ?? [];

  const pendingReview = ingestionRecords.filter((r) => r.reviewStatus === 'pending_review');
  const autoProcessed = ingestionRecords.filter((r) => r.reviewStatus === 'auto_processed');
  const reviewed = ingestionRecords.filter((r) => r.reviewStatus === 'reviewed');

  // Ã¢â€â‚¬Ã¢â€â‚¬ Simulate an OCR ingestion record Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  function handleSimulateOcr() {
    const conf = parseFloat(ocrSimConfidence);
    if (isNaN(conf) || conf < 0 || conf > 1) return;
    const threshold = 0.85;
    const isBelow = conf < threshold;
    addIngestionRecord({
      sourceFormat: 'ocr',
      sourceRef: ocrSourceRef || 'ap-ocr-upload',
      tenantId: 'tenant-a',
      receivedAt: new Date().toISOString(),
      overallConfidence: conf,
      reviewStatus: isBelow ? 'pending_review' : 'auto_processed',
      eventFired: isBelow ? 'ingestion.review_required' : 'ingestion.payable_received',
      fieldsBelowThreshold: isBelow ? [
        { slug: 'amount_due', value: '$' + (Math.random() * 9000 + 500).toFixed(2), confidence: conf, threshold },
      ] : undefined,
      fieldMap: {
        sourceFormat: 'ocr',
        sourceRef: ocrSourceRef || 'ap-ocr-upload',
        tenantId: 'tenant-a',
        receivedAt: new Date().toISOString(),
        fields: {
          payable_to:      { value: ocrDocType || 'Simulated Vendor Inc', confidence: Math.min(conf + 0.04, 1), confirmed: !isBelow },
          amount_due:      { value: '$' + (Math.random() * 9000 + 500).toFixed(2), confidence: conf, confirmed: !isBelow },
          obligation_date: { value: new Date().toISOString().slice(0, 10), confidence: Math.min(conf + 0.02, 1), confirmed: true },
          due_date:        { value: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10), confidence: Math.min(conf + 0.03, 1), confirmed: !isBelow },
        },
      },
    });
    setOcrDocType('');
  }

  // Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  function renderTabBar() {
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexShrink: 0 }} contentContainerStyle={{ gap: 6, padding: 2, paddingBottom: 4 }}>
        {ING_TABS.map((t) => {
          const active = tab === t.id;
          const badge = t.id === 'pipeline' && pendingReview.length > 0 ? pendingReview.length : 0;
          return (
            <Pressable key={t.id} onPress={() => setTab(t.id)} style={{
              flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8,
              borderRadius: 10, borderWidth: 1,
              borderColor: active ? `${ACCENT}88` : 'rgba(0,0,0,0.08)',
              backgroundColor: active ? `${ACCENT}18` : 'rgba(0,0,0,0.02)',
            }}>
              <Text style={{ fontSize: 14 }}>{t.icon}</Text>
              <Text style={{ color: active ? ACCENT : 'rgba(243,234,255,0.6)', fontSize: 13, fontWeight: active ? '700' : '500' }}>{t.label}</Text>
              {badge > 0 && (
                <View style={{ backgroundColor: DANGER, borderRadius: 999, minWidth: 18, height: 18, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>{badge}</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </ScrollView>
    );
  }

  // Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Pipeline Tab Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  function renderPipeline() {
    return (
      <View style={{ gap: 16 }}>
        {/* Architecture callout */}
        <View style={{ borderRadius: 12, padding: 14, backgroundColor: `${ACCENT}10`, borderWidth: 1, borderColor: `${ACCENT}30` }}>
          <Text style={{ color: ACCENT, fontSize: 13, fontWeight: '700', marginBottom: 4 }}>INGESTION PIPELINE Ã¢â‚¬â€ WS-048</Text>
          <Text style={{ color: 'rgba(243,234,255,0.6)', fontSize: 12, lineHeight: 18 }}>
            Every external data arrival is persisted as an ingestion record before any event fires.
            OCR documents receive per-field confidence scores Ã¢â‚¬â€ fields below threshold route to{' '}
            <Text style={{ color: WARN, fontWeight: '700' }}>Mission Control</Text> for human review.
            Structured sources (CSV, EDI, webhook) always confirm at 100%.
          </Text>
        </View>

        {/* Stats row */}
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {[
            { label: 'Total Records', value: ingestionRecords.length, color: ACCENT },
            { label: 'Auto-Processed', value: autoProcessed.length, color: SUCCESS },
            { label: 'Pending Review', value: pendingReview.length, color: DANGER },
            { label: 'Reviewed', value: reviewed.length, color: INFO },
          ].map((s) => (
            <View key={s.label} style={{ flex: 1, borderRadius: 10, padding: 10, backgroundColor: `${s.color}12`, borderWidth: 1, borderColor: `${s.color}30`, alignItems: 'center' }}>
              <Text style={{ color: s.color, fontSize: 20, fontWeight: '800' }}>{s.value}</Text>
              <Text style={{ color: 'rgba(243,234,255,0.5)', fontSize: 10, marginTop: 2, textAlign: 'center' }}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Simulate incoming OCR record */}
        <Card title="Ã°Å¸Â§Âª Simulate Incoming OCR Document">
          <Text style={{ color: 'rgba(243,234,255,0.5)', fontSize: 12, marginBottom: 10 }}>
            Simulates an OCR document arriving through the ingestion pipeline. Set confidence below 0.85 to trigger Mission Control routing.
          </Text>
          <TextInput
            value={ocrDocType} onChangeText={setOcrDocType}
            placeholder="Vendor / document label (optional)"
            placeholderTextColor="rgba(243,234,255,0.3)"
            style={[styles.inputField, { marginBottom: 8 }]}
          />
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
            <TextInput
              value={ocrSourceRef} onChangeText={setOcrSourceRef}
              placeholder="Source ref"
              placeholderTextColor="rgba(243,234,255,0.3)"
              style={[styles.inputField, { flex: 1 }]}
            />
            <TextInput
              value={ocrSimConfidence} onChangeText={setOcrSimConfidence}
              placeholder="Confidence (0.0Ã¢â‚¬â€œ1.0)"
              keyboardType="decimal-pad"
              placeholderTextColor="rgba(243,234,255,0.3)"
              style={[styles.inputField, { flex: 1 }]}
            />
          </View>
          {/* Threshold explanation */}
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
            {[
              { label: 'Ã¢â€°Â¥ 0.85 Ã¢â€ â€™ Auto-process', color: SUCCESS },
              { label: '< 0.85 Ã¢â€ â€™ Mission Control', color: DANGER },
            ].map((h) => (
              <View key={h.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: h.color }} />
                <Text style={{ color: 'rgba(243,234,255,0.55)', fontSize: 11 }}>{h.label}</Text>
              </View>
            ))}
          </View>
          <Pressable onPress={handleSimulateOcr} style={{ paddingVertical: 10, borderRadius: 10, backgroundColor: `${ACCENT}22`, borderWidth: 1, borderColor: `${ACCENT}55`, alignItems: 'center' }}>
            <Text style={{ color: ACCENT, fontSize: 13, fontWeight: '700' }}>Simulate OCR Ingestion</Text>
          </Pressable>
        </Card>

        {/* Ingestion records list */}
        <Card title={`Ingestion Records (${ingestionRecords.length})`}>
          {ingestionRecords.length === 0 && (
            <Text style={{ color: 'rgba(243,234,255,0.45)', fontSize: 13 }}>No ingestion records yet.</Text>
          )}
          {ingestionRecords.slice(0, 20).map((rec) => (
            <View key={rec.id} style={{ borderRadius: 10, padding: 12, backgroundColor: 'rgba(0,0,0,0.015)', borderWidth: 1, borderColor: 'rgba(0,0,0,0.04)', gap: 8, marginBottom: 8 }}>
              {/* Header */}
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={{ fontSize: 14 }}>{FORMAT_INFO[rec.sourceFormat].icon}</Text>
                    <Text style={{ color: '#F3EAFF', fontSize: 13, fontWeight: '700' }}>{rec.id}</Text>
                    <View style={{ borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, backgroundColor: `${ACCENT}18` }}>
                      <Text style={{ color: ACCENT, fontSize: 10, fontWeight: '700' }}>{FORMAT_INFO[rec.sourceFormat].label}</Text>
                    </View>
                  </View>
                  <Text style={{ color: 'rgba(243,234,255,0.45)', fontSize: 11, marginTop: 2 }}>{rec.sourceRef} Ã‚Â· {fmtDate(rec.receivedAt)}</Text>
                </View>
                <View style={{ gap: 4, alignItems: 'flex-end' }}>
                  <ReviewStatusBadge status={rec.reviewStatus} />
                  <ConfidencePill confidence={rec.overallConfidence} confirmed={rec.reviewStatus !== 'pending_review'} />
                </View>
              </View>

              {/* Fields below threshold */}
              {rec.fieldsBelowThreshold && rec.fieldsBelowThreshold.length > 0 && (
                <View style={{ borderRadius: 8, padding: 8, backgroundColor: `${DANGER}10`, borderWidth: 1, borderColor: `${DANGER}30`, gap: 4 }}>
                  <Text style={{ color: DANGER, fontSize: 11, fontWeight: '700' }}>Ã¢Å¡Â  Fields Below Threshold Ã¢â‚¬â€ Human Review Required</Text>
                  {rec.fieldsBelowThreshold.map((f, i) => (
                    <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ color: 'rgba(243,234,255,0.6)', fontSize: 11 }}>{f.slug}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={{ color: 'rgba(243,234,255,0.8)', fontSize: 11 }}>"{f.value}"</Text>
                        <ConfidencePill confidence={f.confidence} confirmed={false} />
                        <Text style={{ color: 'rgba(243,234,255,0.35)', fontSize: 10 }}>min: {fmtConf(f.threshold)}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {/* Field map preview Ã¢â‚¬â€ show first 4 fields */}
              <View style={{ gap: 3 }}>
                {Object.entries(rec.fieldMap.fields).slice(0, 4).map(([slug, fv]) => (
                  <View key={slug} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text style={{ color: 'rgba(243,234,255,0.5)', fontSize: 11, flex: 1 }}>{slug}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={{ color: 'rgba(243,234,255,0.8)', fontSize: 11 }}>"{fv.value}"</Text>
                      <ConfidencePill confidence={fv.confidence} confirmed={fv.confirmed} />
                    </View>
                  </View>
                ))}
              </View>

              {/* Downstream link */}
              {rec.downstreamRecordType && (
                <Text style={{ color: `${SUCCESS}BB`, fontSize: 11 }}>
                  Ã¢â€ â€™ Created {rec.downstreamRecordType}: {rec.downstreamRecordId}
                </Text>
              )}

              {/* Event fired */}
              {rec.eventFired && (
                <Text style={{ color: `${ACCENT}99`, fontSize: 11 }}>
                  Ã¢Å¡Â¡ {rec.eventFired}
                </Text>
              )}
            </View>
          ))}
        </Card>
      </View>
    );
  }

  // Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Sources Tab Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  function renderSources() {
    const groupedSources: Record<SourceSubTab, IngestionSourceConfig[]> = {
      ocr:     ingestionSources.filter((s) => s.format === 'ocr'),
      csv:     ingestionSources.filter((s) => s.format === 'csv'),
      edi:     ingestionSources.filter((s) => s.format === 'edi'),
      webhook: ingestionSources.filter((s) => s.format === 'webhook'),
    };

    const subTabs: SourceSubTab[] = ['ocr', 'csv', 'edi', 'webhook'];

    return (
      <View style={{ gap: 16 }}>
        {/* Format architecture callout */}
        <View style={{ borderRadius: 12, padding: 14, backgroundColor: `${INFO}10`, borderWidth: 1, borderColor: `${INFO}30` }}>
          <Text style={{ color: '#818CF8', fontSize: 13, fontWeight: '700', marginBottom: 4 }}>INGESTION FORMATS Ã¢â‚¬â€ WS-048 Ã‚Â§2</Text>
          <Text style={{ color: 'rgba(243,234,255,0.6)', fontSize: 12, lineHeight: 18 }}>
            All four formats produce the same NormalizedFieldMap output before firing events.
            A deployment configuration specifies which format each document source uses.
            Adding a new source is configuration only Ã¢â‚¬â€ no code changes required.
          </Text>
        </View>

        {/* Format sub-tab bar */}
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {subTabs.map((id) => {
            const active = sourceSubTab === id;
            const fi = FORMAT_INFO[id];
            return (
              <Pressable key={id} onPress={() => setSourceSubTab(id)} style={{ flex: 1, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: active ? `${ACCENT}66` : 'rgba(0,0,0,0.08)', backgroundColor: active ? `${ACCENT}18` : 'transparent', alignItems: 'center', gap: 3 }}>
                <Text style={{ fontSize: 16 }}>{fi.icon}</Text>
                <Text style={{ color: active ? ACCENT : 'rgba(243,234,255,0.5)', fontSize: 11, fontWeight: '700' }}>{fi.label}</Text>
                <Text style={{ color: active ? `${ACCENT}99` : 'rgba(243,234,255,0.3)', fontSize: 9 }}>{groupedSources[id].length} source{groupedSources[id].length !== 1 ? 's' : ''}</Text>
              </Pressable>
            );
          })}
        </View>

        {/* Format info card */}
        <View style={{ borderRadius: 10, padding: 12, backgroundColor: 'rgba(0,0,0,0.02)', borderWidth: 1, borderColor: 'rgba(0,0,0,0.06)', gap: 6 }}>
          <Text style={{ color: '#F3EAFF', fontSize: 13, fontWeight: '700' }}>{FORMAT_INFO[sourceSubTab].label} Ã¢â‚¬â€ {FORMAT_INFO[sourceSubTab].description}</Text>
          <Text style={{ color: `${WARN}CC`, fontSize: 12 }}>
            Ã¢Å¡â„¢ {FORMAT_INFO[sourceSubTab].confidenceNote}
          </Text>
        </View>

        {/* Configured sources for this format */}
        <Card title={`${FORMAT_INFO[sourceSubTab].label} Sources (${groupedSources[sourceSubTab].length})`}>
          {groupedSources[sourceSubTab].length === 0 && (
            <Text style={{ color: 'rgba(243,234,255,0.4)', fontSize: 13 }}>No {FORMAT_INFO[sourceSubTab].label} sources configured. Add one in Admin {'>'} Financial Operations {'>'} Ingestion.</Text>
          )}
          {groupedSources[sourceSubTab].map((src) => (
            <View key={src.id} style={{ borderRadius: 10, padding: 12, backgroundColor: 'rgba(0,0,0,0.015)', borderWidth: 1, borderColor: 'rgba(0,0,0,0.04)', gap: 6, marginBottom: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#F3EAFF', fontSize: 13, fontWeight: '700' }}>{src.name}</Text>
                  <Text style={{ color: 'rgba(243,234,255,0.45)', fontSize: 11 }}>{src.sourceRef}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: src.isActive ? SUCCESS : '#8878AE' }} />
                  <Text style={{ color: src.isActive ? SUCCESS : '#8878AE', fontSize: 11, fontWeight: '700' }}>{src.isActive ? 'Active' : 'Disabled'}</Text>
                </View>
              </View>

              <View style={{ gap: 3 }}>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  <Text style={{ color: 'rgba(243,234,255,0.4)', fontSize: 11 }}>Event:</Text>
                  <Text style={{ color: `${ACCENT}CC`, fontSize: 11, fontWeight: '600' }}>{src.eventType}</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  <Text style={{ color: 'rgba(243,234,255,0.4)', fontSize: 11 }}>Template:</Text>
                  <Text style={{ color: 'rgba(243,234,255,0.7)', fontSize: 11 }}>
                    {fieldMappingTemplates.find((t) => t.id === src.fieldMappingTemplateId)?.name ?? src.fieldMappingTemplateId}
                  </Text>
                </View>
                {src.confidenceThresholdOverride !== undefined && (
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    <Text style={{ color: 'rgba(243,234,255,0.4)', fontSize: 11 }}>Confidence override:</Text>
                    <Text style={{ color: WARN, fontSize: 11, fontWeight: '600' }}>{fmtConf(src.confidenceThresholdOverride)}</Text>
                  </View>
                )}
                {src.csvDelimiter && (
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    <Text style={{ color: 'rgba(243,234,255,0.4)', fontSize: 11 }}>Delimiter:</Text>
                    <Text style={{ color: 'rgba(243,234,255,0.7)', fontSize: 11 }}>"{src.csvDelimiter}"</Text>
                  </View>
                )}
                {src.ediTradingPartnerId && (
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    <Text style={{ color: 'rgba(243,234,255,0.4)', fontSize: 11 }}>Trading partner:</Text>
                    <Text style={{ color: 'rgba(243,234,255,0.7)', fontSize: 11 }}>{src.ediTradingPartnerId}</Text>
                  </View>
                )}
              </View>

              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Pressable
                  onPress={() => updateIngestionSourceConfig(src.id, { isActive: !src.isActive })}
                  style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: src.isActive ? `${DANGER}18` : `${SUCCESS}18`, borderWidth: 1, borderColor: src.isActive ? `${DANGER}44` : `${SUCCESS}44`, alignItems: 'center' }}>
                  <Text style={{ color: src.isActive ? DANGER : SUCCESS, fontSize: 11, fontWeight: '700' }}>
                    {src.isActive ? 'Disable' : 'Enable'}
                  </Text>
                </Pressable>
              </View>
            </View>
          ))}
        </Card>
      </View>
    );
  }

  // Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Field Mappings Tab Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  function renderMappings() {
    return (
      <View style={{ gap: 16 }}>
        {/* Architecture note */}
        <View style={{ borderRadius: 12, padding: 14, backgroundColor: `${SUCCESS}10`, borderWidth: 1, borderColor: `${SUCCESS}25` }}>
          <Text style={{ color: '#34D399', fontSize: 13, fontWeight: '700', marginBottom: 4 }}>FIELD MAPPING ARCHITECTURE Ã¢â‚¬â€ WS-048 Ã‚Â§2.1</Text>
          <Text style={{ color: 'rgba(243,234,255,0.6)', fontSize: 12, lineHeight: 18 }}>
            Field mapping templates declare how extracted keys (from OCR, CSV headers, EDI data elements, or JSON paths)
            map to Halo Internal field slugs. Each source configuration references one template.{'\n\n'}
            Confidence thresholds are resolved per-field at ingestion time using a 3-level lookup:{'\n'}
            1. Field-level override Ã¢â€ â€™ 2. Source-level override Ã¢â€ â€™ 3. Global tenant default (80%)
          </Text>
        </View>

        {fieldMappingTemplates.map((tpl) => (
          <Card key={tpl.id} title={`${FORMAT_INFO[tpl.sourceFormat].icon} ${tpl.name}`}>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
              <View style={{ borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, backgroundColor: `${ACCENT}18`, borderWidth: 1, borderColor: `${ACCENT}33` }}>
                <Text style={{ color: ACCENT, fontSize: 11 }}>{FORMAT_INFO[tpl.sourceFormat].label}</Text>
              </View>
              {tpl.documentTypeHint && (
                <View style={{ borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, backgroundColor: 'rgba(0,0,0,0.04)', borderWidth: 1, borderColor: 'rgba(0,0,0,0.08)' }}>
                  <Text style={{ color: 'rgba(243,234,255,0.6)', fontSize: 11 }}>{tpl.documentTypeHint}</Text>
                </View>
              )}
              <View style={{ borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, backgroundColor: `${WARN}18`, borderWidth: 1, borderColor: `${WARN}33` }}>
                <Text style={{ color: WARN, fontSize: 11 }}>threshold: {fmtConf(tpl.confidenceThreshold)}</Text>
              </View>
            </View>

            {/* Mapping table header */}
            <View style={{ flexDirection: 'row', paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.06)', marginBottom: 4 }}>
              <Text style={{ flex: 2, color: 'rgba(243,234,255,0.4)', fontSize: 11, fontWeight: '700' }}>EXTRACTED KEY</Text>
              <Text style={{ flex: 1, color: 'rgba(243,234,255,0.4)', fontSize: 11, fontWeight: '700', textAlign: 'center' }}>REQ</Text>
              <Text style={{ flex: 2, color: 'rgba(243,234,255,0.4)', fontSize: 11, fontWeight: '700' }}>FIELD SLUG</Text>
            </View>
            {tpl.mappings.map((m, i) => (
              <View key={i} style={{ flexDirection: 'row', paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.02)' }}>
                <Text style={{ flex: 2, color: 'rgba(243,234,255,0.7)', fontSize: 12 }}>{m.extractedKey}</Text>
                <View style={{ flex: 1, alignItems: 'center' }}>
                  <Text style={{ color: m.required ? DANGER : 'rgba(243,234,255,0.3)', fontSize: 12 }}>{m.required ? 'Ã¢â€”Â' : 'Ã¢â€”â€¹'}</Text>
                </View>
                <Text style={{ flex: 2, color: ACCENT, fontSize: 12, fontFamily: 'monospace' }}>{m.fieldSlug}</Text>
              </View>
            ))}
          </Card>
        ))}
      </View>
    );
  }

  // Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Presence Tab Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  function renderPresence() {
    const statusOrder: UserPresence['activityStatus'][] = ['active', 'idle', 'away', 'offline'];
    const sorted = [...userPresence].sort((a, b) => statusOrder.indexOf(a.activityStatus) - statusOrder.indexOf(b.activityStatus));

    return (
      <View style={{ gap: 16 }}>
        {/* Architecture callout */}
        <View style={{ borderRadius: 12, padding: 14, backgroundColor: `${INFO}10`, borderWidth: 1, borderColor: `${INFO}30` }}>
          <Text style={{ color: '#818CF8', fontSize: 13, fontWeight: '700', marginBottom: 4 }}>PRESENCE REGISTRY Ã¢â‚¬â€ WS-048 v2.1 Ã‚Â§7.6</Text>
          <Text style={{ color: 'rgba(243,234,255,0.6)', fontSize: 12, lineHeight: 18 }}>
            Tracks which users are active, idle, away, or offline. Used by the routing algorithm to find the best
            available approver when a Mission Control review requires a role-based assignment.{'\n\n'}
            Routing rule: active/idle users receive notifications directly. If no users are active in a required role,
            the escalation chain activates. If the chain fails, the platform broadcasts to all users in the role.
          </Text>
        </View>

        {/* Status key */}
        <View style={{ flexDirection: 'row', gap: 14, flexWrap: 'wrap' }}>
          {[
            { status: 'active' as const, label: 'Active Ã¢â‚¬â€ receiving events, WebSocket connected',   color: SUCCESS },
            { status: 'idle'   as const, label: 'Idle Ã¢â‚¬â€ connected, last seen > 2 min',              color: WARN },
            { status: 'away'   as const, label: 'Away Ã¢â‚¬â€ connected, last seen > 30 min',             color: '#F97316' },
            { status: 'offline' as const, label: 'Offline Ã¢â‚¬â€ no WebSocket connection',               color: '#8878AE' },
          ].map((k) => (
            <View key={k.status} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <PresenceDot status={k.status} />
              <Text style={{ color: 'rgba(243,234,255,0.55)', fontSize: 11 }}>{k.label}</Text>
            </View>
          ))}
        </View>

        <Card title={`Active Presence Registry (${userPresence.length})`}>
          {sorted.length === 0 && <Text style={{ color: 'rgba(243,234,255,0.45)', fontSize: 13 }}>No presence records.</Text>}
          {sorted.map((p) => (
            <View key={p.userId} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.04)' }}>
              {/* Avatar */}
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: `${INFO}30`, borderWidth: 2, borderColor: `${INFO}55`, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: '#818CF8', fontSize: 14, fontWeight: '700' }}>{p.userId.slice(5, 7).toUpperCase()}</Text>
              </View>
              {/* Info */}
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#F3EAFF', fontSize: 13, fontWeight: '700' }}>{p.userId}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                  <PresenceDot status={p.activityStatus} />
                  <Text style={{ color: 'rgba(243,234,255,0.55)', fontSize: 11, textTransform: 'capitalize' }}>{p.activityStatus}</Text>
                  {p.currentRoute && (
                    <>
                      <Text style={{ color: 'rgba(243,234,255,0.25)', fontSize: 11 }}>Ã‚Â·</Text>
                      <Text style={{ color: 'rgba(243,234,255,0.4)', fontSize: 11 }}>{p.currentRoute}</Text>
                    </>
                  )}
                </View>
                <Text style={{ color: 'rgba(243,234,255,0.3)', fontSize: 10, marginTop: 2 }}>Last seen {fmtDate(p.lastSeenAt)}</Text>
              </View>
              {/* Connection count */}
              <View style={{ alignItems: 'center' }}>
                <Text style={{ color: p.connectionCount > 0 ? ACCENT : '#8878AE', fontSize: 16, fontWeight: '800' }}>{p.connectionCount}</Text>
                <Text style={{ color: 'rgba(243,234,255,0.3)', fontSize: 9 }}>tab{p.connectionCount !== 1 ? 's' : ''}</Text>
              </View>
            </View>
          ))}
        </Card>

        {/* Routing algorithm explainer */}
        <Card title="Routing Algorithm (WS-048 v2.1 Ã‚Â§7.7)">
          {[
            { step: '1', label: 'Find all users in the required role for this tenant' },
            { step: '2', label: 'Filter to Active or Idle status in the Presence Registry' },
            { step: '3', label: 'Select the user with the oldest last_seen_at (load distribution)' },
            { step: '4', label: 'If no active users Ã¢â€ â€™ activate the escalation chain' },
            { step: '5', label: 'If escalation chain also fails Ã¢â€ â€™ broadcast to ALL users in role' },
          ].map((item) => (
            <View key={item.step} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.03)' }}>
              <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: `${ACCENT}25`, alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>
                <Text style={{ color: ACCENT, fontSize: 11, fontWeight: '700' }}>{item.step}</Text>
              </View>
              <Text style={{ flex: 1, color: 'rgba(243,234,255,0.7)', fontSize: 12, lineHeight: 17 }}>{item.label}</Text>
            </View>
          ))}
        </Card>
      </View>
    );
  }

  // Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Main render Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={{ gap: 4 }}>
        <Text style={{ color: ACCENT, fontSize: 11, fontWeight: '700', letterSpacing: 1.5 }}>WS-048 Ã‚Â· INGESTION LAYER</Text>
        <Text style={{ color: '#F3EAFF', fontSize: 22, fontWeight: '800' }}>Event Listener & Document Ingestion</Text>
        <Text style={{ color: 'rgba(243,234,255,0.55)', fontSize: 13 }}>
          Universal ingestion pipeline Ã¢â‚¬â€ OCR, CSV, EDI, Webhook. All formats produce the same NormalizedFieldMap.
          Confidence scoring routes unconfirmed fields to Mission Control for human review before downstream primitives are created.
        </Text>
      </View>

      {renderTabBar()}

      {tab === 'pipeline'  && renderPipeline()}
      {tab === 'sources'   && renderSources()}
      {tab === 'mappings'  && renderMappings()}
      {tab === 'presence'  && renderPresence()}
    </ScrollView>
  );
}
