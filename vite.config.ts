import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  const env = mode === 'integration' ? process.env : { ...loadEnv(mode, process.cwd(), ''), ...process.env }
  return {
  base: env.VITE_BASE_PATH || '/',
  // Integration must not load .env, .env.local or mode-specific user files.
  envDir: mode === 'integration' ? false : undefined,
  plugins: [vue(), tailwindcss()],
  server: { host: '127.0.0.1', port: 5173, strictPort: true, proxy: { '/api': env.API_PROXY_TARGET || 'http://localhost:3000' } },
  }
})