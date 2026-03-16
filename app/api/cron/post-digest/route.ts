import { NextRequest, NextResponse } from "next/server";
import { fetchRecentArticles, RssArticle } from "@/lib/fetchRss";
import { summarizeArticle } from "@/lib/summarize";
import { postSingleArticle } from "@/lib/postToGChat";
import blogs from "@/data/blogs.json";

type Blog = {
  id: number;
  name: string;
  siteUrl: string;
  rssUrl: string | null;
};

type ArticleWithBlog = RssArticle & { blogName: string };

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results = {
    success: true,
    posted: 0,
    skipped: 0,
    errors: [] as string[],
  };

  const allArticles: ArticleWithBlog[] = [];

  for (const blog of blogs as Blog[]) {
    if (!blog.rssUrl) {
      results.skipped++;
      continue;
    }

    try {
      const articles = await fetchRecentArticles(blog.rssUrl);
      for (const article of articles) {
        allArticles.push({ ...article, blogName: blog.name });
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      results.errors.push(`${blog.name}: ${errorMessage}`);
    }
  }

  allArticles.sort(
    (a, b) => b.publishedAt.getTime() - a.publishedAt.getTime()
  );

  const latestArticle = allArticles[0];

  if (!latestArticle) {
    results.skipped++;
    return NextResponse.json({ ...results, message: "No new articles" });
  }

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
