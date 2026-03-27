import { useEffect, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import ThemeToggle from './ThemeToggle'

export default function AdminSidebar() {
  const navigate = useNavigate()
  const [adminName, setAdminName] = useState('Admin')

  useEffect(() => {
    try {
      const raw = localStorage.getItem('adminUser')
      const parsed = raw ? JSON.parse(raw) : null
      const name = String(parsed?.username || '').trim()
      if (name) setAdminName(name)
    } catch {}
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('role')
    localStorage.removeItem('adminUser')
    navigate('/admin/login')
  }

  const navLinks = [
    { to: '/admin/overview', label: 'Overview' },
    { to: '/admin/users', label: 'Users' },
    { to: '/admin/booking', label: 'Booking' },
    { to: '/admin/payments', label: 'Payments' },
    { to: '/admin/latepass', label: 'Late pass' },
    { to: '/admin/hostels', label: 'Hostels' },
    { to: '/admin/inventory', label: 'Inventory' },
    { to: '/admin/inquiries', label: 'Inquiries' },
    { to: '/admin/maintenance', label: 'Maintenance' },
  ]

  return (
    <aside className="admin-sidebar">
      <div className="admin-sidebar-header">
        <div className="mb-3 flex justify-end">
          <ThemeToggle />
        </div>
        <Link to="/admin" className="site-logo">
          <span>UniHostel Admin</span>
        </Link>
        <div style={{ marginTop: 6, padding: '0 4px', fontSize: 12, color: 'rgba(148,163,184,1)', fontWeight: 600 }}>
          Welcome, {adminName}
        </div>
      </div>
      <nav className="admin-sidebar-nav">
        {navLinks.map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `admin-sidebar-link ${isActive ? 'admin-sidebar-link-active' : 'admin-sidebar-link-inactive'}`
            }
          >
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="admin-sidebar-footer">
        <button type="button" onClick={handleLogout} className="btn-logout w-full">
          Logout
        </button>
      </div>
    </aside>
  )
}
