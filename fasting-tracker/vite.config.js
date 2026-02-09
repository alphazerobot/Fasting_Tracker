import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // For GitHub Pages: set base to your repo name
  // e.g., if your repo is https://github.com/USERNAME/fasting-tracker
  // then base should be '/fasting-tracker/'
  base: '/Fasting_Tracker/',
})
