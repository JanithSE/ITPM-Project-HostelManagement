import { Link } from 'react-router-dom'

export default function AdminDashboard() {
  const stats = [
    { label: 'Total Residents', val: '432', change: '+12%', icon: '👥', color: 'bg-indigo-50 text-indigo-600' },
    { label: 'Active Bookings', val: '389', change: '85% occupancy', icon: '📅', color: 'bg-emerald-50 text-emerald-600' },
    { label: 'Pending Passes', val: '14', change: 'Requires action', icon: '🕒', color: 'bg-amber-50 text-amber-600' },
    { label: 'Monthly Revenue', val: 'Rs. 4.2M', change: '+5.4%', icon: '💰', color: 'bg-purple-50 text-purple-600' },
  ]

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <section>
        <div className="text-indigo-600 font-bold text-sm tracking-widest uppercase mb-2">Management Console</div>
        <h1 className="text-4xl font-extrabold tracking-tighter text-slate-900 dark:text-white">Admin Overview</h1>
        <p className="mt-2 text-slate-500 max-w-md">Real-time insights across all hostel operations and student activities.</p>
      </section>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((s, i) => (
          <div key={i} className="stat-widget group hover:scale-[1.02] transition-transform cursor-pointer shadow-sm">
             <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-5 ${s.color} dark:bg-slate-800 shadow-sm font-bold text-xl`}>
               {s.icon}
             </div>
             <div className="stat-label">{s.label}</div>
             <div className="flex items-end gap-3">
                <div className="stat-value text-3xl">{s.val}</div>
                <div className="text-[10px] font-black uppercase text-emerald-600 mb-1.5">{s.change}</div>
             </div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-12 gap-8">
         {/* Main Activity Area */}
         <div className="lg:col-span-8 space-y-8">
            <div className="premium-card">
               <div className="premium-card-inner">
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <h3 className="text-xl font-bold">Occupancy Distribution</h3>
                      <p className="text-xs text-slate-500">Live room data across all managed premises</p>
                    </div>
                    <Link to="/admin/hostels" className="btn-secondary-outline !text-[10px] !px-3 !py-1.5 font-black uppercase tracking-widest">Manage Hostels</Link>
                  </div>
                  
                  <div className="space-y-6">
                    {[
                      { name: 'Emerald Grove', cap: 180, res: 172, color: 'bg-emerald-500' },
                      { name: 'Urban Nest', cap: 150, res: 142, color: 'bg-indigo-500' },
                      { name: 'Skyline Elite', cap: 120, res: 75, color: 'bg-blue-500' },
                    ].map((h, i) => (
                      <div key={i} className="space-y-2">
                         <div className="flex justify-between text-sm font-bold">
                            <span>{h.name}</span>
                            <span className="text-slate-500">{h.res} / {h.cap} <span className="text-[10px] opacity-60">Beds filled</span></span>
                         </div>
                         <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div className={`h-full ${h.color} transition-all duration-1000`} style={{ width: `${(h.res/h.cap)*100}%` }} />
                         </div>
                      </div>
                    ))}
                  </div>
               </div>
            </div>

            <div className="premium-card">
               <div className="premium-card-inner">
                  <h3 className="text-xl font-bold mb-6">Recent System logs</h3>
                  <div className="space-y-4">
                     {[
                       { t: 'New student registration', d: 'Anushka Perera just joined Skyline Elite', m: '2 mins ago' },
                       { t: 'Payment verification', d: 'Invoice #8821 confirmed by Finance', m: '15 mins ago' },
                       { t: 'Maintenance alert', d: 'Block B Room 102 reported faucet leak', m: '1 hr ago' },
                     ].map((l, i) => (
                        <div key={i} className="flex items-center justify-between py-3 border-b last:border-0 border-slate-50 dark:border-slate-800">
                           <div>
                              <div className="text-sm font-bold">{l.t}</div>
                              <div className="text-xs text-slate-500">{l.d}</div>
                           </div>
                           <div className="text-[10px] font-bold text-slate-400 uppercase">{l.m}</div>
                        </div>
                     ))}
                  </div>
               </div>
            </div>
         </div>

         {/* Sidebar Actions */}
         <div className="lg:col-span-4 space-y-8">
            <div className="premium-card bg-slate-900 border-none">
               <div className="premium-card-inner !p-8">
                  <h4 className="text-white font-bold text-lg mb-4">Quick Actions</h4>
                  <div className="grid gap-3">
                     {[
                       { t: 'Register User', p: '/admin/users', i: '👤' },
                       { t: 'Financial Report', p: '/admin/payments', i: '📈' },
                       { t: 'Inventory Check', p: '/admin/inventory', i: '📦' },
                       { t: 'Broadcast Notice', p: '/admin', i: '📢' },
                     ].map((a, i) => (
                        <Link key={i} to={a.p} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-all border border-white/5">
                           <span className="opacity-80">{a.i}</span>
                           <span className="text-xs font-bold uppercase tracking-wider">{a.t}</span>
                        </Link>
                     ))}
                  </div>
               </div>
            </div>

            <div className="premium-card">
               <div className="premium-card-inner">
                  <h4 className="font-bold text-lg mb-6">Support Inquiries</h4>
                  <div className="flex flex-col gap-5 py-6 items-center justify-center text-center opacity-30 grayscale cursor-not-allowed">
                     <span className="text-4xl">💬</span>
                     <p className="text-xs font-bold uppercase tracking-tighter">No active chat pending</p>
                  </div>
                  <button className="w-full btn-secondary-outline !text-[10px] py-3 mt-4">Open Support Center</button>
               </div>
            </div>
         </div>
      </div>
    </div>
  )
}
