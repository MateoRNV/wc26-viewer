/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        pitch: '#0b6e4f',
        'pitch-dark': '#08533c',
        qualify: '#16a34a',
        eliminate: '#475569',
      },
    },
  },
  plugins: [],
};
