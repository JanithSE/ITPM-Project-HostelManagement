import React from 'react'
import { Link } from 'react-router-dom'

export default function Home() {
  const hostels = [
    {
      name: 'Green Valley Hostel',
      location: 'Malabe – Near SLIIT & Horizon Campus',
      price: 'LKR 18,000',
      period: '/bed/month',
      tag: 'Quiet Zone',
      description:
        'Quiet, greenery-filled environment perfect for focused students.',
    },
    {
      name: 'City View Residence',
      location: 'Colombo – Near University of Colombo',
      price: 'LKR 25,000',
      period: '/bed/month',
      tag: 'City Access',
      description:
        'Modern hostel with city views and easy access to universities.',
    },
    {
      name: 'Lake Side Hostel',
      location: 'Kandy – Near University of Peradeniya',
      price: 'LKR 20,000',
      period: '/bed/month',
      tag: 'Scenic Study',
      description:
        'Peaceful lakeside environment ideal for studying and relaxation.',
    },
  ]

  const features = [
    {
      title: 'Verified Hostels',
      description: 'Only reviewed properties with transparent rules and facilities.',
    },
    {
      title: 'Digital Bookings',
      description: 'Apply, upload documents, and track approval from one dashboard.',
    },
    {
      title: 'Student Support',
      description: 'Handle payments, inquiries, maintenance, and late pass requests online.',
    },
  ]

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/85 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
          <Link to="/" className="flex items-center gap-3 text-xl font-extrabold tracking-tight">
            <span className="rounded-lg bg-indigo-600 px-2.5 py-1 text-sm font-black text-white">UH</span>
            UniHostel
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              to="/login"
              className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
            >
              Login
            </Link>
            <Link
              to="/signup"
              className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
            >
              Create Account
            </Link>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(79,70,229,0.18),transparent_40%),radial-gradient(circle_at_80%_10%,rgba(14,165,233,0.2),transparent_45%),linear-gradient(to_bottom,rgba(255,255,255,0.8),rgba(248,250,252,1))] dark:bg-[radial-gradient(circle_at_20%_20%,rgba(79,70,229,0.35),transparent_45%),radial-gradient(circle_at_80%_10%,rgba(14,165,233,0.22),transparent_45%),linear-gradient(to_bottom,rgba(2,6,23,0.75),rgba(2,6,23,1))]" />

        <div className="relative mx-auto grid w-full max-w-7xl gap-10 px-5 pb-16 pt-14 sm:px-8 lg:grid-cols-12 lg:items-center lg:pb-24 lg:pt-20">
          <div className="lg:col-span-7">
            <p className="mb-4 inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-300">
              Student Housing Platform
            </p>

            <h1 className="text-4xl font-black tracking-tight text-slate-900 sm:text-5xl lg:text-6xl dark:text-white">
              Professional Hostel Management for Modern Campuses
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg dark:text-slate-300">
              Discover trusted hostels near your university, apply online, and manage everything from booking to payments in one secure portal.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/signup"
                className="rounded-full bg-indigo-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-indigo-700"
              >
                Get Started
              </Link>
              <Link
                to="/login"
                className="rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-bold text-slate-700 transition hover:border-slate-400 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Student Login
              </Link>
            </div>

            <div className="mt-10 grid gap-3 sm:grid-cols-3">
              {[
                ['120+', 'Active Hostels'],
                ['8k+', 'Students Served'],
                ['99.2%', 'Support Success'],
              ].map(([value, label]) => (
                <div key={label} className="rounded-2xl border border-slate-200/80 bg-white/80 p-4 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
                  <p className="text-2xl font-black text-slate-900 dark:text-slate-100">{value}</p>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xl shadow-slate-300/20 dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/30">
              <h2 className="text-lg font-extrabold text-slate-900 dark:text-slate-100">Why Students Choose UniHostel</h2>
              <div className="mt-5 space-y-4">
                {features.map((item) => (
                  <div key={item.title} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">{item.title}</h3>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{item.description}</p>
                  </div>
                ))}
              </div>
            </div>

              <Link
                to="/signup"
                className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-black dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
              >
                Create Your Student Account
              </Link>
            </div>
          </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-5 pb-16 sm:px-8 lg:pb-24">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400">Featured Listings</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Explore Top Student Hostels</h2>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {hostels.map((hostel, index) => (
            <article
              key={index}
              className="group overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-300/30 dark:border-slate-800 dark:bg-slate-900 dark:hover:shadow-black/30"
            >
              <div className="mb-5 flex items-center justify-between">
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
                  {hostel.tag}
                </span>
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Featured</span>
              </div>

              <h3 className="text-xl font-extrabold text-slate-900 dark:text-slate-100">{hostel.name}</h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{hostel.location}</p>

              <p className="mt-4 text-lg font-black text-indigo-600 dark:text-indigo-400">
                {hostel.price}
                <span className="ml-1 text-xs font-semibold uppercase tracking-wide text-slate-400">{hostel.period}</span>
              </p>

              <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{hostel.description}</p>

              <div className="mt-6">
                <Link
                  to="/signup"
                  className="inline-flex items-center rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 transition hover:border-indigo-500 hover:text-indigo-600 dark:border-slate-700 dark:text-slate-200 dark:hover:border-indigo-400 dark:hover:text-indigo-300"
                >
                  Request Booking
                </Link>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-14 rounded-3xl border border-slate-200 bg-white p-7 sm:p-10 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Ready to Begin</p>
              <h3 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">Join UniHostel and simplify your stay</h3>
              <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-300">
                Create your account and get instant access to bookings, support requests, and payment tracking.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link to="/signup" className="rounded-full bg-indigo-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-indigo-700">
                Sign Up Now
              </Link>
              <Link
                to="/login"
                className="rounded-full border border-slate-300 px-6 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Login
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}