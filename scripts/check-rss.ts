import Parser from "rss-parser";
import * as fs from "fs";
import * as path from "path";

type Blog = {
  id: number;
  name: string;
  siteUrl: string;
  rssUrl: string | null;
};

type CheckResult = {
  id: number;
  name: string;
  siteUrl: string;
  rssUrl: string | null;
  status: "ok" | "failed" | "skipped";
  foundUrl?: string;
  error?: string;
};

const RSS_CANDIDATES = [
  "/feed",
  "/feed.xml",
  "/rss",
  "/rss.xml",
  "/atom.xml",
  "/index.xml",
  "/feed/",
  "/rss/",
];

const parser = new Parser({
  timeout: 10000,
});

async function checkRssUrl(url: string): Promise<boolean> {
  try {
    await parser.parseURL(url);
    return true;
  } catch {
    return false;
  }
}

async function findRssUrl(siteUrl: string): Promise<string | null> {
  const baseUrl = siteUrl.replace(/\/$/, "");

  for (const candidate of RSS_CANDIDATES) {
    const testUrl = baseUrl + candidate;
    console.log(`  Trying: ${testUrl}`);
    if (await checkRssUrl(testUrl)) {
      return testUrl;
    }
  }

  return null;
}

async function main() {
  const blogsPath = path.join(__dirname, "../data/blogs.json");
  const blogs: Blog[] = JSON.parse(fs.readFileSync(blogsPath, "utf-8"));

  const results: CheckResult[] = [];

  for (const blog of blogs) {
    console.log(`\nChecking: ${blog.name}`);

    if (blog.rssUrl) {
      // 既存のRSS URLをチェック
      const isValid = await checkRssUrl(blog.rssUrl);
      if (isValid) {
        console.log(`  ✓ Existing RSS URL is valid`);
        results.push({
          ...blog,
          status: "ok",
        });
      } else {
        console.log(`  ✗ Existing RSS URL failed, searching...`);
        const foundUrl = await findRssUrl(blog.siteUrl);
        if (foundUrl) {
          console.log(`  ✓ Found: ${foundUrl}`);
          results.push({
            ...blog,
            status: "ok",
            foundUrl,
          });
        } else {
          console.log(`  ✗ No RSS found`);
          results.push({
            ...blog,
            status: "failed",
            error: "Existing URL invalid, no alternative found",
          });
        }
      }
    } else {
      // RSS URLがない場合、候補を探す
      console.log(`  Searching for RSS...`);
      const foundUrl = await findRssUrl(blog.siteUrl);
      if (foundUrl) {
        console.log(`  ✓ Found: ${foundUrl}`);
        results.push({
          ...blog,
          status: "ok",
          foundUrl,
        });
      } else {
        console.log(`  ✗ No RSS found`);
        results.push({
          ...blog,
          status: "skipped",
        });
      }
    }
  }

  // 結果を出力
  const outputPath = path.join(__dirname, "../rss-check-result.json");
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`\n\nResults saved to: ${outputPath}`);

  // サマリー
  const ok = results.filter((r) => r.status === "ok").length;
  const failed = results.filter((r) => r.status === "failed").length;
  const skipped = results.filter((r) => r.status === "skipped").length;
  console.log(`\nSummary: ${ok} OK, ${failed} Failed, ${skipped} Skipped`);
}

main().catch(console.error);
