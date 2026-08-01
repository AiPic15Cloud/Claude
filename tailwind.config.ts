import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#0a0a0b",
        surface: "#111113",
        raised: "#17171a",
        border: "#232326",
        line: "#2a2a2e",
        ink: "#e8e8ea",
        muted: "#8b8b93",
        faint: "#5c5c63",
        accent: "#c9a86a",
        risk: {
          low: "#3f7d5c",
          medium: "#b8863f",
          high: "#a5473b",
        },
      },
      fontFamily: {
        sans: [
          "Söhne",
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "sans-serif",
        ],
        serif: ["Tiempos", "Georgia", "serif"],
        mono: ["Berkeley Mono", "SFMono-Regular", "Menlo", "monospace"],
      },
      fontSize: {
        micro: ["0.6875rem", { lineHeight: "1rem", letterSpacing: "0.04em" }],
      },
      borderRadius: {
        DEFAULT: "6px",
      },
    },
  },
  plugins: [],
};

export default config;
