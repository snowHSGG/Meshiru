import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { GENRES, PREFERENCES, SCENES, MEAL_TIMES, HOURS, BUDGET_STEPS, RADIUS_OPTIONS, todayStr } from '../constants/search'
import { geocodeArea } from '../api/places'
import AreaAutocomplete from '../components/AreaAutocomplete'
import '../styles/SearchPage.css'

export default function SearchPage() {
  const navigate = useNavigate()
  const [genre, setGenre] = useState('')
  const [preferences, setPreferences] = useState([])
  const [scene, setScene] = useState('')
  const [budgetMin, setBudgetMin] = useState('')
  const [budgetMax, setBudgetMax] = useState('')
  const [partySize, setPartySize] = useState('')
  const [mealTime, setMealTime] = useState('')
  const [visitDate, setVisitDate] = useState('')
  const [visitTime, setVisitTime] = useState('')
  const [locMode, setLocMode] = useState('area')
  const [areaText, setAreaText] = useState('')
  const [area, setArea] = useState(null)
  const [geoError, setGeoError] = useState('')
  const [geoLoading, setGeoLoading] = useState(false)
  const [excludes, setExcludes] = useState([])
  const [excludeInput, setExcludeInput] = useState('')
  const [radius, setRadius] = useState(1000)

  function togglePreference(p) {
    setPreferences((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    )
  }

  function switchToCurrentLocation() {
    setLocMode('current')
    setGeoError('')
    setGeoLoading(true)
    navigator.geolocation.getCurrentPosition(
      () => setGeoLoading(false),
      () => {
        setGeoLoading(false)
        setGeoError('位置情報の取得に失敗しました。')
        setLocMode('area')
      }
    )
  }

  async function handleSearch() {
    let resolvedArea = area
    if (locMode === 'area' && areaText.trim() && !resolvedArea) {
      setGeoLoading(true)
      resolvedArea = await geocodeArea(areaText.trim())
      setGeoLoading(false)
      if (!resolvedArea) {
        setGeoError('場所が見つかりませんでした。別の名前で試してください。')
        return
      }
      setGeoError('')
    }
    navigate('/results', {
      state: { genre, preferences, scene, budgetMin, budgetMax, partySize, mealTime, visitDate, visitTime, locMode, area: resolvedArea, areaText, excludes, radius },
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
          {geoLoading && <p className="geo-status">{locMode === 'area' ? '検索中...' : '位置情報を取得中...'}</p>}
          {geoError && <p className="geo-error">{geoError}</p>}
          {locMode === 'current' && !geoLoading && !geoError && (
            <p className="geo-status">現在地を使用します</p>
          )}
          {locMode === 'area' && (
            <AreaAutocomplete
              value={areaText}
              onChange={(text) => { setAreaText(text); setGeoError('') }}
              onSelect={(resolved) => setArea(resolved)}
              placeholder="駅名・地名・市区町村など（例：梅田、札幌駅、新宿区）"
            />
          )}
        </section>

        <section className="filter-section">
          <h2 className="filter-label">検索範囲</h2>
          <div className="chips">
            {RADIUS_OPTIONS.map((r) => (
              <button
                key={r.value}
                className={`chip ${radius === r.value ? 'active' : ''}`}
                onClick={() => setRadius(r.value)}
              >{r.label}</button>
            ))}
          </div>
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

        <section className="filter-section">
          <h2 className="filter-label">除外ワード <span className="filter-note">Enterで追加</span></h2>
          <div className="exclude-input-row">
            <input
              className="datetime-input exclude-input"
              type="text"
              placeholder="例：バー、もんじゃ"
              value={excludeInput}
              onChange={(e) => setExcludeInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                  const v = excludeInput.trim()
                  if (v && !excludes.includes(v)) setExcludes((prev) => [...prev, v])
                  setExcludeInput('')
                }
              }}
            />
          </div>
          {excludes.length > 0 && (
            <div className="chips">
              {excludes.map((ex) => (
                <button
                  key={ex}
                  className="chip chip-exclude"
                  onClick={() => setExcludes((prev) => prev.filter((x) => x !== ex))}
                >{ex} ×</button>
              ))}
            </div>
          )}
        </section>

        <button className="search-btn" onClick={handleSearch}>
          探す
        </button>
      </main>
    </div>
  )
}
