import { StyleSheet } from 'react-native';

export type ThemeMode = 'day' | 'night';

const colors = {
  white: '#FFFFFF',
  lilac100: '#FD9CFD',
  lilac300: '#E878F6',
  violet500: '#8C5BF5',
  midnight900: '#201535',
};

const nightStyleObject = {
  // Removed duplicate landingWrap and landingContent
  // Removed duplicate landingTopMenu
  // Removed duplicate landingTopMenuText
  root: {
    flex: 1,
    backgroundColor: '#07080C',
    backgroundImage: 'radial-gradient(1200px 700px at 18% 8%, rgba(139,92,246,.22), transparent 55%), radial-gradient(900px 650px at 82% 18%, rgba(34,197,94,.14), transparent 60%), radial-gradient(900px 650px at 45% 100%, rgba(59,130,246,.12), transparent 60%), linear-gradient(180deg, #07080C, #0B0E16)',
  },
  dashboardShell: {
    flex: 1,
    flexDirection: 'row',
    padding: 14,
    gap: 14,
  },
  dashboardShellCompact: {
    flexDirection: 'column',
    padding: 0,
    gap: 0,
  },
  dashboardShellCompactContent: {
    flexGrow: 1,
    padding: 10,
    gap: 10,
  },
  dashboardMainPaneCompact: {
    flex: undefined,
    minHeight: '80vh',
  },
  dashboardSidebar: {
    width: 288,
    borderRadius: 12,
    backgroundColor: 'rgba(10,14,24,0.82)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 14,
    gap: 8,
    overflow: 'hidden',
  },
  dashboardSidebarSmooth: {
    transitionProperty: 'width',
    transitionDuration: '220ms',
    transitionTimingFunction: 'cubic-bezier(0.22, 0, 0.18, 1)',
  },
  dashboardSidebarCompact: {
    width: '100%',
    borderRadius: 0,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(253,156,253,0.24)',
    paddingTop: 12,
  },
  dashboardSidebarCollapsed: {
    width: 92,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  dashboardBrandWrap: {
    gap: 2,
    paddingHorizontal: 0,
  },
  dashboardBrandTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dashboardHamburgerButton: {
    width: 34,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(253,156,253,0.46)',
    backgroundColor: 'rgba(140,91,245,0.24)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dashboardHamburgerButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 20,
  },
  dashboardCollapsedLogo: {
    width: 34,
    height: 34,
    borderRadius: 8,
    resizeMode: 'contain',
  },
  dashboardBrand: {
    color: colors.white,
    fontSize: 22,
    fontWeight: '800',
  },
  dashboardSubBrand: {
    color: '#C9B8EA',
    fontSize: 11,
  },
  dashboardCreateButton: {
    borderRadius: 12,
    backgroundColor: '#2E86EE',
    minHeight: 42,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dashboardCreateButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  dashboardNavSection: {
    gap: 6,
  },
  dashboardSectionLabel: {
    color: '#8878AE',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
    paddingHorizontal: 6,
  },
  dashboardNavItem: {
    borderRadius: 10,
    paddingHorizontal: 10,
    minHeight: 42,
    paddingVertical: 7,
    backgroundColor: 'transparent',
    justifyContent: 'center',
  },
  dashboardNavItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dashboardNavItemIcon: {
    width: 32,
    height: 32,
    resizeMode: 'contain',
  },
  dashboardNavItemActive: {
    backgroundColor: 'rgba(140,91,245,0.38)',
  },
  dashboardTenantNavGroup: {
    gap: 6,
  },
  dashboardTenantChevron: {
    color: '#F3EAFF',
    fontSize: 16,
    fontWeight: '800',
    marginLeft: 'auto',
  },
  dashboardTenantNavList: {
    gap: 6,
    paddingLeft: 8,
  },
  dashboardTenantNavItem: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(253,156,253,0.3)',
    backgroundColor: 'rgba(32,21,53,0.65)',
    paddingHorizontal: 10,
    minHeight: 42,
    paddingVertical: 8,
    justifyContent: 'center',
  },
  dashboardTenantNavItemActive: {
    borderColor: 'rgba(253,156,253,0.85)',
    backgroundColor: 'rgba(140,91,245,0.34)',
  },
  dashboardTenantNavItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dashboardTenantNavItemText: {
    color: '#DCCFF5',
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
    textAlign: 'right',
  },
  dashboardNavItemText: {
    color: '#D6CCEB',
    fontSize: 14,
    fontWeight: '600',
  },
  dashboardNavItemDesc: {
    color: 'rgba(214,204,235,0.55)',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  dashboardNavItemTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  dashboardRoleItem: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(253,156,253,0.22)',
    paddingHorizontal: 9,
    minHeight: 34,
    paddingVertical: 6,
    backgroundColor: 'rgba(37,26,60,0.8)',
    justifyContent: 'center',
  },
  dashboardRoleItemActive: {
    borderColor: 'rgba(253,156,253,0.7)',
    backgroundColor: 'rgba(140,91,245,0.3)',
  },
  dashboardRoleItemText: {
    color: '#DCCFF5',
    fontSize: 13,
    fontWeight: '600',
  },
  dashboardRoleItemTextActive: {
    color: '#FFFFFF',
  },
  dashboardSidebarFooter: {
    marginTop: 'auto',
    gap: 8,
  },
  dashboardSettingsMenu: {
    gap: 8,
    paddingLeft: 8,
  },
  dashboardSidebarAction: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(253,156,253,0.24)',
    backgroundColor: 'rgba(29,20,48,0.88)',
    paddingHorizontal: 10,
    minHeight: 38,
    paddingVertical: 8,
    justifyContent: 'center',
  },
  dashboardSidebarActionActive: {
    borderColor: 'rgba(253,156,253,0.75)',
    backgroundColor: 'rgba(140,91,245,0.3)',
  },
  dashboardSidebarActionText: {
    color: '#E4DAFA',
    fontSize: 13,
    fontWeight: '700',
  },
  dashboardSidebarActionTextActive: {
    color: '#FFFFFF',
  },
  dashboardUserText: {
    color: '#AFA1CE',
    fontSize: 11,
    lineHeight: 16,
    paddingHorizontal: 2,
  },
  dashboardMainPane: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: 'rgba(11,14,22,0.82)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    overflow: 'hidden',
  },
  dashboardMainHeader: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'transparent',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dashboardMainHeaderCompact: {
    alignItems: 'flex-start',
    gap: 10,
  },
  dashboardMainTitle: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '800',
  },
  dashboardMainSubtitle: {
    color: '#C9B8EA',
    fontSize: 13,
    marginTop: 2,
  },
  dashboardMainActions: {
    flexDirection: 'row',
    gap: 6,
  },
  dashboardMainActionsCompact: {
    width: '100%',
    justifyContent: 'flex-start',
    flexWrap: 'wrap',
  },
  dashboardHeaderButton: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(253,156,253,0.4)',
    backgroundColor: 'rgba(140,91,245,0.2)',
    paddingHorizontal: 10,
    minHeight: 34,
    paddingVertical: 6,
    justifyContent: 'center',
  },
  dashboardHeaderButtonText: {
    color: '#F7F1FF',
    fontSize: 12,
    fontWeight: '700',
  },
  dashboardHeaderPrimaryButton: {
    borderRadius: 10,
    backgroundColor: '#8C5BF5',
    paddingHorizontal: 10,
    minHeight: 34,
    paddingVertical: 6,
    justifyContent: 'center',
  },
  dashboardHeaderPrimaryButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  dashboardMainBody: {
    flex: 1,
  },
  dashboardBottomActionBar: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    paddingHorizontal: 18,
    paddingVertical: 12,
    position: 'relative' as any,
    zIndex: 1,
  },
  dashboardBottomActionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  dashboardBottomStatusWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dashboardBottomActionContentCompact: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  dashboardBottomStatusText: {
    color: '#C9B8EA',
    fontSize: 12,
    fontWeight: '600',
  },
  dashboardBottomStatusIcon: {
    width: 16,
    height: 16,
    resizeMode: 'contain',
  },
  dashboardDraftBanner: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(253,156,253,0.2)',
    paddingHorizontal: 18,
    paddingVertical: 8,
    backgroundColor: 'rgba(140,91,245,0.08)',
  },
  dashboardDraftText: {
    color: '#C9B8EA',
    fontSize: 12,
    fontWeight: '600',
  },
  pressableFeedback: {
    opacity: 1,
    transform: [{ scale: 1 }],
  },
  pressableFeedbackPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.985 }],
  },
  topbar: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 10,
    gap: 12,
  },
  topbarTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  brandWrap: {
    gap: 4,
  },
  brand: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '800',
  },
  pageTabs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pageWrap: {
    flex: 1,
  },
  pageContent: {
    padding: 12,
    gap: 10,
    paddingBottom: 18,
  },
  pageContentTight: {
    padding: 10,
    gap: 8,
    paddingBottom: 14,
  },
  sectionEyebrow: {
    color: 'rgba(232,236,255,0.62)',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  sectionLeadText: {
    color: 'rgba(232,236,255,0.8)',
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
  },
  tenantWidgetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    alignItems: 'flex-start',
  },
  tenantWidgetBlur: {
    borderRadius: 14,
    overflow: 'hidden',
    flexGrow: 1,
    flexBasis: 340,
    minWidth: 300,
  },
  tenantWidgetCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  moduleWidgetBlur: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  moduleWidgetCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  card: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: 14,
    padding: 14,
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  cardBlurWrap: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  cardTitle: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  cardBody: {
    marginTop: 8,
    gap: 8,
  },
  bodyText: {
    color: 'rgba(232,236,255,0.84)',
    fontSize: 13,
    lineHeight: 20,
  },
  bullet: {
    color: '#F4EDFF',
    fontSize: 14,
    lineHeight: 21,
  },
  diagram: {
    color: '#F8F3FF',
    fontFamily: 'monospace',
    fontSize: 12,
    lineHeight: 18,
  },
  pill: {
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.18)',
    borderRadius: 999,
    paddingHorizontal: 10,
    minHeight: 30,
    paddingVertical: 5,
    backgroundColor: 'rgba(167,139,250,0.08)',
    justifyContent: 'center',
  },
  pillActive: {
    borderColor: 'rgba(167,139,250,0.45)',
    backgroundColor: 'rgba(167,139,250,0.18)',
  },
  pillText: {
    color: '#C4B5FD',
    fontSize: 12,
    fontWeight: '700',
  },
  pillTextActive: {
    color: colors.white,
  },
  inlineRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  builderHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    flexWrap: 'wrap',
  },
  builderHeaderMeta: {
    flex: 1,
    minWidth: 240,
    gap: 4,
  },
  builderCreateModeBanner: {
    borderWidth: 1,
    borderColor: 'rgba(250,225,120,0.7)',
    borderRadius: 10,
    backgroundColor: 'rgba(250,225,120,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 8,
  },
  builderCreateModeBannerText: {
    color: '#FFF5C7',
    fontSize: 12,
    fontWeight: '800',
  },
  builderCreateModeBannerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  builderCreateModeBannerClose: {
    borderWidth: 1,
    borderColor: 'rgba(250,225,120,0.78)',
    borderRadius: 999,
    backgroundColor: 'rgba(32,21,53,0.22)',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  builderCreateModeBannerCloseText: {
    color: '#FFF5C7',
    fontSize: 11,
    fontWeight: '700',
  },
  builderStepRail: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 2,
  },
  builderStepItem: {
    borderWidth: 1,
    borderColor: 'rgba(253,156,253,0.38)',
    borderRadius: 999,
    backgroundColor: 'rgba(140,91,245,0.14)',
    paddingHorizontal: 10,
    minHeight: 30,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    justifyContent: 'center',
  },
  builderStepItemCurrent: {
    borderColor: 'rgba(250,225,120,0.9)',
    backgroundColor: 'rgba(111,75,207,0.92)',
    boxShadow: '0 0 10px rgba(253,224,120,0.5)',
    elevation: 6,
  },
  builderStepItemComplete: {
    borderColor: 'rgba(55,199,120,0.62)',
    backgroundColor: 'rgba(55,199,120,0.18)',
  },
  builderStepBullet: {
    width: 10,
    height: 10,
    borderRadius: 99,
  },
  builderStepBulletPending: {
    backgroundColor: '#8A8699',
  },
  builderStepBulletCurrent: {
    backgroundColor: '#FDE078',
    boxShadow: '0 0 8px rgba(253,224,120,0.7)',
    elevation: 8,
  },
  builderStepBulletComplete: {
    backgroundColor: '#37C778',
  },
  builderStepText: {
    color: '#EDE3FF',
    fontSize: 12,
    fontWeight: '700',
  },
  builderStepTextCurrent: {
    color: '#FFFFFF',
  },
  builderStepTextComplete: {
    color: '#DFFBEA',
  },
  builderLayout: {
    flexDirection: 'row',
    gap: 14,
    flexWrap: 'wrap',
    alignItems: 'flex-start',
  },
  builderSectionCard: {
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.14)',
    borderRadius: 14,
    backgroundImage: 'linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))',
    backgroundColor: 'transparent',
    backdropFilter: 'blur(18px)',
    boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
    overflow: 'hidden',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
  },
  builderSectionTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  builderSectionHint: {
    color: '#C4B5FD',
    fontSize: 11,
    lineHeight: 16,
  },
  builderStudioTextPrimary: {
    color: '#F8F5FF',
  },
  builderStudioTextSecondary: {
    color: '#C4B5FD',
  },
  builderActionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  },
  builderFormSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.14)',
    borderRadius: 14,
    backgroundImage: 'linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))',
    backgroundColor: 'transparent',
    backdropFilter: 'blur(18px)',
    boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
    overflow: 'hidden',
    padding: 12,
  },
  builderFormSectionCompact: {
    flexDirection: 'column',
  },
  builderFormSectionHeader: {
    width: 192,
    gap: 4,
  },
  builderFormSectionHeaderRail: {
    alignSelf: 'stretch',
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.1)',
    paddingRight: 14,
    marginRight: 4,
  },
  builderFormSectionHeaderCompact: {
    width: '100%',
    borderRightWidth: 0,
    paddingRight: 0,
    marginRight: 0,
    paddingBottom: 8,
  },
  builderFormSectionTitle: {
    color: '#F8F5FF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  builderFormSectionText: {
    color: '#C4B5FD',
    fontSize: 11,
    lineHeight: 16,
  },
  builderFormSectionBody: {
    flex: 1,
    minWidth: 220,
    gap: 10,
  },
  builderConfigPane: {
    flex: 1,
    minWidth: 300,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: 16,
    padding: 14,
    gap: 12,
    backgroundImage: 'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))',
    backgroundColor: 'transparent',
    backdropFilter: 'blur(14px)',
    boxShadow: 'none',
    overflow: 'hidden',
  },
  builderPreviewPane: {
    flex: 1,
    minWidth: 300,
  },
  builderPreviewCard: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: 16,
    padding: 14,
    gap: 12,
    backgroundImage: 'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))',
    backgroundColor: 'transparent',
    backdropFilter: 'blur(14px)',
    boxShadow: 'none',
    overflow: 'hidden',
  },
  builderPreviewHeroCard: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: 12,
    padding: 12,
    backgroundImage: 'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))',
    backgroundColor: 'transparent',
    backdropFilter: 'blur(14px)',
    boxShadow: 'none',
    overflow: 'hidden',
    gap: 4,
  },
  builderPreviewHeroTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
  },
  builderPreviewHeroSubtitle: {
    color: '#E8DFF8',
    fontSize: 13,
    fontWeight: '700',
  },
  builderPreviewStatsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  builderPreviewStatCard: {
    flex: 1,
    minWidth: 130,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundImage: 'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))',
    backgroundColor: 'transparent',
    backdropFilter: 'blur(14px)',
    boxShadow: 'none',
    overflow: 'hidden',
    gap: 2,
  },
  builderPreviewStatValue: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
  },
  builderPreviewStatLabel: {
    color: '#C9B8EA',
    fontSize: 11,
    fontWeight: '600',
  },
  builderPreviewFieldRow: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: 12,
    backgroundImage: 'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))',
    backgroundColor: 'transparent',
    backdropFilter: 'blur(14px)',
    boxShadow: 'none',
    overflow: 'hidden',
    padding: 10,
    gap: 6,
  },
  builderPreviewFieldMeta: {
    gap: 2,
  },
  builderDropZone: {
    borderWidth: 2,
    borderColor: 'rgba(253,156,253,0.62)',
    borderStyle: 'dashed',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: 'rgba(140,91,245,0.16)',
  },
  builderDetailsFormPanel: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: 14,
    backgroundImage: 'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))',
    backgroundColor: 'transparent',
    backdropFilter: 'blur(14px)',
    boxShadow: 'none',
    overflow: 'hidden',
    padding: 12,
    gap: 10,
  },
  builderDetailsFormPanelWide: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  builderDetailsFormRow: {
    gap: 7,
    width: '100%',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(253,156,253,0.18)',
  },
  builderDetailsFormRowHalf: {
    width: '48%',
  },
  builderDetailsFormLabel: {
    color: '#F7F1FF',
    fontSize: 13,
    fontWeight: '700',
  },
  builderDetailsFormInput: {
    borderWidth: 1,
    borderColor: 'rgba(253,156,253,0.4)',
    borderRadius: 10,
    backgroundColor: 'rgba(140,91,245,0.14)',
    minHeight: 38,
    paddingHorizontal: 10,
    paddingVertical: 8,
    justifyContent: 'center',
  },
  builderDetailsFormInputMulti: {
    minHeight: 72,
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
  },
  builderDetailsFormInputText: {
    color: '#D9CFF2',
    fontSize: 12,
  },
  builderDetailsFormType: {
    color: '#B8A8D9',
    fontSize: 11,
  },
  endUserWorkspaceShell: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundImage: 'linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03))',
    backgroundColor: 'rgba(255,255,255,0.06)',
    backdropFilter: 'blur(14px)',
    boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
  },
  endUserWorkspaceShellCompact: {
    flexDirection: 'column',
  },
  endUserWorkspaceRail: {
    width: 300,
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.10)',
    backgroundImage: 'linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03))',
    backgroundColor: 'rgba(255,255,255,0.04)',
    backdropFilter: 'blur(14px)',
    paddingHorizontal: 10,
    paddingVertical: 9,
    gap: 5,
  },
  endUserWorkspaceRailCompact: {
    width: '100%',
    borderRightWidth: 0,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(253,156,253,0.24)',
  },
  endUserWorkspaceRailLabel: {
    color: '#B8A8D9',
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 4,
  },
  endUserWorkspaceTab: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundImage: 'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))',
    backgroundColor: 'transparent',
    backdropFilter: 'blur(14px)',
    boxShadow: 'none',
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 9,
    minHeight: 54,
    justifyContent: 'center',
    gap: 2,
  },
  endUserWorkspaceTabActive: {
    borderWidth: 2,
    borderColor: 'rgba(253,156,253,0.82)',
    backgroundColor: 'rgba(140,91,245,0.34)',
  },
  endUserWorkspaceTabStep: {
    color: '#E4DAFA',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  endUserWorkspaceTabStepActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  endUserWorkspaceTabName: {
    color: '#B8A8D9',
    fontSize: 11,
  },
  endUserWorkspaceTabNameActive: {
    color: '#F7F1FF',
    fontWeight: '700',
  },
  endUserWorkspaceContent: {
    flex: 1,
    minWidth: 260,
    gap: 5,
    padding: 10,
  },
  endUserHierarchyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  endUserHierarchyCard: {
    flexGrow: 1,
    minWidth: 170,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: 12,
    backgroundImage: 'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))',
    backgroundColor: 'transparent',
    backdropFilter: 'blur(14px)',
    boxShadow: 'none',
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  endUserHierarchyCardText: {
    color: '#F7F1FF',
    fontSize: 12,
    fontWeight: '800',
  },
  inputWrap: {
    gap: 6,
  },
  inputLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  inputLabel: {
    color: 'rgba(232,236,255,0.88)',
    fontSize: 13,
  },
  inputHelperText: {
    color: 'rgba(232,236,255,0.58)',
    fontSize: 11,
    flexShrink: 1,
    textAlign: 'right',
  },
  input: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.04)',
    color: colors.white,
    minHeight: 42,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
  },
  inputMulti: {
    minHeight: 84,
    textAlignVertical: 'top',
  },
  primaryButton: {
    borderRadius: 14,
    minHeight: 44,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.40)',
    backgroundImage: 'linear-gradient(135deg, rgba(139,92,246,0.85), rgba(59,130,246,0.65))',
    backgroundColor: '#8B5CF6',
    boxShadow: '0 8px 16px rgba(139,92,246,0.24), 0 18px 40px rgba(139,92,246,0.18)',
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 13,
  },
  buttonDisabled: {
    opacity: 0.45,
  },
  secondaryButton: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    minHeight: 36,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(255,255,255,0.04)',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: 'rgba(232,236,255,0.9)',
    fontSize: 12,
    fontWeight: '700',
  },
  /* ── Shared / Orbital shared keys ─────────────────────── */
  sectionTitle: {
    color: '#F1F5F9',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
  },
  sectionDetail: {
    color: 'rgba(232,236,255,0.72)',
    fontSize: 13,
    lineHeight: 19,
  },
  sectionBody: {
    flex: 1,
  },
  adminSidebar: {
    backgroundColor: 'rgba(30,22,50,0.65)',
    paddingTop: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#F1F5F9',
    fontSize: 14,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  pillButton: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  pillButtonActive: {
    borderColor: '#8C5BF5',
    backgroundColor: 'rgba(140,91,245,0.22)',
  },
  pillButtonText: {
    color: 'rgba(232,236,255,0.78)',
    fontSize: 12,
    fontWeight: '600',
  },
  pillButtonTextActive: {
    color: '#D4BBFF',
    fontWeight: '700',
  },
  listCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundImage: 'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))',
    backgroundColor: 'transparent',
    backdropFilter: 'blur(14px)',
    boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
    overflow: 'hidden',
    padding: 14,
    gap: 4,
  },
  listTitle: {
    color: 'rgba(232,236,255,0.96)',
    fontSize: 14,
    fontWeight: '800',
  },
  stageChip: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  stageChipText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  stageReceived: { backgroundColor: 'rgba(59,130,246,0.22)' },
  stageReceivedText: { color: '#93C5FD' },
  stageTriage: { backgroundColor: 'rgba(249,115,22,0.22)' },
  stageTriageText: { color: '#FDBA74' },
  stageRepair: { backgroundColor: 'rgba(168,85,247,0.22)' },
  stageRepairText: { color: '#C4B5FD' },
  stageQC: { backgroundColor: 'rgba(234,179,8,0.22)' },
  stageQCText: { color: '#FDE68A' },
  stageShipped: { backgroundColor: 'rgba(34,197,94,0.22)' },
  stageShippedText: { color: '#86EFAC' },
  stageRisk: { backgroundColor: 'rgba(239,68,68,0.22)' },
  stageRiskText: { color: '#FCA5A5' },
  stageActive: { backgroundColor: 'rgba(34,197,94,0.18)' },
  stageActiveText: { color: '#86EFAC' },
  kpiRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  kpiCard: {
    flex: 1,
    minWidth: 120,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundImage: 'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))',
    backgroundColor: 'transparent',
    backdropFilter: 'blur(14px)',
    boxShadow: 'none',
    overflow: 'hidden',
    padding: 10,
    gap: 2,
    alignItems: 'center',
  },
  kpiValue: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
  },
  kpiLabel: {
    color: 'rgba(232,236,255,0.6)',
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },
  kpiSub: {
    color: 'rgba(232,236,255,0.4)',
    fontSize: 9,
    textAlign: 'center',
  },
  dataHeaderRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    paddingBottom: 4,
    marginBottom: 4,
    gap: 4,
  },
  dataHeaderCell: {
    flex: 1,
    minWidth: 60,
  },
  dataHeaderText: {
    color: 'rgba(232,236,255,0.5)',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  dataRow: {
    flexDirection: 'row',
    gap: 4,
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  dataCell: {
    flex: 1,
    minWidth: 60,
  },
  dataCellText: {
    color: 'rgba(232,236,255,0.82)',
    fontSize: 11,
  },
  dataCellBold: {
    color: 'rgba(232,236,255,0.96)',
    fontSize: 11,
    fontWeight: '700',
  },
  dataCellMoney: {
    color: '#86EFAC',
    fontSize: 11,
    fontWeight: '700',
  },
  searchToolbar: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    marginBottom: 6,
  },
  searchInput: {
    flex: 1,
    minHeight: 34,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    paddingHorizontal: 10,
    color: 'rgba(232,236,255,0.9)',
    fontSize: 12,
  },
  detailPanel: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundImage: 'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))',
    backgroundColor: 'transparent',
    backdropFilter: 'blur(14px)',
    boxShadow: 'none',
    overflow: 'hidden',
    padding: 10,
    gap: 6,
  },
  detailFieldGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  detailField: {
    minWidth: 100,
    gap: 1,
  },
  detailFieldLabel: {
    color: 'rgba(232,236,255,0.44)',
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  detailFieldValue: {
    color: 'rgba(232,236,255,0.92)',
    fontSize: 12,
  },
  tagBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    backgroundColor: 'rgba(140,91,245,0.22)',
    alignSelf: 'flex-start',
  },
  tagBadgeText: {
    color: '#C4B5FD',
    fontSize: 9,
    fontWeight: '700',
  },
  metaText: {
    color: 'rgba(232,236,255,0.66)',
    fontSize: 10,
    lineHeight: 14,
  },
  separator: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginVertical: 4,
  },
  notice: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.midnight900,
    gap: 10,
  },
  loadingText: {
    color: '#F1E8FF',
    fontSize: 13,
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: '#EBDFFF',
  },
  processCard: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundImage: 'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))',
    backgroundColor: 'transparent',
    backdropFilter: 'blur(14px)',
    boxShadow: 'none',
    overflow: 'hidden',
    borderRadius: 12,
    padding: 14,
    gap: 10,
  },
  processTitle: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '800',
  },
  stepRow: {
    flexDirection: 'row',
    gap: 8,
  },
  stepItem: {
    flex: 1,
    gap: 6,
    alignItems: 'center',
  },
  stepDot: {
    width: 26,
    height: 26,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: 'rgba(253,156,253,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(140,91,245,0.2)',
  },
  stepDotActive: {
    borderColor: 'rgba(253,156,253,0.95)',
    backgroundColor: 'rgba(232,120,246,0.35)',
  },
  stepDotText: {
    color: '#F7F1FF',
    fontSize: 12,
    fontWeight: '700',
  },
  stepDotTextActive: {
    color: '#ffffff',
  },
  stepLabel: {
    color: '#E4D5FF',
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  stepLabelActive: {
    color: colors.white,
  },
  hintRow: {
    gap: 8,
  },
  hintBubble: {
    width: 240,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundImage: 'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))',
    backgroundColor: 'rgba(140,91,245,0.18)',
    backdropFilter: 'blur(14px)',
    boxShadow: 'none',
    overflow: 'hidden',
    padding: 12,
    gap: 6,
  },
  hintBubbleTitle: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '800',
  },
  hintBubbleText: {
    color: '#F1E8FF',
    fontSize: 11,
    lineHeight: 16,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(32,21,53,0.7)',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundImage: 'linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03))',
    backgroundColor: 'rgba(20,15,35,0.95)',
    backdropFilter: 'blur(14px)',
    boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
    overflow: 'hidden',
    padding: 16,
    gap: 10,
  },
  modalTitle: {
    color: colors.white,
    fontSize: 17,
    fontWeight: '800',
  },
  modalText: {
    color: '#F0E7FF',
    fontSize: 14,
    lineHeight: 21,
  },
  authWrap: {
    flex: 1,
    backgroundColor: '#07080C',
    backgroundImage: 'radial-gradient(1200px 700px at 18% 8%, rgba(139,92,246,.22), transparent 55%), radial-gradient(900px 650px at 82% 18%, rgba(34,197,94,.14), transparent 60%), radial-gradient(900px 650px at 45% 100%, rgba(59,130,246,.12), transparent 60%), linear-gradient(180deg, #07080C, #0B0E16)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 18,
  },
  authCard: {
    width: '100%',
    maxWidth: 440,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundImage: 'linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03))',
    backgroundColor: 'rgba(20,15,35,0.92)',
    backdropFilter: 'blur(14px)',
    boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
    overflow: 'hidden',
    padding: 24,
    gap: 14,
  },
  authTitle: {
    color: colors.white,
    fontSize: 24,
    fontWeight: '800',
  },
  authSubTitle: {
    color: 'rgba(232,236,255,0.72)',
    fontSize: 14,
    lineHeight: 20,
  },
  authDividerWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  authDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  authDividerText: {
    color: 'rgba(232,236,255,0.55)',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.25,
  },
  socialButton: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    paddingHorizontal: 14,
    minHeight: 44,
    paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.04)',
    backdropFilter: 'blur(14px)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  socialButtonText: {
    color: 'rgba(232,236,255,0.86)',
    fontWeight: '700',
    fontSize: 14,
    textAlign: 'center',
  },
  linkText: {
    color: colors.lilac100,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  landingWrap: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  landingContent: {
    flexGrow: 1,
    paddingBottom: 36,
  },
  landingTopBar: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 10,
    marginTop: 12,
    marginBottom: 20,
    backgroundImage: 'linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03))',
    backgroundColor: 'rgba(10,14,24,0.65)',
    backdropFilter: 'blur(18px)',
    boxShadow: '0 12px 40px rgba(0,0,0,0.35)',
  },
  landingTopBrand: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  landingTopMenu: {
    flexDirection: 'row',
    gap: 8,
  },
  landingTopMenuButton: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 999,
    paddingHorizontal: 12,
    minHeight: 34,
    paddingVertical: 6,
    justifyContent: 'center',
  },
  landingTopMenuButtonActive: {
    borderColor: 'rgba(139,92,246,0.55)',
    backgroundColor: 'rgba(139,92,246,0.18)',
  },
  landingTopMenuText: {
    color: '#F7F1FF',
    fontSize: 13,
    fontWeight: '700',
  },
  landingTopMenuTextActive: {
    color: '#FFFFFF',
  },
  landingHeroSection: {
    minHeight: 640,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
    gap: 16,
  },
  landingHeroIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundImage: 'linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03))',
    backgroundColor: 'rgba(139,92,246,0.18)',
    backdropFilter: 'blur(14px)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  landingHeroIcon: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
  },
  landingHeroTitle: {
    color: '#FFFFFF',
    fontSize: 62,
    lineHeight: 66,
    fontWeight: '800',
    textAlign: 'center',
    maxWidth: 980,
  },
  landingHeroSubtitle: {
    color: '#EBDFFF',
    fontSize: 21,
    lineHeight: 31,
    textAlign: 'center',
    maxWidth: 920,
  },
  landingHeroActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  landingPrimaryCta: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.40)',
    backgroundImage: 'linear-gradient(135deg, rgba(139,92,246,0.85), rgba(59,130,246,0.65))',
    backgroundColor: '#8C5BF5',
    boxShadow: '0 18px 40px rgba(139,92,246,0.18)',
    minHeight: 44,
    paddingHorizontal: 18,
    paddingVertical: 11,
    justifyContent: 'center',
  },
  landingPrimaryCtaText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  landingSecondaryCta: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    backdropFilter: 'blur(14px)',
    minHeight: 44,
    paddingHorizontal: 18,
    paddingVertical: 11,
    justifyContent: 'center',
  },
  landingSecondaryCtaText: {
    color: '#F7F1FF',
    fontSize: 14,
    fontWeight: '700',
  },
  landingTrustText: {
    marginTop: 20,
    color: '#C9B8EA',
    fontSize: 13,
    fontWeight: '600',
  },
  landingLogosRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 18,
    marginTop: 2,
  },
  landingLogoItem: {
    color: '#D8C8F3',
    fontSize: 16,
    fontWeight: '600',
  },
  landingShowcaseSection: {
    width: '100%',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundImage: 'linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03))',
    backgroundColor: 'rgba(10,14,24,0.82)',
    backdropFilter: 'blur(14px)',
    boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
    paddingHorizontal: 20,
    paddingVertical: 22,
    gap: 14,
  },
  landingSectionTitle: {
    color: '#FFFFFF',
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '800',
  },
  landingSectionEyebrow: {
    color: '#FD9CFD',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  landingSectionText: {
    color: '#EBDFFF',
    fontSize: 17,
    lineHeight: 26,
  },
  landingFeatureGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 4,
  },
  landingFeatureCard: {
    flex: 1,
    minWidth: 210,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundImage: 'linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03))',
    backgroundColor: 'rgba(255,255,255,0.04)',
    backdropFilter: 'blur(14px)',
    boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
    overflow: 'hidden',
    borderRadius: 12,
    padding: 14,
    gap: 6,
  },
  landingFeatureTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  landingFeatureText: {
    color: '#EBDFFF',
    fontSize: 12,
    lineHeight: 18,
  },
  landingShowcasePanel: {
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundImage: 'linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03))',
    backgroundColor: 'rgba(255,255,255,0.04)',
    backdropFilter: 'blur(14px)',
    boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
    overflow: 'hidden',
  },
  landingShowcaseHeader: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  landingShowcaseHeaderText: {
    color: '#F1E8FF',
    fontSize: 12,
    fontWeight: '600',
  },
  landingShowcaseGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 12,
    gap: 10,
  },
  landingShowcaseColumn: {
    flex: 1,
    minWidth: 220,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: 12,
    backgroundImage: 'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))',
    backgroundColor: 'transparent',
    backdropFilter: 'blur(14px)',
    boxShadow: 'none',
    overflow: 'hidden',
    padding: 10,
    gap: 6,
  },
  landingShowcaseColumnTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  landingShowcaseItem: {
    color: '#EBDFFF',
    fontSize: 12,
    lineHeight: 17,
  },
  landingBottomActions: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  adminShell: {
    flexDirection: 'row',
    gap: 0,
    alignItems: 'flex-start',
    flex: 1,
  },
  adminNavPane: {
    width: 264,
    minWidth: 264,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: 16,
    backgroundImage: 'linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))',
    backgroundColor: 'rgba(255,255,255,0.04)',
    backdropFilter: 'blur(20px)',
    boxShadow: '0 8px 32px rgba(0,0,0,0.22)',
    overflow: 'hidden',
    paddingVertical: 12,
    paddingHorizontal: 8,
    gap: 2,
    alignSelf: 'stretch',
  },
  adminNavPaneCompact: {
    width: '100%',
    minWidth: 0,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignSelf: 'auto',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 10,
    gap: 6,
  },
  adminNavSection: {
    gap: 2,
  },
  adminNavSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: 'transparent',
    gap: 8,
  },
  adminNavSectionHeaderActive: {
    backgroundColor: 'rgba(167,139,250,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.28)',
  },
  adminNavSectionHeaderLabel: {
    color: '#F8F5FF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: -0.2,
    flex: 1,
  },
  adminNavSectionChevron: {
    color: '#A78BFA',
    fontSize: 11,
    fontWeight: '700',
  },
  adminNavSectionDescription: {
    color: 'rgba(232,236,255,0.55)',
    fontSize: 10,
    lineHeight: 14,
    paddingHorizontal: 14,
    paddingBottom: 6,
    paddingTop: 2,
  },
  adminNavItem: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    paddingLeft: 26,
    borderRadius: 10,
    backgroundColor: 'transparent',
  },
  adminNavItemActive: {
    backgroundColor: 'rgba(167,139,250,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.22)',
  },
  adminNavItemLabel: {
    color: '#C4B5FD',
    fontSize: 12,
    fontWeight: '600',
  },
  adminNavItemLabelActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  adminNavItemDetail: {
    color: 'rgba(232,236,255,0.45)',
    fontSize: 10,
    lineHeight: 13,
    paddingTop: 2,
  },
  adminContentPane: {
    flex: 1,
    minWidth: 320,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: 16,
    backgroundImage: 'linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))',
    backgroundColor: 'rgba(255,255,255,0.04)',
    backdropFilter: 'blur(20px)',
    boxShadow: '0 8px 32px rgba(0,0,0,0.22)',
    overflow: 'hidden',
    paddingLeft: 16,
    paddingRight: 16,
    paddingVertical: 12,
    gap: 14,
    marginLeft: 12,
  },
  adminContentPaneCompact: {
    paddingLeft: 12,
    paddingTop: 12,
    marginLeft: 0,
    marginTop: 8,
  },
  adminContentHeader: {
    backgroundImage: 'linear-gradient(135deg, rgba(111,75,207,0.18) 0%, rgba(59,130,246,0.10) 100%)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backdropFilter: 'blur(18px)',
    padding: 20,
    gap: 8,
  },
  adminContentTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  adminContentDescription: {
    color: 'rgba(232,236,255,0.72)',
    fontSize: 13,
    lineHeight: 20,
  },
};

function parseColor(value: string) {
  const hexMatch = value.match(/^#([0-9a-fA-F]{6})$/);
  if (hexMatch) {
    const hex = hexMatch[1];
    return {
      type: 'hex' as const,
      r: parseInt(hex.slice(0, 2), 16),
      g: parseInt(hex.slice(2, 4), 16),
      b: parseInt(hex.slice(4, 6), 16),
      a: 1,
    };
  }

  const rgbaMatch = value.match(/^rgba\((\d+),\s*(\d+),\s*(\d+),\s*([0-9.]+)\)$/);
  if (rgbaMatch) {
    return {
      type: 'rgba' as const,
      r: Number(rgbaMatch[1]),
      g: Number(rgbaMatch[2]),
      b: Number(rgbaMatch[3]),
      a: Number(rgbaMatch[4]),
    };
  }

  return null;
}

function toRgbaString(r: number, g: number, b: number, a: number) {
  return `rgba(${Math.round(r)},${Math.round(g)},${Math.round(b)},${a})`;
}

function luminance(r: number, g: number, b: number) {
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

function transformColorForDay(value: string, property: string) {
  const color = parseColor(value);
  if (!color) {
    return value;
  }

  const isText = property === 'color';
  const isBackground = property.toLowerCase().includes('backgroundcolor');
  const isBorder = property.toLowerCase().includes('bordercolor');
  const isDark = luminance(color.r, color.g, color.b) < 0.45;

  if (isText) {
    if (!isDark) {
      return toRgbaString(34, 24, 52, color.a);
    }
    return toRgbaString(
      Math.min(color.r + 10, 82),
      Math.min(color.g + 8, 74),
      Math.min(color.b + 14, 92),
      color.a,
    );
  }

  if (isBackground) {
    if (isDark) {
      return toRgbaString(
        Math.min(246, color.r + 182),
        Math.min(245, color.g + 182),
        Math.min(250, color.b + 182),
        color.a,
      );
    }
    return toRgbaString(
      Math.min(250, color.r + 8),
      Math.min(248, color.g + 8),
      Math.min(252, color.b + 8),
      color.a,
    );
  }

  if (isBorder) {
    if (isDark) {
      return toRgbaString(124, 98, 178, Math.max(0.38, color.a));
    }
    return toRgbaString(120, 94, 170, Math.max(0.34, color.a));
  }

  return value;
}

const dayStyleObject = Object.fromEntries(
  Object.entries(nightStyleObject).map(([styleKey, styleValue]) => {
    if (!styleValue || typeof styleValue !== 'object') {
      return [styleKey, styleValue];
    }

    const transformed = Object.fromEntries(
      Object.entries(styleValue).map(([property, value]) => {
        if (typeof value === 'string') {
          return [property, transformColorForDay(value, property)];
        }
        return [property, value];
      }),
    );

    return [styleKey, transformed];
  }),
);

const dayOverrides = {
  root: {
    backgroundColor: '#F5F1FF',
    backgroundImage: 'radial-gradient(1200px 700px at 18% 8%, rgba(139,92,246,.10), transparent 55%), radial-gradient(900px 650px at 82% 18%, rgba(34,197,94,.06), transparent 60%), radial-gradient(900px 650px at 45% 100%, rgba(59,130,246,.06), transparent 60%), linear-gradient(180deg, #F5F1FF, #EDE6FC)',
  },
  dashboardSidebar: {
    backgroundImage: 'linear-gradient(180deg, rgba(239,232,252,0.92), rgba(245,241,255,0.85))',
    backgroundColor: 'rgba(239,232,252,0.88)',
    borderColor: 'rgba(102,74,154,0.28)',
    boxShadow: '0 4px 24px rgba(102,74,154,0.10)',
  },
  dashboardHamburgerButton: {
    borderColor: 'rgba(112,85,163,0.56)',
    backgroundColor: 'rgba(112,85,163,0.18)',
  },
  dashboardHamburgerButtonText: {
    color: '#2E2148',
  },
  dashboardMainPane: {
    backgroundImage: 'linear-gradient(180deg, rgba(251,248,255,0.92), rgba(245,241,255,0.85))',
    backgroundColor: 'rgba(251,248,255,0.88)',
    borderColor: 'rgba(102,74,154,0.28)',
    boxShadow: '0 4px 24px rgba(102,74,154,0.10)',
  },
  dashboardMainHeader: {
    backgroundColor: 'transparent',
    borderBottomColor: 'rgba(102,74,154,0.22)',
  },
  dashboardDraftBanner: {
    backgroundColor: 'rgba(111,75,207,0.12)',
    borderBottomColor: 'rgba(102,74,154,0.24)',
  },
  dashboardDraftText: {
    color: '#4A3A69',
  },
  dashboardBottomStatusText: {
    color: '#4A3A69',
  },
  dashboardSectionLabel: {
    color: '#5C477F',
  },
  dashboardNavItemText: {
    color: '#2E2148',
  },
  dashboardNavItemDesc: {
    color: 'rgba(46,33,72,0.45)',
  },
  dashboardNavItemActive: {
    backgroundColor: '#6F4BCF',
  },
  dashboardTenantChevron: {
    color: '#2E2148',
  },
  dashboardTenantNavItem: {
    borderColor: 'rgba(112,85,163,0.5)',
    backgroundColor: 'rgba(112,85,163,0.12)',
  },
  dashboardTenantNavItemActive: {
    borderColor: 'rgba(111,75,207,0.88)',
    backgroundColor: 'rgba(111,75,207,0.78)',
  },
  dashboardTenantNavItemText: {
    color: '#2F2249',
  },
  dashboardNavItemTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  dashboardRoleItemText: {
    color: '#2F2249',
  },
  dashboardRoleItem: {
    borderColor: 'rgba(112,85,163,0.46)',
    backgroundColor: 'rgba(112,85,163,0.12)',
  },
  dashboardRoleItemActive: {
    borderColor: 'rgba(111,75,207,0.88)',
    backgroundColor: 'rgba(111,75,207,0.78)',
  },
  dashboardRoleItemTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  dashboardSidebarActionText: {
    color: '#2F2248',
  },
  dashboardSidebarAction: {
    borderColor: 'rgba(112,85,163,0.52)',
    backgroundColor: 'rgba(112,85,163,0.12)',
  },
  dashboardSidebarActionActive: {
    borderColor: 'rgba(111,75,207,0.9)',
    backgroundColor: 'rgba(111,75,207,0.8)',
  },
  dashboardSidebarActionTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  dashboardUserText: {
    color: '#4E3D6E',
  },
  card: {
    backgroundImage: 'linear-gradient(180deg, rgba(251,248,255,0.9), rgba(245,241,255,0.82))',
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderColor: 'rgba(112,85,163,0.28)',
    boxShadow: '0 4px 24px rgba(102,74,154,0.10)',
  },
  tenantWidgetCard: {
    backgroundImage: 'linear-gradient(180deg, rgba(251,248,255,0.9), rgba(245,241,255,0.82))',
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderColor: 'rgba(102,74,154,0.18)',
    boxShadow: '0 4px 24px rgba(102,74,154,0.10)',
  },
  moduleWidgetCard: {
    backgroundImage: 'linear-gradient(180deg, rgba(251,248,255,0.9), rgba(245,241,255,0.82))',
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderColor: 'rgba(102,74,154,0.18)',
    boxShadow: '0 4px 24px rgba(102,74,154,0.10)',
  },
  bodyText: {
    color: '#111111',
    fontSize: 13,
    lineHeight: 20,
  },
  sectionTitle: {
    color: '#1E293B',
  },
  sectionDetail: {
    color: '#475569',
  },
  adminSidebar: {
    backgroundColor: 'rgba(245,241,255,0.75)',
  },
  textInput: {
    borderColor: 'rgba(115,88,165,0.52)',
    backgroundColor: 'rgba(255,255,255,0.96)',
    color: '#2D2142',
  },
  pillButton: {
    borderColor: 'rgba(112,85,163,0.36)',
    backgroundColor: 'rgba(112,85,163,0.08)',
  },
  pillButtonActive: {
    borderColor: '#7C3AED',
    backgroundColor: 'rgba(124,58,237,0.16)',
  },
  pillButtonText: {
    color: '#4A3A69',
  },
  pillButtonTextActive: {
    color: '#6D28D9',
  },
  metaText: {
    color: '#111111',
    fontSize: 11,
    lineHeight: 16,
  },
  notice: {
    color: '#111111',
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderColor: 'rgba(115,88,165,0.62)',
    color: '#2D2142',
  },
  secondaryButton: {
    borderColor: 'rgba(112,85,163,0.64)',
    backgroundColor: 'rgba(112,85,163,0.2)',
  },
  secondaryButtonText: {
    color: '#111111',
  },
  dashboardHeaderButton: {
    borderColor: 'rgba(111,75,207,0.5)',
    backgroundColor: 'rgba(111,75,207,0.14)',
  },
  dashboardHeaderButtonText: {
    color: '#111111',
  },
  dashboardHeaderPrimaryButton: {
    backgroundColor: '#7A52E8',
  },
  dashboardHeaderPrimaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  pill: {
    borderColor: 'rgba(111,75,207,0.22)',
    backgroundColor: 'rgba(111,75,207,0.06)',
  },
  pillActive: {
    borderColor: 'rgba(111,75,207,0.72)',
    backgroundColor: 'rgba(111,75,207,0.14)',
  },
  pillText: {
    color: '#4A3A69',
  },
  pillTextActive: {
    color: '#6F4BCF',
    fontWeight: '800',
  },
  buttonDisabled: {
    opacity: 0.38,
  },
  primaryButton: {
    backgroundColor: '#7A52E8',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  loadingWrap: {
    backgroundColor: '#F4F0FB',
  },
  loadingText: {
    color: '#352552',
  },
  authWrap: {
    backgroundColor: '#F5F1FF',
    backgroundImage: 'radial-gradient(1200px 700px at 18% 8%, rgba(139,92,246,.10), transparent 55%), radial-gradient(900px 650px at 82% 18%, rgba(34,197,94,.06), transparent 60%), radial-gradient(900px 650px at 45% 100%, rgba(59,130,246,.06), transparent 60%), linear-gradient(180deg, #F5F1FF, #EDE6FC)',
  },
  authSubTitle: {
    color: '#3D2D5F',
  },
  landingWrap: {
    backgroundColor: 'transparent',
  },
  landingTopBar: {
    backgroundImage: 'linear-gradient(180deg, rgba(255,255,255,0.85), rgba(255,255,255,0.72))',
    backgroundColor: 'rgba(255,255,255,0.80)',
    borderColor: 'rgba(102,74,154,0.22)',
    boxShadow: '0 12px 40px rgba(102,74,154,0.12)',
  },
  sectionEyebrow: {
    color: '#5A467E',
  },
  sectionLeadText: {
    color: '#2F224A',
  },
  landingShowcaseSection: {
    backgroundImage: 'linear-gradient(180deg, rgba(255,255,255,0.85), rgba(255,255,255,0.72))',
    backgroundColor: 'rgba(255,255,255,0.80)',
    borderColor: 'rgba(102,74,154,0.22)',
    boxShadow: '0 4px 24px rgba(102,74,154,0.10)',
  },
  landingShowcasePanel: {
    backgroundImage: 'linear-gradient(180deg, rgba(251,248,255,0.9), rgba(245,241,255,0.82))',
    backgroundColor: 'rgba(251,248,255,0.85)',
    borderColor: 'rgba(102,74,154,0.18)',
    boxShadow: '0 4px 24px rgba(102,74,154,0.10)',
  },
  adminNavPane: {
    backgroundImage: 'linear-gradient(180deg, rgba(255,255,255,0.88), rgba(255,255,255,0.75))',
    backgroundColor: 'rgba(255,255,255,0.82)',
    borderColor: 'rgba(102,74,154,0.18)',
    boxShadow: '0 4px 24px rgba(102,74,154,0.08)',
  },
  adminNavSectionHeaderActive: {
    backgroundColor: 'rgba(111,75,207,0.08)',
    borderColor: 'rgba(111,75,207,0.20)',
  },
  adminNavSectionHeaderLabel: {
    color: '#1E1535',
  },
  adminNavSectionChevron: {
    color: '#6F4BCF',
  },
  adminNavSectionDescription: {
    color: '#5C477F',
  },
  adminNavItemActive: {
    backgroundColor: 'rgba(111,75,207,0.10)',
    borderColor: 'rgba(111,75,207,0.18)',
  },
  adminNavItemLabel: {
    color: '#4A3A69',
  },
  adminNavItemLabelActive: {
    color: '#6F4BCF',
  },
  adminNavItemDetail: {
    color: '#7A6A9A',
  },
  adminContentPane: {
    backgroundImage: 'linear-gradient(180deg, rgba(255,255,255,0.88), rgba(255,255,255,0.75))',
    backgroundColor: 'rgba(255,255,255,0.82)',
    borderColor: 'rgba(102,74,154,0.18)',
    boxShadow: '0 4px 24px rgba(102,74,154,0.08)',
  },
  adminContentHeader: {
    backgroundImage: 'linear-gradient(135deg, rgba(111,75,207,0.06) 0%, rgba(59,130,246,0.04) 100%)',
    borderColor: 'rgba(102,74,154,0.16)',
  },
  adminContentTitle: {
    color: '#1E1535',
  },
  adminContentDescription: {
    color: '#4A3A69',
  },
  authCard: {
    backgroundImage: 'linear-gradient(180deg, rgba(255,255,255,0.85), rgba(255,255,255,0.72))',
    backgroundColor: 'rgba(255,255,255,0.80)',
    borderColor: 'rgba(102,74,154,0.22)',
    boxShadow: '0 4px 24px rgba(102,74,154,0.10)',
  },
  builderPreviewHeroCard: {
    backgroundImage: 'linear-gradient(180deg, rgba(251,248,255,0.9), rgba(245,241,255,0.82))',
    backgroundColor: 'rgba(255,255,255,0.90)',
    borderColor: 'rgba(111,75,207,0.28)',
    boxShadow: '0 4px 24px rgba(102,74,154,0.10)',
  },
  builderPreviewHeroTitle: {
    color: '#111111',
  },
  builderPreviewHeroSubtitle: {
    color: '#111111',
  },
  builderPreviewStatCard: {
    backgroundImage: 'linear-gradient(180deg, rgba(251,248,255,0.9), rgba(245,241,255,0.82))',
    backgroundColor: '#FFFFFF',
    borderColor: 'rgba(111,75,207,0.3)',
    boxShadow: '0 4px 24px rgba(102,74,154,0.10)',
  },
  builderPreviewStatValue: {
    color: '#111111',
  },
  builderPreviewStatLabel: {
    color: '#111111',
  },
  builderPreviewFieldRow: {
    backgroundImage: 'linear-gradient(180deg, rgba(251,248,255,0.9), rgba(245,241,255,0.82))',
    backgroundColor: '#FFFFFF',
    borderColor: 'rgba(112,85,163,0.36)',
    boxShadow: '0 4px 24px rgba(102,74,154,0.10)',
  },
  builderSectionCard: {
    backgroundImage: 'linear-gradient(180deg, rgba(251,248,255,0.9), rgba(245,241,255,0.82))',
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderColor: 'rgba(111,75,207,0.28)',
    boxShadow: '0 4px 24px rgba(102,74,154,0.10)',
  },
  builderFormSection: {
    backgroundImage: 'linear-gradient(180deg, rgba(251,248,255,0.9), rgba(245,241,255,0.82))',
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderColor: 'rgba(111,75,207,0.28)',
    boxShadow: '0 4px 24px rgba(102,74,154,0.10)',
  },
  builderFormSectionHeaderRail: {
    borderRightColor: 'rgba(112,85,163,0.22)',
  },
  builderFormSectionTitle: {
    color: '#2D2142',
  },
  builderFormSectionText: {
    color: '#4F3D71',
  },
  builderSectionTitle: {
    color: '#2D2142',
  },
  builderSectionHint: {
    color: '#4F3D71',
  },
  builderStudioTextPrimary: {
    color: '#1F2937',
  },
  builderStudioTextSecondary: {
    color: '#64748B',
  },
  builderConfigPane: {
    backgroundImage: 'linear-gradient(180deg, rgba(255,255,255,0.85), rgba(255,255,255,0.72))',
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderColor: 'rgba(111,75,207,0.34)',
    boxShadow: '0 4px 24px rgba(102,74,154,0.10)',
  },
  builderPreviewCard: {
    backgroundImage: 'linear-gradient(180deg, rgba(255,255,255,0.85), rgba(255,255,255,0.72))',
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderColor: 'rgba(111,75,207,0.34)',
    boxShadow: '0 4px 24px rgba(102,74,154,0.10)',
  },
  builderDropZone: {
    borderColor: 'rgba(111,75,207,0.58)',
    backgroundColor: 'rgba(111,75,207,0.12)',
  },
  builderCreateModeBanner: {
    borderColor: 'rgba(176,130,38,0.55)',
    backgroundColor: 'rgba(250,225,120,0.28)',
  },
  builderCreateModeBannerText: {
    color: '#5E4719',
  },
  builderCreateModeBannerClose: {
    borderColor: 'rgba(176,130,38,0.62)',
    backgroundColor: 'rgba(255,255,255,0.58)',
  },
  builderCreateModeBannerCloseText: {
    color: '#5E4719',
  },
  builderDetailsFormPanel: {
    backgroundImage: 'linear-gradient(180deg, rgba(251,248,255,0.9), rgba(245,241,255,0.82))',
    backgroundColor: '#FFFFFF',
    borderColor: 'rgba(112,85,163,0.36)',
    boxShadow: '0 4px 24px rgba(102,74,154,0.10)',
  },
  builderDetailsFormRow: {
    borderBottomColor: 'rgba(112,85,163,0.22)',
  },
  builderDetailsFormLabel: {
    color: '#2D2142',
  },
  builderDetailsFormInput: {
    backgroundColor: 'rgba(112,85,163,0.12)',
    borderColor: 'rgba(112,85,163,0.38)',
  },
  builderDetailsFormInputText: {
    color: '#4A3B68',
  },
  builderDetailsFormType: {
    color: '#5E4A84',
  },
  endUserWorkspaceRail: {
    backgroundImage: 'linear-gradient(180deg, rgba(251,248,255,0.9), rgba(245,241,255,0.82))',
    backgroundColor: '#FFFFFF',
    borderColor: 'rgba(112,85,163,0.32)',
    boxShadow: '0 4px 24px rgba(102,74,154,0.10)',
  },
  endUserWorkspaceShell: {
    backgroundImage: 'linear-gradient(180deg, rgba(255,255,255,0.85), rgba(255,255,255,0.72))',
    backgroundColor: '#FFFFFF',
    borderColor: 'rgba(112,85,163,0.32)',
    boxShadow: '0 4px 24px rgba(102,74,154,0.10)',
  },
  endUserWorkspaceRailLabel: {
    color: '#5D4B83',
  },
  endUserWorkspaceTab: {
    backgroundImage: 'linear-gradient(180deg, rgba(251,248,255,0.9), rgba(245,241,255,0.82))',
    borderColor: 'rgba(112,85,163,0.42)',
    backgroundColor: 'rgba(255,255,255,0.90)',
    boxShadow: '0 4px 24px rgba(102,74,154,0.10)',
  },
  endUserWorkspaceTabActive: {
    borderColor: 'rgba(111,75,207,0.92)',
    backgroundColor: 'rgba(111,75,207,0.78)',
  },
  endUserWorkspaceTabStep: {
    color: '#2E2148',
  },
  endUserWorkspaceTabStepActive: {
    color: '#FFFFFF',
  },
  endUserWorkspaceTabName: {
    color: '#4A3B68',
  },
  endUserWorkspaceTabNameActive: {
    color: '#FFFFFF',
  },
  endUserHierarchyCard: {
    backgroundImage: 'linear-gradient(180deg, rgba(251,248,255,0.9), rgba(245,241,255,0.82))',
    borderColor: 'rgba(112,85,163,0.32)',
    backgroundColor: 'rgba(255,255,255,0.88)',
    boxShadow: '0 4px 24px rgba(102,74,154,0.10)',
  },
  endUserHierarchyCardText: {
    color: '#2E2148',
  },
  listCard: {
    backgroundImage: 'linear-gradient(180deg, rgba(251,248,255,0.9), rgba(245,241,255,0.82))',
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderColor: 'rgba(112,85,163,0.28)',
    boxShadow: '0 4px 24px rgba(102,74,154,0.10)',
  },
  kpiCard: {
    backgroundImage: 'linear-gradient(180deg, rgba(251,248,255,0.9), rgba(245,241,255,0.82))',
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderColor: 'rgba(112,85,163,0.28)',
    boxShadow: '0 4px 24px rgba(102,74,154,0.10)',
  },
  detailPanel: {
    backgroundImage: 'linear-gradient(180deg, rgba(251,248,255,0.9), rgba(245,241,255,0.82))',
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderColor: 'rgba(112,85,163,0.28)',
    boxShadow: '0 4px 24px rgba(102,74,154,0.10)',
  },
  processCard: {
    backgroundImage: 'linear-gradient(180deg, rgba(251,248,255,0.9), rgba(245,241,255,0.82))',
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderColor: 'rgba(112,85,163,0.28)',
    boxShadow: '0 4px 24px rgba(102,74,154,0.10)',
  },
  modalCard: {
    backgroundImage: 'linear-gradient(180deg, rgba(255,255,255,0.85), rgba(255,255,255,0.72))',
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderColor: 'rgba(102,74,154,0.22)',
    boxShadow: '0 4px 24px rgba(102,74,154,0.10)',
  },
  dashboardBottomActionBar: {
    backgroundImage: 'linear-gradient(180deg, rgba(251,248,255,0.9), rgba(245,241,255,0.82))',
    backgroundColor: 'rgba(255,255,255,0.88)',
    borderTopColor: 'rgba(102,74,154,0.18)',
  },
};

for (const [styleKey, overrideValues] of Object.entries(dayOverrides)) {
  const existing = (dayStyleObject as any)[styleKey] ?? {};
  (dayStyleObject as any)[styleKey] = {
    ...existing,
    ...overrideValues,
  };
}

const nightStyles = StyleSheet.create(nightStyleObject as any);
// Ensure landing styles exist in day mode too
dayStyleObject.landingWrap = {
  flex: 1,
  backgroundColor: 'transparent',
};
dayStyleObject.landingContent = {
  flexGrow: 1,
  paddingBottom: 36,
};
dayStyleObject.landingTopMenu = {
  flexDirection: 'row',
  gap: 8,
};
dayStyleObject.landingTopMenuText = {
  color: '#4A3B68',
  fontSize: 13,
  fontWeight: '700',
};
const dayStyles = StyleSheet.create(dayStyleObject as any);

export function getStyles(mode: ThemeMode) {
  return mode === 'day' ? dayStyles : nightStyles;
}
