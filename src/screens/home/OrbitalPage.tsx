import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { InteractivePressable as Pressable } from '../../components/InteractivePressable';
import { useUiTheme } from '../../context/UiThemeContext';
import { Card, HintStrip } from './components';
import { orbitalSteps } from './constants';
import { useOrbitalMarketplace } from './hooks/useOrbitalMarketplace';
import { GuidedPageProps } from './types';
import type { IntegrationActivation, IntegrationFieldDef, IntegrationTemplate } from '../../types';

export function OrbitalPage({ guidedMode, onGuide, registerActions, auditLog, addNotification }: GuidedPageProps) {
  const { styles, mode } = useUiTheme();
  const { width: windowWidth } = useWindowDimensions();
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
    <View style={{ backgroundColor: publisher === 'corespace' ? '#8C5BF5' : '#6B7280', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, marginLeft: 6 }}>
      <Text style={{ fontSize: 10, fontWeight: '700', color: '#FFF' }}>
        {publisher === 'corespace' ? 'CoreSpace' : 'Org'}
      </Text>
    </View>
  );

  /* ─── Configuration View ─────────────────────────────────────────── */
  if (view === 'configure' && selectedTemplate) {
    const connectionFields = selectedTemplate.fields.filter((f) => f.layer === 'connection');
    const mappingFields = selectedTemplate.fields.filter((f) => f.layer === 'mapping');

    return (
      <ScrollView style={styles.sectionBody} contentContainerStyle={{ padding: 16, gap: 16 }}>
        {guidedMode && (
          <HintStrip
            steps={orbitalSteps}
            stepIndex={1}
            onPress={() => onGuide(orbitalSteps[1])}
          />
        )}

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <Pressable onPress={() => { setView('catalog'); setInfo(''); }}>
            <Text style={{ color: '#8C5BF5', fontSize: 14, fontWeight: '600' }}>← Back to Marketplace</Text>
          </Pressable>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <Text style={{ fontSize: 28 }}>{selectedTemplate.icon}</Text>
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>{selectedTemplate.name}</Text>
              {publisherBadge(selectedTemplate.publisher)}
            </View>
            <Text style={styles.sectionDetail}>{selectedTemplate.vendor} · v{selectedTemplate.version}</Text>
          </View>
        </View>

        {/* Layer 1: Connection Config */}
        <Card title="Layer 1 — Connection" styles={styles}>
          <Text style={[styles.sectionDetail, { marginBottom: 8 }]}>
            Credentials and endpoint configuration to establish the connection.
          </Text>
          {connectionFields.map((field) => (
            <ConfigFieldInput
              key={field.key}
              field={field}
              value={configDraft[field.key] ?? ''}
              onChange={(v) => updateConfigField(field.key, v)}
              styles={styles}
            />
          ))}
        </Card>

        {/* Layer 2: Semantic Mapping */}
        <Card title="Layer 2 — Semantic Mapping" styles={styles}>
          <Text style={[styles.sectionDetail, { marginBottom: 8 }]}>
            Map your workspace fields to integration inputs and outputs.
          </Text>
          {mappingFields.map((field) => (
            <ConfigFieldInput
              key={field.key}
              field={field}
              value={mappingDraft[field.key] ?? ''}
              onChange={(v) => updateMappingField(field.key, v)}
              styles={styles}
            />
          ))}
        </Card>

        {/* Actions & Triggers Preview */}
        <Card title="Available Actions" styles={styles}>
          {selectedTemplate.actions.map((a) => (
            <View key={a.key} style={{ marginBottom: 8 }}>
              <Text style={{ fontWeight: '700', color: mode === 'day' ? '#1E293B' : '#F1F5F9', fontSize: 13 }}>{a.label}</Text>
              <Text style={[styles.sectionDetail, { fontSize: 12 }]}>{a.description}</Text>
            </View>
          ))}
        </Card>

        <Card title="Available Triggers" styles={styles}>
          {selectedTemplate.triggers.map((t) => (
            <View key={t.key} style={{ marginBottom: 8 }}>
              <Text style={{ fontWeight: '700', color: mode === 'day' ? '#1E293B' : '#F1F5F9', fontSize: 13 }}>{t.label}</Text>
              <Text style={[styles.sectionDetail, { fontSize: 12 }]}>{t.description}</Text>
            </View>
          ))}
        </Card>

        {selectedTemplate.prewiredSignals && selectedTemplate.prewiredSignals.length > 0 && (
          <Card title="Pre-Wired Signals" styles={styles}>
            <Text style={[styles.sectionDetail, { marginBottom: 8 }]}>
              These Signal Studio flows will be auto-registered upon activation.
            </Text>
            {selectedTemplate.prewiredSignals.map((s) => (
              <View key={s.key} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 8 }}>
                <Text style={{ fontSize: 11, color: '#8C5BF5', fontWeight: '700' }}>⚡</Text>
                <Text style={{ fontSize: 12, color: mode === 'day' ? '#1E293B' : '#F1F5F9', fontWeight: '600' }}>{s.label}</Text>
                {s.customerEditable && (
                  <Text style={{ fontSize: 10, color: '#6B7280', fontStyle: 'italic' }}>editable</Text>
                )}
              </View>
            ))}
          </Card>
        )}

        {!!info && (
          <Text style={{ color: '#EF4444', fontSize: 12, fontWeight: '600', textAlign: 'center' }}>{info}</Text>
        )}

        <Pressable
          onPress={() => {
            const msg = confirmActivation();
            if (msg && !msg.includes('Missing') && auditLog) {
              auditLog.logEntry({
                action: 'create',
                entityType: 'integration',
                entityId: selectedTemplate.id,
                entityName: selectedTemplate.name,
                after: { status: 'active', templateVersion: selectedTemplate.version },
              });
            }
          }}
          style={[styles.primaryButton, { alignSelf: 'center', marginTop: 8, paddingHorizontal: 32 }]}
        >
          <Text style={styles.primaryButtonText}>Activate Integration</Text>
        </Pressable>
      </ScrollView>
    );
  }

  /* ─── Main Layout: Sidebar + Content ─────────────────────────────── */
  return (
    <View style={{ flex: 1, flexDirection: compact ? 'column' : 'row' }}>
      {/* ── Left Nav ─────────────────────────────────────────────── */}
      {!compact && (
        <View style={[styles.adminSidebar, { width: 220, borderRightWidth: 1, borderRightColor: mode === 'day' ? '#E2E8F0' : '#334155' }]}>
          <ScrollView contentContainerStyle={{ paddingVertical: 12 }}>
            {sidebarSections.map((sec) => (
              <Pressable
                key={sec.key}
                onPress={() => { toggleSection(sec.key); setView(sec.key === 'catalog' ? 'catalog' : 'active'); }}
                style={[
                  styles.dashboardNavItem,
                  view === (sec.key === 'catalog' ? 'catalog' : 'active') && styles.dashboardNavItemActive,
                ]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                  <Text style={[styles.dashboardNavItemText, view === (sec.key === 'catalog' ? 'catalog' : 'active') && styles.dashboardNavItemTextActive]}>
                    {sec.label}
                  </Text>
                  <View style={{ backgroundColor: '#8C5BF5', borderRadius: 10, minWidth: 22, height: 22, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 }}>
                    <Text style={{ color: '#FFF', fontSize: 11, fontWeight: '700' }}>{sec.count}</Text>
                  </View>
                </View>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      {/* ── Content ──────────────────────────────────────────────── */}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 16 }}>
        {guidedMode && (
          <HintStrip
            steps={orbitalSteps}
            stepIndex={view === 'catalog' ? 0 : 3}
            onPress={() => onGuide(orbitalSteps[view === 'catalog' ? 0 : 3])}
          />
        )}

        {compact && (
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
            {(['catalog', 'active'] as const).map((v) => (
              <Pressable
                key={v}
                onPress={() => setView(v)}
                style={[
                  styles.pillButton,
                  view === v && styles.pillButtonActive,
                ]}
              >
                <Text style={[styles.pillButtonText, view === v && styles.pillButtonTextActive]}>
                  {v === 'catalog' ? 'Marketplace' : 'Active'}
                </Text>
              </Pressable>
            ))}
          </View>
        )}

        {!!info && (
          <Text style={{ color: info.includes('denied') || info.includes('Missing') ? '#EF4444' : '#22C55E', fontSize: 12, fontWeight: '600' }}>{info}</Text>
        )}

        {/* ── Catalog View ───────────────────────────────────────── */}
        {view === 'catalog' && (
          <>
            <View style={{ flexDirection: compact ? 'column' : 'row', gap: 10, alignItems: compact ? 'stretch' : 'center', marginBottom: 4 }}>
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search integrations..."
                placeholderTextColor="#9CA3AF"
                style={[styles.textInput, { flex: 1, minWidth: 200 }]}
              />
              <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                <Pressable
                  onPress={() => setCategoryFilter(null)}
                  style={[styles.pillButton, !categoryFilter && styles.pillButtonActive]}
                >
                  <Text style={[styles.pillButtonText, !categoryFilter && styles.pillButtonTextActive]}>All</Text>
                </Pressable>
                {categories.map((cat) => (
                  <Pressable
                    key={cat}
                    onPress={() => setCategoryFilter(categoryFilter === cat ? null : cat)}
                    style={[styles.pillButton, categoryFilter === cat && styles.pillButtonActive]}
                  >
                    <Text style={[styles.pillButtonText, categoryFilter === cat && styles.pillButtonTextActive]}>{cat}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
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
                />
              ))}
            </View>

            {filteredTemplates.length === 0 && (
              <Text style={[styles.sectionDetail, { textAlign: 'center', marginTop: 40 }]}>
                No integrations match your search.
              </Text>
            )}
          </>
        )}

        {/* ── Active Integrations View ───────────────────────────── */}
        {view === 'active' && (
          <>
            {activeIntegrations.length === 0 ? (
              <View style={{ alignItems: 'center', marginTop: 40, gap: 12 }}>
                <Text style={{ fontSize: 40 }}>🛰️</Text>
                <Text style={[styles.sectionTitle, { textAlign: 'center' }]}>No Active Integrations</Text>
                <Text style={[styles.sectionDetail, { textAlign: 'center', maxWidth: 400 }]}>
                  Browse the Marketplace to activate your first integration and connect external services to your workspace.
                </Text>
                <Pressable onPress={() => setView('catalog')} style={[styles.primaryButton, { marginTop: 8 }]}>
                  <Text style={styles.primaryButtonText}>Browse Marketplace</Text>
                </Pressable>
              </View>
            ) : (
              <View style={{ gap: 12 }}>
                {activeIntegrations.map((activation) => {
                  const tpl = getTemplateForActivation(activation);
                  return (
                    <ActivationCard
                      key={activation.id}
                      activation={activation}
                      template={tpl}
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
}: {
  field: IntegrationFieldDef;
  value: string;
  onChange: (v: string) => void;
  styles: any;
}) {
  return (
    <View style={{ marginBottom: 10 }}>
      <Text style={[styles.inputLabel, { marginBottom: 2 }]}>
        {field.label}{field.required && <Text style={{ color: '#EF4444' }}> *</Text>}
      </Text>
      {field.instruction && (
        <Text style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 4 }}>{field.instruction}</Text>
      )}
      {field.type === 'boolean' ? (
        <Pressable
          onPress={() => onChange(value === 'true' ? 'false' : 'true')}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 }}
        >
          <View
            style={{
              width: 20,
              height: 20,
              borderRadius: 4,
              borderWidth: 2,
              borderColor: value === 'true' ? '#8C5BF5' : '#9CA3AF',
              backgroundColor: value === 'true' ? '#8C5BF5' : 'transparent',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {value === 'true' && <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '700' }}>✓</Text>}
          </View>
          <Text style={{ fontSize: 13, color: '#9CA3AF' }}>{value === 'true' ? 'Enabled' : 'Disabled'}</Text>
        </Pressable>
      ) : field.type === 'select' && field.options ? (
        <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
          {field.options.map((opt) => (
            <Pressable
              key={opt}
              onPress={() => onChange(opt)}
              style={[
                styles.pillButton,
                value === opt && styles.pillButtonActive,
              ]}
            >
              <Text style={[styles.pillButtonText, value === opt && styles.pillButtonTextActive]}>{opt}</Text>
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
          style={[styles.textInput, { fontSize: 13 }]}
        />
      )}
      {field.impactStatement && (
        <Text style={{ fontSize: 10, color: '#F59E0B', marginTop: 3, fontStyle: 'italic' }}>⚠ {field.impactStatement}</Text>
      )}
      {field.validationHint && (
        <Text style={{ fontSize: 10, color: '#6B7280', marginTop: 2 }}>{field.validationHint}</Text>
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
}: {
  template: IntegrationTemplate;
  activated: boolean;
  onActivate: () => void;
  publisherBadge: (p: string) => React.ReactNode;
  mode: string;
  styles: any;
  compact: boolean;
}) {
  return (
    <View
      style={{
        width: compact ? '100%' : 300,
        backgroundColor: mode === 'day' ? '#FFFFFF' : '#1E293B',
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: mode === 'day' ? '#E2E8F0' : '#334155',
        gap: 8,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Text style={{ fontSize: 28 }}>{template.icon}</Text>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ fontWeight: '700', fontSize: 15, color: mode === 'day' ? '#1E293B' : '#F1F5F9' }}>
              {template.name}
            </Text>
            {publisherBadge(template.publisher)}
          </View>
          <Text style={{ fontSize: 11, color: '#9CA3AF' }}>{template.vendor}</Text>
        </View>
      </View>

      <Text style={{ fontSize: 12, color: mode === 'day' ? '#475569' : '#CBD5E1', lineHeight: 17 }} numberOfLines={2}>
        {template.description}
      </Text>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{ backgroundColor: mode === 'day' ? '#F1F5F9' : '#334155', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 }}>
          <Text style={{ fontSize: 10, color: '#8C5BF5', fontWeight: '600' }}>{template.category}</Text>
        </View>
        <Text style={{ fontSize: 10, color: '#9CA3AF' }}>
          {template.actions.length} action{template.actions.length !== 1 ? 's' : ''} · {template.triggers.length} trigger{template.triggers.length !== 1 ? 's' : ''}
        </Text>
      </View>

      <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
        {activated ? (
          <View style={{ backgroundColor: '#22C55E20', borderRadius: 6, paddingHorizontal: 12, paddingVertical: 6, flex: 1, alignItems: 'center' }}>
            <Text style={{ color: '#22C55E', fontWeight: '700', fontSize: 12 }}>✓ Activated</Text>
          </View>
        ) : (
          <Pressable
            onPress={onActivate}
            style={[styles.primaryButton, { flex: 1, alignItems: 'center' }]}
          >
            <Text style={styles.primaryButtonText}>Activate</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

function ActivationCard({
  activation,
  template,
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
  onPause: () => void;
  onResume: () => void;
  onRemove: () => void;
  statusColor: (s: string) => string;
  publisherBadge: (p: string) => React.ReactNode;
  mode: string;
  styles: any;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <View
      style={{
        backgroundColor: mode === 'day' ? '#FFFFFF' : '#1E293B',
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: mode === 'day' ? '#E2E8F0' : '#334155',
        gap: 10,
      }}
    >
      {/* Header */}
      <Pressable onPress={() => setExpanded(!expanded)} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Text style={{ fontSize: 24 }}>{template?.icon ?? '🔗'}</Text>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ fontWeight: '700', fontSize: 15, color: mode === 'day' ? '#1E293B' : '#F1F5F9' }}>
              {template?.name ?? activation.templateId}
            </Text>
            {template && publisherBadge(template.publisher)}
          </View>
          <Text style={{ fontSize: 11, color: '#9CA3AF' }}>
            v{activation.templateVersion} · Activated {new Date(activation.activatedAt).toLocaleDateString()}
          </Text>
        </View>

        {/* Status Badge */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: statusColor(activation.status) }} />
          <Text style={{ fontSize: 12, fontWeight: '600', color: statusColor(activation.status), textTransform: 'capitalize' }}>
            {activation.status}
          </Text>
        </View>
      </Pressable>

      {/* Metrics Row */}
      <View style={{ flexDirection: 'row', gap: 16 }}>
        <MetricPill label="Total Calls" value={String(activation.totalCalls)} mode={mode} />
        <MetricPill label="Errors" value={String(activation.errorCount)} mode={mode} color={activation.errorCount > 0 ? '#EF4444' : undefined} />
        <MetricPill label="Shutoff At" value={`${activation.autoShutoffThreshold} errors`} mode={mode} />
      </View>

      {/* Expanded Details */}
      {expanded && (
        <View style={{ gap: 8, marginTop: 4 }}>
          {template && (
            <View style={{ gap: 4 }}>
              <Text style={{ fontWeight: '600', fontSize: 12, color: mode === 'day' ? '#1E293B' : '#F1F5F9' }}>Connection Config</Text>
              {Object.entries(activation.connectionConfig).map(([k, v]) => {
                const fieldDef = template.fields.find((f) => f.key === k);
                return (
                  <View key={k} style={{ flexDirection: 'row', gap: 6 }}>
                    <Text style={{ fontSize: 11, color: '#9CA3AF', width: 140 }}>{fieldDef?.label ?? k}:</Text>
                    <Text style={{ fontSize: 11, color: mode === 'day' ? '#475569' : '#CBD5E1' }}>
                      {fieldDef?.type === 'secret' ? '••••••••' : v}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
          {Object.keys(activation.mappingConfig).length > 0 && template && (
            <View style={{ gap: 4 }}>
              <Text style={{ fontWeight: '600', fontSize: 12, color: mode === 'day' ? '#1E293B' : '#F1F5F9' }}>Semantic Mapping</Text>
              {Object.entries(activation.mappingConfig).map(([k, v]) => {
                const fieldDef = template.fields.find((f) => f.key === k);
                return (
                  <View key={k} style={{ flexDirection: 'row', gap: 6 }}>
                    <Text style={{ fontSize: 11, color: '#9CA3AF', width: 140 }}>{fieldDef?.label ?? k}:</Text>
                    <Text style={{ fontSize: 11, color: mode === 'day' ? '#475569' : '#CBD5E1' }}>{v}</Text>
                  </View>
                );
              })}
            </View>
          )}

          {activation.disabledReason && (
            <Text style={{ fontSize: 11, color: '#EF4444', fontStyle: 'italic' }}>
              Disabled: {activation.disabledReason}
            </Text>
          )}
        </View>
      )}

      {/* Action Buttons */}
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
        {activation.status === 'active' && (
          <Pressable onPress={onPause} style={[styles.secondaryButton, { paddingHorizontal: 14 }]}>
            <Text style={styles.secondaryButtonText}>Pause</Text>
          </Pressable>
        )}
        {(activation.status === 'paused' || activation.status === 'error') && (
          <Pressable onPress={onResume} style={[styles.primaryButton, { paddingHorizontal: 14 }]}>
            <Text style={styles.primaryButtonText}>Resume</Text>
          </Pressable>
        )}
        <Pressable onPress={onRemove} style={[styles.secondaryButton, { paddingHorizontal: 14, borderColor: '#EF4444' }]}>
          <Text style={[styles.secondaryButtonText, { color: '#EF4444' }]}>Remove</Text>
        </Pressable>
      </View>
    </View>
  );
}

function MetricPill({ label, value, mode, color }: { label: string; value: string; mode: string; color?: string }) {
  return (
    <View style={{ backgroundColor: mode === 'day' ? '#F1F5F9' : '#334155', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4, alignItems: 'center' }}>
      <Text style={{ fontSize: 14, fontWeight: '700', color: color ?? (mode === 'day' ? '#1E293B' : '#F1F5F9') }}>{value}</Text>
      <Text style={{ fontSize: 9, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</Text>
    </View>
  );
}
