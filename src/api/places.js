import { searchHotpepper } from './hotpepper'

const API_KEY = import.meta.env.VITE_GOOGLE_PLACES_API_KEY

export async function searchRestaurants({ genre, preferences, scene, budget, mealTime, locMode, area }) {
  const query = buildQuery({ genre, preferences, scene, mealTime })
  const priceLevel = budgetToPriceLevel(budget)
  const center = await resolveCenter({ locMode, area })

  const [googleResults, hotpepperResults] = await Promise.all([
    fetchGoogle({ query, priceLevel, center }),
    searchHotpepper({ lat: center.lat, lng: center.lng, keyword: query, mealTime }),
  ])

  return mergeResults(googleResults, hotpepperResults, budget)
}

async function fetchGoogle({ query, priceLevel, center }) {
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
    ...(priceLevel ? { priceLevels: [priceLevel] } : {}),
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

    // 食事を提供しない店（ドリンクのみ）を除外
    // servesDinner・servesLunch 両方が明示的に false の場合のみ除外
    if (p.servesDinner === false && p.servesLunch === false) return false

    // 予算フィルタ: priceLevel データがある場合のみ照合
    if (priceLevel && p.priceLevel && p.priceLevel !== priceLevel) {
      // 隣接する価格帯は許容（完全一致だと結果が0になりやすい）
      const levels = [
        'PRICE_LEVEL_INEXPENSIVE',
        'PRICE_LEVEL_MODERATE',
        'PRICE_LEVEL_EXPENSIVE',
        'PRICE_LEVEL_VERY_EXPENSIVE',
      ]
      const selected = levels.indexOf(priceLevel)
      const actual = levels.indexOf(p.priceLevel)
      if (Math.abs(selected - actual) > 1) return false
    }

    return true
  })
}

const BUDGET_CODE_MAP = {
  '〜1000円': ['B001', 'B002', 'B003'],
  '1000〜3000円': ['B003', 'B004', 'B005', 'B006'],
  '3000〜6000円': ['B006', 'B007', 'B008'],
  '6000円〜': ['B009', 'B010', 'B011', 'B012', 'B013'],
}

function mergeResults(googlePlaces, hotpepperShops, budget) {
  const allowedCodes = budget ? BUDGET_CODE_MAP[budget] : null

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

    if (matched && allowedCodes && matched.budgetCode && !allowedCodes.includes(matched.budgetCode)) {
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

function budgetToPriceLevel(budget) {
  const map = {
    '〜1000円': 'PRICE_LEVEL_INEXPENSIVE',
    '1000〜3000円': 'PRICE_LEVEL_MODERATE',
    '3000〜6000円': 'PRICE_LEVEL_EXPENSIVE',
    '6000円〜': 'PRICE_LEVEL_VERY_EXPENSIVE',
  }
  return map[budget] ?? null
}
