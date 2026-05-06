export async function searchHotpepper({ lat, lng, keyword, mealTime }) {
  const params = new URLSearchParams({
    lat: lat ?? '35.6762',
    lng: lng ?? '139.6503',
    ...(keyword ? { keyword } : {}),
    ...(mealTime === 'ランチ' ? { lunch: '1' } : {}),
    ...(mealTime === 'ディナー' ? { dinner: '1' } : {}),
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
