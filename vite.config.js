import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Pruebas unitarias de la página web (npm test)
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/pruebas/configuracion.js'],
    include: ['src/**/*.test.{js,jsx}'],
    css: false,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{js,jsx}'],
      exclude: ['src/pruebas/**', 'src/main.jsx'],
      reporter: ['text', 'json-summary']
    }
  }
})
