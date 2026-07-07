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
          glow: 'rgba(99, 102, 241, 0.15)',
        },
        secondary: {
          DEFAULT: '#06B6D4',
        },
        bgBase: '#0B0F17',
        bgSurface: 'rgba(22, 28, 45, 0.7)',
        borderGlow: 'rgba(99, 102, 241, 0.25)',
      }
    },
  },
  plugins: [],
}
