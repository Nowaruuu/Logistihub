const API_BASE_URL = 'https://logistichub.ddns.net';

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('auth_token');
  return token ? { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
}

function getSlug(): string {
  return localStorage.getItem('auth_slug') || '';
}

function mobileUrl(path: string): string {
  return `${API_BASE_URL}/${getSlug()}/api/mobile${path}`;
}

function apiUrl(path: string): string {
  return `${API_BASE_URL}/${getSlug()}/api${path}`; 
}

export async function getTenantConfig(): Promise<{ available_vehicles: string[]; vehicle_capacities: Record<string, number>; company_name: string; logo_url: string | null; primary_color: string; supported_categories: string[]; max_distance_km: number }> {
  const slug = localStorage.getItem('auth_slug') || '';
  const fallback = { available_vehicles: ['motorcycle','sedan','van','truck','flatbed'], vehicle_capacities: {}, company_name: '', logo_url: null, primary_color: '#ea580c', supported_categories: ['Package','Food','Document','Bulk','Vehicle'], max_distance_km: 100 };
  if (!slug) return fallback;
  try {
    const res = await fetch(`${API_BASE_URL}/${slug}/api/mobile/tenant-config`);
    if (!res.ok) throw new Error('failed');
    const data = await res.json();
    // Ensure supported_categories always exists (older servers may not return it)
    if (!data.supported_categories) data.supported_categories = fallback.supported_categories;
    return data;
  } catch {
    return fallback;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// AUTH
// ═══════════════════════════════════════════════════════════════════════════════

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

export function logout() {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('auth_slug');
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

export async function updateProfile(profileData: { phone?: string; first_name?: string; last_name?: string; address?: string }) {
  const res = await fetch(mobileUrl('/profile'), { method: 'PUT', headers: getAuthHeaders(), body: JSON.stringify(profileData) });
  if (!res.ok) throw new Error('Failed to update profile');
  return res.json();
}

// ═══════════════════════════════════════════════════════════════════════════════
// DELIVERIES / SHIPMENTS
// ═══════════════════════════════════════════════════════════════════════════════

export async function getDeliveries() {
  const res = await fetch(mobileUrl('/deliveries'), { headers: getAuthHeaders() });
  if (!res.ok) return [];
  const data = await res.json();
  return data.deliveries || [];
}

export async function createDelivery(deliveryData: {
  pickup_location: string;
  dropoff_location: string;
  pickup_lat?: number;
  pickup_lng?: number;
  dropoff_lat?: number;
  dropoff_lng?: number;
  receiver_name?: string;
  receiver_phone?: string;
  receiver_address?: string;
  item_type_flag?: string;
  weight?: number;
  size?: string;
  shipping_method?: string;
  total_fee?: number;
  content_description?: string;
  estimated_arrival?: string;
}) {
  const res = await fetch(mobileUrl('/deliveries'), {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(deliveryData)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.error || 'Failed to create shipment');
  }
  return res.json();
}

export async function getDeliveryDetail(deliveryNumber: string) {
  const res = await fetch(mobileUrl(`/deliveries/${deliveryNumber}`), { headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Shipment not found');
  return res.json();
}

export async function updateDeliveryStatus(id: string, status: string, location?: string, proof_photo?: string, lat?: number | null, lng?: number | null) {
  const res = await fetch(mobileUrl(`/driver/status/${id}`), {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({ status, location, proof_photo, lat: lat ?? null, lng: lng ?? null })
  });
  if (!res.ok) throw new Error('Failed to update status');
  return res.json();
}

export async function rateDelivery(deliveryNumber: string, rating: number, comment?: string) {
  const res = await fetch(mobileUrl(`/deliveries/${deliveryNumber}/rate`), {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ rating, comment })
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to submit rating');
  }
  return res.json();
}

export async function getDeliveryRating(deliveryNumber: string) {
  const res = await fetch(mobileUrl(`/deliveries/${deliveryNumber}/rating`), { headers: getAuthHeaders() });
  if (!res.ok) return null;
  const data = await res.json();
  return data.rating;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DRIVER
// ═══════════════════════════════════════════════════════════════════════════════

export async function getAvailableJobs() {
  const res = await fetch(mobileUrl('/driver/jobs'), { headers: getAuthHeaders() });
  if (!res.ok) return [];
  const data = await res.json();
  return data.jobs || [];
}

export async function acceptJob(deliveryNumber: string) {
  const res = await fetch(mobileUrl(`/driver/accept/${deliveryNumber}`), {
    method: 'POST',
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to accept job');
  return res.json();
}

export async function getDriverEarnings() {
  const res = await fetch(mobileUrl('/driver/earnings'), { headers: getAuthHeaders() });
  if (!res.ok) return { total_earnings: 0, week_earnings: 0, completed_jobs: 0, transactions: [] };
  return res.json();
}

export async function getDriverStats() {
  const res = await fetch(mobileUrl('/driver/stats'), { headers: getAuthHeaders() });
  if (!res.ok) return { total_deliveries: 0, rating: 0, acceptance_rate: 0, on_time_rate: 0, feedback: [] };
  return res.json();
}

// ═══════════════════════════════════════════════════════════════════════════════
// DELIVERY CHAT & CALL
// ═══════════════════════════════════════════════════════════════════════════════

export async function getChatMessages(deliveryNumber: string) {
  const res = await fetch(mobileUrl(`/chat/${deliveryNumber}`), { headers: getAuthHeaders() });
  if (!res.ok) return { chat_enabled: false, messages: [] };
  return res.json();
}

export async function sendChatMessage(deliveryNumber: string, message: string) {
  const res = await fetch(mobileUrl(`/chat/${deliveryNumber}`), {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ message })
  });
  if (!res.ok) throw new Error('Failed to send message');
  return res.json();
}

export async function getChatContact(deliveryNumber: string) {
  const res = await fetch(mobileUrl(`/chat/${deliveryNumber}/contact`), { headers: getAuthHeaders() });
  if (!res.ok) return { phone: null, name: null };
  return res.json();
}

export async function declineDelivery(deliveryNumber: string, reason?: string) {
  const res = await fetch(mobileUrl('/driver/decline'), {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ delivery_number: deliveryNumber, reason: reason || '' })
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: 'Failed to decline' }));
    throw new Error(data.error || 'Failed to decline');
  }
  return res.json();
}

// ═══════════════════════════════════════════════════════════════════════════════
// ADDRESS BOOK
// ═══════════════════════════════════════════════════════════════════════════════

export async function getAddresses() {
  const res = await fetch(mobileUrl('/addresses'), { headers: getAuthHeaders() });
  if (!res.ok) return [];
  const data = await res.json();
  return data.addresses || [];
}

export async function saveAddress(addressData: { label: string; full_name: string; phone: string; address: string; city: string; zip_code: string }) {
  const res = await fetch(mobileUrl('/addresses'), {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(addressData)
  });
  if (!res.ok) throw new Error('Failed to save address');
  return res.json();
}

export async function deleteAddress(id: string | number) {
  const res = await fetch(mobileUrl(`/addresses/${id}`), { method: 'DELETE', headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Failed to delete address');
  return res.json();
}

// ═══════════════════════════════════════════════════════════════════════════════
// NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════════════════════

export async function getNotifications() {
  const res = await fetch(mobileUrl('/notifications'), { headers: getAuthHeaders() });
  if (!res.ok) return [];
  const data = await res.json();
  return data.notifications || [];
}

export async function markNotificationRead(id: string | number) {
  const res = await fetch(mobileUrl(`/notifications/${id}/read`), { method: 'PUT', headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Failed to mark as read');
  return res.json();
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAYMONGO PAYMENT
// ═══════════════════════════════════════════════════════════════════════════════

export async function createCheckout(deliveryNumber: string, amount: number, description?: string) {
  const res = await fetch(mobileUrl('/pay/checkout'), {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ delivery_number: deliveryNumber, amount, description })
  });
  if (res.status === 409) {
    // Already paid — return special marker so UI can update immediately
    return { already_paid: true };
  }
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.error || 'Failed to create payment');
  }
  return res.json();
}

export async function getPaymentStatus(deliveryNumber: string) {
  const res = await fetch(mobileUrl(`/pay/status/${deliveryNumber}`), { headers: getAuthHeaders() });
  if (!res.ok) return { status: 'unknown' };
  return res.json();
}

export async function updateDriverLocation(deliveryNumber: string, lat: number, lng: number) {
  try {
    await fetch(mobileUrl(`/driver/location/${deliveryNumber}`), {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ lat, lng }),
    });
  } catch { /* silent — don't block UI */ }
}
