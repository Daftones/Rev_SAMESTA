import { Card, Col, Spinner } from 'react-bootstrap'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend
} from 'chart.js'
import { Bar } from 'react-chartjs-2'

// Register Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend
)

function SalesChart({
  title = '',
  subtitle = '',
  salesSeries = [],
  loadingPayments = false
}) {
  // Format Rupiah
  const formatIDR = (value) =>
    new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(value)

  const chartData = {
    labels: salesSeries.map(m => m.label),
    datasets: [
      {
        label: title,
        data: salesSeries.map(m => m.total),
        backgroundColor: '#0f172a',
        borderRadius: 8,
        maxBarThickness: 48
      }
    ]
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          title: (items) => `Bulan ${items[0].label}`,
          label: (ctx) => formatIDR(ctx.raw)
        }
      }
    },
    scales: {
      x: { grid: { display: false } },
      y: {
        ticks: {
          callback: (value) =>
            new Intl.NumberFormat('id-ID', { notation: 'compact' }).format(value)
        }
      }
    }
  }

  return (
    <Card className="h-100 rounded-2xl border border-slate-200 bg-white shadow-sm">
      <Card.Body className="d-flex flex-column">
        {/* Header */}
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
          <div>
            <h5 className="fw-bold mb-0">{title}</h5>
            <div className="text-muted small">{subtitle}</div>
          </div>

          {loadingPayments && (
            <div className="d-flex align-items-center gap-2 text-muted small">
              <Spinner animation="border" size="sm" />
              Memuat transaksi...
            </div>
          )}
        </div>

        {/* Chart */}
        <div className="flex-grow-1" style={{ minHeight: 260 }}>
          <Bar data={chartData} options={chartOptions} />
        </div>
      </Card.Body>
    </Card>
  )
}

export default SalesChart
