import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Alert, Badge, Button, Card, Container, Spinner } from 'react-bootstrap'
import Navbar from '../components/Navbar'
import { paymentsAPI } from '../services/api'

function PaymentDetail() {
  const navigate = useNavigate()
  const { id } = useParams()

  const [currentUserId, setCurrentUserId] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [syncError, setSyncError] = useState('')
  const [payment, setPayment] = useState(null)

  const getErrorMessage = (err, fallback) => {
    const data = err?.response?.data
    if (!data) return err?.message || fallback
    if (typeof data === 'string') return data
    if (typeof data?.message === 'string' && data.message.trim() !== '') return data.message
    return fallback
  }

  const sameId = (a, b) => String(a ?? '') === String(b ?? '')

  const getPaymentsCacheKey = (uid) => `paymentsCache:user:${String(uid || '')}`

  const statusMeta = useMemo(
    () => ({
      pending: { label: 'Pending', variant: 'warning' },
      waiting_verification: { label: 'Menunggu Verifikasi', variant: 'info' },
      confirmed: { label: 'Terverifikasi', variant: 'success' },
      rejected: { label: 'Ditolak', variant: 'danger' },
      expired: { label: 'Kedaluwarsa', variant: 'secondary' },
    }),
    []
  )

  const getAssetBase = () => (import.meta.env.VITE_API_BASE_URL || '').replace(/\/?api\/?$/, '')

  const buildAssetCandidates = (path) => {
    if (!path || typeof path !== 'string') return []
    const trimmed = path.trim()
    if (!trimmed) return []
    if (trimmed.startsWith('data:')) return [trimmed]
    if (trimmed.startsWith('http')) return [trimmed]

    const base = getAssetBase()
    const withoutLeadingSlash = trimmed.replace(/^\/+/, '')

    const candidates = []
    // Direct join (for public paths like uploads/..)
    candidates.push(`${base}/${withoutLeadingSlash}`)

    // Laravel public disk often stores as public/... but serves as /storage/...
    if (withoutLeadingSlash.startsWith('public/')) {
      candidates.unshift(`${base}/storage/${withoutLeadingSlash.slice('public/'.length)}`)
    }

    // If already storage/... keep it
    if (withoutLeadingSlash.startsWith('storage/')) {
      candidates.unshift(`${base}/${withoutLeadingSlash}`)
    }

    // Heuristic fallback: try /storage/<path>
    if (!withoutLeadingSlash.startsWith('storage/')) {
      candidates.push(`${base}/storage/${withoutLeadingSlash}`)
    }

    // If original had leading slash, also try base+original
    if (trimmed.startsWith('/')) {
      candidates.unshift(`${base}${trimmed}`)
    }

    return Array.from(new Set(candidates))
  }

  const normalizePayment = (raw) => {
    if (!raw || typeof raw !== 'object') return null
    if (!raw.payment_id) return null

    const proofList = Array.isArray(raw.proof) ? raw.proof : []
    const proofCandidates = proofList
      .filter((p) => typeof p === 'string' && p.trim() !== '')
      .map((p) => buildAssetCandidates(p))
      .filter((cands) => cands.length > 0)

    return {
      payment_id: String(raw.payment_id),
      inquiry_id: String(raw.inquiry_id || ''),
      user_id: String(raw.user_id || ''),
      status: String(raw.status || 'pending').toLowerCase(),
      expired_at: raw.expired_at || null,
      verified_at: raw.verified_at || null,
      created_at: raw.created_at || null,
      updated_at: raw.updated_at || null,
      proof: proofList,
      proofCandidates,
      inquiry: raw.inquiry || null,
    }
  }

  const formatDate = (value) => {
    if (!value) return '-'
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return '-'
    return d.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })
  }

  const renderStatus = (status) => {
    const meta = statusMeta[status] || { label: status || 'Unknown', variant: 'secondary' }
    return <Badge bg={meta.variant}>{meta.label}</Badge>
  }

  useEffect(() => {
    const token = localStorage.getItem('authToken')
    const storedUser = localStorage.getItem('user')
    if (!token || !storedUser) {
      sessionStorage.setItem('redirectAfterLogin', `/payments/${encodeURIComponent(id || '')}`)
      navigate('/login', { replace: true })
      return
    }

    try {
      const parsed = JSON.parse(storedUser)
      const uid = parsed?.id || parsed?.user_id || parsed?.customer_id || parsed?.customerId || ''
      setCurrentUserId(uid)
    } catch {
      navigate('/login', { replace: true })
    }
  }, [navigate, id])

  useEffect(() => {
    if (!id || !currentUserId) return

    // Try cached list first (so detail still works if backend is unstable).
    try {
      const cached = localStorage.getItem(getPaymentsCacheKey(currentUserId))
      const parsed = cached ? JSON.parse(cached) : null
      if (Array.isArray(parsed)) {
        const foundCached = parsed
          .map(normalizePayment)
          .filter(Boolean)
          .find((p) => String(p.payment_id) === String(id))

        if (foundCached && sameId(foundCached.user_id, currentUserId)) {
          setPayment(foundCached)
        }
      }
    } catch (err) {
      console.warn('Failed to read cached payment detail', err)
    }

    const load = async () => {
      setLoading(true)
      setError('')
      setSyncError('')
      try {
        // Backend GET /payment/{id} is not reliable (controller loads a non-existent relation).
        // Load from list endpoint and select locally.
        const res = await paymentsAPI.getAll({ user_id: currentUserId })
        const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : []

        const normalizedAll = list
          .map(normalizePayment)
          .filter(Boolean)

        const normalized = normalizedAll.filter((p) => sameId(p.user_id || '', currentUserId))

        try {
          // Cache only the user-owned normalized payments to prevent cross-user leakage.
          localStorage.setItem(getPaymentsCacheKey(currentUserId), JSON.stringify(normalized))
        } catch {
          // ignore
        }

        const found = normalized.find((p) => String(p.payment_id) === String(id)) || null

        if (!found) {
          setPayment(null)
          setError('Payment not found.')
        } else {
          setPayment(found)
        }
      } catch (err) {
        console.error('Failed to load payment detail', err)
        if (payment) {
          setSyncError(`Gagal sinkronisasi detail: ${getErrorMessage(err, 'Gagal memuat detail pembayaran. Coba lagi.')}. Menampilkan data terakhir.`)
        } else {
          setError('Gagal memuat detail pembayaran. Coba lagi.')
        }
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [id, currentUserId])

  return (
    <>
      <Navbar />
      <div className="bg-slate-50 min-h-screen">
        <Container className="py-5 px-3">
          <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
            <div>
              <h2 className="fw-bold mb-1">Detail Pembayaran</h2>
              <div className="text-muted small">Payment ID: {id}</div>
            </div>
            <Button variant="outline-secondary" onClick={() => navigate(-1)}>
              Kembali
            </Button>
          </div>

          {error && <Alert variant="warning">{error}</Alert>}
          {syncError && <Alert variant="warning">{syncError}</Alert>}

          {loading ? (
            <div className="d-flex justify-content-center py-5 text-muted align-items-center gap-2">
              <Spinner animation="border" size="sm" /> Memuat detail...
            </div>
          ) : payment ? (
            <Card className="rounded-2xl border border-slate-200 shadow-sm">
              <Card.Body className="d-flex flex-column gap-2">
                <div className="d-flex justify-content-between align-items-start">
                  <div>
                    <div className="text-muted small">Status</div>
                    <div className="fw-semibold">{renderStatus(payment.status)}</div>
                  </div>
                </div>

                <div className="text-muted small">Inquiry ID: <span className="text-slate-800 fw-semibold">{payment.inquiry_id || '-'}</span></div>
                <div className="text-muted small">Dibuat: <span className="text-slate-800">{formatDate(payment.created_at)}</span></div>
                <div className="text-muted small">Diperbarui: <span className="text-slate-800">{formatDate(payment.updated_at)}</span></div>
                <div className="text-muted small">Expired: <span className="text-slate-800">{formatDate(payment.expired_at)}</span></div>
                <div className="text-muted small">Diverifikasi: <span className="text-slate-800">{formatDate(payment.verified_at)}</span></div>

                <div className="mt-2">
                  <div className="fw-semibold mb-2">Bukti Pembayaran</div>
                  {Array.isArray(payment.proofCandidates) && payment.proofCandidates.length > 0 ? (
                    <div className="d-flex flex-column gap-3">
                      {payment.proofCandidates.map((cands, idx) => (
                        <div key={idx} className="rounded-2xl border border-slate-200 bg-white p-2">
                          <div className="d-flex justify-content-between align-items-center gap-2 mb-2">
                            <div className="fw-semibold">Bukti {idx + 1}</div>
                            <Button as="a" href={cands[0]} target="_blank" rel="noreferrer" variant="outline-secondary" size="sm">
                              Buka
                            </Button>
                          </div>
                          <img
                            src={cands[0]}
                            alt={`Bukti pembayaran ${idx + 1}`}
                            className="img-fluid rounded"
                            style={{ maxHeight: '22.5rem', width: '100%', objectFit: 'contain' }}
                            onError={(e) => {
                              const current = e.currentTarget.getAttribute('src')
                              const next = cands.find((u) => u !== current)
                              if (next) e.currentTarget.setAttribute('src', next)
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-muted">Tidak ada bukti.</div>
                  )}
                </div>
              </Card.Body>
            </Card>
          ) : null}
        </Container>
      </div>
    </>
  )
}

export default PaymentDetail
