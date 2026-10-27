import { opcionesDe, buscarPregunta } from './sesion.js';

export function contar(config, respuestas) {
  const out = {};
  for (const r of respuestas) {
    if (!buscarPregunta(config, r.pregunta_id)) continue;
    (out[r.pregunta_id] ||= []).push(r);
  }
  for (const id of Object.keys(out)) {
    const rs = out[id], total = rs.length;
    out[id] = {
      total,
      opciones: opcionesDe(config, id).map(o => {
        const n = rs.filter(r => r.opcion_id === o.id).length;
        return { id: o.id, texto: o.texto, n, pct: Math.round(n * 100 / total) };
      }),
      textos: rs.filter(r => r.texto)
        .sort((a, b) => String(b.creado || '').localeCompare(String(a.creado || '')))
        .map(r => r.texto),
    };
  }
  return out;
}
