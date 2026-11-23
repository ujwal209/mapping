import { useEffect, useState } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { Loader2, ArrowLeft, Zap, CheckCircle2, XCircle } from 'lucide-react'
import { ConnectorTechLogo } from '../../../../components/ConnectorTechLogo'
import { CustomSelect } from '../../../../components/CustomSelect'
import { ApiError } from '../../../../lib/authApi'
import {
  systemsApi,
  type PreConnectTestResponse,
} from '../../../../lib/api/systemsApi'

export const Route = createFileRoute('/(platfrom)/connectors/$systemId/edit')({
  component: EditConnectorPage,
})

const ADAPTER_OPTIONS = [
  { value: 'postgres', label: 'PostgreSQL' },
  { value: 'mysql', label: 'MySQL / MariaDB' },
  { value: 'supabase', label: 'Supabase' },
  { value: 'mongodb', label: 'MongoDB Atlas' },
  { value: 'fabric', label: 'Microsoft Fabric OneLake' },
  { value: 'd365', label: 'Dynamics 365' },
  { value: 'rest_api', label: 'REST API' },
  { value: 'relational', label: 'SQLite' },
  { value: 'sheet', label: 'Spreadsheet / Sheet' },
  { value: 'memory', label: 'In-Memory Sandbox' },
]

function EditConnectorPage() {
  const { systemId } = Route.useParams()
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [kind, setKind] = useState('SOURCE')
  const [connectorType, setConnectorType] = useState('postgres')
  const [environment, setEnvironment] = useState('Production')
  const [classification, setClassification] = useState('CONFIDENTIAL')
  const [purpose, setPurpose] = useState('')

  const [existingMasked, setExistingMasked] = useState<Record<string, unknown>>({})
  const [newHostOrUri, setNewHostOrUri] = useState('')
  const [newDatabase, setNewDatabase] = useState('')
  const [newUsername, setNewUsername] = useState('')
  const [newSecret, setNewSecret] = useState('')

  const [testing, setTesting] = useState(false)
  const [pingResult, setPingResult] = useState<PreConnectTestResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    systemsApi
      .get(systemId)
      .then((sys) => {
        setName(sys.name)
        setKind(sys.kind || 'SOURCE')
        setConnectorType(sys.connector_type || 'postgres')
        setEnvironment(sys.environment || 'Production')
        setClassification(sys.classification || 'CONFIDENTIAL')
        setPurpose(sys.purpose || '')
        setExistingMasked(sys.config_summary || {})
      })
      .catch(() => setError('Unable to load connector settings.'))
      .finally(() => setLoading(false))
  }, [systemId])

  const buildPatchConfig = (): Record<string, unknown> => {
    const patch: Record<string, unknown> = {}
    if (newHostOrUri.trim()) {
      if (connectorType === 'mongodb') patch.uri = newHostOrUri.trim()
      else if (connectorType === 'supabase') patch.url = newHostOrUri.trim()
      else if (connectorType === 'rest_api') patch.base_url = newHostOrUri.trim()
      else if (connectorType === 'd365') patch.org_url = newHostOrUri.trim()
      else patch.host = newHostOrUri.trim()
    }
    if (newDatabase.trim()) patch.database = newDatabase.trim()
    if (newUsername.trim()) patch.username = newUsername.trim()
    if (newSecret.trim()) {
      if (connectorType === 'supabase') {
        patch.anon_key = newSecret.trim()
        patch.supabase_key = newSecret.trim()
        patch.api_key = newSecret.trim()
        patch.service_role_key = newSecret.trim()
      }
      else if (connectorType === 'rest_api') patch.bearer_token = newSecret.trim()
      else if (connectorType === 'fabric' || connectorType === 'd365')
        patch.client_secret = newSecret.trim()
      else patch.password = newSecret.trim()
    }
    return patch
  }

  const handleTestPing = async () => {
    setTesting(true)
    setPingResult(null)
    try {
      const res = await systemsApi.testPreConnect({
        connector_type: connectorType,
        connection_config: buildPatchConfig(),
      })
      setPingResult(res)
    } finally {
      setTesting(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (saving) return
    setSaving(true)
    setError(null)

    try {
      const configUpdates = buildPatchConfig()
      await systemsApi.update(systemId, {
        name: name.trim(),
        kind,
        connector_type: connectorType,
        adapter_type: connectorType,
        environment,
        classification,
        purpose: purpose.trim(),
        connection_config:
          Object.keys(configUpdates).length > 0 ? configUpdates : undefined,
      })

      navigate({
        to: '/connectors/$systemId',
        params: { systemId },
      })
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Failed to update connector.'
      )
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-[#39359D]" />
      </div>
    )
  }

  const currentMaskedEntries = Object.entries(existingMasked).filter(
    ([k]) => !k.startsWith('_') && k !== 'endpoint_id'
  )

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Link
          to="/connectors/$systemId"
          params={{ systemId }}
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#64748B] hover:text-[#0F172A]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Connector
        </Link>
        <div className="mt-2 flex items-center gap-3">
          <ConnectorTechLogo connectorType={connectorType} size="lg" />
          <div>
            <h1 className="text-[24px] sm:text-[28px] font-semibold tracking-[-0.025em] text-[#0F172A]">
              Edit Connector
            </h1>
            <p className="text-[13.5px] text-[#64748B]">
              Update endpoint metadata, adapter type, or rotate credentials.
            </p>
          </div>
        </div>
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

        <div className="space-y-4 p-6 sm:p-7">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="block text-[12.5px] font-medium text-[#334155]">
                Connector Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-10 w-full rounded-lg border border-[#E2E8F0] bg-white px-3 text-[13.5px] outline-none focus:border-[#39359D]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[12.5px] font-medium text-[#334155]">
                Adapter Type
              </label>
              <CustomSelect
                value={connectorType}
                onChange={setConnectorType}
                options={ADAPTER_OPTIONS}
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
                options={['SOURCE', 'TARGET', 'INTERMEDIATE']}
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
              className="h-10 w-full rounded-lg border border-[#E2E8F0] bg-white px-3 text-[13.5px] outline-none focus:border-[#39359D]"
            />
          </div>
        </div>

        {/* Rotate Credentials (Optional) */}
        <div className="space-y-4 p-6 sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-[15px] font-semibold text-[#0F172A]">
                Rotate Credentials (Optional)
              </h2>
              <p className="text-[12.5px] text-[#64748B]">
                Leave blank to preserve existing encrypted connection parameters.
              </p>
            </div>

            <button
              type="button"
              disabled={testing}
              onClick={handleTestPing}
              className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-[#39359D] bg-white px-3 text-[12px] font-semibold text-[#39359D] hover:bg-[#39359D]/[0.06]"
            >
              {testing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Zap className="h-3.5 w-3.5" />
              )}
              Ping Endpoint
            </button>
          </div>

          {currentMaskedEntries.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {currentMaskedEntries.map(([k, v]) => (
                <span
                  key={k}
                  className="rounded-md border border-[#E2E8F0] bg-[#F8FAFC] px-2 py-0.5 font-mono text-[11px] text-[#475569]"
                >
                  {k}: {String(v)}
                </span>
              ))}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="block text-[12.5px] font-medium text-[#334155]">
                New Host / URI / URL
              </label>
              <input
                type="text"
                value={newHostOrUri}
                onChange={(e) => setNewHostOrUri(e.target.value)}
                placeholder="Leave unchanged"
                className="h-10 w-full rounded-lg border border-[#E2E8F0] bg-white px-3 text-[13.5px] outline-none focus:border-[#39359D]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[12.5px] font-medium text-[#334155]">
                New Database
              </label>
              <input
                type="text"
                value={newDatabase}
                onChange={(e) => setNewDatabase(e.target.value)}
                placeholder="Leave unchanged"
                className="h-10 w-full rounded-lg border border-[#E2E8F0] bg-white px-3 text-[13.5px] outline-none focus:border-[#39359D]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[12.5px] font-medium text-[#334155]">
                New Username
              </label>
              <input
                type="text"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder="Leave unchanged"
                className="h-10 w-full rounded-lg border border-[#E2E8F0] bg-white px-3 text-[13.5px] outline-none focus:border-[#39359D]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[12.5px] font-medium text-[#334155]">
                New Password / Token / Secret
              </label>
              <input
                type="password"
                value={newSecret}
                onChange={(e) => setNewSecret(e.target.value)}
                placeholder="••••••••••••"
                className="h-10 w-full rounded-lg border border-[#E2E8F0] bg-white px-3 text-[13.5px] outline-none focus:border-[#39359D]"
              />
            </div>
          </div>

          {pingResult && (
            <div
              className={`flex items-center justify-between rounded-lg border px-3.5 py-2.5 text-[12.5px] ${
                pingResult.status === 'SUCCESS'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                  : 'border-rose-200 bg-rose-50 text-rose-900'
              }`}
            >
              <span className="flex items-center gap-2 font-medium">
                {pingResult.status === 'SUCCESS' ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                ) : (
                  <XCircle className="h-4 w-4 text-rose-600" />
                )}
                {pingResult.message}
              </span>
              <span className="font-mono text-[11px]">
                {pingResult.latency_ms.toFixed(0)} ms
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 bg-[#F8FAFC] px-6 py-4 rounded-b-xl">
          <Link
            to="/connectors/$systemId"
            params={{ systemId }}
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
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  )
}