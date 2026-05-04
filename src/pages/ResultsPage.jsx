import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { APIProvider, Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps'
import { searchRestaurants } from '../api/places'
import '../styles/ResultsPage.css'

const API_KEY = import.meta.env.VITE_GOOGLE_PLACES_API_KEY

const PRICE_LABELS = {
  PRICE_LEVEL_INEXPENSIVE: '¥',
  PRICE_LEVEL_MODERATE: '¥¥',
  PRICE_LEVEL_EXPENSIVE: '¥¥¥',
  PRICE_LEVEL_VERY_EXPENSIVE: '¥¥¥¥',
}

const RANK_COLORS = ['#c9a227', '#8a8a8a', '#a0522d']

export default function ResultsPage() {
  const navigate = useNavigate()
  const { state } = useLocation()
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    searchRestaurants(state ?? {})
      .then(setResults)
      .catch(() => setError('検索に失敗しました。'))
      .finally(() => setLoading(false))
  }, [])

  const hasMap = results.some((p) => p.location)

  return (
    <div className="page">
      <header className="header">
        <span className="logo" onClick={() => navigate('/')}>Meshiru</span>
      </header>

      <main className="results-main">
        <div className="results-header">
          <h1 className="results-title">おすすめ 3 選</h1>
          <button className="back-btn" onClick={() => navigate('/search')}>← 条件を変える</button>
        </div>

        {loading && <p className="results-status">検索中...</p>}
        {error && <p className="results-status">{error}</p>}
        {!loading && !error && results.length === 0 && (
          <p className="results-status">条件に合うお店が見つかりませんでした。</p>
        )}

        {hasMap && (
          <div className="map-wrapper">
            <APIProvider apiKey={API_KEY}>
              <Map
                defaultCenter={{ lat: results[0].location.latitude, lng: results[0].location.longitude }}
                defaultZoom={13}
                mapId="meshiru-map"
                style={{ width: '100%', height: '100%' }}
              >
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
        )}

        <div className="cards">
          {results.map((place, i) => (
            <div
              key={i}
              className={`card ${selected === i ? 'card-selected' : ''}`}
              onClick={() => setSelected(i)}
            >
              <div className="card-rank">#{i + 1}</div>
              <div className="card-body">
                <h2 className="card-name">{place.displayName?.text}</h2>
                <div className="card-meta">
                  <span className="card-rating">★ {place.rating?.toFixed(1)}</span>
                  <span className="card-count">({place.userRatingCount?.toLocaleString()}件)</span>
                  {place.priceLevel && (
                    <span className="card-price">{PRICE_LABELS[place.priceLevel]}</span>
                  )}
                  {place.primaryTypeDisplayName && (
                    <span className="card-type">{place.primaryTypeDisplayName.text}</span>
                  )}
                </div>
                {place.editorialSummary && (
                  <p className="card-summary">{place.editorialSummary.text}</p>
                )}
                <p className="card-address">{place.formattedAddress}</p>
                <div className="card-links">
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
          ))}
        </div>
      </main>
    </div>
  )
}
