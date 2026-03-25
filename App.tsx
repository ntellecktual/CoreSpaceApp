import { StatusBar } from 'expo-status-bar';
import './assets/guidedTour.css';
import React, { useEffect, useState } from 'react';
import { GuidedTourProvider, TourStep } from './src/components/GuidedTour';
import { SpotlightTourProvider, SpotlightStep } from './src/components/SpotlightTour';
import { ActivityIndicator, Platform, SafeAreaView, Text, View } from 'react-native';
import { AppStateProvider } from './src/context/AppStateContext';
import { useAppState } from './src/context/AppStateContext';
import { UiThemeProvider, useUiTheme } from './src/context/UiThemeContext';
import { AuthScreen } from './src/screens/AuthScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { MarketingScreen } from './src/screens/MarketingScreen';
// import { RouterProvider, useSimpleRouter } from './src/router/SimpleRouter';


type ErrorBoundaryState = {
  hasError: boolean;
  message: string;
};

class AppErrorBoundary extends React.Component<{ children: React.ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
    message: '',
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error.message,
    };
  }

  componentDidCatch(error: Error) {
    console.error('Halo Internal runtime error:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#263374', padding: 16 }}>
          <Text style={{ color: '#FFD332', fontSize: 13, fontWeight: '700' }}>Halo Internal encountered a runtime error.</Text>
          <Text style={{ color: '#FFFFFF', fontSize: 13 }}>{this.state.message || 'Unknown error'}</Text>
        </View>
      );
    }

    return this.props.children;
  }
}

const HALO_SCROLLBAR_STYLE_ID = 'halo-global-scrollbar';

function useGlobalScrollbar() {
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    if (document.getElementById(HALO_SCROLLBAR_STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = HALO_SCROLLBAR_STYLE_ID;
    style.textContent = [
      '*::-webkit-scrollbar { width: 8px; height: 8px; }',
      '*::-webkit-scrollbar-track { background: rgba(255,255,255,0.03); border-radius: 999px; }',
      '*::-webkit-scrollbar-thumb { background: rgba(38,51,116,0.50); border-radius: 999px; border: 2px solid transparent; background-clip: padding-box; }',
      '*::-webkit-scrollbar-thumb:hover { background: rgba(38,51,116,0.70); }',
      '* { scrollbar-width: thin; scrollbar-color: rgba(38,51,116,0.50) rgba(255,255,255,0.03); }',
    ].join('\n');
    document.head.appendChild(style);
    return () => { style.remove(); };
  }, []);
}

function AppShell() {
  const { currentUser, hydrated } = useAppState();
  const { styles } = useUiTheme();
  const [publicView, setPublicView] = useState<'landing' | 'auth'>('landing');
  useGlobalScrollbar();

  // Router integration removed (SimpleRouter missing)
  const router = undefined;

  useEffect(() => {
    if (!currentUser) {
      setPublicView('landing');
    }
  }, [currentUser]);

  if (!hydrated) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator color="#FFD332" />
        <Text style={styles.loadingText}>Loading Halo Internal...</Text>
      </View>
    );
  }

  if (!currentUser) {
    if (!router) {
      // Fallback: no router context yet
      return publicView === 'auth' ? <AuthScreen onBackToOverview={() => setPublicView('landing')} /> : <MarketingScreen onContinue={() => setPublicView('auth')} />;
    }
    // Use router for marketing and public pages
    // Only MarketingScreen and AuthScreen are available for public routes
    return publicView === 'auth'
      ? <AuthScreen onBackToOverview={() => setPublicView('landing')} />
      : <MarketingScreen onContinue={() => setPublicView('auth')} />;
  }

  return <HomeScreen />;
}


const tourSteps: TourStep[] = [

  // ═══════════════════════════════════════════════════════
  // INTRO
  // ═══════════════════════════════════════════════════════
  {
    id: 'welcome',
    section: 'intro',
    title: 'Welcome to Halo Internal',
    content: 'Halo Internal is a fully configurable enterprise platform — sign in once and access AI-powered workspace design, automation, integrations, data analysis, and role-based end-user experiences. This tour walks you through every section end to end.',
    tip: 'Use the section chips at the top to jump to any module. Press → or ← to move between steps, Escape to exit.',
  },
  {
    id: 'intro-signin',
    section: 'intro',
    title: 'Signing In',
    content: 'From the landing page, click "Get Started" to reach the sign-in screen. Enter your email and password — or use the demo credentials pre-filled for you. Halo Internal supports multi-tenant access; your role and tenant are loaded automatically on sign-in.',
    tip: 'First-time users land on the Marketing screen. Returning users go straight to the dashboard.',
  },

  // ═══════════════════════════════════════════════════════
  // AI — BEBO
  // ═══════════════════════════════════════════════════════
  {
    id: 'ai-intro',
    section: 'ai',
    title: 'Meet Bebo — Your AI Co-Pilot',
    content: 'Bebo AI is Halo Internal\'s built-in assistant. It understands the full platform — workspaces, flows, integrations, records, and roles — and can help you build anything through natural language. No prompting expertise required.',
    navigateTo: 'bebo',
    tip: 'Bebo is running locally with streamed responses. Everything you build with Bebo is persisted in your workspace.',
  },
  {
    id: 'ai-chat',
    section: 'ai',
    title: 'Starting a Conversation',
    content: 'Type any question or request in the Bebo chat panel. You can ask Bebo to explain a concept, generate workspace schemas, write automation flows, or walk you through any feature. Bebo responds with structured, actionable answers.',
    tip: 'Try: "Explain what a SubSpace is" or "What can Signal Studio do?" — Bebo knows the full platform.',
  },
  {
    id: 'ai-build',
    section: 'ai',
    title: 'Building with Bebo',
    content: 'Bebo can scaffold entire workspaces from a single sentence. Tell it your use case — pharmaceutical serialization, case management, field inspection — and it returns a complete workspace blueprint including SubSpaces, fields, and lifecycle stages.',
    tip: 'Try: "Create a workspace for pharmaceutical supply chain serialization with carton, box, and unit tracking".',
  },
  {
    id: 'ai-apply',
    section: 'ai',
    title: 'Applying Bebo\'s Output',
    content: 'When Bebo generates a workspace, flow, or template, an "Apply" button appears inline. Clicking it loads the output directly into the relevant module — workspace into Design, flow into Signal Studio, template into Orbital. No copy-pasting.',
    tip: 'Bebo specializes across 6 verticals: Workspace Design, Signal Flows, Orbital Integrations, Analytics, End User UX, and Admin Policies.',
  },

  // ═══════════════════════════════════════════════════════
  // DESIGN — WORKSPACE CREATOR
  // ═══════════════════════════════════════════════════════
  {
    id: 'design-intro',
    section: 'design',
    title: 'Workspace Creator — Overview',
    content: 'Design is where you create and configure every operational workspace in your platform. A workspace is a structured data container with its own fields, SubSpaces, lifecycle stages, and display configurations.',
    navigateTo: 'admin',
    tip: 'Think of a workspace as a vertical slice of your operations — one per business domain (serialization, case intake, inspections, etc.).',
  },
  {
    id: 'design-create',
    section: 'design',
    title: 'Creating a Workspace',
    content: 'Click "New Workspace" to open the creation form. Give it a name and description. You can start from a blank canvas or pick from industry templates. Each workspace gets a unique ID used by Signal flows and the End User runtime.',
    tip: 'Templates include DSCSA Serialization, Case Management, Field Inspection, Pharmacy Dispense, and Compliance Audit.',
  },
  {
    id: 'design-subspaces',
    section: 'design',
    title: 'Configuring SubSpaces & Fields',
    content: 'SubSpaces are tabs or sections within a workspace — like "Line Items", "Audit Trail", or "Attachments". Each SubSpace has its own field schema (text, date, select, barcode, signature) and display type: Grid, Timeline, Summary Card, Split View, or Board.',
    tip: 'Board display gives you a Kanban-style view. Timeline is ideal for lifecycle tracking. Grid is best for bulk record data.',
  },
  {
    id: 'design-roles',
    section: 'design',
    title: 'Roles, Tags & Policies',
    content: 'In the Admin tab, define roles with granular permissions: workspace.manage, record.create, flow.publish, subspace.manage. Assign roles to tenant users. Tag Policies attach structured metadata to records — used for RBAC filtering, automation triggers, and retention rules.',
    tip: 'Tags like "Batch:XY1234" or "Priority:High" power Signal flows and analytics without any code.',
  },

  // ═══════════════════════════════════════════════════════
  // AUTOMATE — SIGNAL STUDIO
  // ═══════════════════════════════════════════════════════
  {
    id: 'automate-intro',
    section: 'automate',
    title: 'Signal Studio — Automation Engine',
    content: 'Signal Studio lets you build event-driven automation flows with zero code. A flow has three parts: a Signal (trigger), optional Rules (conditions), and Actions (what happens). Flows run automatically across your workspace data.',
    navigateTo: 'signal',
    tip: 'Flows can react to any record event: created, updated, stage changed, tag added, field matched, time elapsed, or inbound webhook.',
  },
  {
    id: 'automate-trigger',
    section: 'automate',
    title: 'Creating a Flow — Trigger',
    content: 'Click "New Flow" and start by choosing a signal trigger. Options include: Record Created, Stage Changed, Field Value Matched, Serial Mismatch Detected, Shipment Confirmed, Time-Based (cron), and Inbound Webhook. Each trigger type has configurable parameters.',
    tip: 'For pharmaceutical traceability, try the "Serial Mismatch Detected" trigger to automatically flag discrepancies.',
  },
  {
    id: 'automate-rules',
    section: 'automate',
    title: 'Adding Rules & Actions',
    content: 'Rules filter when the flow fires — e.g. "only if Workspace = DSCSA Serialization AND Stage = Received". Actions define what happens: Send Notification, Update Record Field, Advance Lifecycle Stage, Call Webhook, or Log to Audit Trail. Chain multiple actions per flow.',
    tip: 'The "Auto-Advance on Ship Confirmation" demo flow runs in under 50ms on average with a 0% failure rate.',
  },
  {
    id: 'automate-publish',
    section: 'automate',
    title: 'Testing & Publishing',
    content: 'Before publishing, use the test runner to simulate a trigger event and see which rules matched and which actions would fire. Once validated, click Publish. Live flows show run metrics: total executions, failure rate, and average execution time.',
    tip: 'Published flows are versioned. Roll back to a previous version from the flow history panel at any time.',
  },

  // ═══════════════════════════════════════════════════════
  // INTEGRATE — ORBITAL
  // ═══════════════════════════════════════════════════════
  {
    id: 'integrate-intro',
    section: 'integrate',
    title: 'Orbital — Integration Marketplace',
    content: 'Orbital connects Halo Internal to your external systems — ERP, CRM, EPCIS repositories, shipping carriers, compliance databases, and custom APIs. Browse the integration library, configure credentials, and test connections in seconds.',
    navigateTo: 'orbital',
    tip: 'Orbital integrations are referenced by Signal flows — e.g. "On Stage Changed, push update to SAP via the SAP Integration".',
  },
  {
    id: 'integrate-connect',
    section: 'integrate',
    title: 'Connecting an Integration',
    content: 'Click any integration card to open its detail panel. Fill in credentials (API keys, OAuth, webhook URLs) in the Connection tab. Hit "Test Connection" — Halo Internal sends a live ping and shows latency + status in the event log. Save to activate.',
    tip: 'Connection credentials are stored encrypted per-tenant. Switching tenants automatically loads that tenant\'s credential set.',
  },
  {
    id: 'integrate-sync',
    section: 'integrate',
    title: 'Data Sync & Event Log',
    content: 'Each active integration shows a live event log: last sync timestamp, records synced, errors, and payload previews. Use the "Sync Now" button for manual refreshes. Signal flows can also trigger targeted sync pushes on specific record events.',
    tip: 'The event log retains the last 500 integration events per tenant. Filter by integration, status, or time range.',
  },

  // ═══════════════════════════════════════════════════════
  // ANALYZE — COSMOGRAPH
  // ═══════════════════════════════════════════════════════
  {
    id: 'analyze-intro',
    section: 'analyze',
    title: 'Cosmograph — Graph Analytics',
    content: 'Cosmograph renders your workspace data as a live force-directed graph. Each workspace record becomes a node; relationships (parent-child, referencing, same-lot) become edges. You can immediately see clusters, bottlenecks, and anomalies.',
    navigateTo: 'cosmograph',
    tip: 'Zoom with scroll, pan by drag, and click any node to open its full record in a slide-over drawer.',
  },
  {
    id: 'analyze-read',
    section: 'analyze',
    title: 'Reading the Graph',
    content: 'Node color maps to lifecycle stage — green = complete, yellow = in-progress, red = exception. Node size reflects the number of child records. Dense clusters are healthy batches; isolated red nodes indicate open exceptions requiring review.',
    tip: 'Use the filter panel to focus on a specific workspace, date range, or tag. The graph re-renders instantly.',
  },
  {
    id: 'analyze-insights',
    section: 'analyze',
    title: 'Insights & Reporting',
    content: 'The Analytics panel below the graph shows: total records, stage distribution, average lifecycle duration, top exception types, and flow trigger frequency. Export any view as CSV or share a live dashboard link with your team.',
    tip: 'Cosmograph updates in real time as records are created or stage-advanced — no manual refresh needed.',
  },

  // ═══════════════════════════════════════════════════════
  // OPERATE — END USER
  // ═══════════════════════════════════════════════════════
  {
    id: 'operate-intro',
    section: 'operate',
    title: 'End User — Tenant-Branded Runtime',
    content: 'The Operate (End User) view is the tenant-branded workspace your field users interact with every day. It applies the tenant\'s logo, colors, and role-scoped workspace access automatically. Each user sees only what their role permits.',
    navigateTo: 'enduser',
    tip: 'SuperAdmins can switch tenants from the left panel to preview any tenant\'s End User experience live.',
  },
  {
    id: 'operate-record',
    section: 'operate',
    title: 'Creating a Record',
    content: 'Click "Create Record" on any workspace card to open the intake modal. The Form tab has all fields defined in Design. The Import tab accepts CSV or JSON uploads. The Scan tab decodes GS1-128 barcodes directly from your camera or file, auto-filling product fields.',
    tip: 'Signal Studio flows fire immediately on "Record Created" — status notifications, audit log entries, and lifecycle advancement happen in real time.',
  },
  {
    id: 'operate-lifecycle',
    section: 'operate',
    title: 'Lifecycle Management',
    content: 'Every record moves through stages defined in the workspace (e.g. Serialized → Shipped → Received → Dispensed). Click the stage badge on any record to advance it — or let Signal flows auto-advance based on field values or incoming webhooks.',
    tip: 'Exception stages (red) pause normal lifecycle flow and route records to the exception review queue, visible to Compliance Officers.',
  },
  {
    id: 'operate-rbac',
    section: 'operate',
    title: 'Role-Based Access & Personas',
    content: 'Role-based access means each persona — Manufacturer Lead, Distributor Receiver, Pharmacy Manager, Compliance Analyst — sees a tailored workspace set with their permitted actions only. Buttons for restricted actions are hidden, not just disabled.',
    tip: 'Use the Role Switcher in the toolbar (top-right of the End User view) to preview what any role sees without logging out.',
  },

  // ═══════════════════════════════════════════════════════
  // FINISH
  // ═══════════════════════════════════════════════════════
  {
    id: 'tour-finish',
    section: 'finish',
    title: 'You\'re Ready to Build',
    content: 'That\'s the full Halo Internal platform — AI-powered workspace design, event-driven automation, external integrations, graph analytics, and role-scoped end-user experiences, all in one shell. Everything you build here is production-grade and deployable.',
    tip: 'Restart this tour anytime from Settings → Guided Tour. Use Ctrl+K (⌘K) to open the Command Palette and jump to any module instantly.',
  },
];

const spotlightSteps: SpotlightStep[] = [
  {
    target: 'tour-nav-panel',
    title: 'Navigation Panel',
    content: 'All six Halo Internal modules live here. Switch between AI, Design, Automate, Integrate, Analyze, and Operate with one click.',
    placement: 'right',
  },
  {
    target: 'tour-nav-bebo',
    title: 'AI — Bebo',
    content: 'Your AI co-pilot. Ask Bebo to build workspaces, generate flows, or explain any record in natural language.',
    placement: 'right',
  },
  {
    target: 'tour-nav-admin',
    title: 'Design — Workspace Creator',
    content: 'Build custom workspaces, SubSpaces, and field definitions with drag-and-drop — zero code required.',
    placement: 'right',
  },
  {
    target: 'tour-nav-signal',
    title: 'Automate — Signal Studio',
    content: 'Event-driven automation flows. Connect triggers to multi-step actions across your entire workspace graph.',
    placement: 'right',
  },
  {
    target: 'tour-nav-orbital',
    title: 'Integrate — Orbital',
    content: 'Connect Halo Internal to any external API, data source, or service. Marketplace integrations included.',
    placement: 'right',
  },
  {
    target: 'tour-nav-cosmograph',
    title: 'Analyze — Cosmograph',
    content: 'Force-directed knowledge graph that visualizes every record and relationship across your entire platform.',
    placement: 'right',
  },
  {
    target: 'tour-nav-enduser',
    title: 'Operate — End User',
    content: 'The tenant-branded UI your field users see. Configure roles, titles, and layouts per client.',
    placement: 'right',
  },
  {
    target: 'tour-notifications',
    title: 'Notifications',
    content: 'Real-time alerts, system events, and audit log entries — with unread count and instant access.',
    placement: 'bottom',
  },
];

function AppContent() {
  const { mode } = useUiTheme();
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <StatusBar style={mode === 'night' ? 'light' : 'dark'} />
      <GuidedTourProvider steps={tourSteps} mode={mode}>
        <SpotlightTourProvider steps={spotlightSteps}>
          <AppErrorBoundary>
            <AppShell />
          </AppErrorBoundary>
        </SpotlightTourProvider>
      </GuidedTourProvider>
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <UiThemeProvider>
      <AppStateProvider>
        <AppContent />
      </AppStateProvider>
    </UiThemeProvider>
  );
}
