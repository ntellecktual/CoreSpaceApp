import React, { useState as useLocalState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Image, Modal, Platform, ScrollView, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { InteractivePressable as Pressable } from '../../components/InteractivePressable';
import { BoardView } from '../../components/BoardView';
import { RecordDetailDrawer } from '../../components/RecordDetailDrawer';
import { Breadcrumb, Sparkline, SkeletonList, SavingIndicator, showToast, injectUxAnimations } from '../../components/UxEnhancements';
import { useUiTheme } from '../../context/UiThemeContext';
import { useAppState } from '../../context/AppStateContext';
import { HintStrip, LabeledInput, ProcessStepper } from './components';
import { endUserSteps, dscsaCrudWalkthroughSteps } from './constants';
import { useClientIntake } from './hooks/useClientIntake';
import { useEndUserRuntime } from './hooks/useEndUserRuntime';
import { useFlowEngine } from './hooks/useFlowEngine';
import { useRbac } from './hooks/useRbac';
import { GuidedPageProps } from './types';
import { BrandLogo } from '../../components/BrandLogo';
import { formatDate } from '../../formatDate';
import { searchFdaDrugs, formatCurrency, formatUnitCount } from '../../api';
import type { FdaDrug } from '../../api';
import type { RuntimeRecord, SubSpaceBuilderField } from '../../types';
import { getRecordPlaceholderImage } from '../../data/pipelineConfig';

/* ── CSV/JSON parser (no dependencies) ─────────────────── */
function parseCsvOrJson(raw: string): Record<string, string>[] {
  const t = raw.trim();
  if (!t) return [];
  try {
    if (t.startsWith('[')) {
      const parsed = JSON.parse(t);
      if (Array.isArray(parsed)) {
        return parsed.map((row: Record<string, unknown>) =>
          Object.fromEntries(Object.entries(row).map(([k, v]) => [k, String(v ?? '')]))
        );
      }
    }
  } catch { /* fall through to CSV */ }
  const lines = t.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const parseRow = (line: string) => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { inQuotes = !inQuotes; continue; }
      if (ch === ',' && !inQuotes) { result.push(current.trim()); current = ''; continue; }
      current += ch;
    }
    result.push(current.trim());
    return result;
  };
  const headers = parseRow(lines[0]);
  return lines.slice(1).map((line) => {
    const vals = parseRow(line);
    return Object.fromEntries(headers.map((h, i) => [h, vals[i] ?? '']));
  });
}

/* ── GS1-128 barcode parser ─────────────────────────────── */
function parseGs1Barcode(code: string): Record<string, string> {
  const result: Record<string, string> = {};
  const aiPattern = /([0-9]{2,4})((?:(?![0-9]{2,4}(?=[^0-9]|$)).)+)/g;
  // Remove common GS1 delimiters and try to extract Application Identifiers
  // Support both parenthesised format `(01)12345...` and raw concatenated format
  const normalized = code.replace(/[()]/g, '');
  // Try parenthesised: (01)xxx(10)yyy
  const parenPattern = /\(([0-9]{2,4})\)([^(]+)/g;
  let m: RegExpExecArray | null;
  let matched = false;
  while ((m = parenPattern.exec(code)) !== null) {
    matched = true;
    const ai = m[1]; const val = m[2].trim();
    if (ai === '01') result['ndc'] = val.slice(-12);
    else if (ai === '10') result['lot'] = val;
    else if (ai === '17') {
      const y = `20${val.slice(0, 2)}`, mo = val.slice(2, 4), d = val.slice(4, 6);
      result['expiration'] = `${mo}-${d}-${y}`;
    } else if (ai === '21') result['serial'] = val;
  }
  if (!matched && normalized.length >= 20) {
    // Raw GS1-128: AI 01 is 14 digits, AI 17 is 6 digits, AI 10 variable, AI 21 variable
    let pos = 0;
    while (pos < normalized.length) {
      const ai2 = normalized.slice(pos, pos + 2);
      const ai4 = normalized.slice(pos, pos + 4);
      if (ai2 === '01') { result['ndc'] = normalized.slice(pos + 2, pos + 16).slice(-12); pos += 16; }
      else if (ai2 === '17') { const d = normalized.slice(pos + 2, pos + 8); const y = `20${d.slice(0,2)}`; result['expiration'] = `${d.slice(2,4)}-${d.slice(4,6)}-${y}`; pos += 8; }
      else if (ai2 === '10') { const end = normalized.indexOf('21', pos + 2); const v = end > 0 ? normalized.slice(pos + 2, end) : normalized.slice(pos + 2, pos + 22); result['lot'] = v; pos += 2 + v.length; }
      else if (ai2 === '21') { result['serial'] = normalized.slice(pos + 2); pos = normalized.length; }
      else { pos++; }
    }
  }
  return result;
}

/* ── DSCSA Pharmaceutical Barcode Dataset (simulated scan API) ─── */
const PHARMA_BARCODE_DATASET = [
  { barcode: '(01)00368180517013(10)XY-1234(17)261225(21)UNIT001', productName: 'Lisinopril 10mg Tablet',          ndc: '68180-0517-01', manufacturer: 'Lupin Pharmaceuticals', lot: 'XY-1234',  expiration: '12-25-2026', serial: 'UNIT001', dosageForm: 'Tablet'     },
  { barcode: '(01)00658620007054(10)MZ-9021(17)270915(21)UNIT002', productName: 'Amoxicillin 500mg Capsule',       ndc: '65862-0007-05', manufacturer: 'Aurobindo Pharma',       lot: 'MZ-9021',  expiration: '09-15-2027', serial: 'UNIT002', dosageForm: 'Capsule'    },
  { barcode: '(01)00004091631016(10)JK-4410(17)270630(21)UNIT003', productName: 'Epinephrine 1mg/mL Injectable',   ndc: '00409-1631-01', manufacturer: 'Pfizer Inc.',            lot: 'JK-4410',  expiration: '06-30-2027', serial: 'UNIT003', dosageForm: 'Injectable' },
  { barcode: '(01)00031622003456(10)AB-5512(17)271130(21)UNIT004', productName: 'Metoprolol Succinate 50mg',       ndc: '00316-2200-34', manufacturer: 'AstraZeneca',            lot: 'AB-5512',  expiration: '11-30-2027', serial: 'UNIT004', dosageForm: 'Tablet'     },
  { barcode: '(01)00007104014323(10)CD-7789(17)280315(21)UNIT005', productName: 'Atorvastatin Calcium 20mg',       ndc: '00071-0143-23', manufacturer: 'Pfizer (Lipitor)',        lot: 'CD-7789',  expiration: '03-15-2028', serial: 'UNIT005', dosageForm: 'Tablet'     },
  { barcode: '(01)05000456789012(10)EF-3301(17)270801(21)CTN-001', productName: 'Metoprolol Succinate 50mg Carton', ndc: '00316-2200-34', manufacturer: 'AstraZeneca',           lot: 'EF-3301',  expiration: '08-01-2027', serial: 'CTN-001', dosageForm: 'Carton'     },
] as const;
type PharmaBarcodeEntry = typeof PHARMA_BARCODE_DATASET[number];

function lookupBarcodeDataset(code: string): PharmaBarcodeEntry | null {
  const trimmed = code.trim();
  return PHARMA_BARCODE_DATASET.find(
    (e) => e.barcode === trimmed || e.ndc === trimmed || e.serial === trimmed,
  ) ?? null;
}

function applyDatasetEntryToFields(
  entry: PharmaBarcodeEntry,
  fields: SubSpaceBuilderField[],
  setField: (id: string, val: string) => void,
) {
  fields.forEach((f) => {
    const lbl = f.label.toLowerCase();
    if (lbl.includes('ndc') || lbl.includes('code'))                             setField(f.id, entry.ndc);
    else if (lbl.includes('lot'))                                                 setField(f.id, entry.lot);
    else if (lbl.includes('exp') || (lbl.includes('date') && !lbl.includes('received') && !lbl.includes('create')))
                                                                                  setField(f.id, entry.expiration);
    else if (lbl.includes('serial') || lbl.includes('unit'))                     setField(f.id, entry.serial);
    else if (lbl.includes('product') || lbl.includes('name') || lbl.includes('drug'))
                                                                                  setField(f.id, entry.productName);
    else if (lbl.includes('manufacturer') || lbl.includes('labeler'))            setField(f.id, entry.manufacturer);
    else if (lbl.includes('dosage') || lbl.includes('form'))                     setField(f.id, entry.dosageForm);
  });
}

/* ── Map GS1/raw barcode to form fields ─────────────────── */
function applyBarcodeToFields(
  code: string,
  fields: SubSpaceBuilderField[],
  setField: (id: string, val: string) => void,
): boolean {
  const gs1 = parseGs1Barcode(code);
  const hasGs1 = Object.keys(gs1).length > 0;
  fields.forEach((f) => {
    const lbl = f.label.toLowerCase();
    if (hasGs1) {
      if ((lbl.includes('ndc') || lbl.includes('code') || lbl.includes('product')) && gs1['ndc']) setField(f.id, gs1['ndc']);
      else if (lbl.includes('lot') && gs1['lot']) setField(f.id, gs1['lot']);
      else if ((lbl.includes('exp') || (lbl.includes('date') && !lbl.includes('create'))) && gs1['expiration']) setField(f.id, gs1['expiration']);
      else if ((lbl.includes('serial') || lbl.includes('unit')) && gs1['serial']) setField(f.id, gs1['serial']);
    } else if (
      lbl.includes('serial') || lbl.includes('barcode') || lbl.includes('sku') ||
      lbl.includes('id') || lbl.includes('code') || f.type === 'text'
    ) {
      setField(f.id, code);
    }
  });
  return true;
}

/* ── Helpers ─────────────────────────────────────────────── */

function withAlpha(hex: string, a: string) { return `${hex}${a}`; }

/* ── QR Code data encoder ─────────────────────────────── */
function buildQrData(entry: PharmaBarcodeEntry): string {
  return `DSCSA|NDC:${entry.ndc}|LOT:${entry.lot}|EXP:${entry.expiration}|SN:${entry.serial}|PROD:${entry.productName}|MFR:${entry.manufacturer}|FORM:${entry.dosageForm}`;
}

/* ── Composite Date / Date-Time field picker ─────────────── */
function CompositeFieldInput({
  fieldType, value, onChange, label, dimColor,
}: {
  fieldType: 'date' | 'datetime';
  value: string;
  onChange: (v: string) => void;
  label: string;
  required?: boolean;
  dimColor: string;
}) {
  const isDatetime = fieldType === 'datetime';
  const parseParts = (val: string) => {
    if (isDatetime) {
      const m = val.match(/^(\d{1,2})-(\d{1,2})-(\d{2,4})\s+(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
      return m
        ? { mm: m[1], dd: m[2], yyyy: m[3], hh: m[4], min: m[5], ampm: m[6].toUpperCase() }
        : { mm: '', dd: '', yyyy: '', hh: '', min: '', ampm: 'AM' };
    }
    const m = val.match(/^(\d{1,2})-(\d{1,2})-(\d{2,4})$/);
    return m
      ? { mm: m[1], dd: m[2], yyyy: m[3], hh: '', min: '', ampm: 'AM' }
      : { mm: '', dd: '', yyyy: '', hh: '', min: '', ampm: 'AM' };
  };
  const { mm, dd, yyyy, hh, min, ampm } = parseParts(value);
  const write = (nMm: string, nDd: string, nYyyy: string, nHh: string, nMin: string, nAmpm: string) =>
    onChange(isDatetime ? `${nMm}-${nDd}-${nYyyy} ${nHh}:${nMin} ${nAmpm}` : `${nMm}-${nDd}-${nYyyy}`);
  const inp: any = {
    fontSize: 14, color: '#FFFFFF', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
    borderRadius: 8, paddingHorizontal: 6, paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.04)', textAlign: 'center',
  };
  return (
    <View style={{ gap: 4 }}>
      <Text style={{ fontSize: 11, fontWeight: '600', color: dimColor }}>{label}</Text>
      <View style={{ flexDirection: 'row', gap: 5, alignItems: 'center' as any, flexWrap: 'wrap' as any }}>
        <TextInput style={{ ...inp, width: 42 }} value={mm} onChangeText={(v) => write(v, dd, yyyy, hh, min, ampm)} placeholder="MM" placeholderTextColor={dimColor} keyboardType="numeric" maxLength={2} />
        <Text style={{ color: dimColor, fontSize: 16 }}>/</Text>
        <TextInput style={{ ...inp, width: 42 }} value={dd} onChangeText={(v) => write(mm, v, yyyy, hh, min, ampm)} placeholder="DD" placeholderTextColor={dimColor} keyboardType="numeric" maxLength={2} />
        <Text style={{ color: dimColor, fontSize: 16 }}>/</Text>
        <TextInput style={{ ...inp, width: 60 }} value={yyyy} onChangeText={(v) => write(mm, dd, v, hh, min, ampm)} placeholder="YYYY" placeholderTextColor={dimColor} keyboardType="numeric" maxLength={4} />
        {isDatetime && (
          <>
            <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, paddingHorizontal: 2 }}>·</Text>
            <TextInput style={{ ...inp, width: 42 }} value={hh} onChangeText={(v) => write(mm, dd, yyyy, v, min, ampm)} placeholder="HH" placeholderTextColor={dimColor} keyboardType="numeric" maxLength={2} />
            <Text style={{ color: dimColor, fontSize: 16 }}>:</Text>
            <TextInput style={{ ...inp, width: 42 }} value={min} onChangeText={(v) => write(mm, dd, yyyy, hh, v, ampm)} placeholder="MM" placeholderTextColor={dimColor} keyboardType="numeric" maxLength={2} />
            <Pressable onPress={() => write(mm, dd, yyyy, hh, min, ampm === 'AM' ? 'PM' : 'AM')} style={{ paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', backgroundColor: 'rgba(255,255,255,0.06)' }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#FFFFFF' }}>{ampm || 'AM'}</Text>
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}

function getContrastTextColor(hex: string) {
  const raw = hex.replace('#', '');
  const n = raw.length === 3 ? raw.split('').map((c) => c + c).join('') : raw;
  if (n.length !== 6) return '#FFFFFF';
  const r = parseInt(n.slice(0, 2), 16);
  const g = parseInt(n.slice(2, 4), 16);
  const b = parseInt(n.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.56 ? '#111111' : '#FFFFFF';
}

function normalizeHex(value: string, fallback: string) {
  const t = value.trim();
  const h = t.startsWith('#') ? t : `#${t}`;
  return /^#[0-9a-fA-F]{6}$/.test(h) ? h.toUpperCase() : fallback;
}

const fmtMoney = (v: number) => formatCurrency(v);
const fmtUnits = (v: number) => formatUnitCount(v);

/* ── Glass Panel helper ──────────────────────────────────── */
const glass = (opacity = 0.06, themeMode: 'day' | 'night' = 'night'): any => {
  const isDay = themeMode === 'day';
  return {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: isDay ? `rgba(0,0,0,${opacity + 0.06})` : `rgba(255,255,255,${opacity + 0.04})`,
    backgroundColor: isDay ? `rgba(255,255,255,0.82)` : `rgba(10,14,24,0.72)`,
    ...(Platform.OS === 'web' ? { backdropFilter: 'blur(18px)', boxShadow: isDay ? '0 2px 20px rgba(102,74,154,0.10)' : '0 2px 20px rgba(0,0,0,0.22)' } : {}),
  };
};

/* ── Tenant Onboarding Guide ─────────────────────────────── */
const tenantOnboardingSteps = [
  {
    number: '1',
    title: 'Go to Workspace',
    detail: 'Navigate to the Workspace module in the sidebar. This is your admin control center for building operational structure.',
  },
  {
    number: '2',
    title: 'Create or generate workspaces',
    detail: 'Click "Create" or use Bebo Ai to generate workspaces. Each workspace represents a business domain — e.g. Claims, Inventory, Compliance.',
  },
  {
    number: '3',
    title: 'Define subspaces & fields',
    detail: 'Inside each workspace, add subspaces (data categories) and define the fields your team will use to capture information.',
  },
  {
    number: '4',
    title: 'Set up lifecycle stages',
    detail: 'Configure lifecycle stages to track how records move through your process — from intake to completion, with allowed transitions.',
  },
  {
    number: '5',
    title: 'Assign roles & personas',
    detail: 'Create personas that define which team members see which data. RBAC controls ensure the right people access the right workspaces.',
  },
  {
    number: '6',
    title: 'Publish to this tenant view',
    detail: 'Once published, workspaces appear here in your tenant\'s runtime view. Your team can then create records, manage data, and track workflows.',
  },
];

const tenantCapabilities = [
  { icon: '🏢', title: 'Multi-Tenant Isolation', body: 'Each tenant operates in a fully isolated environment. Data, branding, roles, and configurations are scoped per tenant.' },
  { icon: '🎨', title: 'Custom Branding', body: 'Set your tenant\'s logo, brand colors, and employee titles from Tenant Access in the sidebar.' },
  { icon: '🔐', title: 'RBAC & Personas', body: 'Role-based access control ensures team members only see what they\'re authorized to. Assign personas per workspace.' },
  { icon: '📊', title: 'Workspace Runtime', body: 'Published workspaces become interactive dashboards here — with records, forms, lifecycle tracking, and real-time data.' },
  { icon: '⚡', title: 'Signal Studio Automation', body: 'Automate workflows with event-driven flows that trigger on record changes, status transitions, and custom conditions.' },
  { icon: '🔗', title: 'Orbital Integrations', body: 'Connect to external APIs and services. Map fields, configure webhooks, and sync data across your tech stack.' },
];

function TenantOnboardingGuide({ mode, styles }: { mode: 'day' | 'night'; styles: any }) {
  const { activeTenantName, activeTenantBranding } = useAppState();
  const { width: windowWidth } = useWindowDimensions();
  const compact = windowWidth < 900;
  const isDark = mode === 'night';

  const p = isDark
    ? {
        cardBg: 'rgba(255,255,255,0.04)',
        cardBorder: 'rgba(255,255,255,0.10)',
        cardShadow: '0 6px 20px rgba(0,0,0,0.30)',
        title: '#FFFFFF',
        subtitle: 'rgba(232,236,255,0.84)',
        body: 'rgba(232,236,255,0.68)',
        accent: '#A78BFA',
        accentBg: 'rgba(167,139,250,0.14)',
        accentBorder: 'rgba(167,139,250,0.28)',
        heroBg: 'linear-gradient(135deg, rgba(111,75,207,0.14) 0%, rgba(59,130,246,0.08) 100%)',
        divider: 'rgba(255,255,255,0.08)',
        stepCircleBg: 'rgba(167,139,250,0.14)',
        stepCircleBorder: 'rgba(167,139,250,0.28)',
        stepCircleText: '#A78BFA',
      }
    : {
        cardBg: 'rgba(255,255,255,0.72)',
        cardBorder: 'rgba(102,74,154,0.16)',
        cardShadow: '0 4px 14px rgba(102,74,154,0.08)',
        title: '#1E1535',
        subtitle: '#4A3A69',
        body: '#5C477F',
        accent: '#6F4BCF',
        accentBg: 'rgba(111,75,207,0.08)',
        accentBorder: 'rgba(111,75,207,0.20)',
        heroBg: 'linear-gradient(135deg, rgba(111,75,207,0.06) 0%, rgba(59,130,246,0.04) 100%)',
        divider: 'rgba(102,74,154,0.12)',
        stepCircleBg: 'rgba(111,75,207,0.10)',
        stepCircleBorder: 'rgba(111,75,207,0.22)',
        stepCircleText: '#6F4BCF',
      };

  const gridCols = compact ? 1 : windowWidth < 1200 ? 2 : 3;

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 48 }}>
      {/* Hero */}
      <View
        style={{
          backgroundImage: p.heroBg,
          borderRadius: 16,
          margin: compact ? 12 : 24,
          marginBottom: 0,
          padding: compact ? 20 : 32,
          borderWidth: 1,
          borderColor: p.cardBorder,
          backdropFilter: 'blur(18px)',
          alignItems: 'center',
          gap: 12,
        } as any}
      >
        {activeTenantBranding.logoUri?.trim() ? (
          <BrandLogo width={120} height={48} logoUri={activeTenantBranding.logoUri.trim()} />
        ) : (
          <Text style={{ fontSize: 44 }}>🏢</Text>
        )}
        <Text
          style={{
            color: p.title,
            fontSize: compact ? 24 : 30,
            fontWeight: '800',
            letterSpacing: -0.5,
            textAlign: 'center',
          }}
        >
          Welcome to {activeTenantName}
        </Text>
        <Text
          style={{
            color: p.subtitle,
            fontSize: compact ? 13 : 15,
            lineHeight: 22,
            textAlign: 'center',
            maxWidth: 540,
          }}
        >
          This is your tenant's operational runtime. Once workspaces are published from
          the Workspace module, your team will manage records, track lifecycles, and run
          automations right here.
        </Text>
        <View
          style={{
            backgroundColor: isDark ? 'rgba(234,179,8,0.14)' : 'rgba(234,179,8,0.10)',
            borderWidth: 1,
            borderColor: isDark ? 'rgba(234,179,8,0.28)' : 'rgba(234,179,8,0.22)',
            borderRadius: 10,
            paddingHorizontal: 16,
            paddingVertical: 10,
            marginTop: 4,
            maxWidth: 460,
          }}
        >
          <Text style={{ color: isDark ? '#FBBF24' : '#A16207', fontSize: 13, fontWeight: '600', textAlign: 'center' }}>
            No workspaces published yet — follow the steps below to get started.
          </Text>
        </View>
      </View>

      {/* Getting Started Steps */}
      <View style={{ padding: compact ? 12 : 24, gap: 14 }}>
        <Text style={{ color: p.title, fontSize: 18, fontWeight: '700', letterSpacing: -0.2 }}>
          Getting Started
        </Text>
        {tenantOnboardingSteps.map((step) => (
          <View key={step.number} style={{ flexDirection: 'row', gap: 14, alignItems: 'flex-start' }}>
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: p.stepCircleBg,
                borderWidth: 1,
                borderColor: p.stepCircleBorder,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ color: p.stepCircleText, fontSize: 14, fontWeight: '800' }}>
                {step.number}
              </Text>
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ color: p.title, fontSize: 14, fontWeight: '700' }}>{step.title}</Text>
              <Text style={{ color: p.body, fontSize: 13, lineHeight: 20 }}>{step.detail}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Divider */}
      <View style={{ height: 1, backgroundColor: p.divider, marginHorizontal: compact ? 12 : 24 }} />

      {/* What Tenants Can Do */}
      <View style={{ padding: compact ? 12 : 24, gap: 14 }}>
        <Text style={{ color: p.title, fontSize: 18, fontWeight: '700', letterSpacing: -0.2 }}>
          What Your Tenant Can Do
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>
          {tenantCapabilities.map((cap) => (
            <View
              key={cap.title}
              style={{
                width: gridCols === 1 ? '100%' : gridCols === 2 ? '48.5%' : '31.8%',
                backgroundColor: p.cardBg,
                borderWidth: 1,
                borderColor: p.cardBorder,
                borderRadius: 14,
                padding: 18,
                gap: 8,
                backdropFilter: 'blur(14px)',
                boxShadow: p.cardShadow,
              } as any}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Text style={{ fontSize: 22 }}>{cap.icon}</Text>
                <Text style={{ color: p.title, fontSize: 14, fontWeight: '700' }}>{cap.title}</Text>
              </View>
              <Text style={{ color: p.body, fontSize: 13, lineHeight: 20 }}>{cap.body}</Text>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

/* ── Workspace step mapping (fallback only — workspace.name is preferred) ── */
const workspaceStepTitles: Record<string, string> = {};

/* ───────────────────────────────────────────────────────────
   END USER PAGE — single-screen, zero-scroll, modal-driven
   ─────────────────────────────────────────────────────────── */

export function EndUserPage({ guidedMode, onGuide, accentPalette, addNotification, auditLog }: GuidedPageProps) {
  const { mode, styles } = useUiTheme();
  const { width: windowWidth } = useWindowDimensions();

  /* ── RBAC ── */
  const { can, deniedMessage } = useRbac();
  const canIntakeClient = can('client.intake');
  const canCreateRecord = can('record.create');

  /* ── Direct addRecord for batch operations ── */
  const { addRecord: addRecordDirect, data: appData } = useAppState();

  /* ── Local UI state ── */
  const [recordDrawerVisible, setRecordDrawerVisible] = useLocalState(false);
  const [selectedDrawerRecord, setSelectedDrawerRecord] = useLocalState<RuntimeRecord | null>(null);
  const [viewMode, setViewMode] = useLocalState<'list' | 'board'>('list');
  const [intakeModalOpen, setIntakeModalOpen] = useLocalState(false);
  const [createModalOpen, setCreateModalOpen] = useLocalState(false);
  const [timelineModalOpen, setTimelineModalOpen] = useLocalState(false);
  const [flowsModalOpen, setFlowsModalOpen] = useLocalState(false);

  /* ── Create Record modal – tabs ── */
  const [createTab, setCreateTab] = useLocalState<'form' | 'import' | 'scan'>('form');

  /* ── CSV/JSON import state ── */
  const [csvText, setCsvText] = useLocalState('');
  const [csvPreviewRows, setCsvPreviewRows] = useLocalState<Record<string, string>[]>([]);
  const [csvImportError, setCsvImportError] = useLocalState('');

  /* ── Barcode scan state ── */
  const [barcodeInput, setBarcodeInput] = useLocalState('');
  const [barcodeApplied, setBarcodeApplied] = useLocalState(false);
  const [barcodeDatasetResult, setBarcodeDatasetResult] = useLocalState<PharmaBarcodeEntry | null>(null);
  const [qrCodeData, setQrCodeData] = useLocalState<string>('');

  /* ── Hooks ── */
  const {
    shellConfig, clients, selectedClient, selectedClientId, setSelectedClientId,
    caseRef, setCaseRef, selectedPersonaId, setSelectedPersonaId,
    profileValues, setProfileField, intakeMessage, createClient,
  } = useClientIntake();

  const {
    workspaces, workspace, selectedWorkspaceId, setSelectedWorkspaceId,
    visibleSubSpaces, selectedSubSpaceId, setSelectedSubSpaceId,
    selectedSubSpace, selectedRecords, clientTimeline,
    recordCountBySubSpace, allRecordsForWorkspace, stageDistribution,
    activeForm, lifecycleStages, lifecycleTransitions,
    allowedLifecycleStageNames, defaultLifecycleStageName,
    formValues, message, userProgress, flows,
    setField, setLifecycleStatus, submit, moveRecordToSubSpace, updateRecord, deleteRecord,
  } = useEndUserRuntime(selectedClientId);

  const flowEngine = useFlowEngine();

  /* ── FDA Drug Lookup (DSCSA / Pharma workspaces) ── */
  const [fdaQuery, setFdaQuery] = useLocalState('');
  const [fdaResults, setFdaResults] = useLocalState<FdaDrug[]>([]);
  const [fdaLoading, setFdaLoading] = useLocalState(false);
  const [fdaSelectedDrug, setFdaSelectedDrug] = useLocalState<FdaDrug | null>(null);
  const isPharmWorkspace = /dscsa|serial|pharma|drug|ndc|fda|medication|prescription/i.test(
    (workspace?.name ?? '') + ' ' + (workspace?.rootEntity ?? ''),
  );
  const fmtAmount = isPharmWorkspace ? fmtUnits : fmtMoney;
  React.useEffect(() => {
    if (!fdaQuery || fdaQuery.length < 2 || !isPharmWorkspace) { setFdaResults([]); return; }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setFdaLoading(true);
      const results = await searchFdaDrugs(fdaQuery, 5, controller.signal);
      setFdaResults(results);
      setFdaLoading(false);
    }, 400);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [fdaQuery, isPharmWorkspace]);

  /* ── NEW: Left rail collapse ── */
  const [leftRailCollapsed, setLeftRailCollapsed] = useLocalState(false);

  /* ── Business Function / Object navigation ── */
  const [selectedFunctionId, setSelectedFunctionId] = useLocalState('');
  const [selectedObjectId, setSelectedObjectId] = useLocalState('');
  const businessFunctions = appData.businessFunctions ?? [];
  const selectedFunction = businessFunctions.find((f) => f.id === selectedFunctionId) ?? null;
  const selectedObject = selectedFunction?.objects.find((o) => o.id === selectedObjectId) ?? null;
  const displayedWorkspaces = selectedObject && selectedObject.workspaceIds.length > 0
    ? workspaces.filter((ws) => selectedObject.workspaceIds.includes(ws.id))
    : workspaces;

  /* ── NEW: Search, sort, filter state ── */
  const [searchQuery, setSearchQuery] = useLocalState('');
  const [sortField, setSortField] = useLocalState<'title' | 'status' | 'date' | 'amount'>('date');
  const [sortAsc, setSortAsc] = useLocalState(false);
  const [filterStatus, setFilterStatus] = useLocalState<string>('');

  /* ── Batch record selection ── */
  const [selectedRecordIds, setSelectedRecordIds] = useLocalState<Set<string>>(new Set());
  const [batchMovedStage, setBatchMovedStage] = useLocalState<string | null>(null);
  const toggleRecordSelection = useCallback((id: string) => {
    setSelectedRecordIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);
  const clearSelection = useCallback(() => setSelectedRecordIds(new Set()), []);
  const selectAllRecords = useCallback((recs: RuntimeRecord[]) => {
    setSelectedRecordIds(new Set(recs.map((r) => r.id)));
  }, []);

  /* ── NEW: Recently viewed records ── */
  const [recentlyViewed, setRecentlyViewed] = useLocalState<RuntimeRecord[]>([]);
  const trackRecentView = useCallback((rec: RuntimeRecord) => {
    setRecentlyViewed((prev) => {
      const filtered = prev.filter((r) => r.id !== rec.id);
      return [rec, ...filtered].slice(0, 5);
    });
  }, []);

  /* ── NEW: Saving indicator state ── */
  const [isSaving, setIsSaving] = useLocalState(false);
  const flashSaving = useCallback(() => {
    setIsSaving(true);
    setTimeout(() => setIsSaving(false), 1200);
  }, []);

  /* ── Batch move executor (needs flashSaving, so placed after it) ── */
  const executeBatchMove = useCallback((targetStage: string) => {
    const ids = [...selectedRecordIds];
    if (ids.length === 0) return;
    ids.forEach((id) => {
      const rec = selectedRecords.find((r) => r.id === id);
      updateRecord(id, { status: targetStage });
      if (rec) {
        auditLog?.logEntry({ action: 'transition', entityType: 'record', entityId: id, entityName: rec.title || id, after: { detail: `Bulk move → ${targetStage}` } });
        const updatedRec = { ...rec, status: targetStage };
        if (addNotification) flowEngine.onLifecycleTransition(updatedRec, addNotification);
      }
    });
    addNotification?.({ type: 'system', title: 'Bulk Move Complete', body: `${ids.length} record${ids.length > 1 ? 's' : ''} moved to "${targetStage}".`, severity: 'success' });
    showToast(`${ids.length} record${ids.length > 1 ? 's' : ''} moved to ${targetStage}`, 'success');
    setIsSaving(true);
    setTimeout(() => setIsSaving(false), 1200);
    setBatchMovedStage(targetStage);
    setFilterStatus(targetStage);
    setSelectedRecordIds(new Set());
    setTimeout(() => setBatchMovedStage(null), 3500);
  }, [selectedRecordIds, selectedRecords, updateRecord, auditLog, addNotification, setIsSaving]);

  /* ── NEW: Inject UX animations (once) ── */
  React.useEffect(() => { injectUxAnimations(); }, []);

  /* ── Auto-fill date / datetime fields when create modal opens ── */
  React.useEffect(() => {
    if (!createModalOpen || !activeForm) return;
    const now  = new Date();
    const mm   = String(now.getMonth() + 1).padStart(2, '0');
    const dd   = String(now.getDate()).padStart(2, '0');
    const yyyy = String(now.getFullYear());
    const rawH = now.getHours();
    const hh12 = String(rawH % 12 || 12).padStart(2, '0');
    const min  = String(now.getMinutes()).padStart(2, '0');
    const ampm = rawH >= 12 ? 'PM' : 'AM';
    const dateStr     = `${mm}-${dd}-${yyyy}`;
    const dateTimeStr = `${mm}-${dd}-${yyyy} ${hh12}:${min} ${ampm}`;
    activeForm.fields.forEach((field) => {
      if (formValues[field.id]) return;
      if (field.type === 'datetime') {
        setField(field.id, dateTimeStr);
      } else if (field.type === 'date') {
        const lbl = field.label.toLowerCase();
        if (lbl.includes('received') || lbl.includes('receipt')) setField(field.id, dateStr);
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createModalOpen, activeForm]);

  /* ── Clear batch selection on subspace/workspace change ── */
  React.useEffect(() => {
    setSelectedRecordIds(new Set());
    setBatchMovedStage(null);
  }, [selectedSubSpaceId, selectedWorkspaceId]);

  /* ── NEW: Deep linking – read/write URL hash ── */
  React.useEffect(() => {
    if (Platform.OS !== 'web') return;
    const readHash = () => {
      try {
        const params = new URLSearchParams(window.location.hash.replace('#', ''));
        const cid = params.get('client');
        const wid = params.get('workspace');
        const sid = params.get('subspace');
        const vm = params.get('view');
        if (cid) setSelectedClientId(cid);
        if (wid) setSelectedWorkspaceId(wid);
        if (sid) setSelectedSubSpaceId(sid);
        if (vm === 'board' || vm === 'list') setViewMode(vm);
      } catch { /* ignore parse errors */ }
    };
    readHash();
    window.addEventListener('hashchange', readHash);
    return () => window.removeEventListener('hashchange', readHash);
  }, []);

  React.useEffect(() => {
    if (Platform.OS !== 'web') return;
    const parts: string[] = [];
    if (selectedClientId) parts.push(`client=${selectedClientId}`);
    if (selectedWorkspaceId) parts.push(`workspace=${selectedWorkspaceId}`);
    if (selectedSubSpaceId) parts.push(`subspace=${selectedSubSpaceId}`);
    if (viewMode !== 'list') parts.push(`view=${viewMode}`);
    const hash = parts.length > 0 ? `#${parts.join('&')}` : '';
    if (window.location.hash !== hash) {
      window.history.replaceState(null, '', hash || window.location.pathname);
    }
  }, [selectedClientId, selectedWorkspaceId, selectedSubSpaceId, viewMode]);

  /* ── NEW: Export to CSV helper ── */
  const exportCsv = useCallback(() => {
    if (Platform.OS !== 'web') return;
    const recs = selectedRecords;
    if (recs.length === 0) { showToast('No records to export', 'warning'); return; }
    const headers = ['Title', 'Status', 'Date', 'Amount', 'Tags', ...Object.keys(recs[0]?.data ?? {})];
    const rows = recs.map((r) => [
      `"${(r.title || '').replace(/"/g, '""')}"`, r.status, r.date ?? '', r.amount?.toString() ?? '',
      `"${r.tags.join(', ')}"`,
      ...Object.values(r.data ?? {}).map((v) => `"${String(v).replace(/"/g, '""')}"`),
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedSubSpace?.name ?? 'records'}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Exported ${recs.length} records to CSV`, 'success');
  }, [selectedRecords, selectedSubSpace]);

  /* ── NEW: Export to Print/PDF ── */
  const exportPdf = useCallback(() => {
    if (Platform.OS !== 'web') return;
    const recs = selectedRecords;
    if (recs.length === 0) { showToast('No records to export', 'warning'); return; }
    const html = `<html><head><style>body{font-family:system-ui;padding:20px}table{width:100%;border-collapse:collapse;margin-top:12px}th,td{border:1px solid #ddd;padding:8px;text-align:left;font-size:12px}th{background:#f4f0ff}</style></head><body><h2>${selectedSubSpace?.name ?? 'Records'}</h2><table><tr><th>Title</th><th>Status</th><th>Date</th><th>Amount</th><th>Tags</th></tr>${recs.map((r) => `<tr><td>${r.title}</td><td>${r.status}</td><td>${r.date ?? ''}</td><td>${r.amount ?? ''}</td><td>${r.tags.join(', ')}</td></tr>`).join('')}</table></body></html>`;
    const w = window.open('', '_blank');
    if (w) { w.document.write(html); w.document.close(); w.print(); }
  }, [selectedRecords, selectedSubSpace]);

  /* ── Derived values ── */
  const subjectSingular = shellConfig.subjectSingular;
  const subjectPlural = shellConfig.subjectPlural;
  const subSpaceLabel = shellConfig.subSpaceLabel;
  const workspaceLabelSingular = shellConfig.workspaceLabel ?? 'Workspace';
  const workspaceLabelPlural = workspaceLabelSingular.trim().replace(/s$/i, '') + 's'; // e.g. 'Case Workspace' → 'Case Workspaces'
  const subSpaceLabelPlural = subSpaceLabel.trim().replace(/s$/i, '') + 's'; // e.g. 'Case SubSpace' → 'Case SubSpaces'
  const collectionLabel = shellConfig.collectionLabel ?? 'Collection';
  const collectionLabelPlural = shellConfig.collectionLabelPlural ?? 'Collections';
  // Use subjectPlural (e.g. "Clients", "Patients") as the rail section noun — it's the most specific human term
  const clientSectionLabel = shellConfig.subjectPlural ?? collectionLabelPlural;
  const clientSectionLabelSingle = shellConfig.subjectSingular ?? collectionLabel;
  const functionLabel = shellConfig.functionLabel ?? 'Department';
  const functionLabelPlural = shellConfig.functionLabelPlural ?? 'Departments';
  const objectLabel = shellConfig.objectLabel ?? 'Registry';
  const objectLabelPlural = shellConfig.objectLabelPlural ?? 'Registries';
  const accentColor = accentPalette?.accent ? normalizeHex(accentPalette.accent, '#8C5BF5') : '#8C5BF5';
  const baseSurface = mode === 'day' ? '#FFFFFF' : '#1A1230';
  const accentTextColor = getContrastTextColor(accentColor);
  const txtColor = getContrastTextColor(baseSurface);
  const dimColor = withAlpha(txtColor, 'AA');
  const accentSoft = withAlpha(accentColor, '33');
  const acRgba = (a: number) => {
    const hex = accentColor.replace('#', '');
    const r = parseInt(hex.slice(0, 2), 16); const g2 = parseInt(hex.slice(2, 4), 16); const b = parseInt(hex.slice(4, 6), 16);
    return `rgba(${r},${g2},${b},${a})`;
  };
  const subtleBg = mode === 'day' ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.04)';
  const subtleBorder = mode === 'day' ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)';
  const isCompact = windowWidth < 900;
  const g = (opacity?: number) => glass(opacity, mode);

  const exceptionCount = stageDistribution['Exception Review'] ?? 0;
  const totalRecords = allRecordsForWorkspace.length;
  const wsFlows = flows.filter((f) => f.workspaceId === selectedWorkspaceId);

  /* ── NEW: Filtered & sorted records ── */
  const filteredRecords = useMemo(() => {
    let recs = selectedRecords;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      recs = recs.filter((r) => r.title.toLowerCase().includes(q) || r.status.toLowerCase().includes(q) || r.tags.some((t) => t.toLowerCase().includes(q)));
    }
    if (filterStatus) {
      recs = recs.filter((r) => r.status === filterStatus);
    }
    const sorted = [...recs];
    sorted.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'title') cmp = (a.title || '').localeCompare(b.title || '');
      else if (sortField === 'status') cmp = (a.status || '').localeCompare(b.status || '');
      else if (sortField === 'date') cmp = String(a.date || '').localeCompare(String(b.date || ''));
      else if (sortField === 'amount') cmp = (a.amount ?? 0) - (b.amount ?? 0);
      return sortAsc ? cmp : -cmp;
    });
    return sorted;
  }, [selectedRecords, searchQuery, filterStatus, sortField, sortAsc]);

  /* ── NEW: Sparkline data (records per stage, last 7 "time buckets") ── */
  const sparkData = useMemo(() => {
    const recs = allRecordsForWorkspace;
    if (recs.length < 2) return [0, 0];
    const dates = recs.map((r) => r.date || '').filter(Boolean).sort();
    const buckets = 7;
    const counts: number[] = Array(buckets).fill(0);
    recs.forEach((_, i) => { counts[Math.min(Math.floor((i / recs.length) * buckets), buckets - 1)]++; });
    return counts;
  }, [allRecordsForWorkspace]);

  /* ── Merged Activity Timeline (records + audit events) ── */
  const actionLabel: Record<string, string> = { create: 'Created', update: 'Updated', delete: 'Deleted', transition: 'Transitioned', publish: 'Published', import: 'Imported', export: 'Exported' };
  const mergedTimeline = useMemo(() => {
    const recordEntries = clientTimeline.map((r) => ({
      id: r.id, title: r.title, status: r.status, date: r.date,
      workspaceName: r.workspaceName, subSpaceName: r.subSpaceName,
      amount: r.amount as number | undefined, auditDetail: undefined as string | undefined,
    }));
    const auditEntries = (auditLog?.entries ?? [])
      .filter((e) => e.entityType === 'record' || e.entityType === 'client')
      .map((e) => ({
        id: `audit-${e.id}`, title: `${actionLabel[e.action] ?? e.action} ${e.entityName}`,
        status: e.action === 'delete' ? 'Deleted' : e.action === 'transition' ? 'Transitioned' : e.action,
        date: e.timestamp, workspaceName: '', subSpaceName: e.entityType,
        amount: undefined as number | undefined,
        auditDetail: (e.after as any)?.detail as string | undefined,
      }));
    return [...recordEntries, ...auditEntries]
      .sort((a, b) => String(b.date).localeCompare(String(a.date)))
      .slice(0, 20);
  }, [clientTimeline, auditLog?.entries]);

  /* ── Accent scrollbar ── */
  React.useEffect(() => {
    if (Platform.OS !== 'web') return;
    const id = 'enduser-scrollbar-override';
    let el = document.getElementById(id) as HTMLStyleElement | null;
    if (!el) { el = document.createElement('style'); el.id = id; document.head.appendChild(el); }
    el.textContent = `[data-enduser-scroll] *::-webkit-scrollbar-thumb,[data-enduser-scroll]::-webkit-scrollbar-thumb{background:${accentColor}55;border-radius:999px}[data-enduser-scroll] *::-webkit-scrollbar-thumb:hover{background:${accentColor}88}[data-enduser-scroll] *{scrollbar-color:${accentColor}55 rgba(255,255,255,0.03)}`;
    return () => { el?.remove(); };
  }, [accentColor]);

  /* ── Stage chip helper ── */
  const stageStyleMap: Record<string, { chip: any; text: any }> = {
    Received: { chip: styles.stageReceived, text: styles.stageReceivedText },
    Triage: { chip: styles.stageTriage, text: styles.stageTriageText },
    Repair: { chip: styles.stageRepair, text: styles.stageRepairText },
    QC: { chip: styles.stageQC, text: styles.stageQCText },
    Shipped: { chip: styles.stageShipped, text: styles.stageShippedText },
    Risk: { chip: styles.stageRisk, text: styles.stageRiskText },
    High: { chip: styles.stageRisk, text: styles.stageRiskText },
    Critical: { chip: styles.stageRisk, text: styles.stageRiskText },
    Active: { chip: styles.stageActive, text: styles.stageActiveText },
    Serialized: { chip: styles.stageReceived, text: styles.stageReceivedText },
    'Shipped to Distributor': { chip: styles.stageShipped, text: styles.stageShippedText },
    'Received by Distributor': { chip: styles.stageQC, text: styles.stageQCText },
    'Shipped to Pharmacy': { chip: styles.stageShipped, text: styles.stageShippedText },
    'Received by Pharmacy': { chip: styles.stageActive, text: styles.stageActiveText },
    Dispensed: { chip: styles.stageTriage, text: styles.stageTriageText },
    'Exception Review': { chip: styles.stageRisk, text: styles.stageRiskText },
    Record: { chip: styles.stageReceived, text: styles.stageReceivedText },
  };
  const chip = (stage: string) => {
    const m = stageStyleMap[stage];
    return (
      <View style={[styles.stageChip, m?.chip ?? styles.stageReceived]}>
        <Text style={[styles.stageChipText, m?.text ?? styles.stageReceivedText]}>{stage}</Text>
      </View>
    );
  };

  /* ── Item title helper (industry-agnostic) ── */
  const getItemTitle = (c: (typeof clients)[number]) => {
    // Build title from profileData intake fields dynamically
    const fieldValues = shellConfig.intakeFields
      .map((f) => c.profileData?.[f.id]?.trim())
      .filter(Boolean);
    if (fieldValues.length >= 2) return `${fieldValues[0]} • ${fieldValues[1]}`;
    if (fieldValues.length === 1) return fieldValues[0]!;
    // Fallback to firstName/lastName or subjectSingular
    if (c.firstName && c.lastName) return `${c.firstName} ${c.lastName}`;
    return c.caseRef || shellConfig.subjectSingular;
  };

  /* ── Walkthrough state ── */
  const [walkthroughOpen, setWalkthroughOpen] = React.useState(false);
  const [walkthroughStep, setWalkthroughStep] = React.useState(0);
  const totalWalkthroughSteps = dscsaCrudWalkthroughSteps.length;
  const currentWalkthrough = dscsaCrudWalkthroughSteps[walkthroughStep];
  const walkthroughProgress = ((walkthroughStep + 1) / totalWalkthroughSteps) * 100;

  /* ── Spotlight positioning (web only) ── */
  const [spotlightRect, setSpotlightRect] = React.useState<{ top: number; left: number; width: number; height: number } | null>(null);
  const spotlightTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const measureTarget = React.useCallback(() => {
    if (!walkthroughOpen || Platform.OS !== 'web') return;
    const step = dscsaCrudWalkthroughSteps[walkthroughStep];
    if (!step?.targetId) { setSpotlightRect(null); return; }
    const el = document.getElementById(step.targetId);
    if (!el) { setSpotlightRect(null); return; }
    const rect = el.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      setSpotlightRect({ top: rect.top, left: rect.left, width: rect.width, height: rect.height });
    } else {
      setSpotlightRect(null);
    }
  }, [walkthroughOpen, walkthroughStep]);

  React.useEffect(() => {
    if (!walkthroughOpen || Platform.OS !== 'web') return;
    let cancelled = false;
    let retries = 0;
    const poll = () => {
      if (cancelled) return;
      const step = dscsaCrudWalkthroughSteps[walkthroughStep];
      if (!step?.targetId) { setSpotlightRect(null); return; }
      const el = document.getElementById(step.targetId);
      if (el) {
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          setSpotlightRect({ top: rect.top, left: rect.left, width: rect.width, height: rect.height });
          return;
        }
      }
      if (++retries < 30) requestAnimationFrame(poll);
      else setSpotlightRect(null);
    };
    /* Wait 350ms for React state flush + DOM update from nav changes, then poll */
    spotlightTimerRef.current = setTimeout(() => requestAnimationFrame(poll), 350);
    window.addEventListener('scroll', measureTarget, true);
    window.addEventListener('resize', measureTarget);
    return () => {
      cancelled = true;
      if (spotlightTimerRef.current) clearTimeout(spotlightTimerRef.current);
      window.removeEventListener('scroll', measureTarget, true);
      window.removeEventListener('resize', measureTarget);
    };
  }, [walkthroughOpen, walkthroughStep, measureTarget]);

  /* ── Auto-navigation per step ── */
  const goToEndUserStep = React.useCallback((index: number) => {
    const nextIndex = Math.max(0, Math.min(index, dscsaCrudWalkthroughSteps.length - 1));
    const step = dscsaCrudWalkthroughSteps[nextIndex];
    setWalkthroughStep(nextIndex);
    /* Ensure left rail is expanded so spotlight targets are visible */
    setLeftRailCollapsed(false);

    const nav = step.nav;
    if (!nav) return;

    if (nav.clientIndex !== undefined && clients[nav.clientIndex]) {
      setSelectedClientId(clients[nav.clientIndex].id);
    }
    if (nav.workspaceIndex !== undefined && workspaces[nav.workspaceIndex]) {
      setSelectedWorkspaceId(workspaces[nav.workspaceIndex].id);
    }
    if (nav.clearSubSpace) {
      setSelectedSubSpaceId('');
    } else if (nav.subSpaceIndex !== undefined) {
      const ws = workspaces[nav.workspaceIndex ?? 0];
      const subs = ws?.subSpaces ?? [];
      if (subs[nav.subSpaceIndex]) {
        setSelectedSubSpaceId(subs[nav.subSpaceIndex].id);
      }
    }
    if (nav.viewMode) {
      setViewMode(nav.viewMode);
    }
  }, [clients, workspaces, setSelectedClientId, setSelectedWorkspaceId, setSelectedSubSpaceId, setViewMode]);

  /* ── Empty state — Tenant onboarding guide ── */
  if (!workspace) {
    return <TenantOnboardingGuide mode={mode} styles={styles} />;
  }

  /* ────────────────────────────────────────────────────
     RENDER — single viewport, 3-column layout
     Left Rail  |  Center Stage  |  (modals on demand)
     ──────────────────────────────────────────────────── */
  return (
    <View
      style={{ flex: 1, height: '100%' as any, overflow: 'hidden' as any }}
      {...(Platform.OS === 'web' ? { dataSet: { enduserScroll: '' } } : {})}
    >
      {/* Guided-mode banner (top, slim) */}
      {guidedMode && (
        <View style={{ paddingHorizontal: 14, paddingTop: 8, gap: 4 }}>
          <ProcessStepper title="End User Process" steps={endUserSteps} activeIndex={userProgress} />
          <HintStrip steps={endUserSteps} onGuide={onGuide} />
        </View>
      )}

      {/* ── Main 3-column shell ── */}
      <View style={{ flex: 1, flexDirection: isCompact ? 'column' : 'row', padding: 10, gap: 10, overflow: 'hidden' as any }}>

        {/* ═══════════════ LEFT RAIL ═══════════════ */}
        <View style={[g(), { width: isCompact ? '100%' as any : leftRailCollapsed ? 52 : 240, padding: leftRailCollapsed ? 6 : 10, gap: 6, overflow: 'hidden' as any, ...(Platform.OS === 'web' ? { transition: 'width 0.25s ease' } as any : {}) }]}>
          {/* Collapse toggle */}
          {!isCompact && (
            <Pressable onPress={() => setLeftRailCollapsed((c) => !c)} style={{ alignSelf: leftRailCollapsed ? 'center' as any : 'flex-end' as any, padding: 4, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.06)' }}>
              <Text style={{ fontSize: 12, color: dimColor }}>{leftRailCollapsed ? '›' : '‹'}</Text>
            </Pressable>
          )}

          {/* Collapsed mini-rail */}
          {leftRailCollapsed && !isCompact ? (
            <View style={{ alignItems: 'center' as any, gap: 8, flex: 1 }}>
              {clients.slice(0, 3).map((c) => {
                const sel = selectedClientId === c.id;
                return (
                  <Pressable key={c.id} onPress={() => setSelectedClientId(c.id)} style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: sel ? accentSoft : 'rgba(255,255,255,0.06)', alignItems: 'center' as any, justifyContent: 'center' as any, borderWidth: sel ? 1 : 0, borderColor: accentColor }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: sel ? '#FFF' : dimColor }}>{(getItemTitle(c))[0]}</Text>
                  </Pressable>
                );
              })}
              <View style={{ height: 1, width: '80%' as any, backgroundColor: 'rgba(255,255,255,0.06)' }} />
              {displayedWorkspaces.slice(0, 4).map((ws) => {
                const sel = selectedWorkspaceId === ws.id;
                return (
                  <Pressable key={ws.id} onPress={() => setSelectedWorkspaceId(ws.id)} style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: sel ? accentSoft : 'rgba(255,255,255,0.06)', alignItems: 'center' as any, justifyContent: 'center' as any, borderLeftWidth: sel ? 3 : 0, borderLeftColor: accentColor }}>
                    <Text style={{ fontSize: 9, fontWeight: '700', color: sel ? '#FFF' : dimColor }}>{(workspaceStepTitles[ws.id] ?? ws.name).slice(0, 2)}</Text>
                  </Pressable>
                );
              })}
            </View>
          ) : (<>
          {businessFunctions.length > 0 && (
            <View style={{ marginBottom: 6 }}>
              <Text style={{ fontSize: 10, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' as any, color: accentColor }}>
                {appData.shellConfig.functionLabelPlural?.toUpperCase() ?? 'DEPARTMENTS'}
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 3 }}>
                <View style={{ flexDirection: 'row', gap: 4, paddingVertical: 2 }}>
                  <Pressable
                    onPress={() => { setSelectedFunctionId(''); setSelectedObjectId(''); }}
                    style={{ paddingVertical: 4, paddingHorizontal: 8, borderRadius: 8, backgroundColor: !selectedFunctionId ? accentColor : 'rgba(255,255,255,0.06)' }}
                  >
                    <Text style={{ fontSize: 10, fontWeight: '700', color: !selectedFunctionId ? accentTextColor : dimColor }}>All</Text>
                  </Pressable>
                  {businessFunctions.sort((a, b) => a.order - b.order).map((fn) => {
                    const isSel = selectedFunctionId === fn.id;
                    return (
                      <Pressable
                        key={fn.id}
                        onPress={() => { setSelectedFunctionId(fn.id); setSelectedObjectId(''); }}
                        style={{ paddingVertical: 4, paddingHorizontal: 8, borderRadius: 8, flexDirection: 'row', gap: 4, alignItems: 'center' as any, backgroundColor: isSel ? accentSoft : 'rgba(255,255,255,0.06)', borderLeftWidth: 2, borderLeftColor: isSel ? (fn.color ?? accentColor) : 'transparent' }}
                      >
                        {!!fn.icon && <Text style={{ fontSize: 11 }}>{fn.icon}</Text>}
                        <Text style={{ fontSize: 10, fontWeight: '700', color: isSel ? '#FFFFFF' : dimColor }} numberOfLines={1}>{fn.name}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </ScrollView>
              {selectedFunction && selectedFunction.objects.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 3 }}>
                  <View style={{ flexDirection: 'row', gap: 4, paddingVertical: 2 }}>
                    {selectedFunction.objects.map((obj) => {
                      const isSel = selectedObjectId === obj.id;
                      return (
                        <Pressable
                          key={obj.id}
                          onPress={() => setSelectedObjectId(isSel ? '' : obj.id)}
                          style={{ paddingVertical: 3, paddingHorizontal: 7, borderRadius: 8, flexDirection: 'row', gap: 3, alignItems: 'center' as any, backgroundColor: isSel ? accentColor : 'rgba(255,255,255,0.06)', borderWidth: isSel ? 1 : 0, borderColor: accentColor }}
                        >
                          {!!obj.icon && <Text style={{ fontSize: 10 }}>{obj.icon}</Text>}
                          <Text style={{ fontSize: 10, fontWeight: '700', color: isSel ? accentTextColor : dimColor }} numberOfLines={1}>{obj.name}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </ScrollView>
              )}
            </View>
          )}

          {/* Item selector (compact) */}
          <Text style={{ fontSize: 10, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' as any, color: accentColor }}>{clientSectionLabel.toUpperCase()}</Text>
          <ScrollView nativeID="eu-batch-list" style={{ maxHeight: isCompact ? 80 : 140 }} showsVerticalScrollIndicator={false}>
            {clients.length === 0 && <Text style={{ fontSize: 11, color: dimColor }}>No {clientSectionLabel.toLowerCase()} yet</Text>}
            {clients.map((c) => {
              const sel = selectedClientId === c.id;
              const initials = getItemTitle(c).split(' ').slice(0, 2).map((s: string) => s[0] ?? '').join('').toUpperCase().slice(0, 2);
              return (
                <Pressable key={c.id} onPress={() => setSelectedClientId(c.id)}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 6, paddingHorizontal: 8, borderRadius: 8, marginBottom: 3, backgroundColor: sel ? accentSoft : 'transparent', borderWidth: sel ? 1 : 0, borderColor: sel ? accentColor : 'transparent' }}>
                  <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: sel ? accentColor : `${accentColor}2A`, alignItems: 'center' as any, justifyContent: 'center' as any, flexShrink: 0 }}>
                    <Text style={{ fontSize: 9, fontWeight: '800', color: sel ? accentTextColor : accentColor }}>{initials}</Text>
                  </View>
                  <Text style={{ fontSize: 12, fontWeight: sel ? '700' : '500', color: sel ? '#FFFFFF' : dimColor, flex: 1 }} numberOfLines={1}>{getItemTitle(c)}</Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <Pressable nativeID="eu-new-batch" onPress={() => setIntakeModalOpen(true)} style={{ paddingVertical: 7, paddingHorizontal: 10, borderRadius: 10, backgroundColor: accentColor, alignItems: 'center' as any }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: accentTextColor }}>+ New {clientSectionLabelSingle}</Text>
          </Pressable>

          <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginVertical: 4 }} />

          {/* Workspace tabs */}
          <Text style={{ fontSize: 10, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' as any, color: accentColor }}>{workspaceLabelPlural}</Text>
          <ScrollView nativeID="eu-workspace-list" style={{ maxHeight: isCompact ? 100 : 160 }} showsVerticalScrollIndicator={false}>
            {displayedWorkspaces.map((ws) => {
              const sel = selectedWorkspaceId === ws.id;
              const fCount = flows.filter((f) => f.workspaceId === ws.id && f.status === 'published').length;
              const ssCount = ws.subSpaces?.length ?? 0;
              return (
                <Pressable key={ws.id} onPress={() => setSelectedWorkspaceId(ws.id)}
                  style={{ paddingVertical: 7, paddingHorizontal: 8, borderRadius: 8, marginBottom: 3, backgroundColor: sel ? accentSoft : 'transparent', borderLeftWidth: sel ? 3 : 0, borderLeftColor: accentColor }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' as any }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: sel ? '#FFFFFF' : dimColor, flex: 1 }} numberOfLines={1}>
                      {workspaceStepTitles[ws.id] ?? ws.name}
                    </Text>
                    {ssCount > 0 && (
                      <View style={{ minWidth: 20, height: 16, borderRadius: 8, backgroundColor: sel ? accentColor : 'rgba(255,255,255,0.08)', alignItems: 'center' as any, justifyContent: 'center' as any, paddingHorizontal: 4, marginLeft: 4 }}>
                        <Text style={{ fontSize: 8, fontWeight: '700', color: sel ? accentTextColor : dimColor }}>{ssCount}</Text>
                      </View>
                    )}
                  </View>
                  {!!ws.rootEntity && <Text style={{ fontSize: 9, color: `${accentColor}99`, marginTop: 1 }} numberOfLines={1}>↳ {ws.rootEntity}</Text>}
                  {fCount > 0 && <Text style={{ fontSize: 9, color: '#86EFAC', marginTop: 1 }}>⚡ {fCount} flow{fCount > 1 ? 's' : ''}</Text>}
                </Pressable>
              );
            })}
          </ScrollView>

          <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginVertical: 4 }} />

          {/* SubSpace list (clickable) */}
          <Text style={{ fontSize: 10, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' as any, color: accentColor }}>{subSpaceLabelPlural}</Text>
          <ScrollView nativeID="eu-subspace-list" style={{ maxHeight: isCompact ? 100 : 160 }} showsVerticalScrollIndicator={false}>
            {visibleSubSpaces.length === 0 && <Text style={{ fontSize: 11, color: dimColor }}>No {subSpaceLabel.toLowerCase()} visible</Text>}
            {visibleSubSpaces.map((ss, ssIdx) => {
              const sel = selectedSubSpaceId === ss.id;
              const cnt = recordCountBySubSpace[ss.id] ?? 0;
              return (
                <Pressable key={ss.id} onPress={() => setSelectedSubSpaceId(ss.id)}
                  style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 8, borderRadius: 8, marginBottom: 2, backgroundColor: sel ? accentSoft : 'transparent', borderWidth: sel ? 1 : 0, borderColor: sel ? accentColor : 'transparent' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 }}>
                    {workspace?.pipelineEnabled && (
                      <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: sel ? accentColor : 'rgba(140,91,245,0.22)', alignItems: 'center' as any, justifyContent: 'center' as any }}>
                        <Text style={{ fontSize: 8, fontWeight: '800', color: sel ? accentTextColor : '#C4B5FD' }}>{ssIdx + 1}</Text>
                      </View>
                    )}
                    <Text style={{ fontSize: 11, fontWeight: sel ? '700' : '500', color: sel ? '#FFFFFF' : dimColor, flex: 1 }} numberOfLines={1}>{ss.name}</Text>
                  </View>
                  <View style={{ minWidth: 22, height: 18, borderRadius: 9, backgroundColor: sel ? accentColor : 'rgba(255,255,255,0.08)', alignItems: 'center' as any, justifyContent: 'center' as any, paddingHorizontal: 5 }}>
                    <Text style={{ fontSize: 9, fontWeight: '700', color: sel ? accentTextColor : dimColor }}>{cnt}</Text>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Quick actions at bottom */}
          <View style={{ gap: 4, paddingTop: 4 }}>
            {/* Inline recent activity strip — 1-2 most recent items for quick context */}
            {mergedTimeline.length > 0 && (
              <View style={{ paddingVertical: 6, paddingHorizontal: 8, borderRadius: 8, backgroundColor: mode === 'night' ? 'rgba(196,181,253,0.05)' : 'rgba(100,80,180,0.05)', borderLeftWidth: 2, borderLeftColor: `${accentColor}55` }}>
                <Text style={{ fontSize: 9, fontWeight: '700', letterSpacing: 0.8, color: accentColor, marginBottom: 3 }}>RECENT ACTIVITY</Text>
                {mergedTimeline.slice(0, 2).map((item) => (
                  <View key={item.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 2 }}>
                    <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: accentColor }} />
                    <Text style={{ fontSize: 9, color: dimColor, flex: 1 }} numberOfLines={1}>{item.title}</Text>
                    {!!item.date && <Text style={{ fontSize: 8, color: `${dimColor}88` }}>{formatDate(item.date)}</Text>}
                  </View>
                ))}
                <Pressable onPress={() => setTimelineModalOpen(true)} style={{ marginTop: 3 }}>
                  <Text style={{ fontSize: 9, fontWeight: '700', color: accentColor }}>View all →</Text>
                </Pressable>
              </View>
            )}
            {wsFlows.length > 0 && (
              <Pressable nativeID="eu-flow-button" onPress={() => setFlowsModalOpen(true)} style={{ paddingVertical: 6, paddingHorizontal: 8, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(134,239,172,0.3)', backgroundColor: 'rgba(134,239,172,0.08)' }}>
                <Text style={{ fontSize: 10, fontWeight: '700', color: '#86EFAC' }}>⚡ {wsFlows.length} Signal Flow{wsFlows.length > 1 ? 's' : ''}</Text>
              </Pressable>
            )}
            <Pressable nativeID="eu-timeline-button" onPress={() => setTimelineModalOpen(true)} style={{ paddingVertical: 6, paddingHorizontal: 8, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(196,181,253,0.3)', backgroundColor: 'rgba(196,181,253,0.06)' }}>
              <Text style={{ fontSize: 10, fontWeight: '700', color: '#C4B5FD' }}>◷ Full Activity Timeline</Text>
            </Pressable>
          </View>
          </>)}
        </View>

        {/* ═══════════════ CENTER STAGE ═══════════════ */}
        <View style={[g(), { flex: 1, overflow: 'hidden' as any }]}>
          {/* ── Breadcrumb + Saving indicator ── */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingTop: 6 }}>
            <Breadcrumb
              items={[
                ...(selectedClient ? [{ label: getItemTitle(selectedClient), key: 'client' }] : [{ label: `All ${collectionLabelPlural}`, key: 'client' }]),
                ...(workspace ? [{ label: workspaceStepTitles[workspace.id] ?? workspace.name, key: 'workspace' }] : []),
                ...(selectedSubSpace ? [{ label: selectedSubSpace.name, key: 'subspace' }] : []),
              ]}
              onNavigate={(key) => {
                if (key === 'client') { setSelectedSubSpaceId(''); }
                if (key === 'workspace') { setSelectedSubSpaceId(''); }
              }}
            />
            <SavingIndicator saving={isSaving} />
          </View>

          {/* ── KPI Strip with Sparklines ── */}
          <View nativeID="eu-kpi-strip" style={{ flexDirection: 'row', gap: 8, padding: 12, borderBottomWidth: 1, borderBottomColor: mode === 'day' ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)', flexWrap: 'wrap' }}
            {...(Platform.OS === 'web' ? { dataSet: { animateStagger: '' } } : {})}
          >
            {[
              { label: objectLabelPlural, value: totalRecords, color: txtColor },
              { label: lifecycleStages.length > 0 ? 'Life Stages' : 'Stages', value: lifecycleStages.length > 0 ? lifecycleStages.length : Object.keys(stageDistribution).length, color: mode === 'day' ? '#16A34A' : '#86EFAC' },
              { label: subSpaceLabelPlural, value: visibleSubSpaces.length, color: mode === 'day' ? '#7C3AED' : '#C4B5FD' },
              { label: exceptionCount > 0 ? 'Alerts' : 'On Track', value: exceptionCount > 0 ? exceptionCount : allRecordsForWorkspace.filter((r) => r.status !== 'Exception Review').length, color: exceptionCount > 0 ? '#EF4444' : (mode === 'day' ? '#16A34A' : '#86EFAC') },
            ].map((kpi) => (
              <View key={kpi.label} style={{ flex: 1, minWidth: 80, alignItems: 'center' as any, padding: 8, borderRadius: 10, backgroundColor: mode === 'day' ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.04)' }}
                {...(Platform.OS === 'web' ? { dataSet: { kpiAnimate: '' } } : {})}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={{ fontSize: 22, fontWeight: '800', color: kpi.color, fontVariant: ['tabular-nums'] as any }}>{kpi.value}</Text>
                  {kpi.label === 'Records' && sparkData.length > 1 && <Sparkline data={sparkData} width={50} height={20} color={accentColor} />}
                </View>
                <Text style={{ fontSize: 9, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase' as any, color: dimColor, marginTop: 2 }}>{kpi.label}</Text>
              </View>
            ))}
            {/* Stage distribution pills inline */}
            {Object.entries(stageDistribution).length > 0 && (
              <View style={{ width: '100%' as any, flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                {Object.entries(stageDistribution).map(([stage, count]) => {
                  const isHighlighted = stage === batchMovedStage;
                  return (
                    <View key={`sd-${stage}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 3, ...(isHighlighted ? { borderRadius: 10, borderWidth: 1.5, borderColor: accentColor, paddingHorizontal: 4, paddingVertical: 2, backgroundColor: accentSoft } as any : {}) }}>
                      {chip(stage)}
                      <Text style={{ fontSize: 10, color: isHighlighted ? accentColor : dimColor, fontWeight: isHighlighted ? '700' : '400' }}>{count}</Text>
                      {isHighlighted && <Text style={{ fontSize: 9, color: accentColor, fontWeight: '700' }}>←</Text>}
                    </View>
                  );
                })}
              </View>
            )}
          </View>

          {/* ── Workspace Banner (overview header) ── */}
          {!selectedSubSpaceId && workspace && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, paddingTop: 10, paddingBottom: 4 }}>
              {workspace.icon ? (
                <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: `${accentColor}22`, alignItems: 'center' as any, justifyContent: 'center' as any }}>
                  <Text style={{ fontSize: 22 }}>{workspace.icon}</Text>
                </View>
              ) : (
                <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: `${accentColor}22`, alignItems: 'center' as any, justifyContent: 'center' as any }}>
                  <Text style={{ fontSize: 18, fontWeight: '800', color: accentColor }}>{(workspaceStepTitles[workspace.id] ?? workspace.name).slice(0, 2)}</Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: '800', color: txtColor }}>{workspaceStepTitles[workspace.id] ?? workspace.name}</Text>
                {workspace.description ? (
                  <Text style={{ fontSize: 11, color: dimColor, marginTop: 1 }} numberOfLines={2}>{workspace.description}</Text>
                ) : workspace.rootEntity ? (
                  <Text style={{ fontSize: 11, color: dimColor, marginTop: 1 }}>{workspace.rootEntity} workspace · {visibleSubSpaces.length} {subSpaceLabelPlural.toLowerCase()}</Text>
                ) : null}
              </View>
              {selectedClient && (
                <View style={{ alignItems: 'flex-end' as any }}>
                  <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: accentColor, alignItems: 'center' as any, justifyContent: 'center' as any }}>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: accentTextColor }}>{getItemTitle(selectedClient).split(' ').slice(0, 2).map((s: string) => s[0] ?? '').join('').toUpperCase().slice(0, 2)}</Text>
                  </View>
                  <Text style={{ fontSize: 9, color: dimColor, marginTop: 2 }} numberOfLines={1}>{getItemTitle(selectedClient)}</Text>
                </View>
              )}
            </View>
          )}

          {/* ── Recently Viewed (overview only) ── */}
          {!selectedSubSpaceId && recentlyViewed.length > 0 && (
            <View style={{ paddingHorizontal: 12, paddingTop: 8 }}>
              <Text style={{ fontSize: 10, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' as any, color: accentColor, marginBottom: 6 }}>RECENTLY VIEWED</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {recentlyViewed.map((rec) => (
                  <Pressable key={`rv-${rec.id}`} onPress={() => { setSelectedDrawerRecord(rec); setRecordDrawerVisible(true); }}
                    style={{ ...g(0.04), padding: 10, width: 180, gap: 2 }}
                    {...(Platform.OS === 'web' ? { dataSet: { scaleIn: '' } } : {})}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '700', color: txtColor }} numberOfLines={1}>{rec.title}</Text>
                    <Text style={{ fontSize: 9, color: dimColor }}>{rec.status} • {formatDate(rec.date)}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}

          {/* ── Pipeline Flow Strip (when pipeline enabled) ── */}
          {!selectedSubSpaceId && workspace?.pipelineEnabled && visibleSubSpaces.length > 1 && (
            <View style={{ paddingHorizontal: 12, paddingTop: 10, paddingBottom: 2 }}>
              <Text style={{ fontSize: 10, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' as any, color: accentColor, marginBottom: 6 }}>PIPELINE FLOW</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ alignItems: 'center', gap: 0, paddingBottom: 4 }}>
                {visibleSubSpaces.map((ss, idx) => {
                  const cnt = recordCountBySubSpace[ss.id] ?? 0;
                  const isLast = idx === visibleSubSpaces.length - 1;
                  return (
                    <React.Fragment key={`pf-${ss.id}`}>
                      <Pressable
                        onPress={() => setSelectedSubSpaceId(ss.id)}
                        style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, backgroundColor: acRgba(0.12), borderWidth: 1, borderColor: acRgba(0.28), gap: 6 }}
                        {...(Platform.OS === 'web' ? { dataSet: { scaleIn: '' } } : {})}
                      >
                        <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: acRgba(0.30), alignItems: 'center' as any, justifyContent: 'center' as any }}>
                          <Text style={{ fontSize: 9, fontWeight: '800', color: '#E0D4FF' }}>{idx + 1}</Text>
                        </View>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: mode === 'night' ? '#E0D4FF' : txtColor }} numberOfLines={1}>{ss.name}</Text>
                        <View style={{ paddingHorizontal: 5, paddingVertical: 1, borderRadius: 8, backgroundColor: acRgba(0.22) }}>
                          <Text style={{ fontSize: 9, fontWeight: '700', color: mode === 'night' ? '#C4B5FD' : accentColor }}>{cnt}</Text>
                        </View>
                      </Pressable>
                      {!isLast && (
                        <Text style={{ fontSize: 18, color: accentColor, fontWeight: '800', marginHorizontal: 4 }}>→</Text>
                      )}
                    </React.Fragment>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* ── SubSpace Cards Grid (when no subspace selected or overview) ── */}
          {!selectedSubSpaceId && visibleSubSpaces.length > 0 && (
            <ScrollView nativeID="eu-subspace-cards" style={{ flex: 1, padding: 12 }} contentContainerStyle={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}
              {...(Platform.OS === 'web' ? { dataSet: { animateStagger: '' } } : {})}
            >
              {visibleSubSpaces.map((ss) => {
                const cnt = recordCountBySubSpace[ss.id] ?? 0;
                const ssRecs = allRecordsForWorkspace.filter((r) => r.subSpaceId === ss.id);
                const latestStatus = ssRecs[ssRecs.length - 1]?.status ?? '—';
                // Stage distribution for this subspace
                const ssStages = ssRecs.reduce((acc, r) => { acc[r.status] = (acc[r.status] ?? 0) + 1; return acc; }, {} as Record<string, number>);
                const ssStageEntries = Object.entries(ssStages).slice(0, 3);
                // Icon: use ss.icon, or derive a sensible emoji from name
                const ssIcon = (ss as any).icon ?? (() => {
                  const n = ss.name.toLowerCase();
                  if (/case|matter|claim/.test(n)) return '⚖️';
                  if (/doc|file|form/.test(n)) return '📄';
                  if (/dead|court|date|hear/.test(n)) return '📅';
                  if (/bill|invoice|fee|pay/.test(n)) return '💰';
                  if (/contact|client|person/.test(n)) return '👤';
                  if (/task|todo|action/.test(n)) return '✅';
                  if (/note|memo|log/.test(n)) return '📝';
                  if (/drug|med|ndc|rx|pharma/.test(n)) return '💊';
                  if (/ship|dispatch|deliver/.test(n)) return '🚚';
                  if (/device|hardware|asset/.test(n)) return '🖥️';
                  if (/qa|quality|inspect/.test(n)) return '🔍';
                  return '📂';
                })();
                return (
                  <Pressable key={ss.id} onPress={() => setSelectedSubSpaceId(ss.id)}
                    style={{ width: isCompact ? '100%' as any : '48%' as any, ...g(0.04), padding: 16, gap: 8 }}
                    {...(Platform.OS === 'web' ? { dataSet: { scaleIn: '' } } : {})}>
                    {/* Card header: icon + name + count badge */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: `${accentColor}22`, alignItems: 'center' as any, justifyContent: 'center' as any }}>
                        <Text style={{ fontSize: 22 }}>{ssIcon}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 14, fontWeight: '700', color: txtColor }}>{ss.name}</Text>
                        {(ss as any).description ? (
                          <Text style={{ fontSize: 10, color: dimColor, marginTop: 1 }} numberOfLines={1}>{(ss as any).description}</Text>
                        ) : null}
                      </View>
                      <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 14, backgroundColor: cnt > 0 ? accentSoft : subtleBg, borderWidth: 1, borderColor: cnt > 0 ? accentColor : subtleBorder }}>
                        <Text style={{ fontSize: 14, fontWeight: '800', color: cnt > 0 ? accentColor : dimColor }}>{cnt}</Text>
                      </View>
                    </View>
                    {/* Stage breakdown mini-bar */}
                    {ssStageEntries.length > 0 ? (
                      <View style={{ gap: 3 }}>
                        {ssStageEntries.map(([stage, c]) => (
                          <View key={`ssb-${stage}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <View style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: subtleBg }}>
                              <View style={{ width: `${Math.round((c / cnt) * 100)}%` as any, height: 4, borderRadius: 2, backgroundColor: accentColor, opacity: 0.8 }} />
                            </View>
                            <Text style={{ fontSize: 9, color: dimColor, minWidth: 60 }} numberOfLines={1}>{stage}</Text>
                            <Text style={{ fontSize: 9, fontWeight: '700', color: accentColor }}>{c}</Text>
                          </View>
                        ))}
                      </View>
                    ) : (
                      <Text style={{ fontSize: 10, color: dimColor }}>{cnt === 0 ? `No ${objectLabelPlural.toLowerCase()} yet` : `${cnt} ${cnt === 1 ? objectLabel : objectLabelPlural.toLowerCase()} · Latest: ${latestStatus}`}</Text>
                    )}
                    {/* CTA */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' as any }}>
                      {latestStatus !== '—' && chip(latestStatus)}
                      <Text style={{ fontSize: 10, fontWeight: '700', color: accentColor, marginLeft: 'auto' as any }}>Open →</Text>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}

          {/* ── Active SubSpace Record View ── */}
          {selectedSubSpaceId && (
            <View style={{ flex: 1, overflow: 'hidden' as any }}>
              {/* SubSpace header bar */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: subtleBorder, flexWrap: 'wrap', gap: 6 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Pressable onPress={() => setSelectedSubSpaceId('')} style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: subtleBg }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: dimColor }}>← All</Text>
                  </Pressable>
                  <Text style={{ fontSize: 15, fontWeight: '800', color: txtColor }}>{selectedSubSpace?.name ?? subSpaceLabel}</Text>
                  <Text style={{ fontSize: 11, color: dimColor }}>{filteredRecords.length}{filteredRecords.length !== selectedRecords.length ? `/${selectedRecords.length}` : ''} record{selectedRecords.length !== 1 ? 's' : ''}</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                  <Pressable onPress={() => setViewMode('list')} style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: viewMode === 'list' ? accentSoft : subtleBg, borderWidth: viewMode === 'list' ? 1 : 0, borderColor: accentColor }}>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: viewMode === 'list' ? '#FFF' : dimColor }}>List</Text>
                  </Pressable>
                  <Pressable nativeID="eu-view-board" onPress={() => setViewMode('board')} style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: viewMode === 'board' ? accentSoft : subtleBg, borderWidth: viewMode === 'board' ? 1 : 0, borderColor: accentColor }}>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: viewMode === 'board' ? '#FFF' : dimColor }}>Board</Text>
                  </Pressable>
                  {/* Export buttons */}
                  <Pressable onPress={exportCsv} style={{ paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8, backgroundColor: subtleBg, borderWidth: 1, borderColor: subtleBorder }}>
                    <Text style={{ fontSize: 9, fontWeight: '700', color: dimColor }}>CSV ↓</Text>
                  </Pressable>
                  <Pressable onPress={exportPdf} style={{ paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8, backgroundColor: subtleBg, borderWidth: 1, borderColor: subtleBorder }}>
                    <Text style={{ fontSize: 9, fontWeight: '700', color: dimColor }}>Print</Text>
                  </Pressable>
                  <Pressable nativeID="eu-create-record" onPress={() => setCreateModalOpen(true)} style={{ paddingHorizontal: 12, paddingVertical: 5, borderRadius: 8, backgroundColor: accentColor }}>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: accentTextColor }}>+ Record</Text>
                  </Pressable>
                </View>
              </View>

              {/* Search & Filter Bar */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: subtleBorder, flexWrap: 'wrap' }}>
                <View style={{ flex: 1, minWidth: 140, flexDirection: 'row', alignItems: 'center', borderRadius: 8, backgroundColor: subtleBg, paddingHorizontal: 10, gap: 6 }}>
                  <Text style={{ fontSize: 12, color: dimColor }}>🔍</Text>
                  <TextInput
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholder="Search records..."
                    placeholderTextColor={mode === 'day' ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.25)'}
                    style={{ flex: 1, height: 30, fontSize: 12, color: txtColor, outlineStyle: 'none' } as any}
                  />
                  {searchQuery.length > 0 && (
                    <Pressable onPress={() => setSearchQuery('')}><Text style={{ fontSize: 12, color: dimColor }}>✕</Text></Pressable>
                  )}
                </View>
                {/* Status filter pills */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 4 }}>
                  <Pressable onPress={() => setFilterStatus('')} style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: filterStatus === '' ? accentSoft : subtleBg, borderWidth: filterStatus === '' ? 1 : 0, borderColor: accentColor }}>
                    <Text style={{ fontSize: 9, fontWeight: '700', color: filterStatus === '' ? '#FFF' : dimColor }}>All</Text>
                  </Pressable>
                  {Object.keys(stageDistribution).map((stage) => (
                    <Pressable key={`filter-${stage}`} onPress={() => setFilterStatus(filterStatus === stage ? '' : stage)} style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: filterStatus === stage ? accentSoft : subtleBg, borderWidth: filterStatus === stage ? 1 : 0, borderColor: accentColor }}>
                      <Text style={{ fontSize: 9, fontWeight: '700', color: filterStatus === stage ? '#FFF' : dimColor }}>{stage}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>

              {/* Batch action bar — shared for both board and list views */}
              {selectedRecordIds.size > 0 && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: mode === 'day' ? `${accentColor}14` : `${accentColor}1A`, borderBottomWidth: 1, borderBottomColor: `${accentColor}44`, flexWrap: 'wrap' as any }}>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: accentColor }}>{selectedRecordIds.size} selected</Text>
                  <Text style={{ fontSize: 10, color: dimColor }}>→ Move to:</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }} contentContainerStyle={{ gap: 6 }}>
                    {lifecycleStages.map((stage) => (
                      <Pressable
                        key={`bm-${stage.id}`}
                        onPress={() => executeBatchMove(stage.name)}
                        style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: accentColor, borderWidth: 1, borderColor: `${accentColor}CC` }}
                      >
                        <Text style={{ fontSize: 10, fontWeight: '700', color: accentTextColor }}>{stage.name}</Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                  <Pressable onPress={clearSelection} style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: subtleBg }}>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: dimColor }}>✕ Clear</Text>
                  </Pressable>
                </View>
              )}

              {/* Record content */}
              {viewMode === 'board' ? (
                <ScrollView style={{ flex: 1, padding: 10 }}>
                  <BoardView
                    records={filteredRecords}
                    subSpace={selectedSubSpace ?? undefined}
                    onRecordPress={(r) => { trackRecentView(r); setSelectedDrawerRecord(r); setRecordDrawerVisible(true); }}
                    accentColor={accentColor}
                    formatAmount={fmtAmount}
                    onRecordDrop={(recordId, newStatus) => {
                      updateRecord(recordId, { status: newStatus });
                      flashSaving();
                      showToast(`Moved to ${newStatus}`, 'success');
                      auditLog?.logEntry({ action: 'transition', entityType: 'record', entityId: recordId, entityName: recordId, after: { detail: `Board drop → ${newStatus}` } });
                      const rec = allRecordsForWorkspace.find((r) => r.id === recordId);
                      if (rec && addNotification) flowEngine.onLifecycleTransition({ ...rec, status: newStatus }, addNotification);
                    }}
                    selectedRecordIds={selectedRecordIds}
                    toggleRecordSelection={toggleRecordSelection}
                    selectAllInColumn={(recs) => setSelectedRecordIds((prev) => { const next = new Set(prev); recs.forEach((r) => next.add(r.id)); return next; })}
                  />
                </ScrollView>
              ) : (
                <View style={{ flex: 1, overflow: 'hidden' as any }}>
                  {/* Sort header row */}
                  {Platform.OS === 'web' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '6px 12px 6px 8px', borderBottom: `1px solid ${subtleBorder}`, fontSize: 10, fontWeight: 700, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
                      {/* Select-all checkbox */}
                      <div
                        onClick={() => selectedRecordIds.size === filteredRecords.length && filteredRecords.length > 0 ? clearSelection() : selectAllRecords(filteredRecords)}
                        style={{ width: 18, height: 18, borderRadius: 4, border: `1.5px solid ${selectedRecordIds.size > 0 ? accentColor : (mode === 'day' ? 'rgba(0,0,0,0.22)' : 'rgba(255,255,255,0.22)')}`, backgroundColor: selectedRecordIds.size === filteredRecords.length && filteredRecords.length > 0 ? accentColor : selectedRecordIds.size > 0 ? `${accentColor}44` : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, transition: 'all 0.15s' } as any}
                      >
                        {selectedRecordIds.size > 0 && <span style={{ color: '#FFF', fontSize: 10, lineHeight: '1', fontWeight: 900 }}>{selectedRecordIds.size === filteredRecords.length ? '✓' : '–'}</span>}
                      </div>
                      {([['title', 'Title', '1'], ['status', 'Status', '0 0 70px'], ['date', 'Date', '0 0 80px'], ['amount', 'Amount', '0 0 80px']] as const).map(([field, label, flex]) => (
                        <span
                          key={field}
                          data-sortable=""
                          onClick={() => { if (sortField === field) { setSortAsc(!sortAsc); } else { setSortField(field); setSortAsc(true); } }}
                          style={{ flex, color: sortField === field ? '#E878F6' : (mode === 'day' ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.35)'), letterSpacing: 0.5, textTransform: 'uppercase', cursor: 'pointer', userSelect: 'none' } as any}
                        >
                          {label} {sortField === field ? (sortAsc ? '↑' : '↓') : ''}
                        </span>
                      ))}
                    </div>
                  )}
                  <ScrollView nativeID="eu-record-list" style={{ flex: 1, padding: 10 }} showsVerticalScrollIndicator={false}>
                    {filteredRecords.length === 0 && <Text style={{ fontSize: 12, color: dimColor, padding: 12 }}>{searchQuery || filterStatus ? 'No matching records.' : `No records in this ${subSpaceLabel.toLowerCase()}.`}</Text>}
                    {filteredRecords.map((rec) => {
                      const isSelected = selectedRecordIds.has(rec.id);
                      return (
                        <View key={rec.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                          {/* Per-row checkbox (web only) */}
                          {Platform.OS === 'web' && (
                            <div
                              onClick={() => toggleRecordSelection(rec.id)}
                              style={{ width: 18, height: 18, borderRadius: 4, border: `1.5px solid ${isSelected ? accentColor : (mode === 'day' ? 'rgba(0,0,0,0.22)' : 'rgba(255,255,255,0.22)')}`, backgroundColor: isSelected ? accentColor : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, transition: 'all 0.12s' } as any}
                            >
                              {isSelected && <span style={{ color: '#FFF', fontSize: 10, lineHeight: '1', fontWeight: 900 }}>✓</span>}
                            </div>
                          )}
                          <Pressable
                            onPress={() => {
                              if (selectedRecordIds.size > 0) { toggleRecordSelection(rec.id); return; }
                              trackRecentView(rec); setSelectedDrawerRecord(rec); setRecordDrawerVisible(true);
                            }}
                            style={{ flex: 1, ...g(0.03), padding: 12, gap: 6, ...(isSelected ? { borderColor: `${accentColor}BB`, borderWidth: 1.5, backgroundColor: `${accentColor}0A` } as any : {}) }}
                            {...(Platform.OS === 'web' ? { dataSet: { animateIn: '' } } : {})}
                          >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          {rec.imageUri && (
                            <Image
                              source={{ uri: rec.imageUri }}
                              style={{ width: 36, height: 36, borderRadius: 8, flexShrink: 0 }}
                              resizeMode="cover"
                            />
                          )}
                          {chip(rec.status)}
                          <Text style={{ flex: 1, fontSize: 13, fontWeight: '700', color: txtColor }} numberOfLines={1}>{rec.title}</Text>
                          {rec.date && <Text style={{ fontSize: 10, color: dimColor }}>{formatDate(rec.date)}</Text>}
                        </View>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                          {rec.amount != null && (
                            <View style={{ gap: 1 }}>
                              <Text style={{ fontSize: 9, color: dimColor, textTransform: 'uppercase' as any }}>Amount</Text>
                              <Text style={{ fontSize: 12, fontWeight: '600', color: mode === 'day' ? '#16A34A' : '#86EFAC' }}>{fmtAmount(rec.amount)}</Text>
                            </View>
                          )}
                          {Object.entries(rec.data).slice(0, 4).map(([key, val]) => (
                          <View key={`d-${rec.id}-${key}`} style={{ gap: 1 }}>
                            <Text style={{ fontSize: 9, color: dimColor, textTransform: 'uppercase' as any }}>{key}</Text>
                            <Text style={{ fontSize: 11, color: txtColor }}>{typeof val === 'number' ? (isPharmWorkspace ? val.toLocaleString() : fmtMoney(val)) : String(val)}</Text>
                          </View>
                        ))}
                      </View>
                      {rec.tags && rec.tags.length > 0 && (
                        <View style={{ flexDirection: 'row', gap: 4, marginTop: 2 }}>
                          {rec.tags.slice(0, 3).map((t) => (
                            <View key={`t-${rec.id}-${t}`} style={styles.tagBadge}><Text style={styles.tagBadgeText}>{t}</Text></View>
                          ))}
                        </View>
                      )}
                          </Pressable>
                        </View>
                      );
                    })}
                </ScrollView>
                </View>
              )}
            </View>
          )}

          {/* If no subspaces exist at all */}
          {visibleSubSpaces.length === 0 && (
            <View style={{ flex: 1, alignItems: 'center' as any, justifyContent: 'center' as any, padding: 20 }}>
              <Text style={{ fontSize: 14, color: dimColor, textAlign: 'center' as any }}>
                No {subSpaceLabel.toLowerCase()} configured for this workspace yet.{'\n'}Load a template from Workspace Creator to get started.
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* ═══════════════ RECORD DETAIL DRAWER ═══════════════ */}
      <RecordDetailDrawer
        visible={recordDrawerVisible}
        record={selectedDrawerRecord}
        fields={selectedSubSpace?.builderFields}
        lifecycleStages={lifecycleStages}
        lifecycleTransitions={lifecycleTransitions}
        formatAmount={fmtAmount}
        subSpaces={workspace?.subSpaces}
        workspaceName={workspace?.name}
        onMoveToSubSpace={(recordId, targetSubSpaceId) => {
          moveRecordToSubSpace(recordId, targetSubSpaceId);
          const targetSs = workspace?.subSpaces.find((ss) => ss.id === targetSubSpaceId);
          showToast(`Record moved to ${targetSs?.name ?? 'SubSpace'}`, 'success');
          flashSaving();
          if (selectedDrawerRecord?.id === recordId) {
            const updatedRec = { ...selectedDrawerRecord, subSpaceId: targetSubSpaceId } as RuntimeRecord;
            setSelectedDrawerRecord(updatedRec);
            auditLog?.logEntry({ action: 'update', entityType: 'record', entityId: recordId, entityName: selectedDrawerRecord.title || recordId, after: { detail: `Moved to SubSpace: ${targetSs?.name ?? targetSubSpaceId}` } });
            addNotification?.({
              type: 'system',
              title: 'Pipeline Stage Advanced',
              body: `"${selectedDrawerRecord.title}" moved to ${targetSs?.name ?? 'next stage'} in the pipeline.`,
              severity: 'info',
              sourceEntityType: 'record',
              sourceEntityId: recordId,
            });
            if (addNotification) flowEngine.onRecordUpdated(updatedRec, addNotification);
          }
        }}
        onClose={() => { setRecordDrawerVisible(false); setSelectedDrawerRecord(null); }}
        onTransition={(id, newStatus) => {
          updateRecord(id, { status: newStatus });
          flashSaving();
          showToast(`Record transitioned to ${newStatus}`, 'success');
          if (selectedDrawerRecord?.id === id) {
            const updatedRec = { ...selectedDrawerRecord, status: newStatus } as RuntimeRecord;
            setSelectedDrawerRecord(updatedRec);
            auditLog?.logEntry({ action: 'transition', entityType: 'record', entityId: id, entityName: updatedRec.title || id, after: { detail: `Status: ${selectedDrawerRecord.status} → ${newStatus}` } });
            addNotification?.({
              type: 'system',
              title: 'Lifecycle Transition',
              body: `"${updatedRec.title}" transitioned from ${selectedDrawerRecord.status} → ${newStatus}.`,
              severity: 'info',
              sourceEntityType: 'record',
              sourceEntityId: id,
            });
            if (addNotification) flowEngine.onLifecycleTransition(updatedRec, addNotification);
          }
        }}
        onUpdate={(id, updates) => {
          updateRecord(id, updates);
          flashSaving();
          showToast('Record updated', 'success');
          if (selectedDrawerRecord?.id === id) {
            const updatedRec = { ...selectedDrawerRecord, ...updates } as RuntimeRecord;
            setSelectedDrawerRecord(updatedRec);
            if (updates.status && updates.status !== selectedDrawerRecord.status) {
              auditLog?.logEntry({ action: 'transition', entityType: 'record', entityId: id, entityName: updatedRec.title || id, after: { detail: `Status: ${selectedDrawerRecord.status} → ${updates.status}` } });
              if (addNotification) flowEngine.onLifecycleTransition(updatedRec, addNotification);
            } else {
              auditLog?.logEntry({ action: 'update', entityType: 'record', entityId: id, entityName: updatedRec.title || id, after: { detail: `Updated fields: ${Object.keys(updates).join(', ')}` } });
              if (addNotification) flowEngine.onRecordUpdated(updatedRec, addNotification);
            }
          }
        }}
        onDelete={(id) => { const rec = selectedDrawerRecord; deleteRecord(id); showToast('Record deleted', 'info'); auditLog?.logEntry({ action: 'delete', entityType: 'record', entityId: id, entityName: rec?.title || id, after: { detail: 'Record deleted' } }); setRecordDrawerVisible(false); setSelectedDrawerRecord(null); }}
        tenantAccent={accentColor}
      />

      {/* ═══════════════ INTAKE MODAL ═══════════════ */}
      <Modal transparent visible={intakeModalOpen} animationType="fade" onRequestClose={() => setIntakeModalOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center' as any, justifyContent: 'center' as any }} onPress={() => setIntakeModalOpen(false)}>
          <Pressable onPress={() => {}} style={{ width: 440, maxWidth: '92%' as any, maxHeight: '85%' as any, ...g(0.08), padding: 0, overflow: 'hidden' as any }}>
            <View style={{ paddingHorizontal: 20, paddingTop: 18, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 16, fontWeight: '800', color: '#FFFFFF' }}>New {subjectSingular}</Text>
              <Pressable onPress={() => setIntakeModalOpen(false)} style={{ padding: 6 }}>
                <Text style={{ fontSize: 14, color: dimColor }}>✕</Text>
              </Pressable>
            </View>
            <ScrollView style={{ padding: 20 }} contentContainerStyle={{ gap: 12, paddingBottom: 20 }}>
              {!canIntakeClient && <Text style={styles.notice}>{deniedMessage('client.intake')}</Text>}
              <LabeledInput label={`${collectionLabel} Reference ID *`} value={caseRef} onChangeText={setCaseRef} placeholder={`REF-001`} autoCapitalize="characters" />
              {shellConfig.personas.length > 0 && (
                <View style={{ gap: 6 }}>
                  <Text style={{ fontSize: 11, fontWeight: '600', color: dimColor }}>Persona</Text>
                  <View style={styles.inlineRow}>
                    {shellConfig.personas.map((p) => {
                      const sel = selectedPersonaId === p.id;
                      return (
                        <Pressable key={p.id} onPress={() => setSelectedPersonaId(p.id)}
                          style={[styles.pill, sel && { backgroundColor: accentSoft, borderColor: accentColor }]}>
                          <Text style={[styles.pillText, sel && { color: '#FFF', fontWeight: '700' }]}>{p.name}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              )}
              {shellConfig.intakeFields.map((field) => (
                <LabeledInput
                  key={field.id}
                  label={`${field.label}${field.required ? ' *' : ''}`}
                  value={profileValues[field.id] ?? ''}
                  onChangeText={(v) => setProfileField(field.id, v)}
                  placeholder={field.type === 'select' ? `Options: ${field.options?.join(', ')}` : field.type === 'date' ? 'MM-DD-YYYY' : `Enter ${field.label.toLowerCase()}`}
                />
              ))}
              <Pressable disabled={!canIntakeClient} onPress={() => { createClient(); showToast(`${collectionLabel} created`, 'success'); auditLog?.logEntry({ action: 'create', entityType: 'client', entityId: caseRef || 'new', entityName: caseRef || `New ${collectionLabel}`, after: { detail: 'Client intake created' } }); setIntakeModalOpen(false); }}
                style={{ paddingVertical: 12, borderRadius: 10, backgroundColor: canIntakeClient ? accentColor : 'rgba(255,255,255,0.1)', alignItems: 'center' as any }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: canIntakeClient ? accentTextColor : dimColor }}>Create {subjectSingular}</Text>
              </Pressable>
              {!!intakeMessage && <Text style={styles.notice}>{intakeMessage}</Text>}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ═══════════════ CREATE RECORD MODAL ═══════════════ */}
      <Modal transparent visible={createModalOpen} animationType="fade" onRequestClose={() => { setCreateModalOpen(false); setCreateTab('form'); setCsvText(''); setCsvPreviewRows([]); setCsvImportError(''); setBarcodeInput(''); setBarcodeApplied(false); setBarcodeDatasetResult(null); setQrCodeData(''); setFdaSelectedDrug(null); }}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center' as any, justifyContent: 'center' as any }} onPress={() => { setCreateModalOpen(false); setCreateTab('form'); setCsvText(''); setCsvPreviewRows([]); setCsvImportError(''); setBarcodeInput(''); setBarcodeApplied(false); setBarcodeDatasetResult(null); setQrCodeData(''); setFdaSelectedDrug(null); }}>
          <Pressable onPress={() => {}} style={{ width: 520, maxWidth: '94%' as any, maxHeight: '88%' as any, ...g(0.08), padding: 0, overflow: 'hidden' as any }}>
            {/* ── Modal Header ── */}
            <View style={{ paddingHorizontal: 20, paddingTop: 18, paddingBottom: 0, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 12 }}>
                <Text style={{ fontSize: 16, fontWeight: '800', color: '#FFFFFF' }}>Create Record</Text>
                <Pressable onPress={() => { setCreateModalOpen(false); setCreateTab('form'); setCsvText(''); setCsvPreviewRows([]); setCsvImportError(''); setBarcodeInput(''); setBarcodeApplied(false); setBarcodeDatasetResult(null); setQrCodeData(''); setFdaSelectedDrug(null); }} style={{ padding: 6 }}>
                  <Text style={{ fontSize: 14, color: dimColor }}>✕</Text>
                </Pressable>
              </View>
              {/* ── Tab Bar ── */}
              <View style={{ flexDirection: 'row', gap: 4, marginBottom: -1 }}>
                {(['form', 'import', 'scan'] as const).map((tab) => {
                  const labels: Record<typeof tab, string> = { form: '📋 Form', import: '📥 Import CSV/JSON', scan: '🔲 QR Code' };
                  const active = createTab === tab;
                  return (
                    <Pressable key={tab} onPress={() => setCreateTab(tab)} style={{ paddingHorizontal: 12, paddingVertical: 8, borderTopLeftRadius: 8, borderTopRightRadius: 8, backgroundColor: active ? 'rgba(255,255,255,0.07)' : 'transparent', borderBottomWidth: active ? 2 : 0, borderBottomColor: accentColor }}>
                      <Text style={{ fontSize: 12, fontWeight: active ? '700' : '500', color: active ? accentColor : dimColor }}>{labels[tab]}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* ══ FORM TAB ══ */}
            {createTab === 'form' && (
              <ScrollView style={{ padding: 20 }} contentContainerStyle={{ gap: 12, paddingBottom: 20 }}>
                {!activeForm && <Text style={{ fontSize: 12, color: dimColor }}>Add fields in Form Builder for this {subSpaceLabel} to generate its form.</Text>}
                {!canCreateRecord && <Text style={styles.notice}>{deniedMessage('record.create')}</Text>}
                {allowedLifecycleStageNames.length > 0 && (
                  <View style={{ gap: 6 }}>
                    <Text style={{ fontSize: 11, fontWeight: '600', color: dimColor }}>Lifecycle Stage</Text>
                    <View style={[styles.inlineRow, { flexWrap: 'wrap' }]}>
                      {allowedLifecycleStageNames.map((sn) => {
                        const sel = (formValues.status || defaultLifecycleStageName) === sn;
                        return (
                          <Pressable key={sn} onPress={() => setLifecycleStatus(sn)}
                            style={[styles.pill, sel && { backgroundColor: accentSoft, borderColor: accentColor }]}>
                            <Text style={[styles.pillText, sel && { color: '#FFF', fontWeight: '700' }]}>{sn}</Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                )}
                {/* FDA Drug Lookup — pharma workspaces only */}
                {isPharmWorkspace && createModalOpen && (
                  <View style={{ gap: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)', paddingBottom: 12 }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' as any, color: '#60A5FA' }}>FDA Drug Lookup</Text>
                    {/* Selected drug badge */}
                    {fdaSelectedDrug ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(96,165,250,0.12)', borderRadius: 8, borderWidth: 1, borderColor: 'rgba(96,165,250,0.3)', paddingHorizontal: 12, paddingVertical: 8 }}>
                        <View style={{ flex: 1, gap: 2 }}>
                          <Text style={{ fontSize: 13, fontWeight: '700', color: '#60A5FA' }}>✓ {fdaSelectedDrug.brand_name || fdaSelectedDrug.generic_name}</Text>
                          <Text style={{ fontSize: 10, color: dimColor }}>NDC: {fdaSelectedDrug.product_ndc} · {fdaSelectedDrug.manufacturer_name}</Text>
                        </View>
                        <Pressable onPress={() => { setFdaSelectedDrug(null); }} style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.06)' }}>
                          <Text style={{ fontSize: 11, color: dimColor }}>Clear</Text>
                        </Pressable>
                      </View>
                    ) : (
                      <>
                        <LabeledInput label="Search FDA database" value={fdaQuery} onChangeText={setFdaQuery} placeholder="Search by drug name or NDC code..." />
                        {fdaLoading && <Text style={{ fontSize: 11, color: dimColor }}>Searching FDA database...</Text>}
                        {fdaResults.map((drug) => (
                          <Pressable key={drug.product_ndc} onPress={() => {
                            activeForm?.fields.forEach((f) => {
                              const lbl = f.label.toLowerCase();
                              if (lbl.includes('product') || lbl.includes('name') || lbl.includes('drug')) setField(f.id, drug.brand_name || drug.generic_name);
                              else if (lbl.includes('ndc') || lbl.includes('code')) setField(f.id, drug.product_ndc);
                              else if (lbl.includes('manufacturer') || lbl.includes('labeler')) setField(f.id, drug.manufacturer_name);
                              else if (lbl.includes('dosage') || lbl.includes('form')) setField(f.id, drug.dosage_form);
                              else if (lbl.includes('route')) setField(f.id, drug.route);
                            });
                            setFdaSelectedDrug(drug);
                            setFdaQuery(''); setFdaResults([]);
                          }} style={{ ...g(0.04), padding: 10, gap: 2 }}>
                            <Text style={{ fontSize: 12, fontWeight: '700', color: '#FFFFFF' }}>{drug.brand_name || drug.generic_name}</Text>
                            <Text style={{ fontSize: 10, color: dimColor }}>NDC: {drug.product_ndc} · {drug.manufacturer_name}</Text>
                            <Text style={{ fontSize: 10, color: dimColor }}>{drug.dosage_form} · {drug.route}</Text>
                          </Pressable>
                        ))}
                      </>
                    )}
                  </View>
                )}
                {activeForm?.fields.map((field) => (
                  field.type === 'date' || field.type === 'datetime' ? (
                    <CompositeFieldInput
                      key={`cf-${field.id}`}
                      fieldType={field.type}
                      label={`${field.label}${field.required ? ' *' : ''}`}
                      value={formValues[field.id] ?? ''}
                      onChange={(v) => setField(field.id, v)}
                      required={field.required}
                      dimColor={dimColor}
                    />
                  ) : (
                    <LabeledInput
                      key={`cf-${field.id}`}
                      label={`${field.label}${field.required ? ' *' : ''}`}
                      value={formValues[field.id] ?? ''}
                      onChangeText={(v) => setField(field.id, v)}
                      placeholder={field.options ? `Options: ${field.options.join(', ')}` : `Enter ${field.label.toLowerCase()}`}
                    />
                  )
                ))}
                {activeForm && (
                  <Pressable disabled={!canCreateRecord || !selectedClient} onPress={() => { const rec = submit(); if (rec) { showToast(`Record "${rec.title}" created`, 'success'); auditLog?.logEntry({ action: 'create', entityType: 'record', entityId: rec.id, entityName: rec.title || rec.id, after: { subSpace: selectedSubSpace?.name ?? 'subspace' } }); if (addNotification) flowEngine.onRecordCreated(rec, addNotification); } setCreateModalOpen(false); setFdaSelectedDrug(null); setBarcodeDatasetResult(null); setQrCodeData(''); }}
                    style={{ paddingVertical: 12, borderRadius: 10, backgroundColor: (canCreateRecord && selectedClient) ? accentColor : 'rgba(255,255,255,0.1)', alignItems: 'center' as any }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: (canCreateRecord && selectedClient) ? accentTextColor : dimColor }}>Create Entry</Text>
                  </Pressable>
                )}
                {!!message && <Text style={styles.notice}>{message}</Text>}
              </ScrollView>
            )}

            {/* ══ IMPORT CSV/JSON TAB ══ */}
            {createTab === 'import' && (
              <ScrollView style={{ padding: 20 }} contentContainerStyle={{ gap: 14, paddingBottom: 20 }}>
                {!selectedClient && <Text style={styles.notice}>Select a {shellConfig.subjectSingular.toLowerCase()} first to import records.</Text>}
                {!canCreateRecord && <Text style={styles.notice}>{deniedMessage('record.create')}</Text>}
                <Text style={{ fontSize: 12, color: dimColor, lineHeight: 18 }}>
                  Paste CSV rows or a JSON array below. Column headers are mapped to {selectedSubSpace?.name ?? 'workspace'} field names automatically.
                  Downloaded Bebo sample files can be imported directly.
                </Text>
                {/* File upload button (web) */}
                {Platform.OS === 'web' && (
                  <Pressable onPress={() => {
                    const input = document.createElement('input');
                    input.type = 'file'; input.accept = '.csv,.json,.txt';
                    input.onchange = async () => {
                      const file = input.files?.[0];
                      if (!file) return;
                      const text = await file.text();
                      setCsvText(text);
                      setCsvImportError('');
                      try { const rows = parseCsvOrJson(text); setCsvPreviewRows(rows.slice(0, 5)); }
                      catch (e) { setCsvImportError('Could not parse file. Check format.'); }
                    };
                    input.click();
                  }} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10, borderWidth: 1, borderColor: accentColor, backgroundColor: accentSoft, alignSelf: 'flex-start' as any }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: accentColor }}>📂 Upload File</Text>
                  </Pressable>
                )}
                <View style={{ gap: 4 }}>
                  <Text style={{ fontSize: 11, fontWeight: '600', color: dimColor }}>Paste CSV or JSON</Text>
                  <TextInput
                    multiline
                    numberOfLines={8}
                    style={{ fontSize: 11, fontFamily: 'monospace', color: '#FFFFFF', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', borderRadius: 10, padding: 10, minHeight: 120, backgroundColor: 'rgba(255,255,255,0.04)', textAlignVertical: 'top' as any }}
                    value={csvText}
                    onChangeText={(v) => {
                      setCsvText(v);
                      setCsvImportError('');
                      if (v.trim()) {
                        try { const rows = parseCsvOrJson(v); setCsvPreviewRows(rows.slice(0, 5)); }
                        catch { setCsvImportError('Could not parse. Expected CSV with header row or JSON array.'); }
                      } else { setCsvPreviewRows([]); }
                    }}
                    placeholder={'name,status,amount\nAcme Corp,Active,5000\n...\n\nor paste JSON array:\n[{"name":"Acme Corp","status":"Active"}]'}
                    placeholderTextColor={dimColor}
                  />
                </View>
                {csvImportError ? (
                  <Text style={{ fontSize: 12, color: '#EF4444' }}>{csvImportError}</Text>
                ) : csvPreviewRows.length > 0 ? (
                  <View style={{ gap: 6 }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: dimColor }}>PREVIEW — first {csvPreviewRows.length} rows</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator>
                      <View style={{ gap: 4 }}>
                        {/* Headers */}
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                          {Object.keys(csvPreviewRows[0]).map((h) => (
                            <View key={h} style={{ minWidth: 90, backgroundColor: accentSoft, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 3 }}>
                              <Text style={{ fontSize: 10, fontWeight: '700', color: accentColor }}>{h}</Text>
                            </View>
                          ))}
                        </View>
                        {csvPreviewRows.map((row, ri) => (
                          <View key={ri} style={{ flexDirection: 'row', gap: 8 }}>
                            {Object.values(row).map((v, vi) => (
                              <View key={vi} style={{ minWidth: 90, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 3, backgroundColor: 'rgba(255,255,255,0.04)' }}>
                                <Text style={{ fontSize: 10, color: dimColor }} numberOfLines={1}>{v}</Text>
                              </View>
                            ))}
                          </View>
                        ))}
                      </View>
                    </ScrollView>
                  </View>
                ) : null}
                <Pressable
                  disabled={!canCreateRecord || !selectedClient || csvPreviewRows.length === 0}
                  onPress={() => {
                    if (!workspace || !selectedSubSpace || !selectedClientId) return;
                    let rows: Record<string, string>[] = [];
                    try { rows = parseCsvOrJson(csvText); } catch { setCsvImportError('Parse failed.'); return; }
                    if (rows.length === 0) { setCsvImportError('No data rows found.'); return; }
                    const fieldsByLabel = new Map<string, SubSpaceBuilderField>();
                    activeForm?.fields.forEach((f) => {
                      fieldsByLabel.set(f.label.toLowerCase(), f);
                      fieldsByLabel.set(f.id.toLowerCase(), f);
                    });
                    let created = 0;
                    for (const row of rows) {
                      const data: Record<string, string | number> = {};
                      let titleVal = '';
                      for (const [col, val] of Object.entries(row)) {
                        const field = fieldsByLabel.get(col.toLowerCase());
                        const key = field ? field.id : col.toLowerCase().replace(/\s+/g, '_');
                        const num = Number(val);
                        data[key] = val !== '' && !isNaN(num) && String(num) === val.trim() ? num : val;
                        if (!titleVal && /name|title|subject|product|employee|customer|item/i.test(col)) titleVal = val;
                      }
                      const rec: RuntimeRecord = {
                        id: `rec-import-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                        clientId: selectedClientId,
                        workspaceId: workspace.id,
                        subSpaceId: selectedSubSpace.id,
                        title: titleVal || Object.values(row)[0] || 'Imported Record',
                        status: defaultLifecycleStageName ?? lifecycleStages[0]?.name ?? 'New',
                        tags: [`Client:${selectedClientId}`, `Workspace:${workspace.name}`, 'Import:CSV'],
                        imageUri: getRecordPlaceholderImage(workspace.name),
                        data,
                      };
                      addRecordDirect(rec);
                      if (addNotification) flowEngine.onRecordCreated(rec, addNotification);
                      created++;
                    }
                    showToast(`Imported ${created} record${created !== 1 ? 's' : ''}`, 'success');
                    setCsvText(''); setCsvPreviewRows([]); setCreateModalOpen(false); setCreateTab('form');
                  }}
                  style={{ paddingVertical: 12, borderRadius: 10, backgroundColor: (canCreateRecord && selectedClient && csvPreviewRows.length > 0) ? accentColor : 'rgba(255,255,255,0.1)', alignItems: 'center' as any, opacity: (!canCreateRecord || !selectedClient || csvPreviewRows.length === 0) ? 0.5 : 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: (canCreateRecord && selectedClient && csvPreviewRows.length > 0) ? accentTextColor : dimColor }}>
                    {csvPreviewRows.length === 0 ? 'Paste or upload data above' : !selectedClient ? `Select a ${collectionLabel.toLowerCase()} first` : `Import All Rows from File`}
                  </Text>
                </Pressable>
              </ScrollView>
            )}

            {/* ══ QR CODE TAB ══ */}
            {createTab === 'scan' && (
              <ScrollView style={{ padding: 20 }} contentContainerStyle={{ gap: 14, paddingBottom: 20 }}>
                {!selectedClient && <Text style={styles.notice}>Select a {shellConfig.subjectSingular.toLowerCase()} first.</Text>}
                {/* ── DSCSA product cards ── */}
                {isPharmWorkspace && (
                  <View style={{ gap: 8 }}>
                    <Text style={{ fontSize: 10, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' as any, color: accentColor }}>DSCSA Pharmaceutical Products</Text>
                    <Text style={{ fontSize: 11, color: dimColor, lineHeight: 16 }}>Select a product to generate its QR code and auto-fill form fields, simulating a physical label scan.</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      <View style={{ flexDirection: 'row', gap: 6, paddingVertical: 2 }}>
                        {PHARMA_BARCODE_DATASET.map((entry) => {
                          const isSelected = barcodeDatasetResult?.serial === entry.serial;
                          return (
                            <Pressable key={entry.serial}
                              onPress={() => {
                                if (!activeForm) return;
                                const qd = buildQrData(entry);
                                setQrCodeData(qd);
                                setBarcodeDatasetResult(entry);
                                applyDatasetEntryToFields(entry, activeForm.fields as any, setField);
                                setBarcodeApplied(true);
                                setBarcodeInput(qd);
                                showToast(`QR loaded: ${entry.productName}`, 'success');
                              }}
                              style={{ paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10, backgroundColor: isSelected ? accentSoft : 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: isSelected ? accentColor : 'rgba(255,255,255,0.12)', maxWidth: 140, gap: 2 }}>
                              <Text style={{ fontSize: 10, fontWeight: '700', color: isSelected ? accentColor : '#FFFFFF' }} numberOfLines={2}>{entry.productName}</Text>
                              <Text style={{ fontSize: 9, color: dimColor }}>NDC: {entry.ndc}</Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    </ScrollView>
                  </View>
                )}
                {/* ── QR Code visualization ── */}
                {qrCodeData ? (
                  <View style={{ alignItems: 'center' as any, gap: 8, padding: 16, borderRadius: 14, backgroundColor: '#FFFFFF', alignSelf: 'center' as any }}>
                    <Image
                      source={{ uri: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrCodeData)}` }}
                      style={{ width: 200, height: 200 }}
                      resizeMode="contain"
                    />
                    {barcodeDatasetResult && (
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#111111', textAlign: 'center' as any }}>{barcodeDatasetResult.productName}</Text>
                    )}
                  </View>
                ) : (
                  <View style={{ alignItems: 'center' as any, padding: 30, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.03)' }}>
                    <Text style={{ fontSize: 28 }}>🔲</Text>
                    <Text style={{ fontSize: 12, color: dimColor, marginTop: 6, textAlign: 'center' as any }}>Select a product above or enter a QR code string to generate</Text>
                  </View>
                )}
                {/* ── Manual QR entry ── */}
                <View style={{ gap: 4 }}>
                  <Text style={{ fontSize: 11, fontWeight: '600', color: dimColor }}>Manual QR Code Entry</Text>
                  <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                    <TextInput
                      style={{ flex: 1, fontSize: 13, color: '#FFFFFF', borderWidth: 1, borderColor: barcodeApplied ? '#86EFAC' : 'rgba(255,255,255,0.18)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: 'rgba(255,255,255,0.04)' }}
                      value={barcodeInput}
                      onChangeText={(v) => { setBarcodeInput(v); setBarcodeApplied(false); setBarcodeDatasetResult(null); setQrCodeData(v); }}
                      onSubmitEditing={() => {
                        if (barcodeInput.trim() && activeForm) {
                          const qd = barcodeInput.trim();
                          setQrCodeData(qd);
                          const match = lookupBarcodeDataset(qd);
                          if (match) { applyDatasetEntryToFields(match, activeForm.fields as any, setField); setBarcodeDatasetResult(match); showToast('Product loaded from DSCSA database', 'success'); }
                          else { applyBarcodeToFields(qd, activeForm.fields as any, setField); setBarcodeDatasetResult(null); showToast('QR code mapped to form fields', 'success'); }
                          setBarcodeApplied(true);
                        }
                      }}
                      placeholder="Paste QR code data or DSCSA identifier..."
                      placeholderTextColor={dimColor}
                      returnKeyType="done"
                    />
                    <Pressable
                      onPress={() => {
                        if (barcodeInput.trim() && activeForm) {
                          const qd = barcodeInput.trim();
                          setQrCodeData(qd);
                          const match = lookupBarcodeDataset(qd);
                          if (match) { applyDatasetEntryToFields(match, activeForm.fields as any, setField); setBarcodeDatasetResult(match); showToast('Product loaded from DSCSA database', 'success'); }
                          else { applyBarcodeToFields(qd, activeForm.fields as any, setField); setBarcodeDatasetResult(null); showToast('QR code mapped to form fields', 'success'); }
                          setBarcodeApplied(true);
                        }
                      }}
                      style={{ paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, backgroundColor: accentColor }}>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: accentTextColor }}>Scan</Text>
                    </Pressable>
                  </View>
                  {barcodeApplied && <Text style={{ fontSize: 11, color: '#86EFAC' }}>✓ Fields populated — review below then submit</Text>}
                </View>
                {/* ── Result banner ── */}
                {barcodeApplied && barcodeDatasetResult && (
                  <View style={{ borderRadius: 10, borderWidth: 1, borderColor: 'rgba(96,165,250,0.35)', backgroundColor: 'rgba(96,165,250,0.08)', padding: 12, gap: 4 }}>
                    <Text style={{ fontSize: 10, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase' as any, color: '#60A5FA' }}>✓ Product Found in DSCSA Database</Text>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#FFFFFF' }}>{barcodeDatasetResult.productName}</Text>
                    <Text style={{ fontSize: 10, color: dimColor }}>NDC: {barcodeDatasetResult.ndc} · {barcodeDatasetResult.manufacturer}</Text>
                    <Text style={{ fontSize: 10, color: dimColor }}>Lot: {barcodeDatasetResult.lot} · Exp: {barcodeDatasetResult.expiration} · Form: {barcodeDatasetResult.dosageForm}</Text>
                  </View>
                )}
                {barcodeApplied && !barcodeDatasetResult && activeForm && (
                  <View style={{ gap: 8, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(134,239,172,0.2)', backgroundColor: 'rgba(134,239,172,0.04)', padding: 12 }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', letterSpacing: 0.5, color: '#86EFAC', textTransform: 'uppercase' as any }}>Mapped Fields</Text>
                    {activeForm.fields.map((f) => formValues[f.id] ? (
                      <View key={f.id} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={{ fontSize: 12, color: dimColor }}>{f.label}</Text>
                        <Text style={{ fontSize: 12, fontWeight: '600', color: '#FFFFFF' }}>{formValues[f.id]}</Text>
                      </View>
                    ) : null)}
                  </View>
                )}
                {/* ── Editable form fields ── */}
                {activeForm?.fields.map((field) => (
                  field.type === 'date' || field.type === 'datetime' ? (
                    <CompositeFieldInput
                      key={`sc-${field.id}`}
                      fieldType={field.type}
                      label={`${field.label}${field.required ? ' *' : ''}`}
                      value={formValues[field.id] ?? ''}
                      onChange={(v) => setField(field.id, v)}
                      required={field.required}
                      dimColor={dimColor}
                    />
                  ) : (
                    <LabeledInput
                      key={`sc-${field.id}`}
                      label={`${field.label}${field.required ? ' *' : ''}`}
                      value={formValues[field.id] ?? ''}
                      onChangeText={(v) => setField(field.id, v)}
                      placeholder={`Enter ${field.label.toLowerCase()}`}
                    />
                  )
                ))}
                {allowedLifecycleStageNames.length > 0 && (
                  <View style={{ gap: 6 }}>
                    <Text style={{ fontSize: 11, fontWeight: '600', color: dimColor }}>Lifecycle Stage</Text>
                    <View style={[styles.inlineRow, { flexWrap: 'wrap' }]}>
                      {allowedLifecycleStageNames.map((sn) => {
                        const sel = (formValues.status || defaultLifecycleStageName) === sn;
                        return (
                          <Pressable key={sn} onPress={() => setLifecycleStatus(sn)}
                            style={[styles.pill, sel && { backgroundColor: accentSoft, borderColor: accentColor }]}>
                            <Text style={[styles.pillText, sel && { color: '#FFF', fontWeight: '700' }]}>{sn}</Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                )}
                {activeForm && (
                  <Pressable disabled={!canCreateRecord || !selectedClient} onPress={() => { const rec = submit(); if (rec) { showToast(`Record "${rec.title}" created`, 'success'); auditLog?.logEntry({ action: 'create', entityType: 'record', entityId: rec.id, entityName: rec.title || rec.id, after: { subSpace: selectedSubSpace?.name ?? 'subspace' } }); if (addNotification) flowEngine.onRecordCreated(rec, addNotification); } setCreateModalOpen(false); setCreateTab('form'); setBarcodeInput(''); setBarcodeApplied(false); setBarcodeDatasetResult(null); setQrCodeData(''); }}
                    style={{ paddingVertical: 12, borderRadius: 10, backgroundColor: (canCreateRecord && selectedClient) ? accentColor : 'rgba(255,255,255,0.1)', alignItems: 'center' as any }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: (canCreateRecord && selectedClient) ? accentTextColor : dimColor }}>Create Entry from QR</Text>
                  </Pressable>
                )}
                {!!message && <Text style={styles.notice}>{message}</Text>}
              </ScrollView>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* ═══════════════ TIMELINE MODAL ═══════════════ */}
      <Modal transparent visible={timelineModalOpen} animationType="fade" onRequestClose={() => setTimelineModalOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center' as any, justifyContent: 'center' as any }} onPress={() => setTimelineModalOpen(false)}>
          <Pressable onPress={() => {}} style={{ width: 520, maxWidth: '92%' as any, maxHeight: '80%' as any, ...g(0.08), padding: 0, overflow: 'hidden' as any }}>
            <View style={{ paddingHorizontal: 20, paddingTop: 18, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 16, fontWeight: '800', color: '#FFFFFF' }}>Activity Timeline</Text>
              <Pressable onPress={() => setTimelineModalOpen(false)} style={{ padding: 6 }}><Text style={{ fontSize: 14, color: dimColor }}>✕</Text></Pressable>
            </View>
            <ScrollView style={{ padding: 16 }} contentContainerStyle={{ gap: 8, paddingBottom: 16 }}>
              {mergedTimeline.length === 0 && <Text style={{ fontSize: 12, color: dimColor }}>No activity recorded yet.</Text>}
              {mergedTimeline.map((entry) => (
                <View key={entry.id} style={{ ...g(0.03), padding: 12, gap: 4 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    {chip(entry.status)}
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#FFFFFF' }}>{entry.title}</Text>
                  </View>
                  <Text style={{ fontSize: 10, color: dimColor }}>{entry.workspaceName} → {entry.subSpaceName} • {formatDate(entry.date)}</Text>
                  {entry.amount != null && <Text style={{ fontSize: 11, color: '#86EFAC' }}>{fmtAmount(entry.amount)}</Text>}
                  {entry.auditDetail != null && <Text style={{ fontSize: 10, color: '#C4B5FD', fontStyle: 'italic' as any }}>{entry.auditDetail}</Text>}
                </View>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ═══════════════ SIGNAL FLOWS MODAL ═══════════════ */}
      <Modal transparent visible={flowsModalOpen} animationType="fade" onRequestClose={() => setFlowsModalOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center' as any, justifyContent: 'center' as any }} onPress={() => setFlowsModalOpen(false)}>
          <Pressable onPress={() => {}} style={{ width: 480, maxWidth: '92%' as any, maxHeight: '80%' as any, ...g(0.08), padding: 0, overflow: 'hidden' as any }}>
            <View style={{ paddingHorizontal: 20, paddingTop: 18, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 16, fontWeight: '800', color: '#FFFFFF' }}>Signal Flows</Text>
              <Pressable onPress={() => setFlowsModalOpen(false)} style={{ padding: 6 }}><Text style={{ fontSize: 14, color: dimColor }}>✕</Text></Pressable>
            </View>
            <ScrollView style={{ padding: 16 }} contentContainerStyle={{ gap: 8, paddingBottom: 16 }}>
              {wsFlows.length === 0 && <Text style={{ fontSize: 12, color: dimColor }}>No flows connected to this workspace.</Text>}
              {wsFlows.map((flow) => {
                const ss = workspace?.subSpaces.find((s) => s.id === flow.subSpaceId);
                return (
                  <View key={flow.id} style={{ ...g(0.03), padding: 12, gap: 4 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <View style={[styles.tagBadge, { backgroundColor: flow.status === 'published' ? 'rgba(134,239,172,0.2)' : 'rgba(196,181,253,0.2)' }]}>
                        <Text style={[styles.tagBadgeText, { color: flow.status === 'published' ? '#86EFAC' : '#C4B5FD' }]}>{flow.status.toUpperCase()}</Text>
                      </View>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: '#FFFFFF' }}>{flow.name}</Text>
                    </View>
                    <Text style={{ fontSize: 10, color: dimColor }}>→ {ss?.name ?? 'All SubSpaces'} • {flow.signal}</Text>
                  </View>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ═══════════════ SPOTLIGHT WALKTHROUGH OVERLAY (web only) ═══════════════ */}
      {walkthroughOpen && Platform.OS === 'web' && !recordDrawerVisible && !intakeModalOpen && !createModalOpen && !timelineModalOpen && !flowsModalOpen && (() => {
        const step = dscsaCrudWalkthroughSteps[walkthroughStep];
        const isFirst = walkthroughStep === 0;
        const isLast = walkthroughStep === totalWalkthroughSteps - 1;
        const pad = 8;
        const hasRect = spotlightRect && spotlightRect.width > 0;

        const tooltipStyle: React.CSSProperties = (() => {
          const maxW = 380;
          const estimatedH = 420;
          if (!hasRect) {
            return { position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', maxWidth: maxW, zIndex: 10002 };
          }
          const gap = 16;
          const vw = window.innerWidth;
          const vh = window.innerHeight;
          const sr = spotlightRect;
          /* Try right of element */
          if (sr.left + sr.width + gap + maxW + 16 < vw) {
            return { position: 'fixed', top: Math.max(16, Math.min(sr.top, vh - estimatedH - 16)), left: sr.left + sr.width + gap, maxWidth: maxW, maxHeight: vh - 32, overflowY: 'auto', zIndex: 10002 } as React.CSSProperties;
          }
          /* Try left of element */
          if (sr.left - gap - maxW > 16) {
            return { position: 'fixed', top: Math.max(16, Math.min(sr.top, vh - estimatedH - 16)), left: sr.left - gap - maxW, maxWidth: maxW, maxHeight: vh - 32, overflowY: 'auto', zIndex: 10002 } as React.CSSProperties;
          }
          /* Fallback: below element, horizontally centered */
          return {
            position: 'fixed',
            top: Math.min(sr.top + sr.height + gap, vh - estimatedH - 16),
            left: Math.max(16, Math.min(sr.left, vw - maxW - 16)),
            maxWidth: maxW, maxHeight: vh - 32, overflowY: 'auto', zIndex: 10002,
          } as React.CSSProperties;
        })();

        return (
          <>
            {/* Semi-transparent backdrop with cutout */}
            {hasRect ? (
              <div
                style={{
                  position: 'fixed', inset: 0, zIndex: 10000,
                  background: 'rgba(12, 8, 24, 0.6)',
                  clipPath: `polygon(
                    0% 0%, 0% 100%, ${spotlightRect.left - pad}px 100%, ${spotlightRect.left - pad}px ${spotlightRect.top - pad}px,
                    ${spotlightRect.left + spotlightRect.width + pad}px ${spotlightRect.top - pad}px,
                    ${spotlightRect.left + spotlightRect.width + pad}px ${spotlightRect.top + spotlightRect.height + pad}px,
                    ${spotlightRect.left - pad}px ${spotlightRect.top + spotlightRect.height + pad}px,
                    ${spotlightRect.left - pad}px 100%, 100% 100%, 100% 0%
                  )`,
                  pointerEvents: 'auto',
                }}
                onClick={() => setWalkthroughOpen(false)}
              />
            ) : (
              <div
                style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(12, 8, 24, 0.6)', pointerEvents: 'auto' }}
                onClick={() => setWalkthroughOpen(false)}
              />
            )}

            {/* Glowing highlight ring around target */}
            {hasRect && (
              <div style={{
                position: 'fixed',
                top: spotlightRect.top - pad,
                left: spotlightRect.left - pad,
                width: spotlightRect.width + pad * 2,
                height: spotlightRect.height + pad * 2,
                border: '2px solid rgba(140, 91, 245, 0.7)',
                borderRadius: 10,
                boxShadow: '0 0 0 4px rgba(140, 91, 245, 0.15), 0 0 20px rgba(140, 91, 245, 0.25)',
                zIndex: 10001,
                pointerEvents: 'none',
              }} />
            )}

            {/* Tooltip card */}
            <div style={{
              ...tooltipStyle,
              background: 'linear-gradient(168deg, #1A1230 0%, #120C23 100%)',
              border: '1px solid rgba(140, 91, 245, 0.35)',
              borderRadius: 14,
              boxShadow: '0 8px 40px rgba(140, 91, 245, 0.18), 0 2px 12px rgba(0,0,0,0.4)',
              padding: '22px 24px 18px',
              color: '#F1E8FF',
              fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
            }}>
              {/* Progress bar */}
              <div style={{ height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 3, marginBottom: 12 }}>
                <div style={{ height: 3, width: `${walkthroughProgress}%`, background: 'linear-gradient(90deg, #8C5BF5, #E878F6)', borderRadius: 3 }} />
              </div>

              {/* Badge */}
              <span style={{
                display: 'inline-block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const,
                letterSpacing: 1.2, color: '#E878F6',
                background: 'rgba(232, 120, 246, 0.12)', border: '1px solid rgba(232, 120, 246, 0.25)',
                borderRadius: 6, padding: '3px 10px', marginBottom: 8,
              }}>
                Guided Walkthrough
              </span>

              <span style={{ display: 'block', fontSize: 12, color: 'rgba(241, 232, 255, 0.5)', marginBottom: 4 }}>
                Step {walkthroughStep + 1} of {totalWalkthroughSteps}
              </span>

              <h3 style={{ margin: '0 0 6px', fontSize: 17, fontWeight: 700, color: '#fff', lineHeight: 1.3 }}>
                {step.title}
              </h3>
              <p style={{ margin: '0 0 10px', fontSize: 13, lineHeight: 1.55, color: 'rgba(241, 232, 255, 0.82)' }}>
                {step.detail}
              </p>

              {/* Checklist */}
              {step.checklist && step.checklist.length > 0 && (
                <div style={{ marginBottom: 14 }}>
                  {step.checklist.map((item, i) => (
                    <div key={i} style={{ fontSize: 12, lineHeight: 1.5, color: 'rgba(241, 232, 255, 0.65)', paddingLeft: 8 }}>
                      {'• '}{item}
                    </div>
                  ))}
                </div>
              )}

              {/* Progress dots */}
              <div style={{ display: 'flex', gap: 4, marginBottom: 14, flexWrap: 'wrap' }}>
                {dscsaCrudWalkthroughSteps.map((_, i) => (
                  <div
                    key={i}
                    style={{
                      width: i === walkthroughStep ? 14 : 6, height: 6, borderRadius: 3,
                      background: i === walkthroughStep
                        ? 'linear-gradient(135deg, #8C5BF5, #E878F6)'
                        : i < walkthroughStep
                          ? 'rgba(140, 91, 245, 0.5)'
                          : 'rgba(255, 255, 255, 0.12)',
                      cursor: 'pointer',
                      transition: 'width 0.2s, background 0.2s',
                    }}
                    onClick={() => goToEndUserStep(i)}
                  />
                ))}
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button
                  disabled={isFirst}
                  onClick={() => goToEndUserStep(walkthroughStep - 1)}
                  style={{
                    border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 12, fontWeight: 600,
                    cursor: isFirst ? 'default' : 'pointer',
                    background: 'rgba(255,255,255,0.08)', color: '#F1E8FF',
                    opacity: isFirst ? 0.35 : 1,
                  }}
                >
                  Back
                </button>
                {isLast ? (
                  <button
                    onClick={() => setWalkthroughOpen(false)}
                    style={{
                      border: 'none', borderRadius: 8, padding: '8px 20px', fontSize: 12, fontWeight: 600,
                      cursor: 'pointer', background: 'linear-gradient(135deg, #8C5BF5, #E878F6)', color: '#fff',
                    }}
                  >
                    Finish
                  </button>
                ) : (
                  <button
                    onClick={() => goToEndUserStep(walkthroughStep + 1)}
                    style={{
                      border: 'none', borderRadius: 8, padding: '8px 20px', fontSize: 12, fontWeight: 600,
                      cursor: 'pointer', background: 'linear-gradient(135deg, #8C5BF5, #E878F6)', color: '#fff',
                    }}
                  >
                    Next ({walkthroughStep + 1}/{totalWalkthroughSteps})
                  </button>
                )}
                <button
                  onClick={() => setWalkthroughOpen(false)}
                  style={{
                    border: 'none', background: 'transparent', color: 'rgba(241,232,255,0.45)',
                    padding: '8px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer', marginLeft: 'auto',
                  }}
                >
                  Skip
                </button>
              </div>
            </div>
          </>
        );
      })()}

      {/* Demo Guide button — hidden until perfected */}
    </View>
  );
}
