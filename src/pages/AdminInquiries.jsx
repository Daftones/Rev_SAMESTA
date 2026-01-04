import { useState, useEffect, useMemo } from 'react'
import { Container, Table, Badge, Button, Modal, Card, Row, Col, Form, Alert, Spinner } from 'react-bootstrap'
import { inquiriesAPI } from '../services/api'

function AdminInquiries() {
  const [inquiries, setInquiries] = useState([])
  const [selectedInquiry, setSelectedInquiry] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [filters, setFilters] = useState({ purchaseType: 'all', from: '', to: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [updatingId, setUpdatingId] = useState('')

  useEffect(() => {
    loadInquiries()
  }, [])

  const resolveImageUrl = (path) => {
    if (!path || typeof path !== 'string') return path
    if (path.startsWith('http')) return path
    const base = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/?api\/?$/, '')
    return `${base}/${path.replace(/^\//, '')}`
  }

  const normalizeStatus = (raw) => {
    if (!raw) return 'sent'
    const computed = (
      raw.status ||
      raw.inquiry_status ||
      raw.approval_status ||
      raw.state ||
      raw.request_status ||
      raw.status_inquiry ||
      (raw.is_approved === true ? 'approved' : undefined) ||
      (raw.is_rejected === true ? 'rejected' : undefined) ||
      (raw.approved_at ? 'approved' : undefined) ||
      (raw.rejected_at || raw.declined_at ? 'rejected' : undefined) ||
      'sent'
    )

    const normalized = String(computed).trim().toLowerCase()
    // Unify common synonyms
    if (normalized === 'submit' || normalized === 'submitted') return 'sent'
    if (normalized === 'approve' || normalized === 'accepted' || normalized === 'disetujui') return 'approved'
    if (normalized === 'declined' || normalized === 'deny' || normalized === 'denied' || normalized === 'ditolak') return 'rejected'
    return normalized
  }

  const normalizeInquiry = (raw) => {
    if (!raw) return null

    const identityCard = raw.identity_card || raw.identityCard
    const identityCardList = Array.isArray(identityCard)
      ? identityCard
      : identityCard
        ? [identityCard]
        : []

    const idCardPhotos = identityCardList
      .filter(Boolean)
      .map((p) => resolveImageUrl(p))

    return {
      id: raw.id || raw.inquiry_id || raw.uuid || raw._id,
      userId: raw.user_id || raw.userId || raw.user_identifier,
      unitId: raw.unit_id || raw.unitId,
      purchaseType: raw.purchase_type || raw.purchaseType || 'rent',
      status: normalizeStatus(raw),
      address: raw.address || '',
      createdAt: raw.created_at || raw.createdAt || new Date().toISOString(),
      idCardPhotos,
      idCardPhoto: idCardPhotos[0] || resolveImageUrl(raw.id_card_photo_url || raw.id_card_photo || raw.idCardPhoto),
      timeline: Array.isArray(raw.timeline) ? raw.timeline : [],
    }
  }

  const loadInquiries = async () => {
    setLoading(true)
    setError('')
    try {
      const response = await inquiriesAPI.getAll()
      const list = Array.isArray(response?.data) ? response.data : Array.isArray(response) ? response : []
      const normalized = list
        .map(normalizeInquiry)
        .filter(Boolean)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      setInquiries(normalized)
    } catch (err) {
      console.error('Gagal memuat inquiry', err)
      setError('Gagal memuat data inquiry. Coba lagi atau periksa koneksi.')
    } finally {
      setLoading(false)
    }
  }

  const handleViewDetails = (inquiry) => {
    setSelectedInquiry(inquiry)
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setSelectedInquiry(null)
  }

  const handleDelete = async (inquiryId) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus inquiry ini?')) return
    setUpdatingId(inquiryId)
    try {
      await inquiriesAPI.delete(inquiryId)
      const filteredInquiries = inquiries.filter(inq => inq.id !== inquiryId)
      setInquiries(filteredInquiries)
      handleCloseModal()
    } catch (err) {
      console.error('Gagal menghapus inquiry', err)
      setError('Gagal menghapus inquiry. Coba lagi.')
    } finally {
      setUpdatingId('')
    }
  }

  const getStatusBadge = (status) => {
    const map = {
      sent: { text: 'Terkirim', variant: 'secondary' },
      submitted: { text: 'Terkirim', variant: 'secondary' },
      contacted: { text: 'Dihubungi', variant: 'info' },
      scheduled: { text: 'Dijadwalkan', variant: 'primary' },
      completed: { text: 'Selesai', variant: 'success' },
      cancelled: { text: 'Dibatalkan', variant: 'danger' },
      pending: { text: 'Pending', variant: 'warning' },
      approved: { text: 'Approved', variant: 'success' },
      rejected: { text: 'Rejected', variant: 'danger' },
      declined: { text: 'Rejected', variant: 'danger' },
    }
    const meta = map[status] || { text: status, variant: 'secondary' }
    return <Badge bg={meta.variant}>{meta.text}</Badge>
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const filteredInquiries = useMemo(() => {
    return inquiries.filter((inq) => {
      if (filters.purchaseType !== 'all' && inq.purchaseType !== filters.purchaseType) return false
      if (filters.from && new Date(inq.createdAt) < new Date(filters.from)) return false
      if (filters.to) {
        const end = new Date(filters.to)
        end.setHours(23,59,59,999)
        if (new Date(inq.createdAt) > end) return false
      }
      return true
    })
  }, [inquiries, filters])

  const exportExcel = () => {
    // Generate a simple HTML table that Excel can open
    const header = ['ID', 'User ID', 'Unit ID', 'Tipe', 'Tanggal']
    const rows = filteredInquiries.map((inq) => [
      inq.id,
      inq.userId,
      inq.unitId,
      inq.purchaseType,
      formatDate(inq.createdAt)
    ])

    const tableRows = rows
      .map((cols) => `<tr>${cols.map((col) => `<td>${String(col ?? '')}</td>`).join('')}</tr>`)
      .join('')

    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Inquiries</title></head><body><table border="1"><thead><tr>${header.map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${tableRows}</tbody></table></body></html>`

    const blob = new Blob([html], { type: 'application/vnd.ms-excel' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'inquiries.xls'
    link.click()
    URL.revokeObjectURL(url)
  }

  const exportPDF = () => {
    const printWindow = window.open('', '_blank')
    const rows = filteredInquiries.map((inq) => `<tr><td>${inq.id}</td><td>${inq.userId}</td><td>${inq.unitId}</td><td>${inq.purchaseType}</td><td>${formatDate(inq.createdAt)}</td></tr>`).join('')
    printWindow.document.write(`<!doctype html><html><head><title>Inquiries</title></head><body><table border="1" cellspacing="0" cellpadding="6"><thead><tr><th>ID</th><th>User ID</th><th>Unit ID</th><th>Tipe</th><th>Tanggal</th></tr></thead><tbody>${rows}</tbody></table></body></html>`)
    printWindow.document.close()
    printWindow.focus()
    printWindow.print()
  }

  return (
    <Container fluid className="py-4 px-3">
      {error && (
        <Alert variant="danger" dismissible onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4">
        <div>
          <h2 className="fw-bold mb-0">Kelola Inquiry</h2>
          <p className="text-muted mb-0">Total: {inquiries.length} inquiry</p>
        </div>
        <div className="d-flex flex-wrap gap-2">
          <Button variant="outline-secondary" size="sm" onClick={exportExcel}>
            Export Excel
          </Button>
          <Button variant="outline-secondary" size="sm" onClick={exportPDF}>
            Export PDF
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-3 mb-3">
        <Form className="row g-3">
          <div className="col-12 col-md-3">
            <Form.Label className="small text-muted">Tipe Transaksi</Form.Label>
            <Form.Select
              value={filters.purchaseType}
              onChange={(e) => setFilters((prev) => ({ ...prev, purchaseType: e.target.value }))}
            >
              <option value="all">Semua</option>
              <option value="rent">Sewa</option>
              <option value="sale">Beli</option>
            </Form.Select>
          </div>
          <div className="col-6 col-md-3">
            <Form.Label className="small text-muted">Dari Tanggal</Form.Label>
            <Form.Control
              type="date"
              value={filters.from}
              onChange={(e) => setFilters((prev) => ({ ...prev, from: e.target.value }))}
            />
          </div>
          <div className="col-6 col-md-3">
            <Form.Label className="small text-muted">Sampai</Form.Label>
            <Form.Control
              type="date"
              value={filters.to}
              onChange={(e) => setFilters((prev) => ({ ...prev, to: e.target.value }))}
            />
          </div>
        </Form>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <Table hover responsive className="mb-0 align-middle">
          <thead className="bg-slate-900 text-white">
            <tr>
              <th>#</th>
              <th>User ID</th>
              <th>Unit ID</th>
              <th>Tipe</th>
              <th>Tanggal</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="6" className="text-center py-4 text-slate-500">
                  <Spinner animation="border" size="sm" className="me-2" /> Memuat data...
                </td>
              </tr>
            ) : filteredInquiries.length === 0 ? (
              <tr>
                <td colSpan="6" className="text-center py-4 text-slate-500">
                  Belum ada inquiry
                </td>
              </tr>
            ) : (
              filteredInquiries.map((inquiry, index) => (
                <tr key={inquiry.id}>
                  <td>{index + 1}</td>
                  <td>{inquiry.userId}</td>
                  <td>{inquiry.unitId}</td>
                  <td>
                    <Badge bg={inquiry.purchaseType === 'rent' ? 'info' : 'primary'}>
                      {inquiry.purchaseType === 'rent' ? 'Sewa' : 'Beli'}
                    </Badge>
                  </td>
                  <td>{formatDate(inquiry.createdAt)}</td>
                  <td>
                    <div className="d-flex flex-column flex-sm-row gap-2">
                      <Button 
                        variant="outline-primary" 
                        size="sm"
                        onClick={() => handleViewDetails(inquiry)}
                        className="w-100"
                      >
                        Detail
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      </div>

      {/* Detail Modal */}
      <Modal show={showModal} onHide={handleCloseModal} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>Detail Inquiry</Modal.Title>
        </Modal.Header>
        <Modal.Body className="max-h-[70vh] overflow-y-auto">
          {selectedInquiry && (
            <div>
              <Card className="mb-3">
                <Card.Body>
                  <h5 className="mb-3">Informasi Customer</h5>
                  <Row className="mb-2 gy-2 align-items-start">
                    <Col xs={12} sm={4}><strong>User ID / NIK:</strong></Col>
                    <Col xs={12} sm={8}>{selectedInquiry.userId}</Col>
                  </Row>
                  <Row className="mb-2 gy-2 align-items-start">
                    <Col xs={12} sm={4}><strong>Unit ID:</strong></Col>
                    <Col xs={12} sm={8}>{selectedInquiry.unitId}</Col>
                  </Row>
                  <Row className="mb-2 gy-2 align-items-start">
                    <Col xs={12} sm={4}><strong>Tipe Transaksi:</strong></Col>
                    <Col xs={12} sm={8}>
                      <Badge bg={selectedInquiry.purchaseType === 'rent' ? 'info' : 'primary'}>
                        {selectedInquiry.purchaseType === 'rent' ? 'Sewa' : 'Beli'}
                      </Badge>
                    </Col>
                  </Row>
                  <Row className="mb-2 gy-2 align-items-start">
                    <Col xs={12} sm={4}><strong>Alamat:</strong></Col>
                    <Col xs={12} sm={8}>{selectedInquiry.address}</Col>
                  </Row>
                  <Row className="gy-2 align-items-start">
                    <Col xs={12} sm={4}><strong>Tanggal:</strong></Col>
                    <Col xs={12} sm={8}>{formatDate(selectedInquiry.createdAt)}</Col>
                  </Row>
                </Card.Body>
              </Card>

              <Card className="mb-3">
                <Card.Body>
                  <h5 className="mb-3">Foto KTP</h5>
                  {Array.isArray(selectedInquiry.idCardPhotos) && selectedInquiry.idCardPhotos.length > 0 ? (
                    <div className="d-flex flex-column gap-2">
                      {selectedInquiry.idCardPhotos.map((src, idx) => (
                        <img
                          key={idx}
                          src={src}
                          alt={`KTP ${idx + 1}`}
                          className="img-fluid rounded shadow"
                          style={{ maxHeight: '16.25rem', width: '100%', objectFit: 'contain' }}
                        />
                      ))}
                    </div>
                  ) : selectedInquiry.idCardPhoto ? (
                    <img
                      src={selectedInquiry.idCardPhoto}
                      alt="KTP"
                      className="img-fluid rounded shadow"
                      style={{ maxHeight: '16.25rem', width: '100%', objectFit: 'contain' }}
                    />
                  ) : (
                    <p className="text-muted">Tidak ada foto</p>
                  )}
                </Card.Body>
              </Card>

            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-danger" onClick={() => handleDelete(selectedInquiry.id)} disabled={!!updatingId}>
            {updatingId ? 'Menghapus...' : 'Hapus Inquiry'}
          </Button>
          <Button variant="secondary" onClick={handleCloseModal} disabled={!!updatingId}>
            Tutup
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  )
}

export default AdminInquiries
