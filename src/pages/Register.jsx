import { useState } from 'react'
import { Form, Button, Row, Col, Alert, Spinner, InputGroup } from 'react-bootstrap'
import { useNavigate } from 'react-router-dom'
import logo from '../assets/samesta logo.png'
import { authAPI } from '../services/api'

const normalizeUser = (user, defaultRole = 'user') => {
  if (!user || typeof user !== 'object') return null

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
    ... user,
    ...(user.id ? null : (idCandidate ? { id: idCandidate } : null)),
    role: user.role || defaultRole,
  }
}

const toBahasaRegisterError = (msg) => {
  if (!msg) return ''
  const lower = String(msg).toLowerCase()
  if (lower.includes('password') && lower.includes('match')) {
    return 'Password dan konfirmasi password tidak cocok.'
  }
  if (lower.includes('invalid') || lower.includes('email')) {
    return 'Format email tidak valid atau sudah terpakai.'
  }
  if (lower.includes('required') || lower.includes('field')) {
    return 'Mohon lengkapi semua kolom yang diperlukan.'
  }
  if (lower.includes('server') || lower.includes('internal')) {
    return 'Terjadi kesalahan pada server. Silakan coba lagi.'
  }
  return msg
}

const saveUserToStorage = (user) => {
  const normalized = normalizeUser(user)
  if (normalized) {
    localStorage.setItem('user', JSON.stringify(normalized))
  } else {
    localStorage.removeItem('user')
  }
}

function Register() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (formData.password !== formData.confirmPassword) {
      setError('Password dan Konfirmasi Password tidak cocok!')
      return
    }

    setLoading(true)

    try {
      // Register user
      const registerData = {
        name: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        password_confirmation: formData.confirmPassword
      }

      const response = await authAPI.register(registerData)

      const token = response?.token || response?.data?.token
      if (token) {
        localStorage.setItem('authToken', token)
      } else {
        localStorage.removeItem('authToken')
      }

      saveUserToStorage(response?.user || response?.data?.user)

      // Redirect to homepage
      navigate('/')
    } catch (err) {
      console.error('Register error:', err)
      if (err.response?.data?.errors) {
        // Laravel validation errors
        const errors = err.response.data.errors
        const errorMessages = Object.values(errors).flat().join(', ')
        setError(toBahasaRegisterError(errorMessages))
      } else {
        setError(toBahasaRegisterError(err.response?.data?.message) || 'Registrasi gagal. Silakan coba lagi.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-md">
        <div className="mb-4 flex justify-center">
          <img src={logo} alt="Samesta Logo" className="h-16 w-auto" />
        </div>

        <h2 className="text-2xl font-bold text-slate-900 text-center">Buat Akun Baru</h2>
        <p className="text-center text-slate-600 mb-4">Daftar untuk mengakses semua layanan Samesta Living</p>

        {error && (
          <Alert variant="danger" dismissible onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        <Form onSubmit={handleSubmit} className="space-y-3">
          <Form.Group>
            <Form.Label>Nama Lengkap</Form.Label>
            <Form.Control
              type="text"
              name="fullName"
              placeholder="Masukkan nama lengkap Anda"
              value={formData.fullName}
              onChange={handleChange}
              required
              disabled={loading}
              className="rounded-xl"
            />
          </Form.Group>

          <Row>
            <Col md={6}>
              <Form.Group className="mb-3 mb-md-0">
                <Form.Label>Email</Form.Label>
                <Form.Control
                  type="email"
                  name="email"
                  placeholder="email@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  disabled={loading}
                  className="rounded-xl"
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label>No. Telepon</Form.Label>
                <Form.Control
                  type="tel"
                  name="phone"
                  placeholder="08xxxxxxxxxx"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                  disabled={loading}
                  className="rounded-xl"
                />
              </Form.Group>
            </Col>
          </Row>

          <Row>
            <Col md={6}>
              <Form.Group className="mb-3 mb-md-0">
                <Form.Label>Password</Form.Label>
                <InputGroup>
                  <Form.Control
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    placeholder="Minimal 8 karakter"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    minLength={8}
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
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label>Konfirmasi Password</Form.Label>
                <InputGroup>
                  <Form.Control
                    type={showConfirmPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    placeholder="Ulangi password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                    minLength={8}
                    disabled={loading}
                    className="rounded-l-xl"
                  />
                  <Button
                    variant="outline-secondary"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    disabled={loading}
                    className="rounded-r-xl"
                  >
                    <i className={`bi bi-eye${showConfirmPassword ? '-slash' : ''}`}></i>
                  </Button>
                </InputGroup>
              </Form.Group>
            </Col>
          </Row>

          <Form.Group className="mb-2">
            <Form.Check
              type="checkbox"
              label={
                <span>
                  Saya setuju dengan <a href="#" className="font-semibold text-slate-900 hover:underline">Syarat & Ketentuan</a> dan{' '}
                  <a href="#" className="font-semibold text-slate-900 hover:underline">Kebijakan Privasi</a>
                </span>
              }
              required
              disabled={loading}
            />
          </Form.Group>

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
                Mendaftar...
              </>
            ) : (
              'Daftar Sekarang'
            )}
          </Button>

          <div className="text-center text-sm text-slate-600">
            <span>Sudah punya akun? </span>
            <a href="/login" className="font-semibold text-slate-900 hover:underline">
              Masuk di sini
            </a>
          </div>
        </Form>
      </div>
    </div>
  )
}

export default Register
