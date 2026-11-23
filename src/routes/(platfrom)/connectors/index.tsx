import { useEffect, useState } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import {
  Plus,
  Search,
  Server,
  Pencil,
  Trash2,
  ArrowUpRight,
  RefreshCw,
} from 'lucide-react'
import { ConnectorTechLogo } from '../../../components/ConnectorTechLogo'
import { ConfirmDeleteModal } from '../../../components/ConfirmDeleteModal'
import { CustomSelect } from '../../../components/CustomSelect'
import {
  activeProjectStorage,
  projectsApi,
  type ProjectItem,
} from '../../../lib/api/projectsApi'
import { systemsApi, type SystemItem } from '../../../lib/api/systemsApi'

export const Route = createFileRoute('/(platfrom)/connectors/')({
  component: ConnectorsListPage,
})

function ConnectorsListPage() {
  const navigate = useNavigate()
  const [projects, setProjects] = useState<ProjectItem[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string>('')
  const [systems, setSystems] = useState<SystemItem[]>([])
  const [search, setSearch] = useState('')
  const [kindFilter, setKindFilter] = useState<string>('ALL')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Modal delete state
  const [deleteTarget, setDeleteTarget] = useState<SystemItem | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    projectsApi.list().then((list) => {
      setProjects(list)
      const stored = activeProjectStorage.get()
      if (stored && list.some((p) => p.project_id === stored)) {
        setSelectedProjectId(stored)
      } else if (list.length > 0) {
        setSelectedProjectId(list[0].project_id)
      } else {
        setLoading(false)
      }
    })
  }, [])

  const loadSystems = (projectId: string) => {
    if (!projectId) return
    setLoading(true)
    setError(null)
    systemsApi
      .list(projectId)
      .then(setSystems)
      .catch(() => setError('Unable to load connectors for this project.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (selectedProjectId) {
      loadSystems(selectedProjectId)
    }
  }, [selectedProjectId])

  const handleProjectSwitch = (projectId: string) => {
    setSelectedProjectId(projectId)
    activeProjectStorage.set(projectId)
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await systemsApi.delete(deleteTarget.system_id)
      setSystems((prev) =>
        prev.filter((item) => item.system_id !== deleteTarget.system_id)
      )
      setDeleteTarget(null)
    } catch {
      setError('Failed to delete connector.')
    } finally {
      setDeleting(false)
    }
  }

  const filtered = systems.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.connector_type.toLowerCase().includes(search.toLowerCase()) ||
      s.system_id.toLowerCase().includes(search.toLowerCase()) ||
      (s.environment || '').toLowerCase().includes(search.toLowerCase())

    const matchesKind =
      kindFilter === 'ALL' || (s.kind || 'SOURCE').toUpperCase() === kindFilter

    return matchesSearch && matchesKind
  })

  return (
    <div className="space-y-4">
      {/* Compact Header Toolbar */}
      <div className="flex flex-col gap-3 border-b border-[#E2E8F0] pb-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-baseline gap-3">
          <h1 className="text-[20px] sm:text-[22px] font-semibold tracking-[-0.02em] text-[#0F172A]">
            Connectors
          </h1>
          <span className="rounded-md border border-[#E2E8F0] bg-[#FAFAFA] px-2 py-0.5 font-mono text-[11px] text-[#64748B]">
            {systems.length} total
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {projects.length > 0 && (
            <div className="w-52">
              <CustomSelect
                value={selectedProjectId}
                onChange={handleProjectSwitch}
                options={projects.map((p) => ({
                  value: p.project_id,
                  label: p.name,
                }))}
                placeholder="Select project"
              />
            </div>
          )}

          <button
            type="button"
            disabled={loading || !selectedProjectId}
            onClick={() => loadSystems(selectedProjectId)}
            title="Refresh connectors"
            className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-[#E2E8F0] bg-white text-[#475569] transition-colors hover:bg-[#F8FAFC] hover:text-[#0F172A] disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-[#39359D]' : ''}`} />
          </button>

          <Link
            to="/connectors/new"
            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-[#39359D] px-3.5 text-[13px] font-medium text-white shadow-2xs transition-colors hover:bg-[#2E2A82]"
          >
            <Plus className="h-3.5 w-3.5" />
            New Connector
          </Link>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-[12.5px] text-rose-700">
          {error}
        </div>
      )}

      {/* Search & Segmented Role Filter */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#94A3B8]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter by name, adapter, or ID..."
            className="h-8 w-full rounded-lg border border-[#E2E8F0] bg-white pl-8 pr-3 text-[12.5px] text-[#0F172A] placeholder:text-[#94A3B8] outline-none focus:border-[#39359D] focus:ring-2 focus:ring-[#39359D]/10"
          />
        </div>

        <div className="inline-flex w-fit items-center rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-0.5">
          {(['ALL', 'SOURCE', 'TARGET', 'INTERMEDIATE'] as const).map((kind) => {
            const active = kindFilter === kind
            return (
              <button
                key={kind}
                type="button"
                onClick={() => setKindFilter(kind)}
                className={`cursor-pointer rounded-md px-2.5 py-1 text-[11.5px] transition-all ${
                  active
                    ? 'bg-white font-semibold text-[#0F172A] shadow-2xs ring-1 ring-black/5'
                    : 'font-medium text-[#64748B] hover:text-[#0F172A]'
                }`}
              >
                {kind === 'ALL' ? 'All Roles' : kind}
              </button>
            )
          })}
        </div>
      </div>

      {/* Vercel-Style Table Container */}
      <div className="overflow-hidden rounded-xl border border-[#E2E8F0] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.02)]">
        {loading ? (
          <div className="divide-y divide-[#F1F5F9]">
            <div className="grid grid-cols-12 bg-[#FAFAFA] px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
              <div className="col-span-4">Connector</div>
              <div className="col-span-2">Adapter</div>
              <div className="col-span-2">Role</div>
              <div className="col-span-2">Environment</div>
              <div className="col-span-2 text-right">Actions</div>
            </div>
            {[1, 2, 3, 4].map((n) => (
              <div
                key={n}
                className="grid grid-cols-12 items-center gap-4 px-4 py-3.5 animate-pulse"
              >
                <div className="col-span-4 flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-[#F1F5F9]" />
                  <div className="space-y-1.5 flex-1">
                    <div className="h-3.5 w-36 rounded bg-[#F1F5F9]" />
                    <div className="h-2.5 w-24 rounded bg-[#F8FAFC]" />
                  </div>
                </div>
                <div className="col-span-2">
                  <div className="h-5 w-20 rounded bg-[#F1F5F9]" />
                </div>
                <div className="col-span-2">
                  <div className="h-5 w-16 rounded bg-[#F1F5F9]" />
                </div>
                <div className="col-span-2">
                  <div className="h-4 w-20 rounded bg-[#F1F5F9]" />
                </div>
                <div className="col-span-2 flex justify-end gap-1.5">
                  <div className="h-7 w-16 rounded bg-[#F1F5F9]" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg border border-[#E2E8F0] bg-[#FAFAFA] text-[#39359D]">
              <Server className="h-4 w-4" />
            </div>
            <h3 className="mt-3 text-[14.5px] font-semibold text-[#0F172A]">
              {systems.length === 0
                ? 'No connectors registered'
                : 'No matching connectors'}
            </h3>
            <p className="mx-auto mt-1 max-w-sm text-[12.5px] text-[#64748B]">
              {systems.length === 0
                ? 'Connect PostgreSQL, MySQL, Supabase, MongoDB, Microsoft Fabric, Dynamics 365, or REST APIs.'
                : 'Try adjusting your search query or role filter.'}
            </p>
            {systems.length === 0 && (
              <Link
                to="/connectors/new"
                className="mt-4 inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#39359D] px-3.5 text-[12.5px] font-medium text-white hover:bg-[#2E2A82]"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Connector
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-[#E2E8F0] bg-[#FAFAFA] text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                  <th className="px-4 py-2.5">Connector</th>
                  <th className="px-4 py-2.5">Adapter</th>
                  <th className="px-4 py-2.5">Role</th>
                  <th className="px-4 py-2.5">Endpoint</th>
                  <th className="px-4 py-2.5">Environment</th>
                  <th className="px-4 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9] text-[13px]">
                {filtered.map((sys) => {
                  const visibleConfig = Object.entries(
                    sys.config_summary || {}
                  ).filter(([k]) => !k.startsWith('_') && k !== 'endpoint_id')

                  return (
                    <tr
                      key={sys.system_id}
                      onClick={() =>
                        navigate({
                          to: '/connectors/$systemId',
                          params: { systemId: sys.system_id },
                        })
                      }
                      className="group cursor-pointer transition-colors hover:bg-[#FAFAFA]"
                    >
                      {/* Connector Name & ID */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <ConnectorTechLogo
                            connectorType={sys.connector_type}
                            size="md"
                          />
                          <div className="min-w-0">
                            <div className="truncate font-semibold text-[#0F172A] group-hover:text-[#39359D] transition-colors">
                              {sys.name}
                            </div>
                            <div className="truncate font-mono text-[11px] text-[#94A3B8]">
                              {sys.system_id}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Adapter Type */}
                      <td className="whitespace-nowrap px-4 py-3">
                        <span className="rounded-md border border-[#E2E8F0] bg-[#F8FAFC] px-2 py-0.5 font-mono text-[11px] uppercase text-[#334155]">
                          {sys.connector_type}
                        </span>
                      </td>

                      {/* Role */}
                      <td className="whitespace-nowrap px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide ${
                            sys.kind === 'TARGET'
                              ? 'border-[#39359D]/25 bg-[#39359D]/[0.06] text-[#39359D]'
                              : sys.kind === 'INTERMEDIATE'
                                ? 'border-amber-200 bg-amber-50 text-amber-700'
                                : 'border-emerald-200 bg-emerald-50/80 text-emerald-700'
                          }`}
                        >
                          {sys.kind}
                        </span>
                      </td>

                      {/* Masked Endpoint Summary */}
                      <td className="px-4 py-3">
                        {visibleConfig.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {visibleConfig.slice(0, 2).map(([k, v]) => (
                              <span
                                key={k}
                                className="inline-flex max-w-[200px] items-center gap-1 rounded border border-[#E2E8F0] bg-[#FAFAFA] px-1.5 py-0.5 font-mono text-[11px] text-[#475569]"
                              >
                                <span className="text-[#94A3B8]">{k}:</span>
                                <span className="truncate">{String(v)}</span>
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[12px] text-[#94A3B8]">—</span>
                        )}
                      </td>

                      {/* Environment & Classification */}
                      <td className="whitespace-nowrap px-4 py-3">
                        <div className="flex items-center gap-1.5 text-[12.5px] text-[#334155]">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          <span>{sys.environment}</span>
                        </div>
                        <div className="text-[10.5px] font-mono text-[#94A3B8]">
                          {sys.classification}
                        </div>
                      </td>

                      {/* Row Actions */}
                      <td
                        onClick={(e) => e.stopPropagation()}
                        className="whitespace-nowrap px-4 py-3 text-right"
                      >
                        <div className="inline-flex items-center justify-end gap-1">
                          <Link
                            to="/connectors/$systemId"
                            params={{ systemId: sys.system_id }}
                            className="inline-flex h-7 items-center gap-1 rounded-md border border-[#E2E8F0] bg-white px-2.5 text-[12px] font-medium text-[#0F172A] transition-colors hover:border-[#39359D] hover:text-[#39359D]"
                          >
                            Inspect
                            <ArrowUpRight className="h-3 w-3" />
                          </Link>
                          <Link
                            to="/connectors/$systemId/edit"
                            params={{ systemId: sys.system_id }}
                            title="Configure connector"
                            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-[#64748B] transition-colors hover:bg-[#F1F5F9] hover:text-[#0F172A]"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Link>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(sys)}
                            title="Delete connector"
                            className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-[#64748B] transition-colors hover:bg-rose-50 hover:text-rose-600"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Custom Delete Confirmation Popup */}
      <ConfirmDeleteModal
        open={deleteTarget !== null}
        title={`Delete "${deleteTarget?.name ?? ''}"?`}
        description="This permanently removes the connector endpoint and its saved connection credentials. Active pipelines referencing this connector will fail."
        loading={deleting}
        onConfirm={confirmDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  )
}