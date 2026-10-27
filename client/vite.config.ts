import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/apple-touch-icon.png', 'icons/favicon-64.png'],
      manifest: {
        name: 'ChallengeX',
        short_name: 'ChallengeX',
        description: 'Challenge your idea. Prove it. Build it.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait-primary',
        background_color: '#0a0405',
        theme_color: '#0a0405',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // SPA: serve the app shell for navigations, but never for API calls
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        runtimeCaching: [
          // the big scene art: cache-first after first load
          { urlPattern: ({ url }) => url.pathname.startsWith('/assets/'), handler: 'CacheFirst',
            options: { cacheName: 'cx-art', expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 30 } } },
          { urlPattern: ({ url }) => url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com',
            handler: 'StaleWhileRevalidate', options: { cacheName: 'cx-fonts' } },
          // API: always the network — never serve a stale session, question or verdict
          { urlPattern: ({ url }) => url.pathname.startsWith('/api/'), handler: 'NetworkOnly' },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  resolve: {
    alias: {
      // fileURLToPath (not URL.pathname) so paths containing spaces / Windows drive letters resolve correctly
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        configure: (proxy, _options) => {
          proxy.on('error', (err: Error) => {
            console.error('API proxy error:', err.message);
          });
        },
      },
      // OAuth callbacks: protocol-relative so the backend's redirect URL matches
      '/api/auth/oauth/google/callback': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/api/auth/oauth/apple/callback': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
  preview: {
    port: 5173,
    strictPort: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          const normalizedId = id.replace(/\\/g, '/');
          if (/\/node_modules\/(react|react-dom|react-router-dom)\//.test(normalizedId)) return 'vendor';
          if (normalizedId.includes('/node_modules/framer-motion/')) return 'anim';
          if (normalizedId.includes('/node_modules/@tanstack/react-query/')) return 'data';
        },
      },
    },
  },
});
