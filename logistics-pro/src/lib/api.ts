const API_BASE_URL = 'https://logistichub.ddns.net';

export async function login(slug: string, role: string, email: string, password: string) {
  const endpoint = role === 'driver' ? `/${slug}/api/staff-login` : `/${slug}/api/login`;
  
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(errorData?.error || 'Login failed. Please check your credentials and workspace ID.');
  }

  const data = await response.json();
  if (data.token) {
    localStorage.setItem('auth_token', data.token);
    localStorage.setItem('auth_slug', slug);
  }
  return data;
}

export async function getProfile() {
  const token = localStorage.getItem('auth_token');
  const slug = localStorage.getItem('auth_slug');
  if (!token || !slug) throw new Error('Not authenticated');

  const response = await fetch(`${API_BASE_URL}/${slug}/api/me`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  if (!response.ok) throw new Error('Failed to fetch profile');
  const data = await response.json();
  return data.user;
}

export async function getDeliveries() {
  const token = localStorage.getItem('auth_token');
  const slug = localStorage.getItem('auth_slug');
  if (!token || !slug) return [];

  const response = await fetch(`${API_BASE_URL}/${slug}/api/mobile/deliveries`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  if (!response.ok) return [];
  const data = await response.json();
  return data.deliveries;
}

export async function updateDeliveryStatus(id: string, status: string) {
  const token = localStorage.getItem('auth_token');
  const slug = localStorage.getItem('auth_slug');
  if (!token || !slug) throw new Error('Not authenticated');

  const response = await fetch(`${API_BASE_URL}/${slug}/api/mobile/deliveries/${id}/status`, {
    method: 'PUT',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ status })
  });

  if (!response.ok) throw new Error('Failed to update status');
  return response.json();
}

export function logout() {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('auth_slug');
}
