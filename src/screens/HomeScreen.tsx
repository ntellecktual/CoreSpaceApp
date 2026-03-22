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
import { WorkflowChainsPage } from './home/WorkflowChainsPage';
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

const NAV_ICONS: Record<string, string> = {
  bebo: '✦',
  admin: '◈',
  signal: '⚡',
  orbital: '🔗',
  cosmograph: '⬡',
  financial: '💰',
  ingestion: '📥',
  workflow: '⛓',
  enduser: '▣',
  architecture: '📄',
};

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

// ── Tenant Customization Options ─────────────────────────────────────
const INDUSTRY_OPTIONS = ['Healthcare', 'Finance', 'Logistics', 'Technology', 'Manufacturing', 'Legal', 'Education', 'Government', 'Retail', 'Energy'];
const FONT_OPTIONS = ['System Default', 'Inter', 'Roboto', 'Poppins', 'Monospace'];
const HEADING_WEIGHT_OPTIONS = [{ label: 'Bold', value: '700' }, { label: 'Extra Bold', value: '800' }, { label: 'Black', value: '900' }];
const RADIUS_OPTIONS = [{ label: 'Sharp', value: 'sharp' }, { label: 'Rounded', value: 'rounded' }, { label: 'Pill', value: 'pill' }];
const DENSITY_OPTIONS = [{ label: 'Compact', value: 'compact' }, { label: 'Comfortable', value: 'comfortable' }, { label: 'Spacious', value: 'spacious' }];
const SIDEBAR_STYLE_OPTIONS = [{ label: 'Solid', value: 'solid' }, { label: 'Glass', value: 'glass' }, { label: 'Gradient', value: 'gradient' }];
const CARD_STYLE_OPTIONS = [{ label: 'Flat', value: 'flat' }, { label: 'Elevated', value: 'elevated' }, { label: 'Glass', value: 'glass' }, { label: 'Outlined', value: 'outlined' }];
const LAYOUT_OPTIONS = [{ label: 'Grid', value: 'grid' }, { label: 'List', value: 'list' }, { label: 'Magazine', value: 'magazine' }];
const THEME_MODE_OPTIONS = [{ label: 'Night', value: 'night' }, { label: 'Day', value: 'day' }, { label: 'Auto', value: 'auto' }];
const DATE_FORMAT_OPTIONS = ['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD'];
const CURRENCY_OPTIONS = ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF'];
const TIMEZONE_OPTIONS = ['UTC', 'US/Eastern', 'US/Central', 'US/Mountain', 'US/Pacific', 'Europe/London', 'Europe/Berlin', 'Asia/Tokyo', 'Asia/Shanghai', 'Australia/Sydney'];

const PALETTE_PRESETS = [
  { name: 'Cosmic Purple', colors: ['#120C23', '#1A1230', '#8C5BF5', '#A78BFA', '#22C55E', '#F59E0B', '#EF4444', '#1E1535'] as const },
  { name: 'Ocean Blue', colors: ['#0A1628', '#0F1D32', '#3B82F6', '#60A5FA', '#10B981', '#F59E0B', '#EF4444', '#152238'] as const },
  { name: 'Forest Green', colors: ['#0A1A0F', '#0F261A', '#22C55E', '#4ADE80', '#3B82F6', '#F59E0B', '#EF4444', '#0D1F14'] as const },
  { name: 'Sunset Coral', colors: ['#1A0E14', '#261420', '#F43F5E', '#FB7185', '#8B5CF6', '#F59E0B', '#EF4444', '#1F1018'] as const },
  { name: 'Golden Finance', colors: ['#1A1608', '#26200C', '#D97706', '#FBBF24', '#3B82F6', '#22C55E', '#EF4444', '#1F1A0A'] as const },
  { name: 'Midnight Slate', colors: ['#0F0F14', '#181B22', '#6366F1', '#818CF8', '#22C55E', '#F59E0B', '#EF4444', '#141620'] as const },
  { name: 'Rose Healthcare', colors: ['#18090E', '#221018', '#DB2777', '#F472B6', '#14B8A6', '#F59E0B', '#EF4444', '#1D0C12'] as const },
  { name: 'Emerald Enterprise', colors: ['#091A14', '#0C2620', '#059669', '#34D399', '#8B5CF6', '#F59E0B', '#F43F5E', '#0B1F18'] as const },
  { name: 'Legal Navy & Gold', colors: ['#0F1C5C', '#162269', '#C9A84C', '#E8C96A', '#2ECC71', '#E8A838', '#E74C3C', '#141E5C'] as const },
];

type TenantTabId = 'brand' | 'colors' | 'typography' | 'layout' | 'dashboard' | 'business' | 'team' | 'manage' | 'create';
const TENANT_TABS: Array<{ id: TenantTabId; label: string; icon: string }> = [
  { id: 'brand', label: 'Brand', icon: '🏢' },
  { id: 'colors', label: 'Colors', icon: '🎨' },
  { id: 'typography', label: 'Typography', icon: '✏️' },
  { id: 'layout', label: 'Layout', icon: '📐' },
  { id: 'dashboard', label: 'Dashboard', icon: '🖥️' },
  { id: 'business', label: 'Business', icon: '💼' },
  { id: 'team', label: 'Team', icon: '👥' },
  { id: 'manage', label: 'Manage', icon: '⚙️' },
  { id: 'create', label: 'Create', icon: '➕' },
];

const DEFAULT_TENANT_EXTRAS = {
  tagline: '', industryVertical: '', accentSecondary: '#A78BFA', successColor: '#22C55E',
  warningColor: '#F59E0B', dangerColor: '#EF4444', surfaceColor: '#1E1535', fontFamily: 'System Default',
  headingWeight: '800', baseFontSize: 13, borderRadius: 'rounded', uiDensity: 'comfortable',
  sidebarStyle: 'glass', cardStyle: 'elevated', welcomeMessage: '', heroImageUri: '',
  dashboardLayout: 'grid', defaultThemeMode: 'night', animationsEnabled: true, departments: [] as string[],
  timezone: 'UTC', dateFormat: 'MM/DD/YYYY', currencyCode: 'USD',
};

function extractExtras(branding: any) {
  return {
    tagline: branding?.tagline ?? '',
    industryVertical: branding?.industryVertical ?? '',
    accentSecondary: branding?.accentSecondary ?? '#A78BFA',
    successColor: branding?.successColor ?? '#22C55E',
    warningColor: branding?.warningColor ?? '#F59E0B',
    dangerColor: branding?.dangerColor ?? '#EF4444',
    surfaceColor: branding?.surfaceColor ?? '#1E1535',
    fontFamily: branding?.fontFamily ?? 'System Default',
    headingWeight: branding?.headingWeight ?? '800',
    baseFontSize: branding?.baseFontSize ?? 13,
    borderRadius: branding?.borderRadius ?? 'rounded',
    uiDensity: branding?.uiDensity ?? 'comfortable',
    sidebarStyle: branding?.sidebarStyle ?? 'glass',
    cardStyle: branding?.cardStyle ?? 'elevated',
    welcomeMessage: branding?.welcomeMessage ?? '',
    heroImageUri: branding?.heroImageUri ?? '',
    dashboardLayout: branding?.dashboardLayout ?? 'grid',
    defaultThemeMode: branding?.defaultThemeMode ?? 'night',
    animationsEnabled: branding?.animationsEnabled ?? true,
    departments: branding?.departments ?? [],
    timezone: branding?.timezone ?? 'UTC',
    dateFormat: branding?.dateFormat ?? 'MM/DD/YYYY',
    currencyCode: branding?.currencyCode ?? 'USD',
  };
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
  const [tenantTab, setTenantTab] = useState<TenantTabId>('brand');
  const [tenantExtras, setTenantExtras] = useState(() => extractExtras(activeTenantBranding));
  const [newTenantExtras, setNewTenantExtras] = useState({ ...DEFAULT_TENANT_EXTRAS });
  const [tenantDeptInput, setTenantDeptInput] = useState('');
  const [newTenantDeptInput, setNewTenantDeptInput] = useState('');
  const updateExtra = (key: string, value: any) => setTenantExtras((prev: any) => ({ ...prev, [key]: value }));
  const updateNewExtra = (key: string, value: any) => setNewTenantExtras((prev: any) => ({ ...prev, [key]: value }));
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
  const tenantBrandedMode = !tenantAccessOpen;
  const moduleActionEnabled = (tenantAccessOpen && isSuperAdmin) || (!tenantAccessOpen && (page === 'admin' || page === 'signal' || page === 'orbital' || page === 'bebo' || page === 'cosmograph' || page === 'financial' || page === 'ingestion' || page === 'workflow'));
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
    setTenantExtras(extractExtras(activeTenantBranding));
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
    tenantExtras,
    newTenantExtras,
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
      tagline: tenantExtras.tagline || undefined,
      industryVertical: tenantExtras.industryVertical || undefined,
      accentSecondary: tenantExtras.accentSecondary,
      successColor: tenantExtras.successColor,
      warningColor: tenantExtras.warningColor,
      dangerColor: tenantExtras.dangerColor,
      surfaceColor: tenantExtras.surfaceColor,
      fontFamily: tenantExtras.fontFamily,
      headingWeight: tenantExtras.headingWeight,
      baseFontSize: tenantExtras.baseFontSize,
      borderRadius: tenantExtras.borderRadius,
      uiDensity: tenantExtras.uiDensity,
      sidebarStyle: tenantExtras.sidebarStyle,
      cardStyle: tenantExtras.cardStyle,
      welcomeMessage: tenantExtras.welcomeMessage || undefined,
      heroImageUri: tenantExtras.heroImageUri || undefined,
      dashboardLayout: tenantExtras.dashboardLayout,
      defaultThemeMode: tenantExtras.defaultThemeMode,
      animationsEnabled: tenantExtras.animationsEnabled,
      departments: tenantExtras.departments,
      timezone: tenantExtras.timezone,
      dateFormat: tenantExtras.dateFormat,
      currencyCode: tenantExtras.currencyCode,
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
        tagline: newTenantExtras.tagline || undefined,
        industryVertical: newTenantExtras.industryVertical || undefined,
        accentSecondary: newTenantExtras.accentSecondary,
        successColor: newTenantExtras.successColor,
        warningColor: newTenantExtras.warningColor,
        dangerColor: newTenantExtras.dangerColor,
        surfaceColor: newTenantExtras.surfaceColor,
        fontFamily: newTenantExtras.fontFamily,
        headingWeight: newTenantExtras.headingWeight,
        baseFontSize: newTenantExtras.baseFontSize,
        borderRadius: newTenantExtras.borderRadius,
        uiDensity: newTenantExtras.uiDensity,
        sidebarStyle: newTenantExtras.sidebarStyle,
        cardStyle: newTenantExtras.cardStyle,
        welcomeMessage: newTenantExtras.welcomeMessage || undefined,
        heroImageUri: newTenantExtras.heroImageUri || undefined,
        dashboardLayout: newTenantExtras.dashboardLayout,
        defaultThemeMode: newTenantExtras.defaultThemeMode,
        animationsEnabled: newTenantExtras.animationsEnabled,
        departments: newTenantExtras.departments,
        timezone: newTenantExtras.timezone,
        dateFormat: newTenantExtras.dateFormat,
        currencyCode: newTenantExtras.currencyCode,
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
      setNewTenantExtras({ ...DEFAULT_TENANT_EXTRAS });
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
            <View style={styles.dashboardBrandTopRow}>
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
                {isSidebarCollapsed ? (
                  <Image
                    source={require('../../assets/hamburger.png')}
                    style={{ width: 26, height: 26, borderRadius: 6, resizeMode: 'contain' } as any}
                    accessibilityRole="image"
                    accessibilityLabel="Expand sidebar"
                  />
                ) : (
                  <Text style={styles.dashboardHamburgerButtonText}>☰</Text>
                )}
              </Pressable>

              {!isSidebarCollapsed && (
                <BrandLogo
                  width={180}
                  height={52}
                  logoUri={tenantBrandedMode ? tenantLogoUri : undefined}
                />
              )}
            </View>
          </View>

          {/* ── Tenant selector — always above nav, shown in both states ── */}
          {isSuperAdmin && !isSidebarCollapsed && (
            <View style={styles.dashboardTenantNavGroup}>
              <Pressable
                nativeID="tour-nav-enduser"
                onPress={() => {
                  setTenantAccessOpen(false);
                  setPage('enduser');
                  setEndUserTenantMenuOpen((current) => !current);
                }}
                style={[
                  styles.dashboardTenantPill,
                  page === 'enduser' && styles.dashboardTenantPillActive,
                  tenantBrandedMode && page === 'enduser' && { backgroundColor: tenantAccentResolved },
                ]}
                accessibilityRole="button"
                accessibilityState={{ expanded: endUserTenantMenuOpen, selected: page === 'enduser' }}
                accessibilityLabel="End user tenant selector"
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={{ fontSize: 11, color: page === 'enduser' ? '#FFFFFF' : 'rgba(214,204,235,0.70)' }}>▣</Text>
                  <Text style={[styles.dashboardTenantPillText, page === 'enduser' && { color: '#FFFFFF', fontWeight: '700' }, tenantBrandedMode && page === 'enduser' && { color: tenantAccentTextColor }]} numberOfLines={1}>
                    {activeTenantName}
                  </Text>
                  <Text style={[{ fontSize: 10, color: '#F3EAFF', marginLeft: 'auto', fontWeight: '800' }, tenantBrandedMode && page === 'enduser' && { color: tenantAccentTextColor }]}>
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
                        onPress={() => { setTenantAccessOpen(false); handleSwitchTenant(tenant.id); setPage('enduser'); }}
                        style={[styles.dashboardTenantNavItem, selectedTenant && styles.dashboardTenantNavItemActive, selectedTenant && { backgroundColor: tenantAccent, borderColor: tenantAccent }]}
                        accessibilityRole="button"
                        accessibilityState={{ selected: selectedTenant }}
                        accessibilityLabel={`Open ${tenant.name} end user view`}
                      >
                        <Text style={[styles.dashboardTenantNavItemText, selectedTenant && { color: tenantAccentText }]}>{tenant.name}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </View>
          )}

          {/* ── Non-super-admin tenant pill ── */}
          {!isSuperAdmin && !isSidebarCollapsed && (
            <Pressable
              nativeID="tour-nav-enduser"
              onPress={() => { setTenantAccessOpen(false); setPage('enduser'); }}
              style={[styles.dashboardTenantPill, page === 'enduser' && styles.dashboardTenantPillActive, tenantBrandedMode && page === 'enduser' && { backgroundColor: tenantAccentResolved }]}
              accessibilityRole="button"
              accessibilityState={{ selected: page === 'enduser' }}
              accessibilityLabel="End User page"
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ fontSize: 11, color: page === 'enduser' ? '#FFFFFF' : 'rgba(214,204,235,0.70)' }}>▣</Text>
                <Text style={[styles.dashboardTenantPillText, page === 'enduser' && { color: '#FFFFFF', fontWeight: '700' }, tenantBrandedMode && page === 'enduser' && { color: tenantAccentTextColor }]}>End User</Text>
              </View>
            </Pressable>
          )}

          {/* ── Collapsed: tenant icon only ── */}
          {isSidebarCollapsed && (
            <Pressable
              onPress={() => { setTenantAccessOpen(false); setPage('enduser'); setSidebarCollapsed(false); }}
              style={[styles.dashboardCollapsedNavItem, page === 'enduser' && styles.dashboardCollapsedNavItemActive, tenantBrandedMode && page === 'enduser' && { backgroundColor: tenantAccentResolved }]}
              accessibilityRole="button"
              accessibilityLabel="End User"
            >
              <Text style={{ fontSize: 18, color: mode === 'day' ? '#2F2249' : 'rgba(214,204,235,0.85)' }}>▣</Text>
            </Pressable>
          )}

          {/* ── Nav items (app components) ── */}
          {!isSidebarCollapsed ? (
            <>
              <View style={styles.dashboardNavDivider} />
              <View style={styles.dashboardNavSection} nativeID="tour-nav-panel">
                {pages.map((item) => {
                  if (item.id === 'enduser') return null; // handled above
                  const isActive = page === item.id;
                  return (
                    <Pressable
                      key={item.id}
                      nativeID={`tour-nav-${item.id}`}
                      onPress={() => { setTenantAccessOpen(false); setPage(item.id); }}
                      style={[styles.dashboardNavItem, isActive && styles.dashboardNavItemActive]}
                      accessibilityRole="button"
                      accessibilityState={{ selected: isActive }}
                      accessibilityLabel={`${item.label} page`}
                    >
                      <View style={styles.dashboardNavItemRow}>
                        <Text style={styles.dashboardNavIcon}>{NAV_ICONS[item.id] ?? '•'}</Text>
                        <Text style={[styles.dashboardNavItemText, isActive && styles.dashboardNavItemTextActive]}>
                          {item.id === 'admin' ? 'Workspace' : item.label}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
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
          ) : (
            <View style={styles.dashboardCollapsedNavSection}>
              {pages.map((item) => {
                if (item.id === 'enduser') return null;
                const isActive = page === item.id;
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => { setTenantAccessOpen(false); setPage(item.id); setSidebarCollapsed(false); }}
                    style={[styles.dashboardCollapsedNavItem, isActive && styles.dashboardCollapsedNavItemActive]}
                    accessibilityRole="button"
                    accessibilityLabel={item.label}
                  >
                    <Text style={{ fontSize: 18, color: mode === 'day' ? '#2F2249' : 'rgba(214,204,235,0.85)' }}>{NAV_ICONS[item.id] ?? '•'}</Text>
                  </Pressable>
                );
              })}
            </View>
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
              <Text style={{ fontSize: 18, color: mode === 'day' ? '#2F2249' : 'rgba(214,204,235,0.85)' }}>🔔</Text>
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
                <Text style={styles.sectionLeadText}>Full-spectrum tenant theming — brand identity, color palettes, typography, layout, dashboard, business profile, team roles, and tenant lifecycle.</Text>

                {/* ── Tab Navigation ──────────────────────────────────── */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16, flexGrow: 0 }} contentContainerStyle={{ gap: 4, paddingVertical: 2 }}>
                  {TENANT_TABS.map((tab) => {
                    const active = tenantTab === tab.id;
                    return (
                      <Pressable key={tab.id} onPress={() => setTenantTab(tab.id)} style={[styles.pill, active && styles.pillActive, { paddingHorizontal: 14, paddingVertical: 8 }]} accessibilityRole="tab" accessibilityState={{ selected: active }} accessibilityLabel={`${tab.label} tab`}>
                        <Text style={[styles.pillText, active && styles.pillTextActive]}>{tab.icon} {tab.label}</Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>

                {/* ── Brand Tab ──────────────────────────────────── */}
                {tenantTab === 'brand' && (
                  <View style={styles.tenantWidgetGrid}>
                    <BlurView intensity={30} tint={mode === 'day' ? 'light' : 'dark'} style={styles.tenantWidgetBlur}>
                      <View style={[styles.card, styles.tenantWidgetCard]}>
                        <Text style={styles.cardTitle}>Logo & Identity</Text>
                        <View style={styles.cardBody}>
                          <LabeledInput label="Tenant Logo URL" value={tenantLogoUri} onChangeText={setTenantLogoUri} placeholder="https://your-domain.com/logo.png" />
                          <View style={styles.inlineRow}>
                            <Pressable style={styles.secondaryButton} onPress={handlePickActiveTenantLogo} accessibilityRole="button" accessibilityLabel="Upload tenant logo">
                              <Text style={styles.secondaryButtonText}>Upload Logo</Text>
                            </Pressable>
                            <Pressable style={styles.secondaryButton} onPress={handleRemoveActiveTenantLogo} accessibilityRole="button" accessibilityLabel="Remove tenant logo">
                              <Text style={styles.secondaryButtonText}>Remove Logo</Text>
                            </Pressable>
                          </View>
                          {tenantLogoUri.trim() ? (
                            <View style={styles.listCard}>
                              <Text style={styles.metaText}>Logo Preview</Text>
                              <BrandLogo width={220} height={60} logoUri={tenantLogoUri.trim()} />
                            </View>
                          ) : null}
                        </View>
                      </View>
                    </BlurView>
                    <BlurView intensity={30} tint={mode === 'day' ? 'light' : 'dark'} style={styles.tenantWidgetBlur}>
                      <View style={[styles.card, styles.tenantWidgetCard]}>
                        <Text style={styles.cardTitle}>Tagline & Industry</Text>
                        <View style={styles.cardBody}>
                          <LabeledInput label="Company Tagline" value={tenantExtras.tagline} onChangeText={(v: string) => updateExtra('tagline', v)} placeholder="Your company motto or slogan" />
                          <Text style={styles.metaText}>Industry Vertical</Text>
                          <View style={styles.inlineRow}>
                            {INDUSTRY_OPTIONS.map((ind) => {
                              const sel = tenantExtras.industryVertical === ind;
                              return (
                                <Pressable key={ind} style={[styles.pill, sel && styles.pillActive]} onPress={() => updateExtra('industryVertical', ind)} accessibilityRole="button" accessibilityState={{ selected: sel }}>
                                  <Text style={[styles.pillText, sel && styles.pillTextActive]}>{ind}</Text>
                                </Pressable>
                              );
                            })}
                          </View>
                        </View>
                      </View>
                    </BlurView>
                  </View>
                )}

                {/* ── Colors Tab ──────────────────────────────────── */}
                {tenantTab === 'colors' && (
                  <View style={styles.tenantWidgetGrid}>
                    <BlurView intensity={30} tint={mode === 'day' ? 'light' : 'dark'} style={styles.tenantWidgetBlur}>
                      <View style={[styles.card, styles.tenantWidgetCard]}>
                        <Text style={styles.cardTitle}>Color Palette</Text>
                        <View style={styles.cardBody}>
                          <LabeledInput label="Sidebar (Primary)" value={tenantPrimaryColor} onChangeText={setTenantPrimaryColor} placeholder="#120C23" />
                          <LabeledInput label="Background (Secondary)" value={tenantSecondaryColor} onChangeText={setTenantSecondaryColor} placeholder="#1A1230" />
                          <LabeledInput label="Accent" value={tenantAccentColor} onChangeText={setTenantAccentColor} placeholder="#8C5BF5" />
                          <LabeledInput label="Accent Secondary" value={tenantExtras.accentSecondary} onChangeText={(v: string) => updateExtra('accentSecondary', v)} placeholder="#A78BFA" />
                          <LabeledInput label="Success" value={tenantExtras.successColor} onChangeText={(v: string) => updateExtra('successColor', v)} placeholder="#22C55E" />
                          <LabeledInput label="Warning" value={tenantExtras.warningColor} onChangeText={(v: string) => updateExtra('warningColor', v)} placeholder="#F59E0B" />
                          <LabeledInput label="Danger" value={tenantExtras.dangerColor} onChangeText={(v: string) => updateExtra('dangerColor', v)} placeholder="#EF4444" />
                          <LabeledInput label="Surface" value={tenantExtras.surfaceColor} onChangeText={(v: string) => updateExtra('surfaceColor', v)} placeholder="#1E1535" />
                          <View style={[styles.inlineRow, { marginTop: 8 }]}>
                            {[
                              { label: 'Pri', hex: tenantPrimaryResolved },
                              { label: 'Sec', hex: tenantSecondaryResolved },
                              { label: 'Acc', hex: tenantAccentResolved },
                              { label: 'Acc2', hex: normalizeHex(tenantExtras.accentSecondary, '#A78BFA') },
                              { label: 'Ok', hex: normalizeHex(tenantExtras.successColor, '#22C55E') },
                              { label: 'Wrn', hex: normalizeHex(tenantExtras.warningColor, '#F59E0B') },
                              { label: 'Err', hex: normalizeHex(tenantExtras.dangerColor, '#EF4444') },
                              { label: 'Srf', hex: normalizeHex(tenantExtras.surfaceColor, '#1E1535') },
                            ].map((swatch) => (
                              <View key={swatch.label} style={{ alignItems: 'center', gap: 3 }}>
                                <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: swatch.hex, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' }} />
                                <Text style={[styles.metaText, { fontSize: 9 }]}>{swatch.label}</Text>
                              </View>
                            ))}
                          </View>
                        </View>
                      </View>
                    </BlurView>
                    <BlurView intensity={30} tint={mode === 'day' ? 'light' : 'dark'} style={styles.tenantWidgetBlur}>
                      <View style={[styles.card, styles.tenantWidgetCard]}>
                        <Text style={styles.cardTitle}>Palette Presets</Text>
                        <View style={styles.cardBody}>
                          <Text style={styles.metaText}>One-click color schemes — instantly transform your tenant's look.</Text>
                          {PALETTE_PRESETS.map((preset) => (
                            <Pressable
                              key={preset.name}
                              style={[styles.listCard, { flexDirection: 'row', alignItems: 'center', gap: 10 }]}
                              onPress={() => {
                                const [p, s, a, a2, suc, wrn, dan, sur] = preset.colors;
                                setTenantPrimaryColor(p);
                                setTenantSecondaryColor(s);
                                setTenantAccentColor(a);
                                updateExtra('accentSecondary', a2);
                                updateExtra('successColor', suc);
                                updateExtra('warningColor', wrn);
                                updateExtra('dangerColor', dan);
                                updateExtra('surfaceColor', sur);
                                setTenantNotice(`Applied "${preset.name}" palette.`);
                              }}
                              accessibilityRole="button"
                              accessibilityLabel={`Apply ${preset.name} palette`}
                            >
                              <View style={{ flexDirection: 'row', gap: 3 }}>
                                {preset.colors.map((c, i) => (
                                  <View key={i} style={{ width: 18, height: 18, borderRadius: 4, backgroundColor: c, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' }} />
                                ))}
                              </View>
                              <Text style={styles.listTitle}>{preset.name}</Text>
                            </Pressable>
                          ))}
                        </View>
                      </View>
                    </BlurView>
                  </View>
                )}

                {/* ── Typography Tab ──────────────────────────────── */}
                {tenantTab === 'typography' && (
                  <View style={styles.tenantWidgetGrid}>
                    <BlurView intensity={30} tint={mode === 'day' ? 'light' : 'dark'} style={styles.tenantWidgetBlur}>
                      <View style={[styles.card, styles.tenantWidgetCard]}>
                        <Text style={styles.cardTitle}>Typography</Text>
                        <View style={styles.cardBody}>
                          <Text style={styles.metaText}>Font Family</Text>
                          <View style={styles.inlineRow}>
                            {FONT_OPTIONS.map((font) => {
                              const sel = tenantExtras.fontFamily === font;
                              return (
                                <Pressable key={font} style={[styles.pill, sel && styles.pillActive]} onPress={() => updateExtra('fontFamily', font)} accessibilityRole="button" accessibilityState={{ selected: sel }}>
                                  <Text style={[styles.pillText, sel && styles.pillTextActive]}>{font}</Text>
                                </Pressable>
                              );
                            })}
                          </View>
                          <Text style={styles.metaText}>Heading Weight</Text>
                          <View style={styles.inlineRow}>
                            {HEADING_WEIGHT_OPTIONS.map((opt) => {
                              const sel = tenantExtras.headingWeight === opt.value;
                              return (
                                <Pressable key={opt.value} style={[styles.pill, sel && styles.pillActive]} onPress={() => updateExtra('headingWeight', opt.value)} accessibilityRole="button" accessibilityState={{ selected: sel }}>
                                  <Text style={[styles.pillText, sel && styles.pillTextActive]}>{opt.label}</Text>
                                </Pressable>
                              );
                            })}
                          </View>
                          <Text style={styles.metaText}>Base Font Size</Text>
                          <View style={styles.inlineRow}>
                            {[11, 12, 13, 14, 15, 16].map((size) => {
                              const sel = tenantExtras.baseFontSize === size;
                              return (
                                <Pressable key={size} style={[styles.pill, sel && styles.pillActive]} onPress={() => updateExtra('baseFontSize', size)} accessibilityRole="button" accessibilityState={{ selected: sel }}>
                                  <Text style={[styles.pillText, sel && styles.pillTextActive]}>{size}px</Text>
                                </Pressable>
                              );
                            })}
                          </View>
                          <View style={[styles.listCard, { marginTop: 8 }]}>
                            <Text style={[styles.metaText, { fontSize: 10 }]}>Preview</Text>
                            <Text style={{ fontWeight: tenantExtras.headingWeight as any, fontSize: tenantExtras.baseFontSize + 6, color: mode === 'night' ? '#FFFFFF' : '#1A1A2E' }}>Heading Sample</Text>
                            <Text style={{ fontSize: tenantExtras.baseFontSize, color: mode === 'night' ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)', marginTop: 4 }}>Body text preview with {tenantExtras.baseFontSize}px base font size and {tenantExtras.fontFamily} font family.</Text>
                          </View>
                        </View>
                      </View>
                    </BlurView>
                  </View>
                )}

                {/* ── Layout Tab ──────────────────────────────────── */}
                {tenantTab === 'layout' && (
                  <View style={styles.tenantWidgetGrid}>
                    <BlurView intensity={30} tint={mode === 'day' ? 'light' : 'dark'} style={styles.tenantWidgetBlur}>
                      <View style={[styles.card, styles.tenantWidgetCard]}>
                        <Text style={styles.cardTitle}>Shape & Layout</Text>
                        <View style={styles.cardBody}>
                          <Text style={styles.metaText}>Border Radius</Text>
                          <View style={styles.inlineRow}>
                            {RADIUS_OPTIONS.map((opt) => {
                              const sel = tenantExtras.borderRadius === opt.value;
                              return (
                                <Pressable key={opt.value} style={[styles.pill, sel && styles.pillActive]} onPress={() => updateExtra('borderRadius', opt.value)} accessibilityRole="button" accessibilityState={{ selected: sel }}>
                                  <Text style={[styles.pillText, sel && styles.pillTextActive]}>{opt.label}</Text>
                                </Pressable>
                              );
                            })}
                          </View>
                          <Text style={styles.metaText}>UI Density</Text>
                          <View style={styles.inlineRow}>
                            {DENSITY_OPTIONS.map((opt) => {
                              const sel = tenantExtras.uiDensity === opt.value;
                              return (
                                <Pressable key={opt.value} style={[styles.pill, sel && styles.pillActive]} onPress={() => updateExtra('uiDensity', opt.value)} accessibilityRole="button" accessibilityState={{ selected: sel }}>
                                  <Text style={[styles.pillText, sel && styles.pillTextActive]}>{opt.label}</Text>
                                </Pressable>
                              );
                            })}
                          </View>
                          <Text style={styles.metaText}>Sidebar Style</Text>
                          <View style={styles.inlineRow}>
                            {SIDEBAR_STYLE_OPTIONS.map((opt) => {
                              const sel = tenantExtras.sidebarStyle === opt.value;
                              return (
                                <Pressable key={opt.value} style={[styles.pill, sel && styles.pillActive]} onPress={() => updateExtra('sidebarStyle', opt.value)} accessibilityRole="button" accessibilityState={{ selected: sel }}>
                                  <Text style={[styles.pillText, sel && styles.pillTextActive]}>{opt.label}</Text>
                                </Pressable>
                              );
                            })}
                          </View>
                          <Text style={styles.metaText}>Card Style</Text>
                          <View style={styles.inlineRow}>
                            {CARD_STYLE_OPTIONS.map((opt) => {
                              const sel = tenantExtras.cardStyle === opt.value;
                              return (
                                <Pressable key={opt.value} style={[styles.pill, sel && styles.pillActive]} onPress={() => updateExtra('cardStyle', opt.value)} accessibilityRole="button" accessibilityState={{ selected: sel }}>
                                  <Text style={[styles.pillText, sel && styles.pillTextActive]}>{opt.label}</Text>
                                </Pressable>
                              );
                            })}
                          </View>
                        </View>
                      </View>
                    </BlurView>
                  </View>
                )}

                {/* ── Dashboard Tab ──────────────────────────────── */}
                {tenantTab === 'dashboard' && (
                  <View style={styles.tenantWidgetGrid}>
                    <BlurView intensity={30} tint={mode === 'day' ? 'light' : 'dark'} style={styles.tenantWidgetBlur}>
                      <View style={[styles.card, styles.tenantWidgetCard]}>
                        <Text style={styles.cardTitle}>Dashboard Experience</Text>
                        <View style={styles.cardBody}>
                          <LabeledInput label="Welcome Message" value={tenantExtras.welcomeMessage} onChangeText={(v: string) => updateExtra('welcomeMessage', v)} placeholder="Welcome back to your workspace" />
                          <LabeledInput label="Hero Image URL" value={tenantExtras.heroImageUri} onChangeText={(v: string) => updateExtra('heroImageUri', v)} placeholder="https://your-domain.com/hero.png" />
                          <Text style={styles.metaText}>Dashboard Layout</Text>
                          <View style={styles.inlineRow}>
                            {LAYOUT_OPTIONS.map((opt) => {
                              const sel = tenantExtras.dashboardLayout === opt.value;
                              return (
                                <Pressable key={opt.value} style={[styles.pill, sel && styles.pillActive]} onPress={() => updateExtra('dashboardLayout', opt.value)} accessibilityRole="button" accessibilityState={{ selected: sel }}>
                                  <Text style={[styles.pillText, sel && styles.pillTextActive]}>{opt.label}</Text>
                                </Pressable>
                              );
                            })}
                          </View>
                          <Text style={styles.metaText}>Default Theme Mode</Text>
                          <View style={styles.inlineRow}>
                            {THEME_MODE_OPTIONS.map((opt) => {
                              const sel = tenantExtras.defaultThemeMode === opt.value;
                              return (
                                <Pressable key={opt.value} style={[styles.pill, sel && styles.pillActive]} onPress={() => updateExtra('defaultThemeMode', opt.value)} accessibilityRole="button" accessibilityState={{ selected: sel }}>
                                  <Text style={[styles.pillText, sel && styles.pillTextActive]}>{opt.label}</Text>
                                </Pressable>
                              );
                            })}
                          </View>
                          <Pressable style={[styles.pill, tenantExtras.animationsEnabled && styles.pillActive, { marginTop: 8 }]} onPress={() => updateExtra('animationsEnabled', !tenantExtras.animationsEnabled)} accessibilityRole="switch" accessibilityState={{ checked: tenantExtras.animationsEnabled }} accessibilityLabel="Toggle UI animations">
                            <Text style={[styles.pillText, tenantExtras.animationsEnabled && styles.pillTextActive]}>Animations {tenantExtras.animationsEnabled ? 'On' : 'Off'}</Text>
                          </Pressable>
                        </View>
                      </View>
                    </BlurView>
                  </View>
                )}

                {/* ── Business Tab ──────────────────────────────── */}
                {tenantTab === 'business' && (
                  <View style={styles.tenantWidgetGrid}>
                    <BlurView intensity={30} tint={mode === 'day' ? 'light' : 'dark'} style={styles.tenantWidgetBlur}>
                      <View style={[styles.card, styles.tenantWidgetCard]}>
                        <Text style={styles.cardTitle}>Business Profile</Text>
                        <View style={styles.cardBody}>
                          <Text style={styles.metaText}>Departments</Text>
                          <View style={styles.inlineRow}>
                            {tenantExtras.departments.map((dept: string, idx: number) => (
                              <Pressable key={`dept-${idx}`} style={[styles.pill, styles.pillActive]} onPress={() => updateExtra('departments', tenantExtras.departments.filter((_: string, i: number) => i !== idx))} accessibilityRole="button" accessibilityLabel={`Remove ${dept}`}>
                                <Text style={[styles.pillText, styles.pillTextActive]}>{dept} ×</Text>
                              </Pressable>
                            ))}
                          </View>
                          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-end' }}>
                            <View style={{ flex: 1 }}>
                              <LabeledInput label="Add Department" value={tenantDeptInput} onChangeText={setTenantDeptInput} placeholder="e.g. Engineering" />
                            </View>
                            <Pressable style={[styles.secondaryButton, { marginBottom: 6 }]} onPress={() => { if (tenantDeptInput.trim()) { updateExtra('departments', [...tenantExtras.departments, tenantDeptInput.trim()]); setTenantDeptInput(''); } }} accessibilityRole="button" accessibilityLabel="Add department">
                              <Text style={styles.secondaryButtonText}>Add</Text>
                            </Pressable>
                          </View>
                          <Text style={styles.metaText}>Timezone</Text>
                          <View style={styles.inlineRow}>
                            {TIMEZONE_OPTIONS.map((tz) => {
                              const sel = tenantExtras.timezone === tz;
                              return (
                                <Pressable key={tz} style={[styles.pill, sel && styles.pillActive]} onPress={() => updateExtra('timezone', tz)} accessibilityRole="button" accessibilityState={{ selected: sel }}>
                                  <Text style={[styles.pillText, sel && styles.pillTextActive]}>{tz}</Text>
                                </Pressable>
                              );
                            })}
                          </View>
                          <Text style={styles.metaText}>Date Format</Text>
                          <View style={styles.inlineRow}>
                            {DATE_FORMAT_OPTIONS.map((fmt) => {
                              const sel = tenantExtras.dateFormat === fmt;
                              return (
                                <Pressable key={fmt} style={[styles.pill, sel && styles.pillActive]} onPress={() => updateExtra('dateFormat', fmt)} accessibilityRole="button" accessibilityState={{ selected: sel }}>
                                  <Text style={[styles.pillText, sel && styles.pillTextActive]}>{fmt}</Text>
                                </Pressable>
                              );
                            })}
                          </View>
                          <Text style={styles.metaText}>Currency</Text>
                          <View style={styles.inlineRow}>
                            {CURRENCY_OPTIONS.map((cur) => {
                              const sel = tenantExtras.currencyCode === cur;
                              return (
                                <Pressable key={cur} style={[styles.pill, sel && styles.pillActive]} onPress={() => updateExtra('currencyCode', cur)} accessibilityRole="button" accessibilityState={{ selected: sel }}>
                                  <Text style={[styles.pillText, sel && styles.pillTextActive]}>{cur}</Text>
                                </Pressable>
                              );
                            })}
                          </View>
                        </View>
                      </View>
                    </BlurView>
                  </View>
                )}

                {/* ── Team Tab ──────────────────────────────────── */}
                {tenantTab === 'team' && (
                  <View style={styles.tenantWidgetGrid}>
                    <BlurView intensity={30} tint={mode === 'day' ? 'light' : 'dark'} style={styles.tenantWidgetBlur}>
                      <View style={[styles.card, styles.tenantWidgetCard]}>
                        <Text style={styles.cardTitle}>Team & Titles</Text>
                        <View style={styles.cardBody}>
                          <Pressable style={styles.secondaryButton} onPress={() => setTenantRolesExpanded((current) => !current)} accessibilityRole="button" accessibilityLabel="Toggle active tenant end user title options">
                            <Text style={styles.secondaryButtonText}>Available Titles {tenantRolesExpanded ? '▾' : '▸'}</Text>
                          </Pressable>
                          {tenantRolesExpanded && (
                            <View style={styles.inlineRow}>
                              {tenantTitleOptions.map((title) => {
                                const isSelected = tenantRoleTitles.some((item) => item.toLowerCase() === title.toLowerCase());
                                return (
                                  <Pressable key={`active-title-${title}`} style={[styles.pill, isSelected && styles.pillActive]} onPress={() => toggleTitleSelection(title, tenantRoleTitles, setTenantRoleTitles)} accessibilityRole="button" accessibilityState={{ selected: isSelected }} accessibilityLabel={`Toggle ${title}`}>
                                    <Text style={[styles.pillText, isSelected && styles.pillTextActive]}>{title}</Text>
                                  </Pressable>
                                );
                              })}
                            </View>
                          )}
                          <LabeledInput label="Add Custom End User Title" value={tenantCustomRoleTitle} onChangeText={setTenantCustomRoleTitle} placeholder="Example: Shift Lead" />
                          <Pressable style={styles.secondaryButton} onPress={() => addCustomTitle(tenantCustomRoleTitle, tenantRoleTitles, setTenantRoleTitles, () => setTenantCustomRoleTitle(''))} accessibilityRole="button" accessibilityLabel="Add custom end user title">
                            <Text style={styles.secondaryButtonText}>Add Title</Text>
                          </Pressable>
                          {tenantRoleTitles.length > 0 && (
                            <View style={[styles.inlineRow, { marginTop: 8 }]}>
                              {tenantRoleTitles.map((title) => (
                                <View key={`selected-${title}`} style={[styles.pill, styles.pillActive]}>
                                  <Text style={[styles.pillText, styles.pillTextActive]}>{title}</Text>
                                </View>
                              ))}
                            </View>
                          )}
                        </View>
                      </View>
                    </BlurView>
                  </View>
                )}

                {/* ── Manage Tab ──────────────────────────────────── */}
                {tenantTab === 'manage' && (
                  <View style={styles.tenantWidgetGrid}>
                    <BlurView intensity={30} tint={mode === 'day' ? 'light' : 'dark'} style={styles.tenantWidgetBlur}>
                      <View style={[styles.card, styles.tenantWidgetCard]}>
                        <Text style={styles.cardTitle}>Tenant Configuration</Text>
                        <View style={styles.cardBody}>
                          <LabeledInput label="Active Tenant Name" value={tenantRenameValue} onChangeText={setTenantRenameValue} placeholder="Rename selected tenant" />
                          <Text style={styles.metaText}>Export Format</Text>
                          <View style={styles.inlineRow}>
                            {(['cosmos', 'postgres', 'mongodb'] as PortableDatabaseTarget[]).map((target) => {
                              const selected = tenantExportTarget === target;
                              return (
                                <Pressable key={`tenant-export-target-${target}`} style={[styles.pill, selected && styles.pillActive]} onPress={() => setTenantExportTarget(target)} accessibilityRole="button" accessibilityState={{ selected }} accessibilityLabel={`Set export format ${target}`}>
                                  <Text style={[styles.pillText, selected && styles.pillTextActive]}>{target.toUpperCase()}</Text>
                                </Pressable>
                              );
                            })}
                          </View>
                          <Text style={styles.metaText}>Available Tenants</Text>
                          {tenants.map((tenant) => (
                            <View key={tenant.id} style={styles.listCard}>
                              <Text style={styles.listTitle}>{tenant.name}</Text>
                              <Text style={styles.metaText}>Titles: {tenant.branding.employeeTitles.length} · Departments: {(tenant.branding.departments ?? []).length} · Industry: {tenant.branding.industryVertical ?? 'Not set'}</Text>
                              <View style={styles.inlineRow}>
                                <Pressable style={[styles.pill, activeTenantId === tenant.id && styles.pillActive]} onPress={() => handleSwitchTenant(tenant.id)} accessibilityRole="button" accessibilityState={{ selected: activeTenantId === tenant.id }} accessibilityLabel={`Switch to ${tenant.name}`}>
                                  <Text style={[styles.pillText, activeTenantId === tenant.id && styles.pillTextActive]}>{activeTenantId === tenant.id ? 'Active Tenant' : 'Switch to Tenant'}</Text>
                                </Pressable>
                                <Pressable style={styles.secondaryButton} onPress={() => { void handleExportTenantDataset(tenant.id, tenant.name); }} accessibilityRole="button" accessibilityLabel={`Download mapped dataset for ${tenant.name}`}>
                                  <Text style={styles.secondaryButtonText}>Download Dataset</Text>
                                </Pressable>
                              </View>
                            </View>
                          ))}
                        </View>
                      </View>
                    </BlurView>
                  </View>
                )}

                {/* ── Create Tab ──────────────────────────────────── */}
                {tenantTab === 'create' && (
                  <View style={styles.tenantWidgetGrid}>
                    <BlurView intensity={30} tint={mode === 'day' ? 'light' : 'dark'} style={styles.tenantWidgetBlur}>
                      <View style={[styles.card, styles.tenantWidgetCard]}>
                        <Text style={styles.cardTitle}>New Tenant Identity</Text>
                        <View style={styles.cardBody}>
                          <LabeledInput label="Tenant Name" value={newTenantName} onChangeText={setNewTenantName} placeholder="Example: Acme Corp" />
                          <LabeledInput label="Logo URL" value={newTenantLogoUri} onChangeText={setNewTenantLogoUri} placeholder="https://your-domain.com/logo.png" />
                          <View style={styles.inlineRow}>
                            <Pressable style={styles.secondaryButton} onPress={handlePickNewTenantLogo} accessibilityRole="button" accessibilityLabel="Upload new tenant logo">
                              <Text style={styles.secondaryButtonText}>Upload Logo</Text>
                            </Pressable>
                            <Pressable style={styles.secondaryButton} onPress={handleRemoveNewTenantLogo} accessibilityRole="button" accessibilityLabel="Remove new tenant logo">
                              <Text style={styles.secondaryButtonText}>Remove</Text>
                            </Pressable>
                          </View>
                          <LabeledInput label="Tagline" value={newTenantExtras.tagline} onChangeText={(v: string) => updateNewExtra('tagline', v)} placeholder="Company tagline" />
                          <Text style={styles.metaText}>Industry</Text>
                          <View style={styles.inlineRow}>
                            {INDUSTRY_OPTIONS.map((ind) => {
                              const sel = newTenantExtras.industryVertical === ind;
                              return (
                                <Pressable key={`new-ind-${ind}`} style={[styles.pill, sel && styles.pillActive]} onPress={() => updateNewExtra('industryVertical', ind)} accessibilityRole="button" accessibilityState={{ selected: sel }}>
                                  <Text style={[styles.pillText, sel && styles.pillTextActive]}>{ind}</Text>
                                </Pressable>
                              );
                            })}
                          </View>
                        </View>
                      </View>
                    </BlurView>
                    <BlurView intensity={30} tint={mode === 'day' ? 'light' : 'dark'} style={styles.tenantWidgetBlur}>
                      <View style={[styles.card, styles.tenantWidgetCard]}>
                        <Text style={styles.cardTitle}>New Tenant Colors</Text>
                        <View style={styles.cardBody}>
                          <LabeledInput label="Primary" value={newTenantPrimaryColor} onChangeText={setNewTenantPrimaryColor} placeholder="#120C23" />
                          <LabeledInput label="Secondary" value={newTenantSecondaryColor} onChangeText={setNewTenantSecondaryColor} placeholder="#1A1230" />
                          <LabeledInput label="Accent" value={newTenantAccentColor} onChangeText={setNewTenantAccentColor} placeholder="#8C5BF5" />
                          <LabeledInput label="Accent Secondary" value={newTenantExtras.accentSecondary} onChangeText={(v: string) => updateNewExtra('accentSecondary', v)} placeholder="#A78BFA" />
                          <LabeledInput label="Success" value={newTenantExtras.successColor} onChangeText={(v: string) => updateNewExtra('successColor', v)} placeholder="#22C55E" />
                          <LabeledInput label="Warning" value={newTenantExtras.warningColor} onChangeText={(v: string) => updateNewExtra('warningColor', v)} placeholder="#F59E0B" />
                          <LabeledInput label="Danger" value={newTenantExtras.dangerColor} onChangeText={(v: string) => updateNewExtra('dangerColor', v)} placeholder="#EF4444" />
                          <LabeledInput label="Surface" value={newTenantExtras.surfaceColor} onChangeText={(v: string) => updateNewExtra('surfaceColor', v)} placeholder="#1E1535" />
                          <Text style={styles.metaText}>Apply Preset</Text>
                          <View style={styles.inlineRow}>
                            {PALETTE_PRESETS.map((preset) => (
                              <Pressable key={`new-preset-${preset.name}`} style={styles.pill} onPress={() => { const [p, s, a, a2, suc, wrn, dan, sur] = preset.colors; setNewTenantPrimaryColor(p); setNewTenantSecondaryColor(s); setNewTenantAccentColor(a); updateNewExtra('accentSecondary', a2); updateNewExtra('successColor', suc); updateNewExtra('warningColor', wrn); updateNewExtra('dangerColor', dan); updateNewExtra('surfaceColor', sur); }} accessibilityRole="button" accessibilityLabel={`Apply ${preset.name} preset`}>
                                <Text style={styles.pillText}>{preset.name}</Text>
                              </Pressable>
                            ))}
                          </View>
                        </View>
                      </View>
                    </BlurView>
                    <BlurView intensity={30} tint={mode === 'day' ? 'light' : 'dark'} style={styles.tenantWidgetBlur}>
                      <View style={[styles.card, styles.tenantWidgetCard]}>
                        <Text style={styles.cardTitle}>New Tenant Settings</Text>
                        <View style={styles.cardBody}>
                          <Text style={styles.metaText}>Font Family</Text>
                          <View style={styles.inlineRow}>
                            {FONT_OPTIONS.map((font) => {
                              const sel = newTenantExtras.fontFamily === font;
                              return (
                                <Pressable key={`new-font-${font}`} style={[styles.pill, sel && styles.pillActive]} onPress={() => updateNewExtra('fontFamily', font)} accessibilityRole="button" accessibilityState={{ selected: sel }}>
                                  <Text style={[styles.pillText, sel && styles.pillTextActive]}>{font}</Text>
                                </Pressable>
                              );
                            })}
                          </View>
                          <Text style={styles.metaText}>Border Radius</Text>
                          <View style={styles.inlineRow}>
                            {RADIUS_OPTIONS.map((opt) => {
                              const sel = newTenantExtras.borderRadius === opt.value;
                              return (
                                <Pressable key={`new-rad-${opt.value}`} style={[styles.pill, sel && styles.pillActive]} onPress={() => updateNewExtra('borderRadius', opt.value)} accessibilityRole="button" accessibilityState={{ selected: sel }}>
                                  <Text style={[styles.pillText, sel && styles.pillTextActive]}>{opt.label}</Text>
                                </Pressable>
                              );
                            })}
                          </View>
                          <Text style={styles.metaText}>Sidebar Style</Text>
                          <View style={styles.inlineRow}>
                            {SIDEBAR_STYLE_OPTIONS.map((opt) => {
                              const sel = newTenantExtras.sidebarStyle === opt.value;
                              return (
                                <Pressable key={`new-sb-${opt.value}`} style={[styles.pill, sel && styles.pillActive]} onPress={() => updateNewExtra('sidebarStyle', opt.value)} accessibilityRole="button" accessibilityState={{ selected: sel }}>
                                  <Text style={[styles.pillText, sel && styles.pillTextActive]}>{opt.label}</Text>
                                </Pressable>
                              );
                            })}
                          </View>
                          <Pressable style={styles.secondaryButton} onPress={() => setNewTenantRolesExpanded((current) => !current)} accessibilityRole="button" accessibilityLabel="Toggle new tenant title options">
                            <Text style={styles.secondaryButtonText}>End User Titles {newTenantRolesExpanded ? '▾' : '▸'}</Text>
                          </Pressable>
                          {newTenantRolesExpanded && (
                            <View style={styles.inlineRow}>
                              {tenantTitleOptions.map((title) => {
                                const isSelected = newTenantRoleTitles.some((item) => item.toLowerCase() === title.toLowerCase());
                                return (
                                  <Pressable key={`new-title-${title}`} style={[styles.pill, isSelected && styles.pillActive]} onPress={() => toggleTitleSelection(title, newTenantRoleTitles, setNewTenantRoleTitles)} accessibilityRole="button" accessibilityState={{ selected: isSelected }} accessibilityLabel={`Toggle ${title}`}>
                                    <Text style={[styles.pillText, isSelected && styles.pillTextActive]}>{title}</Text>
                                  </Pressable>
                                );
                              })}
                            </View>
                          )}
                          <LabeledInput label="Add Custom Title" value={newTenantCustomRoleTitle} onChangeText={setNewTenantCustomRoleTitle} placeholder="Example: Team Captain" />
                          <Pressable style={styles.secondaryButton} onPress={() => addCustomTitle(newTenantCustomRoleTitle, newTenantRoleTitles, setNewTenantRoleTitles, () => setNewTenantCustomRoleTitle(''))} accessibilityRole="button" accessibilityLabel="Add custom title for new tenant">
                            <Text style={styles.secondaryButtonText}>Add Title</Text>
                          </Pressable>
                        </View>
                      </View>
                    </BlurView>
                  </View>
                )}

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
                {page === 'workflow' && <WorkflowChainsPage guidedMode={guidedMode} onGuide={openGuide} registerActions={registerModuleActions} auditLog={auditLog} addNotification={addNotification} />}
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
