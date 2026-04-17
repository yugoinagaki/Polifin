import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: "#378ADD",
        bullish: {
          bg: "#EAF3DE",
          text: "#3B6D11",
        },
        bearish: {
          bg: "#FCEBEB",
          text: "#A32D2D",
        },
        neutral: {
          bg: "#F1EFE8",
          text: "#5F5E5A",
        },
      },
    },
  },
  plugins: [],
};
export default config;
