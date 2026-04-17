"use client";

export type Signal = "Bullish" | "Bearish" | "Neutral";
type Lang = "en" | "ja";

interface SignalBadgeProps {
  signal: Signal;
  lang?: Lang;
}

const styles: Record<Signal, string> = {
  Bullish: "bg-[#EAF3DE] text-[#3B6D11]",
  Bearish: "bg-[#FCEBEB] text-[#A32D2D]",
  Neutral: "bg-[#F1EFE8] text-[#5F5E5A]",
};

const labels: Record<Lang, Record<Signal, string>> = {
  en: { Bullish: "Bullish", Bearish: "Bearish", Neutral: "Neutral" },
  ja: { Bullish: "強気", Bearish: "弱気", Neutral: "中立" },
};

export default function SignalBadge({ signal, lang = "en" }: SignalBadgeProps) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${styles[signal]}`}>
      {labels[lang][signal]}
    </span>
  );
}
