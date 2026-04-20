import { NextResponse } from "next/server";

export async function GET() {
  const apiKey = process.env.NEWS_API_KEY;
  if (!apiKey || apiKey === "your_newsapi_key_here") {
    return NextResponse.json({ error: "NEWS_API_KEY not configured" }, { status: 500 });
  }

  // Fetch 10 candidates — Claude will select the 3 most market-impactful
  const params = new URLSearchParams({
    q: '(tariff OR sanctions OR "trade war" OR "interest rate" OR "central bank" OR "Fed" OR "military" OR "conflict" OR "energy supply" OR "oil price" OR "semiconductor" OR "currency" OR "bond yield" OR "inflation" OR "GDP" OR "economic security") AND (market OR economy OR stock OR dollar OR trade OR export)',
    language: "en",
    sortBy: "publishedAt",
    pageSize: "10",
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
