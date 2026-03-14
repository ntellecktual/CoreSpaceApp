import { useMemo } from 'react';
import { useAppState } from '../../../context/AppStateContext';
import { WorkspaceDefinition } from '../../../types';

type Finding = {
  key: 'orphanForms' | 'subspacesWithoutForms' | 'missingRelationships' | 'formsMapped' | 'subspacesCovered' | 'relationshipsComplete';
  level: 'ok' | 'warning';
  text: string;
};

function workspaceHasSubSpaceForm(workspaceId: string, subSpaceId: string, formPairs: Set<string>, fieldPairs: Set<string>) {
  const key = `${workspaceId}:${subSpaceId}`;
  return formPairs.has(key) || fieldPairs.has(key);
}

export function useAdminEnterpriseInsights(workspace?: WorkspaceDefinition) {
  const { data } = useAppState();

  return useMemo(() => {
    const totalSubSpaces = data.workspaces.reduce((count, item) => count + item.subSpaces.length, 0);
    const workspacesWithRoutes = data.workspaces.filter((item) => item.route.trim().length > 0).length;
    const relatedSubSpaces = data.workspaces.flatMap((item) => item.subSpaces).filter((subSpace) => subSpace.bindMode === 'relatedEntityView');
    const subSpacesWithRelationship = relatedSubSpaces.filter((subSpace) => !!subSpace.relationship?.trim()).length;

    const formPairs = new Set(data.forms.map((form) => `${form.workspaceId}:${form.subSpaceId}`));
    const fieldPairs = new Set(
      data.workspaces.flatMap((workspaceItem) =>
        workspaceItem.subSpaces
          .filter((subSpace) => (subSpace.builderFields?.length ?? 0) > 0)
          .map((subSpace) => `${workspaceItem.id}:${subSpace.id}`),
      ),
    );
    const subSpacesWithForms = data.workspaces
      .flatMap((item) => item.subSpaces.map((subSpace) => ({ workspaceId: item.id, subSpaceId: subSpace.id })))
      .filter((pair) => workspaceHasSubSpaceForm(pair.workspaceId, pair.subSpaceId, formPairs, fieldPairs)).length;

    const orphanForms = data.forms.filter(
      (form) => !data.workspaces.some((workspaceItem) => workspaceItem.id === form.workspaceId && workspaceItem.subSpaces.some((subSpace) => subSpace.id === form.subSpaceId)),
    ).length;

    const publishedFlows = data.flows.filter((flow) => flow.status === 'published').length;

    const selectedWorkspaceCoverage = workspace
      ? {
          totalSubSpaces: workspace.subSpaces.length,
          subSpacesWithForm: workspace.subSpaces.filter((subSpace) => workspaceHasSubSpaceForm(workspace.id, subSpace.id, formPairs, fieldPairs)).length,
          subSpacesWithRelationship:
            workspace.subSpaces.filter((subSpace) => subSpace.bindMode !== 'relatedEntityView' || !!subSpace.relationship?.trim()).length,
        }
      : undefined;

    const selectedWorkspaceSubSpacesMissingForms = workspace
      ? workspace.subSpaces
          .filter((subSpace) => !workspaceHasSubSpaceForm(workspace.id, subSpace.id, formPairs, fieldPairs))
          .map((subSpace) => ({
            workspaceId: workspace.id,
            workspaceName: workspace.name,
            subSpaceId: subSpace.id,
            subSpaceName: subSpace.name,
          }))
      : [];

    const findings: Finding[] = [];
    if (orphanForms > 0) {
      findings.push({ key: 'orphanForms', level: 'warning', text: `${orphanForms} form(s) target missing workspace/subspace mappings.` });
    } else {
      findings.push({ key: 'formsMapped', level: 'ok', text: 'All forms map to valid workspace/subspace targets.' });
    }

    if (selectedWorkspaceCoverage) {
      if (selectedWorkspaceCoverage.subSpacesWithForm < selectedWorkspaceCoverage.totalSubSpaces) {
        findings.push({
          key: 'subspacesWithoutForms',
          level: 'warning',
          text: `Selected workspace has ${selectedWorkspaceCoverage.totalSubSpaces - selectedWorkspaceCoverage.subSpacesWithForm} subspace(s) without forms.`,
        });
      } else {
        findings.push({ key: 'subspacesCovered', level: 'ok', text: 'Selected workspace has form coverage for all subspaces.' });
      }

      if (selectedWorkspaceCoverage.subSpacesWithRelationship < selectedWorkspaceCoverage.totalSubSpaces) {
        findings.push({ key: 'missingRelationships', level: 'warning', text: 'Some related subspaces are missing relationship definitions.' });
      } else {
        findings.push({ key: 'relationshipsComplete', level: 'ok', text: 'Relationship definitions are complete for selected workspace.' });
      }
    }

    return {
      totalWorkspaces: data.workspaces.length,
      totalSubSpaces,
      workspacesWithRoutes,
      subSpacesWithRelationship,
      subSpacesWithForms,
      orphanForms,
      publishedFlows,
      findings,
      selectedWorkspaceCoverage,
      selectedWorkspaceSubSpacesMissingForms,
    };
  }, [data, workspace]);
}
