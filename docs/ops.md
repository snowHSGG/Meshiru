# 運用メモ

## 検索機能の一時停止

Google Cloudの無料クレジット残高が少ない場合や、アクセスが急増している場合は、Vercelの環境変数で本番検索だけを一時停止できる。

`SEARCH_DISABLED` は `VERCEL_ENV=production` のときだけ有効。Previewやローカル検証では、同じ値が混ざっても検索は停止しない。

### 停止する

Vercelの対象プロジェクトで、Environment Variablesに以下を設定する。

```text
SEARCH_DISABLED=true
```

任意で表示メッセージを変えたい場合は、以下も設定する。

```text
SEARCH_DISABLED_MESSAGE=現在アクセスが集中しています。時間をおいてからもう一度お試しください。
```

設定後、対象環境を再デプロイする。

### 再開する

`SEARCH_DISABLED` を削除するか、以下に変更して再デプロイする。

```text
SEARCH_DISABLED=false
```

### 表示される内容

検索API `/api/search` はGoogle Places APIを呼び出す前に停止し、HTTP 503で以下のようなエラーを返す。

```text
現在アクセスが集中しています。時間をおいてからもう一度お試しください。
```

これにより、Google Places APIの追加利用を止めながら、アプリ自体は表示し続けられる。

## サイト全体の一時停止表示

トップページや検索画面も含めて一時停止中の表示に切り替えたい場合は、VercelのEnvironment Variablesに以下を設定する。

```text
VITE_SITE_CLOSED=true
```

任意で表示メッセージを変えたい場合は、以下も設定する。

```text
VITE_SITE_CLOSED_MESSAGE=Google APIの無料クレジット残高が少なくなったため、検索機能を一時停止しています。再開まで少しお待ちください。
```

設定後、対象環境を再デプロイする。

再開する場合は `VITE_SITE_CLOSED=false` にするか、環境変数を削除して再デプロイする。

`/terms` と `/privacy` は閉鎖中も表示できる。

## 検索回数制限

検索API `/api/search` には、1IPごとの簡易レート制限を入れている。

```text
10分あたり5回まで
24時間あたり30回まで
```

上限を超えた場合はHTTP 429で以下のメッセージを返す。

```text
検索回数が多すぎます。少し時間をおいてから再検索してください。
```

この制限は、Google Places APIのクレジット消費を抑えるための防御策。アクセス状況に応じて `api/search.js` の `SHORT_LIMIT` と `LONG_LIMIT` を調整する。
