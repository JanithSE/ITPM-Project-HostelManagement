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

function isLikelyProxyConnectionRefused(text = '') {
  const body = String(text || '').toLowerCase()
  return (
    body.includes('econnrefused') ||
    body.includes('http proxy error') ||
    body.includes('cannot connect') ||
    body.includes('connect econnrefused')
  )
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
  const text = await res.text()
  let data = {}
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      /* non-JSON body (e.g. proxy HTML error) */
    }
  }
  if (!res.ok) {
    const fromBody =
      typeof data.error === 'string' && data.error.trim()
        ? data.error.trim()
        : typeof data.message === 'string' && data.message.trim()
          ? data.message.trim()
          : ''
    if (fromBody) throw new Error(fromBody)
    if (res.status === 500 && isLikelyProxyConnectionRefused(text)) {
      throw new Error(
        'Cannot reach the backend server on port 5001. Start backend with: cd backend && npm run dev'
      )
    }
    if (res.status === 500) {
      throw new Error(
        'Server error. Check that MongoDB is connected and see the backend terminal for details.'
      )
    }
    const hint =
      (text && !text.startsWith('{') ? text.slice(0, 160).trim() : '') ||
      res.statusText ||
      `Request failed (${res.status})`
    throw new Error(hint)
  }
  return data
}

function parseFormResponse(res, text) {
  let data = {}
  try {
    data = text ? JSON.parse(text) : {}
  } catch {
    data = {}
  }
  if (!res.ok) {
    const apiErr = typeof data.error === 'string' && data.error.trim() ? data.error.trim() : null
    if (apiErr) throw new Error(apiErr)
    if (res.status === 500 && isLikelyProxyConnectionRefused(text)) {
      throw new Error(
        'Cannot reach the backend server on port 5001. Start backend with: cd backend && npm run dev'
      )
    }
    if (res.status === 500) {
      throw new Error(
        'Server error. Check that MongoDB is connected and see the backend terminal for details.'
      )
    }
    throw new Error(res.statusText || 'Request failed')
  }
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
  const text = await res.text()
  return parseFormResponse(res, text)
}

/** Multipart with configurable method (e.g. PATCH for hostel update with image). */
export async function apiFormWithMethod(path, formData, method = 'POST') {
  const url = `${API_BASE}${path}`
  const headers = {}
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`

  let res
  try {
    res = await fetch(url, { method, headers, body: formData })
  } catch (err) {
    throw mapNetworkError(err)
  }
  const text = await res.text()
  return parseFormResponse(res, text)
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
  /** FormData: name, location, description, totalRooms, availableRooms, pricePerBed, amenities (JSON array string), optional image */
  createHostel: (formData) => apiPostForm('/hostels', formData),
  updateHostel: (id, formData) => apiFormWithMethod(`/hostels/${id}`, formData, 'PATCH'),
  deleteHostel: (id) =>
    apiFetch(`/hostels/${id}`, { method: 'DELETE' }),
}

export const maintenanceApi = {
  create: (payload) =>
    apiFetch('/maintenance', { method: 'POST', body: JSON.stringify(payload) }),
  myList: () => apiFetch('/maintenance/my'),
  updateMine: (id, payload) =>
    apiFetch(`/maintenance/${id}/my`, { method: 'PUT', body: JSON.stringify(payload) }),
  removeMine: (id) =>
    apiFetch(`/maintenance/${id}/my`, { method: 'DELETE' }),
  listAll: () => apiFetch('/maintenance'),
  updateStatus: (id, status) =>
    apiFetch(`/maintenance/${id}`, { method: 'PUT', body: JSON.stringify({ status }) }),
}

export const inquiryApi = {
  create: (payload) => apiFetch('/inquiry', { method: 'POST', body: JSON.stringify(payload) }),
  myList: () => apiFetch('/inquiry/my'),
  updateMine: (id, payload) =>
    apiFetch(`/inquiry/${id}/my`, { method: 'PUT', body: JSON.stringify(payload) }),
  removeMine: (id) =>
    apiFetch(`/inquiry/${id}/my`, { method: 'DELETE' }),
  listAll: () => apiFetch('/inquiry'),
  reply: (id, replyText) =>
    apiFetch(`/inquiry/${id}/reply`, { method: 'PUT', body: JSON.stringify({ reply: replyText }) }),
  comment: (id, text) =>
    apiFetch(`/inquiry/${id}/comments`, { method: 'POST', body: JSON.stringify({ text }) }),
}
