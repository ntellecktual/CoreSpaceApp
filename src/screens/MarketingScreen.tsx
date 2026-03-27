import React, { useCallback, useEffect, useRef, useState } from 'react';
import '../../assets/marketing.css';
import { Image, LayoutChangeEvent, ScrollView, Text, View } from 'react-native';
import { useWindowDimensions } from 'react-native';
import { BrandLogo } from '../components/BrandLogo';
import { InteractivePressable as Pressable } from '../components/InteractivePressable';
import { useUiTheme } from '../context/UiThemeContext';

/* ─── Marketing page CSS — injected once ────────────────────────── */
const MKT_STYLE_ID = 'cs-mktg-css';
function ensureMarketingCSS() {
  if (typeof document === 'undefined') return;
  // Inject Tailwind CDN once — provides utility classes (tw- prefix)
  const TW_ID = 'cs-tailwind-cdn';
  if (!document.getElementById(TW_ID)) {
    const tw = document.createElement('script');
    tw.id = TW_ID;
    tw.src = 'https://cdn.tailwindcss.com';
    document.head.appendChild(tw);
  }
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
      box-shadow: 0 12px 40px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.22) !important;
      border-color: rgba(0,0,0,0.08) !important;
    }

    /* ── CTA glow pulse ────────────────────────────────────── */
    @keyframes cs-cta-glow {
      0%, 100% { box-shadow: 0 0 20px rgba(0,0,0,0.10), 0 8px 32px rgba(0,0,0,0.03); }
      50%      { box-shadow: 0 0 32px rgba(0,0,0,0.12), 0 12px 48px rgba(0,0,0,0.06); }
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
      background-color: rgba(0,0,0,0.03) !important;
      border-color: rgba(0,0,0,0.10) !important;
    }

    /* ── Section divider gradient ──────────────────────────── */
    .cs-section-divider {
      width: 100%; height: 1px; margin: 0 auto;
      background: linear-gradient(90deg, transparent 5%, rgba(0,0,0,0.08) 30%, rgba(59,130,246,0.22) 70%, transparent 95%);
    }

    /* ── Stat value shimmer ────────────────────────────────── */
    @keyframes cs-shimmer {
      0%   { background-position: -200% center; }
      100% { background-position: 200% center; }
    }
    .cs-stat-value {
      background: linear-gradient(90deg, #FFFFFF 30%, #B0C4E8 50%, #FFFFFF 70%);
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
      0%, 100% { box-shadow: 0 0 0 0 rgba(0,0,0,0.08); }
      50%      { box-shadow: 0 0 0 6px rgba(0,0,0,0.02); }
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
const planetLogo = require('../../assets/cs_planetlogo.png');
const haloIcon = require('../../assets/haloicon.png');

/* ─── Section-nav keys ──────────────────────────────────────────── */
type NavKey = 'home' | 'problem' | 'how' | 'industries' | 'investors' | 'pricing' | 'about' | 'blog' | 'careers';
const NAV_ITEMS: { key: NavKey; label: string }[] = [
  { key: 'home', label: 'Home' },
  { key: 'problem', label: 'Problem' },
  { key: 'how', label: 'How It Works' },
  { key: 'industries', label: 'Industries' },
  { key: 'pricing', label: 'Pricing' },
  { key: 'about', label: 'About' },
  { key: 'careers', label: 'Careers' },
];

/* ─── Static data arrays ────────────────────────────────────────── */
const STATS = [
  { value: '10×', label: '⚡ Faster case resolution' },
  { value: '0', label: '🚫 Missed deadlines' },
  { value: '100%', label: '🔒 Client data ownership' },
  { value: '∞', label: '♾️ Unlimited matters' },
];

const CAPABILITIES = [
  { icon: '🧩', title: 'Case Management Builder', text: 'Design matter workflows visually, no code.' },
  { icon: '🛡️', title: 'Role & Permission Engine', text: 'Control who sees what — attorney, paralegal, client.' },
  { icon: '🤖', title: 'Bebo — AI Legal Assistant', text: 'AI structures your practice operations instantly.' },
  { icon: '📊', title: 'Matter Tracking Runtime', text: 'Boards, cases, and deadlines — auto-generated.' },
  { icon: '🔗', title: 'Portable Persistence', text: 'Switch databases anytime, keep every case file.' },
  { icon: '🌐', title: 'Legal API Integrations', text: 'Court filings, document management — built in.' },
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
      { label: '🚀 Halo Internal Handoff', desc: 'Data flows into your workspace.' },
    ],
  },
];

const HOW_STEPS = [
  { step: '01', title: '💬 Describe your practice', text: 'Tell Bebo what you do — it builds everything.' },
  { step: '02', title: '🛠️ Refine in the Creator', text: 'Drag fields, set stages, add forms.' },
  { step: '03', title: '🚀 Go live instantly', text: 'Publish — your team starts working immediately.' },
  { step: '04', title: '📈 Automate & scale', text: 'Add automations as you grow.' },
];

const INDUSTRIES = [
  { name: '⚖️ Personal Injury', desc: 'Cases, clients, medical records — tracked.' },
  { name: '🏛️ Mass Tort Litigation', desc: 'Multi-plaintiff campaigns — organized at scale.' },
  { name: '📋 Insurance Defense', desc: 'Claims, depositions, settlements — streamlined.' },
  { name: '🏥 Medical Malpractice', desc: 'Expert reviews, timelines, damages — coordinated.' },
  { name: '🚗 Auto Accident Claims', desc: 'Police reports, repairs, liens — managed.' },
  { name: '👷 Workers Compensation', desc: 'Injury reports, hearings, benefits — tracked.' },
  { name: '📄 Contract Litigation', desc: 'Breach claims, discovery, negotiations — structured.' },
  { name: '🏠 Real Estate Disputes', desc: 'Title issues, closings, liens — organized.' },
  { name: '💼 Employment Law', desc: 'EEOC filings, settlements, compliance — handled.' },
  { name: '🔒 Regulatory Compliance', desc: 'Audits, filings, deadlines — never missed.' },
  { name: '📑 Document Review', desc: 'Discovery, privilege logs, productions — accelerated.' },
  { name: '🤝 Client Intake & CRM', desc: 'Leads, consultations, retainers — converted.' },
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
    description: 'Get started — see how Halo Internal replaces your case spreadsheets.',
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

/* ─── Investor profiles ─────────────────────────────────────────── */
const INVESTORS = [
  {
    name: 'Marcus Delacroix',
    title: 'Managing Partner',
    fund: 'Veridian Ventures',
    focus: 'B2B SaaS · HealthTech · Ops Automation',
    amount: '$500K',
    round: 'Seed',
    bio: 'Marcus has led over 30 early-stage investments across B2B SaaS and healthcare technology. He backed one of the first enterprise no-code platforms, which exited at $220M in 2021. His thesis centers on replacing operational fragmentation with unified, AI-augmented tooling.',
    thesis: '"The next wave is legal operations intelligence. Halo Internal is the infrastructure play I\'ve been looking for since 2019."',
    portfolio: ['MedLane (acquired)', 'Fieldstack', 'VerifyNow'],
    emoji: '💎',
    accent: '#111111',
  },
  {
    name: 'Priya Nairn',
    title: 'Partner',
    fund: 'BlueBridge Capital',
    focus: 'No-Code Platforms · Workflow Automation · SMB',
    amount: '$350K',
    round: 'Seed',
    bio: 'Priya leads BlueBridge\'s no-code and low-code portfolio spanning 14 active companies. She was previously CPO at WorkflowIQ (acquired by Salesforce). Her expertise is evaluating go-to-market readiness for platforms that democratize software development for non-technical teams.',
    thesis: '"Halo Internal solves the last-mile problem — the gap between what generic tools give law firms and what mid-market legal operations actually need."',
    portfolio: ['DeskFlow', 'Cloverfield CRM', 'FormBase'],
    emoji: '🚀',
    accent: '#3B82F6',
  },
  {
    name: 'Jordan Thatcher',
    title: 'Angel Investor · ex-CTO',
    fund: 'Personal Investment',
    focus: 'Infrastructure · Developer Tools · Multi-Tenant SaaS',
    amount: '$150K',
    round: 'Seed',
    bio: 'Jordan was CTO at Meridian Software for 9 years, scaling multi-tenant SaaS from Series A to $80M ARR. He invests personally in technical founders with deep architectural moats and a clear view on persistence strategy and data portability.',
    thesis: '"The portable persistence layer alone is a defensible moat. Add AI-assisted workspace generation and you have a compounding product flywheel."',
    portfolio: ['Databrace', 'LogicCore', 'PipelineIQ'],
    emoji: '🏗️',
    accent: '#22C55E',
  },
];

/* ─── About / module deep-dives ─────────────────────────────────── */
const ABOUT_MODULES = [
  {
    name: 'Halo Internal Platform',
    icon: '🌌',
    tagline: 'The Legal Operations Platform for Every Firm',
    color: '#111111',
    description: 'Halo Internal is a no-code legal operations platform that lets any law firm build, automate, and scale its case workflows without writing a single line of code. Enterprise-grade infrastructure accessible to firms of any size.',
    details: [
      { label: '🌍 Multi-Tenant Architecture', text: 'Full tenant isolation — dedicated branding, data, and configuration per client.' },
      { label: '🛡️ Role & Permission Engine', text: 'Field-level and workspace-level access control per persona.' },
      { label: '📊 Board & Record Runtime', text: 'Dynamic boards, intake forms, and lifecycle tracking — auto-generated from your config.' },
      { label: '🔗 Portable Persistence', text: 'Export to Cosmos DB, PostgreSQL, or MongoDB at any time — your data, your way.' },
    ],
  },
  {
    name: 'Signal Studio',
    icon: '⚡',
    tagline: 'Automate Anything. No Code. No Scripts.',
    color: '#3B82F6',
    description: 'Signal Studio is the automation engine. Build visual flows that respond to record events, webhooks, or schedules. Runs locally on-device with AI flow suggestions from Bebo and full audit trails.',
    details: [
      { label: '🎨 Visual Flow Builder', text: 'Drag signals to actions — any non-technical admin can build automations in minutes.' },
      { label: '🔔 Event + Webhook + Schedule', text: 'Fires on record change, inbound webhook payload, or a cron-style timer.' },
      { label: '🔀 Conditional Logic', text: 'Branch with AND/OR conditions evaluating field values, tags, or lifecycle stage.' },
      { label: '📈 Run Metrics + Audit', text: 'Total runs, failure rate, avg execution time, and a full event log per flow.' },
    ],
  },
  {
    name: 'Orbital',
    icon: '🛸',
    tagline: 'Integrate Your Tools. One Marketplace.',
    color: '#F59E0B',
    description: 'Orbital is the integration marketplace. Pick an integration, configure credentials and field mappings, and your workspace is live. Every integration auto-registers pre-wired triggers in Signal Studio.',
    details: [
      { label: '🛒 Integration Marketplace', text: 'DocuSign, QuickBooks, and growing. Every integration ships with a pre-built template.' },
      { label: '🔐 Multi-Auth Support', text: 'OAuth 2.0, API key, Basic Auth — whichever the integration requires, Orbital handles it.' },
      { label: '✅ Pre-Flight Validation', text: 'Validates credentials and mappings before activating — zero broken integrations.' },
      { label: '📡 Auto-Registered Signals', text: 'Integration triggers auto-appear in Signal Studio — connect events without any extra config.' },
    ],
  },
  {
    name: 'Cosmograph',
    icon: '🧬',
    tagline: 'Import Any Data. Auto-Mapped. Privacy-Safe.',
    color: '#22C55E',
    description: 'Cosmograph is the schema intelligence engine. Upload a CSV, Excel, or JSON file and Cosmograph scans structure, classifies PII/PHI, detects keys, and maps columns to workspace fields automatically.',
    details: [
      { label: '🧠 Schema Intelligence', text: 'Detects column types, nullability, cardinality, and business meaning automatically.' },
      { label: '🔏 PII / PHI Classification', text: 'Flags emails, SSNs, DOBs, medical record fields before import — privacy by default.' },
      { label: '🎯 Semantic Column Matching', text: 'Maps source columns to workspace fields by semantic similarity, not just name matching.' },
      { label: '🔒 Network-Isolated Scan', text: 'All scanning happens locally — your data never leaves the vault during analysis.' },
    ],
  },
  {
    name: 'Bebo — AI Builder',
    icon: '🤖',
    tagline: 'Describe Your Practice. Bebo Builds It.',
    color: '#EC4899',
    description: 'Bebo is the embedded AI assistant. Describe your practice in plain English and Bebo configures workspaces, intake forms, personas, lifecycle stages, and Signal Studio flows for you.',
    details: [
      { label: '🏗️ AI Workspace Builder', text: 'One prompt → complete workspace with fields, lifecycle stages, personas, and automations.' },
      { label: '📝 Auto-Fill & Validation', text: 'Reads context and prefills intake fields — catches errors before submission.' },
      { label: '🏷️ Tag Suggestions', text: 'Recommends tags based on record content and historical patterns.' },
      { label: '🔍 Query Engine', text: 'Ask plain-English questions about your data — Bebo returns counts, charts, insights.' },
    ],
  },
];

/* ─── Blog posts (static company news + live Dev.to SaaS feed) ──── */
type BlogPost = { id: string; title: string; summary: string; author: string; date: string; tag: string; readTime: number; url: string | null; emoji: string };
const BLOG_POSTS_STATIC: BlogPost[] = [
  { id: 'cs-1', title: 'Why We\'re Building the Operational Platform for Every Law Firm', summary: 'Most law firms are held together by spreadsheets, emails, and legacy case management tools. Halo Internal exists to change that — giving every firm the same operational clarity that Am Law 100 firms pay millions for.', author: 'Halo Internal Team', date: 'March 12, 2026', tag: 'Company News', readTime: 3, url: null, emoji: '🎉' },
  { id: 'cs-2', title: 'Introducing Cosmograph: Smart Legal Data Import Is Finally Here', summary: 'Today we are shipping Cosmograph to Pro and Enterprise firms. Scan, classify, and import any case data file in under 3 minutes — PII detection and schema mapping included.', author: 'Halo Internal Engineering', date: 'March 8, 2026', tag: 'Product Update', readTime: 4, url: null, emoji: '🧬' },
  { id: 'cs-3', title: 'Why Personal Injury Firms Choose Halo Internal Over Custom Software', summary: 'PI firms need case tracking, lifecycle governance, and document integrations — in one place. Here is how Halo Internal wins the legal operations conversation.', author: 'Halo Internal Product', date: 'February 28, 2026', tag: 'Industry Insight', readTime: 6, url: null, emoji: '⚖️' },
  { id: 'cs-4', title: 'Signal Studio Update: Webhook Triggers, Retry Policies, and Run Metrics v2', summary: 'Signal Studio got a major update: inbound webhooks now support payload parsing, failed runs auto-retry up to 3 times, and the run stats dashboard shows per-flow failure patterns.', author: 'Halo Internal Engineering', date: 'February 14, 2026', tag: 'Product Update', readTime: 5, url: null, emoji: '⚡' },
];

/* ─── Job listings ───────────────────────────────────────────────── */
const JOBS = [
  { title: 'Senior Full-Stack Engineer', team: 'Engineering', type: 'Full-time · Remote', level: 'Senior', description: 'Build and scale the Halo Internal platform — React Native, TypeScript, Node.js, and Cosmos DB. Own major features from spec to production.', skills: ['React Native / Expo', 'TypeScript 5+', 'Node.js APIs', 'Cosmos DB or PostgreSQL'] },
  { title: 'Product Designer (UX/UI)', team: 'Design', type: 'Full-time · Remote', level: 'Mid–Senior', description: 'Lead the visual identity and UX of Halo Internal — case management builder to end-user dashboard. Own the Figma system, user flows, and marketing design.', skills: ['Figma', 'Design systems', 'Mobile + web product design', 'Legal tech background'] },
  { title: 'Customer Success Manager', team: 'Customer Success', type: 'Full-time · Remote', level: 'Mid-level', description: 'Own onboarding, retention, and expansion for Pro and Enterprise law firms. Build playbooks, reduce churn, and drive NPS.', skills: ['SaaS customer success', 'CRM tools', 'Onboarding playbooks', 'Strong communication'] },
  { title: 'Growth Marketing Lead', team: 'Marketing', type: 'Full-time · Remote', level: 'Mid–Senior', description: 'Drive inbound pipeline through content, SEO, partnerships, and product-led growth. Own our digital presence across the legal industry.', skills: ['B2B SaaS marketing', 'SEO + paid channels', 'Content strategy', 'Analytics'] },
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isMobile = width < 768;
  const [anchors, setAnchors] = useState<Record<NavKey, number>>({ home: 0, problem: 0, how: 0, industries: 0, investors: 0, pricing: 0, about: 0, blog: 0, careers: 0 });
  const revealRef = useScrollReveal();

  // Blog: starts with static posts, enriched with Dev.to live feed
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>(BLOG_POSTS_STATIC);
  const [blogLoading, setBlogLoading] = useState(false);

  // Careers form state
  const [careerName, setCareerName] = useState('');
  const [careerEmail, setCareerEmail] = useState('');
  const [careerRole, setCareerRole] = useState('');
  const [careerMessage, setCareerMessage] = useState('');
  const [careerSubmitted, setCareerSubmitted] = useState(false);
  const [expandedJob, setExpandedJob] = useState<string | null>(null);

  useEffect(() => { ensureMarketingCSS(); }, []);

  // Fetch live SaaS articles from Dev.to public API (no auth required)
  useEffect(() => {
    setBlogLoading(true);
    fetch('https://dev.to/api/articles?tag=saas&per_page=3&sort=latest')
      .then((r) => r.json())
      .then((data: any[]) => {
        const live: BlogPost[] = data.slice(0, 3).map((a) => ({
          id: `devto-${a.id}`,
          title: a.title,
          summary: a.description ?? a.title,
          author: a.user?.name ?? 'DEV Community',
          date: new Date(a.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          tag: ((a.tag_list?.[0] ?? 'SaaS') as string).charAt(0).toUpperCase() + ((a.tag_list?.[0] ?? 'SaaS') as string).slice(1),
          readTime: a.reading_time_minutes ?? 3,
          url: a.url,
          emoji: '📰',
        }));
        setBlogPosts([...BLOG_POSTS_STATIC.slice(0, 2), ...live]);
      })
      .catch(() => { /* silently fall back to static posts */ })
      .finally(() => setBlogLoading(false));
  }, []);

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
    borderColor: 'rgba(0,0,0,0.08)',
    background: 'none',
    backgroundColor: '#FAFAFA',
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
    borderColor: 'rgba(0,0,0,0.08)',
    backgroundColor: '#F9FAFB',
    backdropFilter: 'blur(10px)',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  } as const;
  const navButtonActiveStyle = {
    borderColor: 'rgba(0,0,0,0.12)',
    backgroundColor: 'rgba(0,0,0,0.16)',
    shadowcolor: '#111111',
    shadowOpacity: 0.22,
  } as const;
  const navLoginButtonStyle = {
    minHeight: navMenuButtonHeight,
    paddingHorizontal: navMenuButtonPaddingX + 2,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.12)',
    background: 'linear-gradient(135deg, rgba(0,0,0,0.85), rgba(59,130,246,0.65))',
    backgroundcolor: '#111111',
    boxShadow: '0 18px 40px rgba(0,0,0,0.06)',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    shadowcolor: '#111111',
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
    <View style={[styles.landingWrap, { backgroundcolor: '#111111' } as any]}>

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
            backgroundColor: 'rgba(20,28,65,0.92)',
            backdropFilter: 'blur(18px)',
            WebkitBackdropFilter: 'blur(18px)',
            borderBottom: '1px solid rgba(0,0,0,0.06)',
            boxShadow: '0 4px 30px rgba(0,0,0,0.30)',
          } : {
            backgroundColor: 'transparent',
          }),
          transition: 'background-color 0.4s ease, box-shadow 0.4s ease',
        } as any}
      >
        <BrandLogo width={navLogoWidth} height={navLogoHeight} />
        {isMobile ? (
          /* ── Mobile hamburger button ── */
          <Pressable
            onPress={() => setMobileMenuOpen((prev) => !prev)}
            style={{ padding: 8, borderRadius: 8, backgroundColor: 'rgba(0,0,0,0.04)' }}
            accessibilityRole="button"
            accessibilityLabel={mobileMenuOpen ? 'Close menu' : 'Open menu'}
          >
            <Text style={{ fontSize: 22, color: '#111111', fontWeight: '800', lineHeight: 24 }}>
              {mobileMenuOpen ? '✕' : '☰'}
            </Text>
          </Pressable>
        ) : (
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
                  background: isActive ? 'linear-gradient(90deg, #111111, #374151)' : 'transparent',
                  backgroundColor: isActive ? '#111111' : 'transparent',
                  boxShadow: isActive ? '0 0 10px rgba(0,0,0,0.14), 0 0 4px rgba(59,130,246,0.30)' : 'none',
                  transform: isActive ? 'scaleX(1)' : 'scaleX(0)',
                  transition: 'transform 0.35s cubic-bezier(0.4,0,0.2,1), background 0.3s ease, box-shadow 0.3s ease',
                } as any} />
              </Pressable>
            );
          })}
          <View style={{ width: 1, height: 18, backgroundColor: 'rgba(0,0,0,0.06)', marginHorizontal: 6 }} />
          <Pressable style={navLoginButtonStyle} onPress={onContinue}>
            <Text style={[styles.landingTopMenuText, { fontSize: navMenuFontSize, color: '#111111', fontWeight: '800' }]}>Login</Text>
          </Pressable>
        </View>
        )}
      </View>

      {/* ── Mobile dropdown menu ── */}
      {isMobile && mobileMenuOpen && (
        <View style={{
          backgroundColor: 'rgba(20,28,65,0.96)',
          backdropFilter: 'blur(18px)',
          paddingHorizontal: 20,
          paddingVertical: 12,
          gap: 4,
          borderBottom: '1px solid rgba(0,0,0,0.06)',
        } as any}>
          {NAV_ITEMS.map((item) => {
            const isActive = activeTab === item.key;
            return (
              <Pressable
                key={item.key}
                style={{ paddingVertical: 10, paddingHorizontal: 8, borderRadius: 8, backgroundColor: isActive ? 'rgba(0,0,0,0.06)' : 'transparent' } as any}
                onPress={() => { goToSection(item.key); setMobileMenuOpen(false); }}
              >
                <Text style={{
                  fontSize: 15,
                  color: isActive ? '#FFFFFF' : 'rgba(235,223,255,0.70)',
                  fontWeight: isActive ? '700' : '500',
                } as any}>{item.label}</Text>
              </Pressable>
            );
          })}
          <View style={{ height: 1, backgroundColor: 'rgba(0,0,0,0.04)', marginVertical: 6 }} />
          <Pressable
            style={{ paddingVertical: 10, paddingHorizontal: 8, borderRadius: 10, backgroundcolor: '#111111', alignItems: 'center' } as any}
            onPress={() => { setMobileMenuOpen(false); onContinue(); }}
          >
            <Text style={{ fontSize: 15, color: '#111111', fontWeight: '700' }}>Login</Text>
          </Pressable>
        </View>
      )}
    </View>

    {/* Preload halo icon so it's cached before the user scrolls to it */}
    <Image source={haloIcon} style={{ width: 0, height: 0, position: 'absolute', opacity: 0 }} />

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
          <Text style={{ color: '#374151', fontSize: 11, fontWeight: '700', letterSpacing: 0.6 }}>THE LEGAL OPERATIONS PLATFORM</Text>
        </div>

        <div className="cs-reveal cs-visible cs-hero-title" style={{ '--cs-hero-title-size': `${heroTitleSize}px`, '--cs-hero-title-line': `${heroTitleLineHeight}px` } as React.CSSProperties}>
          <Text style={{ fontSize: heroTitleSize, lineHeight: heroTitleLineHeight, maxWidth: 860, ...styles.landingHeroTitle }}>
            Turn any law firm into a structured, scalable operation — without code.
          </Text>
        </div>
        <div className="cs-reveal cs-visible cs-hero-subtitle" style={{ '--cs-hero-subtitle-size': `${heroSubtitleSize}px`, '--cs-hero-subtitle-line': `${heroSubtitleLineHeight}px` } as React.CSSProperties}>
          <Text style={{ fontSize: heroSubtitleSize, lineHeight: heroSubtitleLineHeight, maxWidth: 780, ...styles.landingHeroSubtitle }}>
            The no-code legal operations platform where firm admins design case models, enforce workflows, and automate decisions — enterprise consistency from day one.
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
                <span style={{ color: '#6B7280', fontSize: 11, fontWeight: 600, textAlign: 'center', marginTop: 2 }}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* <div className="cs-reveal cs-visible cs-hero-demo">
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
        </div> */}
      </View>

      <div className="cs-section-divider" />

      {/* ═══ 60-MINUTE BUILD (disabled) ════════════════════════════════════ */}
      {false && (
      <View>
        <div ref={revealRef}>
          <SectionGlass>
            <Text style={[styles.landingSectionEyebrow, { textAlign: 'center', width: '100%' }]}>⏱️ THE CONFERENCE PROMISE</Text>
            <Text style={[styles.landingSectionTitle, { fontSize: sectionTitleSize, lineHeight: sectionTitleLineHeight, textAlign: 'center', width: '100%' }]}>
              Meet us. In 60 minutes, your firm is built.
            </Text>
            <Text style={[styles.landingSectionText, { fontSize: sectionBodySize, lineHeight: sectionBodyLineHeight, textAlign: 'center', width: '100%', maxWidth: 700, alignSelf: 'center' }]}>
              No dev team. No six-month project. No spreadsheets. You describe your practice — we hand you back a fully operational legal management system before you leave the booth.
            </Text>

            {/* Timeline */}
            <View style={{ gap: 10, marginTop: 8 }}>
              {[
                { time: '0–5 min',  icon: '💬', title: 'Tell Bebo what your practice handles',       detail: 'Describe your practice area, team, and how you track work. Plain English — no forms.' },
                { time: '5–15 min', icon: '🤖', title: 'AI builds your workspace',                 detail: 'Bebo generates your data fields, record stages, intake forms, and team roles automatically.' },
                { time: '15–30 min',icon: '🛠️', title: 'Customize with the Workspace Creator',    detail: 'Drag fields, rename stages, adjust permissions. You own every detail — no dev needed.' },
                { time: '30–45 min',icon: '⚡', title: 'Automate your most repeated task',          detail: 'Drag a Signal Studio flow: "When a new record is created → notify the team → assign an owner." Done in minutes.' },
                { time: '45–55 min',icon: '🔗', title: 'Connect a tool you already use',           detail: 'One-click Orbital integrations — QuickBooks, DocuSign, Slack, or any webhook endpoint.' },
                { time: '55–60 min',icon: '🚀', title: 'Your team goes live',                       detail: 'Share the link. Your staff can create records, complete workflows, and track progress — right now.' },
              ].map((step, i) => (
                <View key={`conf-${i}`} style={{ ...(glassCard as any), flexDirection: 'row', gap: 18, alignItems: 'flex-start', padding: compactCtas ? 14 : 18 }}>
                  <View style={{ alignItems: 'center', minWidth: compactCtas ? 52 : 72, gap: 4 }}>
                    <Text style={{ fontSize: compactCtas ? 22 : 28 }}>{step.icon}</Text>
                    <Text style={{ color: '#111111', fontSize: 10, fontWeight: '800', letterSpacing: 0.5, textAlign: 'center' }}>{step.time}</Text>
                  </View>
                  <View style={{ flex: 1, gap: 3 }}>
                    <Text style={{ color: '#111111', fontSize: compactCtas ? 13 : 15, fontWeight: '800', lineHeight: 20 }}>{step.title}</Text>
                    <Text style={{ color: '#6B7280', fontSize: compactCtas ? 12 : 13, lineHeight: 19 }}>{step.detail}</Text>
                  </View>
                </View>
              ))}
            </View>

            {/* Bottom CTA strip */}
            <View style={{ ...(glassCard as any), padding: compactCtas ? 16 : 22, gap: 8, marginTop: 6, borderColor: 'rgba(0,0,0,0.10)', background: 'linear-gradient(135deg, rgba(0,0,0,0.03), rgba(59,130,246,0.08))' } as any}>
              <Text style={{ color: '#111111', fontSize: compactCtas ? 16 : 20, fontWeight: '900', textAlign: 'center' }}>
                "This is the first tool I've seen that actually replaces custom software for the price of a SaaS subscription."
              </Text>
              <Text style={{ color: '#111111', fontSize: 12, fontWeight: '700', textAlign: 'center', letterSpacing: 0.4 }}>
                — What we hear every time we demo.
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginTop: 6 }}>
                {[
                  '✅ No developer required',
                  '✅ Works for any law firm',
                  '✅ Live in under an hour',
                  '✅ Your data, your database',
                ].map((badge, i) => (
                  <View key={`badge-${i}`} style={{ paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(0,0,0,0.10)', backgroundColor: 'rgba(0,0,0,0.03)' }}>
                    <Text style={{ color: '#B0C4E8', fontSize: 12, fontWeight: '700' }}>{badge}</Text>
                  </View>
                ))}
              </View>
            </View>
          </SectionGlass>
        </div>
      </View>
      )}

      <div className="cs-section-divider" />

      {/* ═══ THE PROBLEM ════════════════════════════════════════ */}
      <View onLayout={setAnchor('problem')}>
        <div ref={revealRef}>
          <SectionGlass>
            <Text style={[styles.landingSectionEyebrow, { textAlign: 'center', width: '100%' }]}>⚠️ THE PROBLEM</Text>
            <Text style={[styles.landingSectionTitle, { fontSize: sectionTitleSize, lineHeight: sectionTitleLineHeight, textAlign: 'center', width: '100%' }]}>
              Every law firm hits the same wall.
            </Text>
            <Text style={[styles.landingSectionText, { fontSize: sectionBodySize, lineHeight: sectionBodyLineHeight, textAlign: 'center', width: '100%', maxWidth: 680, alignSelf: 'center' }]}>
              You started with a spreadsheet. Then you added another. Then a form tool, a project manager, a CRM. Now nobody knows where anything is — and your process only works if you're in the room.
            </Text>
            <View style={{ gap: 10, marginTop: 4 }}>
              {[
                {
                  icon: '📂',
                  pain: 'Your data lives in five different places',
                  reality: 'Spreadsheet for tracking. Email for approvals. Slack for status. A form tool for intake. A calendar for scheduling. Nothing talks to anything else.',
                  cost: 'Your team spends hours each week just moving information between tools.',
                },
                {
                  icon: '🔀',
                  pain: 'Your process only works if you\'re there',
                  reality: 'When you\'re in the room, things get done right. When you\'re not, tasks fall through the cracks — because the only process documentation is in your head.',
                  cost: 'Quality becomes inconsistent the moment your team grows beyond 3 people.',
                },
                {
                  icon: '💸',
                  pain: 'Real software is out of reach',
                  reality: 'Custom development starts at $100,000 and takes 6–18 months. Off-the-shelf tools don\'t fit your industry. So you keep patching the problem with more spreadsheets.',
                  cost: 'Your competitors who can afford custom ops are pulling ahead — and the gap keeps widening.',
                },
                {
                  icon: '🧱',
                  pain: 'Every new client breaks your system',
                  reality: 'Onboarding one client is manageable. Onboarding twenty means 20 different variations of your process. Deadlines get missed. Clients get confused. Your reputation takes the hit.',
                  cost: 'Growth creates operational chaos instead of operational leverage.',
                },
              ].map((item, i) => (
                <View key={`pain-${i}`} style={{ ...(glassCard as any), flexDirection: 'row', gap: 18, alignItems: 'flex-start', padding: compactCtas ? 14 : 20 }}>
                  <Text style={{ fontSize: compactCtas ? 24 : 32, minWidth: 40 }}>{item.icon}</Text>
                  <View style={{ flex: 1, gap: 6 }}>
                    <Text style={{ color: '#FF8A8A', fontSize: compactCtas ? 13 : 15, fontWeight: '800', lineHeight: 20 }}>{item.pain}</Text>
                    <Text style={{ color: '#4B5563', fontSize: compactCtas ? 12 : 13, lineHeight: 20 }}>{item.reality}</Text>
                    <View style={{ flexDirection: 'row', gap: 6, alignItems: 'flex-start', marginTop: 2 }}>
                      <Text style={{ color: '#F59E0B', fontSize: 13, fontWeight: '800' }}>→</Text>
                      <Text style={{ color: '#F59E0B', fontSize: compactCtas ? 11 : 12, lineHeight: 18, flex: 1, fontWeight: '700' }}>{item.cost}</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
            <View style={{ ...(glassCard as any), padding: compactCtas ? 14 : 20, gap: 6, borderColor: 'rgba(0,0,0,0.08)', background: 'linear-gradient(135deg, rgba(0,0,0,0.03), rgba(59,130,246,0.06))', flexDirection: 'row', alignItems: 'center' } as any}>
              <Image source={haloIcon} style={{ width: compactCtas ? 52 : 72, height: compactCtas ? 52 : 72, marginRight: compactCtas ? 12 : 18, opacity: 0.92 }} resizeMode="contain" />
              <Text style={{ color: '#111111', fontSize: compactCtas ? 15 : 18, fontWeight: '900', flex: 1, lineHeight: compactCtas ? 22 : 26 }}>
                Halo Internal is the fix — built specifically for law firms that need enterprise structure without the enterprise price tag.
              </Text>
            </View>
          </SectionGlass>
        </div>
      </View>

      <div className="cs-section-divider" />

      {/* ═══ HOW IT WORKS ═══════════════════════════════════════ */}
      <View onLayout={setAnchor('how')}>
        <div ref={revealRef}>
          <SectionGlass>
            <Text style={[styles.landingSectionEyebrow, { textAlign: 'center', width: '100%' }]}>📖 HOW IT WORKS</Text>
            <Text style={[styles.landingSectionTitle, { fontSize: sectionTitleSize, lineHeight: sectionTitleLineHeight, textAlign: 'center', width: '100%' }]}>
              From zero to fully operational — in four steps.
            </Text>
            <Text style={[styles.landingSectionText, { fontSize: sectionBodySize, lineHeight: sectionBodyLineHeight, textAlign: 'center', width: '100%', maxWidth: 680, alignSelf: 'center' }]}>
              No developer. No project manager. No six-week onboarding. Just describe your practice and Halo Internal builds the structure around it.
            </Text>
            <View style={{ gap: 10, marginTop: 4 }}>
              {[
                {
                  step: '01', icon: '💬', color: '#111111',
                  title: 'Describe your practice to Bebo',
                  detail: 'Tell the AI what your practice handles — your practice area, what you track, who\'s on your team. Plain English. No forms, no templates to fill out.',
                  outcome: 'Bebo maps your description to a complete case management configuration.',
                },
                {
                  step: '02', icon: '🏗️', color: '#3B82F6',
                  title: 'Bebo builds your workspace automatically',
                  detail: 'Fields, record stages, intake forms, team roles, and permissions — all generated in seconds based on exactly what you described. Not a generic template. Your practice.',
                  outcome: 'You get a fully structured legal ops system before you finish your coffee.',
                },
                {
                  step: '03', icon: '🛠️', color: '#F59E0B',
                  title: 'Refine it in the Workspace Creator',
                  detail: 'Drag fields to reorder them. Rename lifecycle stages. Add a dropdown. Tighten permissions so only managers can approve changes. Every control is visual — no code.',
                  outcome: 'Your case management matches exactly how your firm actually works.',
                },
                {
                  step: '04', icon: '🚀', color: '#22C55E',
                  title: 'Automate, integrate, and go live',
                  detail: 'Add a Signal Studio flow that fires when a record moves to a new stage. Connect QuickBooks or DocuSign from the Orbital marketplace. Share the link — your team starts working immediately.',
                  outcome: 'Day one: your firm operates like one three times your size.',
                },
              ].map((s, i) => (
                <View key={`how-${i}`} style={{ ...(glassCard as any), flexDirection: compactCtas ? 'column' : 'row', gap: 18, alignItems: 'flex-start', padding: compactCtas ? 14 : 22 }}>
                  <View style={{ alignItems: 'center', minWidth: compactCtas ? undefined : 64, gap: 6 }}>
                    <View style={{ width: 52, height: 52, borderRadius: 26, borderWidth: 1, borderColor: `${s.color}55`, backgroundColor: `${s.color}22`, alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontSize: 22 }}>{s.icon}</Text>
                    </View>
                    <Text style={{ color: s.color, fontSize: 11, fontWeight: '900', letterSpacing: 1 }}>STEP {s.step}</Text>
                  </View>
                  <View style={{ flex: 1, gap: 6 }}>
                    <Text style={{ color: '#111111', fontSize: compactCtas ? 14 : 16, fontWeight: '800', lineHeight: 22 }}>{s.title}</Text>
                    <Text style={{ color: '#6B7280', fontSize: compactCtas ? 12 : 13, lineHeight: 20 }}>{s.detail}</Text>
                    <View style={{ flexDirection: 'row', gap: 6, alignItems: 'flex-start', marginTop: 2 }}>
                      <Text style={{ color: s.color, fontSize: 13, fontWeight: '800' }}>→</Text>
                      <Text style={{ color: s.color, fontSize: compactCtas ? 11 : 12, lineHeight: 18, flex: 1, fontWeight: '700' }}>{s.outcome}</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </SectionGlass>
        </div>
      </View>

      <div className="cs-section-divider" />

      {/* ═══ INDUSTRIES ═════════════════════════════════════════ */}
      <View onLayout={setAnchor('industries')}>
        <div ref={revealRef}>
          <SectionGlass>
            <Text style={styles.landingSectionEyebrow}>⚖️ BUILT FOR LEGAL</Text>
            <Text style={[styles.landingSectionTitle, { fontSize: sectionTitleSize, lineHeight: sectionTitleLineHeight }]}>
              One platform, any legal practice
            </Text>
            <Text style={[styles.landingSectionText, { fontSize: sectionBodySize, lineHeight: sectionBodyLineHeight }]}>
              12 legal practice templates ready to go — never start from scratch.
            </Text>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
              {INDUSTRIES.map((ind, i) => (
                <div key={`ind-${i}`} className="cs-glass-card" style={{ ...(glassCard as any), flex: 1, minWidth: compactCtas ? '47%' : 170, maxWidth: compactCtas ? '48%' : '24%', padding: 16, gap: 4 }}>
                  <Text style={{ color: '#111111', fontSize: 14, fontWeight: '700' }}>{ind.name}</Text>
                  <Text style={{ color: '#6B7280', fontSize: 12, lineHeight: 17 }}>{ind.desc}</Text>
                </div>
              ))}
            </View>
          </SectionGlass>
        </div>
      </View>

      <div className="cs-section-divider" />

      {/* ═══ INVESTORS (disabled) ═════════════════════════════════════════ */}
      {false && (
      <View onLayout={setAnchor('investors')}>
        <div ref={revealRef}>
          <SectionGlass>
            <Text style={styles.landingSectionEyebrow}>💎 INVESTOR OVERVIEW</Text>
            <Text style={[styles.landingSectionTitle, { fontSize: sectionTitleSize, lineHeight: sectionTitleLineHeight }]}>
              A massive gap. A clear solution. The right time.
            </Text>
            <Text style={[styles.landingSectionText, { fontSize: sectionBodySize, lineHeight: sectionBodyLineHeight, maxWidth: 760 }]}>
              There are over 450,000 law firms in the US. Most run on spreadsheets and outdated case management tools. Enterprise legal ops software is too expensive, too rigid, and requires a dev team to maintain. Halo Internal is the first platform that makes enterprise-grade legal operational structure accessible to any law firm — no code, no developer, no six-figure contract.
            </Text>
            <View style={{ ...(glassCard as any), padding: compactCtas ? 14 : 20, gap: 10, borderColor: 'rgba(0,0,0,0.08)' }}>
              <Text style={{ color: '#111111', fontSize: 11, fontWeight: '800', letterSpacing: 1 }}>🎯 THE THESIS IN ONE SENTENCE</Text>
              <Text style={{ color: '#111111', fontSize: compactCtas ? 15 : 19, fontWeight: '900', lineHeight: compactCtas ? 22 : 28 }}>
                "Every law firm needs what Am Law 100 firms have — structured data, enforced workflow, and team-level permissions. Halo Internal delivers it without the $200K price tag or the 18-month build."
              </Text>
            </View>

            <View style={{ ...(glassCard as any), padding: 20, gap: 12, marginTop: 4 }}>
              <Text style={{ color: '#111111', fontSize: 11, fontWeight: '800', letterSpacing: 1 }}>📊 MARKET OPPORTUNITY</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                { [
                  { metric: '$120B+', insight: 'Business ops software market is massive.' },
                  { metric: '72%', insight: 'Small businesses slowed by scattered tools.' },
                  { metric: '<5%', insight: 'Few service firms use real ops software.' },
                  { metric: '34%', insight: 'No-code platforms grow at record pace.' },
                ].map((item, i) => (
                  <View key={`mkt-${i}`} style={{ ...(glassCard as any), flex: 1, minWidth: compactCtas ? '100%' : 200, flexDirection: 'row', gap: 16, alignItems: 'center', padding: 14 }}>
                    <Text style={{ color: '#111111', fontSize: 38, fontWeight: '900', minWidth: 90, textAlign: 'right' }}>{item.metric}</Text>
                    <Text style={{ color: '#4B5563', fontSize: 18, fontWeight: '800', lineHeight: 24, flex: 1 }}>{item.insight}</Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={{ ...(glassCard as any), padding: 20, gap: 12 }}>
              <Text style={{ color: '#111111', fontSize: 18, fontWeight: '900', letterSpacing: 1 }}>💰 WHERE THE MONEY GOES</Text>
              <Text style={{ color: '#4B5563', fontSize: 14, lineHeight: 22 }}>
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
                    <Text style={{ color: '#111111', fontSize: 34, fontWeight: '900' }}>{item.pct}</Text>
                    <Text style={{ color: '#111111', fontSize: 18, fontWeight: '900' }}>{item.pillar}</Text>
                    <Text style={{ color: '#6B7280', fontSize: 15, lineHeight: 22 }}>{item.detail}</Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={{ ...(glassCard as any), padding: 20, gap: 12 }}>
              <Text style={{ color: '#111111', fontSize: 18, fontWeight: '900', letterSpacing: 1 }}>📈 RETURN ON INVESTMENT</Text>
              <Text style={{ color: '#4B5563', fontSize: 14, lineHeight: 22 }}>
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
                    <Text style={{ color: '#111111', fontSize: 32, fontWeight: '900' }}>{item.value}</Text>
                    <Text style={{ color: '#111111', fontSize: 17, fontWeight: '900' }}>{item.label}</Text>
                    <Text style={{ color: '#6B7280', fontSize: 13, lineHeight: 18 }}>{item.note}</Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={{ ...(glassCard as any), padding: 20, gap: 12 }}>
              <Text style={{ color: '#111111', fontSize: 11, fontWeight: '800', letterSpacing: 1 }}>⚔️ COMPETITIVE LANDSCAPE</Text>
              <Text style={{ color: '#4B5563', fontSize: 14, lineHeight: 22 }}>
                Nobody else has built this. Here's why:
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                { [
                  {
                    competitor: '📋 No-Code Tools (Airtable, Monday, Notion)',
                    gap: 'Good for tasks, but no real permissions, workflows, or structure.',
                    edge: 'Halo Internal has built-in permissions, automation, and case models.',
                  },
                  {
                    competitor: '🏢 Industry Software (Buildium, Clio)',
                    gap: 'Works for one industry only. Can\'t adapt to anything else.',
                    edge: 'Halo Internal works for any legal practice — same platform, same day.',
                  },
                  {
                    competitor: '👨‍💻 Custom Development (Agencies)',
                    gap: 'Costs $200K+, takes 6–18 months. Most businesses can\'t afford it.',
                    edge: 'Halo Internal delivers the same structure in hours — one admin, no devs.',
                  },
                  {
                    competitor: '⚙️ Low-Code (OutSystems, PowerApps)',
                    gap: 'Still needs developers and long setup. Builds apps, not operations.',
                    edge: 'Halo Internal is admin-first — no code, no tech skills needed.',
                  },
                ].map((item, i) => (
                  <View key={`comp-${i}`} style={{ ...(glassCard as any), flex: 1, minWidth: compactCtas ? '100%' : 280, padding: 16, gap: 8 }}>
                    <Text style={{ color: '#111111', fontSize: 14, fontWeight: '800' }}>{item.competitor}</Text>
                    <Text style={{ color: '#6B7280', fontSize: 12, lineHeight: 18 }}>{item.gap}</Text>
                    <View style={{ flexDirection: 'row', gap: 6, alignItems: 'flex-start' }}>
                      <Text style={{ color: '#22C55E', fontSize: 14, fontWeight: '800', marginTop: 1 }}>→</Text>
                      <Text style={{ color: '#22C55E', fontSize: 12, lineHeight: 18, flex: 1, fontWeight: '600' }}>{item.edge}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>

            <View style={{ ...(glassCard as any), padding: 20, gap: 12 }}>
              <Text style={{ color: '#111111', fontSize: 11, fontWeight: '800', letterSpacing: 1 }}>✨ THE SEAMLESS ADVANTAGE</Text>
              <Text style={{ color: '#4B5563', fontSize: 14, lineHeight: 22 }}>
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
                    <Text style={{ color: '#111111', fontSize: 13, fontWeight: '700' }}>{item.title}</Text>
                    <Text style={{ color: '#6B7280', fontSize: 12, lineHeight: 18 }}>{item.text}</Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={{ gap: 10 }}>
              <Text style={{ color: '#111111', fontSize: 11, fontWeight: '800', letterSpacing: 1 }}>🏆 TRACTION & MILESTONES</Text>
              {/* Kanban columns */}
              <View style={{ flexDirection: compactCtas ? 'column' : 'row', gap: 10, alignItems: 'stretch' }}>

                {/* ── Shipped ── */}
                <View style={{ flex: 1, ...(glassCard as any), padding: 14, gap: 10, borderColor: 'rgba(34,197,94,0.25)', borderTopWidth: 3, borderTopColor: '#22C55E' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#22C55E' }} />
                    <Text style={{ color: '#22C55E', fontSize: 10, fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase' }}>Shipped</Text>
                    <View style={{ marginLeft: 'auto' as any, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999, backgroundColor: 'rgba(34,197,94,0.15)' }}>
                      <Text style={{ color: '#22C55E', fontSize: 10, fontWeight: '800' }}>5</Text>
                    </View>
                  </View>
                  {[
                    { label: 'Full platform live', detail: 'Workspace Creator, Board Runtime, Intake, RBAC.' },
                    { label: 'AI workspace builder', detail: 'Bebo builds from plain English.' },
                    { label: 'Portable persistence', detail: 'Cosmos DB, PostgreSQL, local adapters.' },
                    { label: '12 legal practice templates', detail: 'Personal injury, mass tort, insurance defense + more.' },
                    { label: 'Live on public domains', detail: 'halointernal.surge.sh globally accessible.' },
                  ].map((item, i) => (
                    <View key={`ms-done-${i}`} style={{ ...(glassCard as any), padding: 10, gap: 3, borderRadius: 10 }}>
                      <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                        <Text style={{ color: '#22C55E', fontSize: 12, fontWeight: '900' }}>✓</Text>
                        <Text style={{ color: '#111111', fontSize: 12, fontWeight: '700', flex: 1 }}>{item.label}</Text>
                      </View>
                      <Text style={{ color: '#9CA3AF', fontSize: 11, lineHeight: 16, paddingLeft: 18 }}>{item.detail}</Text>
                    </View>
                  ))}
                </View>

                {/* ── In Progress ── */}
                <View style={{ flex: 1, ...(glassCard as any), padding: 14, gap: 10, borderColor: 'rgba(245,158,11,0.25)', borderTopWidth: 3, borderTopColor: '#F59E0B' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#F59E0B' }} />
                    <Text style={{ color: '#F59E0B', fontSize: 10, fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase' }}>In Progress</Text>
                    <View style={{ marginLeft: 'auto' as any, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999, backgroundColor: 'rgba(245,158,11,0.15)' }}>
                      <Text style={{ color: '#F59E0B', fontSize: 10, fontWeight: '800' }}>1</Text>
                    </View>
                  </View>
                  <View style={{ ...(glassCard as any), padding: 10, gap: 3, borderRadius: 10 }}>
                    <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                      <Text style={{ color: '#F59E0B', fontSize: 12, fontWeight: '900' }}>⚙</Text>
                      <Text style={{ color: '#111111', fontSize: 12, fontWeight: '700', flex: 1 }}>Cosmograph importer</Text>
                    </View>
                    <Text style={{ color: '#9CA3AF', fontSize: 11, lineHeight: 16, paddingLeft: 18 }}>Auto-maps CSV/Excel to workspace fields with PII detection. Final testing.</Text>
                  </View>
                </View>

                {/* ── Next Quarter ── */}
                <View style={{ flex: 1, ...(glassCard as any), padding: 14, gap: 10, borderColor: 'rgba(0,0,0,0.10)', borderTopWidth: 3, borderTopcolor: '#111111' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundcolor: '#111111' }} />
                    <Text style={{ color: '#111111', fontSize: 10, fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase' }}>Next Quarter</Text>
                    <View style={{ marginLeft: 'auto' as any, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999, backgroundColor: 'rgba(0,0,0,0.15)' }}>
                      <Text style={{ color: '#111111', fontSize: 10, fontWeight: '800' }}>2</Text>
                    </View>
                  </View>
                  {[
                    { label: '3 enterprise pilots', detail: 'Healthcare, logistics, and legal verticals.' },
                    { label: 'SOC 2 Type I', detail: 'Audit scoped, vendor selected. Required for enterprise.' },
                  ].map((item, i) => (
                    <View key={`ms-next-${i}`} style={{ ...(glassCard as any), padding: 10, gap: 3, borderRadius: 10 }}>
                      <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                        <Text style={{ color: '#111111', fontSize: 12, fontWeight: '900' }}>→</Text>
                        <Text style={{ color: '#111111', fontSize: 12, fontWeight: '700', flex: 1 }}>{item.label}</Text>
                      </View>
                      <Text style={{ color: '#9CA3AF', fontSize: 11, lineHeight: 16, paddingLeft: 18 }}>{item.detail}</Text>
                    </View>
                  ))}
                </View>

              </View>
            </View>

            {/* ── Our Investors ─────────────────────────────────────── */}
            <View style={{ gap: 16 }}>
              <Text style={{ color: '#111111', fontSize: 16, fontWeight: '900', letterSpacing: 1, textAlign: 'center' }}>🤝 OUR INVESTORS</Text>
              <Text style={{ color: '#4B5563', fontSize: 13, lineHeight: 21, textAlign: 'center', maxWidth: 580, alignSelf: 'center' as const }}>Halo Internal is backed by experienced operators who have seen what real enterprise automation looks like — and know exactly the gap we fill.</Text>
              <div className="cs-investor-grid">
                {INVESTORS.map((inv, i) => (
                  <div key={`inv-${i}`} className="cs-investor-card" style={{ borderColor: `${inv.accent}33` } as any}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: `${inv.accent}1A`, alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ fontSize: 24 }}>{inv.emoji}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: '#111111', fontSize: 15, fontWeight: '800' }}>{inv.name}</Text>
                        <Text style={{ color: inv.accent, fontSize: 11, fontWeight: '700' }}>{inv.title} — {inv.fund}</Text>
                        <Text style={{ color: '#9CA3AF', fontSize: 10, marginTop: 1 }}>{inv.focus}</Text>
                      </View>
                      <View style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: `${inv.accent}18`, borderWidth: 1, borderColor: `${inv.accent}30` }}>
                        <Text style={{ color: inv.accent, fontSize: 12, fontWeight: '900' }}>{inv.amount}</Text>
                      </View>
                    </View>
                    <Text style={{ color: '#6B7280', fontSize: 12, lineHeight: 19 }}>{inv.bio}</Text>
                    <View style={{ padding: 12, borderRadius: 10, backgroundColor: `${inv.accent}0D`, borderWidth: 1, borderColor: `${inv.accent}22` }}>
                      <Text style={{ color: '#4B5563', fontSize: 12, lineHeight: 19, fontStyle: 'italic' }}>{inv.thesis}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                      <Text style={{ color: '#9CA3AF', fontSize: 10, fontWeight: '700', letterSpacing: 0.4 }}>PORTFOLIO:</Text>
                      {inv.portfolio.map((p, pi) => (
                        <View key={pi} style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, backgroundColor: 'rgba(0,0,0,0.05)', borderWidth: 1, borderColor: 'rgba(0,0,0,0.08)' }}>
                          <Text style={{ color: '#6B7280', fontSize: 10, fontWeight: '600' }}>{p}</Text>
                        </View>
                      ))}
                    </View>
                  </div>
                ))}
              </div>
            </View>

            <View style={{ ...(glassCard as any), padding: 20, gap: 12 }}>
              <Text style={{ color: '#111111', fontSize: 11, fontWeight: '800', letterSpacing: 1 }}>Interested in the Halo Internal opportunity?</Text>
              <Text style={{ color: '#6B7280', fontSize: 13, lineHeight: 20, textAlign: 'center', maxWidth: 500 }}>
                We're building the legal operations backbone for every law firm. If that resonates, let's talk.
              </Text>
              <Pressable style={styles.landingPrimaryCta} onPress={onContinue}>
                <Text style={styles.landingPrimaryCtaText}>Request Investor Deck</Text>
              </Pressable>
            </View>
          </SectionGlass>
        </div>
      </View>
      )}

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
                      ? { borderColor: 'rgba(0,0,0,0.15)', borderWidth: 1.5 }
                      : { borderColor: 'rgba(0,0,0,0.06)' }),
                  }}
                >
                  {/* Badge */}
                  {tier.highlight && (
                    <View style={{ backgroundcolor: '#111111', paddingVertical: 6, alignItems: 'center' as const }}>
                      <Text style={{ color: '#111111', fontSize: 11, fontWeight: '800', letterSpacing: 0.8 }}>MOST POPULAR</Text>
                    </View>
                  )}

                  {/* Header zone */}
                  <View style={{ padding: 22, gap: 6, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.06)' }}>
                    <Text style={{ color: '#111111', fontSize: 20, fontWeight: '800' }}>{tier.name}</Text>
                    <Text style={{ color: '#6B7280', fontSize: 12, fontWeight: '600' }}>{tier.audience}</Text>
                    <Text style={{ color: '#4B5563', fontSize: 12, lineHeight: 18, marginTop: 2 }}>{tier.description}</Text>

                    {/* Price */}
                    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 3, marginTop: 10 }}>
                      <Text style={{ color: '#111111', fontSize: 36, fontWeight: '800' }}>{tier.price}</Text>
                      {!!tier.period && <Text style={{ color: '#6B7280', fontSize: 13 }}>{tier.period}</Text>}
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
                        <Text style={{ color: '#111111', fontSize: 12, fontWeight: '800' }}>{group.heading}</Text>
                        {group.items.map((item, fi) => (
                          <View key={`fi-${fi}`} style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
                            <Text style={{ color: '#111111', fontSize: 13, marginTop: 1 }}>✓</Text>
                            <Text style={{ color: '#4B5563', fontSize: 13, lineHeight: 19, flex: 1 }}>{item}</Text>
                          </View>
                        ))}
                      </View>
                    ))}
                  </View>

                  {/* Transparent reasoning */}
                  <View style={{ padding: 18, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.06)', backgroundColor: 'rgba(0,0,0,0.04)' }}>
                    <Text style={{ color: '#9CA3AF', fontSize: 10, fontWeight: '700', letterSpacing: 0.5, marginBottom: 4 }}>WHY THIS PRICE</Text>
                    <Text style={{ color: '#6B7280', fontSize: 11, lineHeight: 17 }}>{tier.reasoning}</Text>
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
                  <Text style={{ color: '#111111', fontSize: 12, fontWeight: '700' }}>{item.title}</Text>
                  <Text style={{ color: '#6B7280', fontSize: 11, textAlign: 'center' }}>{item.desc}</Text>
                </View>
              ))}
            </View>
          </SectionGlass>
        </div>
      </View>

      <div className="cs-section-divider" />

      {/* ═══ ABOUT ════════════════════════════════════════════════════════ */}
      <View onLayout={setAnchor('about')}>
        <div ref={revealRef}>
          <SectionGlass>
            <Text style={[styles.landingSectionEyebrow, { fontSize: sectionTitleSize * 1.25, fontWeight: '900', textAlign: 'center', width: '100%' }]}>🏢 ABOUT HALO INTERNAL</Text>
            <Text style={[styles.landingSectionTitle, { fontSize: sectionTitleSize, lineHeight: sectionTitleLineHeight, textAlign: 'center', width: '100%' }]}>Built for operators. Engineered for scale.</Text>
            <Text style={[styles.landingSectionText, { fontSize: sectionBodySize, lineHeight: sectionBodyLineHeight, textAlign: 'center', maxWidth: 700, alignSelf: 'center' as const }]}>
              Halo Internal is a U.S.-based legal technology company founded in 2024. Our mission is to make enterprise-grade legal operations software accessible to every law firm on earth — regardless of size, technical resources, or practice area.
            </Text>

            {/* Products */}
            <View style={{ gap: 12, marginTop: spaceSm }}>
              <Text style={{ color: '#111111', fontSize: 15, fontWeight: '900', textAlign: 'center', letterSpacing: 0.6 }}>🧩 OUR PRODUCTS</Text>
              <div className="cs-about-grid">
                {ABOUT_MODULES.map((mod, i) => (
                  <div key={`mod-${i}`} className="cs-about-card" style={{ borderColor: `${mod.color}28` } as any}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: `${mod.color}1A`, alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ fontSize: 20 }}>{mod.icon}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: '#111111', fontSize: 14, fontWeight: '800' }}>{mod.name}</Text>
                        <Text style={{ color: mod.color, fontSize: 11, fontWeight: '700', marginTop: 1 }}>{mod.tagline}</Text>
                      </View>
                    </View>
                    <Text style={{ color: '#6B7280', fontSize: 12, lineHeight: 19 }}>{mod.description}</Text>
                    <div className="cs-about-detail-row">
                      {mod.details.map((d, di) => (
                        <div key={di} className="cs-about-detail-item">
                          <Text style={{ color: '#111111', fontSize: 12, fontWeight: '700' }}>{d.label}</Text>
                          <Text style={{ color: '#9CA3AF', fontSize: 11, lineHeight: 17 }}>{d.text}</Text>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </View>

            {/* Mission */}
            <View style={{ ...(glassCard as any), padding: 26, gap: 12, alignItems: 'center', marginTop: spaceSm }}>
              <Text style={{ fontSize: 30 }}>🌌</Text>
              <Text style={{ color: '#111111', fontSize: 17, fontWeight: '800', textAlign: 'center' }}>Our Mission</Text>
              <Text style={{ color: '#4B5563', fontSize: 13, lineHeight: 22, textAlign: 'center', maxWidth: 580 }}>
                Every solo practitioner, mid-size firm, and legal department deserves the same operational power that Am Law 100 firms have — without a $2M software budget. That is what Halo Internal is building.
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 4 }}>
                {['🇺🇸 U.S. Company', '📍 Remote-First', '🔒 Privacy-First', '♾️ No Vendor Lock-In', '🤝 Community-Backed'].map((v, i) => (
                  <View key={i} style={{ paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999, backgroundColor: 'rgba(0,0,0,0.03)', borderWidth: 1, borderColor: 'rgba(0,0,0,0.08)' }}>
                    <Text style={{ color: '#B0C4E8', fontSize: 11, fontWeight: '700' }}>{v}</Text>
                  </View>
                ))}
              </View>
            </View>
          </SectionGlass>
        </div>
      </View>

      <div className="cs-section-divider" />

      {/* ═══ BLOG (disabled) ═══════════════════════════════════════════════════════════ */}
      {false && (
      <View onLayout={setAnchor('blog')}>
        <div ref={revealRef}>
          <SectionGlass>
            <Text style={[styles.landingSectionEyebrow, { fontSize: sectionTitleSize * 1.25, fontWeight: '900', textAlign: 'center', width: '100%' }]}>📰 BLOG &amp; NEWS</Text>
            <Text style={[styles.landingSectionTitle, { fontSize: sectionTitleSize, lineHeight: sectionTitleLineHeight, textAlign: 'center', width: '100%' }]}>Latest from Halo Internal &amp; the legal tech world</Text>
            {blogLoading && (
              <Text style={{ color: '#9CA3AF', fontSize: 12, textAlign: 'center' }}>Loading latest articles…</Text>
            )}
            <div className="cs-blog-grid">
              {blogPosts.map((post) => (
                <a
                  key={post.id}
                  className="cs-blog-card"
                  href={post.url ?? '#'}
                  target={post.url ? '_blank' : undefined}
                  rel="noreferrer"
                  style={{ textDecoration: 'none' }}
                >
                  <Text style={{ fontSize: 26 }}>{post.emoji}</Text>
                  <span className="cs-blog-tag">{post.tag}</span>
                  <Text style={{ color: '#111111', fontSize: 14, fontWeight: '700', lineHeight: 21 }}>{post.title}</Text>
                  <Text style={{ color: '#6B7280', fontSize: 12, lineHeight: 19, flex: 1 }}>{post.summary}</Text>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
                    <Text style={{ color: '#9CA3AF', fontSize: 11 }}>{post.author}</Text>
                    <Text style={{ color: '#9CA3AF', fontSize: 11 }}>{post.date} · {post.readTime} min</Text>
                  </View>
                </a>
              ))}
            </div>
            <View style={{ ...(glassCard as any), padding: 22, gap: 10, alignItems: 'center', marginTop: spaceSm }}>
              <Text style={{ color: '#111111', fontSize: 15, fontWeight: '800', textAlign: 'center' }}>📬 Stay in the loop</Text>
              <Text style={{ color: '#6B7280', fontSize: 12, lineHeight: 19, textAlign: 'center', maxWidth: 480 }}>Product updates and SaaS insights — no spam, ever.</Text>
              <Pressable
                style={[styles.landingPrimaryCta, { alignSelf: 'center', marginTop: 4 }]}
                onPress={() => {
                  if (typeof window !== 'undefined') {
                    window.open('mailto:dwaineeck@outlook.com?subject=Subscribe%20to%20Halo%20Internal%20Newsletter&body=Hi%20Halo%20Internal%20team%2C%20please%20add%20me%20to%20your%20newsletter.%0A%0AName%3A%20%0AEmail%3A%20', '_blank');
                  }
                }}
              >
                <Text style={styles.landingPrimaryCtaText}>Subscribe to updates</Text>
              </Pressable>
            </View>
          </SectionGlass>
        </div>
      </View>
      )}

      <div className="cs-section-divider" />

      {/* ═══ CAREERS ═══════════════════════════════════════════════════════ */}
      <View onLayout={setAnchor('careers')}>
        <div ref={revealRef}>
          <SectionGlass>
            <Text style={[styles.landingSectionEyebrow, { fontSize: sectionTitleSize * 1.25, fontWeight: '900', textAlign: 'center', width: '100%' }]}>💼 CAREERS</Text>
            <Text style={[styles.landingSectionTitle, { fontSize: sectionTitleSize, lineHeight: sectionTitleLineHeight, textAlign: 'center', width: '100%' }]}>Help us build the platform for every law firm</Text>
            <Text style={[styles.landingSectionText, { fontSize: sectionBodySize, lineHeight: sectionBodyLineHeight, textAlign: 'center', maxWidth: 620, alignSelf: 'center' as const }]}>
              We are remote-first. We move fast, ship real features, and care deeply about the people who use what we build.
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
              {['🌍 Remote-First', '🔥 Seed Stage', '⚡ Move Fast', '🛡️ Privacy-First', '📈 Equity for Early Hires'].map((v, i) => (
                <View key={i} style={{ paddingHorizontal: 13, paddingVertical: 5, borderRadius: 999, backgroundColor: 'rgba(0,0,0,0.03)', borderWidth: 1, borderColor: 'rgba(0,0,0,0.08)' }}>
                  <Text style={{ color: '#B0C4E8', fontSize: 11, fontWeight: '700' }}>{v}</Text>
                </View>
              ))}
            </View>

            {/* Open roles */}
            <View style={{ gap: 10 }}>
              <Text style={{ color: '#111111', fontSize: 14, fontWeight: '800', letterSpacing: 0.4 }}>Open Positions</Text>
              <div className="cs-jobs-list">
                {JOBS.map((job, i) => (
                  <div
                    key={`job-${i}`}
                    className="cs-job-card"
                    onClick={() => setExpandedJob(expandedJob === job.title ? null : job.title)}
                    style={{ cursor: 'pointer', flexDirection: 'column', alignItems: 'flex-start', gap: 10 } as any}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%', gap: 12, flexWrap: 'wrap' as any }}>
                      <View style={{ flex: 1, gap: 3 }}>
                        <Text style={{ color: '#111111', fontSize: 14, fontWeight: '800' }}>{job.title}</Text>
                        <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' as any }}>
                          <Text style={{ color: '#111111', fontSize: 11, fontWeight: '700' }}>{job.team}</Text>
                          <Text style={{ color: '#9CA3AF', fontSize: 11 }}>·</Text>
                          <Text style={{ color: '#9CA3AF', fontSize: 11 }}>{job.type}</Text>
                          <Text style={{ color: '#9CA3AF', fontSize: 11 }}>·</Text>
                          <Text style={{ color: '#22C55E', fontSize: 11, fontWeight: '600' }}>{job.level}</Text>
                        </View>
                      </View>
                      <View style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: 'rgba(0,0,0,0.03)', borderWidth: 1, borderColor: 'rgba(0,0,0,0.08)' }}>
                        <Text style={{ color: '#B0C4E8', fontSize: 10, fontWeight: '700' }}>{expandedJob === job.title ? 'Close ▲' : 'View ▼'}</Text>
                      </View>
                    </View>
                    {expandedJob === job.title && (
                      <View style={{ gap: 8, paddingTop: 6, width: '100%' }}>
                        <Text style={{ color: '#4B5563', fontSize: 12, lineHeight: 19 }}>{job.description}</Text>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                          {job.skills.map((sk, si) => (
                            <View key={si} style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, backgroundColor: 'rgba(0,0,0,0.05)', borderWidth: 1, borderColor: 'rgba(0,0,0,0.08)' }}>
                              <Text style={{ color: '#6B7280', fontSize: 11, fontWeight: '600' }}>{sk}</Text>
                            </View>
                          ))}
                        </View>
                        <Pressable
                          style={{ alignSelf: 'flex-start', marginTop: 4, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, backgroundcolor: '#111111' }}
                          onPress={() => {
                            if (typeof window !== 'undefined') {
                              const sub = encodeURIComponent(`Application: ${job.title}`);
                              const body = encodeURIComponent(`Hi Halo Internal Team,\n\nI am applying for the ${job.title} position.\n\nName: \nLinkedIn/Portfolio: \nWhy Halo Internal: \n\nThank you!`);
                              window.open(`mailto:dwaineeck@outlook.com?subject=${sub}&body=${body}`, '_blank');
                            }
                          }}
                        >
                          <Text style={{ color: '#111111', fontSize: 12, fontWeight: '700' }}>Apply for this role →</Text>
                        </Pressable>
                      </View>
                    )}
                  </div>
                ))}
              </div>
            </View>

            {/* General application form */}
            <View style={{ gap: 14, marginTop: spaceSm }}>
              <Text style={{ color: '#111111', fontSize: 14, fontWeight: '800', letterSpacing: 0.4 }}>📨 Send a General Application</Text>
              <Text style={{ color: '#6B7280', fontSize: 12, lineHeight: 19 }}>Don't see your role? We're always looking for exceptional people — send a note and we'll keep you in mind.</Text>
              {careerSubmitted ? (
                <View style={{ padding: 22, borderRadius: 14, backgroundColor: 'rgba(34,197,94,0.10)', borderWidth: 1, borderColor: 'rgba(34,197,94,0.28)', alignItems: 'center', gap: 8 }}>
                  <Text style={{ fontSize: 26 }}>🎉</Text>
                  <Text style={{ color: '#22C55E', fontSize: 14, fontWeight: '800', textAlign: 'center' }}>Application sent!</Text>
                  <Text style={{ color: '#4B5563', fontSize: 12, lineHeight: 19, textAlign: 'center' }}>Thanks for reaching out. We'll be in touch within 5 business days.</Text>
                  <Pressable
                    style={{ marginTop: 6, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8, backgroundColor: '#F9FAFB' }}
                    onPress={() => { setCareerSubmitted(false); setCareerName(''); setCareerEmail(''); setCareerRole(''); setCareerMessage(''); }}
                  >
                    <Text style={{ color: '#6B7280', fontSize: 11, fontWeight: '600' }}>Submit another</Text>
                  </Pressable>
                </View>
              ) : (
                <div className="cs-career-form">
                  <div className="cs-form-row">
                    <input
                      className="cs-form-input"
                      placeholder="Your full name"
                      value={careerName}
                      onChange={(e: any) => setCareerName(e.target.value)}
                    />
                    <input
                      className="cs-form-input"
                      type="email"
                      placeholder="Your email address"
                      value={careerEmail}
                      onChange={(e: any) => setCareerEmail(e.target.value)}
                    />
                  </div>
                  <select
                    className="cs-form-input cs-form-select"
                    title="Role of interest"
                    value={careerRole}
                    onChange={(e: any) => setCareerRole(e.target.value)}
                  >
                    <option value="" disabled>Which role interests you most?</option>
                    {JOBS.map((j) => <option key={j.title} value={j.title}>{j.title}</option>)}
                    <option value="Other">Other / General Inquiry</option>
                  </select>
                  <textarea
                    className="cs-form-input cs-form-textarea"
                    placeholder="Tell us about yourself, your background, and why Halo Internal…"
                    value={careerMessage}
                    onChange={(e: any) => setCareerMessage(e.target.value)}
                  />
                  <Pressable
                    style={[styles.landingPrimaryCta, { alignSelf: 'flex-start', opacity: (!careerName.trim() || !careerEmail.trim() || !careerMessage.trim()) ? 0.5 : 1 }]}
                    onPress={() => {
                      if (!careerName.trim() || !careerEmail.trim() || !careerMessage.trim()) return;
                      if (typeof window !== 'undefined') {
                        const sub = encodeURIComponent(`Career Application — ${careerRole || 'General'} — ${careerName}`);
                        const body = encodeURIComponent(`Name: ${careerName}\nEmail: ${careerEmail}\nRole of Interest: ${careerRole || 'General Inquiry'}\n\n${careerMessage}`);
                        window.open(`mailto:dwaineeck@outlook.com?subject=${sub}&body=${body}`, '_blank');
                        setCareerSubmitted(true);
                      }
                    }}
                  >
                    <Text style={styles.landingPrimaryCtaText}>Send Application →</Text>
                  </Pressable>
                  <Text style={{ color: '#9CA3AF', fontSize: 10, marginTop: -4 }}>Sends to dwaineeck@outlook.com</Text>
                </div>
              )}
            </View>
          </SectionGlass>
        </div>
      </View>

      <div className="cs-section-divider" />

      {/* ═══ FINAL CTA ══════════════════════════════════════════ */}
      <div ref={revealRef}>
        <View style={[styles.landingBottomActions, { paddingVertical: spaceLg + 16, gap: 14 }]}>
          <Text style={[styles.landingSectionTitle, { fontSize: sectionTitleSize, lineHeight: sectionTitleLineHeight, textAlign: 'center' }]}>
            Ready to run your firm better?
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
            <Text style={{ color: '#6B7280', fontSize: 11 }}>© 2026 Halo Internal. All rights reserved.</Text>
            <Text style={{ color: '#9CA3AF', fontSize: 10 }}>Built with React Native + Expo  •  Portable persistence  •  Powered by Bebo Ai</Text>
          </View>
        </View>
      </div>

    </ScrollView>
    </View>
  );
}
