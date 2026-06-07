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
const RESTAURANT_PLACE_TYPES = new Set([
  'afghani_restaurant',
  'african_restaurant',
  'american_restaurant',
  'asian_restaurant',
  'bar_and_grill',
  'barbecue_restaurant',
  'brazilian_restaurant',
  'breakfast_restaurant',
  'brunch_restaurant',
  'buffet_restaurant',
  'chinese_restaurant',
  'dessert_restaurant',
  'diner',
  'fast_food_restaurant',
  'fine_dining_restaurant',
  'french_restaurant',
  'greek_restaurant',
  'hamburger_restaurant',
  'indian_restaurant',
  'indonesian_restaurant',
  'italian_restaurant',
  'japanese_restaurant',
  'korean_restaurant',
  'lebanese_restaurant',
  'mediterranean_restaurant',
  'mexican_restaurant',
  'middle_eastern_restaurant',
  'pizza_restaurant',
  'ramen_restaurant',
  'restaurant',
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
])
const CAFE_PLACE_TYPES = new Set([
  'acai_shop',
  'bagel_shop',
  'bakery',
  'cafe',
  'cafeteria',
  'candy_store',
  'cat_cafe',
  'chocolate_factory',
  'chocolate_shop',
  'coffee_shop',
  'confectionery',
  'dessert_shop',
  'dog_cafe',
  'donut_shop',
  'ice_cream_shop',
  'juice_shop',
  'sandwich_shop',
  'tea_house',
])
const BAR_PLACE_TYPES = new Set([
  'bar',
  'pub',
  'wine_bar',
])
const TAKEAWAY_PLACE_TYPES = new Set([
  'deli',
  'food',
  'food_court',
  'meal_delivery',
  'meal_takeaway',
])
const EXCLUDED_DEFAULT_TYPES = new Set([
  'karaoke',
  'night_club',
])
const SHORT_WINDOW_MS = 10 * 60 * 1000
const LONG_WINDOW_MS = 24 * 60 * 60 * 1000
const SHORT_LIMIT = 5
const LONG_LIMIT = 30

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
  'places.servesDinner',
  'places.servesLunch',
  'places.regularOpeningHours',
].join(',')

export default async function handler(req, res) {
  const requestId = createRequestId()
  const startedAt = Date.now()
  let filtersForLog = null

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (isSearchDisabled()) {
    res.setHeader('Retry-After', '3600')
    return res.status(503).json({ error: getSearchDisabledMessage() })
  }

  const rateLimit = checkRateLimit(getClientIp(req))
  if (!rateLimit.ok) {
    res.setHeader('Retry-After', String(Math.ceil(rateLimit.retryAfterMs / 1000)))
    return res.status(429).json({ error: '検索回数が多すぎます。少し時間をおいてから再検索してください。' })
  }

  if (!getGoogleApiKey()) return res.status(500).json({ error: 'Google API key is not configured.' })
  if (!getHotpepperApiKey()) return res.status(500).json({ error: 'HotPepper API key is not configured.' })

  try {
    const filters = normalizeFilters(parseBody(req.body))
    filtersForLog = filters
    const query = buildQuery(filters)
    const queryAlt = filters.scene === '記念日' ? buildQuery({ ...filters, scene: '誕生日' }) : null
    const excludeKeywords = [...new Set((filters.excludes ?? []).map((t) => t.trim()).filter(Boolean))]

    const [googleSearch, hotpepperSearch, excludedHotpepperSearches] = await Promise.all([
      fetchGoogle({ query, queryAlt, priceLevels: filters.priceLevels, center: filters.center, radius: filters.radius, genre: filters.genre }),
      searchHotpepper({ lat: filters.center.lat, lng: filters.center.lng, keyword: query, radius: filters.radius })
        .then((shops) => ({ shops, ok: true }))
        .catch((error) => ({ shops: [], ok: false, error: error.message })),
      Promise.all(
        excludeKeywords.map((keyword) =>
          searchHotpepper({ lat: filters.center.lat, lng: filters.center.lng, keyword, radius: filters.radius })
            .then((shops) => ({ shops, ok: true }))
            .catch((error) => ({ shops: [], ok: false, error: error.message }))
        )
      ),
    ])

    const hotpepperResults = hotpepperSearch.shops
    const excludedHotpepperResults = excludedHotpepperSearches.flatMap((result) => result.shops)

    const places = mergeResults(
      googleSearch.places,
      hotpepperResults,
      excludedHotpepperResults,
      filters.priceLevels,
      filters.visitDate,
      filters.visitTime,
      filters.excludes
    )
    logSearchEvent('search.completed', {
      requestId,
      durationMs: Date.now() - startedAt,
      filters,
      google: googleSearch.summary,
      hotpepper: {
        callCount: 1 + excludeKeywords.length,
        primaryCount: hotpepperResults.length,
        excludeCallCount: excludeKeywords.length,
        excludeResultCount: excludedHotpepperResults.length,
        failedCallCount: [hotpepperSearch, ...excludedHotpepperSearches].filter((result) => !result.ok).length,
      },
      finalCount: places.length,
    })
    return res.status(200).json({ places, center: filters.center })
  } catch (error) {
    logSearchEvent('search.failed', {
      requestId,
      durationMs: Date.now() - startedAt,
      filters: filtersForLog,
      error: error.message,
    })
    console.error(error)
    return res.status(500).json({ error: '検索に失敗しました。' })
  }
}

function createRequestId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

function getGoogleApiKey() {
  return process.env.GOOGLE_PLACES_API_KEY ?? process.env.VITE_GOOGLE_PLACES_API_KEY
}

function getHotpepperApiKey() {
  return process.env.HOTPEPPER_API_KEY
}

function getGoogleApiReferer() {
  return process.env.GOOGLE_API_REFERER ?? 'https://meshishirube.vercel.app/'
}

function isProductionDeployment() {
  return process.env.VERCEL_ENV === 'production'
}

function isSearchDisabled() {
  return isProductionDeployment() && process.env.SEARCH_DISABLED === 'true'
}

function getSearchDisabledMessage() {
  return process.env.SEARCH_DISABLED_MESSAGE
    ?? '現在アクセスが集中しています。時間をおいてからもう一度お試しください。'
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

function logSearchEvent(event, payload) {
  const filters = payload.filters
  const logPayload = {
    event,
    requestId: payload.requestId,
    durationMs: payload.durationMs,
    environment: process.env.VERCEL_ENV ?? 'local',
    searchTrigger: filters?.searchTrigger ?? 'unknown',
    filters: filters ? {
      radius: filters.radius,
      genrePresent: Boolean(filters.genre),
      scenePresent: Boolean(filters.scene),
      priceLevelCount: filters.priceLevels?.length ?? 0,
      excludeCount: filters.excludes?.length ?? 0,
      visitDatePresent: Boolean(filters.visitDate),
      visitTimePresent: Boolean(filters.visitTime),
      centerApprox: {
        lat: Math.round(filters.center.lat * 1000) / 1000,
        lng: Math.round(filters.center.lng * 1000) / 1000,
      },
    } : null,
    google: payload.google,
    hotpepper: payload.hotpepper,
    finalCount: payload.finalCount,
    error: payload.error,
  }

  console.log(JSON.stringify(logPayload))
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
    searchTrigger: normalizeSearchTrigger(input.searchTrigger),
  }
}

function normalizeSearchTrigger(value) {
  const trigger = String(value ?? '')
  if (['initial', 'manual', 'expand_radius'].includes(trigger)) return trigger
  return 'unknown'
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
    key: getHotpepperApiKey(),
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
      'X-Goog-Api-Key': getGoogleApiKey(),
      'X-Goog-FieldMask': FIELD_MASK,
      Referer: getGoogleApiReferer(),
    },
    body: JSON.stringify(body),
  })
  const data = await response.json()
  return data.places ?? []
}

function filterByRadius(places, center, maxRadius, genre) {
  return places.filter((p) => {
    if (!isFoodPlace(p, genre)) return false
    if (!['カフェ', 'アフタヌーンティー'].includes(genre) && p.servesDinner === false && p.servesLunch === false) return false
    if (p.location) {
      const dist = haversineDistance(center.lat, center.lng, p.location.latitude, p.location.longitude)
      if (dist > maxRadius) return false
    }
    return true
  })
}

function isFoodPlace(place, genre) {
  const types = [place.primaryType, ...(place.types ?? [])].filter(Boolean)
  if (types.length === 0) return true

  const genreText = String(genre ?? '').toLowerCase()
  const allowsCafe = /カフェ|喫茶|コーヒー|珈琲|アフタヌーン|スイーツ|デザート|パン/.test(genreText)
  const allowsBar = /バー|bar|パブ|pub|ワイン/.test(genreText)
  const allowsTakeaway = /テイクアウト|持ち帰り|弁当|デリ|デリバリー/.test(genreText)

  if (types.some((type) => EXCLUDED_DEFAULT_TYPES.has(type))) return false
  if (types.some((type) => RESTAURANT_PLACE_TYPES.has(type))) return true
  if (allowsCafe && types.some((type) => CAFE_PLACE_TYPES.has(type))) return true
  if (allowsBar && types.some((type) => BAR_PLACE_TYPES.has(type))) return true
  if (allowsTakeaway && types.some((type) => TAKEAWAY_PLACE_TYPES.has(type))) return true
  return false
}

async function fetchGoogle({ query, queryAlt, priceLevels, center, radius, genre }) {
  const calls = genre === 'カフェ'
    ? [{ typeOverride: 'cafe', textQueryOverride: 'カフェ' }, { typeOverride: 'coffee_shop', textQueryOverride: 'コーヒー' }]
    : queryAlt
    ? [{}, { textQueryOverride: queryAlt }]
    : [{}]

  const rawResults = (await Promise.all(
    calls.map(({ typeOverride, textQueryOverride }) =>
      callGoogleAPI({ query, priceLevels, center, radius, genre, typeOverride, textQueryOverride })
    )
  )).flat()

  const seen = new Set()
  const uniquePlaces = rawResults.filter((p) => {
    if (!p.id || seen.has(p.id)) return false
    seen.add(p.id)
    return true
  })

  const places = filterByRadius(uniquePlaces, center, radius, genre)
  return {
    places,
    summary: {
      callCount: calls.length,
      rawCount: rawResults.length,
      uniqueCount: uniquePlaces.length,
      filteredCount: places.length,
      multiSearchReason: genre === 'カフェ' ? 'cafe' : queryAlt ? 'anniversary' : null,
    },
  }
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
