import { NextRequest, NextResponse } from "next/server";
import { fetchRecentArticles, RssArticle } from "@/lib/fetchRss";
import { summarizeArticle } from "@/lib/summarize";
import { postSingleArticle } from "@/lib/postToGChat";
import blogs from "@/data/blogs.json";

const CRON_SECRET = process.env.CRON_SECRET;

type Blog = {
  id: number;
  name: string;
  siteUrl: string;
  rssUrl: string | null;
  filter?: boolean;
};

type ArticleWithBlog = RssArticle & { blogName: string };

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");

  if (token !== CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results = {
    success: true,
    posted: 0,
    skipped: 0,
    errors: [] as string[],
  };

  // 全ブログから記事を収集
  const allArticles: ArticleWithBlog[] = [];

  for (const blog of blogs as Blog[]) {
    if (!blog.rssUrl) {
      results.skipped++;
      continue;
    }

    try {
      const articles = await fetchRecentArticles(
        blog.rssUrl,
        24,
        blog.filter || false
      );
      for (const article of articles) {
        allArticles.push({ ...article, blogName: blog.name });
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      results.errors.push(`${blog.name}: ${errorMessage}`);
    }
  }

  // 新着順にソートして最新1件を取得
  allArticles.sort(
    (a, b) => b.publishedAt.getTime() - a.publishedAt.getTime()
  );

  const latestArticle = allArticles[0];

  if (!latestArticle) {
    results.skipped++;
    return NextResponse.json({ ...results, message: "No new articles" });
  }

  // 要約して投稿
  try {
    const summary = await summarizeArticle(latestArticle);
    await postSingleArticle({
      title: latestArticle.title,
      link: latestArticle.link,
      summary,
      blogName: latestArticle.blogName,
    });
    results.posted = 1;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    results.errors.push(`Post failed: ${errorMessage}`);
  }

  return NextResponse.json(results);
}
