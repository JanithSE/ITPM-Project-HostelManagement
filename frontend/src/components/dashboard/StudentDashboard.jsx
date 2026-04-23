import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { authApi, bookingApi, latepassApi, paymentApi } from '../../shared/api/client'

function formatDate(d) {
  if (!d) return '—'
  const x = new Date(d)
  return Number.isNaN(x.getTime()) ? '—' : x.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function maxDobForMinAge(minAge = 18) {
  const d = new Date()
  d.setFullYear(d.getFullYear() - minAge)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const profileFieldClass =
  'w-full rounded-2xl border border-slate-200/80 bg-slate-50 px-4 py-3.5 text-sm font-semibold text-slate-900 shadow-sm transition-all placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/15 dark:border-slate-600 dark:bg-slate-800/90 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-indigo-400 dark:focus:ring-indigo-400/15'

export default function StudentDashboard() {
  const [bookings, setBookings] = useState([])
  const [payments, setPayments] = useState([])
  const [latepasses, setLatepasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [profileModalOpen, setProfileModalOpen] = useState(false)
  const [profileExpanded, setProfileExpanded] = useState(false)
  const [profile, setProfile] = useState(() => {
    const base = {
      fullName: '',
      email: localStorage.getItem('studentEmail') || '',
      phoneNumber: '',
      address: '',
      dateOfBirth: '',
      profilePicture: '',
      academicYear: '',
      academicSemester: '',
    }
    const saved = localStorage.getItem('studentProfile')
    if (saved) {
      try {
        return { ...base, ...JSON.parse(saved) }
      } catch {}
    }
    return {
      ...base,
      fullName: localStorage.getItem('studentName') || '',
    }
  })
  const [profileDraft, setProfileDraft] = useState(profile)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const data = await authApi.me()
        if (cancelled || !data?.user) return
        const u = data.user
        const name = String(u.name || '').trim()
        const email = String(u.email || '').trim()
        const phone = String(u.phoneNumber || '').trim()
        setProfile((prev) => {
          const next = {
            ...prev,
            fullName: name || prev.fullName,
            email: email || prev.email,
            phoneNumber: prev.phoneNumber || phone,
            academicYear:
              u.academicYear != null && u.academicYear !== ''
                ? String(u.academicYear)
                : prev.academicYear || '',
            academicSemester:
              u.academicSemester != null && u.academicSemester !== ''
                ? String(u.academicSemester)
                : prev.academicSemester || '',
          }
          try {
            localStorage.setItem('studentProfile', JSON.stringify(next))
          } catch {}
          if (next.fullName) localStorage.setItem('studentName', next.fullName)
          if (next.email) localStorage.setItem('studentEmail', next.email)
          return next
        })
        setProfileDraft((prev) => ({
          ...prev,
          fullName: name || prev.fullName,
          email: email || prev.email,
          phoneNumber: prev.phoneNumber || phone,
          academicYear:
            u.academicYear != null && u.academicYear !== '' ? String(u.academicYear) : prev.academicYear || '',
          academicSemester:
            u.academicSemester != null && u.academicSemester !== ''
              ? String(u.academicSemester)
              : prev.academicSemester || '',
        }))
      } catch {
        // No / invalid token — keep localStorage fallbacks
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        setLoading(true)
        const [bookingData, paymentData, latepassData] = await Promise.all([
          bookingApi.list().catch(() => []),
          paymentApi.listMine().catch(() => []),
          latepassApi.listMine().catch(() => []),
        ])
        if (cancelled) return
        setBookings(Array.isArray(bookingData) ? bookingData : [])
        setPayments(Array.isArray(paymentData) ? paymentData : [])
        setLatepasses(Array.isArray(latepassData) ? latepassData : [])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const summary = useMemo(() => {
    const pendingBookings = bookings.filter((b) => b.status === 'pending').length
    const confirmedBookings = bookings.filter((b) => b.status === 'confirmed').length
    const pendingPayments = payments.filter((p) => p.status === 'pending').length
    const pendingLatepass = latepasses.filter((l) => l.status === 'pending').length
    return { pendingBookings, confirmedBookings, pendingPayments, pendingLatepass }
  }, [bookings, payments, latepasses])

  const recentActivities = useMemo(() => {
    const list = [
      ...bookings.map((b) => ({
        id: `b-${b._id}`,
        title: `Booking ${b.status}`,
        sub: `${b.hostel?.name || 'Hostel'} · Room ${b.roomNumber || '—'}`,
        date: b.updatedAt || b.createdAt,
        type: 'booking'
      })),
      ...payments.map((p) => ({
        id: `p-${p._id}`,
        title: `Payment ${p.status}`,
        sub: `Amount Rs.${Number(p.amount || 0).toLocaleString()}`,
        date: p.updatedAt || p.createdAt,
        type: 'payment'
      })),
      ...latepasses.map((l) => ({
        id: `l-${l._id}`,
        title: `Late pass ${l.status}`,
        sub: l.reason || 'Late pass request',
        date: l.updatedAt || l.createdAt,
        type: 'latepass'
      })),
    ]
    return list
      .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
      .slice(0, 6)
  }, [bookings, payments, latepasses])

  const upcomingStay = useMemo(() => {
    const confirmed = bookings
      .filter((b) => b.status === 'confirmed')
      .sort((a, b) => new Date(a.fromDate || a.createdAt || 0) - new Date(b.fromDate || b.createdAt || 0))
    return confirmed[0] || null
  }, [bookings])

  const latestPayment = useMemo(() => {
    const sorted = [...payments].sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0))
    return sorted[0] || null
  }, [payments])

  function openProfileEditor() {
    setProfileExpanded(false)
    setProfileDraft(profile)
    setProfileModalOpen(true)
  }

  async function saveProfile(e) {
    e.preventDefault()
    if (!profileDraft.fullName.trim()) return
    const next = {
      ...profileDraft,
      fullName: profileDraft.fullName.trim(),
      address: String(profileDraft.address || '').trim(),
      dateOfBirth: profileDraft.dateOfBirth || '',
    }
    try {
      await authApi.patchMe({
        name: next.fullName,
        phoneNumber: next.phoneNumber || '',
        academicYear: next.academicYear === '' ? null : next.academicYear,
        academicSemester: next.academicSemester === '' ? null : next.academicSemester,
      })
    } catch {
      // Still persist locally if server is unreachable
    }
    setProfile(next)
    localStorage.setItem('studentProfile', JSON.stringify(next))
    localStorage.setItem('studentName', next.fullName)
    if (next.email) localStorage.setItem('studentEmail', next.email)
    setProfileModalOpen(false)
  }

  function handleProfileImage(file) {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      setProfileDraft((prev) => ({ ...prev, profilePicture: String(reader.result || '') }))
    }
    reader.readAsDataURL(file)
  }

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Welcome Header */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="text-indigo-600 font-bold text-sm tracking-widest uppercase mb-2">Student Portal</div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tighter text-slate-900 dark:text-white">
            Hello, {profile.fullName || 'Resident'}
          </h1>
          <p className="mt-2 text-slate-500 max-w-md">
            Manage your room, track payments, and access campus services from your personal dashboard.
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={openProfileEditor} className="btn-secondary-outline !px-5 !py-2.5">Edit Profile</button>
          <Link to="/student/booking" className="btn-primary-solid !px-5 !py-2.5">Book New Room</Link>
        </div>
      </section>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Bookings', val: bookings.length, icon: '📅', color: 'bg-blue-50 text-blue-600' },
          { label: 'Active Stay', val: upcomingStay ? 'Confirmed' : 'None', icon: '🏠', color: 'bg-emerald-50 text-emerald-600' },
          { label: 'Pending Payment', val: summary.pendingPayments, icon: '💳', color: 'bg-amber-50 text-amber-600' },
          { label: 'Late Passes', val: latepasses.length, icon: '🕒', color: 'bg-purple-50 text-purple-600' },
        ].map((stat, i) => (
          <div key={i} className="stat-widget group hover:border-indigo-200 transition-colors">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${stat.color} dark:bg-slate-800`}>
              {stat.icon}
            </div>
            <div className="stat-label">{stat.label}</div>
            <div className="stat-value">{stat.val}</div>
          </div>
        ))}
      </div>


      <div className="dashboard-grid">
        {/* Main Content Column */}
        <div className="lg:col-span-8 space-y-8">
          {/* Active Stay Card */}
          <div className="premium-card">
            <div className="premium-card-inner">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-xl font-bold">Your Current Residence</h2>
                <Link to="/student/hostels" className="text-sm font-semibold text-indigo-600 hover:text-indigo-700">Change preferences</Link>
              </div>

              {upcomingStay ? (
                <div className="flex flex-col md:flex-row gap-8 items-center bg-slate-50 dark:bg-slate-800/50 rounded-3xl p-8 border border-slate-100 dark:border-slate-800">
                  <div className="w-24 h-24 rounded-2xl bg-indigo-600 flex items-center justify-center text-4xl text-white shadow-xl shadow-indigo-600/20">
                    🏢
                  </div>
                  <div className="flex-1 text-center md:text-left">
                    <h3 className="text-2xl font-bold mb-1">{upcomingStay.hostel?.name || 'Assigned Hostel'}</h3>
                    <p className="text-slate-500 font-medium mb-4">Room No: <span className="text-slate-900 dark:text-white font-bold">{upcomingStay.roomNumber || 'TBD'}</span></p>
                    <div className="flex flex-wrap justify-center md:justify-start gap-4">
                      <div className="px-4 py-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                        <div className="text-[10px] font-bold uppercase text-slate-400">Check-in</div>
                        <div className="text-sm font-bold">{formatDate(upcomingStay.fromDate)}</div>
                      </div>
                      <div className="px-4 py-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                        <div className="text-[10px] font-bold uppercase text-slate-400">Check-out</div>
                        <div className="text-sm font-bold">{formatDate(upcomingStay.toDate)}</div>
                      </div>
                    </div>
                  </div>
                  <div className="shrink-0">
                    <span className="px-4 py-1.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold uppercase tracking-wider">
                      {upcomingStay.status}
                    </span>
                    <Link
                      to="/student/payments"
                      className="mt-3 inline-flex items-center justify-center rounded-full bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700"
                    >
                      Pay Now
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="py-20 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl">
                  <p className="text-slate-400 font-medium">You don't have any active stay records.</p>
                  <Link to="/student/booking" className="inline-block mt-4 text-indigo-600 font-bold hover:underline">Apply for a room now</Link>
                </div>
              )}
            </div>
          </div>

          {/* Payments & Billing */}
          <div className="premium-card">
            <div className="premium-card-inner">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-xl font-bold">Invoices & Billing</h2>
                <Link to="/student/payments" className="text-sm font-semibold text-indigo-600 hover:text-indigo-700">View all records</Link>
              </div>

              {latestPayment ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-white dark:bg-slate-900 flex items-center justify-center text-xl shadow-sm">💳</div>
                      <div>
                        <div className="font-bold">Rs. {Number(latestPayment.amount).toLocaleString()}</div>
                        <div className="text-xs text-slate-500">Invoice Ref: #{latestPayment._id.slice(-6).toUpperCase()}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold mb-1">{formatDate(latestPayment.createdAt)}</div>
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${latestPayment.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                        {latestPayment.status}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-slate-400 text-center py-10 font-medium">No payment history found.</p>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar Column */}
        <div className="lg:col-span-4 space-y-8">
          {/* Profile Widget */}
          <div className="premium-card overflow-visible">
            <div className="premium-card-inner">
              <div className="flex flex-col items-center text-center -mt-12">
                <button
                  type="button"
                  onClick={() => setProfileExpanded((v) => !v)}
                  className="group mb-4 focus:outline-none"
                  aria-expanded={profileExpanded}
                  aria-label="Toggle profile details"
                >
                  {profile.profilePicture ? (
                    <img
                      src={profile.profilePicture}
                      alt="User"
                      className="w-24 h-24 rounded-3xl object-cover ring-8 ring-white shadow-2xl transition-transform group-hover:scale-105 dark:ring-slate-900"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-3xl bg-indigo-600 flex items-center justify-center text-3xl font-black text-white ring-8 ring-white shadow-2xl transition-transform group-hover:scale-105 dark:ring-slate-900">
                      {(profile.fullName || 'S').slice(0, 1).toUpperCase()}
                    </div>
                  )}
                </button>
                <h3 className="text-xl font-bold">{profile.fullName || 'Resident'}</h3>
                <p className="text-sm text-slate-500 font-medium mb-6">{profile.email || 'No email provided'}</p>

                <p className="text-xs text-slate-400">Click profile photo to view full profile</p>
              </div>
            </div>
          </div>

          {/* Recent Activity Mini-Feed */}
          <div className="premium-card">
            <div className="premium-card-inner">
              <h2 className="text-lg font-bold mb-6">Activity Feed</h2>
              <div className="relative space-y-6 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-100 dark:before:bg-slate-800">
                {recentActivities.map((act) => (
                  <div key={act.id} className="relative pl-10">
                    <div className={`absolute left-0 top-1 w-6 h-6 rounded-full border-4 border-white dark:border-slate-900 z-10 flex items-center justify-center text-[10px] ${act.type === 'payment' ? 'bg-amber-500' : act.type === 'booking' ? 'bg-indigo-500' : 'bg-emerald-500'
                      }`} />
                    <div className="text-sm font-bold">{act.title}</div>
                    <div className="text-xs text-slate-500 mb-1">{act.sub}</div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase">{formatDate(act.date)}</div>
                  </div>
                ))}
                {recentActivities.length === 0 && <p className="text-xs text-slate-400 text-center py-4 italic">No recent updates.</p>}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Profile modal: scrollable body + sticky footer so Done is always visible */}
      {profileModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/50 backdrop-blur-sm p-0 sm:items-center sm:p-4 animate-in fade-in duration-200">
          <div
            className="flex h-[min(92dvh,760px)] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl border border-slate-200/90 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900 sm:h-[min(88vh,720px)] sm:rounded-3xl"
            role="dialog"
            aria-labelledby="profile-modal-title"
            aria-modal="true"
          >
            <div className="shrink-0 border-b border-slate-200/80 px-5 py-4 dark:border-slate-700 sm:px-8 sm:py-5">
              <h2 id="profile-modal-title" className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
                Update Profile
              </h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Keep your details current — they are stored on this device for booking forms.
              </p>
            </div>

            <form onSubmit={saveProfile} className="flex min-h-0 flex-1 flex-col">
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-8 sm:py-6">
                <div className="grid gap-5 sm:grid-cols-2 sm:gap-x-6 sm:gap-y-5">
                  <div className="space-y-2">
                    <label htmlFor="pf-name" className="block text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                      Full name
                    </label>
                    <input
                      id="pf-name"
                      className={profileFieldClass}
                      value={profileDraft.fullName}
                      onChange={(e) => setProfileDraft((p) => ({ ...p, fullName: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="pf-email" className="block text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                      Email address
                    </label>
                    <input
                      id="pf-email"
                      type="email"
                      className={profileFieldClass}
                      value={profileDraft.email}
                      onChange={(e) => setProfileDraft((p) => ({ ...p, email: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="pf-phone" className="block text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                      Phone
                    </label>
                    <input
                      id="pf-phone"
                      className={profileFieldClass}
                      value={profileDraft.phoneNumber}
                      onChange={(e) => setProfileDraft((p) => ({ ...p, phoneNumber: e.target.value }))}
                      placeholder="e.g. 0771234567"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="pf-year" className="block text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                      Study year
                    </label>
                    <select
                      id="pf-year"
                      className={profileFieldClass}
                      value={profileDraft.academicYear}
                      onChange={(e) => setProfileDraft((p) => ({ ...p, academicYear: e.target.value }))}
                    >
                      <option value="">Not set</option>
                      <option value="1">Year 1</option>
                      <option value="2">Year 2</option>
                      <option value="3">Year 3</option>
                      <option value="4">Year 4</option>
                    </select>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Used for roommate matching in booking chat.</p>
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="pf-sem" className="block text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                      Semester
                    </label>
                    <select
                      id="pf-sem"
                      className={profileFieldClass}
                      value={profileDraft.academicSemester}
                      onChange={(e) => setProfileDraft((p) => ({ ...p, academicSemester: e.target.value }))}
                    >
                      <option value="">Not set</option>
                      <option value="1">Semester 1</option>
                      <option value="2">Semester 2</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <span className="block text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                      Profile photo
                    </span>
                    <div className="flex min-h-[3.25rem] items-center gap-4">
                      <label className="group relative shrink-0 cursor-pointer">
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleProfileImage(e.target.files?.[0] || null)} />
                        {profileDraft.profilePicture ? (
                          <img
                            src={profileDraft.profilePicture}
                            alt=""
                            className="h-16 w-16 rounded-2xl object-cover ring-2 ring-slate-200 transition-opacity group-hover:opacity-90 dark:ring-slate-600"
                          />
                        ) : (
                          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-2xl dark:border-slate-600 dark:bg-slate-800/80">
                            📸
                          </div>
                        )}
                      </label>
                      <p className="text-xs leading-snug text-slate-500 dark:text-slate-400">Tap to upload. Optional.</p>
                    </div>
                  </div>
                </div>

                <div className="mt-8 space-y-5 border-t border-slate-200/80 pt-6 dark:border-slate-700/80">
                  <div className="w-full space-y-2">
                    <label htmlFor="pf-dob" className="block text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                      Date of birth
                    </label>
                    <input
                      id="pf-dob"
                      type="date"
                      max={maxDobForMinAge(18)}
                      className={`${profileFieldClass} w-full min-w-0`}
                      value={profileDraft.dateOfBirth}
                      onChange={(e) => setProfileDraft((p) => ({ ...p, dateOfBirth: e.target.value }))}
                    />
                    <p className="text-xs text-slate-500 dark:text-slate-400">At least 18 if provided. You can leave this blank.</p>
                  </div>
                  <div className="w-full space-y-2">
                    <label htmlFor="pf-address" className="block text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                      Address
                    </label>
                    <textarea
                      id="pf-address"
                      rows={3}
                      className={`${profileFieldClass} min-h-[6rem] w-full resize-y font-medium leading-relaxed`}
                      placeholder="Street, city, district…"
                      value={profileDraft.address}
                      onChange={(e) => setProfileDraft((p) => ({ ...p, address: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              <div className="shrink-0 border-t border-slate-200/90 bg-slate-50/95 px-5 py-4 dark:border-slate-700 dark:bg-slate-950/90 sm:px-8">
                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    className="w-full rounded-2xl border-2 border-slate-300 bg-white px-6 py-3.5 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 sm:w-auto sm:min-w-[7.5rem]"
                    onClick={() => {
                      setProfileDraft(profile)
                      setProfileModalOpen(false)
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="w-full rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 px-8 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-500/30 transition-all hover:from-indigo-500 hover:to-blue-500 active:scale-[0.99] sm:w-auto sm:min-w-[10.5rem]"
                  >
                    Done
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {profileExpanded && (
        <div
          className="fixed inset-0 z-[95] flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 animate-in fade-in duration-300"
          onClick={() => setProfileExpanded(false)}
        >
          <div
            className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900 sm:p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">Student Profile</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Your dashboard is dimmed while this profile view is open.</p>
              </div>
              <button
                type="button"
                onClick={() => setProfileExpanded(false)}
                className="rounded-full border border-slate-300 px-3 py-1 text-xs font-bold uppercase tracking-wide text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Close
              </button>
            </div>

            <div className="mb-6 flex flex-col items-center gap-3 text-center">
              {profile.profilePicture ? (
                <img src={profile.profilePicture} alt="User" className="h-28 w-28 rounded-3xl object-cover ring-8 ring-slate-100 dark:ring-slate-800" />
              ) : (
                <div className="flex h-28 w-28 items-center justify-center rounded-3xl bg-indigo-600 text-4xl font-black text-white ring-8 ring-slate-100 dark:ring-slate-800">
                  {(profile.fullName || 'S').slice(0, 1).toUpperCase()}
                </div>
              )}
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">{profile.fullName || 'Resident'}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">{profile.email || 'No email provided'}</p>
            </div>

            <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm dark:border-slate-700 dark:bg-slate-800/40 sm:grid-cols-2">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Phone</p>
                <p className="mt-1 font-semibold text-slate-800 dark:text-slate-100">{profile.phoneNumber || '—'}</p>
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Date of birth</p>
                <p className="mt-1 font-semibold text-slate-800 dark:text-slate-100">{formatDate(profile.dateOfBirth)}</p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Address</p>
                <p className="mt-1 font-semibold text-slate-800 dark:text-slate-100">{profile.address || '—'}</p>
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Role</p>
                <p className="mt-1 font-semibold text-indigo-600 dark:text-indigo-400">Student</p>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button type="button" onClick={openProfileEditor} className="btn-primary-solid flex-1 !py-3">
                Edit Profile
              </button>
              <button type="button" onClick={() => setProfileExpanded(false)} className="btn-secondary-outline flex-1 !py-3">
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
