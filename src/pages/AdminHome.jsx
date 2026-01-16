import { Container, Row, Col, Card, Spinner, Alert, Button } from 'react-bootstrap'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { paymentsAPI, unitTypesAPI } from '../services/api'
import SalesChart from '../components/SalesChart'

function AdminHome() {
  const navigate = useNavigate()
  const [units, setUnits] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [payments, setPayments] = useState([])
  const [loadingPayments, setLoadingPayments] = useState(false)

  useEffect(() => {
    const fetchUnits = async () => {
      setLoading(true)
      setError('')
      try {
        const res = await unitTypesAPI.getAll()
        const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : []
        setUnits(list)
      } catch (err) {
        console.error('Failed to load unit stats', err)
        setError('Gagal memuat data unit dari server')
      } finally {
        setLoading(false)
      }
    }
    fetchUnits()
  }, [])

  useEffect(() => {
    const fetchPayments = async () => {
      setLoadingPayments(true)
      try {
        const res = await paymentsAPI.getAll({ limit: 500 })
        const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : []
        setPayments(list)
      } catch (err) {
        console.error('Failed to load payments stats', err)
      } finally {
        setLoadingPayments(false)
      }
    }

    fetchPayments()
  }, [])

  const buildMonthlySeries = (payments, purchaseType) => {
    const normalizeStatus = (raw) => String(raw?.status || '').toLowerCase()

    const amountOf = (raw) => {
      if (purchaseType === 'rent') {
        return Number(raw?.inquiry?.unit?.unit_type?.rent_price ?? 0)
      }
      return Number(raw?.inquiry?.unit?.unit_type?.sale_price ?? 0)
    }

    const dateOf = (raw) =>
      raw?.paid_at ||
      raw?.paidAt ||
      raw?.verified_at ||
      raw?.verifiedAt ||
      raw?.updated_at ||
      raw?.updatedAt ||
      raw?.created_at ||
      raw?.createdAt

    const now = new Date()
    const months = []

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      months.push({
        key,
        label: d.toLocaleString('id-ID', { month: 'short' }),
        total: 0,
        count: 0
      })
    }

    const indexByKey = new Map(months.map((m, idx) => [m.key, idx]))

    ;(Array.isArray(payments) ? payments : []).forEach((p) => {
      const status = normalizeStatus(p)
      const isSuccess = ['confirmed', 'paid', 'settled'].includes(status)
      if (!isSuccess) return

      if (p?.inquiry?.purchase_type !== purchaseType) return

      const dt = new Date(dateOf(p) || '')
      if (Number.isNaN(dt.getTime())) return

      const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`
      const idx = indexByKey.get(key)
      if (idx === undefined) return

      const amt = amountOf(p)
      months[idx].total += Number.isFinite(amt) ? amt : 0
      months[idx].count += 1
    })

    const max = Math.max(...months.map(m => m.total), 1)

    return months.map(m => ({
      ...m,
      max
    }))
  }

  const stats = useMemo(() => {
    const total = units.length

    const normalizeUnitStatus = (value) => {
      const s = String(value || '').trim().toLowerCase()
      if (s === 'occupied' || s === 'booked' || s === 'maintenance') return 'book'
      if (s === 'available' || s === 'book' || s === 'sold') return s
      return s
    }

    const byStatus = units.reduce(
      (acc, item) => {
        const status = normalizeUnitStatus(item.status)
        if (status === 'available') acc.available += 1
        else if (status === 'book') acc.book += 1
        else if (status === 'sold') acc.sold += 1
        else acc.other += 1
        return acc
      },
      { available: 0, book: 0, sold: 0, other: 0 }
    )
    return {
      total,
      ...byStatus,
    }
  }, [units])

  const salesSeriesSale = useMemo(() => {
    return buildMonthlySeries(payments, 'sale')
  }, [payments])

  const salesSeriesRent = useMemo(() => {
    return buildMonthlySeries(payments, 'rent')
  }, [payments])


  return (
    <Container fluid className="min-vh-100 bg-slate-50 py-5 px-3">
      <div className="d-flex flex-wrap gap-3 align-items-center mb-4">
        <h2 className="mb-0 fw-bold">Dashboard Overview</h2>
        {loading && (
          <div className="d-flex align-items-center gap-2 text-slate-600 text-sm">
            <Spinner animation="border" size="sm" /> Memuat data terbaru...
          </div>
        )}
      </div>

      {error && (
        <Alert variant="danger" className="rounded-2xl border border-red-200">
          {error}
        </Alert>
      )}
      
      <Row className="g-4">
        <Col md={6} lg={3}>
          <Card className="h-100 rounded-2xl border border-slate-200 bg-white shadow-sm">
            <Card.Body>
              <div className="d-flex align-items-center">
                <div className="me-3 rounded-2xl bg-blue-50 px-3 py-2">
                  <span style={{ fontSize: '2rem' }}>🏢</span>
                </div>
                <div>
                  <h6 className="text-muted mb-1">Total Apartemen</h6>
                  <h2 className="mb-0 fw-bold">{stats.total}</h2>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={6} lg={3}>
          <Card className="h-100 rounded-2xl border border-slate-200 bg-white shadow-sm">
            <Card.Body>
              <div className="d-flex align-items-center">
                <div className="me-3 rounded-2xl bg-emerald-50 px-3 py-2">
                  <span style={{ fontSize: '2rem' }}>✅</span>
                </div>
                <div>
                  <h6 className="text-muted mb-1">Tersedia</h6>
                  <h2 className="mb-0 fw-bold text-success">{stats.available}</h2>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={6} lg={3}>
          <Card className="h-100 rounded-2xl border border-slate-200 bg-white shadow-sm">
            <Card.Body>
              <div className="d-flex align-items-center">
                <div className="me-3 rounded-2xl bg-amber-50 px-3 py-2">
                  <span style={{ fontSize: '2rem' }}>🟡</span>
                </div>
                <div>
                  <h6 className="text-muted mb-1">Dibooking</h6>
                  <h2 className="mb-0 fw-bold text-warning">{stats.book}</h2>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={6} lg={3}>
          <Card className="h-100 rounded-2xl border border-slate-200 bg-white shadow-sm">
            <Card.Body>
              <div className="d-flex align-items-center">
                <div className="me-3 rounded-2xl bg-rose-50 px-3 py-2">
                  <span style={{ fontSize: '2rem' }}>🔴</span>
                </div>
                <div>
                  <h6 className="text-muted mb-1">Terjual</h6>
                  <h2 className="mb-0 fw-bold text-danger">{stats.sold}</h2>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row className="mt-4">
        <Col>
          <Card className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <Card.Body>
              <h5 className="fw-bold mb-3">Selamat Datang di Admin Dashboard</h5>
              <p className="text-muted mb-0">
                Gunakan menu "Kelola Apartemen" untuk menambah, mengedit, atau menghapus data apartemen.
              </p>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row className="mt-4">
        <Col>
          <Card className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <Card.Body>
              <h5 className="fw-bold mb-3">Quick Actions</h5>
              <div className="d-flex flex-column gap-2">
                <Button variant="dark" className="w-100" onClick={() => navigate('/admin/apartments')}>
                  + Tambah / Kelola Apartemen
                </Button>
                <Button variant="outline-primary" className="w-100" onClick={() => navigate('/admin/inquiries')}>
                  Lihat Inquiry
                </Button>
                <Button variant="outline-success" className="w-100" onClick={() => navigate('/admin/payments')}>
                  Review Pembayaran
                </Button>
              </div>
              <div className="text-muted small mt-3">
                Gunakan tombol di atas untuk akses cepat ke menu penting.
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row className="mt-4">
        <Col md={3} lg={6}>
          <SalesChart
            title="Grafik Penjualan"
            subtitle="Transaksi penjualan apartemen (6 bulan terakhir)"
            salesSeries={salesSeriesSale}
            loadingPayments={loadingPayments}
          />
        </Col>

        <Col md={3} lg={6}>
          <SalesChart
            title="Grafik Sewa"
            subtitle="Transaksi sewa apartemen (6 bulan terakhir)"
            salesSeries={salesSeriesRent}
            loadingPayments={loadingPayments}
          />
        </Col>
      </Row>
    </Container>
  )
}

export default AdminHome
