import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { userApi } from '../../shared/api/client'

const permissionGroups = [
  { title: 'Hostel Operations', items: ['Hostel Access', 'Room Management'] },
  { title: 'Bookings', items: ['Booking Review', 'Booking Updates'] },
  { title: 'Finance', items: ['Payment Access', 'Invoice Review'] },
  { title: 'Support', items: ['Inquiry Handling', 'Maintenance Updates'] },
]

export default function CreateUser() {
  const navigate = useNavigate()
  const [saving, setSaving] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [form, setForm] = useState({
    name: '',
    email: '',
    phoneNumber: '',
    role: 'student',
    status: 'active',
    password: '',
  })
  const [selectedPermissions, setSelectedPermissions] = useState({})

  const selectedCount = useMemo(
    () => Object.values(selectedPermissions).filter(Boolean).length,
    [selectedPermissions],
  )

  function togglePermission(key) {
    setSelectedPermissions((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim() || !form.email.trim() || !form.password.trim()) {
      toast.error('Name, email and password are required')
      return
    }
    if (form.password.trim().length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }
    try {
      setSaving(true)
      await userApi.create({
        name: form.name.trim(),
        email: form.email.trim(),
        role: form.role,
        password: form.password.trim(),
        phoneNumber: form.phoneNumber.trim(),
      })
      toast.success('User created successfully')
      navigate('/admin/users')
    } catch (err) {
      toast.error(err.message || 'Failed to create user')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="content-card space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-gradient-to-r from-white to-blue-50/60 p-5 dark:border-slate-700 dark:from-slate-900 dark:to-slate-900/80">
        <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
          <Link to="/admin/users" className="hover:underline">Back to Users</Link>
        </p>
        <div className="mt-2 flex items-start justify-between gap-4">
          <div>
            <h1 className="page-title mb-1">Create New User</h1>
            <p className="text-sm text-slate-600 dark:text-slate-300">Add a new user with role and permission access.</p>
          </div>
          <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
            User Management
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 xl:grid-cols-12">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900 xl:col-span-6">
            <h2 className="mb-4 text-xl font-bold text-slate-900 dark:text-slate-100">Basic Information</h2>
            <div className="space-y-3">
              <div>
                <label className="auth-label">Full Name *</label>
                <input
                  className="auth-input"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Enter full name"
                  required
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="auth-label">Email Address *</label>
                  <input
                    type="email"
                    className="auth-input"
                    value={form.email}
                    onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                    placeholder="user@email.com"
                    required
                  />
                </div>
                <div>
                  <label className="auth-label">Phone Number</label>
                  <input
                    className="auth-input"
                    value={form.phoneNumber}
                    onChange={(e) => setForm((p) => ({ ...p, phoneNumber: e.target.value }))}
                    placeholder="Enter phone number"
                  />
                </div>
              </div>
              <div>
                <label className="auth-label">Account Status</label>
                <select
                  className="auth-input"
                  value={form.status}
                  onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
                >
                  <option value="active">Active</option>
                </select>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900 xl:col-span-6">
            <h2 className="mb-4 text-xl font-bold text-slate-900 dark:text-slate-100">Role & Permissions</h2>
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setForm((p) => ({ ...p, role: 'student' }))}
                className={`w-full rounded-xl border px-4 py-3 text-left transition ${
                  form.role === 'student'
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                    : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900'
                }`}
              >
                <p className="font-semibold text-slate-900 dark:text-slate-100">User</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Basic user access with limited permissions</p>
              </button>
              <button
                type="button"
                onClick={() => setForm((p) => ({ ...p, role: 'admin' }))}
                className={`w-full rounded-xl border px-4 py-3 text-left transition ${
                  form.role === 'admin'
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                    : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900'
                }`}
              >
                <p className="font-semibold text-slate-900 dark:text-slate-100">Admin</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Administrative access with extended permissions</p>
              </button>
              <div className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/40">
                <p className="font-semibold text-slate-500 dark:text-slate-300">Super Admin</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Not assignable from this panel</p>
              </div>

              <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Access Levels</p>
                  <span className="text-xs text-slate-500 dark:text-slate-400">{selectedCount} selected</span>
                </div>
                <div className="max-h-56 space-y-3 overflow-y-auto pr-1">
                  {permissionGroups.map((group) => (
                    <div key={group.title}>
                      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{group.title}</p>
                      {group.items.map((item) => {
                        const key = `${group.title}-${item}`
                        const checked = Boolean(selectedPermissions[key])
                        return (
                          <label key={key} className="mb-1 flex cursor-pointer items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/40">
                            <input type="checkbox" checked={checked} onChange={() => togglePermission(key)} className="mt-0.5" />
                            <span className="text-sm text-slate-700 dark:text-slate-300">{item}</span>
                          </label>
                        )
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <h2 className="mb-3 text-xl font-bold text-slate-900 dark:text-slate-100">Password Settings</h2>
          <div className="max-w-xl">
            <label className="auth-label">Password *</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                className="auth-input pr-14"
                value={form.password}
                onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                placeholder="At least 6 characters"
                minLength={6}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute inset-y-0 right-3 text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Password must be at least 6 characters long.</p>
          </div>
        </section>

        <section className="sticky bottom-0 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-lg backdrop-blur dark:border-slate-700 dark:bg-slate-900/95">
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => navigate('/admin/users')} className="btn-table-secondary px-8">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-table-primary px-8">
              {saving ? 'Creating...' : 'Create User'}
            </button>
          </div>
        </section>
      </form>
    </div>
  )
}
