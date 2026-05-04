import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { searchRestaurants } from '../api/places'
import '../styles/ResultsPage.css'

const PRICE_LABELS = {
  PRICE_LEVEL_INEXPENSIVE: '¥',
  PRICE_LEVEL_MODERATE: '¥¥',
  PRICE_LEVEL_EXPENSIVE: '¥¥¥',
  PRICE_LEVEL_VERY_EXPENSIVE: '¥¥¥¥',
}

export default function ResultsPage() {
  const navigate = useNavigate()
  const { state } = useLocation()
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    searchRestaurants(state ?? {})
      .then(setResults)
      .catch(() => setError('検索に失敗しました。'))
      .finally(() => setLoading(false))
  }, [])

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

        <div className="cards">
          {results.map((place, i) => (
            <div className="card" key={i}>
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
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
