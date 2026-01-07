import { useState } from 'react'
import { Navbar as BsNavbar, Nav, NavDropdown, Container } from 'react-bootstrap'
import { useNavigate, Link } from 'react-router-dom'
import logo from '../assets/samesta logo.png'
import { authAPI } from '../services/api'

const ADMIN_EMAILS = ['samestajakabaring@gmail.com']

const readStoredUser = () => {
  const userData = localStorage.getItem('user')
  if (!userData) return null
  try {
    const parsed = JSON.parse(userData)
    if (parsed && typeof parsed === 'object') return parsed
  } catch (err) {
    console.warn('Invalid user data in storage, clearing...', err)
  }
  localStorage.removeItem('user')
  return null
}

export default function Navbar() {
  const [expanded, setExpanded] = useState(false)
  const [user, setUser] = useState(() => readStoredUser())
  const navigate = useNavigate()

  const handleLogoClick = () => {
    setExpanded(false)
    navigate('/')
  }

  const isAdmin = (() => {
    if (!user) return false
    if (user.role === 'admin') return true
    if (user.email && ADMIN_EMAILS.includes(user.email.toLowerCase())) return true
    return false
  })()

  const handleLogout = async () => {
    try {
      await authAPI.logout()
    } catch (err) {
      console.error('Logout error:', err)
    } finally {
      // Clear session/state first, then show logout feedback modal (handled globally in App).
      localStorage.removeItem('authToken')
      localStorage.removeItem('user')
      sessionStorage.removeItem('redirectAfterLogin')
      sessionStorage.setItem('logoutFeedbackPending', '1')
      setUser(null)
      setExpanded(false)

      // Notify App to show the modal immediately (Navbar will unmount after auth is cleared).
      try {
        window.dispatchEvent(new Event('samesta:logout-success'))
      } catch {
        // ignore
      }
    }
  }

  return (
    <BsNavbar 
      expand="lg" 
      className="bg-white shadow-sm border-b border-slate-100" 
      sticky="top"
      expanded={expanded}
      onToggle={setExpanded}
    >
      <Container>
        <BsNavbar.Brand
          as={Link}
          to="/"
          onClick={handleLogoClick}
          className="mb-0 flex items-center gap-2"
          role="button"
        >
          <img
            src={logo}
            alt="Samesta"
            className="h-12 w-auto"
          />
        </BsNavbar.Brand>
        
        <BsNavbar.Toggle aria-controls="navbar-nav" />
        
        <BsNavbar.Collapse id="navbar-nav">
          <Nav className="me-auto">
            <NavDropdown title="Tipe Ruangan" id="room-types-dropdown">
              <NavDropdown.Item href="/room-type/studio">Studio</NavDropdown.Item>
              <NavDropdown.Item href="/room-type/2bedroom">2 Bedroom</NavDropdown.Item>
            </NavDropdown>
            {isAdmin && (
              <Nav.Link href="/admin/dashboard">Admin Dashboard</Nav.Link>
            )}
            
            {/* Mobile menu items */}
            {!user ? (
              <>
                <Nav.Link href="/login" className="text-slate-800 font-semibold lg:hidden">Login</Nav.Link>
                <Nav.Link href="/register" className="text-slate-800 font-semibold lg:hidden">Register</Nav.Link>
              </>
            ) : (
              <>
                <div className="px-2 py-2 text-slate-800 lg:hidden">
                  <div className="font-semibold">{user.name || 'User'}</div>
                  <div className="text-sm text-slate-500">{user.email || '-'}</div>
                  <div className="text-sm text-slate-500">{user.phone || user.telephone || '-'}</div>
                </div>
                {isAdmin && (
                  <Nav.Link href="/admin/dashboard" className="text-slate-800 font-semibold lg:hidden">Admin Dashboard</Nav.Link>
                )}
                <Nav.Link onClick={handleLogout} className="text-slate-800 font-semibold lg:hidden">Logout</Nav.Link>
              </>
            )}
          </Nav>
          
          {/* Desktop menu */}
          <div className="hidden lg:flex items-center gap-3">
            {!user ? (
              <>
                <Nav.Link href="/login" className="text-slate-800 font-semibold">Login</Nav.Link>
                <span className="text-slate-400">|</span>
                <Nav.Link href="/register" className="text-slate-800 font-semibold">Register</Nav.Link>
              </>
            ) : (
              <NavDropdown
                title={<span className="text-slate-800 font-semibold">👤 {user.name || 'User'}</span>}
                id="profile-dropdown"
                align="end"
              >
                <div className="px-3 py-2">
                  <div className="font-semibold">{user.name || 'User'}</div>
                  <div className="text-sm text-slate-500">{user.email || '-'}</div>
                  <div className="text-sm text-slate-500">{user.phone || user.telephone || '-'}</div>
                </div>
                <NavDropdown.Divider />
                {isAdmin && <NavDropdown.Item href="/admin/dashboard">Admin Dashboard</NavDropdown.Item>}
                {isAdmin && <NavDropdown.Divider />}
                <NavDropdown.Item href="/inquiry">My Inquiries</NavDropdown.Item>
                <NavDropdown.Item href="/payments">Buat Pembayaran</NavDropdown.Item>
                <NavDropdown.Item href="/payment-history">Riwayat Pembayaran</NavDropdown.Item>
                <NavDropdown.Divider />
                <NavDropdown.Item onClick={handleLogout} className="text-red-600 font-semibold">
                  Logout
                </NavDropdown.Item>
              </NavDropdown>
            )}
          </div>
        </BsNavbar.Collapse>
      </Container>
    </BsNavbar>
  )
}
