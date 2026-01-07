export const normalizeUnitTypeKey = (input) => {
  const raw = String(input || '').trim().toLowerCase()
  if (!raw) return null

  // Allow direct keys
  if (raw === 'studio') return 'studio'
  if (raw === 'twobed' || raw === 'two_bed' || raw === '2bed' || raw === '2bedroom' || raw === 'two-bedroom') return 'twoBed'

  // Infer from names
  if (raw.includes('studio')) return 'studio'
  if (raw.includes('2') && raw.includes('bed')) return 'twoBed'
  if (raw.includes('two') && raw.includes('bed')) return 'twoBed'
  if (raw.includes('2 bedroom')) return 'twoBed'

  return null
}

export const UNIT_NUMBERING_RULES = {
  studio: { startOffset: 1, endOffset: 26, label: 'Studio' },
  twoBed: { startOffset: 27, endOffset: 49, label: '2 Bedroom' },
}

export const getUnitNumberForFloor = (floor, typeKey, indexWithinType) => {
  const f = Number(floor)
  if (!Number.isFinite(f) || f <= 0) return null
  const key = normalizeUnitTypeKey(typeKey)
  if (!key) return null
  const rule = UNIT_NUMBERING_RULES[key]
  if (!rule) return null

  const idx = Number(indexWithinType)
  if (!Number.isFinite(idx) || idx < 0) return null

  const offset = rule.startOffset + idx
  if (offset < rule.startOffset || offset > rule.endOffset) return null
  return f * 100 + offset
}

// Build a stable id->unitNumber map for the "unit list" used in Apartment List/Detail.
// Assumes each item has at least { id, floor, name } where name indicates Studio/2BR.
export const buildUnitNumberMap = (items, options = {}) => {
  const list = Array.isArray(items) ? items : []
  const getId = options.getId || ((x) => x?.unit_type_id ?? x?.id ?? x?.uuid)
  const getFloor = options.getFloor || ((x) => x?.floor)
  const getName = options.getName || ((x) => x?.name || x?.title || '')

  const normalized = list
    .map((item) => {
      const id = String(getId(item) ?? '').trim()
      const floor = Number(getFloor(item))
      const name = String(getName(item) ?? '')
      const typeKey = normalizeUnitTypeKey(name)
      return {
        raw: item,
        id,
        floor: Number.isFinite(floor) ? floor : null,
        typeKey,
      }
    })
    .filter((x) => x.id && Number.isFinite(Number(x.floor)) && x.typeKey)

  // Group by floor + type, then assign deterministic order by id.
  const groups = new Map()
  normalized.forEach((x) => {
    const key = `${x.floor}|${x.typeKey}`
    const arr = groups.get(key) || []
    arr.push(x)
    groups.set(key, arr)
  })

  const result = {}
  groups.forEach((arr, key) => {
    const [floorStr, typeKey] = String(key).split('|')
    const floor = Number(floorStr)
    arr
      .slice()
      .sort((a, b) => String(a.id).localeCompare(String(b.id), 'en', { numeric: true }))
      .forEach((item, idx) => {
        const unitNumber = getUnitNumberForFloor(floor, typeKey, idx)
        if (unitNumber) result[item.id] = unitNumber
      })
  })

  return result
}

export const formatUnitNumber = (value) => {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return '-'
  return String(Math.trunc(numeric))
}
