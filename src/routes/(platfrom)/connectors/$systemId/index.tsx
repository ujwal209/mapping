import { useCallback, useEffect, useRef, useState } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import {
  Loader2,
  ArrowLeft,
  Pencil,
  Trash2,
  Search,
  Table2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  KeyRound,
  RefreshCw,
  AlertCircle,
  AlertTriangle,
  Columns3,
  Rows3,
  Copy,
  Check,
  X,
  Database,
  Hash,
} from 'lucide-react'
import { ConnectorTechLogo } from '../../../../components/ConnectorTechLogo'
import { ConfirmDeleteModal } from '../../../../components/ConfirmDeleteModal'
import { CustomSelect } from '../../../../components/CustomSelect'
import { ApiError } from '../../../../lib/authApi'
import { systemsApi, type SystemItem } from '../../../../lib/api/systemsApi'

export const Route = createFileRoute('/(platfrom)/connectors/$systemId/')({
  component: ConnectorInspectorPage,
})

const TABLE_PAGE_SIZES = [
  { value: '25', label: '25 / pg' },
  { value: '50', label: '50 / pg' },
  { value: '100', label: '100 / pg' },
  { value: '250', label: '250 / pg' },
]

const ROW_PAGE_SIZES = [
  { value: '25', label: '25 rows' },
  { value: '50', label: '50 rows' },
  { value: '100', label: '100 rows' },
  { value: '250', label: '250 rows' },
]

function formatCompactCount(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 10_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString()
}

function ConnectorInspectorPage() {
  const { systemId } = Route.useParams()
  const navigate = useNavigate()

  // Connector metadata
  const [system, setSystem] = useState<SystemItem | null>(null)
  const [loadingSystem, setLoadingSystem] = useState(true)
  const [systemError, setSystemError] = useState<string | null>(null)

  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Server-side paginated tables state
  const [tableQuery, setTableQuery] = useState('')
  const [debouncedTableQuery, setDebouncedTableQuery] = useState('')
  const [tableOffset, setTableOffset] = useState(0)
  const [tableLimit, setTableLimit] = useState(50)
  const [tablePageInput, setTablePageInput] = useState('1')
  const [tables, setTables] = useState<
    { name: string; row_count: number; column_count: number }[]
  >([])
  const [totalTables, setTotalTables] = useState(0)
  const [loadingTables, setLoadingTables] = useState(true)
  const [tablesError, setTablesError] = useState<string | null>(null)

  // Active selected table + tabs
  const [selectedTable, setSelectedTable] = useState<string>('')
  const selectedTableRef = useRef<string>('')
  selectedTableRef.current = selectedTable

  const [activeTab, setActiveTab] = useState<'records' | 'schema'>('records')

  // Schema & paginated records state
  const [columns, setColumns] = useState<
    { name: string; datatype: string; is_pk: boolean }[]
  >([])
  const [rows, setRows] = useState<Record<string, unknown>[]>([])
  const [rowOffset, setRowOffset] = useState(0)
  const [rowLimit, setRowLimit] = useState(50)
  const [rowPageInput, setRowPageInput] = useState('1')
  const [rowTotal, setRowTotal] = useState<number | null>(null)
  const [hasMoreRows, setHasMoreRows] = useState(false)
  const [rowWarning, setRowWarning] = useState<string | null>(null)
  const [loadingData, setLoadingData] = useState(false)
  const [dataError, setDataError] = useState<string | null>(null)
  const [columnFilter, setColumnFilter] = useState('')

  // Row JSON inspector & copy state
  const [inspectedRow, setInspectedRow] = useState<Record<string, unknown> | null>(
    null
  )
  const [copiedId, setCopiedId] = useState(false)
  const [copiedJson, setCopiedJson] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedTableQuery(tableQuery)
      setTableOffset(0)
    }, 250)
    return () => clearTimeout(timer)
  }, [tableQuery])

  useEffect(() => {
    setTablePageInput(String(Math.floor(tableOffset / tableLimit) + 1))
  }, [tableOffset, tableLimit])

  useEffect(() => {
    setRowPageInput(String(Math.floor(rowOffset / rowLimit) + 1))
  }, [rowOffset, rowLimit])

  useEffect(() => {
    setLoadingSystem(true)
    setSystemError(null)
    systemsApi
      .get(systemId)
      .then((sys) => setSystem(sys))
      .catch((err) => {
        setSystemError(
          err instanceof ApiError ? err.message : 'Connector not found.'
        )
      })
      .finally(() => setLoadingSystem(false))
  }, [systemId])

  const fetchTables = useCallback(async () => {
    setLoadingTables(true)
    setTablesError(null)
    try {
      const res = await systemsApi.listTables(
        systemId,
        debouncedTableQuery,
        tableOffset,
        tableLimit
      )
      const list = res.tables || []
      setTables(list)
      setTotalTables(res.total ?? list.length)

      if (list.length > 0 && !selectedTableRef.current) {
        setSelectedTable(list[0].name)
      }
    } catch (err) {
      setTables([])
      setTotalTables(0)
      setTablesError(
        err instanceof ApiError
          ? err.message
          : 'Failed to discover tables from endpoint.'
      )
    } finally {
      setLoadingTables(false)
    }
  }, [systemId, debouncedTableQuery, tableOffset, tableLimit])

  useEffect(() => {
    fetchTables()
  }, [fetchTables])

  const fetchTableDetails = useCallback(async () => {
    if (!selectedTable) return
    setLoadingData(true)
    setDataError(null)
    setRowWarning(null)
    try {
      const [schemaRes, previewRes] = await Promise.all([
        systemsApi.getTableSchema(systemId, selectedTable),
        systemsApi.previewTableRows(systemId, selectedTable, rowOffset, rowLimit),
      ])
      setColumns(schemaRes.columns || [])
      setRows(previewRes.rows || [])
      setRowWarning(previewRes.warning || null)
      setRowTotal(
        previewRes.total !== null && previewRes.total !== undefined
          ? previewRes.total
          : schemaRes.row_count ?? null
      )
      setHasMoreRows(Boolean(previewRes.has_more))
    } catch (err) {
      setDataError(
        err instanceof ApiError
          ? err.message
          : `Failed to inspect "${selectedTable}". Verify endpoint permissions and table availability.`
      )
      setColumns([])
      setRows([])
    } finally {
      setLoadingData(false)
    }
  }, [systemId, selectedTable, rowOffset, rowLimit])

  useEffect(() => {
    fetchTableDetails()
  }, [fetchTableDetails])

  const handleSelectTable = (tableName: string) => {
    if (tableName === selectedTable) return
    setSelectedTable(tableName)
    setRowOffset(0)
    setColumnFilter('')
    setInspectedRow(null)
  }

  const handleCopySystemId = () => {
    if (!system) return
    navigator.clipboard.writeText(system.system_id)
    setCopiedId(true)
    setTimeout(() => setCopiedId(false), 1800)
  }

  const handleCopyJson = () => {
    if (!inspectedRow) return
    navigator.clipboard.writeText(JSON.stringify(inspectedRow, null, 2))
    setCopiedJson(true)
    setTimeout(() => setCopiedJson(false), 1800)
  }

  const confirmDelete = async () => {
    if (!system) return
    setDeleting(true)
    try {
      await systemsApi.delete(system.system_id)
      navigate({ to: '/connectors' })
    } finally {
      setDeleting(false)
    }
  }

  if (loadingSystem) {
    return (
      <div className="space-y-3">
        <div className="h-14 animate-pulse rounded-xl border border-[#E2E8F0] bg-white" />
        <div className="grid gap-3.5 lg:grid-cols-12">
          <div className="lg:col-span-3 h-[540px] animate-pulse rounded-xl border border-[#E2E8F0] bg-white" />
          <div className="lg:col-span-9 h-[540px] animate-pulse rounded-xl border border-[#E2E8F0] bg-white" />
        </div>
      </div>
    )
  }

  if (systemError || !system) {
    return (
      <div className="rounded-xl border border-[#E2E8F0] bg-white p-10 text-center">
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full border border-rose-200 bg-rose-50">
          <AlertCircle className="h-5 w-5 text-rose-600" />
        </div>
        <p className="mt-3 text-[15px] font-semibold text-[#0F172A]">
          {systemError || 'Connector not found'}
        </p>
        <Link
          to="/connectors"
          className="mt-4 inline-flex h-8 items-center rounded-lg bg-[#39359D] px-4 text-[12.5px] font-medium text-white hover:bg-[#2E2A85]"
        >
          Back to Connectors
        </Link>
      </div>
    )
  }

  const visibleConfig = Object.entries(system.config_summary || {}).filter(
    ([k]) => !k.startsWith('_') && k !== 'endpoint_id'
  )

  const tableCurrentPage = Math.floor(tableOffset / tableLimit) + 1
  const tableTotalPages = Math.max(1, Math.ceil(totalTables / tableLimit))
  const canTablePrev = tableOffset > 0
  const canTableNext = tableOffset + tableLimit < totalTables

  const commitTablePageJump = () => {
    const parsed = parseInt(tablePageInput, 10)
    if (Number.isNaN(parsed)) {
      setTablePageInput(String(tableCurrentPage))
      return
    }
    const clamped = Math.min(Math.max(1, parsed), tableTotalPages)
    setTableOffset((clamped - 1) * tableLimit)
  }

  const rowCurrentPage = Math.floor(rowOffset / rowLimit) + 1
  const rowTotalPages =
    rowTotal !== null ? Math.max(1, Math.ceil(rowTotal / rowLimit)) : null
  const canRowPrev = rowOffset > 0
  const canRowNext =
    hasMoreRows || (rowTotal !== null && rowOffset + rowLimit < rowTotal)

  const commitRowPageJump = () => {
    const parsed = parseInt(rowPageInput, 10)
    if (Number.isNaN(parsed)) {
      setRowPageInput(String(rowCurrentPage))
      return
    }
    const maxPage = rowTotalPages ?? Math.max(1, parsed)
    const clamped = Math.min(Math.max(1, parsed), maxPage)
    setRowOffset((clamped - 1) * rowLimit)
  }

  const allRecordKeys =
    rows.length > 0 ? Object.keys(rows[0]) : columns.map((c) => c.name)

  const filteredRecordKeys = columnFilter.trim()
    ? allRecordKeys.filter((k) =>
        k.toLowerCase().includes(columnFilter.toLowerCase())
      )
    : allRecordKeys

  const filteredSchemaColumns = columnFilter.trim()
    ? columns.filter((c) =>
        c.name.toLowerCase().includes(columnFilter.toLowerCase())
      )
    : columns

  return (
    <div className="space-y-3.5">
      {/* Ultra-Compact Single-Row Metadata & Action Strip */}
      <div className="flex flex-col gap-2.5 rounded-xl border border-[#E2E8F0] bg-white px-4 py-2.5 shadow-[0_1px_2px_rgba(15,23,42,0.02)] xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap items-center gap-2.5 min-w-0">
          <Link
            to="/connectors"
            title="Back to Connectors"
            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-[#E2E8F0] bg-white text-[#475569] transition-colors hover:border-[#39359D] hover:text-[#39359D]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
          </Link>

          <ConnectorTechLogo connectorType={system.connector_type} size="sm" />

          <h1 className="truncate text-[15px] font-semibold tracking-[-0.015em] text-[#0F172A]">
            {system.name}
          </h1>

          <span
            className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
              system.kind === 'TARGET'
                ? 'border-[#39359D]/25 bg-[#39359D]/[0.06] text-[#39359D]'
                : 'border-emerald-200 bg-emerald-50 text-emerald-700'
            }`}
          >
            {system.kind}
          </span>

          <span className="rounded border border-[#E2E8F0] bg-[#FAFAFA] px-1.5 py-0.5 font-mono text-[10.5px] uppercase text-[#475569]">
            {system.connector_type}
          </span>

          <span className="hidden sm:inline text-[#CBD5E1]">|</span>

          <span className="inline-flex items-center gap-1.5 text-[11.5px] text-[#64748B]">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            {system.environment}
          </span>

          <button
            type="button"
            onClick={handleCopySystemId}
            title="Copy Connector ID"
            className="inline-flex cursor-pointer items-center gap-1 rounded px-1.5 py-0.5 font-mono text-[11px] text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#0F172A]"
          >
            {system.system_id}
            {copiedId ? (
              <Check className="h-3 w-3 text-emerald-600" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
          </button>

          {visibleConfig.slice(0, 2).map(([k, v]) => (
            <span
              key={k}
              className="hidden 2xl:inline-flex items-center gap-1 rounded border border-[#E2E8F0] bg-[#FAFAFA] px-1.5 py-0.5 font-mono text-[10.5px] text-[#475569]"
            >
              <span className="text-[#94A3B8]">{k}:</span>
              <span className="max-w-[160px] truncate">{String(v)}</span>
            </span>
          ))}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => {
              fetchTables()
              fetchTableDetails()
            }}
            className="inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-md border border-[#E2E8F0] bg-white px-2.5 text-[12px] font-medium text-[#334155] transition-colors hover:bg-[#F8FAFC]"
          >
            <RefreshCw
              className={`h-3 w-3 ${
                loadingTables || loadingData ? 'animate-spin text-[#39359D]' : ''
              }`}
            />
            Sync
          </button>

          <Link
            to="/connectors/$systemId/edit"
            params={{ systemId: system.system_id }}
            className="inline-flex h-7 items-center gap-1.5 rounded-md border border-[#E2E8F0] bg-white px-2.5 text-[12px] font-medium text-[#0F172A] transition-colors hover:border-[#39359D] hover:text-[#39359D]"
          >
            <Pencil className="h-3 w-3" />
            Configure
          </Link>

          <button
            type="button"
            onClick={() => setShowDeleteModal(true)}
            className="inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-md border border-[#E2E8F0] bg-white px-2.5 text-[12px] font-medium text-rose-600 transition-colors hover:border-rose-200 hover:bg-rose-50"
          >
            <Trash2 className="h-3 w-3" />
            Delete
          </button>
        </div>
      </div>

      {/* Main Split Inspector Workspace */}
      <div className="grid gap-3.5 lg:grid-cols-12 items-start">
        {/* LEFT PANE: Server-Paginated Table Catalog */}
        <aside className="lg:col-span-4 xl:col-span-3 flex flex-col rounded-xl border border-[#E2E8F0] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.02)] overflow-hidden">
          <div className="border-b border-[#E2E8F0] p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#0F172A]">
                <Database className="h-3.5 w-3.5 text-[#39359D]" />
                Datasets
              </span>
              <span
                title={`${totalTables.toLocaleString()} total tables`}
                className="rounded border border-[#39359D]/20 bg-[#39359D]/[0.06] px-1.5 py-0.5 font-mono text-[10.5px] font-semibold text-[#39359D]"
              >
                {formatCompactCount(totalTables)}
              </span>
            </div>

            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#94A3B8]" />
              <input
                type="text"
                value={tableQuery}
                onChange={(e) => setTableQuery(e.target.value)}
                placeholder="Filter tables..."
                className="h-8 w-full rounded-lg border border-[#E2E8F0] bg-[#FAFAFA] pl-8 pr-7 text-[12px] text-[#0F172A] placeholder:text-[#94A3B8] outline-none transition-colors focus:border-[#39359D] focus:bg-white"
              />
              {tableQuery && (
                <button
                  type="button"
                  onClick={() => setTableQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer text-[#94A3B8] hover:text-[#0F172A]"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center justify-between gap-2 text-[11px] text-[#64748B]">
              <div className="flex items-center gap-1 font-mono">
                <span>Pg</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={tablePageInput}
                  onChange={(e) => setTablePageInput(e.target.value)}
                  onBlur={commitTablePageJump}
                  onKeyDown={(e) => e.key === 'Enter' && commitTablePageJump()}
                  aria-label="Table catalog page number"
                  className="h-6 w-11 rounded border border-[#E2E8F0] bg-[#FAFAFA] px-1 text-center font-mono text-[11px] text-[#0F172A] outline-none focus:border-[#39359D] focus:bg-white"
                />
                <span>/ {tableTotalPages.toLocaleString()}</span>
              </div>
              <div className="w-24">
                <CustomSelect
                  value={String(tableLimit)}
                  onChange={(v) => {
                    setTableLimit(Number(v))
                    setTableOffset(0)
                  }}
                  options={TABLE_PAGE_SIZES}
                />
              </div>
            </div>
          </div>

          <div className="max-h-[540px] overflow-y-auto divide-y divide-[#F8FAFC] p-1.5">
            {loadingTables ? (
              <div className="space-y-1.5 p-1.5 animate-pulse">
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <div
                    key={n}
                    className="flex items-center justify-between rounded-lg px-2.5 py-2"
                  >
                    <div className="h-3.5 w-32 rounded bg-[#F1F5F9]" />
                    <div className="h-3.5 w-8 rounded bg-[#F8FAFC]" />
                  </div>
                ))}
              </div>
            ) : tablesError ? (
              <div className="m-1.5 rounded-lg border border-rose-200 bg-rose-50/80 p-3 text-[12px] text-rose-700 space-y-2">
                <p className="font-medium leading-snug">{tablesError}</p>
                <button
                  type="button"
                  onClick={fetchTables}
                  className="inline-flex h-7 cursor-pointer items-center rounded-md bg-rose-600 px-2.5 text-[11px] font-medium text-white hover:bg-rose-700"
                >
                  Retry Discovery
                </button>
              </div>
            ) : tables.length === 0 ? (
              <div className="px-4 py-10 text-center text-[12px] text-[#64748B]">
                {debouncedTableQuery
                  ? `No tables matching "${debouncedTableQuery}"`
                  : 'No tables discovered on this endpoint.'}
              </div>
            ) : (
              tables.map((t) => {
                const active = selectedTable === t.name
                return (
                  <button
                    key={t.name}
                    type="button"
                    onClick={() => handleSelectTable(t.name)}
                    className={`group flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left transition-colors ${
                      active
                        ? 'bg-[#39359D] text-white shadow-2xs'
                        : 'text-[#1E293B] hover:bg-[#F8FAFC]'
                    }`}
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <Table2
                        className={`h-3.5 w-3.5 shrink-0 ${
                          active
                            ? 'text-white'
                            : 'text-[#94A3B8] group-hover:text-[#39359D]'
                        }`}
                      />
                      <span className="truncate font-mono text-[12px] font-medium">
                        {t.name}
                      </span>
                    </span>
                    <span
                      title={`${t.row_count.toLocaleString()} rows`}
                      className={`shrink-0 rounded px-1.5 py-0.5 font-mono text-[10px] ${
                        active
                          ? 'bg-white/15 text-white'
                          : 'bg-[#F1F5F9] text-[#64748B]'
                      }`}
                    >
                      {formatCompactCount(t.row_count)}
                    </span>
                  </button>
                )
              })
            )}
          </div>

          <div className="flex items-center justify-between border-t border-[#E2E8F0] bg-[#FAFAFA] px-3 py-2">
            <span className="font-mono text-[10.5px] text-[#64748B]">
              {totalTables === 0
                ? '0 datasets'
                : `${(tableOffset + 1).toLocaleString()}–${Math.min(
                    tableOffset + tables.length,
                    totalTables
                  ).toLocaleString()} of ${formatCompactCount(totalTables)}`}
            </span>

            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={!canTablePrev}
                onClick={() => setTableOffset(0)}
                title="First page"
                className="inline-flex h-6 w-6 cursor-pointer items-center justify-center rounded border border-[#E2E8F0] bg-white text-[#334155] hover:bg-[#F1F5F9] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronsLeft className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                disabled={!canTablePrev}
                onClick={() =>
                  setTableOffset((prev) => Math.max(0, prev - tableLimit))
                }
                title="Previous page"
                className="inline-flex h-6 w-6 cursor-pointer items-center justify-center rounded border border-[#E2E8F0] bg-white text-[#334155] hover:bg-[#F1F5F9] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                disabled={!canTableNext}
                onClick={() => setTableOffset((prev) => prev + tableLimit)}
                title="Next page"
                className="inline-flex h-6 w-6 cursor-pointer items-center justify-center rounded border border-[#E2E8F0] bg-white text-[#334155] hover:bg-[#F1F5F9] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                disabled={!canTableNext}
                onClick={() =>
                  setTableOffset(
                    Math.max(0, (tableTotalPages - 1) * tableLimit)
                  )
                }
                title="Last page"
                className="inline-flex h-6 w-6 cursor-pointer items-center justify-center rounded border border-[#E2E8F0] bg-white text-[#334155] hover:bg-[#F1F5F9] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronsRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </aside>

        {/* RIGHT PANE: Paginated Live Data Grid & Schema Definition */}
        <section className="lg:col-span-8 xl:col-span-9 min-w-0 rounded-xl border border-[#E2E8F0] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.02)] overflow-hidden">
          {!selectedTable ? (
            <div className="flex h-[540px] flex-col items-center justify-center p-8 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#E2E8F0] bg-[#FAFAFA]">
                <Table2 className="h-5 w-5 text-[#94A3B8]" />
              </div>
              <p className="mt-3 text-[14px] font-semibold text-[#0F172A]">
                Select a dataset to inspect
              </p>
              <p className="mt-1 max-w-sm text-[12.5px] text-[#64748B]">
                Choose any table or collection from the left sidebar to browse paginated records and physical column types.
              </p>
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-2.5 border-b border-[#E2E8F0] px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-wrap items-center gap-3 min-w-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[#39359D]/10 text-[#39359D]">
                      <Hash className="h-3.5 w-3.5" />
                    </span>
                    <h2 className="truncate font-mono text-[14px] font-semibold text-[#0F172A]">
                      {selectedTable}
                    </h2>
                  </div>

                  <div className="inline-flex rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-0.5">
                    <button
                      type="button"
                      onClick={() => setActiveTab('records')}
                      className={`inline-flex cursor-pointer items-center gap-1.5 rounded-md px-2.5 py-1 text-[11.5px] transition-all ${
                        activeTab === 'records'
                          ? 'bg-white font-semibold text-[#0F172A] shadow-2xs ring-1 ring-black/5'
                          : 'font-medium text-[#64748B] hover:text-[#0F172A]'
                      }`}
                    >
                      <Rows3 className="h-3.5 w-3.5 text-[#39359D]" />
                      Records
                      {rowTotal !== null && (
                        <span className="font-mono text-[10.5px] text-[#64748B]">
                          {formatCompactCount(rowTotal)}
                        </span>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTab('schema')}
                      className={`inline-flex cursor-pointer items-center gap-1.5 rounded-md px-2.5 py-1 text-[11.5px] transition-all ${
                        activeTab === 'schema'
                          ? 'bg-white font-semibold text-[#0F172A] shadow-2xs ring-1 ring-black/5'
                          : 'font-medium text-[#64748B] hover:text-[#0F172A]'
                      }`}
                    >
                      <Columns3 className="h-3.5 w-3.5 text-[#39359D]" />
                      Schema
                      <span className="font-mono text-[10.5px] text-[#64748B]">
                        {columns.length}
                      </span>
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative w-44">
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#94A3B8]" />
                    <input
                      type="text"
                      value={columnFilter}
                      onChange={(e) => setColumnFilter(e.target.value)}
                      placeholder="Filter columns..."
                      className="h-8 w-full rounded-lg border border-[#E2E8F0] bg-[#FAFAFA] pl-8 pr-6 text-[12px] text-[#0F172A] placeholder:text-[#94A3B8] outline-none focus:border-[#39359D] focus:bg-white"
                    />
                    {columnFilter && (
                      <button
                        type="button"
                        onClick={() => setColumnFilter('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer text-[#94A3B8] hover:text-[#0F172A]"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>

                  {activeTab === 'records' && (
                    <div className="w-28">
                      <CustomSelect
                        value={String(rowLimit)}
                        onChange={(v) => {
                          setRowLimit(Number(v))
                          setRowOffset(0)
                        }}
                        options={ROW_PAGE_SIZES}
                      />
                    </div>
                  )}
                </div>
              </div>

              {loadingData ? (
                <div className="flex h-[480px] flex-col items-center justify-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin text-[#39359D]" />
                  <span className="font-mono text-[11.5px] text-[#64748B]">
                    Fetching slice [{rowOffset.toLocaleString()}..
                    {(rowOffset + rowLimit).toLocaleString()}]
                  </span>
                </div>
              ) : dataError ? (
                <div className="flex h-[480px] flex-col items-center justify-center p-8 text-center space-y-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full border border-rose-200 bg-rose-50">
                    <AlertCircle className="h-4 w-4 text-rose-600" />
                  </div>
                  <p className="max-w-md text-[13px] font-medium text-rose-700">
                    {dataError}
                  </p>
                  <button
                    type="button"
                    onClick={fetchTableDetails}
                    className="cursor-pointer rounded-lg bg-[#39359D] px-4 py-1.5 text-[12px] font-medium text-white hover:bg-[#2E2A85]"
                  >
                    Retry Query
                  </button>
                </div>
              ) : activeTab === 'schema' ? (
                <div className="max-h-[540px] overflow-auto">
                  <table className="w-full border-collapse text-left text-[12.5px]">
                    <thead className="sticky top-0 z-10 bg-[#FAFAFA] shadow-[0_1px_0_#E2E8F0]">
                      <tr className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                        <th className="w-14 px-4 py-2.5">#</th>
                        <th className="px-4 py-2.5">Column</th>
                        <th className="px-4 py-2.5">Data Type</th>
                        <th className="px-4 py-2.5">Constraint</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F1F5F9]">
                      {filteredSchemaColumns.map((col, idx) => (
                        <tr
                          key={col.name}
                          className="transition-colors hover:bg-[#FAFAFA]"
                        >
                          <td className="px-4 py-2 font-mono text-[11px] text-[#94A3B8]">
                            {idx + 1}
                          </td>
                          <td className="px-4 py-2 font-mono text-[12px] font-medium text-[#0F172A]">
                            {col.name}
                          </td>
                          <td className="px-4 py-2">
                            <span className="rounded border border-[#E2E8F0] bg-[#F8FAFC] px-2 py-0.5 font-mono text-[11px] text-[#334155]">
                              {col.datatype}
                            </span>
                          </td>
                          <td className="px-4 py-2">
                            {col.is_pk ? (
                              <span className="inline-flex items-center gap-1 rounded border border-amber-200 bg-amber-50/90 px-2 py-0.5 font-mono text-[10.5px] font-semibold text-amber-700">
                                <KeyRound className="h-3 w-3" />
                                PK
                              </span>
                            ) : (
                              <span className="text-[12px] text-[#CBD5E1]">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <>
                  {rows.length === 0 ? (
                    rowWarning ? (
                      <div className="m-6 rounded-xl border border-amber-200 bg-amber-50/90 p-5 text-amber-900 shadow-sm space-y-3">
                        <div className="flex items-start gap-3">
                          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                          <div className="space-y-1">
                            <h4 className="text-[13.5px] font-semibold text-amber-900">
                              Row Level Security (RLS) Notice
                            </h4>
                            <p className="text-[12.5px] leading-relaxed text-amber-800">
                              {rowWarning}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 pt-1 pl-8">
                          <Link
                            to="/connectors/$systemId/edit"
                            params={{ systemId }}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-[12px] font-medium text-white shadow-sm hover:bg-amber-700 transition"
                          >
                            <KeyRound className="h-3.5 w-3.5" />
                            Update to service_role Key
                          </Link>
                        </div>
                      </div>
                    ) : (
                      <div className="flex h-[480px] items-center justify-center p-8 text-center text-[13px] text-[#64748B]">
                        No records returned in this offset range.
                      </div>
                    )
                  ) : (
                    <div className="max-h-[540px] overflow-auto">
                      <table className="w-full border-collapse text-left text-[12px]">
                        <thead className="sticky top-0 z-10 bg-[#FAFAFA] shadow-[0_1px_0_#E2E8F0]">
                          <tr>
                            <th className="w-12 border-r border-[#F1F5F9] px-3 py-2 font-mono text-[10.5px] font-medium text-[#94A3B8]">
                              #
                            </th>
                            {filteredRecordKeys.map((key) => {
                              const colMeta = columns.find((c) => c.name === key)
                              return (
                                <th
                                  key={key}
                                  className="whitespace-nowrap border-r border-[#F1F5F9] px-3.5 py-2 last:border-r-0"
                                >
                                  <div className="flex items-center gap-1.5 font-mono text-[11.5px] font-semibold text-[#0F172A]">
                                    {colMeta?.is_pk && (
                                      <KeyRound className="h-3 w-3 shrink-0 text-amber-600" />
                                    )}
                                    <span>{key}</span>
                                  </div>
                                  {colMeta?.datatype && (
                                    <div className="font-mono text-[10px] font-normal text-[#94A3B8]">
                                      {colMeta.datatype}
                                    </div>
                                  )}
                                </th>
                              )
                            })}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#F1F5F9]">
                          {rows.map((row, idx) => (
                            <tr
                              key={idx}
                              onClick={() => setInspectedRow(row)}
                              title="Click row to inspect JSON document"
                              className="cursor-pointer transition-colors hover:bg-[#39359D]/[0.035]"
                            >
                              <td className="border-r border-[#F1F5F9] px-3 py-1.5 font-mono text-[11px] text-[#94A3B8]">
                                {(rowOffset + idx + 1).toLocaleString()}
                              </td>
                              {filteredRecordKeys.map((key) => {
                                const val = row[key]
                                const isNull = val === null || val === undefined
                                const isBool = typeof val === 'boolean'
                                const isNum = typeof val === 'number'
                                const display = isNull
                                  ? 'null'
                                  : typeof val === 'object'
                                    ? JSON.stringify(val)
                                    : String(val)
                                return (
                                  <td
                                    key={key}
                                    className={`max-w-[260px] truncate whitespace-nowrap border-r border-[#F8FAFC] px-3.5 py-1.5 font-mono text-[12px] last:border-r-0 ${
                                      isNull
                                        ? 'italic text-[#94A3B8]'
                                        : isBool
                                          ? 'text-[#39359D]'
                                          : isNum
                                            ? 'text-emerald-700'
                                            : 'text-[#0F172A]'
                                    }`}
                                  >
                                    {display}
                                  </td>
                                )
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#E2E8F0] bg-[#FAFAFA] px-4 py-2">
                    <div className="flex flex-wrap items-center gap-3 font-mono text-[11px] text-[#64748B]">
                      {rows.length === 0 ? (
                        <span>0 records</span>
                      ) : (
                        <span>
                          <strong className="font-semibold text-[#0F172A]">
                            {(rowOffset + 1).toLocaleString()}
                          </strong>
                          –
                          <strong className="font-semibold text-[#0F172A]">
                            {(rowOffset + rows.length).toLocaleString()}
                          </strong>
                          {rowTotal !== null && (
                            <>
                              {' '}
                              of{' '}
                              <strong className="font-semibold text-[#0F172A]">
                                {rowTotal.toLocaleString()}
                              </strong>
                            </>
                          )}
                        </span>
                      )}

                      <div className="flex items-center gap-1.5 border-l border-[#E2E8F0] pl-3">
                        <span>Page</span>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={rowPageInput}
                          onChange={(e) => setRowPageInput(e.target.value)}
                          onBlur={commitRowPageJump}
                          onKeyDown={(e) =>
                            e.key === 'Enter' && commitRowPageJump()
                          }
                          aria-label="Records page number"
                          className="h-6 w-16 rounded border border-[#E2E8F0] bg-white px-1.5 text-center font-mono text-[11px] text-[#0F172A] outline-none focus:border-[#39359D]"
                        />
                        {rowTotalPages !== null && (
                          <span>of {rowTotalPages.toLocaleString()}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={!canRowPrev}
                        onClick={() => setRowOffset(0)}
                        title="First page"
                        className="inline-flex h-7 cursor-pointer items-center rounded-md border border-[#E2E8F0] bg-white px-2 text-[#334155] hover:bg-[#F1F5F9] disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <ChevronsLeft className="h-3.5 w-3.5" />
                      </button>

                      <button
                        type="button"
                        disabled={!canRowPrev}
                        onClick={() =>
                          setRowOffset((prev) => Math.max(0, prev - rowLimit))
                        }
                        className="inline-flex h-7 cursor-pointer items-center gap-1 rounded-md border border-[#E2E8F0] bg-white px-2.5 text-[11.5px] font-medium text-[#334155] hover:bg-[#F1F5F9] disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <ChevronLeft className="h-3.5 w-3.5" />
                        Prev
                      </button>

                      <button
                        type="button"
                        disabled={!canRowNext}
                        onClick={() => setRowOffset((prev) => prev + rowLimit)}
                        className="inline-flex h-7 cursor-pointer items-center gap-1 rounded-md border border-[#E2E8F0] bg-white px-2.5 text-[11.5px] font-medium text-[#334155] hover:bg-[#F1F5F9] disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Next
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>

                      {rowTotalPages !== null && (
                        <button
                          type="button"
                          disabled={!canRowNext}
                          onClick={() =>
                            setRowOffset(
                              Math.max(0, (rowTotalPages - 1) * rowLimit)
                            )
                          }
                          title="Last page"
                          className="inline-flex h-7 cursor-pointer items-center rounded-md border border-[#E2E8F0] bg-white px-2 text-[#334155] hover:bg-[#F1F5F9] disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <ChevronsRight className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </section>
      </div>

      {/* JSON Document Inspector Modal */}
      {inspectedRow && (
        <div
          onClick={() => setInspectedRow(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-[1px]"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl rounded-xl border border-[#E2E8F0] bg-white shadow-2xl overflow-hidden"
          >
            <div className="flex items-center justify-between border-b border-[#E2E8F0] px-5 py-3">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#39359D]" />
                <span className="font-mono text-[13px] font-semibold text-[#0F172A]">
                  {selectedTable} · JSON Payload
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleCopyJson}
                  className="inline-flex h-7 cursor-pointer items-center gap-1 rounded-md border border-[#E2E8F0] bg-white px-2.5 text-[11.5px] font-medium text-[#334155] hover:bg-[#F8FAFC]"
                >
                  {copiedJson ? (
                    <>
                      <Check className="h-3 w-3 text-emerald-600" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" />
                      Copy JSON
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setInspectedRow(null)}
                  className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-[#64748B] hover:bg-[#F1F5F9]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <pre className="max-h-[65vh] overflow-auto bg-[#FAFAFA] p-5 font-mono text-[12px] leading-relaxed text-[#0F172A]">
              {JSON.stringify(inspectedRow, null, 2)}
            </pre>
          </div>
        </div>
      )}

      {/* Custom Delete Confirmation Popup */}
      <ConfirmDeleteModal
        open={showDeleteModal}
        title={`Delete "${system.name}"?`}
        description="This permanently removes the connector endpoint and its saved connection credentials. Active pipelines referencing this connector will fail."
        loading={deleting}
        onConfirm={confirmDelete}
        onClose={() => setShowDeleteModal(false)}
      />
    </div>
  )
}