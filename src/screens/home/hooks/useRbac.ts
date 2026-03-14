import { useMemo } from 'react';
import { useAppState } from '../../../context/AppStateContext';
import { canRole, canViewField, canEditField, deniedMessage, RbacAction } from '../rbac';

export function useRbac() {
  const { data, setActiveRoleId, isSuperAdmin } = useAppState();

  return useMemo(() => {
    const activeRole = data.roles.find((role) => role.id === data.activeRoleId) ?? data.roles[0];

    return {
      activeRole,
      roles: data.roles,
      setActiveRoleId: (roleId: string) => setActiveRoleId(roleId),
      can: (action: RbacAction, workspaceId?: string) => (isSuperAdmin ? true : canRole(activeRole, action, workspaceId)),
      canViewField: (fieldId: string) => (isSuperAdmin ? true : canViewField(activeRole, fieldId)),
      canEditField: (fieldId: string) => (isSuperAdmin ? true : canEditField(activeRole, fieldId)),
      deniedMessage: (action: RbacAction) => deniedMessage(action),
    };
  }, [data.roles, data.activeRoleId, setActiveRoleId, isSuperAdmin]);
}
