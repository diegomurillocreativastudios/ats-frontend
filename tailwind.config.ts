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
        'ats-grafito': '#202124',
        'ats-terracotta': {
          DEFAULT: '#A45C40',
          hover: '#8E4E36',
          foreground: '#FBFAF7',
        },
        'ats-cobre': {
          DEFAULT: '#B87333',
          hover: '#9A6329',
          light: '#D4A574',
          foreground: '#FBFAF7',
        },
        'ats-arena': '#EAE0D5',
        'ats-cobre-light': '#D4A574',
        'ats-terracotta-soft': '#E8C4B8',
        'vo-purple': {
          DEFAULT: '#A45C40',
          hover: '#8E4E36',
          foreground: '#FBFAF7',
        },
        'vo-magenta': {
          DEFAULT: '#B87333',
          hover: '#9A6329',
          foreground: '#FBFAF7',
        },
        'vo-navy': {
          DEFAULT: '#202124',
          foreground: '#FBFAF7',
        },
        'vo-sky': {
          DEFAULT: '#EAE0D5',
          foreground: '#202124',
        },
        'vo-pink': {
          DEFAULT: '#A45C40',
          hover: '#8E4E36',
          foreground: '#FBFAF7',
        },
        'vo-yellow': {
          DEFAULT: '#B87333',
          foreground: '#202124',
        },
        'vo-cobre': {
          DEFAULT: '#B87333',
          hover: '#9A6329',
          foreground: '#FBFAF7',
        },
        border: '#EAE0D5',
        input: '#EAE0D5',
        ring: '#A45C40',
        background: '#FBFAF7',
        foreground: '#202124',
        card: {
          DEFAULT: '#FBFAF7',
          foreground: '#202124',
        },
        muted: {
          DEFAULT: '#EAE0D5',
          foreground: '#48494C',
        },
        destructive: {
          DEFAULT: '#A45C40',
          foreground: '#FBFAF7',
        },
        success: {
          DEFAULT: '#B87333',
          foreground: '#FBFAF7',
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
        DEFAULT: '6px',
      },
      keyframes: {
        'apply-shimmer': {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(400%)' },
        },
      },
      animation: {
        'apply-shimmer': 'apply-shimmer 1.45s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}

export default config
