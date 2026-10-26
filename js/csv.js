import { opcionesDe, buscarPregunta } from './sesion.js';

const celda = (v) => {
  let s = v == null ? '' : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; // evita fórmulas al abrir en Excel/Sheets
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function armarCsv(config, respuestas, inscripciones) {
  const campos = config.pasos.filter(p => p.tipo === 'registro').flatMap(p => p.campos || []);
  const porPart = new Map(inscripciones.map(i => [i.participante, i]));
  const reg = (i) => campos.map(c => i?.datos?.[c.id] ?? '');
  const filas = [['fecha', 'participante', ...campos.map(c => c.etiqueta), 'pregunta', 'opcion', 'texto']];
  for (const r of respuestas) {
    const pregunta = buscarPregunta(config, r.pregunta_id)?.pregunta.texto ?? '';
    const opcion = opcionesDe(config, r.pregunta_id).find(o => o.id === r.opcion_id)?.texto ?? '';
    filas.push([r.creado, r.participante, ...reg(porPart.get(r.participante)), pregunta, opcion, r.texto]);
  }
  const conRespuesta = new Set(respuestas.map(r => r.participante));
  for (const i of inscripciones)
    if (!conRespuesta.has(i.participante)) filas.push([i.creado, i.participante, ...reg(i), '', '', '']);
  return '﻿' + filas.map(f => f.map(celda).join(',')).join('\r\n');
}
