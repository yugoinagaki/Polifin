"use client";

import SignalBadge, { Signal } from "./SignalBadge";

type Lang = "en" | "ja";

interface CompanySignal {
  name: string;
  signal: Signal;
  reason: string;
}

interface MarketSignal {
  signal: Signal;
  reason: string;
}

interface Article {
  title: string;
  description: string;
  url: string;
  source: { name: string };
  publishedAt: string;
}

interface Analysis {
  title: string;
  translatedTitle?: string;
  sp500: MarketSignal;
  nikkei225: MarketSignal;
  companies: CompanySignal[];
}

interface NewsCardProps {
  article: Article;
  analysis: Analysis | null;
  analysisError: boolean;
  lang: Lang;
}

function timeAgo(publishedAt: string, lang: Lang): string {
  const diffMs = Date.now() - new Date(publishedAt).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return lang === "ja" ? "たった今" : "just now";
  if (mins < 60) return lang === "ja" ? `${mins}分前` : `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return lang === "ja" ? `${hours}時間前` : `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return lang === "ja" ? `${days}日前` : `${days}d ago`;
}

const UI = {
  en: { unavailable: "Analysis unavailable" },
  ja: { unavailable: "分析不可" },
};

export default function NewsCard({ article, analysis, analysisError, lang }: NewsCardProps) {
  const displayTitle =
    lang === "ja" && analysis?.translatedTitle ? analysis.translatedTitle : article.title;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-5">
        <p className="text-xs text-gray-400 mb-1.5">
          {article.source.name} · {timeAgo(article.publishedAt, lang)}
        </p>
        <a
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-base font-semibold text-gray-900 leading-snug hover:text-[#378ADD] transition-colors"
        >
          {displayTitle}
        </a>
      </div>

      <div className="border-t border-gray-100">
        {analysisError ? (
          <div className="px-5 py-4 text-sm text-gray-400 italic">{UI[lang].unavailable}</div>
        ) : analysis ? (
          <>
            {/* S&P 500 */}
            <div className="px-5 py-4">
              <div className="flex items-center gap-2.5 mb-1.5">
                <span className="text-sm font-medium text-gray-600 w-24 shrink-0">S&P 500</span>
                <SignalBadge signal={analysis.sp500.signal} lang={lang} />
              </div>
              <p className="text-sm text-gray-500 leading-relaxed">{analysis.sp500.reason}</p>
            </div>

            <div className="border-t border-gray-50 mx-5" />

            {/* Nikkei 225 */}
            <div className="px-5 py-4">
              <div className="flex items-center gap-2.5 mb-1.5">
                <span className="text-sm font-medium text-gray-600 w-24 shrink-0">Nikkei 225</span>
                <SignalBadge signal={analysis.nikkei225.signal} lang={lang} />
              </div>
              <p className="text-sm text-gray-500 leading-relaxed">{analysis.nikkei225.reason}</p>
            </div>

            {/* Companies */}
            {analysis.companies.length > 0 && (
              <>
                <div className="border-t border-gray-50 mx-5" />
                {analysis.companies.slice(0, 2).map((company) => (
                  <div key={company.name} className="px-5 py-4">
                    <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
                      <span className="text-xs font-medium bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                        {company.name}
                      </span>
                      <SignalBadge signal={company.signal} lang={lang} />
                    </div>
                    <p className="text-sm text-gray-500 leading-relaxed">{company.reason}</p>
                  </div>
                ))}
              </>
            )}
          </>
        ) : (
          <div className="px-5 py-4">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="h-4 w-16 bg-gray-100 rounded animate-pulse" />
              <div className="h-5 w-16 bg-gray-100 rounded-full animate-pulse" />
            </div>
            <div className="space-y-1.5">
              <div className="h-3 w-full bg-gray-100 rounded animate-pulse" />
              <div className="h-3 w-4/5 bg-gray-100 rounded animate-pulse" />
            </div>
            <div className="mt-3 flex items-center gap-2.5 mb-3">
              <div className="h-4 w-20 bg-gray-100 rounded animate-pulse" />
              <div className="h-5 w-16 bg-gray-100 rounded-full animate-pulse" />
            </div>
            <div className="space-y-1.5">
              <div className="h-3 w-full bg-gray-100 rounded animate-pulse" />
              <div className="h-3 w-3/4 bg-gray-100 rounded animate-pulse" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
