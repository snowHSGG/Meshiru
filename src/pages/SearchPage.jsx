import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import '../styles/SearchPage.css'

const GENRES = ['和食', 'イタリアン', '中華', '焼肉', 'ラーメン', '寿司', 'カフェ', '居酒屋']
const PREFERENCES = ['コスパ重視', '雰囲気重視', '接客重視', '一人OK', '個室あり', '記念日向け']
const SCENES = ['デート', '接待', '友人と', '一人飯', '家族と']
const BUDGETS = ['〜1000円', '1000〜3000円', '3000〜6000円', '6000円〜']

export default function SearchPage() {
  const navigate = useNavigate()
  const [genre, setGenre] = useState('')
  const [preferences, setPreferences] = useState([])
  const [scene, setScene] = useState('')
  const [budget, setBudget] = useState('')

  function togglePreference(p) {
    setPreferences((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    )
  }

  function handleSearch() {
    navigate('/results', { state: { genre, preferences, scene, budget } })
  }

  return (
    <div className="page">
      <header className="header">
        <span className="logo" onClick={() => navigate('/')}>Meshiru</span>
      </header>

      <main className="search-main">
        <h1 className="search-title">お店を探す</h1>

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
