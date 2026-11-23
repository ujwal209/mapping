import { API_V1, authHeaders } from './api-config';

export interface PreflightGate {
  gate_id: string;
  name: string;
  status: 'PASSED' | 'FAILED' | 'WARNING';
  message: string;
  details?: Record<string, any>;
  blocking: boolean;
  ran_at: number;
}

export interface TablePreview {
  source_table: string;
  target_table: string;
  load_mode: string;
  source_row_count: number;
  target_row_count_before: number;
  target_row_count_after_estimate: number;
  columns_mapped: number;
  masked_columns: string[];
  warnings_count: number;
  warnings: string[];
  is_destructive: boolean;
}

export interface ReviewContext {
  run_id: string;
  phase: string;
  total_source_rows: number;
  total_target_rows_before: number;
  total_target_rows_after_estimate: number;
  total_tables: number;
  total_columns_mapped: number;
  table_previews: TablePreview[];
  warning_count: number;
  warnings: string[];
  pii_table_count: number;
  preflight_gates: PreflightGate[];
  recommendation: 'SAFE_TO_LOAD' | 'REVIEW_REQUIRED' | 'BLOCKING_WARNINGS';
  recommendation_reason: string;
}

export interface MigrationTableStatus {
  source_table: string;
  target_table: string;
  load_mode: string;
  state: 'PENDING' | 'EXTRACTING' | 'TRANSFORMING' | 'LOADING' | 'COMPLETED' | 'PAUSED' | 'FAILED';
  rows_total: number;
  rows_extracted: number;
  rows_transformed: number;
  rows_validated: number;
  rows_loaded: number;
  rows_failed: number;
  last_offset: number;
  batch_size: number;
  started_at?: number | null;
  completed_at?: number | null;
  duration_ms?: number | null;
  error?: string | null;
  error_count: number;
}

export interface MigrationErrorRecord {
  error_id: string;
  table_name: string;
  target_table: string;
  row_index?: number;
  record_id?: string;
  error_category:
    | 'VALIDATION'
    | 'FOREIGN_KEY'
    | 'UNIQUE_CONSTRAINT'
    | 'NOT_NULL'
    | 'TYPE_MISMATCH'
    | 'PERMISSION_DENIED'
    | 'DATABASE_ERROR';
  error_message: string;
  column_name?: string;
  raw_payload?: Record<string, any>;
  timestamp: number;
}

export interface MigrationRun {
  run_id: string;
  manifest_id: string;
  project_id: string;
  tenant_id: string;
  name: string;
  description: string;
  version_tag: string;
  source_system_id: string;
  target_system_id: string;
  source_system_name: string;
  target_system_name: string;
  source_connector_type: string;
  target_connector_type: string;
  state:
    | 'DRAFT'
    | 'QUEUED'
    | 'RUNNING'
    | 'AWAITING_LOAD_REVIEW'
    | 'LOADING'
    | 'COMPLETED'
    | 'PAUSED'
    | 'FAILED'
    | 'ABORTED'
    | 'SIGNED_OFF';
  phase:
    | 'PREFLIGHT'
    | 'EXTRACT'
    | 'TRANSFORM'
    | 'VALIDATE'
    | 'AWAITING_LOAD_REVIEW'
    | 'LOAD'
    | 'RECONCILE'
    | 'DONE';
  is_paused: boolean;
  can_resume: boolean;
  tables_total: number;
  tables_completed: number;
  rows_extracted: number;
  rows_transformed: number;
  rows_validated: number;
  rows_loaded: number;
  rows_failed: number;
  table_statuses: MigrationTableStatus[];
  error_records: MigrationErrorRecord[];
  preflight_gates: PreflightGate[];
  error?: string | null;
  warnings: string[];
  created_at: number;
  started_at?: number | null;
  load_started_at?: number | null;
  completed_at?: number | null;
}

export interface TableLoadOverride {
  source_table: string;
  target_table: string;
  load_mode: 'UPSERT' | 'APPEND' | 'REPLACE';
  primary_key_columns?: string[];
  masking_columns?: string[];
}

export interface CreateRunPayload {
  project_id: string;
  pair_mapping_set_id: string;
  review_mode?: 'STANDARD' | 'STRICT';
  table_load_overrides?: TableLoadOverride[];
  policy_waivers?: string[];
  actor?: string;
  name?: string;
  description?: string;
  version_tag?: string;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_V1}${path}`;
  const hasBody = options.body !== undefined && options.body !== null;

  let res: Response;
  try {
    res = await fetch(url, {
      ...options,
      cache: 'no-store',
      headers: {
        ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
        ...authHeaders(),
        ...(options.headers || {}),
      },
    });
  } catch (err: any) {
    throw new Error(
      `Network error reaching migration service (${url}). Ensure the backend server is running and CORS is allowed.`
    );
  }

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(
      errorBody?.detail ||
        errorBody?.message ||
        `Migration API Error: ${res.status} ${res.statusText}`
    );
  }
  return res.json();
}

export const migrationsApi = {
  list(projectId?: string, state?: string): Promise<MigrationRun[]> {
    const params = new URLSearchParams();
    if (projectId) params.set('project_id', projectId);
    if (state) params.set('state', state);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return request<MigrationRun[]>(`/migrations${qs}`);
  },

  get(runId: string): Promise<MigrationRun> {
    return request<MigrationRun>(`/migrations/${encodeURIComponent(runId)}`);
  },

  create(payload: CreateRunPayload, batchSize?: number): Promise<MigrationRun> {
    const qs = batchSize ? `?batch_size=${batchSize}` : '';
    return request<MigrationRun>(`/migrations${qs}`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  createDraft(payload: CreateRunPayload): Promise<MigrationRun> {
    return request<MigrationRun>(`/migrations/draft`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  start(runId: string, actor: string = 'system'): Promise<MigrationRun> {
    return request<MigrationRun>(`/migrations/${encodeURIComponent(runId)}/start`, {
      method: 'POST',
      body: JSON.stringify({ actor }),
    });
  },

  pause(runId: string, actor: string = 'system'): Promise<MigrationRun> {
    return request<MigrationRun>(`/migrations/${encodeURIComponent(runId)}/pause`, {
      method: 'POST',
      body: JSON.stringify({ actor }),
    });
  },

  resume(runId: string, actor: string = 'system'): Promise<MigrationRun> {
    return request<MigrationRun>(`/migrations/${encodeURIComponent(runId)}/resume`, {
      method: 'POST',
      body: JSON.stringify({ actor }),
    });
  },

  runTable(runId: string, tableName: string, actor: string = 'system'): Promise<MigrationRun> {
    return request<MigrationRun>(
      `/migrations/${encodeURIComponent(runId)}/tables/${encodeURIComponent(tableName)}/run`,
      {
        method: 'POST',
        body: JSON.stringify({ actor }),
      }
    );
  },

  runTableBatch(
    runId: string,
    tableName: string,
    offset: number,
    batchSize: number = 500,
    actor: string = 'system'
  ): Promise<{
    completed: boolean;
    next_offset: number;
    batch_rows: number;
    loaded: number;
    failed: number;
    errors: string[];
  }> {
    return request(
      `/migrations/${encodeURIComponent(runId)}/tables/${encodeURIComponent(tableName)}/run-batch`,
      {
        method: 'POST',
        body: JSON.stringify({ offset, batch_size: batchSize, actor }),
      }
    );
  },

  getReviewContext(runId: string): Promise<ReviewContext> {
    return request<ReviewContext>(
      `/migrations/${encodeURIComponent(runId)}/review-context`
    );
  },

  approveLoad(
    runId: string,
    payload: { actor: string; comments?: string; waivers_accepted?: string[] }
  ): Promise<MigrationRun> {
    return request<MigrationRun>(
      `/migrations/${encodeURIComponent(runId)}/approve-load`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
  },

  abort(
    runId: string,
    payload: { actor: string; reason?: string }
  ): Promise<MigrationRun> {
    return request<MigrationRun>(`/migrations/${encodeURIComponent(runId)}/abort`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  signoff(
    runId: string,
    payload: { actor: string; comments?: string }
  ): Promise<MigrationRun> {
    return request<MigrationRun>(`/migrations/${encodeURIComponent(runId)}/signoff`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  getErrors(
    runId: string,
    tableName?: string,
    category?: string
  ): Promise<MigrationErrorRecord[]> {
    const params = new URLSearchParams();
    if (tableName) params.set('table_name', tableName);
    if (category) params.set('category', category);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return request<MigrationErrorRecord[]>(
      `/migrations/${encodeURIComponent(runId)}/errors${qs}`
    );
  },

  delete(runId: string): Promise<{ status: string; run_id: string }> {
    return request<{ status: string; run_id: string }>(
      `/migrations/${encodeURIComponent(runId)}`,
      { method: 'DELETE' }
    );
  },
};