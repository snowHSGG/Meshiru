// 東京リージョンで実行（HotPepperのIP制限対策）
export const config = { regions: ['hnd1'] }

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  const { url } = req.query
  if (!url) return res.json({ min: null, max: null })

  const baseUrl = url.replace(/\/?$/, '/')

  // 試すURLパターン（コースページ → 本体ページ → 予約ページのコースタブ）
  const candidates = [
    baseUrl + 'course/',
    baseUrl,
    baseUrl + 'plan/',
  ]

  let html = null
  for (const candidate of candidates) {
    html = await tryFetch(candidate)
    if (html && html.includes('コース')) break
  }

  if (!html) return res.json({ min: null, max: null })

  const prices = extractCoursePrices(html)
  res.json(prices)
}

async function tryFetch(url) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 7000)
  try {
    const r = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ja-JP,ja;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
      },
      redirect: 'follow',
    })
    if (!r.ok) return null
    return await r.text()
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

function extractCoursePrices(html) {
  // スクリプト・スタイル・タグを除去
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&yen;/gi, '¥')
    .replace(/\s+/g, ' ')

  const prices = []

  // "コース" 出現箇所の前後500文字から価格を抽出
  let cursor = 0
  while (true) {
    const idx = text.indexOf('コース', cursor)
    if (idx === -1) break

    const window = text.slice(Math.max(0, idx - 100), idx + 500)

    // 価格パターン: "3,500円", "3500円", "¥3,500", "3,500円〜" etc.
    const priceRe = /(?:[¥￥]\s*)?(\d{1,3}(?:,\d{3})+|\d{4,6})\s*(?:円|円～|円〜)/g
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
