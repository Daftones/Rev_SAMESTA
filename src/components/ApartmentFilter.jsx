import { useEffect, useState } from 'react'
import { Container, Button, Spinner } from 'react-bootstrap'
import { unitTypesAPI } from '../services/api'
import logo from '../assets/samesta logo.png?url'

function ApartmentFilter({ onSearch }) {
  const [preference, setPreference] = useState('sewa')
  const [roomType, setRoomType] = useState('studio')
  const [floor, setFloor] = useState('semua')
  const [floors, setFloors] = useState([])
  const [loadingFloors, setLoadingFloors] = useState(false)
  const [furnishType, setFurnishType] = useState('')

  /* ================= LOAD FLOORS ================= */
  useEffect(() => {
  const loadFloors = async () => {
    setLoadingFloors(true)
    try {
      const res = await unitTypesAPI.getAll()

      // CASE 1: API mengembalikan ARRAY
      const data = Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res)
        ? res
        : [res?.data].filter(Boolean)

      const uniqueFloors = [
        ...new Set(
          data
            .map(item => Number(item.floor))
            .filter(Number.isFinite)
        ),
      ].sort((a, b) => a - b)

      setFloors(uniqueFloors)
    } catch (err) {
      console.error('Failed to load floors:', err)
      setFloors([])
    } finally {
      setLoadingFloors(false)
    }
  }

  loadFloors()
}, [])

  /* ================= RESET FURNISH ================= */
  useEffect(() => {
    if (preference === 'beli') {
      setFurnishType('full-furnish')
    } else {
      setFurnishType('')
    }
  }, [preference, roomType])

  /* ================= OPTIONS ================= */
  const furnishOptions = () => {
    if (preference === 'beli') return []

    if (roomType === 'studio') {
      return [
        { value: 'non-furnish', label: 'Non-Furnish' },
        { value: 'furnish-kipas', label: 'Furnish + Kipas' },
        { value: 'furnish-ac', label: 'Furnish + AC' },
      ]
    }

    return [
      { value: 'non-furnish', label: 'Non-Furnish' },
      { value: 'furnish-ac', label: 'Furnish + AC' },
    ]
  }

  const handleSearch = () => {
    onSearch({
      preference,
      roomType,
      floor,
      furnishType: preference === 'beli' ? 'full-furnish' : furnishType,
    })
  }

  /* ================= UI ================= */
  const pill = (active) =>
    `px-6 py-2 rounded-full text-sm font-medium transition border
     ${active
      ? 'bg-slate-900 text-white border-slate-900'
      : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
     }`

  const card = (active) =>
    `rounded-xl border p-5 transition
     ${active
      ? 'border-slate-900 bg-slate-900 text-white shadow-md'
      : 'border-slate-200 bg-white hover:shadow-sm'
     }`

  const select =
    'w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-200'

  return (
    <section className="bg-gradient-to-b from-slate-50 to-white py-14">
      <Container className="max-w-2xl">
        <div className="flex flex-col items-center gap-8">

          {/* Logo */}
          <img src={logo} alt="Samesta" className="h-20 opacity-90" />

          {/* Title */}
          <div className="text-center">
            <h2 className="text-2xl font-semibold text-slate-900">
              Temukan Unit Idealmu
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Sesuaikan preferensi hunian sesuai kebutuhan
            </p>
          </div>

          {/* Preference */}
          <div className="flex gap-3">
            <button className={pill(preference === 'sewa')} onClick={() => setPreference('sewa')}>
              Sewa
            </button>
            <button className={pill(preference === 'beli')} onClick={() => setPreference('beli')}>
              Beli
            </button>
          </div>

          {/* Room Type */}
          <div className="grid w-full gap-4 md:grid-cols-2">
            <button className={card(roomType === 'studio')} onClick={() => setRoomType('studio')}>
              <div className="text-base font-semibold">Studio</div>
              <p className={`mt-1 text-sm ${roomType === 'studio' ? 'text-white/70' : 'text-slate-500'}`}>
                Ringkas & efisien
              </p>
            </button>

            <button className={card(roomType === 'twoBed')} onClick={() => setRoomType('twoBed')}>
              <div className="text-base font-semibold">2 Bedroom</div>
              <p className={`mt-1 text-sm ${roomType === 'twoBed' ? 'text-white/70' : 'text-slate-500'}`}>
                Lebih lega & nyaman
              </p>
            </button>
          </div>

          {/* Filters */}
          <div className="grid w-full gap-4">

            {/* Floor */}
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Lantai
              </label>
              <select className={select} value={floor} onChange={e => setFloor(e.target.value)}>
                <option value="semua">Semua Lantai</option>
                {floors.map(f => (
                  <option key={f} value={f}>Lantai {f}</option>
                ))}
              </select>
              {loadingFloors && (
                <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
                  <Spinner size="sm" /> Memuat lantai
                </div>
              )}
            </div>

            {/* Furnish */}
            {preference === 'sewa' && (
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  Tipe Furnish
                </label>
                <select
                  className={select}
                  value={furnishType}
                  onChange={e => setFurnishType(e.target.value)}
                >
                  <option value="">Semua Tipe</option>
                  {furnishOptions().map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            )}

            {preference === 'beli' && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-center text-xs text-slate-600">
                Unit beli termasuk <strong>Full-Furnish</strong>
              </div>
            )}
          </div>

          {/* CTA */}
          <Button
            variant="dark"
            className="w-full rounded-full py-2.5 text-sm font-semibold tracking-wide shadow-sm"
            onClick={handleSearch}
          >
            Cari Unit
          </Button>
        </div>
      </Container>
    </section>
  )
}

export default ApartmentFilter
