import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: { host: true },
  build: {
    rollupOptions: {
      // index.html = Fluidz Labs home (static). app.html = the V1 React app (kept reachable, to be rebuilt).
      input: { labs: resolve(__dirname, 'index.html'), app: resolve(__dirname, 'app.html') },
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-i18n': ['i18next', 'react-i18next'],
          'vendor-icons': ['lucide-react'],
        },
      },
    },
  },
})
