import { Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from './shared/components/ProtectedRoute'
import StudentLayout from './shared/layouts/StudentLayout'
import AdminLayout from './shared/layouts/AdminLayout'
import Home from './components/auth/Home'
import StudentAuth from './components/auth/StudentAuth'
import AdminLogin from './components/auth/AdminLogin'
import StudentDashboard from './components/dashboard/StudentDashboard'
import AdminDashboard from './components/dashboard/AdminDashboard'
import Hostels from './components/hostels/Hostels'
import StudentPayments from './components/payments/StudentPayments'
import AdminPayments from './components/payments/AdminPayments'
import StudentInquiries from './components/inquiries/StudentInquiries'
import AdminInquiries from './components/inquiries/AdminInquiries'
import StudentLatepass from './components/latepass/StudentLatepass'
import AdminLatepass from './components/latepass/AdminLatepass'
import Complains from './components/complains/Complains'
import Inventory from './components/inventory/Inventory'
import Maintenance from './components/maintenance/Maintenance'
import Users from './components/users/Users'
import Booking from './components/bookings/Booking'

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<StudentAuth />} />
      <Route path="/signup" element={<StudentAuth />} />
      <Route path="/admin/login" element={<AdminLogin />} />

      {/* Student (protected) */}
      <Route
        path="/student"
        element={
          <ProtectedRoute allowedRole="student">
            <StudentLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<StudentDashboard />} />
        <Route path="hostels" element={<Hostels />} />
        <Route path="payments" element={<StudentPayments />} />
        <Route path="inquiries" element={<StudentInquiries />} />
        <Route path="latepass" element={<StudentLatepass />} />
        <Route path="complains" element={<Complains />} />
      </Route>

      {/* Admin (protected) */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRole="admin">
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="users" element={<Users />} />
        <Route path="booking" element={<Booking />} />
        <Route path="payments" element={<AdminPayments />} />
        <Route path="latepass" element={<AdminLatepass />} />
        <Route path="inventory" element={<Inventory />} />
        <Route path="inquiries" element={<AdminInquiries />} />
        <Route path="maintenance" element={<Maintenance />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
