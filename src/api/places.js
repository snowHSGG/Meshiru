const API_KEY = import.meta.env.VITE_GOOGLE_PLACES_API_KEY

export async function searchRestaurants({ genre, preferences, scene, budget, locMode, area }) {
  const query = buildQuery({ genre, preferences, scene })
  const priceLevel = budgetToPriceLevel(budget)
  const center = await resolveCenter({ locMode, area })

  const body = {
    textQuery: `${query || '飲食店'} レストラン`,
    languageCode: 'ja',
    maxResultCount: 10,
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
      ].join(','),
    },
    body: JSON.stringify(body),
  })

  const data = await res.json()
  const places = data.places ?? []

  return places
    .filter((p) => p.rating >= 3.5)
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 3)
}

async function resolveCenter({ locMode, area }) {
  if (locMode === 'current') {
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => resolve({ lat: 35.6762, lng: 139.6503 }) // 失敗時は東京中心
      )
    })
  }
  if (area) return { lat: area.lat, lng: area.lng }
  return { lat: 35.6762, lng: 139.6503 } // デフォルト: 東京中心
}

function buildQuery({ genre, preferences, scene }) {
  const parts = []
  if (genre) parts.push(genre)
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
