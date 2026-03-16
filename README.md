# tech-digest-bot
# 仕様書：AI系テックブログ収集・要約・Gチャット自動投稿システム

## 概要

AI系テックブログ40選のRSSを毎朝10時に巡回し、新着記事をGemini APIで要約して、Google Chatに自動投稿するNext.jsアプリ。

---

## 技術スタック

- **フレームワーク**: Next.js（App Router）
- **言語**: TypeScript
- **要約AI**: Gemini API（gemini-1.5-flash 推奨）
- **投稿先**: Google Chat Incoming Webhook
- **定期実行**: n8nから毎朝10時にエンドポイントを叩く（または Vercel Cron Jobs）
- **パッケージ**: `rss-parser`（RSS取得）

---

## ディレクトリ構成

```
/
├── app/
│   └── api/
│       └── post-digest/
│           └── route.ts          # メインエンドポイント
├── scripts/
│   └── check-rss.ts              # RSS疎通確認スクリプト（開発用）
├── lib/
│   ├── fetchRss.ts               # RSS取得・パース
│   ├── summarize.ts              # Gemini APIで要約
│   └── postToGChat.ts            # Google Chat Webhook投稿
├── data/
│   └── blogs.json                # ブログ一覧（RSSURLあり・なし両方含む）
└── .env.local
```

---

## データ定義

### blogs.json（抜粋）

```json
[
  {
    "id": 1,
    "name": "Anthropic Blog",
    "siteUrl": "https://www.anthropic.com/news",
    "rssUrl": "https://www.anthropic.com/rss.xml"
  },
  {
    "id": 2,
    "name": "Google Research Blog",
    "siteUrl": "https://research.google/blog",
    "rssUrl": null
  }
]
```

`rssUrl` が `null` のブログは処理をスキップする。

---

## 環境変数

```env
GEMINI_API_KEY=your_gemini_api_key
GCHAT_WEBHOOK_URL=https://chat.googleapis.com/v1/spaces/...
CRON_SECRET=任意のシークレット文字列（エンドポイント保護用）
```

---

## エンドポイント仕様

### POST /api/post-digest

**認証**
- Headerに `Authorization: Bearer {CRON_SECRET}` が必要
- 一致しない場合は 401 を返す

**処理フロー**

1. `blogs.json` を読み込み、`rssUrl` が存在するブログを対象にする
2. 各ブログのRSSを取得し、**過去24時間以内**の新着記事を抽出
3. 新着記事が0件の場合はスキップ
4. 新着記事ごとにGemini APIで要約（100〜200字）
5. ブログ単位でGチャットにメッセージを投稿

**レスポンス**

```json
{
  "success": true,
  "posted": 5,
  "skipped": 3,
  "errors": []
}
```

---

## 各モジュールの仕様

### lib/fetchRss.ts

```typescript
type RssArticle = {
  title: string;
  link: string;
  publishedAt: Date;
  contentSnippet?: string;
};

async function fetchRecentArticles(rssUrl: string, hoursAgo?: number): Promise<RssArticle[]>
// hoursAgo のデフォルトは 24
```

- `rss-parser` を使用
- pubDate または isoDate でフィルタリング
- タイムアウト: 10秒

---

### lib/summarize.ts

```typescript
async function summarizeArticle(article: RssArticle): Promise<string>
```

**Geminiへのプロンプト（日本語）**

```
以下のテック記事を、AIエンジニア向けに100〜200文字で要約してください。
専門用語はそのまま使い、要点を端的にまとめてください。

タイトル: {title}
内容: {contentSnippet または "（本文なし）"}
URL: {link}
```

- モデル: `gemini-1.5-flash`
- API endpoint: `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent`

---

### lib/postToGChat.ts

```typescript
async function postToGChat(blogName: string, articles: SummarizedArticle[]): Promise<void>
```

**投稿フォーマット**

```
📰 *{ブログ名}* の新着記事（{件数}件）

▶ {記事タイトル}
{要約文}
{記事URL}

▶ {記事タイトル}
...
```

- 1ブログにつき1メッセージ
- 記事が多い場合（5件超）は上位5件のみ投稿

---

## RSS確認スクリプト

### scripts/check-rss.ts

```bash
npx tsx scripts/check-rss.ts
```

- blogs.json の全ブログに対してRSSの候補パスを順に叩く
- 候補パス: `/feed`, `/feed.xml`, `/rss`, `/rss.xml`, `/atom.xml`, `/index.xml`
- 結果を `rss-check-result.json` に出力

---

## n8nからの呼び出し方

n8nのHTTP Requestノード設定:

```
Method: POST
URL: https://your-app.vercel.app/api/post-digest
Headers:
  Authorization: Bearer {CRON_SECRET}
Schedule: 0 10 * * * (毎朝10時)
```

---

## エラーハンドリング方針

- 個別ブログのRSS取得失敗: スキップしてログに記録（全体を止めない）
- Gemini API失敗: 要約なしでタイトル＋URLのみ投稿
- Gチャット投稿失敗: エラーをレスポンスに含めて返す

---

## 完了条件

- [ ] `POST /api/post-digest` を叩くと、新着記事がGチャットに投稿される
- [ ] 投稿フォーマットにタイトル・要約（100〜200字）・投稿日時・記事URLが含まれる
- [ ] 毎朝10時にn8n（またはVercel Cron）から自動実行される
- [ ] RSSのないブログは自動スキップされる
- [ ] 1ブログあたり最大5件まで投稿される

---

## 備考

- ブログ40選の一覧は `data/blogs.json` に格納。`rssUrl` はcheck-rss.tsの実行結果を反映させること
- Gemini APIキーは塩見さんから取得済み
- GチャットのWebhook URLはGoogle Chat管理画面から発行
