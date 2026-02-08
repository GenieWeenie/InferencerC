import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './',
  root: path.join(__dirname, 'src/renderer'),
  publicDir: 'public',
  build: {
    outDir: '../../dist/renderer',
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@': path.join(__dirname, 'src'),
      // We use jsPDF direct text APIs, not jsPDF.html().
      // Stub these optional plugin deps so they don't bloat the renderer bundle.
      html2canvas: path.join(__dirname, 'src/renderer/lib/stubs/html2canvas.ts'),
      dompurify: path.join(__dirname, 'src/renderer/lib/stubs/dompurify.ts'),
    },
  },
  server: {
    port: 5173,
  }
})
