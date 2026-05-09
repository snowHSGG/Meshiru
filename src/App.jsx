import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom'
import SearchPage from './pages/SearchPage'
import ResultsPage from './pages/ResultsPage'
import PrivacyPage from './pages/PrivacyPage'
import TermsPage from './pages/TermsPage'
import NotFoundPage from './pages/NotFoundPage'
import './App.css'

function TopPage() {
  const navigate = useNavigate()
  return (
    <div className="page">
      <header className="header">
        <span className="logo">meshishirube</span>
      </header>
      <main className="hero">
        <h1 className="hero-title">meshishirube</h1>
        <p className="hero-sub">迷わない。あなたのためのベスト３。</p>
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
