import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  // FIX: This tells Vite to use the repository name as the base path for assets.
  base: '/MoleCal/',
  plugins: [react()],
})
