import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom'
import SearchPage from './pages/SearchPage'
import ResultsPage from './pages/ResultsPage'
import PrivacyPage from './pages/PrivacyPage'
import TermsPage from './pages/TermsPage'
import NotFoundPage from './pages/NotFoundPage'
import BrandLogo from './components/BrandLogo'
import './App.css'

const SITE_CLOSED = import.meta.env.VITE_SITE_CLOSED === 'true'
const SITE_CLOSED_MESSAGE = import.meta.env.VITE_SITE_CLOSED_MESSAGE
  ?? 'Google APIの無料クレジット残高が少なくなったため、検索機能を一時停止しています。再開まで少しお待ちください。'

function ClosedPage() {
  return (
    <div className="page">
      <header className="header">
        <BrandLogo />
      </header>
      <main className="hero hero-closed">
        <h1 className="hero-title">
          <BrandLogo size="hero" />
        </h1>
        <p className="closed-label">一時停止中</p>
        <p className="closed-message">{SITE_CLOSED_MESSAGE}</p>
        <p className="closed-note">
          予想以上に多くの方に使っていただき、運用コストの見直しをしています。
        </p>
      </main>
      <footer className="footer">
        <a className="footer-link" href="/terms">利用規約</a>
        <a className="footer-link" href="/privacy">プライバシーポリシー</a>
      </footer>
    </div>
  )
}

function TopPage() {
  const navigate = useNavigate()
  return (
    <div className="page">
      <header className="header">
        <BrandLogo />
      </header>
      <main className="hero">
        <h1 className="hero-title">
          <BrandLogo size="hero" />
        </h1>
        <p className="hero-desc">エリアとジャンルを選ぶだけで、評価の高い3店をすぐ提案。</p>
        <button className="hero-btn" onClick={() => navigate('/search')}>お店を探す</button>
      </main>
      <footer className="footer">
        <a className="footer-link" href="/terms">利用規約</a>
        <a className="footer-link" href="/privacy">プライバシーポリシー</a>
      </footer>
    </div>
  )
}

export default function App() {
  if (SITE_CLOSED) {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="*" element={<ClosedPage />} />
        </Routes>
      </BrowserRouter>
    )
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<TopPage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/results" element={<ResultsPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  )
}
