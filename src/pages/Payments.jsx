import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Alert, Button, Card, Col, Container, Form, Row, Spinner } from 'react-bootstrap'
import { inquiriesAPI, paymentsAPI, unitTypesAPI } from '../services/api'
import { buildUnitNumberMap, formatUnitNumber } from '../utils/unitNaming'

function Payments() {
  const navigate = useNavigate()
  const location = useLocation()

  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const [currentUserId, setCurrentUserId] = useState('')
  const [inquiries, setInquiries] = useState([])
  const [unitTypeNameMap, setUnitTypeNameMap] = useState({})
  const [unitNumberMap, setUnitNumberMap] = useState({})

  const [form, setForm] = useState({
    inquiryId: '',
    method: '', // cash / cashless
    proofFile: null,
  })

  const sameId = (a, b) => String(a ?? '') === String(b ?? '')

  const initialInquiryId = useMemo(() => {
    const params = new URLSearchParams(location.search || '')
    return String(params.get('inquiry_id') || params.get('inquiryId') || '').trim()
  }, [location.search])

  const normalizeInquiry = (raw) => {
    if (!raw) return null

    const purchaseType = String(raw.purchase_type || raw.purchaseType || 'rent').toLowerCase()
    const duration = Number(raw.duration ?? 1)

    const rentPrice = Number(raw.unit?.unit_type?.rent_price)
    const salePrice = Number(raw.unit?.unit_type?.sale_price)

    let computedTotal = null

    if (purchaseType === 'rent' && Number.isFinite(rentPrice)) {
      computedTotal = rentPrice * duration
    }

    if (purchaseType === 'buy' && Number.isFinite(salePrice)) {
      computedTotal = salePrice
    }

    return {
      // ===== CORE =====
      id: raw.id || raw.inquiry_id,
      userId: raw.user_id,
      unitId: raw.unit_id,
      unitTypeId: raw.unit?.unit_type_id,

      purchaseType,
      duration,

      // ===== TOTAL PRICE (🔥 FIX) =====
      totalPrice: Number.isFinite(computedTotal) ? computedTotal : null,

      // ===== STATUS & TIME =====
      status: raw.status,
      createdAt: raw.created_at,
      updatedAt: raw.updated_at,

      // ===== DISPLAY HELPERS =====
      unitNumber: raw.unit_number || raw.unit?.unit_type?.unit_number,

      user: raw.user ?? null,
      unit: raw.unit ?? null,
    }
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(Number.isNaN(value) ? 0 : value)
  }

  useEffect(() => {
    const token = localStorage.getItem('authToken')
    const storedUser = localStorage.getItem('user')

    if (!token || !storedUser) {
      if (sessionStorage.getItem('logoutFeedbackPending') === '1') return
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

    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const [inquiriesRes, unitTypesRes] = await Promise.all([
          inquiriesAPI.getAll({ user_id: currentUserId }),
          unitTypesAPI.getAll(),
        ])

        const inqList = Array.isArray(inquiriesRes?.data) ? inquiriesRes.data : Array.isArray(inquiriesRes) ? inquiriesRes : []
        const normalizedInquiries = inqList
          .map(normalizeInquiry)
          .filter(Boolean)
          .filter((inq) => (!currentUserId ? true : sameId(inq.userId, currentUserId)))
          .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
        setInquiries(normalizedInquiries)

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

        if (initialInquiryId) {
          setForm((prev) => (prev.inquiryId ? prev : { ...prev, inquiryId: initialInquiryId }))
        }
      } catch (err) {
        console.error('Failed to load inquiries for payment', err)
        setError('Gagal memuat data inquiry. Coba lagi.')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [currentUserId, initialInquiryId])

  const selectedInquiry = useMemo(() => {
    const id = String(form.inquiryId || '').trim()
    if (!id) return null
    return inquiries.find((inq) => String(inq.id) === id) || null
  }, [form.inquiryId, inquiries])

  const selectedInquiryUnitLabel = useMemo(() => {
    if (!selectedInquiry) return '-'
    const unitTypeId = String(selectedInquiry.unitTypeId || '').trim()
    const unitNumber = unitNumberMap[unitTypeId]
    if (unitNumber) return `Unit ${formatUnitNumber(unitNumber)}`

    const unitTypeName = unitTypeNameMap[unitTypeId] || ''
    return unitTypeName || '-'
  }, [selectedInquiry, unitNumberMap, unitTypeNameMap])

  const inquiryAmount = useMemo(() => {
    if (!selectedInquiry) return null
    return Number.isFinite(Number(selectedInquiry.totalPrice)) ? Number(selectedInquiry.totalPrice) : null
  }, [selectedInquiry])

  const inquiryPriceError = useMemo(() => {
    if (!selectedInquiry) return ''
    if (!Number.isFinite(inquiryAmount)) {
      return 'Harga tidak tersedia dari Inquiry. Silakan hubungi admin atau periksa data inquiry.'
    }
    return ''
  }, [selectedInquiry, inquiryAmount])

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

  const readFileAsDataUrl = (file) => {
    return new Promise((resolve, reject) => {
      if (!file) {
        resolve('')
        return
      }
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result || ''))
      reader.onerror = () => reject(reader.error || new Error('Failed to read file'))
      reader.readAsDataURL(file)
    })
  }

  const toBase64PayloadString = async (file) => {
    if (!file) return ''
    const mime = String(file.type || '').toLowerCase()
    const isPng = mime === 'image/png'
    const isJpeg = mime === 'image/jpeg' || mime === 'image/jpg'
    if (!isPng && !isJpeg) return ''

    const dataUrl = await readFileAsDataUrl(file)
    if (!dataUrl) return ''

    // data:[mime];base64,XXXX
    const commaIndex = dataUrl.indexOf(',')
    if (commaIndex === -1) return ''
    const base64 = dataUrl.slice(commaIndex + 1).trim()
    return base64
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setMessage('')
    setError('')

    if (!currentUserId) {
      setMessage('User tidak terdeteksi. Silakan login ulang.')
      return
    }

    const inquiryId = String(form.inquiryId || '').trim()
    if (!inquiryId) {
      setMessage('Pilih inquiry terlebih dahulu.')
      return
    }

    if (!form.paymentMethod) {
      setMessage('Pilih jenis pembayaran terlebih dahulu.')
      return
    }

    if (form.paymentMethod !== 'cash' && !form.proofFile) {
      setMessage('Bukti pembayaran wajib diupload untuk Transfer atau Debit.')
      return
    }

    if (!form.proofFile) {
      setMessage('Bukti pembayaran wajib diupload.')
      return
    }

    const proofMime = String(form.proofFile?.type || '').toLowerCase()
    if (proofMime && !['image/jpeg', 'image/jpg', 'image/png'].includes(proofMime)) {
      setMessage('Bukti pembayaran harus berupa gambar JPG atau PNG.')
      return
    }

    if (!Number.isFinite(inquiryAmount)) {
      setMessage('Tidak bisa submit karena harga inquiry tidak tersedia.')
      return
    }

    setCreating(true)
    try {
      const proofBase64 = await toBase64PayloadString(form.proofFile)
      if (!proofBase64) {
        setMessage('Bukti pembayaran tidak valid. Gunakan gambar JPG atau PNG.')
        return
      }

      await paymentsAPI.create({
        inquiry_id: inquiryId,
        user_id: currentUserId,
        method: form.paymentMethod,
        proof:
          form.paymentMethod === 'cash'
            ? []
            : [await toBase64PayloadString(form.proofFile)],
        total_price: inquiryAmount,
      })

      setMessage('Pembayaran berhasil dikirim. Silakan tunggu verifikasi admin.')
      setForm((prev) => ({ ...prev, proofFile: null }))
    } catch (err) {
      console.error('Failed to create payment', err)
      setMessage(extractBackendErrorMessage(err) || 'Gagal membuat pembayaran. Coba lagi.')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="bg-slate-50 min-h-screen">
      <Container className="py-5 px-3">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
          <div>
            <h2 className="fw-bold mb-1">Pembayaran</h2>
            <p className="text-muted mb-0">Pembayaran awal berdasarkan inquiry yang Anda pilih.</p>
          </div>
          <Button variant="outline-secondary" onClick={() => navigate('/payment-history')}>
            Riwayat Pembayaran
          </Button>
        </div>

        {error && (
          <Alert variant="danger" onClose={() => setError('')} dismissible>
            {error}
          </Alert>
        )}

        <Card className="rounded-2xl border border-slate-200">
          <Card.Body>
            <div className="fw-bold mb-2">Buat Pembayaran</div>
            <div className="text-muted small mb-3">Pilih inquiry, lihat total, lalu upload bukti pembayaran.</div>

            {message && (
              <Alert
                variant={message.toLowerCase().includes('berhasil') ? 'success' : 'warning'}
                className="mb-3"
                onClose={() => setMessage('')}
                dismissible
              >
                {message}
              </Alert>
            )}

            {loading ? (
              <div className="d-flex justify-content-center py-5 text-muted align-items-center gap-2">
                <Spinner animation="border" size="sm" /> Memuat inquiry...
              </div>
            ) : (
              <Form onSubmit={handleSubmit}>
                <Row className="g-3">
                  <Col xs={12} md={6}>
                    <Form.Label className="small text-muted">Inquiry</Form.Label>
                    <Form.Select
                      value={form.inquiryId}
                      onChange={(e) => setForm((prev) => ({ ...prev, inquiryId: e.target.value }))}
                      disabled={creating}
                    >
                      <option value="">-- Pilih inquiry --</option>
                      {inquiries.map((inq) => (
                        <option key={inq.id} value={inq.id}>
                          Unit {inq.unitNumber} | {inq.user.name} 
                        </option>
                      ))}
                    </Form.Select>
                  </Col>

                  <Col xs={12} md={6}>
                    <Form.Label className="small text-muted">Ringkasan Inquiry</Form.Label>
                    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                      <div className="text-muted small mt-2">Tipe transaksi</div>
                      <div className="fw-semibold text-slate-900">
                        {selectedInquiry ? (String(selectedInquiry.purchaseType).toLowerCase() === 'rent' ? 'Sewa' : 'Beli') : '-'}
                      </div>

                      <div className="text-muted small mt-2">Tipe Unit</div>
                      <div className="fw-semibold text-slate-900">{selectedInquiry ? selectedInquiry.unit.unit_type.name : '-'}</div>

                      <div className="text-muted small mt-2">Lantai</div>
                      <div className="fw-semibold text-slate-900">{selectedInquiry ? selectedInquiry.unit.unit_type.floor : '-'}</div>

                      <div className="text-muted small mt-2">Unit</div>
                      <div className="fw-semibold text-slate-900">{selectedInquiry ? selectedInquiry.unit.unit_type.unit_number : '-'}</div>

                      <div className="text-muted small mt-2">Fasilitas</div>
                      <div className="fw-semibold text-slate-900">{selectedInquiry ? selectedInquiry.unit.unit_type.facilities : '-'}</div>

                      <div className="text-muted small mt-2">Total Harga yang harus dibayar</div>
                      <div className="fw-bold text-slate-900">
                        {selectedInquiry ? formatCurrency(selectedInquiry.totalPrice) : '-'}
                      </div>
                    </div>

                    {selectedInquiry && inquiryPriceError && (
                      <Alert variant="danger" className="mt-2 mb-0">
                        {inquiryPriceError}
                      </Alert>
                    )}
                  </Col>

                  <Col xs={12}>
                    <Form.Label className="small text-muted">Jenis Pembayaran</Form.Label>
                    <Form.Select
                      value={form.paymentMethod}
                      disabled={creating}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          paymentMethod: e.target.value,
                          proofFile: null, // reset bukti saat ganti metode
                        }))
                      }
                    >
                      <option value="">-- Pilih metode pembayaran --</option>
                      <option value="cash">Tunai</option>
                      <option value="transfer">Transfer</option>
                      <option value="debit">Debit</option>
                    </Form.Select>
                  </Col>

                  {form.paymentMethod !== 'cash' && form.paymentMethod !== '' && (
                    <Col xs={12}>
                      <Form.Label className="small text-muted">Bukti Pembayaran</Form.Label>
                      <Form.Control
                        type="file"
                        accept="image/*"
                        disabled={creating}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            proofFile: e.target.files?.[0] || null,
                          }))
                        }
                      />
                      <div className="text-muted small mt-1">
                        Wajib upload bukti untuk Transfer / Debit
                      </div>
                    </Col>
                  )}

                  <Col xs={12}>
                    <Button type="submit" variant="dark" disabled={creating || !selectedInquiry || !Number.isFinite(inquiryAmount)}>
                      {creating ? (
                        <>
                          <Spinner animation="border" size="sm" className="me-2" /> Mengirim...
                        </>
                      ) : (
                        'Kirim Pembayaran'
                      )}
                    </Button>
                  </Col>
                </Row>
              </Form>
            )}
          </Card.Body>
        </Card>
      </Container>
    </div>
  )
}

export default Payments
