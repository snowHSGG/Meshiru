import { useNavigate } from 'react-router-dom'
import BrandLogo from '../components/BrandLogo'

export default function PrivacyPage() {
  const navigate = useNavigate()
  return (
    <div className="page">
      <header className="header">
        <BrandLogo onClick={() => navigate('/')} />
      </header>
      <main style={{ maxWidth: '720px', margin: '0 auto', padding: '3rem 2rem 6rem', color: '#ccc', lineHeight: 1.9 }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f0f0f0', marginBottom: '2rem' }}>プライバシーポリシー</h1>

        <p style={{ color: '#666', fontSize: '0.85rem', marginBottom: '2.5rem' }}>最終更新日：2026年5月9日</p>

        <section style={{ marginBottom: '2rem' }}>
          <h2 style={h2}>1. 基本方針</h2>
          <p>meshishirube（以下「本サービス」）は、ユーザーのプライバシーを尊重し、個人情報の適切な取り扱いに努めます。</p>
        </section>

        <section style={{ marginBottom: '2rem' }}>
          <h2 style={h2}>2. 収集する情報</h2>
          <p>本サービスは、会員登録やアカウント作成を必要とせず、氏名・メールアドレスなどの個人情報を収集・保存しません。</p>
          <p style={{ marginTop: '0.75rem' }}>ただし、以下の情報をサービス提供のために一時的に利用します。</p>
          <ul style={ul}>
            <li><strong style={{ color: '#f0f0f0' }}>位置情報</strong>：「現在地を使う」を選択した場合、ブラウザのGeolocation APIを通じて現在地の緯度・経度を取得します。この情報はお店の検索にのみ使用し、サーバーに保存しません。</li>
            <li><strong style={{ color: '#f0f0f0' }}>検索条件</strong>：入力されたジャンル・エリア・予算等の検索条件は、検索結果の表示にのみ使用し、保存しません。</li>
          </ul>
        </section>

        <section style={{ marginBottom: '2rem' }}>
          <h2 style={h2}>3. 外部サービスの利用</h2>
          <p>本サービスは以下の外部APIを利用しており、各サービスのプライバシーポリシーが適用されます。</p>
          <ul style={ul}>
            <li><strong style={{ color: '#f0f0f0' }}>Google Maps Platform / Places API</strong>（Google LLC）：地図表示および店舗情報の取得に使用します。</li>
            <li><strong style={{ color: '#f0f0f0' }}>ホットペッパーグルメサーチAPI</strong>（株式会社リクルート）：店舗情報・予約リンクの取得に使用します。</li>
          </ul>
        </section>

        <section style={{ marginBottom: '2rem' }}>
          <h2 style={h2}>4. Cookieおよびアクセス解析</h2>
          <p>本サービスはCookieを使用しません。</p>
          <p style={{ marginTop: '0.75rem' }}>アクセス状況の把握を目的として、<strong style={{ color: '#f0f0f0' }}>Vercel Analytics</strong>（Vercel Inc.）を導入しています。Vercel Analyticsはクッキーレスで動作し、個人を特定できる情報は収集しません。ページビュー数および訪問者数の集計にのみ使用します。詳細はVercelの<a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" style={{ color: '#a78bfa' }}>プライバシーポリシー</a>をご参照ください。</p>
        </section>

        <section style={{ marginBottom: '2rem' }}>
          <h2 style={h2}>5. 情報の第三者提供</h2>
          <p>本サービスは、法令に基づく場合を除き、取得した情報を第三者に提供しません。</p>
        </section>

        <section style={{ marginBottom: '2rem' }}>
          <h2 style={h2}>6. ポリシーの変更</h2>
          <p>本ポリシーは、サービスの変更等に伴い予告なく更新することがあります。最新版をこのページにて公開します。</p>
        </section>

        <section style={{ marginBottom: '2rem' }}>
          <h2 style={h2}>7. お問い合わせ</h2>
          <p>プライバシーに関するお問い合わせは、以下までご連絡ください。</p>
          <p style={{ marginTop: '0.5rem', color: '#888' }}>メール：chinkumeraripa0417@gmail.com</p>
        </section>
      </main>
    </div>
  )
}

const h2 = {
  fontSize: '1rem',
  fontWeight: 600,
  color: '#f0f0f0',
  marginBottom: '0.75rem',
}

const ul = {
  paddingLeft: '1.25rem',
  marginTop: '0.75rem',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.5rem',
}
