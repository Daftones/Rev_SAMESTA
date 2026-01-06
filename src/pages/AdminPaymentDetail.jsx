import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Alert, Badge, Button, Card, Container, Spinner } from 'react-bootstrap'
import { paymentsAPI } from '../services/api'

function AdminPaymentDetail() {
  const navigate = useNavigate()
  const { id } = useParams()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [syncError, setSyncError] = useState('')
  const [payment, setPayment] = useState(null)
  const [updating, setUpdating] = useState(false)

  const getErrorMessage = (err, fallback) => {
    const data = err?.response?.data
    if (!data) return err?.message || fallback
    if (typeof data === 'string') return data
    if (typeof data?.message === 'string' && data.message.trim() !== '') return data.message
    return fallback
  }

  const PAYMENTS_CACHE_KEY = 'paymentsCache:admin'

  const statusMeta = useMemo(
    () => ({
      pending: { label: 'Pending', variant: 'warning' },
      waiting_verification: { label: 'Menunggu Verifikasi', variant: 'info' },
      confirmed: { label: 'Terverifikasi', variant: 'success' },
      rejected: { label: 'Ditolak', variant: 'danger' },
      expired: { label: 'Expired', variant: 'secondary' },
    }),
    []
  )

  const getAssetBase = () => (import.meta.env.VITE_API_BASE_URL || '').replace(/\/?api\/?$/, '')

  const buildAssetCandidates = (path) => {
    if (!path || typeof path !== 'string') return []
    const trimmed = path.trim()
    if (!trimmed) return []
    if (trimmed.startsWith('data:')) return [trimmed]
    
    // If already a full URL, ensure HTTPS
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return [trimmed.replace(/^http:\/\//i, 'https://')]
    }

    const base = getAssetBase().replace(/^http:\/\//i, 'https://')
    const withoutLeadingSlash = trimmed.replace(/^\/+/, '')

    const candidates = []
    candidates.push(`${base}/${withoutLeadingSlash}`)

    if (withoutLeadingSlash.startsWith('public/')) {
      candidates.unshift(`${base}/storage/${withoutLeadingSlash.slice('public/'.length)}`)
    }

    if (withoutLeadingSlash.startsWith('storage/')) {
      candidates.unshift(`${base}/${withoutLeadingSlash}`)
    }

    if (!withoutLeadingSlash.startsWith('storage/')) {
      candidates.push(`${base}/storage/${withoutLeadingSlash}`)
    }

    if (trimmed.startsWith('/')) {
      candidates.unshift(`${base}${trimmed}`)
    }

    // Ensure all candidates use HTTPS
    return Array.from(new Set(candidates)).map(url => url.replace(/^http:\/\//i, 'https://'))
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
      user_id: String(raw.user_id || ''),
      status: String(raw.status || 'pending').toLowerCase(),
      expired_at: raw.expired_at || null,
      verified_at: raw.verified_at || null,
      created_at: raw.created_at || null,
      updated_at: raw.updated_at || null,
      proof: proofList,
      proofCandidates,
      user: raw.user || null,
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

  const load = async () => {
    if (!id) return

    // Try cached list first (so detail still works if backend is unstable).
    try {
      const cached = localStorage.getItem(PAYMENTS_CACHE_KEY)
      const parsed = cached ? JSON.parse(cached) : null
      if (Array.isArray(parsed)) {
        const foundCached = parsed.map(normalizePayment).filter(Boolean).find((p) => String(p.payment_id) === String(id))
        if (foundCached) setPayment(foundCached)
      }
    } catch (err) {
      console.warn('Failed to read cached admin payment detail', err)
    }

    setLoading(true)
    setError('')
    setSyncError('')
    try {
      // Backend GET /payment/{id} is not reliable (controller loads a non-existent relation).
      // Load from list endpoint and select locally.
      const list = await paymentsAPI.getAll({ limit: 200 })
      const normalized = list.map(normalizePayment).filter(Boolean)
      try {
        localStorage.setItem(PAYMENTS_CACHE_KEY, JSON.stringify(list))
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
      console.error('Failed to load admin payment detail', err)
      if (payment) {
        setSyncError(`Gagal sinkronisasi detail: ${getErrorMessage(err, 'Gagal memuat detail pembayaran. Coba lagi.')}. Menampilkan data terakhir.`)
      } else {
        setError('Gagal memuat detail pembayaran. Coba lagi.')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const token = localStorage.getItem('authToken')
    if (!token) {
      sessionStorage.setItem('redirectAfterLogin', `/admin/payments/${encodeURIComponent(id || '')}`)
      navigate('/admin/login', { replace: true })
      return
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const updateStatus = async (status) => {
    if (!payment?.payment_id) return
    setUpdating(true)
    setError('')
    try {
      const s = String(status || '').trim().toLowerCase()
      const normalizedStatus = (s === 'approved' || s === 'paid' || s === 'success' || s === 'settled')
        ? 'confirmed'
        : (s === 'failed' || s === 'cancelled')
          ? 'rejected'
          : (s === 'awaiting' || s === 'awaiting_payment')
            ? 'waiting_verification'
            : s

      await paymentsAPI.updateStatus(payment.payment_id, normalizedStatus)
      await load()
    } catch (err) {
      console.error('Failed to update status', err)
      setError('Tidak dapat memperbarui status pembayaran. Coba lagi.')
    } finally {
      setUpdating(false)
    }
  }

  return (
    <div className="bg-slate-50 min-h-screen">
      <Container className="py-4 px-3">
        <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
          <div>
            <h2 className="fw-bold mb-1">Detail Pembayaran (Admin)</h2>
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
          <div className="d-flex flex-column gap-3">
            <Card className="rounded-2xl border border-slate-200 shadow-sm">
              <Card.Body>
                <div className="d-flex justify-content-between align-items-start flex-wrap gap-2">
                  <div>
                    <div className="text-muted small">Status</div>
                    <div className="fw-semibold">{renderStatus(payment.status)}</div>
                  </div>
                </div>

                <div className="mt-2 text-muted small">Payment ID (Full): <span className="text-slate-800 fw-semibold font-monospace">{payment.payment_id || id}</span></div>
                <div className="text-muted small">User ID: <span className="text-slate-800 fw-semibold">{payment.user_id || '-'}</span></div>
                <div className="text-muted small">Dibuat: <span className="text-slate-800">{formatDate(payment.created_at)}</span></div>
                <div className="text-muted small">Diperbarui: <span className="text-slate-800">{formatDate(payment.updated_at)}</span></div>
                <div className="text-muted small">Expired: <span className="text-slate-800">{formatDate(payment.expired_at)}</span></div>
                <div className="text-muted small">Diverifikasi: <span className="text-slate-800">{formatDate(payment.verified_at)}</span></div>
              </Card.Body>
            </Card>

            <Card className="rounded-2xl border border-slate-200 shadow-sm">
              <Card.Body>
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
                          crossOrigin="anonymous"
                          loading="lazy"
                          onError={(e) => {
                            const current = e.currentTarget.getAttribute('src')
                            const next = cands.find((u) => u !== current)
                            if (next) {
                              e.currentTarget.setAttribute('src', next)
                            } else {
                              console.error('Failed to load all image candidates:', cands)
                            }
                          }}
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-muted">Tidak ada bukti.</div>
                )}
              </Card.Body>
            </Card>

            <Card className="rounded-2xl border border-slate-200 shadow-sm">
              <Card.Body>
                <div className="fw-semibold mb-2">Verifikasi Pembayaran</div>
                <div className="d-flex flex-wrap gap-2">
                  <Button variant="warning" disabled={updating} onClick={() => updateStatus('pending')}>
                    Pending
                  </Button>
                  <Button variant="info" disabled={updating} onClick={() => updateStatus('waiting_verification')}>
                    Menunggu Verifikasi
                  </Button>
                  <Button variant="success" disabled={updating} onClick={() => updateStatus('confirmed')}>
                    Konfirmasi
                  </Button>
                  <Button variant="danger" disabled={updating} onClick={() => updateStatus('rejected')}>
                    Tolak
                  </Button>
                </div>
              </Card.Body>
            </Card>
          </div>
        ) : null}
      </Container>
    </div>
  )
}

export default AdminPaymentDetail
