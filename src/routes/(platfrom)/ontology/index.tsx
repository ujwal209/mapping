import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronsDownUp,
  ChevronsUpDown,
  Copy,
  Expand,
  GitBranch,
  Hand,
  Layers,
  LayoutGrid,
  Link2,
  Loader2,
  Map as MapIcon,
  Maximize2,
  MessageSquarePlus,
  Minus,
  MousePointer2,
  Network,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  RefreshCw,
  Save,
  Search,
  Send,
  Shrink,
  Table2,
  Trash2,
  X,
  ZoomIn,
  ZoomOut,
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

/* ────────────────────────────────────────────────────────────
   CONSTANTS
   ──────────────────────────────────────────────────────────── */
const CARD_W = 264
const CARD_COLLAPSED_H = 44
const CARD_EXPANDED_H = 204
const MINIMAP_W = 196
const MINIMAP_H = 132
const MIN_ZOOM = 0.25
const MAX_ZOOM = 2.5
const GRID_BASE = 24
const SURFACE = '#F8FAFC'
const FONT_STACK =
  "'Google Sans', 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"

/* ────────────────────────────────────────────────────────────
   MAIN PAGE
   ──────────────────────────────────────────────────────────── */
function OntologyStudioPage() {
  const { version_id } = Route.useSearch()

  const [projects, setProjects] = useState<ProjectItem[]>([])
  const [projectId, setProjectId] = useState<string>(
    activeProjectStorage.get() || ''
  )
  const [ontologies, setOntologies] = useState<OntologyModel[]>([])
  const [loadingList, setLoadingList] = useState(true)
  const [listError, setListError] = useState<string | null>(null)
  const [registrySearch, setRegistrySearch] = useState('')

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
  const [isAgentOpen, setIsAgentOpen] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState<OntologyModel | null>(null)
  const [deleting, setDeleting] = useState(false)

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

  /* Collapsible groups in tables & canvas (empty Set = minimized by default) */
  const [expandedCanvasCardIds, setExpandedCanvasCardIds] = useState<
    Set<string>
  >(new Set())
  const [expandedEntityIds, setExpandedEntityIds] = useState<Set<string>>(
    new Set()
  )
  const [expandedRelationshipIds, setExpandedRelationshipIds] = useState<
    Set<string>
  >(new Set())

  /* Canvas */
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 48, y: 48 })
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
  const latestDragPosRef = useRef<{
    idx: number
    pos: { x: number; y: number }
  } | null>(null)

  const [draggingEntityIdx, setDraggingEntityIdx] = useState<number | null>(
    null
  )
  const dragOffsetRef = useRef({ x: 0, y: 0 })
  const canvasRef = useRef<HTMLDivElement>(null)

  /* Ensure Google Sans font is loaded */
  useEffect(() => {
    const id = 'google-sans-font-link'
    if (!document.getElementById(id)) {
      const link = document.createElement('link')
      link.id = id
      link.rel = 'stylesheet'
      link.href =
        'https://fonts.googleapis.com/css2?family=Google+Sans:wght@400;500;600;700&display=swap'
      document.head.appendChild(link)
    }
  }, [])

  const notify = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast((cur) => (cur === msg ? null : cur)), 2400)
  }

  /* ── Load ─────────────────────────────────────────────────── */
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
        x: (fallbackIdx % 4) * 300 + 48,
        y: Math.floor(fallbackIdx / 4) * 116 + 48,
      }
    },
    []
  )

  const getCardHeight = useCallback(
    (ent: OntologyEntity, idx: number) => {
      const id = ent.entity_id || String(idx)
      return expandedCanvasCardIds.has(id) ? CARD_EXPANDED_H : CARD_COLLAPSED_H
    },
    [expandedCanvasCardIds]
  )

  const normalizeEntityPositions = useCallback(
    (ont: OntologyModel): OntologyModel => {
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
            x: (idx % 4) * 300 + 48,
            y: Math.floor(idx / 4) * 116 + 48,
          },
        }
      })
      return { ...ont, entities, relationships: ont.relationships || [] }
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
          err instanceof ApiError ? err.message : 'Unable to load ontologies.'
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
      setPan({ x: 48, y: 48 })
      setZoom(1)
      setExpandedCanvasCardIds(new Set())
      setExpandedEntityIds(new Set())
      setExpandedRelationshipIds(new Set())
    }
  }

  const handleSaveOntology = async (
    overrideOnt?: OntologyModel,
    silent = false
  ) => {
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
        const srcRef = (
          r.source_entity ||
          r.source_entity_name ||
          r.source_entity_id ||
          ''
        ).toLowerCase()
        const tgtRef = (
          r.target_entity ||
          r.target_entity_name ||
          r.target_entity_id ||
          ''
        ).toLowerCase()
        const srcEnt = entMap.get(srcRef)
        const tgtEnt = entMap.get(tgtRef)
        const srcName =
          srcEnt?.name || r.source_entity || r.source_entity_name || 'src'
        const tgtName =
          tgtEnt?.name || r.target_entity || r.target_entity_name || 'tgt'
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
      if (!silent) notify('Saved')
      return normalized
    } catch (err) {
      if (!silent)
        notify(err instanceof ApiError ? err.message : 'Save failed')
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
      notify('Deleted')
    } catch {
      notify('Delete failed')
    } finally {
      setDeleting(false)
    }
  }

  /* ── Viewport & Zoom helpers ──────────────────────────────── */
  const handleFitView = useCallback(() => {
    if (
      !selectedOntology ||
      selectedOntology.entities.length === 0 ||
      !canvasRef.current
    )
      return
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity
    selectedOntology.entities.forEach((ent, i) => {
      const pos = getEntityPos(ent, i)
      const h = getCardHeight(ent, i)
      if (pos.x < minX) minX = pos.x
      if (pos.y < minY) minY = pos.y
      if (pos.x + CARD_W > maxX) maxX = pos.x + CARD_W
      if (pos.y + h > maxY) maxY = pos.y + h
    })
    const rect = canvasRef.current.getBoundingClientRect()
    const padding = 88
    const contentW = maxX - minX + padding * 2
    const contentH = maxY - minY + padding * 2
    const scaleX = rect.width / contentW
    const scaleY = rect.height / contentH
    const nextZoom = Math.min(
      MAX_ZOOM,
      Math.max(MIN_ZOOM, Math.min(scaleX, scaleY, 1.05))
    )
    const nextPanX =
      (rect.width - (maxX - minX) * nextZoom) / 2 - minX * nextZoom
    const nextPanY =
      (rect.height - (maxY - minY) * nextZoom) / 2 - minY * nextZoom
    setZoom(+nextZoom.toFixed(3))
    setPan({ x: Math.round(nextPanX), y: Math.round(nextPanY) })
  }, [selectedOntology, getEntityPos, getCardHeight])

  const zoomAtCenter = useCallback((factor: number) => {
    const el = canvasRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const cx = rect.width / 2
    const cy = rect.height / 2
    setZoom((prev) => {
      const next = Math.min(
        MAX_ZOOM,
        Math.max(MIN_ZOOM, +(prev * factor).toFixed(3))
      )
      setPan((p) => ({
        x: cx - ((cx - p.x) * next) / prev,
        y: cy - ((cy - p.y) * next) / prev,
      }))
      return next
    })
  }, [])

  /* ── Smooth Ctrl/Cmd + wheel zoom & keyboard zoom ─────────── */
  useEffect(() => {
    const el = canvasRef.current
    if (!el) return

    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault()
        e.stopPropagation()
        const rect = el.getBoundingClientRect()
        const mx = e.clientX - rect.left
        const my = e.clientY - rect.top
        const clampedDelta = Math.max(-100, Math.min(100, e.deltaY))
        const factor = Math.exp(-clampedDelta * 0.0025)

        setZoom((prev) => {
          const next = Math.min(
            MAX_ZOOM,
            Math.max(MIN_ZOOM, +(prev * factor).toFixed(4))
          )
          setPan((p) => ({
            x: mx - ((mx - p.x) * next) / prev,
            y: my - ((my - p.y) * next) / prev,
          }))
          return next
        })
      }
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (
        ['INPUT', 'TEXTAREA'].includes(
          (e.target as HTMLElement)?.tagName || ''
        )
      ) {
        return
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === '=' || e.key === '+')) {
        e.preventDefault()
        zoomAtCenter(1.15)
      } else if ((e.ctrlKey || e.metaKey) && e.key === '-') {
        e.preventDefault()
        zoomAtCenter(0.87)
      } else if ((e.ctrlKey || e.metaKey) && e.key === '0') {
        e.preventDefault()
        setZoom(1)
      }
    }

    el.addEventListener('wheel', onWheel, { passive: false })
    window.addEventListener('keydown', onKeyDown)
    return () => {
      el.removeEventListener('wheel', onWheel)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [viewMode, activeTab, loadingOnt, selectedOntology, zoomAtCenter])

  /* ── Canvas pointer handlers ──────────────────────────────── */
  const handleCanvasPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 && e.button !== 1) return
    if (e.target !== e.currentTarget) return

    if (canvasTool === 'hand') {
      e.preventDefault()
      setIsPanning(true)
      panStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y }
      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    } else if (canvasTool === 'select') {
      if (!e.shiftKey) setSelectedEntityIds([])
      isSelectingRef.current = true
      setSelectionBox({
        startX: e.clientX,
        startY: e.clientY,
        currentX: e.clientX,
        currentY: e.clientY,
      })
      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    }
  }

  const handleCanvasPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (canvasTool === 'hand' && isPanning) {
      setPan({
        x: e.clientX - panStartRef.current.x,
        y: e.clientY - panStartRef.current.y,
      })
    } else if (canvasTool === 'select' && isSelectingRef.current) {
      setSelectionBox((prev) =>
        prev ? { ...prev, currentX: e.clientX, currentY: e.clientY } : null
      )
    }
  }

  const handleCanvasPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (canvasTool === 'hand' && isPanning) {
      setIsPanning(false)
      try {
        ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
      } catch {}
    } else if (
      canvasTool === 'select' &&
      isSelectingRef.current &&
      selectionBox &&
      selectedOntology
    ) {
      if (canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect()
        const boxX1 =
          Math.min(selectionBox.startX, selectionBox.currentX) - rect.left
        const boxY1 =
          Math.min(selectionBox.startY, selectionBox.currentY) - rect.top
        const boxX2 =
          Math.max(selectionBox.startX, selectionBox.currentX) - rect.left
        const boxY2 =
          Math.max(selectionBox.startY, selectionBox.currentY) - rect.top
        if (boxX2 - boxX1 > 5 || boxY2 - boxY1 > 5) {
          const cardW = CARD_W * zoom
          const newlySelected: string[] = []
          selectedOntology.entities.forEach((ent, i) => {
            const pos = getEntityPos(ent, i)
            const cardH = getCardHeight(ent, i) * zoom
            const screenX = pan.x + pos.x * zoom
            const screenY = pan.y + pos.y * zoom
            const overlaps =
              screenX < boxX2 &&
              screenX + cardW > boxX1 &&
              screenY < boxY2 &&
              screenY + cardH > boxY1
            if (overlaps) newlySelected.push(ent.entity_id || String(i))
          })
          setSelectedEntityIds((prev) =>
            Array.from(new Set([...prev, ...newlySelected]))
          )
        }
      }
      isSelectingRef.current = false
      setSelectionBox(null)
      try {
        ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
      } catch {}
    }
  }

  /* ── Entity drag ──────────────────────────────────────────── */
  const handleEntityPointerDown = (e: React.PointerEvent, idx: number) => {
    if ((e.target as HTMLElement).closest('button')) return
    e.stopPropagation()
    if (!selectedOntology) return

    const ent = selectedOntology.entities[idx]
    const entId = ent.entity_id || String(idx)

    if (canvasTool === 'select') {
      if (e.shiftKey) {
        setSelectedEntityIds((prev) =>
          prev.includes(entId)
            ? prev.filter((id) => id !== entId)
            : [...prev, entId]
        )
      } else {
        setSelectedEntityIds([entId])
      }
      return
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
    const nextX = Math.max(
      0,
      Math.round(e.clientX / zoom - dragOffsetRef.current.x)
    )
    const nextY = Math.max(
      0,
      Math.round(e.clientY / zoom - dragOffsetRef.current.y)
    )
    const nextPos = { x: nextX, y: nextY }
    latestDragPosRef.current = { idx: draggingEntityIdx, pos: nextPos }
    setSelectedOntology((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        entities: prev.entities.map((ent, idx) =>
          idx === draggingEntityIdx ? { ...ent, position: nextPos } : ent
        ),
      }
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
          .catch(() => {})
      }
      setDraggingEntityIdx(null)
      latestDragPosRef.current = null
      try {
        ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
      } catch {}
    }
  }

  const handleAutoLayout = async () => {
    if (!selectedOntology) return
    const anyExpanded = expandedCanvasCardIds.size > 0
    const cols = Math.max(
      2,
      Math.ceil(Math.sqrt(selectedOntology.entities.length))
    )
    const rowSpacing = anyExpanded ? 268 : 112
    const nextEntities = selectedOntology.entities.map((ent, idx) => ({
      ...ent,
      position: {
        x: (idx % cols) * 308 + 48,
        y: Math.floor(idx / cols) * rowSpacing + 48,
      },
    }))
    const updated = { ...selectedOntology, entities: nextEntities }
    setSelectedOntology(updated)
    setOntologies((prev) =>
      prev.map((o) =>
        o.ontology_version_id === updated.ontology_version_id ? updated : o
      )
    )
    setTimeout(handleFitView, 40)
    try {
      await ontologyApi.update(selectedOntology.ontology_version_id, {
        entities: nextEntities,
      })
      notify('Layout applied')
    } catch {}
  }

  const toggleCanvasCardExpand = (id: string) => {
    setExpandedCanvasCardIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAllCanvasCards = () => {
    if (!selectedOntology) return
    if (expandedCanvasCardIds.size > 0) {
      setExpandedCanvasCardIds(new Set())
    } else {
      const allIds = selectedOntology.entities.map(
        (ent, idx) => ent.entity_id || String(idx)
      )
      setExpandedCanvasCardIds(new Set(allIds))
    }
  }

  /* ── CRUD ────────────────────────────────────────────────── */
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
          updatedEnt = await ontologyApi.updateEntity(
            vId,
            targetEnt.entity_id,
            {
              name: cleanName,
              description: entityDescInput.trim(),
            }
          )
        } else {
          updatedEnt = {
            ...targetEnt,
            name: cleanName,
            description: entityDescInput.trim(),
          }
        }
        const nextEntities = selectedOntology.entities.map((ent, i) =>
          i === editingEntityIdx
            ? { ...ent, ...updatedEnt, name: cleanName }
            : ent
        )
        const nextRels = selectedOntology.relationships.map((r) => ({
          ...r,
          source_entity:
            r.source_entity === oldName ? cleanName : r.source_entity,
          source_entity_name:
            r.source_entity_name === oldName
              ? cleanName
              : r.source_entity_name,
          target_entity:
            r.target_entity === oldName ? cleanName : r.target_entity,
          target_entity_name:
            r.target_entity_name === oldName
              ? cleanName
              : r.target_entity_name,
        }))
        const nextOnt = {
          ...selectedOntology,
          entities: nextEntities,
          relationships: nextRels,
        }
        setSelectedOntology(nextOnt)
        await handleSaveOntology(nextOnt, true)
        notify('Entity updated')
      } else {
        const count = selectedOntology.entities.length
        const pos = {
          x: (count % 4) * 300 + 48,
          y: Math.floor(count / 4) * 116 + 48,
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
        notify('Entity added')
      }
      setEntityModalOpen(false)
    } catch (err: any) {
      notify(err?.message || 'Save failed')
    }
  }

  const deleteEntity = async (idx: number) => {
    if (!selectedOntology) return
    const targetEnt = selectedOntology.entities[idx]
    const targetName = targetEnt.name
    const vId = selectedOntology.ontology_version_id
    try {
      if (targetEnt.entity_id)
        await ontologyApi.deleteEntity(vId, targetEnt.entity_id)
      const nextEntities = selectedOntology.entities.filter(
        (_, i) => i !== idx
      )
      const nextRels = selectedOntology.relationships.filter((r) => {
        const srcRef = (
          r.source_entity ||
          r.source_entity_name ||
          r.source_entity_id ||
          ''
        ).toLowerCase()
        const tgtRef = (
          r.target_entity ||
          r.target_entity_name ||
          r.target_entity_id ||
          ''
        ).toLowerCase()
        const mn = targetName.toLowerCase()
        const mi = (targetEnt.entity_id || '').toLowerCase()
        return srcRef !== mn && srcRef !== mi && tgtRef !== mn && tgtRef !== mi
      })
      const nextOnt = {
        ...selectedOntology,
        entities: nextEntities,
        relationships: nextRels,
      }
      setSelectedOntology(nextOnt)
      setOntologies((prev) =>
        prev.map((o) => (o.ontology_version_id === vId ? nextOnt : o))
      )
      notify('Entity deleted')
    } catch (err: any) {
      notify(err?.message || 'Delete failed')
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
    if (attrModalEntityIdx === null || !selectedOntology || !attrName.trim())
      return
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
        idx === attrModalEntityIdx
          ? { ...ent, attributes: nextAttributes }
          : ent
      )
      const nextOnt = { ...selectedOntology, entities: nextEntities }
      setSelectedOntology(nextOnt)
      setOntologies((prev) =>
        prev.map((o) => (o.ontology_version_id === vId ? nextOnt : o))
      )
      const cardId = targetEnt.entity_id || String(attrModalEntityIdx)
      setExpandedCanvasCardIds((prev) => new Set(prev).add(cardId))
      setAttrModalEntityIdx(null)
      notify('Attribute added')
    } catch (err: any) {
      notify(err?.message || 'Save failed')
    }
  }

  const deleteAttribute = async (entityIdx: number, attrIdx: number) => {
    if (!selectedOntology) return
    const targetEnt = selectedOntology.entities[entityIdx]
    const vId = selectedOntology.ontology_version_id
    const nextAttributes = (targetEnt.attributes || []).filter(
      (_, aIdx) => aIdx !== attrIdx
    )
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
      notify(err?.message || 'Delete failed')
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
    const srcEnt = selectedOntology.entities.find(
      (ent) => ent.name === relSource
    )
    const tgtEnt = selectedOntology.entities.find(
      (ent) => ent.name === relTarget
    )
    if (!srcEnt || !tgtEnt) return
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
      notify('Relation added')
    } catch (err: any) {
      notify(err?.message || 'Save failed')
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
        relationships: selectedOntology.relationships.filter(
          (_, i) => i !== idx
        ),
      }
      setSelectedOntology(nextOnt)
      setOntologies((prev) =>
        prev.map((o) => (o.ontology_version_id === vId ? nextOnt : o))
      )
      notify('Relation removed')
    } catch (err: any) {
      notify(err?.message || 'Delete failed')
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

  const toggleEntityExpand = (id: string) => {
    setExpandedEntityIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div
      className="relative h-[calc(100vh-4rem)] w-full overflow-hidden text-slate-900 antialiased"
      style={{ backgroundColor: SURFACE, fontFamily: FONT_STACK }}
    >
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900 px-3.5 py-1.5 text-[12px] font-medium text-white shadow-lg">
          <Check className="h-3.5 w-3.5 text-slate-300" strokeWidth={2.25} />
          <span>{toast}</span>
        </div>
      )}

      {/* ── REGISTRY ───────────────────────────────────────── */}
      {viewMode === 'registry' && (
        <div className="h-full overflow-y-auto">
          <div className="mx-auto max-w-5xl px-8 py-10">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-slate-900">
                  Ontology Registry
                </h1>
                <p className="mt-1 text-[13px] text-slate-500">
                  Versioned domain schemas · {ontologies.length} models
                </p>
              </div>
              <div className="flex items-center gap-2.5">
                {projects.length > 0 && (
                  <div className="w-48">
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
                      placeholder="Project"
                    />
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => loadOntologies()}
                  className="flex h-8.5 w-8.5 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
                  title="Refresh"
                >
                  <RefreshCw
                    className={`h-3.5 w-3.5 ${loadingList ? 'animate-spin' : ''}`}
                    strokeWidth={1.75}
                  />
                </button>
                <Link
                  to="/ontology/new"
                  className="inline-flex h-8.5 items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 text-[12.5px] font-medium text-white shadow-xs transition-colors hover:bg-slate-800"
                >
                  <Plus className="h-3.5 w-3.5" strokeWidth={2.25} />
                  New Model
                </Link>
              </div>
            </div>

            <div className="mt-6 flex items-center gap-3 border-b border-slate-200/80 pb-3.5">
              <div className="relative max-w-sm flex-1">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
                  strokeWidth={1.75}
                />
                <input
                  type="text"
                  value={registrySearch}
                  onChange={(e) => setRegistrySearch(e.target.value)}
                  placeholder="Filter by name, domain, or ID…"
                  className="h-8.5 w-full rounded-lg border border-slate-200 bg-white pl-8.5 pr-3 text-[12.5px] text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-slate-400"
                />
              </div>
            </div>

            {listError && (
              <div className="mt-4 flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-[12.5px] text-slate-800 shadow-xs">
                <AlertCircle className="h-4 w-4 shrink-0 text-slate-700" />
                <span>{listError}</span>
              </div>
            )}

            <div className="mt-4">
              {loadingList ? (
                <div className="space-y-2.5">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="h-16 animate-pulse rounded-xl border border-slate-200 bg-white"
                    />
                  ))}
                </div>
              ) : filteredOntologies.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center">
                  <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-[#F8FAFC]">
                    <Network
                      className="h-4.5 w-4.5 text-slate-500"
                      strokeWidth={1.75}
                    />
                  </div>
                  <h3 className="mt-3 text-[13.5px] font-medium text-slate-900">
                    No domain models found
                  </h3>
                  <p className="mx-auto mt-1 max-w-xs text-[12.5px] text-slate-500">
                    Initialize an ontology schema to define entities and
                    relations.
                  </p>
                  <Link
                    to="/ontology/new"
                    className="mt-4 inline-flex h-8.5 items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 text-[12.5px] font-medium text-white shadow-xs transition-colors hover:bg-slate-800"
                  >
                    <Plus className="h-3.5 w-3.5" strokeWidth={2.25} />
                    New Ontology
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
                  {filteredOntologies.map((ont) => (
                    <div
                      key={ont.ontology_version_id}
                      onClick={() => openBuilder(ont)}
                      className="group flex cursor-pointer items-center justify-between gap-4 px-4 py-3.5 transition-colors hover:bg-[#F8FAFC]"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-[13.5px] font-medium text-slate-900">
                            {ont.name}
                          </span>
                          <span className="shrink-0 rounded-md border border-slate-200 bg-[#F8FAFC] px-1.5 py-0.5 font-mono text-[10px] text-slate-600">
                            v{ont.version_tag || '1.0.0'}
                          </span>
                        </div>
                        <div className="mt-0.5 flex items-center gap-2 text-[12px] text-slate-500">
                          <span>{ont.domain || 'General'}</span>
                          <span className="text-slate-300">·</span>
                          <span className="font-mono text-[11px] tabular-nums">
                            {ont.entities?.length || 0} entities ·{' '}
                            {ont.relationships?.length || 0} relations
                          </span>
                        </div>
                      </div>
                      <div
                        className="flex items-center gap-1.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            openBuilder(ont)
                          }}
                          className="flex h-7.5 items-center gap-1 rounded-lg border border-transparent px-2.5 text-[12px] font-medium text-slate-700 transition-colors hover:border-slate-200 hover:bg-white hover:text-slate-900"
                        >
                          Open
                          <ArrowRight className="h-3 w-3" strokeWidth={2} />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setDeleteTarget(ont)
                          }}
                          className="flex h-7.5 w-7.5 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-200/60 hover:text-slate-900"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── BUILDER ────────────────────────────────────────── */}
      {viewMode === 'builder' && (
        <div className="relative flex h-full w-full flex-col overflow-hidden">
          {loadingOnt || !selectedOntology ? (
            <div className="flex h-full items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-slate-500" />
              <span className="text-[12.5px] text-slate-500">
                Loading schema…
              </span>
            </div>
          ) : (
            <>
              {/* Top bar */}
              <div className="z-20 flex h-12 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4">
                <div className="flex min-w-0 items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setViewMode('registry')}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-[#F8FAFC] hover:text-slate-900"
                    title="Back to registry"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} />
                  </button>
                  <span className="truncate text-[13.5px] font-medium text-slate-900">
                    {selectedOntology.name}
                  </span>
                  <span className="rounded-md border border-slate-200 bg-[#F8FAFC] px-1.5 py-0.5 font-mono text-[10px] text-slate-600">
                    v{selectedOntology.version_tag}
                  </span>
                  <span className="hidden font-mono text-[11px] tabular-nums text-slate-400 md:inline">
                    {selectedOntology.entities.length}e ·{' '}
                    {selectedOntology.relationships.length}r
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <div className="mr-1.5 inline-flex rounded-lg border border-slate-200 bg-[#F8FAFC] p-0.5">
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
                      const active = activeTab === tab.id
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setActiveTab(tab.id)}
                          className={`flex h-6.5 items-center gap-1.5 rounded-md px-2.5 text-[11.5px] font-medium transition-all ${
                            active
                              ? 'bg-white text-slate-900 shadow-xs'
                              : 'text-slate-500 hover:text-slate-900'
                          }`}
                        >
                          <tab.icon className="h-3 w-3" strokeWidth={2} />
                          {tab.label}
                        </button>
                      )
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={openCreateEntityModal}
                    className="flex h-7.5 items-center gap-1 rounded-lg px-2.5 text-[12px] font-medium text-slate-700 transition-colors hover:bg-[#F8FAFC] hover:text-slate-900"
                  >
                    <Plus className="h-3.5 w-3.5" strokeWidth={2} />
                    Entity
                  </button>
                  <button
                    type="button"
                    onClick={openAddRelationshipModal}
                    className="flex h-7.5 items-center gap-1 rounded-lg px-2.5 text-[12px] font-medium text-slate-700 transition-colors hover:bg-[#F8FAFC] hover:text-slate-900"
                  >
                    <Link2 className="h-3.5 w-3.5" strokeWidth={2} />
                    Relation
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSaveOntology()}
                    disabled={saving || !dirty}
                    className="flex h-7.5 items-center gap-1 rounded-lg px-2.5 text-[12px] font-medium text-slate-700 transition-colors hover:bg-[#F8FAFC] hover:text-slate-900 disabled:opacity-40"
                  >
                    {saving ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Save className="h-3.5 w-3.5" strokeWidth={2} />
                    )}
                    {dirty ? 'Save' : 'Saved'}
                  </button>
                  <div className="mx-1 h-4 w-px bg-slate-200" />
                  <button
                    type="button"
                    onClick={() => setIsAgentOpen(true)}
                    className="flex h-7.5 items-center gap-1.5 rounded-lg bg-slate-900 px-3 text-[12px] font-medium text-white shadow-xs transition-colors hover:bg-slate-800"
                  >
                    Architect
                  </button>
                </div>
              </div>

              <div className="relative flex flex-1 min-h-0 overflow-hidden">
                <div className="relative flex h-full min-w-0 flex-1 flex-col overflow-hidden">
                  {/* ── CANVAS ── */}
                  {activeTab === 'graph' && (
                    <div
                      ref={canvasRef}
                      onPointerDown={handleCanvasPointerDown}
                      onPointerMove={handleCanvasPointerMove}
                      onPointerUp={handleCanvasPointerUp}
                      onPointerCancel={handleCanvasPointerUp}
                      style={{
                        backgroundColor: SURFACE,
                        backgroundImage:
                          'radial-gradient(rgba(15,23,42,0.12) 1px, transparent 1px)',
                        backgroundSize: `${GRID_BASE * zoom}px ${
                          GRID_BASE * zoom
                        }px`,
                        backgroundPosition: `${pan.x % (GRID_BASE * zoom)}px ${
                          pan.y % (GRID_BASE * zoom)
                        }px`,
                      }}
                      className={`relative flex-1 select-none touch-none overflow-hidden ${
                        canvasTool === 'hand'
                          ? isPanning
                            ? 'cursor-grabbing'
                            : 'cursor-grab'
                          : 'cursor-default'
                      }`}
                    >
                      {/* Floating toolbar */}
                      <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 items-center gap-0.5 rounded-xl border border-slate-200 bg-white/95 p-1 shadow-sm backdrop-blur-xs">
                        <div className="flex items-center rounded-lg bg-[#F8FAFC] p-0.5">
                          <button
                            type="button"
                            onClick={() => setCanvasTool('hand')}
                            title="Pan canvas"
                            className={`flex h-6.5 w-6.5 items-center justify-center rounded-md transition-all ${
                              canvasTool === 'hand'
                                ? 'bg-white text-slate-900 shadow-xs'
                                : 'text-slate-500 hover:text-slate-900'
                            }`}
                          >
                            <Hand className="h-3 w-3" strokeWidth={2} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setCanvasTool('select')}
                            title="Select entities"
                            className={`flex h-6.5 w-6.5 items-center justify-center rounded-md transition-all ${
                              canvasTool === 'select'
                                ? 'bg-white text-slate-900 shadow-xs'
                                : 'text-slate-500 hover:text-slate-900'
                            }`}
                          >
                            <MousePointer2
                              className="h-3 w-3"
                              strokeWidth={2}
                            />
                          </button>
                        </div>

                        <div className="mx-1 h-4 w-px bg-slate-200" />

                        <button
                          type="button"
                          onClick={() => zoomAtCenter(0.87)}
                          className="flex h-6.5 w-6.5 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-[#F8FAFC] hover:text-slate-900"
                          title="Zoom out (Ctrl -)"
                        >
                          <ZoomOut className="h-3 w-3" strokeWidth={2} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setZoom(1)}
                          className="min-w-[42px] px-1 text-center font-mono text-[10.5px] tabular-nums text-slate-700 hover:text-slate-900"
                          title="Reset zoom (Ctrl 0)"
                        >
                          {Math.round(zoom * 100)}%
                        </button>
                        <button
                          type="button"
                          onClick={() => zoomAtCenter(1.15)}
                          className="flex h-6.5 w-6.5 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-[#F8FAFC] hover:text-slate-900"
                          title="Zoom in (Ctrl +)"
                        >
                          <ZoomIn className="h-3 w-3" strokeWidth={2} />
                        </button>
                        <button
                          type="button"
                          onClick={handleFitView}
                          className="flex h-6.5 w-6.5 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-[#F8FAFC] hover:text-slate-900"
                          title="Fit to screen"
                        >
                          <Maximize2 className="h-3 w-3" strokeWidth={2} />
                        </button>

                        <div className="mx-1 h-4 w-px bg-slate-200" />

                        <button
                          type="button"
                          onClick={toggleAllCanvasCards}
                          className="flex h-6.5 items-center gap-1 rounded-lg px-2 text-[11px] font-medium text-slate-600 transition-colors hover:bg-[#F8FAFC] hover:text-slate-900"
                          title={
                            expandedCanvasCardIds.size > 0
                              ? 'Collapse all entities'
                              : 'Expand all entities'
                          }
                        >
                          {expandedCanvasCardIds.size > 0 ? (
                            <>
                              <ChevronsDownUp
                                className="h-3 w-3"
                                strokeWidth={2}
                              />
                              Collapse
                            </>
                          ) : (
                            <>
                              <ChevronsUpDown
                                className="h-3 w-3"
                                strokeWidth={2}
                              />
                              Expand
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={handleAutoLayout}
                          className="flex h-6.5 items-center gap-1 rounded-lg px-2 text-[11px] font-medium text-slate-600 transition-colors hover:bg-[#F8FAFC] hover:text-slate-900"
                          title="Auto-arrange grid"
                        >
                          <LayoutGrid className="h-3 w-3" strokeWidth={2} />
                          Arrange
                        </button>

                        <button
                          type="button"
                          onClick={() => setShowMinimap((v) => !v)}
                          className={`flex h-6.5 w-6.5 items-center justify-center rounded-lg transition-colors ${
                            showMinimap
                              ? 'bg-[#F8FAFC] text-slate-900'
                              : 'text-slate-400 hover:bg-[#F8FAFC] hover:text-slate-700'
                          }`}
                          title="Toggle minimap"
                        >
                          <MapIcon className="h-3 w-3" strokeWidth={2} />
                        </button>
                      </div>

                      {showMinimap && selectedOntology.entities.length > 0 && (
                        <Minimap
                          entities={selectedOntology.entities}
                          selectedEntityIds={selectedEntityIds}
                          getEntityPos={getEntityPos}
                          getCardHeight={getCardHeight}
                          pan={pan}
                          zoom={zoom}
                          canvasRef={canvasRef}
                          onPanChange={setPan}
                          onClose={() => setShowMinimap(false)}
                        />
                      )}

                      {selectionBox && canvasRef.current && (
                        <div
                          style={{
                            left:
                              Math.min(
                                selectionBox.startX,
                                selectionBox.currentX
                              ) -
                              canvasRef.current.getBoundingClientRect().left,
                            top:
                              Math.min(
                                selectionBox.startY,
                                selectionBox.currentY
                              ) -
                              canvasRef.current.getBoundingClientRect().top,
                            width: Math.abs(
                              selectionBox.currentX - selectionBox.startX
                            ),
                            height: Math.abs(
                              selectionBox.currentY - selectionBox.startY
                            ),
                          }}
                          className="pointer-events-none absolute z-30 rounded-lg border border-slate-900 bg-slate-900/5"
                        />
                      )}

                      {selectedOntology.entities.length === 0 ? (
                        <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6">
                          <div className="pointer-events-auto max-w-sm rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-xs">
                            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-[#F8FAFC]">
                              <Layers
                                className="h-4.5 w-4.5 text-slate-600"
                                strokeWidth={1.75}
                              />
                            </div>
                            <h3 className="mt-3 text-[13.5px] font-medium text-slate-900">
                              Empty workspace
                            </h3>
                            <p className="mt-1 text-[12px] text-slate-500">
                              Define entities manually or scaffold your domain
                              using the Architect.
                            </p>
                            <div className="mt-4 flex items-center justify-center gap-2">
                              <button
                                type="button"
                                onClick={openCreateEntityModal}
                                className="flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-[12px] font-medium text-slate-800 hover:bg-[#F8FAFC]"
                              >
                                <Plus className="h-3 w-3" strokeWidth={2.25} />
                                Entity
                              </button>
                              <button
                                type="button"
                                onClick={() => setIsAgentOpen(true)}
                                className="flex h-8 items-center gap-1.5 rounded-lg bg-slate-900 px-3 text-[12px] font-medium text-white hover:bg-slate-800"
                              >
                                Open Architect
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div
                          style={{
                            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                            transformOrigin: '0 0',
                            willChange: 'transform',
                          }}
                          className="pointer-events-none relative h-[4000px] w-[4000px]"
                        >
                          <svg
                            className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
                            aria-hidden
                          >
                            <defs>
                              <marker
                                id="arrow"
                                markerWidth="7"
                                markerHeight="7"
                                refX="6"
                                refY="3.5"
                                orient="auto"
                              >
                                <path
                                  d="M 0 0.5 L 6.5 3.5 L 0 6.5 z"
                                  fill="#64748B"
                                />
                              </marker>
                            </defs>
                            {selectedOntology.relationships.map(
                              (rel, rIdx) => {
                                const srcRef =
                                  (rel as any).source_entity ||
                                  (rel as any).source_entity_name ||
                                  (rel as any).source_entity_id ||
                                  ''
                                const tgtRef =
                                  (rel as any).target_entity ||
                                  (rel as any).target_entity_name ||
                                  (rel as any).target_entity_id ||
                                  ''
                                const findEntity = (ref: string) => {
                                  if (!ref) return undefined
                                  const c = String(ref).trim().toLowerCase()
                                  return selectedOntology.entities.find(
                                    (e) =>
                                      (e.name &&
                                        e.name.trim().toLowerCase() === c) ||
                                      (e.entity_id &&
                                        e.entity_id.trim().toLowerCase() === c)
                                  )
                                }
                                const src = findEntity(srcRef)
                                const tgt = findEntity(tgtRef)
                                if (!src || !tgt) return null
                                const sIdx =
                                  selectedOntology.entities.indexOf(src)
                                const tIdx =
                                  selectedOntology.entities.indexOf(tgt)
                                const sPos = getEntityPos(
                                  src,
                                  sIdx >= 0 ? sIdx : 0
                                )
                                const tPos = getEntityPos(
                                  tgt,
                                  tIdx >= 0 ? tIdx : 0
                                )
                                const sH = getCardHeight(
                                  src,
                                  sIdx >= 0 ? sIdx : 0
                                )
                                const tH = getCardHeight(
                                  tgt,
                                  tIdx >= 0 ? tIdx : 0
                                )

                                let x1, y1, x2, y2
                                if (tPos.x >= sPos.x + CARD_W - 20) {
                                  x1 = sPos.x + CARD_W
                                  y1 = sPos.y + Math.min(22, sH / 2)
                                  x2 = tPos.x
                                  y2 = tPos.y + Math.min(22, tH / 2)
                                } else if (sPos.x >= tPos.x + CARD_W - 20) {
                                  x1 = sPos.x
                                  y1 = sPos.y + Math.min(22, sH / 2)
                                  x2 = tPos.x + CARD_W
                                  y2 = tPos.y + Math.min(22, tH / 2)
                                } else if (tPos.y > sPos.y) {
                                  x1 = sPos.x + CARD_W / 2
                                  y1 = sPos.y + sH
                                  x2 = tPos.x + CARD_W / 2
                                  y2 = tPos.y
                                } else {
                                  x1 = sPos.x + CARD_W / 2
                                  y1 = sPos.y
                                  x2 = tPos.x + CARD_W / 2
                                  y2 = tPos.y + tH
                                }

                                const midX = (x1 + x2) / 2
                                const midY = (y1 + y2) / 2
                                let d = ''
                                if (Math.abs(x2 - x1) >= Math.abs(y2 - y1)) {
                                  const dx = Math.max(
                                    40,
                                    Math.abs(x2 - x1) * 0.45
                                  )
                                  d = `M ${x1} ${y1} C ${
                                    x2 >= x1 ? x1 + dx : x1 - dx
                                  } ${y1}, ${
                                    x2 >= x1 ? x2 - dx : x2 + dx
                                  } ${y2}, ${x2} ${y2}`
                                } else {
                                  const dy = Math.max(
                                    40,
                                    Math.abs(y2 - y1) * 0.45
                                  )
                                  d = `M ${x1} ${y1} C ${x1} ${
                                    y2 >= y1 ? y1 + dy : y1 - dy
                                  }, ${x2} ${
                                    y2 >= y1 ? y2 - dy : y2 + dy
                                  }, ${x2} ${y2}`
                                }

                                const badgeText =
                                  rel.label || rel.cardinality || '1:N'
                                const badgeW = Math.max(
                                  54,
                                  badgeText.length * 6.2 + 16
                                )

                                return (
                                  <g
                                    key={
                                      rel.relationship_id ||
                                      `${sIdx}-${tIdx}-${rIdx}`
                                    }
                                  >
                                    <path
                                      d={d}
                                      fill="none"
                                      stroke={SURFACE}
                                      strokeWidth={4}
                                      strokeLinecap="round"
                                    />
                                    <path
                                      d={d}
                                      fill="none"
                                      stroke="#94A3B8"
                                      strokeWidth={1.25}
                                      strokeDasharray={
                                        rel.cardinality?.includes('N:M')
                                          ? '3 3'
                                          : undefined
                                      }
                                      markerEnd="url(#arrow)"
                                    />
                                    <g
                                      transform={`translate(${midX}, ${midY})`}
                                    >
                                      <rect
                                        x={-badgeW / 2}
                                        y={-9}
                                        width={badgeW}
                                        height={18}
                                        rx={6}
                                        fill="#FFFFFF"
                                        stroke="#CBD5E1"
                                        strokeWidth={1}
                                      />
                                      <text
                                        textAnchor="middle"
                                        dominantBaseline="central"
                                        fontSize={9.5}
                                        fontFamily="ui-monospace, monospace"
                                        fill="#334155"
                                        fontWeight={500}
                                      >
                                        {badgeText}
                                      </text>
                                    </g>
                                  </g>
                                )
                              }
                            )}
                          </svg>

                          {selectedOntology.entities.map((ent, idx) => {
                            const entId = ent.entity_id || String(idx)
                            const pos = getEntityPos(ent, idx)
                            const isDragging = draggingEntityIdx === idx
                            const isSelected = selectedEntityIds.includes(entId)
                            const isCardExpanded =
                              expandedCanvasCardIds.has(entId)
                            const attrCount = (ent.attributes || []).length

                            return (
                              <div
                                key={entId}
                                onPointerDown={(e) =>
                                  handleEntityPointerDown(e, idx)
                                }
                                onPointerMove={handleEntityPointerMove}
                                onPointerUp={handleEntityPointerUp}
                                onPointerCancel={handleEntityPointerUp}
                                style={{
                                  transform: `translate(${pos.x}px, ${pos.y}px)`,
                                  width: CARD_W,
                                }}
                                className={`pointer-events-auto absolute top-0 left-0 overflow-hidden rounded-xl border bg-white transition-shadow ${
                                  isSelected
                                    ? 'z-30 border-slate-900 shadow-md ring-2 ring-slate-900/10'
                                    : isDragging
                                    ? 'z-30 cursor-grabbing border-slate-900 shadow-lg'
                                    : 'z-10 border-slate-200 shadow-xs hover:border-slate-300 cursor-grab'
                                }`}
                              >
                                <div
                                  className={`group flex items-center justify-between gap-1.5 px-3 py-2.5 ${
                                    isCardExpanded
                                      ? 'border-b border-slate-100 bg-[#F8FAFC]'
                                      : ''
                                  }`}
                                >
                                  <div className="flex min-w-0 items-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        toggleCanvasCardExpand(entId)
                                      }}
                                      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-200/60 hover:text-slate-900"
                                      title={
                                        isCardExpanded ? 'Minimize' : 'Expand'
                                      }
                                    >
                                      {isCardExpanded ? (
                                        <ChevronDown
                                          className="h-3.5 w-3.5"
                                          strokeWidth={2}
                                        />
                                      ) : (
                                        <ChevronRight
                                          className="h-3.5 w-3.5"
                                          strokeWidth={2}
                                        />
                                      )}
                                    </button>
                                    <span
                                      onDoubleClick={() =>
                                        openEditEntityModal(idx)
                                      }
                                      className="truncate font-mono text-[12px] font-semibold text-slate-900"
                                    >
                                      {ent.name}
                                    </span>
                                  </div>

                                  <div className="flex shrink-0 items-center gap-1">
                                    <span className="rounded-md bg-[#F8FAFC] px-1.5 py-0.5 font-mono text-[10px] tabular-nums text-slate-500 border border-slate-200/70">
                                      {attrCount}
                                    </span>
                                    <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          openAddAttributeModal(idx)
                                        }}
                                        className="flex h-5 w-5 items-center justify-center rounded-md text-slate-500 hover:bg-slate-200/60 hover:text-slate-900"
                                        title="Add attribute"
                                      >
                                        <Plus
                                          className="h-3 w-3"
                                          strokeWidth={2.25}
                                        />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          deleteEntity(idx)
                                        }}
                                        className="flex h-5 w-5 items-center justify-center rounded-md text-slate-500 hover:bg-slate-200/60 hover:text-slate-900"
                                        title="Delete entity"
                                      >
                                        <X
                                          className="h-3 w-3"
                                          strokeWidth={2.25}
                                        />
                                      </button>
                                    </div>
                                  </div>
                                </div>

                                {isCardExpanded && (
                                  <div className="max-h-44 divide-y divide-slate-100 overflow-y-auto">
                                    {attrCount === 0 ? (
                                      <div className="px-3 py-3.5 text-center text-[11px] text-slate-400">
                                        No attributes
                                      </div>
                                    ) : (
                                      ent.attributes.map((attr, aIdx) => (
                                        <div
                                          key={`${attr.name}-${aIdx}`}
                                          className="group/row flex items-center justify-between gap-2 px-3 py-1.5 text-[11px] hover:bg-[#F8FAFC]"
                                        >
                                          <div className="flex min-w-0 items-center gap-1.5">
                                            {attr.is_pk ? (
                                              <span className="shrink-0 rounded bg-slate-900 px-1 py-0 font-mono text-[8.5px] font-semibold text-white">
                                                PK
                                              </span>
                                            ) : attr.is_fk ? (
                                              <span className="shrink-0 rounded border border-slate-200 bg-[#F8FAFC] px-1 py-0 font-mono text-[8.5px] font-medium text-slate-700">
                                                FK
                                              </span>
                                            ) : (
                                              <span className="w-5 shrink-0" />
                                            )}
                                            <span className="truncate font-mono text-slate-800">
                                              {attr.name}
                                            </span>
                                          </div>
                                          <div className="flex shrink-0 items-center gap-1.5">
                                            <span className="font-mono text-[9.5px] text-slate-400">
                                              {attr.datatype}
                                            </span>
                                            <button
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation()
                                                deleteAttribute(idx, aIdx)
                                              }}
                                              className="hidden text-slate-400 hover:text-slate-900 group-hover/row:inline-flex"
                                              title="Remove attribute"
                                            >
                                              <Minus
                                                className="h-2.5 w-2.5"
                                                strokeWidth={2.5}
                                              />
                                            </button>
                                          </div>
                                        </div>
                                      ))
                                    )}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── ENTITIES TABLE (collapsible) ── */}
                  {activeTab === 'table' && (
                    <div className="flex-1 overflow-y-auto">
                      <div className="mx-auto max-w-5xl space-y-2.5 p-6">
                        {selectedOntology.entities.length === 0 && (
                          <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center text-[12.5px] text-slate-500">
                            No entities defined
                          </div>
                        )}
                        {selectedOntology.entities.map((ent, idx) => {
                          const id = ent.entity_id || String(idx)
                          const open = expandedEntityIds.has(id)
                          const attrCount = (ent.attributes || []).length
                          return (
                            <div
                              key={id}
                              className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs"
                            >
                              <div className="flex items-center justify-between gap-3 px-4 py-3">
                                <button
                                  type="button"
                                  onClick={() => toggleEntityExpand(id)}
                                  className="flex min-w-0 flex-1 items-center gap-2 text-left"
                                >
                                  {open ? (
                                    <ChevronDown
                                      className="h-3.5 w-3.5 shrink-0 text-slate-500"
                                      strokeWidth={2}
                                    />
                                  ) : (
                                    <ChevronRight
                                      className="h-3.5 w-3.5 shrink-0 text-slate-500"
                                      strokeWidth={2}
                                    />
                                  )}
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className="truncate font-mono text-[12.5px] font-medium text-slate-900">
                                        {ent.name}
                                      </span>
                                      <span className="shrink-0 rounded-md border border-slate-200 bg-[#F8FAFC] px-1.5 py-0 font-mono text-[10px] text-slate-500">
                                        {attrCount} attr
                                      </span>
                                    </div>
                                    {ent.description && (
                                      <div className="truncate text-[12px] text-slate-500">
                                        {ent.description}
                                      </div>
                                    )}
                                  </div>
                                </button>
                                <div className="flex shrink-0 items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      openAddAttributeModal(idx)
                                    }}
                                    className="flex h-7 items-center gap-1 rounded-lg px-2.5 text-[11.5px] font-medium text-slate-600 transition-colors hover:bg-[#F8FAFC] hover:text-slate-900"
                                  >
                                    <Plus
                                      className="h-3 w-3"
                                      strokeWidth={2.25}
                                    />
                                    Attribute
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      deleteEntity(idx)
                                    }}
                                    className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-[#F8FAFC] hover:text-slate-900"
                                  >
                                    <Trash2
                                      className="h-3.5 w-3.5"
                                      strokeWidth={1.75}
                                    />
                                  </button>
                                </div>
                              </div>

                              {open && (
                                <div className="border-t border-slate-200">
                                  <table className="w-full text-left text-[12px]">
                                    <thead>
                                      <tr className="bg-[#F8FAFC] text-[10px] uppercase tracking-wider text-slate-500">
                                        <th className="px-4 py-2 font-medium">
                                          Attribute
                                        </th>
                                        <th className="px-4 py-2 font-medium">
                                          Type
                                        </th>
                                        <th className="px-4 py-2 font-medium">
                                          Key
                                        </th>
                                        <th className="px-4 py-2 font-medium">
                                          Nullable
                                        </th>
                                        <th className="px-4 py-2"></th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                      {(ent.attributes || []).map(
                                        (attr, aIdx) => (
                                          <tr
                                            key={`${attr.name}-${aIdx}`}
                                            className="group hover:bg-[#F8FAFC]"
                                          >
                                            <td className="px-4 py-2 font-mono text-slate-900">
                                              {attr.name}
                                            </td>
                                            <td className="px-4 py-2 font-mono text-slate-500">
                                              {attr.datatype}
                                            </td>
                                            <td className="px-4 py-2">
                                              {attr.is_pk ? (
                                                <span className="rounded bg-slate-900 px-1.5 py-0.5 font-mono text-[9.5px] font-medium text-white">
                                                  PK
                                                </span>
                                              ) : attr.is_fk ? (
                                                <span className="rounded border border-slate-200 bg-[#F8FAFC] px-1.5 py-0.5 font-mono text-[9.5px] font-medium text-slate-700">
                                                  FK
                                                </span>
                                              ) : (
                                                <span className="text-slate-300">
                                                  —
                                                </span>
                                              )}
                                            </td>
                                            <td className="px-4 py-2 font-mono text-[11px] text-slate-500">
                                              {attr.nullable === false
                                                ? 'no'
                                                : 'yes'}
                                            </td>
                                            <td className="px-4 py-2 text-right">
                                              <button
                                                type="button"
                                                onClick={(e) => {
                                                  e.stopPropagation()
                                                  deleteAttribute(idx, aIdx)
                                                }}
                                                className="text-slate-400 opacity-0 hover:text-slate-900 group-hover:opacity-100"
                                              >
                                                <Trash2
                                                  className="inline h-3.5 w-3.5"
                                                  strokeWidth={1.75}
                                                />
                                              </button>
                                            </td>
                                          </tr>
                                        )
                                      )}
                                      {attrCount === 0 && (
                                        <tr>
                                          <td
                                            colSpan={5}
                                            className="px-4 py-4 text-center text-[11.5px] text-slate-400"
                                          >
                                            No attributes
                                          </td>
                                        </tr>
                                      )}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* ── RELATIONS TABLE (collapsible) ── */}
                  {activeTab === 'relationships' && (
                    <div className="flex-1 overflow-y-auto">
                      <div className="mx-auto max-w-5xl p-6">
                        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
                          {selectedOntology.relationships.length === 0 ? (
                            <div className="py-16 text-center text-[12.5px] text-slate-500">
                              No relationships defined
                            </div>
                          ) : (
                            <div className="divide-y divide-slate-200">
                              {selectedOntology.relationships.map(
                                (rel, idx) => {
                                  const id =
                                    rel.relationship_id || `rel-${idx}`
                                  const open = expandedRelationshipIds.has(id)
                                  const src =
                                    rel.source_entity ||
                                    (rel as any).source_entity_name ||
                                    '—'
                                  const tgt =
                                    rel.target_entity ||
                                    (rel as any).target_entity_name ||
                                    '—'
                                  return (
                                    <div key={id}>
                                      <div className="flex items-center justify-between gap-3 px-4 py-3">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setExpandedRelationshipIds(
                                              (prev) => {
                                                const next = new Set(prev)
                                                if (next.has(id)) next.delete(id)
                                                else next.add(id)
                                                return next
                                              }
                                            )
                                          }}
                                          className="flex min-w-0 flex-1 items-center gap-2 text-left"
                                        >
                                          {open ? (
                                            <ChevronDown
                                              className="h-3.5 w-3.5 shrink-0 text-slate-500"
                                              strokeWidth={2}
                                            />
                                          ) : (
                                            <ChevronRight
                                              className="h-3.5 w-3.5 shrink-0 text-slate-500"
                                              strokeWidth={2}
                                            />
                                          )}
                                          <span className="truncate font-mono text-[12px] text-slate-900">
                                            {src}
                                          </span>
                                          <ArrowRight
                                            className="h-3 w-3 shrink-0 text-slate-400"
                                            strokeWidth={2}
                                          />
                                          <span className="truncate font-mono text-[12px] text-slate-900">
                                            {tgt}
                                          </span>
                                          <span className="shrink-0 rounded-md border border-slate-200 bg-[#F8FAFC] px-1.5 py-0 font-mono text-[10px] text-slate-600">
                                            {rel.cardinality || '1:N'}
                                          </span>
                                        </button>
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            deleteRelationship(idx)
                                          }}
                                          className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-[#F8FAFC] hover:text-slate-900"
                                        >
                                          <Trash2
                                            className="h-3.5 w-3.5"
                                            strokeWidth={1.75}
                                          />
                                        </button>
                                      </div>
                                      {open && (
                                        <div className="grid grid-cols-2 gap-x-6 gap-y-2 border-t border-slate-100 bg-[#F8FAFC] px-11 py-3.5 text-[11.5px]">
                                          <div>
                                            <div className="text-[10px] uppercase tracking-wider text-slate-400">
                                              Source
                                            </div>
                                            <div className="font-mono text-slate-900">
                                              {src}
                                            </div>
                                          </div>
                                          <div>
                                            <div className="text-[10px] uppercase tracking-wider text-slate-400">
                                              Target
                                            </div>
                                            <div className="font-mono text-slate-900">
                                              {tgt}
                                            </div>
                                          </div>
                                          <div>
                                            <div className="text-[10px] uppercase tracking-wider text-slate-400">
                                              Cardinality
                                            </div>
                                            <div className="font-mono text-slate-700">
                                              {rel.cardinality || '1:N'}
                                            </div>
                                          </div>
                                          <div>
                                            <div className="text-[10px] uppercase tracking-wider text-slate-400">
                                              Label
                                            </div>
                                            <div className="text-slate-700">
                                              {rel.label || '—'}
                                            </div>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  )
                                }
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

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

      {/* ── MODALS ─────────────────────────────────────────── */}
      {entityModalOpen && (
        <ModalShell onClose={() => setEntityModalOpen(false)}>
          <form onSubmit={saveEntityModal} className="w-full max-w-md">
            <ModalHeader
              title={editingEntityIdx !== null ? 'Edit entity' : 'New entity'}
              subtitle="Define a domain object node on the ontology canvas."
              onClose={() => setEntityModalOpen(false)}
            />
            <div className="space-y-4 p-5 text-[13px]">
              <Field label="Entity Name">
                <input
                  type="text"
                  required
                  autoFocus
                  value={entityNameInput}
                  onChange={(e) => setEntityNameInput(e.target.value)}
                  placeholder="SalesOrder"
                  className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 font-mono text-[12.5px] text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-slate-900"
                />
              </Field>
              <Field label="Description">
                <input
                  type="text"
                  value={entityDescInput}
                  onChange={(e) => setEntityDescInput(e.target.value)}
                  placeholder="Optional domain context"
                  className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-[12.5px] text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-slate-900"
                />
              </Field>
            </div>
            <ModalFooter
              onCancel={() => setEntityModalOpen(false)}
              submitLabel="Save Entity"
            />
          </form>
        </ModalShell>
      )}

      {attrModalEntityIdx !== null && (
        <ModalShell onClose={() => setAttrModalEntityIdx(null)}>
          <form onSubmit={saveAttributeModal} className="w-full max-w-md">
            <ModalHeader
              title="Add attribute"
              subtitle="Append a typed field or key constraint to this entity."
              onClose={() => setAttrModalEntityIdx(null)}
            />
            <div className="space-y-4 p-5 text-[13px]">
              <Field label="Attribute Name">
                <input
                  type="text"
                  required
                  autoFocus
                  value={attrName}
                  onChange={(e) => setAttrName(e.target.value)}
                  placeholder="customer_id"
                  className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 font-mono text-[12.5px] text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-slate-900"
                />
              </Field>
              <Field label="Data Type">
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
              </Field>
              <div className="flex flex-wrap gap-4 rounded-xl border border-slate-200/80 bg-[#F8FAFC] px-3.5 py-2.5">
                <Checkbox
                  label="Primary key"
                  checked={attrIsPk}
                  onChange={setAttrIsPk}
                />
                <Checkbox
                  label="Foreign key"
                  checked={attrIsFk}
                  onChange={setAttrIsFk}
                />
                <Checkbox
                  label="Nullable"
                  checked={attrNullable}
                  onChange={setAttrNullable}
                />
              </div>
            </div>
            <ModalFooter
              onCancel={() => setAttrModalEntityIdx(null)}
              submitLabel="Add Attribute"
            />
          </form>
        </ModalShell>
      )}

      {relModalOpen && selectedOntology && (
        <ModalShell onClose={() => setRelModalOpen(false)}>
          <form onSubmit={saveRelationshipModal} className="w-full max-w-md">
            <ModalHeader
              title="Add relationship"
              subtitle="Connect two entities with directional cardinality."
              onClose={() => setRelModalOpen(false)}
            />
            <div className="space-y-4 p-5 text-[13px]">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Source Entity">
                  <CustomSelect
                    value={relSource}
                    onChange={setRelSource}
                    options={selectedOntology.entities.map((e) => e.name)}
                  />
                </Field>
                <Field label="Target Entity">
                  <CustomSelect
                    value={relTarget}
                    onChange={setRelTarget}
                    options={selectedOntology.entities.map((e) => e.name)}
                  />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Cardinality">
                  <CustomSelect
                    value={relCardinality}
                    onChange={setRelCardinality}
                    options={['1:1', '1:N', 'N:1', 'N:M']}
                  />
                </Field>
                <Field label="Relation Label">
                  <input
                    type="text"
                    value={relLabel}
                    onChange={(e) => setRelLabel(e.target.value)}
                    placeholder="has"
                    className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-[12.5px] text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-slate-900"
                  />
                </Field>
              </div>
            </div>
            <ModalFooter
              onCancel={() => setRelModalOpen(false)}
              submitLabel="Add Relationship"
            />
          </form>
        </ModalShell>
      )}

      {deleteTarget && (
        <ModalShell onClose={() => !deleting && setDeleteTarget(null)}>
          <div className="w-full max-w-md">
            <div className="flex items-start gap-3.5 p-5">
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-[#F8FAFC] text-slate-900">
                <AlertCircle className="h-4 w-4" strokeWidth={2} />
              </div>
              <div>
                <h3 className="text-[14px] font-semibold text-slate-900">
                  Delete "{deleteTarget.name}"?
                </h3>
                <p className="mt-1 text-[12.5px] leading-relaxed text-slate-500">
                  This permanently removes this ontology version along with all
                  entities and relationships.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-200/80 bg-[#F8FAFC] px-5 py-3">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setDeleteTarget(null)}
                className="h-8 rounded-lg border border-slate-200 bg-white px-3.5 text-[12px] font-medium text-slate-700 transition-colors hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleConfirmDelete}
                className="flex h-8 items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 text-[12px] font-medium text-white shadow-xs transition-colors hover:bg-slate-800 disabled:opacity-60"
              >
                {deleting && <Loader2 className="h-3 w-3 animate-spin" />}
                Delete
              </button>
            </div>
          </div>
        </ModalShell>
      )}
    </div>
  )
}

/* ────────────────────────────────────────────────────────────
   SMOOTH INTERACTIVE MINIMAP (CLICK + DRAG SCRUBBING)
   ──────────────────────────────────────────────────────────── */
function Minimap({
  entities,
  selectedEntityIds,
  getEntityPos,
  getCardHeight,
  pan,
  zoom,
  canvasRef,
  onPanChange,
  onClose,
}: {
  entities: OntologyEntity[]
  selectedEntityIds: string[]
  getEntityPos: (ent: OntologyEntity, idx: number) => { x: number; y: number }
  getCardHeight: (ent: OntologyEntity, idx: number) => number
  pan: { x: number; y: number }
  zoom: number
  canvasRef: React.RefObject<HTMLDivElement | null>
  onPanChange: (nextPan: { x: number; y: number }) => void
  onClose: () => void
}) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const isScrubbingRef = useRef(false)

  const bounds = useMemo(() => {
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity
    entities.forEach((ent, i) => {
      const pos = getEntityPos(ent, i)
      const h = getCardHeight(ent, i)
      if (pos.x < minX) minX = pos.x
      if (pos.y < minY) minY = pos.y
      if (pos.x + CARD_W > maxX) maxX = pos.x + CARD_W
      if (pos.y + h > maxY) maxY = pos.y + h
    })
    const pad = 120
    return {
      minX: minX - pad,
      minY: minY - pad,
      w: Math.max(800, maxX - minX + pad * 2),
      h: Math.max(520, maxY - minY + pad * 2),
    }
  }, [entities, getEntityPos, getCardHeight])

  const scale = Math.min(MINIMAP_W / bounds.w, MINIMAP_H / bounds.h)
  const clientW = canvasRef.current?.clientWidth || 1000
  const clientH = canvasRef.current?.clientHeight || 700
  const vpX = (-pan.x / zoom - bounds.minX) * scale
  const vpY = (-pan.y / zoom - bounds.minY) * scale
  const vpW = Math.max(16, (clientW / zoom) * scale)
  const vpH = Math.max(12, (clientH / zoom) * scale)

  const scrubToPointer = useCallback(
    (clientX: number, clientY: number) => {
      if (!mapContainerRef.current) return
      const rect = mapContainerRef.current.getBoundingClientRect()
      const clickX = Math.max(0, Math.min(MINIMAP_W, clientX - rect.left))
      const clickY = Math.max(0, Math.min(MINIMAP_H, clientY - rect.top))
      const targetWorldX = bounds.minX + clickX / scale
      const targetWorldY = bounds.minY + clickY / scale
      const cw = canvasRef.current?.clientWidth || 1000
      const ch = canvasRef.current?.clientHeight || 700
      onPanChange({
        x: Math.round(cw / 2 - targetWorldX * zoom),
        y: Math.round(ch / 2 - targetWorldY * zoom),
      })
    },
    [bounds, scale, zoom, canvasRef, onPanChange]
  )

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation()
    isScrubbingRef.current = true
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    scrubToPointer(e.clientX, e.clientY)
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isScrubbingRef.current) return
    e.stopPropagation()
    scrubToPointer(e.clientX, e.clientY)
  }

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isScrubbingRef.current) return
    e.stopPropagation()
    isScrubbingRef.current = false
    try {
      ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
    } catch {}
  }

  return (
    <div className="absolute bottom-4 right-4 z-20 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-2.5 py-1.5">
        <span className="font-mono text-[9.5px] uppercase tracking-wider text-slate-500">
          Overview
        </span>
        <button
          type="button"
          onClick={onClose}
          className="text-slate-400 hover:text-slate-900"
        >
          <X className="h-3 w-3" strokeWidth={2.25} />
        </button>
      </div>
      <div
        ref={mapContainerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{ width: MINIMAP_W, height: MINIMAP_H, backgroundColor: SURFACE }}
        className="relative cursor-grab active:cursor-grabbing select-none touch-none"
      >
        {entities.map((ent, idx) => {
          const pos = getEntityPos(ent, idx)
          const cardH = getCardHeight(ent, idx)
          const x = (pos.x - bounds.minX) * scale
          const y = (pos.y - bounds.minY) * scale
          const w = Math.max(10, CARD_W * scale)
          const h = Math.max(4, cardH * scale)
          const isSel = selectedEntityIds.includes(ent.entity_id || String(idx))
          return (
            <div
              key={ent.entity_id || idx}
              style={{ left: x, top: y, width: w, height: h }}
              className={`pointer-events-none absolute rounded-[2px] ${
                isSel ? 'bg-slate-900' : 'bg-slate-400/70'
              }`}
            />
          )
        })}
        <div
          style={{ left: vpX, top: vpY, width: vpW, height: vpH }}
          className="pointer-events-none absolute rounded-[3px] border border-slate-900 bg-slate-900/10"
        />
      </div>
    </div>
  )
}

/* ────────────────────────────────────────────────────────────
   PRIMITIVES (ELEVATED ROUNDED MODALS)
   ──────────────────────────────────────────────────────────── */
function ModalShell({
  children,
  onClose,
}: {
  children: React.ReactNode
  onClose: () => void
}) {
  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 p-4 backdrop-blur-[2px]"
      style={{ fontFamily: FONT_STACK }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
      >
        {children}
      </div>
    </div>
  )
}

function ModalHeader({
  title,
  subtitle,
  onClose,
}: {
  title: string
  subtitle?: string
  onClose: () => void
}) {
  return (
    <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
      <div>
        <h3 className="text-[14.5px] font-semibold tracking-[-0.01em] text-slate-900">
          {title}
        </h3>
        {subtitle && (
          <p className="mt-0.5 text-[12px] text-slate-500">{subtitle}</p>
        )}
      </div>
      <button
        type="button"
        onClick={onClose}
        className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-[#F8FAFC] hover:text-slate-900"
      >
        <X className="h-4 w-4" strokeWidth={2} />
      </button>
    </div>
  )
}

function ModalFooter({
  onCancel,
  submitLabel,
}: {
  onCancel: () => void
  submitLabel: string
}) {
  return (
    <div className="flex justify-end gap-2 border-t border-slate-200/80 bg-[#F8FAFC] px-5 py-3">
      <button
        type="button"
        onClick={onCancel}
        className="h-8 rounded-lg border border-slate-200 bg-white px-3.5 text-[12px] font-medium text-slate-700 transition-colors hover:bg-slate-50"
      >
        Cancel
      </button>
      <button
        type="submit"
        className="h-8 rounded-lg bg-slate-900 px-3.5 text-[12px] font-medium text-white shadow-xs transition-colors hover:bg-slate-800"
      >
        {submitLabel}
      </button>
    </div>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[11.5px] font-medium text-slate-700">
        {label}
      </label>
      {children}
    </div>
  )
}

function Checkbox({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-1.5 text-[12px] text-slate-700">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-3.5 w-3.5 rounded accent-slate-900"
      />
      {label}
    </label>
  )
}

/* ────────────────────────────────────────────────────────────
   AGENT WORKSPACE
   ──────────────────────────────────────────────────────────── */
interface ChatTurn {
  id: string
  role: 'user' | 'assistant' | 'error' | 'summary'
  content: string
  failedPrompt?: string
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
    title: 'Inspect schema',
    prompt:
      'Summarize what entities, attributes, and relationships are currently modeled.',
  },
  {
    title: 'Extend domain',
    prompt: 'Add 4 missing business entities with appropriate foreign keys.',
  },
  {
    title: 'Audit timestamps',
    prompt: 'Add created_at and updated_at to all entities.',
  },
  {
    title: 'Order-to-cash',
    prompt:
      'Generate Order-to-Cash with Customer, SalesOrder, Invoice, Payment.',
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

  const feedRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 60)
  }, [])

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        const remote = await ontologyApi.getChatSessions(
          ontology.ontology_version_id
        )
        if (mounted && Array.isArray(remote) && remote.length > 0) {
          setSessions(remote)
          setActiveSessionId(remote[0].id)
          try {
            localStorage.setItem(storageKey, JSON.stringify(remote.slice(0, 20)))
          } catch {}
          return
        }
      } catch {}
      try {
        const raw = localStorage.getItem(storageKey)
        if (raw) {
          const parsed = JSON.parse(raw)
          if (Array.isArray(parsed) && parsed.length > 0) {
            if (mounted) {
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
        title: 'Session',
        updatedAt: Date.now(),
        turns: [],
      }
      if (mounted) {
        setSessions([initial])
        setActiveSessionId(initial.id)
      }
      ontologyApi
        .saveChatSessions(ontology.ontology_version_id, [initial])
        .catch(() => {})
    }
    void load()
    return () => {
      mounted = false
    }
  }, [ontology.ontology_version_id, storageKey])

  const syncSessions = useCallback(
    (nextSessions: ChatSession[]) => {
      setSessions(nextSessions)
      try {
        localStorage.setItem(
          storageKey,
          JSON.stringify(nextSessions.slice(0, 20))
        )
      } catch {}
      ontologyApi
        .saveChatSessions(
          ontology.ontology_version_id,
          nextSessions.slice(0, 20)
        )
        .catch(() => {})
    },
    [ontology.ontology_version_id, storageKey]
  )

  const activeSession = useMemo(
    () => sessions.find((s) => s.id === activeSessionId) || sessions[0],
    [sessions, activeSessionId]
  )
  const turns = activeSession?.turns || []

  useEffect(() => {
    if (feedRef.current)
      feedRef.current.scrollTop = feedRef.current.scrollHeight
  }, [turns.length, busy])

  const appendTurn = (
    sessionId: string,
    turn: ChatTurn,
    maybeTitle?: string
  ) => {
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
        .catch(() => {})
      return next
    })
  }

  const handleDeleteSession = async (sessId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    if (!confirm('Delete this session?')) return
    const next = sessions.filter((s) => s.id !== sessId)
    try {
      await ontologyApi.deleteChatSession(ontology.ontology_version_id, sessId)
    } catch {}
    if (next.length === 0) {
      const fresh: ChatSession = {
        id: `sess-${Date.now()}`,
        title: 'Session',
        updatedAt: Date.now(),
        turns: [],
      }
      syncSessions([fresh])
      setActiveSessionId(fresh.id)
    } else {
      syncSessions(next)
      if (activeSessionId === sessId) setActiveSessionId(next[0].id)
    }
  }

  const handleClearChat = () => {
    if (!activeSession || activeSession.turns.length === 0) return
    if (!confirm('Clear this conversation?')) return
    syncSessions(
      sessions.map((s) =>
        s.id === activeSession.id
          ? { ...s, turns: [], updatedAt: Date.now() }
          : s
      )
    )
  }

  const handleCopyTurn = (content: string, turnId: string) => {
    navigator.clipboard.writeText(content).catch(() => {})
    setCopiedTurnId(turnId)
    setTimeout(
      () => setCopiedTurnId((cur) => (cur === turnId ? null : cur)),
      1800
    )
  }

  const sendPrompt = async (rawPrompt?: string) => {
    const promptText = (rawPrompt ?? input).trim()
    if (!promptText || busy || !activeSession) return
    const sessId = activeSession.id
    if (!rawPrompt) setInput('')
    appendTurn(
      sessId,
      {
        id: `u-${Date.now()}`,
        role: 'user',
        content: promptText,
        timestamp: Date.now(),
      },
      promptText
    )
    setBusy(true)
    try {
      const historyPayload = turns
        .filter(
          (t) =>
            t.role === 'user' || t.role === 'assistant' || t.role === 'summary'
        )
        .slice(-8)
        .map((t) => ({
          role: t.role === 'summary' ? 'assistant' : t.role,
          content: t.content,
        }))

      const res = await ontologyApi.agentGenerate({
        project_id:
          ontology.project_id ||
          activeProjectStorage.get() ||
          'proj-default',
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
          content: res.error || 'Request failed.',
          failedPrompt: promptText,
          timestamp: Date.now(),
        })
        return
      }
      if (res?.ontology && res?.status === 'SUCCESS')
        onOntologyUpdated(res.ontology)

      const replyText =
        (res?.response_markdown && res.response_markdown.trim()) ||
        (res?.message && res.message.trim()) ||
        'Done.'

      appendTurn(sessId, {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: replyText,
        planData: res?.status === 'PLAN_READY' ? res?.plan_data : undefined,
        entityCount: res?.entity_count || 0,
        relationshipCount: res?.relationship_count || 0,
        timestamp: Date.now(),
      })
    } catch (err: any) {
      appendTurn(sessId, {
        id: `err-${Date.now()}`,
        role: 'error',
        content: err?.message || 'Request failed.',
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
        project_id:
          ontology.project_id ||
          activeProjectStorage.get() ||
          'proj-default',
        plan_data: turn.planData,
        target_ontology_id: ontology.ontology_version_id,
      })
      if (res?.ontology) onOntologyUpdated(res.ontology)
      const next = sessions.map((sess) =>
        sess.id !== activeSession.id
          ? sess
          : {
              ...sess,
              turns: sess.turns.map((t) =>
                t.id === turn.id
                  ? {
                      ...t,
                      planData: undefined,
                      content: `${t.content}\n\n_Blueprint applied._`,
                    }
                  : t
              ),
            }
      )
      syncSessions(next)
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
      const res = await ontologyApi.summarizeChat({
        chat_history: historyPayload,
      })
      appendTurn(activeSession.id, {
        id: `sum-${Date.now()}`,
        role: 'summary',
        content: res?.summary || 'Summarized.',
        timestamp: Date.now(),
      })
    } finally {
      setSummarizing(false)
    }
  }

  return (
    <div
      style={{ fontFamily: FONT_STACK }}
      className={
        isExpanded
          ? 'fixed inset-0 z-50 flex flex-col bg-white text-slate-900'
          : 'relative flex h-full w-full shrink-0 flex-col border-l border-slate-200 bg-white text-slate-900 sm:w-[440px] md:w-[480px]'
      }
    >
      <header className="flex h-12 items-center justify-between gap-2 border-b border-slate-200 px-3.5">
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            onClick={() => setHistoryRailOpen((v) => !v)}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 hover:bg-[#F8FAFC] hover:text-slate-900"
            title="Sessions"
          >
            {historyRailOpen ? (
              <PanelLeftClose className="h-3.5 w-3.5" strokeWidth={2} />
            ) : (
              <PanelLeftOpen className="h-3.5 w-3.5" strokeWidth={2} />
            )}
          </button>
          <span className="text-[13px] font-medium text-slate-900">
            Schema Architect
          </span>
          <span className="font-mono text-[10px] text-slate-400">
            llama-3.3-70b
          </span>
        </div>
        <div className="flex items-center gap-1">
          <div className="inline-flex rounded-lg border border-slate-200 bg-[#F8FAFC] p-0.5">
            {(['action', 'plan'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`h-5.5 rounded-md px-2 text-[10.5px] font-medium transition-all ${
                  mode === m
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {m === 'action' ? 'Act' : 'Plan'}
              </button>
            ))}
          </div>
          <button
            type="button"
            disabled={turns.length === 0}
            onClick={handleClearChat}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-[#F8FAFC] hover:text-slate-800 disabled:opacity-30"
            title="Clear"
          >
            <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
          </button>
          <button
            type="button"
            onClick={() => setIsExpanded((v) => !v)}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 hover:bg-[#F8FAFC] hover:text-slate-900"
            title={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? (
              <Shrink className="h-3.5 w-3.5" strokeWidth={2} />
            ) : (
              <Expand className="h-3.5 w-3.5" strokeWidth={2} />
            )}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 hover:bg-[#F8FAFC] hover:text-slate-900"
            title="Close"
          >
            <X className="h-3.5 w-3.5" strokeWidth={2} />
          </button>
        </div>
      </header>

      <div className="relative flex flex-1 min-h-0 overflow-hidden">
        {historyRailOpen && (
          <>
            <div
              onClick={() => setHistoryRailOpen(false)}
              className="absolute inset-0 z-10 bg-slate-950/10"
            />
            <aside className="absolute inset-y-0 left-0 z-20 flex w-60 flex-col border-r border-slate-200 bg-white shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2.5">
                <span className="font-mono text-[10px] uppercase tracking-wider text-slate-400">
                  Sessions
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
                  className="flex h-6 items-center gap-1 rounded-md bg-slate-900 px-2 text-[10.5px] font-medium text-white hover:bg-slate-800"
                >
                  <MessageSquarePlus
                    className="h-2.5 w-2.5"
                    strokeWidth={2.5}
                  />
                  New
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-1.5">
                {sessions.map((sess) => (
                  <div
                    key={sess.id}
                    onClick={() => {
                      setActiveSessionId(sess.id)
                      setHistoryRailOpen(false)
                    }}
                    className={`group flex cursor-pointer items-center justify-between rounded-lg px-2.5 py-2 text-[12px] ${
                      sess.id === activeSessionId
                        ? 'bg-[#F8FAFC] font-medium text-slate-900'
                        : 'text-slate-600 hover:bg-[#F8FAFC]'
                    }`}
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <div className="truncate">{sess.title}</div>
                      <div className="text-[10.5px] text-slate-400">
                        {sess.turns?.length || 0} msg
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => handleDeleteSession(sess.id, e)}
                      className="p-0.5 text-slate-400 opacity-0 transition-opacity hover:text-slate-900 group-hover:opacity-100"
                    >
                      <Trash2 className="h-3 w-3" strokeWidth={1.75} />
                    </button>
                  </div>
                ))}
              </div>
            </aside>
          </>
        )}

        <div className="flex flex-1 flex-col min-w-0">
          <div ref={feedRef} className="flex-1 overflow-y-auto">
            <div className="mx-auto max-w-xl space-y-3.5 px-4 py-4">
              {turns.length === 0 ? (
                <div className="pt-6">
                  <div className="text-center">
                    <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-[#F8FAFC]">
                      <Layers
                        className="h-4 w-4 text-slate-700"
                        strokeWidth={1.75}
                      />
                    </div>
                    <h3 className="mt-2.5 text-[13.5px] font-medium text-slate-900">
                      Schema Architect
                    </h3>
                    <p className="mt-0.5 text-[12px] text-slate-500">
                      Inspect {ontology.name} or generate new domain models.
                    </p>
                  </div>
                  <div className="mt-4 space-y-2">
                    {PROMPT_SUGGESTIONS.map((tpl) => (
                      <button
                        key={tpl.title}
                        type="button"
                        onClick={() => sendPrompt(tpl.prompt)}
                        disabled={busy}
                        className="flex w-full items-start gap-2.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-left transition-colors hover:border-slate-300 hover:bg-[#F8FAFC] disabled:opacity-50"
                      >
                        <span className="mt-0.5 text-slate-400">
                          <ArrowRight
                            className="h-3.5 w-3.5"
                            strokeWidth={1.75}
                          />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="text-[12px] font-medium text-slate-900">
                            {tpl.title}
                          </div>
                          <div className="text-[11.5px] text-slate-500">
                            {tpl.prompt}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                turns.map((turn) => (
                  <ChatBubble
                    key={turn.id}
                    turn={turn}
                    copied={copiedTurnId === turn.id}
                    applyingPlan={applyingPlanId === turn.id}
                    onCopy={() => handleCopyTurn(turn.content, turn.id)}
                    onApprovePlan={() => handleApprovePlan(turn)}
                  />
                ))
              )}
              {busy && (
                <div className="flex items-center gap-2 text-[12px] text-slate-500">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2} />
                  Processing…
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-slate-200 bg-[#F8FAFC] p-3">
            <div className="rounded-xl border border-slate-200 bg-white shadow-xs transition-colors focus-within:border-slate-400">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    sendPrompt()
                  }
                }}
                rows={2}
                placeholder={
                  mode === 'plan'
                    ? 'Describe schema blueprint…'
                    : 'Instruct architect…'
                }
                className="w-full resize-none bg-transparent px-3 pb-1.5 pt-2.5 text-[12.5px] leading-relaxed text-slate-900 placeholder:text-slate-400 outline-none"
              />
              <div className="flex items-center justify-between gap-2 border-t border-slate-100 px-2 py-1.5">
                <button
                  type="button"
                  onClick={handleSummarize}
                  disabled={turns.length < 2 || summarizing || busy}
                  className="flex h-6.5 items-center gap-1 rounded-lg px-2 text-[11px] font-medium text-slate-500 hover:bg-[#F8FAFC] hover:text-slate-900 disabled:opacity-40"
                >
                  {summarizing ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Layers className="h-3 w-3" strokeWidth={2} />
                  )}
                  Summarize
                </button>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] text-slate-400">
                    ⇧⏎
                  </span>
                  <button
                    type="button"
                    onClick={() => sendPrompt()}
                    disabled={!input.trim() || busy}
                    className="flex h-6.5 items-center gap-1 rounded-lg bg-slate-900 px-2.5 text-[11.5px] font-medium text-white hover:bg-slate-800 disabled:opacity-40"
                  >
                    {busy ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Send className="h-3 w-3" strokeWidth={2} />
                    )}
                    Send
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ────────────────────────────────────────────────────────────
   CHAT BUBBLE
   ──────────────────────────────────────────────────────────── */
function ChatBubble({
  turn,
  copied,
  applyingPlan,
  onCopy,
  onApprovePlan,
}: {
  turn: ChatTurn
  copied: boolean
  applyingPlan: boolean
  onCopy: () => void
  onApprovePlan: () => void
}) {
  if (turn.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl border border-slate-200 bg-[#F8FAFC] px-3.5 py-2 text-[12.5px] leading-relaxed text-slate-900">
          <div className="whitespace-pre-wrap break-words">{turn.content}</div>
        </div>
      </div>
    )
  }

  if (turn.role === 'error') {
    return (
      <div className="rounded-xl border border-slate-300 bg-[#F8FAFC] px-3 py-2.5 text-[12px] text-slate-900">
        <div className="flex items-start gap-2">
          <AlertCircle
            className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-700"
            strokeWidth={2}
          />
          <div className="min-w-0 flex-1 break-words">{turn.content}</div>
        </div>
      </div>
    )
  }

  if (turn.role === 'summary') {
    return (
      <div className="rounded-xl border border-slate-200 bg-[#F8FAFC] px-3.5 py-2.5">
        <div className="mb-1 flex items-center gap-1.5 font-mono text-[9.5px] uppercase tracking-wider text-slate-500">
          <Layers className="h-3 w-3" strokeWidth={2} />
          Summary
        </div>
        <MarkdownRenderer content={turn.content} />
      </div>
    )
  }

  return (
    <div className="group">
      <div className="mb-1 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <div className="flex h-4.5 w-4.5 items-center justify-center rounded-md bg-slate-900">
            <span className="font-mono text-[8px] font-bold text-white">
              AI
            </span>
          </div>
          <span className="text-[11.5px] font-medium text-slate-900">
            Architect
          </span>
        </div>
        <button
          type="button"
          onClick={onCopy}
          className="flex h-5.5 items-center gap-1 rounded-md px-1.5 text-[10.5px] text-slate-400 opacity-0 hover:bg-[#F8FAFC] hover:text-slate-700 group-hover:opacity-100"
        >
          {copied ? (
            <>
              <Check className="h-2.5 w-2.5" strokeWidth={2.5} />
              Copied
            </>
          ) : (
            <>
              <Copy className="h-2.5 w-2.5" strokeWidth={2} />
              Copy
            </>
          )}
        </button>
      </div>
      <MarkdownRenderer content={turn.content} />
      {(turn.entityCount || turn.relationshipCount) && (
        <div className="mt-2 flex gap-1.5">
          {!!turn.entityCount && (
            <span className="rounded-md border border-slate-200 bg-[#F8FAFC] px-2 py-0.5 font-mono text-[10px] text-slate-600">
              +{turn.entityCount}e
            </span>
          )}
          {!!turn.relationshipCount && (
            <span className="rounded-md border border-slate-200 bg-[#F8FAFC] px-2 py-0.5 font-mono text-[10px] text-slate-600">
              +{turn.relationshipCount}r
            </span>
          )}
        </div>
      )}
      {turn.planData && (
        <div className="mt-2.5 rounded-xl border border-slate-200 bg-[#F8FAFC] p-3">
          <div className="text-[11.5px] font-medium text-slate-900">
            Blueprint ready
          </div>
          <p className="mt-0.5 text-[11px] text-slate-500">
            Review schema changes before applying.
          </p>
          <button
            type="button"
            onClick={onApprovePlan}
            disabled={applyingPlan}
            className="mt-2 flex h-7 items-center gap-1.5 rounded-lg bg-slate-900 px-3 text-[11.5px] font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {applyingPlan ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Check className="h-3 w-3" strokeWidth={2.5} />
            )}
            {applyingPlan ? 'Applying…' : 'Apply Blueprint'}
          </button>
        </div>
      )}
    </div>
  )
}

function MarkdownRenderer({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        code({ inline, className, children, ...props }: any) {
          return !inline ? (
            <pre className="my-2 overflow-x-auto rounded-xl bg-slate-900 p-3">
              <code
                className={`font-mono text-[11px] leading-relaxed text-slate-100 ${
                  className || ''
                }`}
                {...props}
              >
                {children}
              </code>
            </pre>
          ) : (
            <code
              className="rounded-md bg-[#F8FAFC] px-1.5 py-0.5 font-mono text-[11px] text-slate-800 border border-slate-200/70"
              {...props}
            >
              {children}
            </code>
          )
        },
        table({ children }) {
          return (
            <div className="my-2 overflow-x-auto rounded-xl border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-[11.5px]">
                {children}
              </table>
            </div>
          )
        },
        thead({ children }) {
          return <thead className="bg-[#F8FAFC]">{children}</thead>
        },
        th({ children }) {
          return (
            <th className="px-2.5 py-1.5 text-left text-[10px] font-medium uppercase tracking-wide text-slate-500">
              {children}
            </th>
          )
        },
        td({ children }) {
          return <td className="px-2.5 py-1.5 text-slate-700">{children}</td>
        },
        h1({ children }) {
          return (
            <h1 className="mb-1 mt-2 text-[13.5px] font-semibold text-slate-900">
              {children}
            </h1>
          )
        },
        h2({ children }) {
          return (
            <h2 className="mb-1 mt-2 text-[13px] font-semibold text-slate-900">
              {children}
            </h2>
          )
        },
        h3({ children }) {
          return (
            <h3 className="mb-1 mt-1.5 text-[12.5px] font-semibold text-slate-900">
              {children}
            </h3>
          )
        },
        p({ children }) {
          return (
            <p className="my-1 text-[12.5px] leading-relaxed text-slate-700">
              {children}
            </p>
          )
        },
        ul({ children }) {
          return <ul className="my-1 list-disc pl-4 text-[12.5px]">{children}</ul>
        },
        ol({ children }) {
          return (
            <ol className="my-1 list-decimal pl-4 text-[12.5px]">{children}</ol>
          )
        },
        li({ children }) {
          return <li className="my-0.5 text-[12.5px] text-slate-700">{children}</li>
        },
        a({ href, children }) {
          return (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="text-slate-900 underline underline-offset-2 hover:text-slate-600"
            >
              {children}
            </a>
          )
        },
        blockquote({ children }) {
          return (
            <blockquote className="my-1.5 border-l-2 border-slate-300 pl-2.5 text-slate-600">
              {children}
            </blockquote>
          )
        },
        hr() {
          return <hr className="my-2 border-slate-200" />
        },
      }}
    >
      {content}
    </ReactMarkdown>
  )
}