import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

export default defineConfig({
  base: process.env.GITHUB_ACTIONS ? '/aiox/' : '/',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Mr. Lion Stock',
        short_name: 'MrLionStock',
        description: 'Gestão de estoque Mr. Lion',
        theme_color: '#18181b',
        background_color: '#ffffff',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        icons: [
          { src: '/icon-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/v1\/products/,
            handler: 'CacheFirst',
            options: { cacheName: 'products-cache', expiration: { maxEntries: 500, maxAgeSeconds: 604800 } },
          },
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/v1\/stock_movements/,
            handler: 'NetworkFirst',
            options: { cacheName: 'movements-cache', expiration: { maxEntries: 2000, maxAgeSeconds: 86400 } },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
})
