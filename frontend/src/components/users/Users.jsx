import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { userApi } from '../../shared/api/client'

function formatDate(d) {
  if (!d) return '—'
  const x = new Date(d)
  return Number.isNaN(x.getTime()) ? '—' : x.toLocaleDateString()
}

const emptyForm = {
  name: '',
  email: '',
  role: 'student',
  phoneNumber: '',
  password: '',
}

export default function Users() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortBy, setSortBy] = useState('newest')
  const [page, setPage] = useState(1)
  const pageSize = 8
  const [modalOpen, setModalOpen] = useState(false)
  const [viewUser, setViewUser] = useState(null)
  const [editingId, setEditingId] = useState('')
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [busyDeleteId, setBusyDeleteId] = useState('')

  async function loadUsers() {
    try {
      setLoading(true)
      const data = await userApi.list()
      setUsers(Array.isArray(data) ? data : [])
    } catch (e) {
      toast.error(e.message || 'Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUsers()
  }, [])

  const stats = useMemo(() => {
    const total = users.length
    const admins = users.filter((u) => u.role === 'admin').length
    const wardens = users.filter((u) => u.role === 'warden').length
    const students = users.filter((u) => u.role === 'student').length
    return { total, admins, wardens, students }
  }, [users])

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase()
    const base = users.filter((u) => {
      if (roleFilter !== 'all' && u.role !== roleFilter) return false
      if (statusFilter !== 'all' && statusFilter !== 'active') return false
      if (!q) return true
      return [u.name, u.email, u.phoneNumber, u.role]
        .filter(Boolean)
        .map((v) => String(v).toLowerCase())
        .some((v) => v.includes(q))
    })

    const sorted = [...base]
    sorted.sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
      if (sortBy === 'oldest') return new Date(a.createdAt || 0) - new Date(b.createdAt || 0)
      if (sortBy === 'name-asc') return String(a.name || '').localeCompare(String(b.name || ''))
      if (sortBy === 'name-desc') return String(b.name || '').localeCompare(String(a.name || ''))
      return 0
    })
    return sorted
  }, [users, search, roleFilter, statusFilter, sortBy])

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize))
  const paginatedUsers = useMemo(() => {
    const start = (page - 1) * pageSize
    return filteredUsers.slice(start, start + pageSize)
  }, [filteredUsers, page])

  useEffect(() => {
    setPage(1)
  }, [search, roleFilter, statusFilter, sortBy])

  function openEditModal(user) {
    setEditingId(String(user._id))
    setForm({
      name: user.name || '',
      email: user.email || '',
      role: user.role || 'student',
      phoneNumber: user.phoneNumber || '',
      password: '',
    })
    setModalOpen(true)
  }

  async function handleSave(e) {
    e.preventDefault()
    if (!form.name.trim() || !form.email.trim()) {
      toast.error('Name and email are required')
      return
    }
    if (!editingId && (!form.password || form.password.length < 6)) {
      toast.error('Password must be at least 6 characters')
      return
    }
    try {
      setSaving(true)
      if (editingId) {
        const payload = {
          name: form.name.trim(),
          email: form.email.trim(),
          role: form.role,
          phoneNumber: form.phoneNumber.trim(),
        }
        if (form.password.trim()) payload.password = form.password.trim()
        await userApi.update(editingId, payload)
        toast.success('User updated')
      } else {
        await userApi.create({
          name: form.name.trim(),
          email: form.email.trim(),
          role: form.role,
          phoneNumber: form.phoneNumber.trim(),
          password: form.password.trim(),
        })
        toast.success('User added')
      }
      setModalOpen(false)
      setForm(emptyForm)
      setEditingId('')
      await loadUsers()
    } catch (e2) {
      toast.error(e2.message || 'Failed to save user')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id) {
    const ok = window.confirm('Delete this user?')
    if (!ok) return
    try {
      setBusyDeleteId(String(id))
      await userApi.delete(id)
      toast.success('User deleted')
      await loadUsers()
    } catch (e) {
      toast.error(e.message || 'Failed to delete user')
    } finally {
      setBusyDeleteId('')
    }
  }

  function exportCsv() {
    const rows = [
      ['Name', 'Email', 'Phone', 'Role', 'Status', 'Created'],
      ...filteredUsers.map((u) => [u.name || '', u.email || '', u.phoneNumber || '', u.role || '', 'active', formatDate(u.createdAt)]),
    ]
    const csv = rows.map((r) => r.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'users-export.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="content-card space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-gradient-to-r from-white to-blue-50/60 p-5 dark:border-slate-700 dark:from-slate-900 dark:to-slate-900/80">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="page-title mb-1">User Management Dashboard</h1>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Manage system users, access roles, and account operations.
            </p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={loadUsers} className="btn-table-secondary">Refresh</button>
            <button type="button" onClick={exportCsv} className="btn-table-secondary">Export</button>
            <Link to="/admin/users/create" className="btn-table-primary">+ Add New User</Link>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Total users</p>
            <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">{stats.total}</p>
          </div>
          <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-3 dark:border-blue-900/50 dark:bg-blue-950/20">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">Admins</p>
            <p className="mt-1 text-2xl font-bold text-blue-700 dark:text-blue-300">{stats.admins}</p>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 dark:border-emerald-900/50 dark:bg-emerald-950/20">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">Wardens</p>
            <p className="mt-1 text-2xl font-bold text-emerald-700 dark:text-emerald-300">{stats.wardens}</p>
          </div>
          <div className="rounded-xl border border-purple-200 bg-purple-50/70 p-3 dark:border-purple-900/50 dark:bg-purple-950/20">
            <p className="text-xs font-semibold uppercase tracking-wide text-purple-700 dark:text-purple-300">Students</p>
            <p className="mt-1 text-2xl font-bold text-purple-700 dark:text-purple-300">{stats.students}</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
        <div className="grid gap-3 md:grid-cols-4">
          <input
            type="search"
            placeholder="Search users by name, email, phone..."
            className="auth-input md:col-span-1"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select className="auth-input" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
            <option value="all">All Roles</option>
            <option value="admin">Admin</option>
            <option value="warden">Warden</option>
            <option value="student">Student</option>
          </select>
          <select className="auth-input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">All Status</option>
            <option value="active">Active</option>
          </select>
          <select className="auth-input" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="name-asc">Name A-Z</option>
            <option value="name-desc">Name Z-A</option>
          </select>
        </div>
      </div>

      <div className="text-xs text-slate-500 dark:text-slate-400">Showing {filteredUsers.length} users</div>

      <div className="table-wrap">
        <table className="table-admin">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Role</th>
              <th>Status</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7}>Loading users…</td></tr>
            ) : filteredUsers.length === 0 ? (
              <tr><td colSpan={7}>No users found.</td></tr>
            ) : (
              paginatedUsers.map((u) => (
                <tr key={u._id}>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                        {String(u.name || 'U').charAt(0).toUpperCase()}
                      </div>
                      <span className="font-semibold text-slate-900 dark:text-slate-100">{u.name || '—'}</span>
                    </div>
                  </td>
                  <td>{u.email || '—'}</td>
                  <td>{u.phoneNumber || '—'}</td>
                  <td>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                      u.role === 'admin'
                        ? 'bg-blue-100 text-blue-700'
                        : u.role === 'warden'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-purple-100 text-purple-700'
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td>
                    <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">active</span>
                  </td>
                  <td>{formatDate(u.createdAt)}</td>
                  <td>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => setViewUser(u)} className="table-action-link">View</button>
                      <button type="button" onClick={() => openEditModal(u)} className="table-action-link">Edit</button>
                      <button
                        type="button"
                        onClick={() => handleDelete(u._id)}
                        disabled={busyDeleteId === String(u._id)}
                        className="text-sm font-semibold text-red-600 hover:underline disabled:opacity-60"
                      >
                        {busyDeleteId === String(u._id) ? 'Deleting…' : 'Delete'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {!loading && filteredUsers.length > 0 && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-slate-500 dark:text-slate-400">Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="btn-table-secondary disabled:opacity-50"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="btn-table-secondary disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {viewUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-900">
            <h2 className="mb-1 text-xl font-bold text-slate-900 dark:text-slate-100">User Details</h2>
            <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">View selected user information.</p>
            <div className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
              <p><span className="font-semibold">Name:</span> {viewUser.name || '—'}</p>
              <p><span className="font-semibold">Email:</span> {viewUser.email || '—'}</p>
              <p><span className="font-semibold">Phone:</span> {viewUser.phoneNumber || '—'}</p>
              <p><span className="font-semibold">Role:</span> {viewUser.role || '—'}</p>
              <p><span className="font-semibold">Status:</span> active</p>
              <p><span className="font-semibold">Created:</span> {formatDate(viewUser.createdAt)}</p>
            </div>
            <div className="mt-4 flex gap-2">
              <button type="button" onClick={() => { setViewUser(null); openEditModal(viewUser) }} className="btn-table-primary flex-1">
                Edit User
              </button>
              <button type="button" onClick={() => setViewUser(null)} className="btn-table-secondary flex-1">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-900">
            <h2 className="mb-1 text-xl font-bold text-slate-900 dark:text-slate-100">{editingId ? 'Edit User' : 'Add New User'}</h2>
            <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">Manage account details and role access.</p>
            <form onSubmit={handleSave} className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="auth-label">Full Name</label>
                  <input className="auth-input" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required />
                </div>
                <div>
                  <label className="auth-label">Email</label>
                  <input type="email" className="auth-input" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} required />
                </div>
                <div>
                  <label className="auth-label">Role</label>
                  <select className="auth-input" value={form.role} onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}>
                    <option value="student">Student</option>
                    <option value="warden">Warden</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div>
                  <label className="auth-label">Phone</label>
                  <input className="auth-input" value={form.phoneNumber} onChange={(e) => setForm((p) => ({ ...p, phoneNumber: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="auth-label">{editingId ? 'Reset Password (optional)' : 'Password'}</label>
                <input
                  type="password"
                  className="auth-input"
                  value={form.password}
                  onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                  placeholder={editingId ? 'Leave blank to keep current' : 'At least 6 characters'}
                  minLength={editingId ? undefined : 6}
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" disabled={saving} className="btn-table-primary flex-1">
                  {saving ? 'Saving…' : editingId ? 'Save Changes' : 'Create User'}
                </button>
                <button type="button" onClick={() => setModalOpen(false)} className="btn-table-secondary flex-1">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
