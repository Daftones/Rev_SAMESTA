import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Alert, Badge, Button, Card, Container, Spinner } from 'react-bootstrap'
import { paymentsAPI } from '../services/api'

function AdminPaymentDetail() {
  const navigate = useNavigate()
  const { id } = useParams()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [payment, setPayment] = useState(null)
  const [updating, setUpdating] = useState(false)

  const statusMeta = useMemo(() => ({
    pending: { label: 'Pending', variant: 'warning' },
    waiting_verification: { label: 'Menunggu Verifikasi', variant: 'info' },
    confirmed: { label: 'Terverifikasi', variant: 'success' },
    rejected: { label: 'Ditolak', variant: 'danger' },
    expired: { label: 'Expired', variant: 'secondary' },
  }), [])

  const renderStatus = (status) => {
    const meta = statusMeta[status] || { label: status || 'Unknown', variant: 'secondary' }
    return <Badge bg={meta.variant}>{meta.label}</Badge>
  }

  const formatDate = (value) => {
    if (!value) return '-'
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return '-'
    return d.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })
  }

  // ==========================
  // 🔧 NORMALIZE PAYMENT (FIX UTAMA)
  // ==========================
  const normalizePayment = (raw) => {
    if (!raw || typeof raw !== 'object') return null
    if (!raw.payment_id) return null

    return {
      payment_id: String(raw.payment_id),
      user_id: String(raw.user_id || ''),
      payment_method: String(raw.payment_method || '').toLowerCase(), // 🔥 FIX
      status: String(raw.status || 'pending').toLowerCase(),
      proof: Array.isArray(raw.proof) ? raw.proof : [],
      created_at: raw.created_at || null,
      updated_at: raw.updated_at || null,
      expired_at: raw.expired_at || null,
      verified_at: raw.verified_at || null,
    }
  }

  // ==========================
  // 📥 LOAD DATA
  // ==========================
  const load = async () => {
    if (!id) return
    setLoading(true)
    setError('')
    try {
      const list = await paymentsAPI.getAll({ limit: 200 })
      const normalized = list.map(normalizePayment).filter(Boolean)
      const found = normalized.find((p) => String(p.payment_id) === String(id)) || null

      if (!found) {
        setPayment(null)
        setError('Payment tidak ditemukan.')
      } else {
        setPayment(found)
      }
    } catch (err) {
      console.error('Failed to load admin payment detail', err)
      setError('Gagal memuat detail pembayaran.')
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

  // ==========================
  // 🔁 UPDATE STATUS
  // ==========================
  const updateStatus = async (status) => {
    if (!payment?.payment_id) return
    setUpdating(true)
    setError('')
    try {
      await paymentsAPI.updateStatus(payment.payment_id, status)
      await load()
    } catch (err) {
      console.error('Failed to update status', err)
      setError('Tidak dapat memperbarui status pembayaran.')
    } finally {
      setUpdating(false)
    }
  }

  // ==========================
  // 🖼️ NORMALIZE BASE64 IMAGE
  // ==========================
  const normalizeBase64Image = (value) => {
    if (!value || typeof value !== 'string') return null
    if (value.startsWith('data:image')) return value
    const idx = value.indexOf('data:image')
    if (idx !== -1) return value.slice(idx)
    return `data:image/jpeg;base64,${value}`
  }

  return (
    <div className="bg-slate-50 min-h-screen">
      <Container className="py-4 px-3">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div>
            <h2 className="fw-bold mb-1">Detail Pembayaran (Admin)</h2>
            <div className="text-muted small">Payment ID: {id}</div>
          </div>
          <Button variant="outline-secondary" onClick={() => navigate(-1)}>
            Kembali
          </Button>
        </div>

        {error && <Alert variant="warning">{error}</Alert>}

        {loading ? (
          <div className="d-flex justify-content-center py-5 text-muted align-items-center gap-2">
            <Spinner animation="border" size="sm" /> Memuat detail...
          </div>
        ) : payment ? (
          <div className="d-flex flex-column gap-3">

            {/* ================= INFO PAYMENT ================= */}
            <Card>
              <Card.Body>
                <div className="mb-2">
                  <div className="text-muted small">Status</div>
                  <div>{renderStatus(payment.status)}</div>
                </div>

                <div className="text-muted small">Metode</div>
                <div className="fw-semibold mb-2 text-uppercase">
                  {payment.payment_method || '-'}
                </div>

                <div className="text-muted small">Dibuat</div>
                <div>{formatDate(payment.created_at)}</div>

                <div className="text-muted small">Diperbarui</div>
                <div>{formatDate(payment.updated_at)}</div>
              </Card.Body>
            </Card>

            {/* ================= BUKTI PEMBAYARAN ================= */}
            <Card>
              <Card.Body>
                <div className="fw-semibold mb-2">Bukti Pembayaran</div>

                {payment.payment_method === 'cash' ? (
                  <div className="text-center py-4">
                    <Badge bg="secondary" className="px-4 py-2 fs-6">
                      TUNAI
                    </Badge>
                    <div className="text-muted mt-2">
                      Pembayaran dilakukan secara tunai
                    </div>
                  </div>
                ) : payment.proof.length === 0 ? (
                  <div className="text-muted">Tidak ada bukti pembayaran.</div>
                ) : (
                  <div className="d-flex flex-column gap-3">
                    {payment.proof.map((src, idx) => {
                      const imgSrc = normalizeBase64Image(src)
                      if (!imgSrc) {
                        return (
                          <div key={idx} className="alert alert-warning mb-0">
                            Bukti {idx + 1} tidak valid
                          </div>
                        )
                      }

                      return (
                        <img
                          key={idx}
                          src={imgSrc}
                          alt={`Bukti pembayaran ${idx + 1}`}
                          className="img-fluid rounded shadow"
                          style={{
                            maxHeight: '18rem',
                            width: '100%',
                            objectFit: 'contain',
                          }}
                          loading="lazy"
                        />
                      )
                    })}
                  </div>
                )}
              </Card.Body>
            </Card>

            {/* ================= VERIFIKASI ================= */}
            <Card>
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
