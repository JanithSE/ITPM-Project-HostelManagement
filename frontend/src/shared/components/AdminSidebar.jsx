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
          UniHostel Admin
        </Link>
      </div>

      <nav className="admin-sidebar-nav">
        {navLinks.map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `admin-sidebar-link ${
                isActive
                  ? 'admin-sidebar-link-active'
                  : 'admin-sidebar-link-inactive'
              }`
            }
          >
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="admin-sidebar-footer flex flex-col gap-2">
        <button
          type="button"
          onClick={handleLogout}
          className="btn-logout w-full"
        >
          Logout
        </button>
      </div>
    </aside>
  )
}