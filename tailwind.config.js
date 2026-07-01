/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          app: '#08090A',
          card: '#0E1012',
          feed: '#0a0b0c',
        },
        border: {
          subtle: '#20242A',
          dim: '#2A2E33',
          active: '#38BDF8',
        },
        status: {
          online: '#36D399',
          warning: '#E07820',
          offline: '#EF4444',
        },
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
