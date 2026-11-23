import React, { useEffect, useState } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  FolderKanban,
  GitBranch,
  Layers,
  Loader2,
  Plus,
  Sparkles,
  Tag,
  Trash2,
} from 'lucide-react'
import { CustomSelect } from '../../../components/CustomSelect'
import { ApiError } from '../../../lib/authApi'
import {
  activeProjectStorage,
  projectsApi,
  type ProjectItem,
} from '../../../lib/api/projectsApi'
import {
  ontologiesApi,
  type OntologyEntity,
  type OntologyRelationship,
} from '../../../lib/api/ontologiesApi'

export const Route = createFileRoute('/(platfrom)/ontology/new')({
  component: NewOntologyPage,
})

const DOMAIN_OPTIONS = [
  { value: 'Retail & E-Commerce', label: 'Retail & E-Commerce' },
  { value: 'Healthcare & Life Sciences', label: 'Healthcare & Life Sciences' },
  { value: 'Financial Services & Banking', label: 'Financial Services & Banking' },
  { value: 'Supply Chain & Logistics', label: 'Supply Chain & Logistics' },
  { value: 'CRM & Customer Operations', label: 'CRM & Customer Operations' },
  { value: 'SaaS & Product Telemetry', label: 'SaaS & Product Telemetry' },
  { value: 'Telecommunications', label: 'Telecommunications' },
  { value: 'Custom Domain', label: 'Custom Domain (Type below)' },
]

interface BlueprintPreset {
  id: string
  title: string
  subtitle: string
  icon: string
  entities: OntologyEntity[]
  relationships: OntologyRelationship[]
}

const BLUEPRINT_PRESETS: BlueprintPreset[] = [
  {
    id: 'empty',
    title: 'Blank Canvas',
    subtitle: 'Start with 0 entities. Add manually or use AI Architect inside the studio.',
    icon: '✨',
    entities: [],
    relationships: [],
  },
  {
    id: 'ecommerce',
    title: 'E-Commerce & Orders',
    subtitle: 'Pre-configures Customer, Order, OrderItem, and Product with 1:N relations.',
    icon: '🛍️',
    entities: [
      {
        entity_id: 'ent-customer',
        name: 'Customer',
        description: 'Retail consumer account and demographic profile',
        position: { x: 50, y: 50 },
        attributes: [
          { name: 'customer_id', datatype: 'uuid', is_pk: true, nullable: false, description: 'Unique customer identifier' },
          { name: 'email', datatype: 'string', is_pk: false, nullable: false, description: 'Customer primary email address' },
          { name: 'full_name', datatype: 'string', is_pk: false, nullable: false, description: 'Customer legal full name' },
          { name: 'tier', datatype: 'string', is_pk: false, nullable: true, description: 'Loyalty segment tier (Standard, VIP)' },
          { name: 'created_at', datatype: 'timestamptz', is_pk: false, nullable: false, description: 'Registration timestamp' },
        ],
      },
      {
        entity_id: 'ent-order',
        name: 'Order',
        description: 'Commercial sales transaction record',
        position: { x: 420, y: 50 },
        attributes: [
          { name: 'order_id', datatype: 'uuid', is_pk: true, nullable: false, description: 'Sales order reference ID' },
          { name: 'customer_id', datatype: 'uuid', is_pk: false, is_fk: true, nullable: false, description: 'Purchasing customer FK' },
          { name: 'order_status', datatype: 'string', is_pk: false, nullable: false, description: 'Status (pending, fulfilled, cancelled)' },
          { name: 'total_amount', datatype: 'numeric', is_pk: false, nullable: false, description: 'Net order total after discounts' },
          { name: 'order_date', datatype: 'timestamptz', is_pk: false, nullable: false, description: 'Order placement timestamp' },
        ],
      },
      {
        entity_id: 'ent-order-item',
        name: 'OrderItem',
        description: 'Individual line item within an order',
        position: { x: 420, y: 380 },
        attributes: [
          { name: 'item_id', datatype: 'uuid', is_pk: true, nullable: false, description: 'Unique line item identifier' },
          { name: 'order_id', datatype: 'uuid', is_pk: false, is_fk: true, nullable: false, description: 'Parent order reference FK' },
          { name: 'product_id', datatype: 'uuid', is_pk: false, is_fk: true, nullable: false, description: 'Referenced product catalog item FK' },
          { name: 'quantity', datatype: 'integer', is_pk: false, nullable: false, description: 'Units purchased' },
          { name: 'unit_price', datatype: 'numeric', is_pk: false, nullable: false, description: 'Price per item at purchase time' },
        ],
      },
      {
        entity_id: 'ent-product',
        name: 'Product',
        description: 'Master goods or service catalog definition',
        position: { x: 50, y: 380 },
        attributes: [
          { name: 'product_id', datatype: 'uuid', is_pk: true, nullable: false, description: 'Catalog SKU or internal identifier' },
          { name: 'sku', datatype: 'string', is_pk: false, nullable: false, description: 'Stock keeping unit code' },
          { name: 'title', datatype: 'string', is_pk: false, nullable: false, description: 'Display marketing title' },
          { name: 'category', datatype: 'string', is_pk: false, nullable: true, description: 'Merchandise taxonomy category' },
          { name: 'list_price', datatype: 'numeric', is_pk: false, nullable: false, description: 'MSRP catalog price' },
        ],
      },
    ],
    relationships: [
      {
        relationship_id: 'rel-cust-order',
        source_entity: 'Customer',
        target_entity: 'Order',
        cardinality: '1:N',
        relation_type: 'HAS_MANY',
        label: 'places',
        source_attribute: 'customer_id',
        target_attribute: 'customer_id',
      },
      {
        relationship_id: 'rel-order-item',
        source_entity: 'Order',
        target_entity: 'OrderItem',
        cardinality: '1:N',
        relation_type: 'CONTAINS',
        label: 'contains',
        source_attribute: 'order_id',
        target_attribute: 'order_id',
      },
      {
        relationship_id: 'rel-prod-item',
        source_entity: 'Product',
        target_entity: 'OrderItem',
        cardinality: '1:N',
        relation_type: 'REFERENCED_IN',
        label: 'ordered_as',
        source_attribute: 'product_id',
        target_attribute: 'product_id',
      },
    ],
  },
  {
    id: 'healthcare',
    title: 'Healthcare & Clinical',
    subtitle: 'Standard HL7/FHIR pattern: Patient, Encounter, and Clinical Observations.',
    icon: '🏥',
    entities: [
      {
        entity_id: 'ent-patient',
        name: 'Patient',
        description: 'Subject of medical care and clinical services',
        position: { x: 50, y: 50 },
        attributes: [
          { name: 'patient_id', datatype: 'uuid', is_pk: true, nullable: false, description: 'MRN or internal patient ID' },
          { name: 'dob', datatype: 'date', is_pk: false, nullable: false, description: 'Date of birth' },
          { name: 'gender', datatype: 'string', is_pk: false, nullable: true, description: 'Administrative gender' },
          { name: 'active', datatype: 'boolean', is_pk: false, nullable: false, description: 'Active patient status' },
        ],
      },
      {
        entity_id: 'ent-encounter',
        name: 'Encounter',
        description: 'Interaction between patient and healthcare provider',
        position: { x: 420, y: 50 },
        attributes: [
          { name: 'encounter_id', datatype: 'uuid', is_pk: true, nullable: false, description: 'Visit or admission ID' },
          { name: 'patient_id', datatype: 'uuid', is_pk: false, is_fk: true, nullable: false, description: 'Patient receiving care FK' },
          { name: 'class', datatype: 'string', is_pk: false, nullable: false, description: 'Inpatient, Outpatient, Emergency' },
          { name: 'admit_date', datatype: 'timestamptz', is_pk: false, nullable: false, description: 'Admission timestamp' },
        ],
      },
      {
        entity_id: 'ent-observation',
        name: 'Observation',
        description: 'Measurements, vitals, lab results, and diagnostics',
        position: { x: 420, y: 360 },
        attributes: [
          { name: 'observation_id', datatype: 'uuid', is_pk: true, nullable: false, description: 'Observation event record ID' },
          { name: 'encounter_id', datatype: 'uuid', is_pk: false, is_fk: true, nullable: false, description: 'Associated encounter FK' },
          { name: 'code', datatype: 'string', is_pk: false, nullable: false, description: 'LOINC or SNOMED measurement code' },
          { name: 'value', datatype: 'string', is_pk: false, nullable: true, description: 'Recorded observation result' },
        ],
      },
    ],
    relationships: [
      {
        relationship_id: 'rel-patient-encounter',
        source_entity: 'Patient',
        target_entity: 'Encounter',
        cardinality: '1:N',
        relation_type: 'UNDERGOES',
        label: 'admits',
        source_attribute: 'patient_id',
        target_attribute: 'patient_id',
      },
      {
        relationship_id: 'rel-encounter-observation',
        source_entity: 'Encounter',
        target_entity: 'Observation',
        cardinality: '1:N',
        relation_type: 'RECORDS',
        label: 'measures',
        source_attribute: 'encounter_id',
        target_attribute: 'encounter_id',
      },
    ],
  },
]

function NewOntologyPage() {
  const navigate = useNavigate()

  // Form State
  const [name, setName] = useState('')
  const [domainSelection, setDomainSelection] = useState(DOMAIN_OPTIONS[0].value)
  const [customDomain, setCustomDomain] = useState('')
  const [versionTag, setVersionTag] = useState('v1.0.0')
  const [description, setDescription] = useState('')
  const [selectedPresetId, setSelectedPresetId] = useState('ecommerce')

  // Projects State
  const [projects, setProjects] = useState<ProjectItem[]>([])
  const [projectId, setProjectId] = useState<string>('')
  const [loadingProjects, setLoadingProjects] = useState(true)

  // Custom Metadata Tags
  const [metadataTags, setMetadataTags] = useState<{ key: string; value: string }[]>([
    { key: 'governance', value: 'approved' },
  ])

  // Submission State
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load Projects on mount
  useEffect(() => {
    let active = true
    const loadProjects = async () => {
      try {
        const list = await projectsApi.list()
        if (!active) return
        setProjects(list || [])
        const currentActive = activeProjectStorage.get()
        if (currentActive && list.some((p) => p.project_id === currentActive)) {
          setProjectId(currentActive)
        } else if (list.length > 0) {
          setProjectId(list[0].project_id)
        }
      } catch {
        // Fallback to default project if network or store fails
        setProjectId('proj-default')
      } finally {
        if (active) setLoadingProjects(false)
      }
    }
    loadProjects()
    return () => {
      active = false
    }
  }, [])

  const effectiveDomain =
    domainSelection === 'Custom Domain'
      ? customDomain.trim() || 'Custom'
      : domainSelection

  const addTag = () => {
    setMetadataTags((prev) => [...prev, { key: '', value: '' }])
  }

  const removeTag = (idx: number) => {
    setMetadataTags((prev) => prev.filter((_, i) => i !== idx))
  }

  const updateTag = (idx: number, field: 'key' | 'value', val: string) => {
    setMetadataTags((prev) => {
      const next = [...prev]
      next[idx] = { ...next[idx], [field]: val }
      return next
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submitting) return

    const trimmedName = name.trim()
    if (!trimmedName) {
      setError('Please provide an ontology name.')
      return
    }

    setSubmitting(true)
    setError(null)

    const preset = BLUEPRINT_PRESETS.find((p) => p.id === selectedPresetId)
    const initialEntities = preset ? preset.entities : []
    const initialRelationships = preset ? preset.relationships : []

    // Append metadata notes to description if tags provided
    const validTags = metadataTags.filter((t) => t.key.trim() && t.value.trim())
    let fullDescription = description.trim()
    if (validTags.length > 0) {
      const tagsBlock = validTags.map((t) => `${t.key.trim()}: ${t.value.trim()}`).join('; ')
      fullDescription = fullDescription
        ? `${fullDescription}\n\n[Metadata: ${tagsBlock}]`
        : `[Metadata: ${tagsBlock}]`
    }

    try {
      const created = await ontologiesApi.create({
        project_id: projectId || 'proj-default',
        name: trimmedName,
        domain: effectiveDomain,
        version_tag: versionTag.trim() || 'v1.0.0',
        description: fullDescription || undefined,
        entities: initialEntities,
        relationships: initialRelationships,
      })

      // Navigate immediately into the studio with the newly created ontology
      navigate({
        to: '/ontology',
        search: { version_id: created.ontology_version_id },
      })
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Failed to create ontology. Please check metadata and try again.'
      )
      setSubmitting(false)
    }
  }

  const selectedPreset = BLUEPRINT_PRESETS.find((p) => p.id === selectedPresetId)

  return (
    <div className="mx-auto max-w-4xl py-2 space-y-6">
      {/* Top Breadcrumb & Title */}
      <div>
        <Link
          to="/ontology"
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#64748B] hover:text-[#0F172A]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Ontology Studio
        </Link>
        <div className="mt-2 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-[22px] sm:text-[26px] font-semibold tracking-[-0.025em] text-[#0F172A]">
              Create New Ontology
            </h1>
            <p className="text-[13.5px] text-[#64748B]">
              Define domain metadata, standard entity schemas, and semantic relationships for your project.
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50/90 p-4 text-[13px] text-rose-800 shadow-2xs">
          <p className="font-medium">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Core Metadata */}
        <div className="rounded-xl border border-[#E2E8F0] bg-white p-5 sm:p-6 shadow-2xs space-y-5">
          <div className="flex items-center gap-2 border-b border-[#F1F5F9] pb-3">
            <Building2 className="h-4 w-4 text-[#39359D]" />
            <h2 className="text-[15px] font-semibold text-[#0F172A]">
              Ontology Metadata
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Ontology Name */}
            <div className="sm:col-span-2 space-y-1.5">
              <label className="block text-[12.5px] font-medium text-[#334155]">
                Ontology Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Omnichannel Commerce & Customer 360"
                className="h-10 w-full rounded-lg border border-[#E2E8F0] bg-white px-3 text-[13.5px] text-[#0F172A] outline-none transition focus:border-[#39359D] focus:ring-1 focus:ring-[#39359D]/20"
              />
            </div>

            {/* Target Project */}
            <div className="space-y-1.5">
              <label className="block text-[12.5px] font-medium text-[#334155]">
                Target Project
              </label>
              {loadingProjects ? (
                <div className="flex h-10 items-center gap-2 rounded-lg border border-[#E2E8F0] bg-[#FAFAFA] px-3 text-[13px] text-[#94A3B8]">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Loading projects...
                </div>
              ) : (
                <CustomSelect
                  value={projectId}
                  onChange={(val) => setProjectId(val)}
                  options={
                    projects.length > 0
                      ? projects.map((p) => ({
                          value: p.project_id,
                          label: p.name,
                        }))
                      : [{ value: 'proj-default', label: 'Default Project' }]
                  }
                  className="w-full"
                />
              )}
            </div>

            {/* Version Tag */}
            <div className="space-y-1.5">
              <label className="block text-[12.5px] font-medium text-[#334155]">
                Version Tag
              </label>
              <div className="relative">
                <GitBranch className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-[#94A3B8]" />
                <input
                  type="text"
                  value={versionTag}
                  onChange={(e) => setVersionTag(e.target.value)}
                  placeholder="v1.0.0"
                  className="h-10 w-full rounded-lg border border-[#E2E8F0] bg-white pl-9 pr-3 font-mono text-[13px] text-[#0F172A] outline-none transition focus:border-[#39359D] focus:ring-1 focus:ring-[#39359D]/20"
                />
              </div>
            </div>

            {/* Domain Selection */}
            <div className="sm:col-span-2 space-y-1.5">
              <label className="block text-[12.5px] font-medium text-[#334155]">
                Industry Domain
              </label>
              <CustomSelect
                value={domainSelection}
                onChange={(val) => setDomainSelection(val)}
                options={DOMAIN_OPTIONS}
                className="w-full"
              />
              {domainSelection === 'Custom Domain' && (
                <input
                  type="text"
                  value={customDomain}
                  onChange={(e) => setCustomDomain(e.target.value)}
                  placeholder="Enter custom business domain (e.g. Renewable Energy Grid)"
                  className="mt-2 h-10 w-full rounded-lg border border-[#E2E8F0] bg-white px-3 text-[13.5px] text-[#0F172A] outline-none transition focus:border-[#39359D]"
                />
              )}
            </div>

            {/* Description */}
            <div className="sm:col-span-2 space-y-1.5">
              <label className="block text-[12.5px] font-medium text-[#334155]">
                Description & Semantic Scope
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the business concepts, canonical entities, validation boundaries, and transformation goals..."
                className="w-full rounded-lg border border-[#E2E8F0] bg-white p-3 text-[13.5px] text-[#0F172A] outline-none transition focus:border-[#39359D] focus:ring-1 focus:ring-[#39359D]/20"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Blueprint Starter Presets */}
        <div className="rounded-xl border border-[#E2E8F0] bg-white p-5 sm:p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-[#39359D]" />
              <h2 className="text-[15px] font-semibold text-[#0F172A]">
                Starter Blueprint
              </h2>
            </div>
            <span className="text-[12px] text-[#64748B]">
              {selectedPreset?.entities.length || 0} entities · {selectedPreset?.relationships.length || 0} relations
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {BLUEPRINT_PRESETS.map((preset) => {
              const active = selectedPresetId === preset.id
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setSelectedPresetId(preset.id)}
                  className={`flex flex-col text-left rounded-xl border p-4 transition-all cursor-pointer ${
                    active
                      ? 'border-[#39359D] bg-[#39359D]/5 shadow-sm ring-1 ring-[#39359D]'
                      : 'border-[#E2E8F0] bg-white hover:border-[#CBD5E1] hover:bg-[#F8FAFC]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xl">{preset.icon}</span>
                    {active && <CheckCircle2 className="h-4 w-4 text-[#39359D]" />}
                  </div>
                  <h3 className="mt-2.5 text-[14px] font-semibold text-[#0F172A]">
                    {preset.title}
                  </h3>
                  <p className="mt-1 text-[12px] leading-relaxed text-[#64748B]">
                    {preset.subtitle}
                  </p>
                </button>
              )
            })}
          </div>

          {selectedPreset && selectedPreset.entities.length > 0 && (
            <div className="rounded-lg border border-[#E2E8F0] bg-[#FAFAFA] p-3 text-[12px] text-[#475569]">
              <span className="font-semibold text-[#0F172A]">Includes initial entities:</span>{' '}
              {selectedPreset.entities.map((e) => e.name).join(', ')}
            </div>
          )}
        </div>

        {/* Section 3: Custom Governance Tags */}
        <div className="rounded-xl border border-[#E2E8F0] bg-white p-5 sm:p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3">
            <div className="flex items-center gap-2">
              <Tag className="h-4 w-4 text-[#39359D]" />
              <h2 className="text-[15px] font-semibold text-[#0F172A]">
                Governance Tags (Optional)
              </h2>
            </div>
            <button
              type="button"
              onClick={addTag}
              className="inline-flex items-center gap-1 text-[12px] font-medium text-[#39359D] hover:underline"
            >
              <Plus className="h-3 w-3" />
              Add Tag
            </button>
          </div>

          {metadataTags.length === 0 ? (
            <p className="text-[12.5px] text-[#94A3B8]">
              No custom tags attached. Click "Add Tag" to attach compliance or department keys.
            </p>
          ) : (
            <div className="space-y-2.5">
              {metadataTags.map((tag, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={tag.key}
                    onChange={(e) => updateTag(idx, 'key', e.target.value)}
                    placeholder="Key (e.g. compliance)"
                    className="h-9 flex-1 rounded-lg border border-[#E2E8F0] bg-white px-3 font-mono text-[12px] text-[#0F172A] outline-none focus:border-[#39359D]"
                  />
                  <input
                    type="text"
                    value={tag.value}
                    onChange={(e) => updateTag(idx, 'value', e.target.value)}
                    placeholder="Value (e.g. SOC2_Type_II)"
                    className="h-9 flex-1 rounded-lg border border-[#E2E8F0] bg-white px-3 font-mono text-[12px] text-[#0F172A] outline-none focus:border-[#39359D]"
                  />
                  <button
                    type="button"
                    onClick={() => removeTag(idx)}
                    title="Remove tag"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[#94A3B8] hover:bg-rose-50 hover:text-rose-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link
            to="/ontology"
            className="inline-flex h-10 items-center justify-center rounded-lg border border-[#E2E8F0] bg-white px-4 text-[13px] font-medium text-[#475569] shadow-2xs hover:bg-[#F8FAFC]"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#39359D] px-5 text-[13px] font-semibold text-white shadow-2xs transition-all hover:bg-[#2E2A82] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating Ontology...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Create & Open Studio
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
