# tech-digest-bot

## 概要

AI系テックブログ40選のRSSを毎朝10時に巡回し、最新1記事をGemini APIで要約して、Google Chatに自動投稿するNext.jsアプリ。

---

## 技術スタック

- **フレームワーク**: Next.js（App Router）
- **言語**: TypeScript
- **要約AI**: Gemini API（gemini-2.0-flash）
- **投稿先**: Google Chat Incoming Webhook
- **定期実行**: Vercel Cron Jobs（毎朝10時）
- **パッケージ**: `rss-parser`（RSS取得）

---

## ディレクトリ構成

```
/
├── app/
│   ├── api/
│   │   ├── post-digest/
│   │   │   └── route.ts          # 手動実行用エンドポイント
│   │   └── cron/
│   │       └── post-digest/
│   │           └── route.ts      # Vercel Cron用エンドポイント
│   ├── layout.tsx
│   └── page.tsx
├── scripts/
│   └── check-rss.ts              # RSS疎通確認スクリプト（開発用）
├── lib/
│   ├── fetchRss.ts               # RSS取得・パース
│   ├── summarize.ts              # Gemini APIで要約
│   └── postToGChat.ts            # Google Chat Webhook投稿
├── data/
│   └── blogs.json                # ブログ一覧（RSSURLあり・なし両方含む）
├── vercel.json                   # Vercel Cron設定
└── .env.local
```

---

## 環境変数

```env
GEMINI_API_KEY=your_gemini_api_key
GCHAT_WEBHOOK_URL=https://chat.googleapis.com/v1/spaces/...
CRON_SECRET=任意のシークレット文字列（エンドポイント保護用）
```

---

## エンドポイント仕様

### POST /api/post-digest（手動実行用）

**認証**
- Headerに `Authorization: Bearer {CRON_SECRET}` が必要

### GET /api/cron/post-digest（Vercel Cron用）

**認証**
- Vercelが自動で `Authorization: Bearer {CRON_SECRET}` を付与

**処理フロー**

1. `blogs.json` を読み込み、`rssUrl` が存在するブログを対象にする
2. 各ブログのRSSを取得し、**過去24時間以内**の新着記事を収集
3. 全記事を新着順にソートし、**最新1件**を選択
4. Gemini APIで要約（100〜200字）
5. Google Chatに1件投稿

**レスポンス**

```json
{
  "success": true,
  "posted": 1,
  "skipped": 10,
  "errors": []
}
```

---

## 投稿フォーマット

```
📰 *ブログ名*

▶ 記事タイトル

要約文（100〜200文字）

記事URL
```

---

## ローカル開発

```bash
# 依存パッケージインストール
npm install

# 開発サーバー起動
npm run dev

# 手動でAPI実行
curl -X POST http://localhost:3000/api/post-digest \
  -H "Authorization: Bearer YOUR_CRON_SECRET"

# RSS確認スクリプト
npm run check-rss
```

---

## デプロイ

1. Vercelにデプロイ
2. 環境変数を設定:
   - `GEMINI_API_KEY`
   - `GCHAT_WEBHOOK_URL`
   - `CRON_SECRET`
3. 自動で毎朝10時（JST）に実行される

---

## エラーハンドリング方針

- 個別ブログのRSS取得失敗: スキップしてログに記録（全体を止めない）
- Gemini API失敗: 要約なしでタイトル＋URLのみ投稿
- Google Chat投稿失敗: エラーをレスポンスに含めて返す

---

## 完了条件

- [x] APIを叩くと、最新1記事がGoogle Chatに投稿される
- [x] 投稿フォーマットにタイトル・要約（100〜200字）・記事URLが含まれる
- [x] 毎朝10時にVercel Cronから自動実行される
- [x] RSSのないブログは自動スキップされる
- [x] 1日1件投稿される
