# Dashboard · Áreas inundadas por Frente Frío (Colombia)
React + TypeScript + Leaflet + Vite.
- `npm install && npm run dev` · `npm run build` (salida en `dist/`).
- **Actualizar datos**: reemplace los archivos de `public/data/` (mismos nombres y columnas). Rutas y hoja en `src/lib.ts` (`DATA`).
- **Vercel**: importe el repo (framework Vite). **GitHub Pages**: publique `dist/` (usa `base: './'`).
- Estructura: `lib.ts` (carga, validación, cruce normalizado), `MapView.tsx`, `Charts.tsx`, `App.tsx`.
