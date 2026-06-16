import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: [
        'logo.svg',
        'favicon.ico',
        'apple-touch-icon-180x180.png',
        'pwa-64x64.png',
        'pwa-192x192.png',
        'pwa-512x512.png',
        'maskable-icon-512x512.png',
      ],
      workbox: {
        // Pre-cache + estrategia network-first para la API de Supabase
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            // CDN de fuentes
            urlPattern: ({ url }) =>
              url.origin === 'https://fonts.googleapis.com' ||
              url.origin === 'https://fonts.gstatic.com',
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts',
              expiration: { maxEntries: 16, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Supabase: network-first para que siempre veamos datos frescos,
            // pero con fallback al cache si no hay red.
            urlPattern: ({ url }) => url.hostname.endsWith('.supabase.co'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-api',
              networkTimeoutSeconds: 6,
              expiration: { maxEntries: 64, maxAgeSeconds: 60 * 60 * 24 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      manifest: {
        name: 'ViñoPlastic — Transporte',
        short_name: 'ViñoPlastic',
        description: 'Portal de abordaje QR para transporte empresarial.',
        lang: 'es-MX',
        dir: 'ltr',
        start_url: '/chofer',
        scope: '/',
        theme_color: '#26251E',
        background_color: '#FCFBF8',
        display: 'standalone',
        display_override: ['standalone', 'minimal-ui'],
        orientation: 'portrait',
        categories: ['business', 'productivity', 'utilities'],
        icons: [
          { src: '/pwa-64x64.png',           sizes: '64x64',   type: 'image/png' },
          { src: '/pwa-192x192.png',         sizes: '192x192', type: 'image/png' },
          { src: '/pwa-512x512.png',         sizes: '512x512', type: 'image/png' },
          { src: '/maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: '/logo.svg',                sizes: 'any',     type: 'image/svg+xml', purpose: 'any' },
        ],
        shortcuts: [
          {
            name: 'Escanear QR',
            short_name: 'Escanear',
            description: 'Abrir el escáner del portal de chofer',
            url: '/chofer',
            icons: [{ src: '/pwa-192x192.png', sizes: '192x192' }],
          },
        ],
      },
      devOptions: {
        enabled: false, // mantener desactivado en dev para no servir SW viejo
      },
    }),
  ],
})
