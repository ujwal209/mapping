import { apiRequest } from './client'

export interface ProjectItem {
  project_id: string
  tenant_id: string
  name: string
  description?: string
  owners?: string[]
  status?: string
  domain?: string
  methodology?: string
  source_ecosystem?: string
  target_ecosystem?: string
  estimated_volume?: string
  target_cutover_date?: string
  compliance_framework?: string
  data_classification?: string
  planned_waves?: number
  rehearsal_strategy?: string
  environments?: { environment_id?: string; name: string; status?: string }[]
  created_at?: string | number
  updated_at?: string | number
}

export interface CreateProjectPayload {
  name: string
  description?: string
  owners?: string[]
  domain?: string
  methodology?: string
  source_ecosystem?: string
  target_ecosystem?: string
  estimated_volume?: string
  target_cutover_date?: string
  compliance_framework?: string
  data_classification?: string
  planned_waves?: number
  rehearsal_strategy?: string
}

export interface UpdateProjectPayload extends Partial<CreateProjectPayload> {
  status?: string
}

const ACTIVE_PROJECT_KEY = 'ms_active_project_id'

export const activeProjectStorage = {
  get(): string | null {
    if (typeof window === 'undefined') return null
    return localStorage.getItem(ACTIVE_PROJECT_KEY)
  },
  set(projectId: string) {
    if (typeof window === 'undefined') return
    localStorage.setItem(ACTIVE_PROJECT_KEY, projectId)
    window.dispatchEvent(
      new CustomEvent('ms:active-project-changed', { detail: projectId })
    )
  },
  clear() {
    if (typeof window === 'undefined') return
    localStorage.removeItem(ACTIVE_PROJECT_KEY)
    window.dispatchEvent(
      new CustomEvent('ms:active-project-changed', { detail: null })
    )
  },
}

export const projectsApi = {
  list() {
    return apiRequest<ProjectItem[]>('/projects')
  },
  get(projectId: string) {
    return apiRequest<ProjectItem>(`/projects/${projectId}`)
  },
  create(payload: CreateProjectPayload) {
    return apiRequest<ProjectItem>('/projects', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
  update(projectId: string, payload: UpdateProjectPayload) {
    return apiRequest<ProjectItem>(`/projects/${projectId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
  },
}