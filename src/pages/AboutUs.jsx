import { Container, Row, Col } from 'react-bootstrap'

function AboutUs() {
  return (
    <>
      <div className="bg-white py-10">
        <Container className="px-3">
          <div className="text-center mb-10">
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900">Tentang Samesta Living</h1>
            <p className="mt-3 text-lg text-slate-600">Hunian Premium dengan Standar Kualitas Terbaik</p>
          </div>

          <Row className="g-5">
            <Col lg={6} className="space-y-6">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-2xl font-semibold text-slate-900 mb-2">Visi Kami</h2>
                <p className="text-slate-600">
                  Perum Perumnas Proyek Sumatera Selatan memiliki visi yaitu “Menjadi Pengembang Permukiman dan Perumahan Rakyat Terpercaya di Indonesia.”
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-2xl font-semibold text-slate-900 mb-3">Misi Kami</h2>
                <ul className="space-y-2 text-slate-600">
                  <li>Pengembang terpercaya, mengembangkan perumahan dan permukiman yang bernilai tambah untuk kepuasan pelanggan.</li>
                  <li>Professional, meningkatkan profesionalitas, pemberdayaan dan kesejahteraan karyawan.</li>
                  <li>Bernilai maksimal, memaksimalkan nilai bagi pemegang saham dan pemangku kepentingan lain.</li>
                  <li>Sinergi, mengoptimalkan sinergi dengan mitra kerja, pemerintah, BUMN dan instansi lain.</li>
                  <li>Berkontribusi, meningkatkan kontribusi positif kepada masyarakat dan lingkungan.</li>
                </ul>
              </div>
            </Col>

            <Col lg={6} className="space-y-6">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-2xl font-semibold text-slate-900 mb-3">Mengapa Samesta Living?</h2>
                <div className="space-y-3">
                  {[{ icon: '🏢', title: 'Lokasi Strategis', desc: 'Dekat dengan pusat bisnis, transportasi umum, dan fasilitas publik' },
                    { icon: '🔒', title: 'Keamanan 24/7', desc: 'Sistem keamanan terintegrasi dengan CCTV dan One Gate System' },
                    { icon: '✨', title: 'Fasilitas Lengkap', desc: 'Swimming pool, jogging track, minimarket, dan banyak lagi' },
                    { icon: '💼', title: 'Didukung BUMN', desc: 'Kerjasama dengan Pertamina untuk kualitas terjamin' }].map((item) => (
                      <div key={item.title} className="flex gap-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                        <span className="text-2xl" aria-hidden="true">{item.icon}</span>
                        <div>
                          <h4 className="text-lg font-semibold text-slate-900">{item.title}</h4>
                          <p className="text-sm text-slate-600">{item.desc}</p>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </Col>
          </Row>

          <Row className="mt-6">
            <Col>
              <div className="grid grid-cols-2 gap-4 rounded-2xl bg-slate-900 p-6 text-white md:grid-cols-4">
                {[{ label: 'Unit Apartemen', value: '300+' }, { label: 'Fasilitas Premium', value: '7' }, { label: 'Keamanan & Pelayanan', value: '24/7' }, { label: 'Kepuasan Penghuni', value: '98%' }].map((stat) => (
                  <div key={stat.label} className="text-center">
                    <h3 className="text-2xl font-bold">{stat.value}</h3>
                    <p className="text-sm text-slate-200">{stat.label}</p>
                  </div>
                ))}
              </div>
            </Col>
          </Row>
        </Container>
      </div>
    </>
  )
}

export default AboutUs
