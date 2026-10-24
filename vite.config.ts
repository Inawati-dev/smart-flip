/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'node:url'

const AKAR = fileURLToPath(new URL('.', import.meta.url)).replace(/\\/g, '/')

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  publicDir: 'public',
  server: {
    // Folder kerja sesi (.claude: Word/Chrome menulis berkas sementara) dan docs tidak dipantau:
    // berkas terkunci di sana membuat server dev berhenti dengan EBUSY (antrean #320).
    // Diikat ke akar repo, bukan pola "**/.claude/**": repo ini sendiri bisa berada di dalam .claude/worktrees/.
    watch: {
      ignored: (jalur: string) => {
        const p = jalur.replace(/\\/g, '/')
        return ['.claude/', 'docs/', '.playwright-mcp/'].some((d) => p.startsWith(AKAR + d))
      },
    },
  },
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
