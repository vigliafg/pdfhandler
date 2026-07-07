import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],

  // Relative paths work with both dev server (http://) and custom protocol (app://)
  base: './',

  server: {
    port: 5173,
    strictPort: true,
  },

  envPrefix: ['VITE_'],

  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
})
