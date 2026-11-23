import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import {
  Rocket,
  RefreshCw,
  Search,
  X,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  Database,
  Trash2,
  Layers,
  ChevronRight,
  LoaderCircle,
  FileEdit,
  ShieldAlert,
} from 'lucide-react';
import { toast } from 'sonner';
import { resolveProjectId } from '../../../lib/api-config';
import {
  migrationsApi,
  type MigrationRun,
} from '../../../lib/migrations-api';

export const Route = createFileRoute('/(platfrom)/migrations/')({
  validateSearch: (search: Record<string, unknown>): { project_id?: string } => ({
    project_id:
      typeof search.project_id === 'string' && search.project_id.trim()
        ? search.project_id.trim()
        : undefined,
  }),
  component: MigrationsListPage,
});

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
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

function MigrationsListPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const projectId = resolveProjectId(search.project_id ?? null);

  const [runs, setRuns] = useState<MigrationRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState('');
  const [stateFilter, setStateFilter] = useState<string>('ALL');
  const [actionInProgressId, setActionInProgressId] = useState<string | null>(null);

  const runsRef = useRef<MigrationRun[]>([]);
  runsRef.current = runs;

  const loadRuns = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    else setRefreshing(true);
    setError(null);

    try {
      const data = await migrationsApi.list(projectId);
      setRuns(data || []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load migration runs.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [projectId]);

  useEffect(() => {
    void loadRuns();
    // Auto refresh active runs every 4 seconds without triggering re-render cascades
    const interval = setInterval(() => {
      const hasActive = runsRef.current.some((r) =>
        ['RUNNING', 'LOADING', 'QUEUED'].includes(r.state)
      );
      if (hasActive) {
        void loadRuns(true);
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [loadRuns]);

  const handleStart = async (runId: string) => {
    setActionInProgressId(runId);
    try {
      await migrationsApi.start(runId);
      toast.success('Migration started');
      await loadRuns(true);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to start migration');
    } finally {
      setActionInProgressId(null);
    }
  };

  const handlePause = async (runId: string) => {
    setActionInProgressId(runId);
    try {
      await migrationsApi.pause(runId);
      toast.info('Migration paused');
      await loadRuns(true);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to pause migration');
    } finally {
      setActionInProgressId(null);
    }
  };

  const handleResume = async (runId: string) => {
    setActionInProgressId(runId);
    try {
      await migrationsApi.resume(runId);
      toast.success('Migration resumed');
      await loadRuns(true);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to resume migration');
    } finally {
      setActionInProgressId(null);
    }
  };

  const handleDelete = async (runId: string) => {
    if (!confirm('Are you sure you want to delete this migration run?')) return;
    setActionInProgressId(runId);
    try {
      await migrationsApi.delete(runId);
      toast.success('Migration run deleted');
      setRuns((prev) => prev.filter((r) => r.run_id !== runId));
    } catch (e: any) {
      toast.error(e?.message || 'Failed to delete migration');
    } finally {
      setActionInProgressId(null);
    }
  };

  const filteredRuns = useMemo(() => {
    const q = query.trim().toLowerCase();
    return runs.filter((r) => {
      const matchQ =
        !q ||
        r.name?.toLowerCase().includes(q) ||
        r.source_system_name?.toLowerCase().includes(q) ||
        r.target_system_name?.toLowerCase().includes(q) ||
        r.run_id?.toLowerCase().includes(q);

      if (!matchQ) return false;

      if (stateFilter === 'ALL') return true;
      if (stateFilter === 'DRAFT') return r.state === 'DRAFT';
      if (stateFilter === 'ACTIVE')
        return ['RUNNING', 'LOADING', 'QUEUED'].includes(r.state);
      if (stateFilter === 'PAUSED') return r.state === 'PAUSED';
      if (stateFilter === 'REVIEW')
        return r.state === 'AWAITING_LOAD_REVIEW';
      if (stateFilter === 'COMPLETED')
        return ['COMPLETED', 'SIGNED_OFF'].includes(r.state);
      if (stateFilter === 'FAILED')
        return ['FAILED', 'ABORTED'].includes(r.state);

      return true;
    });
  }, [runs, query, stateFilter]);

  const stats = useMemo(() => {
    const total = runs.length;
    const active = runs.filter((r) =>
      ['RUNNING', 'LOADING', 'QUEUED'].includes(r.state)
    ).length;
    const drafts = runs.filter((r) => r.state === 'DRAFT').length;
    const completed = runs.filter((r) =>
      ['COMPLETED', 'SIGNED_OFF'].includes(r.state)
    ).length;
    const paused = runs.filter((r) => r.state === 'PAUSED').length;
    return { total, active, drafts, completed, paused };
  }, [runs]);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50/50 text-slate-900 pb-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Professional Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-white shadow-xs">
                <Rocket className="h-4 w-4" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-slate-900">
                  Data Migrations
                </h1>
              </div>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Batch-managed data pipelines with checkpoint recovery and transactional integrity.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => void loadRuns(true)}
              disabled={loading || refreshing}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 transition shadow-xs disabled:opacity-50"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 text-slate-500 ${refreshing ? 'animate-spin' : ''}`}
              />
              <span>Refresh</span>
            </button>

            <Link
              to="/migrations/new"
              search={{ project_id: projectId }}
              className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-lg bg-[#39359D] hover:bg-[#302c84] text-white text-xs font-medium transition shadow-xs"
            >
              <Rocket className="w-3.5 h-3.5" />
              <span>Create Migration</span>
            </Link>
          </div>
        </div>

        {/* Calm Stats Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-xs">
            <div className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
              Total Runs
            </div>
            <div className="mt-1 text-2xl font-bold text-slate-900 font-mono">
              {stats.total}
            </div>
          </div>
          <div className="rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-xs">
            <div className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
              In-Progress
            </div>
            <div className="mt-1 text-2xl font-bold text-slate-800 font-mono">
              {stats.active}
            </div>
          </div>
          <div className="rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-xs">
            <div className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
              Drafts
            </div>
            <div className="mt-1 text-2xl font-bold text-slate-600 font-mono">
              {stats.drafts}
            </div>
          </div>
          <div className="rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-xs">
            <div className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
              Paused
            </div>
            <div className="mt-1 text-2xl font-bold text-slate-700 font-mono">
              {stats.paused}
            </div>
          </div>
          <div className="rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-xs">
            <div className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
              Completed
            </div>
            <div className="mt-1 text-2xl font-bold text-slate-800 font-mono">
              {stats.completed}
            </div>
          </div>
        </div>

        {/* Clean Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-2.5 rounded-xl border border-slate-200 shadow-xs">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by migration name or system…"
              className="w-full h-8 pl-8 pr-7 rounded-lg border border-slate-200 bg-slate-50/50 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-[#39359D] focus:outline-none transition"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
            {[
              { id: 'ALL', label: 'All' },
              { id: 'ACTIVE', label: 'Running' },
              { id: 'DRAFT', label: 'Drafts' },
              { id: 'PAUSED', label: 'Paused' },
              { id: 'REVIEW', label: 'Review Gate' },
              { id: 'COMPLETED', label: 'Completed' },
              { id: 'FAILED', label: 'Failed' },
            ].map((f) => {
              const active = stateFilter === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setStateFilter(f.id)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition ${
                    active
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  {f.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Runs List */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-500">
            <LoaderCircle className="w-6 h-6 animate-spin text-slate-600" />
            <p className="text-xs text-slate-500 font-medium">Loading migrations…</p>
          </div>
        ) : error ? (
          <div className="rounded-xl border border-slate-200 bg-white p-6 text-center space-y-3">
            <AlertTriangle className="w-7 h-7 text-slate-600 mx-auto" />
            <p className="text-xs text-slate-700">{error}</p>
            <button
              type="button"
              onClick={() => void loadRuns()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-medium hover:bg-slate-800"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Retry
            </button>
          </div>
        ) : filteredRuns.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-12 text-center space-y-3">
            <Layers className="w-8 h-8 text-slate-300 mx-auto" />
            <h3 className="text-sm font-semibold text-slate-800">
              {query || stateFilter !== 'ALL'
                ? 'No matching migrations found'
                : 'No migrations configured yet'}
            </h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {query || stateFilter !== 'ALL'
                ? 'Try adjusting your search query or filter tags.'
                : 'Create your first migration draft to start moving tables between your connected systems.'}
            </p>
            {!query && stateFilter === 'ALL' && (
              <div className="pt-2">
                <Link
                  to="/migrations/new"
                  search={{ project_id: projectId }}
                  className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-lg bg-[#39359D] text-white text-xs font-medium hover:bg-[#302c84] transition shadow-xs"
                >
                  <Rocket className="w-3.5 h-3.5" />
                  <span>Configure Migration</span>
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredRuns.map((run) => {
              const isActioning = actionInProgressId === run.run_id;
              const isDraft = run.state === 'DRAFT';
              const isRunning = ['RUNNING', 'LOADING', 'QUEUED'].includes(
                run.state
              );
              const isPaused = run.state === 'PAUSED';
              const isAwaitingReview = run.state === 'AWAITING_LOAD_REVIEW';
              const isDone = ['COMPLETED', 'SIGNED_OFF'].includes(run.state);
              const isFailed = ['FAILED', 'ABORTED'].includes(run.state);

              // Calculate overall progress % safely
              const tablesTotal = run.tables_total || 0;
              const tablesDone = run.tables_completed || 0;
              const pct =
                tablesTotal > 0
                  ? isDone
                    ? 100
                    : Math.round((tablesDone / tablesTotal) * 100)
                  : 0;

              return (
                <div
                  key={run.run_id}
                  className="bg-white rounded-xl border border-slate-200 hover:border-slate-300 transition-all p-4 shadow-xs space-y-3.5"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link
                          to="/migrations/$id"
                          params={{ id: run.run_id }}
                          search={{ project_id: projectId }}
                          className="font-semibold text-sm text-slate-900 hover:text-[#39359D] transition break-words"
                        >
                          {run.name || `Migration ${run.run_id.slice(0, 8)}`}
                        </Link>
                        <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                          v{run.version_tag || '1.0.0'}
                        </span>

                        {/* Professional State Badge */}
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

                      {/* Clean Systems Path */}
                      <div className="flex items-center gap-2 text-xs text-slate-600 font-medium flex-wrap pt-0.5">
                        <span className="flex items-center gap-1 text-slate-800">
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

                        <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />

                        <span className="flex items-center gap-1 text-slate-800">
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

                    {/* Quick Action Buttons */}
                    <div className="flex items-center gap-1.5 self-end lg:self-center shrink-0">
                      {isDraft && (
                        <button
                          type="button"
                          disabled={isActioning}
                          onClick={() => handleStart(run.run_id)}
                          className="inline-flex items-center gap-1 h-8 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium transition disabled:opacity-50"
                        >
                          <Play className="w-3 h-3" />
                          <span>Start</span>
                        </button>
                      )}

                      {isRunning && (
                        <button
                          type="button"
                          disabled={isActioning}
                          onClick={() => handlePause(run.run_id)}
                          className="inline-flex items-center gap-1 h-8 px-3 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium transition disabled:opacity-50"
                        >
                          <Pause className="w-3 h-3" />
                          <span>Pause</span>
                        </button>
                      )}

                      {(isPaused || isFailed) && (
                        <button
                          type="button"
                          disabled={isActioning}
                          onClick={() => handleResume(run.run_id)}
                          className="inline-flex items-center gap-1 h-8 px-3 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium transition disabled:opacity-50"
                        >
                          <RotateCcw className="w-3 h-3 text-slate-700" />
                          <span>Resume</span>
                        </button>
                      )}

                      {isAwaitingReview && (
                        <Link
                          to="/migrations/$id"
                          params={{ id: run.run_id }}
                          search={{ project_id: projectId }}
                          className="inline-flex items-center gap-1 h-8 px-3 rounded-lg bg-slate-800 hover:bg-slate-900 text-white text-xs font-medium transition"
                        >
                          <ShieldAlert className="w-3 h-3" />
                          <span>Review Gate</span>
                        </Link>
                      )}

                      <Link
                        to="/migrations/$id"
                        params={{ id: run.run_id }}
                        search={{ project_id: projectId }}
                        className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 transition"
                      >
                        <span>Details</span>
                        <ChevronRight className="w-3 h-3 text-slate-400" />
                      </Link>

                      <button
                        type="button"
                        disabled={isActioning || isRunning}
                        onClick={() => handleDelete(run.run_id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition disabled:opacity-30"
                        title="Delete run"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Progress & Metrics Strip */}
                  <div className="pt-2.5 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-4 gap-3 items-center text-xs">
                    <div className="space-y-1 sm:col-span-2">
                      <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
                        <span>
                          {fmtNum(run.tables_completed)} of {fmtNum(run.tables_total)} tables
                        </span>
                        <span className="font-mono font-medium text-slate-700">
                          {pct}%
                        </span>
                      </div>
                      <div className="h-1 w-full rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-slate-800 transition-all duration-300"
                          style={{ width: `${Math.min(100, Math.max(isDraft ? 0 : 4, pct))}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-slate-600 font-mono text-[11px]">
                      <div>
                        <span className="font-semibold text-slate-900">
                          {fmtNum(run.rows_loaded)}
                        </span>{' '}
                        written
                      </div>
                      {Number(run.rows_failed) > 0 && (
                        <div>
                          ·{' '}
                          <span className="text-rose-700 font-semibold">
                            {fmtNum(run.rows_failed)}
                          </span>{' '}
                          errors
                        </div>
                      )}
                    </div>

                    <div className="text-right text-[11px] text-slate-400 font-mono">
                      {fmtDate(run.created_at)}
                    </div>
                  </div>

                  {/* Diagnostic Alert if failed */}
                  {run.error && (
                    <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 text-xs flex items-center gap-2">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-slate-500" />
                      <span className="truncate">{run.error}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
