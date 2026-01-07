import { useState, useEffect, useMemo } from 'react'
import { Container, Table, Badge, Button, Modal, Card, Row, Col, Form, Alert, Spinner } from 'react-bootstrap'
import jsPDF from 'jspdf'
import 'jspdf-autotable'
import { inquiriesAPI, unitTypesAPI } from '../services/api'
import { buildUnitNumberMap, formatUnitNumber } from '../utils/unitNaming'

function AdminInquiries() {
  const [inquiries, setInquiries] = useState([])
  const [unitMap, setUnitMap] = useState({})
  const [unitNumberMap, setUnitNumberMap] = useState({})
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
    if (!path || typeof path !== 'string') {
      console.warn('[resolveImageUrl] Invalid path:', path)
      return null
    }
    
    // If already a full URL, ensure it uses HTTPS to prevent mixed content issues
    if (path.startsWith('http://') || path.startsWith('https://')) {
      const resolved = path.replace(/^http:\/\//i, 'https://')
      console.log('[resolveImageUrl] Full URL resolved:', resolved)
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
    
    console.log('[resolveImageUrl] Resolved:', { original: path, base, cleanPath, resolved })
    return resolved
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
      .filter(Boolean) // Remove null/undefined results

    const singlePhoto = resolveImageUrl(
      raw.id_card_photo_url || raw.id_card_photo || raw.idCardPhoto
    )

    console.log('[normalizeInquiry] Processing:', {
      id: raw.id,
      raw_identity_card: identityCard,
      raw_single: raw.id_card_photo_url || raw.id_card_photo || raw.idCardPhoto,
      resolved_photos: idCardPhotos,
      resolved_single: singlePhoto
    })

    return {
      id: raw.id || raw.inquiry_id || raw.uuid || raw._id,
      userId: raw.user_id || raw.userId || raw.user_identifier,
      userName: (
        raw?.user?.name ||
        raw?.customer?.name ||
        raw?.user_name ||
        raw?.customer_name ||
        raw?.name ||
        ''
      ),
      userIdentifier: raw.user_identifier || raw.userIdentifier || raw.email || '',
      unitId: raw.unit_id || raw.unitId,
      unitTypeId: raw.unit_type_id || raw.unitTypeId || raw.unit_type || raw.unitType || '',
      purchaseType: raw.purchase_type || raw.purchaseType || 'rent',
      status: normalizeStatus(raw),
      address: raw.address || '',
      createdAt: raw.created_at || raw.createdAt || new Date().toISOString(),
      idCardPhotos,
      idCardPhoto: idCardPhotos[0] || singlePhoto,
      timeline: Array.isArray(raw.timeline) ? raw.timeline : [],
    }
  }

  const normalizeUnitName = (raw) => {
    const candidate = raw?.name || raw?.unit_name || raw?.title
    return String(candidate || '').trim()
  }

  const buildUnitMap = (list) => {
    const mapped = {}
    ;(Array.isArray(list) ? list : []).forEach((raw) => {
      const id = String(raw?.unit_type_id ?? raw?.id ?? raw?.uuid ?? '').trim()
      if (!id) return
      mapped[id] = {
        id,
        name: normalizeUnitName(raw),
      }
    })
    return mapped
  }

  const getInquiryUserLabel = (inq) => {
    const name = String(inq?.userName || '').trim()
    if (name) return name

    const identifier = String(inq?.userIdentifier || '').trim()
    if (identifier) return identifier

    const id = String(inq?.userId || '').trim()
    if (id) return id

    return '-'
  }

  const getInquiryUnitLabel = (inq) => {
    const byTypeId = String(inq?.unitTypeId || '').trim()
    const byUnitId = String(inq?.unitId || '').trim()

    const byTypeNumber = byTypeId ? unitNumberMap[byTypeId] : null
    if (byTypeNumber) return `Unit ${formatUnitNumber(byTypeNumber)}`

    const byUnitNumber = byUnitId ? unitNumberMap[byUnitId] : null
    if (byUnitNumber) return `Unit ${formatUnitNumber(byUnitNumber)}`

    const unit = (byTypeId && unitMap[byTypeId]) ? unitMap[byTypeId] : (byUnitId && unitMap[byUnitId]) ? unitMap[byUnitId] : null
    const name = String(unit?.name || '').trim()
    if (name) return name
    return byTypeId || byUnitId || '-'
  }

  const blobToDataUrl = (blob) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onerror = () => reject(new Error('Failed to read blob'))
      reader.onload = () => resolve(String(reader.result || ''))
      reader.readAsDataURL(blob)
    })
  }

  const guessImageFormat = (dataUrlOrMime) => {
    const s = String(dataUrlOrMime || '').toLowerCase()
    if (s.includes('png')) return 'PNG'
    return 'JPEG'
  }

  const fetchImageAsDataUrl = async (url) => {
    if (!url) throw new Error('Empty image url')
    const res = await fetch(url)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const blob = await res.blob()
    const dataUrl = await blobToDataUrl(blob)
    return { dataUrl, mime: blob.type || '' }
  }

  const loadInquiries = async () => {
    setLoading(true)
    setError('')
    try {
      const [response, unitsRes] = await Promise.all([
        inquiriesAPI.getAll(),
        unitTypesAPI.getAll().catch(() => null),
      ])

      const unitList = Array.isArray(unitsRes?.data) ? unitsRes.data : Array.isArray(unitsRes) ? unitsRes : []
      const nextUnitMap = buildUnitMap(unitList)
      setUnitMap(nextUnitMap)

      const nextUnitNumberMap = buildUnitNumberMap(unitList, {
        getId: (x) => x?.unit_type_id ?? x?.id ?? x?.uuid,
        getFloor: (x) => x?.floor,
        getName: (x) => x?.name,
      })
      setUnitNumberMap(nextUnitNumberMap)

      console.log('[loadInquiries] Raw response:', response)
      const list = Array.isArray(response?.data) ? response.data : Array.isArray(response) ? response : []
      console.log('[loadInquiries] List count:', list.length)
      if (list.length > 0) {
        console.log('[loadInquiries] Sample raw inquiry:', list[0])
      }
      const normalized = list
        .map(normalizeInquiry)
        .filter(Boolean)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      console.log('[loadInquiries] Normalized count:', normalized.length)
      if (normalized.length > 0) {
        console.log('[loadInquiries] Sample normalized inquiry:', normalized[0])
      }
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
    const header = ['ID', 'User', 'Unit', 'Tipe', 'Tanggal']
    const rows = filteredInquiries.map((inq) => [
      inq.id,
      getInquiryUserLabel(inq),
      getInquiryUnitLabel(inq),
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

  const exportPDF = async () => {
    setError('')

    try {
      // Optional enrichment so PDF can include unit info similar to admin context.
      let unitTypesMap = {}
      let unitNumberMapForExport = {}
      try {
        const res = await unitTypesAPI.getAll()
        const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : []

        unitNumberMapForExport = buildUnitNumberMap(list, {
          getId: (x) => x?.unit_type_id ?? x?.id ?? x?.uuid,
          getFloor: (x) => x?.floor,
          getName: (x) => x?.name,
        })

        list.forEach((raw) => {
          const id = String(raw?.unit_type_id ?? raw?.id ?? raw?.uuid ?? '').trim()
          if (!id) return
          unitTypesMap[id] = {
            id,
            name: String(raw?.name || raw?.unit_name || raw?.title || '').trim(),
            rentPrice: Number(raw?.rent_price ?? raw?.rentPrice),
            salePrice: Number(raw?.sale_price ?? raw?.salePrice),
          }
        })
      } catch (err) {
        console.warn('Failed to fetch unit types for inquiries PDF export', err)
      }

      const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' })
      const pageWidth = doc.internal.pageSize.getWidth()

      doc.setFontSize(16)
      doc.text('Laporan Inquiry (Admin)', 40, 40)
      doc.setFontSize(10)
      doc.text(`Diekspor: ${formatDate(new Date().toISOString())}`, 40, 58)
      doc.text(`Total data: ${filteredInquiries.length}`, 40, 72)

      const tableData = filteredInquiries.map((inq, idx) => {
        const unitType = unitTypesMap[String(inq.unitTypeId || '').trim()]
        const unitTypeId = String(inq.unitTypeId || '').trim()
        const derivedUnitNumber = unitTypeId ? unitNumberMapForExport[unitTypeId] : null
        const derivedUnitLabel = derivedUnitNumber ? `Unit ${formatUnitNumber(derivedUnitNumber)}` : (unitType?.name || '')
        const isRent = String(inq.purchaseType || '').toLowerCase() === 'rent'
        const derivedPrice = unitType
          ? (isRent ? unitType.rentPrice : unitType.salePrice)
          : null

        return [
          idx + 1,
          String(inq.id || ''),
          String(inq.userId || ''),
          String(inq.userIdentifier || ''),
          String(inq.unitId || ''),
          String(inq.unitTypeId || ''),
          derivedUnitLabel,
          isRent ? 'Sewa' : 'Beli',
          String(inq.status || ''),
          String(inq.address || ''),
          formatDate(inq.createdAt),
          Number.isFinite(Number(derivedPrice)) ? String(derivedPrice) : '',
          (Array.isArray(inq.idCardPhotos) && inq.idCardPhotos.length > 0)
            ? String(inq.idCardPhotos[0] || '')
            : String(inq.idCardPhoto || ''),
        ]
      })

      doc.autoTable({
        startY: 90,
        head: [[
          '#',
          'Inquiry ID',
          'User ID / NIK',
          'User Identifier',
          'Unit ID',
          'Unit Type ID',
          'Unit',
          'Tipe',
          'Status',
          'Alamat',
          'Tanggal',
          'Harga (derived)',
          'Foto KTP (URL)',
        ]],
        body: tableData,
        styles: { fontSize: 8, cellPadding: 3, overflow: 'linebreak' },
        headStyles: { fillColor: [15, 23, 42] },
        columnStyles: {
          9: { cellWidth: 180 },
          12: { cellWidth: Math.max(140, Math.min(220, pageWidth - 80)) },
        },
      })

      // Attach KTP images as separate pages (best-effort). If CORS blocks embedding, keep URLs.
      for (const inq of filteredInquiries) {
        const photos = Array.isArray(inq.idCardPhotos) && inq.idCardPhotos.length > 0
          ? inq.idCardPhotos
          : (inq.idCardPhoto ? [inq.idCardPhoto] : [])

        if (photos.length === 0) continue

        for (let idx = 0; idx < photos.length; idx += 1) {
          const url = photos[idx]
          if (!url) continue

          doc.addPage('a4', 'portrait')
          doc.setFontSize(14)
          doc.text(`Inquiry ${String(inq.id || '')} • Foto KTP ${idx + 1}`, 40, 40)
          doc.setFontSize(10)
          doc.text(`User: ${String(inq.userId || '')}`, 40, 58)
          doc.text(`Unit: ${String(getInquiryUnitLabel(inq) || '')}`, 40, 72)
          doc.text(`URL: ${String(url)}`, 40, 86, { maxWidth: 515 })

          try {
            const { dataUrl, mime } = await fetchImageAsDataUrl(url)
            const format = guessImageFormat(mime || dataUrl)
            const pageW = doc.internal.pageSize.getWidth()
            const pageH = doc.internal.pageSize.getHeight()
            const margin = 40
            const maxW = pageW - margin * 2
            const maxH = pageH - 120
            doc.addImage(dataUrl, format, margin, 110, maxW, maxH, undefined, 'FAST')
          } catch (err) {
            doc.setTextColor(180, 0, 0)
            doc.text(`Tidak bisa embed gambar (kemungkinan CORS/URL invalid): ${String(err?.message || err)}`, 40, 110, { maxWidth: 515 })
            doc.setTextColor(0, 0, 0)
          }
        }
      }

      const fileName = `inquiries_${new Date().toISOString().split('T')[0]}.pdf`
      doc.save(fileName)
    } catch (err) {
      console.error('Failed to export inquiries PDF', err)
      setError('Gagal export PDF inquiry. Silakan coba lagi. (Jika foto tidak ikut, kemungkinan diblokir CORS.)')
    }
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
              <th>User</th>
              <th>Unit</th>
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
                  <td>
                    <div className="fw-semibold text-slate-900">{getInquiryUserLabel(inquiry)}</div>
                    {(String(inquiry?.userId || '').trim() && String(inquiry?.userName || '').trim() && String(inquiry?.userId || '').trim() !== String(inquiry?.userName || '').trim()) && (
                      <div className="text-muted small">ID: {String(inquiry.userId)}</div>
                    )}
                  </td>
                  <td>
                    <div className="fw-semibold text-slate-900">{getInquiryUnitLabel(inquiry)}</div>
                    {(String(inquiry?.unitId || '').trim() || String(inquiry?.unitTypeId || '').trim()) && (
                      <div className="text-muted small">ID: {String(inquiry.unitTypeId || inquiry.unitId || '')}</div>
                    )}
                  </td>
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
      {/* ================= DETAIL MODAL ================= */}
      <Modal show={showModal} onHide={handleCloseModal} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>Detail Inquiry</Modal.Title>
        </Modal.Header>

        <Modal.Body className="max-h-[70vh] overflow-y-auto">
          {selectedInquiry && (
            <>
              {/* ================= INFORMASI CUSTOMER ================= */}
              <Card className="mb-3">
                <Card.Body>
                  <h5 className="mb-3">Informasi Customer</h5>

                  <Row className="mb-2 gy-2">
                    <Col xs={12} sm={4}><strong>User:</strong></Col>
                    <Col xs={12} sm={8}>
                      <div className="fw-semibold">{getInquiryUserLabel(selectedInquiry)}</div>
                      {String(selectedInquiry?.userId || '').trim() && (
                        <div className="text-muted small">User ID/NIK: {String(selectedInquiry.userId)}</div>
                      )}
                    </Col>
                  </Row>

                  <Row className="mb-2 gy-2">
                    <Col xs={12} sm={4}><strong>Unit:</strong></Col>
                    <Col xs={12} sm={8}>
                      <div className="fw-semibold">{getInquiryUnitLabel(selectedInquiry)}</div>
                      {(String(selectedInquiry?.unitId || '').trim() || String(selectedInquiry?.unitTypeId || '').trim()) && (
                        <div className="text-muted small">Unit ID: {String(selectedInquiry.unitTypeId || selectedInquiry.unitId || '')}</div>
                      )}
                    </Col>
                  </Row>

                  <Row className="mb-2 gy-2">
                    <Col xs={12} sm={4}><strong>Tipe Transaksi:</strong></Col>
                    <Col xs={12} sm={8}>
                      <Badge bg={selectedInquiry.purchaseType === 'rent' ? 'info' : 'primary'}>
                        {selectedInquiry.purchaseType === 'rent' ? 'Sewa' : 'Beli'}
                      </Badge>
                    </Col>
                  </Row>

                  <Row className="mb-2 gy-2">
                    <Col xs={12} sm={4}><strong>Alamat:</strong></Col>
                    <Col xs={12} sm={8}>{selectedInquiry.address}</Col>
                  </Row>

                  <Row className="gy-2">
                    <Col xs={12} sm={4}><strong>Tanggal:</strong></Col>
                    <Col xs={12} sm={8}>{formatDate(selectedInquiry.createdAt)}</Col>
                  </Row>
                </Card.Body>
              </Card>

              {/* ================= FOTO KTP ================= */}
              <Card>
                <Card.Body>
                  <h5 className="mb-3">Foto KTP</h5>

                  {(() => {
                    const normalizeBase64 = (value) => {
                      if (!value) return null

                      // sudah benar (OPS I B)
                      if (value.startsWith('data:image')) return value

                      // masih keprefix URL API → potong
                      const idx = value.indexOf('data:image')
                      if (idx !== -1) {
                        return value.slice(idx)
                      }

                      // base64 polos
                      return `data:image/jpeg;base64,${value}`
                    }

                    if (Array.isArray(selectedInquiry.idCardPhotos) && selectedInquiry.idCardPhotos.length > 0) {
                      return (
                        <div className="d-flex flex-column gap-3">
                          {selectedInquiry.idCardPhotos.map((src, idx) => (
                            src ? (
                              <img
                                key={idx}
                                src={normalizeBase64(src)}
                                alt={`KTP ${idx + 1}`}
                                className="img-fluid rounded shadow"
                                style={{
                                  maxHeight: '16.25rem',
                                  width: '100%',
                                  objectFit: 'contain'
                                }}
                                loading="lazy"
                              />
                            ) : (
                              <div key={idx} className="alert alert-warning mb-0">
                                Foto {idx + 1} kosong
                              </div>
                            )
                          ))}
                        </div>
                      )
                    }

                    if (selectedInquiry.idCardPhoto) {
                      return (
                        <img
                          src={normalizeBase64(selectedInquiry.idCardPhoto)}
                          alt="KTP"
                          className="img-fluid rounded shadow"
                          style={{
                            maxHeight: '16.25rem',
                            width: '100%',
                            objectFit: 'contain'
                          }}
                          loading="lazy"
                        />
                      )
                    }

                    return <p className="text-muted">Tidak ada foto</p>
                  })()}
                </Card.Body>
              </Card>
            </>
          )}
        </Modal.Body>

        <Modal.Footer>
          <Button
            variant="outline-danger"
            onClick={() => handleDelete(selectedInquiry.id)}
            disabled={!!updatingId}
          >
            {updatingId ? 'Menghapus...' : 'Hapus Inquiry'}
          </Button>

          <Button
            variant="secondary"
            onClick={handleCloseModal}
            disabled={!!updatingId}
          >
            Tutup
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  )
}

export default AdminInquiries
