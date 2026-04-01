import { Outlet, Link, useNavigate } from 'react-router-dom'

export default function WardenLayout() {
  const navigate = useNavigate()

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('role')
    localStorage.removeItem('wardenUser')
    navigate('/warden/login', { replace: true })
  }

  return (
    <div className="page-container min-h-screen bg-slate-50 dark:bg-slate-950">
      <header className="site-header border-b border-slate-100 dark:border-slate-800">
        <nav className="container-main">
          <div className="flex justify-between items-center h-20">
            <Link to="/warden" className="site-logo">
              <span className="site-logo-mark">UH</span>
              Warden
            </Link>
            
            <div className="flex items-center gap-6">
               <Link to="/warden" className="text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-indigo-600 transition-colors">
                  Dashboard
               </Link>
               <button type="button" onClick={handleLogout} className="btn-secondary-outline !px-4 !py-2 !text-xs">
                  Log Out
               </button>
            </div>
          </div>
        </nav>
      </header>
      
      <main className="container-main py-10">
        <Outlet />
      </main>
    </div>
  )
}
