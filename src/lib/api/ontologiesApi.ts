import { apiRequest } from './client'

export interface OntologyAttribute {
  attribute_id?: string
  name: string
  datatype: string
  label?: string
  is_pk?: boolean
  is_primary_key?: boolean
  is_fk?: boolean
  is_foreign_key?: boolean
  nullable?: boolean
  is_nullable?: boolean
  description?: string
}

export interface OntologyEntity {
  entity_id?: string
  name: string
  label?: string
  description?: string
  category?: string
  attributes: OntologyAttribute[]
  position?: { x: number; y: number }
}

export interface OntologyRelationship {
  relationship_id?: string
  name?: string
  label?: string
  source_entity?: string
  source_entity_name?: string
  source_entity_id?: string
  target_entity?: string
  target_entity_name?: string
  target_entity_id?: string
  cardinality: string
  relation_type?: string
  description?: string
  source_attribute?: string
  target_attribute?: string
}

export interface OntologyModel {
  ontology_version_id: string
  project_id: string
  name: string
  domain: string
  version_tag: string
  description?: string
  status?: string
  entities: OntologyEntity[]
  relationships: OntologyRelationship[]
  created_at?: string | number
  updated_at?: string | number
}

export const ontologiesApi = {
  list(projectId?: string) {
    const query = projectId ? `?project_id=${encodeURIComponent(projectId)}` : ''
    return apiRequest<OntologyModel[]>(`/ontologies${query}`)
  },

  get(versionId: string) {
    return apiRequest<OntologyModel>(
      `/ontologies/${encodeURIComponent(versionId)}`
    )
  },

  create(payload: {
    project_id: string
    name: string
    domain: string
    version_tag: string
    description?: string
    entities: OntologyEntity[]
    relationships: OntologyRelationship[]
  }) {
    return apiRequest<OntologyModel>('/ontologies', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  update(versionId: string, payload: Partial<OntologyModel>) {
    return apiRequest<OntologyModel>(
      `/ontologies/${encodeURIComponent(versionId)}`,
      {
        method: 'PUT',
        body: JSON.stringify(payload),
      }
    )
  },

  delete(versionId: string) {
    return apiRequest<{ status: string }>(
      `/ontologies/${encodeURIComponent(versionId)}`,
      { method: 'DELETE' }
    )
  },

  /* ── Entity CRUD Endpoints ──────────────────────────────────── */
  addEntity(
    versionId: string,
    payload: {
      name: string
      label?: string
      description?: string
      category?: string
      attributes?: OntologyAttribute[]
      position?: { x: number; y: number }
    }
  ) {
    return apiRequest<OntologyEntity>(
      `/ontologies/${encodeURIComponent(versionId)}/entities`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    )
  },

  updateEntity(
    versionId: string,
    entityId: string,
    payload: {
      name?: string
      label?: string
      description?: string
      category?: string
      attributes?: OntologyAttribute[]
      position?: { x: number; y: number }
    }
  ) {
    return apiRequest<OntologyEntity>(
      `/ontologies/${encodeURIComponent(versionId)}/entities/${encodeURIComponent(entityId)}`,
      {
        method: 'PUT',
        body: JSON.stringify(payload),
      }
    )
  },

  deleteEntity(versionId: string, entityId: string) {
    return apiRequest<{ status: string; entity_id: string }>(
      `/ontologies/${encodeURIComponent(versionId)}/entities/${encodeURIComponent(entityId)}`,
      { method: 'DELETE' }
    )
  },

  /* ── Relationship CRUD Endpoints ────────────────────────────── */
  addRelationship(
    versionId: string,
    payload: {
      name?: string
      label?: string
      source_entity_id?: string
      source_entity_name?: string
      source_entity?: string
      target_entity_id?: string
      target_entity_name?: string
      target_entity?: string
      relation_type?: string
      cardinality?: string
      description?: string
    }
  ) {
    return apiRequest<OntologyRelationship>(
      `/ontologies/${encodeURIComponent(versionId)}/relationships`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    )
  },

  updateRelationship(
    versionId: string,
    relationshipId: string,
    payload: {
      name?: string
      label?: string
      relation_type?: string
      cardinality?: string
      description?: string
    }
  ) {
    return apiRequest<OntologyRelationship>(
      `/ontologies/${encodeURIComponent(versionId)}/relationships/${encodeURIComponent(relationshipId)}`,
      {
        method: 'PUT',
        body: JSON.stringify(payload),
      }
    )
  },

  deleteRelationship(versionId: string, relationshipId: string) {
    return apiRequest<{ status: string; relationship_id: string }>(
      `/ontologies/${encodeURIComponent(versionId)}/relationships/${encodeURIComponent(relationshipId)}`,
      { method: 'DELETE' }
    )
  },

  /* ── AI Autonomous Agent Endpoints ──────────────────────────── */
  agentGenerate(payload: {
    project_id: string
    prompt: string
    ontology_name?: string
    domain?: string
    target_ontology_id?: string
    chat_history?: Array<{ role: string; content: string }>
    mode: 'action' | 'plan'
  }) {
    return apiRequest<{
      status: string
      message?: string
      response_markdown?: string
      ontology?: OntologyModel
      reasoning_steps?: Array<{ stage: string; summary: string }>
      plan_data?: any
      entity_count?: number
      relationship_count?: number
      error?: string
    }>('/ontologies/agent/generate', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  applyAgentPlan(payload: {
    project_id: string
    plan_data: any
    target_ontology_id: string
  }) {
    return apiRequest<{
      status: string
      ontology?: OntologyModel
    }>('/ontologies/agent/apply-plan', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  summarizeChat(payload: {
    chat_history: Array<{ role: string; content: string }>
  }) {
    return apiRequest<{ summary: string }>('/ontologies/agent/summarize', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  /* ── Chat Sessions Persistence ──────────────────────────────── */
  getChatSessions(versionId: string) {
    return apiRequest<any[]>(
      `/ontologies/${encodeURIComponent(versionId)}/chat-sessions`
    )
  },

  saveChatSessions(versionId: string, sessions: any[]) {
    return apiRequest<any[]>(
      `/ontologies/${encodeURIComponent(versionId)}/chat-sessions`,
      {
        method: 'PUT',
        body: JSON.stringify({ sessions }),
      }
    )
  },

  deleteChatSession(versionId: string, sessionId: string) {
    return apiRequest<{ status: string; session_id: string }>(
      `/ontologies/${encodeURIComponent(versionId)}/chat-sessions/${encodeURIComponent(sessionId)}`,
      { method: 'DELETE' }
    )
  },

  clearAllChatSessions(versionId: string) {
    return apiRequest<{ status: string }>(
      `/ontologies/${encodeURIComponent(versionId)}/chat-sessions`,
      { method: 'DELETE' }
    )
  },
}

// Alias so imports using singular `ontologyApi` also resolve cleanly
export const ontologyApi = ontologiesApi
export default ontologiesApi