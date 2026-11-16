import { fmt } from './lib'
export interface Bar { label: string; sub?: string; value: number; value2?: number }
interface P { title: string; hint: string; unit: string; data: Bar[]; unit2?: string; labels?: [string, string]; dec?: number }

// Gráficos de barras horizontales en SVG/CSS (sin dependencias) con tooltips nativos.
export function BarChart({ title, hint, unit, data, labels, dec = 0 }: P) {
  const max = Math.max(...data.flatMap(d => [d.value, d.value2 ?? 0]), 1e-9)
  return (
    <section className="card">
      <h3 title={hint}>{title} <span className="unit">({unit})</span></h3>
      {labels && <div className="key"><i className="sw a" />{labels[0]}<i className="sw b" />{labels[1]}</div>}
      {!data.length && <p className="empty">Sin datos para el filtro actual.</p>}
      <ul className="bars">
        {data.map(d => (
          <li key={d.label + (d.sub ?? '')} title={`${d.label}${d.sub ? ' – ' + d.sub : ''}\n${labels ? labels[0] + ': ' : ''}${fmt(d.value, dec)} ${unit}${d.value2 != null ? `\n${labels![1]}: ${fmt(d.value2, dec)} ${unit}` : ''}`}>
            <span className="nm">{d.label}{d.sub && <small>{d.sub}</small>}</span>
            <span className="tr">
              <span className="fill" style={{ width: `${(d.value / max) * 100}%` }} />
              {d.value2 != null && <span className="fill b" style={{ width: `${(d.value2 / max) * 100}%` }} />}
            </span>
            <span className="vl">{fmt(d.value, dec)}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
