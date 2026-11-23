import { useEffect, useState } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import {
  Loader2,
  ArrowLeft,
  Zap,
  CheckCircle2,
  XCircle,
  Table2,
  Eye,
  AlertTriangle,
} from 'lucide-react'
import { ConnectorTechLogo } from '../../../components/ConnectorTechLogo'
import { CustomSelect } from '../../../components/CustomSelect'
import { ApiError } from '../../../lib/authApi'
import {
  activeProjectStorage,
  projectsApi,
  type ProjectItem,
} from '../../../lib/api/projectsApi'
import {
  systemsApi,
  type PreConnectTestResponse,
} from '../../../lib/api/systemsApi'

export const Route = createFileRoute('/(platfrom)/connectors/new')({
  component: NewConnectorPage,
})

interface AdapterMeta {
  type: string
  name: string
  category: string
}

const ADAPTER_CATALOG: AdapterMeta[] = [
  { type: 'postgres', name: 'PostgreSQL', category: 'Relational' },
  { type: 'mysql', name: 'MySQL / MariaDB', category: 'Relational' },
  { type: 'supabase', name: 'Supabase', category: 'Cloud DB' },
  { type: 'mongodb', name: 'MongoDB Atlas', category: 'Document' },
  { type: 'fabric', name: 'Microsoft Fabric', category: 'Lakehouse' },
  { type: 'd365', name: 'Dynamics 365', category: 'CRM / ERP' },
  { type: 'rest_api', name: 'REST API', category: 'HTTP / JSON' },
  { type: 'relational', name: 'SQLite', category: 'Local SQL' },
  { type: 'sheet', name: 'CSV / Sheet', category: 'Tabular File' },
  { type: 'memory', name: 'In-Memory', category: 'Sandbox' },
]

function NewConnectorPage() {
  const navigate = useNavigate()

  const [projects, setProjects] = useState<ProjectItem[]>([])
  const [projectId, setProjectId] = useState('')
  const [name, setName] = useState('')
  const [kind, setKind] = useState('SOURCE')
  const [connectorType, setConnectorType] = useState('postgres')
  const [environment, setEnvironment] = useState('Production')
  const [classification, setClassification] = useState('CONFIDENTIAL')
  const [purpose, setPurpose] = useState('')

  // Dynamic Connection Fields
  const [configFields, setConfigFields] = useState<Record<string, string>>({
    host: '',
    port: '5432',
    database: '',
    username: '',
    password: '',
    sslmode: 'require',
  })

  // Ping & Discovery State
  const [testing, setTesting] = useState(false)
  const [pingResult, setPingResult] = useState<PreConnectTestResponse | null>(null)
  const [previewTable, setPreviewTable] = useState<string | null>(null)
  const [previewRows, setPreviewRows] = useState<Record<string, unknown>[]>([])
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [previewWarning, setPreviewWarning] = useState<string | null>(null)

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    projectsApi.list().then((list) => {
      setProjects(list)
      const stored = activeProjectStorage.get()
      if (stored && list.some((p) => p.project_id === stored)) {
        setProjectId(stored)
      } else if (list.length > 0) {
        setProjectId(list[0].project_id)
      }
    })
  }, [])

  const handleSelectAdapter = (nextType: string) => {
    setConnectorType(nextType)
    setPingResult(null)
    setPreviewTable(null)
    setPreviewRows([])

    if (nextType === 'postgres') {
      setConfigFields({
        host: '',
        port: '5432',
        database: '',
        username: '',
        password: '',
        sslmode: 'require',
      })
    } else if (nextType === 'mysql') {
      setConfigFields({
        host: '',
        port: '3306',
        database: '',
        username: '',
        password: '',
      })
    } else if (nextType === 'supabase') {
      setConfigFields({
        url: '',
        anon_key: '',
        db_url: '',
      })
    } else if (nextType === 'mongodb') {
      setConfigFields({
        uri: '',
        database: '',
      })
    } else if (nextType === 'fabric') {
      setConfigFields({
        tenant_id: '',
        client_id: '',
        client_secret: '',
        workspace_id: '',
        lakehouse_id: '',
      })
    } else if (nextType === 'd365') {
      setConfigFields({
        org_url: '',
        tenant_id: '',
        client_id: '',
        client_secret: '',
      })
    } else if (nextType === 'rest_api') {
      setConfigFields({
        base_url: '',
        bearer_token: '',
        endpoints: '',
      })
    } else if (nextType === 'relational') {
      setConfigFields({
        db_path: ':memory:',
      })
    } else {
      setConfigFields({})
    }
  }

  const buildCleanConfig = (): Record<string, unknown> => {
    const clean: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(configFields)) {
      if (v !== undefined && String(v).trim() !== '') {
        clean[k] = k === 'port' ? Number(v) || v : v.trim()
      }
    }
    return clean
  }

  const handleTestPing = async () => {
    setTesting(true)
    setError(null)
    setPingResult(null)
    setPreviewTable(null)
    setPreviewRows([])

    try {
      const res = await systemsApi.testPreConnect({
        connector_type: connectorType,
        connection_config: buildCleanConfig(),
      })
      setPingResult(res)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Pre-connect ping failed.')
    } finally {
      setTesting(false)
    }
  }

  const handlePreviewDiscoveredTable = async (tableName: string) => {
    setPreviewTable(tableName)
    setLoadingPreview(true)
    setPreviewWarning(null)
    try {
      const res = await systemsApi.previewPreConnectTable({
        connector_type: connectorType,
        connection_config: buildCleanConfig(),
        table_name: tableName,
        offset: 0,
        limit: 15,
      })
      setPreviewRows(res.rows || [])
      if (res.warning) {
        setPreviewWarning(res.warning)
      }
    } catch (err) {
      setPreviewRows([])
      setPreviewWarning(
        err instanceof Error ? err.message : 'Failed to preview table records'
      )
    } finally {
      setLoadingPreview(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (saving) return
    setSaving(true)
    setError(null)

    try {
      const created = await systemsApi.create({
        project_id: projectId || undefined,
        name: name.trim(),
        kind,
        connector_type: connectorType,
        adapter_type: connectorType,
        classification,
        purpose: purpose.trim() || undefined,
        environment,
        connection_config: buildCleanConfig(),
        initial_tables:
          pingResult?.status === 'SUCCESS'
            ? pingResult.discovered_tables.map((t) => ({
                name: t.name,
                columns: t.columns.map((c) => ({
                  name: c.name,
                  datatype: c.datatype,
                  is_pk: c.is_pk === 'True' || c.is_pk === 'true',
                })),
                sample_records: t.sample_records,
              }))
            : undefined,
      })

      navigate({
        to: '/connectors/$systemId',
        params: { systemId: created.system_id },
      })
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Failed to register connector.'
      )
    } finally {
      setSaving(false)
    }
  }

  const updateField = (key: string, value: string) => {
    setConfigFields((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <Link
          to="/connectors"
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#64748B] hover:text-[#0F172A]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Connectors
        </Link>
        <h1 className="mt-2 text-[24px] sm:text-[28px] font-semibold tracking-[-0.025em] text-[#0F172A]">
          New Connector
        </h1>
        <p className="mt-1 text-[14px] text-[#64748B]">
          Select an adapter, configure credentials, ping live tables, and save to your project.
        </p>
      </div>

      <form
        onSubmit={handleSave}
        className="divide-y divide-[#E2E8F0] rounded-xl border border-[#E2E8F0] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.03)]"
      >
        {error && (
          <div className="p-6 pb-0">
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-[13px] text-rose-700">
              {error}
            </div>
          </div>
        )}

        {/* Step 1: Visual Tech-Stack Selector */}
        <div className="space-y-4 p-6 sm:p-7">
          <div>
            <h2 className="text-[15px] font-semibold text-[#0F172A]">
              1. Select Data Platform Adapter
            </h2>
            <p className="text-[12.5px] text-[#64748B]">
              Choose from native relational, document, lakehouse, and API connectors.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
            {ADAPTER_CATALOG.map((item) => {
              const selected = connectorType === item.type
              return (
                <button
                  key={item.type}
                  type="button"
                  onClick={() => handleSelectAdapter(item.type)}
                  className={`flex cursor-pointer flex-col items-start rounded-xl border p-3 text-left transition-all ${
                    selected
                      ? 'border-[#39359D] bg-[#39359D]/[0.05] ring-1 ring-[#39359D]/20'
                      : 'border-[#E2E8F0] bg-white hover:border-[#CBD5E1] hover:bg-[#F8FAFC]'
                  }`}
                >
                  <ConnectorTechLogo connectorType={item.type} size="md" />
                  <div className="mt-2.5 text-[13px] font-semibold text-[#0F172A]">
                    {item.name}
                  </div>
                  <div className="text-[11px] text-[#64748B]">{item.category}</div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Step 2: Endpoint Identity & Project Scope */}
        <div className="space-y-4 p-6 sm:p-7">
          <div>
            <h2 className="text-[15px] font-semibold text-[#0F172A]">
              2. Endpoint Identity &amp; Role
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label
                htmlFor="conn-name"
                className="block text-[12.5px] font-medium text-[#334155]"
              >
                Connector Name <span className="text-rose-500">*</span>
              </label>
              <input
                id="conn-name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Production ERP Postgres"
                className="h-10 w-full rounded-lg border border-[#E2E8F0] bg-white px-3 text-[13.5px] text-[#0F172A] placeholder:text-[#94A3B8] outline-none focus:border-[#39359D] focus:ring-2 focus:ring-[#39359D]/12"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[12.5px] font-medium text-[#334155]">
                Target Project
              </label>
              <CustomSelect
                value={projectId}
                onChange={setProjectId}
                options={projects.map((p) => ({
                  value: p.project_id,
                  label: p.name,
                }))}
                placeholder="Auto-assign active project"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <label className="block text-[12.5px] font-medium text-[#334155]">
                System Role
              </label>
              <CustomSelect
                value={kind}
                onChange={setKind}
                options={[
                  { value: 'SOURCE', label: 'SOURCE (Read)' },
                  { value: 'TARGET', label: 'TARGET (Write)' },
                  { value: 'INTERMEDIATE', label: 'INTERMEDIATE (Staging)' },
                ]}
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[12.5px] font-medium text-[#334155]">
                Environment
              </label>
              <CustomSelect
                value={environment}
                onChange={setEnvironment}
                options={['Production', 'Staging', 'Development']}
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[12.5px] font-medium text-[#334155]">
                Classification
              </label>
              <CustomSelect
                value={classification}
                onChange={setClassification}
                options={['CONFIDENTIAL', 'RESTRICTED', 'INTERNAL', 'PUBLIC']}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-[12.5px] font-medium text-[#334155]">
              Purpose / Notes
            </label>
            <input
              type="text"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="e.g. Primary customer & order master system"
              className="h-10 w-full rounded-lg border border-[#E2E8F0] bg-white px-3 text-[13.5px] text-[#0F172A] placeholder:text-[#94A3B8] outline-none focus:border-[#39359D] focus:ring-2 focus:ring-[#39359D]/12"
            />
          </div>
        </div>

        {/* Step 3: Connection Parameters & Live Ping */}
        <div className="space-y-4 p-6 sm:p-7">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-[15px] font-semibold text-[#0F172A]">
                3. Connection Configuration &amp; Ping
              </h2>
              <p className="text-[12.5px] text-[#64748B]">
                Secrets are masked at rest (TA-008). Test connection to inspect live tables.
              </p>
            </div>

            <button
              type="button"
              disabled={testing}
              onClick={handleTestPing}
              className="inline-flex h-9 w-fit cursor-pointer items-center gap-1.5 rounded-lg border border-[#39359D] bg-white px-3.5 text-[12.5px] font-semibold text-[#39359D] transition-colors hover:bg-[#39359D]/[0.06] disabled:opacity-60"
            >
              {testing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Zap className="h-3.5 w-3.5" />
              )}
              {testing ? 'Pinging...' : 'Ping & Discover Tables'}
            </button>
          </div>

          {/* Dynamic Inputs per Adapter */}
          {(connectorType === 'postgres' || connectorType === 'mysql') && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="block text-[12.5px] font-medium text-[#334155]">
                  Host / Connection URI
                </label>
                <input
                  type="text"
                  value={configFields.host || ''}
                  onChange={(e) => updateField('host', e.target.value)}
                  placeholder="db.example.com or postgresql://..."
                  className="h-10 w-full rounded-lg border border-[#E2E8F0] bg-white px-3 text-[13.5px] outline-none focus:border-[#39359D]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-[12.5px] font-medium text-[#334155]">
                    Port
                  </label>
                  <input
                    type="text"
                    value={configFields.port || ''}
                    onChange={(e) => updateField('port', e.target.value)}
                    className="h-10 w-full rounded-lg border border-[#E2E8F0] bg-white px-3 text-[13.5px] outline-none focus:border-[#39359D]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[12.5px] font-medium text-[#334155]">
                    Database
                  </label>
                  <input
                    type="text"
                    value={configFields.database || ''}
                    onChange={(e) => updateField('database', e.target.value)}
                    placeholder="postgres"
                    className="h-10 w-full rounded-lg border border-[#E2E8F0] bg-white px-3 text-[13.5px] outline-none focus:border-[#39359D]"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="block text-[12.5px] font-medium text-[#334155]">
                  Username
                </label>
                <input
                  type="text"
                  value={configFields.username || ''}
                  onChange={(e) => updateField('username', e.target.value)}
                  placeholder="readonly_user"
                  className="h-10 w-full rounded-lg border border-[#E2E8F0] bg-white px-3 text-[13.5px] outline-none focus:border-[#39359D]"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[12.5px] font-medium text-[#334155]">
                  Password
                </label>
                <input
                  type="password"
                  value={configFields.password || ''}
                  onChange={(e) => updateField('password', e.target.value)}
                  placeholder="••••••••••••"
                  className="h-10 w-full rounded-lg border border-[#E2E8F0] bg-white px-3 text-[13.5px] outline-none focus:border-[#39359D]"
                />
              </div>
            </div>
          )}

          {connectorType === 'mongodb' && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="block text-[12.5px] font-medium text-[#334155]">
                  MongoDB Connection URI
                </label>
                <input
                  type="password"
                  value={configFields.uri || ''}
                  onChange={(e) => updateField('uri', e.target.value)}
                  placeholder="mongodb+srv://user:pass@cluster.mongodb.net"
                  className="h-10 w-full rounded-lg border border-[#E2E8F0] bg-white px-3 text-[13.5px] outline-none focus:border-[#39359D]"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[12.5px] font-medium text-[#334155]">
                  Database Name
                </label>
                <input
                  type="text"
                  value={configFields.database || ''}
                  onChange={(e) => updateField('database', e.target.value)}
                  placeholder="enterprise_db"
                  className="h-10 w-full rounded-lg border border-[#E2E8F0] bg-white px-3 text-[13.5px] outline-none focus:border-[#39359D]"
                />
              </div>
            </div>
          )}

          {connectorType === 'supabase' && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="block text-[12.5px] font-medium text-[#334155]">
                  Supabase Project URL
                </label>
                <input
                  type="text"
                  value={configFields.url || ''}
                  onChange={(e) => updateField('url', e.target.value)}
                  placeholder="https://xyzcompany.supabase.co"
                  className="h-10 w-full rounded-lg border border-[#E2E8F0] bg-white px-3 text-[13.5px] outline-none focus:border-[#39359D]"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[12.5px] font-medium text-[#334155]">
                  Supabase API Key (service_role recommended)
                </label>
                <input
                  type="password"
                  value={configFields.anon_key || ''}
                  onChange={(e) => updateField('anon_key', e.target.value)}
                  placeholder="eyJhbGciOiJIUzI1NiIs..."
                  className="h-10 w-full rounded-lg border border-[#E2E8F0] bg-white px-3 text-[13.5px] outline-none focus:border-[#39359D]"
                />
                <p className="text-[11px] text-[#64748B]">
                  Use the <strong>service_role</strong> secret (Supabase Dashboard &rarr; Project Settings &rarr; API) to read and migrate tables with Row Level Security (RLS). The anon key returns 0 records when RLS is active.
                </p>
              </div>
              <div className="sm:col-span-2 space-y-1.5">
                <label className="block text-[12.5px] font-medium text-[#334155]">
                  Direct Postgres Connection String (Optional)
                </label>
                <input
                  type="password"
                  value={configFields.db_url || ''}
                  onChange={(e) => updateField('db_url', e.target.value)}
                  placeholder="postgresql://postgres:password@db.xyz.supabase.co:5432/postgres"
                  className="h-10 w-full rounded-lg border border-[#E2E8F0] bg-white px-3 text-[13.5px] outline-none focus:border-[#39359D]"
                />
              </div>
            </div>
          )}

          {(connectorType === 'fabric' || connectorType === 'd365') && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="block text-[12.5px] font-medium text-[#334155]">
                  {connectorType === 'd365' ? 'Environment / Org URL' : 'Workspace ID'}
                </label>
                <input
                  type="text"
                  value={
                    connectorType === 'd365'
                      ? configFields.org_url || ''
                      : configFields.workspace_id || ''
                  }
                  onChange={(e) =>
                    updateField(
                      connectorType === 'd365' ? 'org_url' : 'workspace_id',
                      e.target.value
                    )
                  }
                  placeholder={
                    connectorType === 'd365'
                      ? 'https://org.crm.dynamics.com'
                      : '00000000-0000-0000-0000-000000000000'
                  }
                  className="h-10 w-full rounded-lg border border-[#E2E8F0] bg-white px-3 text-[13.5px] outline-none focus:border-[#39359D]"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[12.5px] font-medium text-[#334155]">
                  Azure Tenant ID
                </label>
                <input
                  type="text"
                  value={configFields.tenant_id || ''}
                  onChange={(e) => updateField('tenant_id', e.target.value)}
                  placeholder="tenant-guid"
                  className="h-10 w-full rounded-lg border border-[#E2E8F0] bg-white px-3 text-[13.5px] outline-none focus:border-[#39359D]"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[12.5px] font-medium text-[#334155]">
                  Client ID (App Registration)
                </label>
                <input
                  type="text"
                  value={configFields.client_id || ''}
                  onChange={(e) => updateField('client_id', e.target.value)}
                  className="h-10 w-full rounded-lg border border-[#E2E8F0] bg-white px-3 text-[13.5px] outline-none focus:border-[#39359D]"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[12.5px] font-medium text-[#334155]">
                  Client Secret
                </label>
                <input
                  type="password"
                  value={configFields.client_secret || ''}
                  onChange={(e) => updateField('client_secret', e.target.value)}
                  className="h-10 w-full rounded-lg border border-[#E2E8F0] bg-white px-3 text-[13.5px] outline-none focus:border-[#39359D]"
                />
              </div>
            </div>
          )}

          {connectorType === 'rest_api' && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="block text-[12.5px] font-medium text-[#334155]">
                  Base URL
                </label>
                <input
                  type="text"
                  value={configFields.base_url || ''}
                  onChange={(e) => updateField('base_url', e.target.value)}
                  placeholder="https://api.service.com/v1"
                  className="h-10 w-full rounded-lg border border-[#E2E8F0] bg-white px-3 text-[13.5px] outline-none focus:border-[#39359D]"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[12.5px] font-medium text-[#334155]">
                  Bearer Token
                </label>
                <input
                  type="password"
                  value={configFields.bearer_token || ''}
                  onChange={(e) => updateField('bearer_token', e.target.value)}
                  placeholder="sk_live_..."
                  className="h-10 w-full rounded-lg border border-[#E2E8F0] bg-white px-3 text-[13.5px] outline-none focus:border-[#39359D]"
                />
              </div>
            </div>
          )}

          {connectorType === 'relational' && (
            <div className="space-y-1.5">
              <label className="block text-[12.5px] font-medium text-[#334155]">
                SQLite Database Path
              </label>
              <input
                type="text"
                value={configFields.db_path || ''}
                onChange={(e) => updateField('db_path', e.target.value)}
                placeholder=":memory: or ./data/warehouse.db"
                className="h-10 w-full rounded-lg border border-[#E2E8F0] bg-white px-3 text-[13.5px] outline-none focus:border-[#39359D]"
              />
            </div>
          )}

          {(connectorType === 'memory' || connectorType === 'sheet') && (
            <div className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3 text-[13px] text-[#475569]">
              {connectorType === 'memory'
                ? 'In-Memory Sandbox requires no external credentials. Click "Ping & Discover Tables" to verify readiness.'
                : 'Spreadsheet connector initializes an interactive schema container ready for tabular uploads.'}
            </div>
          )}

          {/* Live Ping Result & Discovered Tables */}
          {pingResult && (
            <div
              className={`rounded-xl border p-4 space-y-3 ${
                pingResult.status === 'SUCCESS'
                  ? 'border-emerald-200 bg-emerald-50/60'
                  : 'border-rose-200 bg-rose-50/70'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {pingResult.status === 'SUCCESS' ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-rose-600" />
                  )}
                  <span
                    className={`text-[13px] font-semibold ${
                      pingResult.status === 'SUCCESS'
                        ? 'text-emerald-900'
                        : 'text-rose-900'
                    }`}
                  >
                    {pingResult.message}
                  </span>
                </div>
                <span className="font-mono text-[11.5px] text-[#64748B]">
                  {pingResult.latency_ms.toFixed(0)} ms ·{' '}
                  {pingResult.discovered_tables.length} tables
                </span>
              </div>

              {pingResult.warning && (
                <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-[12px] text-amber-900 space-y-1.5">
                  <div className="flex items-center gap-1.5 font-semibold">
                    <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                    <span>Database Permission Notice</span>
                  </div>
                  <p className="whitespace-pre-wrap text-[11.5px] leading-relaxed">
                    {pingResult.warning}
                  </p>
                </div>
              )}

              {pingResult.discovered_tables.length > 0 && (
                <div className="space-y-2 pt-1">
                  <div className="text-[11.5px] font-semibold uppercase tracking-wider text-[#475569]">
                    Discovered Tables
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {pingResult.discovered_tables.map((tbl) => (
                      <div
                        key={tbl.name}
                        className="flex items-center justify-between rounded-lg border border-[#E2E8F0] bg-white px-3 py-2"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Table2 className="h-3.5 w-3.5 shrink-0 text-[#39359D]" />
                          <span className="truncate font-mono text-[12.5px] font-medium text-[#0F172A]">
                            {tbl.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[11px] text-[#64748B]">
                            {tbl.row_count}r · {tbl.column_count}c
                          </span>
                          <button
                            type="button"
                            onClick={() => handlePreviewDiscoveredTable(tbl.name)}
                            className="inline-flex cursor-pointer items-center gap-1 rounded border border-[#E2E8F0] px-2 py-0.5 text-[11px] font-medium text-[#39359D] hover:bg-[#F8FAFC]"
                          >
                            <Eye className="h-3 w-3" />
                            Rows
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Inline Live Row Preview */}
              {previewTable && (
                <div className="rounded-lg border border-[#E2E8F0] bg-white p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[12px] font-semibold text-[#0F172A]">
                      Preview: {previewTable}
                    </span>
                    <button
                      type="button"
                      onClick={() => setPreviewTable(null)}
                      className="cursor-pointer text-[11.5px] text-[#64748B] hover:text-[#0F172A]"
                    >
                      Close
                    </button>
                  </div>

                  {loadingPreview ? (
                    <div className="py-4 text-center">
                      <Loader2 className="mx-auto h-4 w-4 animate-spin text-[#39359D]" />
                    </div>
                  ) : previewRows.length === 0 ? (
                    <div className="py-2 text-[12px] text-[#64748B]">
                      {previewWarning ? (
                        <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-left text-[12px] text-amber-900 space-y-1.5">
                          <div className="flex items-center gap-1.5 font-semibold">
                            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                            <span>Permission Notice</span>
                          </div>
                          <p className="whitespace-pre-wrap font-mono text-[11px] leading-relaxed">
                            {previewWarning}
                          </p>
                        </div>
                      ) : (
                        <div className="py-3 text-center">Table is empty (0 rows).</div>
                      )}
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-[12px]">
                        <thead>
                          <tr className="border-b border-[#E2E8F0] text-[#64748B]">
                            {Object.keys(previewRows[0]).map((col) => (
                              <th key={col} className="px-2 py-1.5 font-medium">
                                {col}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#F1F5F9]">
                          {previewRows.slice(0, 5).map((r, i) => (
                            <tr key={i}>
                              {Object.keys(previewRows[0]).map((col) => (
                                <td
                                  key={col}
                                  className="px-2 py-1.5 font-mono text-[11.5px] text-[#0F172A]"
                                >
                                  {String(r[col] ?? '')}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 bg-[#F8FAFC] px-6 py-4 rounded-b-xl">
          <Link
            to="/connectors"
            className="inline-flex h-9 items-center rounded-lg border border-[#E2E8F0] bg-white px-4 text-[13px] font-medium text-[#334155] hover:bg-[#F8FAFC]"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg bg-[#39359D] px-5 text-[13px] font-medium text-white shadow-xs transition-colors hover:bg-[#2E2A82] disabled:opacity-60"
          >
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {saving ? 'Saving...' : 'Register Connector'}
          </button>
        </div>
      </form>
    </div>
  )
}