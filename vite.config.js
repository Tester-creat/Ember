import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/Ember/',
  server: {
    proxy: {
      '/api/anikoto': {
        target: 'https://anikotoapi.site',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/anikoto/, '')
      }
    }
  }
})
