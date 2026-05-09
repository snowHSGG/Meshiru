import { useNavigate } from 'react-router-dom'
import BrandLogo from '../components/BrandLogo'

export default function NotFoundPage() {
  const navigate = useNavigate()
  return (
    <div className="page">
      <header className="header">
        <BrandLogo onClick={() => navigate('/')} />
      </header>
      <main className="hero">
        <h1 className="hero-title" style={{ fontSize: '4rem' }}>404</h1>
        <p className="hero-sub">ページが見つかりませんでした。</p>
        <button className="hero-btn" onClick={() => navigate('/')}>トップへ戻る</button>
      </main>
    </div>
  )
}
