const RAW_BASE =
  import.meta.env.VITE_API_URL?.replace(/\/$/, '') || 'http://127.0.0.1:8000';

const API_BASE_URL = RAW_BASE.endsWith('/api/v1')
  ? RAW_BASE
  : `${RAW_BASE}/api/v1`;

export interface SignupPayload {
  full_name: string;
  email: string;
  organization: string;
  role: string;
  password: string;
}

export interface SignupResponse {
  status: string;
  message: string;
  user_id: string;
  email: string;
  full_name: string;
  tenant_id: string;
  role: string;
  is_verified: boolean;
  verification_token?: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
}

export interface UserProfileResponse {
  user_id: string;
  email: string;
  full_name: string;
  tenant_id: string;
  role: string;
  is_verified: boolean;
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(init.headers || {}),
      },
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      let detail = 'Request failed. Please try again.';
      if (typeof data?.detail === 'string') {
        detail = data.detail;
      } else if (Array.isArray(data?.detail)) {
        detail = data.detail
          .map((d: { loc?: string[]; msg?: string }) => {
            const field = d.loc?.[d.loc.length - 1];
            return field ? `${field}: ${d.msg}` : d.msg;
          })
          .filter(Boolean)
          .join(' • ');
      } else if (typeof data?.message === 'string') {
        detail = data.message;
      }
      throw new ApiError(detail, res.status);
    }

    return data as T;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new ApiError('Server took too long to respond. Please try again.', 408);
    }
    throw new ApiError(
      `Cannot connect to API server (${API_BASE_URL}). Verify backend is running.`,
      0
    );
  } finally {
    clearTimeout(timeoutId);
  }
}

export const authApi = {
  signup(payload: SignupPayload) {
    const slugTenant = payload.organization
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '');

    return request<SignupResponse>('/auth/signup', {
      method: 'POST',
      headers: slugTenant ? { 'X-Tenant-ID': slugTenant } : {},
      body: JSON.stringify({
        full_name: payload.full_name,
        email: payload.email,
        password: payload.password,
        organization: payload.organization,
        role: payload.role,
      }),
    });
  },

  verifyEmail(token: string) {
    return request<{
      status: string;
      message: string;
      user_id: string;
      email: string;
      is_verified: boolean;
    }>('/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
  },

  resendVerification(email: string) {
    return request<{
      status: string;
      message: string;
      email: string;
      verification_token?: string;
    }>('/auth/resend-verification', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  login(email: string, password: string) {
    return request<TokenResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  forgotPassword(email: string) {
    return request<{
      status: string;
      message: string;
      email: string;
      reset_token?: string;
    }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  resetPassword(token: string, new_password: string) {
    return request<{
      status: string;
      message: string;
      email: string;
    }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, new_password }),
    });
  },

  me(accessToken: string) {
    return request<UserProfileResponse>('/auth/me', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
  },
};

export const tokenStorage = {
  set(token: string) {
    if (typeof window !== 'undefined') {
      localStorage.setItem('ms_access_token', token);
    }
  },
  get(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('ms_access_token');
    }
    return null;
  },
  clear() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('ms_access_token');
    }
  },
};