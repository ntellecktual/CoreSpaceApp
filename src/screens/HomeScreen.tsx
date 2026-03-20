import React, { JSX, useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, Platform, ScrollView, Share, Text, View } from 'react-native';
import { useWindowDimensions } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { BlurView } from 'expo-blur';
import { BrandLogo } from '../components/BrandLogo';
import { NebulaBackground } from '../components/NebulaBackground';
import { InteractivePressable as Pressable } from '../components/InteractivePressable';
import { CommandPalette } from '../components/CommandPalette';
import { NotificationCenter } from '../components/NotificationAudit';
import { ToastContainer, injectUxAnimations } from '../components/UxEnhancements';
import { useAppState } from '../context/AppStateContext';
import { useUiTheme } from '../context/UiThemeContext';
import { PortableDatabaseTarget } from '../persistence/portable';
import { LabeledInput } from './home/components';
import { ArchitecturePage } from './home/ArchitecturePage';
import { AdminPage } from './home/AdminPage';
import { EndUserPage } from './home/EndUserPage';
import { GuideModal } from './home/components';
import { pages } from './home/constants';
import { useHomeScreenState } from './home/hooks/useHomeScreenState';
import { useRbac } from './home/hooks/useRbac';
import { useNotifications, useAuditLog } from './home/hooks/useNotificationAudit';
import { SignalStudioPage } from './home/SignalStudioPage';
import { OrbitalPage } from './home/OrbitalPage';
import { BeboPage } from './home/BeboPage';
import { CosmographPage } from './home/CosmographPage';
import { FinancialPage } from './home/FinancialPage';
import { IngestionPage } from './home/IngestionPage';
import { ModulePageActions } from './home/types';
import type { CommandPaletteItem } from '../types';
import { useGuidedTour } from '../components/GuidedTour';
import { useSpotlightTour } from '../components/SpotlightTour';
import type { Page } from './home/types';

// ─── Demo Journey — ordered 6-step demo flow ────────────────────────
const DEMO_STEPS: Array<{ id: Page; icon: string; label: string; tip: string }> = [
  { id: 'bebo',       icon: '✦', label: 'Bebo AI',       tip: 'Ask Bebo to instantly build workspaces, flows & data' },
  { id: 'admin',      icon: '◈', label: 'Workspace',     tip: 'Design workspaces, SubSpaces, and data fields' },
  { id: 'signal',     icon: '⚡', label: 'Signal Studio', tip: 'Set up automation flows that react to workspace events' },
  { id: 'orbital',    icon: '🔗', label: 'Orbital',       tip: 'Connect to DocuSign, Stripe, SAP, and 30+ more' },
  { id: 'cosmograph', icon: '⬡', label: 'Cosmograph',    tip: 'Import and analyze any CSV or JSON dataset' },
  { id: 'enduser',    icon: '▣', label: 'End User',       tip: 'Live operational runtime — what your team sees' },
];

const tenantTitleOptions = [
  'Operations Coordinator',
  'Case Specialist',
  'Compliance Officer',
  'Claims Analyst',
  'Intake Specialist',
  'Field Supervisor',
  'Quality Lead',
  'Regional Manager',
];

const GLOBAL_WIDGET_TWO_COLUMN_BREAKPOINT = 1280;

function normalizeHex(value: string, fallback: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return fallback;
  }
  const withHash = trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
  return /^#[0-9a-fA-F]{6}$/.test(withHash) ? withHash.toUpperCase() : fallback;
}

function withAlpha(hex: string, alphaHex: string) {
  return `${hex}${alphaHex}`;
}

function getContrastTextColor(hex: string) {
  const raw = hex.replace('#', '');
  const normalized = raw.length === 3 ? raw.split('').map((item) => item + item).join('') : raw;
  if (normalized.length !== 6) {
    return '#FFFFFF';
  }
  const red = parseInt(normalized.slice(0, 2), 16);
  const green = parseInt(normalized.slice(2, 4), 16);
  const blue = parseInt(normalized.slice(4, 6), 16);
  const luminance = (0.299 * red + 0.587 * green + 0.114 * blue) / 255;
  return luminance > 0.56 ? '#111111' : '#FFFFFF';
}

export function HomeScreen() {
  const { width } = useWindowDimensions();
  const { mode, toggleMode, styles } = useUiTheme();
  const {
    hydrated,
    currentUser,
    signOut,
    isSuperAdmin,
    tenants,
    activeTenantId,
    activeTenantName,
    activeTenantBranding,
    createTenant,
    switchTenant,
    renameTenant,
    updateTenantBranding,
    exportTenantDataset,
  } = useAppState();
  const { page, guidedMode, activeGuide, setPage, toggleGuidedMode, openGuide, closeGuide } = useHomeScreenState();
  const { activeRole, roles, setActiveRoleId } = useRbac();
  const { currentStep, steps, isOpen: tourOpen, openTour } = useGuidedTour();
  const { openSpotlightTour } = useSpotlightTour();

  // Auto-navigate to the correct page when the guided tour step changes
  useEffect(() => {
    if (!tourOpen) return;
    const tourStep = steps[currentStep];
    if (tourStep?.navigateTo) {
      setTenantAccessOpen(false);
      setPage(tourStep.navigateTo as Page);
    }
  }, [tourOpen, currentStep, steps]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [tenantAccessOpen, setTenantAccessOpen] = useState(false);
  const [endUserTenantMenuOpen, setEndUserTenantMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [newTenantName, setNewTenantName] = useState('');
  const [tenantRenameValue, setTenantRenameValue] = useState(activeTenantName);
  const [tenantNotice, setTenantNotice] = useState('');
  const [moduleActionNotice, setModuleActionNotice] = useState('');
  const [tenantLogoUri, setTenantLogoUri] = useState(activeTenantBranding.logoUri ?? '');
  const [tenantPrimaryColor, setTenantPrimaryColor] = useState(activeTenantBranding.brandColors[0]);
  const [tenantSecondaryColor, setTenantSecondaryColor] = useState(activeTenantBranding.brandColors[1]);
  const [tenantAccentColor, setTenantAccentColor] = useState(activeTenantBranding.brandColors[2]);
  const [tenantRoleTitles, setTenantRoleTitles] = useState<string[]>(activeTenantBranding.employeeTitles);
  const [tenantCustomRoleTitle, setTenantCustomRoleTitle] = useState('');
  const [tenantRolesExpanded, setTenantRolesExpanded] = useState(false);
  const [newTenantLogoUri, setNewTenantLogoUri] = useState('');
  const [newTenantPrimaryColor, setNewTenantPrimaryColor] = useState('#120C23');
  const [newTenantSecondaryColor, setNewTenantSecondaryColor] = useState('#1A1230');
  const [newTenantAccentColor, setNewTenantAccentColor] = useState('#8C5BF5');
  const [tenantExportTarget, setTenantExportTarget] = useState<PortableDatabaseTarget>('cosmos');
  const [newTenantRoleTitles, setNewTenantRoleTitles] = useState<string[]>(['Operations Coordinator']);
  const [newTenantCustomRoleTitle, setNewTenantCustomRoleTitle] = useState('');
  const [newTenantRolesExpanded, setNewTenantRolesExpanded] = useState(false);
  const [moduleActions, setModuleActions] = useState<ModulePageActions | null>(null);
  const activePage = pages.find((item) => item.id === page);
  const mainPaneTitle = tenantAccessOpen
    ? 'Tenant Access'
    : page === 'architecture'
      ? 'Platform Documentation'
      : page === 'enduser'
        ? activeTenantName
        : activePage?.label ?? 'Workspace';
  const clamp = (min: number, preferred: number, max: number) => Math.max(min, Math.min(max, preferred));
  const shellTitleSize = clamp(24, Math.round(width * 0.028), 30);
  const shellTitleLineHeight = clamp(30, Math.round(width * 0.034), 38);
  const shellSpace = clamp(10, Math.round(width * 0.012), 20);
  const compactShell = width < 980;
  const autoCollapseBreakpoint = 1320;
  const canCollapseSidebar = !compactShell;
  const autoCollapsed = canCollapseSidebar && width < autoCollapseBreakpoint;
  const isSidebarCollapsed = canCollapseSidebar && (sidebarCollapsed || autoCollapsed);
  const collapsedSidebarWidth = 86;
  const sidebarWidth = compactShell ? width : clamp(272, Math.round(width * 0.22), 308);
  const resolvedSidebarWidth = compactShell ? width : (isSidebarCollapsed ? collapsedSidebarWidth : sidebarWidth);

  // ── Notifications ──
  const { notifications, unreadCount, addNotification, markRead, clearAll: clearAllNotifications } = useNotifications(activeTenantId);

  // ── Audit Log (lifted to HomeScreen so all pages share one log) ──
  const auditLog = useAuditLog(activeTenantId, currentUser);

  // Inject UX animations CSS once
  useEffect(() => { injectUxAnimations(); }, []);

  // Log sign-in on first load when a user is present
  const [signInLogged, setSignInLogged] = useState(false);
  useEffect(() => {
    if (currentUser && !signInLogged) {
      auditLog.logEntry({ action: 'sign-in', entityType: 'user', entityId: currentUser.id, entityName: currentUser.fullName });
      setSignInLogged(true);
    }
  }, [currentUser, signInLogged, auditLog]);

  // ── Command Palette keyboard shortcut (Ctrl+K / ⌘K) ──
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen((v) => !v);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  // ── Guided Mode toggle (declared before command palette to avoid TDZ) ──
  const handleGuidedModeToggle = useCallback(() => {
    const shouldEnableGuidedMode = !guidedMode;
    toggleGuidedMode();

    if (shouldEnableGuidedMode) {
      setPage('admin');
    }
  }, [guidedMode, toggleGuidedMode]);

  // ── Command Palette commands ──
  const commands: CommandPaletteItem[] = useMemo(() => {
    const cmds: CommandPaletteItem[] = [
      { id: 'nav-admin', label: 'Go to Workspace Creator', category: 'navigation', keywords: ['workspace', 'admin', 'create'], action: () => { setTenantAccessOpen(false); setPage('admin'); } },
      { id: 'nav-signal', label: 'Go to Signal Studio', category: 'navigation', keywords: ['signal', 'flow', 'automation'], action: () => { setTenantAccessOpen(false); setPage('signal'); } },
      { id: 'nav-enduser', label: 'Go to End User', category: 'navigation', keywords: ['enduser', 'runtime', 'dashboard'], action: () => { setTenantAccessOpen(false); setPage('enduser'); } },
      { id: 'nav-architecture', label: 'Go to Architecture Docs', category: 'navigation', keywords: ['docs', 'architecture', 'documentation'], action: () => { setTenantAccessOpen(false); setPage('architecture'); } },
      { id: 'settings-theme', label: `Switch to ${mode === 'day' ? 'Night' : 'Day'} Mode`, category: 'settings', keywords: ['theme', 'dark', 'light', 'mode'], action: toggleMode },
      { id: 'settings-guided', label: 'Start Guided Tour', category: 'settings', keywords: ['guide', 'walkthrough', 'tutorial', 'tour'], action: openTour },
      { id: 'settings-sidebar', label: `${isSidebarCollapsed ? 'Expand' : 'Collapse'} Sidebar`, category: 'settings', keywords: ['sidebar', 'collapse', 'expand'], action: () => setSidebarCollapsed((c) => !c) },
      { id: 'tenant-access', label: 'Open Tenant Access', category: 'tenant', keywords: ['tenant', 'manage', 'admin'], action: () => setTenantAccessOpen(true) },
      { id: 'notifications-open', label: 'Open Notifications', category: 'settings', keywords: ['notifications', 'alerts', 'bell'], action: () => setNotificationsOpen(true) },
    ];
    tenants.forEach((t) => {
      cmds.push({ id: `tenant-switch-${t.id}`, label: `Switch to ${t.name}`, category: 'tenant', keywords: ['switch', 'tenant', t.name.toLowerCase()], action: () => handleSwitchTenant(t.id) });
    });
    return cmds;
  }, [mode, guidedMode, isSidebarCollapsed, tenants, activeTenantId, handleGuidedModeToggle]);

  const workspaceNavIcon = mode === 'day'
    ? require('../../assets/cs_wsdarklogo.png')
    : require('../../assets/cs_wslightlogo.png');
  const signalNavIcon = mode === 'day'
    ? require('../../assets/cs_ssdarklogo.png')
    : require('../../assets/cs_sslightlogo.png');
  const orbitalNavIcon = mode === 'day'
    ? require('../../assets/cs_orbitaldarklogo.png')
    : require('../../assets/cs_orbitallightlogo.png');
  const beboNavIcon = mode === 'day'
    ? require('../../assets/cs_bebodarklogo.png')
    : require('../../assets/cs_bebolightlogo.png');
  const cosmoNavIcon = mode === 'day'
    ? require('../../assets/cs_orbitaldarklogo.png')
    : require('../../assets/cs_orbitallightlogo.png');
  const tenantBrandedMode = page === 'enduser' && !tenantAccessOpen;
  const moduleActionEnabled = (tenantAccessOpen && isSuperAdmin) || (!tenantAccessOpen && (page === 'admin' || page === 'signal' || page === 'orbital' || page === 'bebo' || page === 'cosmograph' || page === 'financial' || page === 'ingestion'));
  const saveDraftLabel = moduleActions?.saveDraftLabel ?? 'Save Draft';
  const publishLabel = moduleActions?.publishLabel ?? 'Publish';
  const bottomActionStatus = (tenantAccessOpen && isSuperAdmin ? tenantNotice : moduleActionNotice) || '';
  const tenantPrimaryResolved = normalizeHex(tenantPrimaryColor, activeTenantBranding.brandColors[0]);
  const tenantSecondaryResolved = normalizeHex(tenantSecondaryColor, activeTenantBranding.brandColors[1]);
  const tenantAccentResolved = normalizeHex(tenantAccentColor, activeTenantBranding.brandColors[2]);
  const tenantAccentTextColor = getContrastTextColor(tenantAccentResolved);
  const endUserFooterSecondaryButtonStyle = tenantBrandedMode
    ? {
        borderColor: withAlpha(tenantAccentResolved, mode === 'day' ? 'CC' : 'DD'),
        backgroundColor: withAlpha(tenantAccentResolved, mode === 'day' ? 'B5' : 'A6'),
      }
    : null;
  const endUserFooterPrimaryButtonStyle = tenantBrandedMode
    ? {
        borderColor: tenantAccentResolved,
        backgroundColor: tenantAccentResolved,
      }
    : null;
  const endUserFooterButtonTextStyle = tenantBrandedMode
    ? { color: tenantAccentTextColor }
    : null;
  const endUserFooterBarStyle = tenantBrandedMode
    ? {
        borderTopColor: withAlpha(tenantAccentResolved, mode === 'day' ? '8F' : 'A8'),
        backgroundColor: withAlpha(tenantSecondaryResolved, mode === 'day' ? 'D6' : 'B5'),
      }
    : null;
  const endUserFooterStatusTextStyle = tenantBrandedMode
    ? {
        color: mode === 'day'
          ? withAlpha(getContrastTextColor(tenantSecondaryResolved), 'E8')
          : withAlpha(getContrastTextColor(tenantAccentResolved), 'F2'),
      }
    : null;

  const handleSaveDraft = () => {
    setModuleActionNotice('Draft saved.');
  };

  const registerModuleActions = useCallback((actions: ModulePageActions | null) => {
    setModuleActions(actions);
  }, []);

  const runModuleAction = async (actionType: 'saveDraft' | 'publish') => {
    const action = moduleActions?.[actionType];
    if (!action) {
      setModuleActionNotice('This module does not expose that action yet.');
      return;
    }

    const result = await Promise.resolve(action());
    if (actionType === 'saveDraft') {
      handleSaveDraft();
      addNotification({ type: 'system', title: 'Draft Saved', body: result ?? 'Your changes have been saved as a draft.', severity: 'info' });
    } else {
      addNotification({ type: 'system', title: 'Published Successfully', body: result ?? 'Your configuration has been published.', severity: 'success' });
    }
    setModuleActionNotice(result ?? (actionType === 'saveDraft' ? 'Draft saved.' : 'Published successfully.'));
  };

  useEffect(() => {
    setTenantRenameValue(activeTenantName);
    setTenantLogoUri(activeTenantBranding.logoUri ?? '');
    setTenantPrimaryColor(activeTenantBranding.brandColors[0]);
    setTenantSecondaryColor(activeTenantBranding.brandColors[1]);
    setTenantAccentColor(activeTenantBranding.brandColors[2]);
    setTenantRoleTitles(activeTenantBranding.employeeTitles);
    setTenantCustomRoleTitle('');
  }, [activeTenantName, activeTenantBranding]);

  useEffect(() => {
    setModuleActionNotice('');
    setModuleActions(null);
  }, [page, tenantAccessOpen]);

  useEffect(() => {
    if (page !== 'enduser' || isSidebarCollapsed) {
      setEndUserTenantMenuOpen(false);
    }
  }, [page, isSidebarCollapsed]);

  useEffect(() => {
    if (!tenantAccessOpen || !isSuperAdmin) {
      return;
    }

    setModuleActions({
      saveDraftLabel: 'Save Tenant Draft',
      publishLabel: newTenantName.trim() ? 'Publish + Create Tenant' : 'Publish Tenant Changes',
      saveDraft: saveTenantCrudDraft,
      publish: publishTenantCrud,
    });
  }, [
    tenantAccessOpen,
    isSuperAdmin,
    newTenantName,
    tenantRenameValue,
    tenantLogoUri,
    tenantPrimaryColor,
    tenantSecondaryColor,
    tenantAccentColor,
    tenantRoleTitles,
    newTenantLogoUri,
    newTenantPrimaryColor,
    newTenantSecondaryColor,
    newTenantAccentColor,
    newTenantRoleTitles,
  ]);

  const handleSwitchTenant = (tenantId: string) => {
    const result = switchTenant(tenantId);
    if (!result.ok) {
      setTenantNotice(result.reason ?? 'Unable to switch tenant.');
      return;
    }
    setTenantNotice('Tenant switched successfully.');
  };

  const handleExportTenantDataset = async (tenantId: string, tenantName: string) => {
    const result = exportTenantDataset(tenantId, tenantExportTarget);
    if (!result.ok || !result.payload || !result.fileName) {
      setTenantNotice(result.reason ?? 'Unable to export tenant dataset.');
      return;
    }

    try {
      if (Platform.OS === 'web' && typeof document !== 'undefined' && typeof URL !== 'undefined') {
        const blob = new Blob([result.payload], { type: result.mimeType ?? 'application/json' });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = result.fileName;
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        URL.revokeObjectURL(url);
        setTenantNotice(`${tenantName} export downloaded (${tenantExportTarget.toUpperCase()}).`);
        return;
      }

      await Share.share({
        title: result.fileName,
        message: result.payload,
      });
      setTenantNotice(`${tenantName} export ready to share (${tenantExportTarget.toUpperCase()}).`);
    } catch {
      setTenantNotice('Unable to export tenant dataset on this device.');
    }
  };

  const handleRenameTenant = () => {
    const result = renameTenant(activeTenantId, tenantRenameValue);
    if (!result.ok) {
      setTenantNotice(result.reason ?? 'Unable to rename tenant.');
      return;
    }
    setTenantNotice('Tenant name updated.');
  };

  const pickLogoFromLibrary = async (onSelected: (uri: string) => void, noticePrefix: string) => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      setTenantNotice('Media library permission is required to upload a tenant logo.');
      return;
    }

    const pickerResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.9,
    });

    if (pickerResult.canceled || !pickerResult.assets || pickerResult.assets.length === 0) {
      return;
    }

    onSelected(pickerResult.assets[0].uri);
    setTenantNotice(`${noticePrefix} logo selected. Save to persist changes.`);
  };

  const pickLogoFromCamera = async (onSelected: (uri: string) => void, noticePrefix: string) => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (!permissionResult.granted) {
      setTenantNotice('Camera permission is required to capture a tenant logo.');
      return;
    }

    try {
      const cameraResult = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.9,
      });

      if (cameraResult.canceled || !cameraResult.assets || cameraResult.assets.length === 0) {
        return;
      }

      onSelected(cameraResult.assets[0].uri);
      setTenantNotice(`${noticePrefix} logo captured. Save to persist changes.`);
    } catch {
      setTenantNotice('Camera capture is not available on this device. Use Photo Library instead.');
    }
  };

  const openLogoSourcePicker = (onSelected: (uri: string) => void, noticePrefix: string) => {
    Alert.alert('Tenant Logo', 'Choose logo source', [
      {
        text: 'Photo Library',
        onPress: () => {
          void pickLogoFromLibrary(onSelected, noticePrefix);
        },
      },
      {
        text: 'Camera',
        onPress: () => {
          void pickLogoFromCamera(onSelected, noticePrefix);
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handlePickActiveTenantLogo = async () => {
    openLogoSourcePicker(setTenantLogoUri, 'Active tenant');
  };

  const handlePickNewTenantLogo = async () => {
    openLogoSourcePicker(setNewTenantLogoUri, 'New tenant');
  };

  const handleRemoveActiveTenantLogo = () => {
    setTenantLogoUri('');
    setTenantNotice('Active tenant logo removed. Save to persist the default CoreSpace brand mark.');
  };

  const handleRemoveNewTenantLogo = () => {
    setNewTenantLogoUri('');
    setTenantNotice('New tenant logo cleared. Default CoreSpace brand mark will be used.');
  };

  const applyActiveTenantUpdates = () => {
    const trimmedTenantName = tenantRenameValue.trim();
    if (trimmedTenantName && trimmedTenantName !== activeTenantName) {
      const renameResult = renameTenant(activeTenantId, trimmedTenantName);
      if (!renameResult.ok) {
        return renameResult.reason ?? 'Unable to rename active tenant.';
      }
    }

    const brandingResult = updateTenantBranding(activeTenantId, {
      logoUri: tenantLogoUri.trim() || undefined,
      brandColors: [tenantPrimaryResolved, tenantSecondaryResolved, tenantAccentResolved],
      widgetTwoColumnBreakpoint: GLOBAL_WIDGET_TWO_COLUMN_BREAKPOINT,
      employeeTitles: tenantRoleTitles,
    });
    if (!brandingResult.ok) {
      return brandingResult.reason ?? 'Unable to update tenant branding.';
    }

    return '';
  };

  const saveTenantCrudDraft = () => {
    const error = applyActiveTenantUpdates();
    if (error) {
      setTenantNotice(error);
      return error;
    }
    const message = 'Tenant draft saved.';
    setTenantNotice(message);
    return message;
  };

  const publishTenantCrud = () => {
    const error = applyActiveTenantUpdates();
    if (error) {
      setTenantNotice(error);
      return error;
    }

    const creatingNewTenant = newTenantName.trim().length > 0;
    if (creatingNewTenant) {
      const createResult = createTenant(newTenantName, {
        logoUri: newTenantLogoUri.trim() || undefined,
        brandColors: [
          normalizeHex(newTenantPrimaryColor, '#120C23'),
          normalizeHex(newTenantSecondaryColor, '#1A1230'),
          normalizeHex(newTenantAccentColor, '#8C5BF5'),
        ],
        widgetTwoColumnBreakpoint: GLOBAL_WIDGET_TWO_COLUMN_BREAKPOINT,
        employeeTitles: newTenantRoleTitles,
      });

      if (!createResult.ok) {
        const message = createResult.reason ?? 'Unable to create tenant.';
        setTenantNotice(message);
        return message;
      }

      setNewTenantName('');
      setNewTenantLogoUri('');
      setNewTenantPrimaryColor('#120C23');
      setNewTenantSecondaryColor('#1A1230');
      setNewTenantAccentColor('#8C5BF5');
      setNewTenantRoleTitles(['Operations Coordinator']);
      setNewTenantCustomRoleTitle('');
      setNewTenantRolesExpanded(false);
    }

    const message = creatingNewTenant
      ? 'Tenant changes published and new tenant created.'
      : 'Tenant changes published.';
    setTenantNotice(message);
    return message;
  };

  const toggleTitleSelection = (title: string, selected: string[], setSelected: (next: string[]) => void) => {
    const exists = selected.some((item) => item.toLowerCase() === title.toLowerCase());
    if (exists) {
      const next = selected.filter((item) => item.toLowerCase() !== title.toLowerCase());
      setSelected(next.length > 0 ? next : [title]);
      return;
    }
    setSelected([...selected, title]);
  };

  const addCustomTitle = (value: string, selected: string[], setSelected: (next: string[]) => void, onComplete: () => void) => {
    const nextTitle = value.trim();
    if (!nextTitle) {
      return;
    }
    if (selected.some((item) => item.toLowerCase() === nextTitle.toLowerCase())) {
      onComplete();
      return;
    }
    setSelected([...selected, nextTitle]);
    onComplete();
  };

  if (!hydrated) {
    return (
      <View style={styles.loadingWrap}>
        <NebulaBackground mode={mode} />
        <BrandLogo width={260} height={104} />
        <ActivityIndicator color="#E878F6" />
        <Text style={styles.loadingText}>Getting things ready...</Text>
      </View>
    );
  }

  const ShellWrapper = compactShell ? ScrollView : View;
  const shellWrapperProps = compactShell
    ? { style: [styles.dashboardShell, styles.dashboardShellCompact], contentContainerStyle: styles.dashboardShellCompactContent, keyboardShouldPersistTaps: 'handled' as const, showsVerticalScrollIndicator: true }
    : { style: [styles.dashboardShell] };

  return (
    <View style={styles.root} {...(Platform.OS === 'web' ? { dataSet: { theme: mode === 'day' ? 'day' : 'night' } } as any : {})}>
      <NebulaBackground mode={mode} />
      <ShellWrapper {...shellWrapperProps}>
        <View
          style={[
            styles.dashboardSidebar,
            isSidebarCollapsed && styles.dashboardSidebarCollapsed,
            compactShell ? styles.dashboardSidebarCompact : { width: resolvedSidebarWidth },
            styles.dashboardSidebarSmooth,
            tenantBrandedMode && { backgroundColor: tenantPrimaryResolved },
            { paddingHorizontal: shellSpace },
          ]}
        >
          <View style={styles.dashboardBrandWrap}>
            <View style={[styles.dashboardBrandTopRow, !compactShell && !isSidebarCollapsed && { gap: 0 }]}>
              <Pressable
                style={styles.dashboardHamburgerButton}
                onPress={() => {
                  if (!canCollapseSidebar) {
                    return;
                  }
                  setSidebarCollapsed((current) => !current);
                  setSettingsOpen(false);
                }}
                accessibilityRole="button"
                accessibilityLabel={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                <Text style={styles.dashboardHamburgerButtonText}>☰</Text>
              </Pressable>

              {isSidebarCollapsed ? (
                <Image
                  source={require('../../assets/hamburger.png')}
                  style={styles.dashboardCollapsedLogo}
                  accessibilityRole="image"
                  accessibilityLabel="Collapsed sidebar logo"
                />
              ) : (
                <BrandLogo
                  width={220}
                  height={60}
                  logoUri={tenantBrandedMode ? tenantLogoUri : undefined}
                  style={!compactShell ? { marginLeft: -10 } : undefined}
                />
              )}
            </View>
            {!isSidebarCollapsed && <Text style={styles.dashboardSubBrand}>Build, manage, and automate — no code required</Text>}
          </View>

          {!isSidebarCollapsed && (
            <>
              <Pressable
                style={[styles.dashboardCreateButton, tenantBrandedMode && { backgroundColor: tenantAccentResolved }]}
                onPress={() => { setTenantAccessOpen(false); setPage('admin'); }}
              >
                <Text style={styles.dashboardCreateButtonText}>Create</Text>
              </Pressable>

              <View style={styles.dashboardNavSection} nativeID="tour-nav-panel">
                {pages.map((item) => (
                  item.id === 'bebo' ? (
                    <React.Fragment key={item.id}>
                      <Text style={styles.dashboardSectionLabel}>AI</Text>
                      <Pressable
                        nativeID="tour-nav-bebo"
                        onPress={() => {
                          setTenantAccessOpen(false);
                          setPage(item.id);
                        }}
                        style={[
                          styles.dashboardNavItem,
                          page === item.id && styles.dashboardNavItemActive,
                        ]}
                        accessibilityRole="button"
                        accessibilityState={{ selected: page === item.id }}
                        accessibilityLabel={`${item.label} page`}
                      >
                        <View style={styles.dashboardNavItemRow}>
                          <Image source={beboNavIcon} style={styles.dashboardNavItemIcon} accessibilityRole="image" accessibilityLabel="Bebo Ai icon" />
                          <View>
                            <Text
                              style={[
                                styles.dashboardNavItemText,
                                page === item.id && styles.dashboardNavItemTextActive,
                              ]}
                            >
                              {item.label}
                            </Text>
                            <Text style={styles.dashboardNavItemDesc}>{item.desc}</Text>
                          </View>
                        </View>
                      </Pressable>
                    </React.Fragment>
                  ) : item.id === 'enduser' && isSuperAdmin ? (
                    <React.Fragment key={item.id}>
                      <Text style={[styles.dashboardSectionLabel, { marginTop: 12 }]}>Operate</Text>
                      <View style={styles.dashboardTenantNavGroup}>
                      <Pressable
                        nativeID="tour-nav-enduser"
                        onPress={() => {
                          setTenantAccessOpen(false);
                          setPage('enduser');
                          setEndUserTenantMenuOpen((current) => !current);
                        }}
                        style={[
                          styles.dashboardNavItem,
                          page === 'enduser' && styles.dashboardNavItemActive,
                          tenantBrandedMode && page === 'enduser' && {
                            backgroundColor: tenantAccentResolved,
                          },
                        ]}
                        accessibilityRole="button"
                        accessibilityState={{ expanded: endUserTenantMenuOpen, selected: page === 'enduser' }}
                        accessibilityLabel="End user tenant selector"
                      >
                        <View style={styles.dashboardNavItemRow}>
                          <BrandLogo width={136} height={34} logoUri={activeTenantBranding.logoUri} />
                          <Text
                            style={[
                              styles.dashboardTenantChevron,
                              tenantBrandedMode && page === 'enduser' && { color: tenantAccentTextColor },
                            ]}
                          >
                            {endUserTenantMenuOpen ? '▾' : '▸'}
                          </Text>
                        </View>
                      </Pressable>

                      {endUserTenantMenuOpen && (
                        <View style={styles.dashboardTenantNavList}>
                          {tenants.map((tenant) => {
                            const tenantAccent = normalizeHex(tenant.branding.brandColors[2], '#8C5BF5');
                            const tenantAccentText = getContrastTextColor(tenantAccent);
                            const selectedTenant = activeTenantId === tenant.id && page === 'enduser';

                            return (
                              <Pressable
                                key={`tenant-enduser-${tenant.id}`}
                                onPress={() => {
                                  setTenantAccessOpen(false);
                                  handleSwitchTenant(tenant.id);
                                  setPage('enduser');
                                }}
                                style={[
                                  styles.dashboardTenantNavItem,
                                  selectedTenant && styles.dashboardTenantNavItemActive,
                                  selectedTenant && {
                                    backgroundColor: tenantAccent,
                                    borderColor: tenantAccent,
                                  },
                                ]}
                                accessibilityRole="button"
                                accessibilityState={{ selected: selectedTenant }}
                                accessibilityLabel={`Open ${tenant.name} end user view`}
                              >
                                <View style={styles.dashboardTenantNavItemRow}>
                                  <BrandLogo width={112} height={28} logoUri={tenant.branding.logoUri} />
                                  <Text
                                    style={[
                                      styles.dashboardTenantNavItemText,
                                      selectedTenant && { color: tenantAccentText },
                                    ]}
                                  >
                                    {tenant.name}
                                  </Text>
                                </View>
                              </Pressable>
                            );
                          })}
                        </View>
                      )}
                    </View>
                    </React.Fragment>
                  ) : item.id === 'enduser' ? (
                    <React.Fragment key={item.id}>
                      <Text style={[styles.dashboardSectionLabel, { marginTop: 12 }]}>Operate</Text>
                      <Pressable
                      nativeID="tour-nav-enduser"
                      onPress={() => {
                        setTenantAccessOpen(false);
                        setPage(item.id);
                      }}
                      style={[
                        styles.dashboardNavItem,
                        page === item.id && styles.dashboardNavItemActive,
                        tenantBrandedMode && page === item.id && {
                          backgroundColor: tenantAccentResolved,
                        },
                      ]}
                      accessibilityRole="button"
                      accessibilityState={{ selected: page === item.id }}
                      accessibilityLabel={`${item.label} page`}
                    >
                      <View style={styles.dashboardNavItemRow}>
                        <Text
                          style={[
                            styles.dashboardNavItemText,
                            page === item.id && styles.dashboardNavItemTextActive,
                            tenantBrandedMode && page === item.id && { color: tenantAccentTextColor },
                          ]}
                        >
                          {item.label}
                        </Text>
                      </View>
                    </Pressable>
                    </React.Fragment>
                  ) : (
                    <React.Fragment key={item.id}>
                      <Text style={[styles.dashboardSectionLabel, { marginTop: 12 }]}>{item.desc}</Text>
                      <Pressable
                        nativeID={`tour-nav-${item.id}`}
                        onPress={() => {
                          setTenantAccessOpen(false);
                          setPage(item.id);
                        }}
                        style={[
                          styles.dashboardNavItem,
                          page === item.id && styles.dashboardNavItemActive,
                        ]}
                        accessibilityRole="button"
                        accessibilityState={{ selected: page === item.id }}
                        accessibilityLabel={`${item.label} page`}
                      >
                        <View style={styles.dashboardNavItemRow}>
                          {item.id === 'admin' && <Image source={workspaceNavIcon} style={styles.dashboardNavItemIcon} accessibilityRole="image" accessibilityLabel="Workspace icon" />}
                          {item.id === 'signal' && <Image source={signalNavIcon} style={styles.dashboardNavItemIcon} accessibilityRole="image" accessibilityLabel="Signal Studio icon" />}
                          {item.id === 'orbital' && <Image source={orbitalNavIcon} style={styles.dashboardNavItemIcon} accessibilityRole="image" accessibilityLabel="Orbital icon" />}
                          {item.id === 'cosmograph' && <Image source={cosmoNavIcon} style={styles.dashboardNavItemIcon} accessibilityRole="image" accessibilityLabel="Cosmograph icon" />}
                          <View>
                            <Text
                              style={[
                                styles.dashboardNavItemText,
                                page === item.id && styles.dashboardNavItemTextActive,
                              ]}
                            >
                              {item.id === 'admin' ? 'Workspace' : item.label}
                            </Text>
                            <Text style={styles.dashboardNavItemDesc}>{item.desc}</Text>
                          </View>
                        </View>
                      </Pressable>
                    </React.Fragment>
                  )
                ))}
              </View>

              <View style={styles.dashboardSidebarFooter}>
                <Pressable
                  style={[styles.dashboardSidebarAction, settingsOpen && styles.dashboardSidebarActionActive]}
                  onPress={() => setSettingsOpen((current) => !current)}
                  accessibilityRole="button"
                  accessibilityLabel="Settings"
                  accessibilityHint="Opens app settings"
                >
                  <Text style={[styles.dashboardSidebarActionText, settingsOpen && styles.dashboardSidebarActionTextActive]}>
                    Settings {settingsOpen ? '▾' : '▸'}
                  </Text>
                </Pressable>

                {settingsOpen && (
                  <View style={styles.dashboardSettingsMenu}>
                <Pressable
                  style={[styles.dashboardSidebarAction, !tenantAccessOpen && page === 'architecture' && styles.dashboardSidebarActionActive]}
                  onPress={() => {
                    setTenantAccessOpen(false);
                    setPage('architecture');
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="CoreSpace Documentation"
                >
                  <Text style={[styles.dashboardSidebarActionText, !tenantAccessOpen && page === 'architecture' && styles.dashboardSidebarActionTextActive]}>
                    Platform Docs
                  </Text>
                </Pressable>
                <Pressable
                  style={styles.dashboardSidebarAction}
                  onPress={openTour}
                  accessibilityRole="button"
                  accessibilityLabel="Launch the full guided tour"
                >
                  <Text style={styles.dashboardSidebarActionText}>🎯 Launch Full Tour</Text>
                </Pressable>
                <Pressable
                  style={[styles.dashboardSidebarAction, guidedMode && styles.dashboardSidebarActionActive]}
                  onPress={toggleGuidedMode}
                  accessibilityRole="switch"
                  accessibilityState={{ checked: guidedMode }}
                  accessibilityLabel="Step-by-Step Hints"
                  accessibilityHint="Toggles inline step-by-step guidance on each page"
                >
                  <Text style={[styles.dashboardSidebarActionText, guidedMode && styles.dashboardSidebarActionTextActive]}>
                    Step-by-Step Hints: {guidedMode ? 'On' : 'Off'}
                  </Text>
                </Pressable>
                <Pressable
                  style={styles.dashboardSidebarAction}
                  onPress={openSpotlightTour}
                  accessibilityRole="button"
                  accessibilityLabel="Take a spotlight tour of the home screen"
                >
                  <Text style={styles.dashboardSidebarActionText}>Spotlight Tour</Text>
                </Pressable>
                <Pressable
                  style={[styles.dashboardSidebarAction, mode === 'day' && styles.dashboardSidebarActionActive]}
                  onPress={toggleMode}
                  accessibilityRole="switch"
                  accessibilityState={{ checked: mode === 'day' }}
                  accessibilityLabel="Day and night mode"
                  accessibilityHint="Toggles between day and night view"
                >
                  <Text style={[styles.dashboardSidebarActionText, mode === 'day' && styles.dashboardSidebarActionTextActive]}>
                    Appearance: {mode === 'day' ? 'Light' : 'Dark'}
                  </Text>
                </Pressable>

                {isSuperAdmin && (
                  <Pressable
                    style={[styles.dashboardSidebarAction, tenantAccessOpen && styles.dashboardSidebarActionActive]}
                    onPress={() => setTenantAccessOpen((current) => !current)}
                    accessibilityRole="button"
                    accessibilityLabel="Tenant access"
                  >
                    <Text style={[styles.dashboardSidebarActionText, tenantAccessOpen && styles.dashboardSidebarActionTextActive]}>
                      Tenant Access {tenantAccessOpen ? '▾' : '▸'}
                    </Text>
                  </Pressable>
                )}

                <Text style={styles.dashboardSectionLabel}>Access</Text>
                {roles.map((role) => (
                  <Pressable
                    key={role.id}
                    onPress={() => setActiveRoleId(role.id)}
                    style={[styles.dashboardRoleItem, activeRole?.id === role.id && styles.dashboardRoleItemActive]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: activeRole?.id === role.id }}
                    accessibilityLabel={`Switch to ${role.name} role`}
                  >
                    <Text style={[styles.dashboardRoleItemText, activeRole?.id === role.id && styles.dashboardRoleItemTextActive]}>{role.name}</Text>
                  </Pressable>
                ))}
                  </View>
                )}
                <Pressable
                  style={styles.dashboardSidebarAction}
                  onPress={() => { auditLog.logEntry({ action: 'sign-out', entityType: 'user', entityId: currentUser?.id ?? 'user-admin', entityName: currentUser?.fullName ?? 'Admin' }); signOut(); }}
                  accessibilityRole="button"
                  accessibilityLabel="Sign out"
                >
                  <Text style={styles.dashboardSidebarActionText}>Sign Out</Text>
                </Pressable>
                <Text style={styles.dashboardUserText}>Signed in as {currentUser?.fullName ?? 'User'}</Text>
                {isSuperAdmin && <Text style={styles.dashboardUserText}>Role: Super Admin</Text>}
                <Text style={styles.dashboardUserText}>Tenant: {activeTenantName}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: typeof navigator !== 'undefined' && navigator.onLine !== false ? '#22C55E' : '#EF4444' }} />
                  <Text style={styles.dashboardUserText}>{typeof navigator !== 'undefined' && navigator.onLine !== false ? 'Online' : 'Offline'}</Text>
                </View>
              </View>
            </>
          )}
        </View>

        <View style={[styles.dashboardMainPane, compactShell && styles.dashboardMainPaneCompact, tenantBrandedMode && { backgroundColor: mode === 'day' ? withAlpha(tenantSecondaryResolved, '22') : tenantSecondaryResolved }]}>
          <View
            style={[
              styles.dashboardMainHeader,
              compactShell && styles.dashboardMainHeaderCompact,
              tenantBrandedMode && { backgroundColor: mode === 'day' ? withAlpha(tenantPrimaryResolved, '18') : tenantPrimaryResolved },
              { paddingHorizontal: shellSpace, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
            ]}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              {page === 'enduser' && activeTenantBranding.logoUri?.trim() ? (
                <Image source={{ uri: activeTenantBranding.logoUri.trim() }} style={{ width: 36, height: 36, borderRadius: 8 }} resizeMode="contain" accessibilityLabel={`${activeTenantName} logo`} />
              ) : page === 'bebo' ? (
                <Image source={beboNavIcon} style={{ width: 32, height: 32 }} resizeMode="contain" accessibilityLabel="Bebo Ai logo" />
              ) : null}
              <Text style={[styles.dashboardMainTitle, { fontSize: shellTitleSize, lineHeight: shellTitleLineHeight }, tenantBrandedMode && mode === 'day' && { color: '#2D1F4E' }]}>{mainPaneTitle}</Text>
            </View>
            <Pressable
              nativeID="tour-notifications"
              onPress={() => setNotificationsOpen(true)}
              accessibilityRole="button"
              accessibilityLabel={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: mode === 'night' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }}
            >
              <Text style={{ fontSize: 18 }}>🔔</Text>
              {unreadCount > 0 && (
                <View style={{ backgroundColor: '#EF4444', borderRadius: 9, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, marginLeft: -2, marginTop: -8 }}>
                  <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '800' }}>{unreadCount}</Text>
                </View>
              )}
            </Pressable>
          </View>

          <View style={styles.dashboardMainBody}>
            {/* ── Demo Journey Strip ── */}
            {!tenantAccessOpen && !compactShell && (
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 16,
                paddingVertical: 6,
                borderBottomWidth: 1,
                borderBottomColor: mode === 'night' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
                backgroundColor: mode === 'night' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)',
                gap: 2,
                flexWrap: 'wrap' as any,
              }}>
                <Text style={{ fontSize: 10, color: mode === 'night' ? 'rgba(255,255,255,0.36)' : 'rgba(0,0,0,0.36)', fontWeight: '600', marginRight: 8, letterSpacing: 0.5 }}>DEMO FLOW</Text>
                {DEMO_STEPS.map((step, idx) => {
                  const isCurrent = page === step.id;
                  const accent = '#8C5BF5';
                  return (
                    <React.Fragment key={step.id}>
                      {idx > 0 && (
                        <Text style={{ fontSize: 10, color: mode === 'night' ? 'rgba(255,255,255,0.20)' : 'rgba(0,0,0,0.20)', marginHorizontal: 1 }}>›</Text>
                      )}
                      <Pressable
                        onPress={() => { setTenantAccessOpen(false); setPage(step.id); }}
                        style={[
                          {
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 4,
                            paddingHorizontal: 8,
                            paddingVertical: 4,
                            borderRadius: 6,
                            borderWidth: 1,
                            borderColor: isCurrent ? `${accent}50` : 'transparent',
                            backgroundColor: isCurrent
                              ? (mode === 'night' ? `${accent}22` : `${accent}12`)
                              : 'transparent',
                          },
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel={`Go to ${step.label}`}
                        accessibilityHint={step.tip}
                      >
                        <Text style={{ fontSize: 11, color: isCurrent ? accent : (mode === 'night' ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)') }}>{step.icon}</Text>
                        <Text style={{ fontSize: 11, fontWeight: isCurrent ? '700' : '500', color: isCurrent ? accent : (mode === 'night' ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.55)') }}>{step.label}</Text>
                        {isCurrent && <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: accent, marginLeft: 1 }} />}
                      </Pressable>
                    </React.Fragment>
                  );
                })}
                <View style={{ flex: 1 }} />
                <Pressable
                  onPress={openTour}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: mode === 'night' ? 'rgba(140,91,245,0.12)' : 'rgba(140,91,245,0.08)', borderWidth: 1, borderColor: 'rgba(140,91,245,0.25)' }}
                  accessibilityRole="button"
                  accessibilityLabel="Start tour guide"
                >
                  <Text style={{ fontSize: 10, color: '#8C5BF5', fontWeight: '700' }}>🎯 Tour Guide</Text>
                </Pressable>
              </View>
            )}
            {tenantAccessOpen && isSuperAdmin ? (
              <ScrollView style={styles.pageWrap} contentContainerStyle={[styles.pageContent, styles.pageContentTight]} keyboardShouldPersistTaps="handled">
                <Text style={styles.sectionEyebrow}>Tenant Access</Text>
                <Text style={styles.sectionLeadText}>Manage tenant identity, branding, user titles, and dashboard layout controls — all from one place.</Text>
                <View style={styles.tenantWidgetGrid}>
                  <BlurView intensity={30} tint={mode === 'day' ? 'light' : 'dark'} style={styles.tenantWidgetBlur}>
                    <View style={[styles.card, styles.tenantWidgetCard]}>
                    <Text style={styles.cardTitle}>Tenant Configuration</Text>
                    <View style={styles.cardBody}>
                      <LabeledInput
                        label="Active Tenant Name"
                        value={tenantRenameValue}
                        onChangeText={setTenantRenameValue}
                        placeholder="Rename selected tenant"
                      />

                      <Text style={styles.metaText}>Available Tenants</Text>
                      <Text style={styles.metaText}>Export Format</Text>
                      <View style={styles.inlineRow}>
                        {(['cosmos', 'postgres', 'mongodb'] as PortableDatabaseTarget[]).map((target) => {
                          const selected = tenantExportTarget === target;
                          return (
                            <Pressable
                              key={`tenant-export-target-${target}`}
                              style={[styles.pill, selected && styles.pillActive]}
                              onPress={() => setTenantExportTarget(target)}
                              accessibilityRole="button"
                              accessibilityState={{ selected }}
                              accessibilityLabel={`Set export format ${target}`}
                            >
                              <Text style={[styles.pillText, selected && styles.pillTextActive]}>{target.toUpperCase()}</Text>
                            </Pressable>
                          );
                        })}
                      </View>
                      {tenants.map((tenant) => (
                        <View key={tenant.id} style={styles.listCard}>
                          <Text style={styles.listTitle}>{tenant.name}</Text>
                          <Text style={styles.metaText}>Titles configured: {tenant.branding.employeeTitles.length}</Text>
                          <View style={styles.inlineRow}>
                            <Pressable
                              style={[styles.pill, activeTenantId === tenant.id && styles.pillActive]}
                              onPress={() => handleSwitchTenant(tenant.id)}
                              accessibilityRole="button"
                              accessibilityState={{ selected: activeTenantId === tenant.id }}
                              accessibilityLabel={`Switch to ${tenant.name}`}
                            >
                              <Text style={[styles.pillText, activeTenantId === tenant.id && styles.pillTextActive]}>
                                {activeTenantId === tenant.id ? 'Active Tenant' : 'Switch to Tenant'}
                              </Text>
                            </Pressable>
                            <Pressable
                              style={styles.secondaryButton}
                              onPress={() => { void handleExportTenantDataset(tenant.id, tenant.name); }}
                              accessibilityRole="button"
                              accessibilityLabel={`Download mapped dataset for ${tenant.name}`}
                            >
                              <Text style={styles.secondaryButtonText}>Download Dataset</Text>
                            </Pressable>
                          </View>
                        </View>
                      ))}
                    </View>
                    </View>
                  </BlurView>

                  <BlurView intensity={30} tint={mode === 'day' ? 'light' : 'dark'} style={styles.tenantWidgetBlur}>
                    <View style={[styles.card, styles.tenantWidgetCard]}>
                    <Text style={styles.cardTitle}>Logo Widget</Text>
                    <View style={styles.cardBody}>
                      <LabeledInput
                        label="Tenant Logo URL"
                        value={tenantLogoUri}
                        onChangeText={setTenantLogoUri}
                        placeholder="https://your-domain.com/logo.png"
                      />
                      <Pressable
                        style={styles.secondaryButton}
                        onPress={handlePickActiveTenantLogo}
                        accessibilityRole="button"
                        accessibilityLabel="Choose or capture active tenant logo"
                      >
                        <Text style={styles.secondaryButtonText}>Choose or Capture Tenant Logo</Text>
                      </Pressable>
                      <Pressable
                        style={styles.secondaryButton}
                        onPress={handleRemoveActiveTenantLogo}
                        accessibilityRole="button"
                        accessibilityLabel="Remove active tenant logo"
                      >
                        <Text style={styles.secondaryButtonText}>Remove Logo</Text>
                      </Pressable>
                      <View style={styles.listCard}>
                        <Text style={styles.metaText}>End User Logo Preview</Text>
                        <BrandLogo width={220} height={60} logoUri={tenantLogoUri.trim() || undefined} />
                      </View>
                    </View>
                    </View>
                  </BlurView>

                  <BlurView intensity={30} tint={mode === 'day' ? 'light' : 'dark'} style={styles.tenantWidgetBlur}>
                    <View style={[styles.card, styles.tenantWidgetCard]}>
                    <Text style={styles.cardTitle}>Color Widget</Text>
                    <View style={styles.cardBody}>
                      <LabeledInput
                        label="Brand Color 1 (Sidebar)"
                        value={tenantPrimaryColor}
                        onChangeText={setTenantPrimaryColor}
                        placeholder="#120C23"
                      />
                      <LabeledInput
                        label="Brand Color 2 (Main Background)"
                        value={tenantSecondaryColor}
                        onChangeText={setTenantSecondaryColor}
                        placeholder="#1A1230"
                      />
                      <LabeledInput
                        label="Brand Color 3 (Accent)"
                        value={tenantAccentColor}
                        onChangeText={setTenantAccentColor}
                        placeholder="#8C5BF5"
                      />
                      <View style={styles.inlineRow}>
                        <View style={[styles.pill, { backgroundColor: tenantPrimaryResolved, borderColor: tenantPrimaryResolved }]}>
                          <Text style={[styles.pillText, { color: '#FFFFFF' }]}>Color 1</Text>
                        </View>
                        <View style={[styles.pill, { backgroundColor: tenantSecondaryResolved, borderColor: tenantSecondaryResolved }]}>
                          <Text style={[styles.pillText, { color: '#FFFFFF' }]}>Color 2</Text>
                        </View>
                        <View style={[styles.pill, { backgroundColor: tenantAccentResolved, borderColor: tenantAccentResolved }]}>
                          <Text style={[styles.pillText, { color: '#FFFFFF' }]}>Color 3</Text>
                        </View>
                      </View>
                    </View>
                    </View>
                  </BlurView>

                  <BlurView intensity={30} tint={mode === 'day' ? 'light' : 'dark'} style={styles.tenantWidgetBlur}>
                    <View style={[styles.card, styles.tenantWidgetCard]}>
                    <Text style={styles.cardTitle}>Titles Widget</Text>
                    <View style={styles.cardBody}>
                      <Pressable
                        style={styles.secondaryButton}
                        onPress={() => setTenantRolesExpanded((current) => !current)}
                        accessibilityRole="button"
                        accessibilityLabel="Toggle active tenant end user title options"
                      >
                        <Text style={styles.secondaryButtonText}>End User Titles {tenantRolesExpanded ? '▾' : '▸'}</Text>
                      </Pressable>
                      {tenantRolesExpanded && (
                        <View style={styles.inlineRow}>
                          {tenantTitleOptions.map((title) => {
                            const isSelected = tenantRoleTitles.some((item) => item.toLowerCase() === title.toLowerCase());
                            return (
                              <Pressable
                                key={`active-title-${title}`}
                                style={[styles.pill, isSelected && styles.pillActive]}
                                onPress={() => toggleTitleSelection(title, tenantRoleTitles, setTenantRoleTitles)}
                                accessibilityRole="button"
                                accessibilityState={{ selected: isSelected }}
                                accessibilityLabel={`Toggle ${title}`}
                              >
                                <Text style={[styles.pillText, isSelected && styles.pillTextActive]}>{title}</Text>
                              </Pressable>
                            );
                          })}
                        </View>
                      )}

                      <LabeledInput
                        label="Add Custom End User Title"
                        value={tenantCustomRoleTitle}
                        onChangeText={setTenantCustomRoleTitle}
                        placeholder="Example: Shift Lead"
                      />
                      <Pressable
                        style={styles.secondaryButton}
                        onPress={() =>
                          addCustomTitle(tenantCustomRoleTitle, tenantRoleTitles, setTenantRoleTitles, () => setTenantCustomRoleTitle(''))
                        }
                        accessibilityRole="button"
                        accessibilityLabel="Add custom end user title"
                      >
                        <Text style={styles.secondaryButtonText}>Add Title</Text>
                      </Pressable>
                    </View>
                    </View>
                  </BlurView>

                  <BlurView intensity={30} tint={mode === 'day' ? 'light' : 'dark'} style={styles.tenantWidgetBlur}>
                    <View style={[styles.card, styles.tenantWidgetCard]}>
                    <Text style={styles.cardTitle}>Create New Tenant Widget</Text>
                    <View style={styles.cardBody}>
                      <LabeledInput
                        label="New Tenant Name"
                        value={newTenantName}
                        onChangeText={setNewTenantName}
                        placeholder="Example: Tenant B"
                      />
                      <LabeledInput
                        label="New Tenant Logo URL"
                        value={newTenantLogoUri}
                        onChangeText={setNewTenantLogoUri}
                        placeholder="https://your-domain.com/logo.png"
                      />
                      <Pressable
                        style={styles.secondaryButton}
                        onPress={handlePickNewTenantLogo}
                        accessibilityRole="button"
                        accessibilityLabel="Choose or capture new tenant logo"
                      >
                        <Text style={styles.secondaryButtonText}>Choose or Capture New Tenant Logo</Text>
                      </Pressable>
                      <Pressable
                        style={styles.secondaryButton}
                        onPress={handleRemoveNewTenantLogo}
                        accessibilityRole="button"
                        accessibilityLabel="Remove new tenant logo"
                      >
                        <Text style={styles.secondaryButtonText}>Remove New Tenant Logo</Text>
                      </Pressable>

                      <LabeledInput
                        label="New Tenant Color 1"
                        value={newTenantPrimaryColor}
                        onChangeText={setNewTenantPrimaryColor}
                        placeholder="#120C23"
                      />
                      <LabeledInput
                        label="New Tenant Color 2"
                        value={newTenantSecondaryColor}
                        onChangeText={setNewTenantSecondaryColor}
                        placeholder="#1A1230"
                      />
                      <LabeledInput
                        label="New Tenant Color 3"
                        value={newTenantAccentColor}
                        onChangeText={setNewTenantAccentColor}
                        placeholder="#8C5BF5"
                      />
                      <Pressable
                        style={styles.secondaryButton}
                        onPress={() => setNewTenantRolesExpanded((current) => !current)}
                        accessibilityRole="button"
                        accessibilityLabel="Toggle new tenant end user title options"
                      >
                        <Text style={styles.secondaryButtonText}>New Tenant End User Titles {newTenantRolesExpanded ? '▾' : '▸'}</Text>
                      </Pressable>
                      {newTenantRolesExpanded && (
                        <View style={styles.inlineRow}>
                          {tenantTitleOptions.map((title) => {
                            const isSelected = newTenantRoleTitles.some((item) => item.toLowerCase() === title.toLowerCase());
                            return (
                              <Pressable
                                key={`new-title-${title}`}
                                style={[styles.pill, isSelected && styles.pillActive]}
                                onPress={() => toggleTitleSelection(title, newTenantRoleTitles, setNewTenantRoleTitles)}
                                accessibilityRole="button"
                                accessibilityState={{ selected: isSelected }}
                                accessibilityLabel={`Toggle ${title}`}
                              >
                                <Text style={[styles.pillText, isSelected && styles.pillTextActive]}>{title}</Text>
                              </Pressable>
                            );
                          })}
                        </View>
                      )}

                      <LabeledInput
                        label="Add Custom Title For New Tenant"
                        value={newTenantCustomRoleTitle}
                        onChangeText={setNewTenantCustomRoleTitle}
                        placeholder="Example: Team Captain"
                      />
                      <Pressable
                        style={styles.secondaryButton}
                        onPress={() =>
                          addCustomTitle(newTenantCustomRoleTitle, newTenantRoleTitles, setNewTenantRoleTitles, () =>
                            setNewTenantCustomRoleTitle(''),
                          )
                        }
                        accessibilityRole="button"
                        accessibilityLabel="Add custom title for new tenant"
                      >
                        <Text style={styles.secondaryButtonText}>Add New Tenant Title</Text>
                      </Pressable>

                    </View>
                    </View>
                  </BlurView>
                </View>

              </ScrollView>
            ) : (
              <>
                {page === 'architecture' && <ArchitecturePage guidedMode={guidedMode} onGuide={openGuide} />}
                {page === 'admin' && <AdminPage guidedMode={guidedMode} onGuide={openGuide} registerActions={registerModuleActions} auditLog={auditLog} addNotification={addNotification} />}
                {page === 'enduser' && (
                  <EndUserPage
                    guidedMode={guidedMode}
                    onGuide={openGuide}
                    addNotification={addNotification}
                    auditLog={auditLog}
                    accentPalette={{
                      primary: tenantPrimaryResolved,
                      secondary: tenantSecondaryResolved,
                      accent: tenantAccentResolved,
                    }}
                  />
                )}
                {page === 'signal' && <SignalStudioPage guidedMode={guidedMode} onGuide={openGuide} registerActions={registerModuleActions} auditLog={auditLog} addNotification={addNotification} />}
                {page === 'orbital' && <OrbitalPage guidedMode={guidedMode} onGuide={openGuide} registerActions={registerModuleActions} auditLog={auditLog} addNotification={addNotification} />}
                {page === 'bebo' && <BeboPage guidedMode={guidedMode} onGuide={openGuide} />}
                {page === 'cosmograph' && <CosmographPage guidedMode={guidedMode} onGuide={openGuide} registerActions={registerModuleActions} auditLog={auditLog} addNotification={addNotification} />}
                {page === 'financial' && <FinancialPage guidedMode={guidedMode} onGuide={openGuide} registerActions={registerModuleActions} auditLog={auditLog} addNotification={addNotification} />}
                {page === 'ingestion' && <IngestionPage guidedMode={guidedMode} onGuide={openGuide} registerActions={registerModuleActions} auditLog={auditLog} addNotification={addNotification} />}
              </>
            )}
          </View>

          <View style={[styles.dashboardBottomActionBar, endUserFooterBarStyle, compactShell && styles.dashboardMainActionsCompact]}>
            <View style={[styles.dashboardBottomActionContent, compactShell && styles.dashboardBottomActionContentCompact]}>
              <View style={styles.dashboardBottomStatusWrap}>
                <Text style={[styles.dashboardBottomStatusText, endUserFooterStatusTextStyle]} numberOfLines={2}>
                  {bottomActionStatus}
                </Text>
                {!!bottomActionStatus && (
                  <Image
                    source={require('../../assets/checkmarklogo.png')}
                    style={styles.dashboardBottomStatusIcon}
                    accessibilityRole="image"
                    accessibilityLabel="Save status check"
                  />
                )}
              </View>
              <View style={styles.dashboardMainActions}>
              <Pressable
                style={[styles.dashboardHeaderButton, endUserFooterSecondaryButtonStyle, !moduleActionEnabled && styles.buttonDisabled]}
                onPress={() => {
                  if (!moduleActionEnabled) {
                    return;
                  }
                  void runModuleAction('saveDraft');
                }}
              >
                <Text style={[styles.dashboardHeaderButtonText, endUserFooterButtonTextStyle]}>{saveDraftLabel}</Text>
              </Pressable>
              <Pressable
                style={[styles.dashboardHeaderPrimaryButton, endUserFooterPrimaryButtonStyle, !moduleActionEnabled && styles.buttonDisabled]}
                onPress={() => {
                  if (!moduleActionEnabled) {
                    return;
                  }
                  void runModuleAction('publish');
                }}
              >
                <Text style={[styles.dashboardHeaderPrimaryButtonText, endUserFooterButtonTextStyle]}>{publishLabel}</Text>
              </Pressable>
              </View>
            </View>
          </View>
        </View>
      </ShellWrapper>

      <GuideModal step={activeGuide} onClose={closeGuide} />
      <CommandPalette visible={commandPaletteOpen} onClose={() => setCommandPaletteOpen(false)} commands={commands} />
      <NotificationCenter
        visible={notificationsOpen}
        notifications={notifications}
        onClose={() => setNotificationsOpen(false)}
        onMarkRead={markRead}
        onClearAll={clearAllNotifications}
      />
      <ToastContainer />
    </View>
  );
}
