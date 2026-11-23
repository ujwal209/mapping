import { useEffect, useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import {
  Plus,
  Search,
  Loader2,
  FolderKanban,
  Check,
  Pencil,
  ArrowUpRight,
  Calendar,
  Layers,
  ShieldCheck,
} from 'lucide-react'
import {
  activeProjectStorage,
  projectsApi,
  type ProjectItem,
} from '../../../lib/api/projectsApi'

export const Route = createFileRoute('/(platfrom)/projects/')({
  component: ProjectsListPage,
})

function ProjectsListPage() {
  const [projects, setProjects] = useState<ProjectItem[]>([])
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setActiveProjectId(activeProjectStorage.get())
    let active = true

    projectsApi
      .list()
      .then((list) => {
        if (!active) return
        setProjects(list)
        const current = activeProjectStorage.get()
        if (!current && list.length > 0) {
          activeProjectStorage.set(list[0].project_id)
          setActiveProjectId(list[0].project_id)
        }
      })
      .catch(() => {
        if (active) setError('Unable to load projects.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  const handleSetActive = (e: React.MouseEvent, projectId: string) => {
    e.preventDefault()
    e.stopPropagation()
    activeProjectStorage.set(projectId)
    setActiveProjectId(projectId)
  }

  const filtered = projects.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.domain || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.description || '').toLowerCase().includes(search.toLowerCase())

    const matchesStatus =
      statusFilter === 'ALL' ||
      (p.status || 'ACTIVE').toUpperCase() === statusFilter

    return matchesSearch && matchesStatus
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-[#E2E8F0] pb-6">
        <div>
          <h1 className="text-[24px] sm:text-[28px] font-semibold tracking-[-0.025em] text-[#0F172A]">
            Projects
          </h1>
          <p className="mt-1 text-[14px] text-[#64748B]">
            Manage isolated migration workspaces, metadata, and active project context.
          </p>
        </div>

        <Link
          to="/projects/new"
          className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-[#39359D] px-4 text-[13px] font-medium text-white shadow-xs transition-colors hover:bg-[#2E2A82]"
        >
          <Plus className="h-4 w-4" />
          New Project
        </Link>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-[13px] text-rose-700">
          {error}
        </div>
      )}

      {/* Search & Vercel Segmented Filter */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects..."
            className="h-9 w-full rounded-lg border border-[#E2E8F0] bg-white pl-9 pr-3 text-[13.5px] text-[#0F172A] placeholder:text-[#94A3B8] outline-none transition-all focus:border-[#39359D] focus:ring-2 focus:ring-[#39359D]/12"
          />
        </div>

        <div className="inline-flex w-fit items-center rounded-lg border border-[#E2E8F0] bg-[#F1F5F9]/70 p-0.5">
          {(['ALL', 'ACTIVE', 'DRAFT', 'ARCHIVED'] as const).map((status) => {
            const active = statusFilter === status
            return (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={`cursor-pointer rounded-md px-3 py-1.5 text-[12px] transition-all ${
                  active
                    ? 'bg-white font-semibold text-[#0F172A] shadow-2xs'
                    : 'font-medium text-[#64748B] hover:text-[#0F172A]'
                }`}
              >
                {status === 'ALL' ? 'All' : status}
              </button>
            )
          })}
        </div>
      </div>

      {/* Cards Grid */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex h-[210px] items-center justify-center rounded-xl border border-[#E2E8F0] bg-white"
            >
              <Loader2 className="h-5 w-5 animate-spin text-[#39359D]" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#CBD5E1] bg-white p-12 text-center">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] text-[#39359D]">
            <FolderKanban className="h-5 w-5" />
          </div>
          <h3 className="mt-4 text-[16px] font-semibold text-[#0F172A]">
            {projects.length === 0 ? 'No projects yet' : 'No matching projects'}
          </h3>
          <p className="mx-auto mt-1 max-w-sm text-[13.5px] text-[#64748B]">
            {projects.length === 0
              ? 'Create your first workspace to configure environments and project metadata.'
              : 'No projects match your current search or status filter.'}
          </p>
          {projects.length === 0 && (
            <Link
              to="/projects/new"
              className="mt-5 inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#39359D] px-4 text-[13px] font-medium text-white hover:bg-[#2E2A82]"
            >
              <Plus className="h-4 w-4" />
              Create Project
            </Link>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((proj) => {
            const isCurrentActive = proj.project_id === activeProjectId
            const statusText = (proj.status || 'ACTIVE').toUpperCase()

            return (
              <div
                key={proj.project_id}
                className={`group flex flex-col justify-between rounded-xl bg-white p-5 transition-all ${
                  isCurrentActive
                    ? 'border border-[#39359D] ring-1 ring-[#39359D]/20 shadow-[0_4px_20px_-6px_rgba(57,53,157,0.16)]'
                    : 'border border-[#E2E8F0] shadow-[0_1px_2px_rgba(15,23,42,0.03)] hover:border-[#CBD5E1]'
                }`}
              >
                <div>
                {/* Top Meta Row */}
                  <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                      
                      {isCurrentActive && (
                        <span className="rounded-full bg-[#39359D]/10 px-2.5 py-0.5 text-[11px] font-semibold text-[#39359D]">
                          Active
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <Link
                        to="/projects/$projectId/edit"
                        params={{ projectId: proj.project_id }}
                        title="Edit project"
                        className="inline-flex h-7 w-7 items-center justify-center rounded-md text-[#64748B] transition-colors hover:bg-[#F1F5F9] hover:text-[#0F172A]"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Link>
                      <Link
                        to="/projects/$projectId"
                        params={{ projectId: proj.project_id }}
                        title="Open project"
                        className="inline-flex h-7 w-7 items-center justify-center rounded-md text-[#64748B] transition-colors hover:bg-[#F1F5F9] hover:text-[#0F172A]"
                      >
                        <ArrowUpRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>

                  {/* Title & Monospace ID */}
                  <Link
                    to="/projects/$projectId"
                    params={{ projectId: proj.project_id }}
                    className="mt-3.5 block"
                  >
                    <h3 className="text-[16px] font-semibold tracking-[-0.01em] text-[#0F172A] group-hover:text-[#39359D] transition-colors">
                      {proj.name}
                    </h3>
                    <div className="mt-0.5 font-mono text-[11px] text-[#94A3B8]">
                      {proj.project_id}
                    </div>
                    <p className="mt-2 line-clamp-2 text-[13px] leading-relaxed text-[#64748B]">
                      {proj.description ||
                        'Enterprise migration workspace with isolated environments.'}
                    </p>
                  </Link>

                  {/* Metadata Tags (No connector arrows) */}
                  <div className="mt-4 flex flex-wrap gap-1.5 text-[11.5px] text-[#475569]">
                    {proj.domain && (
                      <span className="inline-flex items-center gap-1 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] px-2 py-0.5">
                        <Layers className="h-3 w-3 text-[#64748B]" />
                        {proj.domain}
                      </span>
                    )}
                    {proj.compliance_framework && (
                      <span className="inline-flex items-center gap-1 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] px-2 py-0.5">
                        <ShieldCheck className="h-3 w-3 text-[#64748B]" />
                        {proj.compliance_framework}
                      </span>
                    )}
                    {proj.target_cutover_date && (
                      <span className="inline-flex items-center gap-1 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] px-2 py-0.5">
                        <Calendar className="h-3 w-3 text-[#64748B]" />
                        {proj.target_cutover_date}
                      </span>
                    )}
                  </div>
                </div>

                {/* Footer Action Row */}
                <div className="mt-5 flex items-center justify-between border-t border-[#F1F5F9] pt-3.5">
                  {isCurrentActive ? (
                    <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#39359D]">
                      <Check className="h-3.5 w-3.5" />
                      Current Workspace
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => handleSetActive(e, proj.project_id)}
                      className="cursor-pointer rounded-md border border-[#E2E8F0] bg-white px-2.5 py-1 text-[12px] font-medium text-[#334155] transition-colors hover:border-[#39359D] hover:text-[#39359D]"
                    >
                      Set Active
                    </button>
                  )}

                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}