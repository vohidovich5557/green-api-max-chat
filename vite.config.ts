import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base: './' lets the build work on Vercel, Netlify and GitHub Pages without changes
export default defineConfig({
  base: './',
  plugins: [react()],
});
