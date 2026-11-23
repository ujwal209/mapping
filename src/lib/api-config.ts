import { API_BASE_URL, getAuthHeaders } from './api/client'
import { activeProjectStorage } from './api/projectsApi'

export const API_V1 = API_BASE_URL

export function authHeaders(extra?: Record<string, string>): Record<string, string> {
  return {
    ...getAuthHeaders(),
    ...(extra || {}),
  }
}

export function resolveProjectId(urlParam?: string | null): string {
  if (urlParam && urlParam.trim()) return urlParam.trim()
  const stored = activeProjectStorage.get()
  if (stored && stored.trim()) return stored.trim()
  if (typeof window !== 'undefined') {
    const raw = localStorage.getItem('active_project_id')
    if (raw && raw.trim()) return raw.trim()
  }
  return 'proj-default'
}
