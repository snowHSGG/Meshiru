import { useNavigate } from 'react-router-dom'
import BrandLogo from '../components/BrandLogo'

export default function TermsPage() {
  const navigate = useNavigate()
  return (
    <div className="page">
      <header className="header">
        <BrandLogo onClick={() => navigate('/')} />
      </header>
      <main style={{ maxWidth: '720px', margin: '0 auto', padding: '3rem 2rem 6rem', color: '#ccc', lineHeight: 1.9 }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f0f0f0', marginBottom: '2rem' }}>利用規約</h1>

        <p style={{ color: '#666', fontSize: '0.85rem', marginBottom: '2.5rem' }}>最終更新日：2026年5月8日</p>

        <section style={{ marginBottom: '2rem' }}>
          <h2 style={h2}>1. 適用</h2>
          <p>本規約は、meshishirube（以下「本サービス」）の利用に関する条件を定めるものです。本サービスをご利用いただいた時点で、本規約に同意したものとみなします。</p>
        </section>

        <section style={{ marginBottom: '2rem' }}>
          <h2 style={h2}>2. サービスの内容</h2>
          <p>本サービスは、Google Maps Platform および ホットペッパーグルメサーチAPI を利用して飲食店情報を検索・表示するサービスです。掲載情報はこれらの外部サービスから取得したものであり、運営者が独自に収集・管理しているものではありません。</p>
        </section>

        <section style={{ marginBottom: '2rem' }}>
          <h2 style={h2}>3. 免責事項</h2>
          <p>運営者は以下の事項について責任を負いません。</p>
          <ul style={ul}>
            <li>掲載情報（営業時間・定休日・価格・メニュー等）の正確性・最新性</li>
            <li>本サービスの利用によって生じた損害</li>
            <li>外部サービスの障害・仕様変更によるサービスの中断・変更</li>
            <li>検索結果として表示された店舗の予約可否・席の空き状況</li>
          </ul>
          <p style={{ marginTop: '0.75rem' }}>来店前に各店舗へ直接ご確認ください。</p>
        </section>

        <section style={{ marginBottom: '2rem' }}>
          <h2 style={h2}>4. 禁止事項</h2>
          <p>ユーザーは以下の行為を行ってはなりません。</p>
          <ul style={ul}>
            <li>本サービスへの不正アクセスや過度な負荷をかける行為</li>
            <li>本サービスのコンテンツを無断で転載・商用利用する行為</li>
            <li>法令または公序良俗に反する行為</li>
          </ul>
        </section>

        <section style={{ marginBottom: '2rem' }}>
          <h2 style={h2}>5. サービスの変更・停止</h2>
          <p>運営者は、予告なく本サービスの内容を変更・停止することがあります。これによってユーザーに生じた損害について、運営者は責任を負いません。</p>
        </section>

        <section style={{ marginBottom: '2rem' }}>
          <h2 style={h2}>6. 規約の変更</h2>
          <p>本規約は必要に応じて変更することがあります。変更後の規約はこのページに掲載した時点で効力を生じます。</p>
        </section>

        <section style={{ marginBottom: '2rem' }}>
          <h2 style={h2}>7. 準拠法・管轄</h2>
          <p>本規約は日本法を準拠法とし、紛争が生じた場合は運営者の所在地を管轄する裁判所を第一審の専属的合意管轄裁判所とします。</p>
        </section>

        <section style={{ marginBottom: '2rem' }}>
          <h2 style={h2}>8. お問い合わせ</h2>
          <p style={{ color: '#888' }}>メール：chinkumeraripa0417@gmail.com</p>
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
