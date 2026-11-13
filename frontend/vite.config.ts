import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Gọi API qua cùng origin để cookie refresh token (HttpOnly, SameSite=Strict) hoạt động.
    proxy: {
      // ws: true – cho kết nối SignalR (/api/hub/...) đi qua WebSocket.
      // XOMNHO_API: trỏ sang backend khác (vd. backend kiểm thử http://localhost:5104), mặc định 5103.
      '/api': { target: process.env.XOMNHO_API ?? 'http://localhost:5103', changeOrigin: false, ws: true },
    },
  },
})
