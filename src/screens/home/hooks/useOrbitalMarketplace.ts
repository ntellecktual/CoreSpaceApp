import { useCallback, useMemo, useState } from 'react';
import { useAppState } from '../../../context/AppStateContext';
import { IntegrationActivation, IntegrationTemplate, SignalFlow } from '../../../types';
import { integrationTemplates } from '../../../data/integrationTemplates';
import { useRbac } from './useRbac';

type MarketplaceView = 'catalog' | 'active' | 'configure';

export function useOrbitalMarketplace() {
  const { data, activateIntegration, updateIntegration, deactivateIntegration, upsertFlow } = useAppState();
  const { can, deniedMessage } = useRbac();

  const [view, setView] = useState<MarketplaceView>('catalog');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [selectedActivationId, setSelectedActivationId] = useState<string | null>(null);
  const [configDraft, setConfigDraft] = useState<Record<string, string>>({});
  const [mappingDraft, setMappingDraft] = useState<Record<string, string>>({});
  const [info, setInfo] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  const templates = integrationTemplates;

  const categories = useMemo(
    () => [...new Set(templates.map((t) => t.category))].sort(),
    [templates],
  );

  const filteredTemplates = useMemo(() => {
    let result = templates;
    if (categoryFilter) {
      result = result.filter((t) => t.category === categoryFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.vendor.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q),
      );
    }
    return result;
  }, [templates, categoryFilter, searchQuery]);

  const activeIntegrations = useMemo(
    () => data.integrations ?? [],
    [data.integrations],
  );

  const selectedTemplate = useMemo(
    () => templates.find((t) => t.id === selectedTemplateId) ?? null,
    [templates, selectedTemplateId],
  );

  const selectedActivation = useMemo(
    () => activeIntegrations.find((a) => a.id === selectedActivationId) ?? null,
    [activeIntegrations, selectedActivationId],
  );

  const isTemplateActivated = useCallback(
    (templateId: string) => activeIntegrations.some((a) => a.templateId === templateId),
    [activeIntegrations],
  );

  const beginActivation = useCallback((templateId: string) => {
    if (!can('integration.activate')) {
      setInfo(deniedMessage('integration.activate'));
      return;
    }
    setSelectedTemplateId(templateId);
    setConfigDraft({});
    setMappingDraft({});
    setView('configure');
    setInfo('');
  }, [can, deniedMessage]);

  const confirmActivation = useCallback(() => {
    if (!selectedTemplate) return 'No template selected.';
    if (!can('integration.activate')) {
      const msg = deniedMessage('integration.activate');
      setInfo(msg);
      return msg;
    }

    const missingRequired = selectedTemplate.fields
      .filter((f) => f.required && f.layer === 'connection')
      .filter((f) => !configDraft[f.key]?.trim());
    if (missingRequired.length > 0) {
      const msg = `Missing required fields: ${missingRequired.map((f) => f.label).join(', ')}`;
      setInfo(msg);
      return msg;
    }

    const now = new Date().toISOString();
    const activation: IntegrationActivation = {
      id: `intg-${Date.now()}`,
      tenantId: '',
      templateId: selectedTemplate.id,
      templateVersion: selectedTemplate.version,
      connectionConfig: { ...configDraft },
      mappingConfig: { ...mappingDraft },
      status: 'active',
      activatedAt: now,
      errorCount: 0,
      totalCalls: 0,
      autoShutoffThreshold: 50,
    };

    activateIntegration(activation);

    // Register pre-wired signals as Signal Studio flows
    if (selectedTemplate.prewiredSignals && selectedTemplate.prewiredSignals.length > 0) {
      const firstWorkspace = data.workspaces[0];
      const firstSubSpace = firstWorkspace?.subSpaces[0];
      if (firstWorkspace && firstSubSpace) {
        for (const signal of selectedTemplate.prewiredSignals) {
          const triggerDef = selectedTemplate.triggers.find((t) => t.key === signal.triggerRef);
          const flow: SignalFlow = {
            id: '',
            name: `[Orbital] ${signal.label}`,
            signal: triggerDef?.description ?? signal.triggerRef,
            workspaceId: firstWorkspace.id,
            subSpaceId: firstSubSpace.id,
            rules: [`source = ${selectedTemplate.id}`, `event = ${triggerDef?.eventType ?? signal.triggerRef}`],
            action: signal.defaultAction,
            runOnExisting: false,
            targetTags: [`orbital:${selectedTemplate.id}`, `integration:${signal.key}`],
            status: 'published',
            triggerType: 'webhook',
            webhookConfig: { endpointPath: `/orbital/${selectedTemplate.id}/${signal.key}`, method: 'POST' },
            totalRuns: 0,
            failures7d: 0,
            avgTimeMs: 0,
          };
          upsertFlow(flow);
        }
      }
    }

    setView('active');
    setSelectedTemplateId(null);
    setConfigDraft({});
    setMappingDraft({});
    const msg = `${selectedTemplate.name} activated successfully.`;
    setInfo(msg);
    return msg;
  }, [selectedTemplate, can, deniedMessage, configDraft, mappingDraft, activateIntegration]);

  const pauseIntegration = useCallback((activationId: string) => {
    if (!can('integration.manage')) {
      setInfo(deniedMessage('integration.manage'));
      return;
    }
    updateIntegration(activationId, { status: 'paused' });
    setInfo('Integration paused.');
  }, [can, deniedMessage, updateIntegration]);

  const resumeIntegration = useCallback((activationId: string) => {
    if (!can('integration.manage')) {
      setInfo(deniedMessage('integration.manage'));
      return;
    }
    updateIntegration(activationId, { status: 'active', disabledReason: undefined, disabledAt: undefined });
    setInfo('Integration resumed.');
  }, [can, deniedMessage, updateIntegration]);

  const removeIntegration = useCallback((activationId: string) => {
    if (!can('integration.manage')) {
      setInfo(deniedMessage('integration.manage'));
      return;
    }
    const result = deactivateIntegration(activationId);
    if (result.ok) {
      setInfo('Integration removed.');
      if (selectedActivationId === activationId) setSelectedActivationId(null);
    } else {
      setInfo(result.reason ?? 'Failed to remove integration.');
    }
  }, [can, deniedMessage, deactivateIntegration, selectedActivationId]);

  const openActivationDetail = useCallback((activationId: string) => {
    setSelectedActivationId(activationId);
    setView('active');
  }, []);

  const getTemplateForActivation = useCallback(
    (activation: IntegrationActivation) => templates.find((t) => t.id === activation.templateId),
    [templates],
  );

  const updateConfigField = useCallback((key: string, value: string) => {
    setConfigDraft((prev) => ({ ...prev, [key]: value }));
  }, []);

  const updateMappingField = useCallback((key: string, value: string) => {
    setMappingDraft((prev) => ({ ...prev, [key]: value }));
  }, []);

  return {
    view,
    setView,
    templates,
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
  };
}
