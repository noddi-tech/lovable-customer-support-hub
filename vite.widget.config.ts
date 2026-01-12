import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

// Separate Vite config for building the embeddable widget bundle
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/widget/index.tsx'),
      name: 'NoddiWidget',
      fileName: () => 'widget.js',
      formats: ['iife'],
    },
    outDir: 'dist/widget',
    emptyOutDir: true,
    cssCodeSplit: false,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: false,
      },
    },
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
        entryFileNames: 'widget.js',
      },
    },
    commonjsOptions: {
      include: [/node_modules/],
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom'],
  },
});
