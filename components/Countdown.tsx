"use client";

interface CountdownProps {
  seconds: number;
}

export default function Countdown({ seconds }: CountdownProps) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const mm = String(mins).padStart(2, "0");
  const ss = String(secs).padStart(2, "0");
  return <span>{mm}:{ss}</span>;
}
