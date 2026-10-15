import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  base: '/Planner/',
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: '生活规划',
        short_name: '生活规划',
        description: '个人生活规划工具 — 本地优先、免订阅',
        theme_color: '#3d5afe',
        background_color: '#f6f7f9',
        display: 'standalone',
        orientation: 'any',
        start_url: '/Planner/',
        scope: '/Planner/',
        icons: [
          { src: 'pwa-192.svg', sizes: '192x192', type: 'image/svg+xml' },
          { src: 'pwa-512.svg', sizes: '512x512', type: 'image/svg+xml' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallback: '/Planner/index.html'
      }
    })
  ],
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 1200
  },
  server: {
    host: '127.0.0.1',
    port: 5173
  }
})
