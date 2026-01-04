import { useEffect, useState } from 'react'
import { Container, Button, Spinner } from 'react-bootstrap'
import { unitTypesAPI } from '../services/api'
import logo from '../assets/samesta logo.png?url'

function ApartmentFilter({ onSearch }) {
  const [preference, setPreference] = useState('sewa') // sewa or beli
  const [roomType, setRoomType] = useState('studio') // studio or twoBed
  const [floor, setFloor] = useState('semua') // semua, lantai tertentu
  const [floors, setFloors] = useState([])
  const [loadingFloors, setLoadingFloors] = useState(false)

  useEffect(() => {
    const loadFloors = async () => {
      setLoadingFloors(true)
      try {
        const res = await unitTypesAPI.getAll()
        const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : []
        const nums = list
          .map((item) => Number(item.floor))
          .filter((n) => Number.isFinite(n))
        const unique = Array.from(new Set(nums)).sort((a, b) => a - b)
        setFloors(unique)
      } catch (err) {
        console.error('Failed to load floors', err)
        setFloors([])
      } finally {
        setLoadingFloors(false)
      }
    }

    loadFloors()
  }, [])

  const handleSearch = () => {
    onSearch({ preference, roomType, floor })
  }

  const toggleClass = (isActive) =>
    isActive
      ? 'bg-slate-900 text-white shadow-md border-slate-900'
      : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'

  const roomCardClass = (isActive) =>
    `w-full rounded-2xl border p-4 shadow-sm transition hover:-translate-y-1 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-slate-300 ${
      isActive
        ? 'border-slate-900 bg-slate-900 text-white shadow-lg'
        : 'border-slate-200 bg-white/70 text-slate-900'
    }`

  return (
    <div className="bg-gradient-to-b from-slate-50 to-white py-12">
      <Container className="max-w-3xl">
        <div className="flex flex-col items-center gap-6">
          <img src={logo} alt="Samesta Logo" className="h-24 w-auto" />

          <h2 className="text-2xl md:text-3xl font-bold text-slate-900">Temukan Preferensimu</h2>

          <div className="flex flex-wrap items-center justify-center gap-3">
            {['sewa', 'beli'].map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={preference === option}
                className={`rounded-full px-6 py-3 text-lg font-semibold border transition ${toggleClass(preference === option)}`}
                onClick={() => setPreference(option)}
              >
                {option === 'sewa' ? 'Sewa' : 'Beli'}
              </button>
            ))}
          </div>

          <div className="grid w-full gap-4 md:grid-cols-2">
            <button
              type="button"
              aria-pressed={roomType === 'studio'}
              className={roomCardClass(roomType === 'studio')}
              onClick={() => setRoomType('studio')}
            >
              <div className="flex items-center gap-3">
                <div className={`h-12 w-12 rounded-lg ${roomType === 'studio' ? 'bg-white/20 border border-white/40' : 'bg-slate-900/10'}`} />
                <div className={`text-lg font-semibold ${roomType === 'studio' ? 'text-white' : 'text-slate-900'}`}>Studio</div>
              </div>
              <p className="mt-2 text-sm text-slate-600">Unit ringkas untuk efisiensi ruang.</p>
            </button>

            <button
              type="button"
              aria-pressed={roomType === 'twoBed'}
              className={roomCardClass(roomType === 'twoBed')}
              onClick={() => setRoomType('twoBed')}
            >
              <div className="flex items-center gap-3">
                <div className={`flex h-12 w-12 items-center justify-center gap-1 rounded-lg ${roomType === 'twoBed' ? 'bg-white/20 border border-white/40' : 'bg-slate-900/10'}`}>
                  <span className={`h-8 w-3 rounded-sm ${roomType === 'twoBed' ? 'bg-white/70' : 'bg-slate-900/60'}`} />
                  <span className={`h-8 w-3 rounded-sm ${roomType === 'twoBed' ? 'bg-white/50' : 'bg-slate-900/40'}`} />
                </div>
                <div className={`text-lg font-semibold ${roomType === 'twoBed' ? 'text-white' : 'text-slate-900'}`}>Two Bedroom</div>
              </div>
              <p className="mt-2 text-sm text-slate-600">Lebih lega untuk keluarga kecil.</p>
            </button>
          </div>

          <div className="w-full rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-2 text-sm font-semibold text-slate-700">Pilih Lantai</div>
            <select
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-800 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200"
              value={floor}
              onChange={(e) => setFloor(e.target.value)}
            >
              <option value="semua">Semua Lantai</option>
              {floors.map((f) => (
                <option key={f} value={String(f)}>Lantai {f}</option>
              ))}
            </select>
            {loadingFloors && (
              <div className="mt-2 text-sm text-slate-500 flex items-center gap-2">
                <Spinner animation="border" size="sm" /> Memuat lantai...
              </div>
            )}
          </div>

          <Button
            variant="dark"
            className="mt-2 w-full rounded-full px-6 py-3 text-lg font-semibold shadow-md hover:-translate-y-0.5 transition"
            onClick={handleSearch}
          >
            Cari Unit
          </Button>
        </div>
      </Container>
    </div>
  )
}

export default ApartmentFilter
