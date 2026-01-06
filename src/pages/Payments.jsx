import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Container, Card, Badge, Button, Row, Col, Alert, Spinner, OverlayTrigger, Tooltip, Form } from 'react-bootstrap'
import Navbar from '../components/Navbar'
import { paymentsAPI, inquiriesAPI } from '../services/api'

function Payments() {
  const navigate = useNavigate()
  const location = useLocation()
  const [payments, setPayments] = useState([])
  const [inquiriesMap, setInquiriesMap] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const [currentUserId, setCurrentUserId] = useState('')
  const [lastSync, setLastSync] = useState(null)

  const sameId = (a, b) => String(a ?? '') === String(b ?? '')

  const initialInquiryId = useMemo(() => {
    const params = new URLSearchParams(location.search || '')
    return String(params.get('inquiry_id') || params.get('inquiryId') || '').trim()
  }, [location.search])

  const [createForm, setCreateForm] = useState({
    inquiryId: '',
    proofFile: null,
  })
  const [creating, setCreating] = useState(false)
  const [createMessage, setCreateMessage] = useState('')

  const statusMeta = {
    pending: { label: 'Pending', variant: 'warning' },
    paid: { label: 'Paid', variant: 'success' },
    success: { label: 'Paid', variant: 'success' },
    settled: { label: 'Paid', variant: 'success' },
    awaiting: { label: 'Awaiting', variant: 'info' },
    awaiting_payment: { label: 'Awaiting', variant: 'info' },
    failed: { label: 'Failed', variant: 'danger' },
    cancelled: { label: 'Cancelled', variant: 'secondary' },
    expired: { label: 'Expired', variant: 'secondary' },
    refunded: { label: 'Refunded', variant: 'info' },
  }

  const resolveFileUrl = (path) => {
    if (!path || typeof path !== 'string') return path
    
    // If already a full URL, ensure it uses HTTPS to prevent mixed content issues
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path.replace(/^http:\/\//i, 'https://')
    }
    
    // Get base URL and ensure it uses HTTPS
    const base = (import.meta.env.VITE_API_BASE_URL || '')
      .replace(/\/?api\/?$/, '')
      .replace(/^http:\/\//i, 'https://')
    
    // Clean up path and construct full URL
    const cleanPath = path.replace(/^\//, '')
    const fullUrl = `${base}/${cleanPath}`
    
    return fullUrl.replace(/^http:\/\//i, 'https://')
  }

  const normalizeInquiry = (raw) => {
    if (!raw) return null
    return {
      id: raw.id || raw.inquiry_id || raw.uuid || raw._id,
      userId: raw.user_id || raw.userId || raw.user_identifier,
      unitId: raw.unit_id || raw.unitId,
      purchaseType: raw.purchase_type || raw.purchaseType || 'rent',
      status: (raw.status || 'sent').toLowerCase(),
      createdAt: raw.created_at || raw.createdAt,
    }
  }

  const normalizePayment = (raw) => {
    if (!raw) return null
    return {
      id: raw.id || raw.payment_id || raw.uuid || raw._id,
      inquiryId: raw.inquiry_id || raw.inquiryId || raw.inquiry_uuid,
      userId: raw.user_id || raw.userId || raw.customer_id,
      amount: Number(raw.amount ?? raw.total ?? raw.total_amount ?? 0),
      method: raw.method || raw.payment_method || 'Manual',
      status: (raw.status || 'pending').toLowerCase(),
      dueDate: raw.due_date || raw.dueDate,
      paidAt: raw.paid_at || raw.paidAt,
      reference: raw.reference || raw.reference_no || raw.invoice_no,
      invoiceUrl: resolveFileUrl(raw.invoice_url || raw.invoiceUrl || raw.invoice),
      proofUrl: resolveFileUrl(raw.proof_url || raw.proofUrl || raw.proof),
      createdAt: raw.created_at || raw.createdAt,
      updatedAt: raw.updated_at || raw.updatedAt,
    }
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(Number.isNaN(value) ? 0 : value)
  }

  const formatDate = (value) => {
    if (!value) return '-'
    return new Date(value).toLocaleString('id-ID', {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  }

  const fetchInquiries = async (uid) => {
    try {
      const res = await inquiriesAPI.getAll(uid ? { user_id: uid } : {})
      const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : []
      const mapped = {}
      list
        .map(normalizeInquiry)
        .filter(Boolean)
        // Defense-in-depth: if backend returns mixed inquiries, only keep the logged-in user's.
        .filter((inq) => (!uid ? true : sameId(inq.userId, uid)))
        .forEach((normalized) => {
          if (normalized?.id) mapped[normalized.id] = normalized
        })
      setInquiriesMap(mapped)

      // If Payments page is opened from Inquiry flow, preselect that inquiry
      setCreateForm((prev) => {
        if (prev.inquiryId) return prev
        if (initialInquiryId && mapped[initialInquiryId]) return { ...prev, inquiryId: String(initialInquiryId) }
        if (initialInquiryId) return { ...prev, inquiryId: String(initialInquiryId) }
        return prev
      })
    } catch (err) {
      console.error('Failed to load inquiries for payments', err)
    }
  }

  const fetchPayments = async (uid, withLoader = false) => {
    if (withLoader) setLoading(true)
    setRefreshing(true)
    setError('')
    try {
      const res = await paymentsAPI.getAll(uid ? { user_id: uid } : {})
      const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : []
      const normalized = list.map(normalizePayment).filter(Boolean)
      normalized.sort((a, b) => new Date(b.dueDate || b.createdAt || 0) - new Date(a.dueDate || a.createdAt || 0))
      setPayments(normalized)
      setLastSync(new Date())
    } catch (err) {
      console.error('Failed to load payments', err)
      setError('Gagal memuat data pembayaran dari server. Coba lagi.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    const token = localStorage.getItem('authToken')
    const storedUser = localStorage.getItem('user')

    if (!token || !storedUser) {
      sessionStorage.setItem('redirectAfterLogin', '/payments')
      navigate('/login', { replace: true })
      return
    }

    try {
      const parsed = JSON.parse(storedUser)
      const uid = parsed?.id || parsed?.user_id || parsed?.customer_id || parsed?.customerId || ''
      setCurrentUserId(uid)
    } catch (err) {
      console.warn('Failed to parse stored user for payments', err)
      navigate('/login', { replace: true })
    }
  }, [navigate])

  useEffect(() => {
    if (!currentUserId) return

    const loadData = async () => {
      await Promise.all([fetchInquiries(currentUserId), fetchPayments(currentUserId, true)])
    }

    loadData()
    const interval = setInterval(() => fetchPayments(currentUserId), 10000)
    return () => clearInterval(interval)
  }, [currentUserId])

  useEffect(() => {
    if (!initialInquiryId) return
    setCreateForm((prev) => ({ ...prev, inquiryId: String(initialInquiryId) }))
  }, [initialInquiryId])

  const paymentsView = useMemo(() => {
    if (!currentUserId) return payments

    // Safety filter (defense-in-depth): even if backend returns unscoped payments,
    // only display data owned by the logged-in user.
    return payments.filter((p) => {
      if (!p) return false

      // Prefer direct ownership field from payments payload.
      if (p.userId !== undefined && p.userId !== null && String(p.userId).trim() !== '') {
        return sameId(p.userId, currentUserId)
      }

      // Fallback: infer ownership via inquiry relationship (if present in the UI map).
      const inquiry = inquiriesMap[p.inquiryId]
      if (inquiry?.userId !== undefined && inquiry?.userId !== null && String(inquiry.userId).trim() !== '') {
        return sameId(inquiry.userId, currentUserId)
      }

      // If we cannot prove ownership, hide the record.
      return false
    })
  }, [payments, inquiriesMap, currentUserId])

  const inquiriesView = useMemo(() => {
    const list = Object.values(inquiriesMap)
    if (!currentUserId) return list
    return list.filter((inq) => sameId(inq?.userId, currentUserId))
  }, [inquiriesMap, currentUserId])

  const extractBackendErrorMessage = (err) => {
    const data = err?.response?.data
    if (!data) return ''
    if (typeof data === 'string') return data
    if (data.errors && typeof data.errors === 'object') {
      const lines = Object.values(data.errors).flat().filter(Boolean)
      if (lines.length) return lines.join('\n')
    }
    return data.message || data.error || ''
  }

  const getPaymentsPayloadInquiryId = (value) => {
    const trimmed = String(value || '').trim()
    return trimmed
  }

  const handleCreatePayment = async (e) => {
    e.preventDefault()
    setCreateMessage('')
    setError('')

    if (!currentUserId) {
      setCreateMessage('User ID tidak ditemukan. Silakan login ulang.')
      return
    }

    const inquiryId = getPaymentsPayloadInquiryId(createForm.inquiryId)
    if (!inquiryId) {
      setCreateMessage('Pilih inquiry terlebih dahulu.')
      return
    }

    if (!createForm.proofFile) {
      setCreateMessage('Bukti pembayaran (proof) wajib diupload.')
      return
    }

    // Backend validation requires: user_id and proof
    const payload = {
      user_id: String(currentUserId),
      inquiry_id: inquiryId,
      // Backend expects proof as array: proof[]
      proof: [createForm.proofFile],
    }

    setCreating(true)
    try {
      const res = await paymentsAPI.create(payload)

      // Try to pick payment id from common shapes
      const raw = res?.data || res
      const paymentId = raw?.payment_id || raw?.id || raw?.paymentId || raw?.uuid || ''

      setCreateMessage('Pembayaran berhasil dibuat. Silakan cek daftar pembayaran di bawah.')
      setCreateForm((prev) => ({ ...prev, proofFile: null }))
      await fetchPayments(currentUserId, false)
    } catch (err) {
      console.error('Failed to create payment', err)
      const msg = extractBackendErrorMessage(err) || 'Gagal membuat pembayaran. Coba lagi.'
      setCreateMessage(msg)
    } finally {
      setCreating(false)
    }
  }

  const renderStatus = (status) => {
    const meta = statusMeta[status] || { label: status || 'Unknown', variant: 'secondary' }
    return <Badge bg={meta.variant}>{meta.label}</Badge>
  }

  return (
    <>
      <Navbar />
      <div className="bg-slate-50 min-h-screen">
        <Container className="py-5 px-3">
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
            <div>
              <h2 className="fw-bold mb-1">Pembayaran Saya</h2>
              <p className="text-muted mb-0">Pantau status pembayaran dan keterkaitan inquiry.</p>
            </div>
            <div className="d-flex align-items-center gap-2">
              {lastSync && (
                <OverlayTrigger placement="bottom" overlay={<Tooltip id="sync-tooltip">Terakhir sinkron: {formatDate(lastSync)}</Tooltip>}>
                  <span className="text-muted small">Sinkron otomatis setiap 10 detik</span>
                </OverlayTrigger>
              )}
              <Button variant="outline-primary" size="sm" onClick={() => fetchPayments(currentUserId)} disabled={refreshing}>
                {refreshing ? 'Menyinkronkan...' : 'Sinkronkan sekarang'}
              </Button>
            </div>
          </div>

          {error && (
            <Alert variant="danger" onClose={() => setError('')} dismissible>
              {error}
            </Alert>
          )}

          <Card className="rounded-2xl border border-slate-200 mb-3">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-2">
                <div>
                  <div className="fw-bold">Buat Pembayaran</div>
                  <div className="text-muted small">Pilih inquiry Anda lalu upload bukti pembayaran.</div>
                </div>
              </div>

              {createMessage && (
                <Alert variant={createMessage.toLowerCase().includes('berhasil') ? 'success' : 'warning'} className="mb-3" onClose={() => setCreateMessage('')} dismissible>
                  {createMessage}
                </Alert>
              )}

              <Form onSubmit={handleCreatePayment}>
                <Row className="g-3">
                  <Col xs={12} md={6}>
                    <Form.Label className="small text-muted">Inquiry</Form.Label>
                    <Form.Select
                      value={createForm.inquiryId}
                      onChange={(e) => setCreateForm((prev) => ({ ...prev, inquiryId: e.target.value }))}
                      disabled={creating}
                    >
                      <option value="">-- Pilih inquiry --</option>
                      {inquiriesView.map((inq) => (
                        <option key={inq.id} value={inq.id}>
                          {inq.id} {inq.unitId ? `• Unit ${inq.unitId}` : ''} {inq.status ? `• ${inq.status}` : ''}
                        </option>
                      ))}
                    </Form.Select>
                    {initialInquiryId && !inquiriesMap[initialInquiryId] && (
                      <div className="text-muted small mt-1">Inquiry ID dari halaman sebelumnya: {initialInquiryId}</div>
                    )}
                  </Col>

                  <Col xs={12} md={6}>
                    <Form.Label className="small text-muted">Bukti Pembayaran (Proof) *</Form.Label>
                    <Form.Control
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={(e) => setCreateForm((prev) => ({ ...prev, proofFile: e.target.files?.[0] || null }))}
                      disabled={creating}
                    />
                  </Col>

                  <Col xs={12}>
                    <div className="d-flex flex-wrap gap-2">
                      <Button type="submit" variant="dark" disabled={creating}>
                        {creating ? 'Memproses...' : 'Buat Pembayaran'}
                      </Button>
                      <Button
                        type="button"
                        variant="outline-secondary"
                        disabled={creating}
                        onClick={() => setCreateForm((prev) => ({ ...prev, proofFile: null }))}
                      >
                        Reset
                      </Button>
                    </div>
                  </Col>
                </Row>
              </Form>
            </Card.Body>
          </Card>

          {loading ? (
            <div className="d-flex justify-content-center py-5 text-muted align-items-center gap-2">
              <Spinner animation="border" size="sm" /> Memuat pembayaran...
            </div>
          ) : paymentsView.length === 0 ? (
            <Card className="rounded-2xl border border-slate-200">
              <Card.Body className="text-center text-muted py-5">
                Belum ada pembayaran yang tercatat.
              </Card.Body>
            </Card>
          ) : (
            <Row className="g-3">
              {paymentsView.map((payment) => {
                const inquiry = inquiriesMap[payment.inquiryId]
                return (
                  <Col key={payment.id} xs={12} md={6} lg={4}>
                    <Card className="h-100 rounded-2xl border border-slate-200 shadow-sm">
                      <Card.Body className="d-flex flex-column gap-2">
                        <div className="d-flex justify-content-between align-items-start">
                          <div>
                            <div className="text-muted small">Payment ID</div>
                            <div className="fw-semibold">{payment.reference || payment.id}</div>
                          </div>
                          {renderStatus(payment.status)}
                        </div>

                        <div className="d-flex justify-content-between align-items-center">
                          <div className="text-muted small">Jumlah</div>
                          <div className="fw-bold text-slate-900">{formatCurrency(payment.amount)}</div>
                        </div>

                        <div className="d-flex justify-content-between align-items-center text-muted small">
                          <span>Metode</span>
                          <span className="text-slate-800 fw-semibold">{payment.method}</span>
                        </div>

                        <div className="d-flex justify-content-between align-items-center text-muted small">
                          <span>Jatuh tempo</span>
                          <span className="text-slate-800">{formatDate(payment.dueDate)}</span>
                        </div>

                        {payment.paidAt && (
                          <div className="d-flex justify-content-between align-items-center text-muted small">
                            <span>Dibayar</span>
                            <span className="text-slate-800">{formatDate(payment.paidAt)}</span>
                          </div>
                        )}

                        <div className="d-flex justify-content-between align-items-center text-muted small">
                          <span>Inquiry</span>
                          <span className="text-slate-800 fw-semibold">{payment.inquiryId || '-'}</span>
                        </div>

                        {inquiry && (
                          <div className="rounded-2xl bg-slate-50 border border-dashed border-slate-200 p-3">
                            <div className="fw-semibold mb-1">Detail Inquiry</div>
                            <div className="small text-muted">Unit: <span className="text-slate-800 fw-semibold">{inquiry.unitId || '-'}</span></div>
                            <div className="small text-muted">Tipe: <span className="text-slate-800 fw-semibold">{inquiry.purchaseType === 'rent' ? 'Sewa' : 'Beli'}</span></div>
                            <div className="small text-muted">Status: <span className="text-slate-800 fw-semibold">{inquiry.status}</span></div>
                          </div>
                        )}

                        {(payment.invoiceUrl || payment.proofUrl) && (
                          <div className="d-flex flex-wrap gap-2 mt-2">
                            {payment.invoiceUrl && (
                              <Button as="a" href={payment.invoiceUrl} target="_blank" rel="noreferrer" variant="outline-secondary" size="sm">
                                Lihat Invoice
                              </Button>
                            )}
                            {payment.proofUrl && (
                              <Button as="a" href={payment.proofUrl} target="_blank" rel="noreferrer" variant="outline-secondary" size="sm">
                                Bukti Pembayaran
                              </Button>
                            )}
                          </div>
                        )}

                        <div className="text-muted small mt-auto">
                          Diperbarui: {formatDate(payment.updatedAt || payment.createdAt)}
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>
                )
              })}
            </Row>
          )}
        </Container>
      </div>
    </>
  )
}

export default Payments
