import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { FeatureCollection } from 'geojson'
import { CLASSES, Rec, classOf, fmt, keyOf } from './lib'

const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
interface P { recs: Rec[]; muni: FeatureCollection; dept: FeatureCollection; focusKey: string | null }

export default function MapView({ recs, muni, dept, focusKey }: P) {
  const el = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map>()
  const flood = useRef(L.layerGroup())
  const first = useRef(true)

  useEffect(() => {
    const m = L.map(el.current!, { zoomControl: true, preferCanvas: true }).setView([4.6, -74.1], 6)
    map.current = m
    const base = {
      'Cartográfico': L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap', maxZoom: 18 }),
      'Satelital': L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { attribution: 'Esri, Maxar, Earthstar', maxZoom: 18 }),
      'Terreno': L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', { attribution: '© OpenTopoMap, OSM', maxZoom: 17 }),
    }
    base['Cartográfico'].addTo(m)
    const lm = L.geoJSON(muni, { style: { color: '#475569', weight: 0.5, fill: false }, interactive: false })
    const ld = L.geoJSON(dept, { style: { color: '#0b1f3a', weight: 1.8, fill: false }, interactive: false })
    flood.current.addTo(m); ld.addTo(m)
    L.control.layers(base, { 'Áreas inundadas': flood.current, 'Límites municipales': lm, 'Límites departamentales': ld }, { collapsed: true }).addTo(m)
    L.control.scale({ imperial: false }).addTo(m)
    return () => { m.remove() }
  }, [muni, dept])

  useEffect(() => {
    const m = map.current; if (!m) return
    const byKey = new Map(recs.map(r => [r.key, r]))
    const feats = (muni.features as any[]).filter(f => byKey.has(keyOf(f.properties.MpNombre, f.properties.Depto)))
    flood.current.clearLayers()
    const gl = L.geoJSON({ type: 'FeatureCollection', features: feats } as any, {
      style: f => ({ color: '#ffffff', weight: 0.6, fillOpacity: 0.85, fillColor: CLASSES[classOf(byKey.get(keyOf(f!.properties.MpNombre, f!.properties.Depto))!.pct)].color }),
      onEachFeature: (f, layer) => {
        const r = byKey.get(keyOf(f.properties.MpNombre, f.properties.Depto))!
        layer.bindTooltip(`${esc(r.municipio)} · ${fmt(r.pct, 2)} %`, { sticky: true })
        layer.bindPopup(`<div class="pop"><strong>${esc(r.municipio)}</strong><span>${esc(r.departamento)}</span><dl>
          <dt>Área municipal</dt><dd>${fmt(r.areaMun, 1)} ha</dd>
          <dt>Área inundada</dt><dd>${fmt(r.areaInu, 1)} ha</dd>
          <dt>% inundado</dt><dd>${fmt(r.pct, 2)} %</dd></dl></div>`)
        layer.on('mouseover', () => (layer as L.Path).setStyle({ weight: 2, color: '#0b1f3a' }))
        layer.on('mouseout', () => gl.resetStyle(layer as L.Path))
        ;(layer as any)._key = r.key
      },
    })
    flood.current.addLayer(gl)
    if (feats.length) m.fitBounds(gl.getBounds(), { padding: [20, 20], animate: !first.current })
    first.current = false
    if (focusKey) gl.eachLayer(l => { if ((l as any)._key === focusKey) (l as L.Layer).openPopup?.() })
  }, [recs, muni, focusKey])

  const counts = CLASSES.map((_, i) => recs.filter(r => classOf(r.pct) === i).length)
  return (
    <div className="mapwrap">
      <div ref={el} className="map" role="application" aria-label="Mapa de áreas inundadas por municipio" />
      <div className="legend" aria-label="Leyenda">
        <b>% del municipio inundado</b>
        {CLASSES.map((c, i) => <div key={c.label} title={`${counts[i]} municipios en este rango`}><i style={{ background: c.color }} />{c.label}<em>{counts[i]}</em></div>)}
        <small>Líneas gruesas: departamentos. Use el control de capas (arriba a la derecha) para cambiar mapa base y límites.</small>
      </div>
    </div>
  )
}
