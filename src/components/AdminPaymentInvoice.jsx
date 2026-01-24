import { Badge } from 'react-bootstrap'
import samestaLogo from '../assets/samesta logo.png' 

function AdminPaymentInvoice({ payment }) {
  const formatDate = (value) => {
    if (!value) return '-'
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return '-'
    return d.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    })
  }

  const formatCurrency = (value) =>
    new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(value || 0)

  const isRent = payment.inquiry.purchase_type === 'rent'

  const duration = payment.duration || 0
  const depositPerMonth = 1_000_000

  let rentPrice = 0
  let deposit = 0
  let plafond = 0
  let tax = 0
  let total = payment.totalPrice

  if (isRent) {
    // SEWA
    deposit = duration * depositPerMonth
    rentPrice = payment.totalPrice - deposit
  } else {
    // BELI
    plafond = payment.totalPrice / 1.12
    tax = payment.totalPrice - plafond
  }

  return (
    <div
      style={{
        width: '100%',
        minHeight: '100vh',
        transform: 'rotate(0deg)',
      }}
    >
      {/* ===== LANDSCAPE CONTAINER ===== */}
      <div
        className="container invoice-classic"
        style={{
          position: 'relative',
          overflow: 'hidden',
          minHeight: '100vh',
          maxWidth: '100%',
          padding: '2rem 3rem',
        }}
      >
        {/* ===== PRINT LANDSCAPE HACK ===== */}
        <style>
          {`
            @media print {
              @page {
                size: A4 landscape;
                margin: 20mm;
              }
            }
          `}
        </style>

        {/* ===== WATERMARK (CENTER LANDSCAPE) ===== */}
        <img
          src={samestaLogo}
          alt="Company Watermark"
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%) rotate(0deg)',
            width: '520px', // lebih besar utk landscape
            opacity: 0.06,
            pointerEvents: 'none',
            userSelect: 'none',
            zIndex: 0,
          }}
        />

        {/* ===== CONTENT ===== */}
        <div style={{ position: 'relative', zIndex: 1 }}>

          {/* ===== HEADER ===== */}
          <div className="row mb-4">
            <div className="col-4 small">
              <strong>APARTEMEN SAMESTA JAKABARING</strong><br />
              Jl. Sapta Pesona, Kec. Seberang Ulu I Palembang<br />
              Telp: (+62) 853-6650-3363
            </div>

            <div className="col-4 text-center">
              <h3 className="fw-bold mb-0">INVOICE</h3>
            </div>

            <div className="col-4 small">
              <table className="table table-borderless table-sm mb-0">
                <tbody>
                  <tr>
                    <td>ID</td>
                    <td>: {payment.id}</td>
                  </tr>
                  <tr>
                    <td>Date</td>
                    <td>: {formatDate(payment.createdAt)}</td>
                  </tr>
                  <tr>
                    <td>Payment</td>
                    <td>: {payment.method === 'cash' ? 'Cash' : 'Transfer'}</td>
                  </tr>
                  <tr>
                    <td>Status</td>
                    <td>: <Badge bg="secondary">{payment.status}</Badge></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* ===== CUSTOMER ===== */}
          <div className="row mb-3 small">
            <div className="col-6">
              <strong>Customer:</strong><br />
              {payment.user?.name || '-'}<br />
              Unit: {payment.inquiry?.unit?.unit_type?.name} –{' '}
              {payment.inquiry?.unit?.unit_type?.unit_number}
            </div>
          </div>

          {/* ===== TABLE ITEM ===== */}
          <table className="table table-bordered small">
            <thead className="text-center">
              <tr>
                <th style={{ width: '5%' }}>No</th>
                <th>Description</th>
                <th style={{ width: '10%' }}>Qty</th>
                <th style={{ width: '15%' }}>Unit Price</th>
                <th style={{ width: '15%' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="text-center">1</td>
                <td>
                  {payment.inquiry?.purchase_type === 'sale'
                    ? 'Pembelian Unit'
                    : 'Sewa Unit'}
                  {payment.inquiry?.purchase_type === 'rent' &&
                    ` (${payment.duration} Bulan)`}
                </td>
                <td className="text-center">1</td>
                <td className="text-end">
                  {formatCurrency(payment.totalPrice)}
                </td>
                <td className="text-end">
                  {formatCurrency(payment.totalPrice)}
                </td>
              </tr>
            </tbody>
          </table>

          {/* ===== FOOTER ===== */}
          <div className="row mt-4 small">
            <div className="col-7">
              <strong>Transfer via:</strong><br />
              Bank Sumsel Babel – IDR<br />
              A/C: 20332000001<br />
              A/N: PERUM PERUMNAS (Rek. Proyek)
            </div>

            <div className="col-5">
              <table className="table table-borderless table-sm">
                <tbody>
                  {isRent ? (
                    <>
                      <tr>
                        <td>Rent Price</td>
                        <td className="text-end">
                          {formatCurrency(rentPrice)}
                        </td>
                      </tr>

                      <tr>
                        <td>Deposito ({duration} bulan)</td>
                        <td className="text-end">
                          {formatCurrency(deposit)}
                        </td>
                      </tr>
                    </>
                  ) : (
                    <>
                      <tr>
                        <td>Base Price</td>
                        <td className="text-end">
                          {formatCurrency(plafond)}
                        </td>
                      </tr>

                      <tr>
                        <td>Tax (12%)</td>
                        <td className="text-end">
                          {formatCurrency(tax)}
                        </td>
                      </tr>
                    </>
                  )}

                  <tr className="fw-bold border-top">
                    <td>Total</td>
                    <td className="text-end">
                      {formatCurrency(total)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="text-center mt-5 small text-muted">
            Pembayaran dianggap lunas setelah dana diterima.
          </div>

        </div>
      </div>
    </div>
  )
}

export default AdminPaymentInvoice
