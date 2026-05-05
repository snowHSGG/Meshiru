import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import '../styles/SearchPage.css'

const GENRES = ['和食', 'イタリアン', '中華', '焼肉', 'ラーメン', '寿司', 'カフェ', '居酒屋']
const PREFERENCES = ['コスパ重視', '雰囲気重視', '接客重視', '一人OK', '個室あり', '記念日向け']
const SCENES = ['デート', '接待', '友人と', '一人飯', '家族と']
const BUDGET_STEPS = [
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
const MEAL_TIMES = ['ランチ', 'ディナー']
const HOURS = Array.from({ length: 16 }, (_, i) => {
  const h = i + 9
  return `${h}:00`
})

const AREAS = [
  { label: '渋谷・原宿', lat: 35.6580, lng: 139.7016 },
  { label: '新宿',       lat: 35.6938, lng: 139.7034 },
  { label: '銀座・有楽町', lat: 35.6717, lng: 139.7649 },
  { label: '六本木',     lat: 35.6628, lng: 139.7315 },
  { label: '池袋',       lat: 35.7295, lng: 139.7109 },
  { label: '上野・浅草', lat: 35.7141, lng: 139.7774 },
  { label: '秋葉原',     lat: 35.7022, lng: 139.7741 },
  { label: '表参道',     lat: 35.6653, lng: 139.7127 },
  { label: '恵比寿・代官山', lat: 35.6467, lng: 139.7100 },
]

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

export default function SearchPage() {
  const navigate = useNavigate()
  const [genre, setGenre] = useState('')
  const [preferences, setPreferences] = useState([])
  const [scene, setScene] = useState('')
  const [budgetMin, setBudgetMin] = useState('')
  const [budgetMax, setBudgetMax] = useState('')
  const [partySize, setPartySize] = useState('')
  const [mealTime, setMealTime] = useState('')
  const [visitDate, setVisitDate] = useState(todayStr())
  const [visitTime, setVisitTime] = useState('')
  const [locMode, setLocMode] = useState('area')
  const [area, setArea] = useState(null)
  const [geoError, setGeoError] = useState('')
  const [geoLoading, setGeoLoading] = useState(false)

  function togglePreference(p) {
    setPreferences((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    )
  }

  function switchToCurrentLocation() {
    setLocMode('current')
    setArea(null)
    setGeoError('')
    setGeoLoading(true)
    navigator.geolocation.getCurrentPosition(
      () => setGeoLoading(false),
      () => {
        setGeoLoading(false)
        setGeoError('位置情報の取得に失敗しました。エリアを選択してください。')
        setLocMode('area')
      }
    )
  }

  function handleSearch() {
    navigate('/results', {
      state: { genre, preferences, scene, budgetMin, budgetMax, partySize, mealTime, visitDate, visitTime, locMode, area },
    })
  }

  return (
    <div className="page">
      <header className="header">
        <span className="logo" onClick={() => navigate('/')}>Meshiru</span>
      </header>

      <main className="search-main">
        <h1 className="search-title">お店を探す</h1>

        {/* エリア */}
        <section className="filter-section">
          <h2 className="filter-label">エリア</h2>
          <div className="loc-toggle">
            <button
              className={`loc-btn ${locMode === 'current' ? 'active' : ''}`}
              onClick={switchToCurrentLocation}
            >現在地を使う</button>
            <button
              className={`loc-btn ${locMode === 'area' ? 'active' : ''}`}
              onClick={() => { setLocMode('area'); setGeoError('') }}
            >エリアを選ぶ</button>
          </div>
          {geoLoading && <p className="geo-status">位置情報を取得中...</p>}
          {geoError && <p className="geo-error">{geoError}</p>}
          {locMode === 'current' && !geoLoading && !geoError && (
            <p className="geo-status">現在地を使用します</p>
          )}
          {locMode === 'area' && (
            <div className="chips" style={{ marginTop: '0.75rem' }}>
              {AREAS.map((a) => (
                <button
                  key={a.label}
                  className={`chip ${area?.label === a.label ? 'active' : ''}`}
                  onClick={() => setArea(area?.label === a.label ? null : a)}
                >{a.label}</button>
              ))}
            </div>
          )}
        </section>

        {/* 来店日時 */}
        <section className="filter-section">
          <h2 className="filter-label">来店日時</h2>
          <div className="datetime-row">
            <div className="datetime-field">
              <label className="datetime-label">日付</label>
              <input
                className="datetime-input"
                type="date"
                value={visitDate}
                min={todayStr()}
                onChange={(e) => setVisitDate(e.target.value)}
              />
            </div>
            <div className="datetime-field">
              <label className="datetime-label">時間</label>
              <select
                className="datetime-input"
                value={visitTime}
                onChange={(e) => setVisitTime(e.target.value)}
              >
                <option value="">指定なし</option>
                {HOURS.map((h) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* 時間帯 */}
        <section className="filter-section">
          <h2 className="filter-label">時間帯</h2>
          <div className="chips">
            {MEAL_TIMES.map((m) => (
              <button
                key={m}
                className={`chip ${mealTime === m ? 'active' : ''}`}
                onClick={() => setMealTime(mealTime === m ? '' : m)}
              >{m}</button>
            ))}
          </div>
        </section>

        {/* ジャンル */}
        <section className="filter-section">
          <h2 className="filter-label">料理ジャンル</h2>
          <div className="chips">
            {GENRES.map((g) => (
              <button
                key={g}
                className={`chip ${genre === g ? 'active' : ''}`}
                onClick={() => setGenre(genre === g ? '' : g)}
              >{g}</button>
            ))}
          </div>
        </section>

        <section className="filter-section">
          <h2 className="filter-label">こだわり <span className="filter-note">複数選択可</span></h2>
          <div className="chips">
            {PREFERENCES.map((p) => (
              <button
                key={p}
                className={`chip ${preferences.includes(p) ? 'active' : ''}`}
                onClick={() => togglePreference(p)}
              >{p}</button>
            ))}
          </div>
        </section>

        <section className="filter-section">
          <h2 className="filter-label">シーン</h2>
          <div className="chips">
            {SCENES.map((s) => (
              <button
                key={s}
                className={`chip ${scene === s ? 'active' : ''}`}
                onClick={() => setScene(scene === s ? '' : s)}
              >{s}</button>
            ))}
          </div>
        </section>

        <section className="filter-section">
          <h2 className="filter-label">人数</h2>
          <div className="party-input-row">
            <input
              className="datetime-input party-input"
              type="number"
              min="1"
              max="99"
              placeholder="指定なし"
              value={partySize}
              onChange={(e) => {
                const v = e.target.value
                if (v === '') { setPartySize(''); return }
                const n = Math.min(99, Math.max(1, parseInt(v) || 1))
                setPartySize(n)
              }}
            />
            <span className="party-unit">人</span>
          </div>
        </section>

        <section className="filter-section">
          <h2 className="filter-label">予算（1人あたり）</h2>
          <div className="datetime-row">
            <div className="datetime-field">
              <label className="datetime-label">下限</label>
              <select
                className="datetime-input"
                value={budgetMin}
                onChange={(e) => setBudgetMin(e.target.value)}
              >
                <option value="">指定なし</option>
                {BUDGET_STEPS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
            <div className="datetime-field" style={{ alignSelf: 'flex-end', paddingBottom: '0.55rem', color: '#555', fontSize: '0.85rem' }}>
              〜
            </div>
            <div className="datetime-field">
              <label className="datetime-label">上限</label>
              <select
                className="datetime-input"
                value={budgetMax}
                onChange={(e) => setBudgetMax(e.target.value)}
              >
                <option value="">上限なし</option>
                {BUDGET_STEPS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>
        </section>

        <button className="search-btn" onClick={handleSearch}>
          探す
        </button>
      </main>
    </div>
  )
}
