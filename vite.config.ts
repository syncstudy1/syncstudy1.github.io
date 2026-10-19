
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: '/',
  plugins: [react()],
  resolve: {
    alias: {
      '@/ui': `${import.meta.dirname}/src/components/ui`,
      '@': `${import.meta.dirname}/src`,
    },
  },
})
