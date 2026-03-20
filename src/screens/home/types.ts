import type { AppNotification, AuditAction, AuditEntityType, AuditLogEntry } from '../../types';

export type Page = 'architecture' | 'admin' | 'enduser' | 'signal' | 'orbital' | 'bebo' | 'cosmograph' | 'financial';

export type AuditLogHandle = {
  entries: AuditLogEntry[];
  filterEntity: string | undefined;
  setFilterEntity: (entity: string | undefined) => void;
  logEntry: (partial: {
    action: AuditAction;
    entityType: AuditEntityType;
    entityId: string;
    entityName: string;
    before?: Record<string, unknown>;
    after?: Record<string, unknown>;
  }) => AuditLogEntry;
};

export type GuideStep = {
  title: string;
  detail: string;
};

export type ModulePageActions = {
  saveDraftLabel?: string;
  publishLabel?: string;
  saveDraft?: () => void | string | Promise<void | string>;
  publish?: () => void | string | Promise<void | string>;
};

export type GuidedPageProps = {
  guidedMode: boolean;
  onGuide: (step: GuideStep) => void;
  registerActions?: (actions: ModulePageActions | null) => void;
  accentPalette?: {
    primary: string;
    secondary: string;
    accent: string;
  };
  addNotification?: (partial: Omit<AppNotification, 'id' | 'tenantId' | 'read' | 'createdAt'>) => void;
  auditLog?: AuditLogHandle;
};
