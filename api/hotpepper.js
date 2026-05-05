export default async function handler(req, res) {
  const { lat, lng, keyword, lunch, dinner, course } = req.query

  const params = new URLSearchParams({
    key: process.env.HOTPEPPER_API_KEY,
    lat: lat ?? '35.6762',
    lng: lng ?? '139.6503',
    range: '3',
    count: '20',
    format: 'json',
    ...(keyword ? { keyword } : {}),
    ...(lunch === '1' ? { lunch: '1' } : {}),
    ...(dinner === '1' ? { dinner: '1' } : {}),
    ...(course === '1' ? { course: '1' } : {}),
  })

  const response = await fetch(
    `https://webservice.recruit.co.jp/hotpepper/gourmet/v1/?${params}`
  )
  const data = await response.json()

  res.setHeader('Access-Control-Allow-Origin', '*')
  res.json(data)
}
