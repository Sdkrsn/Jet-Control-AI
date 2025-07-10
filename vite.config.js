// vite.config.js
import { defineConfig } from 'vite';

export default defineConfig({
  // This ensures Vite can find your index.html and other static assets.
  // '/' means the root of your project is the base URL.
  base: '/',

  // Configure how assets are handled during the build process
  build: {
    // Assets directory within the output folder (e.g., dist)
    // If you want all assets (like WASM files) directly in the 'dist' folder, set this to empty string.
    assetsDir: '',
    rollupOptions: {
      // Point Vite to your index.html as the entry point
      input: {
        main: 'index.html'
      }
    }
  },
  server: {
    // *** ADDED: Explicit MIME type for .wasm files ***
    // This tells Vite's development server to serve .wasm files with the correct Content-Type header.
    mimeTypes: {
      '.wasm': 'application/wasm'
    },
    // *** ADDED: Cross-Origin Isolation Headers ***
    // These headers are often required for WebAssembly multi-threading (which ONNX Runtime Web uses)
    // and certain other advanced browser features related to security contexts.
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
    // host: '0.0.0.0', // Optional: To allow access from other devices on your network
    // port: 3000, // Optional: Or any other port you prefer for the dev server
  }
});