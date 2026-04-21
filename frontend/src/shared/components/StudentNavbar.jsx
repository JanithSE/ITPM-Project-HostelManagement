import { Link, NavLink, useNavigate } from 'react-router-dom'
import LatePassNotificationBell from '../../components/latepass/LatePassNotificationBell'
import PaymentNotificationBell from '../../components/payments/PaymentNotificationBell'

export default function StudentNavbar() {
  const navigate = useNavigate()

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('role')
    localStorage.removeItem('studentName')
    navigate('/login')
  }

  const navLinks = [
    { to: '/student', label: 'Dashboard' },
    { to: '/student/hostels', label: 'Explore' },
    { to: '/student/booking', label: 'Book Room' },
    { to: '/student/payments', label: 'Payments' },
    { to: '/student/maintenance', label: 'Maintenance' },
    { to: '/student/inquiries', label: 'Inquiries' },
    { to: '/student/latepass', label: 'Late Pass' },
  ]

  return (
    <header className="site-header border-b border-slate-100 dark:border-slate-800">
      <nav className="container-main">
        <div className="flex justify-between items-center h-20">
          <Link to="/student" className="site-logo">
            <span className="site-logo-mark">UH</span>
            UniHostel
          </Link>

          <div className="hidden md:flex items-center gap-1 bg-slate-100/50 p-1 rounded-2xl dark:bg-slate-900/50">
            {navLinks.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/student'}
                className={({ isActive }) =>
                  `px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${isActive ? 'nav-item-active' : 'nav-item-inactive'
                  }`
                }
              >
                {label}
              </NavLink>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <PaymentNotificationBell />
            <LatePassNotificationBell />
            <button type="button" onClick={handleLogout} className="btn-secondary-outline !px-4 !py-2 !text-xs">
              Log Out
            </button>
          </div>
        </div>
      </nav>
    </header>
  )
}
