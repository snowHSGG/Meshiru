function toHotpepperRange(radius) {
  if (radius <= 300) return '1'
  if (radius <= 500) return '2'
  if (radius <= 1000) return '3'
  if (radius <= 2000) return '4'
  return '5'
}

export async function searchHotpepper({ lat, lng, keyword, radius }) {
  const params = new URLSearchParams({
    lat: lat ?? '35.6762',
    lng: lng ?? '139.6503',
    range: toHotpepperRange(radius ?? 1000),
    ...(keyword ? { keyword } : {}),
  })

  const res = await fetch(`/api/hotpepper?${params}`)
  const data = await res.json()
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
