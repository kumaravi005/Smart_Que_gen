import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['omega-logo.png', 'favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Omega Education Centre — Smart Question Paper Generator',
        short_name: 'Omega PaperGen',
        description: 'Smart Question Paper Generation System for Educators',
        theme_color: '#0055D4',
        background_color: '#FFE600',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: '/omega-logo.png',
            sizes: '192x192 512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}']
      }
    })
  ]
})
