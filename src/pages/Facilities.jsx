import { Container, Row, Col, Card } from 'react-bootstrap'

function Facilities() {
  const facilities = [
    {
      id: 1,
      name: 'Minimarket',
      icon: '🏪',
      description: 'Minimarket 24 jam untuk memenuhi kebutuhan sehari-hari Anda'
    },
    {
      id: 2,
      name: 'Laundry',
      icon: '👔',
      description: 'Layanan laundry profesional untuk kemudahan dan kenyamanan Anda'
    },
    {
      id: 3,
      name: 'CCTV',
      icon: '📹',
      description: 'Sistem CCTV 24 jam untuk menjaga keamanan lingkungan'
    },
    {
      id: 4,
      name: 'One Gate System',
      icon: '🚪',
      description: 'Sistem satu pintu masuk untuk keamanan yang lebih terkontrol'
    },
    {
      id: 5,
      name: 'Jogging Track',
      icon: '🏃',
      description: 'Area jogging track untuk aktivitas olahraga pagi maupun sore'
    },
    {
      id: 6,
      name: 'Lapangan Bermain',
      icon: '🎪',
      description: 'Area bermain yang aman dan nyaman untuk anak-anak'
    },
    {
      id: 7,
      name: 'Food & Beverage',
      icon: '🍽️',
      description: 'Area food & beverage dengan berbagai pilihan makanan dan minuman'
    }
  ]


  return (
    <>
      <div className="bg-white py-10">
        <Container className="px-3">
          <div className="text-center mb-10">
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900">Fasilitas Samesta Living</h1>
            <p className="mt-3 text-lg text-slate-600">
              Nikmati berbagai fasilitas premium untuk kenyamanan dan kemudahan hidup Anda
            </p>
          </div>

          <Row className="g-4">
            {facilities.map((facility) => (
              <Col key={facility.id} xs={12} sm={6} md={4} lg={3}>
                <Card className="h-100 rounded-2xl border border-slate-200 shadow-sm">
                  <Card.Body className="text-center d-flex flex-column gap-3">
                    <div className="text-4xl" aria-hidden="true">{facility.icon}</div>
                    <h3 className="text-xl font-semibold text-slate-900">{facility.name}</h3>
                    <p className="text-slate-600 flex-grow text-sm">
                      {facility.description}
                    </p>
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>
        </Container>
      </div>
    </>
  )
}

export default Facilities
