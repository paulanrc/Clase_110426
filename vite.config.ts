import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// base './' permite desplegar en GitHub Pages (subruta) y en Vercel sin cambios.
export default defineConfig({ base: './', plugins: [react()] })
