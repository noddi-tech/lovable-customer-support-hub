import react from "@vitejs/plugin-react-swc"
import path from "path"
import { defineConfig } from "vite"

// Separate Vite config for building the embeddable widget bundle
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
    __WIDGET_VERSION__: JSON.stringify(process.env.WIDGET_VERSION || "1.0.0"),
    __WIDGET_BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
  build: {
    lib: {
      entry: path.resolve(import.meta.dirname, "src/widget/index.tsx"),
      name: "NoddiWidget",
      fileName: () => "widget.js",
      formats: ["iife"],
    },
    outDir: "dist/widget",
    emptyOutDir: true,
    cssCodeSplit: false,
    minify: "terser",
    terserOptions: {
      compress: {
        drop_console: false,
      },
    },
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
        entryFileNames: "widget.js",
      },
    },
    commonjsOptions: {
      include: [/node_modules/],
    },
  },
  optimizeDeps: {
    include: ["react", "react-dom"],
  },
})
