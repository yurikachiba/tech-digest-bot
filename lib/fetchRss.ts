import Parser from "rss-parser";

export type RssArticle = {
  title: string;
  link: string;
  publishedAt: Date;
  contentSnippet?: string;
};

const parser = new Parser({
  timeout: 10000,
});

const AI_KEYWORDS = [
  "AI", "人工知能", "機械学習", "深層学習", "ディープラーニング",
  "LLM", "GPT", "Claude", "Gemini", "ChatGPT", "生成AI",
  "OpenAI", "Anthropic", "大規模言語モデル", "自然言語処理", "NLP",
  "ニューラルネットワーク", "Transformer", "プロンプト", "RAG",
  "ファインチューニング", "embedding", "ベクトル検索", "Agent",
  "Copilot", "Llama", "Mistral", "Stable Diffusion", "画像生成",
];

function matchesAIKeywords(text: string): boolean {
  const lowerText = text.toLowerCase();
  return AI_KEYWORDS.some((keyword) =>
    lowerText.includes(keyword.toLowerCase())
  );
}

export async function fetchRecentArticles(
  rssUrl: string,
  hoursAgo: number = 24,
  filterByAI: boolean = false
): Promise<RssArticle[]> {
  const feed = await parser.parseURL(rssUrl);
  const cutoffTime = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);

  const articles: RssArticle[] = [];

  for (const item of feed.items) {
    const pubDate = item.pubDate || item.isoDate;
    if (!pubDate) continue;

    const publishedAt = new Date(pubDate);
    if (publishedAt < cutoffTime) continue;

    if (!item.title || !item.link) continue;

    // AIキーワードフィルタリング
    if (filterByAI) {
      const textToCheck = `${item.title} ${item.contentSnippet || ""}`;
      if (!matchesAIKeywords(textToCheck)) continue;
    }

    articles.push({
      title: item.title,
      link: item.link,
      publishedAt,
      contentSnippet: item.contentSnippet || item.content?.slice(0, 500),
    });
  }

  return articles.sort(
    (a, b) => b.publishedAt.getTime() - a.publishedAt.getTime()
  );
}
