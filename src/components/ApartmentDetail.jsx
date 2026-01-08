import { useState, useEffect, useRef } from 'react'
import { Container, Row, Col, Button, Badge, Carousel, Spinner, Accordion, Modal } from 'react-bootstrap'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { unitTypesAPI } from '../services/api'

// Import gambar apartemen
import studioImg from '../assets/Studio room.png'
import studio1Img from '../assets/studio(1).jpeg'
import studio2Img from '../assets/studio(2).jpeg'
import twoBedImg from '../assets/2 bedroom.png'
import twoBed1Img from '../assets/2br(1).jpeg'
import twoBed2Img from '../assets/2br(2).jpeg'
import floorPlanImg from '../assets/floor_plan.jpeg'

function ApartmentDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const preference = searchParams.get('preference') || 'sewa'
  
  const carouselRef = useRef(null)
  const [showLightbox, setShowLightbox] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)
  const [showFloorplan, setShowFloorplan] = useState(false)

  const [selectedImage, setSelectedImage] = useState(0)
  const [apartment, setApartment] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Helper function untuk mendapatkan gambar sesuai tipe
  const getApartmentImages = (apartmentName) => {
    const isStudio = apartmentName?.toLowerCase().includes('studio')
    return isStudio 
      ? [studioImg, studio1Img, studio2Img]
      : [twoBedImg, twoBed1Img, twoBed2Img]
  }

  useEffect(() => {
    const fetchApartment = async () => {
      setLoading(true)
      setError(null)
      try {
        const [oneRes] = await Promise.all([
          unitTypesAPI.getOne(id),
          unitTypesAPI.getAll(),
        ])
        const data = oneRes?.data || oneRes
        setApartment(data)  
      } catch (err) {
        console.error('Failed to load apartment detail', err)
        setError('Gagal memuat detail apartemen')
      } finally {
        setLoading(false)
      }
    }

    if (id) {
      fetchApartment()
    }
  }, [id])

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

  const renderStatus = (status) => {
    if (status === 'booked') return 'Booked'
    if (status === 'sold') return 'Sold'
    if (status === 'maintenance') return 'Maintenance'
    return 'Available'
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

  if (loading) {
    return (
      <div className="bg-white py-12">
        <Container className="px-3">
          <div className="text-center py-5">
            <Spinner animation="border" role="status">
              <span className="visually-hidden">Loading...</span>
            </Spinner>
            <p className="mt-3 text-slate-500">Memuat detail apartemen...</p>
          </div>
        </Container>
      </div>
    )
  }

  if (error || !apartment) {
    return (
      <div className="bg-white py-12">
        <Container className="px-3">
          <div className="text-center py-5">
            <h3 className="text-red-600 font-semibold">Gagal memuat detail apartemen</h3>
            <p className="text-slate-500">{error || 'Data tidak ditemukan'}</p>
            <Button variant="dark" onClick={() => navigate('/apartments')}>Kembali ke Daftar</Button>
          </div>
        </Container>
      </div>
    )
  }

  const facilities = apartment.facilities
    ? apartment.facilities.split(',').map(f => f.trim()).filter(Boolean)
    : []
  
  const price = preference === 'beli' ? apartment.sale_price : apartment.rent_price
  const priceLabel = preference === 'beli' ? 'Harga Jual' : 'Harga Sewa'
  const period = preference === 'sewa' ? '/bulan' : ''

  const installmentOptions = (() => {
    const salePrice = Number(apartment?.sale_price)
    const validSalePrice = Number.isFinite(salePrice) && salePrice > 0 ? salePrice : null
    const tenors = [6, 12, 24]
    return tenors.map((months) => {
      const monthly = validSalePrice ? Math.ceil(validSalePrice / months) : null
      return { months, monthly }
    })
  })()

  const handleInquiry = () => {
    const unitTypeId = String(apartment?.unit_type_id || apartment?.id || id || '').trim()
    navigate(`/inquiry?unit_type_id=${encodeURIComponent(unitTypeId)}`, { state: { unitTypeId } })
  }
  
  const handleContactAdmin = () => window.open('https://wa.me/6289506516117?text=Halo, saya ingin info lebih lanjut tentang unit ini', '_blank')

  const handleFullscreen = () => {
    const node = carouselRef.current
    if (!node) return
    if (document.fullscreenElement) {
      document.exitFullscreen()
      return
    }
    if (node.requestFullscreen) node.requestFullscreen()
  }

  return (
    <div className="bg-white py-10 pb-24 lg:pb-10">
      <Container className="px-3">
        <Row className="g-4">
          <Col lg={8}>
            <div className="overflow-hidden rounded-2xl shadow-sm mb-3" ref={carouselRef}>
              <div className="d-flex justify-content-between align-items-start align-items-sm-center flex-column flex-sm-row gap-2 px-3 py-2 bg-white border border-slate-200 border-bottom-0 rounded-top-2">
                <div className="fw-semibold text-slate-800">Galeri Unit</div>
                <div className="d-flex flex-wrap gap-2">
                  <Button size="sm" variant="outline-secondary" className="rounded-pill" onClick={() => setShowLightbox(true)}>
                    Lihat Penuh
                  </Button>
                  <Button size="sm" variant="outline-primary" className="rounded-pill" onClick={handleFullscreen}>
                    Fullscreen
                  </Button>
                </div>
              </div>
              <Carousel 
                activeIndex={selectedImage} 
                onSelect={(index) => setSelectedImage(index)}
                interval={4000}
                fade
              >
                {getApartmentImages(apartment.name).map((img, idx) => (
                  <Carousel.Item key={idx} onClick={() => { setLightboxIndex(idx); setShowLightbox(true) }}>
                    <img
                      src={img}
                      alt={`${apartment.name} - Gambar ${idx + 1}`}
                      className="h-72 w-full object-cover md:h-[32rem] cursor-pointer"
                    />
                  </Carousel.Item>
                ))}
              </Carousel>
            </div>
            <div className="d-flex gap-2 flex-wrap mb-4">
              {getApartmentImages(apartment.name).map((thumb, idx) => (
                <button
                  key={thumb}
                  type="button"
                  className={`rounded-xl overflow-hidden border ${idx === selectedImage ? 'border-slate-900' : 'border-slate-200'}`}
                  onClick={() => setSelectedImage(idx)}
                >
                  <img src={thumb} alt={`Thumb ${idx + 1}`} className="h-14 w-20 object-cover sm:h-16 sm:w-24" />
                </button>
              ))}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <span className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${statusBadgeClass(normalizeStatus(apartment.status))}`}>
                {renderStatus(normalizeStatus(apartment.status))}
              </span>
              <h1 className="mt-3 text-3xl font-bold text-slate-900 break-words">{apartment.unit_number}</h1>
              <p className="text-slate-600">Samesta Jakabaring • Lantai {apartment.floor || '-'}</p>

              <div className="mt-2 text-slate-600">
                <span className="fw-semibold text-slate-800">Tipe:</span>{' '}
                {apartment.name}
              </div>

              <div className="mt-6 text-lg font-semibold text-slate-900">Spesifikasi</div>
              <div className="mt-3 grid grid-cols-2 gap-4 md:grid-cols-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="text-sm text-slate-500">Luas</div>
                  <div className="text-base font-semibold text-slate-900">{apartment.size ? `${apartment.size} m²` : '-'}</div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="text-sm text-slate-500">Tipe</div>
                  <div className="text-base font-semibold text-slate-900">{apartment.name?.includes('Studio') ? 'Studio' : '2 Bedroom'}</div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="text-sm text-slate-500">Lantai</div>
                  <div className="text-base font-semibold text-slate-900">{apartment.floor || '-'}</div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="text-sm text-slate-500">Status</div>
                  <div className="text-base font-semibold text-slate-900">{renderStatus(normalizeStatus(apartment.status))}</div>
                </div>
                {apartment.rent_price && Number(apartment.rent_price) > 0 && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <div className="text-sm text-slate-500">Harga Sewa</div>
                    <div className="text-base font-semibold text-slate-900">{formatCurrency(apartment.rent_price)}/bln</div>
                  </div>
                )}
                {apartment.sale_price && Number(apartment.sale_price) > 0 && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <div className="text-sm text-slate-500">Harga Jual</div>
                    <div className="text-base font-semibold text-slate-900">{formatCurrency(apartment.sale_price)}</div>
                  </div>
                )}
              </div>

              <div className="mt-6 text-lg font-semibold text-slate-900">Fasilitas Unit</div>
              {facilities.length > 0 ? (
                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {facilities.map((facility, idx) => (
                    <div key={idx} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-800">
                      <span className="h-8 w-8 rounded-lg bg-slate-900/10" aria-hidden="true" />
                      <span>{facility}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500">Tidak ada informasi fasilitas</p>
              )}

              <div className="mt-8 text-lg font-semibold text-slate-900">Floor Plan</div>
              <Accordion defaultActiveKey="0" className="mt-2">
                <Accordion.Item eventKey="0">
                  <Accordion.Header>
                    <span className="font-semibold">Lihat Denah Unit</span>
                  </Accordion.Header>
                  <Accordion.Body>
                    <div className="overflow-hidden rounded-xl shadow-sm position-relative">
                      <button
                        type="button"
                        className="btn btn-sm btn-dark position-absolute end-3 top-3 rounded-pill"
                        onClick={() => setShowFloorplan(true)}
                      >
                        Zoom
                      </button>
                      <img 
                        src={floorPlanImg} 
                        alt="Floor Plan Apartemen"
                        className="w-full object-contain"
                        onClick={() => setShowFloorplan(true)}
                        style={{ cursor: 'zoom-in' }}
                      />
                    </div>
                    <p className="mt-3 text-sm text-slate-500 mb-0">
                      * Denah dapat berbeda tergantung lantai dan posisi unit. Hubungi kami untuk informasi detail.
                    </p>
                  </Accordion.Body>
                </Accordion.Item>
              </Accordion>

              <div className="mt-8 text-lg font-semibold text-slate-900">Lokasi &amp; Sekitar</div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="ratio ratio-16x9 rounded-2xl overflow-hidden mb-3">
                  <iframe
                    title="Peta lokasi apartemen"
                    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d126739.73970787316!2d104.687!3d-2.99!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x2e3b75c91b7b8615%3A0x5f9c37d6a8ce28a3!2sJakabaring!5e0!3m2!1sen!2sid!4v0000000000000"
                    loading="lazy"
                    style={{ border: 0 }}
                    allowFullScreen
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
                <div className="d-flex flex-wrap gap-2 text-sm text-slate-700">
                  <span className="badge bg-light text-dark border">🛒 Minimarket 3 menit</span>
                  <span className="badge bg-light text-dark border">🚉 Stasiun LRT 5 menit</span>
                  <span className="badge bg-light text-dark border">🏥 RS Bunda 8 menit</span>
                  <span className="badge bg-light text-dark border">🎓 Kampus Sriwijaya 10 menit</span>
                </div>
              </div>
            </div>
          </Col>

          <Col lg={4}>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:sticky lg:top-8">
              <div className="mb-4">
                <div className="text-sm font-semibold text-slate-500">{priceLabel}</div>
                <div className="text-3xl font-bold text-slate-900">
                  {formatCurrency(price)}
                  <span className="text-sm font-semibold text-slate-500">{period}</span>
                </div>
              </div>

              <div className="mb-4">
                <div className="text-sm font-semibold text-slate-500">Daftar Cicilan</div>
                <div className="mt-2 d-flex flex-column gap-2">
                  {installmentOptions.map((opt) => (
                    <div key={opt.months} className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                      <div className="d-flex justify-content-between align-items-center gap-2">
                        <div className="fw-semibold text-slate-800">Tenor {opt.months} bulan</div>
                        <div className="text-slate-900 fw-bold">
                          {opt.monthly ? `${formatCurrency(opt.monthly)}/bulan` : '-'}
                        </div>
                      </div>
                      <div className="text-muted small">* Informasi saja, tidak bisa dipilih untuk pembayaran.</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <Button className="rounded-full" variant="dark" onClick={handleInquiry}>
                  Ajukan Inquiry
                </Button>
                <Button className="rounded-full" variant="outline-secondary" onClick={handleContactAdmin}>
                  Hubungi Admin
                </Button>
                <Button 
                  className="rounded-full" 
                  variant="outline-dark"
                  onClick={() => navigate('/apartments')}
                >
                  Kembali ke Daftar
                </Button>
              </div>

              <div className="mt-6 rounded-xl bg-slate-50 p-4 text-slate-700">
                <div className="font-semibold mb-2">Hubungi Kami</div>
                <div className="text-sm mb-1">📞 +62 812-3456-7890</div>
                <div className="text-sm">📧 samestajakabaring@gmail.com</div>
              </div>
            </div>
          </Col>
        </Row>
      </Container>

      {/* Lightbox Gallery */}
      <Modal show={showLightbox} onHide={() => setShowLightbox(false)} size="xl" centered>
        <Modal.Body className="p-0 bg-black">
          <Carousel activeIndex={lightboxIndex} onSelect={(i) => setLightboxIndex(i)} interval={null} indicators={false}>
            {getApartmentImages(apartment.name).map((img, idx) => (
              <Carousel.Item key={idx}>
                <img src={img} alt={`Lightbox ${idx + 1}`} className="w-100" style={{ maxHeight: '80vh', objectFit: 'contain' }} />
              </Carousel.Item>
            ))}
          </Carousel>
        </Modal.Body>
      </Modal>

      {/* Floorplan Modal */}
      <Modal show={showFloorplan} onHide={() => setShowFloorplan(false)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>Denah Unit</Modal.Title>
        </Modal.Header>
        <Modal.Body className="bg-slate-50">
          <img src={floorPlanImg} alt="Denah unit" className="w-100 rounded-2xl" />
        </Modal.Body>
      </Modal>

      {/* Sticky CTA untuk mobile */}
      <div className="d-lg-none position-fixed bottom-0 start-0 end-0 bg-white/95 border-top border-slate-200 shadow-lg p-3">
        <div className="d-flex gap-2">
          <Button variant="dark" className="flex-grow-1 rounded-pill" onClick={handleInquiry}>
            Inquiry
          </Button>
          <Button variant="outline-secondary" className="rounded-pill" onClick={handleContactAdmin}>
            Admin
          </Button>
        </div>
      </div>
    </div>
  )
}

export default ApartmentDetail
