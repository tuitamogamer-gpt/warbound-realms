import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        // Keep the sizeable 3D runtime out of both the menu payload and the
        // board's game-code chunk. These stable chunks cache independently.
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          if (/[\\/]node_modules[\\/](@react-three|three|three-stdlib|@pmndrs)[\\/]/.test(id)) {
            return 'three-vendor'
          }
          if (/[\\/]node_modules[\\/](zustand|immer)[\\/]/.test(id)) return 'state-vendor'
          if (/[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/.test(id)) return 'react-vendor'
          return undefined
        },
      },
    },
  },
  server: {
    port: process.env.PORT ? Number(process.env.PORT) : 5173,
    strictPort: false,
  },
})
