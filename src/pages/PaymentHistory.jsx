import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Alert, Badge, Button, Card, Container, Spinner } from 'react-bootstrap'
import { inquiriesAPI, paymentsAPI, unitTypesAPI } from '../services/api'
import { buildUnitNumberMap, formatUnitNumber } from '../utils/unitNaming'

function PaymentHistory() {
  const navigate = useNavigate()
  const [currentUserId, setCurrentUserId] = useState('')
  const [payments, setPayments] = useState([])
  const [inquiriesMap, setInquiriesMap] = useState({})
  const [unitTypeNameMap, setUnitTypeNameMap] = useState({})
  const [unitNumberMap, setUnitNumberMap] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const sameId = (a, b) => String(a ?? '') === String(b ?? '')

  const normalizeInquiry = (raw) => {
    if (!raw) return null
    const totalPriceRaw = raw.total_price ?? raw.totalPrice ?? raw.amount ?? raw.total ?? raw.total_amount
    const totalPrice = Number(totalPriceRaw)
    return {
      id: raw.id || raw.inquiry_id || raw.uuid || raw._id,
      userId: raw.user_id || raw.userId || raw.user_identifier,
      unitId: raw.unit_id || raw.unitId,
      unitTypeId: raw.unit_type_id || raw.unitTypeId || raw.unit_type || raw.unitType || '',
      purchaseType: raw.purchase_type || raw.purchaseType || 'rent',
      status: String(raw.status || 'sent').toLowerCase(),
      createdAt: raw.created_at || raw.createdAt,
      totalPrice: Number.isFinite(totalPrice) ? totalPrice : null,
    }
  }

  const normalizePayment = (raw) => {
    if (!raw) return null
    return {
      id: raw.id || raw.payment_id || raw.uuid || raw._id,
      inquiryId: raw.inquiry_id || raw.inquiryId || raw.inquiry_uuid,
      userId: raw.user_id || raw.userId || raw.customer_id,
      amount: Number(raw.amount ?? raw.total ?? raw.total_amount ?? raw.total_price ?? 0),
      method: raw.method || raw.payment_method || 'Manual',
      status: String(raw.status || 'pending').toLowerCase(),
      createdAt: raw.created_at || raw.createdAt,
      updatedAt: raw.updated_at || raw.updatedAt,
    }
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(
      Number.isNaN(value) ? 0 : value
    )
  }

  const formatDate = (value) => {
    if (!value) return '-'
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return '-'
    return d.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })
  }

  const deriveInquiryAmount = (inquiry) => {
    if (!inquiry) return null
    return Number.isFinite(Number(inquiry.totalPrice)) ? Number(inquiry.totalPrice) : null
  }

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

  const renderStatus = (status) => {
    const meta = statusMeta[status] || { label: status || 'Unknown', variant: 'secondary' }
    return <Badge bg={meta.variant}>{meta.label}</Badge>
  }

  useEffect(() => {
    const token = localStorage.getItem('authToken')
    const storedUser = localStorage.getItem('user')

    if (!token || !storedUser) {
      if (sessionStorage.getItem('logoutFeedbackPending') === '1') return
      sessionStorage.setItem('redirectAfterLogin', '/payment-history')
      navigate('/login', { replace: true })
      return
    }

    try {
      const parsed = JSON.parse(storedUser)
      const uid = parsed?.id || parsed?.user_id || parsed?.customer_id || parsed?.customerId || ''
      setCurrentUserId(String(uid || ''))
    } catch {
      navigate('/login', { replace: true })
    }
  }, [navigate])

  useEffect(() => {
    if (!currentUserId) return

    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const [inquiriesRes, paymentsRes, unitTypesRes] = await Promise.all([
          inquiriesAPI.getAll({ user_id: currentUserId }),
          paymentsAPI.getAll({ user_id: currentUserId }),
          unitTypesAPI.getAll(),
        ])

        const inqList = Array.isArray(inquiriesRes?.data) ? inquiriesRes.data : Array.isArray(inquiriesRes) ? inquiriesRes : []
        const mapped = {}
        inqList
          .map(normalizeInquiry)
          .filter(Boolean)
          .filter((inq) => (!currentUserId ? true : sameId(inq.userId, currentUserId)))
          .forEach((inq) => {
            if (inq?.id) mapped[String(inq.id)] = inq
          })
        setInquiriesMap(mapped)

        const unitTypeList = Array.isArray(unitTypesRes?.data) ? unitTypesRes.data : Array.isArray(unitTypesRes) ? unitTypesRes : []
        const nameMap = {}
        unitTypeList.forEach((ut) => {
          const id = String(ut?.unit_type_id ?? ut?.id ?? ut?.uuid ?? '').trim()
          if (!id) return
          nameMap[id] = String(ut?.name || ut?.unit_name || ut?.title || '').trim()
        })
        setUnitTypeNameMap(nameMap)

        const computedUnitNumberMap = buildUnitNumberMap(unitTypeList, {
          getId: (x) => x?.unit_type_id ?? x?.id ?? x?.uuid,
          getFloor: (x) => x?.floor,
          getName: (x) => x?.name,
        })
        setUnitNumberMap(computedUnitNumberMap)

        const payList = Array.isArray(paymentsRes?.data) ? paymentsRes.data : Array.isArray(paymentsRes) ? paymentsRes : []
        const normalizedPayments = payList.map(normalizePayment).filter(Boolean)
        normalizedPayments.sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0))
        setPayments(normalizedPayments)
      } catch (err) {
        console.error('Failed to load payment history', err)
        setError('Gagal memuat riwayat pembayaran. Coba lagi.')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [currentUserId])

  const paymentsView = useMemo(() => {
    if (!currentUserId) return []
    return payments
      .filter((p) => (p?.userId ? sameId(p.userId, currentUserId) : true))
      .map((p) => {
        const inquiry = inquiriesMap[String(p.inquiryId || '')]
        const derived = deriveInquiryAmount(inquiry)
        const storedAmount = Number(p.amount)
        const fallbackAmount = Number.isFinite(storedAmount) && storedAmount > 0 ? storedAmount : null
        return {
          ...p,
          inquiry,
          displayAmount: Number.isFinite(derived) ? derived : fallbackAmount,
        }
      })
  }, [payments, inquiriesMap, currentUserId])

  const missingPriceCount = useMemo(() => {
    return paymentsView.filter((p) => !Number.isFinite(Number(p.displayAmount))).length
  }, [paymentsView])

  return (
    <div className="bg-slate-50 min-h-screen">
      <Container className="py-5 px-3">
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-4">
          <div>
            <h2 className="fw-bold mb-1">Riwayat Pembayaran</h2>
            <p className="text-muted mb-0">Menampilkan total pembayaran berdasarkan data inquiry.</p>
          </div>
          <Button variant="outline-secondary" onClick={() => navigate('/payments')}>Buat Pembayaran</Button>
        </div>

        {error && (
          <Alert variant="danger" dismissible onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {!loading && !error && missingPriceCount > 0 && (
          <Alert variant="warning" className="rounded-2xl border border-amber-200">
            {missingPriceCount} transaksi tidak bisa menampilkan harga karena harga tidak tersedia dari Inquiry.
          </Alert>
        )}

        {loading ? (
          <div className="d-flex justify-content-center py-5 text-muted align-items-center gap-2">
            <Spinner animation="border" size="sm" /> Memuat...
          </div>
        ) : paymentsView.length === 0 ? (
          <Card className="rounded-2xl border border-slate-200 shadow-sm">
            <Card.Body className="text-center text-slate-600">Belum ada riwayat pembayaran.</Card.Body>
          </Card>
        ) : (
          <div className="d-flex flex-column gap-3">
            {paymentsView.map((payment) => (
              <Card key={payment.id} className="rounded-2xl border border-slate-200 shadow-sm">
                <Card.Body>
                  <div className="d-flex justify-content-between align-items-start flex-wrap gap-2">
                    <div>
                      <div className="text-muted small">Status</div>
                      <div className="fw-semibold">{renderStatus(payment.status)}</div>
                    </div>
                    <div className="text-end">
                      <div className="text-muted small">Total</div>
                      <div className="fw-bold text-slate-900">
                        {Number.isFinite(Number(payment.displayAmount))
                          ? formatCurrency(payment.displayAmount)
                          : 'Harga tidak tersedia'}
                      </div>
                    </div>
                  </div>

                  <div className="mt-2 small text-muted">
                    Inquiry ID: <span className="text-slate-800 fw-semibold">{payment.inquiryId || '-'}</span>
                  </div>
                  <div className="small text-muted">Metode: <span className="text-slate-800">{payment.method || '-'}</span></div>
                  <div className="small text-muted">Tanggal transaksi: <span className="text-slate-800">{formatDate(payment.createdAt)}</span></div>

                  {payment.inquiry && (
                    <div className="mt-2 small text-muted">
                      Tipe: <span className="text-slate-800 fw-semibold">{payment.inquiry.purchaseType === 'rent' ? 'Sewa' : 'Beli'}</span>
                      {' · '}Unit:{' '}
                      <span className="text-slate-800 fw-semibold">
                        {(() => {
                          const unitTypeId = String(payment.inquiry.unitTypeId || '').trim()
                          const unitNumber = unitNumberMap[unitTypeId]
                          if (unitNumber) return `Unit ${formatUnitNumber(unitNumber)}`
                          return unitTypeNameMap[unitTypeId] || '-'
                        })()}
                      </span>
                    </div>
                  )}
                </Card.Body>
              </Card>
            ))}
          </div>
        )}
      </Container>
    </div>
  )
}

export default PaymentHistory
