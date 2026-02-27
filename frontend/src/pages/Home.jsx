import { Link } from 'react-router-dom'

const featuredHostels = [
  {
    name: 'North Hall',
    location: 'Campus North',
    price: '₹1,200',
    period: '/bed/month',
    description: 'Quiet block with study rooms and 24/7 Wi-Fi. Close to the library and main lecture halls.',
    beds: '200',
    amenities: ['Wi-Fi', 'Study room', 'Laundry'],
  },
  {
    name: 'South Hall',
    location: 'Campus South',
    price: '₹1,100',
    period: '/bed/month',
    description: 'Vibrant community near the canteen and sports complex. Ideal for outgoing students.',
    beds: '160',
    amenities: ['Wi-Fi', 'Common room', 'Parking'],
  },
  {
    name: 'East Wing',
    location: 'Campus East',
    price: '₹1,350',
    period: '/bed/month',
    description: 'Newer building with attached washrooms and round-the-clock security.',
    beds: '120',
    amenities: ['Wi-Fi', 'Attached bath', 'Security'],
  },
  {
    name: 'West Gate',
    location: 'Campus West',
    price: '₹1,000',
    period: '/bed/month',
    description: 'Budget-friendly option with shared facilities and a green courtyard.',
    beds: '180',
    amenities: ['Wi-Fi', 'Garden', 'Mess'],
  },
]

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header - Login in upper right */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-slate-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="flex items-center gap-2">
              <span className="text-xl font-bold text-primary-600">UniHostel</span>
            </Link>
            <nav className="flex items-center gap-3">
              <Link
                to="/login"
                className="text-slate-600 hover:text-primary-600 font-medium px-4 py-2 rounded-lg hover:bg-primary-50 transition-colors"
              >
                Sign in
              </Link>
              <Link
                to="/signup"
                className="text-primary-600 hover:bg-primary-50 font-medium px-4 py-2 rounded-lg transition-colors border border-primary-600"
              >
                Sign up
              </Link>
              <Link
                to="/admin/login"
                className="bg-primary-600 text-white font-medium px-4 py-2 rounded-lg hover:bg-primary-700 shadow-md shadow-primary-600/25 transition-all"
              >
                Admin Login
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-600 via-primary-700 to-primary-800 text-white">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.05\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-80" />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
            Your home away from home
          </h1>
          <p className="text-lg sm:text-xl text-primary-100 max-w-2xl mb-8">
            Safe, affordable campus hostels with everything you need to focus on your studies and make the most of university life.
          </p>
          <a
            href="#hostels"
            className="inline-flex items-center gap-2 bg-white text-primary-700 font-semibold px-6 py-3 rounded-xl hover:bg-primary-50 shadow-lg transition-colors"
          >
            View hostels
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </a>
        </div>
      </section>

      {/* About strip */}
      <section className="bg-white border-b border-slate-200 py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-slate-600 text-center text-lg max-w-3xl mx-auto">
            <span className="font-semibold text-primary-600">UniHostel</span> manages campus accommodation so you can book rooms, pay fees, request late passes, and raise inquiries—all in one place. Students get a simple dashboard; admins get full control.
          </p>
        </div>
      </section>

      {/* Featured hostels */}
      <section id="hostels" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">Featured hostels</h2>
        <p className="text-slate-600 mb-10">Comfortable, secure accommodation across campus.</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {featuredHostels.map((hostel) => (
            <article
              key={hostel.name}
              className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md hover:border-primary-200 transition-all duration-200"
            >
              <div className="h-32 bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center">
                <svg className="w-14 h-14 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div className="p-5">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-bold text-slate-900 text-lg">{hostel.name}</h3>
                  <span className="text-primary-600 font-semibold whitespace-nowrap">{hostel.price}{hostel.period}</span>
                </div>
                <p className="text-slate-500 text-sm mb-3 flex items-center gap-1">
                  <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {hostel.location}
                </p>
                <p className="text-slate-600 text-sm mb-4 line-clamp-3">{hostel.description}</p>
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {hostel.amenities.map((a) => (
                    <span key={a} className="text-xs font-medium text-primary-700 bg-primary-100 px-2 py-1 rounded">
                      {a}
                    </span>
                  ))}
                </div>
                <p className="text-slate-500 text-xs">{hostel.beds} beds</p>
              </div>
            </article>
          ))}
        </div>
        <div className="mt-10 text-center">
          <Link
            to="/login"
            className="inline-flex items-center gap-2 bg-primary-600 text-white font-semibold px-6 py-3 rounded-xl hover:bg-primary-700 shadow-md shadow-primary-600/20 transition-colors"
          >
            Sign in to book
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-800 text-slate-300 py-8 mt-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm">
          <p>UniHostel — Campus hostel management</p>
        </div>
      </footer>
    </div>
  )
}
