"use client";

type Lang = "en" | "ja";

interface MarketRecapData {
  generatedAt: string;
  sp500: { change: number; changePct: number; recap: string };
  nikkei225: { change: number; changePct: number; recap: string };
  usdjpy: { change: number; changePct: number; recap: string };
}

interface MarketRecapProps {
  data: MarketRecapData | null;
  loading: boolean;
  lang: Lang;
}

const LABELS: Record<string, Record<Lang, string>> = {
  sp500: { en: "S&P 500", ja: "S&P 500" },
  nikkei225: { en: "Nikkei 225", ja: "日経225" },
  usdjpy: { en: "USD/JPY", ja: "USD/JPY" },
};

const UI = {
  en: {
    title: "Market Recap",
    subtitle: "Why did markets move today?",
    loading: "Generating AI recap...",
    updated: (t: string) => `Updated ${t}`,
    cached: "Cached · updates every 6h",
  },
  ja: {
    title: "マーケットリキャップ",
    subtitle: "今日の市場はなぜ動いたのか",
    loading: "AIがリキャップを生成中...",
    updated: (t: string) => `${t} 更新`,
    cached: "キャッシュ済み · 6時間毎に更新",
  },
};

function formatTime(isoString: string): string {
  return new Date(isoString).toLocaleTimeString("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Tokyo",
    hour12: false,
  });
}

function MarketRow({ label, data, lang }: { label: string; data: { change: number; changePct: number; recap: string }; lang: Lang }) {
  const positive = data.changePct >= 0;
  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs font-semibold text-gray-600">{label}</span>
        <span className={`text-xs font-bold tabular-nums ${positive ? "text-[#3B6D11]" : "text-[#A32D2D]"}`}>
          {positive ? "▲" : "▼"} {Math.abs(data.changePct).toFixed(2)}%
        </span>
      </div>
      <p className="text-sm text-gray-500 leading-relaxed">{data.recap}</p>
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
            <span className="text-xs text-gray-400 mt-0.5 text-right">
              {ui.updated(formatTime(data.generatedAt))} JST
            </span>
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
            <MarketRow label={LABELS.sp500[lang]} data={data.sp500} lang={lang} />
            <div className="border-t border-gray-50" />
            <MarketRow label={LABELS.nikkei225[lang]} data={data.nikkei225} lang={lang} />
            <div className="border-t border-gray-50" />
            <MarketRow label={LABELS.usdjpy[lang]} data={data.usdjpy} lang={lang} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
