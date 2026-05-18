/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: '#1e1e1e',
        foreground: '#e8e8e8',
        card: '#2a2a2a',
        border: '#444',
        muted: '#999',
        accent: '#4ade80',
        destructive: '#f87171',
      },
    },
  },
  plugins: [],
};
