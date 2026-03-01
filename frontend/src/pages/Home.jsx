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
    <div className="page-container">
      <header className="site-header">
        <div className="container-main">
          <div className="site-header-inner">
            <Link to="/" className="site-logo">
              UniHostel
            </Link>
            <nav className="nav-links">
              <Link to="/login" className="nav-link-text">
                Sign in
              </Link>
              <Link to="/signup" className="nav-link-outline">
                Sign up
              </Link>
              <Link to="/admin/login" className="btn-primary-solid">
                Admin Login
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <section className="hero">
        <div className="hero-pattern" aria-hidden />
        <div className="hero-content">
          <div className="hero-inner">
            <h1 className="hero-title">Your home away from home</h1>
            <p className="hero-tagline">
              Safe, affordable campus hostels with everything you need to focus on your studies and make the most of university life.
            </p>
            <a href="#hostels" className="hero-cta">
              View hostels
              <svg className="hero-cta-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </a>
          </div>
        </div>
      </section>

      <section className="about-strip">
        <div className="container-main">
          <p className="about-text">
            <span className="brand-name">UniHostel</span> manages campus accommodation so you can book rooms, pay fees, request late passes, and raise inquiries—all in one place. Students get a simple dashboard; admins get full control.
          </p>
        </div>
      </section>

      <section id="hostels" className="container-main hostel-section">
        <h2 className="section-heading">Featured hostels</h2>
        <p className="section-subtitle">Comfortable, secure accommodation across campus.</p>
        <div className="hostel-grid">
          {featuredHostels.map((hostel) => (
            <article key={hostel.name} className="hostel-card">
              <div className="hostel-card-image">
                <svg className="hostel-card-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div className="hostel-card-body">
                <div className="hostel-card-header">
                  <h3 className="hostel-card-title">{hostel.name}</h3>
                  <span className="hostel-price">{hostel.price}{hostel.period}</span>
                </div>
                <p className="hostel-location">
                  <svg className="hostel-location-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {hostel.location}
                </p>
                <p className="hostel-description">{hostel.description}</p>
                <div className="hostel-amenities">
                  {hostel.amenities.map((a) => (
                    <span key={a} className="hostel-amenity-tag">{a}</span>
                  ))}
                </div>
                <p className="hostel-meta">{hostel.beds} beds</p>
              </div>
            </article>
          ))}
        </div>
        <div className="section-cta-wrap">
          <Link to="/login" className="btn-primary-with-icon">
            Sign in to book
            <svg className="btn-icon-right" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </div>
      </section>

      <footer className="site-footer">
        <div className="container-main">
          <p className="site-footer-inner">UniHostel — Campus hostel management</p>
        </div>
      </footer>
    </div>
  )
}
