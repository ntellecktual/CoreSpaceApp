import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, ScrollView, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { InteractivePressable as Pressable } from '../../components/InteractivePressable';
import { useUiTheme } from '../../context/UiThemeContext';
import { useAppState } from '../../context/AppStateContext';
import { GuidedPageProps } from './types';

/* ──────────────────────────────────────────────────────────────────
   Types
──────────────────────────────────────────────────────────────────── */

type ColType = 'text' | 'number' | 'date' | 'email' | 'phone' | 'boolean' | 'id';
type PiiClass = 'none' | 'email' | 'name' | 'ssn' | 'dob' | 'phone' | 'address' | 'medical' | 'id';

interface DetectedColumn {
  key: string;
  label: string;
  colType: ColType;
  piiClass: PiiClass;
  nullCount: number;
  totalCount: number;
  sample: string[];
  isPrimaryKey: boolean;
  mappedFieldId: string; // workspace builder field id, or '' = skip
}

interface ParsedSchema {
  fileName: string;
  rowCount: number;
  columns: DetectedColumn[];
}

type CosmographPhase = 'upload' | 'classify' | 'map' | 'preview' | 'done';

/* ──────────────────────────────────────────────────────────────────
   CSV parsing helpers
──────────────────────────────────────────────────────────────────── */

function detectColType(values: string[]): ColType {
  const nonEmpty = values.filter(Boolean);
  if (!nonEmpty.length) return 'text';
  const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const phoneRx = /^[+()\d\s\-]{7,15}$/;
  const dateRx = /^\d{1,4}[/\-]\d{1,2}[/\-]\d{1,4}$/;
  const boolRx = /^(true|false|yes|no|1|0)$/i;

  let numCount = 0, dateCount = 0, emailCount = 0, phoneCount = 0, boolCount = 0;
  for (const v of nonEmpty) {
    if (!isNaN(Number(v))) numCount++;
    if (dateRx.test(v)) dateCount++;
    if (emailRx.test(v)) emailCount++;
    if (phoneRx.test(v)) phoneCount++;
    if (boolRx.test(v)) boolCount++;
  }
  const ratio = (n: number) => n / nonEmpty.length;
  if (ratio(emailCount) > 0.6) return 'email';
  if (ratio(phoneCount) > 0.6) return 'phone';
  if (ratio(boolCount) > 0.8) return 'boolean';
  if (ratio(dateCount) > 0.6) return 'date';
  if (ratio(numCount) > 0.7) return 'number';
  return 'text';
}

const PII_PATTERNS: [RegExp, PiiClass][] = [
  [/email/i, 'email'],
  [/first.?name|last.?name|full.?name|fname|lname|given.?name|surname/i, 'name'],
  [/ssn|social.?sec|tax.?id/i, 'ssn'],
  [/\bdob\b|birth.?date|birth.?day|date.?of.?birth/i, 'dob'],
  [/phone|cell|mobile|\btel\b/i, 'phone'],
  [/address|street|zip|postal|city|\bstate\b/i, 'address'],
  [/\bmrn\b|\bnpi\b|diagnosis|icd.?\d|cpt|ndc|patient|medical/i, 'medical'],
  [/\bid\b|uuid|guid|identifier/i, 'id'],
];

function detectPii(label: string): PiiClass {
  for (const [rx, cls] of PII_PATTERNS) {
    if (rx.test(label)) return cls;
  }
  return 'none';
}

function parseCsv(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(Boolean);
  const parseLine = (line: string): string[] => {
    const result: string[] = [];
    let cur = '', inQ = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') { inQ = !inQ; continue; }
      if (c === ',' && !inQ) { result.push(cur.trim()); cur = ''; continue; }
      cur += c;
    }
    result.push(cur.trim());
    return result;
  };
  if (!lines.length) return { headers: [], rows: [] };
  const headers = parseLine(lines[0]);
  const rows = lines.slice(1).map(parseLine);
  return { headers, rows };
}

function buildSchema(fileName: string, text: string): ParsedSchema {
  const { headers, rows } = parseCsv(text);
  const columns: DetectedColumn[] = headers.map((label, colIdx) => {
    const values = rows.map((r) => r[colIdx] ?? '');
    const nonEmpty = values.filter(Boolean);
    const sample = nonEmpty.slice(0, 4);
    const colType = detectColType(values);
    const piiClass = detectPii(label);
    const isPrimaryKey = /\bid\b|uuid|key|serial/i.test(label) && colIdx === 0;
    return {
      key: `col-${colIdx}`,
      label,
      colType: isPrimaryKey ? 'id' : colType,
      piiClass,
      nullCount: values.length - nonEmpty.length,
      totalCount: values.length,
      sample,
      isPrimaryKey,
      mappedFieldId: '',
    };
  });
  return { fileName, rowCount: rows.length, columns };
}

/* ──────────────────────────────────────────────────────────────────
   Visual helpers
──────────────────────────────────────────────────────────────────── */

const PII_COLORS: Record<PiiClass, string> = {
  none: '#22C55E',
  email: '#F59E0B',
  name: '#F59E0B',
  ssn: '#EF4444',
  dob: '#EF4444',
  phone: '#F59E0B',
  address: '#F59E0B',
  medical: '#EF4444',
  id: '#3B82F6',
};

const PII_LABELS: Record<PiiClass, string> = {
  none: '✅ Clean',
  email: '⚠ PII – Email',
  name: '⚠ PII – Name',
  ssn: '🔴 PII – SSN',
  dob: '🔴 PII – DOB',
  phone: '⚠ PII – Phone',
  address: '⚠ PII – Address',
  medical: '🔴 PHI – Medical',
  id: '🔵 Identifier',
};

const COL_TYPE_ICONS: Record<ColType, string> = {
  text: 'Aa', number: '#', date: '📅', email: '@', phone: '☎', boolean: '☑', id: '🔑',
};

const PHASES: { key: CosmographPhase; label: string; icon: string }[] = [
  { key: 'upload', label: 'Upload & Detect', icon: '📂' },
  { key: 'classify', label: 'Classify Schema', icon: '🧠' },
  { key: 'map', label: 'Map to Workspace', icon: '🎯' },
  { key: 'preview', label: 'Preview Import', icon: '👁' },
  { key: 'done', label: 'Complete', icon: '✅' },
];

const PHASE_ORDER: CosmographPhase[] = ['upload', 'classify', 'map', 'preview', 'done'];

/* ──────────────────────────────────────────────────────────────────
   Main Component
──────────────────────────────────────────────────────────────────── */

export function CosmographPage({ registerActions }: GuidedPageProps) {
  const { styles, mode } = useUiTheme();
  const { data, addRecord } = useAppState();
  const { width: windowWidth } = useWindowDimensions();
  const compact = windowWidth < 900;
  const isDark = mode === 'night';
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [phase, setPhase] = useState<CosmographPhase>('upload');
  const [schema, setSchema] = useState<ParsedSchema | null>(null);
  const [columns, setColumns] = useState<DetectedColumn[]>([]);
  const [selectedColKey, setSelectedColKey] = useState<string | null>(null);
  const [targetWorkspaceId, setTargetWorkspaceId] = useState(data.workspaces[0]?.id ?? '');
  const [targetSubSpaceId, setTargetSubSpaceId] = useState('');
  const [importedCount, setImportedCount] = useState(0);
  const [notice, setNotice] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [importTemplates] = useState([
    { label: 'Client Intake (CRM)', icon: '👥', headers: 'first_name,last_name,email,phone,company,status,created_date' },
    { label: 'Work Orders (Field Ops)', icon: '🔧', headers: 'order_id,technician,location,priority,status,scheduled_date,completed_date,notes' },
    { label: 'Inventory Items', icon: '📦', headers: 'item_id,sku,product_name,quantity,unit_cost,reorder_threshold,warehouse,last_updated' },
    { label: 'Patient Records (HIPAA)', icon: '🏥', headers: 'mrn,patient_name,dob,diagnosis,npi,facility,admission_date,discharge_date' },
    { label: 'Loan Applications', icon: '💰', headers: 'application_id,applicant_name,ssn,loan_amount,purpose,credit_score,status,submitted_date' },
  ]);

  const targetWorkspace = useMemo(
    () => data.workspaces.find((w) => w.id === targetWorkspaceId),
    [data.workspaces, targetWorkspaceId],
  );
  const targetSubSpace = useMemo(
    () => targetWorkspace?.subSpaces.find((ss) => ss.id === targetSubSpaceId),
    [targetWorkspace, targetSubSpaceId],
  );
  const workspaceFields = useMemo(
    () => [
      ...(targetWorkspace?.builderFields ?? []),
      ...(targetSubSpace?.builderFields ?? []),
    ],
    [targetWorkspace, targetSubSpace],
  );

  const selectedCol = columns.find((c) => c.key === selectedColKey) ?? null;

  const phaseDone = (p: CosmographPhase) => PHASE_ORDER.indexOf(phase) > PHASE_ORDER.indexOf(p);
  const phaseActive = (p: CosmographPhase) => phase === p;

  useEffect(() => {
    registerActions?.({
      saveDraftLabel: 'Save Mapping Draft',
      publishLabel: phase === 'preview' ? 'Run Import' : 'Advance',
      saveDraft: () => { setNotice('Mapping draft saved.'); return 'Mapping draft saved.'; },
      publish: () => { if (phase === 'preview') { runImport(); return 'Import started.'; } advancePhase(); return 'Advanced to next pass.'; },
    });
  }, [phase, columns, targetWorkspaceId, targetSubSpaceId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    return () => { registerActions?.(null); };
  }, [registerActions]);

  const processFile = useCallback((text: string, fileName: string) => {
    setScanning(true);
    setTimeout(() => {
      const s = buildSchema(fileName, text);
      setSchema(s);
      setColumns(s.columns);
      setSelectedColKey(s.columns[0]?.key ?? null);
      setScanning(false);
      setPhase('classify');
    }, 900);
  }, []);

  const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      if (text) processFile(text, file.name);
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      if (text) processFile(text, file.name);
    };
    reader.readAsText(file);
  };

  const loadTemplate = (templateHeaders: string) => {
    const csvText = templateHeaders + '\n' + 'Sample Value,Sample Value,sample@example.com,555-0100,Acme Corp,Active,2026-01-15';
    processFile(csvText, 'demo-template.csv');
  };

  const togglePiiOverride = (colKey: string, piiClass: PiiClass) => {
    setColumns((prev) => prev.map((c) => c.key === colKey ? { ...c, piiClass } : c));
  };

  const setColumnMapping = (colKey: string, fieldId: string) => {
    setColumns((prev) => prev.map((c) => c.key === colKey ? { ...c, mappedFieldId: fieldId } : c));
  };

  const advancePhase = () => {
    const idx = PHASE_ORDER.indexOf(phase);
    if (idx < PHASE_ORDER.length - 1) setPhase(PHASE_ORDER[idx + 1]);
  };

  const runImport = () => {
    if (!targetWorkspace) { setNotice('Select a target workspace first.'); return; }
    const mappedCols = columns.filter((c) => c.mappedFieldId);
    const count = Math.min(schema?.rowCount ?? 0, 50); // preview: up to 50
    let created = 0;
    for (let i = 0; i < count; i++) {
      const record = {
        id: `cosmo-${Date.now()}-${i}`,
        clientId: 'cosmograph-import',
        workspaceId: targetWorkspaceId,
        subSpaceId: targetSubSpaceId || (targetWorkspace.subSpaces[0]?.id ?? ''),
        title: `Imported Record ${i + 1}`,
        status: 'Imported',
        tags: ['cosmograph-import'],
        data: Object.fromEntries(mappedCols.map((c) => [c.mappedFieldId, c.sample[i % c.sample.length] ?? ''])),
      };
      addRecord(record);
      created++;
    }
    setImportedCount(created);
    setPhase('done');
    setNotice(`${created} records imported into "${targetWorkspace.name}".`);
  };

  /* ── Palette ──────────────────────────────────────────────────── */
  const p = isDark ? {
    bg: 'rgba(13,13,22,0.82)', border: 'rgba(255,255,255,0.09)', cardBg: 'rgba(255,255,255,0.04)',
    title: '#FFFFFF', sub: 'rgba(232,236,255,0.75)', body: 'rgba(232,236,255,0.60)',
    accent: '#A78BFA', accentBg: 'rgba(167,139,250,0.12)', accentBorder: 'rgba(167,139,250,0.28)',
    inputBg: 'rgba(255,255,255,0.05)', inputBorder: 'rgba(255,255,255,0.12)',
    rowHover: 'rgba(139,92,246,0.10)', activeRow: 'rgba(139,92,246,0.18)',
    pillBg: 'rgba(255,255,255,0.07)', pillText: '#C4B5FD',
    green: '#22C55E', red: '#EF4444', amber: '#F59E0B', blue: '#3B82F6',
  } : {
    bg: 'rgba(248,246,255,0.95)', border: 'rgba(0,0,0,0.09)', cardBg: 'rgba(255,255,255,0.82)',
    title: '#1E1535', sub: '#4A3A69', body: '#5C477F',
    accent: '#6F4BCF', accentBg: 'rgba(111,75,207,0.08)', accentBorder: 'rgba(111,75,207,0.22)',
    inputBg: '#FFFFFF', inputBorder: 'rgba(111,75,207,0.22)',
    rowHover: 'rgba(111,75,207,0.06)', activeRow: 'rgba(111,75,207,0.14)',
    pillBg: 'rgba(111,75,207,0.10)', pillText: '#6F4BCF',
    green: '#16A34A', red: '#DC2626', amber: '#D97706', blue: '#2563EB',
  };

  const card = {
    borderRadius: 14, borderWidth: 1, borderColor: p.border,
    backgroundColor: p.cardBg, padding: compact ? 14 : 20, gap: 12,
    ...(Platform.OS === 'web' ? { backdropFilter: 'blur(18px)', boxShadow: isDark ? '0 4px 24px rgba(0,0,0,0.30)' : '0 4px 16px rgba(102,74,154,0.08)' } : {}),
  } as any;

  /* ── Phase Rail ────────────────────────────────────────────────── */
  const renderPhaseRail = () => (
    <View style={{ flexDirection: 'row', gap: compact ? 6 : 0, flexWrap: 'wrap', marginBottom: 20, alignItems: 'center' }}>
      {PHASES.map((ph, i) => {
        const done = phaseDone(ph.key);
        const active = phaseActive(ph.key);
        return (
          <React.Fragment key={ph.key}>
            <Pressable
              onPress={() => done ? setPhase(ph.key) : undefined}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 6,
                paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
                backgroundColor: active ? p.accent + '22' : done ? p.green + '18' : p.pillBg,
                borderWidth: 1,
                borderColor: active ? p.accent : done ? p.green : p.border,
                opacity: !done && !active ? 0.5 : 1,
              }}
            >
              <Text style={{ fontSize: 14 }}>{done ? '✅' : ph.icon}</Text>
              <Text style={{ color: active ? p.accent : done ? p.green : p.body, fontSize: 12, fontWeight: active ? '800' : '600' }}>
                {ph.label}
              </Text>
            </Pressable>
            {i < PHASES.length - 1 && !compact && (
              <View style={{ width: 24, height: 1, backgroundColor: p.border, marginHorizontal: 2 }} />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );

  /* ── PHASE: Upload ──────────────────────────────────────────────── */
  const renderUpload = () => (
    <View style={{ gap: 16 }}>
      <View style={{ ...card, alignItems: 'center', justifyContent: 'center', minHeight: 220, borderStyle: isDragOver ? 'solid' : 'dashed', borderColor: isDragOver ? p.accent : p.border, backgroundColor: isDragOver ? p.accentBg : p.cardBg } as any}
        {...(Platform.OS === 'web' ? {
          onDragOver: (e: any) => { e.preventDefault(); setIsDragOver(true); },
          onDragLeave: () => setIsDragOver(false),
          onDrop: handleDrop as any,
        } : {})}
      >
        <Text style={{ fontSize: 40 }}>{scanning ? '⏳' : '📂'}</Text>
        {scanning ? (
          <>
            <Text style={{ color: p.title, fontSize: 16, fontWeight: '800', textAlign: 'center' }}>Scanning schema…</Text>
            <Text style={{ color: p.sub, fontSize: 13, textAlign: 'center' }}>Detecting column types, nullability, and PII patterns</Text>
            <View style={{ width: 180, height: 4, borderRadius: 4, backgroundColor: p.pillBg, overflow: 'hidden', marginTop: 4 }}>
              <View style={{ height: 4, borderRadius: 4, backgroundColor: p.accent, width: '60%', ...(Platform.OS === 'web' ? { animation: 'cs-skeleton 1.2s ease infinite' } : {}) } as any} />
            </View>
          </>
        ) : (
          <>
            <Text style={{ color: p.title, fontSize: 16, fontWeight: '800', textAlign: 'center' }}>Drop a CSV, Excel, or JSON file here</Text>
            <Text style={{ color: p.sub, fontSize: 13, textAlign: 'center', maxWidth: 360 }}>Or click to browse. Cosmograph will detect your schema automatically and flag any private data before import.</Text>
            <Pressable
              style={{ paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10, backgroundColor: p.accent, marginTop: 6 }}
              onPress={() => { if (Platform.OS === 'web') fileInputRef.current?.click(); }}
            >
              <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 14 }}>Browse File</Text>
            </Pressable>
            {Platform.OS === 'web' && (
              <input
                ref={fileInputRef as any}
                type="file"
                title="Upload CSV, TXT or JSON file"
                accept=".csv,.txt,.json"
                style={{ display: 'none' }}
                onChange={handleFilePick as any}
              />
            )}
          </>
        )}
      </View>

      {/* Import Templates */}
      <Text style={{ color: p.sub, fontSize: 12, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase' }}>Or start with a template</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {importTemplates.map((t) => (
          <Pressable
            key={t.label}
            onPress={() => loadTemplate(t.headers)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: p.border, backgroundColor: p.pillBg }}
          >
            <Text style={{ fontSize: 16 }}>{t.icon}</Text>
            <Text style={{ color: p.pillText, fontSize: 12, fontWeight: '700' }}>{t.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );

  /* ── PHASE: Classify ──────────────────────────────────────────── */
  const renderClassify = () => (
    <View style={{ gap: 14 }}>
      {/* Summary bar */}
      <View style={{ ...card, flexDirection: compact ? 'column' : 'row', gap: 16, padding: 16 }}>
        {[
          { label: 'Columns', value: columns.length, color: p.accent },
          { label: 'Rows', value: schema?.rowCount ?? 0, color: p.blue },
          { label: 'PII / PHI', value: columns.filter((c) => c.piiClass !== 'none' && c.piiClass !== 'id').length, color: p.amber },
          { label: 'High Risk', value: columns.filter((c) => ['ssn', 'dob', 'medical'].includes(c.piiClass)).length, color: p.red },
          { label: 'Clean', value: columns.filter((c) => c.piiClass === 'none').length, color: p.green },
        ].map((stat) => (
          <View key={stat.label} style={{ flex: 1, alignItems: 'center', gap: 2 }}>
            <Text style={{ color: stat.color, fontSize: compact ? 20 : 26, fontWeight: '800' }}>{stat.value}</Text>
            <Text style={{ color: p.body, fontSize: 11, fontWeight: '600' }}>{stat.label}</Text>
          </View>
        ))}
      </View>

      {/* Column list */}
      <View style={{ flexDirection: compact ? 'column' : 'row', gap: 12 }}>
        {/* Left: column list */}
        <View style={{ ...card, flex: compact ? undefined : 1, gap: 2, padding: 10 }}>
          <Text style={{ color: p.sub, fontSize: 11, fontWeight: '700', letterSpacing: 0.5, paddingHorizontal: 6, paddingBottom: 6 }}>DETECTED COLUMNS</Text>
          <ScrollView style={{ maxHeight: 400 }}>
            {columns.map((col) => {
              const isActive = selectedColKey === col.key;
              return (
                <Pressable
                  key={col.key}
                  onPress={() => setSelectedColKey(col.key)}
                  style={{
                    flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 10,
                    backgroundColor: isActive ? p.activeRow : 'transparent',
                    marginBottom: 2,
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '700', color: p.accent, width: 24, textAlign: 'center' }}>{COL_TYPE_ICONS[col.colType]}</Text>
                  <View style={{ flex: 1, gap: 1 }}>
                    <Text style={{ color: p.title, fontSize: 13, fontWeight: '600' }} numberOfLines={1}>{col.label}</Text>
                    <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}>
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: PII_COLORS[col.piiClass] }} />
                      <Text style={{ color: p.body, fontSize: 10 }}>{PII_LABELS[col.piiClass]}</Text>
                    </View>
                  </View>
                  {col.isPrimaryKey && (
                    <Text style={{ fontSize: 11, color: p.blue, fontWeight: '700' }}>PK</Text>
                  )}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Right: column detail */}
        {selectedCol && (
          <View style={{ ...card, flex: compact ? undefined : 1.5, gap: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Text style={{ fontSize: 28 }}>{COL_TYPE_ICONS[selectedCol.colType]}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ color: p.title, fontSize: 17, fontWeight: '800' }}>{selectedCol.label}</Text>
                <Text style={{ color: p.body, fontSize: 12 }}>Detected as <Text style={{ fontWeight: '700', color: p.accent }}>{selectedCol.colType}</Text> · {selectedCol.totalCount} rows · {selectedCol.nullCount} null{selectedCol.nullCount !== 1 ? 's' : ''}</Text>
              </View>
            </View>

            {/* PII override */}
            <View style={{ gap: 6 }}>
              <Text style={{ color: p.sub, fontSize: 12, fontWeight: '700' }}>Privacy Classification</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {(['none', 'email', 'name', 'phone', 'address', 'ssn', 'dob', 'medical', 'id'] as PiiClass[]).map((cls) => (
                  <Pressable
                    key={cls}
                    onPress={() => togglePiiOverride(selectedCol.key, cls)}
                    style={{
                      paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1,
                      borderColor: selectedCol.piiClass === cls ? PII_COLORS[cls] : p.border,
                      backgroundColor: selectedCol.piiClass === cls ? PII_COLORS[cls] + '22' : 'transparent',
                    }}
                  >
                    <Text style={{ color: selectedCol.piiClass === cls ? PII_COLORS[cls] : p.body, fontSize: 11, fontWeight: '700' }}>
                      {PII_LABELS[cls].replace(/[⚠🔴🔵✅]/g, '').trim()}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Sample data */}
            <View style={{ gap: 6 }}>
              <Text style={{ color: p.sub, fontSize: 12, fontWeight: '700' }}>Sample Data</Text>
              <View style={{ gap: 4 }}>
                {selectedCol.sample.slice(0, 4).map((v, i) => (
                  <View key={i} style={{ backgroundColor: p.pillBg, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 }}>
                    <Text style={{ color: p.body, fontSize: 12, fontFamily: 'monospace' }}>{v || '(empty)'}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Risk alert */}
            {['ssn', 'dob', 'medical'].includes(selectedCol.piiClass) && (
              <View style={{ backgroundColor: 'rgba(239,68,68,0.12)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.30)', borderRadius: 10, padding: 12, gap: 4 }}>
                <Text style={{ color: '#EF4444', fontWeight: '800', fontSize: 13 }}>🔴 High-Risk Field</Text>
                <Text style={{ color: p.body, fontSize: 12, lineHeight: 18 }}>
                  This column contains {selectedCol.piiClass === 'medical' ? 'Protected Health Information (PHI)' : 'Personally Identifiable Information (PII)'}. All scanning occurs locally — this data never leaves your device during analysis. Ensure your destination workspace has appropriate access controls before importing.
                </Text>
              </View>
            )}
          </View>
        )}
      </View>

      <Pressable
        onPress={advancePhase}
        style={{ alignSelf: 'flex-start', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10, backgroundColor: p.accent }}
      >
        <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 14 }}>Continue to Field Mapping →</Text>
      </Pressable>
    </View>
  );

  /* ── PHASE: Map ────────────────────────────────────────────────── */
  const renderMap = () => (
    <View style={{ gap: 14 }}>
      {/* Workspace / SubSpace selector */}
      <View style={{ ...card, gap: 12 }}>
        <Text style={{ color: p.title, fontSize: 14, fontWeight: '800' }}>Target Workspace</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {data.workspaces.map((ws) => (
            <Pressable
              key={ws.id}
              onPress={() => { setTargetWorkspaceId(ws.id); setTargetSubSpaceId(''); }}
              style={{
                paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, borderWidth: 1,
                borderColor: targetWorkspaceId === ws.id ? p.accent : p.border,
                backgroundColor: targetWorkspaceId === ws.id ? p.accentBg : 'transparent',
              }}
            >
              <Text style={{ color: targetWorkspaceId === ws.id ? p.accent : p.body, fontWeight: '700', fontSize: 13 }}>{ws.name}</Text>
            </Pressable>
          ))}
        </View>
        {targetWorkspace && targetWorkspace.subSpaces.length > 0 && (
          <>
            <Text style={{ color: p.sub, fontSize: 12, fontWeight: '700' }}>Target SubSpace (optional)</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              <Pressable
                onPress={() => setTargetSubSpaceId('')}
                style={{
                  paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1,
                  borderColor: targetSubSpaceId === '' ? p.accent : p.border,
                  backgroundColor: targetSubSpaceId === '' ? p.accentBg : 'transparent',
                }}
              >
                <Text style={{ color: targetSubSpaceId === '' ? p.accent : p.body, fontSize: 12, fontWeight: '700' }}>Root Workspace</Text>
              </Pressable>
              {targetWorkspace.subSpaces.map((ss) => (
                <Pressable
                  key={ss.id}
                  onPress={() => setTargetSubSpaceId(ss.id)}
                  style={{
                    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1,
                    borderColor: targetSubSpaceId === ss.id ? p.accent : p.border,
                    backgroundColor: targetSubSpaceId === ss.id ? p.accentBg : 'transparent',
                  }}
                >
                  <Text style={{ color: targetSubSpaceId === ss.id ? p.accent : p.body, fontSize: 12, fontWeight: '700' }}>{ss.name}</Text>
                </Pressable>
              ))}
            </View>
          </>
        )}
      </View>

      {/* Mapping table */}
      <View style={{ ...card, padding: 0, overflow: 'hidden' }}>
        {/* Header */}
        <View style={{ flexDirection: 'row', padding: 12, backgroundColor: p.pillBg, gap: 0 }}>
          <Text style={{ flex: 2, color: p.sub, fontSize: 11, fontWeight: '700', letterSpacing: 0.4 }}>CSV COLUMN</Text>
          <Text style={{ flex: 1, color: p.sub, fontSize: 11, fontWeight: '700', letterSpacing: 0.4, textAlign: 'center' }}>TYPE</Text>
          <Text style={{ flex: 1, color: p.sub, fontSize: 11, fontWeight: '700', letterSpacing: 0.4, textAlign: 'center' }}>PRIVACY</Text>
          <Text style={{ flex: 2, color: p.sub, fontSize: 11, fontWeight: '700', letterSpacing: 0.4 }}>MAP TO FIELD</Text>
        </View>
        <ScrollView style={{ maxHeight: 420 }}>
          {columns.map((col, i) => (
            <View
              key={col.key}
              style={{
                flexDirection: 'row', alignItems: 'center', padding: 10, gap: 0,
                borderTopWidth: i > 0 ? 1 : 0, borderTopColor: p.border,
                backgroundColor: col.mappedFieldId ? p.accentBg : 'transparent',
              }}
            >
              <View style={{ flex: 2, gap: 1 }}>
                <Text style={{ color: p.title, fontSize: 13, fontWeight: '700' }} numberOfLines={1}>{col.label}</Text>
                {col.sample[0] && (
                  <Text style={{ color: p.body, fontSize: 10, fontFamily: 'monospace' }} numberOfLines={1}>{col.sample[0]}</Text>
                )}
              </View>
              <Text style={{ flex: 1, color: p.accent, fontSize: 12, fontWeight: '700', textAlign: 'center' }}>{COL_TYPE_ICONS[col.colType]}</Text>
              <View style={{ flex: 1, alignItems: 'center' }}>
                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: PII_COLORS[col.piiClass] }} />
              </View>
              <View style={{ flex: 2 }}>
                {Platform.OS === 'web' ? (
                  <select
                    title="Map column to workspace field"
                    value={col.mappedFieldId}
                    onChange={(e) => setColumnMapping(col.key, e.target.value)}
                    style={{
                      width: '100%', fontSize: 12, padding: '6px 8px', borderRadius: 8,
                      background: isDark ? 'rgba(255,255,255,0.07)' : '#FFFFFF',
                      color: isDark ? '#E2D9F3' : '#1E1535',
                      border: `1px solid ${col.mappedFieldId ? p.accent : p.inputBorder}`,
                      outline: 'none',
                    }}
                  >
                    <option value="">— Skip this column —</option>
                    {workspaceFields.map((f) => (
                      <option key={f.id} value={f.id}>{f.label} ({f.type})</option>
                    ))}
                  </select>
                ) : (
                  <Text style={{ color: p.body, fontSize: 11 }}>(web only)</Text>
                )}
              </View>
            </View>
          ))}
        </ScrollView>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Text style={{ color: p.sub, fontSize: 12 }}>
          {columns.filter((c) => c.mappedFieldId).length} of {columns.length} columns mapped
        </Text>
        <Pressable
          onPress={advancePhase}
          style={{ paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10, backgroundColor: p.accent }}
        >
          <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 14 }}>Preview Import →</Text>
        </Pressable>
      </View>
    </View>
  );

  /* ── PHASE: Preview ─────────────────────────────────────────────── */
  const renderPreview = () => {
    const mappedCols = columns.filter((c) => c.mappedFieldId);
    const previewRows = Array.from({ length: Math.min(6, schema?.rowCount ?? 0) }, (_, i) =>
      Object.fromEntries(mappedCols.map((c) => [c.label, c.sample[i % c.sample.length] ?? '—'])),
    );
    const highRisk = columns.filter((c) => ['ssn', 'dob', 'medical'].includes(c.piiClass) && c.mappedFieldId);

    return (
      <View style={{ gap: 14 }}>
        {highRisk.length > 0 && (
          <View style={{ backgroundColor: 'rgba(239,68,68,0.10)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.28)', borderRadius: 12, padding: 14, gap: 4 }}>
            <Text style={{ color: '#EF4444', fontWeight: '800', fontSize: 14 }}>🔴 High-Risk Data Detected</Text>
            <Text style={{ color: p.body, fontSize: 13, lineHeight: 20 }}>
              {highRisk.length} column{highRisk.length !== 1 ? 's' : ''} ({highRisk.map((c) => c.label).join(', ')}) contain{highRisk.length === 1 ? 's' : ''} sensitive PII/PHI. Verify that your target workspace has appropriate role-based access controls before proceeding.
            </Text>
          </View>
        )}

        <View style={{ ...card, gap: 10 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ color: p.title, fontSize: 16, fontWeight: '800' }}>Import Preview</Text>
            <View style={{ backgroundColor: p.accentBg, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 }}>
              <Text style={{ color: p.accent, fontSize: 12, fontWeight: '700' }}>
                {schema?.rowCount ?? 0} rows · {mappedCols.length} fields mapped
              </Text>
            </View>
          </View>
          <Text style={{ color: p.body, fontSize: 13 }}>
            Destination: <Text style={{ fontWeight: '700', color: p.accent }}>{targetWorkspace?.name ?? '—'}</Text>
            {targetSubSpace ? <Text style={{ color: p.sub }}>  →  {targetSubSpace.name}</Text> : null}
          </Text>

          {/* Mini preview table */}
          {mappedCols.length > 0 && previewRows.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View>
                {/* Header row */}
                <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: p.border, paddingBottom: 6, marginBottom: 4 }}>
                  {mappedCols.map((c) => (
                    <Text key={c.key} style={{ width: 140, color: p.sub, fontSize: 11, fontWeight: '700', paddingHorizontal: 6 }} numberOfLines={1}>{c.label}</Text>
                  ))}
                </View>
                {/* Data rows */}
                {previewRows.map((row, ri) => (
                  <View key={ri} style={{ flexDirection: 'row', paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: p.border + '60', backgroundColor: ri % 2 === 0 ? 'transparent' : p.pillBg + '40' }}>
                    {mappedCols.map((c) => (
                      <Text key={c.key} style={{ width: 140, color: p.body, fontSize: 12, paddingHorizontal: 6 }} numberOfLines={1}>{row[c.label] ?? '—'}</Text>
                    ))}
                  </View>
                ))}
              </View>
            </ScrollView>
          )}

          <Text style={{ color: p.sub, fontSize: 11, fontStyle: 'italic' }}>
            Showing first {Math.min(6, schema?.rowCount ?? 0)} of {schema?.rowCount ?? 0} rows. Up to 50 records will be created on import.
          </Text>
        </View>

        <Pressable
          onPress={runImport}
          style={{ alignSelf: 'flex-start', paddingHorizontal: 28, paddingVertical: 12, borderRadius: 12, backgroundColor: p.green }}
        >
          <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 14 }}>🚀 Run Import — Create {Math.min(50, schema?.rowCount ?? 0)} Records</Text>
        </Pressable>
      </View>
    );
  };

  /* ── PHASE: Done ──────────────────────────────────────────────── */
  const renderDone = () => (
    <View style={{ ...card, alignItems: 'center', gap: 18, padding: 40 }}>
      <Text style={{ fontSize: 56 }}>✅</Text>
      <Text style={{ color: p.title, fontSize: 24, fontWeight: '800', textAlign: 'center' }}>Import Complete</Text>
      <Text style={{ color: p.sub, fontSize: 15, textAlign: 'center', maxWidth: 400 }}>
        {importedCount} records were created in <Text style={{ color: p.accent, fontWeight: '700' }}>{targetWorkspace?.name ?? 'your workspace'}</Text> and are live in the End User view.
      </Text>
      <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
        {[
          { label: 'Rows Imported', value: importedCount, color: p.green },
          { label: 'Fields Mapped', value: columns.filter((c) => c.mappedFieldId).length, color: p.accent },
          { label: 'PII Flagged', value: columns.filter((c) => c.piiClass !== 'none' && c.piiClass !== 'id').length, color: p.amber },
        ].map((s) => (
          <View key={s.label} style={{ alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, backgroundColor: p.pillBg, gap: 2, minWidth: 100 }}>
            <Text style={{ color: s.color, fontSize: 28, fontWeight: '800' }}>{s.value}</Text>
            <Text style={{ color: p.body, fontSize: 11, fontWeight: '600' }}>{s.label}</Text>
          </View>
        ))}
      </View>
      <Pressable
        onPress={() => { setPhase('upload'); setSchema(null); setColumns([]); setImportedCount(0); setNotice(''); }}
        style={{ paddingHorizontal: 22, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: p.border, backgroundColor: p.pillBg }}
      >
        <Text style={{ color: p.accent, fontWeight: '700', fontSize: 14 }}>Import Another File</Text>
      </Pressable>
    </View>
  );

  /* ── RENDER ─────────────────────────────────────────────────────── */
  return (
    <ScrollView style={styles.pageWrap} contentContainerStyle={{ padding: compact ? 12 : 20, paddingBottom: 60, gap: 0 }} keyboardShouldPersistTaps="handled">
      {/* Header */}
      <View style={{ gap: 4, marginBottom: 20 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Text style={{ fontSize: 28 }}>🧬</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ color: p.title, fontSize: compact ? 22 : 28, fontWeight: '800', letterSpacing: -0.5 }}>Cosmograph</Text>
            <Text style={{ color: p.sub, fontSize: 13, lineHeight: 20 }}>Schema Intelligence Engine — upload any data file, classify PII/PHI, map to your workspace, and import in under 3 minutes.</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(34,197,94,0.12)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1, borderColor: 'rgba(34,197,94,0.28)' }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#22C55E' }} />
            <Text style={{ color: '#22C55E', fontSize: 11, fontWeight: '700', letterSpacing: 0.4 }}>NETWORK ISOLATED</Text>
          </View>
        </View>
      </View>

      {renderPhaseRail()}

      {notice ? (
        <View style={{ backgroundColor: 'rgba(34,197,94,0.12)', borderWidth: 1, borderColor: 'rgba(34,197,94,0.28)', borderRadius: 10, padding: 12, marginBottom: 14 }}>
          <Text style={{ color: '#22C55E', fontSize: 13, fontWeight: '700' }}>✅ {notice}</Text>
        </View>
      ) : null}

      {phase === 'upload' && renderUpload()}
      {phase === 'classify' && schema && renderClassify()}
      {phase === 'map' && schema && renderMap()}
      {phase === 'preview' && schema && renderPreview()}
      {phase === 'done' && renderDone()}
    </ScrollView>
  );
}
