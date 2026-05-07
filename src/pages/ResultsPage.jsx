import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { APIProvider, Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps'
import { searchRestaurants, getPhotoUrl, geocodeArea } from '../api/places'
import AreaAutocomplete from '../components/AreaAutocomplete'
import { GENRES, PREFERENCES, SCENES, MEAL_TIMES, HOURS, BUDGET_STEPS, RADIUS_OPTIONS, todayStr } from '../constants/search'
import '../styles/ResultsPage.css'
import '../styles/SearchPage.css'

const API_KEY = import.meta.env.VITE_GOOGLE_PLACES_API_KEY

const GOOGLE_PRICE_RANGE = {
  PRICE_LEVEL_INEXPENSIVE:    '〜¥1,000',
  PRICE_LEVEL_MODERATE:       '¥1,000〜¥3,000',
  PRICE_LEVEL_EXPENSIVE:      '¥3,000〜¥6,000',
  PRICE_LEVEL_VERY_EXPENSIVE: '¥6,000〜',
}

const RANK_COLORS = ['#c9a227', '#8a8a8a', '#a0522d']

function buildHotpepperUrl(baseUrl, visitDate, visitTime) {
  if (!baseUrl) return null
  const params = new URLSearchParams()
  if (visitDate) params.set('vd', visitDate.replace(/-/g, ''))
  if (visitTime) params.set('vt', visitTime.replace(':', ''))
  const query = params.toString()
  return query ? `${baseUrl}?${query}` : baseUrl
}

export default function ResultsPage() {
  const navigate = useNavigate()
  const { state } = useLocation()

  const [genre, setGenre] = useState(state?.genre ?? '')
  const [preferences, setPreferences] = useState(state?.preferences ?? [])
  const [scene, setScene] = useState(state?.scene ?? '')
  const [budgetMin, setBudgetMin] = useState(state?.budgetMin ?? '')
  const [budgetMax, setBudgetMax] = useState(state?.budgetMax ?? '')
  const [partySize, setPartySize] = useState(state?.partySize ?? '')
  const [mealTime, setMealTime] = useState(state?.mealTime ?? '')
  const [visitDate, setVisitDate] = useState(state?.visitDate ?? '')
  const [visitTime, setVisitTime] = useState(state?.visitTime ?? '')
  const [locMode, setLocMode] = useState(state?.locMode ?? 'area')
  const [area, setArea] = useState(state?.area ?? null)
  const [areaText, setAreaText] = useState(state?.areaText ?? '')
  const [geoError, setGeoError] = useState('')
  const [geoLoading, setGeoLoading] = useState(false)
  const [excludes, setExcludes] = useState(state?.excludes ?? [])
  const [excludeInput, setExcludeInput] = useState('')
  const [radius, setRadius] = useState(state?.radius ?? 1000)

  const [results, setResults] = useState([])
  const [searchCenter, setSearchCenter] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selected, setSelected] = useState(null)

  function runSearch(filters) {
    setLoading(true)
    setError(null)
    setSelected(null)
    searchRestaurants(filters)
      .then(({ places, center }) => { setResults(places); setSearchCenter(center) })
      .catch(() => setError('検索に失敗しました。'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    runSearch({ genre, preferences, scene, budgetMin, budgetMax, partySize, mealTime, visitDate, visitTime, locMode, area, excludes, radius })
  }, [])

  async function handleResearch() {
    let resolvedArea = area
    if (locMode === 'area' && areaText.trim() && !resolvedArea) {
      setGeoLoading(true)
      resolvedArea = await geocodeArea(areaText.trim())
      setGeoLoading(false)
      if (!resolvedArea) {
        setGeoError('場所が見つかりませんでした。')
        return
      }
      setArea(resolvedArea)
      setGeoError('')
    }
    runSearch({ genre, preferences, scene, budgetMin, budgetMax, partySize, mealTime, visitDate, visitTime, locMode, area: resolvedArea, excludes, radius })
  }

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
        setGeoError('位置情報の取得に失敗しました。')
        setLocMode('area')
      }
    )
  }


  const mapCenter = results[0]?.location
    ? { lat: results[0].location.latitude, lng: results[0].location.longitude }
    : (area ? { lat: area.lat, lng: area.lng } : { lat: 35.6762, lng: 139.6503 })

  const mapKey = results.map((r) => r.googleMapsUri).join(',')

  return (
    <div className="page">
      <header className="header">
        <span className="logo" onClick={() => navigate('/')}>Meshiru</span>
      </header>

      <div className="results-layout">

        {/* ── 左: フィルターサイドバー ── */}
        <aside className="results-sidebar">

          <section className="filter-section">
            <h2 className="filter-label">エリア</h2>
            <div className="loc-toggle">
              <button
                className={`loc-btn ${locMode === 'current' ? 'active' : ''}`}
                onClick={switchToCurrentLocation}
              >現在地</button>
              <button
                className={`loc-btn ${locMode === 'area' ? 'active' : ''}`}
                onClick={() => { setLocMode('area'); setGeoError('') }}
              >エリア</button>
            </div>
            {geoLoading && <p className="geo-status">検索中...</p>}
            {geoError && <p className="geo-error">{geoError}</p>}
            {locMode === 'current' && !geoLoading && !geoError && (
              <p className="geo-status">現在地を使用</p>
            )}
            {locMode === 'area' && (
              <AreaAutocomplete
                value={areaText}
                onChange={(text) => { setAreaText(text); setGeoError('') }}
                onSelect={(resolved) => setArea(resolved)}
                placeholder="駅名・地名・市区町村など"
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
            <div className="datetime-field" style={{ marginTop: '0.5rem' }}>
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
            <h2 className="filter-label">こだわり <span className="filter-note">複数可</span></h2>
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
            <div className="datetime-field" style={{ marginTop: '0.5rem' }}>
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

          <button className="search-btn sidebar-search-btn" onClick={handleResearch}>
            再検索
          </button>

        </aside>

        {/* ── 中央: 結果カード ── */}
        <div className="results-content">
          <div className="results-header">
            <h1 className="results-title">おすすめ 3 選</h1>
            <button className="back-btn" onClick={() => navigate('/search')}>最初から</button>
          </div>

          {(visitDate || visitTime) && (
            <p className="visit-datetime">
              {visitDate && `📅 ${visitDate}`}{visitTime && `　🕐 ${visitTime}`}
              <span className="visit-datetime-note">　※営業時間で絞り込み済み（席の空き状況は各リンク先でご確認ください）</span>
            </p>
          )}

          {loading && <p className="results-status">検索中...</p>}
          {error && <p className="results-status">{error}</p>}
          {!loading && !error && results.length === 0 && (
            <p className="results-status">条件に合うお店が見つかりませんでした。</p>
          )}
          <div className="cards">
            {results.map((place, i) => {
              const priceRange = place.hotpepperBudget
                ?? (place.priceLevel ? GOOGLE_PRICE_RANGE[place.priceLevel] : null)

              return (
                <div
                  key={i}
                  className={`card ${selected === i ? 'card-selected' : ''}`}
                  onClick={() => setSelected(i)}
                >
                  {place.photos?.[0] && (
                    <img
                      className="card-photo"
                      src={getPhotoUrl(place.photos[0].name)}
                      alt={place.displayName?.text}
                    />
                  )}
                  <div className="card-inner">
                    <div className="card-rank">#{i + 1}</div>
                    <div className="card-body">
                      <h2 className="card-name">{place.displayName?.text}</h2>
                      <div className="card-meta">
                        <span className="card-rating">★ {place.rating?.toFixed(1)}</span>
                        <span className="card-count">({place.userRatingCount?.toLocaleString()}件)</span>
                        {place.primaryTypeDisplayName && (
                          <span className="card-type">{place.primaryTypeDisplayName.text}</span>
                        )}
                        {!place.priceVerified && (
                          <span className="card-badge-unverified">価格未確認</span>
                        )}
                      </div>
                      {priceRange && (
                        <p className="card-price-range">{priceRange} / 人</p>
                      )}
                      {(place.editorialSummary || place.hotpepperCatch) && (
                        <p className="card-summary">
                          {place.editorialSummary?.text ?? place.hotpepperCatch}
                        </p>
                      )}
                      <p className="card-address">{place.formattedAddress}</p>
                      <div className="card-links">
                        {place.hotpepperUrl && (
                          <a
                            className="card-link card-link-reserve"
                            href={buildHotpepperUrl(place.hotpepperUrl, visitDate, visitTime)}
                            target="_blank"
                            rel="noreferrer"
                          >
                            予約・クーポン →
                          </a>
                        )}
                        {place.websiteUri && (
                          <a className="card-link" href={place.websiteUri} target="_blank" rel="noreferrer">
                            公式サイト →
                          </a>
                        )}
                        {place.googleMapsUri && (
                          <a className="card-link card-link-maps" href={place.googleMapsUri} target="_blank" rel="noreferrer">
                            Google Maps →
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── 右: 地図（固定表示） ── */}
        <div className="results-map-panel">
          <APIProvider apiKey={API_KEY}>
            <Map
              key={mapKey}
              defaultCenter={mapCenter}
              defaultZoom={14}
              mapId="meshiru-map"
              style={{ width: '100%', height: '100%' }}
            >
              {searchCenter && (
                <AdvancedMarker position={{ lat: searchCenter.lat, lng: searchCenter.lng }}>
                  <Pin background="#1a73e8" borderColor="#1557b0" glyphColor="#fff" glyph="★" />
                </AdvancedMarker>
              )}
              {results.map((place, i) => (
                place.location && (
                  <AdvancedMarker
                    key={i}
                    position={{ lat: place.location.latitude, lng: place.location.longitude }}
                    onClick={() => setSelected(i)}
                  >
                    <Pin background={RANK_COLORS[i]} borderColor={RANK_COLORS[i]} glyphColor="#fff" />
                  </AdvancedMarker>
                )
              ))}
            </Map>
          </APIProvider>
        </div>

      </div>
    </div>
  )
}
