import path from 'path';

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    path.join(__dirname, "index.html"),
    path.join(__dirname, "src/**/*.{js,ts,jsx,tsx}"),
  ],
  theme: {
    extend: {
      colors: {
        gov: {
          50: '#f0f7ff',
          100: '#e0effe',
          500: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
          gold: '#d97706',
        }
      }
    },
  },
  plugins: [],
}
