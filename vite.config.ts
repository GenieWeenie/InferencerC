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
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;

          if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('/scheduler/')) {
            return 'vendor-react';
          }
          if (id.includes('/framer-motion/')) {
            return 'vendor-motion';
          }
          if (id.includes('/lucide-react/')) {
            return 'vendor-icons';
          }
          if (
            id.includes('/react-markdown/') ||
            id.includes('/remark-') ||
            id.includes('/rehype-') ||
            id.includes('/unified/') ||
            id.includes('/micromark/') ||
            id.includes('/hast-util-') ||
            id.includes('/mdast-util-')
          ) {
            return 'vendor-markdown';
          }
          if (id.includes('/katex/')) {
            return 'vendor-katex';
          }
          if (id.includes('/jspdf/')) {
            return 'vendor-jspdf';
          }
        },
      },
    },
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
