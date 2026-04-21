import { Outlet } from 'react-router-dom'
import AdminSidebar from '../components/AdminSidebar'
import LatePassNotificationBell from '../../components/latepass/LatePassNotificationBell'
import PaymentNotificationBell from '../../components/payments/PaymentNotificationBell'

export default function AdminLayout() {
  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      <AdminSidebar />
      <main className="min-w-0 flex-1 overflow-x-hidden p-6 lg:p-8">
        <div className="mb-4 flex justify-end gap-2">
          <PaymentNotificationBell />
          <LatePassNotificationBell />
        </div>
        <Outlet />
      </main>
    </div>
  )
}
