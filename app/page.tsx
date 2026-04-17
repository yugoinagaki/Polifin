"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import NewsCard from "@/components/NewsCard";
import Countdown from "@/components/Countdown";

const REFRESH_INTERVAL = 3600;

type Lang = "en" | "ja";

interface Article {
  title: string;
  description: string;
  url: string;
  source: { name: string };
  publishedAt: string;
}

type Signal = "Bullish" | "Bearish" | "Neutral";

interface CompanySignal {
  name: string;
  signal: Signal;
  reason: string;
}

interface MarketSignal {
  signal: Signal;
  reason: string;
}

interface Analysis {
  title: string;
  translatedTitle?: string;
  sp500: MarketSignal;
  nikkei225: MarketSignal;
  companies: CompanySignal[];
}

const UI: Record<Lang, {
  loading: string;
  updated: (t: string) => string;
  nextUpdate: string;
  refresh: string;
  newsError: string;
}> = {
  en: {
    loading: "Loading...",
    updated: (t) => `Updated ${t} JST`,
    nextUpdate: "Next update in",
    refresh: "Refresh now",
    newsError: "Failed to load news. Please try again.",
  },
  ja: {
    loading: "読み込み中...",
    updated: (t) => `${t} JST 更新`,
    nextUpdate: "次の更新まで",
    refresh: "今すぐ更新",
    newsError: "ニュースの読み込みに失敗しました。もう一度お試しください。",
  },
};

function formatJST(date: Date): string {
  return date.toLocaleTimeString("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Tokyo",
    hour12: false,
  });
}

export default function Home() {
  const [lang, setLang] = useState<Lang>("en");
  const langRef = useRef<Lang>("en");

  const [articles, setArticles] = useState<Article[]>([]);
  const [analyses, setAnalyses] = useState<(Analysis | null)[]>([]);
  const [analysisErrors, setAnalysisErrors] = useState<boolean[]>([]);
  const [newsError, setNewsError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL);

  const lastFetchRef = useRef<number>(0);
  const articlesRef = useRef<Article[]>([]);
  const analysesCacheRef = useRef<Partial<Record<Lang, (Analysis | null)[]>>>({});
  const analysesErrorsCacheRef = useRef<Partial<Record<Lang, boolean[]>>>({});

  const runAnalysis = useCallback(async (arts: Article[], language: Lang) => {
    setAnalysisLoading(true);
    setAnalyses([]);
    setAnalysisErrors([]);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          articles: arts.map((a) => ({ title: a.title, description: a.description })),
          lang: language,
        }),
      });
      if (!res.ok) throw new Error("analyze failed");
      const data = await res.json();
      if (data.results && Array.isArray(data.results)) {
        const matched: (Analysis | null)[] = arts.map((_, i) => data.results[i] ?? null);
        const errors: boolean[] = arts.map((_, i) => !data.results[i]);
        analysesCacheRef.current[language] = matched;
        analysesErrorsCacheRef.current[language] = errors;
        setAnalyses(matched);
        setAnalysisErrors(errors);
      } else {
        const errors = arts.map(() => true);
        analysesErrorsCacheRef.current[language] = errors;
        setAnalysisErrors(errors);
      }
    } catch {
      const errors = arts.map(() => true);
      analysesErrorsCacheRef.current[language] = errors;
      setAnalysisErrors(errors);
    } finally {
      setAnalysisLoading(false);
    }
  }, []);

  const fetchAndAnalyze = useCallback(async () => {
    const language = langRef.current;
    setLoading(true);
    setNewsError(false);
    setArticles([]);
    setAnalyses([]);
    setAnalysisErrors([]);
    analysesCacheRef.current = {};
    analysesErrorsCacheRef.current = {};
    lastFetchRef.current = Date.now();
    setCountdown(REFRESH_INTERVAL);

    let fetchedArticles: Article[] = [];
    try {
      const res = await fetch("/api/news");
      if (!res.ok) throw new Error("news fetch failed");
      fetchedArticles = await res.json();
      if (!Array.isArray(fetchedArticles)) throw new Error("bad response");
      articlesRef.current = fetchedArticles;
      setArticles(fetchedArticles);
    } catch {
      setNewsError(true);
      setLoading(false);
      return;
    }

    setUpdatedAt(new Date());
    setLoading(false);
    await runAnalysis(fetchedArticles, language);
  }, [runAnalysis]);

  const handleLangChange = useCallback(async (newLang: Lang) => {
    langRef.current = newLang;
    setLang(newLang);

    if (articlesRef.current.length === 0) return;

    const cached = analysesCacheRef.current[newLang];
    if (cached) {
      setAnalyses(cached);
      setAnalysisErrors(analysesErrorsCacheRef.current[newLang] ?? []);
      return;
    }

    await runAnalysis(articlesRef.current, newLang);
  }, [runAnalysis]);

  // Initial fetch
  useEffect(() => {
    fetchAndAnalyze();
  }, [fetchAndAnalyze]);

  // Auto-refresh every hour
  useEffect(() => {
    const interval = setInterval(() => {
      fetchAndAnalyze();
    }, REFRESH_INTERVAL * 1000);
    return () => clearInterval(interval);
  }, [fetchAndAnalyze]);

  // Countdown ticker
  useEffect(() => {
    const ticker = setInterval(() => {
      const elapsed = Math.floor((Date.now() - lastFetchRef.current) / 1000);
      setCountdown(Math.max(0, REFRESH_INTERVAL - elapsed));
    }, 1000);
    return () => clearInterval(ticker);
  }, []);

  // Visibility change: re-fetch if tab was hidden > 1 hour
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        const elapsed = (Date.now() - lastFetchRef.current) / 1000;
        if (elapsed >= REFRESH_INTERVAL) fetchAndAnalyze();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [fetchAndAnalyze]);

  const ui = UI[lang];
  const isAnalyzing = analysisLoading && !loading;

  return (
    <main className="min-h-screen bg-[#F8F7F4]">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Language toggle */}
        <div className="flex justify-end mb-4">
          <div className="flex items-center gap-0.5 bg-gray-100 rounded-lg p-0.5">
            {(["en", "ja"] as Lang[]).map((l) => (
              <button
                key={l}
                onClick={() => handleLangChange(l)}
                disabled={analysisLoading}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                  lang === l
                    ? "bg-white shadow-sm text-gray-900"
                    : "text-gray-400 hover:text-gray-600"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {l === "en" ? "EN" : "日本語"}
              </button>
            ))}
          </div>
        </div>

        {/* Header */}
        <header className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              <span className="text-black">Poli</span>
              <span style={{ color: "#378ADD" }}>fin</span>
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">Where geopolitics meets markets</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">
              {updatedAt ? ui.updated(formatJST(updatedAt)) : loading ? ui.loading : "—"}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {ui.nextUpdate} <Countdown seconds={countdown} />
            </p>
          </div>
        </header>

        {/* Content */}
        {newsError ? (
          <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6 text-center text-sm text-gray-400">
            {ui.newsError}
          </div>
        ) : loading && articles.length === 0 ? (
          <div className="space-y-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <div className="h-3 w-24 bg-gray-100 rounded animate-pulse mb-2" />
                <div className="h-4 w-full bg-gray-100 rounded animate-pulse mb-1" />
                <div className="h-4 w-3/4 bg-gray-100 rounded animate-pulse" />
              </div>
            ))}
          </div>
        ) : (
          <>
            {isAnalyzing && (
              <p className="text-xs text-center text-gray-400 mb-3 animate-pulse">
                {lang === "ja" ? "翻訳・分析中..." : "Analyzing..."}
              </p>
            )}
            <div className="space-y-4">
              {articles.map((article, i) => (
                <NewsCard
                  key={article.url}
                  article={article}
                  analysis={analyses[i] ?? null}
                  analysisError={analysisErrors[i] ?? false}
                  lang={lang}
                />
              ))}
            </div>
          </>
        )}

        {/* Footer */}
        <footer className="mt-8 flex justify-center">
          <button
            onClick={fetchAndAnalyze}
            disabled={loading || analysisLoading}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#378ADD] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span className="text-base">↻</span>
            {ui.refresh}
          </button>
        </footer>
      </div>
    </main>
  );
}
