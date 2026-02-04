/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
    './app/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        'vo-purple': {
          DEFAULT: '#6E3385',
          hover: '#5A2A6D',
          foreground: '#FFFFFF',
        },
        'vo-magenta': {
          DEFAULT: '#9C2B82',
          hover: '#7D2168',
          foreground: '#FFFFFF',
        },
        'vo-navy': {
          DEFAULT: '#496FB3',
          foreground: '#FFFFFF',
        },
        'vo-sky': {
          DEFAULT: '#71BCED',
          foreground: '#FFFFFF',
        },
        'vo-pink': {
          DEFAULT: '#C73277',
          hover: '#A02961',
          foreground: '#FFFFFF',
        },
        'vo-yellow': {
          DEFAULT: '#E6AC4B',
          foreground: '#1F2937',
        },
        border: '#E5E7EB',
        input: '#E5E7EB',
        ring: '#6E3385',
        background: '#FFFFFF',
        foreground: '#0D0D0D',
        muted: {
          DEFAULT: '#F9FAFB',
          foreground: '#6B7280',
        },
        destructive: {
          DEFAULT: '#C73277',
          foreground: '#FFFFFF',
        },
        success: {
          DEFAULT: '#22C55E',
          foreground: '#FFFFFF',
        },
      },
      fontFamily: {
        'grotesk': ['Space Grotesk', 'sans-serif'],
        'inter': ['Inter', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '6px',
      },
    },
  },
  plugins: [],
}
