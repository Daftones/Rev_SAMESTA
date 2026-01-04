import { useState, useEffect, useRef } from 'react'
import { useNavigate, Outlet, Link, useLocation } from 'react-router-dom'
import { Container, Navbar, Nav, Dropdown, Badge, Toast, ToastContainer } from 'react-bootstrap'
import logo from '../assets/samesta logo.png'

const ADMIN_EMAILS = ['samestajakabaring@gmail.com']

function AdminDashboard() {
  const navigate = useNavigate()
  const location = useLocation()
  const [adminUsername, setAdminUsername] = useState('')
  const [newInquiriesCount, setNewInquiriesCount] = useState(0)
  const [isSidebarNearby, setIsSidebarNearby] = useState(false)
  const [showToast, setShowToast] = useState(false)
  const [toastCount, setToastCount] = useState(0)
  const sidebarRef = useRef(null)

  useEffect(() => {
    const token = localStorage.getItem('authToken')
    const userStr = localStorage.getItem('user')

    let user = null
    if (userStr) {
      try {
        const parsed = JSON.parse(userStr)
        if (parsed && typeof parsed === 'object') {
          user = parsed
        }
      } catch (err) {
        console.warn('Invalid stored user, clearing...', err)
        localStorage.removeItem('user')
      }
    }

    const isAdminByRole = user?.role === 'admin'
    const isAdminByEmail = user?.email && ADMIN_EMAILS.includes(user.email.toLowerCase())

    if (!token || !user || (!isAdminByRole && !isAdminByEmail)) {
      navigate('/login', { replace: true })
    } else {
      setAdminUsername(user.name || 'Admin')
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

  // Count new/pending inquiries
  useEffect(() => {
    const countPendingInquiries = () => {
      const savedInquiries = localStorage.getItem('inquiries')
      if (savedInquiries) {
        const inquiries = JSON.parse(savedInquiries)
        const pendingCount = inquiries.filter(inq => ['pending', 'sent'].includes(inq.status)).length
        setNewInquiriesCount((prev) => {
          if (pendingCount > prev) {
            setToastCount(pendingCount - prev)
            setShowToast(true)
          }
          return pendingCount
        })
      }
    }

    countPendingInquiries()
    
    // Set up interval to check for new inquiries every 5 seconds
    const interval = setInterval(countPendingInquiries, 5000)
    
    return () => clearInterval(interval)
  }, [location.pathname])

  const handleLogout = () => {
    localStorage.removeItem('authToken')
    localStorage.removeItem('user')
    navigate('/login', { replace: true })
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
            <strong className="me-auto">Inquiry Baru</strong>
            <small>Realtime</small>
          </Toast.Header>
          <Toast.Body className="text-white">{toastCount} inquiry baru menunggu review.</Toast.Body>
        </Toast>
      </ToastContainer>
    </div>
  )
}

export default AdminDashboard
