import { NextRequest, NextResponse } from "next/server";

const MARKET_SYMBOLS = ["%5EGSPC", "%5EN225", "USDJPY%3DX"]; // ^GSPC, ^N225, USDJPY=X

async function fetchQuote(symbol: string) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0" },
    next: { revalidate: 60 },
  });
  if (!res.ok) return null;
  const data = await res.json();
  const meta = data.chart?.result?.[0]?.meta;
  if (!meta) return null;
  const price = meta.regularMarketPrice as number;
  const prev = (meta.previousClose ?? meta.chartPreviousClose) as number;
  if (!price || !prev) return null;
  const change = price - prev;
  const changePct = (change / prev) * 100;
  return {
    symbol: meta.symbol as string,
    price,
    change,
    changePct,
    currency: meta.currency as string,
  };
}

export async function GET(req: NextRequest) {
  const extraParam = req.nextUrl.searchParams.get("tickers");
  const extraTickers = extraParam
    ? extraParam.split(",").filter(Boolean).slice(0, 4)
    : [];

  const allSymbols = [...MARKET_SYMBOLS, ...extraTickers];

  const results = await Promise.all(allSymbols.map(fetchQuote));
  return NextResponse.json(results.filter(Boolean));
}
