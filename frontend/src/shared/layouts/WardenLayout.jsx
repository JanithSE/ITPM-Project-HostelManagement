import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom'
import ThemeToggle from '../components/ThemeToggle'

export default function WardenLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const onDashboard = location.pathname === '/warden' || location.pathname === '/warden/'

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('role')
    localStorage.removeItem('wardenUser')
    navigate('/warden/login', { replace: true })
  }

  return (
    <div className="dashboard-wrap">
      <header className="student-header">
        <div className="student-nav-inner">
          <div className="student-nav-bar">
            <Link to="/warden" className="text-lg font-bold text-primary-600 dark:text-primary-400">
              UniHostel · Warden
            </Link>
            <div className="student-nav-links">
              <Link
                to="/warden"
                className={`student-nav-link ${onDashboard ? 'student-nav-link-active' : 'student-nav-link-inactive'}`}
              >
                Dashboard
              </Link>
              <ThemeToggle />
              <button type="button" onClick={handleLogout} className="btn-logout">
                Log out
              </button>
            </div>
          </div>
        </div>
      </header>
      <main className="content-main">
        <Outlet />
      </main>
    </div>
  )
}
