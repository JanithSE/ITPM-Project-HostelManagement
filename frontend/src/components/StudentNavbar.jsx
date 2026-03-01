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
    <header className="student-header">
      <nav className="student-nav-inner">
        <div className="student-nav-bar">
          <Link to="/student" className="site-logo">
            UniHostel
          </Link>
          <div className="student-nav-links">
            {navLinks.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `student-nav-link ${isActive ? 'student-nav-link-active' : 'student-nav-link-inactive'}`
                }
              >
                {label}
              </NavLink>
            ))}
            <button type="button" onClick={handleLogout} className="btn-logout">
              Logout
            </button>
          </div>
        </div>
      </nav>
    </header>
  )
}
