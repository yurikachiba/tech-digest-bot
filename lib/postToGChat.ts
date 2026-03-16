export type SummarizedArticle = {
  title: string;
  link: string;
  summary: string;
  blogName: string;
};

const GCHAT_WEBHOOK_URL = process.env.GCHAT_WEBHOOK_URL!;

export async function postSingleArticle(
  article: SummarizedArticle
): Promise<void> {
  const summaryText = article.summary || "（要約なし）";
  const message = `📰 *${article.blogName}*

▶ ${article.title}

${summaryText}

${article.link}`;

  const response = await fetch(GCHAT_WEBHOOK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text: message,
    }),
  });

  if (!response.ok) {
    throw new Error(`Google Chat post failed: ${response.status}`);
  }
}
