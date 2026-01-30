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
        // Offline fallback page
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api/],
        runtimeCaching: [
          // Cache Supabase API calls with stale-while-revalidate
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/v1\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'supabase-api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 // 24 hours
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          // Cache Supabase Auth
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/auth\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-auth-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 5 // 5 minutes
              },
              networkTimeoutSeconds: 5
            }
          },
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
})
