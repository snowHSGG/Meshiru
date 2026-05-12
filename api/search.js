const API_KEY = process.env.GOOGLE_PLACES_API_KEY ?? process.env.VITE_GOOGLE_PLACES_API_KEY
const HOTPEPPER_API_KEY = process.env.HOTPEPPER_API_KEY
const GOOGLE_API_REFERER = process.env.GOOGLE_API_REFERER ?? 'https://meshishirube.vercel.app/'

const GENRE_TO_TYPE = {
  'ラーメン': 'ramen_restaurant',
  '寿司': 'sushi_restaurant',
  '中華': 'chinese_restaurant',
  'イタリアン': 'italian_restaurant',
  'フレンチ': 'french_restaurant',
  '焼肉': 'yakiniku_restaurant',
}

const LEVEL_TO_HP_CODES = {
  PRICE_LEVEL_INEXPENSIVE: ['B001', 'B002'],
  PRICE_LEVEL_MODERATE: ['B003', 'B004', 'B005'],
  PRICE_LEVEL_EXPENSIVE: ['B006', 'B007', 'B008', 'B009', 'B010', 'B011', 'B012', 'B013'],
}

const GOOGLE_EXPENSIVE_LEVELS = ['PRICE_LEVEL_EXPENSIVE', 'PRICE_LEVEL_VERY_EXPENSIVE']
const FOOD_PLACE_TYPES = new Set([
  'acai_shop',
  'afghani_restaurant',
  'african_restaurant',
  'american_restaurant',
  'asian_restaurant',
  'bagel_shop',
  'bakery',
  'bar',
  'bar_and_grill',
  'barbecue_restaurant',
  'brazilian_restaurant',
  'breakfast_restaurant',
  'brunch_restaurant',
  'buffet_restaurant',
  'cafe',
  'cafeteria',
  'candy_store',
  'cat_cafe',
  'chinese_restaurant',
  'chocolate_factory',
  'chocolate_shop',
  'coffee_shop',
  'confectionery',
  'deli',
  'dessert_restaurant',
  'dessert_shop',
  'diner',
  'dog_cafe',
  'donut_shop',
  'fast_food_restaurant',
  'fine_dining_restaurant',
  'food',
  'food_court',
  'french_restaurant',
  'greek_restaurant',
  'hamburger_restaurant',
  'ice_cream_shop',
  'indian_restaurant',
  'indonesian_restaurant',
  'italian_restaurant',
  'japanese_restaurant',
  'juice_shop',
  'korean_restaurant',
  'lebanese_restaurant',
  'meal_delivery',
  'meal_takeaway',
  'mediterranean_restaurant',
  'mexican_restaurant',
  'middle_eastern_restaurant',
  'pizza_restaurant',
  'pub',
  'ramen_restaurant',
  'restaurant',
  'sandwich_shop',
  'seafood_restaurant',
  'spanish_restaurant',
  'steak_house',
  'sushi_restaurant',
  'tea_house',
  'thai_restaurant',
  'turkish_restaurant',
  'vegan_restaurant',
  'vegetarian_restaurant',
  'vietnamese_restaurant',
  'wine_bar',
])
const SHORT_WINDOW_MS = 10 * 60 * 1000
const LONG_WINDOW_MS = 24 * 60 * 60 * 1000
const SHORT_LIMIT = 30
const LONG_LIMIT = 150

const rateBuckets = globalThis.__meshishirubeRateBuckets ?? new Map()
globalThis.__meshishirubeRateBuckets = rateBuckets

const FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.rating',
  'places.userRatingCount',
  'places.formattedAddress',
  'places.priceLevel',
  'places.types',
  'places.primaryType',
  'places.primaryTypeDisplayName',
  'places.location',
  'places.websiteUri',
  'places.googleMapsUri',
  'places.photos',
  'places.regularOpeningHours',
].join(',')

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const rateLimit = checkRateLimit(getClientIp(req))
  if (!rateLimit.ok) {
    res.setHeader('Retry-After', String(Math.ceil(rateLimit.retryAfterMs / 1000)))
    return res.status(429).json({ error: '検索回数が多すぎます。少し時間をおいてから再検索してください。' })
  }

  if (!API_KEY) return res.status(500).json({ error: 'Google API key is not configured.' })
  if (!HOTPEPPER_API_KEY) return res.status(500).json({ error: 'HotPepper API key is not configured.' })

  try {
    const filters = normalizeFilters(parseBody(req.body))
    const query = buildQuery(filters)
    const queryAlt = filters.scene === '記念日' ? buildQuery({ ...filters, scene: '誕生日' }) : null
    const excludeKeywords = [...new Set((filters.excludes ?? []).map((t) => t.trim()).filter(Boolean))]

    const [googleResults, hotpepperResults, excludedHotpepperResults] = await Promise.all([
      fetchGoogle({ query, queryAlt, priceLevels: filters.priceLevels, center: filters.center, radius: filters.radius, genre: filters.genre }),
      searchHotpepper({ lat: filters.center.lat, lng: filters.center.lng, keyword: query, radius: filters.radius }).catch(() => []),
      Promise.all(
        excludeKeywords.map((keyword) =>
          searchHotpepper({ lat: filters.center.lat, lng: filters.center.lng, keyword, radius: filters.radius }).catch(() => [])
        )
      ).then((results) => results.flat()),
    ])

    const places = mergeResults(
      googleResults,
      hotpepperResults,
      excludedHotpepperResults,
      filters.priceLevels,
      filters.visitDate,
      filters.visitTime,
      filters.excludes
    )
    return res.status(200).json({ places, center: filters.center })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ error: '検索に失敗しました。' })
  }
}

function parseBody(body) {
  if (!body) return {}
  if (typeof body === 'string') return JSON.parse(body)
  return body
}

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for']
  if (typeof forwarded === 'string' && forwarded.length > 0) return forwarded.split(',')[0].trim()
  return req.headers['x-real-ip'] ?? req.socket?.remoteAddress ?? 'unknown'
}

function checkRateLimit(ip) {
  const now = Date.now()
  const bucket = rateBuckets.get(ip) ?? []
  const recent = bucket.filter((time) => now - time < LONG_WINDOW_MS)
  const shortCount = recent.filter((time) => now - time < SHORT_WINDOW_MS).length

  if (shortCount >= SHORT_LIMIT) {
    const oldestShort = recent.find((time) => now - time < SHORT_WINDOW_MS) ?? now
    rateBuckets.set(ip, recent)
    return { ok: false, retryAfterMs: SHORT_WINDOW_MS - (now - oldestShort) }
  }

  if (recent.length >= LONG_LIMIT) {
    rateBuckets.set(ip, recent)
    return { ok: false, retryAfterMs: LONG_WINDOW_MS - (now - recent[0]) }
  }

  recent.push(now)
  rateBuckets.set(ip, recent)
  return { ok: true }
}

function normalizeFilters(input) {
  const radius = Number(input.radius)
  const lat = Number(input.center?.lat)
  const lng = Number(input.center?.lng)

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new Error('Invalid center')
  }

  return {
    genre: String(input.genre ?? '').slice(0, 80),
    scene: String(input.scene ?? '').slice(0, 80),
    priceLevels: Array.isArray(input.priceLevels) ? input.priceLevels.slice(0, 4) : [],
    visitDate: String(input.visitDate ?? ''),
    visitTime: String(input.visitTime ?? ''),
    excludes: Array.isArray(input.excludes) ? input.excludes.map((v) => String(v).slice(0, 80)).slice(0, 10) : [],
    radius: Number.isFinite(radius) ? Math.min(Math.max(radius, 100), 5000) : 500,
    center: { lat, lng },
  }
}

function toHotpepperRange(radius) {
  if (radius <= 300) return '1'
  if (radius <= 500) return '2'
  if (radius <= 1000) return '3'
  if (radius <= 2000) return '4'
  return '5'
}

async function searchHotpepper({ lat, lng, keyword, radius }) {
  const params = new URLSearchParams({
    key: HOTPEPPER_API_KEY,
    lat: lat ?? '35.6762',
    lng: lng ?? '139.6503',
    range: toHotpepperRange(radius ?? 500),
    count: '20',
    format: 'json',
    ...(keyword ? { keyword } : {}),
  })

  const response = await fetch(`https://webservice.recruit.co.jp/hotpepper/gourmet/v1/?${params}`)
  const data = await response.json()
  const shops = data?.results?.shop ?? []

  return shops.map((s) => ({
    source: 'hotpepper',
    name: s.name,
    address: s.address,
    lat: parseFloat(s.lat),
    lng: parseFloat(s.lng),
    genre: s.genre?.name ?? '',
    catch: s.catch,
    photo: s.photo?.pc?.l ?? null,
    reserveUrl: s.urls?.pc ?? null,
    budget: s.budget?.name ?? null,
    budgetCode: s.budget?.code ?? null,
    capacity: parseInt(s.capacity) || null,
  }))
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

async function callGoogleAPI({ query, priceLevels, center, radius, genre, typeOverride, textQueryOverride }) {
  const includedType = typeOverride !== undefined ? typeOverride : (GENRE_TO_TYPE[genre] ?? (genre ? null : 'restaurant'))
  const body = {
    textQuery: textQueryOverride ?? (query || '飲食店'),
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
  const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': API_KEY,
      'X-Goog-FieldMask': FIELD_MASK,
      Referer: GOOGLE_API_REFERER,
    },
    body: JSON.stringify(body),
  })
  const data = await response.json()
  return data.places ?? []
}

function filterByRadius(places, center, maxRadius, genre) {
  return places.filter((p) => {
    if (!isFoodPlace(p)) return false
    if (p.location) {
      const dist = haversineDistance(center.lat, center.lng, p.location.latitude, p.location.longitude)
      if (dist > maxRadius) return false
    }
    return true
  })
}

function isFoodPlace(place) {
  const types = [place.primaryType, ...(place.types ?? [])].filter(Boolean)
  if (types.length === 0) return true
  return types.some((type) => FOOD_PLACE_TYPES.has(type))
}

async function fetchGoogle({ query, queryAlt, priceLevels, center, radius, genre }) {
  const calls = genre === 'カフェ'
    ? [{ typeOverride: 'cafe', textQueryOverride: 'カフェ' }, { typeOverride: 'coffee_shop', textQueryOverride: 'コーヒー' }]
    : queryAlt
    ? [{}, { textQueryOverride: queryAlt }]
    : [{}]

  const initialResults = (await Promise.all(
    calls.map(({ typeOverride, textQueryOverride }) =>
      callGoogleAPI({ query, priceLevels, center, radius, genre, typeOverride, textQueryOverride })
    )
  )).flat()

  const seen = new Set()
  const places = initialResults.filter((p) => {
    if (!p.id || seen.has(p.id)) return false
    seen.add(p.id)
    return true
  })

  const filtered = filterByRadius(places, center, radius, genre)
  if (filtered.length >= 10) return filtered

  const offsetDist = radius * 0.5
  const offsetPlaces = (await Promise.all(
    [0, 90, 180, 270].flatMap((bearing) =>
      calls.map(({ typeOverride, textQueryOverride }) =>
        callGoogleAPI({ query, priceLevels, center: offsetCenter(center, offsetDist, bearing), radius, genre, typeOverride, textQueryOverride })
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

    if (dayOfWeek !== null) {
      if (!overnight && oDay !== dayOfWeek) return false
      if (overnight && dayOfWeek !== oDay && dayOfWeek !== cDay) return false
    }

    if (checkMin === null) return true

    if (!overnight) {
      return (dayOfWeek === null || dayOfWeek === oDay) && checkMin >= oMin && checkMin < cMin
    }
    if (dayOfWeek === oDay) return checkMin >= oMin
    if (dayOfWeek === cDay) return checkMin < cMin
    if (dayOfWeek === null) return checkMin >= oMin || checkMin < cMin
    return false
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

function normalizeSearchText(value) {
  return (value ?? '')
    .normalize('NFKC')
    .replace(/[\s　・＆&()（）【】「」『』]/g, '')
    .toLowerCase()
    .replace(/[ァ-ン]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0x60))
}

function shouldExcludePlace(place, matched, excludedMatch, excludeTerms) {
  if (excludeTerms.length === 0) return false

  const searchableText = [
    place.displayName?.text,
    place.primaryTypeDisplayName?.text,
    place.formattedAddress,
    matched?.name,
    matched?.genre,
    matched?.catch,
    matched?.address,
    excludedMatch?.name,
    excludedMatch?.genre,
    excludedMatch?.catch,
    excludedMatch?.address,
  ].map(normalizeSearchText).join(' ')

  return excludeTerms.some((term) => searchableText.includes(term))
}

function mergeResults(googlePlaces, hotpepperShops, excludedHotpepperShops, priceLevels, visitDate, visitTime, excludes) {
  const hasLevelFilter = priceLevels?.length > 0
  const allowedHpCodes = hasLevelFilter
    ? priceLevels.flatMap((l) => LEVEL_TO_HP_CODES[l] ?? [])
    : null
  const excludeTerms = (excludes ?? []).map(normalizeSearchText).filter(Boolean)

  const merged = googlePlaces.map((place) => {
    const name = place.displayName?.text ?? ''
    const lat = place.location?.latitude
    const lng = place.location?.longitude

    if (!isOpenAt(place.regularOpeningHours?.periods, visitDate, visitTime)) return null

    const matched = findMatch(hotpepperShops, name, lat, lng)
    const excludedMatch = findMatch(excludedHotpepperShops, name, lat, lng)

    if (shouldExcludePlace(place, matched, excludedMatch, excludeTerms)) return null

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

  const bayesian = (r, n) => r ? (100 * 4.0 + n * r) / (100 + n) : 0
  const score = (p) => bayesian(p.rating, p.userRatingCount ?? 0) + (p.priceVerified ? 0.08 : 0)
  return merged
    .sort((a, b) => score(b) - score(a))
}

function buildQuery({ genre, scene }) {
  const parts = []
  if (genre) parts.push(genre)
  if (scene) parts.push(scene)

  return parts.join(' ')
}
