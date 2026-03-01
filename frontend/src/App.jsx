import { Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import StudentLayout from './layouts/StudentLayout'
import AdminLayout from './layouts/AdminLayout'
import Home from './pages/Home'
import StudentAuth from './pages/StudentAuth'
import AdminLogin from './pages/AdminLogin'
import StudentDashboard from './pages/student/StudentDashboard'
import Hostels from './pages/student/Hostels'
import StudentPayments from './pages/student/Payments'
import StudentInquiries from './pages/student/Inquiries'
import StudentLatepass from './pages/student/Latepass'
import Complains from './pages/student/Complains'
import AdminDashboard from './pages/admin/AdminDashboard'
import Users from './pages/admin/Users'
import Booking from './pages/admin/Booking'
import AdminPayments from './pages/admin/Payments'
import AdminLatepass from './pages/admin/Latepass'
import Inventory from './pages/admin/Inventory'
import AdminInquiries from './pages/admin/Inquiries'
import Maintenance from './pages/admin/Maintenance'

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
