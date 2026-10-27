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

// Columnas que dejan las celdas lo más cerca posible de una proporción 1,8:1.
export function grillaPara(n, ancho, alto) {
  let mejor = null;
  for (let columnas = 1; columnas <= n; columnas++) {
    const filas = Math.ceil(n / columnas);
    const d = Math.abs((ancho / columnas) / (alto / filas) - 1.8);
    if (!mejor || d < mejor.d - 1e-9 || (Math.abs(d - mejor.d) <= 1e-9 && filas < mejor.filas)) mejor = { columnas, filas, d };
  }
  return { columnas: mejor.columnas, filas: mejor.filas };
}

// Tamaño de cada página del resumen: las menos páginas posibles de hasta `max`, con tamaños parejos (14 → 7 + 7).
export function paginar(n, max = 8) {
  const paginas = Math.max(1, Math.ceil(n / max)), base = Math.floor(n / paginas);
  return Array.from({ length: paginas }, (_, i) => base + (i < n % paginas ? 1 : 0));
}
