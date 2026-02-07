import { defineConfig } from 'vite';
import fs from 'fs';
import path from 'path';
import preact from '@preact/preset-vite';
import { VitePWA } from 'vite-plugin-pwa';

const certDir = path.resolve(__dirname, '../..');
const keyPath = path.join(certDir, 'key.pem');
const hasLocalCerts = fs.existsSync(keyPath);

export default defineConfig({
  base: process.env.GITHUB_ACTIONS ? '/mediplan/' : '/',
  server: {
    ...(hasLocalCerts && {
      https: {
        key: fs.readFileSync(keyPath),
        cert: fs.readFileSync(path.join(certDir, 'cert.pem')),
      },
    }),
    proxy: {
      '/api/pzn': {
        target: 'http://localhost:3456',
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'pzn-data': ['./src/generated/pzn-data'],
        },
      },
    },
  },
  plugins: [
    preact(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'MediOrder – Rezept nachbestellen',
        short_name: 'MediOrder',
        description: 'Medikamente vom Bundesmedikationsplan scannen und per E-Mail nachbestellen.',
        lang: 'de',
        theme_color: '#1565c0',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          { src: 'icon-192.svg', sizes: '192x192', type: 'image/svg+xml' },
          { src: 'icon-512.svg', sizes: '512x512', type: 'image/svg+xml' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,woff2}'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024, // 3 MB — PZN data chunk is ~2.7 MB
      },
    }),
  ],
});
