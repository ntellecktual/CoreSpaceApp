import React, { useCallback, useEffect, useRef, useState } from 'react';
import '../../assets/marketing.css';
import { Image, LayoutChangeEvent, ScrollView, Text, View } from 'react-native';
import { useWindowDimensions } from 'react-native';
import { BrandLogo } from '../components/BrandLogo';
import { NebulaBackground } from '../components/NebulaBackground';
import { InteractivePressable as Pressable } from '../components/InteractivePressable';
import { useUiTheme } from '../context/UiThemeContext';

/* ─── Marketing page CSS — injected once ────────────────────────── */
const MKT_STYLE_ID = 'cs-mktg-css';
function ensureMarketingCSS() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(MKT_STYLE_ID)) return;
  const s = document.createElement('style');
  s.id = MKT_STYLE_ID;
  s.textContent = `
    /* ── Scroll-reveal ─────────────────────────────────────── */
    @keyframes cs-reveal-up {
      from { opacity: 0; transform: translateY(32px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    .cs-reveal {
      opacity: 0;
      transform: translateY(32px);
    }
    .cs-reveal.cs-visible {
      animation: cs-reveal-up 0.7s cubic-bezier(0.16,1,0.3,1) forwards;
    }

    /* ── Hero stagger ──────────────────────────────────────── */
    .cs-hero-badge    { animation-delay: 0.1s !important; }
    .cs-hero-title    { animation-delay: 0.22s !important; }
    .cs-hero-subtitle { animation-delay: 0.36s !important; }
    .cs-hero-actions  { animation-delay: 0.50s !important; }
    .cs-hero-stats    { animation-delay: 0.64s !important; }
    .cs-hero-demo     { animation-delay: 0.80s !important; }

    /* ── Glass card hover lift ─────────────────────────────── */
    .cs-glass-card {
      display: flex;
      flex-direction: column;
      transition: transform 0.32s cubic-bezier(0.16,1,0.3,1),
                  box-shadow 0.32s ease,
                  border-color 0.32s ease;
    }
    .cs-glass-card:hover {
      transform: translateY(-4px) scale(1.012);
      box-shadow: 0 12px 40px rgba(139,92,246,0.16), 0 4px 12px rgba(0,0,0,0.22) !important;
      border-color: rgba(139,92,246,0.28) !important;
    }

    /* ── CTA glow pulse ────────────────────────────────────── */
    @keyframes cs-cta-glow {
      0%, 100% { box-shadow: 0 0 20px rgba(139,92,246,0.25), 0 8px 32px rgba(139,92,246,0.12); }
      50%      { box-shadow: 0 0 32px rgba(139,92,246,0.40), 0 12px 48px rgba(139,92,246,0.22); }
    }
    .cs-cta-primary {
      animation: cs-cta-glow 3s ease-in-out infinite;
      transition: transform 0.22s ease, filter 0.22s ease;
    }
    .cs-cta-primary:hover {
      transform: scale(1.04);
      filter: brightness(1.15);
    }
    .cs-cta-secondary {
      transition: transform 0.22s ease, background-color 0.22s ease, border-color 0.22s ease;
    }
    .cs-cta-secondary:hover {
      transform: scale(1.03);
      background-color: rgba(255,255,255,0.08) !important;
      border-color: rgba(139,92,246,0.32) !important;
    }

    /* ── Section divider gradient ──────────────────────────── */
    .cs-section-divider {
      width: 100%; height: 1px; margin: 0 auto;
      background: linear-gradient(90deg, transparent 5%, rgba(139,92,246,0.28) 30%, rgba(59,130,246,0.22) 70%, transparent 95%);
    }

    /* ── Stat value shimmer ────────────────────────────────── */
    @keyframes cs-shimmer {
      0%   { background-position: -200% center; }
      100% { background-position: 200% center; }
    }
    .cs-stat-value {
      background: linear-gradient(90deg, #FFFFFF 30%, #D8BBFF 50%, #FFFFFF 70%);
      background-size: 200% 100%;
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      animation: cs-shimmer 4s ease-in-out infinite;
    }

    /* ── Module tab logos ──────────────────────────────────── */
    .cs-module-tab {
      transition: transform 0.25s ease, border-color 0.25s ease, background-color 0.25s ease;
    }
    .cs-module-tab:hover {
      transform: scale(1.05);
    }

    /* ── Pricing highlight ring ────────────────────────────── */
    @keyframes cs-ring-pulse {
      0%, 100% { box-shadow: 0 0 0 0 rgba(139,92,246,0.20); }
      50%      { box-shadow: 0 0 0 6px rgba(139,92,246,0.08); }
    }
    .cs-pricing-highlight {
      animation: cs-ring-pulse 3s ease-in-out infinite;
    }
  `;
  document.head.appendChild(s);
}

/* ── IntersectionObserver hook for scroll-reveal ───────────────── */
function useScrollReveal() {
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('cs-visible');
            observerRef.current?.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' },
    );
    return () => observerRef.current?.disconnect();
  }, []);

  const revealRef = useCallback((node: HTMLElement | null) => {
    if (node && observerRef.current) {
      node.classList.add('cs-reveal');
      observerRef.current.observe(node);
    }
  }, []);

  return revealRef;
}

/* ─── Module logos ──────────────────────────────────────────────── */
const ssLogo = require('../../assets/cs_sslightlogo.png');
const orbitalLogo = require('../../assets/cs_orbitallightlogo.png');
const cosmoLogo = require('../../assets/cs_orbitallightlogo.png'); // placeholder until cs_cosmolightlogo.png ships

/* ─── Section-nav keys ──────────────────────────────────────────── */
type NavKey = 'home' | 'problem' | 'how' | 'industries' | 'investors' | 'pricing';
const NAV_ITEMS: { key: NavKey; label: string }[] = [
  { key: 'home', label: 'Home' },
  { key: 'problem', label: 'Problem' },
  { key: 'how', label: 'How It Works' },
  { key: 'industries', label: 'Industries' },
  { key: 'investors', label: 'Investors' },
  { key: 'pricing', label: 'Pricing' },
];

/* ─── Static data arrays ────────────────────────────────────────── */
const STATS = [
  { value: '10×', label: '⚡ Faster than custom dev' },
  { value: '0', label: '🚫 Lines of code needed' },
  { value: '100%', label: '🔒 You own your data' },
  { value: '∞', label: '♾️ Unlimited workspaces' },
];

const CAPABILITIES = [
  { icon: '🧩', title: 'Workspace Creator', text: 'Build your app visually, no code.' },
  { icon: '🛡️', title: 'Role & Permission Engine', text: 'Control who sees what, per field.' },
  { icon: '🤖', title: 'Bebo — AI Builder', text: 'AI builds workspaces for you.' },
  { icon: '📊', title: 'Board & Record Runtime', text: 'Boards, records, and editing — auto-generated.' },
  { icon: '🔗', title: 'Portable Persistence', text: 'Switch databases anytime, keep everything.' },
  { icon: '🌐', title: 'Live API Integrations', text: 'Drug lookups, rates — built in.' },
];

/* ─── Dedicated module deep-dives ───────────────────────────────── */
type ModuleTabKey = 'signal-studio' | 'orbital' | 'cosmograph';
const MODULE_TABS: {
  key: ModuleTabKey;
  logo: any;
  tagline: string;
  what: string;
  why: string;
  impact: string;
  capabilities: { label: string; desc: string }[];
}[] = [
  {
    key: 'signal-studio',
    logo: ssLogo,
    tagline: 'Automate anything — no code, no scripts.',
    what: 'Drag-and-drop flows that trigger on events, webhooks, or schedules — runs instantly on your device.',
    why: 'Teams waste hours on manual follow-ups. Signal Studio closes those gaps automatically.',
    impact: 'Cut 60–80% of manual tasks in week one. Zero extra cost per run.',
    capabilities: [
      { label: '🎨 Visual Flow Builder', desc: 'Drag, drop, connect — done.' },
      { label: '⚡ Event Triggers', desc: 'Fires when records change.' },
      { label: '🔔 Webhook Triggers', desc: 'Connects to outside apps.' },
      { label: '⏰ Scheduled Triggers', desc: 'Runs on a timer you set.' },
      { label: '🔀 Conditional Logic', desc: 'If this, then that — simple.' },
      { label: '⛓️ Action Chains', desc: 'Updates, notifications, API calls.' },
      { label: '💻 Local Execution', desc: 'Runs on-device, super fast.' },
      { label: '📈 Run Stats & Audit', desc: 'See every run\'s outcome.' },
      { label: '🤖 AI Flow Suggestions', desc: 'Bebo suggests flows for you.' },
      { label: '🔁 Retry & Error Policies', desc: 'Auto-retries if something fails.' },
    ],
  },
  {
    key: 'orbital',
    logo: orbitalLogo,
    tagline: 'Connect your tools — no middleware needed.',
    what: 'A marketplace of ready-to-use integrations like DocuSign and QuickBooks — just pick and activate.',
    why: 'Other platforms make integrations hard. Orbital makes them one-click.',
    impact: 'Go live in 30 seconds. Every integration auto-connects to Signal Studio.',
    capabilities: [
      { label: '🛒 Integration Marketplace', desc: 'Browse and activate instantly.' },
      { label: '📦 Pre-Wired Templates', desc: 'DocuSign, QuickBooks, and more.' },
      { label: '🔐 Multi-Auth Support', desc: 'OAuth, API key, or basic.' },
      { label: '✅ Pre-Flight Validation', desc: 'Checks everything before going live.' },
      { label: '🔍 Discoverable Fields', desc: 'See what each integration offers.' },
      { label: '📡 Auto-Registered Signals', desc: 'Triggers flow into Signal Studio.' },
      { label: '⚙️ Two-Layer Config', desc: 'Pick template, set credentials — done.' },
      { label: '🛡️ RBAC-Protected', desc: 'Only authorized roles can configure.' },
      { label: '📊 Integration Dashboard', desc: 'Status and sync at a glance.' },
      { label: '🌐 Custom HTTP Endpoint', desc: 'Connect any API you want.' },
    ],
  },
  {
    key: 'cosmograph',
    logo: cosmoLogo,
    tagline: 'Import any data — auto-mapped, privacy-safe.',
    what: 'Scans your file\'s structure, detects private info, and maps columns to your workspace fields — automatically.',
    why: 'Data migration usually takes weeks. Cosmograph does it in minutes.',
    impact: 'Guided 3-step tour. Auto-accepts easy matches. Under 3 minutes to import.',
    capabilities: [
      { label: '🧠 Schema Intelligence', desc: 'Figures out data types automatically.' },
      { label: '🔏 PII / PHI Classification', desc: 'Flags personal or medical data.' },
      { label: '🔑 Primary Key Detection', desc: 'Finds your unique identifiers.' },
      { label: '🔗 Foreign Key Discovery', desc: 'Links related tables together.' },
      { label: '🎯 Semantic Column Matching', desc: 'Maps columns to your fields.' },
      { label: '📋 Pass 1 / 2 / 3 Tour', desc: 'Step-by-step guided mapping.' },
      { label: '📚 Pattern Libraries', desc: 'Gets smarter each time you import.' },
      { label: '🔒 Network-Isolated Scan', desc: 'Your data never leaves the vault.' },
      { label: '📥 Import Templates', desc: 'Save and reuse your mappings.' },
      { label: '🚀 CoreSpace Handoff', desc: 'Data flows into your workspace.' },
    ],
  },
];

const HOW_STEPS = [
  { step: '01', title: '💬 Describe your business', text: 'Tell Bebo what you do — it builds everything.' },
  { step: '02', title: '🛠️ Refine in the Creator', text: 'Drag fields, set stages, add forms.' },
  { step: '03', title: '🚀 Go live instantly', text: 'Publish — your team starts working immediately.' },
  { step: '04', title: '📈 Automate & scale', text: 'Add automations as you grow.' },
];

const INDUSTRIES = [
  { name: '🏠 Property Management', desc: 'Leases, tenants, maintenance — tracked.' },
  { name: '📋 Insurance & Claims', desc: 'Policies, claims, adjusters — organized.' },
  { name: '🏥 Healthcare Ops', desc: 'Patients, providers, care — coordinated.' },
  { name: '⚖️ Legal Practice', desc: 'Cases, clients, documents — managed.' },
  { name: '🔧 Field Services', desc: 'Work orders, dispatch — simplified.' },
  { name: '🎓 Education Admin', desc: 'Enrollment, scheduling — streamlined.' },
  { name: '💼 Sales & CRM', desc: 'Leads, deals, pipeline — visible.' },
  { name: '🚛 Logistics & Supply Chain', desc: 'Shipments, carriers, docks — connected.' },
  { name: '💰 Finance & Lending', desc: 'Loans, payments, compliance — handled.' },
  { name: '💊 DSCSA Pharma', desc: 'Serialization, verification, traceability — compliant.' },
  { name: '🔩 WRVAS', desc: 'Receiving, repair, QA — audited.' },
  { name: '🏨 Hospitality', desc: 'Reservations, guests, events — smooth.' },
];

const TIERS: {
  name: string; audience: string; description: string;
  price: string; period: string; savings?: string;
  reasoning: string;
  featureGroups: { heading: string; items: string[] }[];
  cta: string; highlight: boolean;
}[] = [
  {
    name: 'Starter',
    audience: 'For individuals & solo operators',
    description: 'Get started — see how CoreSpace replaces your spreadsheets.',
    price: '$0',
    period: '/ month',
    reasoning: 'Free because it costs us almost nothing to host a single workspace. We want you to try the platform with zero risk.',
    featureGroups: [
      { heading: 'What\'s included:', items: ['1 workspace (1 industry)', 'Up to 500 records', 'Basic role permissions', 'Community support'] },
    ],
    cta: 'Your free plan',
    highlight: false,
  },
  {
    name: 'Pro',
    audience: 'For small teams & growing businesses',
    description: 'Unlimited workspaces + automation — everything to run operations.',
    price: '$39',
    period: '/ seat / mo',
    savings: 'Save 20% with yearly billing',
    reasoning: '$39 covers compute for unlimited workspaces, AI processing (Bebo), automation engine cycles, and priority support staff. Each seat adds near-zero infrastructure cost — the price reflects the tooling value, not server cost.',
    featureGroups: [
      { heading: 'Unlimited access to:', items: ['Unlimited workspaces', 'Signal Studio automations', 'Bebo AI workspace builder', 'Custom branding & shells'] },
      { heading: 'Additional features:', items: ['Priority email support', 'Cosmograph data importer', 'Template marketplace access'] },
    ],
    cta: 'Start 14-day free trial',
    highlight: true,
  },
  {
    name: 'Enterprise',
    audience: 'For organizations & multi-team ops',
    description: 'Dedicated infrastructure, compliance, and white-label.',
    price: '$99',
    period: '/ seat / mo',
    savings: 'Save 30% with annual contract',
    reasoning: '$99 covers a dedicated Cosmos DB / Postgres instance, tenant isolation, SSO integration, SLA-backed uptime, and a named success manager. The premium reflects real infrastructure and compliance costs — SOC 2 audits, dedicated compute, and guaranteed SLA.',
    featureGroups: [
      { heading: 'Everything in Pro, plus:', items: ['Dedicated database instance', 'SSO & audit log retention', 'Cosmos DB or Postgres choice', 'White-label option'] },
      { heading: 'Enterprise support:', items: ['Named success manager', '99.9% SLA guarantee', 'Custom onboarding & training', 'Invoice billing (NET 30)'] },
    ],
    cta: 'Contact Sales',
    highlight: false,
  },
];

type MarketingScreenProps = {
  onContinue: () => void;
};

export function MarketingScreen({ onContinue }: MarketingScreenProps) {
  const { styles } = useUiTheme();
  const [activeTab, setActiveTab] = useState<NavKey>('home');
  const [moduleTab, setModuleTab] = useState<ModuleTabKey>('signal-studio');
  const [scrollOffsetY, setScrollOffsetY] = useState(0);
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const lastScrollYRef = useRef(0);
  const [navVisible, setNavVisible] = useState(true);
  const [anchors, setAnchors] = useState<Record<NavKey, number>>({ home: 0, problem: 0, how: 0, industries: 0, investors: 0, pricing: 0 });
  const revealRef = useScrollReveal();

  useEffect(() => { ensureMarketingCSS(); }, []);

  const sectionInset = Math.max(18, Math.min(120, Math.floor((width - 980) / 2)));
  const clamp = (min: number, preferred: number, max: number) => Math.max(min, Math.min(max, preferred));
  const spaceSm = clamp(8, Math.round(width * 0.009), 14);
  const spaceMd = clamp(12, Math.round(width * 0.014), 22);
  const spaceLg = clamp(18, Math.round(width * 0.02), 34);
  const compactCtas = width < 760;
  const heroTitleSize = clamp(34, Math.round(width * 0.058), 58);
  const heroTitleLineHeight = clamp(40, Math.round(width * 0.064), 64);
  const heroSubtitleSize = clamp(15, Math.round(width * 0.021), 21);
  const heroSubtitleLineHeight = clamp(22, Math.round(width * 0.03), 31);
  const sectionTitleSize = clamp(24, Math.round(width * 0.034), 34);
  const sectionTitleLineHeight = clamp(30, Math.round(width * 0.041), 40);
  const sectionBodySize = clamp(14, Math.round(width * 0.016), 17);
  const sectionBodyLineHeight = clamp(21, Math.round(width * 0.024), 26);
  const navShrinkProgress = Math.max(0, Math.min(1, scrollOffsetY / 140));
  const navScrolled = scrollOffsetY > 60;
  const navVerticalPadding = Math.round((Math.max(10, spaceSm) * (1 - navShrinkProgress)) + (6 * navShrinkProgress));
  const navHorizontalPadding = Math.round((Math.max(spaceMd, sectionInset) * (1 - navShrinkProgress)) + (Math.max(12, Math.floor(sectionInset * 0.65)) * navShrinkProgress));
  const navLogoWidth = Math.round((210 * (1 - navShrinkProgress)) + (168 * navShrinkProgress));
  const navLogoHeight = Math.round((64 * (1 - navShrinkProgress)) + (50 * navShrinkProgress));
  const navMenuButtonHeight = Math.round((34 * (1 - navShrinkProgress)) + (30 * navShrinkProgress));
  const navMenuButtonPaddingX = Math.round((12 * (1 - navShrinkProgress)) + (10 * navShrinkProgress));
  const navMenuFontSize = Math.round((13 * (1 - navShrinkProgress)) + (12 * navShrinkProgress));

  /* ── Shared inline styles ─────────────────────────────────────── */
  const glassCard: Record<string, unknown> = {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    background: 'linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03))',
    backgroundColor: 'rgba(255,255,255,0.04)',
    backdropFilter: 'blur(14px)',
    boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
    borderRadius: 14,
    overflow: 'hidden',
  };
  const navButtonBaseStyle = {
    minHeight: navMenuButtonHeight,
    paddingHorizontal: navMenuButtonPaddingX,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    backdropFilter: 'blur(10px)',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  } as const;
  const navButtonActiveStyle = {
    borderColor: 'rgba(139,92,246,0.40)',
    backgroundColor: 'rgba(139,92,246,0.16)',
    shadowColor: '#8B5CF6',
    shadowOpacity: 0.22,
  } as const;
  const navLoginButtonStyle = {
    minHeight: navMenuButtonHeight,
    paddingHorizontal: navMenuButtonPaddingX + 2,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.40)',
    background: 'linear-gradient(135deg, rgba(139,92,246,0.85), rgba(59,130,246,0.65))',
    backgroundColor: '#8C5BF5',
    boxShadow: '0 18px 40px rgba(139,92,246,0.18)',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    shadowColor: '#8B5CF6',
    shadowOpacity: 0.28,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
  } as const;

  const setAnchor = useCallback(
    (key: NavKey) =>
      (event: LayoutChangeEvent) => {
        const nextY = event.nativeEvent.layout.y;
        setAnchors((current) => (current[key] === nextY ? current : { ...current, [key]: nextY }));
      },
    [],
  );

  const goToSection = useCallback(
    (key: NavKey) => {
      setActiveTab(key);
      const offset = key === 'home' ? 0 : 92;
      scrollRef.current?.scrollTo({ y: Math.max(0, anchors[key] - offset), animated: true });
    },
    [anchors],
  );

  /* ── Helpers ─────────────────────────────────────────────────── */
  const SectionGlass = ({ children, onLayout, gap }: { children: React.ReactNode; onLayout?: (e: LayoutChangeEvent) => void; gap?: number }) => (
    <View
      style={{ gap: gap ?? spaceMd, marginTop: spaceLg + 10, paddingVertical: 4 }}
      onLayout={onLayout}
    >
      {children}
    </View>
  );

  return (
    <View style={[styles.landingWrap, { backgroundColor: '#050608' } as any]}>
    <NebulaBackground mode="night" />

    {/* ─── Sticky nav (show on scroll-up) ────────────────────── */}
    <View style={{
      position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
      transform: navVisible ? 'translateY(0)' : 'translateY(-100%)',
      opacity: navVisible ? 1 : 0,
      transition: 'transform 0.38s cubic-bezier(0.4,0,0.2,1), opacity 0.28s ease',
    } as any}>
      <View
        style={{
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          paddingHorizontal: navHorizontalPadding, paddingVertical: navVerticalPadding,
          ...(navScrolled ? {
            backgroundColor: 'rgba(7,8,12,0.88)',
            backdropFilter: 'blur(18px)',
            WebkitBackdropFilter: 'blur(18px)',
            borderBottom: '1px solid rgba(139,92,246,0.10)',
            boxShadow: '0 4px 30px rgba(0,0,0,0.30)',
          } : {
            backgroundColor: 'transparent',
          }),
          transition: 'background-color 0.4s ease, box-shadow 0.4s ease',
        } as any}
      >
        <BrandLogo width={navLogoWidth} height={navLogoHeight} />
        <View style={[styles.landingTopMenu, { flexWrap: 'wrap', gap: 2, alignItems: 'center' }]}>
          {NAV_ITEMS.map((item) => {
            const isActive = activeTab === item.key;
            return (
              <Pressable
                key={item.key}
                style={{ paddingHorizontal: navMenuButtonPaddingX + 2, paddingVertical: 8, position: 'relative' } as any}
                onPress={() => goToSection(item.key)}
              >
                <Text style={{
                  fontSize: navMenuFontSize,
                  color: isActive ? '#FFFFFF' : 'rgba(235,223,255,0.60)',
                  fontWeight: isActive ? '800' : '500',
                  letterSpacing: 0.4,
                  transition: 'color 0.3s ease',
                } as any}>{item.label}</Text>
                <View style={{
                  position: 'absolute', bottom: 0, left: '22%', right: '22%', height: 2, borderRadius: 1,
                  background: isActive ? 'linear-gradient(90deg, #8C5BF5, #3B82F6)' : 'transparent',
                  backgroundColor: isActive ? '#8C5BF5' : 'transparent',
                  boxShadow: isActive ? '0 0 10px rgba(139,92,246,0.50), 0 0 4px rgba(59,130,246,0.30)' : 'none',
                  transform: isActive ? 'scaleX(1)' : 'scaleX(0)',
                  transition: 'transform 0.35s cubic-bezier(0.4,0,0.2,1), background 0.3s ease, box-shadow 0.3s ease',
                } as any} />
              </Pressable>
            );
          })}
          <View style={{ width: 1, height: 18, backgroundColor: 'rgba(255,255,255,0.12)', marginHorizontal: 6 }} />
          <Pressable style={navLoginButtonStyle} onPress={onContinue}>
            <Text style={[styles.landingTopMenuText, { fontSize: navMenuFontSize, color: '#FFFFFF', fontWeight: '800' }]}>Login</Text>
          </Pressable>
        </View>
      </View>
    </View>

    {/* ─── Scrollable content ─────────────────────────────────── */}
    <ScrollView
      ref={scrollRef}
      style={[styles.landingWrap, { backgroundColor: 'transparent' }]}
      contentContainerStyle={[styles.landingContent, { paddingHorizontal: sectionInset, paddingBottom: spaceLg + 40, paddingTop: 86 }]}
      keyboardShouldPersistTaps="handled"
      onScroll={(event) => {
        const y = event.nativeEvent.contentOffset.y;
        setScrollOffsetY(y);
        const delta = y - lastScrollYRef.current;
        if (y < 80) setNavVisible(true);
        else if (delta < -5) setNavVisible(true);
        else if (delta > 10) setNavVisible(false);
        lastScrollYRef.current = y;
      }}
      scrollEventThrottle={16}
    >

      {/* ═══ HERO ═══════════════════════════════════════════════ */}
      <View style={[styles.landingHeroSection, { minHeight: clamp(500, Math.round(width * 0.62), 720), paddingVertical: spaceLg }]} onLayout={setAnchor('home')}>
        <BrandLogo width={480} height={175} />

        <div className="cs-reveal cs-visible cs-hero-badge">
          <Text style={{ color: '#E2B6FF', fontSize: 11, fontWeight: '700', letterSpacing: 0.6 }}>THE OPERATIONAL CORE PLATFORM</Text>
        </div>

        <div className="cs-reveal cs-visible cs-hero-title" style={{ '--cs-hero-title-size': `${heroTitleSize}px`, '--cs-hero-title-line': `${heroTitleLineHeight}px` } as React.CSSProperties}>
          <Text style={{ fontSize: heroTitleSize, lineHeight: heroTitleLineHeight, maxWidth: 860, ...styles.landingHeroTitle }}>
            Turn any service business into a structured, scalable operation — without code.
          </Text>
        </div>
        <div className="cs-reveal cs-visible cs-hero-subtitle" style={{ '--cs-hero-subtitle-size': `${heroSubtitleSize}px`, '--cs-hero-subtitle-line': `${heroSubtitleLineHeight}px` } as React.CSSProperties}>
          <Text style={{ fontSize: heroSubtitleSize, lineHeight: heroSubtitleLineHeight, maxWidth: 780, ...styles.landingHeroSubtitle }}>
            The no-code operational platform where admins design data models, enforce workflows, and automate decisions — enterprise consistency from day one.
          </Text>
        </div>

        <div className="cs-reveal cs-visible cs-hero-actions">
          <div className="cs-hero-actions" style={{ '--cs-gap': `${spaceSm}px` } as React.CSSProperties}>
            <Pressable style={styles.landingPrimaryCta} onPress={onContinue}>
              {/* @ts-ignore web className */}
              <div className="cs-cta-primary" style={{ display: 'contents' }} />
              <Text style={styles.landingPrimaryCtaText}>Start building — free</Text>
            </Pressable>
            <Pressable style={styles.landingSecondaryCta} onPress={() => goToSection('how')}>
              <Text style={styles.landingSecondaryCtaText}>See the platform</Text>
            </Pressable>
          </div>
        </div>

        {/* Stats bar */}
        <div className="cs-reveal cs-visible cs-hero-stats">
          <div className="cs-hero-stats" style={{ '--cs-gap': `${compactCtas ? 16 : 32}px` } as React.CSSProperties}>
            {STATS.map((s, i) => (
              <div key={`stat-${i}`} style={{ alignItems: 'center', minWidth: 100 }}>
                <div className="cs-stat-value" style={{ fontSize: 28, fontWeight: 800 }}>{s.value}</div>
                <span style={{ color: '#C9B8EA', fontSize: 11, fontWeight: 600, textAlign: 'center', marginTop: 2 }}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="cs-reveal cs-visible cs-hero-demo">
          <Text style={[styles.landingTrustText, { marginTop: 32 }]}>See It In Action</Text>
          <div className="cs-hero-demo-iframe">
            <iframe
              src="https://scribehow.com/embed/Create_and_Manage_DSCSA_Serialization_Workflows_in_CoreSpace__2Li0RiRpQE29FKGE5INJeQ?removeLogo=true"
              width="100%"
              height="679"
              allow="fullscreen"
              style={{ aspectRatio: '800 / 679', border: 0, minHeight: 480, display: 'block' } as any}
            />
          </div>
        </div>
      </View>

      <div className="cs-section-divider" />

      {/* ═══ THE PROBLEM ════════════════════════════════════════ */}
      <View onLayout={setAnchor('problem')}>
        <div ref={revealRef}>
          <SectionGlass>
            <Text style={[styles.landingSectionEyebrow, { textAlign: 'center', width: '100%' }]}>⚠️ THE PROBLEM</Text>
            <Text style={[styles.landingSectionTitle, { fontSize: sectionTitleSize, lineHeight: sectionTitleLineHeight, textAlign: 'center', width: '100%' }]}>Your tools are scattered. Your process is broken.</Text>
            <div className="cs-problem-panel">
              { [
                { pain: '📂 Data in 5+ different apps', cost: 'Hours wasted every week.' },
                { pain: '🔀 No consistent process', cost: 'Quality drops at scale.' },
                { pain: '💸 Custom software costs $100K+', cost: 'Too slow for small teams.' },
              ].map((item, i) => (
                <div key={`pain-${i}`} className="cs-glass-card cs-problem-card">
                  <Text style={{ color: '#FF8A8A', fontSize: 13, fontWeight: '700', textAlign: 'center' }}>{item.pain}</Text>
                  <Text style={{ color: '#C9B8EA', fontSize: 12, lineHeight: 18, textAlign: 'center' }}>{item.cost}</Text>
                </div>
              ))}
            </div>
          </SectionGlass>
        </div>
      </View>

      <div className="cs-section-divider" />

      {/* ═══ HOW IT WORKS ═══════════════════════════════════════ */}
      <View onLayout={setAnchor('how')}>
        <div ref={revealRef}>
          <SectionGlass>
            <Text style={[styles.landingSectionEyebrow, { textAlign: 'center', width: '100%' }]}>📖 HOW IT WORKS</Text>
            <Text style={[styles.landingSectionTitle, { fontSize: sectionTitleSize, lineHeight: sectionTitleLineHeight, textAlign: 'center', width: '100%' }]}>Four steps — you're live</Text>
            <div className="cs-how-panel">
              {HOW_STEPS.map((s, i) => (
                <div key={`step-${i}`} className="cs-glass-card cs-how-card">
                  <View style={{ width: 48, height: 48, borderRadius: 24, borderWidth: 1, borderColor: 'rgba(139,92,246,0.45)', backgroundColor: 'rgba(139,92,246,0.14)', alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: '#D8BBFF', fontSize: 15, fontWeight: '800' }}>{s.step}</Text>
                  </View>
                  <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '700', textAlign: 'center' }}>{s.title}</Text>
                  <Text style={{ color: '#EBDFFF', fontSize: 12, lineHeight: 18, textAlign: 'center' }}>{s.text}</Text>
                </div>
              ))}
            </div>
          </SectionGlass>
        </div>
      </View>

      <div className="cs-section-divider" />

      {/* ═══ INDUSTRIES ═════════════════════════════════════════ */}
      <View onLayout={setAnchor('industries')}>
        <div ref={revealRef}>
          <SectionGlass>
            <Text style={styles.landingSectionEyebrow}>🏭 BUILT FOR ANY INDUSTRY</Text>
            <Text style={[styles.landingSectionTitle, { fontSize: sectionTitleSize, lineHeight: sectionTitleLineHeight }]}>
              One platform, any business
            </Text>
            <Text style={[styles.landingSectionText, { fontSize: sectionBodySize, lineHeight: sectionBodyLineHeight }]}>
              12 templates ready to go — never start from scratch.
            </Text>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
              {INDUSTRIES.map((ind, i) => (
                <div key={`ind-${i}`} className="cs-glass-card" style={{ ...(glassCard as any), flex: 1, minWidth: compactCtas ? '47%' : 170, maxWidth: compactCtas ? '48%' : '24%', padding: 16, gap: 4 }}>
                  <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '700' }}>{ind.name}</Text>
                  <Text style={{ color: '#C9B8EA', fontSize: 12, lineHeight: 17 }}>{ind.desc}</Text>
                </div>
              ))}
            </View>
          </SectionGlass>
        </div>
      </View>

      <div className="cs-section-divider" />

      {/* ═══ INVESTORS ═════════════════════════════════════════ */}
      <View onLayout={setAnchor('investors')}>
        <div ref={revealRef}>
          <SectionGlass>
            <Text style={styles.landingSectionEyebrow}>💎 INVESTOR OVERVIEW</Text>
            <Text style={[styles.landingSectionTitle, { fontSize: sectionTitleSize, lineHeight: sectionTitleLineHeight }]}>
              Why invest in CoreSpace
            </Text>
            <Text style={[styles.landingSectionText, { fontSize: sectionBodySize, lineHeight: sectionBodyLineHeight }]}>
              No direct competitor. Huge gap between cheap CRMs and expensive custom apps — we fill it.
            </Text>

            <View style={{ ...(glassCard as any), padding: 20, gap: 12, marginTop: 4 }}>
              <Text style={{ color: '#FD9CFD', fontSize: 11, fontWeight: '800', letterSpacing: 1 }}>📊 MARKET OPPORTUNITY</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                { [
                  { metric: '$120B+', insight: 'Business ops software market is massive.' },
                  { metric: '72%', insight: 'Small businesses slowed by scattered tools.' },
                  { metric: '<5%', insight: 'Few service firms use real ops software.' },
                  { metric: '34%', insight: 'No-code platforms grow at record pace.' },
                ].map((item, i) => (
                  <View key={`mkt-${i}`} style={{ ...(glassCard as any), flex: 1, minWidth: compactCtas ? '100%' : 200, flexDirection: 'row', gap: 16, alignItems: 'center', padding: 14 }}>
                    <Text style={{ color: '#8C5BF5', fontSize: 38, fontWeight: '900', minWidth: 90, textAlign: 'right' }}>{item.metric}</Text>
                    <Text style={{ color: '#EBDFFF', fontSize: 18, fontWeight: '800', lineHeight: 24, flex: 1 }}>{item.insight}</Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={{ ...(glassCard as any), padding: 20, gap: 12 }}>
              <Text style={{ color: '#FD9CFD', fontSize: 18, fontWeight: '900', letterSpacing: 1 }}>💰 WHERE THE MONEY GOES</Text>
              <Text style={{ color: '#EBDFFF', fontSize: 14, lineHeight: 22 }}>
                Seed funding split across four areas:
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                { [
                  { pct: '40%', pillar: '🛠️ Engineering & Product', detail: 'Builds features enterprises demand, fast.' },
                  { pct: '25%', pillar: '📣 Go-to-Market', detail: 'Drives growth with content and partners.' },
                  { pct: '20%', pillar: '🤝 Customer Success', detail: 'Onboards, supports, and retains clients.' },
                  { pct: '15%', pillar: '🏦 Operations & Reserve', detail: 'Covers security, cloud, and cash buffer.' },
                ].map((item, i) => (
                  <View key={`fund-${i}`} style={{ ...(glassCard as any), flex: 1, minWidth: compactCtas ? '100%' : 220, padding: 16, gap: 6 }}>
                    <Text style={{ color: '#8C5BF5', fontSize: 34, fontWeight: '900' }}>{item.pct}</Text>
                    <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '900' }}>{item.pillar}</Text>
                    <Text style={{ color: '#C9B8EA', fontSize: 15, lineHeight: 22 }}>{item.detail}</Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={{ ...(glassCard as any), padding: 20, gap: 12 }}>
              <Text style={{ color: '#FD9CFD', fontSize: 18, fontWeight: '900', letterSpacing: 1 }}>📈 RETURN ON INVESTMENT</Text>
              <Text style={{ color: '#EBDFFF', fontSize: 14, lineHeight: 22 }}>
                Recurring revenue, near-zero cost per extra workspace.
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 4 }}>
                { [
                  { label: '🔄 Revenue Retention', value: '130%+', note: 'Clients expand usage every year.' },
                  { label: '💵 Gross Margin', value: '88%', note: 'Nearly all revenue is profit.' },
                  { label: '⏱️ CAC Payback', value: '<6 mo', note: 'Trials convert in days, not months.' },
                  { label: '📊 LTV:CAC Ratio', value: '8:1', note: 'High retention, very low churn.' },
                  { label: '🎯 ARR Target (Y2)', value: '$4.2M', note: '1,400 Pro seats, 12 enterprise deals.' },
                  { label: '✅ Cash-Flow Positive', value: '18 mo', note: 'Breakeven before Series A.' },
                ].map((item, i) => (
                  <View key={`roi-${i}`} style={{ ...(glassCard as any), flex: 1, minWidth: compactCtas ? '100%' : 180, maxWidth: compactCtas ? undefined : '31%', padding: 16, gap: 4 }}>
                    <Text style={{ color: '#8C5BF5', fontSize: 32, fontWeight: '900' }}>{item.value}</Text>
                    <Text style={{ color: '#FFFFFF', fontSize: 17, fontWeight: '900' }}>{item.label}</Text>
                    <Text style={{ color: '#C9B8EA', fontSize: 13, lineHeight: 18 }}>{item.note}</Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={{ ...(glassCard as any), padding: 20, gap: 12 }}>
              <Text style={{ color: '#FD9CFD', fontSize: 11, fontWeight: '800', letterSpacing: 1 }}>⚔️ COMPETITIVE LANDSCAPE</Text>
              <Text style={{ color: '#EBDFFF', fontSize: 14, lineHeight: 22 }}>
                Nobody else has built this. Here's why:
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                { [
                  {
                    competitor: '📋 No-Code Tools (Airtable, Monday, Notion)',
                    gap: 'Good for tasks, but no real permissions, workflows, or structure.',
                    edge: 'CoreSpace has built-in permissions, automation, and data models.',
                  },
                  {
                    competitor: '🏢 Industry Software (Buildium, Clio)',
                    gap: 'Works for one industry only. Can\'t adapt to anything else.',
                    edge: 'CoreSpace works for any industry — same platform, same day.',
                  },
                  {
                    competitor: '👨‍💻 Custom Development (Agencies)',
                    gap: 'Costs $200K+, takes 6–18 months. Most businesses can\'t afford it.',
                    edge: 'CoreSpace delivers the same structure in hours — one admin, no devs.',
                  },
                  {
                    competitor: '⚙️ Low-Code (OutSystems, PowerApps)',
                    gap: 'Still needs developers and long setup. Builds apps, not operations.',
                    edge: 'CoreSpace is admin-first — no code, no tech skills needed.',
                  },
                ].map((item, i) => (
                  <View key={`comp-${i}`} style={{ ...(glassCard as any), flex: 1, minWidth: compactCtas ? '100%' : 280, padding: 16, gap: 8 }}>
                    <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '800' }}>{item.competitor}</Text>
                    <Text style={{ color: '#C9B8EA', fontSize: 12, lineHeight: 18 }}>{item.gap}</Text>
                    <View style={{ flexDirection: 'row', gap: 6, alignItems: 'flex-start' }}>
                      <Text style={{ color: '#22C55E', fontSize: 14, fontWeight: '800', marginTop: 1 }}>→</Text>
                      <Text style={{ color: '#22C55E', fontSize: 12, lineHeight: 18, flex: 1, fontWeight: '600' }}>{item.edge}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>

            <View style={{ ...(glassCard as any), padding: 20, gap: 12 }}>
              <Text style={{ color: '#FD9CFD', fontSize: 11, fontWeight: '800', letterSpacing: 1 }}>✨ THE SEAMLESS ADVANTAGE</Text>
              <Text style={{ color: '#EBDFFF', fontSize: 14, lineHeight: 22 }}>
                No one has ever built this before. Here's why it works:
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                { [
                  { icon: '⚡', title: 'Minutes to Value', text: 'Build → publish → your team works. Under 10 minutes.' },
                  { icon: '🔄', title: 'Zero Lock-In', text: 'Take your data anywhere. That trust keeps customers.' },
                  { icon: '🧠', title: 'AI Grows Revenue', text: 'Bebo suggests more tools as you grow.' },
                  { icon: '🏗️', title: 'Template Flywheel', text: 'Each template is a ready-made sales pitch.' },
                  { icon: '📈', title: 'Compounding Moat', text: 'More workspaces = harder to leave. Naturally.' },
                  { icon: '🌍', title: 'Every Industry at Once', text: 'One platform serves 12+ verticals on day one.' },
                ].map((item, i) => (
                  <View key={`adv-${i}`} style={{ ...(glassCard as any), flex: 1, minWidth: compactCtas ? '100%' : 200, maxWidth: compactCtas ? undefined : '31%', padding: 16, gap: 6 }}>
                    <Text style={{ fontSize: 22 }}>{item.icon}</Text>
                    <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '700' }}>{item.title}</Text>
                    <Text style={{ color: '#C9B8EA', fontSize: 12, lineHeight: 18 }}>{item.text}</Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={{ ...(glassCard as any), padding: 20, gap: 12 }}>
              <Text style={{ color: '#FD9CFD', fontSize: 11, fontWeight: '800', letterSpacing: 1 }}>🏆 TRACTION & MILESTONES</Text>
              <View style={{ gap: 8 }}>
                { [
                  { milestone: 'Full platform live and working', status: '✅ Shipped' },
                  { milestone: 'AI builds workspaces from plain English', status: '✅ Shipped' },
                  { milestone: 'Multiple database options ready', status: '✅ Shipped' },
                  { milestone: '12 industry templates deployed', status: '✅ Shipped' },
                  { milestone: 'Live on two public domains', status: '✅ Live' },
                  { milestone: 'Smart data importer in progress', status: '🔧 Building' },
                  { milestone: '3 enterprise pilots in pipeline', status: '🎯 Next Quarter' },
                  { milestone: 'SOC 2 security certification', status: '🎯 Next Quarter' },
                ].map((item, i) => (
                  <View key={`ms-${i}`} style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                    <Text style={{ fontSize: 13, minWidth: 28 }}>{item.status.split(' ')[0]}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: '#EBDFFF', fontSize: 13, lineHeight: 19 }}>{item.milestone}</Text>
                      <Text style={{ color: '#8C5BF5', fontSize: 11, fontWeight: '700' }}>{item.status}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>

            <View style={{ ...(glassCard as any), padding: 20, gap: 12 }}>
              <Text style={{ color: '#FD9CFD', fontSize: 11, fontWeight: '800', letterSpacing: 1 }}>Interested in the CoreSpace opportunity?</Text>
              <Text style={{ color: '#C9B8EA', fontSize: 13, lineHeight: 20, textAlign: 'center', maxWidth: 500 }}>
                We're building the operational backbone for every service business on earth. If that resonates, let's talk.
              </Text>
              <Pressable style={styles.landingPrimaryCta} onPress={onContinue}>
                <Text style={styles.landingPrimaryCtaText}>Request Investor Deck</Text>
              </Pressable>
            </View>
          </SectionGlass>
        </div>
      </View>

      <div className="cs-section-divider" />

      {/* ═══ PRICING ════════════════════════════════════════════ */}
      <View onLayout={setAnchor('pricing')}>
        <div ref={revealRef}>
          <SectionGlass>
            <Text style={styles.landingSectionEyebrow}>💳 PRICING</Text>
            <Text style={[styles.landingSectionTitle, { fontSize: sectionTitleSize, lineHeight: sectionTitleLineHeight }]}>
              Transparent pricing — here's exactly why
            </Text>
            <Text style={[styles.landingSectionText, { fontSize: sectionBodySize, lineHeight: sectionBodyLineHeight, textAlign: 'center', maxWidth: 600, alignSelf: 'center' as const }]}>
              Every price reflects real infrastructure and support costs. No hidden margins.
            </Text>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14, alignItems: 'stretch' as const }}>
              {TIERS.map((tier, i) => (
                <div
                  key={`tier-${i}`}
                  className={`cs-glass-card${tier.highlight ? ' cs-pricing-highlight' : ''}`}
                  style={{
                    ...(glassCard as any),
                    flex: 1,
                    minWidth: compactCtas ? '100%' : 260,
                    padding: 0,
                    gap: 0,
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    ...(tier.highlight
                      ? { borderColor: 'rgba(139,92,246,0.55)', borderWidth: 1.5 }
                      : { borderColor: 'rgba(255,255,255,0.08)' }),
                  }}
                >
                  {/* Badge */}
                  {tier.highlight && (
                    <View style={{ backgroundColor: '#8C5BF5', paddingVertical: 6, alignItems: 'center' as const }}>
                      <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '800', letterSpacing: 0.8 }}>MOST POPULAR</Text>
                    </View>
                  )}

                  {/* Header zone */}
                  <View style={{ padding: 22, gap: 6, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' }}>
                    <Text style={{ color: '#FFFFFF', fontSize: 20, fontWeight: '800' }}>{tier.name}</Text>
                    <Text style={{ color: '#C9B8EA', fontSize: 12, fontWeight: '600' }}>{tier.audience}</Text>
                    <Text style={{ color: '#EBDFFF', fontSize: 12, lineHeight: 18, marginTop: 2 }}>{tier.description}</Text>

                    {/* Price */}
                    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 3, marginTop: 10 }}>
                      <Text style={{ color: '#FFFFFF', fontSize: 36, fontWeight: '800' }}>{tier.price}</Text>
                      {!!tier.period && <Text style={{ color: '#C9B8EA', fontSize: 13 }}>{tier.period}</Text>}
                    </View>
                    {!!tier.savings && (
                      <Text style={{ color: '#22C55E', fontSize: 12, fontWeight: '700', marginTop: 2 }}>{'💚 ' + tier.savings}</Text>
                    )}

                    {/* CTA */}
                    <Pressable
                      style={tier.highlight
                        ? [styles.landingPrimaryCta, { marginTop: 12, minWidth: 160, alignSelf: 'center', alignItems: 'center' as const }]
                        : [styles.landingSecondaryCta, { marginTop: 12, minWidth: 160, alignSelf: 'center', alignItems: 'center' as const }]}
                      onPress={onContinue}
                    >
                      <Text style={tier.highlight ? styles.landingPrimaryCtaText : styles.landingSecondaryCtaText}>{tier.cta}</Text>
                    </Pressable>
                  </View>

                  {/* Feature groups */}
                  <View style={{ padding: 22, gap: 16, flex: 1 }}>
                    {tier.featureGroups.map((group, gi) => (
                      <View key={`fg-${gi}`} style={{ gap: 7 }}>
                        <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '800' }}>{group.heading}</Text>
                        {group.items.map((item, fi) => (
                          <View key={`fi-${fi}`} style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
                            <Text style={{ color: '#8C5BF5', fontSize: 13, marginTop: 1 }}>✓</Text>
                            <Text style={{ color: '#EBDFFF', fontSize: 13, lineHeight: 19, flex: 1 }}>{item}</Text>
                          </View>
                        ))}
                      </View>
                    ))}
                  </View>

                  {/* Transparent reasoning */}
                  <View style={{ padding: 18, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)', backgroundColor: 'rgba(139,92,246,0.04)' }}>
                    <Text style={{ color: '#9B8ABE', fontSize: 10, fontWeight: '700', letterSpacing: 0.5, marginBottom: 4 }}>WHY THIS PRICE</Text>
                    <Text style={{ color: '#C9B8EA', fontSize: 11, lineHeight: 17 }}>{tier.reasoning}</Text>
                  </View>
                </div>
              ))}
            </View>

            <View style={{ flexDirection: compactCtas ? 'column' : 'row', gap: compactCtas ? 14 : 0, marginTop: 16, justifyContent: 'center' as const, alignItems: 'center' as const }}>
              {[
                { icon: '🔒', title: 'Secure payment', desc: 'Encrypted via Stripe' },
                { icon: '🚫', title: 'Cancel anytime', desc: 'No lock-ins, no penalties' },
                { icon: '💳', title: 'No credit card for free', desc: 'Start building immediately' },
              ].map((item, i) => (
                <View key={`trust-${i}`} style={{ flex: 1, alignItems: 'center' as const, gap: 4, paddingHorizontal: 12 }}>
                  <Text style={{ fontSize: 18 }}>{item.icon}</Text>
                  <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '700' }}>{item.title}</Text>
                  <Text style={{ color: '#C9B8EA', fontSize: 11, textAlign: 'center' }}>{item.desc}</Text>
                </View>
              ))}
            </View>
          </SectionGlass>
        </div>
      </View>

      <div className="cs-section-divider" />

      {/* ═══ FINAL CTA ══════════════════════════════════════════ */}
      <div ref={revealRef}>
        <View style={[styles.landingBottomActions, { paddingVertical: spaceLg + 16, gap: 14 }]}>
          <Text style={[styles.landingSectionTitle, { fontSize: sectionTitleSize, lineHeight: sectionTitleLineHeight, textAlign: 'center' }]}>
            Ready to run your business better?
          </Text>
          <Text style={[styles.landingSectionText, { fontSize: sectionBodySize, lineHeight: sectionBodyLineHeight, textAlign: 'center', maxWidth: 560 }]}>
            Free. Live in 10 minutes. No credit card.
          </Text>
          <View style={[styles.landingHeroActions, { marginTop: 4 }, compactCtas && { flexDirection: 'column', width: '100%', maxWidth: 420, gap: spaceSm }]}>
            <Pressable style={styles.landingPrimaryCta} onPress={onContinue}>
              <Text style={styles.landingPrimaryCtaText}>Get started — free</Text>
            </Pressable>
            <Pressable style={styles.landingSecondaryCta} onPress={() => goToSection('how')}>
              <Text style={styles.landingSecondaryCtaText}>Explore the platform</Text>
            </Pressable>
          </View>

          {/* Footer */}
          <View style={{ marginTop: 40, alignItems: 'center', gap: 6, opacity: 0.6 }}>
            <Text style={{ color: '#C9B8EA', fontSize: 11 }}>© 2026 CoreSpace. All rights reserved.</Text>
            <Text style={{ color: '#9B8ABE', fontSize: 10 }}>Built with React Native + Expo  •  Portable persistence  •  Powered by Bebo Ai</Text>
          </View>
        </View>
      </div>

    </ScrollView>
    </View>
  );
}
