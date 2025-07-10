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
    // If you have a separate Python backend for other things (e.g., APIs),
    // you might need to configure a proxy here.
    // For now, if your Python server is ONLY for serving the .pkl/.onnx,
    // and Vite is serving the frontend, you likely won't need anything specific here
    // unless you want Vite to run on a different port or allow specific network access.
    // host: '0.0.0.0', // To allow access from other devices on your network
    // port: 3000, // Or any other port you prefer for the dev server
  }
});