/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        dark: {
          primary: '#0f0f0f',
          secondary: '#1a1a1a',
          tertiary: '#252525',
        },
        light: {
          primary: '#ffffff',
          secondary: '#f5f5f5',
          tertiary: '#e5e5e5',
        },
        accent: {
          green: '#22c55e',
          red: '#ef4444',
          blue: '#3b82f6',
          purple: '#8b5cf6',
        }
      },
    },
  },
  plugins: [],
}
