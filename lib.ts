// Carga, validación y cruce de datos. Para actualizar el dashboard basta reemplazar los archivos de /public/data.
import * as XLSX from 'xlsx'
import type { FeatureCollection } from 'geojson'

export const DATA = {
  excel: 'data/Areas_Inundadas_Municipios_Frente_Frio.xlsx',
  sheet: 'Orden x dpto',
  muni: 'data/municipios_simplificado.geojson',
  dept: 'data/departamentos_simplificado.geojson',
}
export interface Rec { key: string; municipio: string; departamento: string; areaMun: number; areaInu: number; pct: number }
export interface Loaded { recs: Rec[]; muni: FeatureCollection; dept: FeatureCollection; warnings: string[] }

export const norm = (s: unknown) =>
  String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
export const keyOf = (m: unknown, d: unknown) => `${norm(m)}|${norm(d)}`

export const fmt = (n: number, d = 0) => n.toLocaleString('es-CO', { minimumFractionDigits: d, maximumFractionDigits: d })

// Clases de la escala (% de área inundada del municipio)
export const CLASSES = [
  { min: 0, label: '< 0,5 %', color: '#d6e9f8' }, { min: 0.5, label: '0,5 – 2 %', color: '#9ecae1' },
  { min: 2, label: '2 – 5 %', color: '#5aa6d6' }, { min: 5, label: '5 – 10 %', color: '#2b7bba' },
  { min: 10, label: '10 – 25 %', color: '#14508f' }, { min: 25, label: '≥ 25 %', color: '#08254d' },
]
export const classOf = (p: number) => { let i = 0; CLASSES.forEach((c, j) => { if (p >= c.min) i = j }); return i }

async function getJSON(url: string) {
  const r = await fetch(url)
  if (!r.ok) throw new Error(`No se pudo cargar ${url} (HTTP ${r.status})`)
  return r.json()
}

export async function loadAll(): Promise<Loaded> {
  const warnings: string[] = []
  const [muni, dept, buf] = await Promise.all([
    getJSON(DATA.muni), getJSON(DATA.dept),
    fetch(DATA.excel).then(r => { if (!r.ok) throw new Error(`No se pudo cargar ${DATA.excel} (HTTP ${r.status})`); return r.arrayBuffer() }),
  ])
  for (const [n, g] of [['municipios', muni], ['departamentos', dept]] as const)
    if (g?.type !== 'FeatureCollection' || !g.features?.length) throw new Error(`El GeoJSON de ${n} no es válido o está vacío.`)

  const wb = XLSX.read(buf)
  const ws = wb.Sheets[DATA.sheet]
  if (!ws) throw new Error(`No existe la hoja "${DATA.sheet}" en el Excel (hojas: ${wb.SheetNames.join(', ')}).`)
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws)
  const need = ['Municipio', 'Departamento', 'Area_Municipio_ha', 'Area_Inundada_ha', '%_Area_inundada']
  const miss = need.filter(c => !(c in (rows[0] ?? {})))
  if (miss.length) throw new Error(`Faltan columnas en el Excel: ${miss.join(', ')}.`)

  const geoKeys = new Set((muni.features as any[]).map(f => keyOf(f.properties.MpNombre, f.properties.Depto)))
  const seen = new Set<string>(); const recs: Rec[] = []
  rows.forEach((r, i) => {
    const a = Number(r.Area_Municipio_ha), b = Number(r.Area_Inundada_ha), p = Number(r['%_Area_inundada'])
    const key = keyOf(r.Municipio, r.Departamento)
    if (![a, b, p].every(Number.isFinite)) return warnings.push(`Fila ${i + 2} (${r.Municipio}): valores numéricos inválidos, omitida.`) as unknown as void
    if (seen.has(key)) return warnings.push(`Fila ${i + 2}: ${r.Municipio} (${r.Departamento}) duplicado, omitido para no duplicar totales.`) as unknown as void
    if (!geoKeys.has(key)) warnings.push(`${r.Municipio} (${r.Departamento}) no tiene geometría; se incluye en indicadores y gráficos pero no en el mapa.`)
    seen.add(key)
    recs.push({ key, municipio: String(r.Municipio).trim(), departamento: String(r.Departamento).trim(), areaMun: a, areaInu: b, pct: p })
  })
  if (!recs.length) throw new Error('El Excel no contiene registros válidos.')
  return { recs, muni, dept, warnings }
}
