/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        wf: {
          primary: '#1a1a2e',
          accent: '#6c63ff',
          success: '#00c853',
          warning: '#ff9100',
          danger: '#ff1744',
          surface: '#16213e',
          muted: '#94a3b8',
        }
      }
    },
  },
  plugins: [],
}
