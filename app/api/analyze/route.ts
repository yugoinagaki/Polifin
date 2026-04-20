import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

const SYSTEM_PROMPT_EN = `You are a senior geopolitical risk analyst at a top-tier macro hedge fund.

STEP 1 — SELECT: From the provided articles, choose the 3 with the highest potential to move financial markets. Exclude articles that are purely domestic politics with no cross-border economic effect, or events with only local scope.

STEP 2 — ANALYZE each selected article through the following institutional frameworks:
- Risk-On / Risk-Off: Does this trigger flight to safety (JPY, Gold, Treasuries) or increase risk appetite?
- Fed Policy Transmission: Does this affect US inflation expectations, rate path, or USD strength?
- Supply Chain & Trade Flows: Are commodities, semiconductors, energy, shipping routes, or trade volumes affected?
- Sector Rotation: Which S&P 500 sectors (Defense, Energy, Tech, Financials, Healthcare, Industrials) benefit or suffer?
- Japan Nexus: How does this affect BOJ policy expectations, JPY, or Japanese export industries?

Rules:
- signal must be exactly one of: "Bullish", "Bearish", or "Neutral"
- For usdjpy: "Bullish" means USD strengthens (USD/JPY rate rises), "Bearish" means USD weakens / JPY strengthens (USD/JPY rate falls)
- impactScore must be an integer 1–5:
    1 = Minimal (background noise, unlikely to move markets)
    2 = Low (minor sentiment shift, <0.3% index move expected)
    3 = Moderate (notable event, 0.3–1% index move)
    4 = High (significant catalyst, >1% index move potential)
    5 = Critical (systemic shock, comparable to historic macro events)
- reason must be 3–4 sentences citing specific transmission mechanisms. Avoid vague statements. Reference sectors, instruments, or economic variables where possible.
- ticker: the primary stock exchange ticker for the company (e.g. "NVDA", "7203.T", "005930.KS"), or null if uncertain
- Only include companies explicitly named in the article (max 2 per article)
- articleIndex: the 0-based index of the article you selected from the input list
- Respond ONLY with valid JSON. No markdown, no backticks, no text outside the JSON.

Response format:
{
  "results": [
    {
      "articleIndex": <integer>,
      "title": "<article title>",
      "sp500": { "signal": "Bullish|Bearish|Neutral", "impactScore": 1-5, "reason": "..." },
      "nikkei225": { "signal": "Bullish|Bearish|Neutral", "impactScore": 1-5, "reason": "..." },
      "usdjpy": { "signal": "Bullish|Bearish|Neutral", "impactScore": 1-5, "reason": "..." },
      "companies": [
        { "name": "Company Name", "ticker": "TICKER or null", "signal": "Bullish|Bearish|Neutral", "impactScore": 1-5, "reason": "..." }
      ]
    }
  ]
}`;

const SYSTEM_PROMPT_JA = `あなたは大手マクロヘッジファンドのシニア地政学リスクアナリストです。

ステップ1 — 選定：提供された記事の中から、金融市場への影響が最も大きいと判断される3件を選んでください。国内政治のみで国際経済への波及がないもの、ローカルな出来事は除外してください。

ステップ2 — 選定した各記事を以下の機関投資家フレームワークで分析してください：
- リスクオン/リスクオフ：安全資産（円・金・米国債）への逃避を引き起こすか、リスク選好を高めるか
- Fed政策波及：米国のインフレ期待・政策金利パス・ドル強度に影響するか
- サプライチェーンと貿易フロー：コモディティ・半導体・エネルギー・貿易量に影響するか
- セクターローテーション：S&P500のどのセクター（防衛・エネルギー・テック・金融・ヘルスケア等）が恩恵/打撃を受けるか
- 日本固有の影響：日銀の政策期待・円相場・日本の輸出産業への影響は何か

ルール：
- signal は必ず "Bullish"、"Bearish"、"Neutral" のいずれか（英語のまま）
- usdjpy の "Bullish" はドル高（USD/JPYレートが上昇）、"Bearish" はドル安/円高（USD/JPYレートが下落）を意味する
- impactScore は整数1〜5：
    1 = 極小（マーケットノイズレベル）
    2 = 小（軽微なセンチメント変化）
    3 = 中（注目すべきイベント）
    4 = 大（重大な触媒）
    5 = 極大（システミックショック級）
- reason は日本語で3〜4文。具体的な波及メカニズムを言及すること
- translatedTitle は記事タイトルの自然な日本語訳
- ticker：企業の主要取引所ティッカー、不確かな場合はnull
- 記事本文に明示的に名前が出ている企業のみ（最大2社）
- articleIndex：入力リストの0始まりのインデックス
- 有効なJSONのみで応答。マークダウン・バッククォート・JSON外のテキスト不要。

レスポンス形式：
{
  "results": [
    {
      "articleIndex": <整数>,
      "title": "<元の記事タイトル>",
      "translatedTitle": "<日本語訳>",
      "sp500": { "signal": "Bullish|Bearish|Neutral", "impactScore": 1-5, "reason": "日本語..." },
      "nikkei225": { "signal": "Bullish|Bearish|Neutral", "impactScore": 1-5, "reason": "日本語..." },
      "usdjpy": { "signal": "Bullish|Bearish|Neutral", "impactScore": 1-5, "reason": "日本語..." },
      "companies": [
        { "name": "企業名", "ticker": "ティッカーまたはnull", "signal": "Bullish|Bearish|Neutral", "impactScore": 1-5, "reason": "日本語..." }
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
      ? `以下の${articles.length}件の記事から、市場影響度の高い3件を選定・分析してください：\n\n${articles
          .map((a, i) => `記事${i}（インデックス${i}）：\nタイトル：${a.title}\n説明：${a.description ?? "（説明なし）"}`)
          .join("\n\n")}`
      : `From the following ${articles.length} articles, select and analyze the 3 with the highest market impact:\n\n${articles
          .map((a, i) => `Article index ${i}:\nTitle: ${a.title}\nDescription: ${a.description ?? "(no description)"}`)
          .join("\n\n")}`;

  try {
    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 3500,
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
