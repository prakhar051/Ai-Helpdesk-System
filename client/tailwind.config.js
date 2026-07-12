/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#6366F1',
          hover: '#4F46E5',
          glow: 'rgba(99, 102, 241, 0.08)',
        },
        secondary: {
          DEFAULT: '#06B6D4',
        },
        bgBase: '#F8FAFC',
        bgSecondary: '#F1F5F9',
        bgSurface: '#FFFFFF',
        borderDefault: '#E2E8F0',
        textPrimary: '#0F172A',
        textSecondary: '#334155',
        textMuted: '#64748B',
        textDisabled: '#94A3B8',
        borderGlow: 'rgba(99, 102, 241, 0.12)',
      }
    },
  },
  plugins: [],
}
