import { NextResponse } from "next/server";

export async function GET() {
  const apiKey = process.env.NEWS_API_KEY;
  if (!apiKey || apiKey === "your_newsapi_key_here") {
    return NextResponse.json({ error: "NEWS_API_KEY not configured" }, { status: 500 });
  }

  const params = new URLSearchParams({
    q: 'tariff OR Fed OR "interest rate" OR geopolitical OR "trade war" OR sanctions OR "economic security"',
    language: "en",
    sortBy: "publishedAt",
    pageSize: "3",
    apiKey,
  });

  const url = `https://newsapi.org/v2/everything?${params.toString()}`;

  try {
    const res = await fetch(url, { next: { revalidate: 0 } });
    if (!res.ok) {
      const body = await res.text();
      return NextResponse.json({ error: `NewsAPI error: ${body}` }, { status: res.status });
    }
    const data = await res.json();
    const articles = (data.articles || []).map((a: {
      title: string;
      description: string;
      url: string;
      source: { name: string };
      publishedAt: string;
    }) => ({
      title: a.title,
      description: a.description,
      url: a.url,
      source: { name: a.source?.name ?? "Unknown" },
      publishedAt: a.publishedAt,
    }));
    return NextResponse.json(articles);
  } catch (err) {
    console.error("NewsAPI fetch failed:", err);
    return NextResponse.json({ error: "Failed to fetch news" }, { status: 500 });
  }
}
