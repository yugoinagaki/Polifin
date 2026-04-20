"use client";

type Lang = "en" | "ja";

interface MarketRecapData {
  generatedAt: string;
  sp500: { changePct: number; recap: string };
  nikkei225: { changePct: number; recap: string };
  usdjpy: { changePct: number; recap: string };
}

interface MarketRecapProps {
  data: MarketRecapData | null;
  loading: boolean;
  lang: Lang;
}

const UI = {
  en: {
    title: "Market Recap",
    subtitle: "Why did markets move today?",
    loading: "Generating AI recap...",
    updated: (t: string) => `Updated ${t}`,
    note: "Prev. close · updates every 6h",
  },
  ja: {
    title: "マーケットリキャップ",
    subtitle: "今日の市場はなぜ動いたのか",
    loading: "AIがリキャップを生成中...",
    updated: (t: string) => `${t} 更新`,
    note: "前日比 · 6時間毎に更新",
  },
};

const ROWS: { sym: keyof Omit<MarketRecapData, "generatedAt">; label: Record<Lang, string> }[] = [
  { sym: "sp500",    label: { en: "S&P 500",    ja: "S&P 500" } },
  { sym: "nikkei225",label: { en: "Nikkei 225", ja: "日経225" } },
  { sym: "usdjpy",   label: { en: "USD/JPY",    ja: "USD/JPY" } },
];

function formatTime(isoString: string): string {
  return new Date(isoString).toLocaleTimeString("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Tokyo",
    hour12: false,
  });
}

function MarketRow({ label, changePct, recap }: { label: string; changePct: number; recap: string }) {
  const positive = changePct >= 0;
  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs font-semibold text-gray-600">{label}</span>
        <span className={`text-xs font-bold tabular-nums ${positive ? "text-[#3B6D11]" : "text-[#A32D2D]"}`}>
          {positive ? "▲" : "▼"} {Math.abs(changePct).toFixed(2)}%
        </span>
      </div>
      <p className="text-sm text-gray-500 leading-relaxed">{recap}</p>
    </div>
  );
}

export default function MarketRecap({ data, loading, lang }: MarketRecapProps) {
  const ui = UI[lang];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-5">
      <div className="px-5 py-4 border-b border-gray-100">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-sm font-bold text-gray-900">{ui.title}</h2>
            <p className="text-xs text-gray-400 mt-0.5">{ui.subtitle}</p>
          </div>
          {data && (
            <div className="text-right">
              <p className="text-xs text-gray-400">{ui.updated(formatTime(data.generatedAt))} JST</p>
              <p className="text-xs text-gray-300 mt-0.5">{ui.note}</p>
            </div>
          )}
        </div>
      </div>

      <div className="px-5 py-4">
        {loading && !data ? (
          <div className="space-y-3">
            <div className="animate-pulse space-y-2">
              <div className="h-3 w-20 bg-gray-100 rounded" />
              <div className="h-3 w-full bg-gray-100 rounded" />
              <div className="h-3 w-4/5 bg-gray-100 rounded" />
            </div>
            <p className="text-xs text-gray-400 animate-pulse">{ui.loading}</p>
          </div>
        ) : data ? (
          <div className="space-y-4">
            {ROWS.map(({ sym, label }, i) => (
              <div key={sym}>
                {i > 0 && <div className="border-t border-gray-50 mb-4" />}
                <MarketRow
                  label={label[lang]}
                  changePct={data[sym].changePct}
                  recap={data[sym].recap}
                />
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
