import type { Config } from "tailwindcss"

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "ats-grafito": "#57585B",
        "ats-terracotta": {
          DEFAULT: "#6EB940",
          hover: "#549E3C",
          foreground: "#FFFFFF",
        },
        "ats-cobre": {
          DEFAULT: "#438C39",
          hover: "#337C37",
          light: "#A8D98A",
          foreground: "#FFFFFF",
        },
        "ats-arena": "#E8F5E0",
        "ats-cobre-light": "#A8D98A",
        "ats-terracotta-soft": "#D4EDCC",
        "vo-purple": {
          DEFAULT: "#6EB940",
          hover: "#549E3C",
          foreground: "#FFFFFF",
        },
        "vo-magenta": {
          DEFAULT: "#438C39",
          hover: "#337C37",
          foreground: "#FFFFFF",
        },
        "vo-navy": {
          DEFAULT: "#57585B",
          foreground: "#FFFFFF",
        },
        "vo-sky": {
          DEFAULT: "#E8F5E0",
          foreground: "#57585B",
        },
        "vo-pink": {
          DEFAULT: "#6EB940",
          hover: "#549E3C",
          foreground: "#FFFFFF",
        },
        "vo-yellow": {
          DEFAULT: "#438C39",
          foreground: "#57585B",
        },
        "vo-cobre": {
          DEFAULT: "#438C39",
          hover: "#337C37",
          foreground: "#FFFFFF",
        },
        border: "#E8F5E0",
        input: "#E8F5E0",
        ring: "#6EB940",
        background: "#FFFFFF",
        foreground: "#57585B",
        card: {
          DEFAULT: "#FFFFFF",
          foreground: "#57585B",
        },
        muted: {
          DEFAULT: "#E8F5E0",
          foreground: "#75767A",
        },
        destructive: {
          DEFAULT: "#DC2626",
          foreground: "#FFFFFF",
        },
        success: {
          DEFAULT: "#6EB940",
          foreground: "#FFFFFF",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        brand: [
          "var(--font-manrope)",
          "var(--font-inter)",
          "system-ui",
          "sans-serif",
        ],
        display: [
          "var(--font-manrope)",
          "var(--font-inter)",
          "system-ui",
          "sans-serif",
        ],
      },
      borderRadius: {
        DEFAULT: "6px",
      },
      keyframes: {
        "apply-shimmer": {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(400%)" },
        },
      },
      animation: {
        "apply-shimmer": "apply-shimmer 1.45s ease-in-out infinite",
      },
    },
  },
  plugins: [],
}

export default config
