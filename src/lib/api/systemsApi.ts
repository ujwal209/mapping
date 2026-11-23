import { apiRequest } from './client'

export interface SystemItem {
  system_id: string
  project_id: string
  name: string
  kind: 'SOURCE' | 'TARGET' | 'INTERMEDIATE' | string
  adapter_type: string
  connector_type: string
  classification: string
  purpose?: string
  environment: string
  created_at?: string | number
  config_summary?: Record<string, unknown>
}

export interface DiscoveredTableItem {
  name: string
  row_count: number
  column_count: number
  columns: { name: string; datatype: string; is_pk: string }[]
  sample_records: Record<string, unknown>[]
}

export interface PreConnectTestResponse {
  status: 'SUCCESS' | 'FAILED'
  latency_ms: number
  message: string
  warning?: string
  capabilities: string[]
  discovered_tables: DiscoveredTableItem[]
  masked_config: Record<string, unknown>
}

export interface PaginatedTablesResponse {
  system_id: string
  tables: { name: string; row_count: number; column_count: number }[]
  total: number
  offset: number
  limit: number
  query: string
}

export interface TableSchemaResponse {
  system_id: string
  name: string
  row_count: number
  column_count: number
  columns: { name: string; datatype: string; is_pk: boolean }[]
}

export interface TablePreviewResponse {
  system_id: string
  table: string
  rows: Record<string, unknown>[]
  offset: number
  limit: number
  total: number | null
  has_more: boolean
  warning?: string | null
}

export const systemsApi = {
  list(projectId?: string) {
    const query = projectId ? `?project_id=${encodeURIComponent(projectId)}` : ''
    return apiRequest<SystemItem[]>(`/systems${query}`)
  },

  get(systemId: string) {
    return apiRequest<SystemItem>(`/systems/${systemId}`)
  },

  create(payload: {
    project_id?: string
    name: string
    kind: string
    connector_type: string
    adapter_type?: string
    classification?: string
    purpose?: string
    environment?: string
    connection_config?: Record<string, unknown>
    initial_tables?: {
      name: string
      columns?: { name: string; datatype: string; is_pk?: boolean }[]
      sample_records?: Record<string, unknown>[]
    }[]
  }) {
    return apiRequest<SystemItem>('/systems', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  update(
    systemId: string,
    payload: {
      name?: string
      kind?: string
      connector_type?: string
      adapter_type?: string
      classification?: string
      purpose?: string
      environment?: string
      connection_config?: Record<string, unknown>
      secret_ref?: string
    }
  ) {
    return apiRequest<SystemItem>(`/systems/${systemId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
  },

  delete(systemId: string) {
    return apiRequest<{ status: string; system_id: string }>(
      `/systems/${systemId}`,
      {
        method: 'DELETE',
      }
    )
  },

  testPreConnect(payload: {
    connector_type: string
    connection_config: Record<string, unknown>
  }) {
    return apiRequest<PreConnectTestResponse>('/systems/test-pre-connect', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  previewPreConnectTable(payload: {
    connector_type: string
    connection_config: Record<string, unknown>
    table_name: string
    offset?: number
    limit?: number
  }) {
    return apiRequest<{
      table_name: string
      rows: Record<string, unknown>[]
      offset: number
      limit: number
      total: number | null
      has_more: boolean
    }>('/systems/test-pre-connect/preview', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  listTables(systemId: string, q = '', offset = 0, limit = 50) {
    const params = new URLSearchParams({
      q,
      offset: String(offset),
      limit: String(limit),
    })
    return apiRequest<PaginatedTablesResponse>(
      `/systems/${systemId}/tables?${params.toString()}`
    )
  },

  getTableSchema(systemId: string, tableName: string) {
    return apiRequest<TableSchemaResponse>(
      `/systems/${systemId}/tables/${encodeURIComponent(tableName)}`
    )
  },

  previewTableRows(
    systemId: string,
    tableName: string,
    offset = 0,
    limit = 25
  ) {
    const params = new URLSearchParams({
      offset: String(offset),
      limit: String(limit),
    })
    return apiRequest<TablePreviewResponse>(
      `/systems/${systemId}/tables/${encodeURIComponent(tableName)}/preview?${params.toString()}`
    )
  },
}