import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { GENRES, PREFERENCES, SCENES, ORDER_STYLES, MEAL_TIMES, HOURS, AREAS, BUDGET_STEPS, todayStr } from '../constants/search'
import '../styles/SearchPage.css'

export default function SearchPage() {
  const navigate = useNavigate()
  const [genre, setGenre] = useState('')
  const [preferences, setPreferences] = useState([])
  const [scene, setScene] = useState('')
  const [budgetMin, setBudgetMin] = useState('')
  const [budgetMax, setBudgetMax] = useState('')
  const [partySize, setPartySize] = useState('')
  const [orderStyle, setOrderStyle] = useState([])
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
      state: { genre, preferences, scene, budgetMin, budgetMax, partySize, orderStyle, mealTime, visitDate, visitTime, locMode, area },
    })
  }

  return (
    <div className="page">
      <header className="header">
        <span className="logo" onClick={() => navigate('/')}>Meshiru</span>
      </header>

      <main className="search-main">
        <h1 className="search-title">お店を探す</h1>

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
          <h2 className="filter-label">注文スタイル <span className="filter-note">複数選択可</span></h2>
          <div className="chips">
            {ORDER_STYLES.map((o) => (
              <button
                key={o}
                className={`chip ${orderStyle.includes(o) ? 'active' : ''}`}
                onClick={() => setOrderStyle((prev) =>
                  prev.includes(o) ? prev.filter((x) => x !== o) : [...prev, o]
                )}
              >{o}</button>
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
                setPartySize(Math.min(99, Math.max(1, parseInt(v) || 1)))
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
