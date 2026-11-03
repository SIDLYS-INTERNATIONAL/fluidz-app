import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: { host: true },
  build: {
    rollupOptions: {
      // index.html = Fluidz Labs home (static). The old V1 React app is retired from the build (source stays in src/ for reference).
      input: { labs: resolve(__dirname, 'index.html') },
    },
  },
})
