import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // ローカル開発（npm run dev）時、/api を Express サーバー(3000)へ転送する
  server: {
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
})
