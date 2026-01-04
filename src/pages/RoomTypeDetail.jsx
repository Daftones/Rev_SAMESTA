import { Container, Row, Col, Badge, Spinner, Alert, Button } from 'react-bootstrap'
import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { unitTypesAPI } from '../services/api'

import studioHero from '../assets/Studio room.png'
import twoBedHero from '../assets/2 bedroom.png'

function RoomTypeDetail() {
  const { type } = useParams()
  const navigate = useNavigate()

  const [units, setUnits] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const res = await unitTypesAPI.getAll()
        const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : []
        setUnits(list)
      } catch (err) {
        console.error('Failed to load room types', err)
        setError('Gagal memuat data kamar dari server')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const parsedRoom = useMemo(() => {
    const normalized = units.map((item) => {
      const name = item.name || ''
      const lowerName = name.toLowerCase()
      const isStudio = lowerName.includes('studio')
      const sizeVal = Number.parseFloat(item.size)
      const rentValue = Number(item.rent_price)
      const saleValue = Number(item.sale_price)

      return {
        id: item.unit_type_id || item.id,
        slug: isStudio ? 'studio' : '2bedroom',
        name: name || (isStudio ? 'Studio Room' : '2 Bedroom'),
        size: Number.isFinite(sizeVal) ? `${sizeVal} m²` : item.size || '-',
        description: item.description || (isStudio
          ? 'Unit studio yang kompak dan efisien, cocok untuk profesional muda atau pasangan yang mencari hunian praktis.'
          : 'Unit 2 kamar tidur yang luas dan nyaman, ideal untuk keluarga kecil atau ruang kerja tambahan.'),
        features: (item.features || '').split(',').map((f) => f.trim()).filter(Boolean),
        facilities: (item.facilities || '').split(',').map((f) => f.trim()).filter(Boolean),
        rentPrice: Number.isFinite(rentValue) ? rentValue : null,
        salePrice: Number.isFinite(saleValue) ? saleValue : null,
        ideal: isStudio ? 'Profesional muda, mahasiswa, atau pasangan baru' : 'Keluarga kecil atau pekerja dengan ruang kerja',
        hero: isStudio ? studioHero : twoBedHero,
      }
    })

    const pick = normalized.find((r) => r.slug === type) || normalized.find((r) => r.slug === 'studio')

    // When API yields data, enrich with aggregated ranges per slug
    if (pick) {
      const peers = normalized.filter((r) => r.slug === pick.slug)
      const rangeFor = (values) => {
        const clean = values.filter((v) => Number.isFinite(v) && v > 0)
        if (!clean.length) return null
        const min = Math.min(...clean)
        const max = Math.max(...clean)
        if (min === max) {
          const cushion = min * 0.05
          return { min: min - cushion, max: min + cushion }
        }
        return { min, max }
      }

      return {
        ...pick,
        rentRange: rangeFor(peers.map((p) => p.rentPrice ?? null)),
        saleRange: rangeFor(peers.map((p) => p.salePrice ?? null)),
      }
    }

    // Fallback static content if API empty
    return {
      slug: 'studio',
      name: 'Studio Room',
      size: '24 m²',
      description: 'Unit studio yang kompak dan efisien, cocok untuk profesional muda atau pasangan yang mencari hunian praktis.',
      features: [
        'Ruang tidur terintegrasi dengan ruang tamu',
        'Kitchenette dengan kompor dan kitchen sink',
        'Kamar mandi dalam dengan shower',
        'Lemari pakaian built-in',
        'AC dan water heater',
        'Balkon pribadi'
      ],
      facilities: [
        'Kasur queen size',
        'Meja kerja',
        'Kursi',
        'Lemari es kecil',
        'TV cable ready',
        'Internet ready'
      ],
      rentPrice: 2500000,
      salePrice: null,
      rentRange: { min: 2500000 * 0.95, max: 2500000 * 1.05 },
      saleRange: null,
      ideal: 'Profesional muda, mahasiswa, atau pasangan baru',
      hero: studioHero,
    }
  }, [units, type])

  const formatShortCurrency = (value) => {
    const numeric = Number(value)
    if (!Number.isFinite(numeric) || numeric <= 0) return '-'

    const million = 1_000_000
    const thousand = 1_000

    if (numeric >= million) {
      const scaled = numeric / million
      const hasFraction = scaled % 1 !== 0
      const formatted = scaled.toLocaleString('id-ID', {
        minimumFractionDigits: hasFraction ? 1 : 0,
        maximumFractionDigits: 1,
      })
      return `${formatted}jt`
    }

    if (numeric >= thousand) {
      const scaled = numeric / thousand
      const hasFraction = scaled % 1 !== 0
      const formatted = scaled.toLocaleString('id-ID', {
        minimumFractionDigits: hasFraction ? 1 : 0,
        maximumFractionDigits: 1,
      })
      return `${formatted}rb`
    }

    return numeric.toLocaleString('id-ID')
  }

  return (
    <>
      <Navbar />
      <div className="bg-white py-10">
        <Container className="px-3">
          {loading && (
            <div className="text-center py-5">
              <Spinner animation="border" role="status" />
              <p className="text-slate-500 mt-3">Memuat tipe kamar...</p>
            </div>
          )}

          {error && (
            <Alert variant="danger" className="rounded-2xl border border-red-200">
              {error}
            </Alert>
          )}

          {!loading && (
            <>
              <div className="flex items-center gap-3 mb-6">
                <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-0 break-words">{parsedRoom.name}</h1>
                <Badge bg="success" className="rounded-full px-3 py-2 text-sm">{parsedRoom.size}</Badge>
              </div>

          <Row className="g-4">
            <Col lg={8} className="space-y-5">
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <img src={parsedRoom.hero} alt={parsedRoom.name} className="w-full h-64 md:h-80 object-cover" />
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-2xl font-semibold text-slate-900 mb-2">Deskripsi</h2>
                <p className="text-slate-600">{parsedRoom.description}</p>
              </div>

              {parsedRoom.features.length > 0 && (
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h2 className="text-2xl font-semibold text-slate-900 mb-3">Fitur Ruangan</h2>
                  <div className="flex flex-wrap gap-2">
                    {parsedRoom.features.map((feature, idx) => (
                      <div key={idx} className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-2 text-sm text-white">
                        <span aria-hidden="true">✓</span>
                        {feature}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {parsedRoom.facilities.length > 0 && (
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h2 className="text-2xl font-semibold text-slate-900 mb-3">Fasilitas Termasuk</h2>
                  <Row>
                    {parsedRoom.facilities.map((facility, idx) => (
                      <Col key={idx} md={6} className="mb-2">
                        <div className="flex items-start gap-2 text-slate-700">
                          <span className="text-slate-500" aria-hidden="true">•</span>
                          {facility}
                        </div>
                      </Col>
                    ))}
                  </Row>
                </div>
              )}
            </Col>

            <Col lg={4}>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-xl font-semibold text-slate-900">Informasi Harga</h3>
                <div className="mt-2 text-2xl font-bold text-slate-900">
                  {parsedRoom.rentRange || parsedRoom.saleRange ? (
                    <>
                      {parsedRoom.rentRange && (
                        <div>
                          Sewa : {formatShortCurrency(parsedRoom.rentRange.min)} - {formatShortCurrency(parsedRoom.rentRange.max)}/bulan
                        </div>
                      )}
                      {parsedRoom.saleRange && (
                        <div>
                          Jual : {formatShortCurrency(parsedRoom.saleRange.min)} - {formatShortCurrency(parsedRoom.saleRange.max)}
                        </div>
                      )}
                    </>
                  ) : (
                    'Hubungi admin untuk harga'
                  )}
                </div>


                <hr />

                <h4 className="text-lg font-semibold text-slate-900">Ideal Untuk</h4>
                <p className="text-slate-600">{parsedRoom.ideal}</p>

                <Button className="mt-3 w-100 rounded-full" variant="dark" onClick={() => navigate('/inquiry')}>
                  Ajukan Inquiry
                </Button>
                <Button className="mt-2 w-100 rounded-full" variant="outline-secondary" onClick={() => window.open('https://wa.me/6289506516117?text=Halo, saya tertarik dengan unit ' + parsedRoom.name, '_blank')}>
                  Hubungi Admin
                </Button>

                <div className="mt-4 rounded-xl bg-slate-50 p-3 text-slate-700">
                  <h5 className="font-semibold mb-1">Hubungi Kami</h5>
                  <p className="text-sm">📞 (021) 555 0199</p>
                  <p className="text-sm">📧 hello@samesta.id</p>
                </div>
              </div>
            </Col>
          </Row>
            </>
          )}
        </Container>
      </div>
    </>
  )
}

export default RoomTypeDetail
