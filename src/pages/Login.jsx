import { useEffect, useState } from 'react'
import { Form, Button, Alert, Spinner, InputGroup } from 'react-bootstrap'
import { useNavigate } from 'react-router-dom'
import logo from '../assets/samesta logo.png'
import { authAPI } from '../services/api'

const ADMIN_EMAILS = ['samestajakabaring@gmail.com']

const toBahasaLoginError = (msg) => {
  if (!msg) return ''
  const lower = String(msg).toLowerCase()
  if (lower.includes('invalid') || lower.includes('unauthorized') || lower.includes('credential')) {
    return 'Email atau password salah. Silakan coba lagi.'
  }
  if (lower.includes('required') || lower.includes('field')) {
    return 'Mohon lengkapi semua kolom yang diperlukan.'
  }
  if (lower.includes('server') || lower.includes('internal')) {
    return 'Terjadi kesalahan pada server. Silakan coba lagi.'
  }
  return msg
}

const deriveRole = (user, defaultRole) => {
  if (!user || typeof user !== 'object') return defaultRole
  // Force admin if email allowlisted, regardless of backend role field
  if (user.email && ADMIN_EMAILS.includes(user.email.toLowerCase())) return 'admin'
  if (user.role || user.level || user.type) return user.role || user.level || user.type
  return defaultRole
}

const normalizeUser = (user, defaultRole = 'user') => {
  if (!user || typeof user !== 'object') return null
  const role = deriveRole(user, defaultRole)

  const idCandidate =
    user.nik ??
    user.NIK ??
    user.no_ktp ??
    user.noKtp ??
    user.id ??
    user.user_id ??
    user.userId ??
    user.customer_id ??
    user.customerId ??
    user.uuid ??
    ''

  return {
    ...user,
    // Ensure a stable id field exists for pages that expect `user.id`
    ...(user.id ? null : (idCandidate ? { id: idCandidate } : null)),
    role,
  }
}

const saveUserToStorage = (user) => {
  const normalized = normalizeUser(user)
  if (normalized) {
    localStorage.setItem('user', JSON.stringify(normalized))
  } else {
    localStorage.removeItem('user')
  }
  return normalized
}

function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [flash, setFlash] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const msg = sessionStorage.getItem('logoutFlash')
    if (msg) {
      setFlash(String(msg))
      sessionStorage.removeItem('logoutFlash')
    }
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    setError('')
    setLoading(true)

    // Clear stale session to avoid mixing tokens between accounts
    localStorage.removeItem('authToken')
    localStorage.removeItem('user')

    console.log('=== LOGIN ATTEMPT ===')
    console.log('Email:', email)
    console.log('Password length:', password.length)

    try {
      const loginResponse = await authAPI.login(email, password)
      console.log('✅ Login response:', loginResponse)

          const token = loginResponse?.token || loginResponse?.data?.token
      if (token) {
        localStorage.setItem('authToken', token)
      } else {
        localStorage.removeItem('authToken')
        setLoading(false)
        setError('Login gagal: server tidak mengembalikan token.')
        return
      }

      let userData = null
      try {
        console.log('📡 Fetching user profile...')
        const userResponse = await authAPI.getProfile()
        console.log('✅ User profile response:', userResponse)
        // authAPI.getProfile() returns axios `data`, but backend shapes vary
        userData = userResponse?.user || userResponse?.data?.user || userResponse?.data || userResponse
      } catch (userErr) {
        console.warn('⚠️ Failed to fetch user profile, using login data:', userErr)
        // Backend login responses vary widely; try common shapes
        userData =
          loginResponse?.user ||
          loginResponse?.data?.user ||
          loginResponse?.data?.data?.user ||
          loginResponse?.data ||
          null
      }

      // Ensure email is set for allowlist matching
      let userWithEmail = userData && typeof userData === 'object'
        ? { ...userData, email: userData.email || email }
        : null

      // Minimal fallback if backend doesn't return user object
      if (!userWithEmail) {
        userWithEmail = {
          email,
          name: email?.split('@')?.[0] || 'User',
          role: 'user',
        }
      }

      const normalizedUser = saveUserToStorage(userWithEmail)
      console.log('💾 User data saved to localStorage')

      // Check if there's a redirect path saved (e.g., from inquiry page)
      const redirectPath = sessionStorage.getItem('redirectAfterLogin')
      if (redirectPath) {
        sessionStorage.removeItem('redirectAfterLogin')
        console.log('🚀 Redirecting to saved path:', redirectPath)
        navigate(redirectPath, { replace: true })
        return
      }

      const role = normalizedUser?.role
      if (role === 'admin') {
        console.log('🚀 Navigating to admin dashboard...')
        navigate('/admin/dashboard', { replace: true })
      } else {
        console.log('🚀 Navigating to home...')
        navigate('/', { replace: true })
      }
      console.log('✅ Navigation complete')
    } catch (err) {
      console.error('❌ LOGIN ERROR:', err)
      console.error('📦 Error response:', err.response)
      console.error('📦 Error data:', err.response?.data)
      console.error('📦 Error status:', err.response?.status)
      
      // Handle different error scenarios
      if (err.response) {
        const errorData = err.response.data
        
        // Check for validation errors (Laravel format)
        if (errorData.errors) {
          const validationErrors = Object.values(errorData.errors).flat()
          setError(toBahasaLoginError(validationErrors.join(', ')))
        } 
        // Check for general message
        else if (errorData.message) {
          setError(toBahasaLoginError(errorData.message))
        }
        // Check for error field
        else if (errorData.error) {
          setError(toBahasaLoginError(errorData.error))
        }
        // Status-based messages
        else if (err.response.status === 401) {
          setError('Email atau password salah. Silakan coba lagi.')
        } else if (err.response.status === 422) {
          setError('Data yang Anda masukkan tidak valid. Periksa kembali email dan password.')
        } else {
          setError('Login gagal. Silakan coba lagi.')
        }
      } else if (err.request) {
        setError('Tidak dapat terhubung ke server. Periksa koneksi internet Anda.')
      } else {
        setError('Terjadi kesalahan. Silakan coba lagi.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-md">
        <div className="mb-4 flex justify-center">
          <img src={logo} alt="Samesta Logo" className="h-16 w-auto" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 text-center">Selamat Datang Kembali</h2>
        <p className="text-center text-slate-600 mb-4">Masuk ke akun Samesta Living Anda</p>

        {error && (
          <Alert variant="danger" dismissible onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {flash && (
          <Alert variant="success" dismissible onClose={() => setFlash('')}>
            {flash}
          </Alert>
        )}

        <Form onSubmit={handleSubmit} className="space-y-3">
          <Form.Group>
            <Form.Label>Email</Form.Label>
            <Form.Control
              type="email"
              placeholder="Masukkan email Anda"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              className="rounded-xl"
            />
          </Form.Group>

          <Form.Group>
            <Form.Label>Password</Form.Label>
            <InputGroup>
              <Form.Control
                type={showPassword ? 'text' : 'password'}
                placeholder="Masukkan password Anda"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                className="rounded-l-xl"
              />
              <Button
                variant="outline-secondary"
                onClick={() => setShowPassword(!showPassword)}
                disabled={loading}
                className="rounded-r-xl"
              >
                <i className={`bi bi-eye${showPassword ? '-slash' : ''}`}></i>
              </Button>
            </InputGroup>
          </Form.Group>

          <div className="flex items-center justify-between">
            <Form.Check type="checkbox" label="Ingat Saya" />
            <a href="#" className="text-sm text-slate-600 hover:text-slate-900">Lupa Password?</a>
          </div>

          <Button type="submit" className="w-100 rounded-full bg-slate-900 py-3 font-semibold" disabled={loading}>
            {loading ? (
              <>
                <Spinner
                  as="span"
                  animation="border"
                  size="sm"
                  role="status"
                  aria-hidden="true"
                  className="me-2"
                />
                Memproses...
              </>
            ) : (
              'Masuk'
            )}
          </Button>

          <div className="text-center text-sm text-slate-600">
            <span>Belum punya akun? </span>
            <a href="/register" className="font-semibold text-slate-900 hover:underline">
              Daftar Sekarang
            </a>
          </div>
        </Form>
      </div>
    </div>
  )
}

export default Login
