import { ApiError, tokenStorage } from '../authApi'

const RAW_BASE =
  (import.meta.env.VITE_API_URL || '').trim().replace(/\/+$/, '') ||
  'http://127.0.0.1:8000'

export const API_BASE_URL = RAW_BASE.endsWith('/api/v1')
  ? RAW_BASE
  : `${RAW_BASE}/api/v1`

export function getAuthHeaders(): Record<string, string> {
  const token = tokenStorage.get()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem('ms_user_profile')
      if (raw) {
        const profile = JSON.parse(raw)
        if (profile?.tenant_id) {
          headers['X-Tenant-ID'] = profile.tenant_id
        }
      }
    } catch {
      // ignore storage error
    }
  }
  return headers
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      ...getAuthHeaders(),
      ...(init.headers || {}),
    },
  })

  const data = await res.json().catch(() => ({}))

  if (!res.ok) {
    let message = 'Request failed'
    if (typeof data?.detail === 'string') {
      message = data.detail
    } else if (Array.isArray(data?.detail)) {
      message = data.detail.map((d: { msg?: string }) => d.msg).join(' • ')
    } else if (typeof data?.message === 'string') {
      message = data.message
    }
    throw new ApiError(message, res.status)
  }

  return data as T
}