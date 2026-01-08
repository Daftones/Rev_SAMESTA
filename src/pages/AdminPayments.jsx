import { useEffect, useMemo, useState } from 'react'
import { Container, Table, Badge, Button, Modal, Card, Row, Col, Form, Alert, Spinner } from 'react-bootstrap'
import { paymentsAPI, inquiriesAPI, unitTypesAPI } from '../services/api'
import { buildUnitNumberMap, formatUnitNumber } from '../utils/unitNaming'
import jsPDF from 'jspdf'
import 'jspdf-autotable'
import * as XLSX from 'xlsx'

function AdminPayments() {
  const [payments, setPayments] = useState([])
  const [inquiriesMap, setInquiriesMap] = useState({})
  const [unitTypeNameMap, setUnitTypeNameMap] = useState({})
  const [unitNumberMap, setUnitNumberMap] = useState({})
  const [selectedPayment, setSelectedPayment] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [filters, setFilters] = useState({ status: 'all', method: 'all', from: '', to: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [updatingId, setUpdatingId] = useState('')
  const [lastSync, setLastSync] = useState(null)
  const [refreshing, setRefreshing] = useState(false)

  const _noop = 0

  const statusMeta = {
    pending: { text: 'Pending', variant: 'warning' },
    waiting_verification: { text: 'Menunggu Verifikasi', variant: 'info' },
    confirmed: { text: 'Terverifikasi', variant: 'success' },
    rejected: { text: 'Ditolak', variant: 'danger' },
    expired: { text: 'Expired', variant: 'secondary' },
  }

  const normalizeStatusForBackend = (status) => {
    const s = String(status || '').trim().toLowerCase()

    // Common UI aliases that frequently cause backend validation errors
    if (s === 'approved' || s === 'paid' || s === 'success' || s === 'settled') return 'confirmed'
    if (s === 'failed' || s === 'cancelled') return 'rejected'
    if (s === 'awaiting' || s === 'awaiting_payment') return 'waiting_verification'

    return s
  }

  const resolveFileUrl = (path) => {
    if (!path || typeof path !== 'string') {
      console.warn('[resolveFileUrl] Invalid path:', path)
      return null
    }
    
    // If already a full URL, ensure it uses HTTPS to prevent mixed content issues
    if (path.startsWith('http://') || path.startsWith('https://')) {
      const resolved = path.replace(/^http:\/\//i, 'https://')
      console.log('[resolveFileUrl] Full URL resolved:', resolved)
      return resolved
    }
    
    // Get base URL and ensure it uses HTTPS
    const base = (import.meta.env.VITE_API_BASE_URL || '')
      .replace(/\/?api\/?$/, '')
      .replace(/^http:\/\//i, 'https://')
    
    // Clean up path and construct full URL
    const cleanPath = path.replace(/^\//, '')
    const fullUrl = `${base}/${cleanPath}`
    const resolved = fullUrl.replace(/^http:\/\//i, 'https://')
    
    console.log('[resolveFileUrl] Resolved:', { original: path, base, cleanPath, resolved })
    return resolved
  }

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
      status: (raw.status || 'sent').toLowerCase(),
      address: raw.address || '',
      createdAt: raw.created_at || raw.createdAt,
      totalPrice: Number.isFinite(totalPrice) ? totalPrice : null,
    }
  }

  const deriveInquiryAmount = (inquiry) => {
    if (!inquiry) return null
    return Number.isFinite(Number(inquiry.totalPrice)) ? Number(inquiry.totalPrice) : null
  }

  const getDisplayAmount = (payment) => {
    const inquiry = inquiriesMap[payment?.inquiryId]
    const derived = deriveInquiryAmount(inquiry)
    if (Number.isFinite(derived)) return derived
    const storedAmount = Number(payment?.amount)
    if (Number.isFinite(storedAmount) && storedAmount > 0) return storedAmount
    return null
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
      paidAt: raw.paid_at || raw.paidAt,
      reference: raw.reference || raw.reference_no || raw.invoice_no,
      invoiceUrl: resolveFileUrl(raw.invoice_url || raw.invoiceUrl || raw.invoice),
      proofUrl: resolveFileUrl(raw.proof_url || raw.proofUrl || raw.proof),
      createdAt: raw.created_at || raw.createdAt,
      updatedAt: raw.updated_at || raw.updatedAt,
    }
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number.isNaN(value) ? 0 : value)
  }

  const formatAmountStrict = (value) => {
    const numeric = Number(value)
    if (!Number.isFinite(numeric)) return 'Harga tidak tersedia'
    return formatCurrency(numeric)
  }

  const formatAmountForExport = (value) => {
    const numeric = Number(value)
    if (!Number.isFinite(numeric)) return ''
    return formatCurrency(numeric)
  }

  const numberAmountForExport = (value) => {
    const numeric = Number(value)
    if (!Number.isFinite(numeric)) return ''
    return numeric
  }

  const formatDate = (value) => {
    if (!value) return '-'
    return new Date(value).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })
  }

  const loadData = async (withLoader = false) => {
    if (withLoader) setLoading(true)
    setRefreshing(true)
    setError('')
    try {
      const [paymentsRes, inquiriesRes] = await Promise.all([
        paymentsAPI.getAll(),
        inquiriesAPI.getAll(),
      ])

      const paymentList = Array.isArray(paymentsRes?.data) ? paymentsRes.data : Array.isArray(paymentsRes) ? paymentsRes : []
      const normalizedPayments = paymentList.map(normalizePayment).filter(Boolean)
      normalizedPayments.sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0))
      setPayments(normalizedPayments)

      const inquiryList = Array.isArray(inquiriesRes?.data) ? inquiriesRes.data : Array.isArray(inquiriesRes) ? inquiriesRes : []
      const mappedInquiry = {}
      inquiryList.forEach((item) => {
        const normalized = normalizeInquiry(item)
        if (normalized?.id) mappedInquiry[normalized.id] = normalized
      })
      setInquiriesMap(mappedInquiry)

      try {
        const unitTypesRes = await unitTypesAPI.getAll()
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
      } catch {
        // best-effort; unit naming will degrade gracefully
        setUnitTypeNameMap({})
        setUnitNumberMap({})
      }
      setLastSync(new Date())
    } catch (err) {
      console.error('Failed to load payments', err)
      setError('Gagal memuat data pembayaran. Coba lagi atau periksa koneksi.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadData(true)
    const interval = setInterval(() => loadData(false), 10000)
    return () => clearInterval(interval)
  }, [])

  const filteredPayments = useMemo(() => {
    return payments.filter((payment) => {
      if (filters.status !== 'all' && payment.status !== filters.status) return false
      if (filters.method !== 'all' && payment.method?.toLowerCase() !== filters.method.toLowerCase()) return false
      if (filters.from && new Date(payment.createdAt) < new Date(filters.from)) return false
      if (filters.to) {
        const end = new Date(filters.to)
        end.setHours(23, 59, 59, 999)
        if (new Date(payment.createdAt) > end) return false
      }
      return true
    })
  }, [payments, filters])

  const missingPriceCount = useMemo(() => {
    return filteredPayments.filter((p) => !Number.isFinite(Number(getDisplayAmount(p)))).length
  }, [filteredPayments, inquiriesMap])

  const handleStatusUpdate = async (paymentId, status) => {
    setUpdatingId(paymentId)
    try {
      const normalizedStatus = normalizeStatusForBackend(status)
      await paymentsAPI.updateStatus(paymentId, normalizedStatus)
      const now = new Date().toISOString()
      setPayments((prev) => prev.map((p) => (p.id === paymentId ? { ...p, status: normalizedStatus, updatedAt: now } : p)))
      if (selectedPayment?.id === paymentId) {
        setSelectedPayment({ ...selectedPayment, status: normalizedStatus, updatedAt: now })
      }
    } catch (err) {
      console.error('Failed to update payment status', err)
      setError('Tidak dapat memperbarui status pembayaran. Coba lagi.')
    } finally {
      setUpdatingId('')
    }
  }

  const handleViewDetails = (payment) => {
    setSelectedPayment(payment)
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setSelectedPayment(null)
  }

  const getStatusBadge = (status) => {
    const meta = statusMeta[status] || { text: status || 'Unknown', variant: 'secondary' }
    return <Badge bg={meta.variant}>{meta.text}</Badge>
  }

  const getStatusText = (status) => {
    const meta = statusMeta[status] || { text: status || 'Unknown', variant: 'secondary' }
    return meta.text
  }

  const exportToPDF = () => {
    const doc = new jsPDF()
    
    // Add title
    doc.setFontSize(18)
    doc.text('Laporan Pembayaran', 14, 20)
    
    // Add export date
    doc.setFontSize(10)
    doc.text(`Diekspor: ${formatDate(new Date())}`, 14, 28)
    
    // Add filter info if any active filters
    let yPos = 35
    if (filters.status !== 'all' || filters.method !== 'all' || filters.from || filters.to) {
      doc.setFontSize(9)
      let filterText = 'Filter: '
      if (filters.status !== 'all') filterText += `Status: ${getStatusText(filters.status)} | `
      if (filters.method !== 'all') filterText += `Metode: ${filters.method} | `
      if (filters.from) filterText += `Dari: ${filters.from} | `
      if (filters.to) filterText += `Sampai: ${filters.to}`
      doc.text(filterText, 14, yPos)
      yPos += 7
    }
    
    // Prepare table data
    const tableData = filteredPayments.map((payment, index) => {
      const inquiry = inquiriesMap[payment.inquiryId]
      const displayAmount = getDisplayAmount(payment)
      return [
        index + 1,
        payment.reference || payment.id,
        payment.inquiryId || '-',
        inquiry?.userId || payment.userId || '-',
        formatAmountForExport(displayAmount),
        getStatusText(payment.status),
        payment.method || '-'
      ]
    })
    
    // Add table
    doc.autoTable({
      startY: yPos,
      head: [['#', 'Invoice', 'Inquiry', 'User', 'Jumlah', 'Status', 'Metode']],
      body: tableData,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [15, 23, 42] }
    })
    
    // Add summary
    const finalY = doc.lastAutoTable.finalY || yPos + 10
    doc.setFontSize(10)
    doc.text(`Total Pembayaran: ${filteredPayments.length}`, 14, finalY + 10)
    
    const totalAmount = filteredPayments.reduce((sum, p) => {
      const amount = Number(getDisplayAmount(p))
      return Number.isFinite(amount) ? sum + amount : sum
    }, 0)
    doc.text(`Total Nilai: ${formatCurrency(totalAmount)}`, 14, finalY + 17)
    
    // Save PDF
    const fileName = `pembayaran_${new Date().toISOString().split('T')[0]}.pdf`
    doc.save(fileName)
  }

  const exportToExcel = () => {
    // Prepare data for Excel
    const excelData = filteredPayments.map((payment, index) => {
      const inquiry = inquiriesMap[payment.inquiryId]
      const displayAmount = getDisplayAmount(payment)
      return {
        'No': index + 1,
        'Invoice': payment.reference || payment.id,
        'Inquiry ID': payment.inquiryId || '-',
        'User ID': inquiry?.userId || payment.userId || '-',
        'Jumlah': numberAmountForExport(displayAmount),
        'Status': getStatusText(payment.status),
        'Metode': payment.method || '-',
        'Dibayar': payment.paidAt ? new Date(payment.paidAt).toLocaleString('id-ID') : '-',
        'Dibuat': payment.createdAt ? new Date(payment.createdAt).toLocaleString('id-ID') : '-'
      }
    })
    
    // Create workbook and worksheet
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(excelData)
    
    // Set column widths
    ws['!cols'] = [
      { wch: 5 },  // No
      { wch: 20 }, // Invoice
      { wch: 25 }, // Inquiry ID
      { wch: 25 }, // User ID
      { wch: 15 }, // Jumlah
      { wch: 20 }, // Status
      { wch: 15 }, // Metode
      { wch: 20 }, // Dibayar
      { wch: 20 }  // Dibuat
    ]
    
    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Pembayaran')
    
    // Save Excel file
    const fileName = `pembayaran_${new Date().toISOString().split('T')[0]}.xlsx`
    XLSX.writeFile(wb, fileName)
  }

  return (
    <Container fluid className="py-4 px-3">
      {error && (
        <Alert variant="danger" dismissible onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {missingPriceCount > 0 && (
        <Alert variant="warning" className="mb-3">
          {missingPriceCount} pembayaran tidak memiliki total harga dari Inquiry. UI akan menampilkan “Harga tidak tersedia”, dan export akan mengosongkan kolom jumlah.
        </Alert>
      )}

      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4">
        <div>
          <h2 className="fw-bold mb-0">Pembayaran</h2>
          <p className="text-muted mb-0">Pantau status pembayaran dan keterkaitan inquiry.</p>
        </div>
        <div className="d-flex flex-wrap gap-2 align-items-center">
          {lastSync && <span className="text-muted small">Sinkron: {formatDate(lastSync)}</span>}
          <Button variant="outline-success" size="sm" onClick={exportToExcel} disabled={loading || filteredPayments.length === 0}>
            Export Excel
          </Button>
          <Button variant="outline-danger" size="sm" onClick={exportToPDF} disabled={loading || filteredPayments.length === 0}>
            Export PDF
          </Button>
          <Button variant="outline-primary" size="sm" onClick={() => loadData(false)} disabled={refreshing}>
            {refreshing ? 'Menyinkronkan...' : 'Sinkronkan sekarang'}
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-3 mb-3">
        <Form className="row g-3">
          <div className="col-12 col-md-3">
            <Form.Label className="small text-muted">Status</Form.Label>
            <Form.Select value={filters.status} onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}>
              <option value="all">Semua</option>
              <option value="pending">Pending</option>
              <option value="waiting_verification">Menunggu Verifikasi</option>
              <option value="confirmed">Terverifikasi</option>
              <option value="rejected">Ditolak</option>
              <option value="expired">Expired</option>
            </Form.Select>
          </div>
          <div className="col-12 col-md-3">
            <Form.Label className="small text-muted">Metode</Form.Label>
            <Form.Select value={filters.method} onChange={(e) => setFilters((prev) => ({ ...prev, method: e.target.value }))}>
              <option value="all">Semua</option>
              <option value="Manual">Manual</option>
              <option value="Transfer">Transfer</option>
              <option value="Cash">Cash</option>
              <option value="Virtual Account">Virtual Account</option>
              <option value="Credit Card">Credit Card</option>
            </Form.Select>
          </div>
          <div className="col-6 col-md-3">
            <Form.Label className="small text-muted">Dari Tanggal</Form.Label>
            <Form.Control type="date" value={filters.from} onChange={(e) => setFilters((prev) => ({ ...prev, from: e.target.value }))} />
          </div>
          <div className="col-6 col-md-3">
            <Form.Label className="small text-muted">Sampai</Form.Label>
            <Form.Control type="date" value={filters.to} onChange={(e) => setFilters((prev) => ({ ...prev, to: e.target.value }))} />
          </div>
        </Form>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <Table hover responsive className="mb-0 align-middle">
          <thead className="bg-slate-900 text-white">
            <tr>
              <th>#</th>
              <th>Invoice</th>
              <th>Inquiry</th>
              <th>User</th>
              <th>Jumlah</th>
              <th>Status</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="7" className="text-center py-4 text-slate-500">
                  <Spinner animation="border" size="sm" className="me-2" /> Memuat data...
                </td>
              </tr>
            ) : filteredPayments.length === 0 ? (
              <tr>
                <td colSpan="7" className="text-center py-4 text-slate-500">Belum ada pembayaran</td>
              </tr>
            ) : (
              filteredPayments.map((payment, index) => {
                const inquiry = inquiriesMap[payment.inquiryId]
                const displayAmount = getDisplayAmount(payment)
                return (
                  <tr key={payment.id}>
                    <td>{index + 1}</td>
                    <td className="fw-semibold">{payment.reference || payment.id}</td>
                    <td>{payment.inquiryId || '-'}</td>
                    <td>{inquiry?.userId || payment.userId || '-'}</td>
                    <td>{formatAmountStrict(displayAmount)}</td>
                    <td>{getStatusBadge(payment.status)}</td>
                    <td>
                      <div className="d-flex flex-column flex-sm-row gap-2">
                        <Button variant="outline-primary" size="sm" onClick={() => handleViewDetails(payment)} className="w-100">
                          Detail
                        </Button>
                        <Button variant="outline-info" size="sm" onClick={() => handleStatusUpdate(payment.id, 'waiting_verification')} disabled={!!updatingId} className="w-100">
                          Menunggu Verifikasi
                        </Button>
                        <Button variant="outline-success" size="sm" onClick={() => handleStatusUpdate(payment.id, 'confirmed')} disabled={!!updatingId} className="w-100">
                          Verifikasi
                        </Button>
                        <Button variant="outline-danger" size="sm" onClick={() => handleStatusUpdate(payment.id, 'rejected')} disabled={!!updatingId} className="w-100">
                          Tolak
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </Table>
      </div>

      <Modal show={showModal} onHide={handleCloseModal} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>Detail Pembayaran</Modal.Title>
        </Modal.Header>
        <Modal.Body className="max-h-[70vh] overflow-y-auto">
          {selectedPayment && (
            <div className="d-flex flex-column gap-3">
              <Card>
                <Card.Body>
                  <h5 className="mb-3">Informasi Pembayaran</h5>
                  <Row className="gy-2">
                    <Col md={6}><strong>Invoice:</strong> {selectedPayment.reference || selectedPayment.id}</Col>
                    <Col md={6}><strong>Status:</strong> {getStatusBadge(selectedPayment.status)}</Col>
                    <Col md={6}><strong>Jumlah:</strong> {formatAmountStrict(getDisplayAmount(selectedPayment))}</Col>
                    <Col md={6}><strong>Metode:</strong> {selectedPayment.method}</Col>
                    <Col md={6}><strong>Dibayar:</strong> {formatDate(selectedPayment.paidAt)}</Col>
                    <Col md={6}><strong>Dibuat:</strong> {formatDate(selectedPayment.createdAt)}</Col>
                    <Col md={6}><strong>Diperbarui:</strong> {formatDate(selectedPayment.updatedAt)}</Col>
                  </Row>
                </Card.Body>
              </Card>

              <Card>
                <Card.Body>
                  <h5 className="mb-3">Keterkaitan Inquiry</h5>
                  {(() => {
                    const inquiry = inquiriesMap[selectedPayment.inquiryId]
                    if (!inquiry) return <p className="text-muted mb-0">Inquiry tidak ditemukan.</p>
                    return (
                      <div className="d-flex flex-column gap-2">
                        <div><strong>Inquiry ID:</strong> {inquiry.id}</div>
                        <div><strong>User ID:</strong> {inquiry.userId}</div>
                        <div>
                          <strong>Unit:</strong>{' '}
                          {(() => {
                            const unitTypeId = String(inquiry.unitTypeId || '').trim()
                            const unitNumber = unitNumberMap[unitTypeId]
                            if (unitNumber) return `Unit ${formatUnitNumber(unitNumber)}`
                            return unitTypeNameMap[unitTypeId] || '-'
                          })()}
                        </div>
                        <div><strong>Tipe:</strong> {inquiry.purchaseType === 'rent' ? 'Sewa' : 'Beli'}</div>
                        <div><strong>Status Inquiry:</strong> {inquiry.status}</div>
                        <div><strong>Dibuat:</strong> {formatDate(inquiry.createdAt)}</div>
                      </div>
                    )
                  })()}
                </Card.Body>
              </Card>

              {(selectedPayment.invoiceUrl || selectedPayment.proofUrl) && (
                <Card>
                  <Card.Body className="d-flex flex-wrap gap-2">
                    {selectedPayment.invoiceUrl && (
                      <Button as="a" href={selectedPayment.invoiceUrl} target="_blank" rel="noreferrer" variant="outline-secondary">
                        Lihat Invoice
                      </Button>
                    )}
                    {selectedPayment.proofUrl && (
                      <Button as="a" href={selectedPayment.proofUrl} target="_blank" rel="noreferrer" variant="outline-secondary">
                        Bukti Pembayaran
                      </Button>
                    )}
                  </Card.Body>
                </Card>
              )}

              <Card>
                <Card.Body>
                  <h5 className="mb-3">Perbarui Status</h5>
                  <div className="d-flex flex-wrap gap-2">
                    <Button variant="info" onClick={() => handleStatusUpdate(selectedPayment.id, 'waiting_verification')} disabled={!!updatingId} className="w-100 flex-sm-grow-0">
                      Menunggu Verifikasi
                    </Button>
                    <Button variant="success" onClick={() => handleStatusUpdate(selectedPayment.id, 'confirmed')} disabled={!!updatingId} className="w-100 flex-sm-grow-0">
                      Verifikasi
                    </Button>
                    <Button variant="danger" onClick={() => handleStatusUpdate(selectedPayment.id, 'rejected')} disabled={!!updatingId} className="w-100 flex-sm-grow-0">
                      Tolak
                    </Button>
                  </div>
                </Card.Body>
              </Card>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseModal} disabled={!!updatingId}>
            Tutup
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  )
}

export default AdminPayments
