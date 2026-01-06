import { useState } from 'react'
import { Carousel, Container, Row, Col, Card, Badge, Modal, Button } from 'react-bootstrap'

export default function MonthlyPromo() {
  const [selectedPromo, setSelectedPromo] = useState(null)
  const [showModal, setShowModal] = useState(false)

  const promoPlaceholderSrc = '/promo-placeholder.svg'

  const promos = [
    [
      {
        id: 1,
        title: 'Promo Studio Spesial',
        discount: '25% OFF',
        description: 'Sewa bulan pertama untuk penyewa baru',
        image: promoPlaceholderSrc,
        validUntil: 'Dec 31, 2025'
      },
      {
        id: 2,
        title: 'Promo 2 Bedroom',
        discount: '30% OFF',
        description: 'Pindah bulan ini dan hemat lebih banyak',
        image: promoPlaceholderSrc,
        validUntil: 'Dec 31, 2025'
      },
      {
        id: 3,
        title: 'Promo Early Bird',
        discount: '15% OFF',
        description: 'Pesan 3 bulan lebih awal',
        image: promoPlaceholderSrc,
        validUntil: 'Dec 31, 2025'
      }
    ],
    [
      {
        id: 4,
        title: 'Promo Liburan',
        discount: '20% OFF',
        description: 'Tarif spesial musim liburan',
        image: promoPlaceholderSrc,
        validUntil: 'Jan 15, 2026'
      },
      {
        id: 5,
        title: 'Diskon Tinggal Lama',
        discount: '35% OFF',
        description: 'Sewa 6+ bulan dan dapatkan ekstra hemat',
        image: promoPlaceholderSrc,
        validUntil: 'Jan 31, 2026'
      },
      {
        id: 6,
        title: 'Promo Pelajar',
        discount: '10% OFF',
        description: 'Wajib menunjukkan kartu pelajar yang valid',
        image: promoPlaceholderSrc,
        validUntil: 'Dec 31, 2025'
      }
    ]
  ]

  return (
    <section className="py-14 bg-slate-50">
      <Container className="px-3">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-bold mb-3 text-slate-900">Promo Bulan Ini</h2>
          <p className="text-lg text-slate-600">Jangan lewatkan promo menarik bulan ini!</p>
        </div>

        <Carousel indicators={false} interval={5000}>
          {promos.map((promoGroup, groupIndex) => (
            <Carousel.Item key={groupIndex}>
              <Row className="g-4" xs={1} md={2} lg={3}>
                {promoGroup.map((promo) => (
                  <Col key={promo.id}>
                    <Card className="h-100 border-0 shadow-sm rounded-2xl overflow-hidden transition duration-300 hover:-translate-y-2 hover:shadow-xl">
                      <div className="relative">
                        <img
                          src={promo.image || promoPlaceholderSrc}
                          alt={`${promo.title} promo`}
                          className="h-52 w-full object-cover"
                          loading="lazy"
                        />
                        <Badge 
                          bg="danger" 
                          className="position-absolute top-0 end-0 m-3 fs-6 fs-sm-5 px-3 py-2 rounded-full"
                        >
                          {promo.discount}
                        </Badge>
                      </div>
                      <Card.Body className="d-flex flex-column">
                        <Card.Title className="fw-bold fs-4 mb-3 text-slate-900">{promo.title}</Card.Title>
                        <Card.Text className="text-muted mb-3 flex-grow-1">
                          {promo.description}
                        </Card.Text>
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <small className="text-slate-500">Berlaku sampai {promo.validUntil}</small>
                          <button
                            type="button"
                            className="inline-flex h-11 w-full items-center justify-center rounded-full bg-slate-900 px-4 text-sm font-semibold text-white transition-colors transition-transform hover:bg-slate-800 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 sm:w-auto"
                            onClick={() => {
                              setSelectedPromo(promo)
                              setShowModal(true)
                            }}
                            aria-label={`Lihat detail promo: ${promo.title}`}
                          >
                            Lihat detail
                          </button>
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>
                ))}
              </Row>
            </Carousel.Item>
          ))}
        </Carousel>
      </Container>

      {/* Promo Detail Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} centered size="lg">
        <Modal.Header closeButton className="border-0">
          <Modal.Title className="fw-bold">{selectedPromo?.title}</Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4">
          {selectedPromo && (
            <>
              <div className="text-center mb-4">
                <Badge bg="danger" className="fs-4 px-4 py-3">
                  {selectedPromo.discount}
                </Badge>
              </div>

              <div className="mb-3">
                <h5 className="fw-bold mb-2">Deskripsi</h5>
                <p className="text-muted mb-0">{selectedPromo.description}</p>
              </div>

              <div className="mb-3 p-3 bg-slate-100 rounded-xl">
                <h6 className="fw-bold mb-2">Berlaku sampai</h6>
                <div className="d-flex align-items-center text-muted">
                  <i className="bi bi-calendar-event me-2"></i>
                  <span>{selectedPromo.validUntil}</span>
                </div>
              </div>

              <div className="alert alert-info mb-4">
                <i className="bi bi-info-circle me-2"></i>
                Promo ini terbatas dan dapat berubah sewaktu-waktu. Hubungi kami untuk detail syarat & ketentuan.
              </div>

              <div className="d-grid gap-2">
                <Button 
                  variant="success" 
                  size="lg"
                  onClick={() => window.open(`https://wa.me/6289506516117?text=Halo, saya tertarik dengan promo ${selectedPromo.title}`,'_blank')}
                >
                  <i className="bi bi-whatsapp me-2"></i>
                  Hubungi via WhatsApp
                </Button>
              </div>
            </>
          )}
        </Modal.Body>
      </Modal>
    </section>
  )
}
