import path from 'path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [['babel-plugin-react-compiler', { target: '19' }]]
      }
    }),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'favicon.ico',
        'logo.svg',
        'apple-touch-icon-180x180.png',
        'maskable-icon-512x512.png',
        'pwa-64x64.png',
        'pwa-192x192.png',
        'pwa-512x512.png',
        '/chefskiss.png',
        'fonts/Geist.woff2',
        'fonts/Lora.woff2',
        'fonts/Creepster.woff2',
        'fonts/Quintessential.woff2'
      ],
      strategies: 'generateSW',
      workbox: {
        skipWaiting: false,
        clientsClaim: true,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,jpg,jpeg,gif,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /\.(?:js|css|html|ico|png|svg|jpg|jpeg|gif|woff2)$/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'vibes-assets',
              expiration: {
                maxEntries: 500,
                maxAgeSeconds: 60 * 60 * 24 * 30
              }
            }
          },
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/auth\/v1\/.*/,
            handler: 'NetworkOnly'
          }
        ]
      },
      manifest: {
        name: 'Vibes',
        short_name: 'Vibes',
        theme_color: '#000000',
        background_color: '#000000',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        orientation: 'portrait',
        shortcuts: [
          {
            name: 'FYP',
            short_name: 'FYP',
            description: 'Vibes cooked up just for you 🧑‍🍳',
            icons: [
              {
                src: '/shortcuts/fyp.png',
                sizes: '64x64',
                type: 'image/png'
              }
            ],
            url: '/fyp'
          },
          {
            name: 'Bookmarks',
            short_name: 'Bookmarks',
            description: 'Your secret treasure chest 💰',
            icons: [
              {
                src: '/shortcuts/bookmark.png',
                sizes: '64x64',
                type: 'image/png'
              }
            ],
            url: '/bookmarks'
          },
          {
            name: 'Favorites',
            short_name: 'Favorites',
            description: 'Your absolute faves ✨',
            icons: [
              {
                src: '/shortcuts/favorite.png',
                sizes: '64x64',
                type: 'image/png'
              }
            ],
            url: '/favorites'
          }
        ],
        icons: [
          {
            src: 'pwa-64x64.png',
            sizes: '64x64',
            type: 'image/png'
          },
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
});
