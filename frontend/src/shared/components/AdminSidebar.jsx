import { Link, NavLink, useNavigate } from 'react-router-dom'
import ThemeToggle from '../../shared/components/ThemeToggle'

export default function AdminSidebar() {
  const navigate = useNavigate()

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('role')
    navigate('/admin/login')
  }

  const navLinks = [
    { to: '/admin', label: 'Overview', icon: '📊' },
    { to: '/admin/users', label: 'Users', icon: '👤' },
    { to: '/admin/booking', label: 'Booking', icon: '📅' },
    { to: '/admin/rooms', label: 'Rooms', icon: '🏠' },
    { to: '/admin/payments', label: 'Payments', icon: '💳' },
    { to: '/admin/latepass', label: 'Late pass', icon: '🕒' },
    { to: '/admin/hostels', label: 'Hostels', icon: '🏢' },
    { to: '/admin/inventory', label: 'Inventory', icon: '📦' },
    { to: '/admin/inquiries', label: 'Inquiries', icon: '💬' },
    { to: '/admin/maintenance', label: 'Maintenance', icon: '🛠️' },
  ]

  return (
    <aside className="admin-sidebar">
      
      {/* Header */}
      <div className="admin-sidebar-header">
        <div className="admin-sidebar-theme-wrap">
          <ThemeToggle />
        </div>

        <Link to="/admin" className="admin-sidebar-brand">
          <span className="admin-sidebar-brand-mark">UH</span>
          ADMIN
        </Link>
      </div>

      {/* Navigation */}
      <nav className="admin-sidebar-nav">
        {navLinks.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/admin'}
            className={({ isActive }) =>
              `admin-sidebar-link ${isActive ? 'admin-sidebar-link-active' : 'admin-sidebar-link-inactive'}`
            }
          >
            <span className="admin-sidebar-icon">{icon}</span>
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="admin-sidebar-footer">
        <button
          type="button"
          onClick={handleLogout}
          className="admin-sidebar-logout"
        >
          <svg
            className="admin-sidebar-logout-icon"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
            />
          </svg>
          Sign Out
        </button>
      </div>
    </aside>
  )
}