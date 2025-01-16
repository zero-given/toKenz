import { defineConfig } from 'vite';
import solid from 'vite-plugin-solid';
import UnoCSS from '@unocss/vite';

export default defineConfig({
  plugins: [
    solid(),
    UnoCSS(),
  ],
  server: {
    port: 5173,
    strictPort: false,
    host: true,
  },
  build: {
    target: 'esnext',
    polyfillModulePreload: false,
    sourcemap: true,
    minify: 'esbuild',
    cssMinify: true,
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'solid': ['solid-js'],
          'solid-web': ['solid-js/web'],
          'virtual': ['virtual:uno.css'],
        },
      },
    },
  },
  optimizeDeps: {
    include: ['solid-js'],
    exclude: ['@unocss/reset'],
  },
});
