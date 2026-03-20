import React, { useMemo, useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';
import { InteractivePressable as Pressable } from '../../components/InteractivePressable';
import { useAppState } from '../../context/AppStateContext';
import { useUiTheme } from '../../context/UiThemeContext';
import {
  AccountingPeriod,
  DistributionWaterfall,
  FinancialValidationError,
  GlAccount,
  IngestionRecord,
  JournalLine,
  Payable,
  Receivable,
} from '../../types';
import { Card } from './components';
import { GuidedPageProps } from './types';

// ─── Constants ───────────────────────────────────────────────────────────────
type FinTab = 'mission' | 'ledger' | 'payables' | 'receivables' | 'waterfalls' | 'reports';
type LedgerSubTab = 'accounts' | 'entries' | 'periods';
type ReportType = 'trial_balance' | 'income_statement' | 'balance_sheet';

const FIN_TABS: { id: FinTab; label: string; icon: string }[] = [
  { id: 'mission', label: 'Mission Control', icon: '🎯' },
  { id: 'ledger', label: 'Ledger', icon: '📒' },
  { id: 'payables', label: 'Payables', icon: '📤' },
  { id: 'receivables', label: 'Receivables', icon: '📥' },
  { id: 'waterfalls', label: 'Waterfalls', icon: '🌊' },
  { id: 'reports', label: 'Reports', icon: '📊' },
];

const ACCENT = '#F59E0B';
const SUCCESS = '#10B981';
const DANGER = '#EF4444';
const INFO = '#6366F1';

function fmtCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

function fmtDate(iso: string) {
  return iso.slice(0, 10);
}

// ─── Sub-components ──────────────────────────────────────────────────────────
function StatusBadge({ label, color }: { label: string; color: string }) {
  return (
    <View style={{
      borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2,
      backgroundColor: `${color}22`, borderWidth: 1, borderColor: `${color}66`,
      alignSelf: 'flex-start',
    }}>
      <Text style={{ color, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' }}>{label.replace(/_/g, ' ')}</Text>
    </View>
  );
}

function ValidationErrors({ errors }: { errors: FinancialValidationError[] }) {
  if (!errors.length) return null;
  return (
    <View style={{ marginTop: 8, gap: 4 }}>
      {errors.map((e, i) => (
        <View key={i} style={{ borderRadius: 8, padding: 10, backgroundColor: `${DANGER}18`, borderWidth: 1, borderColor: `${DANGER}44` }}>
          <Text style={{ color: DANGER, fontSize: 12, fontWeight: '700' }}>{e.errorCode}</Text>
          <Text style={{ color: 'rgba(239,68,68,0.85)', fontSize: 12, marginTop: 2 }}>{e.message}</Text>
        </View>
      ))}
    </View>
  );
}

function PayableStatusColor(s: Payable['approvalStatus'] | Payable['paymentStatus']): string {
  if (s === 'approved') return SUCCESS;
  if (s === 'paid') return INFO;
  if (s === 'pending_approval') return ACCENT;
  if (s === 'outstanding') return ACCENT;
  if (s === 'partial') return '#F97316';
  if (s === 'disputed') return DANGER;
  return '#8878AE';
}

function ReceiptStatusColor(s: Receivable['receiptStatus']): string {
  if (s === 'received') return SUCCESS;
  if (s === 'partial') return '#F97316';
  if (s === 'written_off') return DANGER;
  return '#8878AE';
}

function JeStatusColor(s: string): string {
  if (s === 'posted') return SUCCESS;
  if (s === 'pending_approval') return ACCENT;
  if (s === 'approved') return INFO;
  return '#8878AE';
}

function WaterfallStatusColor(s: string): string {
  if (s === 'approved' || s === 'complete') return SUCCESS;
  if (s === 'executing') return INFO;
  if (s === 'pending_approval') return ACCENT;
  if (s === 'failed') return DANGER;
  return '#8878AE';
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function FinancialPage({}: GuidedPageProps) {
  const { data, currentUser,
    postJournalEntry, submitJournalEntryForApproval,
    addJournalEntry,
    approvePayable, markPayablePaid, addPayable,
    addReceivable, confirmReceivable,
    approveWaterfall, addWaterfall,
    closeAccountingPeriod,
    confirmIngestionRecord, rejectIngestionRecord,
  } = useAppState();
  const { styles } = useUiTheme();

  const [tab, setTab] = useState<FinTab>('mission');
  const [ledgerSubTab, setLedgerSubTab] = useState<LedgerSubTab>('accounts');
  const [reportType, setReportType] = useState<ReportType>('trial_balance');
  const [lastErrors, setLastErrors] = useState<FinancialValidationError[]>([]);

  // ── Journal Entry Create State ──────────────────────────────────────────────
  const [jeDesc, setJeDesc] = useState('');
  const [jeDate, setJeDate] = useState(new Date().toISOString().slice(0, 10));
  const [jePeriodId, setJePeriodId] = useState('');
  const [jeLines, setJeLines] = useState<Partial<JournalLine & { debitStr: string; creditStr: string }>[]>([
    { id: '', accountId: '', debitStr: '', creditStr: '', memo: '' },
    { id: '', accountId: '', debitStr: '', creditStr: '', memo: '' },
  ]);

  // ── Payable Create State ────────────────────────────────────────────────────
  const [apTo, setApTo] = useState('');
  const [apAmount, setApAmount] = useState('');
  const [apDue, setApDue] = useState('');
  const [apNotes, setApNotes] = useState('');

  // ── Receivable Create State ─────────────────────────────────────────────────
  const [arFrom, setArFrom] = useState('');
  const [arAmount, setArAmount] = useState('');
  const [arNotes, setArNotes] = useState('');

  // Data aliases
  const glAccounts: GlAccount[] = data.glAccounts ?? [];
  const periods: AccountingPeriod[] = data.accountingPeriods ?? [];
  const journalEntries = data.journalEntries ?? [];
  const payables = data.payables ?? [];
  const receivables = data.receivables ?? [];
  const waterfalls: DistributionWaterfall[] = data.waterfalls ?? [];

  const openPeriod = periods.find((p) => p.status === 'open');

  // ── Pending Counts ──────────────────────────────────────────────────────────
  const pendingJEs = journalEntries.filter((e) => e.postingStatus === 'pending_approval');
  const pendingPayables = payables.filter((p) => p.approvalStatus === 'pending_approval');
  const pendingWaterfalls = waterfalls.filter((w) => w.executionStatus === 'pending_approval');
  const pendingIngestionRecords: IngestionRecord[] = (data.ingestionRecords ?? []).filter((r) => r.reviewStatus === 'pending_review');
  const pendingTotal = pendingJEs.length + pendingPayables.length + pendingWaterfalls.length + pendingIngestionRecords.length;

  // ── Trial Balance Computation ───────────────────────────────────────────────
  const trialBalance = useMemo(() => {
    const postedLines = journalEntries
      .filter((e) => e.postingStatus === 'posted')
      .flatMap((e) => e.lines);

    return glAccounts.map((acct) => {
      const lines = postedLines.filter((l) => l.accountId === acct.id);
      const totalDebit = lines.reduce((s, l) => s + l.debitAmount, 0);
      const totalCredit = lines.reduce((s, l) => s + l.creditAmount, 0);
      const netBalance = acct.normalBalance === 'debit' ? totalDebit - totalCredit : totalCredit - totalDebit;
      return { acct, totalDebit, totalCredit, netBalance };
    }).filter((r) => r.totalDebit !== 0 || r.totalCredit !== 0 || r.netBalance !== 0);
  }, [glAccounts, journalEntries]);

  const totalDebits = trialBalance.reduce((s, r) => s + r.totalDebit, 0);
  const totalCredits = trialBalance.reduce((s, r) => s + r.totalCredit, 0);

  // ── Income Statement ────────────────────────────────────────────────────────
  const incomeStatement = useMemo(() => {
    const postedLines = journalEntries
      .filter((e) => e.postingStatus === 'posted')
      .flatMap((e) => e.lines);
    const revenueAccounts = glAccounts.filter((a) => a.accountType === 'revenue');
    const expenseAccounts = glAccounts.filter((a) => a.accountType === 'expense');

    const acctNet = (acct: GlAccount) => {
      const lines = postedLines.filter((l) => l.accountId === acct.id);
      const d = lines.reduce((s, l) => s + l.debitAmount, 0);
      const c = lines.reduce((s, l) => s + l.creditAmount, 0);
      return acct.normalBalance === 'credit' ? c - d : d - c;
    };

    const revenues = revenueAccounts.map((a) => ({ acct: a, amount: acctNet(a) }));
    const expenses = expenseAccounts.map((a) => ({ acct: a, amount: acctNet(a) }));
    const totalRevenue = revenues.reduce((s, r) => s + r.amount, 0);
    const totalExpenses = expenses.reduce((s, r) => s + r.amount, 0);
    return { revenues, expenses, totalRevenue, totalExpenses, netIncome: totalRevenue - totalExpenses };
  }, [glAccounts, journalEntries]);

  // ── Balance Sheet ───────────────────────────────────────────────────────────
  const balanceSheet = useMemo(() => {
    const postedLines = journalEntries
      .filter((e) => e.postingStatus === 'posted')
      .flatMap((e) => e.lines);

    const acctNet = (acct: GlAccount) => {
      const lines = postedLines.filter((l) => l.accountId === acct.id);
      const d = lines.reduce((s, l) => s + l.debitAmount, 0);
      const c = lines.reduce((s, l) => s + l.creditAmount, 0);
      return acct.normalBalance === 'debit' ? d - c : c - d;
    };

    const assets = glAccounts.filter((a) => a.accountType === 'asset').map((a) => ({ acct: a, amount: acctNet(a) }));
    const liabilities = glAccounts.filter((a) => a.accountType === 'liability').map((a) => ({ acct: a, amount: acctNet(a) }));
    const equity = glAccounts.filter((a) => a.accountType === 'equity').map((a) => ({ acct: a, amount: acctNet(a) }));
    const totalAssets = assets.reduce((s, r) => s + r.amount, 0);
    const totalLiabilities = liabilities.reduce((s, r) => s + r.amount, 0);
    const totalEquity = equity.reduce((s, r) => s + r.amount, 0) + incomeStatement.netIncome;
    return { assets, liabilities, equity, totalAssets, totalLiabilities, totalEquity, balanced: Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01 };
  }, [glAccounts, journalEntries, incomeStatement.netIncome]);

  // ── Handlers ────────────────────────────────────────────────────────────────
  function handlePostJE(entryId: string) {
    const userId = currentUser?.id ?? 'user-admin';
    const result = postJournalEntry(entryId, userId);
    setLastErrors(result.errors ?? []);
  }

  function handleSubmitJEForApproval(entryId: string) {
    const result = submitJournalEntryForApproval(entryId);
    if (!result.ok) setLastErrors([{ errorCode: 'GL_FIELD_LOCKED', message: result.reason ?? 'Error.' }]);
  }

  function handleCreateJE() {
    const lines = jeLines
      .filter((l) => l.accountId)
      .map((l, i) => ({
        id: '',
        entryId: '',
        accountId: l.accountId ?? '',
        debitAmount: parseFloat(l.debitStr ?? '0') || 0,
        creditAmount: parseFloat(l.creditStr ?? '0') || 0,
        memo: l.memo,
        lineOrder: i + 1,
      }));
    const result = addJournalEntry({
      transactionDate: jeDate,
      description: jeDesc,
      sourceType: 'manual',
      periodId: jePeriodId || (openPeriod?.id ?? ''),
      createdBy: currentUser?.id ?? 'user-admin',
      createdAt: new Date().toISOString(),
      lines,
    });
    if (result.ok) {
      setLastErrors([]);
      setJeDesc(''); setJeLines([
        { id: '', accountId: '', debitStr: '', creditStr: '', memo: '' },
        { id: '', accountId: '', debitStr: '', creditStr: '', memo: '' },
      ]);
    } else {
      setLastErrors(result.errors ?? []);
    }
  }

  function handleCreatePayable() {
    const amount = parseFloat(apAmount);
    if (!apTo.trim() || !amount || !apDue) return;
    addPayable({
      payableTo: apTo.trim(),
      obligationDate: new Date().toISOString().slice(0, 10),
      dueDate: apDue,
      amountDue: amount,
      amountPaid: 0,
      paymentStatus: 'outstanding',
      approvalStatus: 'draft',
      liabilityAccountId: glAccounts.find((a) => a.accountNumber === '2000')?.id ?? 'acct-2000',
      expenseAccountId: glAccounts.find((a) => a.accountNumber === '5100')?.id ?? 'acct-5100',
      notes: apNotes,
      createdBy: currentUser?.id ?? 'user-admin',
      createdAt: new Date().toISOString(),
    });
    setApTo(''); setApAmount(''); setApDue(''); setApNotes('');
  }

  function handleCreateReceivable() {
    const amount = parseFloat(arAmount);
    if (!arFrom.trim() || !amount) return;
    addReceivable({
      receivableFrom: arFrom.trim(),
      invoicedAmount: amount,
      receivedAmount: 0,
      receiptStatus: 'pending',
      arAccountId: glAccounts.find((a) => a.accountNumber === '1100')?.id ?? 'acct-1100',
      revenueAccountId: glAccounts.find((a) => a.accountNumber === '4000')?.id ?? 'acct-4000',
      notes: arNotes,
      createdBy: currentUser?.id ?? 'user-admin',
      createdAt: new Date().toISOString(),
    });
    setArFrom(''); setArAmount(''); setArNotes('');
  }

  // ── Render helpers ────────────────────────────────────────────────────────
  function renderTabBar() {
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexShrink: 0 }} contentContainerStyle={{ gap: 6, padding: 2, paddingBottom: 4 }}>
        {FIN_TABS.map((t) => {
          const active = tab === t.id;
          const badgeCount = t.id === 'mission' ? pendingTotal : 0;
          return (
            <Pressable key={t.id} onPress={() => setTab(t.id)} style={{
              flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8,
              borderRadius: 10, borderWidth: 1,
              borderColor: active ? `${ACCENT}88` : 'rgba(255,255,255,0.1)',
              backgroundColor: active ? `${ACCENT}18` : 'rgba(255,255,255,0.04)',
            }}>
              <Text style={{ fontSize: 14 }}>{t.icon}</Text>
              <Text style={{ color: active ? ACCENT : 'rgba(243,234,255,0.6)', fontSize: 13, fontWeight: active ? '700' : '500' }}>{t.label}</Text>
              {badgeCount > 0 && (
                <View style={{ backgroundColor: DANGER, borderRadius: 999, minWidth: 18, height: 18, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>{badgeCount}</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </ScrollView>
    );
  }

  // ── Mission Control ──────────────────────────────────────────────────────
  function renderMissionControl() {
    const hasItems = pendingJEs.length + pendingPayables.length + pendingWaterfalls.length + pendingIngestionRecords.length > 0;
    return (
      <View style={{ gap: 16 }}>
        <View>
          <Text style={{ color: ACCENT, fontSize: 13, fontWeight: '700', marginBottom: 2 }}>HUMAN OVERSIGHT LAYER</Text>
          <Text style={{ color: 'rgba(243,234,255,0.55)', fontSize: 12 }}>
            Every financial action that requires approval surfaces here. Review, validate, and act — nothing posts without deliberate authorization.
          </Text>
        </View>
        {!hasItems && (
          <View style={{ borderRadius: 12, padding: 16, backgroundColor: `${SUCCESS}12`, borderWidth: 1, borderColor: `${SUCCESS}30`, alignItems: 'center' }}>
            <Text style={{ fontSize: 22 }}>✅</Text>
            <Text style={{ color: SUCCESS, fontSize: 14, fontWeight: '700', marginTop: 6 }}>Decision Queue Empty</Text>
            <Text style={{ color: 'rgba(16,185,129,0.7)', fontSize: 12, marginTop: 2 }}>All items have been processed.</Text>
          </View>
        )}
        {lastErrors.length > 0 && <ValidationErrors errors={lastErrors} />}

        {/* Pending Journal Entries */}
        {pendingJEs.length > 0 && (
          <Card title={`📒 Pending Journal Entries (${pendingJEs.length})`}>
            {pendingJEs.map((entry) => (
              <View key={entry.id} style={{ borderRadius: 10, padding: 12, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.09)', gap: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={{ color: '#F3EAFF', fontSize: 13, fontWeight: '700' }}>{entry.entryRef}</Text>
                  <StatusBadge label={entry.postingStatus} color={JeStatusColor(entry.postingStatus)} />
                </View>
                <Text style={{ color: 'rgba(243,234,255,0.65)', fontSize: 12 }}>{entry.description}</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Text style={{ color: 'rgba(243,234,255,0.5)', fontSize: 11 }}>DR {fmtCurrency(entry.debitTotal)}</Text>
                  <Text style={{ color: 'rgba(243,234,255,0.5)', fontSize: 11 }}>•</Text>
                  <Text style={{ color: 'rgba(243,234,255,0.5)', fontSize: 11 }}>CR {fmtCurrency(entry.creditTotal)}</Text>
                  <Text style={{ color: 'rgba(243,234,255,0.5)', fontSize: 11 }}>•</Text>
                  <Text style={{ color: 'rgba(243,234,255,0.5)', fontSize: 11 }}>{fmtDate(entry.transactionDate)}</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Pressable onPress={() => handlePostJE(entry.id)} style={{ flex: 1, borderRadius: 8, paddingVertical: 8, backgroundColor: `${SUCCESS}22`, borderWidth: 1, borderColor: `${SUCCESS}55`, alignItems: 'center' }}>
                    <Text style={{ color: SUCCESS, fontSize: 12, fontWeight: '700' }}>Post Entry</Text>
                  </Pressable>
                  <Pressable onPress={() => {/* reject/void */}} style={{ flex: 1, borderRadius: 8, paddingVertical: 8, backgroundColor: `${DANGER}18`, borderWidth: 1, borderColor: `${DANGER}44`, alignItems: 'center' }}>
                    <Text style={{ color: DANGER, fontSize: 12, fontWeight: '700' }}>Reject</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </Card>
        )}

        {/* Pending Payables */}
        {pendingPayables.length > 0 && (
          <Card title={`📤 Payables Awaiting Approval (${pendingPayables.length})`}>
            {pendingPayables.map((p) => (
              <View key={p.id} style={{ borderRadius: 10, padding: 12, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.09)', gap: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={{ color: '#F3EAFF', fontSize: 13, fontWeight: '700' }}>{p.payableRef}</Text>
                  <StatusBadge label={p.approvalStatus} color={PayableStatusColor(p.approvalStatus)} />
                </View>
                <Text style={{ color: 'rgba(243,234,255,0.65)', fontSize: 12 }}>{p.payableTo} — {p.externalRef ?? 'No ref'}</Text>
                <Text style={{ color: ACCENT, fontSize: 14, fontWeight: '700' }}>{fmtCurrency(p.amountDue)} <Text style={{ color: 'rgba(243,234,255,0.4)', fontSize: 11, fontWeight: '400' }}>due {fmtDate(p.dueDate)}</Text></Text>
                {p.notes && <Text style={{ color: 'rgba(243,234,255,0.5)', fontSize: 11, fontStyle: 'italic' }}>{p.notes}</Text>}
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Pressable onPress={() => approvePayable(p.id, currentUser?.id ?? 'user-admin')} style={{ flex: 1, borderRadius: 8, paddingVertical: 8, backgroundColor: `${SUCCESS}22`, borderWidth: 1, borderColor: `${SUCCESS}55`, alignItems: 'center' }}>
                    <Text style={{ color: SUCCESS, fontSize: 12, fontWeight: '700' }}>Approve</Text>
                  </Pressable>
                  <Pressable onPress={() => {/* reject */}} style={{ flex: 1, borderRadius: 8, paddingVertical: 8, backgroundColor: `${DANGER}18`, borderWidth: 1, borderColor: `${DANGER}44`, alignItems: 'center' }}>
                    <Text style={{ color: DANGER, fontSize: 12, fontWeight: '700' }}>Reject</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </Card>
        )}

        {/* Ingestion Review Queue — WS-048-ADD */}
        {pendingIngestionRecords.length > 0 && (
          <Card title={`📥 Ingestion Review Queue (${pendingIngestionRecords.length})`}>
            <Text style={{ color: 'rgba(243,234,255,0.5)', fontSize: 12, marginBottom: 10, lineHeight: 18 }}>
              These documents arrived via OCR but one or more extracted fields scored below the confidence threshold.
              Review the extracted values, then confirm to continue downstream processing or reject the document.
            </Text>
            {pendingIngestionRecords.map((rec) => (
              <View key={rec.id} style={{ borderRadius: 10, padding: 12, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)', gap: 8, marginBottom: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View>
                    <Text style={{ color: '#F3EAFF', fontSize: 13, fontWeight: '700' }}>{rec.id}</Text>
                    <Text style={{ color: 'rgba(243,234,255,0.45)', fontSize: 11 }}>{rec.sourceRef} · {rec.receivedAt.slice(0, 16).replace('T', ' ')}</Text>
                  </View>
                  <View style={{ borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3, backgroundColor: '#EF444422', borderWidth: 1, borderColor: '#EF444444' }}>
                    <Text style={{ color: DANGER, fontSize: 10, fontWeight: '700' }}>PENDING REVIEW</Text>
                  </View>
                </View>
                {(rec.fieldsBelowThreshold ?? []).length > 0 && (
                  <View style={{ borderRadius: 8, padding: 8, backgroundColor: 'rgba(239,68,68,0.07)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)', gap: 4 }}>
                    <Text style={{ color: DANGER, fontSize: 11, fontWeight: '700', marginBottom: 2 }}>Fields Below Confidence Threshold</Text>
                    {(rec.fieldsBelowThreshold ?? []).map((f, i) => (
                      <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ color: 'rgba(243,234,255,0.6)', fontSize: 11 }}>{f.slug}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <Text style={{ color: 'rgba(243,234,255,0.8)', fontSize: 11 }}>"{f.value}"</Text>
                          <Text style={{ color: DANGER, fontSize: 11, fontWeight: '700' }}>{(f.confidence * 100).toFixed(0)}%</Text>
                          <Text style={{ color: 'rgba(243,234,255,0.35)', fontSize: 10 }}>min {(f.threshold * 100).toFixed(0)}%</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
                <Text style={{ color: 'rgba(243,234,255,0.4)', fontSize: 11 }}>
                  Overall confidence: <Text style={{ color: DANGER, fontWeight: '700' }}>{(rec.overallConfidence * 100).toFixed(0)}%</Text>
                  {rec.eventFired ? `  ·  ${rec.eventFired}` : ''}
                </Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Pressable
                    onPress={() => confirmIngestionRecord(rec.id, {}, currentUser?.id ?? 'user-admin')}
                    style={{ flex: 1, borderRadius: 8, paddingVertical: 8, backgroundColor: `${SUCCESS}22`, borderWidth: 1, borderColor: `${SUCCESS}55`, alignItems: 'center' }}>
                    <Text style={{ color: SUCCESS, fontSize: 12, fontWeight: '700' }}>Confirm & Process</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => rejectIngestionRecord(rec.id, 'Rejected by reviewer', currentUser?.id ?? 'user-admin')}
                    style={{ flex: 1, borderRadius: 8, paddingVertical: 8, backgroundColor: `${DANGER}18`, borderWidth: 1, borderColor: `${DANGER}44`, alignItems: 'center' }}>
                    <Text style={{ color: DANGER, fontSize: 12, fontWeight: '700' }}>Reject Document</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </Card>
        )}

        {/* Pending Waterfalls */}
        {pendingWaterfalls.length > 0 && (
          <Card title={`🌊 Waterfalls Awaiting Approval (${pendingWaterfalls.length})`}>
            {pendingWaterfalls.map((wf) => (
              <View key={wf.id} style={{ borderRadius: 10, padding: 12, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.09)', gap: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={{ color: '#F3EAFF', fontSize: 13, fontWeight: '700' }}>{wf.waterfallRef}</Text>
                  <StatusBadge label={wf.executionStatus} color={WaterfallStatusColor(wf.executionStatus)} />
                </View>
                {wf.description && <Text style={{ color: 'rgba(243,234,255,0.65)', fontSize: 12 }}>{wf.description}</Text>}
                <Text style={{ color: ACCENT, fontSize: 14, fontWeight: '700' }}>{fmtCurrency(wf.totalAmount)} <Text style={{ color: 'rgba(243,234,255,0.45)', fontSize: 11, fontWeight: '400' }}>across {wf.parties.length} parties</Text></Text>
                <View style={{ gap: 4 }}>
                  {wf.parties.map((party) => (
                    <View key={party.id} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ color: 'rgba(243,234,255,0.6)', fontSize: 11 }}>{party.partyName}</Text>
                      <Text style={{ color: 'rgba(243,234,255,0.85)', fontSize: 11, fontWeight: '600' }}>{fmtCurrency(party.paymentAmount)}</Text>
                    </View>
                  ))}
                </View>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Pressable onPress={() => approveWaterfall(wf.id, currentUser?.id ?? 'user-admin')} style={{ flex: 1, borderRadius: 8, paddingVertical: 8, backgroundColor: `${SUCCESS}22`, borderWidth: 1, borderColor: `${SUCCESS}55`, alignItems: 'center' }}>
                    <Text style={{ color: SUCCESS, fontSize: 12, fontWeight: '700' }}>Approve Distribution</Text>
                  </Pressable>
                  <Pressable onPress={() => {/* reject */}} style={{ flex: 1, borderRadius: 8, paddingVertical: 8, backgroundColor: `${DANGER}18`, borderWidth: 1, borderColor: `${DANGER}44`, alignItems: 'center' }}>
                    <Text style={{ color: DANGER, fontSize: 12, fontWeight: '700' }}>Reject</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </Card>
        )}
      </View>
    );
  }

  // ── Ledger Tab ────────────────────────────────────────────────────────────
  function renderLedger() {
    const acctGroups: { type: string; label: string; accounts: GlAccount[] }[] = [
      { type: 'asset', label: 'Assets', accounts: glAccounts.filter((a) => a.accountType === 'asset') },
      { type: 'liability', label: 'Liabilities', accounts: glAccounts.filter((a) => a.accountType === 'liability') },
      { type: 'equity', label: 'Equity', accounts: glAccounts.filter((a) => a.accountType === 'equity') },
      { type: 'revenue', label: 'Revenue', accounts: glAccounts.filter((a) => a.accountType === 'revenue') },
      { type: 'expense', label: 'Expenses', accounts: glAccounts.filter((a) => a.accountType === 'expense') },
    ].filter((g) => g.accounts.length > 0);

    return (
      <View style={{ gap: 16 }}>
        {/* Sub-tab bar */}
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {(['accounts', 'entries', 'periods'] as LedgerSubTab[]).map((id) => {
            const labels: Record<LedgerSubTab, string> = { accounts: '📋 Accounts', entries: '📝 Entries', periods: '📅 Periods' };
            const active = ledgerSubTab === id;
            return (
              <Pressable key={id} onPress={() => setLedgerSubTab(id)} style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, borderWidth: 1, borderColor: active ? `${INFO}66` : 'rgba(255,255,255,0.1)', backgroundColor: active ? `${INFO}18` : 'transparent' }}>
                <Text style={{ color: active ? '#818CF8' : 'rgba(243,234,255,0.5)', fontSize: 12, fontWeight: active ? '700' : '500' }}>{labels[id]}</Text>
              </Pressable>
            );
          })}
        </View>

        {/* Chart of Accounts */}
        {ledgerSubTab === 'accounts' && (
          <View style={{ gap: 12 }}>
            {acctGroups.map((group) => (
              <Card key={group.type} title={group.label}>
                {group.accounts.map((acct) => (
                  <View key={acct.id} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: '#F3EAFF', fontSize: 13 }}>{acct.accountNumber} — {acct.accountName}</Text>
                      <Text style={{ color: 'rgba(243,234,255,0.45)', fontSize: 11 }}>{acct.normalBalance} normal • {acct.isActive ? 'active' : 'inactive'}</Text>
                    </View>
                    <StatusBadge label={group.type} color={group.type === 'asset' ? INFO : group.type === 'liability' ? DANGER : group.type === 'equity' ? SUCCESS : group.type === 'revenue' ? ACCENT : '#8878AE'} />
                  </View>
                ))}
              </Card>
            ))}
          </View>
        )}

        {/* Journal Entries */}
        {ledgerSubTab === 'entries' && (
          <View style={{ gap: 12 }}>
            {lastErrors.length > 0 && <ValidationErrors errors={lastErrors} />}
            <Card title="Create Journal Entry">
              <TextInput
                value={jeDesc} onChangeText={setJeDesc} placeholder="Description" placeholderTextColor="rgba(243,234,255,0.3)"
                style={[styles.inputField, { marginBottom: 8 }]}
              />
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                <TextInput
                  value={jeDate} onChangeText={setJeDate} placeholder="YYYY-MM-DD" placeholderTextColor="rgba(243,234,255,0.3)"
                  style={[styles.inputField, { flex: 1 }]}
                />
                <TextInput
                  value={jePeriodId || (openPeriod?.periodName ?? '')} onChangeText={setJePeriodId}
                  placeholder="Period ID" placeholderTextColor="rgba(243,234,255,0.3)"
                  style={[styles.inputField, { flex: 1 }]}
                />
              </View>
              <Text style={{ color: 'rgba(243,234,255,0.45)', fontSize: 11, marginBottom: 8 }}>Journal Lines (Account # · Debit · Credit · Memo)</Text>
              {jeLines.map((line, idx) => (
                <View key={idx} style={{ flexDirection: 'row', gap: 6, marginBottom: 6, alignItems: 'center' }}>
                  <TextInput
                    value={line.accountId} onChangeText={(v) => setJeLines((ls) => ls.map((l, i) => i === idx ? { ...l, accountId: v } : l))}
                    placeholder="Acct #" placeholderTextColor="rgba(243,234,255,0.3)"
                    style={[styles.inputField, { flex: 2 }]}
                  />
                  <TextInput
                    value={line.debitStr} onChangeText={(v) => setJeLines((ls) => ls.map((l, i) => i === idx ? { ...l, debitStr: v } : l))}
                    placeholder="DR" keyboardType="decimal-pad" placeholderTextColor="rgba(243,234,255,0.3)"
                    style={[styles.inputField, { flex: 1.5 }]}
                  />
                  <TextInput
                    value={line.creditStr} onChangeText={(v) => setJeLines((ls) => ls.map((l, i) => i === idx ? { ...l, creditStr: v } : l))}
                    placeholder="CR" keyboardType="decimal-pad" placeholderTextColor="rgba(243,234,255,0.3)"
                    style={[styles.inputField, { flex: 1.5 }]}
                  />
                  <TextInput
                    value={line.memo ?? ''} onChangeText={(v) => setJeLines((ls) => ls.map((l, i) => i === idx ? { ...l, memo: v } : l))}
                    placeholder="Memo" placeholderTextColor="rgba(243,234,255,0.3)"
                    style={[styles.inputField, { flex: 2 }]}
                  />
                </View>
              ))}
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                <Pressable onPress={() => setJeLines((ls) => [...ls, { id: '', accountId: '', debitStr: '', creditStr: '', memo: '' }])} style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', alignItems: 'center' }}>
                  <Text style={{ color: 'rgba(243,234,255,0.5)', fontSize: 12 }}>+ Add Line</Text>
                </Pressable>
                <Pressable onPress={handleCreateJE} style={{ flex: 1, paddingVertical: 8, borderRadius: 8, backgroundColor: `${ACCENT}22`, borderWidth: 1, borderColor: `${ACCENT}55`, alignItems: 'center' }}>
                  <Text style={{ color: ACCENT, fontSize: 13, fontWeight: '700' }}>Save Journal Entry</Text>
                </Pressable>
              </View>
            </Card>

            <Card title={`Journal Entries (${journalEntries.length})`}>
              {journalEntries.length === 0 && <Text style={{ color: 'rgba(243,234,255,0.45)', fontSize: 13 }}>No entries yet.</Text>}
              {journalEntries.map((entry) => (
                <View key={entry.id} style={{ borderRadius: 10, padding: 10, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', gap: 6, marginBottom: 8 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Text style={{ color: '#F3EAFF', fontSize: 12, fontWeight: '700', flex: 1 }}>{entry.entryRef}</Text>
                    <StatusBadge label={entry.postingStatus} color={JeStatusColor(entry.postingStatus)} />
                  </View>
                  <Text style={{ color: 'rgba(243,234,255,0.6)', fontSize: 12 }}>{entry.description}</Text>
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    <Text style={{ color: 'rgba(243,234,255,0.45)', fontSize: 11 }}>DR {fmtCurrency(entry.debitTotal)}</Text>
                    <Text style={{ color: 'rgba(243,234,255,0.45)', fontSize: 11 }}>CR {fmtCurrency(entry.creditTotal)}</Text>
                    <Text style={{ color: 'rgba(243,234,255,0.35)', fontSize: 11 }}>{fmtDate(entry.transactionDate)}</Text>
                  </View>
                  {entry.postingStatus === 'draft' && (
                    <Pressable onPress={() => handleSubmitJEForApproval(entry.id)} style={{ paddingVertical: 6, borderRadius: 8, backgroundColor: `${ACCENT}18`, borderWidth: 1, borderColor: `${ACCENT}44`, alignItems: 'center' }}>
                      <Text style={{ color: ACCENT, fontSize: 11, fontWeight: '700' }}>Submit for Approval →</Text>
                    </Pressable>
                  )}
                  {entry.postingStatus === 'pending_approval' && (
                    <Pressable onPress={() => handlePostJE(entry.id)} style={{ paddingVertical: 6, borderRadius: 8, backgroundColor: `${SUCCESS}18`, borderWidth: 1, borderColor: `${SUCCESS}44`, alignItems: 'center' }}>
                      <Text style={{ color: SUCCESS, fontSize: 11, fontWeight: '700' }}>Post Entry ✓</Text>
                    </Pressable>
                  )}
                </View>
              ))}
            </Card>
          </View>
        )}

        {/* Periods */}
        {ledgerSubTab === 'periods' && (
          <Card title="Accounting Periods — FY 2026">
            {periods.map((period) => (
              <View key={period.id} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#F3EAFF', fontSize: 13 }}>{period.periodName}</Text>
                  {period.closedAt && <Text style={{ color: 'rgba(243,234,255,0.4)', fontSize: 11 }}>Closed {fmtDate(period.closedAt)}</Text>}
                </View>
                <StatusBadge label={period.status} color={period.status === 'open' ? SUCCESS : '#8878AE'} />
                {period.status === 'open' && (
                  <Pressable onPress={() => closeAccountingPeriod(period.id, currentUser?.id ?? 'user-admin')} style={{ marginLeft: 10, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 7, backgroundColor: `${DANGER}18`, borderWidth: 1, borderColor: `${DANGER}44` }}>
                    <Text style={{ color: DANGER, fontSize: 11, fontWeight: '700' }}>Close Period</Text>
                  </Pressable>
                )}
              </View>
            ))}
          </Card>
        )}
      </View>
    );
  }

  // ── Payables Tab ────────────────────────────────────────────────────────────
  function renderPayables() {
    return (
      <View style={{ gap: 16 }}>
        <Card title="Create Payable">
          <TextInput value={apTo} onChangeText={setApTo} placeholder="Payable to (vendor name)" placeholderTextColor="rgba(243,234,255,0.3)" style={[styles.inputField, { marginBottom: 8 }]} />
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
            <TextInput value={apAmount} onChangeText={setApAmount} placeholder="Amount ($)" keyboardType="decimal-pad" placeholderTextColor="rgba(243,234,255,0.3)" style={[styles.inputField, { flex: 1 }]} />
            <TextInput value={apDue} onChangeText={setApDue} placeholder="Due date (YYYY-MM-DD)" placeholderTextColor="rgba(243,234,255,0.3)" style={[styles.inputField, { flex: 1 }]} />
          </View>
          <TextInput value={apNotes} onChangeText={setApNotes} placeholder="Notes (optional)" placeholderTextColor="rgba(243,234,255,0.3)" style={[styles.inputField, { marginBottom: 8 }]} />
          <Pressable onPress={handleCreatePayable} style={{ paddingVertical: 10, borderRadius: 10, backgroundColor: `${ACCENT}22`, borderWidth: 1, borderColor: `${ACCENT}55`, alignItems: 'center' }}>
            <Text style={{ color: ACCENT, fontSize: 13, fontWeight: '700' }}>Add Payable</Text>
          </Pressable>
        </Card>

        <Card title={`Accounts Payable (${payables.length})`}>
          {payables.length === 0 && <Text style={{ color: 'rgba(243,234,255,0.45)', fontSize: 13 }}>No payables.</Text>}
          {payables.map((p) => (
            <View key={p.id} style={{ borderRadius: 10, padding: 10, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', gap: 6, marginBottom: 8 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ color: '#F3EAFF', fontSize: 13, fontWeight: '700', flex: 1 }}>{p.payableTo}</Text>
                <StatusBadge label={p.approvalStatus} color={PayableStatusColor(p.approvalStatus)} />
              </View>
              <Text style={{ color: 'rgba(243,234,255,0.5)', fontSize: 11 }}>{p.payableRef} {p.externalRef ? `• ${p.externalRef}` : ''}</Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ color: ACCENT, fontSize: 14, fontWeight: '700' }}>{fmtCurrency(p.amountDue)}</Text>
                <Text style={{ color: 'rgba(243,234,255,0.4)', fontSize: 11 }}>Due {fmtDate(p.dueDate)}</Text>
              </View>
              {p.amountPaid > 0 && <Text style={{ color: SUCCESS, fontSize: 11 }}>Paid: {fmtCurrency(p.amountPaid)}</Text>}
              {p.notes && <Text style={{ color: 'rgba(243,234,255,0.45)', fontSize: 11, fontStyle: 'italic' }}>{p.notes}</Text>}
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {p.approvalStatus === 'draft' && (
                  <Pressable onPress={() => approvePayable(p.id, currentUser?.id ?? 'user-admin')} style={{ flex: 1, paddingVertical: 6, borderRadius: 8, backgroundColor: `${SUCCESS}18`, borderWidth: 1, borderColor: `${SUCCESS}44`, alignItems: 'center' }}>
                    <Text style={{ color: SUCCESS, fontSize: 11, fontWeight: '700' }}>Request Approval</Text>
                  </Pressable>
                )}
                {p.approvalStatus === 'approved' && p.paymentStatus !== 'paid' && (
                  <Pressable onPress={() => markPayablePaid(p.id, p.amountDue - p.amountPaid)} style={{ flex: 1, paddingVertical: 6, borderRadius: 8, backgroundColor: `${INFO}18`, borderWidth: 1, borderColor: `${INFO}44`, alignItems: 'center' }}>
                    <Text style={{ color: '#818CF8', fontSize: 11, fontWeight: '700' }}>Mark Paid</Text>
                  </Pressable>
                )}
              </View>
            </View>
          ))}
        </Card>
      </View>
    );
  }

  // ── Receivables Tab ─────────────────────────────────────────────────────────
  function renderReceivables() {
    const arTotal = receivables.filter((r) => r.receiptStatus === 'pending' || r.receiptStatus === 'partial').reduce((s, r) => s + (r.invoicedAmount - r.receivedAmount), 0);
    return (
      <View style={{ gap: 16 }}>
        {arTotal > 0 && (
          <View style={{ borderRadius: 10, padding: 12, backgroundColor: `${ACCENT}12`, borderWidth: 1, borderColor: `${ACCENT}35`, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ color: 'rgba(243,234,255,0.7)', fontSize: 13 }}>Total Outstanding AR</Text>
            <Text style={{ color: ACCENT, fontSize: 16, fontWeight: '800' }}>{fmtCurrency(arTotal)}</Text>
          </View>
        )}
        <Card title="Create Receivable">
          <TextInput value={arFrom} onChangeText={setArFrom} placeholder="Receivable from (client/payer)" placeholderTextColor="rgba(243,234,255,0.3)" style={[styles.inputField, { marginBottom: 8 }]} />
          <TextInput value={arAmount} onChangeText={setArAmount} placeholder="Invoiced amount ($)" keyboardType="decimal-pad" placeholderTextColor="rgba(243,234,255,0.3)" style={[styles.inputField, { marginBottom: 8 }]} />
          <TextInput value={arNotes} onChangeText={setArNotes} placeholder="Notes (optional)" placeholderTextColor="rgba(243,234,255,0.3)" style={[styles.inputField, { marginBottom: 8 }]} />
          <Pressable onPress={handleCreateReceivable} style={{ paddingVertical: 10, borderRadius: 10, backgroundColor: `${INFO}18`, borderWidth: 1, borderColor: `${INFO}44`, alignItems: 'center' }}>
            <Text style={{ color: '#818CF8', fontSize: 13, fontWeight: '700' }}>Add Receivable</Text>
          </Pressable>
        </Card>

        <Card title={`Accounts Receivable (${receivables.length})`}>
          {receivables.length === 0 && <Text style={{ color: 'rgba(243,234,255,0.45)', fontSize: 13 }}>No receivables.</Text>}
          {receivables.map((r) => (
            <View key={r.id} style={{ borderRadius: 10, padding: 10, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', gap: 6, marginBottom: 8 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ color: '#F3EAFF', fontSize: 13, fontWeight: '700', flex: 1 }}>{r.receivableFrom}</Text>
                <StatusBadge label={r.receiptStatus} color={ReceiptStatusColor(r.receiptStatus)} />
              </View>
              <Text style={{ color: 'rgba(243,234,255,0.5)', fontSize: 11 }}>{r.receivableRef}</Text>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <Text style={{ color: '#F3EAFF', fontSize: 14, fontWeight: '700' }}>{fmtCurrency(r.invoicedAmount)}</Text>
                {r.receivedAmount > 0 && <Text style={{ color: SUCCESS, fontSize: 12 }}>Received: {fmtCurrency(r.receivedAmount)}</Text>}
              </View>
              {r.notes && <Text style={{ color: 'rgba(243,234,255,0.45)', fontSize: 11, fontStyle: 'italic' }}>{r.notes}</Text>}
              {r.receiptStatus !== 'received' && r.receiptStatus !== 'written_off' && (
                <Pressable onPress={() => confirmReceivable(r.id, r.invoicedAmount - r.receivedAmount)} style={{ paddingVertical: 6, borderRadius: 8, backgroundColor: `${SUCCESS}18`, borderWidth: 1, borderColor: `${SUCCESS}44`, alignItems: 'center' }}>
                  <Text style={{ color: SUCCESS, fontSize: 11, fontWeight: '700' }}>Confirm Full Receipt</Text>
                </Pressable>
              )}
            </View>
          ))}
        </Card>
      </View>
    );
  }

  // ── Waterfalls Tab ─────────────────────────────────────────────────────────
  function renderWaterfalls() {
    return (
      <View style={{ gap: 16 }}>
        <Card title={`Distribution Waterfalls (${waterfalls.length})`}>
          {waterfalls.length === 0 && <Text style={{ color: 'rgba(243,234,255,0.45)', fontSize: 13 }}>No waterfalls configured.</Text>}
          {waterfalls.map((wf) => (
            <View key={wf.id} style={{ borderRadius: 10, padding: 12, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', gap: 8, marginBottom: 10 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#F3EAFF', fontSize: 13, fontWeight: '700' }}>{wf.waterfallRef}</Text>
                  {wf.description && <Text style={{ color: 'rgba(243,234,255,0.55)', fontSize: 12, marginTop: 2 }}>{wf.description}</Text>}
                </View>
                <StatusBadge label={wf.executionStatus} color={WaterfallStatusColor(wf.executionStatus)} />
              </View>
              <Text style={{ color: ACCENT, fontSize: 15, fontWeight: '800' }}>{fmtCurrency(wf.totalAmount)}</Text>
              <View style={{ gap: 4, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)', paddingTop: 8 }}>
                {wf.parties.map((party) => (
                  <View key={party.id} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: 'rgba(243,234,255,0.75)', fontSize: 12 }}>{party.partyName}</Text>
                      <Text style={{ color: 'rgba(243,234,255,0.4)', fontSize: 11 }}>{party.partyRole} • {party.paymentMethod ?? 'unset'}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={{ color: '#F3EAFF', fontSize: 13, fontWeight: '700' }}>{fmtCurrency(party.paymentAmount)}</Text>
                      <StatusBadge label={party.paymentStatus} color={party.paymentStatus === 'confirmed' ? SUCCESS : party.paymentStatus === 'sent' ? INFO : '#8878AE'} />
                    </View>
                  </View>
                ))}
              </View>
              {wf.executionStatus === 'draft' && (
                <Pressable onPress={() => approveWaterfall(wf.id, currentUser?.id ?? 'user-admin')} style={{ paddingVertical: 8, borderRadius: 8, backgroundColor: `${SUCCESS}18`, borderWidth: 1, borderColor: `${SUCCESS}44`, alignItems: 'center' }}>
                  <Text style={{ color: SUCCESS, fontSize: 12, fontWeight: '700' }}>Submit for Approval →</Text>
                </Pressable>
              )}
            </View>
          ))}
        </Card>
      </View>
    );
  }

  // ── Reports Tab ─────────────────────────────────────────────────────────────
  function renderReports() {
    return (
      <View style={{ gap: 16 }}>
        {/* Report selector */}
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {([
            { id: 'trial_balance', label: 'Trial Balance' },
            { id: 'income_statement', label: 'P&L' },
            { id: 'balance_sheet', label: 'Balance Sheet' },
          ] as { id: ReportType; label: string }[]).map((r) => {
            const active = reportType === r.id;
            return (
              <Pressable key={r.id} onPress={() => setReportType(r.id)} style={{ flex: 1, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: active ? `${ACCENT}66` : 'rgba(255,255,255,0.1)', backgroundColor: active ? `${ACCENT}18` : 'transparent', alignItems: 'center' }}>
                <Text style={{ color: active ? ACCENT : 'rgba(243,234,255,0.5)', fontSize: 12, fontWeight: active ? '700' : '500' }}>{r.label}</Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={{ color: 'rgba(243,234,255,0.35)', fontSize: 11 }}>Based on posted journal entries only.</Text>

        {/* Trial Balance */}
        {reportType === 'trial_balance' && (
          <Card title="Trial Balance">
            {trialBalance.length === 0 && <Text style={{ color: 'rgba(243,234,255,0.45)', fontSize: 13 }}>No posted entries yet.</Text>}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' }}>
              <Text style={{ color: 'rgba(243,234,255,0.5)', fontSize: 11, fontWeight: '700', flex: 3 }}>Account</Text>
              <Text style={{ color: 'rgba(243,234,255,0.5)', fontSize: 11, fontWeight: '700', flex: 2, textAlign: 'right' }}>Debit</Text>
              <Text style={{ color: 'rgba(243,234,255,0.5)', fontSize: 11, fontWeight: '700', flex: 2, textAlign: 'right' }}>Credit</Text>
              <Text style={{ color: 'rgba(243,234,255,0.5)', fontSize: 11, fontWeight: '700', flex: 2, textAlign: 'right' }}>Net</Text>
            </View>
            {trialBalance.map((row) => (
              <View key={row.acct.id} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' }}>
                <Text style={{ color: '#F3EAFF', fontSize: 11, flex: 3 }}>{row.acct.accountNumber} {row.acct.accountName}</Text>
                <Text style={{ color: 'rgba(243,234,255,0.7)', fontSize: 11, flex: 2, textAlign: 'right' }}>{fmtCurrency(row.totalDebit)}</Text>
                <Text style={{ color: 'rgba(243,234,255,0.7)', fontSize: 11, flex: 2, textAlign: 'right' }}>{fmtCurrency(row.totalCredit)}</Text>
                <Text style={{ color: row.netBalance >= 0 ? SUCCESS : DANGER, fontSize: 11, fontWeight: '700', flex: 2, textAlign: 'right' }}>{fmtCurrency(row.netBalance)}</Text>
              </View>
            ))}
            {trialBalance.length > 0 && (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingTop: 8, borderTopWidth: 1, borderTopColor: `${ACCENT}44`, marginTop: 4 }}>
                <Text style={{ color: ACCENT, fontSize: 12, fontWeight: '700', flex: 3 }}>TOTAL</Text>
                <Text style={{ color: ACCENT, fontSize: 12, fontWeight: '700', flex: 2, textAlign: 'right' }}>{fmtCurrency(totalDebits)}</Text>
                <Text style={{ color: ACCENT, fontSize: 12, fontWeight: '700', flex: 2, textAlign: 'right' }}>{fmtCurrency(totalCredits)}</Text>
                <Text style={{ color: Math.abs(totalDebits - totalCredits) < 0.01 ? SUCCESS : DANGER, fontSize: 12, fontWeight: '700', flex: 2, textAlign: 'right' }}>
                  {Math.abs(totalDebits - totalCredits) < 0.01 ? '✓ Balanced' : '⚠ Imbalanced'}
                </Text>
              </View>
            )}
          </Card>
        )}

        {/* Income Statement */}
        {reportType === 'income_statement' && (
          <Card title="Income Statement (P&L)">
            <Text style={{ color: 'rgba(243,234,255,0.5)', fontSize: 11, fontWeight: '700', marginBottom: 8 }}>REVENUE</Text>
            {incomeStatement.revenues.map((r) => (
              <View key={r.acct.id} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
                <Text style={{ color: '#F3EAFF', fontSize: 12, flex: 3 }}>{r.acct.accountName}</Text>
                <Text style={{ color: SUCCESS, fontSize: 12, fontWeight: '600', flex: 2, textAlign: 'right' }}>{fmtCurrency(r.amount)}</Text>
              </View>
            ))}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', marginTop: 4 }}>
              <Text style={{ color: SUCCESS, fontSize: 13, fontWeight: '800' }}>Total Revenue</Text>
              <Text style={{ color: SUCCESS, fontSize: 13, fontWeight: '800' }}>{fmtCurrency(incomeStatement.totalRevenue)}</Text>
            </View>
            <Text style={{ color: 'rgba(243,234,255,0.5)', fontSize: 11, fontWeight: '700', marginTop: 12, marginBottom: 8 }}>EXPENSES</Text>
            {incomeStatement.expenses.map((e) => (
              <View key={e.acct.id} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
                <Text style={{ color: '#F3EAFF', fontSize: 12, flex: 3 }}>{e.acct.accountName}</Text>
                <Text style={{ color: DANGER, fontSize: 12, fontWeight: '600', flex: 2, textAlign: 'right' }}>({fmtCurrency(e.amount)})</Text>
              </View>
            ))}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', marginTop: 4 }}>
              <Text style={{ color: DANGER, fontSize: 13, fontWeight: '800' }}>Total Expenses</Text>
              <Text style={{ color: DANGER, fontSize: 13, fontWeight: '800' }}>({fmtCurrency(incomeStatement.totalExpenses)})</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 12, borderRadius: 10, backgroundColor: incomeStatement.netIncome >= 0 ? `${SUCCESS}18` : `${DANGER}18`, borderWidth: 1, borderColor: incomeStatement.netIncome >= 0 ? `${SUCCESS}44` : `${DANGER}44`, marginTop: 8 }}>
              <Text style={{ color: '#F3EAFF', fontSize: 14, fontWeight: '800' }}>Net Income</Text>
              <Text style={{ color: incomeStatement.netIncome >= 0 ? SUCCESS : DANGER, fontSize: 14, fontWeight: '800' }}>{fmtCurrency(incomeStatement.netIncome)}</Text>
            </View>
          </Card>
        )}

        {/* Balance Sheet */}
        {reportType === 'balance_sheet' && (
          <View style={{ gap: 12 }}>
            <Card title="Assets">
              {balanceSheet.assets.map((r) => (
                <View key={r.acct.id} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
                  <Text style={{ color: '#F3EAFF', fontSize: 12, flex: 3 }}>{r.acct.accountName}</Text>
                  <Text style={{ color: INFO, fontSize: 12, fontWeight: '600', textAlign: 'right' }}>{fmtCurrency(r.amount)}</Text>
                </View>
              ))}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingTop: 6, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', marginTop: 4 }}>
                <Text style={{ color: '#F3EAFF', fontWeight: '800', fontSize: 13 }}>Total Assets</Text>
                <Text style={{ color: INFO, fontWeight: '800', fontSize: 13 }}>{fmtCurrency(balanceSheet.totalAssets)}</Text>
              </View>
            </Card>
            <Card title="Liabilities">
              {balanceSheet.liabilities.map((r) => (
                <View key={r.acct.id} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
                  <Text style={{ color: '#F3EAFF', fontSize: 12, flex: 3 }}>{r.acct.accountName}</Text>
                  <Text style={{ color: DANGER, fontSize: 12, fontWeight: '600', textAlign: 'right' }}>{fmtCurrency(r.amount)}</Text>
                </View>
              ))}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingTop: 6, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', marginTop: 4 }}>
                <Text style={{ color: '#F3EAFF', fontWeight: '800', fontSize: 13 }}>Total Liabilities</Text>
                <Text style={{ color: DANGER, fontWeight: '800', fontSize: 13 }}>{fmtCurrency(balanceSheet.totalLiabilities)}</Text>
              </View>
            </Card>
            <Card title="Equity">
              {balanceSheet.equity.map((r) => (
                <View key={r.acct.id} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
                  <Text style={{ color: '#F3EAFF', fontSize: 12, flex: 3 }}>{r.acct.accountName}</Text>
                  <Text style={{ color: SUCCESS, fontSize: 12, fontWeight: '600', textAlign: 'right' }}>{fmtCurrency(r.amount)}</Text>
                </View>
              ))}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
                <Text style={{ color: 'rgba(243,234,255,0.6)', fontSize: 12, flex: 3 }}>Net Income (P&L)</Text>
                <Text style={{ color: incomeStatement.netIncome >= 0 ? SUCCESS : DANGER, fontSize: 12, fontWeight: '600', textAlign: 'right' }}>{fmtCurrency(incomeStatement.netIncome)}</Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingTop: 6, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', marginTop: 4 }}>
                <Text style={{ color: '#F3EAFF', fontWeight: '800', fontSize: 13 }}>Total Equity</Text>
                <Text style={{ color: SUCCESS, fontWeight: '800', fontSize: 13 }}>{fmtCurrency(balanceSheet.totalEquity)}</Text>
              </View>
            </Card>
            <View style={{ borderRadius: 10, padding: 12, backgroundColor: balanceSheet.balanced ? `${SUCCESS}18` : `${DANGER}18`, borderWidth: 1, borderColor: balanceSheet.balanced ? `${SUCCESS}44` : `${DANGER}44`, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ color: '#F3EAFF', fontSize: 13, fontWeight: '800' }}>
                {balanceSheet.balanced ? '✓ Balance Sheet Balanced' : '⚠ Balance Sheet Imbalanced'}
              </Text>
              <Text style={{ color: 'rgba(243,234,255,0.5)', fontSize: 12 }}>A = L + E</Text>
            </View>
          </View>
        )}
      </View>
    );
  }

  // ── Root Render ────────────────────────────────────────────────────────────
  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 60 }}>
      {/* Page Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View>
          <Text style={{ color: ACCENT, fontSize: 20, fontWeight: '800', letterSpacing: -0.4 }}>Financial Ops</Text>
          <Text style={{ color: 'rgba(243,234,255,0.45)', fontSize: 12, marginTop: 2 }}>
            GL · AP · AR · Distributions · Reporting
          </Text>
        </View>
        {pendingTotal > 0 && (
          <View style={{ borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: `${DANGER}20`, borderWidth: 1, borderColor: `${DANGER}55` }}>
            <Text style={{ color: DANGER, fontSize: 12, fontWeight: '700' }}>{pendingTotal} Pending</Text>
          </View>
        )}
      </View>

      {renderTabBar()}

      {tab === 'mission' && renderMissionControl()}
      {tab === 'ledger' && renderLedger()}
      {tab === 'payables' && renderPayables()}
      {tab === 'receivables' && renderReceivables()}
      {tab === 'waterfalls' && renderWaterfalls()}
      {tab === 'reports' && renderReports()}
    </ScrollView>
  );
}
