import { RssArticle } from "./fetchRss";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;
const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

export async function summarizeArticle(article: RssArticle): Promise<string> {
  const prompt = `以下のテック記事を、AIエンジニア向けに100〜200文字で要約してください。
専門用語はそのまま使い、要点を端的にまとめてください。

タイトル: ${article.title}
内容: ${article.contentSnippet || "（本文なし）"}
URL: ${article.link}`;

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
      }),
    });

    if (!response.ok) {
      console.error(`Gemini API error: ${response.status}`);
      return "";
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    return text || "";
  } catch (error) {
    console.error("Summarization failed:", error);
    return "";
  }
}
