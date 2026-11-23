import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import {
  ArrowLeft,
  ArrowRight,
  Rocket,
  FileEdit,
  Database,
  Layers,
  CheckCircle2,
  AlertTriangle,
  LoaderCircle,
  HelpCircle,
  Check,
  ShieldAlert,
} from 'lucide-react';
import { toast } from 'sonner';
import { resolveProjectId, API_V1, authHeaders } from '../../../lib/api-config';
import { migrationsApi, type TableLoadOverride } from '../../../lib/migrations-api';
import { pairMappingApi, type PairMappingSet } from '../../../lib/pair-mapping-api';

export const Route = createFileRoute('/(platfrom)/migrations/new')({
  validateSearch: (search: Record<string, unknown>): { project_id?: string } => ({
    project_id:
      typeof search.project_id === 'string' && search.project_id.trim()
        ? search.project_id.trim()
        : undefined,
  }),
  component: NewMigrationPage,
});

interface SystemInfo {
  system_id: string;
  name: string;
  connector_type: string;
}

function NewMigrationPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const projectId = resolveProjectId(search.project_id ?? null);

  const [loadingSets, setLoadingSets] = useState(true);
  const [mappingSets, setMappingSets] = useState<PairMappingSet[]>([]);
  const [selectedSetId, setSelectedSetId] = useState<string>('');
  const [systemsMap, setSystemsMap] = useState<Record<string, SystemInfo>>({});

  // Form State
  const [name, setName] = useState('');
  const [versionTag, setVersionTag] = useState('1.0.0');
  const [description, setDescription] = useState('');
  const [reviewMode, setReviewMode] = useState<'STANDARD' | 'STRICT'>('STANDARD');
  const [batchSize, setBatchSize] = useState<number>(1000);

  // Per-table inclusion & load mode
  const [selectedTables, setSelectedTables] = useState<Record<string, boolean>>({});
  const [tableLoadModes, setTableLoadModes] = useState<
    Record<string, 'UPSERT' | 'APPEND' | 'REPLACE'>
  >({});

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load Mapping Sets & Systems
  useEffect(() => {
    async function loadData() {
      setLoadingSets(true);
      setError(null);
      try {
        // Fetch systems to get human readable names
        const sysRes = await fetch(`${API_V1}/systems`, {
          headers: authHeaders(),
        });
        const sysData = sysRes.ok ? await sysRes.json() : [];
        const sMap: Record<string, SystemInfo> = {};
        for (const s of sysData) {
          sMap[s.system_id] = {
            system_id: s.system_id,
            name: s.name,
            connector_type: s.connector_type,
          };
        }
        setSystemsMap(sMap);

        // Fetch approved pair mapping sets
        const sets = await pairMappingApi.list(projectId);
        setMappingSets(sets || []);

        if (sets && sets.length > 0) {
          const first = sets[0];
          setSelectedSetId(first.set_id);
          setName(first.name ? `${first.name} Migration` : 'Data Pipeline Migration');
          setVersionTag(first.version_tag || '1.0.0');

          // Initialize tables
          const initialSel: Record<string, boolean> = {};
          const initialModes: Record<string, 'UPSERT' | 'APPEND' | 'REPLACE'> = {};
          for (const p of first.pairs || []) {
            initialSel[p.source_table] = true;
            initialModes[p.source_table] = 'UPSERT';
          }
          setSelectedTables(initialSel);
          setTableLoadModes(initialModes);
        }
      } catch (e: any) {
        setError(e?.message || 'Failed to load mapping sets');
      } finally {
        setLoadingSets(false);
      }
    }
    void loadData();
  }, [projectId]);

  const selectedSet = useMemo(
    () => mappingSets.find((s) => s.set_id === selectedSetId) || null,
    [mappingSets, selectedSetId]
  );

  const handleSelectSet = (setId: string) => {
    setSelectedSetId(setId);
    const chosen = mappingSets.find((s) => s.set_id === setId);
    if (chosen) {
      setName(chosen.name ? `${chosen.name} Migration` : 'Data Pipeline Migration');
      setVersionTag(chosen.version_tag || '1.0.0');

      const initialSel: Record<string, boolean> = {};
      const initialModes: Record<string, 'UPSERT' | 'APPEND' | 'REPLACE'> = {};
      for (const p of chosen.pairs || []) {
        initialSel[p.source_table] = true;
        initialModes[p.source_table] = 'UPSERT';
      }
      setSelectedTables(initialSel);
      setTableLoadModes(initialModes);
    }
  };

  const handleToggleTable = (table: string) => {
    setSelectedTables((prev) => ({
      ...prev,
      [table]: !prev[table],
    }));
  };

  const handleSetTableMode = (
    table: string,
    mode: 'UPSERT' | 'APPEND' | 'REPLACE'
  ) => {
    setTableLoadModes((prev) => ({
      ...prev,
      [table]: mode,
    }));
  };

  const handleSubmit = async (asDraft: boolean) => {
    if (!selectedSet) {
      toast.error('Select an approved Schema Mapping Set.');
      return;
    }
    if (!name.trim()) {
      toast.error('Please provide a migration name.');
      return;
    }

    const tableConfigs: TableLoadOverride[] = [];
    for (const p of selectedSet.pairs || []) {
      if (selectedTables[p.source_table]) {
        tableConfigs.push({
          source_table: p.source_table,
          target_table: p.target_table,
          load_mode: tableLoadModes[p.source_table] || 'UPSERT',
        });
      }
    }

    if (tableConfigs.length === 0) {
      toast.error('Select at least one table to migrate.');
      return;
    }

    setSubmitting(true);
    setError(null);

    const payload = {
      project_id: projectId,
      pair_mapping_set_id: selectedSet.set_id,
      name: name.trim(),
      description: description.trim(),
      version_tag: versionTag.trim() || '1.0.0',
      review_mode: reviewMode,
      table_load_overrides: tableConfigs,
    };

    try {
      if (asDraft) {
        const draft = await migrationsApi.createDraft(payload);
        toast.success('Migration draft created successfully');
        navigate({
          to: '/migrations/$id',
          params: { id: draft.run_id },
          search: { project_id: projectId },
        });
      } else {
        const run = await migrationsApi.create(payload, batchSize);
        toast.success('Migration run launched successfully');
        navigate({
          to: '/migrations/$id',
          params: { id: run.run_id },
          search: { project_id: projectId },
        });
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to submit migration');
      toast.error(e?.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50/50 text-slate-900 pb-20">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-slate-200 pb-5">
          <button
            type="button"
            onClick={() =>
              navigate({
                to: '/migrations',
                search: { project_id: projectId },
              })
            }
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition shadow-xs"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              New Migration
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Select an approved mapping schema, configure per-table execution, and launch or save as draft.
            </p>
          </div>
        </div>

        {loadingSets ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-500">
            <LoaderCircle className="w-6 h-6 animate-spin text-slate-600" />
            <p className="text-xs font-medium">Loading schemas…</p>
          </div>
        ) : mappingSets.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-10 text-center space-y-3 shadow-xs">
            <Layers className="w-8 h-8 text-slate-300 mx-auto" />
            <h3 className="text-sm font-semibold text-slate-800">
              No Approved Mapping Sets Available
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Before creating a migration, you must generate and approve table-pair mappings in Table Matching Studio.
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={() =>
                  navigate({
                    to: '/table-matching',
                    search: { project_id: projectId },
                  })
                }
                className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-lg bg-slate-900 text-white text-xs font-medium hover:bg-slate-800 transition shadow-xs"
              >
                Go to Table Matching
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Step 1: Mapping Set Selection */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3.5 shadow-xs">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
                <span className="flex h-5 w-5 rounded bg-slate-100 text-slate-800 items-center justify-center text-[11px] font-bold font-mono">
                  1
                </span>
                <h2 className="text-sm font-semibold text-slate-900">
                  Select Approved Mapping Schema
                </h2>
              </div>

              <div className="grid grid-cols-1 gap-2.5">
                {mappingSets.map((s) => {
                  const selected = s.set_id === selectedSetId;
                  const sSys = s.source_system_id ? systemsMap[s.source_system_id] : null;
                  const tSys = s.target_system_id ? systemsMap[s.target_system_id] : null;

                  return (
                    <button
                      key={s.set_id}
                      type="button"
                      onClick={() => handleSelectSet(s.set_id)}
                      className={`w-full text-left p-3.5 rounded-xl border transition flex items-start justify-between gap-3 ${
                        selected
                          ? 'border-slate-900 bg-slate-50/70'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm text-slate-900 break-words">
                            {s.name || 'Column Mapping Set'}
                          </span>
                          <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200">
                            v{s.version_tag || '1.0.0'}
                          </span>
                          {s.status === 'APPROVED' ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.2 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                              <Check className="w-3 h-3 text-emerald-600" />
                              Approved
                            </span>
                          ) : (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
                              {s.status}
                            </span>
                          )}
                        </div>

                        {/* Systems representation */}
                        <div className="flex items-center gap-2 text-xs text-slate-600 flex-wrap">
                          <span className="font-medium text-slate-900">
                            {sSys?.name || s.source_system_id || 'Source'}
                          </span>
                          {sSys?.connector_type && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 font-mono uppercase text-slate-500">
                              {sSys.connector_type}
                            </span>
                          )}
                          <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="font-medium text-slate-900">
                            {tSys?.name || s.target_system_id || 'Target'}
                          </span>
                          {tSys?.connector_type && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 font-mono uppercase text-slate-500">
                              {tSys.connector_type}
                            </span>
                          )}
                          <span className="text-slate-400">·</span>
                          <span className="text-slate-500 font-mono">
                            {s.pairs?.length || 0} tables
                          </span>
                        </div>
                      </div>

                      {selected && (
                        <Check className="w-4 h-4 text-slate-900 shrink-0 mt-0.5" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 2: Migration Identity */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3.5 shadow-xs">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
                <span className="flex h-5 w-5 rounded bg-slate-100 text-slate-800 items-center justify-center text-[11px] font-bold font-mono">
                  2
                </span>
                <h2 className="text-sm font-semibold text-slate-900">
                  Migration Parameters
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div className="sm:col-span-2 space-y-1">
                  <label className="block text-xs font-medium text-slate-700">
                    Migration Name *
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Core Database Migration"
                    className="w-full h-8 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-medium text-slate-700">
                    Version Tag
                  </label>
                  <input
                    type="text"
                    value={versionTag}
                    onChange={(e) => setVersionTag(e.target.value)}
                    placeholder="1.0.0"
                    className="w-full h-8 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-900 font-mono focus:border-slate-400 focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-3 space-y-1">
                  <label className="block text-xs font-medium text-slate-700">
                    Description (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Optional notes regarding this migration batch."
                    className="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Step 3: Table Selection & Load Mode Matrix */}
            {selectedSet && selectedSet.pairs && (
              <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3.5 shadow-xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 rounded bg-slate-100 text-slate-800 items-center justify-center text-[11px] font-bold font-mono">
                      3
                    </span>
                    <h2 className="text-sm font-semibold text-slate-900">
                      Table Matrix
                    </h2>
                  </div>
                  <span className="text-xs text-slate-400 font-mono">
                    {Object.values(selectedTables).filter(Boolean).length} of{' '}
                    {selectedSet.pairs.length} selected
                  </span>
                </div>

                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                  {selectedSet.pairs.map((p) => {
                    const included = !!selectedTables[p.source_table];
                    const mode = tableLoadModes[p.source_table] || 'UPSERT';

                    return (
                      <div
                        key={`${p.source_table}-${p.target_table}`}
                        className={`p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition ${
                          included ? 'bg-white' : 'bg-slate-50/70 opacity-60'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <input
                            type="checkbox"
                            checked={included}
                            onChange={() => handleToggleTable(p.source_table)}
                            className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                          />
                          <div className="space-y-0.5 min-w-0">
                            <div className="flex items-center gap-2 font-mono text-xs">
                              <span className="font-semibold text-slate-900 break-all">
                                {p.source_table}
                              </span>
                              <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className="font-semibold text-slate-700 break-all">
                                {p.target_table}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-400">
                              {p.columns?.length || 0} column rules
                            </div>
                          </div>
                        </div>

                        {/* Load Mode Selector */}
                        {included && (
                          <div className="flex items-center gap-1 self-end sm:self-center">
                            {(['UPSERT', 'APPEND', 'REPLACE'] as const).map(
                              (m) => {
                                const active = mode === m;
                                return (
                                  <button
                                    key={m}
                                    type="button"
                                    onClick={() =>
                                      handleSetTableMode(p.source_table, m)
                                    }
                                    className={`px-2 py-0.5 rounded text-[11px] font-mono font-medium transition ${
                                      active
                                        ? 'bg-slate-900 text-white'
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                    }`}
                                  >
                                    {m}
                                  </button>
                                );
                              }
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Step 4: Batching & Review Mode */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3.5 shadow-xs">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
                <span className="flex h-5 w-5 rounded bg-slate-100 text-slate-800 items-center justify-center text-[11px] font-bold font-mono">
                  4
                </span>
                <h2 className="text-sm font-semibold text-slate-900">
                  Execution Safety & Batching
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-slate-700">
                    Review Gate Policy
                  </label>
                  <select
                    value={reviewMode}
                    onChange={(e) =>
                      setReviewMode(e.target.value as 'STANDARD' | 'STRICT')
                    }
                    className="w-full h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-900 focus:border-slate-400 focus:outline-none"
                  >
                    <option value="STANDARD">
                      Standard (Pause only on schema anomalies or REPLACE mode)
                    </option>
                    <option value="STRICT">
                      Strict (Always halt at Gate A for review)
                    </option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-medium text-slate-700">
                    Batch Size (Rows per slice)
                  </label>
                  <select
                    value={batchSize}
                    onChange={(e) => setBatchSize(Number(e.target.value))}
                    className="w-full h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-900 font-mono focus:border-slate-400 focus:outline-none"
                  >
                    <option value={500}>500 rows (Best for serverless functions)</option>
                    <option value={1000}>1,000 rows (Default)</option>
                    <option value={2500}>2,500 rows (High throughput)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Error banner */}
            {error && (
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 text-xs flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-slate-500" />
                <span>{error}</span>
              </div>
            )}

            {/* Actions Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={() =>
                  navigate({
                    to: '/migrations',
                    search: { project_id: projectId },
                  })
                }
                className="h-8 px-3.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-600 hover:bg-slate-50 transition"
              >
                Cancel
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleSubmit(true)}
                  className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-medium transition shadow-xs disabled:opacity-40"
                >
                  {submitting ? (
                    <LoaderCircle className="w-3 h-3 animate-spin" />
                  ) : (
                    <FileEdit className="w-3 h-3 text-slate-500" />
                  )}
                  <span>Save Draft</span>
                </button>

                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleSubmit(false)}
                  className="inline-flex items-center gap-1.5 h-8 px-4 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium transition shadow-xs disabled:opacity-40"
                >
                  {submitting ? (
                    <LoaderCircle className="w-3 h-3 animate-spin" />
                  ) : (
                    <Rocket className="w-3 h-3" />
                  )}
                  <span>Launch Migration</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
