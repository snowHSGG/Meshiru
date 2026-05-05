export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  const { url } = req.query
  if (!url) return res.json({ min: null, max: null })

  // コースサブページを優先して試し、ダメなら本体ページ
  const courseUrl = url.replace(/\/?$/, '/') + 'course/'
  const html = await tryFetch(courseUrl) ?? await tryFetch(url)

  if (!html) return res.json({ min: null, max: null })

  const prices = extractCoursePrices(html)
  res.json(prices)
}

async function tryFetch(url) {
  try {
    const r = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept-Language': 'ja,en;q=0.9',
        'Accept': 'text/html',
      },
      signal: AbortSignal.timeout(6000),
    })
    if (!r.ok) return null
    return await r.text()
  } catch {
    return null
  }
}

function extractCoursePrices(html) {
  // スクリプト・スタイル・タグを除去してプレーンテキストに
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')

  const prices = []

  // "コース" 出現箇所の前後から価格を抽出
  let cursor = 0
  while (true) {
    const idx = text.indexOf('コース', cursor)
    if (idx === -1) break

    const window = text.slice(Math.max(0, idx - 100), idx + 400)

    // 価格パターン: "3,500円", "¥3500", "3500円" など
    const priceRe = /(?:[¥￥]\s*)?(\d{1,3}(?:,\d{3})+|\d{3,6})\s*円/g
    let m
    while ((m = priceRe.exec(window)) !== null) {
      const p = parseInt(m[1].replace(/,/g, ''))
      if (p >= 500 && p <= 200000) prices.push(p)
    }

    cursor = idx + 1
  }

  if (prices.length === 0) return { min: null, max: null }
  return { min: Math.min(...prices), max: Math.max(...prices) }
}
