import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { ROTAS_HTML } from './scripts/rotas.mjs';

// Caminho publicado no GitHub Pages (https://190alertas.github.io/home/).
// Pode ser sobrescrito com BASE_PATH=/outro-caminho/ (ex.: forks).
const base = process.env.BASE_PATH ?? '/home/';

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      includeManifestIcons: false,
      manifest: {
        // Mesmo "id" da versão anterior: o app instalado nos celulares é atualizado, não duplicado.
        id: '190ALERTAS',
        name: '190 ALERTAS',
        short_name: '190 ALERTAS',
        description:
          'Ferramentas de apoio operacional para a Brigada Militar: release, alerta de veículo, croqui, escala e TAF.',
        lang: 'pt-BR',
        dir: 'ltr',
        start_url: base,
        scope: base,
        display: 'standalone',
        orientation: 'any',
        background_color: '#0a0a0c',
        theme_color: '#0a0a0c',
        categories: ['utilities', 'productivity'],
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        shortcuts: [
          { name: 'Release', short_name: 'Release', url: `${base}release` },
          { name: 'Alerta de Veículo', short_name: 'Alerta', url: `${base}veiculos` },
          { name: 'Minha Escala', short_name: 'Escala', url: `${base}escala` },
          { name: 'Croqui', short_name: 'Croqui', url: `${base}croqui` },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,woff2,png,webp,svg,ico}'],
        // Cópias de index.html (links diretos do GitHub Pages), o SW antigo e os
        // ícones grandes (usados só na instalação) ficam fora do cache offline.
        globIgnores: [
          ...ROTAS_HTML.filter((r) => r !== 'index').map((r) => `${r}.html`),
          '404.html',
          'js/**',
          'icons/icon-512.png',
          'icons/icon-maskable-*.png',
          'og.jpg',
          // Dependências opcionais do jsPDF que o app não usa (html(), SVG).
          'assets/html2canvas-*.js',
          'assets/purify.es-*.js',
          'assets/index.es-*.js',
        ],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/tile\.openstreetmap\.org\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'mapa-ruas',
              expiration: { maxEntries: 600, maxAgeSeconds: 60 * 60 * 24 * 14 },
              cacheableResponse: { statuses: [200] },
            },
          },
          {
            urlPattern: /^https:\/\/server\.arcgisonline\.com\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'mapa-satelite',
              expiration: { maxEntries: 600, maxAgeSeconds: 60 * 60 * 24 * 14 },
              cacheableResponse: { statuses: [200] },
            },
          },
        ],
      },
    }),
  ],
  build: {
    target: 'es2022',
    sourcemap: false,
    chunkSizeWarningLimit: 900,
  },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
