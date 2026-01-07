import { useState } from 'react'
import { Container, Row, Col, Card, Badge, Button, Modal } from 'react-bootstrap'
import { useNavigate } from 'react-router-dom'

function Promo() {
  const navigate = useNavigate()
  const [selectedPromo, setSelectedPromo] = useState(null)
  const [showModal, setShowModal] = useState(false)

  const handleShowDetails = (promo) => {
    setSelectedPromo(promo)
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setSelectedPromo(null)
  }

  const promos = [
    {
      id: 1,
      title: 'Studio Special',
      discount: '25% OFF',
      description: 'First month rent for new tenants',
      validUntil: 'Dec 31, 2025',
      terms: 'Valid for new tenants only. Minimum 6 months contract required.'
    },
    {
      id: 2,
      title: '2 Bedroom Deal',
      discount: '30% OFF',
      description: 'Move in this month and save big',
      validUntil: 'Dec 31, 2025',
      terms: 'Available for immediate move-in. Subject to availability.'
    },
    {
      id: 3,
      title: 'Early Bird Special',
      discount: '15% OFF',
      description: 'Book 3 months in advance',
      validUntil: 'Dec 31, 2025',
      terms: 'Booking must be made at least 3 months before move-in date.'
    },
    {
      id: 4,
      title: 'Holiday Promo',
      discount: '20% OFF',
      description: 'Special holiday rates available',
      validUntil: 'Jan 15, 2026',
      terms: 'Valid during holiday season. Limited units available.'
    },
    {
      id: 5,
      title: 'Long Stay Discount',
      discount: '35% OFF',
      description: 'Book 6+ months and get extra savings',
      validUntil: 'Jan 31, 2026',
      terms: 'Minimum 6 months contract. First month payment required upfront.'
    },
    {
      id: 6,
      title: 'Student Special',
      discount: '10% OFF',
      description: 'Valid student ID required',
      validUntil: 'Dec 31, 2025',
      terms: 'Must present valid student ID. Applicable to studio units only.'
    }
  ]

  return (
    <>
      <div className="bg-white py-10">
        <Container className="px-3">
          <div className="text-center mb-10">
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-3">Promo Spesial</h1>
            <p className="text-lg text-slate-600">Dapatkan penawaran terbaik untuk hunian impian Anda</p>
          </div>

          <Row className="g-4">
            {promos.map((promo) => (
              <Col key={promo.id} md={6} lg={4}>
                <Card className="h-100 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="relative">
                    <div className="flex h-64 w-full items-center justify-center bg-slate-100 text-5xl">🏢</div>
                    <Badge 
                      bg="danger" 
                      className="position-absolute top-0 end-0 m-3 fs-6 fs-sm-5 fs-lg-4 px-3 px-sm-4 py-2 rounded-full"
                    >
                      {promo.discount}
                    </Badge>
                  </div>
                  <Card.Body className="d-flex flex-column">
                    <Card.Title className="fw-bold fs-3 mb-3 text-slate-900">{promo.title}</Card.Title>
                    <Card.Text className="text-slate-600 mb-3 fs-6">
                      {promo.description}
                    </Card.Text>
                    <div className="mb-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
                      <strong className="block text-slate-800 mb-1">Syarat & Ketentuan:</strong>
                      <span>{promo.terms}</span>
                    </div>
                    <div className="mt-auto">
                      <div className="d-flex justify-content-between align-items-center mb-3 text-sm text-slate-600">
                        <small>
                          <i className="bi bi-calendar-event me-1"></i>
                          Valid sampai {promo.validUntil}
                        </small>
                      </div>
                      <div className="d-grid gap-2">
                        <Button 
                          variant="dark" 
                          size="lg"
                          onClick={() => handleShowDetails(promo)}
                          className="rounded-full"
                        >
                          Info Lebih Lanjut
                        </Button>
                      </div>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>

          <div className="mt-8 rounded-2xl bg-slate-900 p-6 text-center text-white">
            <h3 className="text-2xl font-semibold mb-2">Masih Ada Pertanyaan?</h3>
            <p className="text-slate-200 mb-4">Tim kami siap membantu Anda menemukan promo terbaik</p>
            <Button 
              variant="light" 
              size="lg"
              onClick={() => window.open('https://wa.me/628123456789', '_blank')}
              className="rounded-full"
            >
              Hubungi Kami
            </Button>
          </div>
        </Container>
      </div>

      {/* Promo Detail Modal */}
      <Modal show={showModal} onHide={handleCloseModal} size="lg" centered>
        <Modal.Header closeButton className="border-0">
          <Modal.Title className="fw-bold">{selectedPromo?.title}</Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4">
          {selectedPromo && (
            <>
              <div className="text-center mb-4">
                <Badge bg="danger" className="fs-5 fs-md-3 px-3 px-sm-4 py-3">
                  {selectedPromo.discount}
                </Badge>
              </div>

              <div className="mb-4">
                <h5 className="fw-bold mb-3">Deskripsi Promo</h5>
                <p className="text-muted fs-5">{selectedPromo.description}</p>
              </div>

              <div className="mb-4 p-4 bg-light rounded">
                <h5 className="fw-bold mb-3">Syarat & Ketentuan</h5>
                <p className="text-muted mb-0">{selectedPromo.terms}</p>
              </div>

              <div className="mb-4">
                <div className="d-flex align-items-center">
                  <i className="bi bi-calendar-event me-2 fs-5"></i>
                  <span className="text-muted">Berlaku sampai: <strong>{selectedPromo.validUntil}</strong></span>
                </div>
              </div>

              <div className="alert alert-info mb-4">
                <i className="bi bi-info-circle me-2"></i>
                Promo ini terbatas dan dapat berubah sewaktu-waktu. Segera hubungi kami untuk mendapatkan penawaran terbaik!
              </div>

              <div className="d-grid gap-2">
                <Button 
                  variant="success" 
                  size="lg"
                  onClick={() => window.open('https://wa.me/6289506516117?text=Halo, saya tertarik dengan promo ' + selectedPromo.title, '_blank')}
                >
                  <i className="bi bi-whatsapp me-2"></i>
                  Hubungi via WhatsApp
                </Button>
                <Button 
                  variant="outline-dark" 
                  size="lg"
                  onClick={() => navigate('/inquiry')}
                >
                  Isi Form Inquiry
                </Button>
              </div>
            </>
          )}
        </Modal.Body>
      </Modal>
    </>
  )
}

export default Promo
