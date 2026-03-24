// Use relative /api in dev (proxied to backend); set VITE_API_URL for production
const API_BASE = import.meta.env.VITE_API_URL || '/api'

function getToken() {
  return localStorage.getItem('token')
}

function mapNetworkError(err) {
  const msg = err?.message || ''
  if (msg === 'Failed to fetch' || msg.includes('NetworkError') || err?.name === 'TypeError') {
    return new Error(
      'Cannot reach the server. Start the backend on port 5001 (e.g. from the project root: npm run dev, or cd backend && npm run dev) while the Vite app is running.'
    )
  }
  return err
}

export async function apiFetch(path, options = {}) {
  const url = `${API_BASE}${path}`
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  }
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`

  let res
  try {
    res = await fetch(url, { ...options, headers })
  } catch (err) {
    throw mapNetworkError(err)
  }
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || res.statusText)
  return data
}

/** POST multipart (e.g. payment proof). Do not set Content-Type — browser sets boundary. */
export async function apiPostForm(path, formData) {
  const url = `${API_BASE}${path}`
  const headers = {}
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`

  let res
  try {
    res = await fetch(url, { method: 'POST', headers, body: formData })
  } catch (err) {
    throw mapNetworkError(err)
  }
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || res.statusText)
  return data
}

export const paymentApi = {
  listMine: () => apiFetch('/payments/my'),
  listAdmin: () => apiFetch('/payments/admin'),
  create: (formData) => apiPostForm('/payments', formData),
}

export const latepassApi = {
  listMine: () => apiFetch('/latepass/my'),
  listAdmin: () => apiFetch('/latepass/admin'),
  create: (formData) => apiPostForm('/latepass', formData),
}

export const authApi = {
  studentSignup: (name, email, password) =>
    apiFetch('/auth/student-signup', { method: 'POST', body: JSON.stringify({ name, email, password }) }),
  studentLogin: (email, password) =>
    apiFetch('/auth/student-login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  adminLogin: (email, password) =>
    apiFetch('/auth/admin-login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  wardenLogin: (email, password) =>
    apiFetch('/auth/warden-login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  wardenSignup: (payload) =>
    apiFetch('/auth/warden-signup', { method: 'POST', body: JSON.stringify(payload) }),
}

export const hostelApi = {
  listHostels: () => apiFetch('/hostels'),
  createHostel: (payload) =>
    apiFetch('/hostels', { method: 'POST', body: JSON.stringify(payload) }),
  updateHostel: (id, payload) =>
    apiFetch(`/hostels/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  deleteHostel: (id) =>
    apiFetch(`/hostels/${id}`, { method: 'DELETE' }),
}

export const maintenanceApi = {
  create: (payload) =>
    apiFetch('/maintenance', { method: 'POST', body: JSON.stringify(payload) }),
  myList: () => apiFetch('/maintenance/my'),
  listAll: () => apiFetch('/maintenance'),
  updateStatus: (id, status) =>
    apiFetch(`/maintenance/${id}`, { method: 'PUT', body: JSON.stringify({ status }) }),
}

export const inquiryApi = {
  create: (payload) => apiFetch('/inquiry', { method: 'POST', body: JSON.stringify(payload) }),
  myList: () => apiFetch('/inquiry/my'),
  listAll: () => apiFetch('/inquiry'),
  reply: (id, replyText) =>
    apiFetch(`/inquiry/${id}/reply`, { method: 'PUT', body: JSON.stringify({ reply: replyText }) }),
}
