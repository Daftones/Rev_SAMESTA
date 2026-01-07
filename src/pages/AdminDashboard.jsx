import { useState, useEffect, useRef } from 'react'
import { useNavigate, Outlet, Link, useLocation } from 'react-router-dom'
import { Container, Navbar, Nav, Dropdown, Badge, Toast, ToastContainer } from 'react-bootstrap'
import logo from '../assets/samesta logo.png'
import { inquiriesAPI, paymentsAPI } from '../services/api'

const ADMIN_EMAILS = ['samestajakabaring@gmail.com']

const readStoredUser = () => {
  const userStr = localStorage.getItem('user')
  if (!userStr) return null
  try {
    const parsed = JSON.parse(userStr)
    return (parsed && typeof parsed === 'object') ? parsed : null
  } catch (err) {
    console.warn('Invalid stored user, clearing...', err)
    localStorage.removeItem('user')
    return null
  }
}

function AdminDashboard() {
  const navigate = useNavigate()
  const location = useLocation()
  const [adminUsername] = useState(() => {
    const user = readStoredUser()
    return String(user?.name || 'Admin')
  })
  const [newInquiriesCount, setNewInquiriesCount] = useState(0)
  const [newPaymentsCount, setNewPaymentsCount] = useState(0)
  const [pendingInquiriesCount, setPendingInquiriesCount] = useState(0)
  const [pendingPaymentsCount, setPendingPaymentsCount] = useState(0)
  const [isSidebarNearby, setIsSidebarNearby] = useState(false)
  const [showToast, setShowToast] = useState(false)
  const [toastTitle, setToastTitle] = useState('')
  const [toastBody, setToastBody] = useState('')
  const sidebarRef = useRef(null)

  useEffect(() => {
    const token = localStorage.getItem('authToken')
    const user = readStoredUser()

    const isAdminByRole = user?.role === 'admin'
    const isAdminByEmail = user?.email && ADMIN_EMAILS.includes(user.email.toLowerCase())

    if (!token || !user || (!isAdminByRole && !isAdminByEmail)) {
      navigate('/admin/login', { replace: true })
    }
  }, [navigate])

  // Detect cursor proximity to sidebar to trigger micro animation
  useEffect(() => {
    const handleMouseMove = (event) => {
      const sidebarEl = sidebarRef.current
      if (!sidebarEl) return

      const rect = sidebarEl.getBoundingClientRect()
      const threshold = 80 // px radius to trigger animation
      const withinY = event.clientY >= rect.top - threshold && event.clientY <= rect.bottom + threshold
      const withinX = event.clientX <= rect.right + threshold && event.clientX >= rect.left - threshold
      setIsSidebarNearby(withinX && withinY)
    }

    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  // Poll backend for inquiries + payments (frontend-only notifications).
  // Badges show "new since last viewed" and clear when admin opens the related page.
  useEffect(() => {
    const PREV_POLL_INQUIRY_KEY = 'adminNotif:lastPendingInquiryCount'
    const PREV_POLL_PAYMENT_KEY = 'adminNotif:lastPendingPaymentCount'
    const SEEN_INQUIRY_KEY = 'adminNotif:seenPendingInquiryCount'
    const SEEN_PAYMENT_KEY = 'adminNotif:seenPendingPaymentCount'

    const normalizeStatus = (v) => String(v || '').toLowerCase().trim()

    const poll = async () => {
      try {
        const [inqRes, payRes] = await Promise.all([
          inquiriesAPI.getAll(),
          paymentsAPI.getAll({ limit: 500 }),
        ])

        const inqList = Array.isArray(inqRes?.data) ? inqRes.data : Array.isArray(inqRes) ? inqRes : []
        const pendingInq = inqList.filter((inq) => {
          const s = normalizeStatus(inq?.status)
          return s === 'pending' || s === 'sent'
        }).length

        const payList = Array.isArray(payRes?.data) ? payRes.data : Array.isArray(payRes) ? payRes : []
        const pendingPay = payList.filter((p) => {
          const s = normalizeStatus(p?.status)
          return s === 'pending' || s === 'waiting_verification'
        }).length

        setPendingInquiriesCount(pendingInq)
        setPendingPaymentsCount(pendingPay)

        const prevInq = Number(sessionStorage.getItem(PREV_POLL_INQUIRY_KEY) || '0')
        const prevPay = Number(sessionStorage.getItem(PREV_POLL_PAYMENT_KEY) || '0')
        const inqDelta = Math.max(0, pendingInq - prevInq)
        const payDelta = Math.max(0, pendingPay - prevPay)

        if (inqDelta > 0) {
          setToastTitle('Inquiry Baru')
          setToastBody(`${inqDelta} inquiry baru menunggu review.`)
          setShowToast(true)
        } else if (payDelta > 0) {
          setToastTitle('Pembayaran Baru')
          setToastBody(`${payDelta} pembayaran baru menunggu verifikasi.`)
          setShowToast(true)
        }

        sessionStorage.setItem(PREV_POLL_INQUIRY_KEY, String(pendingInq))
        sessionStorage.setItem(PREV_POLL_PAYMENT_KEY, String(pendingPay))

        const seenInq = Number(sessionStorage.getItem(SEEN_INQUIRY_KEY) || '0')
        const seenPay = Number(sessionStorage.getItem(SEEN_PAYMENT_KEY) || '0')

        const onInquiriesPage = location.pathname.startsWith('/admin/inquiries')
        const onPaymentsPage = location.pathname.startsWith('/admin/payments')

        if (onInquiriesPage) {
          sessionStorage.setItem(SEEN_INQUIRY_KEY, String(pendingInq))
        }
        if (onPaymentsPage) {
          sessionStorage.setItem(SEEN_PAYMENT_KEY, String(pendingPay))
        }

        const effectiveSeenInq = onInquiriesPage ? pendingInq : seenInq
        const effectiveSeenPay = onPaymentsPage ? pendingPay : seenPay

        setNewInquiriesCount(Math.max(0, pendingInq - effectiveSeenInq))
        setNewPaymentsCount(Math.max(0, pendingPay - effectiveSeenPay))
      } catch (err) {
        // Silent fail: notifications are best-effort.
        if (import.meta?.env?.DEV) {
          console.warn('Admin notification poll failed', err)
        }
      }
    }

    poll()
    const interval = setInterval(poll, 5000)
    return () => clearInterval(interval)
  }, [location.pathname])

  // Clear badges immediately on navigation (don’t wait for the next poll tick).
  useEffect(() => {
    const SEEN_INQUIRY_KEY = 'adminNotif:seenPendingInquiryCount'
    const SEEN_PAYMENT_KEY = 'adminNotif:seenPendingPaymentCount'

    if (location.pathname.startsWith('/admin/inquiries')) {
      sessionStorage.setItem(SEEN_INQUIRY_KEY, String(pendingInquiriesCount))
      setNewInquiriesCount(0)
    }

    if (location.pathname.startsWith('/admin/payments')) {
      sessionStorage.setItem(SEEN_PAYMENT_KEY, String(pendingPaymentsCount))
      setNewPaymentsCount(0)
    }
  }, [location.pathname, pendingInquiriesCount, pendingPaymentsCount])

  const handleLogout = () => {
    localStorage.removeItem('authToken')
    localStorage.removeItem('user')
    sessionStorage.removeItem('redirectAfterLogin')
    sessionStorage.setItem('logoutFlash', 'Logout berhasil.')
    navigate('/', { replace: true })
  }

  const isActive = (path) => {
    return location.pathname === path ? 'active' : ''
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar bg="dark" variant="dark" className="shadow-sm">
        <Container fluid>
          <Navbar.Brand href="/admin/dashboard" className="d-flex align-items-center fw-bold gap-2">
            <img src={logo} alt="Samesta" className="h-8 w-auto" />
            <span>Samesta Admin</span>
          </Navbar.Brand>
          <Nav className="ms-auto">
            {newInquiriesCount > 0 && (
              <Nav.Item className="d-flex align-items-center me-3">
                <Badge bg="danger" pill>
                  {newInquiriesCount} Inquiry Baru
                </Badge>
              </Nav.Item>
            )}
            {newPaymentsCount > 0 && (
              <Nav.Item className="d-flex align-items-center me-3">
                <Badge bg="warning" text="dark" pill>
                  {newPaymentsCount} Pembayaran Baru
                </Badge>
              </Nav.Item>
            )}
            <Dropdown align="end">
              <Dropdown.Toggle variant="outline-light" id="admin-dropdown">
                👤 {adminUsername}
              </Dropdown.Toggle>
              <Dropdown.Menu>
                <Dropdown.Item onClick={handleLogout}>
                  Logout
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>
          </Nav>
        </Container>
      </Navbar>

      {/* Mobile quick nav */}
      <div className="lg:hidden border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2 px-3 py-3 text-sm">
          <Link 
            to="/admin/dashboard"
            className={`flex items-center gap-2 rounded-full px-3 py-2 font-semibold ${isActive('/admin/dashboard') ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-800'}`}
          >
            📊 Dashboard
          </Link>
          <Link 
            to="/admin/apartments"
            className={`flex items-center gap-2 rounded-full px-3 py-2 font-semibold ${isActive('/admin/apartments') ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-800'}`}
          >
            🏠 Apartemen
          </Link>
          <Link 
            to="/admin/inquiries"
            className={`flex items-center gap-2 rounded-full px-3 py-2 font-semibold ${isActive('/admin/inquiries') ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-800'}`}
          >
            📋 Inquiry
            {newInquiriesCount > 0 && (
              <Badge bg="danger" pill className="ms-1">
                {newInquiriesCount}
              </Badge>
            )}
          </Link>
          <Link 
            to="/admin/payments"
            className={`flex items-center gap-2 rounded-full px-3 py-2 font-semibold ${isActive('/admin/payments') ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-800'}`}
          >
            💳 Pembayaran
            {newPaymentsCount > 0 && (
              <Badge bg="warning" text="dark" pill className="ms-1">
                {newPaymentsCount}
              </Badge>
            )}
          </Link>
        </div>
      </div>

      <div className="flex min-h-[calc(100vh-64px)]">
        <div
          ref={sidebarRef}
          className={`hidden lg:block w-64 shrink-0 border-r border-slate-200 bg-white p-4 transition-shadow ${isSidebarNearby ? 'shadow-lg' : 'shadow-sm'}`}
        >
          <Nav className="flex-column gap-2">
            <Link 
              to="/admin/dashboard" 
              className={`flex items-center gap-3 rounded-xl px-3 py-2 text-slate-700 hover:bg-slate-100 ${isActive('/admin/dashboard') ? 'bg-slate-900 text-white' : ''}`}
            >
              <span className="text-lg">📊</span>
              Dashboard
            </Link>
            <Link 
              to="/admin/apartments" 
              className={`flex items-center gap-3 rounded-xl px-3 py-2 text-slate-700 hover:bg-slate-100 ${isActive('/admin/apartments') ? 'bg-slate-900 text-white' : ''}`}
            >
              <span className="text-lg">🏠</span>
              Kelola Apartemen
            </Link>
            <Link 
              to="/admin/inquiries" 
              className={`flex items-center gap-3 rounded-xl px-3 py-2 text-slate-700 hover:bg-slate-100 ${isActive('/admin/inquiries') ? 'bg-slate-900 text-white' : ''}`}
            >
              <span className="text-lg">📋</span>
              Kelola Inquiry
              {newInquiriesCount > 0 && (
                <Badge bg="danger" pill className="ms-2">
                  {newInquiriesCount}
                </Badge>
              )}
            </Link>
            <Link 
              to="/admin/payments" 
              className={`flex items-center gap-3 rounded-xl px-3 py-2 text-slate-700 hover:bg-slate-100 ${isActive('/admin/payments') ? 'bg-slate-900 text-white' : ''}`}
            >
              <span className="text-lg">💳</span>
              Kelola Pembayaran
              {newPaymentsCount > 0 && (
                <Badge bg="warning" text="dark" pill className="ms-2">
                  {newPaymentsCount}
                </Badge>
              )}
            </Link>
            <Link 
              to="/" 
              className="flex items-center gap-3 rounded-xl px-3 py-2 text-slate-700 hover:bg-slate-100"
              target="_blank"
            >
              <span className="text-lg">🌐</span>
              Lihat Website
            </Link>
          </Nav>
        </div>

        <div className="flex-1 p-4 lg:p-6">
          <Outlet />
        </div>
      </div>

      <ToastContainer position="bottom-end" className="p-3">
        <Toast bg="dark" onClose={() => setShowToast(false)} show={showToast} delay={4000} autohide>
          <Toast.Header closeButton={true}>
            <strong className="me-auto">{toastTitle || 'Notifikasi'}</strong>
            <small>Realtime</small>
          </Toast.Header>
          <Toast.Body className="text-white">{toastBody || 'Ada update baru.'}</Toast.Body>
        </Toast>
      </ToastContainer>
    </div>
  )
}

export default AdminDashboard
