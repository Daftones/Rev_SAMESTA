import { useMemo, useState, useEffect } from 'react'
import { Container, Table, Button, Modal, Form, Badge, Alert, Spinner, Pagination } from 'react-bootstrap'
import { unitTypesAPI } from '../services/api'
// import { buildUnitNumberMap, formatUnitNumber } from '../utils/unitNaming'

function AdminApartments() {
  const [apartments, setApartments] = useState([])
  const [filters, setFilters] = useState({ status: 'all', type: 'all', location: '', floor: 'all',})
  const [page, setPage] = useState(1)
  const pageSize = 10
  const [showModal, setShowModal] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [currentApartment, setCurrentApartment] = useState(null)
  const [initialFormData, setInitialFormData] = useState(null)
  const [alert, setAlert] = useState({ show: false, message: '', variant: '' })
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    floor: '',
    size: '',
    rent_price: '',
    sale_price: '',
    status: 'available',
    facilities: '',
  })

  const logActivity = (action, name) => {
    const logs = JSON.parse(localStorage.getItem('activityLogs') || '[]')
    logs.unshift({
      id: Date.now(),
      action,
      name,
      at: new Date().toISOString()
    })
    localStorage.setItem('activityLogs', JSON.stringify(logs.slice(0, 50)))
  }

  const getApartmentId = (apartment) => {
    return String(apartment?.unit_type_id ?? apartment?.id ?? apartment?.uuid ?? '').trim()
  }

  const sanitizePayload = (payload) => {
    const next = {}
    Object.entries(payload || {}).forEach(([key, value]) => {
      if (value === undefined) return
      if (typeof value === 'string' && value.trim() === '') return
      next[key] = value
    })
    return next
  }

  // Fetch apartments from backend on mount
  useEffect(() => {
    fetchApartments()
  }, [])

  // Reset pagination when filters/data change
  useEffect(() => {
    setPage(1)
  }, [filters.status, filters.type, filters.location, filters.floor, apartments.length])

  const normalizeStatusForBackend = (value) => {
    const s = String(value || '').trim().toLowerCase()
    if (!s) return 'available'
    if (s === 'occupied' || s === 'booked') return 'book'
    if (s === 'maintenance') return 'book'
    if (s === 'available' || s === 'book' || s === 'sold') return s
    return s
  }

  const normalizeType = (name) => {
    const n = String(name || '').toLowerCase()
    if (!n) return 'other'
    if (n.includes('studio')) return 'studio'
    if (n.includes('2') && n.includes('bed')) return '2bedroom'
    if (n.includes('two') && n.includes('bed')) return '2bedroom'
    if (n.includes('2br') || n.includes('2 br')) return '2bedroom'

    const m = n.match(/\bunit\s*(\d{3,4})\b/)
    if (m) {
      const num = Number(m[1])
      if (Number.isFinite(num)) {
        const offset = num % 100
        if (offset >= 1 && offset <= 26) return 'studio'
        if (offset >= 27 && offset <= 49) return '2bedroom'
      }
    }
    return 'other'
  }

  // const unitNumberMap = useMemo(() => {
  //   return buildUnitNumberMap(apartments, {
  //     getId: (x) => x?.unit_type_id ?? x?.id ?? x?.uuid,
  //     getFloor: (x) => x?.floor,
  //     getName: (x) => x?.name,
  //   })
  // }, [apartments])

  // const getApartmentDisplayName = (apartment) => {
  //   const id = String(apartment?.unit_type_id ?? apartment?.id ?? apartment?.uuid ?? '').trim()
  //   const unitNumber = unitNumberMap[id]
  //   if (unitNumber) return `Unit ${formatUnitNumber(unitNumber)}`
  //   return apartment?.name || '-'
  // }

  const normalizeSearch = (text) =>
  String(text || '')
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/-/g, '')

  const filteredApartments = useMemo(() => {
    const locationNeedle = String(filters.location || '').trim().toLowerCase()
    return apartments.filter((apartment) => {
      if (filters.floor !== 'all') {
        if (String(apartment.floor) !== String(filters.floor)) {
          return false
        }
      }

      if (!apartment) return false
      const status = normalizeStatusForBackend(apartment.status)

      if (filters.status !== 'all' && status !== String(filters.status).toLowerCase()) return false

      if (filters.type !== 'all') {
        const t = normalizeType(apartment.name)
        if (t !== filters.type) return false
      }

      if (locationNeedle) {
        const needle = normalizeSearch(locationNeedle)

        const fields = {
          unit: normalizeSearch(apartment.unit_number),
          name: normalizeSearch(apartment.name),
          floor: String(apartment.floor),
          size: String(apartment.size),
          facilities: normalizeSearch(apartment.facilities),
        }

        const matched =
          fields.unit.includes(needle) ||
          fields.name.includes(needle) ||
          fields.floor === needle ||
          fields.facilities.includes(needle)

        if (!matched) return false
      }
      return true
    })
    .sort((a, b) => {
      const floorA = Number(a.floor) || 0
      const floorB = Number(b.floor) || 0
      if (floorA !== floorB) return floorA - floorB

      const getUnitOrder = (unit) => {
        if (!unit) return 0
        const match = String(unit).match(/-(\d+)$/)
        return match ? Number(match[1]) : 0
      }

      const unitA = getUnitOrder(a.unit_number) || 0
      const unitB = getUnitOrder(b.unit_number) || 0
      return unitA - unitB
    })
  }, [apartments, filters.status, filters.type, filters.location, filters.floor])

  const availableFloors = useMemo(() => {
    const floors = apartments
      .map((a) => a.floor)
      .filter((f) => f !== undefined && f !== null)

    return Array.from(new Set(floors))
      .map(Number)
      .sort((a, b) => a - b)
  }, [apartments])


  const pageCount = useMemo(() => {
    const total = filteredApartments.length
    return Math.max(1, Math.ceil(total / pageSize))
  }, [filteredApartments.length])

  const clampedPage = Math.min(Math.max(1, page), pageCount)

  const pagedApartments = useMemo(() => {
    const start = (clampedPage - 1) * pageSize
    return filteredApartments.slice(start, start + pageSize)
  }, [filteredApartments, clampedPage])

  const buildPaginationItems = () => {
    const items = []
    const maxButtons = 5
    const half = Math.floor(maxButtons / 2)
    let start = Math.max(1, clampedPage - half)
    let end = Math.min(pageCount, start + maxButtons - 1)
    start = Math.max(1, end - maxButtons + 1)

    for (let p = start; p <= end; p += 1) {
      items.push(
        <Pagination.Item key={p} active={p === clampedPage} onClick={() => setPage(p)}>
          {p}
        </Pagination.Item>
      )
    }
    return items
  }

  const fetchApartments = async () => {
    setLoading(true)
    try {
      const response = await unitTypesAPI.getAll()
      const list = Array.isArray(response?.data) ? response.data : Array.isArray(response) ? response : []
      setApartments(list)
      console.log (list);
    } catch (error) {
      console.error('Error fetching apartments:', error)
      showAlert('Gagal memuat data apartemen', 'danger')
    } finally {
      setLoading(false)
    }
  }


  const handleShowModal = (apartment = null) => {
    if (apartment) {
      setEditMode(true)
      setCurrentApartment(apartment)
      setFormData({
        name: apartment.name || '',
        unit_number: apartment.unit_number || '',
        floor: apartment.floor || '',
        size: apartment.size || '',
        rent_price: apartment.rent_price || '',
        sale_price: apartment.sale_price || '',
        status: normalizeStatusForBackend(apartment.status || 'available'),
        facilities: apartment.facilities || '',
      })
      setInitialFormData({
        name: apartment.name || '',
        unit_number: apartment.unit_number || '',
        floor: apartment.floor || '',
        size: apartment.size || '',
        rent_price: apartment.rent_price || '',
        sale_price: apartment.sale_price || '',
        status: normalizeStatusForBackend(apartment.status || 'available'),
        facilities: apartment.facilities || '',
      })
    } else {
      setEditMode(false)
      setCurrentApartment(null)
      setFormData({
        name: '',
        unit_number: '',
        floor: '',
        size: '',
        rent_price: '',
        sale_price: '',
        status: 'available',
        facilities: '',
      })
      setInitialFormData(null)
    }
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditMode(false)
    setCurrentApartment(null)
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const showAlert = (message, variant) => {
    setAlert({ show: true, message, variant })
    setTimeout(() => {
      setAlert({ show: false, message: '', variant: '' })
    }, 3000)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      const basePayload = {
        name: formData.name,
        unit_number: formData.unit_number,
        floor: formData.floor,
        size: formData.size,
        rent_price: formData.rent_price || null,
        sale_price: formData.sale_price || null,
        status: normalizeStatusForBackend(formData.status),
        facilities: formData.facilities,
      }

      const isStatusOnlyChange =
        editMode &&
        initialFormData &&
        String(initialFormData.status || '') !== String(formData.status || '') &&
        String(initialFormData.name || '') === String(formData.name || '') &&
         String(initialFormData.unit_number || '') === String(formData.unit_number || '') &&
        String(initialFormData.floor || '') === String(formData.floor || '') &&
        String(initialFormData.size || '') === String(formData.size || '') &&
        String(initialFormData.rent_price || '') === String(formData.rent_price || '') &&
        String(initialFormData.sale_price || '') === String(formData.sale_price || '') &&
        String(initialFormData.facilities || '') === String(formData.facilities || '')

      const payload = sanitizePayload(
        isStatusOnlyChange
          ? { status: normalizeStatusForBackend(formData.status) }
          : basePayload
      )

      if (editMode) {
        const unitTypeId = getApartmentId(currentApartment)
        if (!unitTypeId) {
          throw new Error('UnitType ID tidak ditemukan (undefined). Tidak bisa update status.')
        }

        await unitTypesAPI.update(unitTypeId, payload)
        showAlert('Apartemen berhasil diupdate!', 'success')
        logActivity('update', currentApartment?.name || `UnitType ${unitTypeId}`)

        // Update UI immediately without waiting for a full refetch
        setApartments((prev) =>
          (Array.isArray(prev) ? prev : []).map((item) => {
            const itemId = getApartmentId(item)
            if (String(itemId) !== String(unitTypeId)) return item
            return { ...item, ...payload }
          })
        )
      } else {
        await unitTypesAPI.create(payload)
        showAlert('Apartemen berhasil ditambahkan!', 'success')
        logActivity('create', payload.name)
      }
      
      handleCloseModal()
      fetchApartments()
    } catch (error) {
      console.error('Error saving apartment:', error)
      showAlert(error?.response?.data?.message || error?.message || 'Gagal menyimpan data apartemen', 'danger')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    const target = apartments.find((a) => String(getApartmentId(a)) === String(id))
    if (window.confirm('Apakah Anda yakin ingin menghapus apartemen ini?')) {
      setLoading(true)
      try {
        const unitTypeId = String(id || '').trim()
        if (!unitTypeId) {
          throw new Error('UnitType ID tidak ditemukan (undefined). Tidak bisa hapus data.')
        }

        await unitTypesAPI.delete(unitTypeId)
        showAlert('Apartemen berhasil dihapus!', 'danger')
        logActivity('delete', target?.name || 'Unit')
        fetchApartments()
      } catch (error) {
        console.error('Error deleting apartment:', error)
        showAlert(error?.response?.data?.message || error?.message || 'Gagal menghapus apartemen', 'danger')
      } finally {
        setLoading(false)
      }
    }
  }

  const getStatusBadge = (status) => {
    switch(String(status || '').toLowerCase()) {
      case 'available':
        return <Badge bg="success">Tersedia</Badge>
      case 'book':
      case 'occupied':
      case 'booked':
      case 'maintenance':
        return <Badge bg="warning" text="dark">Dibooking</Badge>
      case 'sold':
        return <Badge bg="danger">Terjual</Badge>
      default:
        return <Badge bg="secondary">{status}</Badge>
    }
  }

  const formatPrice = (price) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(price)
  }

  return (
    <Container fluid className="py-4 px-3">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <h2 className="fw-bold mb-0">Kelola Apartemen</h2>
        <Button variant="dark" onClick={() => handleShowModal()} className="rounded-full">
          + Tambah Apartemen
        </Button>
      </div>

      {alert.show && (
        <Alert variant={alert.variant} dismissible onClose={() => setAlert({ show: false, message: '', variant: '' })}>
          {alert.message}
        </Alert>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-3 mb-3">
        <Form className="row g-3">
          <div className="col-12 col-md-4">
            <Form.Label className="small text-muted">Status</Form.Label>
            <Form.Select
              value={filters.status}
              onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
              disabled={loading}
            >
              <option value="all">Semua</option>
              <option value="available">Tersedia</option>
              <option value="book">Dibooking</option>
              <option value="sold">Terjual</option>
            </Form.Select>
          </div>

          <div className="col-12 col-md-4">
            <Form.Label className="small text-muted">Tipe</Form.Label>
            <Form.Select
              value={filters.type}
              onChange={(e) => setFilters((prev) => ({ ...prev, type: e.target.value }))}
              disabled={loading}
            >
              <option value="all">Semua</option>
              <option value="studio">Studio</option>
              <option value="2bedroom">2 Bedroom</option>
              <option value="other">Lainnya</option>
            </Form.Select>
          </div>

          <div className="col-12 col-md-4">
            <Form.Label className="small text-muted">Lantai</Form.Label>
            <Form.Select
              value={filters.floor}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, floor: e.target.value }))
              }
              disabled={loading}
            >
              <option value="all">Semua Lantai</option>
              {availableFloors.map((floor) => (
                <option key={floor} value={String(floor)}>
                  Lantai {floor}
                </option>
              ))}
            </Form.Select>
          </div>

          <div className="col-12 col-md-6">
            <Form.Label className="small text-muted">Lokasi / Kata Kunci</Form.Label>
            <Form.Control
              type="text"
              placeholder="Cari nama, lantai, fasilitas, dll"
              value={filters.location}
              onChange={(e) => setFilters((prev) => ({ ...prev, location: e.target.value }))}
              disabled={loading}
            />
          </div>
        </Form>

        <div className="d-flex flex-wrap justify-content-between align-items-center mt-3 gap-2">
          <div className="text-muted small">
            Menampilkan {filteredApartments.length === 0 ? 0 : (clampedPage - 1) * pageSize + 1}–{Math.min(clampedPage * pageSize, filteredApartments.length)} dari {filteredApartments.length} data
          </div>
          <Button
            variant="outline-secondary"
            size="sm"
            onClick={() => setFilters({ status: 'all', type: 'all', location: '', floor: 'all', })}
            disabled={loading}
          >
            Reset Filter
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <Table hover responsive className="mb-0 align-middle">
          <thead className="bg-slate-900 text-white">
            <tr>
              <th>Nomor Unit</th>
              <th>Jenis Unit</th>
              <th className="d-none d-md-table-cell">Lantai</th>
              <th className="d-none d-md-table-cell">Size</th>
              <th>Status</th>
              <th className="d-none d-md-table-cell">Harga Sewa</th>
              <th className="d-none d-md-table-cell">Harga Jual</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="8" className="text-center py-4">
                  <Spinner animation="border" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </Spinner>
                </td>
              </tr>
            ) : filteredApartments.length === 0 ? (
              <tr>
                <td colSpan="8" className="text-center py-4 text-slate-500">
                  Tidak ada data yang sesuai filter
                </td>
              </tr>
            ) : (
              pagedApartments.map((apartment, index) => (
                <tr key={getApartmentId(apartment) || index}>
                  <td>{apartment.unit_number}</td>
                  <td>{apartment.name}</td>
                  <td className="d-none d-md-table-cell">{apartment.floor}</td>
                  <td className="d-none d-md-table-cell">{apartment.size}</td>
                  <td>{getStatusBadge(apartment.status)}</td>
                  <td className="d-none d-md-table-cell">{apartment.rent_price ? formatPrice(apartment.rent_price) : '-'}</td>
                  <td className="d-none d-md-table-cell">{apartment.sale_price ? formatPrice(apartment.sale_price) : '-'}</td>
                  <td>
                    <div className="d-flex flex-column flex-sm-row gap-2">
                      <Button 
                        variant="outline-primary" 
                        size="sm" 
                        onClick={() => handleShowModal(apartment)}
                        className="w-100"
                      >
                        Edit
                      </Button>

                      <Button 
                        variant="outline-danger" 
                        size="sm"
                        onClick={() => handleDelete(getApartmentId(apartment))}
                        className="w-100 d-none d-mad-inline"
                      >
                        Hapus
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      </div>

      {filteredApartments.length > 0 && (
        <div className="d-flex justify-content-center mt-3">
          <Pagination className="mb-0">
            <Pagination.Prev onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={clampedPage <= 1} />
            {buildPaginationItems()}
            <Pagination.Next onClick={() => setPage((p) => Math.min(pageCount, p + 1))} disabled={clampedPage >= pageCount} />
          </Pagination>
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal show={showModal} onHide={handleCloseModal} centered>
        <Modal.Header closeButton>
          <Modal.Title>{editMode ? 'Edit Apartemen' : 'Tambah Apartemen Baru'}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body className="max-h-[70vh] overflow-y-auto">
            <Form.Group className="mb-3">
              <Form.Label>Nama / Tipe Apartemen</Form.Label>
              <Form.Control
                type="text"
                name="name"
                placeholder="Contoh: 2 Bedroom (Furnish)"
                value={formData.name}
                onChange={handleInputChange}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Lantai</Form.Label>
              <Form.Control
                type="number"
                name="floor"
                placeholder="Contoh: 3"
                value={formData.floor}
                onChange={handleInputChange}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Luas (m²)</Form.Label>
              <Form.Control
                type="text"
                name="size"
                placeholder="Contoh: 33.07"
                value={formData.size}
                onChange={handleInputChange}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Fasilitas (pisahkan dengan koma)</Form.Label>
              <Form.Control
                type="text"
                name="facilities"
                placeholder="AC, Kitchen Set, Water Heater"
                value={formData.facilities}
                onChange={handleInputChange}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Status</Form.Label>
              <Form.Select 
                name="status" 
                value={formData.status} 
                onChange={handleInputChange}
                required
              >
                <option value="available">Tersedia</option>
                <option value="book">Dibooking</option>
                <option value="sold">Terjual</option>
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Harga Sewa (Rp)</Form.Label>
              <Form.Control
                type="number"
                name="rent_price"
                placeholder="Contoh: 1500000"
                value={formData.rent_price}
                onChange={handleInputChange}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Harga Jual (Rp)</Form.Label>
              <Form.Control
                type="number"
                name="sale_price"
                placeholder="Contoh: 350000000"
                value={formData.sale_price}
                onChange={handleInputChange}
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={handleCloseModal} disabled={loading}>
              Batal
            </Button>
            <Button variant="dark" type="submit" disabled={loading}>
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
                  Menyimpan...
                </>
              ) : (
                editMode ? 'Update' : 'Tambah'
              )}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  )
}

export default AdminApartments
