import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Gọi API qua cùng origin để cookie refresh token (HttpOnly, SameSite=Strict) hoạt động.
    proxy: {
      '/api': { target: 'http://localhost:5103', changeOrigin: false },
    },
  },
})
