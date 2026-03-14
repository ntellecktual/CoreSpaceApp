import { StatusBar } from 'expo-status-bar';
import './assets/guidedTour.css';
import React, { useEffect, useState } from 'react';
import { GuidedTourProvider, TourStep } from './src/components/GuidedTour';
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
    console.error('CoreSpace runtime error:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#201535', padding: 16 }}>
          <Text style={{ color: '#E878F6', fontSize: 13, fontWeight: '700' }}>CoreSpace encountered a runtime error.</Text>
          <Text style={{ color: '#F1E8FF', fontSize: 13 }}>{this.state.message || 'Unknown error'}</Text>
        </View>
      );
    }

    return this.props.children;
  }
}

const CORESPACE_SCROLLBAR_STYLE_ID = 'corespace-global-scrollbar';

function useGlobalScrollbar() {
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    if (document.getElementById(CORESPACE_SCROLLBAR_STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = CORESPACE_SCROLLBAR_STYLE_ID;
    style.textContent = [
      '*::-webkit-scrollbar { width: 8px; height: 8px; }',
      '*::-webkit-scrollbar-track { background: rgba(255,255,255,0.03); border-radius: 999px; }',
      '*::-webkit-scrollbar-thumb { background: rgba(140,91,245,0.38); border-radius: 999px; border: 2px solid transparent; background-clip: padding-box; }',
      '*::-webkit-scrollbar-thumb:hover { background: rgba(140,91,245,0.55); }',
      '* { scrollbar-width: thin; scrollbar-color: rgba(140,91,245,0.38) rgba(255,255,255,0.03); }',
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
        <ActivityIndicator color="#E878F6" />
        <Text style={styles.loadingText}>Loading CoreSpace...</Text>
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
  // ── Welcome ──
  {
    id: 'welcome',
    title: 'Welcome to CoreSpace',
    content: 'CoreSpace is a configurable workspace platform that powers end-to-end traceability, automation, and role-based experiences. This tour walks you through every major area — from workspace design to supply-chain tracking.',
  },

  // ── Workspace Library ──
  {
    id: 'workspace-overview',
    title: 'Workspace Library',
    content: 'The Workspace Library is your starting point. Each workspace represents a distinct operational area — like Manufacturer Serialization or Pharmacy Dispense. Workspaces contain SubSpaces, builder fields, and count badges.',
  },
  {
    id: 'workspace-creator',
    title: 'Workspace Creator',
    content: 'Admins can create workspaces from scratch or start from templates. Define the root entity, add builder fields, and configure SubSpaces with their own field schemas and display types (grid, timeline, summary, split, board).',
  },
  {
    id: 'workspace-dscsa-demo',
    title: 'DSCSA Demo Workspace',
    content: 'The pre-loaded "DSCSA Serialization Workflow Example" workspace mirrors the exact serialization hierarchy: Carton → Boxes → Individual Units → Lot Information. Use it for investor demos and onboarding.',
  },

  // ── DSCSA Serialization Hierarchy ──
  {
    id: 'dscsa-carton',
    title: 'Step 1 — Carton',
    content: 'Each carton carries a unique Carton Serial (e.g. ABC1234678), Lot Number (XY1234), and Expiration Date (12/2025). This is the top-level packaging unit under DSCSA serialization.',
  },
  {
    id: 'dscsa-boxes',
    title: 'Step 2 — Boxes Inside Carton',
    content: 'Cartons contain multiple boxes, each with its own Box Serial (e.g. 56789YYZ001, 56789XYZ002). Box serials are aggregated under the parent carton for traceability.',
  },
  {
    id: 'dscsa-units',
    title: 'Step 3 — Individual Units',
    content: 'Each box holds individual drug units — bottles, blister packs, etc. Every unit receives a unique Unit Serial (e.g. SN12345678, SN98765432) that is tracked from manufacturing to dispensing.',
  },
  {
    id: 'dscsa-lot',
    title: 'Step 4 — Lot Information',
    content: 'All units in a batch share the same Lot Number (XY1234) and Expiration Date (12/2025). Lot data ties together the entire hierarchy for recall management and compliance reporting.',
  },

  // ── Supply Chain Workflow Stages ──
  {
    id: 'workflow-manufacturer',
    title: 'Manufacturer Serialization',
    content: 'The manufacturer assigns serial numbers to units and cartons, records lot and expiration data, aggregates cartons and boxes, and uploads EPCIS events to the compliance repository.',
  },
  {
    id: 'workflow-distributor',
    title: 'Distributor / Wholesaler Verification',
    content: 'The distributor receives and scans inbound shipments, verifies that serial numbers match manufacturer records, and tracks movement through the distribution network.',
  },
  {
    id: 'workflow-pharmacy',
    title: 'Pharmacy / Dispenser',
    content: 'The pharmacy receives and verifies incoming units, maintains a serial inventory, and logs each dispense event with Rx reference and pharmacist details.',
  },
  {
    id: 'workflow-traceability',
    title: 'Network Traceability & Exceptions',
    content: 'Track serials end-to-end from factory → distributor → pharmacy. Handle exceptions like returns and losses, and investigate suspect products — all from a unified trace ledger.',
  },

  // ── Signal Studio ──
  {
    id: 'signal-studio-overview',
    title: 'Signal Studio — Overview',
    content: 'Signal Studio is the automation engine. Create flows that react to data events — like a serial mismatch triggering an exception review, or a shipment confirmation auto-advancing the lifecycle stage.',
  },
  {
    id: 'signal-studio-flows',
    title: 'Signal Studio — Flows',
    content: 'Flows connect a signal (trigger) to rules and actions. The demo includes flows for Serial Mismatch Alert, Suspect Product Escalation, Expiration Warning, Auto-Advance on Ship Confirmation, and Dispense Completion Logger.',
  },
  {
    id: 'signal-studio-publish',
    title: 'Signal Studio — Publishing',
    content: 'Draft flows can be tested and then published. Published flows run automatically, with metrics visible: total runs, failure rate, and average execution time.',
  },

  // ── End User Space ──
  {
    id: 'enduser-overview',
    title: 'End User Experience',
    content: 'End users interact through persona-scoped views. Each persona — Manufacturer Lead, Distributor Receiver, Pharmacy Manager, Compliance Analyst — sees only the workspaces relevant to their role.',
  },
  {
    id: 'enduser-intake',
    title: 'Client Intake & Records',
    content: 'New serialized batches are created through the intake form (Product Name, Lot Number, Expiration Date, Carton Serial). Records move through lifecycle stages as they progress through the supply chain.',
  },
  {
    id: 'enduser-lifecycle',
    title: 'Lifecycle Stages',
    content: 'Every batch follows a lifecycle: Serialized → Shipped to Distributor → Received by Distributor → Shipped to Pharmacy → Received by Pharmacy → Dispensed. Exceptions branch to Exception Review when needed.',
  },

  // ── Admin ──
  {
    id: 'admin-roles',
    title: 'Admin — Roles & Permissions',
    content: 'Admins define roles with granular permissions: workspace.manage, subspace.manage, client.intake, record.create, flow.publish. Roles can be scoped to all workspaces or specific ones.',
  },
  {
    id: 'admin-tags-policies',
    title: 'Admin — Tags & Policies',
    content: 'Tag Policies organize data for RBAC, analytics, automation, and retention. Tags like Batch:XY1234, Carton:ABC1234678, and Priority:High drive automation rules and visibility filters.',
  },

  // ── Wrap-up ──
  {
    id: 'tour-complete',
    title: 'You\'re Ready!',
    content: 'That covers the full CoreSpace platform — workspaces, DSCSA serialization, supply chain workflows, Signal Studio automation, end user personas, lifecycle management, and admin controls. Explore on your own or restart this tour anytime from Settings.',
  },
];

function AppContent() {
  const { mode } = useUiTheme();
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <StatusBar style={mode === 'night' ? 'light' : 'dark'} />
      <GuidedTourProvider steps={tourSteps}>
        <AppErrorBoundary>
          <AppShell />
        </AppErrorBoundary>
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
