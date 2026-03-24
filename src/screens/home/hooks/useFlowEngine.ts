import { useCallback, useRef } from 'react';
import { Linking } from 'react-native';
import { useAppState } from '../../../context/AppStateContext';
import type { FlowRunEntry, RuntimeRecord, SignalFlow, AppNotification, NotificationType } from '../../../types';

// ─── Flow Execution Engine ──────────────────────────────────────────
// Evaluates published Signal Studio flows against record events.
// When a record is created, updated, or transitions lifecycle the
// engine checks matching flows, evaluates rules, executes actions,
// and updates flow run statistics.

export type FlowEvent = 'record.created' | 'record.updated' | 'lifecycle.transition';

interface FlowRunResult {
  flowId: string;
  flowName: string;
  matched: boolean;
  rulesPassed: boolean;
  actionTaken: string | null;
  durationMs: number;
  error?: string;
}

// ── Rule evaluator: parses "field op value" against record data ──
export function evaluateRule(rule: string, record: RuntimeRecord): boolean {
  const trimmed = rule.trim();
  if (!trimmed) return true;

  // Support operators: =, !=, >, <, >=, <=, contains, is set
  const isSetMatch = trimmed.match(/^(.+?)\s+is\s+set$/i);
  if (isSetMatch) {
    const field = normalizeFieldKey(isSetMatch[1]);
    const value = resolveFieldValue(field, record);
    return value !== undefined && value !== null && String(value).trim() !== '';
  }

  const containsMatch = trimmed.match(/^(.+?)\s+contains\s+(.+)$/i);
  if (containsMatch) {
    const field = normalizeFieldKey(containsMatch[1]);
    const expected = containsMatch[2].trim();
    const value = String(resolveFieldValue(field, record) ?? '');
    return value.toLowerCase().includes(expected.toLowerCase());
  }

  const comparisonMatch = trimmed.match(/^(.+?)\s*(>=|<=|!=|>|<|=)\s*(.+)$/);
  if (comparisonMatch) {
    const field = normalizeFieldKey(comparisonMatch[1]);
    const operator = comparisonMatch[2];
    const expected = comparisonMatch[3].trim();
    const actual = resolveFieldValue(field, record);

    if (actual === undefined || actual === null) return false;

    const actualNum = Number(actual);
    const expectedNum = Number(expected);
    const bothNumeric = !Number.isNaN(actualNum) && !Number.isNaN(expectedNum);

    switch (operator) {
      case '=':
        return bothNumeric
          ? actualNum === expectedNum
          : String(actual).toLowerCase() === expected.toLowerCase();
      case '!=':
        return bothNumeric
          ? actualNum !== expectedNum
          : String(actual).toLowerCase() !== expected.toLowerCase();
      case '>':
        return bothNumeric ? actualNum > expectedNum : String(actual) > expected;
      case '<':
        return bothNumeric ? actualNum < expectedNum : String(actual) < expected;
      case '>=':
        return bothNumeric ? actualNum >= expectedNum : String(actual) >= expected;
      case '<=':
        return bothNumeric ? actualNum <= expectedNum : String(actual) <= expected;
      default:
        return false;
    }
  }

  return false;
}

export function normalizeFieldKey(raw: string): string {
  return raw.trim().toLowerCase().replace(/[_\-\s]+/g, '_');
}

export function resolveFieldValue(
  normalizedKey: string,
  record: RuntimeRecord,
): string | number | undefined {
  // Check top-level record fields first
  const topLevelMap: Record<string, string | number | undefined> = {
    status: record.status,
    title: record.title,
    amount: record.amount,
    date: record.date,
  };
  if (normalizedKey in topLevelMap) return topLevelMap[normalizedKey];

  // Check tags
  if (normalizedKey === 'tags') return record.tags.join(', ');

  // Search in record.data with fuzzy key matching
  for (const [key, value] of Object.entries(record.data)) {
    if (normalizeFieldKey(key) === normalizedKey) return value;
  }

  // Check tag values (e.g. "priority" matches tag "Priority:High" → "High")
  for (const tag of record.tags) {
    const colonIdx = tag.indexOf(':');
    if (colonIdx > 0) {
      const tagKey = normalizeFieldKey(tag.substring(0, colonIdx));
      if (tagKey === normalizedKey) return tag.substring(colonIdx + 1);
    }
  }

  // Compute derived temporal fields: days_to_expiration / days_till_expiration
  if (
    normalizedKey === 'days_to_expiration' ||
    normalizedKey === 'daystooexpiration' ||
    normalizedKey === 'daystoexpiration' ||
    normalizedKey === 'daystillexpiration' ||
    normalizedKey === 'days_till_expiration' ||
    normalizedKey === 'daysuntilexpiration'
  ) {
    const expEntry = Object.entries(record.data).find(([k]) => {
      const nk = normalizeFieldKey(k);
      return (nk.includes('expiration') || nk.includes('expiry')) && (nk.includes('date') || nk === 'expiration' || nk === 'expiry');
    });
    if (expEntry) {
      const expDate = new Date(String(expEntry[1]));
      if (!isNaN(expDate.getTime())) {
        return Math.ceil((expDate.getTime() - Date.now()) / 86400000);
      }
    }
  }

  return undefined;
}

export function flowMatchesEvent(
  flow: SignalFlow,
  event: FlowEvent,
  record: RuntimeRecord,
): boolean {
  // Flow must be published and scoped to the same workspace
  if (flow.status !== 'published') return false;
  if (flow.workspaceId !== record.workspaceId) return false;

  // Optionally scoped to subspace
  if (flow.subSpaceId && flow.subSpaceId !== record.subSpaceId) return false;

  // If flow has target tags, record must have at least one matching tag
  if (flow.targetTags.length > 0) {
    const recordTagsLower = record.tags.map((t) => t.toLowerCase());
    const hasMatchingTag = flow.targetTags.some((ft) =>
      recordTagsLower.includes(ft.toLowerCase()),
    );
    if (!hasMatchingTag) {
      // Also check if any record tag key:value contains the flow tag as a substring
      const hasPartialMatch = flow.targetTags.some((ft) =>
        recordTagsLower.some((rt) => rt.includes(ft.toLowerCase())),
      );
      if (!hasPartialMatch) return false;
    }
  }

  return true;
}

export function executeAction(
  actionDescription: string,
  record: RuntimeRecord,
  flow: SignalFlow,
): { notificationType: NotificationType; notificationTitle: string; notificationBody: string; recordUpdates?: Partial<RuntimeRecord> } {
  const lower = actionDescription.toLowerCase();

  let recordUpdates: Partial<RuntimeRecord> | undefined;

  // Parse "move to X" / "transition to X" actions
  const moveMatch = lower.match(/(?:move|transition)\s+to\s+([a-z0-9\s]+?)(?:\s+(?:and|,|\.)|\s*$)/i);
  if (moveMatch) {
    const newStatus = moveMatch[1].trim().replace(/\b\w/g, (c) => c.toUpperCase());
    recordUpdates = { status: newStatus };
  }

  // Parse "tag" actions
  const tagMatch = lower.match(/(?:tag|add tag)\s+(?:as\s+)?(.+?)(?:\s+and|\s*$)/i);
  if (tagMatch && !recordUpdates) {
    const newTag = tagMatch[1].trim();
    recordUpdates = { tags: [...record.tags, newTag] };
  }

  // Parse email actions — "Send an email: addr@example.com" or "email addr@example.com"
  const emailMatch = lower.match(/(?:send\s+(?:an?\s+)?email|email)\s*:?\s*([^\s,→]+@[^\s,→]+)/i);
  if (emailMatch) {
    const emailAddr = emailMatch[1].trim();
    const subject = encodeURIComponent(`[CoreSpace] Signal: ${flow.name}`);
    const body = encodeURIComponent(
      `Signal "${flow.name}" triggered on record "${record.title}".\n\nStatus: ${record.status}\nWorkspace: ${flow.workspaceId}\n\n— Sent automatically by CoreSpace Signal Studio`,
    );
    const mailto = `mailto:${emailAddr}?subject=${subject}&body=${body}`;
    try { Linking.openURL(mailto); } catch { /* silently degrade */ }
  }

  return {
    notificationType: 'flow-triggered',
    notificationTitle: `Flow Triggered: ${flow.name}`,
    notificationBody: `${flow.name} executed on "${record.title}" — ${actionDescription}`,
    recordUpdates,
  };
}

export function useFlowEngine() {
  const { data, updateRecord, upsertFlow, addFlowRunEntry } = useAppState();
  const runningRef = useRef(false);

  const evaluateFlows = useCallback(
    (
      event: FlowEvent,
      record: RuntimeRecord,
      addNotification: (partial: Omit<AppNotification, 'id' | 'tenantId' | 'read' | 'createdAt'>) => void,
    ): FlowRunResult[] => {
      if (runningRef.current) return [];
      runningRef.current = true;

      const results: FlowRunResult[] = [];
      const publishedFlows = data.flows.filter((f) => f.status === 'published');

      for (const flow of publishedFlows) {
        const startTime = Date.now();

        if (!flowMatchesEvent(flow, event, record)) {
          results.push({
            flowId: flow.id,
            flowName: flow.name,
            matched: false,
            rulesPassed: false,
            actionTaken: null,
            durationMs: Date.now() - startTime,
          });
          continue;
        }

        // Evaluate rules
        const allRulesPassed = flow.rules.length === 0 || flow.rules.every((r) => evaluateRule(r, record));

        if (!allRulesPassed) {
          results.push({
            flowId: flow.id,
            flowName: flow.name,
            matched: true,
            rulesPassed: false,
            actionTaken: null,
            durationMs: Date.now() - startTime,
          });

          // Update flow stats — counted as a run but not a failure
          upsertFlow({
            ...flow,
            totalRuns: flow.totalRuns + 1,
            avgTimeMs: Math.round(
              (flow.avgTimeMs * flow.totalRuns + (Date.now() - startTime)) /
                (flow.totalRuns + 1),
            ),
            lastRun: new Date().toISOString(),
          });

          continue;
        }

        // Execute action
        try {
          const { notificationType, notificationTitle, notificationBody, notificationSeverity, recordUpdates } = executeAction(
            flow.action,
            record,
            flow,
          );

          if (recordUpdates) {
            updateRecord(record.id, recordUpdates);
          }

          addNotification({
            type: notificationType,
            title: notificationTitle,
            body: notificationBody,
            severity: notificationSeverity,
            sourceEntityType: 'record',
            sourceEntityId: record.id,
          });

          const durationMs = Date.now() - startTime;
          upsertFlow({
            ...flow,
            totalRuns: flow.totalRuns + 1,
            avgTimeMs: Math.round(
              (flow.avgTimeMs * flow.totalRuns + durationMs) / (flow.totalRuns + 1),
            ),
            lastRun: new Date().toISOString(),
          });

          const runEntry: FlowRunEntry = {
            id: `fre-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            flowId: flow.id,
            flowName: flow.name,
            recordId: record.id,
            recordTitle: record.title,
            event,
            status: 'success',
            actionTaken: flow.action,
            durationMs,
            timestamp: new Date().toISOString(),
          };
          addFlowRunEntry(runEntry);

          results.push({
            flowId: flow.id,
            flowName: flow.name,
            matched: true,
            rulesPassed: true,
            actionTaken: flow.action,
            durationMs,
          });
        } catch (err) {
          const durationMs = Date.now() - startTime;
          upsertFlow({
            ...flow,
            totalRuns: flow.totalRuns + 1,
            failures7d: flow.failures7d + 1,
            avgTimeMs: Math.round(
              (flow.avgTimeMs * flow.totalRuns + durationMs) / (flow.totalRuns + 1),
            ),
            lastRun: new Date().toISOString(),
          });

          addNotification({
            type: 'flow-failed',
            title: `Flow Failed: ${flow.name}`,
            body: `${flow.name} failed on "${record.title}" — ${String(err)}`,
            severity: 'error',
            sourceEntityType: 'flow',
            sourceEntityId: flow.id,
          });

          const errorEntry: FlowRunEntry = {
            id: `fre-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            flowId: flow.id,
            flowName: flow.name,
            recordId: record.id,
            recordTitle: record.title,
            event,
            status: 'failed',
            actionTaken: null,
            durationMs,
            error: String(err),
            timestamp: new Date().toISOString(),
          };
          addFlowRunEntry(errorEntry);

          results.push({
            flowId: flow.id,
            flowName: flow.name,
            matched: true,
            rulesPassed: true,
            actionTaken: null,
            durationMs,
            error: String(err),
          });
        }
      }

      runningRef.current = false;
      return results;
    },
    [data.flows, updateRecord, upsertFlow, addFlowRunEntry],
  );

  const onRecordCreated = useCallback(
    (
      record: RuntimeRecord,
      addNotification: (partial: Omit<AppNotification, 'id' | 'tenantId' | 'read' | 'createdAt'>) => void,
    ) => evaluateFlows('record.created', record, addNotification),
    [evaluateFlows],
  );

  const onRecordUpdated = useCallback(
    (
      record: RuntimeRecord,
      addNotification: (partial: Omit<AppNotification, 'id' | 'tenantId' | 'read' | 'createdAt'>) => void,
    ) => evaluateFlows('record.updated', record, addNotification),
    [evaluateFlows],
  );

  const onLifecycleTransition = useCallback(
    (
      record: RuntimeRecord,
      addNotification: (partial: Omit<AppNotification, 'id' | 'tenantId' | 'read' | 'createdAt'>) => void,
    ) => evaluateFlows('lifecycle.transition', record, addNotification),
    [evaluateFlows],
  );

  return { evaluateFlows, onRecordCreated, onRecordUpdated, onLifecycleTransition };
}
