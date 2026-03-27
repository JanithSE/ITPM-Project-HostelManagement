import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import axiosClient, { getAxiosErrorMessage } from '../../shared/api/axiosClient'

function bookingStatusPillClass(s) {
  if (s === 'confirmed') return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
  if (s === 'cancelled') return 'bg-rose-500/15 text-rose-700 dark:text-rose-300'
  return 'bg-amber-500/15 text-amber-800 dark:text-amber-200'
}

function StatBar({ label, value, max, colorClass, gradientClass }) {
  const pct = max > 0 ? Math.max(6, Math.round((value / max) * 100)) : 0
  const fill = gradientClass || colorClass
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-slate-600 dark:text-slate-300">{label}</span>
        <span className="font-semibold tabular-nums text-slate-700 dark:text-slate-200">{value}</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-slate-200/80 dark:bg-slate-700/70">
        <div className={`h-full rounded-full transition-all duration-500 ${fill}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function KpiCard({ title, value, subtitle, icon, borderClass, bgClass, accentClass }) {
  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border px-4 py-4 shadow-sm transition hover:shadow-md ${borderClass} ${bgClass}`}
    >
      <div
        className={`pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-20 blur-2xl transition group-hover:opacity-30 ${accentClass}`}
      />
      <div className="relative flex items-start justify-between gap-2">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
            {title}
          </div>
          <div className="mt-1.5 text-3xl font-extrabold tabular-nums tracking-tight text-slate-900 dark:text-slate-50">
            {value}
          </div>
          {subtitle ? <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">{subtitle}</div> : null}
        </div>
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-lg shadow-inner ${accentClass} text-white`}
        >
          {icon}
        </div>
      </div>
    </div>
  )
}

function BookingDonut({ pending, confirmed, cancelled }) {
  const total = pending + confirmed + cancelled
  if (total === 0) {
    return (
      <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-slate-200 text-sm text-slate-500 dark:border-slate-600 dark:text-slate-400">
        No bookings yet
      </div>
    )
  }
  const p = (pending / total) * 100
  const c = (confirmed / total) * 100
  const g = `conic-gradient(#f59e0b 0% ${p}%, #10b981 ${p}% ${p + c}%, #f43f5e ${p + c}% 100%)`
  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
      <div
        className="h-36 w-36 shrink-0 rounded-full shadow-lg shadow-amber-500/10 ring-4 ring-white dark:ring-slate-800"
        style={{ background: g }}
      />
      <ul className="space-y-2 text-xs">
        <li className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> Pending — {pending} ({Math.round(p)}%)
        </li>
        <li className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Confirmed — {confirmed} ({Math.round(c)}%)
        </li>
        <li className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-500" /> Cancelled — {cancelled} ({Math.round(100 - p - c)}%)
        </li>
      </ul>
    </div>
  )
}

function formatLkr(n) {
  if (n == null || Number.isNaN(Number(n))) return '—'
  return `LKR ${Number(n).toLocaleString('en-LK', { maximumFractionDigits: 0 })}`
}

const initialOverview = {
  users: 0,
  hostels: 0,
  totalBookings: 0,
  bookings: { pending: 0, confirmed: 0, cancelled: 0 },
  payments: { pending: 0, processing: 0, completed: 0, rejected: 0 },
  paymentMoney: { collected: 0, pipeline: 0 },
  inventoryByCategory: {},
  inventoryItemCount: 0,
  totalBeds: 0,
  availableBeds: 0,
  topHostels: [],
  recentBookings: [],
  support: {
    inquiries: 0,
    maintenanceOpen: 0,
    latepassAction: 0,
    complains: 0,
  },
}

export default function AdminDashboard() {
  const [adminName, setAdminName] = useState('Admin')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [lastUpdated, setLastUpdated] = useState(null)
  const [stats, setStats] = useState(initialOverview)

  useEffect(() => {
    try {
      const raw = localStorage.getItem('adminUser')
      const parsed = raw ? JSON.parse(raw) : null
      const name = String(parsed?.username || '').trim()
      if (name) setAdminName(name)
    } catch {
      /* ignore */
    }
  }, [])

  const loadOverview = useCallback(async ({ isRefresh } = {}) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    setError('')
    try {
      const results = await Promise.allSettled([
        axiosClient.get('/users'),
        axiosClient.get('/hostels'),
        axiosClient.get('/bookings'),
        axiosClient.get('/payments/admin'),
        axiosClient.get('/inventory'),
        axiosClient.get('/inquiry'),
        axiosClient.get('/maintenance'),
        axiosClient.get('/latepass/admin'),
        axiosClient.get('/complains'),
      ])

      const [
        usersRes,
        hostelsRes,
        bookingsRes,
        paymentsRes,
        inventoryRes,
        inquiryRes,
        maintenanceRes,
        latepassRes,
        complainsRes,
      ] = results

      const users = usersRes.status === 'fulfilled' && Array.isArray(usersRes.value?.data) ? usersRes.value.data : []
      const hostels =
        hostelsRes.status === 'fulfilled' && Array.isArray(hostelsRes.value?.data) ? hostelsRes.value.data : []
      const bookings =
        bookingsRes.status === 'fulfilled' && Array.isArray(bookingsRes.value?.data) ? bookingsRes.value.data : []
      const payments =
        paymentsRes.status === 'fulfilled' && Array.isArray(paymentsRes.value?.data) ? paymentsRes.value.data : []
      const inventory =
        inventoryRes.status === 'fulfilled' && Array.isArray(inventoryRes.value?.data) ? inventoryRes.value.data : []
      const inquiries =
        inquiryRes.status === 'fulfilled' && Array.isArray(inquiryRes.value?.data) ? inquiryRes.value.data : []
      const maintenance =
        maintenanceRes.status === 'fulfilled' && Array.isArray(maintenanceRes.value?.data)
          ? maintenanceRes.value.data
          : []
      const latepasses =
        latepassRes.status === 'fulfilled' && Array.isArray(latepassRes.value?.data) ? latepassRes.value.data : []
      const complains =
        complainsRes.status === 'fulfilled' && Array.isArray(complainsRes.value?.data) ? complainsRes.value.data : []

      const bookingStats = { pending: 0, confirmed: 0, cancelled: 0 }
      bookings.forEach((b) => {
        const s = String(b?.status || 'pending').toLowerCase()
        if (s === 'confirmed') bookingStats.confirmed += 1
        else if (s === 'cancelled') bookingStats.cancelled += 1
        else bookingStats.pending += 1
      })

      const paymentStats = { pending: 0, processing: 0, completed: 0, rejected: 0 }
      let collectedMoney = 0
      let pipelineMoney = 0
      payments.forEach((p) => {
        const s = String(p?.status || '').toLowerCase()
        const amt = Number(p?.amount) || 0
        if (s === 'paid' || s === 'completed') {
          paymentStats.completed += 1
          collectedMoney += amt
        } else if (s === 'failed' || s === 'rejected') {
          paymentStats.rejected += 1
        } else if (s === 'processing') {
          paymentStats.processing += 1
          pipelineMoney += amt
        } else {
          paymentStats.pending += 1
          pipelineMoney += amt
        }
      })

      const byCategory = {}
      inventory.forEach((it) => {
        const c = String(it?.category || 'other').trim().toLowerCase() || 'other'
        byCategory[c] = (byCategory[c] || 0) + (Number(it?.quantity) || 0)
      })

      let totalBeds = 0
      let availableBeds = 0
      const hostelRows = hostels.map((h) => {
        const t = Number(h?.totalRooms) || 0
        const a = Number(h?.availableRooms) || 0
        totalBeds += t
        availableBeds += a
        return { name: h?.name || 'Hostel', total: t, available: a }
      })
      const topHostels = [...hostelRows].sort((x, y) => y.total - x.total).slice(0, 6)

      const recentBookings = [...bookings]
        .filter((b) => b?.createdAt)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 5)
        .map((b) => ({
          id: String(b?._id || ''),
          student: b?.student?.name || b?.studentName || 'Student',
          hostel: b?.hostel?.name || '—',
          status: String(b?.status || 'pending').toLowerCase(),
          at: b.createdAt,
        }))

      const maintenanceOpen = maintenance.filter((m) => {
        const s = String(m?.status || '').toLowerCase()
        return s === 'open' || s === 'in_progress'
      }).length

      const latepassAction = latepasses.filter((lp) => {
        const s = String(lp?.status || '').toLowerCase()
        return s === 'pending' || s === 'processing'
      }).length

      setStats({
        users: users.length,
        hostels: hostels.length,
        totalBookings: bookings.length,
        bookings: bookingStats,
        payments: paymentStats,
        paymentMoney: { collected: collectedMoney, pipeline: pipelineMoney },
        inventoryByCategory: byCategory,
        inventoryItemCount: inventory.length,
        totalBeds,
        availableBeds,
        topHostels,
        recentBookings,
        support: {
          inquiries: inquiries.length,
          maintenanceOpen,
          latepassAction,
          complains: complains.length,
        },
      })

      setLastUpdated(new Date())

      const failed = results.filter((r) => r.status === 'rejected')
      if (failed.length > 0) {
        setError('Some overview feeds could not load. Showing available data.')
      }
    } catch (err) {
      setError(getAxiosErrorMessage(err))
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    loadOverview()
  }, [loadOverview])

  const bookingMax = Math.max(
    1,
    stats.bookings.pending,
    stats.bookings.confirmed,
    stats.bookings.cancelled,
  )
  const paymentMax = Math.max(
    1,
    stats.payments.pending,
    stats.payments.processing,
    stats.payments.completed,
    stats.payments.rejected,
  )
  const categoryPairs = useMemo(
    () =>
      Object.entries(stats.inventoryByCategory)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5),
    [stats.inventoryByCategory],
  )
  const inventoryMax = Math.max(1, ...categoryPairs.map(([, qty]) => qty))

  const hostelBarMax = Math.max(1, ...stats.topHostels.map((h) => h.total))
  const occupiedBeds = Math.max(0, stats.totalBeds - stats.availableBeds)
  const occupancyPct = stats.totalBeds > 0 ? Math.round((occupiedBeds / stats.totalBeds) * 100) : 0

  const quickLinks = [
    { to: '/admin/users', label: 'Users', color: 'from-sky-500 to-blue-600' },
    { to: '/admin/booking', label: 'Bookings', color: 'from-emerald-500 to-teal-600' },
    { to: '/admin/payments', label: 'Payments', color: 'from-violet-500 to-purple-600' },
    { to: '/admin/hostels', label: 'Hostels', color: 'from-amber-500 to-orange-600' },
    { to: '/admin/inventory', label: 'Inventory', color: 'from-pink-500 to-rose-600' },
    { to: '/admin/inquiries', label: 'Inquiries', color: 'from-cyan-500 to-sky-600' },
    { to: '/admin/maintenance', label: 'Maintenance', color: 'from-lime-500 to-emerald-600' },
    { to: '/admin/latepass', label: 'Late pass', color: 'from-indigo-500 to-violet-600' },
  ]

  const dateStr = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <div className="space-y-6 pb-8">
      <div className="relative overflow-hidden rounded-3xl border border-indigo-200/80 bg-gradient-to-br from-indigo-600 via-violet-600 to-blue-700 px-6 py-8 text-white shadow-xl shadow-indigo-900/25">
        <div className="pointer-events-none absolute -left-10 top-0 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-10 right-0 h-48 w-48 rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-1 inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold backdrop-blur-sm">
              <span className="h-2 w-2 animate-pulse rounded-full bg-amber-300" />
              Live overview
            </div>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">Admin Overview</h1>
            <p className="mt-2 max-w-xl text-sm text-indigo-100">
              Welcome back, <span className="font-semibold text-white">{adminName}</span> — hostel operations at a
              glance. {dateStr}.
            </p>
            {lastUpdated ? (
              <p className="mt-2 text-xs text-indigo-200/90">
                Updated{' '}
                {lastUpdated.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => loadOverview({ isRefresh: true })}
              disabled={refreshing || loading}
              className="rounded-xl bg-white/95 px-5 py-2.5 text-sm font-bold text-indigo-700 shadow-md transition hover:bg-white disabled:opacity-60"
            >
              {refreshing ? 'Refreshing…' : '↻ Refresh'}
            </button>
          </div>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="Total users"
          value={loading ? '…' : stats.users}
          subtitle="Registered accounts"
          icon="👥"
          borderClass="border-sky-200 dark:border-sky-900/50"
          bgClass="bg-gradient-to-br from-sky-50 to-white dark:from-slate-900 dark:to-sky-950/30"
          accentClass="bg-gradient-to-br from-sky-500 to-blue-600"
        />
        <KpiCard
          title="Hostels"
          value={loading ? '…' : stats.hostels}
          subtitle={`${stats.totalBeds} beds · ${stats.availableBeds} available`}
          icon="🏠"
          borderClass="border-violet-200 dark:border-violet-900/50"
          bgClass="bg-gradient-to-br from-violet-50 to-white dark:from-slate-900 dark:to-violet-950/30"
          accentClass="bg-gradient-to-br from-violet-500 to-purple-600"
        />
        <KpiCard
          title="Bookings"
          value={loading ? '…' : stats.totalBookings}
          subtitle={`${stats.bookings.confirmed} confirmed`}
          icon="📅"
          borderClass="border-emerald-200 dark:border-emerald-900/50"
          bgClass="bg-gradient-to-br from-emerald-50 to-white dark:from-slate-900 dark:to-emerald-950/30"
          accentClass="bg-gradient-to-br from-emerald-500 to-teal-600"
        />
        <KpiCard
          title="Payments collected"
          value={loading ? '…' : formatLkr(stats.paymentMoney.collected)}
          subtitle={`${formatLkr(stats.paymentMoney.pipeline)} in pipeline`}
          icon="💳"
          borderClass="border-rose-200 dark:border-rose-900/50"
          bgClass="bg-gradient-to-br from-rose-50 to-white dark:from-slate-900 dark:to-rose-950/30"
          accentClass="bg-gradient-to-br from-rose-500 to-orange-600"
        />
      </div>

      <div>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Quick navigation
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
          {quickLinks.map((q) => (
            <Link
              key={q.to}
              to={q.to}
              className={`rounded-xl bg-gradient-to-br ${q.color} px-3 py-3 text-center text-xs font-bold text-white shadow-md transition hover:scale-[1.02] hover:shadow-lg active:scale-[0.98]`}
            >
              {q.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900/50">
          <h2 className="mb-1 text-base font-semibold text-slate-900 dark:text-slate-100">Bed occupancy</h2>
          <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">
            {occupiedBeds} occupied · {stats.availableBeds} free ({occupancyPct}% full)
          </p>
          <div className="h-4 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 transition-all duration-700"
              style={{ width: `${Math.min(100, occupancyPct)}%` }}
            />
          </div>
          <div className="mt-4 space-y-3">
            {stats.topHostels.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">No hostel capacity data.</p>
            ) : (
              stats.topHostels.map((h) => (
                <StatBar
                  key={h.name}
                  label={`${h.name} (${h.available} free)`}
                  value={h.total}
                  max={hostelBarMax}
                  gradientClass="bg-gradient-to-r from-indigo-500 to-violet-500"
                />
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900/50">
          <h2 className="mb-4 text-base font-semibold text-slate-900 dark:text-slate-100">Operations snapshot</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-cyan-200 bg-cyan-50/80 p-3 dark:border-cyan-900/50 dark:bg-cyan-950/25">
              <div className="text-[10px] font-bold uppercase text-cyan-700 dark:text-cyan-300">Inquiries</div>
              <div className="mt-1 text-2xl font-extrabold text-slate-900 dark:text-slate-100">
                {loading ? '…' : stats.support.inquiries}
              </div>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3 dark:border-amber-900/50 dark:bg-amber-950/25">
              <div className="text-[10px] font-bold uppercase text-amber-800 dark:text-amber-300">Maintenance open</div>
              <div className="mt-1 text-2xl font-extrabold text-slate-900 dark:text-slate-100">
                {loading ? '…' : stats.support.maintenanceOpen}
              </div>
            </div>
            <div className="rounded-xl border border-indigo-200 bg-indigo-50/80 p-3 dark:border-indigo-900/50 dark:bg-indigo-950/25">
              <div className="text-[10px] font-bold uppercase text-indigo-700 dark:text-indigo-300">Late pass (action)</div>
              <div className="mt-1 text-2xl font-extrabold text-slate-900 dark:text-slate-100">
                {loading ? '…' : stats.support.latepassAction}
              </div>
            </div>
            <div className="rounded-xl border border-rose-200 bg-rose-50/80 p-3 dark:border-rose-900/50 dark:bg-rose-950/25">
              <div className="text-[10px] font-bold uppercase text-rose-700 dark:text-rose-300">Complaints</div>
              <div className="mt-1 text-2xl font-extrabold text-slate-900 dark:text-slate-100">
                {loading ? '…' : stats.support.complains}
              </div>
            </div>
          </div>
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
            Inventory: <span className="font-semibold text-slate-700 dark:text-slate-300">{stats.inventoryItemCount}</span>{' '}
            line items tracked
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-indigo-200 bg-white p-5 shadow-sm dark:border-indigo-900/60 dark:bg-slate-900/50">
          <h2 className="mb-4 text-base font-semibold text-slate-900 dark:text-slate-100">Bookings mix</h2>
          <BookingDonut
            pending={stats.bookings.pending}
            confirmed={stats.bookings.confirmed}
            cancelled={stats.bookings.cancelled}
          />
          <div className="mt-4 space-y-3 border-t border-slate-100 pt-4 dark:border-slate-700">
            <StatBar label="Pending" value={stats.bookings.pending} max={bookingMax} colorClass="bg-amber-500" />
            <StatBar label="Confirmed" value={stats.bookings.confirmed} max={bookingMax} colorClass="bg-emerald-500" />
            <StatBar label="Cancelled" value={stats.bookings.cancelled} max={bookingMax} colorClass="bg-rose-500" />
          </div>
        </div>

        <div className="rounded-2xl border border-indigo-200 bg-white p-5 shadow-sm dark:border-indigo-900/60 dark:bg-slate-900/50">
          <h2 className="mb-4 text-base font-semibold text-slate-900 dark:text-slate-100">Payments pipeline</h2>
          <div className="space-y-3">
            <StatBar label="Pending" value={stats.payments.pending} max={paymentMax} colorClass="bg-amber-500" />
            <StatBar label="Processing" value={stats.payments.processing} max={paymentMax} colorClass="bg-sky-500" />
            <StatBar label="Completed" value={stats.payments.completed} max={paymentMax} colorClass="bg-emerald-500" />
            <StatBar label="Rejected" value={stats.payments.rejected} max={paymentMax} colorClass="bg-rose-500" />
          </div>
        </div>

        <div className="rounded-2xl border border-indigo-200 bg-white p-5 shadow-sm dark:border-indigo-900/60 dark:bg-slate-900/50">
          <h2 className="mb-4 text-base font-semibold text-slate-900 dark:text-slate-100">Inventory by category</h2>
          <div className="space-y-3">
            {categoryPairs.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">No inventory data.</p>
            ) : (
              categoryPairs.map(([name, qty]) => (
                <StatBar
                  key={name}
                  label={name.replace(/\b\w/g, (m) => m.toUpperCase())}
                  value={qty}
                  max={inventoryMax}
                  gradientClass="bg-gradient-to-r from-fuchsia-500 to-violet-500"
                />
              ))
            )}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-5 shadow-sm dark:border-slate-700 dark:from-slate-900 dark:to-slate-950/80">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Recent bookings</h2>
          <Link to="/admin/booking" className="text-xs font-bold text-indigo-600 hover:underline dark:text-indigo-400">
            View all →
          </Link>
        </div>
        {stats.recentBookings.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">No recent bookings to show.</p>
        ) : (
          <ul className="space-y-2">
            {stats.recentBookings.map((b) => (
              <li
                key={b.id || `${b.student}-${b.at}`}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-100 bg-white/80 px-3 py-2 dark:border-slate-700 dark:bg-slate-900/40"
              >
                <div>
                  <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{b.student}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {b.hostel} · {b.at ? new Date(b.at).toLocaleString() : '—'}
                  </div>
                </div>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold capitalize ${bookingStatusPillClass(b.status)}`}
                >
                  {b.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}