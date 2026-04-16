import { Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from './shared/components/ProtectedRoute'
import StudentLayout from './shared/layouts/StudentLayout'
import AdminLayout from './shared/layouts/AdminLayout'
import Home from './components/auth/Home'
import StudentAuth from './components/auth/StudentAuth'
import RoleSelectLogin from './components/auth/RoleSelectLogin'
import AdminLogin from './components/auth/AdminLogin'
import WardenAuth from './components/auth/WardenAuth'
import OtpVerification from './components/auth/OtpVerification'
import ForgotPassword from './components/auth/ForgotPassword'
import ResetPassword from './components/auth/ResetPassword'

import StudentDashboard from './components/dashboard/StudentDashboard'
import AdminDashboard from './components/dashboard/AdminDashboard'
import WardenDashboard from './components/dashboard/WardenDashboard'

import Hostels from './components/hostels/Hostels'
import AdminHostels from './components/hostels/AdminHostels'

import StudentPayments from './components/payments/StudentPayments'
import AddPayment from './components/payments/AddPayment'
import AdminPayments from './components/payments/AdminPayments'

import StudentInquiries from './components/inquiries/StudentInquiries'
import AdminInquiries from './components/inquiries/AdminInquiries'

import StudentLatepass from './components/latepass/StudentLatepass'
import AddLatepass from './components/latepass/AddLatepass'
import AdminLatepass from './components/latepass/AdminLatepass'

import Complains from './components/complains/Complains'
import Inventory from './components/inventory/Inventory'

import AdminMaintenance from './components/maintenance/AdminMaintenance'
import StudentMaintenance from './components/maintenance/StudentMaintenance'

import Users from './components/users/Users'
import CreateUser from './components/users/CreateUser'

import Booking from './components/bookings/Booking'
import StudentBooking from './components/bookings/StudentBooking'

import AdminRooms from './components/rooms/AdminRooms'
import ThemeToggle from './shared/components/ThemeToggle'

export default function App() {
  return (
    <>
      <ThemeToggle className="fixed right-4 top-4 z-[70]" />

      <Routes>
        {/* Public */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<RoleSelectLogin />} />
        <Route path="/signup" element={<StudentAuth />} />
        <Route path="/register" element={<StudentAuth />} />
        <Route path="/student/login" element={<StudentAuth />} />
        <Route path="/verify-otp" element={<OtpVerification />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/warden/login" element={<WardenAuth />} />
        <Route path="/warden/register" element={<WardenAuth />} />

        {/* Student */}
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
          <Route path="payments/:id/edit" element={<AddPayment />} />
          <Route path="inquiries" element={<StudentInquiries />} />
          <Route path="latepass" element={<StudentLatepass />} />
          <Route path="latepass/new" element={<AddLatepass />} />
          <Route path="latepass/:id/edit" element={<AddLatepass />} />
          <Route path="complains" element={<Complains />} />
          <Route path="maintenance" element={<StudentMaintenance />} />
          <Route path="booking" element={<StudentBooking />} />
        </Route>

        {/* Warden: splat + descendant <Routes> inside WardenDashboard so /warden and /warden/inventory always render */}
        <Route
          path="/warden/*"
          element={
            <ProtectedRoute allowedRole="warden">
              <WardenDashboard />
            </ProtectedRoute>
          }
        />

        {/* Admin */}
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
          <Route path="users/create" element={<CreateUser />} />
          <Route path="booking" element={<Booking />} />
          <Route path="rooms" element={<AdminRooms />} />
          <Route path="hostels" element={<AdminHostels />} />
          <Route path="payments" element={<AdminPayments />} />
          <Route path="latepass" element={<AdminLatepass />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="inquiries" element={<AdminInquiries />} />
          <Route path="maintenance" element={<AdminMaintenance />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}