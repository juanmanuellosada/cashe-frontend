import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

const basePath = '/'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.png', 'icons/*.png', 'icons/catalog/*.svg'],
      manifest: {
        name: 'Cashé - Finanzas Personales',
        short_name: 'Cashé',
        description: 'Gestión de finanzas personales. Controlá tus ingresos, gastos y transferencias.',
        theme_color: '#14b8a6',
        background_color: '#0a0a0a',
        display: 'standalone',
        orientation: 'portrait',
        start_url: basePath,
        scope: basePath,
        categories: ['finance', 'productivity'],
        // Separate icons for 'any' and 'maskable' purposes
        icons: [
          // Standard icons (any)
          {
            src: 'icons/icon-72.png',
            sizes: '72x72',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'icons/icon-96.png',
            sizes: '96x96',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'icons/icon-128.png',
            sizes: '128x128',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'icons/icon-144.png',
            sizes: '144x144',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'icons/icon-152.png',
            sizes: '152x152',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          // Maskable icons (for Android adaptive icons)
          {
            src: 'icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable'
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ],
        // App shortcuts for quick actions from home screen
        shortcuts: [
          {
            name: 'Nuevo Gasto',
            short_name: 'Gasto',
            description: 'Registrar un nuevo gasto',
            url: '/nuevo?type=expense',
            icons: [{ src: 'icons/icon-96.png', sizes: '96x96', type: 'image/png' }]
          },
          {
            name: 'Nuevo Ingreso',
            short_name: 'Ingreso',
            description: 'Registrar un nuevo ingreso',
            url: '/nuevo?type=income',
            icons: [{ src: 'icons/icon-96.png', sizes: '96x96', type: 'image/png' }]
          },
          {
            name: 'Ver Gastos',
            short_name: 'Gastos',
            description: 'Ver listado de gastos',
            url: '/gastos',
            icons: [{ src: 'icons/icon-96.png', sizes: '96x96', type: 'image/png' }]
          },
          {
            name: 'Estadísticas',
            short_name: 'Stats',
            description: 'Ver estadísticas',
            url: '/estadisticas',
            icons: [{ src: 'icons/icon-96.png', sizes: '96x96', type: 'image/png' }]
          }
        ]
      },
      workbox: {
        // Force the new service worker to take control immediately
        skipWaiting: true,
        clientsClaim: true,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // Import push notification handlers
        importScripts: ['sw-push.js'],
        // Offline fallback page
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api/],
        runtimeCaching: [
          // Supabase auth and REST endpoints are NOT registered here on
          // purpose: every runtimeCaching rule makes Workbox intercept the
          // fetch, and on a brief network hiccup NetworkOnly throws
          // `no-response`, which Supabase-js surfaces as
          // "AbortError: signal is aborted without reason" and cascades into
          // every dependent fetcher. Letting the browser talk directly to
          // Supabase avoids that whole class of failure. The in-app cache in
          // supabaseApi.js already covers the data-freshness story.
          // Cache dollar API
          {
            urlPattern: /^https:\/\/dolarapi\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'dolar-api-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 30 // 30 minutes
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          // Cache Google Fonts
          {
            urlPattern: /^https:\/\/api\.fontshare\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'font-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          // Legacy Google Apps Script API
          {
            urlPattern: /^https:\/\/script\.google\.com\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'legacy-api-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 // 1 hour
              },
              networkTimeoutSeconds: 10
            }
          }
        ]
      }
    })
  ],
  base: basePath,
  build: {
    // Split heavy vendor libs into their own chunks so route-level lazy
    // imports don't re-download them, and so the initial landing/login
    // bundle stays small. The Statistics page is the main consumer of
    // recharts/framer-motion — it already lazy-loads via React.lazy.
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-recharts': ['recharts'],
          'vendor-motion': ['framer-motion'],
          'vendor-date': ['date-fns', 'react-day-picker'],
          'vendor-supabase': ['@supabase/supabase-js'],
        },
      },
    },
    // Silence large-chunk warning noise now that chunks are split
    chunkSizeWarningLimit: 1200,
  },
})
