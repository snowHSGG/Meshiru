import { searchHotpepper } from './hotpepper'

const API_KEY = import.meta.env.VITE_GOOGLE_PLACES_API_KEY

// HotPepper budget code → yen range (upper bound)
const HP_CODE_MAX = {
  B001: 500, B002: 1000, B003: 1500, B004: 2000, B005: 3000,
  B006: 4000, B007: 5000, B008: 7000, B009: 10000,
  B010: 15000, B011: 20000, B012: 30000, B013: Infinity,
}
const HP_CODE_MIN = {
  B001: 0, B002: 501, B003: 1001, B004: 1501, B005: 2001,
  B006: 3001, B007: 4001, B008: 5001, B009: 7001,
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

export async function searchRestaurants({ genre, preferences, scene, budgetMin, budgetMax, partySize, mealTime, locMode, area }) {
  const query = buildQuery({ genre, preferences, scene, mealTime })
  const priceLevels = rangeToPriceLevels(budgetMin, budgetMax)
  const center = await resolveCenter({ locMode, area })

  const [googleResults, hotpepperResults] = await Promise.all([
    fetchGoogle({ query, priceLevels, center }),
    searchHotpepper({ lat: center.lat, lng: center.lng, keyword: query, mealTime }),
  ])

  return mergeResults(googleResults, hotpepperResults, budgetMin, budgetMax, partySize)
}

async function fetchGoogle({ query, priceLevels, center }) {
  const body = {
    textQuery: `${query || '飲食店'}`,
    languageCode: 'ja',
    maxResultCount: 20,
    includedType: 'restaurant',
    locationBias: {
      circle: {
        center: { latitude: center.lat, longitude: center.lng },
        radius: 2000.0,
      },
    },
    ...(priceLevels?.length ? { priceLevels } : {}),
  }

  const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': API_KEY,
      'X-Goog-FieldMask': [
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
      ].join(','),
    },
    body: JSON.stringify(body),
  })

  const data = await res.json()
  return (data.places ?? []).filter((p) => {
    if (p.rating < 3.5) return false
    if ((p.userRatingCount ?? 0) < 20) return false
    if (p.servesDinner === false && p.servesLunch === false) return false
    return true
  })
}

function mergeResults(googlePlaces, hotpepperShops, budgetMin, budgetMax, partySize) {
  const lo = budgetMin !== '' && budgetMin != null ? Number(budgetMin) : 0
  const hi = budgetMax !== '' && budgetMax != null ? Number(budgetMax) : Infinity
  const hasRange = lo > 0 || hi < Infinity

  const merged = googlePlaces.map((place) => {
    const name = place.displayName?.text ?? ''
    const lat = place.location?.latitude
    const lng = place.location?.longitude

    const matched = hotpepperShops.find((hp) => {
      const sameName = hp.name.includes(name.slice(0, 4)) || name.includes(hp.name.slice(0, 4))
      const nearby = lat && lng
        ? Math.abs(hp.lat - lat) < 0.001 && Math.abs(hp.lng - lng) < 0.001
        : false
      return sameName || nearby
    })

    if (matched && hasRange && matched.budgetCode) {
      const codeMin = HP_CODE_MIN[matched.budgetCode] ?? 0
      const codeMax = HP_CODE_MAX[matched.budgetCode] ?? Infinity
      if (!rangesOverlap(lo, hi, codeMin, codeMax)) return null
    }

    if (matched && partySize && matched.capacity !== null && matched.capacity < partySize) {
      return null
    }

    return {
      ...place,
      hotpepperUrl: matched?.reserveUrl ?? null,
      hotpepperCatch: matched?.catch ?? null,
      priceVerified: !!matched,
    }
  }).filter(Boolean)

  return merged
    .sort((a, b) => b.rating - a.rating)
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
