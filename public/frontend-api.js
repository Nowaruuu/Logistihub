/**
 * Logistics OS — Frontend API Helper
 * Include this script in all HTML pages.
 * It reads window.__TENANT__ (injected server-side) and provides
 * wrappers around every backend API endpoint.
 */

var TENANT   = window.__TENANT__ || {};
var SLUG     = TENANT.slug || '';
var BASE     = '';   // same origin — no need for absolute URL

// ─── Low-level fetch wrapper ──────────────────────────────────────────────────
async function api(method, path, body) {
  const opts = {
    method,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  };
  if (body) opts.body = JSON.stringify(body);

  const res  = await fetch(BASE + path, opts);
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    // 401 on an admin page → redirect to login
    if (res.status === 401 && path.includes('/api/admin')) {
      window.location.href = `/${SLUG}/admin`;
    }
    throw new Error(data.error || `HTTP ${res.status}`);
  }
  return data;
}

// ─── Superadmin API ───────────────────────────────────────────────────────────
const SuperadminAPI = {
  login:           (email, password)  => api('POST', '/api/superadmin/login', { email, password }),
  logout:          ()                 => api('POST', '/api/superadmin/logout'),
  getOverview:     ()                 => api('GET',  '/api/superadmin/overview'),
  getTenants:      ()                 => api('GET',  '/api/superadmin/tenants'),
  inviteTenant:    (email, company_name, notes) =>
                     api('POST', '/api/superadmin/tenants/invite', { email, company_name, notes }),
  setTenantStatus: (id, status, reason) => api('PATCH', `/api/superadmin/tenants/${id}/status`, { status, reason }),
  deleteTenant:    (id)               => api('DELETE', `/api/superadmin/tenants/${id}`),
  getSubscriptions:()                 => api('GET',  '/api/superadmin/subscriptions'),
  getApplications: ()                 => api('GET',  '/api/superadmin/applications'),
  getPermit:       (id)               => api('GET',  `/api/superadmin/applications/${id}/permit`),
  approveApp:      (id)               => api('PUT',  `/api/superadmin/applications/${id}/approve`),
  rejectApp:       (id, reason)       => api('PUT',  `/api/superadmin/applications/${id}/reject`, { reason }),
};

// ─── Onboarding API ───────────────────────────────────────────────────────────
const OnboardingAPI = {
  verifyInvite: (token)   => api('GET', `/api/onboarding/verify-invite?invite=${encodeURIComponent(token)}`),
  createTenant: (payload) => api('POST', '/api/onboarding/create', payload),
  checkout:     (payload) => api('POST', '/api/onboarding/checkout', payload),
  apply:        (payload) => api('POST', '/api/onboarding/apply', payload),
  checkStatus:  (email)   => api('GET',  `/api/onboarding/check-status?email=${encodeURIComponent(email)}`),
  checkoutApproved: (approval_token, plan) => api('POST', '/api/onboarding/checkout-approved', { approval_token, plan }),
};

// ─── Admin API (all scoped to current tenant slug) ────────────────────────────
const AdminAPI = {
  login:    (email, password) => api('POST', `/${SLUG}/api/admin/login`,  { email, password }),
  logout:   ()                => api('POST', `/${SLUG}/api/admin/logout`),
  me:       ()                => api('GET',  `/${SLUG}/api/admin/me`),
  getStats: ()                => api('GET',  `/${SLUG}/api/admin/stats`),

  // Shipments
  getShipments:  (params = {}) => api('GET', `/${SLUG}/api/admin/shipments?` + new URLSearchParams(params)),
  getShipment:   (dn)          => api('GET', `/${SLUG}/api/admin/shipments/${dn}`),
  createShipment:(body)        => api('POST', `/${SLUG}/api/admin/shipments`, body),
  setShipStatus: (dn, status, reason) => api('PATCH', `/${SLUG}/api/admin/shipments/${dn}/status`, { status, reason }),

  // Staff
  getStaff:     (params = {}) => api('GET',   `/${SLUG}/api/admin/staff?` + new URLSearchParams(params)),
  addStaff:     (body)        => api('POST',  `/${SLUG}/api/admin/staff`, body),
  setStaffStatus:(id, status) => api('PATCH', `/${SLUG}/api/admin/staff/${id}/status`, { status }),
  deleteStaff:  (id)          => api('DELETE',`/${SLUG}/api/admin/staff/${id}`),

  // Vehicles
  getVehicles:  ()            => api('GET',   `/${SLUG}/api/admin/vehicles`),
  addVehicle:   (body)        => api('POST',  `/${SLUG}/api/admin/vehicles`, body),
  setVehicleStatus:(plate, status) => api('PATCH', `/${SLUG}/api/admin/vehicles/${encodeURIComponent(plate)}/status`, { status }),
  deleteVehicle:(plate)       => api('DELETE',`/${SLUG}/api/admin/vehicles/${encodeURIComponent(plate)}`),

  // Clients
  getClients:   ()            => api('GET',   `/${SLUG}/api/admin/clients`),
  addClient:    (body)        => api('POST',  `/${SLUG}/api/admin/clients`, body),
  deleteClient: (id)          => api('DELETE',`/${SLUG}/api/admin/clients/${id}`),

  // Routes
  getRoutes:    ()            => api('GET',   `/${SLUG}/api/admin/routes`),
  addRoute:     (body)        => api('POST',  `/${SLUG}/api/admin/routes`, body),
  deleteRoute:  (id)          => api('DELETE',`/${SLUG}/api/admin/routes/${id}`),

  // Payments
  getPayments:  (params = {}) => api('GET',   `/${SLUG}/api/admin/payments?` + new URLSearchParams(params)),
  addPayment:   (body)        => api('POST',  `/${SLUG}/api/admin/payments`, body),
  confirmPayment:(id)         => api('PATCH', `/${SLUG}/api/admin/payments/${id}/confirm`),
  setPayStatus: (id, status)  => api('PATCH', `/${SLUG}/api/admin/payments/${id}/status`, { status }),

  // Proof of delivery
  getPODs:      ()            => api('GET',  `/${SLUG}/api/admin/pod`),
  addPOD:       (body)        => api('POST', `/${SLUG}/api/admin/pod`, body),

  // Registered users
  getUsers:     ()            => api('GET',  `/${SLUG}/api/admin/users`),
  setUserStatus:(id, status)  => api('PATCH',`/${SLUG}/api/admin/users/${id}/status`, { status }),

  // Settings
  saveSettings: (body)        => api('PATCH', `/${SLUG}/api/admin/settings`, body),
};

// ─── User/App API ─────────────────────────────────────────────────────────────
const UserAPI = {
  register: (body)              => api('POST', `/${SLUG}/api/register`, body),
  login:    (email, password)   => api('POST', `/${SLUG}/api/login`, { email, password }),
  me:       ()                  => api('GET',  `/${SLUG}/api/me`),
  logout:   ()                  => api('POST', `/${SLUG}/api/logout`),
};

// ─── Utility: show toast notification ────────────────────────────────────────
function showToast(message, type = 'success') {
  var existing = document.getElementById('__toast__');
  if (existing) existing.remove();

  var toast = document.createElement('div');
  toast.id = '__toast__';
  var bg = type === 'success' ? '#0f2235' : '#dc2626';
  var ico = type === 'success' ? 'check_circle' : 'error';

  toast.style.cssText = `
    position:fixed;bottom:24px;right:24px;z-index:9999;
    background:${bg};color:#fff;
    padding:12px 18px;border-radius:10px;
    font-family:'DM Sans',sans-serif;font-size:13px;font-weight:600;
    display:flex;align-items:center;gap:8px;
    box-shadow:0 4px 16px rgba(0,0,0,.18);
    animation:toastIn .25s ease;
  `;
  toast.innerHTML = `<span class="material-symbols-outlined" style="font-size:17px;">${ico}</span>${message}`;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'toastOut .25s ease forwards';
    setTimeout(() => toast.remove(), 250);
  }, 3000);
}

// inject toast keyframes once
if (!document.getElementById('__toast_styles__')) {
  var s = document.createElement('style');
  s.id = '__toast_styles__';
  s.textContent = `
    @keyframes toastIn  { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
    @keyframes toastOut { from{opacity:1;transform:translateY(0)} to{opacity:0;transform:translateY(12px)} }
  `;
  document.head.appendChild(s);
}