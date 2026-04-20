import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const revalidate = 43200; // 12h ISR cache

const client = new Anthropic();

const SYSTEM_PROMPT_EN = `You are a senior macro strategist at a top-tier hedge fund. You will be given recent market data (S&P 500, Nikkei 225, USD/JPY) and a list of major recent news headlines.

Your task: write a concise market movement recap explaining WHY each market moved the way it did over the past 24 hours. Connect specific geopolitical/economic events to observed price movements.

Rules:
- Analyze all three markets: S&P 500, Nikkei 225, USD/JPY
- For each market, explain the primary driver(s) of the move
- Reference specific news events or macro themes
- Be precise: mention sectors, currencies, or policy levers where relevant
- Keep each market section to 2-3 sentences
- Respond ONLY with valid JSON

Response format:
{
  "generatedAt": "<ISO 8601 timestamp>",
  "sp500": { "change": <number>, "changePct": <number>, "recap": "..." },
  "nikkei225": { "change": <number>, "changePct": <number>, "recap": "..." },
  "usdjpy": { "change": <number>, "changePct": <number>, "recap": "..." }
}`;

const SYSTEM_PROMPT_JA = `あなたは大手ヘッジファンドのシニアマクロストラテジストです。直近の市場データ（S&P500・日経225・USD/JPY）と主要ニュースの見出しが与えられます。

タスク：過去24時間で各市場がなぜそのように動いたのかを簡潔なマーケットリキャップとして説明してください。地政学・経済イベントと実際の価格変動を結びつけて分析してください。

ルール：
- S&P500・日経225・USD/JPYの3市場すべてを分析
- 各市場について主要な変動要因を説明
- 特定のニュースイベントやマクロテーマを引用
- セクター・通貨・政策変数など具体的に言及
- 各市場のrecapは日本語で2〜3文
- 有効なJSONのみで応答

レスポンス形式：
{
  "generatedAt": "<ISO 8601タイムスタンプ>",
  "sp500": { "change": <数値>, "changePct": <数値>, "recap": "日本語..." },
  "nikkei225": { "change": <数値>, "changePct": <数値>, "recap": "日本語..." },
  "usdjpy": { "change": <数値>, "changePct": <数値>, "recap": "日本語..." }
}`;

async function fetchQuote(symbol: string) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=5d`;
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!res.ok) return null;
  const data = await res.json();
  const result = data.chart?.result?.[0];
  if (!result) return null;
  const meta = result.meta;
  const price = meta.regularMarketPrice as number;
  const prev = (meta.previousClose ?? meta.chartPreviousClose) as number;
  if (!price || !prev) return null;
  return { symbol: meta.symbol as string, price, change: price - prev, changePct: ((price - prev) / prev) * 100, currency: meta.currency as string };
}

async function fetchHeadlines(): Promise<string[]> {
  const apiKey = process.env.NEWS_API_KEY;
  if (!apiKey) return [];
  const query = encodeURIComponent('(tariff OR sanctions OR "interest rate" OR "central bank" OR "trade war" OR "geopolitical") AND (market OR economy OR stock OR dollar)');
  const url = `https://newsapi.org/v2/everything?q=${query}&language=en&sortBy=publishedAt&pageSize=10&apiKey=${apiKey}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.articles ?? []).slice(0, 10).map((a: { title: string }) => a.title);
  } catch {
    return [];
  }
}

export async function GET(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey === "your_anthropic_api_key_here") {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
  }

  const { searchParams } = new URL(req.url);
  const lang = searchParams.get("lang") === "ja" ? "ja" : "en";

  const [spQuote, nikkeiQuote, usdJpyQuote, headlines] = await Promise.all([
    fetchQuote("%5EGSPC"),
    fetchQuote("%5EN225"),
    fetchQuote("USDJPY%3DX"),
    fetchHeadlines(),
  ]);

  const marketContext = [
    spQuote ? `S&P 500: ${spQuote.price.toFixed(2)} (${spQuote.changePct >= 0 ? "+" : ""}${spQuote.changePct.toFixed(2)}% today)` : "S&P 500: data unavailable",
    nikkeiQuote ? `Nikkei 225: ${nikkeiQuote.price.toLocaleString("ja-JP", { maximumFractionDigits: 0 })} (${nikkeiQuote.changePct >= 0 ? "+" : ""}${nikkeiQuote.changePct.toFixed(2)}% today)` : "Nikkei 225: data unavailable",
    usdJpyQuote ? `USD/JPY: ${usdJpyQuote.price.toFixed(2)} (${usdJpyQuote.changePct >= 0 ? "+" : ""}${usdJpyQuote.changePct.toFixed(2)}% today)` : "USD/JPY: data unavailable",
  ].join("\n");

  const headlinesText = headlines.length > 0
    ? headlines.map((h, i) => `${i + 1}. ${h}`).join("\n")
    : "(no recent headlines available)";

  const userMessage = lang === "ja"
    ? `現在の市場データ：\n${marketContext}\n\n直近の主要ニュース見出し：\n${headlinesText}\n\nこのデータをもとに、各市場の変動要因を分析してください。`
    : `Current market data:\n${marketContext}\n\nRecent major news headlines:\n${headlinesText}\n\nBased on this data, analyze the primary drivers of each market's movement.`;

  try {
    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1200,
      system: lang === "ja" ? SYSTEM_PROMPT_JA : SYSTEM_PROMPT_EN,
      messages: [{ role: "user", content: userMessage }],
    });

    const rawText = message.content[0].type === "text" ? message.content[0].text : "";
    const cleaned = rawText.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned);

    // Inject actual market data into response
    if (spQuote) { parsed.sp500.change = spQuote.change; parsed.sp500.changePct = spQuote.changePct; }
    if (nikkeiQuote) { parsed.nikkei225.change = nikkeiQuote.change; parsed.nikkei225.changePct = nikkeiQuote.changePct; }
    if (usdJpyQuote) { parsed.usdjpy.change = usdJpyQuote.change; parsed.usdjpy.changePct = usdJpyQuote.changePct; }
    parsed.generatedAt = new Date().toISOString();

    return NextResponse.json(parsed);
  } catch (err) {
    console.error("market-recap error:", err);
    return NextResponse.json({ error: "Recap generation failed" }, { status: 500 });
  }
}
