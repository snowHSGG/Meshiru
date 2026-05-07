import { searchHotpepper } from './hotpepper'

const API_KEY = import.meta.env.VITE_GOOGLE_PLACES_API_KEY

// HotPepper budget codes (B001-B013) → yen range
const HP_CODE_MAX = {
  B001: 500, B002: 1000, B003: 1500, B004: 2000, B005: 3000,
  B006: 4000, B007: 5000, B008: 8000, B009: 10000,
  B010: 15000, B011: 20000, B012: 30000, B013: Infinity,
}
const HP_CODE_MIN = {
  B001: 0, B002: 501, B003: 1001, B004: 1501, B005: 2001,
  B006: 3001, B007: 4001, B008: 5001, B009: 8001,
  B010: 10001, B011: 15001, B012: 20001, B013: 30001,
}

// Google price level → yen range
const GOOGLE_LEVEL_RANGE = {
  PRICE_LEVEL_INEXPENSIVE: [0, 1000],
  PRICE_LEVEL_MODERATE:    [1001, 3000],
  PRICE_LEVEL_EXPENSIVE:   [3001, 6000],
  PRICE_LEVEL_VERY_EXPENSIVE: [6001, Infinity],
}

function rangesOverlap(lo1, hi1, lo2, hi2) {
  return lo1 <= hi2 && lo2 <= hi1
}

function rangeToPriceLevels(min, max) {
  const lo = min !== '' && min != null ? Number(min) : 0
  const hi = max !== '' && max != null ? Number(max) : Infinity
  if (lo === 0 && hi === Infinity) return null
  return Object.entries(GOOGLE_LEVEL_RANGE)
    .filter(([, [glo, ghi]]) => rangesOverlap(lo, hi, glo, ghi))
    .map(([level]) => level)
}

export async function searchRestaurants({ genre, preferences, scene, budgetMin, budgetMax, partySize, mealTime, visitDate, visitTime, locMode, area, excludes, radius }) {
  const query = buildQuery({ genre, preferences, scene, mealTime })
  const priceLevels = rangeToPriceLevels(budgetMin, budgetMax)
  const center = await resolveCenter({ locMode, area })
  const searchRadius = radius ?? 1000

  const [googleResults, hotpepperResults] = await Promise.all([
    fetchGoogle({ query, priceLevels, center, radius: searchRadius }),
    searchHotpepper({ lat: center.lat, lng: center.lng, keyword: query, mealTime, radius: searchRadius }).catch(() => []),
  ])

  return mergeResults(googleResults, hotpepperResults, budgetMin, budgetMax, partySize, visitDate, visitTime, excludes)
}

function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000
  const toRad = (d) => d * Math.PI / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function offsetCenter(center, distanceM, bearingDeg) {
  const R = 6371000
  const lat1 = center.lat * Math.PI / 180
  const lng1 = center.lng * Math.PI / 180
  const bearing = bearingDeg * Math.PI / 180
  const d = distanceM / R
  const lat2 = Math.asin(Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(bearing))
  const lng2 = lng1 + Math.atan2(Math.sin(bearing) * Math.sin(d) * Math.cos(lat1), Math.cos(d) - Math.sin(lat1) * Math.sin(lat2))
  return { lat: lat2 * 180 / Math.PI, lng: lng2 * 180 / Math.PI }
}

const FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.rating',
  'places.userRatingCount',
  'places.formattedAddress',
  'places.priceLevel',
  'places.editorialSummary',
  'places.primaryTypeDisplayName',
  'places.location',
  'places.websiteUri',
  'places.googleMapsUri',
  'places.photos',
  'places.servesDinner',
  'places.servesLunch',
  'places.regularOpeningHours',
].join(',')

async function callGoogleAPI({ query, priceLevels, center, biasRadius }) {
  const body = {
    textQuery: `${query || '飲食店'}`,
    languageCode: 'ja',
    maxResultCount: 20,
    includedType: 'restaurant',
    locationBias: {
      circle: {
        center: { latitude: center.lat, longitude: center.lng },
        radius: biasRadius,
      },
    },
    ...(priceLevels?.length ? { priceLevels } : {}),
  }
  const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': API_KEY, 'X-Goog-FieldMask': FIELD_MASK },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  return data.places ?? []
}

function filterByRadius(places, center, maxRadius) {
  return places.filter((p) => {
    if (p.servesDinner === false && p.servesLunch === false) return false
    if (p.location) {
      const dist = haversineDistance(center.lat, center.lng, p.location.latitude, p.location.longitude)
      if (dist > maxRadius) return false
    }
    return true
  })
}

async function fetchGoogle({ query, priceLevels, center, radius }) {
  const biasRadius = Math.max(radius * 2, 2000)
  const places = await callGoogleAPI({ query, priceLevels, center, biasRadius })
  const filtered = filterByRadius(places, center, radius)
  if (filtered.length >= 3) return filtered

  const offsetDist = radius * 0.5
  const offsetPlaces = (await Promise.all(
    [0, 90, 180, 270].map((bearing) =>
      callGoogleAPI({ query, priceLevels, center: offsetCenter(center, offsetDist, bearing), biasRadius })
    )
  )).flat()

  const seen = new Set(places.map((p) => p.id).filter(Boolean))
  const newPlaces = offsetPlaces.filter((p) => {
    if (!p.id || seen.has(p.id)) return false
    seen.add(p.id)
    return true
  })

  return filterByRadius([...places, ...newPlaces], center, radius)
}

function isOpenAt(periods, dateStr, timeStr) {
  if (!periods?.length) return true
  if (!dateStr && !timeStr) return true

  const dayOfWeek = dateStr ? new Date(dateStr).getDay() : null
  const checkMin = timeStr ? timeStr.split(':').map(Number).reduce((h, m) => h * 60 + m) : null

  return periods.some((p) => {
    const oDay = p.open.day
    const oMin = p.open.hour * 60 + p.open.minute
    const cDay = p.close?.day ?? oDay
    const cMin = p.close ? p.close.hour * 60 + p.close.minute : 24 * 60
    const overnight = oDay !== cDay

    // 曜日チェック
    if (dayOfWeek !== null) {
      if (!overnight && oDay !== dayOfWeek) return false
      if (overnight && dayOfWeek !== oDay && dayOfWeek !== cDay) return false
    }

    // 時間チェックなし → 曜日だけ一致すればOK
    if (checkMin === null) return true

    if (!overnight) {
      return (dayOfWeek === null || dayOfWeek === oDay) && checkMin >= oMin && checkMin < cMin
    } else {
      if (dayOfWeek === oDay) return checkMin >= oMin
      if (dayOfWeek === cDay) return checkMin < cMin
      // 時間のみ指定の場合、深夜営業の時間帯と照合
      if (dayOfWeek === null) return checkMin >= oMin || checkMin < cMin
      return false
    }
  })
}

function findMatch(shops, name, lat, lng) {
  return shops.find((s) => {
    const sameName = s.name.includes(name.slice(0, 4)) || name.includes(s.name.slice(0, 4))
    const nearby = lat && lng
      ? Math.abs(s.lat - lat) < 0.001 && Math.abs(s.lng - lng) < 0.001
      : false
    return sameName && nearby
  })
}

function mergeResults(googlePlaces, hotpepperShops, budgetMin, budgetMax, partySize, visitDate, visitTime, excludes) {
  const lo = budgetMin !== '' && budgetMin != null ? Number(budgetMin) : 0
  const hi = budgetMax !== '' && budgetMax != null ? Number(budgetMax) : Infinity
  const hasRange = lo > 0 || hi < Infinity
  const excludeTerms = (excludes ?? []).map((t) => t.toLowerCase())

  const merged = googlePlaces.map((place) => {
    const name = place.displayName?.text ?? ''
    const lat = place.location?.latitude
    const lng = place.location?.longitude

    if (!isOpenAt(place.regularOpeningHours?.periods, visitDate, visitTime)) return null

    if (excludeTerms.length > 0) {
      const typeText = (place.primaryTypeDisplayName?.text ?? '').toLowerCase()
      const nameText = name.toLowerCase()
      if (excludeTerms.some((t) => typeText.includes(t) || nameText.includes(t))) return null
    }

    const matched = findMatch(hotpepperShops, name, lat, lng)

    if (matched && hasRange && matched.budgetCode) {
      const codeMin = HP_CODE_MIN[matched.budgetCode] ?? 0
      const codeMax = HP_CODE_MAX[matched.budgetCode] ?? Infinity
      if (!rangesOverlap(lo, hi, codeMin, codeMax)) return null
    }

    if (!matched && hasRange && place.priceLevel) {
      const [glo, ghi] = GOOGLE_LEVEL_RANGE[place.priceLevel] ?? [0, Infinity]
      if (!rangesOverlap(lo, hi, glo, ghi)) return null
    }

    if (matched && partySize && matched.capacity !== null && matched.capacity < Number(partySize)) {
      return null
    }

    return {
      ...place,
      hotpepperUrl: matched?.reserveUrl ?? null,
      hotpepperCatch: matched?.catch ?? null,
      hotpepperBudget: matched?.budget ?? null,
      priceVerified: !!matched,
    }
  }).filter(Boolean)

  const bayesian = (r, n) => (100 * 4.0 + n * r) / (100 + n)
  return merged
    .sort((a, b) => bayesian(b.rating, b.userRatingCount ?? 0) - bayesian(a.rating, a.userRatingCount ?? 0))
    .slice(0, 3)
}

async function resolveCenter({ locMode, area }) {
  if (locMode === 'current') {
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => resolve({ lat: 35.6762, lng: 139.6503 })
      )
    })
  }
  if (area) return { lat: area.lat, lng: area.lng }
  return { lat: 35.6762, lng: 139.6503 }
}

export async function fetchAutocompleteSuggestions(input) {
  const res = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': API_KEY },
    body: JSON.stringify({ input, languageCode: 'ja', regionCode: 'JP' }),
  })
  const data = await res.json()
  return (data.suggestions ?? [])
    .filter((s) => s.placePrediction)
    .map((s) => ({
      placeId: s.placePrediction.placeId,
      mainText: s.placePrediction.structuredFormat?.mainText?.text ?? s.placePrediction.text?.text ?? '',
      secondaryText: s.placePrediction.structuredFormat?.secondaryText?.text ?? '',
    }))
}

export async function fetchPlaceLocation(placeId) {
  const res = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
    headers: { 'X-Goog-Api-Key': API_KEY, 'X-Goog-FieldMask': 'location' },
  })
  const data = await res.json()
  return data.location ?? null
}

export async function geocodeArea(text) {
  const params = new URLSearchParams({ address: text, language: 'ja', region: 'jp', key: API_KEY })
  const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?${params}`)
  const data = await res.json()
  if (data.status !== 'OK' || !data.results?.[0]) return null
  const { lat, lng } = data.results[0].geometry.location
  return { label: text, lat, lng }
}

export function getPhotoUrl(photoName) {
  return `https://places.googleapis.com/v1/${photoName}/media?maxHeightPx=400&maxWidthPx=800&key=${API_KEY}`
}

function buildQuery({ genre, preferences, scene, mealTime }) {
  const parts = []
  if (genre) parts.push(genre)
  if (mealTime) parts.push(mealTime)
  if (scene) parts.push(scene)
  if (preferences?.includes('コスパ重視')) parts.push('コスパ')
  if (preferences?.includes('個室あり')) parts.push('個室')
  return parts.join(' ')
}
