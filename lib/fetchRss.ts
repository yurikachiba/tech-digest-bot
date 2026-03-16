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

export async function fetchRecentArticles(
  rssUrl: string,
  hoursAgo: number = 24
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
