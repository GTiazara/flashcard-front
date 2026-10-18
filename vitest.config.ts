import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  // Les tests ne dépendent ni des fichiers locaux ni des variables du déploiement.
  envDir: false,
  define: {
    'import.meta.env.VITE_API_BASE_URL': JSON.stringify('/api'),
    'import.meta.env.VITE_ROUTER_MODE': JSON.stringify('history'),
  },
  plugins: [vue()],
  test: { environment: 'jsdom', include: ['tests/unit/**/*.test.ts'], restoreMocks: true },
})