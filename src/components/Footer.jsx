import { Container, Row, Col } from 'react-bootstrap'
import { Link } from 'react-router-dom'

function Footer() {
  return (
    <footer className="mt-16 bg-slate-900 text-slate-100">
      <Container className="px-3 py-12">
        <Row className="g-6">
          <Col md={3} className="space-y-3">
            <h4 className="text-xl font-semibold">Apartemen Samesta Jakabaring</h4>
            <p className="text-sm text-slate-300">
              Hunian premium dengan keamanan 24 jam, lokasi strategis, dan fasilitas lengkap untuk gaya hidup modern.
            </p>
          </Col>
          <Col md={3} className="space-y-3">
            <h5 className="text-lg font-semibold">Quick Links</h5>
            <ul className="space-y-2 text-sm text-slate-300">
              <li><Link to="/" className="hover:text-white">Beranda</Link></li>
              <li><Link to="/apartments" className="hover:text-white">Apartemen</Link></li>
              <li><Link to="/facilities" className="hover:text-white">Fasilitas</Link></li>
              <li><Link to="/about" className="hover:text-white">Tentang Kami</Link></li>
            </ul>
          </Col>
          <Col md={3} className="space-y-2 text-sm text-slate-300">
            <h5 className="text-lg font-semibold text-white">Hubungi Kami</h5>
            <p>Silaberanti, Kecamatan Seberang Ulu I, Kota Palembang, Sumatera Selatan</p>
            <p>Telp: (+62)85366503363</p>
            <p>Email: samestajakabaring@gmail.com</p>
            <div className="flex gap-3 text-sm font-semibold text-white">
              <a href="https://www.instagram.com/samestajakabaringpalembang/" target="_blank" rel="noreferrer" className="hover:underline">Instagram</a>
              <a href="https://facebook.com" target="_blank" rel="noreferrer" className="hover:underline">Facebook</a>
              <a href="https://youtube.com" target="_blank" rel="noreferrer" className="hover:underline">YouTube</a>
            </div>
          </Col>
          <Col md={3} className="space-y-3">
            <h5 className="text-lg font-semibold text-white">Lokasi Kita</h5>
            <div className="overflow-hidden rounded-xl border border-slate-800">
              <iframe
                title="Lokasi Samesta"
                src="https://www.google.com/maps?q=https://maps.app.goo.gl/xuKn3LxDKEcRWN3J9&output=embed"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="h-40 w-full"
              ></iframe>
            </div>
          </Col>
        </Row>
        <Row className="pt-8">
          <Col>
            <div className="flex flex-col gap-2 border-t border-slate-800 pt-4 text-sm text-slate-400 md:flex-row md:items-center md:justify-between">
              <span>© {new Date().getFullYear()} Samesta Living. All rights reserved.</span>
              <span>Workshop | Privacy Policy | Terms</span>
            </div>
          </Col>
        </Row>
      </Container>
    </footer>
  )
}

export default Footer
