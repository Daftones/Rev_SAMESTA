import { useState } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
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
import Footer from './components/Footer'
import ScrollToTop from './components/ScrollToTop'
import WhatsAppButton from './components/WhatsAppButton'
import { Container } from 'react-bootstrap'
import Apartemenlogo from './assets/Apartemen logo.png?url'
import AboutUsLogo from './assets/About Us logo.png?url'
import Fasilitaslogo from './assets/Facilities logo.png?url'

function HomePage() {
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
        <Navbar />
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
  const isAdminPage = location.pathname.startsWith('/admin')
  const isApartmentDetailPage = location.pathname.startsWith('/apartment/')

  return (
    <>
      <ScrollToTop />
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
      {!isAdminPage && !isApartmentDetailPage && <WhatsAppButton />}
    </>
  )
}

export default App
