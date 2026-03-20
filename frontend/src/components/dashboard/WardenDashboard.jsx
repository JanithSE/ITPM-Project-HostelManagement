import { useMemo } from 'react'

export default function WardenDashboard() {
  const warden = useMemo(() => {
    try {
      const raw = localStorage.getItem('wardenUser')
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  }, [])

  return (
    <div className="content-card">
      <h1 className="page-title">Warden Dashboard</h1>
      <p className="page-description">
        Welcome{warden?.name ? `, ${warden.name}` : ''}. Use this area to manage your assigned hostel operations.
      </p>
      {warden && (
        <dl className="mt-4 grid gap-2 text-sm text-gray-600 sm:grid-cols-2">
          <div>
            <dt className="font-medium text-gray-700">Email</dt>
            <dd>{warden.email}</dd>
          </div>
          <div>
            <dt className="font-medium text-gray-700">Assigned hostel</dt>
            <dd>{warden.assignedHostel || '—'}</dd>
          </div>
          {warden.phoneNumber && (
            <div>
              <dt className="font-medium text-gray-700">Phone</dt>
              <dd>{warden.phoneNumber}</dd>
            </div>
          )}
        </dl>
      )}
    </div>
  )
}
