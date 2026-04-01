import { Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from './shared/components/ProtectedRoute'
import StudentLayout from './shared/layouts/StudentLayout'
import AdminLayout from './shared/layouts/AdminLayout'
import WardenLayout from './shared/layouts/WardenLayout'
import Home from './components/auth/Home'
import StudentAuth from './components/auth/StudentAuth'
import AdminLogin from './components/auth/AdminLogin'
import WardenAuth from './components/auth/WardenAuth'
import StudentDashboard from './components/dashboard/StudentDashboard'
import AdminDashboard from './components/dashboard/AdminDashboard'
import WardenDashboard from './components/dashboard/WardenDashboard'
import Hostels from './components/hostels/Hostels'
import AdminHostels from './components/hostels/AdminHostels'
import StudentPayments from './components/payments/StudentPayments'
import AddPayment from './components/payments/AddPayment'
import EditPayment from './components/payments/EditPayment'
import AdminPayments from './components/payments/AdminPayments'
import StudentInquiries from './components/inquiries/StudentInquiries'
import AdminInquiries from './components/inquiries/AdminInquiries'
import StudentLatepass from './components/latepass/StudentLatepass'
import AddLatepass from './components/latepass/AddLatepass'
import EditLatepass from './components/latepass/EditLatepass'
import AdminLatepass from './components/latepass/AdminLatepass'
import Complains from './components/complains/Complains'
import Inventory from './components/inventory/Inventory'
import AdminMaintenance from './components/maintenance/AdminMaintenance'
import StudentMaintenance from './components/maintenance/StudentMaintenance'
import Users from './components/users/Users'
import Booking from './components/bookings/Booking'
import StudentBookings from './components/bookings/StudentBookings'

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<StudentAuth />} />
      <Route path="/signup" element={<StudentAuth />} />
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/warden/login" element={<WardenAuth />} />
      <Route path="/warden/register" element={<WardenAuth />} />

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
        <Route path="payments/new" element={<AddPayment />} />
        <Route path="payments/:id/edit" element={<EditPayment />} />
        <Route path="bookings" element={<StudentBookings />} />
        <Route path="maintenance" element={<StudentMaintenance />} />
        <Route path="inquiries" element={<StudentInquiries />} />
        <Route path="latepass" element={<StudentLatepass />} />
        <Route path="latepass/new" element={<AddLatepass />} />
          <Route path="latepass/:id/edit" element={<EditLatepass />} />
        <Route path="complains" element={<Complains />} />
      </Route>

      {/* Warden (protected) */}
      <Route
        path="/warden"
        element={
          <ProtectedRoute allowedRole="warden">
            <WardenLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<WardenDashboard />} />
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
        <Route path="overview" element={<AdminDashboard />} />
        <Route path="users" element={<Users />} />
        <Route path="booking" element={<Booking />} />
        <Route path="hostels" element={<AdminHostels />} />
        <Route path="payments" element={<AdminPayments />} />
        <Route path="latepass" element={<AdminLatepass />} />
        <Route path="inventory" element={<Inventory />} />
        <Route path="inquiries" element={<AdminInquiries />} />
        <Route path="maintenance" element={<AdminMaintenance />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
