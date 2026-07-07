# 検索コスト削減 設計書(レビュー用ドラフト)

作成: 2026-07-07(snowカンパニー 戦略層 Claude / Fable)
状態: **提案のみ・未実装**。実装は snow のレビュー承認後、検証環境(モック→Vercel Preview)を
経てから本番に入れる。検索結果の内容・順位に影響する変更はすべて snow の事前レビュー対象。

## 背景(2026年5月実績)

- `Text Search Enterprise + Atmosphere`: 7,636回 ≈ ¥42,026(約¥5.5/回)← 最大要因
- `Place Details Photos`: 6,287回 ≈ ¥5,841
- 合計 ≈ ¥48,000/月。収益ゼロ。
- 現状の防御: 日次上限(SearchText 50/日 等)、`SEARCH_DISABLED`、IPレート制限。

## 現状コードの要点(api/search.js)

- `FIELD_MASK` に `rating` / `userRatingCount` / `priceLevel`(= **Atmosphere系**)と
  `servesLunch` / `servesDinner` / `regularOpeningHours`(= Enterprise系)を含む
  → 1回の Text Search が最上位SKU(Enterprise+Atmosphere)で課金される。
- 検索条件は `normalizeFilters()` で正規化済み(center/radius/genre/priceLevels/scene/excludes)
  → **そのままキャッシュキーに使える良い構造**。
- レート制限は `globalThis` の Map(ウォーム間で共有)→ 同じ仕組みでキャッシュも持てる。

## 施策(効果が大きい順)

### 施策1: 検索レスポンスの共有キャッシュ(本命。想定削減 50〜80%)

同一条件の再検索で Google を叩かない。**インフラ追加ゼロ**の2段構え:

- **L1: サーバレス関数内キャッシュ**(`globalThis` の Map、rateBuckets と同じ手法)
  - キー: `normalizeFilters()` 結果の正規化JSON(座標は小数3桁≈110mに丸め、radiusはバケット化)
  - 値: Google レスポンスの必要部分。TTL 24h。サイズ上限(例: 200エントリ、LRU)。
  - コールドスタートで消えるが、実装10行程度でリスク極小。まずここから。
- **L2: Vercel エッジキャッシュ**(効果大、要設計判断)
  - 現在 `/api/search` は POST。**GET 化(または GET の别エンドポイント追加)**して
    `Cache-Control: s-maxage=86400, stale-while-revalidate=3600` を返すと、
    Vercel の CDN が**全ユーザー横断で**レスポンスを共有キャッシュする。追加費用なし。
  - クエリ文字列は正規化キー(丸め済み座標等)を使い、キーの発散を防ぐ。
  - 注意: GET 化は呼び出し側(src 側)の変更を伴う → snow レビュー必須ポイント。

**規約の確認事項(実装前に必須)**: Google Maps Platform の規約はキャッシュに制限がある
(place ID は無期限可、その他フィールドは上限あり。Places API (New) は最大30日までの
一時キャッシュを許容する記述あり)。**TTL は規約上限以下(まず24h)とし、実装前に最新の
Service Specific Terms を確認して dev-log に根拠を残す。**

### 施策2: 写真コストの削減(想定削減 ¥5,841 の 6〜8割)

- 検索レスポンス内の photo name → 表示URLの解決結果を L1/L2 と同様にキャッシュ
  (photo URI は一定期間再利用可)。
- 一覧では 1店舗 1枚に制限+`loading=lazy`。詳細を開いた時だけ追加取得。

### 施策3: フィールド段階取得(SKUダウングレード。要・品質検証)

- 仮説: `rating` / `userRatingCount` / `priceLevel` を FIELD_MASK から外すと
  Atmosphere 加算が消え、1回あたり単価が下がる。
- **代替データ**: 予算感は HotPepper(無料API・併用済み)の budget で補完できる可能性。
  rating は「3件提案の並び順」にしか使っていないなら、HotPepper側情報+距離で代替検証。
- dev-log に「servesLunch/Dinner を外すと精度が落ちた」経験があるため、
  **これは検証環境での A/B 必須**(モック→Preview で同一条件の提案品質を snow が目視比較)。
  品質が落ちるなら採用しない(精度優先の原則)。

### 施策4: フロント側の発火抑制(小粒・安全)

- 検索ボタンの連打デバウンス、同一条件の再送抑止(直前条件と同じなら手元の結果を再利用)。
- ロジック変更なしでリクエスト数だけ減る。低リスク。

## 実装しない/後回しにするもの

- 外部KV(Upstash/Vercel KV): 無料枠はあるが、まず L1+L2 で足りる見込み。効果不足の時だけ再検討。
- 代替API(OSM等)への乗り換え: 提案品質への影響が大きすぎる。技術スカウトの調査対象に留める。

## 検証・展開手順(snowの原則に準拠)

1. `VITE_MOCK_SEARCH=true`(ローカルモック)でキャッシュ層のロジック単体を確認(API費用ゼロ)
2. Vercel **Preview** で実APIに対して: キャッシュヒット率・レスポンス内容の同一性を確認
   (ヒット時/ミス時で提案結果が変わらないこと)
3. **snow レビュー**: diff と Preview URL を提示。特に GET化(施策1-L2)と FIELD_MASK 変更(施策3)は
   検索結果に触るため必ず承認を得る
4. 本番反映は施策ごとに分割デプロイ(1→2→4→3 の順。3は品質検証が通った場合のみ)
5. 計測: 既存の構造化ログにキャッシュ hit/miss を追加し、Google Cloud Billing の
   SKU別推移で削減効果を月次確認(マネタイズ参謀の損益分岐レビューにも使う)

## 期待効果(概算)

- 施策1+2+4 で、同一・類似条件の再検索が多いほど効く。ヒット率50%なら **月¥48k → 約¥24k**、
  ヒット率をログで実測してから施策3の要否を判断。
- 施策3が品質を保てた場合、単価も下がり二重に効く。
