/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Background hierarchy
        'bg-void': '#08080a',
        'bg-base': '#0c0c0e',
        'bg-raised': '#111113',
        'bg-surface': '#161618',
        'bg-elevated': '#1c1c1f',
        'bg-hover': '#222225',

        // Status colors
        'healthy': '#22c55e',
        'at-risk': '#f59e0b',
        'critical': '#ef4444',

        // Risk heatmap colors
        'risk-war': '#ef4444',
        'risk-earthquake': '#f97316',
        'risk-storm': '#06b6d4',
        'risk-political': '#a855f7',
        'risk-tariff': '#eab308',
      },
      fontFamily: {
        sans: ['IBM Plex Sans', 'system-ui', 'sans-serif'],
        mono: ['IBM Plex Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
