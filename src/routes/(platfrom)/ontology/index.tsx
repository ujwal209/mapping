import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  FileText,
  GitBranch,
  Hand,
  KeyRound,
  Layers,
  LayoutGrid,
  Link2,
  Loader2,
  Map,
  Maximize2,
  MessageSquare,
  MessageSquarePlus,
  Minus,
  MousePointer2,
  Network,
  PanelLeftClose,
  PanelLeftOpen,
  Play,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  Send,
  Shrink,
  Sparkles,
  Table2,
  Trash2,
  X,
  ZoomIn,
  ZoomOut,
  Expand,
} from 'lucide-react'
import { CustomSelect } from '../../../components/CustomSelect'
import { ApiError } from '../../../lib/authApi'
import {
  activeProjectStorage,
  projectsApi,
  type ProjectItem,
} from '../../../lib/api/projectsApi'
import {
  ontologyApi,
  type OntologyAttribute,
  type OntologyEntity,
  type OntologyModel,
  type OntologyRelationship,
} from '../../../lib/api/ontologiesApi'

export const Route = createFileRoute('/(platfrom)/ontology/')({
  validateSearch: (search: Record<string, unknown>): { version_id?: string } => ({
    version_id:
      typeof search.version_id === 'string' && search.version_id.trim()
        ? search.version_id
        : undefined,
  }),
  component: OntologyStudioPage,
})

/* ═══════════════════════════════════════════════════════════════
   MAIN PAGE: REGISTRY + DRAGGABLE CANVAS + ARCHITECT AGENT
   ═══════════════════════════════════════════════════════════════ */
function OntologyStudioPage() {
  const { version_id } = Route.useSearch()

  // Project & Registry State
  const [projects, setProjects] = useState<ProjectItem[]>([])
  const [projectId, setProjectId] = useState<string>(
    activeProjectStorage.get() || ''
  )
  const [ontologies, setOntologies] = useState<OntologyModel[]>([])
  const [loadingList, setLoadingList] = useState(true)
  const [listError, setListError] = useState<string | null>(null)
  const [registrySearch, setRegistrySearch] = useState('')

  // Active Builder State
  const [viewMode, setViewMode] = useState<'registry' | 'builder'>(
    version_id ? 'builder' : 'registry'
  )
  const [selectedOntology, setSelectedOntology] =
    useState<OntologyModel | null>(null)
  const [loadingOnt, setLoadingOnt] = useState(false)
  const [activeTab, setActiveTab] = useState<
    'graph' | 'table' | 'relationships'
  >('graph')
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  // Agent Workspace Toggle
  const [isAgentOpen, setIsAgentOpen] = useState(false)

  // Custom Delete Confirmation Modal State
  const [deleteTarget, setDeleteTarget] = useState<OntologyModel | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Entity / Attribute / Relationship Modal State
  const [entityModalOpen, setEntityModalOpen] = useState(false)
  const [editingEntityIdx, setEditingEntityIdx] = useState<number | null>(null)
  const [entityNameInput, setEntityNameInput] = useState('')
  const [entityDescInput, setEntityDescInput] = useState('')

  const [attrModalEntityIdx, setAttrModalEntityIdx] = useState<number | null>(
    null
  )
  const [attrName, setAttrName] = useState('')
  const [attrType, setAttrType] = useState('string')
  const [attrIsPk, setAttrIsPk] = useState(false)
  const [attrIsFk, setAttrIsFk] = useState(false)
  const [attrNullable, setAttrNullable] = useState(true)

  const [relModalOpen, setRelModalOpen] = useState(false)
  const [relSource, setRelSource] = useState('')
  const [relTarget, setRelTarget] = useState('')
  const [relCardinality, setRelCardinality] = useState('1:N')
  const [relLabel, setRelLabel] = useState('')

  // Draggable Canvas Viewport & Node Dragging State
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 40, y: 40 })
  const [isPanning, setIsPanning] = useState(false)
  const panStartRef = useRef({ x: 0, y: 0 })

  const [canvasTool, setCanvasTool] = useState<'hand' | 'select'>('hand')
  const [showMinimap, setShowMinimap] = useState(true)
  const [selectedEntityIds, setSelectedEntityIds] = useState<string[]>([])
  const [selectionBox, setSelectionBox] = useState<{
    startX: number
    startY: number
    currentX: number
    currentY: number
  } | null>(null)
  const isSelectingRef = useRef(false)
  const latestDragPosRef = useRef<{ idx: number; pos: { x: number; y: number } } | null>(null)

  const [draggingEntityIdx, setDraggingEntityIdx] = useState<number | null>(
    null
  )
  const dragOffsetRef = useRef({ x: 0, y: 0 })
  const canvasRef = useRef<HTMLDivElement>(null)

  const notify = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast((cur) => (cur === msg ? null : cur)), 2500)
  }

  // Load projects
  useEffect(() => {
    projectsApi
      .list()
      .then((list) => {
        setProjects(list)
        const stored = activeProjectStorage.get()
        if (stored && list.some((p) => p.project_id === stored)) {
          setProjectId(stored)
        } else if (list.length > 0 && !projectId) {
          setProjectId(list[0].project_id)
        }
      })
      .catch(() => {})
  }, [])

  // Ensure every entity has deterministic x/y coordinates
  const normalizeEntityPositions = useCallback(
    (ont: OntologyModel): OntologyModel => {
      const cols = 3
      const spacingX = 320
      const spacingY = 270
      const entities = (ont.entities || []).map((ent, idx) => {
        if (
          ent.position &&
          typeof ent.position.x === 'number' &&
          typeof ent.position.y === 'number'
        ) {
          return ent
        }
        return {
          ...ent,
          position: {
            x: (idx % cols) * spacingX + 40,
            y: Math.floor(idx / cols) * spacingY + 40,
          },
        }
      })
      return {
        ...ont,
        entities,
        relationships: ont.relationships || [],
      }
    },
    []
  )

  const loadOntologies = useCallback(
    async (selectVersionId?: string) => {
      setLoadingList(true)
      setListError(null)
      try {
        const list = await ontologyApi.list(projectId || undefined)
        setOntologies(list || [])
        const targetId = selectVersionId || version_id
        if (targetId) {
          const found = (list || []).find(
            (o) => o.ontology_version_id === targetId
          )
          if (found) {
            setSelectedOntology(normalizeEntityPositions(found))
            setViewMode('builder')
            setDirty(false)
          } else {
            const single = await ontologyApi.get(targetId)
            if (single) {
              setSelectedOntology(normalizeEntityPositions(single))
              setViewMode('builder')
              setDirty(false)
            }
          }
        }
      } catch (err) {
        setListError(
          err instanceof ApiError
            ? err.message
            : 'Unable to load ontologies.'
        )
      } finally {
        setLoadingList(false)
      }
    },
    [projectId, version_id, normalizeEntityPositions]
  )

  useEffect(() => {
    loadOntologies()
  }, [loadOntologies])

  const openBuilder = async (ont: OntologyModel) => {
    setLoadingOnt(true)
    try {
      const fresh = await ontologyApi.get(ont.ontology_version_id)
      setSelectedOntology(normalizeEntityPositions(fresh || ont))
    } catch {
      setSelectedOntology(normalizeEntityPositions(ont))
    } finally {
      setLoadingOnt(false)
      setViewMode('builder')
      setActiveTab('graph')
      setDirty(false)
      setPan({ x: 30, y: 30 })
      setZoom(1)
    }
  }

  const handleSaveOntology = async (overrideOnt?: OntologyModel, silent = false) => {
    const target = overrideOnt || selectedOntology
    if (!target) return
    setSaving(true)
    try {
      const cleanEntities = (target.entities || []).map((ent, i) => ({
        entity_id: ent.entity_id,
        name: ent.name,
        label: ent.label || ent.name,
        description: ent.description || '',
        category: ent.category || 'Master Data',
        position: getEntityPos(ent, i),
        attributes: (ent.attributes || []).map((a) => ({
          ...a,
          is_pk: a.is_pk ?? a.is_primary_key ?? false,
          is_primary_key: a.is_primary_key ?? a.is_pk ?? false,
          is_fk: a.is_fk ?? a.is_foreign_key ?? false,
          is_foreign_key: a.is_foreign_key ?? a.is_fk ?? false,
          nullable: a.nullable ?? a.is_nullable ?? true,
          is_nullable: a.is_nullable ?? a.nullable ?? true,
        })),
      }))

      const entMap = new Map<string, OntologyEntity>()
      cleanEntities.forEach((e) => {
        entMap.set(e.name.toLowerCase(), e)
        if (e.entity_id) entMap.set(e.entity_id.toLowerCase(), e)
      })

      const cleanRels = (target.relationships || []).map((r) => {
        const srcRef = (r.source_entity || r.source_entity_name || r.source_entity_id || '').toLowerCase()
        const tgtRef = (r.target_entity || r.target_entity_name || r.target_entity_id || '').toLowerCase()
        const srcEnt = entMap.get(srcRef)
        const tgtEnt = entMap.get(tgtRef)
        const srcName = srcEnt?.name || r.source_entity || r.source_entity_name || 'src'
        const tgtName = tgtEnt?.name || r.target_entity || r.target_entity_name || 'tgt'
        const label = r.label || 'rel'

        return {
          relationship_id: r.relationship_id,
          name: r.name || `${srcName}_${label}_${tgtName}`,
          label,
          source_entity: srcName,
          source_entity_name: srcName,
          source_entity_id: srcEnt?.entity_id || r.source_entity_id || '',
          target_entity: tgtName,
          target_entity_name: tgtName,
          target_entity_id: tgtEnt?.entity_id || r.target_entity_id || '',
          cardinality: r.cardinality || '1:N',
          relation_type: r.relation_type || 'ASSOCIATION',
          description: r.description || '',
        }
      })

      const updated = await ontologyApi.update(target.ontology_version_id, {
        name: target.name,
        domain: target.domain,
        version_tag: target.version_tag,
        description: target.description,
        entities: cleanEntities,
        relationships: cleanRels,
      })
      const normalized = normalizeEntityPositions(updated || target)
      setSelectedOntology(normalized)
      setOntologies((prev) =>
        prev.map((o) =>
          o.ontology_version_id === normalized.ontology_version_id
            ? normalized
            : o
        )
      )
      setDirty(false)
      if (!silent) notify('Ontology saved')
      return normalized
    } catch (err) {
      if (!silent) {
        notify(
          err instanceof ApiError ? err.message : 'Failed to save ontology'
        )
      }
    } finally {
      setSaving(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await ontologyApi.delete(deleteTarget.ontology_version_id)
      setOntologies((prev) =>
        prev.filter(
          (o) => o.ontology_version_id !== deleteTarget.ontology_version_id
        )
      )
      if (
        selectedOntology?.ontology_version_id ===
        deleteTarget.ontology_version_id
      ) {
        setSelectedOntology(null)
        setViewMode('registry')
      }
      setDeleteTarget(null)
      notify('Ontology deleted')
    } catch {
      notify('Failed to delete ontology')
    } finally {
      setDeleting(false)
    }
  }

  const getEntityPos = useCallback(
    (ent: OntologyEntity, fallbackIdx: number) => {
      if (
        ent.position &&
        typeof ent.position.x === 'number' &&
        typeof ent.position.y === 'number'
      ) {
        return ent.position
      }
      return {
        x: (fallbackIdx % 3) * 320 + 40,
        y: Math.floor(fallbackIdx / 3) * 270 + 40,
      }
    },
    []
  )

  /* ── Draggable Canvas Handlers & Tools ─────────────────────── */
  const getMinimapBounds = useCallback(() => {
    if (!selectedOntology || selectedOntology.entities.length === 0) {
      return { minX: 0, minY: 0, w: 1000, h: 700 }
    }
    const cardW = 268
    const cardH = 200
    let minX = 0
    let minY = 0
    let maxX = 1000
    let maxY = 700
    selectedOntology.entities.forEach((ent, i) => {
      const pos = getEntityPos(ent, i)
      if (pos.x < minX) minX = pos.x
      if (pos.y < minY) minY = pos.y
      if (pos.x + cardW > maxX) maxX = pos.x + cardW
      if (pos.y + cardH > maxY) maxY = pos.y + cardH
    })
    const pad = 80
    minX -= pad
    minY -= pad
    maxX += pad
    maxY += pad
    return {
      minX,
      minY,
      w: Math.max(600, maxX - minX),
      h: Math.max(400, maxY - minY),
    }
  }, [selectedOntology, getEntityPos])

  const handleMinimapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const clickY = e.clientY - rect.top
    const bounds = getMinimapBounds()
    const scaleX = 190 / bounds.w
    const scaleY = 130 / bounds.h
    const scale = Math.min(scaleX, scaleY)

    const targetWorldX = bounds.minX + clickX / scale
    const targetWorldY = bounds.minY + clickY / scale

    const clientW = canvasRef.current?.clientWidth || 1000
    const clientH = canvasRef.current?.clientHeight || 700

    const nextPanX = clientW / 2 - targetWorldX * zoom
    const nextPanY = clientH / 2 - targetWorldY * zoom
    setPan({ x: Math.round(nextPanX), y: Math.round(nextPanY) })
  }

  const handleFitView = useCallback(() => {
    if (!selectedOntology || selectedOntology.entities.length === 0 || !canvasRef.current) return
    const cardW = 268
    const cardH = 200
    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity

    selectedOntology.entities.forEach((ent, i) => {
      const pos = getEntityPos(ent, i)
      if (pos.x < minX) minX = pos.x
      if (pos.y < minY) minY = pos.y
      if (pos.x + cardW > maxX) maxX = pos.x + cardW
      if (pos.y + cardH > maxY) maxY = pos.y + cardH
    })

    const rect = canvasRef.current.getBoundingClientRect()
    const contentW = maxX - minX + 120
    const contentH = maxY - minY + 120
    const scaleX = rect.width / contentW
    const scaleY = rect.height / contentH
    const nextZoom = Math.min(1.2, Math.max(0.45, Math.min(scaleX, scaleY)))
    const nextPanX = (rect.width - (maxX - minX) * nextZoom) / 2 - minX * nextZoom
    const nextPanY = (rect.height - (maxY - minY) * nextZoom) / 2 - minY * nextZoom
    setZoom(+nextZoom.toFixed(2))
    setPan({ x: Math.round(nextPanX), y: Math.round(nextPanY) })
  }, [selectedOntology, getEntityPos])

  const handleEntityPointerDown = (
    e: React.PointerEvent,
    idx: number
  ) => {
    if ((e.target as HTMLElement).closest('button')) return
    e.stopPropagation()
    if (!selectedOntology) return
    const ent = selectedOntology.entities[idx]

    // If Select Tool is active, toggle/set selection
    if (canvasTool === 'select') {
      const entId = ent.entity_id || String(idx)
      if (e.shiftKey) {
        setSelectedEntityIds((prev) =>
          prev.includes(entId) ? prev.filter((id) => id !== entId) : [...prev, entId]
        )
      } else {
        setSelectedEntityIds([entId])
      }
    }

    const pos = getEntityPos(ent, idx)
    setDraggingEntityIdx(idx)
    dragOffsetRef.current = {
      x: e.clientX / zoom - pos.x,
      y: e.clientY / zoom - pos.y,
    }
    latestDragPosRef.current = { idx, pos }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }

  const handleEntityPointerMove = (e: React.PointerEvent) => {
    if (draggingEntityIdx === null || !selectedOntology) return
    const nextX = Math.max(0, Math.round(e.clientX / zoom - dragOffsetRef.current.x))
    const nextY = Math.max(0, Math.round(e.clientY / zoom - dragOffsetRef.current.y))
    const nextPos = { x: nextX, y: nextY }
    latestDragPosRef.current = { idx: draggingEntityIdx, pos: nextPos }

    setSelectedOntology((prev) => {
      if (!prev) return prev
      const nextEntities = prev.entities.map((ent, idx) =>
        idx === draggingEntityIdx
          ? { ...ent, position: nextPos }
          : ent
      )
      return { ...prev, entities: nextEntities }
    })
    setDirty(true)
  }

  const handleEntityPointerUp = (e: React.PointerEvent) => {
    if (draggingEntityIdx !== null && selectedOntology) {
      const idx = draggingEntityIdx
      const ent = selectedOntology.entities[idx]
      const savedPos =
        latestDragPosRef.current?.idx === idx
          ? latestDragPosRef.current.pos
          : ent?.position

      if (ent && ent.entity_id && savedPos) {
        ontologyApi
          .updateEntity(selectedOntology.ontology_version_id, ent.entity_id, {
            position: savedPos,
          })
          .catch((err) => console.warn('Failed to save entity position to DB:', err))
      }
      setDraggingEntityIdx(null)
      latestDragPosRef.current = null
      try {
        ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
      } catch {}
    }
  }

  const handleCanvasPointerDown = (e: React.PointerEvent) => {
    if (e.target !== e.currentTarget && !(e.target as HTMLElement).dataset.canvasBg) {
      return
    }

    if (canvasTool === 'hand') {
      setIsPanning(true)
      panStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y }
    } else if (canvasTool === 'select') {
      if (!e.shiftKey) {
        setSelectedEntityIds([])
      }
      isSelectingRef.current = true
      setSelectionBox({
        startX: e.clientX,
        startY: e.clientY,
        currentX: e.clientX,
        currentY: e.clientY,
      })
    }
  }

  const handleCanvasPointerMove = (e: React.PointerEvent) => {
    if (canvasTool === 'hand' && isPanning) {
      setPan({
        x: e.clientX - panStartRef.current.x,
        y: e.clientY - panStartRef.current.y,
      })
    } else if (canvasTool === 'select' && isSelectingRef.current) {
      setSelectionBox((prev) =>
        prev
          ? {
              ...prev,
              currentX: e.clientX,
              currentY: e.clientY,
            }
          : null
      )
    }
  }

  const handleCanvasPointerUp = () => {
    if (canvasTool === 'hand') {
      setIsPanning(false)
    } else if (canvasTool === 'select' && isSelectingRef.current && selectionBox && selectedOntology) {
      if (canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect()
        const boxX1 = Math.min(selectionBox.startX, selectionBox.currentX) - rect.left
        const boxY1 = Math.min(selectionBox.startY, selectionBox.currentY) - rect.top
        const boxX2 = Math.max(selectionBox.startX, selectionBox.currentX) - rect.left
        const boxY2 = Math.max(selectionBox.startY, selectionBox.currentY) - rect.top

        // Only select if user actually dragged more than 5px
        if (boxX2 - boxX1 > 5 || boxY2 - boxY1 > 5) {
          const cardW = 268 * zoom
          const cardH = 200 * zoom
          const newlySelected: string[] = []

          selectedOntology.entities.forEach((ent, i) => {
            const pos = getEntityPos(ent, i)
            const screenX = pan.x + pos.x * zoom
            const screenY = pan.y + pos.y * zoom

            // Check AABB rectangle overlap
            const overlaps =
              screenX < boxX2 &&
              screenX + cardW > boxX1 &&
              screenY < boxY2 &&
              screenY + cardH > boxY1

            if (overlaps) {
              newlySelected.push(ent.entity_id || String(i))
            }
          })

          setSelectedEntityIds((prev) => Array.from(new Set([...prev, ...newlySelected])))
        }
      }
      isSelectingRef.current = false
      setSelectionBox(null)
    }
  }

  const handleAutoLayout = async () => {
    if (!selectedOntology) return
    const cols = Math.max(2, Math.ceil(Math.sqrt(selectedOntology.entities.length)))
    const nextEntities = selectedOntology.entities.map((ent, idx) => ({
      ...ent,
      position: {
        x: (idx % cols) * 320 + 50,
        y: Math.floor(idx / cols) * 280 + 50,
      },
    }))
    const updated = { ...selectedOntology, entities: nextEntities }
    setSelectedOntology(updated)
    setOntologies((prev) =>
      prev.map((o) => (o.ontology_version_id === updated.ontology_version_id ? updated : o))
    )
    handleFitView()
    try {
      await ontologyApi.update(selectedOntology.ontology_version_id, {
        entities: nextEntities,
      })
      notify('Auto layout applied and saved')
    } catch (err) {
      console.warn('Auto layout save warning:', err)
    }
  }

  /* ── Entity / Attribute / Relationship CRUD ────────────────── */
  const openCreateEntityModal = () => {
    setEditingEntityIdx(null)
    setEntityNameInput('')
    setEntityDescInput('')
    setEntityModalOpen(true)
  }

  const openEditEntityModal = (idx: number) => {
    if (!selectedOntology) return
    const ent = selectedOntology.entities[idx]
    setEditingEntityIdx(idx)
    setEntityNameInput(ent.name)
    setEntityDescInput(ent.description || '')
    setEntityModalOpen(true)
  }

  const saveEntityModal = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedOntology || !entityNameInput.trim()) return
    const cleanName = entityNameInput.trim().replace(/\s+/g, '_')
    const vId = selectedOntology.ontology_version_id

    try {
      if (editingEntityIdx !== null) {
        const targetEnt = selectedOntology.entities[editingEntityIdx]
        const oldName = targetEnt.name
        let updatedEnt: OntologyEntity
        if (targetEnt.entity_id) {
          updatedEnt = await ontologyApi.updateEntity(vId, targetEnt.entity_id, {
            name: cleanName,
            description: entityDescInput.trim(),
          })
        } else {
          updatedEnt = { ...targetEnt, name: cleanName, description: entityDescInput.trim() }
        }

        const nextEntities = selectedOntology.entities.map((ent, i) =>
          i === editingEntityIdx ? { ...ent, ...updatedEnt, name: cleanName } : ent
        )
        const nextRels = selectedOntology.relationships.map((r) => ({
          ...r,
          source_entity: r.source_entity === oldName ? cleanName : r.source_entity,
          source_entity_name: r.source_entity_name === oldName ? cleanName : r.source_entity_name,
          target_entity: r.target_entity === oldName ? cleanName : r.target_entity,
          target_entity_name: r.target_entity_name === oldName ? cleanName : r.target_entity_name,
        }))
        const nextOnt = { ...selectedOntology, entities: nextEntities, relationships: nextRels }
        setSelectedOntology(nextOnt)
        await handleSaveOntology(nextOnt, true)
        notify(`Updated entity ${cleanName}`)
      } else {
        const count = selectedOntology.entities.length
        const pos = {
          x: (count % 3) * 320 + 60,
          y: Math.floor(count / 3) * 270 + 60,
        }
        const created = await ontologyApi.addEntity(vId, {
          name: cleanName,
          description: entityDescInput.trim(),
          position: pos,
          attributes: [
            {
              name: 'id',
              datatype: 'uuid',
              is_pk: true,
              is_primary_key: true,
              nullable: false,
              is_nullable: false,
            },
          ],
        })
        const newEnt: OntologyEntity = {
          ...created,
          position: created.position || pos,
        }
        const nextOnt = {
          ...selectedOntology,
          entities: [...selectedOntology.entities, newEnt],
        }
        setSelectedOntology(nextOnt)
        setOntologies((prev) =>
          prev.map((o) => (o.ontology_version_id === vId ? nextOnt : o))
        )
        notify(`Added entity ${cleanName}`)
      }
      setEntityModalOpen(false)
    } catch (err: any) {
      notify(err?.message || 'Failed to save entity')
    }
  }

  const deleteEntity = async (idx: number) => {
    if (!selectedOntology) return
    const targetEnt = selectedOntology.entities[idx]
    const targetName = targetEnt.name
    const vId = selectedOntology.ontology_version_id

    try {
      if (targetEnt.entity_id) {
        await ontologyApi.deleteEntity(vId, targetEnt.entity_id)
      }
      const nextEntities = selectedOntology.entities.filter((_, i) => i !== idx)
      const nextRels = selectedOntology.relationships.filter((r) => {
        const srcRef = (r.source_entity || r.source_entity_name || r.source_entity_id || '').toLowerCase()
        const tgtRef = (r.target_entity || r.target_entity_name || r.target_entity_id || '').toLowerCase()
        const matchName = targetName.toLowerCase()
        const matchId = (targetEnt.entity_id || '').toLowerCase()
        return srcRef !== matchName && srcRef !== matchId && tgtRef !== matchName && tgtRef !== matchId
      })
      const nextOnt = { ...selectedOntology, entities: nextEntities, relationships: nextRels }
      setSelectedOntology(nextOnt)
      setOntologies((prev) =>
        prev.map((o) => (o.ontology_version_id === vId ? nextOnt : o))
      )
      notify(`Deleted entity ${targetName}`)
    } catch (err: any) {
      notify(err?.message || 'Failed to delete entity')
    }
  }

  const openAddAttributeModal = (entityIdx: number) => {
    setAttrModalEntityIdx(entityIdx)
    setAttrName('')
    setAttrType('string')
    setAttrIsPk(false)
    setAttrIsFk(false)
    setAttrNullable(true)
  }

  const saveAttributeModal = async (e: React.FormEvent) => {
    e.preventDefault()
    if (
      attrModalEntityIdx === null ||
      !selectedOntology ||
      !attrName.trim()
    ) {
      return
    }
    const targetEnt = selectedOntology.entities[attrModalEntityIdx]
    const vId = selectedOntology.ontology_version_id

    const newAttr: OntologyAttribute = {
      name: attrName.trim().replace(/\s+/g, '_'),
      datatype: attrType,
      is_pk: attrIsPk,
      is_primary_key: attrIsPk,
      is_fk: attrIsFk,
      is_foreign_key: attrIsFk,
      nullable: attrIsPk ? false : attrNullable,
      is_nullable: attrIsPk ? false : attrNullable,
    }

    const nextAttributes = [...(targetEnt.attributes || []), newAttr]
    try {
      if (targetEnt.entity_id) {
        await ontologyApi.updateEntity(vId, targetEnt.entity_id, {
          attributes: nextAttributes,
        })
      }
      const nextEntities = selectedOntology.entities.map((ent, idx) =>
        idx === attrModalEntityIdx ? { ...ent, attributes: nextAttributes } : ent
      )
      const nextOnt = { ...selectedOntology, entities: nextEntities }
      setSelectedOntology(nextOnt)
      setOntologies((prev) =>
        prev.map((o) => (o.ontology_version_id === vId ? nextOnt : o))
      )
      setAttrModalEntityIdx(null)
      notify(`Added attribute ${newAttr.name}`)
    } catch (err: any) {
      notify(err?.message || 'Failed to add attribute')
    }
  }

  const deleteAttribute = async (entityIdx: number, attrIdx: number) => {
    if (!selectedOntology) return
    const targetEnt = selectedOntology.entities[entityIdx]
    const vId = selectedOntology.ontology_version_id
    const nextAttributes = (targetEnt.attributes || []).filter((_, aIdx) => aIdx !== attrIdx)

    try {
      if (targetEnt.entity_id) {
        await ontologyApi.updateEntity(vId, targetEnt.entity_id, {
          attributes: nextAttributes,
        })
      }
      const nextEntities = selectedOntology.entities.map((ent, idx) =>
        idx === entityIdx ? { ...ent, attributes: nextAttributes } : ent
      )
      const nextOnt = { ...selectedOntology, entities: nextEntities }
      setSelectedOntology(nextOnt)
      setOntologies((prev) =>
        prev.map((o) => (o.ontology_version_id === vId ? nextOnt : o))
      )
      notify('Attribute removed')
    } catch (err: any) {
      notify(err?.message || 'Failed to remove attribute')
    }
  }

  const openAddRelationshipModal = () => {
    if (!selectedOntology || selectedOntology.entities.length < 2) {
      notify('Add at least 2 entities first')
      return
    }
    setRelSource(selectedOntology.entities[0].name)
    setRelTarget(selectedOntology.entities[1].name)
    setRelCardinality('1:N')
    setRelLabel('has')
    setRelModalOpen(true)
  }

  const saveRelationshipModal = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedOntology || !relSource || !relTarget) return
    const vId = selectedOntology.ontology_version_id

    const srcEnt = selectedOntology.entities.find((ent) => ent.name === relSource)
    const tgtEnt = selectedOntology.entities.find((ent) => ent.name === relTarget)
    if (!srcEnt || !tgtEnt) {
      notify('Source and target entities must exist')
      return
    }

    const label = relLabel.trim() || 'references'
    const name = `${relSource}_${label}_${relTarget}`

    try {
      const createdRel = await ontologyApi.addRelationship(vId, {
        name,
        label,
        source_entity_id: srcEnt.entity_id || '',
        source_entity_name: relSource,
        source_entity: relSource,
        target_entity_id: tgtEnt.entity_id || '',
        target_entity_name: relTarget,
        target_entity: relTarget,
        cardinality: relCardinality,
        relation_type: 'ASSOCIATION',
      })

      const newRel: OntologyRelationship = {
        relationship_id: createdRel.relationship_id || `rel-${Date.now()}`,
        name,
        label,
        source_entity: relSource,
        source_entity_name: relSource,
        source_entity_id: srcEnt.entity_id || '',
        target_entity: relTarget,
        target_entity_name: relTarget,
        target_entity_id: tgtEnt.entity_id || '',
        cardinality: relCardinality,
      }

      const nextOnt = {
        ...selectedOntology,
        relationships: [...selectedOntology.relationships, newRel],
      }
      setSelectedOntology(nextOnt)
      setOntologies((prev) =>
        prev.map((o) => (o.ontology_version_id === vId ? nextOnt : o))
      )
      setRelModalOpen(false)
      notify(`Added relationship ${relSource} → ${relTarget}`)
    } catch (err: any) {
      notify(err?.message || 'Failed to add relationship')
    }
  }

  const deleteRelationship = async (idx: number) => {
    if (!selectedOntology) return
    const targetRel = selectedOntology.relationships[idx]
    const vId = selectedOntology.ontology_version_id

    try {
      if (targetRel.relationship_id) {
        await ontologyApi.deleteRelationship(vId, targetRel.relationship_id)
      }
      const nextOnt = {
        ...selectedOntology,
        relationships: selectedOntology.relationships.filter((_, i) => i !== idx),
      }
      setSelectedOntology(nextOnt)
      setOntologies((prev) =>
        prev.map((o) => (o.ontology_version_id === vId ? nextOnt : o))
      )
      notify('Relationship removed')
    } catch (err: any) {
      notify(err?.message || 'Failed to remove relationship')
    }
  }

  const filteredOntologies = ontologies.filter(
    (o) =>
      o.name.toLowerCase().includes(registrySearch.toLowerCase()) ||
      (o.domain || '').toLowerCase().includes(registrySearch.toLowerCase()) ||
      o.ontology_version_id
        .toLowerCase()
        .includes(registrySearch.toLowerCase())
  )

  return (
    <div className="relative h-[calc(100vh-4rem)] w-full overflow-hidden bg-[#F8FAFC] font-sans text-[#0F172A]">
      {/* Toast feedback */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-lg border border-[#39359D]/30 bg-[#0F172A] px-3.5 py-2 text-[12.5px] font-medium text-white shadow-lg">
          <Check className="h-3.5 w-3.5 text-emerald-400" />
          <span>{toast}</span>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          VIEW 1: ONTOLOGY REGISTRY (TABLE VIEW)
          ═══════════════════════════════════════════════════════════ */}
      {viewMode === 'registry' && (
        <div className="h-full overflow-y-auto p-4 sm:p-6 space-y-4">
          <div className="flex flex-col gap-3 border-b border-[#E2E8F0] pb-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-baseline gap-3">
              <h1 className="text-[20px] sm:text-[22px] font-semibold tracking-[-0.02em] text-[#0F172A]">
                Ontology Studio
              </h1>
              <span className="rounded-md border border-[#E2E8F0] bg-white px-2 py-0.5 font-mono text-[11px] text-[#64748B]">
                {ontologies.length} models
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {projects.length > 0 && (
                <div className="w-52">
                  <CustomSelect
                    value={projectId}
                    onChange={(val) => {
                      setProjectId(val)
                      activeProjectStorage.set(val)
                    }}
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
                onClick={() => loadOntologies()}
                title="Refresh ontologies"
                className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-[#E2E8F0] bg-white text-[#475569] hover:bg-[#F8FAFC]"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${
                    loadingList ? 'animate-spin text-[#39359D]' : ''
                  }`}
                />
              </button>

              <Link
                to="/ontology/new"
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#39359D] px-3.5 text-[13px] font-medium text-white shadow-2xs transition-colors hover:bg-[#2E2A82]"
              >
                <Plus className="h-3.5 w-3.5" />
                New Ontology
              </Link>
            </div>
          </div>

          <div className="relative max-w-xs">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#94A3B8]" />
            <input
              type="text"
              value={registrySearch}
              onChange={(e) => setRegistrySearch(e.target.value)}
              placeholder="Search ontology or domain..."
              className="h-8 w-full rounded-lg border border-[#E2E8F0] bg-white pl-8 pr-3 text-[12.5px] text-[#0F172A] placeholder:text-[#94A3B8] outline-none focus:border-[#39359D]"
            />
          </div>

          {listError && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-[12.5px] text-rose-700">
              {listError}
            </div>
          )}

          <div className="overflow-hidden rounded-xl border border-[#E2E8F0] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.02)]">
            {loadingList ? (
              <div className="divide-y divide-[#F1F5F9]">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between px-4 py-3.5 animate-pulse"
                  >
                    <div className="space-y-1.5">
                      <div className="h-3.5 w-48 rounded bg-[#F1F5F9]" />
                      <div className="h-2.5 w-32 rounded bg-[#F8FAFC]" />
                    </div>
                    <div className="h-7 w-24 rounded bg-[#F1F5F9]" />
                  </div>
                ))}
              </div>
            ) : filteredOntologies.length === 0 ? (
              <div className="p-12 text-center">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg border border-[#E2E8F0] bg-[#FAFAFA] text-[#39359D]">
                  <Network className="h-4 w-4" />
                </div>
                <h3 className="mt-3 text-[14.5px] font-semibold text-[#0F172A]">
                  No ontologies found
                </h3>
                <p className="mx-auto mt-1 max-w-sm text-[12.5px] text-[#64748B]">
                  Create a canonical business ontology and design entities visually or with the Architect Agent.
                </p>
                <Link
                  to="/ontology/new"
                  className="mt-4 inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#39359D] px-3.5 text-[12.5px] font-medium text-white hover:bg-[#2E2A82]"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Create Ontology
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-[13px]">
                  <thead>
                    <tr className="border-b border-[#E2E8F0] bg-[#FAFAFA] text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                      <th className="px-4 py-2.5">Ontology</th>
                      <th className="px-4 py-2.5">Domain</th>
                      <th className="px-4 py-2.5">Version</th>
                      <th className="px-4 py-2.5">Graph Size</th>
                      <th className="px-4 py-2.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F1F5F9]">
                    {filteredOntologies.map((ont) => (
                      <tr
                        key={ont.ontology_version_id}
                        onClick={() => openBuilder(ont)}
                        className="group cursor-pointer transition-colors hover:bg-[#FAFAFA]"
                      >
                        <td className="px-4 py-3">
                          <div className="font-semibold text-[#0F172A] group-hover:text-[#39359D] transition-colors">
                            {ont.name}
                          </div>
                          <div className="font-mono text-[11px] text-[#94A3B8]">
                            {ont.ontology_version_id}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-[12.5px] text-[#475569]">
                          {ont.domain || 'General'}
                        </td>
                        <td className="px-4 py-3">
                          <span className="rounded border border-[#E2E8F0] bg-[#F8FAFC] px-2 py-0.5 font-mono text-[11px] text-[#334155]">
                            v{ont.version_tag || '1.0.0'}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-[12px] text-[#475569]">
                          {ont.entities?.length || 0} entities ·{' '}
                          {ont.relationships?.length || 0} rels
                        </td>
                        <td
                          onClick={(e) => e.stopPropagation()}
                          className="px-4 py-3 text-right"
                        >
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => openBuilder(ont)}
                              className="inline-flex h-7 cursor-pointer items-center gap-1 rounded-md border border-[#E2E8F0] bg-white px-2.5 text-[12px] font-medium text-[#0F172A] hover:border-[#39359D] hover:text-[#39359D]"
                            >
                              Open Canvas
                              <ArrowRight className="h-3 w-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(ont)}
                              title="Delete ontology"
                              className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-[#64748B] hover:bg-rose-50 hover:text-rose-600"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          VIEW 2: VISUAL BUILDER + DRAGGABLE CANVAS + AI AGENT
          ═══════════════════════════════════════════════════════════ */}
      {viewMode === 'builder' && (
        <div className="relative flex h-full w-full flex-col overflow-hidden">
          {loadingOnt || !selectedOntology ? (
            <div className="flex h-full items-center justify-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-[#39359D]" />
              <span className="text-[13px] text-[#64748B]">
                Loading ontology graph...
              </span>
            </div>
          ) : (
            <>
              {/* Compact Builder Top Bar */}
              <div className="z-20 flex flex-wrap items-center justify-between gap-2 border-b border-[#E2E8F0] bg-white px-4 py-2.5 shadow-[0_1px_2px_rgba(15,23,42,0.02)]">
                <div className="flex flex-wrap items-center gap-2.5 min-w-0">
                  <button
                    type="button"
                    onClick={() => setViewMode('registry')}
                    className="inline-flex h-7 cursor-pointer items-center gap-1 rounded-md border border-[#E2E8F0] bg-white px-2.5 text-[12px] font-medium text-[#475569] hover:border-[#39359D] hover:text-[#39359D]"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Models
                  </button>

                  <h1 className="truncate text-[14.5px] font-semibold text-[#0F172A]">
                    {selectedOntology.name}
                  </h1>

                  <span className="rounded border border-[#E2E8F0] bg-[#FAFAFA] px-1.5 py-0.5 font-mono text-[10.5px] text-[#475569]">
                    v{selectedOntology.version_tag}
                  </span>

                  <span className="hidden md:inline font-mono text-[11px] text-[#64748B]">
                    {selectedOntology.entities.length}e ·{' '}
                    {selectedOntology.relationships.length}r
                  </span>

                  {/* Segmented View Switcher */}
                  <div className="inline-flex rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-0.5">
                    {(
                      [
                        { id: 'graph', label: 'Canvas', icon: Network },
                        { id: 'table', label: 'Entities', icon: Table2 },
                        {
                          id: 'relationships',
                          label: 'Relations',
                          icon: GitBranch,
                        },
                      ] as const
                    ).map((tab) => {
                      const Icon = tab.icon
                      const active = activeTab === tab.id
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setActiveTab(tab.id)}
                          className={`inline-flex cursor-pointer items-center gap-1.5 rounded-md px-2.5 py-1 text-[11.5px] transition-all ${
                            active
                              ? 'bg-white font-semibold text-[#0F172A] shadow-2xs ring-1 ring-black/5'
                              : 'font-medium text-[#64748B] hover:text-[#0F172A]'
                          }`}
                        >
                          <Icon className="h-3.5 w-3.5 text-[#39359D]" />
                          {tab.label}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Builder Actions */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={openCreateEntityModal}
                    className="inline-flex h-7 cursor-pointer items-center gap-1 rounded-md border border-[#E2E8F0] bg-white px-2.5 text-[12px] font-medium text-[#0F172A] hover:border-[#39359D] hover:text-[#39359D]"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Entity
                  </button>

                  <button
                    type="button"
                    onClick={openAddRelationshipModal}
                    className="inline-flex h-7 cursor-pointer items-center gap-1 rounded-md border border-[#E2E8F0] bg-white px-2.5 text-[12px] font-medium text-[#0F172A] hover:border-[#39359D] hover:text-[#39359D]"
                  >
                    <Link2 className="h-3.5 w-3.5" />
                    Relation
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSaveOntology()}
                    disabled={saving || !dirty}
                    className="inline-flex h-7 cursor-pointer items-center gap-1 rounded-md border border-[#E2E8F0] bg-white px-2.5 text-[12px] font-medium text-[#0F172A] hover:bg-[#F8FAFC] disabled:opacity-45"
                  >
                    {saving ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Save className="h-3 w-3 text-[#39359D]" />
                    )}
                    {dirty ? 'Save*' : 'Saved'}
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsAgentOpen(true)}
                    className="inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-md bg-[#39359D] px-3 text-[12px] font-semibold text-white shadow-2xs transition-colors hover:bg-[#2E2A82]"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    Architect Agent
                  </button>
                </div>
              </div>

              {/* Main Builder Container: Workspace & Optional Copilot Drawer */}
              <div className="relative flex flex-1 min-h-0 overflow-hidden">
                <div className="relative flex flex-1 flex-col min-w-0 h-full overflow-hidden">
                  {/* ── TAB 1: DRAGGABLE ER CANVAS ────────────────────────── */}
                  {activeTab === 'graph' && (
                    <div
                      ref={canvasRef}
                      data-canvas-bg="true"
                      onPointerDown={handleCanvasPointerDown}
                      onPointerMove={handleCanvasPointerMove}
                      onPointerUp={handleCanvasPointerUp}
                      style={{
                        backgroundImage:
                          'radial-gradient(#CBD5E1 1px, transparent 1px)',
                        backgroundSize: '20px 20px',
                        backgroundPosition: `${pan.x}px ${pan.y}px`,
                      }}
                      className={`relative flex-1 overflow-hidden select-none ${
                        canvasTool === 'hand'
                          ? isPanning
                            ? 'cursor-grabbing'
                            : 'cursor-grab'
                          : isSelectingRef.current
                          ? 'cursor-crosshair'
                          : 'cursor-default'
                      }`}
                    >
                      {/* Floating Tool Switcher & Zoom Controls */}
                      <div className="absolute bottom-4 left-4 z-20 flex items-center gap-1 rounded-xl border border-[#E2E8F0] bg-white/95 p-1 shadow-sm backdrop-blur-xs">
                        {/* Hand Tool */}
                        <button
                          type="button"
                          onClick={() => setCanvasTool('hand')}
                          title="Hand Tool (Pan canvas)"
                          className={`inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg transition-colors ${
                            canvasTool === 'hand'
                              ? 'bg-[#39359D] text-white shadow-xs'
                              : 'text-[#475569] hover:bg-[#F1F5F9]'
                          }`}
                        >
                          <Hand className="h-3.5 w-3.5" />
                        </button>

                        {/* Select Tool */}
                        <button
                          type="button"
                          onClick={() => setCanvasTool('select')}
                          title="Select Tool (Click or drag-select entities)"
                          className={`inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg transition-colors ${
                            canvasTool === 'select'
                              ? 'bg-[#39359D] text-white shadow-xs'
                              : 'text-[#475569] hover:bg-[#F1F5F9]'
                          }`}
                        >
                          <MousePointer2 className="h-3.5 w-3.5" />
                        </button>

                        <div className="mx-0.5 h-4 w-[1px] bg-[#E2E8F0]" />

                        {/* Zoom Out */}
                        <button
                          type="button"
                          onClick={() =>
                            setZoom((z) => Math.max(0.45, +(z - 0.1).toFixed(2)))
                          }
                          title="Zoom out"
                          className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-[#475569] hover:bg-[#F1F5F9]"
                        >
                          <ZoomOut className="h-3.5 w-3.5" />
                        </button>

                        {/* Zoom Reset */}
                        <button
                          type="button"
                          onClick={() => setZoom(1)}
                          title="Reset zoom to 100%"
                          className="w-11 text-center font-mono text-[11px] text-[#334155] hover:text-[#39359D] cursor-pointer"
                        >
                          {Math.round(zoom * 100)}%
                        </button>

                        {/* Zoom In */}
                        <button
                          type="button"
                          onClick={() =>
                            setZoom((z) => Math.min(1.6, +(z + 0.1).toFixed(2)))
                          }
                          title="Zoom in"
                          className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-[#475569] hover:bg-[#F1F5F9]"
                        >
                          <ZoomIn className="h-3.5 w-3.5" />
                        </button>

                        {/* Fit View */}
                        <button
                          type="button"
                          onClick={handleFitView}
                          title="Fit view to all entities"
                          className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-[#475569] hover:bg-[#F1F5F9]"
                        >
                          <Maximize2 className="h-3.5 w-3.5" />
                        </button>

                        <div className="mx-0.5 h-4 w-[1px] bg-[#E2E8F0]" />

                        {/* Auto Layout */}
                        <button
                          type="button"
                          onClick={handleAutoLayout}
                          title="Auto-arrange grid"
                          className="inline-flex h-7 cursor-pointer items-center gap-1 rounded-lg px-2 text-[11px] font-medium text-[#334155] hover:bg-[#F1F5F9]"
                        >
                          <LayoutGrid className="h-3 w-3 text-[#39359D]" />
                          Auto Layout
                        </button>

                        <div className="mx-0.5 h-4 w-[1px] bg-[#E2E8F0]" />

                        {/* Toggle Minimap */}
                        <button
                          type="button"
                          onClick={() => setShowMinimap((v) => !v)}
                          title={showMinimap ? 'Hide minimap' : 'Show minimap'}
                          className={`inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg transition-colors ${
                            showMinimap
                              ? 'bg-[#39359D]/10 text-[#39359D]'
                              : 'text-[#475569] hover:bg-[#F1F5F9]'
                          }`}
                        >
                          <Map className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      {/* Floating Interactive MiniMap */}
                      {showMinimap && selectedOntology.entities.length > 0 && (
                        <div className="absolute bottom-4 right-4 z-20 rounded-xl border border-[#E2E8F0] bg-white/95 p-2 shadow-md backdrop-blur-md space-y-1.5 transition-all">
                          <div className="flex items-center justify-between px-1 text-[10px] font-mono font-medium text-slate-500 border-b border-slate-100 pb-1">
                            <span>MINIMAP</span>
                            <button
                              type="button"
                              onClick={() => setShowMinimap(false)}
                              className="text-slate-400 hover:text-slate-700 cursor-pointer"
                              title="Close minimap"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                          <div
                            onClick={handleMinimapClick}
                            style={{ width: 190, height: 130 }}
                            className="relative bg-slate-50 rounded-lg border border-slate-200 overflow-hidden cursor-crosshair select-none"
                          >
                            {/* Entity nodes on minimap */}
                            {selectedOntology.entities.map((ent, idx) => {
                              const pos = getEntityPos(ent, idx)
                              const bounds = getMinimapBounds()
                              const scaleX = 190 / bounds.w
                              const scaleY = 130 / bounds.h
                              const scale = Math.min(scaleX, scaleY)
                              const x = (pos.x - bounds.minX) * scale
                              const y = (pos.y - bounds.minY) * scale
                              const w = Math.max(12, 268 * scale)
                              const h = Math.max(8, 180 * scale)
                              const isSel = selectedEntityIds.includes(
                                ent.entity_id || String(idx)
                              )

                              return (
                                <div
                                  key={ent.entity_id || idx}
                                  style={{ left: x, top: y, width: w, height: h }}
                                  className={`absolute rounded-[2px] transition-colors ${
                                    isSel
                                      ? 'bg-[#39359D] ring-1 ring-[#39359D]'
                                      : 'bg-slate-400/80 border border-slate-300'
                                  }`}
                                  title={ent.name}
                                />
                              )
                            })}

                            {/* Viewport indicator on minimap */}
                            {(() => {
                              const bounds = getMinimapBounds()
                              const scaleX = 190 / bounds.w
                              const scaleY = 130 / bounds.h
                              const scale = Math.min(scaleX, scaleY)
                              const clientW = canvasRef.current?.clientWidth || 1000
                              const clientH = canvasRef.current?.clientHeight || 700
                              const vpWorldX = -pan.x / zoom
                              const vpWorldY = -pan.y / zoom
                              const vpWorldW = clientW / zoom
                              const vpWorldH = clientH / zoom

                              const x = (vpWorldX - bounds.minX) * scale
                              const y = (vpWorldY - bounds.minY) * scale
                              const w = Math.max(16, vpWorldW * scale)
                              const h = Math.max(12, vpWorldH * scale)

                              return (
                                <div
                                  style={{ left: x, top: y, width: w, height: h }}
                                  className="absolute border border-[#39359D] bg-[#39359D]/15 rounded-[2px] pointer-events-none shadow-xs"
                                />
                              )
                            })()}
                          </div>
                        </div>
                      )}

                      {/* Marquee Selection Box Overlay */}
                      {selectionBox && canvasRef.current && (
                        <div
                          style={{
                            left:
                              Math.min(selectionBox.startX, selectionBox.currentX) -
                              canvasRef.current.getBoundingClientRect().left,
                            top:
                              Math.min(selectionBox.startY, selectionBox.currentY) -
                              canvasRef.current.getBoundingClientRect().top,
                            width: Math.abs(selectionBox.currentX - selectionBox.startX),
                            height: Math.abs(selectionBox.currentY - selectionBox.startY),
                          }}
                          className="pointer-events-none absolute z-30 border border-[#39359D] bg-[#39359D]/10 rounded-xs"
                        />
                      )}

                  {/* Empty Canvas State */}
                  {selectedOntology.entities.length === 0 ? (
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6">
                      <div className="pointer-events-auto max-w-md rounded-xl border border-[#E2E8F0] bg-white p-6 text-center shadow-sm">
                        <Layers className="mx-auto h-6 w-6 text-[#39359D]" />
                        <h3 className="mt-2.5 text-[14.5px] font-semibold text-[#0F172A]">
                          Empty Ontology Canvas
                        </h3>
                        <p className="mt-1 text-[12.5px] text-[#64748B]">
                          Add entities manually or launch the Architect Agent to synthesize a complete domain schema.
                        </p>
                        <div className="mt-4 flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={openCreateEntityModal}
                            className="inline-flex h-8 cursor-pointer items-center gap-1 rounded-lg border border-[#E2E8F0] bg-white px-3 text-[12px] font-medium text-[#0F172A] hover:bg-[#F8FAFC]"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            Add Entity
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsAgentOpen(true)}
                            className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg bg-[#39359D] px-3.5 text-[12px] font-semibold text-white hover:bg-[#2E2A82]"
                          >
                            <Sparkles className="h-3.5 w-3.5" />
                            Open Architect Agent
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Transformed World Layer */
                    <div
                      style={{
                        transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                        transformOrigin: '0 0',
                      }}
                      className="relative h-[3000px] w-[3000px]"
                    >
                      {/* SVG Relationship Edges */}
                      <svg
                        className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
                        aria-hidden
                      >
                        <defs>
                          <marker
                            id="rel-arrow"
                            markerWidth="10"
                            markerHeight="10"
                            refX="9"
                            refY="5"
                            orient="auto"
                          >
                            <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#4F46E5" />
                          </marker>
                        </defs>
                        {selectedOntology.relationships.map((rel, rIdx) => {
                          const srcRef =
                            (rel as any).source_entity ||
                            (rel as any).source_entity_name ||
                            (rel as any).source_entity_id ||
                            (rel as any).source ||
                            ''
                          const tgtRef =
                            (rel as any).target_entity ||
                            (rel as any).target_entity_name ||
                            (rel as any).target_entity_id ||
                            (rel as any).target ||
                            ''

                          const findEntity = (ref: string) => {
                            if (!ref) return undefined
                            const cleanRef = String(ref).trim().toLowerCase()
                            return selectedOntology.entities.find((e) => {
                              return (
                                (e.name && e.name.trim().toLowerCase() === cleanRef) ||
                                (e.entity_id && e.entity_id.trim().toLowerCase() === cleanRef)
                              )
                            })
                          }

                          const src = findEntity(srcRef)
                          const tgt = findEntity(tgtRef)
                          if (!src || !tgt) return null

                          const sIdx = selectedOntology.entities.indexOf(src)
                          const tIdx = selectedOntology.entities.indexOf(tgt)
                          const sPos = getEntityPos(src, sIdx >= 0 ? sIdx : 0)
                          const tPos = getEntityPos(tgt, tIdx >= 0 ? tIdx : 0)

                          const cardW = 268
                          const cardH = 200

                          // Calculate smart anchor coordinates depending on relative card orientation
                          let x1: number, y1: number, x2: number, y2: number
                          if (tPos.x >= sPos.x + cardW - 20) {
                            // Target is to the right of source: exit right edge, enter left edge
                            x1 = sPos.x + cardW
                            y1 = sPos.y + 60
                            x2 = tPos.x
                            y2 = tPos.y + 60
                          } else if (sPos.x >= tPos.x + cardW - 20) {
                            // Target is to the left of source: exit left edge, enter right edge
                            x1 = sPos.x
                            y1 = sPos.y + 60
                            x2 = tPos.x + cardW
                            y2 = tPos.y + 60
                          } else if (tPos.y > sPos.y) {
                            // Vertically stacked: source on top, target below
                            x1 = sPos.x + cardW / 2
                            y1 = sPos.y + cardH
                            x2 = tPos.x + cardW / 2
                            y2 = tPos.y
                          } else {
                            // Target on top, source below
                            x1 = sPos.x + cardW / 2
                            y1 = sPos.y
                            x2 = tPos.x + cardW / 2
                            y2 = tPos.y + cardH
                          }

                          const midX = (x1 + x2) / 2
                          const midY = (y1 + y2) / 2

                          let d = ''
                          if (Math.abs(x2 - x1) >= Math.abs(y2 - y1)) {
                            const dx = Math.max(40, Math.abs(x2 - x1) * 0.45)
                            const cx1 = x2 >= x1 ? x1 + dx : x1 - dx
                            const cx2 = x2 >= x1 ? x2 - dx : x2 + dx
                            d = `M ${x1} ${y1} C ${cx1} ${y1}, ${cx2} ${y2}, ${x2} ${y2}`
                          } else {
                            const dy = Math.max(40, Math.abs(y2 - y1) * 0.45)
                            const cy1 = y2 >= y1 ? y1 + dy : y1 - dy
                            const cy2 = y2 >= y1 ? y2 - dy : y2 + dy
                            d = `M ${x1} ${y1} C ${x1} ${cy1}, ${x2} ${cy2}, ${x2} ${y2}`
                          }

                          const badgeText = rel.label || rel.cardinality || '1:N'
                          const badgeWidth = Math.max(68, badgeText.length * 7.5 + 16)

                          return (
                            <g key={rel.relationship_id || `${sIdx}-${tIdx}-${rIdx}`} className="relationship-edge">
                              {/* Background shadow stroke for contrast */}
                              <path
                                d={d}
                                fill="none"
                                stroke="#FFFFFF"
                                strokeWidth={4.5}
                                strokeLinecap="round"
                              />
                              {/* Primary relationship line */}
                              <path
                                d={d}
                                fill="none"
                                stroke="#4F46E5"
                                strokeWidth={2}
                                strokeDasharray={rel.cardinality?.includes('N:M') ? '4 3' : undefined}
                                markerEnd="url(#rel-arrow)"
                              />
                              {/* Relationship Cardinality / Label Badge */}
                              <g transform={`translate(${midX}, ${midY})`}>
                                <rect
                                  x={-badgeWidth / 2}
                                  y={-11}
                                  width={badgeWidth}
                                  height={22}
                                  rx={6}
                                  fill="#FFFFFF"
                                  stroke="#4F46E5"
                                  strokeWidth={1.5}
                                  className="shadow-xs"
                                />
                                <text
                                  textAnchor="middle"
                                  dominantBaseline="central"
                                  fontSize={10.5}
                                  fontFamily="ui-monospace, monospace"
                                  fill="#312E81"
                                  fontWeight={700}
                                >
                                  {badgeText}
                                </text>
                              </g>
                            </g>
                          )
                        })}
                      </svg>

                      {/* Draggable Entity Cards */}
                      {selectedOntology.entities.map((ent, idx) => {
                        const pos = getEntityPos(ent, idx)
                        const isDragging = draggingEntityIdx === idx

                        return (
                          <div
                            key={ent.entity_id || ent.name}
                            onPointerDown={(e) => handleEntityPointerDown(e, idx)}
                            onPointerMove={handleEntityPointerMove}
                            onPointerUp={handleEntityPointerUp}
                            style={{
                              transform: `translate(${pos.x}px, ${pos.y}px)`,
                              width: 268,
                            }}
                            className={`absolute top-0 left-0 rounded-xl border bg-white transition-shadow ${
                              selectedEntityIds.includes(ent.entity_id || String(idx))
                                ? 'z-30 border-[#39359D] ring-2 ring-[#39359D] ring-offset-2 shadow-lg'
                                : isDragging
                                ? 'z-30 border-[#39359D] shadow-xl cursor-grabbing ring-2 ring-[#39359D]/15'
                                : 'z-10 border-[#E2E8F0] shadow-[0_2px_8px_rgba(15,23,42,0.05)] hover:border-[#94A3B8] cursor-grab'
                            }`}
                          >
                            {/* Entity Header */}
                            <div className="flex items-center justify-between gap-2 border-b border-[#E2E8F0] bg-[#FAFAFA] px-3 py-2 rounded-t-xl">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="h-2 w-2 shrink-0 rounded-full bg-[#39359D]" />
                                <span
                                  onDoubleClick={() => openEditEntityModal(idx)}
                                  className="truncate font-mono text-[12.5px] font-semibold text-[#0F172A]"
                                >
                                  {ent.name}
                                </span>
                              </div>
                              <div className="flex items-center gap-0.5 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => openAddAttributeModal(idx)}
                                  title="Add attribute"
                                  className="inline-flex h-6 w-6 cursor-pointer items-center justify-center rounded text-[#64748B] hover:bg-[#E2E8F0]/60 hover:text-[#39359D]"
                                >
                                  <Plus className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => deleteEntity(idx)}
                                  title="Remove entity"
                                  className="inline-flex h-6 w-6 cursor-pointer items-center justify-center rounded text-[#94A3B8] hover:bg-rose-50 hover:text-rose-600"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>

                            {/* Attributes List */}
                            <div className="divide-y divide-[#F1F5F9] max-h-56 overflow-y-auto">
                              {(ent.attributes || []).length === 0 ? (
                                <div className="px-3 py-3 text-center text-[11px] text-[#94A3B8]">
                                  No attributes defined
                                </div>
                              ) : (
                                ent.attributes.map((attr, aIdx) => (
                                  <div
                                    key={`${attr.name}-${aIdx}`}
                                    className="group flex items-center justify-between gap-2 px-3 py-1.5 text-[11.5px] hover:bg-[#F8FAFC]"
                                  >
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      {attr.is_pk ? (
                                        <KeyRound className="h-3 w-3 shrink-0 text-amber-600" />
                                      ) : attr.is_fk ? (
                                        <Link2 className="h-3 w-3 shrink-0 text-[#39359D]" />
                                      ) : (
                                        <span className="w-3 shrink-0" />
                                      )}
                                      <span className="truncate font-mono text-[#0F172A]">
                                        {attr.name}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                      <span className="font-mono text-[10.5px] text-[#64748B]">
                                        {attr.datatype}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          deleteAttribute(idx, aIdx)
                                        }
                                        className="hidden group-hover:inline-flex cursor-pointer text-[#94A3B8] hover:text-rose-600"
                                      >
                                        <Minus className="h-3 w-3" />
                                      </button>
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ── TAB 2: ENTITIES & ATTRIBUTES TABLE ────────────────── */}
              {activeTab === 'table' && (
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
                  {selectedOntology.entities.map((ent, idx) => (
                    <div
                      key={ent.entity_id || ent.name}
                      className="overflow-hidden rounded-xl border border-[#E2E8F0] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.02)]"
                    >
                      <div className="flex items-center justify-between border-b border-[#E2E8F0] bg-[#FAFAFA] px-4 py-2.5">
                        <div>
                          <span className="font-mono text-[13.5px] font-semibold text-[#0F172A]">
                            {ent.name}
                          </span>
                          {ent.description && (
                            <p className="text-[11.5px] text-[#64748B]">
                              {ent.description}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openAddAttributeModal(idx)}
                            className="inline-flex h-7 cursor-pointer items-center gap-1 rounded-md border border-[#E2E8F0] bg-white px-2.5 text-[11.5px] font-medium text-[#39359D] hover:bg-[#F8FAFC]"
                          >
                            <Plus className="h-3 w-3" />
                            Attribute
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteEntity(idx)}
                            className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-[#64748B] hover:bg-rose-50 hover:text-rose-600"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                      <table className="w-full text-left text-[12.5px]">
                        <thead>
                          <tr className="border-b border-[#F1F5F9] text-[10.5px] font-semibold uppercase tracking-wider text-[#64748B]">
                            <th className="px-4 py-2">Attribute</th>
                            <th className="px-4 py-2">Type</th>
                            <th className="px-4 py-2">Key</th>
                            <th className="px-4 py-2">Nullable</th>
                            <th className="px-4 py-2 text-right">Remove</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#F1F5F9]">
                          {(ent.attributes || []).map((attr, aIdx) => (
                            <tr key={`${attr.name}-${aIdx}`}>
                              <td className="px-4 py-2 font-mono font-medium text-[#0F172A]">
                                {attr.name}
                              </td>
                              <td className="px-4 py-2 font-mono text-[#475569]">
                                {attr.datatype}
                              </td>
                              <td className="px-4 py-2">
                                {attr.is_pk ? (
                                  <span className="rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-amber-700">
                                    PK
                                  </span>
                                ) : attr.is_fk ? (
                                  <span className="rounded border border-[#39359D]/20 bg-[#EEF2FF] px-1.5 py-0.5 font-mono text-[10px] font-semibold text-[#39359D]">
                                    FK
                                  </span>
                                ) : (
                                  '—'
                                )}
                              </td>
                              <td className="px-4 py-2 font-mono text-[11.5px] text-[#64748B]">
                                {attr.nullable === false ? 'NOT NULL' : 'NULL'}
                              </td>
                              <td className="px-4 py-2 text-right">
                                <button
                                  type="button"
                                  onClick={() => deleteAttribute(idx, aIdx)}
                                  className="cursor-pointer text-[#94A3B8] hover:text-rose-600"
                                >
                                  <Trash2 className="inline h-3.5 w-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ))}
                </div>
              )}

              {/* ── TAB 3: RELATIONSHIPS TABLE ────────────────────────── */}
              {activeTab === 'relationships' && (
                <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                  <div className="overflow-hidden rounded-xl border border-[#E2E8F0] bg-white">
                    <table className="w-full text-left text-[12.5px]">
                      <thead>
                        <tr className="border-b border-[#E2E8F0] bg-[#FAFAFA] text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                          <th className="px-4 py-2.5">Source Entity</th>
                          <th className="px-4 py-2.5">Cardinality</th>
                          <th className="px-4 py-2.5">Target Entity</th>
                          <th className="px-4 py-2.5">Semantic Label</th>
                          <th className="px-4 py-2.5 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#F1F5F9]">
                        {selectedOntology.relationships.length === 0 ? (
                          <tr>
                            <td
                              colSpan={5}
                              className="px-4 py-10 text-center text-[#64748B]"
                            >
                              No relationships defined yet.
                            </td>
                          </tr>
                        ) : (
                          selectedOntology.relationships.map((rel, idx) => (
                            <tr key={rel.relationship_id || idx}>
                              <td className="px-4 py-2.5 font-mono font-semibold text-[#0F172A]">
                                {rel.source_entity || (rel as any).source_entity_name || (rel as any).source || '—'}
                              </td>
                              <td className="px-4 py-2.5">
                                <span className="rounded border border-[#39359D]/25 bg-[#EEF2FF] px-2 py-0.5 font-mono text-[11px] font-semibold text-[#39359D]">
                                  {rel.cardinality || '1:N'}
                                </span>
                              </td>
                              <td className="px-4 py-2.5 font-mono font-semibold text-[#0F172A]">
                                {rel.target_entity || (rel as any).target_entity_name || (rel as any).target || '—'}
                              </td>
                              <td className="px-4 py-2.5 text-[#475569]">
                                {rel.label || '—'}
                              </td>
                              <td className="px-4 py-2.5 text-right">
                                <button
                                  type="button"
                                  onClick={() => deleteRelationship(idx)}
                                  className="cursor-pointer text-[#94A3B8] hover:text-rose-600"
                                >
                                  <Trash2 className="inline h-3.5 w-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
                </div>

                {/* ARCHITECT AGENT SLIDING / EXPANDABLE WORKSPACE */}
                {isAgentOpen && (
                  <ArchitectWorkspace
                    ontology={selectedOntology}
                    onOntologyUpdated={(nextOnt) => {
                      const normalized = normalizeEntityPositions(nextOnt)
                      setSelectedOntology(normalized)
                      setOntologies((prev) =>
                        prev.map((o) =>
                          o.ontology_version_id ===
                          normalized.ontology_version_id
                            ? normalized
                            : o
                        )
                      )
                      setDirty(false)
                    }}
                    onClose={() => setIsAgentOpen(false)}
                  />
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          INLINE MODALS (ENTITY, ATTRIBUTE, RELATIONSHIP, DELETE)
          ═══════════════════════════════════════════════════════════ */}
      {entityModalOpen && (
        <div
          onClick={() => setEntityModalOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-[1px]"
        >
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={saveEntityModal}
            className="w-full max-w-md rounded-xl border border-[#E2E8F0] bg-white shadow-2xl overflow-hidden"
          >
            <div className="flex items-center justify-between border-b border-[#E2E8F0] px-5 py-3">
              <h3 className="text-[14px] font-semibold text-[#0F172A]">
                {editingEntityIdx !== null ? 'Edit Entity' : 'Add Entity'}
              </h3>
              <button
                type="button"
                onClick={() => setEntityModalOpen(false)}
                className="cursor-pointer text-[#94A3B8] hover:text-[#0F172A]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-3.5 p-5 text-[12.5px]">
              <div>
                <label className="mb-1 block font-medium text-[#334155]">
                  Entity Name *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={entityNameInput}
                  onChange={(e) => setEntityNameInput(e.target.value)}
                  placeholder="e.g. SalesOrder"
                  className="h-9 w-full rounded-lg border border-[#CBD5E1] px-3 font-mono text-[13px] outline-none focus:border-[#39359D]"
                />
              </div>
              <div>
                <label className="mb-1 block font-medium text-[#334155]">
                  Description
                </label>
                <input
                  type="text"
                  value={entityDescInput}
                  onChange={(e) => setEntityDescInput(e.target.value)}
                  placeholder="Business definition..."
                  className="h-9 w-full rounded-lg border border-[#CBD5E1] px-3 text-[13px] outline-none focus:border-[#39359D]"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-[#E2E8F0] bg-[#FAFAFA] px-5 py-3">
              <button
                type="button"
                onClick={() => setEntityModalOpen(false)}
                className="h-8 cursor-pointer rounded-lg border border-[#E2E8F0] bg-white px-3 text-[12px] font-medium text-[#334155]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="h-8 cursor-pointer rounded-lg bg-[#39359D] px-4 text-[12px] font-semibold text-white hover:bg-[#2E2A82]"
              >
                Save Entity
              </button>
            </div>
          </form>
        </div>
      )}

      {attrModalEntityIdx !== null && (
        <div
          onClick={() => setAttrModalEntityIdx(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-[1px]"
        >
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={saveAttributeModal}
            className="w-full max-w-md rounded-xl border border-[#E2E8F0] bg-white shadow-2xl overflow-hidden"
          >
            <div className="flex items-center justify-between border-b border-[#E2E8F0] px-5 py-3">
              <h3 className="text-[14px] font-semibold text-[#0F172A]">
                Add Attribute
              </h3>
              <button
                type="button"
                onClick={() => setAttrModalEntityIdx(null)}
                className="cursor-pointer text-[#94A3B8] hover:text-[#0F172A]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-3.5 p-5 text-[12.5px]">
              <div>
                <label className="mb-1 block font-medium text-[#334155]">
                  Attribute Name *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={attrName}
                  onChange={(e) => setAttrName(e.target.value)}
                  placeholder="e.g. customer_id"
                  className="h-9 w-full rounded-lg border border-[#CBD5E1] px-3 font-mono text-[13px] outline-none focus:border-[#39359D]"
                />
              </div>
              <div>
                <label className="mb-1 block font-medium text-[#334155]">
                  Data Type
                </label>
                <CustomSelect
                  value={attrType}
                  onChange={setAttrType}
                  options={[
                    'string',
                    'uuid',
                    'integer',
                    'bigint',
                    'numeric',
                    'boolean',
                    'date',
                    'timestamptz',
                    'jsonb',
                  ]}
                />
              </div>
              <div className="flex flex-wrap gap-4 pt-1">
                <label className="inline-flex cursor-pointer items-center gap-2 text-[12px] text-[#334155]">
                  <input
                    type="checkbox"
                    checked={attrIsPk}
                    onChange={(e) => setAttrIsPk(e.target.checked)}
                    className="accent-[#39359D]"
                  />
                  Primary Key (PK)
                </label>
                <label className="inline-flex cursor-pointer items-center gap-2 text-[12px] text-[#334155]">
                  <input
                    type="checkbox"
                    checked={attrIsFk}
                    onChange={(e) => setAttrIsFk(e.target.checked)}
                    className="accent-[#39359D]"
                  />
                  Foreign Key (FK)
                </label>
                <label className="inline-flex cursor-pointer items-center gap-2 text-[12px] text-[#334155]">
                  <input
                    type="checkbox"
                    checked={attrNullable}
                    onChange={(e) => setAttrNullable(e.target.checked)}
                    className="accent-[#39359D]"
                  />
                  Nullable
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-[#E2E8F0] bg-[#FAFAFA] px-5 py-3">
              <button
                type="button"
                onClick={() => setAttrModalEntityIdx(null)}
                className="h-8 cursor-pointer rounded-lg border border-[#E2E8F0] bg-white px-3 text-[12px] font-medium text-[#334155]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="h-8 cursor-pointer rounded-lg bg-[#39359D] px-4 text-[12px] font-semibold text-white hover:bg-[#2E2A82]"
              >
                Add Attribute
              </button>
            </div>
          </form>
        </div>
      )}

      {relModalOpen && selectedOntology && (
        <div
          onClick={() => setRelModalOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-[1px]"
        >
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={saveRelationshipModal}
            className="w-full max-w-md rounded-xl border border-[#E2E8F0] bg-white shadow-2xl overflow-hidden"
          >
            <div className="flex items-center justify-between border-b border-[#E2E8F0] px-5 py-3">
              <h3 className="text-[14px] font-semibold text-[#0F172A]">
                Add Relationship
              </h3>
              <button
                type="button"
                onClick={() => setRelModalOpen(false)}
                className="cursor-pointer text-[#94A3B8] hover:text-[#0F172A]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-3.5 p-5 text-[12.5px]">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block font-medium text-[#334155]">
                    Source Entity
                  </label>
                  <CustomSelect
                    value={relSource}
                    onChange={setRelSource}
                    options={selectedOntology.entities.map((e) => e.name)}
                  />
                </div>
                <div>
                  <label className="mb-1 block font-medium text-[#334155]">
                    Target Entity
                  </label>
                  <CustomSelect
                    value={relTarget}
                    onChange={setRelTarget}
                    options={selectedOntology.entities.map((e) => e.name)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block font-medium text-[#334155]">
                    Cardinality
                  </label>
                  <CustomSelect
                    value={relCardinality}
                    onChange={setRelCardinality}
                    options={['1:1', '1:N', 'N:1', 'N:M']}
                  />
                </div>
                <div>
                  <label className="mb-1 block font-medium text-[#334155]">
                    Label
                  </label>
                  <input
                    type="text"
                    value={relLabel}
                    onChange={(e) => setRelLabel(e.target.value)}
                    placeholder="places / belongs_to"
                    className="h-9 w-full rounded-lg border border-[#CBD5E1] px-3 text-[13px] outline-none focus:border-[#39359D]"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-[#E2E8F0] bg-[#FAFAFA] px-5 py-3">
              <button
                type="button"
                onClick={() => setRelModalOpen(false)}
                className="h-8 cursor-pointer rounded-lg border border-[#E2E8F0] bg-white px-3 text-[12px] font-medium text-[#334155]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="h-8 cursor-pointer rounded-lg bg-[#39359D] px-4 text-[12px] font-semibold text-white hover:bg-[#2E2A82]"
              >
                Add Relation
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Custom Delete Confirmation Popup */}
      {deleteTarget && (
        <div
          onClick={() => !deleting && setDeleteTarget(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-[1.5px]"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-xl border border-[#E2E8F0] bg-white shadow-2xl overflow-hidden"
          >
            <div className="flex items-start gap-3 px-5 pt-5 pb-4">
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 text-rose-600">
                <AlertTriangle className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-[15px] font-semibold text-[#0F172A]">
                  Delete "{deleteTarget.name}"?
                </h3>
                <p className="mt-1 text-[13px] leading-relaxed text-[#64748B]">
                  This permanently removes this ontology version and all its entity and relationship definitions.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-[#E2E8F0] bg-[#FAFAFA] px-5 py-3">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setDeleteTarget(null)}
                className="h-8 cursor-pointer rounded-lg border border-[#E2E8F0] bg-white px-3.5 text-[12.5px] font-medium text-[#334155]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleConfirmDelete}
                className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg bg-rose-600 px-3.5 text-[12.5px] font-medium text-white hover:bg-rose-700 disabled:opacity-60"
              >
                {deleting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {deleting ? 'Deleting...' : 'Delete Ontology'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   EMBEDDED FULL-SCREEN ARCHITECT WORKSPACE (AI AGENT)
   ═══════════════════════════════════════════════════════════════ */
const C = {
  primary: '#39359D',
  onPrimary: '#ffffff',
  ink: '#0F172A',
  body: '#475569',
  mute: '#64748B',
  hairline: '#E2E8F0',
  hairlineStrong: '#CBD5E1',
  canvas: '#ffffff',
  canvasSoft: '#F8FAFC',
  canvasSoft2: '#F1F5F9',
  link: '#39359D',
  linkDeep: '#2E2A82',
  linkBgSoft: '#EEF2FF',
  error: '#E11D48',
  errorSoft: '#FFF1F2',
  errorDeep: '#BE123C',
  warning: '#F59E0B',
  warningSoft: '#FFFBEB',
  warningDeep: '#B45309',
} as const

const FONT_SANS = 'Geist, Inter, system-ui, -apple-system, "Segoe UI", sans-serif'
const FONT_MONO = 'Geist Mono, ui-monospace, SFMono-Regular, Menlo, Monaco, monospace'

interface ChatTurn {
  id: string
  role: 'user' | 'assistant' | 'error' | 'summary'
  content: string
  shouldStream?: boolean
  errorInfo?: { title: string; detail: string; hint?: string }
  failedPrompt?: string
  reasoningSteps?: Array<{ stage: string; summary: string }>
  planData?: any
  entityCount?: number
  relationshipCount?: number
  timestamp: number
}

interface ChatSession {
  id: string
  title: string
  updatedAt: number
  turns: ChatTurn[]
}

const PROMPT_SUGGESTIONS = [
  {
    title: 'Inspect active canvas',
    prompt: 'What entities, attributes, and relationships are currently in this ontology?',
  },
  {
    title: 'Extend domain model',
    prompt: 'Suggest and add 4 missing business entities with foreign keys',
  },
  {
    title: 'Standardize audit columns',
    prompt: 'Add standard audit fields (created_at, updated_at) to core entities',
  },
  {
    title: 'Order-to-cash model',
    prompt: 'Generate an Order-to-Cash schema with Customer, SalesOrder, Invoice, and Payment',
  },
]

function ArchitectWorkspace({
  ontology,
  onOntologyUpdated,
  onClose,
}: {
  ontology: OntologyModel
  onOntologyUpdated: (ont: OntologyModel) => void
  onClose: () => void
}) {
  const storageKey = `ontology_architect_sessions_${ontology.ontology_version_id}`

  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [activeSessionId, setActiveSessionId] = useState('')
  const [historyRailOpen, setHistoryRailOpen] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [copiedTurnId, setCopiedTurnId] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [mode, setMode] = useState<'action' | 'plan'>('action')
  const [busy, setBusy] = useState(false)
  const [summarizing, setSummarizing] = useState(false)
  const [applyingPlanId, setApplyingPlanId] = useState<string | null>(null)
  const [expandedStepsId, setExpandedStepsId] = useState<string | null>(null)

  const feedRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 60)
  }, [])

  // Load chat sessions from MongoDB, fall back to localStorage
  useEffect(() => {
    let isMounted = true
    async function loadSessions() {
      try {
        const remote = await ontologyApi.getChatSessions(ontology.ontology_version_id)
        if (isMounted && Array.isArray(remote) && remote.length > 0) {
          setSessions(remote)
          setActiveSessionId(remote[0].id)
          try {
            localStorage.setItem(storageKey, JSON.stringify(remote.slice(0, 20)))
          } catch {}
          return
        }
      } catch (err) {
        console.warn('Remote chat sessions unavailable, using local cache:', err)
      }

      try {
        const raw = localStorage.getItem(storageKey)
        if (raw) {
          const parsed: ChatSession[] = JSON.parse(raw)
          if (Array.isArray(parsed) && parsed.length > 0) {
            if (isMounted) {
              setSessions(parsed)
              setActiveSessionId(parsed[0].id)
            }
            ontologyApi
              .saveChatSessions(ontology.ontology_version_id, parsed)
              .catch(() => {})
            return
          }
        }
      } catch {}

      const initial: ChatSession = {
        id: `sess-${Date.now()}`,
        title: 'Session 1',
        updatedAt: Date.now(),
        turns: [],
      }
      if (isMounted) {
        setSessions([initial])
        setActiveSessionId(initial.id)
      }
      ontologyApi
        .saveChatSessions(ontology.ontology_version_id, [initial])
        .catch(() => {})
    }
    void loadSessions()
    return () => {
      isMounted = false
    }
  }, [ontology.ontology_version_id, storageKey])

  const syncSessions = useCallback(
    (nextSessions: ChatSession[]) => {
      setSessions(nextSessions)
      try {
        localStorage.setItem(storageKey, JSON.stringify(nextSessions.slice(0, 20)))
      } catch {}
      ontologyApi
        .saveChatSessions(
          ontology.ontology_version_id,
          nextSessions.slice(0, 20)
        )
        .catch((err) => console.warn('Failed to sync chat sessions to DB:', err))
    },
    [ontology.ontology_version_id, storageKey]
  )

  const activeSession = useMemo(
    () => sessions.find((s) => s.id === activeSessionId) || sessions[0],
    [sessions, activeSessionId]
  )
  const turns = activeSession?.turns || []

  useEffect(() => {
    if (feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight
  }, [turns.length, busy])

  const appendTurn = (sessionId: string, turn: ChatTurn, maybeTitle?: string) => {
    setSessions((prev) => {
      const next = prev.map((sess) => {
        if (sess.id !== sessionId) return sess
        const nextTitle =
          maybeTitle && sess.turns.length === 0
            ? maybeTitle.slice(0, 36) + (maybeTitle.length > 36 ? '…' : '')
            : sess.title
        return {
          ...sess,
          title: nextTitle,
          updatedAt: Date.now(),
          turns: [...sess.turns, turn],
        }
      })
      try {
        localStorage.setItem(storageKey, JSON.stringify(next.slice(0, 20)))
      } catch {}
      ontologyApi
        .saveChatSessions(ontology.ontology_version_id, next.slice(0, 20))
        .catch((err) => console.warn('Failed to sync chat turn to DB:', err))
      return next
    })
  }

  const handleDeleteSession = async (sessId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    if (!confirm('Are you sure you want to delete this chat session?')) return
    const next = sessions.filter((s) => s.id !== sessId)

    try {
      await ontologyApi.deleteChatSession(ontology.ontology_version_id, sessId)
    } catch (err) {
      console.warn('Backend chat deletion failed:', err)
    }

    if (next.length === 0) {
      const fresh: ChatSession = {
        id: `sess-${Date.now()}`,
        title: 'New Session',
        updatedAt: Date.now(),
        turns: [],
      }
      syncSessions([fresh])
      setActiveSessionId(fresh.id)
    } else {
      syncSessions(next)
      if (activeSessionId === sessId) {
        setActiveSessionId(next[0].id)
      }
    }
  }

  const handleClearChat = async () => {
    if (!activeSession || activeSession.turns.length === 0) return
    if (!confirm('Clear all messages in this conversation?')) return
    const next = sessions.map((s) =>
      s.id === activeSession.id ? { ...s, turns: [], updatedAt: Date.now() } : s
    )
    syncSessions(next)
  }

  const handleDeleteTurn = (turnId: string) => {
    if (!activeSession) return
    const next = sessions.map((s) =>
      s.id === activeSession.id
        ? { ...s, turns: s.turns.filter((t) => t.id !== turnId), updatedAt: Date.now() }
        : s
    )
    syncSessions(next)
  }

  const handleCopyTurn = (content: string, turnId: string) => {
    navigator.clipboard.writeText(content).catch(() => {})
    setCopiedTurnId(turnId)
    setTimeout(() => setCopiedTurnId((cur) => (cur === turnId ? null : cur)), 2000)
  }

  const sendPrompt = async (rawPrompt?: string) => {
    const promptText = (rawPrompt ?? input).trim()
    if (!promptText || busy || !activeSession) return
    const sessId = activeSession.id
    if (!rawPrompt) setInput('')
    appendTurn(
      sessId,
      { id: `u-${Date.now()}`, role: 'user', content: promptText, timestamp: Date.now() },
      promptText
    )
    setBusy(true)
    try {
      const historyPayload = turns
        .filter((t) => t.role === 'user' || t.role === 'assistant' || t.role === 'summary')
        .slice(-8)
        .map((t) => ({
          role: t.role === 'summary' ? 'assistant' : t.role,
          content: t.content,
        }))

      const res = await ontologyApi.agentGenerate({
        project_id: ontology.project_id || activeProjectStorage.get() || 'proj-default',
        prompt: promptText,
        ontology_name: ontology.name,
        domain: ontology.domain,
        target_ontology_id: ontology.ontology_version_id,
        chat_history: historyPayload,
        mode,
      })

      if (res?.status === 'ERROR' || res?.error) {
        appendTurn(sessId, {
          id: `err-${Date.now()}`,
          role: 'error',
          content: res.error || 'Unable to execute ontology operation.',
          failedPrompt: promptText,
          timestamp: Date.now(),
        })
        return
      }

      if (res?.ontology && res?.status === 'SUCCESS') {
        onOntologyUpdated(res.ontology)
      }

      const replyText =
        (res?.response_markdown && res.response_markdown.trim()) ||
        (res?.message && res.message.trim()) ||
        'Completed ontology operation.'

      appendTurn(sessId, {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: replyText,
        reasoningSteps: res?.reasoning_steps || [],
        planData: res?.status === 'PLAN_READY' ? res?.plan_data : undefined,
        entityCount: res?.entity_count || 0,
        relationshipCount: res?.relationship_count || 0,
        timestamp: Date.now(),
      })
    } catch (err: any) {
      appendTurn(sessId, {
        id: `err-${Date.now()}`,
        role: 'error',
        content: err?.message || 'Agent request failed.',
        failedPrompt: promptText,
        timestamp: Date.now(),
      })
    } finally {
      setBusy(false)
    }
  }

  const handleApprovePlan = async (turn: ChatTurn) => {
    if (!turn.planData || !activeSession || applyingPlanId) return
    setApplyingPlanId(turn.id)
    try {
      const res = await ontologyApi.applyAgentPlan({
        project_id: ontology.project_id || activeProjectStorage.get() || 'proj-default',
        plan_data: turn.planData,
        target_ontology_id: ontology.ontology_version_id,
      })
      if (res?.ontology) onOntologyUpdated(res.ontology)
      setSessions((prev) => {
        const next = prev.map((sess) =>
          sess.id !== activeSession.id
            ? sess
            : {
                ...sess,
                turns: sess.turns.map((t) =>
                  t.id === turn.id
                    ? {
                        ...t,
                        planData: undefined,
                        content: `${t.content}\n\n**Status:** Blueprint applied to canvas.`,
                      }
                    : t
                ),
              }
        )
        syncSessions(next)
        return next
      })
    } finally {
      setApplyingPlanId(null)
    }
  }

  const handleSummarize = async () => {
    if (!activeSession || turns.length < 2 || summarizing) return
    setSummarizing(true)
    try {
      const historyPayload = turns
        .filter((t) => t.role === 'user' || t.role === 'assistant')
        .map((t) => ({ role: t.role, content: t.content }))
      const res = await ontologyApi.summarizeChat({ chat_history: historyPayload })
      appendTurn(activeSession.id, {
        id: `sum-${Date.now()}`,
        role: 'summary',
        content: res?.summary || 'Context summarized.',
        timestamp: Date.now(),
      })
    } finally {
      setSummarizing(false)
    }
  }

  return (
    <div
      style={{ fontFamily: FONT_SANS }}
      className={
        isExpanded
          ? 'fixed inset-0 z-50 flex flex-col bg-[#F8FAFC] text-[#0F172A]'
          : 'relative w-full sm:w-[470px] md:w-[500px] h-full shrink-0 border-l border-[#E2E8F0] flex flex-col bg-[#F8FAFC] text-[#0F172A] shadow-xl z-30 transition-all'
      }
    >
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E2E8F0] bg-white px-3.5 py-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={() => setHistoryRailOpen((v) => !v)}
            title="Toggle Sessions History"
            className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border border-[#E2E8F0] bg-white text-[#475569] hover:bg-[#F8FAFC]"
          >
            {historyRailOpen ? (
              <PanelLeftClose className="h-3.5 w-3.5" />
            ) : (
              <PanelLeftOpen className="h-3.5 w-3.5" />
            )}
          </button>
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[#39359D] font-mono text-[10.5px] font-bold text-white shadow-xs">
            OA
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[13.5px] font-bold text-[#0F172A] truncate">
                Ontology Architect
              </span>
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <span className="font-mono text-[10.5px] text-[#64748B] truncate">
              Groq · Llama 3.3 70B
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Mode Switcher */}
          <div className="inline-flex rounded-md border border-[#E2E8F0] bg-[#F1F5F9] p-0.5">
            {(['action', 'plan'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`h-6 cursor-pointer rounded px-2 text-[11px] font-medium capitalize ${
                  mode === m
                    ? 'bg-white text-[#0F172A] shadow-2xs font-semibold'
                    : 'text-[#64748B] hover:text-[#0F172A]'
                }`}
              >
                {m === 'action' ? 'Direct' : 'Blueprint'}
              </button>
            ))}
          </div>

          {/* Clear Current Chat */}
          <button
            type="button"
            disabled={turns.length === 0}
            onClick={handleClearChat}
            title="Clear chat messages"
            className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border border-[#E2E8F0] bg-white text-[#64748B] hover:text-rose-600 hover:bg-rose-50 disabled:opacity-30"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>

          {/* Expand / Collapse Fullscreen */}
          <button
            type="button"
            onClick={() => setIsExpanded((v) => !v)}
            title={isExpanded ? 'Collapse to side pane' : 'Expand full screen'}
            className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border border-[#E2E8F0] bg-white text-[#475569] hover:bg-[#F8FAFC]"
          >
            {isExpanded ? (
              <Shrink className="h-3.5 w-3.5" />
            ) : (
              <Expand className="h-3.5 w-3.5" />
            )}
          </button>

          {/* Close Panel */}
          <button
            type="button"
            onClick={onClose}
            title="Close Assistant"
            className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border border-[#E2E8F0] bg-white text-[#0F172A] hover:border-[#39359D] hover:text-[#39359D]"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </header>

      {/* Workspace Body */}
      <div className="relative flex flex-1 min-h-0 overflow-hidden">
        {historyRailOpen && (
          <>
            <div
              onClick={() => setHistoryRailOpen(false)}
              className="absolute inset-0 z-10 bg-slate-950/20 backdrop-blur-2xs"
            />
            <aside className="absolute inset-y-0 left-0 z-20 flex w-64 flex-col border-r border-[#E2E8F0] bg-white shadow-xl">
              <div className="flex items-center justify-between border-b border-[#E2E8F0] bg-[#FAFAFA] px-3 py-2">
                <span className="font-mono text-[10.5px] uppercase font-semibold text-[#64748B]">
                  Chat Sessions
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const next: ChatSession = {
                      id: `sess-${Date.now()}`,
                      title: `Session ${sessions.length + 1}`,
                      updatedAt: Date.now(),
                      turns: [],
                    }
                    syncSessions([next, ...sessions])
                    setActiveSessionId(next.id)
                    setHistoryRailOpen(false)
                  }}
                  className="inline-flex h-6 cursor-pointer items-center gap-1 rounded bg-[#39359D] px-2 text-[11px] font-medium text-white hover:bg-[#2E2A82]"
                >
                  <MessageSquarePlus className="h-3 w-3" />
                  New
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-1.5 space-y-1">
                {sessions.map((sess) => (
                  <div
                    key={sess.id}
                    onClick={() => {
                      setActiveSessionId(sess.id)
                      setHistoryRailOpen(false)
                    }}
                    className={`flex cursor-pointer items-center justify-between rounded-lg px-2.5 py-2 text-[12px] group transition-colors ${
                      sess.id === activeSessionId
                        ? 'bg-[#EEF2FF] font-semibold text-[#39359D]'
                        : 'text-[#475569] hover:bg-[#F8FAFC]'
                    }`}
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <div className="truncate">{sess.title}</div>
                      <div className="text-[10px] font-mono text-[#94A3B8]">
                        {sess.turns?.length || 0} message(s)
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => handleDeleteSession(sess.id, e)}
                      title="Delete chat session"
                      className="opacity-0 group-hover:opacity-100 p-1 text-[#94A3B8] hover:text-rose-600 rounded transition-opacity"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </aside>
          </>
        )}

        <div className="flex flex-1 flex-col min-w-0">
          <div ref={feedRef} className="flex-1 overflow-y-auto px-4 py-5 space-y-4">
            {turns.length === 0 ? (
              <div className="space-y-5 py-4">
                <div className="text-center space-y-1">
                  <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-[#39359D]/10 text-[#39359D]">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <h3 className="text-[15px] font-bold tracking-tight text-[#0F172A]">
                    Architect Agent for {ontology.name}
                  </h3>
                  <p className="text-[12px] text-[#64748B] max-w-xs mx-auto">
                    Synthesize entities, resolve foreign keys, or inspect and modify existing schema.
                  </p>
                </div>

                <div className="grid gap-2">
                  {PROMPT_SUGGESTIONS.map((tpl) => (
                    <button
                      key={tpl.title}
                      type="button"
                      onClick={() => sendPrompt(tpl.prompt)}
                      disabled={busy}
                      className="flex cursor-pointer flex-col gap-0.5 rounded-xl border border-[#E2E8F0] bg-white p-3 text-left shadow-2xs transition-colors hover:border-[#39359D]"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[12.5px] font-semibold text-[#0F172A]">
                          {tpl.title}
                        </span>
                        <ArrowRight className="h-3 w-3 text-[#39359D]" />
                      </div>
                      <p className="text-[11.5px] text-[#64748B]">{tpl.prompt}</p>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              turns.map((turn) => {
                if (turn.role === 'user') {
                  return (
                    <div key={turn.id} className="flex justify-end group">
                      <div className="relative max-w-[85%] rounded-2xl bg-slate-900 text-white px-4 py-2.5 text-[13px] shadow-xs">
                        <div className="whitespace-pre-wrap">{turn.content}</div>
                        <button
                          type="button"
                          onClick={() => handleDeleteTurn(turn.id)}
                          title="Delete message"
                          className="opacity-0 group-hover:opacity-100 absolute -left-7 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-rose-600 transition-opacity"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  )
                }

                if (turn.role === 'error') {
                  return (
                    <div
                      key={turn.id}
                      className="rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-[12px] text-rose-800 space-y-2 shadow-2xs"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 font-semibold">
                          <AlertCircle className="h-4 w-4 text-rose-600" />
                          <span>Operation Failed</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteTurn(turn.id)}
                          className="text-rose-400 hover:text-rose-700"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                      <p className="font-mono text-[11.5px] leading-relaxed">{turn.content}</p>
                      {turn.failedPrompt && (
                        <button
                          type="button"
                          onClick={() => sendPrompt(turn.failedPrompt!)}
                          className="inline-flex h-6.5 cursor-pointer items-center gap-1 rounded border border-rose-300 bg-white px-2.5 font-mono text-[11px] text-rose-700 hover:bg-rose-50"
                        >
                          <RefreshCw className="h-3 w-3" />
                          Retry
                        </button>
                      )}
                    </div>
                  )
                }

                const stepsOpen = expandedStepsId === turn.id
                return (
                  <div
                    key={turn.id}
                    className="rounded-2xl border border-[#E2E8F0] bg-white p-3.5 shadow-xs space-y-2.5 group"
                  >
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <div className="flex items-center gap-1.5">
                        <div className="flex h-5 w-5 items-center justify-center rounded bg-[#39359D] text-[10px] font-bold text-white">
                          OA
                        </div>
                        <span className="font-mono text-[10.5px] font-semibold text-slate-700 uppercase">
                          {turn.role === 'summary' ? 'Context Summary' : 'Architect Agent'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        {(turn.entityCount || 0) > 0 && (
                          <span className="rounded-full border border-[#39359D]/25 bg-[#EEF2FF] px-2 py-0.2 font-mono text-[10.5px] font-semibold text-[#39359D]">
                            +{turn.entityCount} entities
                          </span>
                        )}

                        {/* Copy response */}
                        <button
                          type="button"
                          onClick={() => handleCopyTurn(turn.content, turn.id)}
                          title="Copy response"
                          className="p-1 text-slate-400 hover:text-slate-700 rounded transition-colors"
                        >
                          {copiedTurnId === turn.id ? (
                            <Check className="h-3 w-3 text-emerald-600" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </button>

                        {/* Delete turn */}
                        <button
                          type="button"
                          onClick={() => handleDeleteTurn(turn.id)}
                          title="Delete turn"
                          className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-600 rounded transition-opacity"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>

                    <div className="text-[13px] leading-relaxed text-[#0F172A] prose prose-slate max-w-none">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          p: ({ children }) => (
                            <p className="mb-2 last:mb-0 leading-relaxed text-[#0F172A]">
                              {children}
                            </p>
                          ),
                          h1: ({ children }) => (
                            <h1 className="text-sm font-bold text-[#0F172A] mt-2 mb-1 border-b border-[#E2E8F0] pb-0.5">
                              {children}
                            </h1>
                          ),
                          h2: ({ children }) => (
                            <h2 className="text-[13.5px] font-bold text-[#0F172A] mt-2 mb-1">
                              {children}
                            </h2>
                          ),
                          h3: ({ children }) => (
                            <h3 className="text-[12.5px] font-semibold text-[#1E293B] mt-1.5 mb-0.5">
                              {children}
                            </h3>
                          ),
                          ul: ({ children }) => (
                            <ul className="list-disc pl-4 my-1.5 space-y-0.5 text-[#334155]">
                              {children}
                            </ul>
                          ),
                          ol: ({ children }) => (
                            <ol className="list-decimal pl-4 my-1.5 space-y-0.5 text-[#334155]">
                              {children}
                            </ol>
                          ),
                          li: ({ children }) => (
                            <li className="leading-snug text-[12.5px]">{children}</li>
                          ),
                          table: ({ children }) => (
                            <div className="my-2 overflow-x-auto rounded border border-[#E2E8F0]">
                              <table className="min-w-full divide-y divide-[#E2E8F0] text-left text-[11.5px]">
                                {children}
                              </table>
                            </div>
                          ),
                          thead: ({ children }) => (
                            <thead className="bg-[#F8FAFC] text-[10.5px] font-semibold text-[#475569] uppercase">
                              {children}
                            </thead>
                          ),
                          tbody: ({ children }) => (
                            <tbody className="divide-y divide-[#E2E8F0] bg-white">
                              {children}
                            </tbody>
                          ),
                          th: ({ children }) => (
                            <th className="px-2.5 py-1.5 font-semibold text-[#334155]">
                              {children}
                            </th>
                          ),
                          td: ({ children }) => (
                            <td className="px-2.5 py-1.5 text-[#334155]">
                              {children}
                            </td>
                          ),
                          code({ node, inline, className, children, ...props }: any) {
                            return !inline ? (
                              <pre className="my-2 overflow-x-auto rounded-lg bg-slate-900 p-2.5 text-[11px] font-mono text-emerald-400">
                                <code className={className} {...props}>
                                  {children}
                                </code>
                              </pre>
                            ) : (
                              <code
                                className="rounded bg-slate-100 px-1 py-0.2 font-mono text-[11.5px] font-semibold text-[#39359D]"
                                {...props}
                              >
                                {children}
                              </code>
                            )
                          },
                          blockquote: ({ children }) => (
                            <blockquote className="border-l-2 border-[#39359D] pl-2.5 my-2 italic text-[#475569] bg-slate-50 py-1 rounded-r text-[12px]">
                              {children}
                            </blockquote>
                          ),
                        }}
                      >
                        {turn.content}
                      </ReactMarkdown>
                    </div>

                    {turn.planData && (
                      <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3 space-y-2">
                        <div className="text-[12px] font-semibold text-amber-900">
                          Blueprint Ready (
                          {turn.planData.entities?.length || 0} entities ·{' '}
                          {turn.planData.relationships?.length || 0} relations)
                        </div>
                        <button
                          type="button"
                          disabled={applyingPlanId === turn.id}
                          onClick={() => handleApprovePlan(turn)}
                          className="inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-lg bg-[#39359D] px-3 text-[11.5px] font-medium text-white hover:bg-[#2E2A82] shadow-xs disabled:opacity-50"
                        >
                          {applyingPlanId === turn.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Play className="h-3 w-3" />
                          )}
                          Approve &amp; Apply to Canvas
                        </button>
                      </div>
                    )}

                    {turn.reasoningSteps && turn.reasoningSteps.length > 0 && (
                      <div className="pt-1 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedStepsId(stepsOpen ? null : turn.id)
                          }
                          className="inline-flex cursor-pointer items-center gap-1 font-mono text-[10.5px] text-[#64748B] hover:text-slate-900"
                        >
                          {stepsOpen ? (
                            <ChevronDown className="h-3 w-3" />
                          ) : (
                            <ChevronRight className="h-3 w-3" />
                          )}
                          {turn.reasoningSteps.length} reasoning steps
                        </button>
                        {stepsOpen && (
                          <div className="mt-1.5 space-y-1 border-l-2 border-[#E2E8F0] pl-2.5 text-[11px] text-[#475569]">
                            {turn.reasoningSteps.map((st, i) => (
                              <div key={i}>
                                <strong className="font-mono text-[10.5px] text-[#0F172A]">
                                  {st.stage}
                                </strong>
                                : {st.summary}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })
            )}

            {busy && (
              <div className="flex items-center gap-2 rounded-xl bg-white border border-slate-200 p-3 font-mono text-[11.5px] text-[#39359D] shadow-xs">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Synthesizing domain ontology...</span>
              </div>
            )}
          </div>

          {/* Prompt Bar */}
          <div className="border-t border-[#E2E8F0] bg-white p-3">
            <form
              onSubmit={(e) => {
                e.preventDefault()
                sendPrompt()
              }}
              className="space-y-1.5"
            >
              <div className="flex items-end gap-2 rounded-xl border border-slate-300 bg-slate-50/50 p-2 focus-within:bg-white focus-within:border-[#39359D] transition-colors">
                <textarea
                  ref={inputRef}
                  rows={2}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      sendPrompt()
                    }
                  }}
                  placeholder="Ask Architect to create entities, generate models, or suggest relations..."
                  className="flex-1 resize-none bg-transparent px-1.5 py-0.5 text-[13px] text-[#0F172A] placeholder:text-[#94A3B8] outline-none"
                />
                <button
                  type="submit"
                  disabled={busy || !input.trim()}
                  className="inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg bg-[#39359D] text-white hover:bg-[#2E2A82] disabled:opacity-40 transition shadow-xs"
                >
                  {busy ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </button>
              </div>
              <div className="flex items-center justify-between text-[10.5px] text-slate-400 font-mono px-1">
                <span>Enter to send · Shift+Enter newline</span>
                <span>
                  {ontology.entities.length}e · {ontology.relationships.length}r
                </span>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
