import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom'
import SearchPage from './pages/SearchPage'
import ResultsPage from './pages/ResultsPage'
import PrivacyPage from './pages/PrivacyPage'
import TermsPage from './pages/TermsPage'
import './App.css'

function TopPage() {
  const navigate = useNavigate()
  return (
    <div className="page">
      <header className="header">
        <span className="logo">Meshiru</span>
      </header>
      <main className="hero">
        <h1 className="hero-title">Meshiru</h1>
        <p className="hero-sub">迷わない。あなたのためのベスト３。</p>
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
      </Routes>
    </BrowserRouter>
  )
}
