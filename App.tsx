import { useEffect, useMemo, useState } from 'react'
import MapView from './MapView'
import { BarChart } from './Charts'
import { Loaded, loadAll, fmt } from './lib'

const Kpi = ({ l, v, u, t }: { l: string; v: string; u?: string; t: string }) => (
  <div className="kpi" title={t}><span>{l}</span><strong>{v}</strong>{u && <em>{u}</em>}</div>
)

export default function App() {
  const [d, setD] = useState<Loaded>()
  const [err, setErr] = useState<string>()
  const [dep, setDep] = useState(''); const [mun, setMun] = useState('')
  useEffect(() => { loadAll().then(setD).catch(e => setErr(String(e.message ?? e))) }, [])

  const deps = useMemo(() => [...new Set(d?.recs.map(r => r.departamento))].sort((a, b) => a.localeCompare(b, 'es')), [d])
  const muns = useMemo(() => (d?.recs.filter(r => !dep || r.departamento === dep) ?? []).sort((a, b) => a.municipio.localeCompare(b.municipio, 'es')), [d, dep])
  const recs = useMemo(() => d?.recs.filter(r => (!dep || r.departamento === dep) && (!mun || r.key === mun)) ?? [], [d, dep, mun])

  const k = useMemo(() => {
    const inu = recs.reduce((s, r) => s + r.areaInu, 0), tot = recs.reduce((s, r) => s + r.areaMun, 0)
    return { n: recs.length, nd: new Set(recs.map(r => r.departamento)).size, inu, tot, pct: tot ? (inu / tot) * 100 : 0 }
  }, [recs])

  const top = (f: (r: typeof recs[0]) => number) => [...recs].sort((a, b) => f(b) - f(a)).slice(0, 10)
  const byDept = useMemo(() => {
    const m = new Map<string, number>(); recs.forEach(r => m.set(r.departamento, (m.get(r.departamento) ?? 0) + r.areaInu))
    return [...m].sort((a, b) => b[1] - a[1]).map(([label, value]) => ({ label, value }))
  }, [recs])

  if (err) return <div className="state error" role="alert"><h2>No se pudieron cargar los datos</h2><p>{err}</p><p>Verifique que los archivos estén en <code>public/data</code> y que conserven su estructura original.</p></div>
  if (!d) return <div className="state">Cargando datos…</div>

  return (
    <div className="app">
      <header>
        <div><h1>Áreas inundadas por Frente Frío</h1><p>Colombia · análisis por municipio y departamento</p></div>
        <div className="filters">
          <label>Departamento
            <select value={dep} onChange={e => { setDep(e.target.value); setMun('') }}>
              <option value="">Todos</option>{deps.map(x => <option key={x}>{x}</option>)}
            </select></label>
          <label>Municipio
            <select value={mun} onChange={e => setMun(e.target.value)}>
              <option value="">Todos</option>{muns.map(r => <option key={r.key} value={r.key}>{r.municipio}</option>)}
            </select></label>
          {(dep || mun) && <button onClick={() => { setDep(''); setMun('') }}>Limpiar filtros</button>}
        </div>
      </header>

      {d.warnings.length > 0 && (
        <details className="warn"><summary>{d.warnings.length} aviso(s) de validación de datos</summary>
          <ul>{d.warnings.map((w, i) => <li key={i}>{w}</li>)}</ul></details>)}

      <section className="kpis" aria-label="Indicadores principales">
        <Kpi l="Municipios analizados" v={fmt(k.n)} t="Registros únicos municipio–departamento del Excel" />
        <Kpi l="Departamentos" v={fmt(k.nd)} t="Departamentos con al menos un municipio analizado" />
        <Kpi l="Área inundada" v={fmt(k.inu)} u="ha" t="Suma de Area_Inundada_ha" />
        <Kpi l="Área municipal evaluada" v={fmt(k.tot)} u="ha" t="Suma de Area_Municipio_ha de los municipios analizados" />
        <Kpi l="Inundación sobre el área evaluada" v={fmt(k.pct, 2)} u="%" t="Área inundada total ÷ área municipal evaluada total" />
      </section>

      <MapView recs={recs} muni={d.muni} dept={d.dept} focusKey={mun || null} />

      <div className="grid">
        <BarChart title="10 municipios con mayor área inundada" unit="ha" hint="Ordenados por Area_Inundada_ha"
          data={top(r => r.areaInu).map(r => ({ label: r.municipio, sub: r.departamento, value: r.areaInu }))} />
        <BarChart title="10 municipios con mayor % de inundación" unit="%" dec={2} hint="Ordenados por %_Area_inundada"
          data={top(r => r.pct).map(r => ({ label: r.municipio, sub: r.departamento, value: r.pct }))} />
        <BarChart title="Área inundada por departamento" unit="ha" hint="Suma de área inundada por departamento" data={byDept.slice(0, 15)} />
        <BarChart title="Área municipal vs. área inundada" unit="ha" hint="Los 10 municipios con mayor área inundada" labels={['Área inundada', 'Área municipal']}
          data={top(r => r.areaInu).map(r => ({ label: r.municipio, sub: r.departamento, value: r.areaInu, value2: r.areaMun }))} />
      </div>
      <footer>Fuente: Areas_Inundadas_Municipios_Frente_Frio.xlsx · Límites: GeoJSON simplificados. Valores sin modificar; hectáreas (ha).</footer>
    </div>
  )
}
