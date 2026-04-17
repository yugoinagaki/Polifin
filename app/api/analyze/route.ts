import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

const SYSTEM_PROMPT_EN = `You are a financial analyst specializing in geopolitics and macroeconomics.
Analyze the provided news articles and assess their likely impact on financial markets.

For each article, evaluate:
1. S&P 500 (US broad market)
2. Nikkei 225 (Japanese broad market)
3. Any specific companies explicitly mentioned in the article (maximum 2 companies per article)

Rules:
- signal must be exactly one of: "Bullish", "Bearish", or "Neutral"
- reason must be 2-3 sentences in English, written for a sophisticated investor audience
- Only include companies that are explicitly named in the article text
- If no companies are mentioned, return an empty array for "companies"
- Respond ONLY with valid JSON. No markdown, no backticks, no explanation outside the JSON.

Response format:
{
  "results": [
    {
      "title": "<article title>",
      "sp500": { "signal": "Bullish|Bearish|Neutral", "reason": "..." },
      "nikkei225": { "signal": "Bullish|Bearish|Neutral", "reason": "..." },
      "companies": [
        { "name": "Company Name", "signal": "Bullish|Bearish|Neutral", "reason": "..." }
      ]
    }
  ]
}`;

const SYSTEM_PROMPT_JA = `あなたは地政学とマクロ経済を専門とする金融アナリストです。
提供されたニュース記事を分析し、金融市場への影響を評価してください。

各記事について以下を評価してください：
1. S&P 500（米国株式市場全体）
2. 日経225（日本株式市場全体）
3. 記事中に明示的に言及されている企業（最大2社まで）

ルール：
- signal は必ず "Bullish"、"Bearish"、"Neutral" のいずれかにしてください（英語のまま）
- reason は日本語で2〜3文、高度な投資家向けに記述してください
- translatedTitle は記事タイトルの自然な日本語訳を記述してください
- 記事本文に明示的に名前が出ている企業のみを含めてください
- 企業が言及されていない場合は "companies" に空配列を返してください
- 有効なJSONのみで応答してください。マークダウン、バッククォート、JSON外の説明は不要です。

レスポンス形式：
{
  "results": [
    {
      "title": "<元の記事タイトル>",
      "translatedTitle": "<記事タイトルの日本語訳>",
      "sp500": { "signal": "Bullish|Bearish|Neutral", "reason": "日本語の理由..." },
      "nikkei225": { "signal": "Bullish|Bearish|Neutral", "reason": "日本語の理由..." },
      "companies": [
        { "name": "企業名", "signal": "Bullish|Bearish|Neutral", "reason": "日本語の理由..." }
      ]
    }
  ]
}`;

interface Article {
  title: string;
  description: string;
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey === "your_anthropic_api_key_here") {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
  }

  let articles: Article[];
  let lang: string = "en";
  try {
    const body = await req.json();
    articles = body.articles;
    lang = body.lang === "ja" ? "ja" : "en";
    if (!Array.isArray(articles) || articles.length === 0) {
      return NextResponse.json({ error: "No articles provided" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const systemPrompt = lang === "ja" ? SYSTEM_PROMPT_JA : SYSTEM_PROMPT_EN;

  const userMessage =
    lang === "ja"
      ? `以下の${articles.length}件のニュース記事を分析してください：\n\n${articles
          .map(
            (a, i) => `記事${i + 1}：\nタイトル：${a.title}\n説明：${a.description ?? "（説明なし）"}`
          )
          .join("\n\n")}`
      : `Analyze the following ${articles.length} news article${articles.length > 1 ? "s" : ""}:\n\n${articles
          .map(
            (a, i) => `Article ${i + 1}:\nTitle: ${a.title}\nDescription: ${a.description ?? "(no description)"}`
          )
          .join("\n\n")}`;

  try {
    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    });

    const rawText = message.content[0].type === "text" ? message.content[0].text : "";
    const cleaned = rawText.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned);
    return NextResponse.json(parsed);
  } catch (err) {
    console.error("Claude API error:", err);
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}
