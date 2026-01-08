import { useEffect, useMemo, useState } from 'react'
import { Container, Row, Col, Card, Spinner, Form, Button, Pagination } from 'react-bootstrap'
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

  const [filters, setFilters] = useState(
    initialFilters || { preference: 'sewa', roomType: 'studio', floor: 'semua', furnishType: '', }
  )

  const detectFurnishType = (item) => {
  const name = (item.name || '').toLowerCase()
  const facilities = (item.facilities || '').toLowerCase()

  // PRIORITAS SESUAI DB
  if (name.includes('kosongan')) return 'non-furnish'
  if (name.includes('kipas') || facilities.includes('kipas')) return 'furnish-kipas'
  if (name.includes('ac') || facilities.includes(' ac')) return 'furnish-ac'
  return 'unknown'
}

  const showPriceSorter =
    filters.preference === 'sewa' &&
    filters.furnishType === ''

  const [sortOption, setSortOption] = useState('price-asc')
  const [floors, setFloors] = useState([])
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(12)

  /* 🔑 SINKRON FILTER DARI ApartmentFilter */
  useEffect(() => {
    if (initialFilters) {
      setFilters((prev) => ({
        ...prev,
        ...initialFilters,
      }))
    }
  }, [initialFilters])

  useEffect(() => {
    const mql = window.matchMedia('(max-width: 767px)')

    const sync = (matches) => {
      setPageSize(matches ? 3 : 12)
      setPage(1)
    }

    sync(mql.matches)

    const onChange = (e) => sync(e.matches)
    if (typeof mql.addEventListener === 'function') {
      mql.addEventListener('change', onChange)
      return () => mql.removeEventListener('change', onChange)
    }

    mql.addListener(onChange)
    return () => mql.removeListener(onChange)
  }, [])

  const getApartmentImage = (type) => {
    return type === 'studio' ? studioImg : twoBedImg
  }

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await unitTypesAPI.getAll()
        const list = Array.isArray(res?.data)
          ? res.data
          : Array.isArray(res)
          ? res
          : res?.data
          ? [res.data]
          : []

        setRaw(list)

        const unique = [
          ...new Set(
            list.map((item) => Number(item.floor)).filter(Number.isFinite)
          ),
        ].sort((a, b) => a - b)

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
      minimumFractionDigits: 0,
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

      return {
        id: item.unit_type_id || item.id,
        name: item.name,
        unit_number: item.unit_number,
        type,
        floor: Number.isNaN(floor) ? null : floor,
        size: item.size ? `${item.size} m²` : '-',
        rentPrice: item.rent_price,
        salePrice: item.sale_price,
        status: normalizeStatus(item.status),
        facilities,
        furnishType: detectFurnishType(item),
      }
    })
  }, [raw])

  const filteredApartments = useMemo(() => {
    let result = apartments.filter((apt) => {
      if (filters.preference === 'sewa' && (!apt.rentPrice || apt.rentPrice <= 0)) return false
      if (filters.preference === 'beli' && (!apt.salePrice || apt.salePrice <= 0)) return false

      if (filters.roomType && apt.type !== filters.roomType) return false
      if (filters.floor !== 'semua' && apt.floor !== Number(filters.floor)) return false

      if (
        filters.preference === 'sewa' &&
        filters.furnishType &&
        apt.furnishType !== filters.furnishType
      ) {
        return false
      }

      return true
    })

    // 🔥 SORTING – HANYA JIKA SEMUA TIPE FURNISH
    if (
      filters.preference === 'sewa' &&
      filters.furnishType === '' &&
      sortOption
    ) {
      result = [...result].sort((a, b) => {
        const priceA = Number(a.rentPrice)
        const priceB = Number(b.rentPrice)

        if (!Number.isFinite(priceA)) return 1
        if (!Number.isFinite(priceB)) return -1

        if (sortOption === 'price-asc') {
          return priceA - priceB
        }

        if (sortOption === 'price-desc') {
          return priceB - priceA
        }

        return 0
      })
    }

    return result
  }, [apartments, filters, sortOption])

  useEffect(() => {
    if (
      filters.preference === 'sewa' &&
      filters.furnishType !== ''
    ) {
      setSortOption('price-asc') // atau null jika mau
    }
  }, [filters.furnishType, filters.preference])


  useEffect(() => {
    setPage(1)
  }, [filters])

  const pageCount = Math.max(1, Math.ceil(filteredApartments.length / pageSize))
  const pagedApartments = filteredApartments.slice(
    (page - 1) * pageSize,
    page * pageSize
  )

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
              {filters.preference === 'sewa' && (
                <Col xs={12} md={6} lg={4}>
                  <Form.Group>
                    <Form.Label className="fw-bold text-slate-800">
                      Tipe Furnish
                    </Form.Label>
                    <Form.Select
                      className="rounded-xl border-slate-200 focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
                      value={filters.furnishType || ''}
                      onChange={(e) => toggleFilter('furnishType', e.target.value)}
                    >
                      <option value="">Semua Tipe</option>
                      <option value="non-furnish">Non-Furnish</option>
                      <option value="furnish-kipas">Furnish + Kipas</option>
                      <option value="furnish-ac">Furnish + AC</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
              )}
              {showPriceSorter && (
                <Col xs={12} md={6} lg={4}>
                  <Form.Group>
                    <Form.Label className="fw-bold text-slate-800">
                      Urutkan Harga
                    </Form.Label>
                    <Form.Select
                      value={sortOption}
                      onChange={(e) => setSortOption(e.target.value)}
                    >
                      <option value="price-asc">Harga Termurah</option>
                      <option value="price-desc">Harga Termahal</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
              )}
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
              {pagedApartments.map(apt => (
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
                      <h3 className="text-xl font-semibold text-slate-900 break-words text-truncate" title={apt.unit_number}>Unit {apt.unit_number}</h3>
                      <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
                        <span>📐 {apt.size}</span>
                        <span>🏢 Lantai {apt.floor ?? '-'}</span>
                        <span>🏷️ {apt.type === 'studio' ? 'Studio' : '2 Bedroom'}</span>
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

            {pageCount > 1 && (
              <div className="d-flex justify-content-center mt-4">
                <Pagination className="mb-0">
                  <Pagination.First onClick={() => setPage(1)} disabled={page === 1} />
                  <Pagination.Prev onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} />
                  {Array.from({ length: pageCount }, (_, i) => i + 1)
                    .filter((p) => {
                      if (pageCount <= 7) return true
                      if (p === 1 || p === pageCount) return true
                      return Math.abs(p - page) <= 2
                    })
                    .map((p, idx, arr) => {
                      const prev = arr[idx - 1]
                      const needsEllipsis = idx > 0 && p - prev > 1
                      return (
                        <span key={p}>
                          {needsEllipsis && <Pagination.Ellipsis disabled />}
                          <Pagination.Item active={p === page} onClick={() => setPage(p)}>
                            {p}
                          </Pagination.Item>
                        </span>
                      )
                    })}
                  <Pagination.Next onClick={() => setPage((p) => Math.min(pageCount, p + 1))} disabled={page === pageCount} />
                  <Pagination.Last onClick={() => setPage(pageCount)} disabled={page === pageCount} />
                </Pagination>
              </div>
            )}

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
