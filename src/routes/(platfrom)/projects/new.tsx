import { useEffect, useState } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { Loader2, ArrowLeft } from 'lucide-react'
import { CustomSelect } from '../../../components/CustomSelect'
import { ApiError } from '../../../lib/authApi'
import { activeProjectStorage, projectsApi } from '../../../lib/api/projectsApi'

export const Route = createFileRoute('/(platfrom)/projects/new')({
  component: NewProjectPage,
})

const DOMAINS = [
  'Financial Services',
  'Supply Chain & ERP',
  'Healthcare & Life Sciences',
  'Retail & E-Commerce',
  'Manufacturing & Logistics',
  'Telecommunications',
  'Public Sector',
]

const METHODOLOGIES = [
  'Phased Wave Migration',
  'Big Bang Cutover',
  'Parallel Dual-Run',
  'Trickle / CDC Sync',
]

const COMPLIANCE_FRAMEWORKS = [
  'SOC 2 Type II',
  'ISO 27001',
  'GDPR',
  'HIPAA',
  'PCI-DSS',
  'Internal Governance Only',
]

const CLASSIFICATIONS = ['CONFIDENTIAL', 'RESTRICTED', 'INTERNAL', 'PUBLIC']

const REHEARSAL_STRATEGIES = [
  'Full Mock Dress Rehearsal in TEST',
  '10% Stratified Sample Dry-Run',
  'Schema-Only Pre-Flight Validation',
  'Shadow Parallel Verification',
]

function NewProjectPage() {
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [ownersInput, setOwnersInput] = useState('')
  const [domain, setDomain] = useState('Supply Chain & ERP')
  const [estimatedVolume, setEstimatedVolume] = useState('1M – 10M rows')
  const [targetCutoverDate, setTargetCutoverDate] = useState('')
  const [methodology, setMethodology] = useState('Phased Wave Migration')
  const [plannedWaves, setPlannedWaves] = useState('3')
  const [rehearsalStrategy, setRehearsalStrategy] = useState(
    'Full Mock Dress Rehearsal in TEST'
  )
  const [complianceFramework, setComplianceFramework] = useState('SOC 2 Type II')
  const [dataClassification, setDataClassification] = useState('CONFIDENTIAL')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem('ms_user_profile')
      if (raw) {
        const profile = JSON.parse(raw)
        if (profile?.email && !ownersInput) {
          setOwnersInput(profile.email)
        }
      }
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading) return
    setError(null)
    setLoading(true)

    const owners = ownersInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)

    try {
      const created = await projectsApi.create({
        name: name.trim(),
        description: description.trim() || undefined,
        owners,
        domain,
        methodology,
        estimated_volume: estimatedVolume.trim() || undefined,
        target_cutover_date: targetCutoverDate || undefined,
        compliance_framework: complianceFramework,
        data_classification: dataClassification,
        planned_waves: Number(plannedWaves) || 1,
        rehearsal_strategy: rehearsalStrategy,
      })

      activeProjectStorage.set(created.project_id)

      navigate({
        to: '/projects/$projectId',
        params: { projectId: created.project_id },
      })
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Failed to create project.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Link
          to="/projects"
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#64748B] hover:text-[#0F172A]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Projects
        </Link>
        <h1 className="mt-2 text-[24px] sm:text-[28px] font-semibold tracking-[-0.025em] text-[#0F172A]">
          Create New Project
        </h1>
        <p className="mt-1 text-[14px] text-[#64748B]">
          Configure project metadata, delivery schedule, and governance controls. DEV, TEST, and PROD environments are provisioned automatically.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="divide-y divide-[#E2E8F0] rounded-xl border border-[#E2E8F0] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.03)]"
      >
        {error && (
          <div className="p-6 pb-0">
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-[13px] text-rose-700">
              {error}
            </div>
          </div>
        )}

        {/* Section 1: General */}
        <div className="space-y-4 p-6 sm:p-7">
          <div>
            <h2 className="text-[15px] font-semibold text-[#0F172A]">
              General Information
            </h2>
            <p className="text-[12.5px] text-[#64748B]">
              Core identity, business domain, and project owners.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label
                htmlFor="proj-name"
                className="block text-[12.5px] font-medium text-[#334155]"
              >
                Project Name <span className="text-rose-500">*</span>
              </label>
              <input
                id="proj-name"
                type="text"
                required
                disabled={loading}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Global Procurement Modernization"
                className="h-10 w-full rounded-lg border border-[#E2E8F0] bg-white px-3 text-[13.5px] text-[#0F172A] placeholder:text-[#94A3B8] outline-none focus:border-[#39359D] focus:ring-2 focus:ring-[#39359D]/12"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[12.5px] font-medium text-[#334155]">
                Business Domain
              </label>
              <CustomSelect
                value={domain}
                onChange={setDomain}
                options={DOMAINS}
                disabled={loading}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="proj-desc"
              className="block text-[12.5px] font-medium text-[#334155]"
            >
              Description &amp; Scope
            </label>
            <textarea
              id="proj-desc"
              rows={3}
              disabled={loading}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Outline business units, key tables in scope, and cutover goals..."
              className="w-full rounded-lg border border-[#E2E8F0] bg-white p-3 text-[13.5px] text-[#0F172A] placeholder:text-[#94A3B8] outline-none focus:border-[#39359D] focus:ring-2 focus:ring-[#39359D]/12"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="proj-owners"
              className="block text-[12.5px] font-medium text-[#334155]"
            >
              Project Owners (comma-separated emails)
            </label>
            <input
              id="proj-owners"
              type="text"
              disabled={loading}
              value={ownersInput}
              onChange={(e) => setOwnersInput(e.target.value)}
              placeholder="architect@company.com, lead@company.com"
              className="h-10 w-full rounded-lg border border-[#E2E8F0] bg-white px-3 text-[13.5px] text-[#0F172A] placeholder:text-[#94A3B8] outline-none focus:border-[#39359D] focus:ring-2 focus:ring-[#39359D]/12"
            />
          </div>
        </div>

        {/* Section 2: Delivery & Scale Metadata */}
        <div className="space-y-4 p-6 sm:p-7">
          <div>
            <h2 className="text-[15px] font-semibold text-[#0F172A]">
              Delivery &amp; Scale Metadata
            </h2>
            <p className="text-[12.5px] text-[#64748B]">
              Volume estimates, rollout methodology, and target cutover schedule.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <label className="block text-[12.5px] font-medium text-[#334155]">
                Methodology
              </label>
              <CustomSelect
                value={methodology}
                onChange={setMethodology}
                options={METHODOLOGIES}
                disabled={loading}
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="proj-waves"
                className="block text-[12.5px] font-medium text-[#334155]"
              >
                Planned Waves
              </label>
              <input
                id="proj-waves"
                type="number"
                min={1}
                max={50}
                disabled={loading}
                value={plannedWaves}
                onChange={(e) => setPlannedWaves(e.target.value)}
                className="h-10 w-full rounded-lg border border-[#E2E8F0] bg-white px-3 text-[13.5px] text-[#0F172A] outline-none focus:border-[#39359D] focus:ring-2 focus:ring-[#39359D]/12"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="proj-cutover"
                className="block text-[12.5px] font-medium text-[#334155]"
              >
                Target Cutover Date
              </label>
              <input
                id="proj-cutover"
                type="date"
                disabled={loading}
                value={targetCutoverDate}
                onChange={(e) => setTargetCutoverDate(e.target.value)}
                className="h-10 w-full rounded-lg border border-[#E2E8F0] bg-white px-3 text-[13.5px] text-[#0F172A] outline-none focus:border-[#39359D] focus:ring-2 focus:ring-[#39359D]/12"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label
                htmlFor="proj-volume"
                className="block text-[12.5px] font-medium text-[#334155]"
              >
                Estimated Data Volume
              </label>
              <input
                id="proj-volume"
                type="text"
                disabled={loading}
                value={estimatedVolume}
                onChange={(e) => setEstimatedVolume(e.target.value)}
                placeholder="e.g. 25M rows / 140 GB"
                className="h-10 w-full rounded-lg border border-[#E2E8F0] bg-white px-3 text-[13.5px] text-[#0F172A] placeholder:text-[#94A3B8] outline-none focus:border-[#39359D] focus:ring-2 focus:ring-[#39359D]/12"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[12.5px] font-medium text-[#334155]">
                Rehearsal Strategy
              </label>
              <CustomSelect
                value={rehearsalStrategy}
                onChange={setRehearsalStrategy}
                options={REHEARSAL_STRATEGIES}
                disabled={loading}
              />
            </div>
          </div>
        </div>

        {/* Section 3: Security & Compliance */}
        <div className="space-y-4 p-6 sm:p-7">
          <div>
            <h2 className="text-[15px] font-semibold text-[#0F172A]">
              Security &amp; Compliance
            </h2>
            <p className="text-[12.5px] text-[#64748B]">
              Regulatory posture and data sensitivity classification.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="block text-[12.5px] font-medium text-[#334155]">
                Compliance Framework
              </label>
              <CustomSelect
                value={complianceFramework}
                onChange={setComplianceFramework}
                options={COMPLIANCE_FRAMEWORKS}
                disabled={loading}
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[12.5px] font-medium text-[#334155]">
                Data Classification
              </label>
              <CustomSelect
                value={dataClassification}
                onChange={setDataClassification}
                options={CLASSIFICATIONS}
                disabled={loading}
              />
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 bg-[#F8FAFC] px-6 py-4 rounded-b-xl">
          <Link
            to="/projects"
            className="inline-flex h-9 items-center rounded-lg border border-[#E2E8F0] bg-white px-4 text-[13px] font-medium text-[#334155] hover:bg-[#F8FAFC]"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg bg-[#39359D] px-5 text-[13px] font-medium text-white shadow-xs transition-colors hover:bg-[#2E2A82] disabled:opacity-60"
          >
            {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {loading ? 'Creating...' : 'Create Project'}
          </button>
        </div>
      </form>
    </div>
  )
}