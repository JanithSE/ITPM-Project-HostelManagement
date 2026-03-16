// Use relative /api in dev (proxied to backend); set VITE_API_URL for production
const API_BASE = import.meta.env.VITE_API_URL || '/api'

function getToken() {
  return localStorage.getItem('token')
}

export async function apiFetch(path, options = {}) {
  const url = `${API_BASE}${path}`
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  }
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(url, { ...options, headers })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || res.statusText)
  return data
}

export const authApi = {
  studentSignup: (name, email, password) =>
    apiFetch('/auth/student-signup', { method: 'POST', body: JSON.stringify({ name, email, password }) }),
  studentLogin: (email, password) =>
    apiFetch('/auth/student-login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  adminLogin: (email, password) =>
    apiFetch('/auth/admin-login', { method: 'POST', body: JSON.stringify({ email, password }) }),
}
