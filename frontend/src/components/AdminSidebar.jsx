import { Link, NavLink, useNavigate } from 'react-router-dom'

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
    { to: '/admin/latepass', label: 'Latepass' },
    { to: '/admin/inventory', label: 'Inventory' },
    { to: '/admin/inquiries', label: 'Inquiries' },
    { to: '/admin/maintenance', label: 'Maintenance' },
  ]

  return (
    <aside className="w-64 min-h-screen bg-white border-r border-gray-200 flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <Link to="/admin" className="text-primary-600 font-semibold text-lg">
          UniHostel Admin
        </Link>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {navLinks.map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `block px-4 py-2 rounded-md text-sm font-medium transition-colors ${isActive ? 'bg-primary-100 text-primary-700' : 'text-gray-600 hover:bg-primary-50 hover:text-primary-700'}`
            }
          >
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="p-4 border-t border-gray-200">
        <button
          onClick={handleLogout}
          className="w-full bg-primary-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary-700 transition-colors"
        >
          Logout
        </button>
      </div>
    </aside>
  )
}
