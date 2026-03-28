import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import axiosClient, { getAxiosErrorMessage } from '../../shared/api/axiosClient'

function userId(u) {
  return String(u?._id ?? u?.id ?? '')
}

function formatRole(role) {
  const r = String(role || '').toLowerCase()
  if (!r) return '—'
  return r.charAt(0).toUpperCase() + r.slice(1)
}

function exportUsersCsv(users) {
  const headers = ['Name', 'Email', 'Role', 'University ID', 'Phone']
  const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const lines = [
    headers.join(','),
    ...users.map((u) =>
      [u.name, u.email, u.role, u.universityId || '', u.phoneNumber || ''].map(escape).join(',')
    ),
  ]
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `users-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export default function Users() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setError('')
    setLoading(true)
    try {
      const { data } = await axiosClient.get('/users')
      setUsers(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(getAxiosErrorMessage(err))
      setUsers([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  function handleExport() {
    if (users.length === 0) {
      toast.error('No users to export.')
      return
    }
    exportUsersCsv(users)
    toast.success('Download started.')
  }

  function handleAddUser() {
    toast('New accounts are usually created via Sign up. Admin user creation can be added here later.', {
      icon: 'ℹ️',
    })
  }

  return (
    <div className="content-card">
      <h1 className="page-title mb-4">Users</h1>

      {error && (
        <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
          <button
            type="button"
            onClick={() => load()}
            className="ml-3 underline hover:no-underline"
          >
            Retry
          </button>
        </div>
      )}

      <div className="table-wrap">
        <table className="table-admin">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="text-center text-slate-400">
                  Loading…
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center text-slate-400">
                  No users found.
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={userId(u) || u.email}>
                  <td>{u.name || '—'}</td>
                  <td>{u.email || '—'}</td>
                  <td>{formatRole(u.role)}</td>
                  <td>
                    <button
                      type="button"
                      className="table-action-link"
                      title="Edit user"
                      onClick={() =>
                        toast('User editing is not wired yet. Use the API PATCH /api/users/:id if needed.')
                      }
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="actions-row">
        <button type="button" className="btn-table-primary" onClick={handleAddUser}>
          Add User
        </button>
        <button type="button" className="btn-table-secondary" onClick={handleExport}>
          Export
        </button>
      </div>
    </div>
  )
}
