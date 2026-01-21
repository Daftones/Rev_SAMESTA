import { useState } from 'react'
import { Carousel, Container, Row, Col, Card, Badge, Modal, Button } from 'react-bootstrap'

import promoImage1 from '../assets/Promo samesta 1.png'
import promoImage2 from '../assets/promo samesta 2.png'
import promoImage3 from '../assets/Promo samesta 3.png'
import promoImage4 from '../assets/promo samesta 4.png'
import promoImage5 from '../assets/promo samesta 5.png'
import promoImage6 from '../assets/promo samesta 6.png'

export default function MonthlyPromo() {
  const [selectedPromo, setSelectedPromo] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [showImageModal, setShowImageModal] = useState(false)

  const promos = [
    [
      {
        id: 1,
        title: 'Promo Spekta Samesta',
        discount: 'Booking Rp990K',
        description:
          'Gratis biaya akad dan AC 1/2 PK untuk pembelian apartemen dan kios Samesta Jakabaring.',
        image: promoImage1,
        validUntil: '30 September 2025',
      },
      {
        id: 2,
        title: 'Special Promo Apartemen Pertama',
        discount: 'Booking Rp500 Ribu',
        description:
          'Gratis biaya akad, gratis AC, dan bebas angsuran hingga 6 bulan.',
        image: promoImage2,
        validUntil: '31 Desember 2025',
      },
      {
        id: 3,
        title: '12.12 Live Flash Sale',
        discount: 'Promo Spesial',
        description:
          'Dapatkan penawaran eksklusif selama Live Flash Sale Samesta Jakabaring di TikTok.',
        image: promoImage3,
        validUntil: '12 Desember 2025',
      },
    ],
    [
      {
        id: 4,
        title: 'Open House Samesta Jakabaring',
        discount: 'Free AC',
        description:
          'Kunjungi Open House Samesta Jakabaring dan nikmati promo booking spesial serta gratis biaya akad.',
        image: promoImage4,
        validUntil: '23 November 2025',
      },
      {
        id: 5,
        title: 'Promo Juliversary HUT Perumnas 51 Tahun',
        discount: 'Diskon DP 51%',
        description:
          'Rayakan HUT Perumnas ke-51 dengan promo spesial: reservasi mulai Rp510 ribu, diskon DP hingga 51%, free AC 1 PK, serta berbagai hadiah menarik.',
        image: promoImage5,
        validUntil: '31 Desember 2025',
      },
      {
        id: 6,
        title: 'Open Table Samesta Jakabaring',
        discount: 'Booking Spesial',
        description:
          'Hadir lebih dekat di Hari Bakti Dinas PU Kota Palembang. Nikmati diskon khusus booking di tempat, hadiah langsung, dan souvenir menarik.',
        image: promoImage6,
        validUntil: '4 Desember 2025',
      },
    ],
  ]

  return (
    <section className="py-14 bg-slate-50">
      <Container className="px-3">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-bold mb-3 text-slate-900">
            Promo Bulan Ini
          </h2>
          <p className="text-lg text-slate-600">
            Jangan lewatkan promo menarik bulan ini!
          </p>
        </div>

        <Carousel indicators={false} interval={5000}>
          {promos.map((promoGroup, groupIndex) => (
            <Carousel.Item key={groupIndex}>
              <Row className="g-4" xs={1} md={2} lg={3}>
                {promoGroup.map((promo) => (
                  <Col key={promo.id}>
                    <Card
                      className="h-100 border-0 shadow-md hover:shadow-lg rounded-3xl overflow-hidden"
                      style={{
                        transition: 'all 0.3s ease',
                        display: 'flex',
                        flexDirection: 'column',
                        maxHeight: '500px'
                      }}
                    >
                      {/* IMAGE CONTAINER - FULL POSTER WITHOUT CROP */}
                      <div
                        className="position-relative overflow-hidden"
                        style={{
                          cursor: 'pointer',
                          height: '280px',
                          backgroundColor: '#f8fafc',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}
                        onClick={() => {
                          setSelectedPromo(promo)
                          setShowImageModal(true)
                        }}
                      >
                        <img
                          src={promo.image}
                          alt={`${promo.title} - Promo Samesta Apartment`}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'contain',
                            objectPosition: 'center',
                            transition: 'transform 0.3s ease'
                          }}
                          loading="lazy"
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.transform = 'scale(1.03)')
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.transform = 'scale(1)')
                          }
                        />
                        <Badge
                          bg="danger"
                          className="position-absolute top-0 end-0 m-3 fs-5 px-4 py-2 rounded-pill shadow-lg"
                          style={{ fontWeight: '700' }}
                        >
                          {promo.discount}
                        </Badge>
                      </div>

                      {/* CARD BODY - TEXT CONTENT */}
                      <Card.Body
                        className="d-flex flex-column p-3"
                        style={{
                          overflow: 'hidden',
                          flex: 1
                        }}
                      >
                        <div style={{ minHeight: 0 }}>
                          <Card.Title
                            className="fw-bold fs-6 mb-2 text-slate-900"
                            style={{
                              fontSize: '0.95rem',
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden'
                            }}
                          >
                            {promo.title}
                          </Card.Title>
                          <Card.Text
                            className="text-slate-600 mb-0"
                            style={{
                              fontSize: '0.8rem',
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                              lineHeight: '1.3'
                            }}
                          >
                            {promo.description}
                          </Card.Text>
                        </div>

                        {/* DATE AND BUTTON */}
                        <div
                          className="mt-auto d-flex flex-column gap-2"
                          style={{ marginTop: '0.75rem' }}
                        >
                          <small
                            className="text-slate-500"
                            style={{ fontSize: '0.75rem' }}
                          >
                            <i className="bi bi-calendar-event me-2"></i>
                            Sampai {promo.validUntil}
                          </small>
                          <button
                            type="button"
                            className="btn btn-dark btn-sm rounded-pill fw-semibold w-100"
                            style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
                            onClick={() => {
                              setSelectedPromo(promo)
                              setShowModal(true)
                            }}
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

      {/* MODAL DETAIL PROMO */}
      <Modal show={showModal} onHide={() => setShowModal(false)} centered size="lg">
        <Modal.Header closeButton className="border-0">
          <Modal.Title className="fw-bold">
            {selectedPromo?.title}
          </Modal.Title>
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
                <p className="text-muted mb-0">
                  {selectedPromo.description}
                </p>
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
                Promo ini terbatas dan dapat berubah sewaktu-waktu. Hubungi kami
                untuk detail syarat & ketentuan.
              </div>

              <div className="d-grid gap-2">
                <Button
                  variant="primary"
                  onClick={() => {
                    setShowModal(false)
                    setShowImageModal(true)
                  }}
                  className="fw-semibold"
                >
                  <i className="bi bi-fullscreen me-2"></i>
                  Lihat Poster Fullscreen
                </Button>
                <Button
                  variant="success"
                  size="lg"
                  onClick={() =>
                    window.open(
                      `https://wa.me/6285366503363?text=Halo, saya tertarik dengan promo ${selectedPromo.title}`,
                      '_blank'
                    )
                  }
                >
                  <i className="bi bi-whatsapp me-2"></i>
                  Hubungi via WhatsApp
                </Button>
              </div>
            </>
          )}
        </Modal.Body>
      </Modal>

      {/* MODAL FULLSCREEN POSTER */}
      <Modal
        show={showImageModal}
        onHide={() => setShowImageModal(false)}
        size="lg"
        fullscreen="md-down"
        centered
        className="modal-fullscreen-poster"
      >
        <Modal.Header closeButton className="border-0 bg-dark text-white">
          <Modal.Title className="fw-bold">
            {selectedPromo?.title}
          </Modal.Title>
        </Modal.Header>

        <Modal.Body
          className="p-0"
          style={{
            backgroundColor: '#1e293b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '70vh'
          }}
        >
          {selectedPromo && (
            <div
              style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '2rem'
              }}
            >
              <img
                src={selectedPromo.image}
                alt={`${selectedPromo.title} - Full Poster`}
                style={{
                  maxWidth: '100%',
                  maxHeight: '100%',
                  objectFit: 'contain',
                  objectPosition: 'center',
                  borderRadius: '12px',
                  boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)'
                }}
              />
            </div>
          )}
        </Modal.Body>
      </Modal>
    </section>
  )
}
