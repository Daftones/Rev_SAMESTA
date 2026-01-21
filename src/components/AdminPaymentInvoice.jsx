import { Badge } from 'react-bootstrap'

function AdminPaymentInvoice({ payment }) {
  const formatDate = (value) => {
    if (!value) return '-'
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return '-'
    return d.toLocaleString('id-ID', {
      dateStyle: 'medium',
      timeStyle: 'short'
    })
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number.isNaN(value) ? 0 : value)
  }

  const normalizeBase64Image = (value) => {
    if (!value || typeof value !== 'string') return null
    if (value.startsWith('data:image')) return value
    const idx = value.indexOf('data:image')
    if (idx !== -1) return value.slice(idx)
    return `data:image/jpeg;base64,${value}`
  }

  return (
    <div className="container py-4">
      <div className="text-center mb-4">
        <h3 className="fw-bold">INVOICE PEMBAYARAN</h3>
        <div className="text-muted">Payment ID: {payment.id}</div>
      </div>

      <table className="table table-bordered">
        <tbody>
          <tr>
            <th style={{ width: '30%' }}>Nama Lengkap</th>
            <td>{payment.user.name || '-'}</td>
          </tr>
          <tr>
            <th style={{ width: '30%' }}>Tipe Unit</th>
            <td>{payment.inquiry.unit.unit_type.name || '-'}</td>
          </tr>
          <tr>
            <th style={{ width: '30%' }}>Unit</th>
            <td>{payment.inquiry.unit.unit_type.unit_number || '-'}</td>
          </tr>
          <tr>
            <th style={{ width: '30%' }}>Tipe Pembelian</th>
            <td>
              {payment.inquiry.purchase_type === 'sale'
                ? 'Beli'
                : payment.inquiry.purchase_type === 'rent'
                ? 'Sewa'
                : '-'}
            </td>
          </tr>
          {payment.inquiry.purchase_type === 'rent' && (
            <tr>
              <th style={{ width: '30%' }}>Durasi Sewa</th>
              <td>{payment.duration} bulan</td>
            </tr>
          )}
          <tr>
            <th>Jumlah</th>
            <td className="text-uppercase">{formatCurrency(payment.totalPrice)}</td>
          </tr>
          <tr>
            <th>Metode Pembayaran</th>
            <td>
              {payment.method === 'cash'
                ? 'Tunai'
                : payment.method === 'transfer'
                ? 'Transfer'
                : '-'}
            </td>
          </tr>
          <tr>
            <th>Status</th>
            <td>
              <Badge bg="secondary" className="text-uppercase">
                {payment.status}
              </Badge>
            </td>
          </tr>
          <tr>
            <th>Bukti Pembayaran</th>
            <td>
              <div className="d-flex flex-column gap-3">
                {payment.proof.map((src, idx) => {
                const imgSrc = normalizeBase64Image(src)
                  if (!imgSrc) {
                    return (
                      <div key={idx} className="alert alert-warning mb-0">
                        Bukti Pembayaran Kosong
                      </div>
                    )
                  }

                  return (
                    <img
                      key={idx}
                      src={imgSrc}
                      alt={`Bukti pembayaran ${idx + 1}`}
                      className="img-fluid rounded shadow"
                      style={{
                        maxHeight: '18rem',
                        width: '100%',
                        objectFit: 'contain',
                      }}
                      loading="lazy"
                    />
                  )
                })}
              </div>
            </td>
          </tr>
          <tr>
            <th>Tanggal Dibuat</th>
            <td>{formatDate(payment.createdAt)}</td>
          </tr>
        </tbody>
      </table>

      <div className="mt-4 text-end">
        <div className="fw-semibold">Admin</div>
        <div className="text-muted small">Dicetak otomatis oleh sistem</div>
      </div>
    </div>
  )
}

export default AdminPaymentInvoice
