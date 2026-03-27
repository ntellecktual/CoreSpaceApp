import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
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
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#FFFFFF', padding: 16 }}>
          <Text style={{ color: '#111111', fontSize: 13, fontWeight: '700' }}>Halo Internal encountered a runtime error.</Text>
          <Text style={{ color: '#4B5563', fontSize: 13 }}>{this.state.message || 'Unknown error'}</Text>
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
      'html, body { background-color: #263374; }',
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

function AppContent() {
  const { mode } = useUiTheme();
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <StatusBar style={mode === 'night' ? 'light' : 'dark'} />
      <AppErrorBoundary>
        <AppShell />
      </AppErrorBoundary>
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
