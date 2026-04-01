import { Link } from 'react-router-dom'

/* Public HTTPS images (local file paths do not work in the browser) */
const featuredHostels = [
  {
    name: 'Emerald Grove Residences',
    location: 'Malabe – Near SLIIT & Horizon Campus',
    price: '₹18,000',
    period: ' / month',
    description: 'Quiet, greenery-filled environment perfect for focused students with private study nooks.',
    beds: '180',
    amenities: ['Ultra Wi-Fi', 'Study Lounges', 'Gated Security'],
    image:
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'Urban Nest Living',
    location: 'Malabe South – Kothalawala Area',
    price: '₹15,000',
    period: ' / month',
    description: 'Lively atmosphere close to university food spots and social hubs.',
    beds: '150',
    amenities: ['Common Room', 'Cafeteria', 'Parking'],
    image: 'https://picsum.photos/seed/urbannest-living/800/560',
  },
  {
    name: 'Skyline Elite Hostel',
    location: 'Malabe Town – Premium',
    price: '₹25,000',
    period: ' / month',
    description: 'Modern premium hostel with hotel-like facilities and 24/7 concierge-style security.',
    beds: '120',
    amenities: ['Smart Access', 'Private Gym', 'Weekly Laundry'],
    image:
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'Lakeview Budget Stay',
    location: 'Rajagiriya Area',
    price: '₹12,000',
    period: ' / month',
    description: 'Affordable and peaceful stay with easy access to city transport and local markets.',
    beds: '200',
    amenities: ['Lakeside View', 'Garden', 'Shared Kitchen'],
    image:
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80',
  },
]

export default function Home() {
  return (
    <div className="page-container">
      <header className="site-header">
        <div className="container-main">
          <div className="site-header-inner">
            <Link to="/" className="site-logo">
              <span className="site-logo-mark">UH</span>
              UniHostel
            </Link>
            <nav className="flex items-center gap-4">
              <Link to="/login" className="btn-primary-solid">
                Sign In
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <section className="hero">
        <div className="hero-content">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold mb-6 dark:bg-indigo-900/40 dark:text-indigo-300">
             <span className="flex h-2 w-2 rounded-full bg-indigo-600 animate-pulse" />
             Campus Housing Open for 2026
          </div>
          <h1 className="hero-title">Elevate your campus living experience</h1>
          <p className="hero-tagline">
            Managed accommodation for modern students. Find a bed, automate payments, and manage your late passes all in one secure, professional portal.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/signup" className="btn-primary-solid px-8 py-4 text-base">
              Get Started
            </Link>
            <a href="#hostels" className="btn-secondary-outline px-8 py-4 text-base">
              Browse Hostels
            </a>
          </div>
        </div>
        
        {/* Background Decorative Mesh */}
        <div className="absolute top-0 right-0 -z-10 w-[600px] h-[600px] bg-indigo-400/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-0 left-0 -z-10 w-[400px] h-[400px] bg-blue-400/10 blur-[100px] rounded-full" />
      </section>

      {/* Trust Indicators */}
      <section className="border-y border-slate-100 bg-white/50 dark:border-slate-800 dark:bg-slate-900/50">
        <div className="container-main py-10">
          <div className="flex flex-wrap justify-between gap-8 items-center max-w-5xl mx-auto opacity-50 grayscale">
            <div className="text-xl font-black italic">CAMPUS.CORE</div>
            <div className="text-xl font-black italic">UNIGLOW</div>
            <div className="text-xl font-black italic">SLIIT_RES</div>
            <div className="text-xl font-black italic">SMART_STAY</div>
          </div>
        </div>
      </section>

      <section id="hostels" className="container-main py-24">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16">
          <div className="max-w-xl">
            <h2 className="text-4xl font-bold mb-4">Prime student residences</h2>
            <p className="text-lg text-slate-600 dark:text-slate-400">
              Each of our managed hostels meets the highest standards of safety, cleanliness, and connectivity.
            </p>
          </div>
          <Link to="/login" className="text-indigo-600 font-bold hover:underline mb-2 flex items-center gap-2">
            View All Hostels <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
          </Link>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {featuredHostels.map((hostel) => (
            <article key={hostel.name} className="hostel-card group">
              <div className="hostel-card-image-wrap">
                <img
                  src={hostel.image}
                  alt={hostel.name}
                  loading="lazy"
                  decoding="async"
                  className="hostel-card-img"
                />
                <div className="hostel-price-badge">
                  {hostel.price}<span className="text-xs font-normal text-slate-500">{hostel.period}</span>
                </div>
              </div>
              <div className="p-6 flex flex-col flex-1">
                <h3 className="text-xl font-bold mb-2 group-hover:text-indigo-600 transition-colors">{hostel.name}</h3>
                <div className="flex items-start gap-1.5 text-xs text-slate-500 mb-4">
                  <svg className="w-4 h-4 shrink-0 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {hostel.location}
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 mb-4 leading-relaxed">
                  {hostel.description}
                </p>
                <div className="mt-auto flex flex-col gap-4">
                  <div className="flex flex-wrap gap-2">
                    {hostel.amenities.map((a) => (
                      <span
                        key={a}
                        className="text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                      >
                        {a}
                      </span>
                    ))}
                  </div>
                  <Link
                    to="/student/booking"
                    state={{ hostelName: hostel.name }}
                    className="btn-primary-solid flex w-full items-center justify-center py-3 text-sm font-bold"
                  >
                    Room booking
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Features Grid */}
      <section className="bg-slate-900 text-white py-24 overflow-hidden relative">
        <div className="container-main">
          <div className="text-center max-w-2xl mx-auto mb-20">
            <h2 className="text-4xl font-bold mb-6">Designed for real-world efficiency</h2>
            <p className="text-slate-400 text-lg">
               Whether you're a student or hostel administrator, UniHostel gives you the precision tools you need.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
             {[
               { t: 'Secure Payments', d: 'Automated receipt generation and verification. No more lost paper trails.', i: '💳' },
               { t: 'Smart Late Passes', d: 'Submit and get approved for late returns directly from your mobile dashboard.', i: '🕒' },
               { t: '24/7 Inquiries', d: 'Instant communication channel between students and hostel wardens.', i: '⚡' },
               { t: 'Admin Dashboard', d: 'Real-time occupancy tracking and financial reports for management.', i: '📊' },
               { t: 'Maintenance Hub', d: 'Raise issues and track repair status without leaving your room.', i: '🛠️' },
               { t: 'Digital Onboarding', d: 'Simple, secure verification process for new residents.', i: '✨' },
             ].map((f, i) => (
                <div key={i} className="p-8 rounded-3xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                  <div className="text-4xl mb-6">{f.i}</div>
                  <h3 className="text-xl font-bold mb-3">{f.t}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">{f.d}</p>
                </div>
             ))}
          </div>
        </div>
        
        <div className="absolute top-1/2 left-0 -translate-x-1/2 w-[800px] h-[800px] bg-indigo-600/10 blur-[150px] rounded-full" />
      </section>

      <footer className="py-20 bg-white dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800">
        <div className="container-main">
          <div className="flex flex-col md:flex-row justify-between items-center gap-10">
            <div>
               <Link to="/" className="site-logo">
                  <span className="site-logo-mark">UH</span>
                  UniHostel
               </Link>
               <p className="mt-4 text-sm text-slate-500 max-w-xs">
                 The modern standard for comprehensive student hostel management.
               </p>
            </div>
            <div className="flex gap-10 text-sm font-semibold text-slate-600 dark:text-slate-400">
               <a href="#" className="hover:text-indigo-600">Explore</a>
               <a href="#" className="hover:text-indigo-600">Privacy</a>
               <a href="#" className="hover:text-indigo-600">Terms</a>
               <a href="#" className="hover:text-indigo-600">Developer</a>
            </div>
            <div className="text-xs text-slate-400">
              © 2026 UniHostel Inc. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
