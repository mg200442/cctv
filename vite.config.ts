import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api': 'http://localhost:3001',
      '/stream': 'http://localhost:3001',
      '/snapshot': 'http://localhost:3001',
      '/recordings': 'http://localhost:3001',
    },
  },
})
