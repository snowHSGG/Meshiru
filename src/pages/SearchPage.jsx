import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import '../styles/SearchPage.css'

const GENRES = ['和食', 'イタリアン', '中華', '焼肉', 'ラーメン', '寿司', 'カフェ', '居酒屋']
const PREFERENCES = ['コスパ重視', '雰囲気重視', '接客重視', '一人OK', '個室あり', '記念日向け']
const SCENES = ['デート', '接待', '友人と', '一人飯', '家族と']
const BUDGETS = ['〜1000円', '1000〜3000円', '3000〜6000円', '6000円〜']

const MEAL_TIMES = ['ランチ', 'ディナー']

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

export default function SearchPage() {
  const navigate = useNavigate()
  const [genre, setGenre] = useState('')
  const [preferences, setPreferences] = useState([])
  const [scene, setScene] = useState('')
  const [budget, setBudget] = useState('')
  const [mealTime, setMealTime] = useState('')
  const [locMode, setLocMode] = useState('area') // 'current' | 'area'
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
      state: { genre, preferences, scene, budget, mealTime, locMode, area },
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
            >
              現在地を使う
            </button>
            <button
              className={`loc-btn ${locMode === 'area' ? 'active' : ''}`}
              onClick={() => { setLocMode('area'); setGeoError('') }}
            >
              エリアを選ぶ
            </button>
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

        {/* ランチ・ディナー */}
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
          <h2 className="filter-label">予算</h2>
          <div className="chips">
            {BUDGETS.map((b) => (
              <button
                key={b}
                className={`chip ${budget === b ? 'active' : ''}`}
                onClick={() => setBudget(budget === b ? '' : b)}
              >{b}</button>
            ))}
          </div>
        </section>

        <button className="search-btn" onClick={handleSearch}>
          探す
        </button>
      </main>
    </div>
  )
}
