/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        dark: {
          bg:      '#080C14',
          surface: '#0D1424',
          panel:   '#0A0F1A',
          input:   '#161B22',
          border:  '#21262D',
          card:    '#1E2D4A',
          chart:   '#090D16',
          bar:     '#1A2030',
        },
        brand: {
          blue:  '#2F81F7',
          lblue: '#4A9EFF',
          red:   '#F85149',
          amber: '#D29922',
          green: '#3FB950',
        },
        txt: {
          primary: '#E6EDF3',
          muted:   '#8B949E',
        },
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
}
