// Lógica pura de sesiones: sin DOM ni red, se usa desde el navegador y desde los tests.

const ALFABETO = 'abcdefghijklmnopqrstuvwxyz0123456789';

export function nuevoId(prefijo) {
  let s = '';
  for (let i = 0; i < 6; i++) s += ALFABETO[Math.floor(Math.random() * ALFABETO.length)];
  return prefijo + s;
}

export function normalizarCodigo(texto) {
  return String(texto).trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

export const codigoValido = (codigo) => /^[a-z0-9-]{3,30}$/.test(codigo);

export const pasosDeSesion = (config) => ['inicio', ...config.pasos.map(p => p.id), 'cierre', 'final'];

// Todas las preguntas de la config, cada una con su paso.
function preguntasDe(config) {
  const out = [];
  for (const paso of config.pasos) {
    if (paso.tipo === 'lista') { for (const pregunta of paso.preguntas || []) if (pregunta) out.push({ pregunta, paso }); }
    else if (paso.tipo === 'pregunta' && paso.pregunta) out.push({ pregunta: paso.pregunta, paso });
  }
  return out;
}

export const buscarPregunta = (config, preguntaId) =>
  preguntasDe(config).find(x => x.pregunta.id === preguntaId) || null;

export const opcionesDe = (config, preguntaId) => buscarPregunta(config, preguntaId)?.paso.opciones || [];

export function validarConfig(config) {
  if (!config || typeof config !== 'object') return ['La configuración de la sesión está vacía o dañada.'];
  const err = [];
  if (typeof config.titulo !== 'string' || !config.titulo.trim()) err.push('Falta el título de la sesión.');
  if (typeof config.final?.titulo !== 'string' || !config.final.titulo.trim()) err.push('Falta el título del mensaje final.');
  if (!Array.isArray(config.pasos) || !config.pasos.length) err.push('La sesión necesita al menos un paso.');
  const vistos = new Set();
  const id = (x) => { if (vistos.has(x)) err.push(`Hay un id repetido: ${x}.`); vistos.add(x); };
  const opciones = (ops, donde) => {
    ops.forEach(o => id(o.id));
    if (ops.length && (ops.length < 2 || ops.length > 6)) err.push(`${donde} tiene que tener entre 2 y 6 opciones (o ninguna, para respuesta libre).`);
  };
  (Array.isArray(config.pasos) ? config.pasos : []).forEach((paso, i) => {
    id(paso.id);
    const nombre = `El paso ${i + 1}`;
    if (paso.tipo === 'registro') {
      if (!paso.campos?.length) err.push(`${nombre} (registro) necesita al menos un campo.`);
      paso.campos?.forEach(c => {
        id(c.id);
        if (c.tipo === 'seleccion' && (c.opciones?.length || 0) < 2) err.push(`El campo "${c.etiqueta}" necesita al menos 2 opciones.`);
      });
      if (paso.obligatorio && i !== 0) err.push('El registro obligatorio tiene que ser el primer paso.');
    } else if (paso.tipo === 'lista') {
      if (!paso.preguntas?.length) err.push(`${nombre} (lista) necesita al menos una pregunta.`);
      paso.preguntas?.forEach(q => id(q.id));
      opciones(paso.opciones || [], nombre);
    } else if (paso.tipo === 'pregunta') {
      if (paso.pregunta) id(paso.pregunta.id);
      else err.push(`${nombre} (pregunta) no tiene la pregunta: falta el texto.`);
      opciones(paso.opciones || [], nombre);
    }
  });
  return err;
}

export function cambiosBloqueados(vieja, nueva, conteos) {
  const err = [];
  const hoy = new Map(preguntasDe(nueva).map(x => [x.pregunta.id, x]));
  for (const { pregunta, paso } of preguntasDe(vieja)) {
    const n = conteos[pregunta.id] || 0;
    const actual = hoy.get(pregunta.id);
    if (n > 0 && !actual) { err.push(`No se puede borrar la pregunta "${pregunta.texto}": ya tiene ${n} respuestas.`); continue; }
    if (!actual) continue;
    const antes = paso.opciones || [], ahora = actual.paso.opciones || [];
    if (n > 0 && (antes.length === 0) !== (ahora.length === 0))
      err.push(`No se puede pasar "${pregunta.texto}" entre respuesta libre y opciones: ya tiene ${n} respuestas.`);
    for (const o of antes) {
      const c = conteos[`${pregunta.id}:${o.id}`] || 0;
      if (c === 0) continue;
      const nueva = ahora.find(x => x.id === o.id);
      if (!nueva) err.push(`No se puede borrar la opción "${o.texto}" de "${pregunta.texto}": ya tiene ${c} respuestas.`);
      else if (nueva.pideTexto !== o.pideTexto) err.push(`No se puede cambiar si la opción "${o.texto}" pide comentario: ya tiene ${c} respuestas.`);
    }
  }
  return err;
}

export const claveLocal = (sesion, ...partes) => `${sesion.id}:${sesion.ronda}:${partes.join(':')}`;
