import { useEffect, useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import {
  FolderKanban,
  Plug,
  Network,
  GitCompareArrows,
  Plus,
  ArrowUpRight,
  Loader2,
  RefreshCw,
  CheckCircle2,
  Circle,
  ArrowRight,
  Sparkles,
  Check,
  Layers,
} from 'lucide-react'
import { ConnectorTechLogo } from '../../components/ConnectorTechLogo'
import {
  activeProjectStorage,
  projectsApi,
  type ProjectItem,
} from '../../lib/api/projectsApi'
import { systemsApi, type SystemItem } from '../../lib/api/systemsApi'
import { ontologiesApi, type OntologyItem } from '../../lib/api/ontologiesApi'

export const Route = createFileRoute('/(platfrom)/dashboard')({
  component: AnalyticsDashboardPage,
})

function AnalyticsDashboardPage() {
  const [projects, setProjects] = useState<ProjectItem[]>([])
  const [systems, setSystems] = useState<SystemItem[]>([])
  const [ontologies, setOntologies] = useState<OntologyItem[]>([])
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null)
  const [userName, setUserName] = useState<string>('')

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setActiveProjectId(activeProjectStorage.get())

    try {
      const raw = localStorage.getItem('ms_user_profile')
      if (raw) {
        const parsed = JSON.parse(raw)
        if (parsed?.full_name) {
          setUserName(parsed.full_name.split(' ')[0])
        }
      }
    } catch {
      // ignore storage parse error
    }

    const onProjectChange = (e: Event) => {
      const custom = e as CustomEvent<string | null>
      setActiveProjectId(custom.detail ?? activeProjectStorage.get())
    }
    window.addEventListener('ms:active-project-changed', onProjectChange)
    return () => {
      window.removeEventListener('ms:active-project-changed', onProjectChange)
    }
  }, [])

  const loadAnalytics = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    setError(null)

    try {
      const [projRes, sysRes, ontRes] = await Promise.allSettled([
        projectsApi.list(),
        systemsApi.list(),
        ontologiesApi.list(),
      ])

      if (projRes.status === 'fulfilled') {
        const list = projRes.value
        setProjects(list)
        const current = activeProjectStorage.get()
        if (!current && list.length > 0) {
          activeProjectStorage.set(list[0].project_id)
          setActiveProjectId(list[0].project_id)
        } else {
          setActiveProjectId(current)
        }
      }
      if (sysRes.status === 'fulfilled') setSystems(sysRes.value)
      if (ontRes.status === 'fulfilled') setOntologies(ontRes.value)
    } catch {
      setError('Unable to load workspace analytics.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadAnalytics(false)
  }, [])

  const handleSetActiveProject = (
    e: React.MouseEvent,
    projectId: string
  ) => {
    e.preventDefault()
    e.stopPropagation()
    activeProjectStorage.set(projectId)
    setActiveProjectId(projectId)
  }

  const activeProject =
    projects.find((p) => p.project_id === activeProjectId) || null

  // Derived Telemetry
  const totalEntities = ontologies.reduce(
    (sum, o) => sum + (o.entities?.length || 0),
    0
  )
  const totalRelationships = ontologies.reduce(
    (sum, o) => sum + (o.relationships?.length || 0),
    0
  )
  const sourceSystems = systems.filter((s) => s.kind === 'SOURCE')
  const targetSystems = systems.filter((s) => s.kind === 'TARGET')
  const mappingPairsCount =
    sourceSystems.length > 0 && targetSystems.length > 0
      ? sourceSystems.length * targetSystems.length
      : 0

  // Workspace Readiness Checklist
  const readinessSteps = [
    {
      label: 'Create & select an active migration project',
      done: Boolean(activeProject),
      to: '/projects/new',
      cta: 'Create',
    },
    {
      label: 'Connect source & target endpoints',
      done: sourceSystems.length > 0 && targetSystems.length > 0,
      to: '/connectors/new',
      cta: 'Connect',
    },
    {
      label: 'Define canonical business ontology',
      done: ontologies.length > 0,
      to: '/ontology/new',
      cta: 'Model',
    },
    {
      label: 'Generate AI schema mappings',
      done: mappingPairsCount > 0 && ontologies.length > 0,
      to: '/mapping',
      cta: 'Map',
    },
  ]
  const completedSteps = readinessSteps.filter((s) => s.done).length
  const readinessPercent = Math.round(
    (completedSteps / readinessSteps.length) * 100
  )

  const kpiCards = [
    {
      label: 'Total Projects',
      value: projects.length,
      trend: activeProject
        ? `Active: ${activeProject.name}`
        : 'No active project selected',
      icon: FolderKanban,
      to: '/projects',
    },
    {
      label: 'Connected Systems',
      value: systems.length,
      trend: `${sourceSystems.length} source · ${targetSystems.length} target`,
      icon: Plug,
      to: '/connectors',
    },
    {
      label: 'Canonical Ontologies',
      value: ontologies.length,
      trend: `${totalEntities} entities · ${totalRelationships} links`,
      icon: Network,
      to: '/ontology',
    },
    {
      label: 'Ready Mapping Pairs',
      value: mappingPairsCount,
      trend: 'Source → target pairs',
      icon: GitCompareArrows,
      to: '/mapping',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Vercel / Linear Clean Page Header */}
      <div className="flex flex-col gap-4 border-b border-[#E2E8F0] pb-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.09em] text-[#39359D]">
              Overview
            </span>
            {activeProject && (
              <>
                <span className="text-[#CBD5E1]">/</span>
                <Link
                  to="/projects/$projectId"
                  params={{ projectId: activeProject.project_id }}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#39359D]/25 bg-[#39359D]/[0.07] px-2.5 py-0.5 text-[11.5px] font-medium text-[#39359D] transition-colors hover:bg-[#39359D]/[0.12]"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-[#39359D]" />
                  {activeProject.name}
                </Link>
              </>
            )}
          </div>

          <h1 className="mt-1.5 text-[24px] sm:text-[28px] font-semibold leading-[1.15] tracking-[-0.025em] text-[#0F172A]">
            {userName ? `Welcome back, ${userName}` : 'Workspace Overview'}
          </h1>
          <p className="mt-1 text-[14px] text-[#64748B]">
            Monitor active workspace readiness, connected endpoints, and semantic models.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={refreshing}
            onClick={() => loadAnalytics(true)}
            className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-[#E2E8F0] bg-white px-3.5 text-[13px] font-medium text-[#475569] shadow-2xs transition-colors hover:border-[#CBD5E1] hover:text-[#0F172A] disabled:opacity-60"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`}
            />
            Sync
          </button>

          <Link
            to="/connectors/new"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#E2E8F0] bg-white px-3.5 text-[13px] font-medium text-[#0F172A] shadow-2xs transition-colors hover:border-[#39359D] hover:text-[#39359D]"
          >
            <Plus className="h-3.5 w-3.5" />
            New Connector
          </Link>

          <Link
            to="/projects/new"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#39359D] px-4 text-[13px] font-medium text-white shadow-xs transition-colors hover:bg-[#2E2A82]"
          >
            <Plus className="h-3.5 w-3.5" />
            New Project
          </Link>
        </div>
      </div>

      {/* Active Workspace Context Strip */}
      {!loading && (
        <div className="flex flex-col gap-3 rounded-xl border border-[#E2E8F0] bg-white px-5 py-3.5 shadow-[0_1px_2px_rgba(15,23,42,0.03)] sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#39359D]/[0.08] text-[#39359D]">
              <Layers className="h-4 w-4" />
            </span>
            {activeProject ? (
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[12px] font-medium text-[#64748B]">
                    Current Active Project:
                  </span>
                  <span className="truncate text-[13.5px] font-semibold text-[#0F172A]">
                    {activeProject.name}
                  </span>
                  <span className="hidden sm:inline font-mono text-[11px] text-[#94A3B8]">
                    {activeProject.project_id}
                  </span>
                </div>
                <div className="text-[12px] text-[#64748B]">
                  {activeProject.domain || 'Enterprise'} ·{' '}
                  {activeProject.compliance_framework || 'SOC 2 Type II'} ·{' '}
                  {activeProject.data_classification || 'CONFIDENTIAL'}
                </div>
              </div>
            ) : (
              <div className="text-[13px] text-[#64748B]">
                No project is currently set as active. Select a project below or create a new workspace.
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {activeProject && (
              <Link
                to="/projects/$projectId"
                params={{ projectId: activeProject.project_id }}
                className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-1.5 text-[12px] font-medium text-[#0F172A] transition-colors hover:border-[#39359D] hover:text-[#39359D]"
              >
                Open Workspace
              </Link>
            )}
            <Link
              to="/projects"
              className="rounded-lg px-2.5 py-1.5 text-[12px] font-medium text-[#39359D] hover:bg-[#39359D]/[0.06]"
            >
              Switch Project →
            </Link>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-[13px] text-rose-700">
          {error}
        </div>
      )}

      {/* 4 Linear-Style KPI Metric Cards */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className="flex h-[138px] items-center justify-center rounded-xl border border-[#E2E8F0] bg-white"
            >
              <Loader2 className="h-5 w-5 animate-spin text-[#39359D]" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {kpiCards.map((card) => {
            const Icon = card.icon
            return (
              <Link
                key={card.label}
                to={card.to}
                className="group rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)] transition-all hover:border-[#CBD5E1]"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[12.5px] font-medium text-[#64748B]">
                    {card.label}
                  </span>
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-[#E2E8F0] bg-[#F8FAFC] text-[#475569] transition-colors group-hover:border-[#39359D]/30 group-hover:text-[#39359D]">
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                </div>

                <div className="mt-3 text-[30px] font-semibold leading-none tracking-[-0.03em] text-[#0F172A]">
                  {card.value}
                </div>

                <div className="mt-3 flex items-center justify-between text-[12px] text-[#64748B]">
                  <span className="truncate pr-2">{card.trend}</span>
                  <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-[#94A3B8] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-[#39359D]" />
                </div>
              </Link>
            )
          })}
        </div>
      )}

      {/* Middle Row: Architecture Readiness & Mapping Spotlight */}
      <div className="grid gap-5 lg:grid-cols-12">
        <section className="lg:col-span-7 rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-[15px] font-semibold text-[#0F172A]">
                Workspace Readiness
              </h2>
              <p className="mt-0.5 text-[12.5px] text-[#64748B]">
                Complete these milestones to launch AI-assisted schema mapping
              </p>
            </div>
            <span className="w-fit rounded-full border border-[#39359D]/20 bg-[#39359D]/[0.07] px-2.5 py-0.5 font-mono text-[11.5px] font-semibold text-[#39359D]">
              {readinessPercent}%
            </span>
          </div>

          {/* Custom Linear Progress Track */}
          <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-[#F1F5F9]">
            <div
              style={{ width: `${readinessPercent}%` }}
              className="h-full rounded-full bg-[#39359D] transition-all duration-300"
            />
          </div>

          <div className="mt-4 divide-y divide-[#F1F5F9]">
            {readinessSteps.map((step) => (
              <div
                key={step.label}
                className="flex items-center justify-between gap-4 py-3 first:pt-1 last:pb-0"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {step.done ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                  ) : (
                    <Circle className="h-4 w-4 shrink-0 text-[#CBD5E1]" />
                  )}
                  <span
                    className={`truncate text-[13.5px] ${
                      step.done
                        ? 'text-[#94A3B8] line-through'
                        : 'font-medium text-[#1E293B]'
                    }`}
                  >
                    {step.label}
                  </span>
                </div>

                {!step.done && (
                  <Link
                    to={step.to}
                    className="inline-flex shrink-0 items-center gap-1 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] px-2.5 py-1 text-[12px] font-medium text-[#39359D] transition-colors hover:border-[#39359D]"
                  >
                    {step.cta}
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Mapping Studio Card */}
        <section className="lg:col-span-5 flex flex-col justify-between rounded-xl border border-[#39359D]/25 bg-[#39359D] p-6 text-white shadow-xs">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-2.5 py-0.5 text-[11px] font-medium text-[#E0E7FF]">
            
              Schema Mapping Studio
            </div>
            <h2 className="mt-4 text-[20px] font-semibold leading-snug tracking-[-0.02em]">
              Align source &amp; target schemas with ontology grounding.
            </h2>
            <p className="mt-2 text-[13.5px] leading-relaxed text-[#E0E7FF]/90">
              Generate table pairs and column-level transformation rules with human-in-the-loop review.
            </p>
          </div>

          <div className="mt-6 flex items-center justify-between border-t border-white/15 pt-4">
            <span className="text-[12px] text-[#C7D2FE]">
              {sourceSystems.length} source · {targetSystems.length} target
            </span>
            <Link
              to="/mapping"
              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-white px-3.5 text-[12.5px] font-semibold text-[#39359D] transition-colors hover:bg-[#F8FAFC]"
            >
              Open Studio
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </section>
      </div>

      {/* Bottom Row: Projects (with true Active status), Connected Endpoints, Ontologies */}
      <div className="grid gap-5 lg:grid-cols-12">
        {/* Projects List — Shows ONLY the selected project as Active */}
        <section className="lg:col-span-5 rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
          <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3.5">
            <div>
              <h2 className="text-[15px] font-semibold text-[#0F172A]">
                Projects
              </h2>
              <p className="text-[12px] text-[#64748B]">
                Click Set Active to switch workspace context
              </p>
            </div>
            <Link
              to="/projects"
              className="text-[12.5px] font-medium text-[#39359D] hover:underline"
            >
              View all →
            </Link>
          </div>

          {projects.length === 0 ? (
            <div className="mt-4 rounded-lg border border-dashed border-[#CBD5E1] bg-[#F8FAFC] p-8 text-center">
              <p className="text-[13.5px] font-medium text-[#0F172A]">
                No projects created yet
              </p>
              <Link
                to="/projects/new"
                className="mt-3 inline-flex h-8 items-center rounded-lg bg-[#39359D] px-3.5 text-[12.5px] font-medium text-white"
              >
                Create Project
              </Link>
            </div>
          ) : (
            <div className="mt-2 divide-y divide-[#F1F5F9]">
              {projects.slice(0, 5).map((p) => {
                const isSelectedActive = p.project_id === activeProjectId
                return (
                  <div
                    key={p.project_id}
                    className={`flex items-center justify-between gap-3 rounded-lg px-2.5 py-3 transition-colors ${
                      isSelectedActive ? 'bg-[#39359D]/[0.04]' : 'hover:bg-[#F8FAFC]'
                    }`}
                  >
                    <Link
                      to="/projects/$projectId"
                      params={{ projectId: p.project_id }}
                      className="min-w-0 flex-1"
                    >
                      <div className="flex items-center gap-2">
                        <span className="truncate text-[13.5px] font-semibold text-[#0F172A] hover:text-[#39359D]">
                          {p.name}
                        </span>
                      </div>
                      <div className="mt-0.5 truncate text-[12px] text-[#64748B]">
                        {p.domain || 'Enterprise'} ·{' '}
                        {p.compliance_framework || 'SOC 2 Type II'}
                      </div>
                    </Link>

                    {isSelectedActive ? (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
                        <Check className="h-3 w-3" />
                        Active
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => handleSetActiveProject(e, p.project_id)}
                        className="shrink-0 cursor-pointer rounded-md border border-[#E2E8F0] bg-white px-2.5 py-1 text-[11.5px] font-medium text-[#475569] transition-colors hover:border-[#39359D] hover:text-[#39359D]"
                      >
                        Set Active
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* Connected Endpoints */}
        <section className="lg:col-span-4 rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
          <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3.5">
            <div>
              <h2 className="text-[15px] font-semibold text-[#0F172A]">
                Connected Endpoints
              </h2>
              <p className="text-[12px] text-[#64748B]">
                Registered data platforms
              </p>
            </div>
            <Link
              to="/connectors"
              className="text-[12.5px] font-medium text-[#39359D] hover:underline"
            >
              Manage →
            </Link>
          </div>

          {systems.length === 0 ? (
            <div className="mt-4 rounded-lg border border-dashed border-[#CBD5E1] bg-[#F8FAFC] p-8 text-center">
              <p className="text-[13.5px] font-medium text-[#0F172A]">
                No connectors yet
              </p>
              <Link
                to="/connectors/new"
                className="mt-3 inline-flex h-8 items-center rounded-lg bg-[#39359D] px-3.5 text-[12.5px] font-medium text-white"
              >
                Add Connector
              </Link>
            </div>
          ) : (
            <div className="mt-2 divide-y divide-[#F1F5F9]">
              {systems.slice(0, 5).map((sys) => (
                <Link
                  key={sys.system_id}
                  to="/connectors/$systemId"
                  params={{ systemId: sys.system_id }}
                  className="flex items-center justify-between gap-3 rounded-lg px-2 py-3 transition-colors hover:bg-[#F8FAFC]"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <ConnectorTechLogo connectorType={sys.connector_type} size="sm" />
                    <div className="min-w-0">
                      <div className="truncate text-[13.5px] font-semibold text-[#0F172A]">
                        {sys.name}
                      </div>
                      <div className="text-[11px] uppercase tracking-wide text-[#64748B]">
                        {sys.connector_type} · {sys.environment}
                      </div>
                    </div>
                  </div>
                  <span className="shrink-0 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] px-2 py-0.5 text-[10.5px] font-medium text-[#475569]">
                    {sys.kind}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Canonical Ontologies */}
        <section className="lg:col-span-3 rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
          <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3.5">
            <div>
              <h2 className="text-[15px] font-semibold text-[#0F172A]">
                Ontologies
              </h2>
              <p className="text-[12px] text-[#64748B]">Semantic models</p>
            </div>
            <Link
              to="/ontology"
              className="text-[12.5px] font-medium text-[#39359D] hover:underline"
            >
              All →
            </Link>
          </div>

          {ontologies.length === 0 ? (
            <div className="mt-4 rounded-lg border border-dashed border-[#CBD5E1] bg-[#F8FAFC] p-8 text-center">
              <p className="text-[13.5px] font-medium text-[#0F172A]">
                No ontologies yet
              </p>
              <Link
                to="/ontology/new"
                className="mt-3 inline-flex h-8 items-center rounded-lg bg-[#39359D] px-3.5 text-[12.5px] font-medium text-white"
              >
                New Ontology
              </Link>
            </div>
          ) : (
            <div className="mt-2 divide-y divide-[#F1F5F9]">
              {ontologies.slice(0, 5).map((ont) => (
                <Link
                  key={ont.ontology_version_id}
                  to="/ontology/$ontologyId"
                  params={{ ontologyId: ont.ontology_version_id }}
                  className="block rounded-lg px-2 py-3 transition-colors hover:bg-[#F8FAFC]"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-[13.5px] font-semibold text-[#0F172A]">
                      {ont.name}
                    </span>
                    <span className="shrink-0 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] px-1.5 py-0.5 font-mono text-[10.5px] text-[#475569]">
                      {ont.version_tag || 'v1.0'}
                    </span>
                  </div>
                  <div className="mt-1 text-[11.5px] text-[#64748B]">
                    {ont.entities?.length || 0} entities ·{' '}
                    {ont.relationships?.length || 0} links
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}