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

  return mergeResults(googleResults, hotpepperResults)
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
      ].join(','),
    },
    body: JSON.stringify(body),
  })

  const data = await res.json()
  return (data.places ?? []).filter(
    (p) => p.rating >= 3.5 && (p.userRatingCount ?? 0) >= 20
  )
}

function mergeResults(googlePlaces, hotpepperShops) {
  const merged = googlePlaces.map((place) => {
    const name = place.displayName?.text ?? ''
    const lat = place.location?.latitude
    const lng = place.location?.longitude

    // 名前または距離が近いHotPepperの店舗とマッチング
    const matched = hotpepperShops.find((hp) => {
      const sameName = hp.name.includes(name.slice(0, 4)) || name.includes(hp.name.slice(0, 4))
      const nearby = lat && lng
        ? Math.abs(hp.lat - lat) < 0.001 && Math.abs(hp.lng - lng) < 0.001
        : false
      return sameName || nearby
    })

    return {
      ...place,
      hotpepperUrl: matched?.reserveUrl ?? null,
      hotpepperCatch: matched?.catch ?? null,
    }
  })

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
