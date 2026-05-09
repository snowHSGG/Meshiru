import { searchHotpepper } from './hotpepper'

const API_KEY = import.meta.env.VITE_GOOGLE_PLACES_API_KEY


const GENRE_TO_TYPE = {
  '居酒屋': 'izakaya_restaurant',
  'ラーメン': 'ramen_restaurant',
  '寿司': 'sushi_restaurant',
  '中華': 'chinese_restaurant',
  'イタリアン': 'italian_restaurant',
  'フレンチ': 'french_restaurant',
  '焼肉': 'barbecue_restaurant',
}

const LEVEL_TO_HP_CODES = {
  PRICE_LEVEL_INEXPENSIVE: ['B001', 'B002'],
  PRICE_LEVEL_MODERATE:    ['B003', 'B004', 'B005'],
  PRICE_LEVEL_EXPENSIVE:   ['B006', 'B007', 'B008', 'B009', 'B010', 'B011', 'B012', 'B013'],
}

const GOOGLE_EXPENSIVE_LEVELS = ['PRICE_LEVEL_EXPENSIVE', 'PRICE_LEVEL_VERY_EXPENSIVE']

export async function searchRestaurants({ genre, scene, priceLevels, visitDate, visitTime, locMode, area, excludes, radius }) {
  const query = buildQuery({ genre, scene })
  const center = await resolveCenter({ locMode, area })
  const searchRadius = radius ?? 1000

  const [googleResults, hotpepperResults] = await Promise.all([
    fetchGoogle({ query, priceLevels, center, radius: searchRadius, genre }),
    searchHotpepper({ lat: center.lat, lng: center.lng, keyword: query, radius: searchRadius }).catch(() => []),
  ])

  const places = mergeResults(googleResults, hotpepperResults, priceLevels, visitDate, visitTime, excludes)
  return { places, center }
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

async function callGoogleAPI({ query, priceLevels, center, radius, genre, typeOverride }) {
  const includedType = typeOverride !== undefined ? typeOverride : (GENRE_TO_TYPE[genre] ?? (genre ? null : 'restaurant'))
  const body = {
    textQuery: `${query || '飲食店'}`,
    languageCode: 'ja',
    maxResultCount: 20,
    ...(includedType ? { includedType } : {}),
    locationBias: {
      circle: {
        center: { latitude: center.lat, longitude: center.lng },
        radius,
      },
    },
    ...(priceLevels?.length ? { priceLevels: priceLevels.flatMap((l) => l === 'PRICE_LEVEL_EXPENSIVE' ? GOOGLE_EXPENSIVE_LEVELS : [l]) } : {}),
  }
  const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': API_KEY, 'X-Goog-FieldMask': FIELD_MASK },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  return data.places ?? []
}

function filterByRadius(places, center, maxRadius, genre) {
  return places.filter((p) => {
    if (genre !== 'カフェ' && p.servesDinner === false && p.servesLunch === false) return false
    if (p.location) {
      const dist = haversineDistance(center.lat, center.lng, p.location.latitude, p.location.longitude)
      if (dist > maxRadius) return false
    }
    return true
  })
}

async function fetchGoogle({ query, priceLevels, center, radius, genre }) {
  const types = genre === 'カフェ' ? ['cafe', 'coffee_shop'] : [undefined]

  const initialResults = (await Promise.all(
    types.map((typeOverride) => callGoogleAPI({ query, priceLevels, center, radius, genre, typeOverride }))
  )).flat()

  const seen = new Set()
  const places = initialResults.filter((p) => {
    if (!p.id || seen.has(p.id)) return false
    seen.add(p.id)
    return true
  })

  const filtered = filterByRadius(places, center, radius, genre)
  if (filtered.length >= 3) return filtered

  const offsetDist = radius * 0.5
  const offsetPlaces = (await Promise.all(
    [0, 90, 180, 270].flatMap((bearing) =>
      types.map((typeOverride) =>
        callGoogleAPI({ query, priceLevels, center: offsetCenter(center, offsetDist, bearing), radius, genre, typeOverride })
      )
    )
  )).flat()

  const newPlaces = offsetPlaces.filter((p) => {
    if (!p.id || seen.has(p.id)) return false
    seen.add(p.id)
    return true
  })

  return filterByRadius([...places, ...newPlaces], center, radius, genre)
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

function normName(s) {
  return s.replace(/[\s　・＆&()（）【】「」『』]/g, '').toLowerCase()
}

function findMatch(shops, name, lat, lng) {
  const n = normName(name)
  return shops.find((s) => {
    const sn = normName(s.name)
    const sameName = n.includes(sn.slice(0, 5)) || sn.includes(n.slice(0, 5)) || n.includes(sn) || sn.includes(n)
    const nearby = lat && lng
      ? Math.abs(s.lat - lat) < 0.002 && Math.abs(s.lng - lng) < 0.002
      : false
    return sameName && nearby
  })
}

function mergeResults(googlePlaces, hotpepperShops, priceLevels, visitDate, visitTime, excludes) {
  const hasLevelFilter = priceLevels?.length > 0
  const allowedHpCodes = hasLevelFilter
    ? priceLevels.flatMap((l) => LEVEL_TO_HP_CODES[l] ?? [])
    : null
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

    if (hasLevelFilter) {
      if (matched?.budgetCode) {
        if (!allowedHpCodes.includes(matched.budgetCode)) return null
      } else if (place.priceLevel) {
        const effectiveLevel = GOOGLE_EXPENSIVE_LEVELS.includes(place.priceLevel) ? 'PRICE_LEVEL_EXPENSIVE' : place.priceLevel
        if (!priceLevels.includes(effectiveLevel)) return null
      }
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

function buildQuery({ genre, scene }) {
  const parts = []
  if (genre) parts.push(genre)
  if (scene) parts.push(scene)

  return parts.join(' ')
}
