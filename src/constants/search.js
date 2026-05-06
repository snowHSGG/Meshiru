export const GENRES = ['和食', 'イタリアン', 'フレンチ', '中華', '焼肉', 'ラーメン', '寿司', '懐石・会席', 'カフェ', '居酒屋', '焼き鳥', 'うなぎ', 'ステーキ', 'タイ料理', 'スペイン料理']
export const PREFERENCES = ['コスパ重視', '雰囲気重視', '接客重視', '一人OK', '個室あり', '記念日向け']
export const SCENES = ['デート', '接待', '友人と', '一人飯', '家族と']
export const MEAL_TIMES = ['ランチ', 'ディナー']
export const HOURS = Array.from({ length: 16 }, (_, i) => `${i + 9}:00`)


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
