import { Link, NavLink, useNavigate } from 'react-router-dom'

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
    <aside className="flex min-h-screen w-72 shrink-0 flex-col border-r border-slate-200/60 bg-white dark:border-slate-800 dark:bg-slate-950">
      <div className="p-8">
        <Link to="/admin" className="site-logo">
          <span className="site-logo-mark">UH</span>
          <span className="text-xl font-black tracking-tighter">ADMIN</span>
        </Link>
      </div>
      
      <nav className="flex-1 px-4 space-y-1">
        {navLinks.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/admin'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                isActive ? 'nav-item-active' : 'nav-item-inactive'
              }`
            }
          >
            <span className="text-lg opacity-80">{icon}</span>
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="p-6 border-t border-slate-100 dark:border-slate-800">
        <button type="button" onClick={handleLogout} className="flex items-center justify-center w-full gap-2 px-4 py-3 text-sm font-bold text-slate-600 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors dark:bg-slate-900 dark:text-slate-400">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
          Sign Out
        </button>
      </div>
    </aside>
  )
}
