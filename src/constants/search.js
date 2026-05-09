export const GENRES = ['焼き鳥', '焼肉', '寿司', '居酒屋', 'ラーメン', '中華', 'イタリアン', 'フレンチ', 'カレー', 'カフェ', 'アフタヌーンティー']
export const SCENES = ['デート', '女子会', '接待', '記念日', '23時以降']
export const HOURS = Array.from({ length: 19 }, (_, i) => `${i + 6}:00`)


export const RADIUS_OPTIONS = [
  { label: '500m', value: 500 },
  { label: '1km',  value: 1000 },
  { label: '2km',  value: 2000 },
]

export const PRICE_LEVELS = [
  { label: '〜¥1,000',      value: 'PRICE_LEVEL_INEXPENSIVE' },
  { label: '¥1,000〜3,000', value: 'PRICE_LEVEL_MODERATE' },
  { label: '¥3,000〜',      value: 'PRICE_LEVEL_EXPENSIVE' },
]

export const BUDGET_STEPS = [
  { label: '¥ 1,000',  value: 1000 },
  { label: '¥ 2,000',  value: 2000 },
  { label: '¥ 3,000',  value: 3000 },
  { label: '¥ 4,000',  value: 4000 },
  { label: '¥ 5,000',  value: 5000 },
  { label: '¥ 6,000',  value: 6000 },
  { label: '¥ 8,000',  value: 8000 },
  { label: '¥ 10,000', value: 10000 },
  { label: '¥ 15,000', value: 15000 },
  { label: '¥ 20,000', value: 20000 },
  { label: '¥ 30,000', value: 30000 },
  { label: '¥ 40,000', value: 40000 },
  { label: '¥ 50,000', value: 50000 },
  { label: '¥ 60,000', value: 60000 },
  { label: '¥ 80,000', value: 80000 },
  { label: '¥ 100,000', value: 100000 },
]

export function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

export function currentHourStr() {
  const h = new Date().getHours()
  return h >= 6 ? `${h}:00` : '6:00'
}
