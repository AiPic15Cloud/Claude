import { useAuthStore } from '@/store/auth.store';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001/api/v1';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  skipAuth?: boolean;
}

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const { refreshToken, setTokens, clear } = useAuthStore.getState();
  if (!refreshToken) return null;

  if (!refreshPromise) {
    refreshPromise = fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error('refresh failed');
        const data = await res.json();
        setTokens(data.accessToken, data.refreshToken);
        return data.accessToken as string;
      })
      .catch(() => {
        clear();
        return null;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, skipAuth, headers, ...rest } = options;
  const accessToken = useAuthStore.getState().accessToken;

  const doFetch = async (token: string | null): Promise<Response> =>
    fetch(`${API_URL}${path}`, {
      ...rest,
      headers: {
        ...(body && !(body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
        ...(token && !skipAuth ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      body: body instanceof FormData ? body : body !== undefined ? JSON.stringify(body) : undefined,
    });

  let response = await doFetch(accessToken);

  if (response.status === 401 && !skipAuth) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      response = await doFetch(newToken);
    }
  }

  if (!response.ok) {
    let message = response.statusText;
    try {
      const data = await response.json();
      message = data.message ?? message;
    } catch {
      // response has no JSON body
    }
    throw new ApiError(response.status, Array.isArray(message) ? message.join(', ') : message);
  }

  if (response.status === 204) return undefined as T;
  // Some endpoints resolve to undefined and Nest sends an empty body with a
  // 2xx status other than 204 (e.g. Content-Length: 0 on a 201) — parsing
  // that as JSON throws, which silently kills the caller's promise chain
  // (no onSuccess, no error surfaced). Treat an empty body as "no content"
  // regardless of status code instead of assuming 204 is the only case.
  const text = await response.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

// Local-storage document/image URLs come back from the API as an
// already-prefixed path ("/api/v1/documents/local/…"), meant to be resolved
// against the API's origin directly — not appended after API_URL, which
// already ends in "/api/v1" itself and would double it up. S3-backed URLs
// are absolute and need no resolution at all.
const API_ORIGIN = new URL(API_URL, window.location.origin).origin;

// Plain <img src="..."> can't send an Authorization header, and locally-stored
// files are served behind JwtAuthGuard — so displaying them inline requires
// fetching the bytes with auth attached and handing the browser a blob: URL
// instead of the API URL directly. Same token/refresh flow as request().
async function getBlob(path: string): Promise<Blob> {
  const url = /^https?:\/\//.test(path) ? path : `${API_ORIGIN}${path}`;
  const accessToken = useAuthStore.getState().accessToken;
  const doFetch = (token: string | null) => fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });

  let response = await doFetch(accessToken);
  if (response.status === 401) {
    const newToken = await refreshAccessToken();
    if (newToken) response = await doFetch(newToken);
  }
  if (!response.ok) throw new ApiError(response.status, response.statusText);
  return response.blob();
}

export const api = {
  get: <T>(path: string, options?: RequestOptions) => request<T>(path, { ...options, method: 'GET' }),
  getBlob,
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'POST', body }),
  put: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'PUT', body }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'PATCH', body }),
  delete: <T>(path: string, options?: RequestOptions) => request<T>(path, { ...options, method: 'DELETE' }),
};

export { API_URL };
