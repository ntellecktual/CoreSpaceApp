import { useEffect, useMemo, useState } from 'react';
import { useAppState } from '../../../context/AppStateContext';
import { todayFormatted } from '../../../formatDate';
import { PermissionAction, RoleDefinition } from '../../../types';
import { builtInPermissionTemplates, PermissionTemplateView } from '../rbac';

function nextTemplateVersion(templates: PermissionTemplateView[], lineageId: string) {
  return templates
    .filter((template) => template.lineageId === lineageId)
    .reduce((maxVersion, template) => Math.max(maxVersion, template.version), 0) + 1;
}

function makeLineageId() {
  return `lineage-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

type TemplateDiff = {
  fromTemplateId: string;
  fromTemplateName: string;
  toTemplateId: string;
  toTemplateName: string;
  fromVersion: number;
  toVersion: number;
  lineageId: string;
  addedInTarget: PermissionAction[];
  removedFromTarget: PermissionAction[];
};

export function useRolePolicyBuilder() {
  const { data, upsertRole, deleteRole, upsertPermissionTemplate, deletePermissionTemplate } = useAppState();
  const [selectedRoleId, setSelectedRoleId] = useState(data.roles[0]?.id ?? '');
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [newRoleName, setNewRoleName] = useState('');
  const [roleName, setRoleName] = useState('');
  const [roleDescription, setRoleDescription] = useState('');
  const [permissions, setPermissions] = useState<PermissionAction[]>([]);
  const [workspaceScope, setWorkspaceScope] = useState<'all' | 'selected'>('all');
  const [workspaceIds, setWorkspaceIds] = useState<string[]>([]);
  const [diffFromTemplateId, setDiffFromTemplateId] = useState('');
  const [diffToTemplateId, setDiffToTemplateId] = useState('');
  const [templateDiff, setTemplateDiff] = useState<TemplateDiff | null>(null);
  const [promotionNote, setPromotionNote] = useState('');
  const [message, setMessage] = useState('');

  const selectedRole = useMemo(
    () => data.roles.find((role) => role.id === selectedRoleId) ?? data.roles[0],
    [data.roles, selectedRoleId],
  );

  const templates = useMemo<PermissionTemplateView[]>(() => {
    return [
      ...builtInPermissionTemplates.map((template) => ({
        ...template,
        version: 1,
        lineageId: template.id,
        source: 'built-in' as const,
      })),
      ...data.customPermissionTemplates.map((template) => ({ ...template, source: 'custom' as const })),
    ];
  }, [data.customPermissionTemplates]);

  const templateLineages = useMemo(() => {
    const grouped = templates.reduce<Record<string, PermissionTemplateView[]>>((acc, template) => {
      const key = template.lineageId || template.id;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(template);
      return acc;
    }, {});

    return Object.entries(grouped)
      .map(([lineageId, lineageTemplates]) => {
        const versions = [...lineageTemplates].sort((a, b) => a.version - b.version);
        const latestVersion = versions[versions.length - 1]?.version ?? 1;
        return {
          lineageId,
          name: versions[0]?.name ?? lineageId,
          totalVersions: versions.length,
          latestVersion,
          versions,
        };
      })
      .sort((a, b) => b.latestVersion - a.latestVersion || a.name.localeCompare(b.name));
  }, [templates]);

  useEffect(() => {
    if (!selectedRole) {
      return;
    }
    setRoleName(selectedRole.name);
    setRoleDescription(selectedRole.description ?? '');
    setPermissions(selectedRole.permissions);
    setWorkspaceScope(selectedRole.workspaceScope);
    setWorkspaceIds(selectedRole.workspaceIds);
  }, [selectedRole?.id]);

  useEffect(() => {
    if (selectedRole) {
      return;
    }
    if (data.roles[0]) {
      setSelectedRoleId(data.roles[0].id);
    }
  }, [data.roles, selectedRole]);

  const togglePermission = (permission: PermissionAction) => {
    setPermissions((current) => (current.includes(permission) ? current.filter((item) => item !== permission) : [...current, permission]));
  };

  const toggleWorkspace = (workspaceId: string) => {
    setWorkspaceIds((current) => (current.includes(workspaceId) ? current.filter((item) => item !== workspaceId) : [...current, workspaceId]));
  };

  const applyTemplate = (templateId: string) => {
    const template = templates.find((item) => item.id === templateId);
    if (!template) {
      setMessage('Template not found.');
      return;
    }
    setPermissions(template.permissions);
    setMessage(`${template.name} applied. Review and save role policy.`);
  };

  const clearPermissions = () => {
    setPermissions([]);
    setMessage('Permissions cleared. Save role policy to apply changes.');
  };

  const saveAsTemplate = () => {
    const name = templateName.trim();
    if (!name) {
      setMessage('Template name is required.');
      return;
    }

    upsertPermissionTemplate({
      id: '',
      name,
      description: templateDescription.trim() || undefined,
      permissions,
      version: 1,
      lineageId: makeLineageId(),
      parentTemplateId: undefined,
      changeNote: promotionNote.trim() || undefined,
      createdAt: todayFormatted(),
    });

    setTemplateName('');
    setTemplateDescription('');
    setPromotionNote('');
    setMessage('Custom permission template saved.');
  };

  const cloneTemplate = (templateId: string) => {
    const source = templates.find((template) => template.id === templateId);
    if (!source) {
      setMessage('Template not found.');
      return;
    }

    const lineageId = source.lineageId || source.id;
    const version = nextTemplateVersion(templates, lineageId);

    upsertPermissionTemplate({
      id: '',
      name: `${source.name} Copy`,
      description: source.description,
      permissions: source.permissions,
      version,
      lineageId,
      parentTemplateId: source.id,
      changeNote: promotionNote.trim() || `Cloned from v${source.version}`,
      createdAt: todayFormatted(),
    });

    setPromotionNote('');
    setMessage(`Template cloned as v${version}.`);
  };

  const createTemplateVersion = (templateId: string) => {
    const source = templates.find((template) => template.id === templateId);
    if (!source) {
      setMessage('Template not found.');
      return;
    }

    const lineageId = source.lineageId || source.id;
    const version = nextTemplateVersion(templates, lineageId);

    upsertPermissionTemplate({
      id: '',
      name: source.name,
      description: source.description,
      permissions: source.permissions,
      version,
      lineageId,
      parentTemplateId: source.id,
      changeNote: promotionNote.trim() || `Versioned from v${source.version}`,
      createdAt: todayFormatted(),
    });

    setPromotionNote('');
    setMessage(`New template version v${version} created.`);
  };

  const compareTemplateToLatest = (templateId: string) => {
    const source = templates.find((template) => template.id === templateId);
    if (!source) {
      setMessage('Template not found.');
      return;
    }

    const lineageTemplates = templates
      .filter((template) => template.lineageId === source.lineageId)
      .sort((a, b) => b.version - a.version);
    const latest = lineageTemplates[0];
    if (!latest) {
      setMessage('No lineage versions found for comparison.');
      return;
    }

    compareTemplatePair(source.id, latest.id);
  };

  const compareTemplatePair = (fromTemplateId: string, toTemplateId: string) => {
    const source = templates.find((template) => template.id === fromTemplateId);
    const target = templates.find((template) => template.id === toTemplateId);
    if (!source || !target) {
      setMessage('Template comparison requires two valid templates.');
      return;
    }

    if (source.lineageId !== target.lineageId) {
      setMessage('Templates must belong to the same lineage for side-by-side comparison.');
      return;
    }

    const sourcePermissions = new Set(source.permissions);
    const targetPermissions = new Set(target.permissions);

    const addedInTarget = [...targetPermissions].filter((permission) => !sourcePermissions.has(permission));
    const removedFromTarget = [...sourcePermissions].filter((permission) => !targetPermissions.has(permission));

    setTemplateDiff({
      fromTemplateId: source.id,
      fromTemplateName: source.name,
      toTemplateId: target.id,
      toTemplateName: target.name,
      fromVersion: source.version,
      toVersion: target.version,
      lineageId: source.lineageId,
      addedInTarget,
      removedFromTarget,
    });

    setMessage(`Diff prepared: v${source.version} → v${target.version}`);
  };

  const runSelectedTemplateDiff = () => {
    if (!diffFromTemplateId || !diffToTemplateId) {
      setMessage('Select both base and compare templates first.');
      return;
    }
    compareTemplatePair(diffFromTemplateId, diffToTemplateId);
  };

  const clearTemplateDiff = () => {
    setTemplateDiff(null);
    setDiffFromTemplateId('');
    setDiffToTemplateId('');
    setPromotionNote('');
  };

  const promoteCompareAsNewVersion = () => {
    if (!templateDiff) {
      setMessage('Run a template diff before promoting.');
      return;
    }

    const note = promotionNote.trim();
    if (!note) {
      setMessage('Promotion note is required before promoting a template version.');
      return;
    }

    const compareTemplate = templates.find((template) => template.id === templateDiff.toTemplateId);
    if (!compareTemplate) {
      setMessage('Compare template no longer exists.');
      return;
    }

    const nextVersion = nextTemplateVersion(templates, compareTemplate.lineageId);

    upsertPermissionTemplate({
      id: '',
      name: compareTemplate.name,
      description: compareTemplate.description,
      permissions: compareTemplate.permissions,
      version: nextVersion,
      lineageId: compareTemplate.lineageId,
      parentTemplateId: compareTemplate.id,
      changeNote: note,
      createdAt: todayFormatted(),
    });

    setPromotionNote('');
    setMessage(`Promoted compare template to lineage version v${nextVersion}.`);
  };

  const removeCustomTemplate = (templateId: string) => {
    const result = deletePermissionTemplate(templateId);
    if (!result.ok) {
      setMessage(result.reason ?? 'Unable to delete template.');
      return;
    }
    setMessage('Custom template deleted.');
  };

  const createRole = () => {
    const trimmed = newRoleName.trim();
    if (!trimmed) {
      setMessage('Role name is required.');
      return;
    }

    const created = upsertRole({
      id: '',
      name: trimmed,
      description: '',
      permissions: [],
      workspaceScope: 'all',
      workspaceIds: [],
    });
    setSelectedRoleId(created.id);
    setNewRoleName('');
    setMessage('Role created. Configure permissions and scope.');
  };

  const saveRole = () => {
    if (!selectedRole) {
      setMessage('Select a role first.');
      return;
    }

    const trimmed = roleName.trim();
    if (!trimmed) {
      setMessage('Role name is required.');
      return;
    }

    const payload: RoleDefinition = {
      id: selectedRole.id,
      name: trimmed,
      description: roleDescription.trim() || undefined,
      permissions,
      workspaceScope,
      workspaceIds: workspaceScope === 'selected' ? workspaceIds : [],
    };

    upsertRole(payload);
    setMessage('Role policy mapping saved.');
  };

  const removeRole = () => {
    if (!selectedRole) {
      return;
    }

    const result = deleteRole(selectedRole.id);
    if (!result.ok) {
      setMessage(result.reason ?? 'Unable to delete role.');
      return;
    }

    setMessage('Role deleted.');
  };

  return {
    roles: data.roles,
    workspaces: data.workspaces,
    templates,
    templateLineages,
    templateName,
    setTemplateName,
    templateDescription,
    setTemplateDescription,
    selectedRole,
    selectedRoleId,
    setSelectedRoleId,
    newRoleName,
    setNewRoleName,
    roleName,
    setRoleName,
    roleDescription,
    setRoleDescription,
    permissions,
    workspaceScope,
    setWorkspaceScope,
    workspaceIds,
    diffFromTemplateId,
    setDiffFromTemplateId,
    diffToTemplateId,
    setDiffToTemplateId,
    templateDiff,
    promotionNote,
    setPromotionNote,
    message,
    togglePermission,
    applyTemplate,
    clearPermissions,
    saveAsTemplate,
    cloneTemplate,
    createTemplateVersion,
    compareTemplatePair,
    compareTemplateToLatest,
    runSelectedTemplateDiff,
    promoteCompareAsNewVersion,
    clearTemplateDiff,
    removeCustomTemplate,
    toggleWorkspace,
    createRole,
    saveRole,
    removeRole,
  };
}
