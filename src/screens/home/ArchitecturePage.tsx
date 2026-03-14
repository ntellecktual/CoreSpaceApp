import React, { useState } from 'react';
import { ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { InteractivePressable as Pressable } from '../../components/InteractivePressable';
import { useAppState } from '../../context/AppStateContext';
import { useUiTheme } from '../../context/UiThemeContext';
import { Card, HintStrip, ProcessStepper } from './components';
import { architectureSteps } from './constants';
import { GuidedPageProps } from './types';

export function ArchitecturePage({ guidedMode, onGuide }: GuidedPageProps) {
  const { styles } = useUiTheme();
  const { width: windowWidth } = useWindowDimensions();
  const { activeTenantId, activeTenantName } = useAppState();
  const [archNav, setArchNav] = useState<'blueprint' | 'tenant'>('blueprint');
  const [expandedArchSections, setExpandedArchSections] = useState<Record<string, boolean>>({ architecture: true, tenant: false });

  const useCompactArchShell = windowWidth < 900;

  const toggleArchSection = (section: string) => {
    setExpandedArchSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const archNavSections = [
    {
      key: 'architecture',
      label: 'Platform Architecture',
      description: 'Logical layers, service boundaries, and system design.',
      items: [
        { label: 'System Blueprint', detail: 'CoreSpace layers from admin to runtime', onPress: () => setArchNav('blueprint') },
      ],
    },
    {
      key: 'tenant',
      label: 'Tenant Context',
      description: 'Current tenant scope and data isolation boundaries.',
      items: [
        { label: 'Tenant Overview', detail: 'Active tenant identity and scope', onPress: () => setArchNav('tenant') },
      ],
    },
  ];

  const archNavToSection: Record<string, string> = {
    blueprint: 'architecture',
    tenant: 'tenant',
  };

  const archActiveNavItemKey = archNav === 'blueprint' ? 'System Blueprint' : 'Tenant Overview';

  const archContentHeaders: Record<string, { title: string; description: string }> = {
    blueprint: {
      title: 'System Blueprint',
      description: 'How CoreSpace is organized — from the admin design layer all the way to the end-user runtime and data persistence.',
    },
    tenant: {
      title: 'Tenant Overview',
      description: 'Each organization gets its own isolated data and configuration — here’s the current tenant in scope.',
    },
  };

  return (
    <ScrollView style={styles.pageWrap} contentContainerStyle={[styles.pageContent, styles.pageContentTight]} keyboardShouldPersistTaps="handled">
      {guidedMode && (
        <>
          <ProcessStepper title="CoreSpace Documentation Guide" steps={architectureSteps} activeIndex={0} />
          <HintStrip steps={architectureSteps} onGuide={onGuide} />
        </>
      )}

      <View style={[styles.adminShell, useCompactArchShell && { flexDirection: 'column' }]}>
        {/* ── Left Pane: Architecture Navigation ── */}
        <View style={[styles.adminNavPane, useCompactArchShell && styles.adminNavPaneCompact]}>
          {archNavSections.map((section) => {
            const isExpanded = expandedArchSections[section.key];
            const isSectionActive = archNavToSection[archNav] === section.key;
            return (
              <View key={section.key} style={styles.adminNavSection}>
                <Pressable
                  style={[styles.adminNavSectionHeader, isSectionActive && styles.adminNavSectionHeaderActive]}
                  onPress={() => {
                    toggleArchSection(section.key);
                    if (!isSectionActive) {
                      section.items[0]?.onPress();
                    }
                  }}
                >
                  <Text style={styles.adminNavSectionHeaderLabel}>{section.label}</Text>
                  <Text style={styles.adminNavSectionChevron}>{isExpanded ? '▾' : '▸'}</Text>
                </Pressable>
                {isExpanded && (
                  <>
                    <Text style={styles.adminNavSectionDescription}>{section.description}</Text>
                    {section.items.map((item) => {
                      const isActive = archActiveNavItemKey === item.label;
                      return (
                        <Pressable
                          key={item.label}
                          style={[styles.adminNavItem, isActive && styles.adminNavItemActive]}
                          onPress={item.onPress}
                        >
                          <Text style={[styles.adminNavItemLabel, isActive && styles.adminNavItemLabelActive]}>{item.label}</Text>
                          {!!item.detail && <Text style={styles.adminNavItemDetail}>{item.detail}</Text>}
                        </Pressable>
                      );
                    })}
                  </>
                )}
              </View>
            );
          })}
        </View>

        {/* ── Right Pane: Active Section Content ── */}
        <View style={[styles.adminContentPane, useCompactArchShell && styles.adminContentPaneCompact]}>
          <View style={styles.adminContentHeader}>
            <Text style={styles.adminContentTitle}>{archContentHeaders[archNav].title}</Text>
            <Text style={styles.adminContentDescription}>{archContentHeaders[archNav].description}</Text>
          </View>

          {archNav === 'blueprint' && (
            <Card title="Platform Diagram (logical)" blurred>
              <Text style={styles.diagram}>
                {`[Admin App]
   ├─ Workspace Creator
   │   └─ Workspace → SubSpace → Form Builder → Details
   ├─ Form Builder
   ├─ Data Tags / Definitions
   └─ Signal Studio

[Runtime App]
   ├─ Workspace + SubSpace Views
   ├─ Governed Drawers / Forms
   └─ Counted tabs + dynamic visibility

[Free API Integrations]
   ├─ OpenFDA Drug Lookup (NDC search, recall data)
   ├─ Exchange Rate API (live currency conversion)
   ├─ REST Countries (country data, flags, currencies)
   └─ Intl Formatting (currency, numbers, relative time)

[Core Services]
   ├─ Rules & Visibility Engine
   ├─ Events & Audit
   ├─ Crypto-safe ID Generation
   └─ Config Insights

[Isolation]
   ├─ Org DB (PostgreSQL per org)
   └─ Org Storage (Blob per org)`}
              </Text>
            </Card>
          )}

          {archNav === 'tenant' && (
            <Card title="Tenant Overview" blurred>
              <Text style={styles.bullet}>• Active tenant: {activeTenantName}</Text>
              <Text style={styles.bullet}>• Tenant ID: {activeTenantId}</Text>
              <Text style={styles.bullet}>• Scope: Tenant-specific data and configuration</Text>
            </Card>
          )}
        </View>
      </View>
    </ScrollView>
  );
}
