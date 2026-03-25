import { useCallback, useState } from 'react';
import type { AppNotification, AuditAction, AuditEntityType, AuditLogEntry } from '../../../types';

function uid(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

// ─── Notifications Hook ─────────────────────────────────────────────

export function useNotifications(tenantId: string) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const addNotification = useCallback(
    (partial: Omit<AppNotification, 'id' | 'tenantId' | 'read' | 'createdAt'>) => {
      const notif: AppNotification = {
        ...partial,
        id: uid('notif'),
        tenantId,
        read: false,
        createdAt: new Date().toISOString(),
      };
      setNotifications((prev) => [notif, ...prev]);
      return notif;
    },
    [tenantId],
  );

  const markRead = useCallback((id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return { notifications, unreadCount, addNotification, markRead, clearAll };
}

// ─── Audit Log Hook ─────────────────────────────────────────────────

export function useAuditLog(tenantId: string, currentUser?: { id: string; fullName: string } | null) {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [filterEntity, setFilterEntity] = useState<string | undefined>(undefined);

  const logEntry = useCallback(
    (partial: {
      action: AuditAction;
      entityType: AuditEntityType;
      entityId: string;
      entityName: string;
      before?: Record<string, unknown>;
      after?: Record<string, unknown>;
    }) => {
      const entry: AuditLogEntry = {
        ...partial,
        id: uid('audit'),
        tenantId,
        userId: currentUser?.id ?? 'user-admin',
        userName: currentUser?.fullName ?? 'Admin',
        timestamp: new Date().toISOString(),
      };
      setEntries((prev) => [entry, ...prev]);
      return entry;
    },
    [tenantId, currentUser?.id, currentUser?.fullName],
  );

  return { entries, filterEntity, setFilterEntity, logEntry };
}

// ─── (Demo data generators removed) ────────────────────────────────

/* function generateDemoNotifications(tenantId: string): AppNotification[] {
  const now = Date.now();
  return [
    {
      id: uid('demo'),
      tenantId,
      type: 'flow-triggered',
      title: 'DSCSA Verification Complete',
      body: 'Transaction information for batch TX-2024-001847 verified via EPCIS. All serial numbers validated.',
      severity: 'success',
      read: false,
      createdAt: new Date(now - 300000).toISOString(),
    },
    {
      id: uid('demo'),
      tenantId,
      type: 'sla-breach',
      title: 'SLA Warning: Investigation Pending',
      body: 'Investigation INV-2024-093 has been open for 18 hours. Escalation threshold is 24 hours.',
      severity: 'warning',
      read: false,
      createdAt: new Date(now - 1800000).toISOString(),
    },
    {
      id: uid('demo'),
      tenantId,
      type: 'lifecycle-transition',
      title: 'Lifecycle Transition',
      body: 'Record "Acme Pharma - Batch #WH-4420" moved from Hold → Released.',
      severity: 'info',
      read: true,
      createdAt: new Date(now - 7200000).toISOString(),
    },
    {
      id: uid('demo'),
      tenantId,
      type: 'record-created',
      title: 'New Record Created',
      body: 'Trade partner "Meridian Distribution LLC" added via intake form by Supply Chain Admin.',
      severity: 'info',
      read: true,
      createdAt: new Date(now - 18000000).toISOString(),
    },
    {
      id: uid('demo'),
      tenantId,
      type: 'flow-failed',
      title: 'Flow Execution Failed',
      body: 'Flow "Expired Lot Auto-Quarantine" failed for batch #PH-8821. Missing required tag: Region.',
      severity: 'error',
      read: false,
      createdAt: new Date(now - 43200000).toISOString(),
    },
    {
      id: uid('demo'),
      tenantId,
      type: 'tenant-created',
      title: 'Welcome to Halo Internal',
      body: 'Your tenant environment is ready. Start by configuring workspaces and personas.',
      severity: 'success',
      read: true,
      createdAt: new Date(now - 86400000).toISOString(),
    },
  ];
} */

/* function generateDemoAuditLog(tenantId: string): AuditLogEntry[] {
  const now = Date.now();
  const user = { userId: 'user-admin', userName: 'Kieth M.' };

  return [
    {
      id: uid('audit'),
      tenantId,
      ...user,
      action: 'create',
      entityType: 'workspace',
      entityId: 'ws-dscsa-verification',
      entityName: 'DSCSA Verification Hub',
      after: { name: 'DSCSA Verification Hub', rootEntity: 'Trade Partner' },
      timestamp: new Date(now - 120000).toISOString(),
    },
    {
      id: uid('audit'),
      tenantId,
      ...user,
      action: 'publish',
      entityType: 'flow',
      entityId: 'flow-expired-quarantine',
      entityName: 'Expired Lot Auto-Quarantine',
      after: { status: 'published', signal: 'Lot expiry date reached' },
      timestamp: new Date(now - 600000).toISOString(),
    },
    {
      id: uid('audit'),
      tenantId,
      ...user,
      action: 'update',
      entityType: 'shell-config',
      entityId: 'shell-config',
      entityName: 'Shell Configuration',
      before: { subjectSingular: 'Product', subjectPlural: 'Products' },
      after: { subjectSingular: 'Trade Partner', subjectPlural: 'Trade Partners' },
      timestamp: new Date(now - 3600000).toISOString(),
    },
    {
      id: uid('audit'),
      tenantId,
      ...user,
      action: 'create',
      entityType: 'client',
      entityId: 'client-meridian',
      entityName: 'Meridian Distribution LLC',
      after: { firstName: 'Meridian', lastName: 'Distribution LLC', caseRef: 'TP-2024-0047' },
      timestamp: new Date(now - 7200000).toISOString(),
    },
    {
      id: uid('audit'),
      tenantId,
      ...user,
      action: 'transition',
      entityType: 'record',
      entityId: 'rec-wh4420',
      entityName: 'Acme Pharma - Batch #WH-4420',
      before: { status: 'Hold' },
      after: { status: 'Released' },
      timestamp: new Date(now - 14400000).toISOString(),
    },
    {
      id: uid('audit'),
      tenantId,
      ...user,
      action: 'create',
      entityType: 'role',
      entityId: 'role-compliance-officer',
      entityName: 'Compliance Officer',
      after: { permissions: ['workspace.manage', 'flow.publish'] },
      timestamp: new Date(now - 28800000).toISOString(),
    },
    {
      id: uid('audit'),
      tenantId,
      ...user,
      action: 'export',
      entityType: 'tenant',
      entityId: tenantId,
      entityName: 'Tenant A',
      after: { format: 'cosmos', records: 47 },
      timestamp: new Date(now - 43200000).toISOString(),
    },
    {
      id: uid('audit'),
      tenantId,
      ...user,
      action: 'sign-in',
      entityType: 'user',
      entityId: 'user-admin',
      entityName: 'Kieth M.',
      timestamp: new Date(now - 86400000).toISOString(),
    },
  ];
} */
