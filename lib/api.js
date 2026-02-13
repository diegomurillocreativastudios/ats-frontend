import { getAccessToken } from '@/lib/auth';

const getBaseUrl = () => process.env.NEXT_PUBLIC_API_URL || '';

const getOrigin = () => {
  if (typeof window !== 'undefined') return window.location.origin;
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
};

/** Attach Bearer token to request when available (client-side). */
const buildHeaders = (options = {}) => {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  if (typeof window !== 'undefined') {
    const token = getAccessToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }
  return headers;
};

/** Call our Next.js refresh route and return whether it succeeded. */
const tryRefresh = async () => {
  try {
    const res = await fetch(`${getOrigin()}/api/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });
    return res.ok;
  } catch {
    return false;
  }
};

export const apiClient = {
  async request(endpoint, options = {}, isRetry = false) {
    const baseUrl = getBaseUrl().replace(/\/$/, '');
    const url = endpoint.startsWith('http')
      ? endpoint
      : `${baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
    const config = {
      ...options,
      headers: buildHeaders(options),
      credentials: options.credentials ?? (endpoint.startsWith('http') ? undefined : 'omit'),
    };

    const res = await fetch(url, config);
    const data = await res.json().catch(() => ({}));

    if (res.status === 401 && !isRetry && typeof window !== 'undefined') {
      const refreshed = await tryRefresh();
      if (refreshed) {
        return this.request(endpoint, options, true);
      }
      window.location.href = '/auth/iniciar-sesion';
      throw { status: 401, message: 'Sesión expirada' };
    }

    if (!res.ok) {
      throw { status: res.status, ...data };
    }
    return data;
  },
  get(endpoint) {
    return this.request(endpoint, { method: 'GET' });
  },
  post(endpoint, body) {
    return this.request(endpoint, { method: 'POST', body: JSON.stringify(body) });
  },
  put(endpoint, body) {
    return this.request(endpoint, { method: 'PUT', body: JSON.stringify(body) });
  },
  patch(endpoint, body) {
    return this.request(endpoint, { method: 'PATCH', body: JSON.stringify(body) });
  },
  delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  },
};
