import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import {
  ArrowLeft,
  ArrowRight,
  Play,
  Pause,
  RotateCcw,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Database,
  Layers,
  LoaderCircle,
  FileEdit,
  ShieldAlert,
  ShieldCheck,
  AlertCircle,
  Check,
  X,
  Code2,
  Table2,
} from 'lucide-react';
import { toast } from 'sonner';
import { resolveProjectId } from '../../../lib/api-config';
import {
  migrationsApi,
  type MigrationRun,
  type ReviewContext,
} from '../../../lib/migrations-api';

export const Route = createFileRoute('/(platfrom)/migrations/$id')({
  validateSearch: (search: Record<string, unknown>): { project_id?: string } => ({
    project_id:
      typeof search.project_id === 'string' && search.project_id.trim()
        ? search.project_id.trim()
        : undefined,
  }),
  component: MigrationDetailPage,
});

const FONT_STACK =
  "'Google Sans', 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

function fmtNum(v: number | undefined | null): string {
  if (v === null || v === undefined || isNaN(Number(v))) return '0';
  return Number(v).toLocaleString();
}

function fmtDate(v: any): string {
  if (!v) return '—';
  try {
    const d = typeof v === 'number' ? new Date(v > 1e11 ? v : v * 1000) : new Date(v);
    if (isNaN(d.getTime())) return String(v);
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

function fmtTime(v: any): string {
  if (!v) return '—';
  try {
    const d = typeof v === 'number' ? new Date(v > 1e11 ? v : v * 1000) : new Date(v);
    if (isNaN(d.getTime())) return String(v);
    return d.toLocaleTimeString();
  } catch {
    return '—';
  }
}

function MigrationDetailPage() {
  const { id: runId } = Route.useParams();
  const search = Route.useSearch();
  const navigate = useNavigate();
  const projectId = resolveProjectId(search.project_id ?? null);

  const [run, setRun] = useState<MigrationRun | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Review Context (Gate A)
  const [reviewContext, setReviewContext] = useState<ReviewContext | null>(null);
  const [reviewerName, setReviewerName] = useState('Data Operations');
  const [reviewComments, setReviewComments] = useState('');
  const [actingGate, setActingGate] = useState(false);

  // Active Tab
  const [activeTab, setActiveTab] = useState<'tables' | 'errors' | 'gates'>('tables');

  // Single-table & global batch execution states
  const [tableActionRunning, setTableActionRunning] = useState<string | null>(null);
  const [batchAllRunning, setBatchAllRunning] = useState(false);

  // Error search & filter
  const [errorQuery, setErrorQuery] = useState('');
  const [errorCatFilter, setErrorCatFilter] = useState<string>('ALL');
  const [selectedErrorPayload, setSelectedErrorPayload] = useState<Record<string, any> | null>(null);

  const runRef = useRef<MigrationRun | null>(null);
  runRef.current = run;

  // Monotonic sequence guard so stale GET polls never overwrite newer mutation responses
  const requestSeqRef = useRef(0);

  const applyLatestRun = useCallback((nextRun: MigrationRun, seq?: number) => {
    if (seq !== undefined && seq < requestSeqRef.current) {
      return;
    }
    setRun(nextRun);
  }, []);

  const loadReviewContext = useCallback(async () => {
    try {
      const ctx = await migrationsApi.getReviewContext(runId);
      setReviewContext(ctx);
    } catch (e: any) {
      console.warn('Could not load review context:', e);
    }
  }, [runId]);

  const loadRun = useCallback(
    async (quiet = false): Promise<MigrationRun | null> => {
      const seq = ++requestSeqRef.current;
      if (!quiet) setLoading(true);
      else setRefreshing(true);
      setError(null);

      try {
        const data = await migrationsApi.get(runId);
        if (seq < requestSeqRef.current) return null;
        setRun(data);
        if (data.state === 'AWAITING_LOAD_REVIEW') {
          void loadReviewContext();
        }
        return data;
      } catch (e: any) {
        if (seq >= requestSeqRef.current) {
          setError(e?.message || 'Failed to load migration details');
        }
        return null;
      } finally {
        if (seq >= requestSeqRef.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [runId, loadReviewContext]
  );

  useEffect(() => {
    void loadRun();
    const interval = setInterval(() => {
      const current = runRef.current;
      if (
        current &&
        ['RUNNING', 'LOADING', 'QUEUED', 'RECONCILING'].includes(current.state) &&
        !tableActionRunning &&
        !batchAllRunning &&
        !actingGate
      ) {
        void loadRun(true);
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [loadRun, tableActionRunning, batchAllRunning, actingGate]);

  // Main Actions
  const handleStart = async () => {
    const seq = ++requestSeqRef.current;
    setActingGate(true);
    setRun((prev) => (prev ? { ...prev, state: 'RUNNING', error: null } : prev));
    try {
      const updated = await migrationsApi.start(runId);
      applyLatestRun(updated, seq);
      toast.success('Migration started');
      setTimeout(() => void loadRun(true), 800);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to start migration');
      await loadRun(true);
    } finally {
      setActingGate(false);
    }
  };

  const handlePause = async () => {
    const seq = ++requestSeqRef.current;
    setActingGate(true);
    try {
      const updated = await migrationsApi.pause(runId);
      applyLatestRun(updated, seq);
      toast.info('Migration paused');
    } catch (e: any) {
      toast.error(e?.message || 'Failed to pause migration');
    } finally {
      setActingGate(false);
    }
  };

  const handleResume = async () => {
    const seq = ++requestSeqRef.current;
    setActingGate(true);
    setRun((prev) => (prev ? { ...prev, state: 'RUNNING', error: null } : prev));
    try {
      const updated = await migrationsApi.resume(runId);
      applyLatestRun(updated, seq);
      toast.success('Migration resumed');
      setTimeout(() => void loadRun(true), 800);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to resume migration');
      await loadRun(true);
    } finally {
      setActingGate(false);
    }
  };

  const handleApproveLoad = async () => {
    const seq = ++requestSeqRef.current;
    setActingGate(true);
    setRun((prev) => (prev ? { ...prev, state: 'LOADING' } : prev));
    try {
      const updated = await migrationsApi.approveLoad(runId, {
        actor: reviewerName,
        comments: reviewComments || 'Approved via load review gate',
      });
      applyLatestRun(updated, seq);
      toast.success('Load gate approved. Committing into destination.');
      setTimeout(() => void loadRun(true), 800);
    } catch (e: any) {
      toast.error(e?.message || 'Approval failed');
      await loadRun(true);
    } finally {
      setActingGate(false);
    }
  };

  const handleAbort = async () => {
    if (!confirm('Are you sure you want to abort this migration? Staged records will be discarded.'))
      return;
    const seq = ++requestSeqRef.current;
    setActingGate(true);
    try {
      const updated = await migrationsApi.abort(runId, {
        actor: reviewerName,
        reason: reviewComments || 'Aborted during review',
      });
      applyLatestRun(updated, seq);
      toast.info('Migration aborted');
    } catch (e: any) {
      toast.error(e?.message || 'Abort failed');
    } finally {
      setActingGate(false);
    }
  };

  const handleSignoff = async () => {
    const seq = ++requestSeqRef.current;
    setActingGate(true);
    try {
      const updated = await migrationsApi.signoff(runId, {
        actor: reviewerName,
        comments: reviewComments || 'Final migration signoff approved',
      });
      applyLatestRun(updated, seq);
      toast.success('Migration signed off and locked');
    } catch (e: any) {
      toast.error(e?.message || 'Signoff failed');
    } finally {
      setActingGate(false);
    }
  };

  // Per-row Run Table with instant optimistic LOADING state & monotonic sequence guard
  const handleRunTable = async (tableName: string, currentState?: string, loadedCount?: number) => {
    if (currentState === 'COMPLETED' && (loadedCount || 0) > 0) {
      toast.info(`"${tableName}" has already been migrated.`);
      return;
    }

    const seq = ++requestSeqRef.current;
    setTableActionRunning(tableName);

    setRun((prev) =>
      prev
        ? {
            ...prev,
            table_statuses: prev.table_statuses.map((t) =>
              t.source_table === tableName ? { ...t, state: 'LOADING', error: null } : t
            ),
          }
        : prev
    );

    try {
      const updated = await migrationsApi.runTable(runId, tableName);
      applyLatestRun(updated, seq);

      const ts = updated.table_statuses?.find(
        (t) => t.source_table === tableName || t.target_table === tableName
      );
      if (ts?.state === 'FAILED') {
        toast.error(`${tableName} failed: ${ts.error || '0 rows written'}`);
      } else if (ts?.state === 'COMPLETED' && (ts.rows_loaded || 0) > 0) {
        toast.success(`${tableName}: ${fmtNum(ts.rows_loaded)} rows migrated`);
      } else {
        toast.error(`${tableName}: 0 rows migrated — check Captured Errors tab.`);
        setActiveTab('errors');
      }
    } catch (e: any) {
      toast.error(e?.message || `Failed to run table ${tableName}`);
      await loadRun(true);
    } finally {
      setTableActionRunning(null);
    }
  };

  // Single global Run Batch: executes each non-completed table sequentially one after another
  const handleRunAllBatches = async () => {
    if (!run?.table_statuses || run.table_statuses.length === 0) return;

    const pendingTables = run.table_statuses.filter(
      (t) => !(t.state === 'COMPLETED' && (t.rows_loaded || 0) > 0)
    );
    if (pendingTables.length === 0) {
      toast.info('All tables are already completed.');
      return;
    }

    setBatchAllRunning(true);
    let succeeded = 0;
    let failed = 0;

    try {
      for (const ts of pendingTables) {
        const latestTable = runRef.current?.table_statuses?.find(
          (t) => t.source_table === ts.source_table && t.target_table === ts.target_table
        );
        if (latestTable?.state === 'COMPLETED' && (latestTable.rows_loaded || 0) > 0) {
          continue;
        }

        const seq = ++requestSeqRef.current;
        setTableActionRunning(ts.source_table);
        setRun((prev) =>
          prev
            ? {
                ...prev,
                table_statuses: prev.table_statuses.map((t) =>
                  t.source_table === ts.source_table ? { ...t, state: 'LOADING', error: null } : t
                ),
              }
            : prev
        );

        const updated = await migrationsApi.runTable(runId, ts.source_table);
        applyLatestRun(updated, seq);

        const resultTs = updated.table_statuses?.find(
          (t) => t.source_table === ts.source_table && t.target_table === ts.target_table
        );
        if (resultTs?.state === 'COMPLETED' && (resultTs.rows_loaded || 0) > 0) {
          succeeded += 1;
        } else {
          failed += 1;
        }
      }

      if (failed > 0) {
        toast.error(`Batch finished: ${succeeded} succeeded, ${failed} failed.`);
      } else {
        toast.success(`Batch completed: ${succeeded} table${succeeded === 1 ? '' : 's'} migrated.`);
      }
    } catch (e: any) {
      toast.error(e?.message || 'Batch execution interrupted');
      await loadRun(true);
    } finally {
      setTableActionRunning(null);
      setBatchAllRunning(false);
    }
  };

  const filteredErrors = useMemo(() => {
    if (!run?.error_records) return [];
    const q = errorQuery.trim().toLowerCase();
    return run.error_records.filter((err) => {
      const matchQ =
        !q ||
        err.table_name?.toLowerCase().includes(q) ||
        err.target_table?.toLowerCase().includes(q) ||
        err.error_message?.toLowerCase().includes(q);

      if (!matchQ) return false;
      if (errorCatFilter === 'ALL') return true;
      return (err.error_category || '').toUpperCase() === errorCatFilter.toUpperCase();
    });
  }, [run?.error_records, errorQuery, errorCatFilter]);

  if (loading) {
    return (
      <div
        style={{ fontFamily: FONT_STACK }}
        className="min-h-[calc(100vh-4rem)] bg-[#F8FAFC] flex flex-col items-center justify-center gap-3 text-slate-500"
      >
        <LoaderCircle className="w-7 h-7 animate-spin text-slate-600" />
        <span className="text-xs text-slate-500 font-medium">Loading migration console…</span>
      </div>
    );
  }

  if (error || !run) {
    return (
      <div
        style={{ fontFamily: FONT_STACK }}
        className="min-h-[calc(100vh-4rem)] bg-[#F8FAFC] p-6 flex items-center justify-center"
      >
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl p-6 text-center space-y-3 shadow-xs">
          <AlertTriangle className="w-8 h-8 text-slate-600 mx-auto" />
          <h2 className="text-base font-semibold text-slate-900">
            Migration Not Available
          </h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            {error || 'Unable to retrieve migration details.'}
          </p>
          <div className="pt-2 flex justify-center gap-2">
            <button
              type="button"
              onClick={() => void loadRun()}
              className="px-3.5 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-medium hover:bg-slate-800"
            >
              Retry
            </button>
            <button
              type="button"
              onClick={() =>
                navigate({
                  to: '/migrations',
                  search: { project_id: projectId },
                })
              }
              className="px-3.5 py-1.5 border border-slate-200 text-slate-700 rounded-lg text-xs font-medium hover:bg-slate-50"
            >
              Back to List
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isDraft = run.state === 'DRAFT';
  const isRunning = ['RUNNING', 'LOADING', 'QUEUED', 'RECONCILING'].includes(run.state);
  const isPaused = run.state === 'PAUSED';
  const isAwaitingReview = run.state === 'AWAITING_LOAD_REVIEW';
  const isDone = ['COMPLETED', 'SIGNED_OFF'].includes(run.state);
  const isFailed = ['FAILED', 'ABORTED'].includes(run.state);

  const tablesTotal = run.tables_total || 0;
  const tablesDone = run.tables_completed || 0;
  const pct =
    tablesTotal > 0
      ? isDone
        ? 100
        : Math.round((tablesDone / tablesTotal) * 100)
      : 0;

  const hasRemainingTables = (run.table_statuses || []).some(
    (t) => !(t.state === 'COMPLETED' && (t.rows_loaded || 0) > 0)
  );

  return (
    <div
      style={{ fontFamily: FONT_STACK }}
      className="min-h-[calc(100vh-4rem)] bg-[#F8FAFC] text-slate-900 pb-20"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Executive Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 pb-5">
          <div className="flex items-start gap-3 min-w-0">
            <button
              type="button"
              onClick={() =>
                navigate({
                  to: '/migrations',
                  search: { project_id: projectId },
                })
              }
              className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition shadow-xs"
              title="Back to migrations"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            <div className="min-w-0 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold tracking-tight text-slate-900 break-words">
                  {run.name || `Migration ${run.run_id.slice(0, 8)}`}
                </h1>
                <span className="font-mono text-[10px] px-1.5 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600">
                  v{run.version_tag || '1.0.0'}
                </span>

                {isDraft && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                    <FileEdit className="w-3 h-3 text-slate-500" />
                    Draft
                  </span>
                )}
                {isRunning && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-900 text-white">
                    <LoaderCircle className="w-3 h-3 animate-spin" />
                    {run.state === 'LOADING' ? 'Writing' : 'Running'}
                  </span>
                )}
                {isPaused && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
                    <Pause className="w-3 h-3 text-amber-700" />
                    Paused
                  </span>
                )}
                {isAwaitingReview && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 border border-slate-300">
                    <Clock className="w-3 h-3 text-slate-600" />
                    Review Required
                  </span>
                )}
                {isDone && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">
                    <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                    {run.state === 'SIGNED_OFF' ? 'Signed Off' : 'Completed'}
                  </span>
                )}
                {isFailed && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md bg-rose-50 text-rose-800 border border-rose-200">
                    <AlertTriangle className="w-3 h-3 text-rose-700" />
                    Failed
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-600 flex-wrap pt-0.5">
                <span className="flex items-center gap-1.5 text-slate-800">
                  <Database className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-medium text-slate-900">
                    {run.source_system_name || 'Source'}
                  </span>
                  {run.source_connector_type && (
                    <span className="text-[10px] px-1 py-0.2 rounded bg-slate-100 text-slate-500 font-mono uppercase">
                      {run.source_connector_type}
                    </span>
                  )}
                </span>

                <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />

                <span className="flex items-center gap-1.5 text-slate-800">
                  <Database className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-medium text-slate-900">
                    {run.target_system_name || 'Target'}
                  </span>
                  {run.target_connector_type && (
                    <span className="text-[10px] px-1 py-0.2 rounded bg-slate-100 text-slate-500 font-mono uppercase">
                      {run.target_connector_type}
                    </span>
                  )}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end lg:self-center">
            <button
              type="button"
              onClick={() => void loadRun(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 transition shadow-xs"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 text-slate-500 ${refreshing ? 'animate-spin' : ''}`}
              />
              <span>Refresh</span>
            </button>

            {isDraft && (
              <button
                type="button"
                disabled={actingGate}
                onClick={handleStart}
                className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium transition shadow-xs disabled:opacity-50"
              >
                {actingGate ? (
                  <LoaderCircle className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Play className="w-3.5 h-3.5" />
                )}
                <span>Start Migration</span>
              </button>
            )}

            {isRunning && (
              <button
                type="button"
                disabled={actingGate}
                onClick={handlePause}
                className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-medium transition shadow-xs disabled:opacity-50"
              >
                <Pause className="w-3.5 h-3.5" />
                <span>Pause Run</span>
              </button>
            )}

            {(isPaused || isFailed) && (
              <button
                type="button"
                disabled={actingGate}
                onClick={handleResume}
                className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium transition shadow-xs disabled:opacity-50"
              >
                {actingGate ? (
                  <LoaderCircle className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RotateCcw className="w-3.5 h-3.5" />
                )}
                <span>Resume Run</span>
              </button>
            )}

            {isDone && run.state !== 'SIGNED_OFF' && (
              <button
                type="button"
                disabled={actingGate}
                onClick={handleSignoff}
                className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium transition shadow-xs disabled:opacity-50"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Formal Sign-Off</span>
              </button>
            )}
          </div>
        </div>

        {/* Top-level Diagnostic Banner when run has an error */}
        {run.error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-900 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5 min-w-0 flex-1">
              <div className="font-semibold">Migration Error</div>
              <div className="font-mono break-words">{run.error}</div>
            </div>
          </div>
        )}

        {/* Phase Stepper */}
        <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs">
          <div className="flex items-center justify-between overflow-x-auto gap-2 pb-1 sm:pb-0">
            {[
              { id: 'PREFLIGHT', label: '1. Preflight' },
              { id: 'EXTRACT', label: '2. Extract' },
              { id: 'TRANSFORM', label: '3. Transform' },
              { id: 'VALIDATE', label: '4. Validate' },
              { id: 'AWAITING_LOAD_REVIEW', label: '5. Review Gate' },
              { id: 'LOAD', label: '6. Destination Write' },
              { id: 'DONE', label: '7. Finalized' },
            ].map((p) => {
              const isCurrent = run.phase === p.id;
              const isPast =
                isDone ||
                (run.phase === 'DONE' && p.id !== 'DONE') ||
                (run.phase === 'LOAD' &&
                  ['PREFLIGHT', 'EXTRACT', 'TRANSFORM', 'VALIDATE', 'AWAITING_LOAD_REVIEW'].includes(
                    p.id
                  ));

              return (
                <div
                  key={p.id}
                  className={`flex items-center gap-1.5 whitespace-nowrap text-xs font-medium px-2.5 py-1.5 rounded-lg transition ${
                    isCurrent
                      ? 'bg-slate-900 text-white shadow-xs'
                      : isPast
                      ? 'bg-slate-100 text-slate-800'
                      : 'text-slate-400'
                  }`}
                >
                  {isPast ? (
                    <Check className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                  ) : isCurrent && isRunning ? (
                    <LoaderCircle className="w-3.5 h-3.5 animate-spin shrink-0" />
                  ) : null}
                  <span>{p.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Metric Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-1">
            <div className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
              Tables Progress
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold font-mono text-slate-900">
                {pct}%
              </span>
              <span className="text-xs text-slate-500 font-mono">
                {fmtNum(run.tables_completed)} / {fmtNum(run.tables_total)}
              </span>
            </div>
            <div className="h-1 w-full rounded-full bg-slate-100 overflow-hidden mt-2">
              <div
                className="h-full rounded-full bg-slate-800 transition-all duration-300"
                style={{ width: `${Math.min(100, Math.max(isDraft ? 0 : 4, pct))}%` }}
              />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-1">
            <div className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
              Source Records Read
            </div>
            <div className="text-2xl font-bold font-mono text-slate-900">
              {fmtNum(run.rows_extracted)}
            </div>
            <div className="text-[11px] text-slate-400">
              {fmtNum(run.rows_transformed)} transformed
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-1">
            <div className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
              Target Records Written
            </div>
            <div className="text-2xl font-bold font-mono text-slate-900">
              {fmtNum(run.rows_loaded)}
            </div>
            <div className="text-[11px] text-slate-400">
              Committed to {run.target_system_name || 'destination'}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-1">
            <div className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
              Schema Errors
            </div>
            <div
              className={`text-2xl font-bold font-mono ${
                Number(run.rows_failed) > 0 || (run.error_records?.length || 0) > 0
                  ? 'text-rose-700'
                  : 'text-slate-800'
              }`}
            >
              {fmtNum(Math.max(Number(run.rows_failed || 0), run.error_records?.length || 0))}
            </div>
            <div className="text-[11px] text-slate-400">
              {run.error_records?.length || 0} diagnostic records
            </div>
          </div>
        </div>

        {/* Review Gate Card */}
        {isAwaitingReview && (
          <div className="bg-white border border-slate-300 rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-slate-700" />
                  <h3 className="text-sm font-semibold text-slate-900">
                    Review Gate: Target Write Approval Required
                  </h3>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Extraction and transformations have succeeded. Confirm target system writes before committing data.
                </p>
              </div>
              <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-xs font-mono font-medium border border-slate-200">
                Gate A
              </span>
            </div>

            {reviewContext && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-[#F8FAFC] p-3.5 rounded-lg border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px]">Extracted Rows</span>
                  <span className="font-mono font-semibold text-slate-900">
                    {fmtNum(reviewContext.total_source_rows)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Est. Target Rows</span>
                  <span className="font-mono font-semibold text-slate-900">
                    {fmtNum(reviewContext.total_target_rows_after_estimate)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Audit Recommendation</span>
                  <span
                    className={`font-semibold ${
                      reviewContext.recommendation === 'SAFE_TO_LOAD'
                        ? 'text-emerald-700'
                        : 'text-amber-700'
                    }`}
                  >
                    {reviewContext.recommendation}
                  </span>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
              <input
                type="text"
                value={reviewerName}
                onChange={(e) => setReviewerName(e.target.value)}
                placeholder="Reviewer Name / Email"
                className="h-8 px-3 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 focus:outline-none focus:border-slate-400"
              />

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  disabled={actingGate}
                  onClick={handleAbort}
                  className="h-8 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs font-medium transition disabled:opacity-50"
                >
                  Abort Migration
                </button>
                <button
                  type="button"
                  disabled={actingGate}
                  onClick={handleApproveLoad}
                  className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium transition shadow-xs disabled:opacity-50"
                >
                  {actingGate ? (
                    <LoaderCircle className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  )}
                  <span>Approve & Commit Writes</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-slate-200 gap-6">
          <button
            type="button"
            onClick={() => setActiveTab('tables')}
            className={`pb-3 text-xs font-medium transition border-b-2 -mb-px flex items-center gap-1.5 ${
              activeTab === 'tables'
                ? 'border-slate-900 text-slate-900 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Table2 className="w-3.5 h-3.5" />
            <span>Table Mappings</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-mono">
              {run.table_statuses?.length || run.tables_total || 0}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('errors')}
            className={`pb-3 text-xs font-medium transition border-b-2 -mb-px flex items-center gap-1.5 ${
              activeTab === 'errors'
                ? 'border-slate-900 text-slate-900 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Captured Errors</span>
            {(run.error_records?.length || 0) > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-50 text-rose-700 border border-rose-200 font-mono font-medium">
                {run.error_records.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('gates')}
            className={`pb-3 text-xs font-medium transition border-b-2 -mb-px flex items-center gap-1.5 ${
              activeTab === 'gates'
                ? 'border-slate-900 text-slate-900 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Preflight Audit</span>
          </button>
        </div>

        {/* Tab 1: Tables Execution Matrix */}
        {activeTab === 'tables' && (
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
              <div className="flex items-center gap-3 text-xs text-slate-500">
                <span>Per-table migration status and execution</span>
                <span className="font-mono text-slate-600">
                  ({run.table_statuses?.filter((t) => t.state === 'COMPLETED').length || 0} of{' '}
                  {run.table_statuses?.length || 0} completed)
                </span>
              </div>

              {(run.table_statuses || []).length > 0 && (
                <button
                  type="button"
                  disabled={batchAllRunning || Boolean(tableActionRunning) || !hasRemainingTables}
                  onClick={handleRunAllBatches}
                  className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-900 text-xs font-medium transition shadow-xs disabled:opacity-45 self-end sm:self-auto"
                >
                  {batchAllRunning ? (
                    <>
                      <LoaderCircle className="w-3.5 h-3.5 animate-spin text-slate-700" />
                      <span>Running Batch…</span>
                    </>
                  ) : (
                    <>
                      <Layers className="w-3.5 h-3.5 text-slate-700" />
                      <span>{hasRemainingTables ? 'Run Batch' : 'All Batches Completed'}</span>
                    </>
                  )}
                </button>
              )}
            </div>

            <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 shadow-xs overflow-hidden">
              {(run.table_statuses || []).length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  No table status entries recorded yet.
                </div>
              ) : (
                run.table_statuses.map((ts) => {
                  const isTableRunning = tableActionRunning === ts.source_table;
                  const isTableCompleted = ts.state === 'COMPLETED' && (ts.rows_loaded || 0) > 0;
                  const isTableFailed = ts.state === 'FAILED';

                  return (
                    <div
                      key={`${ts.source_table}-${ts.target_table}`}
                      className="p-3.5 flex flex-col lg:flex-row lg:items-center justify-between gap-3 hover:bg-[#F8FAFC] transition"
                    >
                      <div className="space-y-1.5 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-semibold text-slate-900 break-all">
                            {ts.source_table}
                          </span>
                          <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="font-mono text-xs font-semibold text-slate-700 break-all">
                            {ts.target_table}
                          </span>
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200">
                            {ts.load_mode}
                          </span>

                          {isTableCompleted ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.2 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                              <Check className="w-3 h-3 text-emerald-600" />
                              Completed
                            </span>
                          ) : isTableFailed ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.2 rounded bg-rose-50 text-rose-800 border border-rose-200">
                              <AlertTriangle className="w-3 h-3 text-rose-600" />
                              Failed
                            </span>
                          ) : ts.state === 'LOADING' ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.2 rounded bg-slate-900 text-white">
                              <LoaderCircle className="w-3 h-3 animate-spin" />
                              Loading
                            </span>
                          ) : (
                            <span className="text-[10px] font-medium px-2 py-0.2 rounded bg-slate-100 text-slate-600">
                              {ts.state}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2.5 text-[11px] text-slate-500 font-mono flex-wrap">
                          <span>Extracted: {fmtNum(ts.rows_extracted)}</span>
                          <span>·</span>
                          <span className="text-slate-800 font-semibold">
                            Loaded: {fmtNum(ts.rows_loaded)}
                          </span>
                          {Number(ts.rows_failed) > 0 && (
                            <>
                              <span>·</span>
                              <span className="text-rose-700 font-semibold">
                                Failed: {fmtNum(ts.rows_failed)}
                              </span>
                            </>
                          )}
                          {ts.duration_ms && (
                            <>
                              <span>·</span>
                              <span>{(ts.duration_ms / 1000).toFixed(1)}s</span>
                            </>
                          )}
                        </div>

                        {ts.error && (
                          <div className="text-[11px] text-rose-800 font-mono bg-rose-50 p-2 rounded-lg border border-rose-200 break-words">
                            {ts.error}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 self-end lg:self-center shrink-0">
                        <button
                          type="button"
                          disabled={
                            isTableCompleted ||
                            isTableRunning ||
                            batchAllRunning ||
                            Boolean(tableActionRunning)
                          }
                          onClick={() =>
                            handleRunTable(ts.source_table, ts.state, ts.rows_loaded)
                          }
                          className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium transition shadow-xs ${
                            isTableCompleted
                              ? 'border border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed'
                              : 'bg-slate-900 hover:bg-slate-800 text-white disabled:opacity-40'
                          }`}
                        >
                          {isTableRunning ? (
                            <>
                              <LoaderCircle className="w-3 h-3 animate-spin" />
                              <span>Running…</span>
                            </>
                          ) : isTableCompleted ? (
                            <>
                              <Check className="w-3 h-3" />
                              <span>Completed</span>
                            </>
                          ) : (
                            <>
                              <Play className="w-3 h-3" />
                              <span>Run Table</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Captured Errors & Diagnostics */}
        {activeTab === 'errors' && (
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-2.5 rounded-xl border border-slate-200 shadow-xs">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={errorQuery}
                  onChange={(e) => setErrorQuery(e.target.value)}
                  placeholder="Search errors by table or message…"
                  className="w-full h-8 pl-3 pr-8 rounded-lg border border-slate-200 bg-[#F8FAFC] text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-slate-400 focus:outline-none"
                />
                {errorQuery && (
                  <button
                    type="button"
                    onClick={() => setErrorQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
                {[
                  { id: 'ALL', label: 'All' },
                  { id: 'FOREIGN_KEY', label: 'Foreign Key' },
                  { id: 'UNIQUE_CONSTRAINT', label: 'Unique' },
                  { id: 'NOT_NULL', label: 'Not Null' },
                  { id: 'VALIDATION', label: 'Validation' },
                  { id: 'DATABASE_ERROR', label: 'DB Exceptions' },
                ].map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setErrorCatFilter(c.id)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition whitespace-nowrap ${
                      errorCatFilter === c.id
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            {filteredErrors.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-8 text-center space-y-2">
                <CheckCircle2 className="w-6 h-6 text-slate-400 mx-auto" />
                <h3 className="text-sm font-semibold text-slate-800">
                  No Database Errors Captured
                </h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Run a table to inspect extraction, mapping, or constraint diagnostics.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {filteredErrors.map((err) => (
                  <div
                    key={err.error_id}
                    className="bg-white rounded-xl border border-slate-200 p-3.5 space-y-2 shadow-xs"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-medium uppercase bg-rose-50 text-rose-800 border border-rose-200">
                          {err.error_category}
                        </span>
                        <span className="font-mono text-xs font-semibold text-slate-900">
                          {err.table_name || err.target_table}
                        </span>
                        {err.row_index !== undefined && (
                          <span className="font-mono text-[11px] text-slate-400">
                            Row #{err.row_index}
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] font-mono text-slate-400">
                        {fmtTime(err.timestamp)}
                      </span>
                    </div>

                    <p className="font-mono text-xs text-rose-800 bg-rose-50/50 p-2 rounded border border-rose-100 break-words">
                      {err.error_message}
                    </p>

                    {err.raw_payload && (
                      <div className="pt-0.5">
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedErrorPayload(
                              selectedErrorPayload === err.raw_payload
                                ? null
                                : err.raw_payload || null
                            )
                          }
                          className="inline-flex items-center gap-1 text-[11px] font-mono text-slate-500 hover:text-slate-800"
                        >
                          <Code2 className="w-3.5 h-3.5" />
                          <span>
                            {selectedErrorPayload === err.raw_payload
                              ? 'Hide raw record payload'
                              : 'Inspect raw record payload'}
                          </span>
                        </button>

                        {selectedErrorPayload === err.raw_payload && (
                          <pre className="mt-2 p-3 rounded-lg bg-slate-900 text-slate-100 text-[11px] font-mono overflow-x-auto max-h-48">
                            {JSON.stringify(err.raw_payload, null, 2)}
                          </pre>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Preflight Gates & Audit */}
        {activeTab === 'gates' && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4 shadow-xs">
              <h3 className="text-sm font-semibold text-slate-900 border-b border-slate-100 pb-2.5">
                Pre-Flight Checks
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(run.preflight_gates || []).map((gate) => {
                  const passed = gate.status === 'PASSED';
                  const isWarn = gate.status === 'WARNING';

                  return (
                    <div
                      key={gate.gate_id}
                      className="p-3 rounded-lg border border-slate-200 bg-[#F8FAFC] flex items-start gap-3"
                    >
                      {passed ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      ) : isWarn ? (
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      )}
                      <div className="space-y-0.5 min-w-0">
                        <div className="text-xs font-semibold font-mono text-slate-900 capitalize">
                          {gate.name.replace(/_/g, ' ')}
                        </div>
                        <p className="text-[11px] text-slate-500">
                          {gate.message || (passed ? 'Gate passed successfully' : 'Check failed')}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-2.5 shadow-xs">
              <h3 className="text-sm font-semibold text-slate-900">
                Manifest Record
              </h3>
              <div className="space-y-1 text-xs">
                <span className="text-slate-400">Manifest ID:</span>
                <span className="font-mono text-slate-800 ml-2">{run.manifest_id}</span>
              </div>
              <div className="space-y-1 text-xs">
                <span className="text-slate-400">Created:</span>
                <span className="text-slate-800 ml-2">
                  {fmtDate(run.created_at)}
                </span>
              </div>
              {run.signoff && (
                <div className="p-3 bg-[#F8FAFC] border border-slate-200 rounded-lg text-xs space-y-1 text-slate-800">
                  <div className="font-semibold text-slate-900">Formal Sign-Off Confirmed</div>
                  <div>Actor: {run.signoff.actor}</div>
                  <div>Comments: {run.signoff.comments}</div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}