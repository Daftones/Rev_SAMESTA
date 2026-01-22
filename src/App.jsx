import { useEffect, useState } from 'react'
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom'
import Navbar from './components/Navbar'
import HeroCarousel from './components/HeroCarousel'
import MonthlyPromo from './components/MonthlyPromo'
import ApartmentFilter from './components/ApartmentFilter'
import ApartmentList from './components/ApartmentList'
import ApartmentDetail from './components/ApartmentDetail'
import Login from './pages/Login'
import Register from './pages/Register'
import Facilities from './pages/Facilities'
import AboutUs from './pages/AboutUs'
import RoomTypeDetail from './pages/RoomTypeDetail'
import Promo from './pages/Promo'
import AdminLogin from './pages/AdminLogin'
import AdminDashboard from './pages/AdminDashboard'
import AdminHome from './pages/AdminHome'
import AdminApartments from './pages/AdminApartments'
import AdminInquiries from './pages/AdminInquiries'
import AdminPayments from './pages/AdminPayments'
import Inquiry from './pages/Inquiry'
import Payments from './pages/Payments'
import PaymentHistory from './pages/PaymentHistory'
import Footer from './components/Footer'
import ScrollToTop from './components/ScrollToTop'
import WhatsAppButton from './components/WhatsAppButton'
import { Alert, Button, Container, Modal } from 'react-bootstrap'
import Apartemenlogo from './assets/Apartemen logo.png?url'
import AboutUsLogo from './assets/about-us-logo.png?url'
import Fasilitaslogo from './assets/Facilities logo.png?url'

function HomePage() {
  const [logoutFlash, setLogoutFlash] = useState('')

  useEffect(() => {
    const msg = sessionStorage.getItem('logoutFlash')
    if (msg) {
      setLogoutFlash(String(msg))
      sessionStorage.removeItem('logoutFlash')
    }
  }, [])

  const cards = [
    {
      href: '/apartments',
      title: 'Apartemen',
      description: 'Jelajahi pilihan apartemen studio dan 2 kamar tidur kami',
      image: Apartemenlogo,
      cta: 'Lihat Apartemen',
    },
    {
      href: '/facilities',
      title: 'Fasilitas',
      description: 'Temukan fasilitas dan kemudahan kelas dunia kami',
      image: Fasilitaslogo,
      cta: 'Lihat fasilitas',
    },
    {
      href: '/about',
      title: 'Tentang Kami',
      description: 'Pelajari lebih lanjut tentang Samesta Living dan misi kami',
      image: AboutUsLogo,
      cta: 'Tentang kami',
    },
  ]

  return (
    <>
      <div>
        {logoutFlash && (
          <div className="px-3 pt-3">
            <Container className="px-3">
              <Alert variant="success" dismissible onClose={() => setLogoutFlash('')} className="mb-0">
                {logoutFlash}
              </Alert>
            </Container>
          </div>
        )}
        <HeroCarousel />
        
        <section className="py-12 bg-white">
          <Container className="px-3">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {cards.map((card) => (
                <a key={card.title} href={card.href} className="no-underline">
                  <div className="flex h-full flex-col items-center gap-4 rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm transition duration-300 hover:-translate-y-2 hover:shadow-xl">
                    <div className="flex min-h-[150px] items-center justify-center">
                      <img 
                        src={card.image}
                        alt={`${card.title} icon`}
                        className="h-[120px] w-auto object-contain"
                      />
                    </div>
                    <div className="flex flex-col gap-3 flex-grow">
                      <h3 className="text-xl font-bold text-slate-900">{card.title}</h3>
                      <p className="text-slate-600">{card.description}</p>
                    </div>
                    <button className="mt-2 inline-flex items-center justify-center rounded-full bg-slate-900 px-6 py-3 text-white font-semibold transition hover:-translate-y-0.5 hover:bg-slate-800">
                      {card.cta}
                    </button>
                  </div>
                </a>
              ))}
            </div>
          </Container>
        </section>

        <MonthlyPromo />
      </div>
    </>
  )
}

function ApartmentsPage() {
  const [filters, setFilters] = useState(null)

  const handleSearch = (searchFilters) => {
    setFilters(searchFilters)
  }

  if (!filters) {
    return <ApartmentFilter onSearch={handleSearch} />
  }

  return <ApartmentList filters={filters} />
}

function App() {
  const location = useLocation()
  const navigate = useNavigate()
  const isAdminPage = location.pathname.startsWith('/admin')
  const isApartmentDetailPage = location.pathname.startsWith('/apartment/')
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register'
  const showPublicNavbar = !isAdminPage && !isAuthPage

  const [showLogoutSuccessModal, setShowLogoutSuccessModal] = useState(false)

  useEffect(() => {
    const key = 'logoutFeedbackPending'

    const openIfPending = () => {
      if (sessionStorage.getItem(key) === '1') {
        setShowLogoutSuccessModal(true)
      }
    }

    openIfPending()

    const handler = () => openIfPending()
    window.addEventListener('samesta:logout-success', handler)
    return () => window.removeEventListener('samesta:logout-success', handler)
  }, [])

  const handleLogoutModalClose = () => {
    sessionStorage.removeItem('logoutFeedbackPending')
    setShowLogoutSuccessModal(false)
    navigate('/', { replace: true })
  }

  return (
    <>
      <ScrollToTop />

      <Modal
        show={showLogoutSuccessModal}
        onHide={handleLogoutModalClose}
        centered
        backdrop="static"
        keyboard={false}
      >
        <Modal.Body className="text-center p-5">
          <div className="mb-4">
            <div
              style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                background: '#28a745',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto',
                fontSize: '40px',
                color: 'white',
              }}
            >
              OK
            </div>
          </div>
          <h3 className="fw-bold mb-3">Logout Berhasil!</h3>
          <p className="text-muted mb-4">
            Anda telah berhasil logout dari akun Anda. Anda dapat login kembali kapan saja.
          </p>
          <Button variant="dark" size="lg" onClick={handleLogoutModalClose} className="px-5">
            Kembali ke Beranda
          </Button>
        </Modal.Body>
      </Modal>

      {showPublicNavbar && <Navbar />}
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/apartments" element={<ApartmentsPage />} />
        <Route path="/apartment/:id" element={<ApartmentDetail />} />
        <Route path="/facilities" element={<Facilities />} />
        <Route path="/about" element={<AboutUs />} />
        <Route path="/room-type/:type" element={<RoomTypeDetail />} />
        <Route path="/promo" element={<Promo />} />
        <Route path="/inquiry" element={<Inquiry />} />
        <Route path="/payments" element={<Payments />} />
        <Route path="/payment-history" element={<PaymentHistory />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={<AdminDashboard />}>
          <Route path="dashboard" element={<AdminHome />} />
          <Route path="apartments" element={<AdminApartments />} />
          <Route path="inquiries" element={<AdminInquiries />} />
          <Route path="payments" element={<AdminPayments />} />
        </Route>
      </Routes>
      {!isAdminPage && <Footer />}
      {!isAdminPage && !isApartmentDetailPage && !isAuthPage && <WhatsAppButton />}
    </>
  )
}

export default App
