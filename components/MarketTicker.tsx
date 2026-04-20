"use client";

export interface Quote {
  symbol: string;
  price: number;
  change: number;
  changePct: number;
  currency: string;
}

const LABELS: Record<string, string> = {
  "^GSPC": "S&P 500",
  "^N225": "日経225",
  "USDJPY=X": "USD/JPY",
};

function formatPrice(price: number, symbol: string, currency: string): string {
  if (symbol === "USDJPY=X") {
    return price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  if (currency === "JPY") {
    return price.toLocaleString("ja-JP", { maximumFractionDigits: 0 });
  }
  return price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function MarketTicker({ quotes }: { quotes: Quote[] }) {
  if (quotes.length === 0) return null;

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 mb-5 scrollbar-hide">
      {quotes.map((q) => {
        const positive = q.change >= 0;
        const label = LABELS[q.symbol] ?? q.symbol;
        return (
          <div
            key={q.symbol}
            className="flex items-center gap-2.5 bg-white rounded-xl px-3.5 py-2 border border-gray-100 shrink-0 shadow-sm"
          >
            <span className="text-xs font-medium text-gray-400">{label}</span>
            <span className="text-sm font-bold text-gray-900 tabular-nums">
              {formatPrice(q.price, q.symbol, q.currency)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
