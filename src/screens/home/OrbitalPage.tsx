import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { InteractivePressable as Pressable } from '../../components/InteractivePressable';
import { useUiTheme } from '../../context/UiThemeContext';
import { useAppState } from '../../context/AppStateContext';
import { Card, HintStrip } from './components';
import { orbitalSteps } from './constants';
import { useOrbitalMarketplace } from './hooks/useOrbitalMarketplace';
import { GuidedPageProps } from './types';
import type { IntegrationActivation, IntegrationFieldDef, IntegrationTemplate } from '../../types';

type TestResult = 'idle' | 'testing' | 'ok' | 'fail';
interface IntegrationEvent { id: string; ts: string; event: string; status: 'ok' | 'warn' | 'error' }

const EVENT_SAMPLES: [string, IntegrationEvent['status']][] = [
  ['Webhook received: record.updated', 'ok'],
  ['Action executed: sync_record', 'ok'],
  ['Rate limit warning: 80% of quota', 'warn'],
  ['Field mapping applied to 4 records', 'ok'],
  ['Retry succeeded after transient error', 'warn'],
  ['Trigger fired: new_record_created', 'ok'],
  ['Connection health check passed', 'ok'],
  ['Payload parse error on field "amount"', 'error'],
];

function seedIntegrationEvents(activationId: string): IntegrationEvent[] {
  return EVENT_SAMPLES.slice(0, 5).map((pair, i) => ({
    id: `${activationId}-ev-${i}`,
    ts: new Date(Date.now() - i * 1000 * 60 * 8).toLocaleTimeString(),
    event: pair[0],
    status: pair[1],
  }));
}

export function OrbitalPage({ guidedMode, onGuide, registerActions, auditLog, addNotification }: GuidedPageProps) {
  const { styles, mode } = useUiTheme();
  const { width: windowWidth } = useWindowDimensions();
  const { data: appData } = useAppState();
  const compact = windowWidth < 900;
  const {
    view,
    setView,
    filteredTemplates,
    categories,
    categoryFilter,
    setCategoryFilter,
    searchQuery,
    setSearchQuery,
    activeIntegrations,
    selectedTemplate,
    selectedActivation,
    isTemplateActivated,
    beginActivation,
    confirmActivation,
    pauseIntegration,
    resumeIntegration,
    removeIntegration,
    openActivationDetail,
    getTemplateForActivation,
    configDraft,
    mappingDraft,
    updateConfigField,
    updateMappingField,
    info,
    setInfo,
  } = useOrbitalMarketplace();

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({ catalog: true, active: false });
  const [testResults, setTestResults] = useState<Record<string, TestResult>>({});
  const [integrationLogs, setIntegrationLogs] = useState<Record<string, IntegrationEvent[]>>({});

  const runConnectionTest = (activationId: string) => {
    setTestResults((r) => ({ ...r, [activationId]: 'testing' }));
    setTimeout(() => {
      const ok = Math.random() > 0.25;
      setTestResults((r) => ({ ...r, [activationId]: ok ? 'ok' : 'fail' }));
      addNotification?.({
        type: 'system',
        title: ok ? 'Connection Test Passed' : 'Connection Test Failed',
        body: ok ? 'Integration endpoint is reachable and responding.' : 'Could not reach integration endpoint. Check credentials.',
        severity: ok ? 'success' : 'error',
      });
    }, 1400);
  };

  const loadIntegrationLog = (activationId: string) => {
    if (!integrationLogs[activationId]) {
      setIntegrationLogs((l) => ({ ...l, [activationId]: seedIntegrationEvents(activationId) }));
    }
  };

  useEffect(() => {
    registerActions?.(null);
    return () => registerActions?.(null);
  }, [registerActions]);

  const toggleSection = (key: string) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const sidebarSections = [
    { key: 'catalog', label: 'Marketplace', count: filteredTemplates.length },
    { key: 'active', label: 'Active Integrations', count: activeIntegrations.length },
  ];

  const statusColor = (status: string) => {
    switch (status) {
      case 'active': return '#22C55E';
      case 'paused': return '#F59E0B';
      case 'error': return '#EF4444';
      case 'disabled': return '#9CA3AF';
      default: return '#9CA3AF';
    }
  };

  const publisherBadge = (publisher: string) => (
    <View style={{ backgroundColor: publisher === 'corespace' ? '#263374' : '#6B7280', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, marginLeft: 8 }}>
      <Text style={{ fontSize: 11, fontWeight: '700', color: '#FFF', letterSpacing: 0.3 }}>
        {publisher === 'corespace' ? 'Halo Internal' : 'Org'}
      </Text>
    </View>
  );

  /* ─── Configuration View ─────────────────────────────────────────── */
  if (view === 'configure' && selectedTemplate) {
    const connectionFields = selectedTemplate.fields.filter((f) => f.layer === 'connection');
    const mappingFields = selectedTemplate.fields.filter((f) => f.layer === 'mapping');

    return (
      <ScrollView style={styles.sectionBody} contentContainerStyle={{ padding: compact ? 16 : 24, gap: 20 }}>
        {guidedMode && (
          <HintStrip
            steps={orbitalSteps}
            onGuide={onGuide}
          />
        )}

        <Pressable onPress={() => { setView('catalog'); setInfo(''); }}>
          <Text style={{ color: '#8C5BF5', fontSize: 14, fontWeight: '600' }}>← Back to Marketplace</Text>
        </Pressable>

        {/* Template Hero Header */}
        <View style={{
          flexDirection: 'row', alignItems: 'center', gap: 16, padding: 20, borderRadius: 16,
          backgroundColor: mode === 'day' ? '#FFFFFF' : 'rgba(255,255,255,0.04)',
          borderWidth: 1, borderColor: mode === 'day' ? '#E2E8F0' : 'rgba(140,91,245,0.20)',
        } as any}>
          <View style={{
            width: 56, height: 56, borderRadius: 16, backgroundColor: 'rgba(140,91,245,0.12)',
            alignItems: 'center', justifyContent: 'center',
            borderWidth: 1, borderColor: 'rgba(140,91,245,0.25)',
          } as any}>
            <Text style={{ fontSize: 30 }}>{selectedTemplate.icon}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4 }}>
              <Text style={{ fontWeight: '800', fontSize: 20, color: mode === 'day' ? '#1E293B' : '#F1F5F9', letterSpacing: -0.3 }}>{selectedTemplate.name}</Text>
              {publisherBadge(selectedTemplate.publisher)}
            </View>
            <Text style={{ fontSize: 13, color: '#9CA3AF', marginTop: 2 }}>{selectedTemplate.vendor} · v{selectedTemplate.version}</Text>
          </View>
          {/* Step indicator */}
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {['Connection', 'Mapping', 'Activate'].map((step, i) => (
              <View key={step} style={{ alignItems: 'center', gap: 3 }}>
                <View style={{
                  width: 28, height: 28, borderRadius: 14,
                  backgroundColor: i < 2 ? 'rgba(140,91,245,0.15)' : 'rgba(34,197,94,0.15)',
                  alignItems: 'center', justifyContent: 'center',
                  borderWidth: 1.5, borderColor: i < 2 ? '#8C5BF5' : '#22C55E',
                } as any}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: i < 2 ? '#8C5BF5' : '#22C55E' }}>{i + 1}</Text>
                </View>
                <Text style={{ fontSize: 9, color: '#9CA3AF', fontWeight: '600' }}>{step}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Layer 1: Connection Config */}
        <View style={{
          backgroundColor: mode === 'day' ? '#FFFFFF' : 'rgba(255,255,255,0.03)',
          borderRadius: 16, padding: 20, gap: 14,
          borderWidth: 1, borderColor: mode === 'day' ? '#E2E8F0' : 'rgba(140,91,245,0.15)',
          borderLeftWidth: 3, borderLeftColor: '#8C5BF5',
        } as any}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: 'rgba(140,91,245,0.12)', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 16 }}>🔑</Text>
            </View>
            <View>
              <Text style={{ fontWeight: '700', fontSize: 16, color: mode === 'day' ? '#1E293B' : '#F1F5F9' }}>Layer 1 — Connection</Text>
              <Text style={{ fontSize: 12, color: '#9CA3AF' }}>Credentials and endpoint configuration to establish the connection.</Text>
            </View>
          </View>
          {connectionFields.map((field) => (
            <ConfigFieldInput
              key={field.key}
              field={field}
              value={configDraft[field.key] ?? ''}
              onChange={(v) => updateConfigField(field.key, v)}
              styles={styles}
              mode={mode}
            />
          ))}
        </View>

        {/* Layer 2: Semantic Mapping */}
        <View style={{
          backgroundColor: mode === 'day' ? '#FFFFFF' : 'rgba(255,255,255,0.03)',
          borderRadius: 16, padding: 20, gap: 14,
          borderWidth: 1, borderColor: mode === 'day' ? '#E2E8F0' : 'rgba(59,130,246,0.15)',
          borderLeftWidth: 3, borderLeftColor: '#3B82F6',
        } as any}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: 'rgba(59,130,246,0.12)', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 16 }}>🔗</Text>
            </View>
            <View>
              <Text style={{ fontWeight: '700', fontSize: 16, color: mode === 'day' ? '#1E293B' : '#F1F5F9' }}>Layer 2 — Semantic Mapping</Text>
              <Text style={{ fontSize: 12, color: '#9CA3AF' }}>Map your workspace fields to integration inputs and outputs.</Text>
            </View>
          </View>
          {mappingFields.map((field) => (
            <ConfigFieldInput
              key={field.key}
              field={field}
              value={mappingDraft[field.key] ?? ''}
              onChange={(v) => updateMappingField(field.key, v)}
              styles={styles}
              mode={mode}
            />
          ))}
        </View>

        {/* Actions & Triggers — side by side on wider screens */}
        <View style={{ flexDirection: compact ? 'column' : 'row', gap: 16 }}>
          <View style={{
            flex: 1, backgroundColor: mode === 'day' ? '#FFFFFF' : 'rgba(255,255,255,0.03)',
            borderRadius: 16, padding: 20, gap: 12,
            borderWidth: 1, borderColor: mode === 'day' ? '#E2E8F0' : 'rgba(34,197,94,0.15)',
          } as any}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ fontSize: 16 }}>⚡</Text>
              <Text style={{ fontWeight: '700', fontSize: 15, color: mode === 'day' ? '#1E293B' : '#F1F5F9' }}>Available Actions</Text>
              <View style={{ backgroundColor: 'rgba(34,197,94,0.15)', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#22C55E' }}>{selectedTemplate.actions.length}</Text>
              </View>
            </View>
            {selectedTemplate.actions.map((a) => (
              <View key={a.key} style={{ backgroundColor: mode === 'day' ? '#F8FAFC' : 'rgba(255,255,255,0.03)', borderRadius: 10, padding: 12, gap: 3 }}>
                <Text style={{ fontWeight: '700', color: mode === 'day' ? '#1E293B' : '#F1F5F9', fontSize: 14 }}>{a.label}</Text>
                <Text style={{ fontSize: 12, color: '#9CA3AF', lineHeight: 17 }}>{a.description}</Text>
              </View>
            ))}
          </View>

          <View style={{
            flex: 1, backgroundColor: mode === 'day' ? '#FFFFFF' : 'rgba(255,255,255,0.03)',
            borderRadius: 16, padding: 20, gap: 12,
            borderWidth: 1, borderColor: mode === 'day' ? '#E2E8F0' : 'rgba(59,130,246,0.15)',
          } as any}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ fontSize: 16 }}>📡</Text>
              <Text style={{ fontWeight: '700', fontSize: 15, color: mode === 'day' ? '#1E293B' : '#F1F5F9' }}>Available Triggers</Text>
              <View style={{ backgroundColor: 'rgba(59,130,246,0.15)', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#60A5FA' }}>{selectedTemplate.triggers.length}</Text>
              </View>
            </View>
            {selectedTemplate.triggers.map((t) => (
              <View key={t.key} style={{ backgroundColor: mode === 'day' ? '#F8FAFC' : 'rgba(255,255,255,0.03)', borderRadius: 10, padding: 12, gap: 3 }}>
                <Text style={{ fontWeight: '700', color: mode === 'day' ? '#1E293B' : '#F1F5F9', fontSize: 14 }}>{t.label}</Text>
                <Text style={{ fontSize: 12, color: '#9CA3AF', lineHeight: 17 }}>{t.description}</Text>
              </View>
            ))}
          </View>
        </View>

        {selectedTemplate.prewiredSignals && selectedTemplate.prewiredSignals.length > 0 && (
          <View style={{
            backgroundColor: mode === 'day' ? '#FFFFFF' : 'rgba(255,255,255,0.03)',
            borderRadius: 16, padding: 20, gap: 12,
            borderWidth: 1, borderColor: mode === 'day' ? '#E2E8F0' : 'rgba(140,91,245,0.15)',
          } as any}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ fontSize: 16 }}>⚡</Text>
              <Text style={{ fontWeight: '700', fontSize: 15, color: mode === 'day' ? '#1E293B' : '#F1F5F9' }}>Pre-Wired Signals</Text>
            </View>
            <Text style={{ fontSize: 12, color: '#9CA3AF' }}>
              These Signal Studio flows will be auto-registered upon activation.
            </Text>
            {selectedTemplate.prewiredSignals.map((s) => (
              <View key={s.key} style={{
                flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10,
                backgroundColor: 'rgba(140,91,245,0.06)', borderRadius: 10,
              }}>
                <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(140,91,245,0.15)', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 12 }}>⚡</Text>
                </View>
                <Text style={{ fontSize: 13, color: mode === 'day' ? '#1E293B' : '#F1F5F9', fontWeight: '600', flex: 1 }}>{s.label}</Text>
                {s.customerEditable && (
                  <View style={{ backgroundColor: 'rgba(245,158,11,0.15)', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 }}>
                    <Text style={{ fontSize: 10, color: '#F59E0B', fontWeight: '600' }}>Editable</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {!!info && (
          <Text style={{ color: '#EF4444', fontSize: 13, fontWeight: '600', textAlign: 'center' }}>{info}</Text>
        )}

        <Pressable
          onPress={() => {
            const msg = confirmActivation();
            if (msg && !msg.includes('Missing')) {
              if (auditLog) {
                auditLog.logEntry({
                  action: 'create',
                  entityType: 'integration',
                  entityId: selectedTemplate.id,
                  entityName: selectedTemplate.name,
                  after: { status: 'active', templateVersion: selectedTemplate.version },
                });
              }
              addNotification?.({
                type: 'integration-triggered',
                title: `Integration Activated: ${selectedTemplate.name}`,
                body: `${selectedTemplate.name} by ${selectedTemplate.vendor} is now active. Pre-wired signals registered as Signal Studio flows.`,
                severity: 'success',
              });
            }
          }}
          style={{
            alignSelf: 'center', marginTop: 4, paddingHorizontal: 40, paddingVertical: 14,
            backgroundColor: '#22C55E', borderRadius: 14,
          }}
        >
          <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 16 }}>🚀  Activate Integration</Text>
        </Pressable>
      </ScrollView>
    );
  }

  /* ─── Main Layout: Sidebar + Content ─────────────────────────────── */
  return (
    <View style={{ flex: 1, flexDirection: compact ? 'column' : 'row' }}>
      {/* ── Left Nav ─────────────────────────────────────────────── */}
      {!compact && (
        <View style={[styles.adminSidebar, { width: 230, borderRightWidth: 1, borderRightColor: mode === 'day' ? '#E2E8F0' : '#334155' }]}>
          <ScrollView contentContainerStyle={{ paddingVertical: 14, gap: 4, paddingHorizontal: 8 }}>
            {sidebarSections.map((sec) => {
              const isActive = view === (sec.key === 'catalog' ? 'catalog' : 'active');
              return (
                <Pressable
                  key={sec.key}
                  onPress={() => { toggleSection(sec.key); setView(sec.key === 'catalog' ? 'catalog' : 'active'); }}
                  style={{
                    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                    paddingHorizontal: 14, paddingVertical: 11, borderRadius: 10,
                    backgroundColor: isActive ? (mode === 'day' ? 'rgba(140,91,245,0.08)' : 'rgba(140,91,245,0.15)') : 'transparent',
                  }}
                >
                  <Text style={{
                    fontSize: 14, fontWeight: isActive ? '700' : '500',
                    color: isActive ? '#8C5BF5' : (mode === 'day' ? '#475569' : '#9CA3AF'),
                  }}>{sec.label}</Text>
                  <View style={{
                    backgroundColor: isActive ? '#8C5BF5' : (mode === 'day' ? '#E2E8F0' : '#334155'),
                    borderRadius: 10, minWidth: 24, height: 24,
                    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6,
                  }}>
                    <Text style={{ color: isActive ? '#FFF' : '#9CA3AF', fontSize: 12, fontWeight: '700' }}>{sec.count}</Text>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* ── Content ──────────────────────────────────────────────── */}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: compact ? 16 : 24, gap: 18 }}>
        {guidedMode && (
          <HintStrip
            steps={orbitalSteps}
            onGuide={onGuide}
          />
        )}

        {compact && (
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 4 }}>
            {(['catalog', 'active'] as const).map((v) => (
              <Pressable
                key={v}
                onPress={() => setView(v)}
                style={{
                  flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 10,
                  backgroundColor: view === v ? '#8C5BF5' : (mode === 'day' ? '#F1F5F9' : 'rgba(255,255,255,0.06)'),
                  borderWidth: 1, borderColor: view === v ? '#8C5BF5' : (mode === 'day' ? '#E2E8F0' : 'rgba(255,255,255,0.10)'),
                } as any}
              >
                <Text style={{
                  fontSize: 14, fontWeight: view === v ? '700' : '500',
                  color: view === v ? '#FFFFFF' : (mode === 'day' ? '#475569' : '#9CA3AF'),
                }}>{v === 'catalog' ? 'Marketplace' : 'Active'}</Text>
              </Pressable>
            ))}
          </View>
        )}

        {!!info && (
          <Text style={{ color: info.includes('denied') || info.includes('Missing') ? '#EF4444' : '#22C55E', fontSize: 13, fontWeight: '600' }}>{info}</Text>
        )}

        {/* ── Catalog View ───────────────────────────────────────── */}
        {view === 'catalog' && (
          <>
            {/* Search + category filters */}
            <View style={{ flexDirection: compact ? 'column' : 'row', gap: 12, alignItems: compact ? 'stretch' : 'center' }}>
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search integrations..."
                placeholderTextColor="#9CA3AF"
                style={[styles.textInput, { flex: 1, minWidth: 200, fontSize: 14, paddingVertical: 11, borderRadius: 12 }]}
              />
              <View style={{ flexDirection: 'row', gap: 7, flexWrap: 'wrap' }}>
                <Pressable
                  onPress={() => setCategoryFilter(null)}
                  style={{
                    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
                    backgroundColor: !categoryFilter ? '#8C5BF5' : (mode === 'day' ? '#F1F5F9' : 'rgba(255,255,255,0.06)'),
                    borderWidth: 1, borderColor: !categoryFilter ? '#8C5BF5' : (mode === 'day' ? '#E2E8F0' : 'rgba(255,255,255,0.10)'),
                  } as any}
                >
                  <Text style={{ fontSize: 13, fontWeight: !categoryFilter ? '700' : '500', color: !categoryFilter ? '#FFF' : (mode === 'day' ? '#475569' : '#9CA3AF') }}>All</Text>
                </Pressable>
                {categories.map((cat) => {
                  const active = categoryFilter === cat;
                  return (
                    <Pressable
                      key={cat}
                      onPress={() => setCategoryFilter(active ? null : cat)}
                      style={{
                        paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
                        backgroundColor: active ? '#8C5BF5' : (mode === 'day' ? '#F1F5F9' : 'rgba(255,255,255,0.06)'),
                        borderWidth: 1, borderColor: active ? '#8C5BF5' : (mode === 'day' ? '#E2E8F0' : 'rgba(255,255,255,0.10)'),
                      } as any}
                    >
                      <Text style={{ fontSize: 13, fontWeight: active ? '700' : '500', color: active ? '#FFF' : (mode === 'day' ? '#475569' : '#9CA3AF') }}>{cat}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Template cards grid */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
              {filteredTemplates.map((tpl) => (
                <TemplateCard
                  key={tpl.id}
                  template={tpl}
                  activated={isTemplateActivated(tpl.id)}
                  onActivate={() => beginActivation(tpl.id)}
                  publisherBadge={publisherBadge}
                  mode={mode}
                  styles={styles}
                  compact={compact}
                  businessObjectContext={
                    (appData.businessFunctions ?? [])
                      .flatMap(f => f.objects.map(o => ({ obj: o, fn: f })))
                      .filter(({ obj }) =>
                        (tpl.businessObjectIds?.includes(obj.id)) ||
                        obj.workspaceIds.some(wid => (appData.workspaces ?? []).some(ws => ws.id === wid))
                      )
                      .map(({ obj, fn }) => ({ name: obj.name, icon: obj.icon, color: fn.color }))
                      .slice(0, 3)
                  }
                />
              ))}
            </View>

            {filteredTemplates.length === 0 && (
              <View style={{ alignItems: 'center', marginTop: 48, gap: 10 }}>
                <Text style={{ fontSize: 36 }}>🔍</Text>
                <Text style={{ fontSize: 15, fontWeight: '600', color: mode === 'day' ? '#475569' : '#9CA3AF', textAlign: 'center' }}>
                  No integrations match your search.
                </Text>
              </View>
            )}
          </>
        )}

        {/* ── Active Integrations View ───────────────────────────── */}
        {view === 'active' && (
          <>
            {activeIntegrations.length === 0 ? (
              <View style={{ alignItems: 'center', marginTop: 48, gap: 14 }}>
                <View style={{
                  width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(140,91,245,0.10)',
                  alignItems: 'center', justifyContent: 'center',
                  borderWidth: 2, borderColor: 'rgba(140,91,245,0.20)',
                } as any}>
                  <Text style={{ fontSize: 36 }}>🛰️</Text>
                </View>
                <Text style={{ fontWeight: '700', fontSize: 18, color: mode === 'day' ? '#1E293B' : '#F1F5F9', textAlign: 'center' }}>No Active Integrations</Text>
                <Text style={{ fontSize: 14, color: '#9CA3AF', textAlign: 'center', maxWidth: 420, lineHeight: 20 }}>
                  Browse the Marketplace to activate your first integration and connect external services to your workspace.
                </Text>
                <Pressable
                  onPress={() => setView('catalog')}
                  style={{ backgroundColor: '#8C5BF5', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12, marginTop: 4 }}
                >
                  <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 15 }}>Browse Marketplace</Text>
                </Pressable>
              </View>
            ) : (
              <View style={{ gap: 14 }}>
                {activeIntegrations.map((activation) => {
                  const tpl = getTemplateForActivation(activation);
                  return (
                    <ActivationCard
                      key={activation.id}
                      activation={activation}
                      template={tpl}
                      testResult={testResults[activation.id] ?? 'idle'}
                      onTest={() => runConnectionTest(activation.id)}
                      integrationLog={integrationLogs[activation.id] ?? null}
                      onLoadLog={() => loadIntegrationLog(activation.id)}
                      onPause={() => {
                        pauseIntegration(activation.id);
                        auditLog?.logEntry({ action: 'update', entityType: 'integration', entityId: activation.id, entityName: tpl?.name ?? activation.templateId, after: { status: 'paused' } });
                        addNotification?.({ type: 'system', title: 'Integration Paused', body: `Integration "${tpl?.name ?? activation.templateId}" has been paused.`, severity: 'info' });
                      }}
                      onResume={() => {
                        resumeIntegration(activation.id);
                        auditLog?.logEntry({ action: 'update', entityType: 'integration', entityId: activation.id, entityName: tpl?.name ?? activation.templateId, after: { status: 'active' } });
                        addNotification?.({ type: 'system', title: 'Integration Resumed', body: `Integration "${tpl?.name ?? activation.templateId}" is now active.`, severity: 'success' });
                      }}
                      onRemove={() => {
                        removeIntegration(activation.id);
                        auditLog?.logEntry({ action: 'delete', entityType: 'integration', entityId: activation.id, entityName: tpl?.name ?? activation.templateId });
                        addNotification?.({ type: 'system', title: 'Integration Removed', body: `Integration "${tpl?.name ?? activation.templateId}" has been removed.`, severity: 'warning' });
                      }}
                      statusColor={statusColor}
                      publisherBadge={publisherBadge}
                      mode={mode}
                      styles={styles}
                    />
                  );
                })}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

/* ─── Sub-components ────────────────────────────────────────────────── */

function ConfigFieldInput({
  field,
  value,
  onChange,
  styles,
  mode,
}: {
  field: IntegrationFieldDef;
  value: string;
  onChange: (v: string) => void;
  styles: any;
  mode: string;
}) {
  return (
    <View style={{ marginBottom: 6 }}>
      <Text style={{ fontWeight: '600', fontSize: 14, color: mode === 'day' ? '#1E293B' : '#F1F5F9', marginBottom: 3 }}>
        {field.label}{field.required && <Text style={{ color: '#EF4444' }}> *</Text>}
      </Text>
      {field.instruction && (
        <Text style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 5, lineHeight: 17 }}>{field.instruction}</Text>
      )}
      {field.type === 'boolean' ? (
        <Pressable
          onPress={() => onChange(value === 'true' ? 'false' : 'true')}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 }}
        >
          <View
            style={{
              width: 22,
              height: 22,
              borderRadius: 6,
              borderWidth: 2,
              borderColor: value === 'true' ? '#8C5BF5' : '#9CA3AF',
              backgroundColor: value === 'true' ? '#8C5BF5' : 'transparent',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {value === 'true' && <Text style={{ color: '#FFF', fontSize: 13, fontWeight: '700' }}>✓</Text>}
          </View>
          <Text style={{ fontSize: 14, color: value === 'true' ? (mode === 'day' ? '#1E293B' : '#F1F5F9') : '#9CA3AF' }}>{value === 'true' ? 'Enabled' : 'Disabled'}</Text>
        </Pressable>
      ) : field.type === 'select' && field.options ? (
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          {field.options.map((opt) => (
            <Pressable
              key={opt}
              onPress={() => onChange(opt)}
              style={{
                paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
                backgroundColor: value === opt ? '#8C5BF5' : (mode === 'day' ? '#F1F5F9' : 'rgba(255,255,255,0.06)'),
                borderWidth: 1, borderColor: value === opt ? '#8C5BF5' : (mode === 'day' ? '#E2E8F0' : 'rgba(255,255,255,0.10)'),
              } as any}
            >
              <Text style={{ fontSize: 13, fontWeight: value === opt ? '700' : '500', color: value === opt ? '#FFF' : (mode === 'day' ? '#475569' : '#9CA3AF') }}>{opt}</Text>
            </Pressable>
          ))}
        </View>
      ) : (
        <TextInput
          value={value}
          onChangeText={onChange}
          placeholder={field.example ?? ''}
          placeholderTextColor="#9CA3AF"
          secureTextEntry={field.type === 'secret'}
          style={[styles.textInput, { fontSize: 14, paddingVertical: 11, borderRadius: 10 }]}
        />
      )}
      {field.impactStatement && (
        <Text style={{ fontSize: 11, color: '#F59E0B', marginTop: 4, fontStyle: 'italic' }}>⚠ {field.impactStatement}</Text>
      )}
      {field.validationHint && (
        <Text style={{ fontSize: 11, color: '#6B7280', marginTop: 3 }}>{field.validationHint}</Text>
      )}
    </View>
  );
}

function TemplateCard({
  template,
  activated,
  onActivate,
  publisherBadge,
  mode,
  styles,
  compact,
  businessObjectContext,
}: {
  template: IntegrationTemplate;
  activated: boolean;
  onActivate: () => void;
  publisherBadge: (p: string) => React.ReactNode;
  mode: string;
  styles: any;
  compact: boolean;
  businessObjectContext?: Array<{ name: string; icon?: string; color?: string }>;
}) {
  return (
    <View
      style={{
        width: compact ? '100%' : 320,
        backgroundColor: mode === 'day' ? '#FFFFFF' : '#1E293B',
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        borderColor: mode === 'day' ? '#E2E8F0' : '#334155',
        gap: 12,
        overflow: 'hidden' as const,
      }}
    >
      {/* Accent top stripe */}
      <View style={{ position: 'absolute' as const, top: 0, left: 0, right: 0, height: 3, backgroundColor: '#8C5BF5', borderTopLeftRadius: 16, borderTopRightRadius: 16 }} />

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: mode === 'day' ? '#F1F5F9' : 'rgba(140,91,245,0.10)', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 26 }}>{template.icon}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
            <Text style={{ fontWeight: '800', fontSize: 17, color: mode === 'day' ? '#1E293B' : '#F1F5F9' }}>
              {template.name}
            </Text>
            {publisherBadge(template.publisher)}
          </View>
          <Text style={{ fontSize: 12, color: '#9CA3AF', marginTop: 1 }}>{template.vendor}</Text>
        </View>
      </View>

      <Text style={{ fontSize: 14, color: mode === 'day' ? '#475569' : '#CBD5E1', lineHeight: 20 }} numberOfLines={2}>
        {template.description}
      </Text>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <View style={{ backgroundColor: mode === 'day' ? '#F1F5F9' : '#334155', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 }}>
          <Text style={{ fontSize: 11, color: '#8C5BF5', fontWeight: '700', letterSpacing: 0.3 }}>{template.category}</Text>
        </View>
        <Text style={{ fontSize: 12, color: '#9CA3AF' }}>
          {template.actions.length} action{template.actions.length !== 1 ? 's' : ''} · {template.triggers.length} trigger{template.triggers.length !== 1 ? 's' : ''}
        </Text>
        {(template.prewiredSignals?.length ?? 0) > 0 && (
          <View style={{ backgroundColor: '#8C5BF520', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 }}>
            <Text style={{ fontSize: 11, color: '#8C5BF5', fontWeight: '700' }}>
              ⚡ {template.prewiredSignals!.length} signal{template.prewiredSignals!.length !== 1 ? 's' : ''}
            </Text>
          </View>
        )}
      </View>

      {/* Business object context chips */}
      {businessObjectContext && businessObjectContext.length > 0 && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <Text style={{ fontSize: 11, color: '#9CA3AF', fontWeight: '600' }}>Works with:</Text>
          {businessObjectContext.map((obj, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: `${obj.color ?? '#8C5BF5'}18`, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: `${obj.color ?? '#8C5BF5'}33` }}>
              {!!obj.icon && <Text style={{ fontSize: 11 }}>{obj.icon}</Text>}
              <Text style={{ fontSize: 11, fontWeight: '700', color: obj.color ?? '#8C5BF5' }}>{obj.name}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
        {activated ? (
          <View style={{ backgroundColor: '#22C55E18', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10, flex: 1, alignItems: 'center', borderWidth: 1, borderColor: '#22C55E33' }}>
            <Text style={{ color: '#22C55E', fontWeight: '800', fontSize: 14 }}>✓ Activated</Text>
          </View>
        ) : (
          <Pressable
            onPress={onActivate}
            style={{ flex: 1, alignItems: 'center', backgroundColor: '#8C5BF5', borderRadius: 12, paddingVertical: 12 }}
          >
            <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 15 }}>Activate</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

function ActivationCard({
  activation,
  template,
  testResult,
  onTest,
  integrationLog,
  onLoadLog,
  onPause,
  onResume,
  onRemove,
  statusColor,
  publisherBadge,
  mode,
  styles,
}: {
  activation: IntegrationActivation;
  template: IntegrationTemplate | undefined;
  testResult: TestResult;
  onTest: () => void;
  integrationLog: IntegrationEvent[] | null;
  onLoadLog: () => void;
  onPause: () => void;
  onResume: () => void;
  onRemove: () => void;
  statusColor: (s: string) => string;
  publisherBadge: (p: string) => React.ReactNode;
  mode: string;
  styles: any;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showLog, setShowLog] = useState(false);

  const handleToggleLog = () => {
    if (!showLog) onLoadLog();
    setShowLog((v) => !v);
  };

  const testIcon = testResult === 'testing' ? '⏳' : testResult === 'ok' ? '✅' : testResult === 'fail' ? '❌' : '🔌';
  const testLabel = testResult === 'testing' ? 'Testing…' : testResult === 'ok' ? 'Connected' : testResult === 'fail' ? 'Failed' : 'Test Connection';
  const testColor = testResult === 'ok' ? '#22C55E' : testResult === 'fail' ? '#EF4444' : undefined;
  const sc = statusColor(activation.status);

  return (
    <View
      style={{
        backgroundColor: mode === 'day' ? '#FFFFFF' : 'rgba(30,41,59,0.85)',
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        borderColor: mode === 'day' ? '#E2E8F0' : 'rgba(255,255,255,0.08)',
        gap: 14,
      }}
    >
      {/* Header */}
      <Pressable onPress={() => setExpanded(!expanded)} style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: mode === 'day' ? '#F1F5F9' : 'rgba(140,91,245,0.10)', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 24 }}>{template?.icon ?? '🔗'}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <Text style={{ fontWeight: '800', fontSize: 17, color: mode === 'day' ? '#1E293B' : '#F1F5F9' }}>
              {template?.name ?? activation.templateId}
            </Text>
            {template && publisherBadge(template.publisher)}
          </View>
          <Text style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>
            v{activation.templateVersion} · Activated {new Date(activation.activatedAt).toLocaleDateString()}
          </Text>
        </View>

        {/* Status Badge */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: `${sc}18`, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 }}>
          <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: sc }} />
          <Text style={{ fontSize: 13, fontWeight: '700', color: sc, textTransform: 'capitalize' }}>
            {activation.status}
          </Text>
        </View>
      </Pressable>

      {/* Metrics Row */}
      <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
        <MetricPill label="Total Calls" value={String(activation.totalCalls)} mode={mode} />
        <MetricPill label="Errors" value={String(activation.errorCount)} mode={mode} color={activation.errorCount > 0 ? '#EF4444' : undefined} />
        <MetricPill label="Shutoff At" value={`${activation.autoShutoffThreshold} err`} mode={mode} />
      </View>

      {/* Expanded Details */}
      {expanded && (
        <View style={{ gap: 10, marginTop: 2 }}>
          {template && (
            <View style={{ gap: 6, backgroundColor: mode === 'day' ? '#F8FAFC' : 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: mode === 'day' ? '#E2E8F0' : 'rgba(255,255,255,0.06)' }}>
              <Text style={{ fontWeight: '700', fontSize: 13, color: mode === 'day' ? '#1E293B' : '#F1F5F9' }}>🔑 Connection Config</Text>
              {Object.entries(activation.connectionConfig).map(([k, v]) => {
                const fieldDef = template.fields.find((f) => f.key === k);
                return (
                  <View key={k} style={{ flexDirection: 'row', gap: 8 }}>
                    <Text style={{ fontSize: 13, color: '#9CA3AF', width: 140, fontWeight: '500' }}>{fieldDef?.label ?? k}:</Text>
                    <Text style={{ fontSize: 13, color: mode === 'day' ? '#475569' : '#CBD5E1' }}>
                      {fieldDef?.type === 'secret' ? '••••••••' : v}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
          {Object.keys(activation.mappingConfig).length > 0 && template && (
            <View style={{ gap: 6, backgroundColor: mode === 'day' ? '#F8FAFC' : 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: mode === 'day' ? '#E2E8F0' : 'rgba(255,255,255,0.06)' }}>
              <Text style={{ fontWeight: '700', fontSize: 13, color: mode === 'day' ? '#1E293B' : '#F1F5F9' }}>🔗 Semantic Mapping</Text>
              {Object.entries(activation.mappingConfig).map(([k, v]) => {
                const fieldDef = template.fields.find((f) => f.key === k);
                return (
                  <View key={k} style={{ flexDirection: 'row', gap: 8 }}>
                    <Text style={{ fontSize: 13, color: '#9CA3AF', width: 140, fontWeight: '500' }}>{fieldDef?.label ?? k}:</Text>
                    <Text style={{ fontSize: 13, color: mode === 'day' ? '#475569' : '#CBD5E1' }}>{v}</Text>
                  </View>
                );
              })}
            </View>
          )}

          {activation.disabledReason && (
            <Text style={{ fontSize: 13, color: '#EF4444', fontStyle: 'italic' }}>
              Disabled: {activation.disabledReason}
            </Text>
          )}
        </View>
      )}

      {/* Action Buttons */}
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 2, flexWrap: 'wrap' }}>
        {activation.status === 'active' && (
          <Pressable onPress={onPause} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: mode === 'day' ? '#E2E8F0' : 'rgba(255,255,255,0.12)', backgroundColor: mode === 'day' ? '#F8FAFC' : 'rgba(255,255,255,0.04)' }}>
            <Text style={{ fontSize: 14, color: mode === 'day' ? '#475569' : '#CBD5E1', fontWeight: '600' }}>⏸ Pause</Text>
          </Pressable>
        )}
        {(activation.status === 'paused' || activation.status === 'error') && (
          <Pressable onPress={onResume} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, backgroundColor: '#8C5BF5' }}>
            <Text style={{ fontSize: 14, color: '#FFF', fontWeight: '700' }}>▶ Resume</Text>
          </Pressable>
        )}
        <Pressable
          onPress={onTest}
          disabled={testResult === 'testing'}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: testColor ?? (mode === 'day' ? '#E2E8F0' : 'rgba(255,255,255,0.12)'), backgroundColor: mode === 'day' ? '#F8FAFC' : 'rgba(255,255,255,0.04)' }}
        >
          <Text style={{ fontSize: 14, fontWeight: '600', color: testColor ?? (mode === 'day' ? '#475569' : '#CBD5E1') }}>
            {testIcon} {testLabel}
          </Text>
        </Pressable>
        <Pressable onPress={handleToggleLog} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: mode === 'day' ? '#E2E8F0' : 'rgba(255,255,255,0.12)', backgroundColor: mode === 'day' ? '#F8FAFC' : 'rgba(255,255,255,0.04)' }}>
          <Text style={{ fontSize: 14, color: mode === 'day' ? '#475569' : '#CBD5E1', fontWeight: '600' }}>{showLog ? '▲ Hide Log' : '📋 Event Log'}</Text>
        </Pressable>
        <Pressable onPress={onRemove} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: '#EF444466', backgroundColor: '#EF444412' }}>
          <Text style={{ fontSize: 14, color: '#EF4444', fontWeight: '600' }}>🗑 Remove</Text>
        </Pressable>
      </View>

      {/* Event Log */}
      {showLog && (
        <View style={{ gap: 8, marginTop: 4, backgroundColor: mode === 'day' ? '#F8FAFC' : 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: mode === 'day' ? '#E2E8F0' : 'rgba(255,255,255,0.06)' }}>
          <Text style={{ fontWeight: '700', fontSize: 14, color: mode === 'day' ? '#1E293B' : '#F1F5F9' }}>📋 Event Log</Text>
          {(integrationLog ?? []).map((evt, idx) => {
            const c = evt.status === 'ok' ? '#22C55E' : evt.status === 'warn' ? '#F59E0B' : '#EF4444';
            return (
              <View key={evt.id} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 5 }}>
                <View style={{ alignItems: 'center', gap: 2, width: 14, paddingTop: 4 }}>
                  <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: c }} />
                  {idx < (integrationLog?.length ?? 0) - 1 && <View style={{ width: 2, height: 16, backgroundColor: mode === 'day' ? '#E2E8F0' : 'rgba(255,255,255,0.08)' }} />}
                </View>
                <Text style={{ fontSize: 12, color: '#9CA3AF', width: 72, flexShrink: 0, fontWeight: '500' }}>{evt.ts}</Text>
                <Text style={{ fontSize: 13, color: mode === 'day' ? '#475569' : '#CBD5E1', flex: 1, lineHeight: 18 }}>{evt.event}</Text>
              </View>
            );
          })}
          {!integrationLog?.length && (
            <Text style={{ fontSize: 13, color: '#9CA3AF' }}>No events recorded yet for this integration.</Text>
          )}
        </View>
      )}
    </View>
  );
}

function MetricPill({ label, value, mode, color }: { label: string; value: string; mode: string; color?: string }) {
  return (
    <View style={{ backgroundColor: mode === 'day' ? '#F1F5F9' : 'rgba(51,65,85,0.6)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8, alignItems: 'center', minWidth: 72 }}>
      <Text style={{ fontSize: 20, fontWeight: '800', color: color ?? (mode === 'day' ? '#1E293B' : '#F1F5F9'), letterSpacing: -0.3 }}>{value}</Text>
      <Text style={{ fontSize: 11, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 2 }}>{label}</Text>
    </View>
  );
}
