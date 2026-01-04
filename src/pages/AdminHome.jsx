import { Container, Row, Col, Card, Spinner, Alert } from 'react-bootstrap'
import { useEffect, useMemo, useState } from 'react'
import { unitTypesAPI } from '../services/api'

function AdminHome() {
  const [units, setUnits] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [activityLogs, setActivityLogs] = useState([])

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
    setActivityLogs(JSON.parse(localStorage.getItem('activityLogs') || '[]'))
  }, [])

  const stats = useMemo(() => {
    const total = units.length
    const byStatus = units.reduce(
      (acc, item) => {
        const status = (item.status || '').toLowerCase()
        if (status === 'available') acc.available += 1
        else if (status === 'occupied') acc.occupied += 1
        else if (status === 'maintenance') acc.maintenance += 1
        else acc.other += 1
        return acc
      },
      { available: 0, occupied: 0, maintenance: 0, other: 0 }
    )
    return {
      total,
      ...byStatus,
    }
  }, [units])

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
                <div className="me-3 rounded-2xl bg-rose-50 px-3 py-2">
                  <span style={{ fontSize: '2rem' }}>🔴</span>
                </div>
                <div>
                  <h6 className="text-muted mb-1">Terisi</h6>
                  <h2 className="mb-0 fw-bold text-danger">{stats.occupied}</h2>
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
                  <span style={{ fontSize: '2rem' }}>🔧</span>
                </div>
                <div>
                  <h6 className="text-muted mb-1">Maintenance</h6>
                  <h2 className="mb-0 fw-bold text-warning">{stats.maintenance}</h2>
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
              <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                <h5 className="fw-bold mb-0">Aktivitas Terbaru</h5>
                <span className="text-muted small">{activityLogs.length} log</span>
              </div>
              {activityLogs.length === 0 && <div className="text-muted">Belum ada aktivitas.</div>}
              <div className="d-flex flex-column gap-2">
                {activityLogs.map((log) => (
                  <div key={log.id} className="d-flex justify-content-between align-items-center rounded border border-slate-200 px-3 py-2">
                    <div className="d-flex flex-column">
                      <span className="fw-semibold text-slate-900 text-capitalize">{log.action}</span>
                      <span className="text-muted small">{log.name}</span>
                    </div>
                    <span className="text-muted small">{new Date(log.at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                  </div>
                ))}
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  )
}

export default AdminHome
