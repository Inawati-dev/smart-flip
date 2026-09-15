/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  publicDir: 'public',
  build: {
    rollupOptions: {
      output: {
        // Fungsi (bukan object shorthand) - vite 8 (rolldown) hanya
        // mengetipkan ManualChunksFunction.
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (/[\\/]react(-dom|-router)?[\\/]/.test(id)) return 'react'
          if (id.includes('@supabase/supabase-js')) return 'supabase'
          if (id.includes('@tanstack/react-query')) return 'query'
        },
      },
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
