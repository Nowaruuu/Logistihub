// All API calls go to: https://logistihub.ddns.net/:slug/api/...
// The slug is derived from the URL path or stored after login.

const BASE_URL = 'https://logistichub.ddns.net';

// Custom error for suspended workspaces
export class SuspendedError extends Error {
  public companyName: string;
  constructor(message: string, companyName?: string) {
    super(message);
    this.name = 'SuspendedError';
    this.companyName = companyName || '';
  }
}

function getToken(): string | null {
  return localStorage.getItem('lh_token');
}

function getSlug(): string | null {
  return localStorage.getItem('lh_slug');
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    // Detect suspended workspace
    if (res.status === 403 && (data?.suspended === true)) {
      throw new SuspendedError(
        data?.message || data?.error || 'This workspace has been suspended.',
        data?.company_name || ''
      );
    }
    throw new Error(data?.message || data?.error || `Request failed (${res.status})`);
  }

  return data as T;
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export async function login(slug: string, email: string, password: string) {
  // Uses APP_USER login via /:slug/api/login
  const data = await request<{ token: string; user: any }>(`/${slug}/api/login`, {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  return data;
}

export async function register(
  slug: string,
  payload: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    password: string;
    address?: string;
  }
) {
  const data = await request<{ token: string; user: any }>(`/${slug}/api/register`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return data;
}

export async function logout(slug: string) {
  try {
    await request(`/${slug}/api/logout`, { method: 'POST' });
  } catch (_) {
    // Ignore logout errors
  }
}

export async function getProfile(slug: string) {
  return request<{ user: any }>(`/${slug}/api/me`);
}

export async function updateProfile(
  slug: string,
  payload: { first_name?: string; last_name?: string; phone?: string }
) {
  return request<{ ok: boolean; message: string }>(`/${slug}/api/mobile/profile`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function uploadProfilePicture(slug: string, base64Image: string) {
  return request<{ ok: boolean; profile_picture: string }>(`/${slug}/api/mobile/profile-picture`, {
    method: 'PUT',
    body: JSON.stringify({ image: base64Image }),
  });
}

// ── Tenant info ───────────────────────────────────────────────────────────────
// This endpoint must exist on the backend: GET /:slug/api/tenant-info
export async function getTenantInfo(slug: string) {
  return request<{ tenant: any }>(`/${slug}/api/tenant-info`);
}

export { getSlug, getToken };
