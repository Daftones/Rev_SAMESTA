import { useEffect, useMemo, useState } from 'react'
import { Container, Row, Col, Card, Spinner, Form, Button } from 'react-bootstrap'
import { useNavigate } from 'react-router-dom'
import { unitTypesAPI } from '../services/api'

// Import gambar apartemen
import studioImg from '../assets/Studio room.png'
import twoBedImg from '../assets/2 bedroom.png'

function ApartmentList({ filters: initialFilters }) {
  const navigate = useNavigate()
  const [raw, setRaw] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [filters, setFilters] = useState(initialFilters || { preference: 'sewa', roomType: 'studio', floor: 'semua' })
  const [sortOption, setSortOption] = useState('price-asc')
  const [floors, setFloors] = useState([])

  // Helper function untuk mendapatkan gambar sesuai tipe
  const getApartmentImage = (type) => {
    return type === 'studio' ? studioImg : twoBedImg
  }

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await unitTypesAPI.getAll()
        const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : []
        setRaw(list)
        
        // Extract unique floors for dropdown
        const nums = list
          .map((item) => Number(item.floor))
          .filter((n) => Number.isFinite(n))
        const unique = Array.from(new Set(nums)).sort((a, b) => a - b)
        setFloors(unique)
      } catch (err) {
        console.error('Failed to load unit types', err)
        setError('Gagal memuat data unit')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const formatCurrency = (value) => {
    const numeric = Number(value)
    if (Number.isNaN(numeric)) return value
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(numeric)
  }

  const normalizeStatus = (status) => {
    const lower = (status || '').toLowerCase()
    if (lower.includes('sold')) return 'sold'
    if (lower.includes('book') || lower.includes('occupied')) return 'booked'
    if (lower.includes('maintenance')) return 'maintenance'
    return 'available'
  }

  const statusBadgeClass = (status) => {
    const map = {
      available: 'bg-green-100 text-green-700',
      booked: 'bg-amber-100 text-amber-800',
      sold: 'bg-red-100 text-red-700',
      maintenance: 'bg-slate-200 text-slate-700',
    }
    return map[status] || map.available
  }

  const apartments = useMemo(() => {
    return raw.map((item) => {
      const type = item.name?.toLowerCase().includes('studio') ? 'studio' : 'twoBed'
      const floor = Number(item.floor)
      const facilities = item.facilities
        ? item.facilities.split(',').map((f) => f.trim()).filter(Boolean)
        : []
      const sizeValue = Number.parseFloat(item.size)

      return {
        id: item.unit_type_id || item.id,
        name: item.name,
        type,
        floor: Number.isNaN(floor) ? null : floor,
        size: item.size ? `${item.size} m²` : '-',
        sizeValue: Number.isFinite(sizeValue) ? sizeValue : null,
        rentPrice: item.rent_price,
        salePrice: item.sale_price,
        status: normalizeStatus(item.status),
        facilities,
      }
    })
  }, [raw])

  const filteredApartments = useMemo(() => {
    const filtered = apartments.filter((apt) => {
      // Filter berdasarkan ketersediaan harga sesuai preference
      if (filters.preference === 'sewa') {
        if (!apt.rentPrice || Number(apt.rentPrice) <= 0) return false
      } else if (filters.preference === 'beli') {
        if (!apt.salePrice || Number(apt.salePrice) <= 0) return false
      }
      
      if (filters.roomType && apt.type !== filters.roomType) return false
      if (filters.floor !== 'semua' && apt.floor !== Number(filters.floor)) return false
      return true
    })

    const priceKey = filters.preference === 'beli' ? 'salePrice' : 'rentPrice'

    return filtered.sort((a, b) => {
      const [field, direction] = sortOption.split('-')
      const dir = direction === 'desc' ? -1 : 1
      const fallback = direction === 'desc' ? -Infinity : Infinity

      const pick = () => {
        if (field === 'price') return { a: Number(a[priceKey]), b: Number(b[priceKey]) }
        if (field === 'floor') return { a: a.floor, b: b.floor }
        if (field === 'size') return { a: a.sizeValue, b: b.sizeValue }
        return { a: 0, b: 0 }
      }

      const raw = pick()
      const valA = Number.isFinite(raw.a) ? raw.a : fallback
      const valB = Number.isFinite(raw.b) ? raw.b : fallback
      if (valA === valB) return 0
      return valA > valB ? dir : -dir
    })
  }, [apartments, filters, sortOption])

  const toggleFilter = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  const handleViewDetail = (id) => {
    navigate(`/apartment/${id}?preference=${filters.preference}`)
  }

  const renderStatus = (status) => {
    if (status === 'booked') return 'Booked'
    if (status === 'sold') return 'Sold'
    if (status === 'maintenance') return 'Maintenance'
    return 'Available'
  }

  return (
    <div className="bg-white py-10">
      <Container className="px-3">
        <div className="mb-6 flex flex-col gap-3">
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900">Daftar Apartemen Tersedia</h1>
          
          {/* Filter Section */}
          <div className="mb-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="d-flex flex-wrap gap-2 align-items-center mb-3">
              <span className="fw-bold text-slate-800">Preferensi:</span>
              {[
                { key: 'sewa', label: 'Sewa' },
                { key: 'beli', label: 'Beli' },
              ].map((opt) => (
                <Button
                  key={opt.key}
                  size="sm"
                  variant={filters.preference === opt.key ? 'dark' : 'outline-secondary'}
                  className="rounded-pill"
                  onClick={() => toggleFilter('preference', opt.key)}
                >
                  {opt.label}
                </Button>
              ))}
            </div>

            <div className="d-flex flex-wrap gap-2 align-items-center mb-3">
              <span className="fw-bold text-slate-800">Tipe:</span>
              {[
                { key: 'studio', label: 'Studio' },
                { key: 'twoBed', label: '2 Bedroom' },
              ].map((opt) => (
                <Button
                  key={opt.key}
                  size="sm"
                  variant={filters.roomType === opt.key ? 'dark' : 'outline-secondary'}
                  className="rounded-pill"
                  onClick={() => toggleFilter('roomType', opt.key)}
                >
                  {opt.label}
                </Button>
              ))}
            </div>

            <Row className="g-3 align-items-end">
              <Col xs={12} md={6} lg={4}>
                <Form.Group>
                  <Form.Label className="fw-bold text-slate-800">Lantai</Form.Label>
                  <Form.Select
                    className="rounded-xl border-slate-200 focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
                    value={filters.floor}
                    onChange={(e) => toggleFilter('floor', e.target.value)}
                  >
                    <option value="semua">Semua Lantai</option>
                    {floors.map((f) => (
                      <option key={f} value={String(f)}>
                        Lantai {f}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col xs={12} md={6} lg={4}>
                <Form.Group>
                  <Form.Label className="fw-bold text-slate-800">Urutkan</Form.Label>
                  <Form.Select
                    className="rounded-xl border-slate-200 focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
                    value={sortOption}
                    onChange={(e) => setSortOption(e.target.value)}
                  >
                    <option value="price-asc">Harga termurah</option>
                    <option value="price-desc">Harga termahal</option>
                    <option value="floor-asc">Lantai terendah</option>
                    <option value="floor-desc">Lantai tertinggi</option>
                    <option value="size-asc">Luas terkecil</option>
                    <option value="size-desc">Luas terbesar</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
          </div>

          <p className="text-slate-600">
            Menampilkan {filteredApartments.length} unit
            {filters.preference && ` · ${filters.preference === 'sewa' ? 'Sewa' : 'Beli'}`}
            {filters.roomType && ` · ${filters.roomType === 'studio' ? 'Studio' : '2 Bedroom'}`}
            {filters.floor !== 'semua' && ` · Lantai ${filters.floor}`}
          </p>
        </div>

        {loading && (
          <div className="text-center py-4">
            <Spinner animation="border" role="status">
              <span className="visually-hidden">Loading...</span>
            </Spinner>
          </div>
        )}

        {error && !loading && (
          <div className="text-center py-4 text-danger">{error}</div>
        )}

        {!loading && !error && (
          <>
            <Row className="g-4">
              {filteredApartments.map(apt => (
                <Col key={apt.id} xs={12} md={6} lg={4}>
                  <Card className="h-100 d-flex flex-column overflow-hidden rounded-2xl border border-slate-200 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
                    <div style={{ position: 'relative' }}>
                      <img 
                        src={getApartmentImage(apt.type)} 
                        alt={apt.name}
                        className="h-44 md:h-48 w-full object-cover"
                      />
                      <span className={`absolute left-4 top-4 rounded-full px-3 py-1 text-sm font-semibold ${statusBadgeClass(apt.status)}`}>
                        {renderStatus(apt.status)}
                      </span>
                    </div>
                    <Card.Body className="d-flex flex-column gap-3 flex-grow-1 p-4">
                      <h3 className="text-xl font-semibold text-slate-900 break-words text-truncate" title={apt.name}>{apt.name}</h3>
                      <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
                        <span>📐 {apt.size}</span>
                        <span>🏢 Lantai {apt.floor ?? '-'}</span>
                      </div>
                      <div className="text-2xl font-bold text-slate-900">
                        {formatCurrency(filters.preference === 'beli' ? apt.salePrice : apt.rentPrice)}
                        <span className="text-sm font-semibold text-slate-500">{filters.preference === 'sewa' ? '/bulan' : ''}</span>
                      </div>
                      <div className="flex flex-wrap gap-2 text-sm text-slate-600">
                        {apt.facilities.map((facility, idx) => (
                          <span key={idx} className="rounded-full bg-slate-100 px-3 py-1">{facility}</span>
                        ))}
                      </div>
                      <div className="mt-auto">
                        <Button 
                          className="w-100 rounded-full"
                          variant="dark"
                          onClick={() => handleViewDetail(apt.id)}
                        >
                          Lihat Detail
                        </Button>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
              ))}
            </Row>

            {filteredApartments.length === 0 && (
              <div className="text-center py-5">
                <h3>Tidak ada unit yang tersedia dengan filter ini</h3>
                <p className="text-muted">Coba ubah preferensi pencarian Anda</p>
              </div>
            )}
          </>
        )}
      </Container>

    </div>
  )
}

export default ApartmentList
