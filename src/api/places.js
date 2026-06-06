const API_KEY = import.meta.env.VITE_GOOGLE_PLACES_API_KEY
const USE_MOCK_SEARCH = import.meta.env.VITE_MOCK_SEARCH === 'true'

export async function searchRestaurants({ genre, scene, priceLevels, visitDate, visitTime, locMode, area, excludes, radius }) {
  const center = await resolveCenter({ locMode, area })
  if (USE_MOCK_SEARCH) {
    return { places: buildMockPlaces(center, radius), center }
  }

  const response = await fetch('/api/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ genre, scene, priceLevels, visitDate, visitTime, center, excludes, radius }),
  })
  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.error ?? '検索に失敗しました。')
  }

  return { places: data.places ?? [], center: data.center ?? center }
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

function buildMockPlaces(center, radius) {
  const count = radius <= 500 ? 2 : 3
  const basePlaces = [
    {
      id: 'mock-place-1',
      displayName: { text: 'めししるべ食堂' },
      rating: 4.5,
      userRatingCount: 328,
      formattedAddress: '東京都新宿区西新宿1-1-1',
      priceLevel: 'PRICE_LEVEL_MODERATE',
      primaryTypeDisplayName: { text: '定食屋' },
      location: { latitude: center.lat + 0.001, longitude: center.lng + 0.001 },
      googleMapsUri: 'https://maps.google.com/?q=35.690921,139.700258',
      websiteUri: 'https://example.com',
      hotpepperCatch: '仕事帰りでも入りやすい、落ち着いた和食のお店。',
      hotpepperBudget: '2001〜3000円',
      hotpepperUrl: null,
    },
    {
      id: 'mock-place-2',
      displayName: { text: '路地裏ビストロ 灯' },
      rating: 4.3,
      userRatingCount: 184,
      formattedAddress: '東京都新宿区新宿3-1-1',
      priceLevel: 'PRICE_LEVEL_EXPENSIVE',
      primaryTypeDisplayName: { text: 'ビストロ' },
      location: { latitude: center.lat - 0.0012, longitude: center.lng + 0.0008 },
      googleMapsUri: 'https://maps.google.com/?q=35.690100,139.704000',
      websiteUri: 'https://example.com',
      hotpepperCatch: '少し特別な夜に使いやすい小さなビストロ。',
      hotpepperBudget: '4001〜5000円',
      hotpepperUrl: null,
    },
    {
      id: 'mock-place-3',
      displayName: { text: '炭火キッチン こがね' },
      rating: 4.2,
      userRatingCount: 512,
      formattedAddress: '東京都新宿区歌舞伎町1-1-1',
      priceLevel: 'PRICE_LEVEL_MODERATE',
      primaryTypeDisplayName: { text: '居酒屋' },
      location: { latitude: center.lat + 0.0003, longitude: center.lng - 0.0014 },
      googleMapsUri: 'https://maps.google.com/?q=35.694000,139.702000',
      websiteUri: 'https://example.com',
      hotpepperCatch: '焼き物と小皿料理が強い、気軽な一軒。',
      hotpepperBudget: '3001〜4000円',
      hotpepperUrl: null,
    },
  ]

  return basePlaces.slice(0, count)
}
