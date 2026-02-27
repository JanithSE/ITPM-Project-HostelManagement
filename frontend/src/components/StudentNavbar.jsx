import { Link, NavLink, useNavigate } from 'react-router-dom'

export default function StudentNavbar() {
  const navigate = useNavigate()

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('role')
    navigate('/login')
  }

  const navLinks = [
    { to: '/student/hostels', label: 'Our Hostels' },
    { to: '/student/payments', label: 'Payments' },
    { to: '/student/inquiries', label: 'Inquiries' },
    { to: '/student/latepass', label: 'Latepass' },
    { to: '/student/complains', label: 'Complains' },
  ]

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-14 items-center">
          <Link to="/student" className="text-primary-600 font-semibold text-lg">
            UniHostel
          </Link>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {navLinks.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive ? 'text-primary-600 bg-primary-50' : 'text-gray-600 hover:text-primary-600'}`
                }
              >
                {label}
              </NavLink>
            ))}
            <button
              onClick={handleLogout}
              className="bg-primary-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary-700 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>
    </header>
  )
}
