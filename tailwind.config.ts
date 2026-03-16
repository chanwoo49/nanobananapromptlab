import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        banana: {
          50: "#FFFEF5",
          100: "#FFF9D6",
          200: "#FFF0A3",
          300: "#FFE566",
          400: "#FFD633",
          500: "#F5C842",
          600: "#E8A020",
          700: "#C47A10",
          800: "#8B5A0A",
          900: "#4A3005",
        },
        lab: {
          bg: "#08080A",
          surface: "#111114",
          card: "#16161A",
          border: "#222228",
          muted: "#555560",
          text: "#E0E0E8",
        },
      },
      fontFamily: {
        display: ['"Outfit"', "sans-serif"],
        mono: ['"JetBrains Mono"', "monospace"],
        body: ['"Noto Sans KR"', "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
