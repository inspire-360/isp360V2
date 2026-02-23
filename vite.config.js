import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import basicSsl from '@vitejs/plugin-basic-ssl' // 1. นำเข้า Plugin

export default defineConfig({
  plugins: [
    react(),
    basicSsl(), // 2. เรียกใช้ Plugin ตรงนี้ (จะทำให้ npm run dev เป็น https)
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'InSPIRE 360 EdTech Platform',
        short_name: 'InSPIRE 360',
        description: 'World-Class EdTech Platform for Teachers & Students',
        theme_color: '#0F62FE',
        background_color: '#ffffff',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        orientation: 'portrait',
        icons: [
          {
            src: 'icons/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'icons/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
  server: {
    https: true // 3. บังคับเปิด HTTPS
  }
})