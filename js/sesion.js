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

const esObjeto = (x) => !!x && typeof x === 'object' && !Array.isArray(x);
const TIPOS_PASO = ['registro', 'lista', 'pregunta'];

// Nunca lanza: una config importada a mano puede traer cualquier cosa.
export function validarConfig(config) {
  if (!esObjeto(config)) return ['La configuración de la sesión está vacía o dañada.'];
  const err = [];
  if (typeof config.titulo !== 'string' || !config.titulo.trim()) err.push('Falta el título de la sesión.');
  if (typeof config.final?.titulo !== 'string' || !config.final.titulo.trim()) err.push('Falta el título del mensaje final.');
  if (config.estetica !== undefined && !esObjeto(config.estetica)) err.push('La estética de la sesión está dañada.');
  if (!Array.isArray(config.pasos) || !config.pasos.length) err.push('La sesión necesita al menos un paso.');
  const vistos = new Set();
  const id = (x, que) => {
    if (typeof x !== 'string' || !x.trim()) return err.push(`${que} no tiene id.`);
    if (vistos.has(x)) err.push(`Hay un id repetido: ${x}.`);
    vistos.add(x);
  };
  // Lista de objetos: ausente = vacía; si no es lista o trae algo que no es objeto, se avisa y se ignora lo dañado.
  const lista = (v, que, donde) => {
    if (v === undefined) return [];
    if (!Array.isArray(v)) { err.push(`${donde}: ${que} tiene que ser una lista.`); return []; }
    const ok = v.filter(esObjeto);
    if (ok.length < v.length) err.push(`${donde}: hay ${que} dañadas.`);
    return ok;
  };
  const pregunta = (q, donde) => {
    id(q.id, `${donde}: una pregunta`);
    if (q.etiquetas !== undefined && (!Array.isArray(q.etiquetas) || q.etiquetas.some(e => typeof e !== 'string')))
      err.push(`${donde}: las etiquetas de una pregunta tienen que ser una lista de textos.`);
  };
  const opciones = (v, donde) => {
    const ops = lista(v, 'opciones', donde);
    ops.forEach(o => {
      id(o.id, `${donde}: una opción`);
      if (o.pideTexto !== undefined && o.pideTexto !== 'obligatorio' && o.pideTexto !== 'opcional')
        err.push(`${donde}: la opción "${o.texto}" tiene un "pide texto" desconocido.`);
    });
    if (ops.length && (ops.length < 2 || ops.length > 6)) err.push(`${donde} tiene que tener entre 2 y 6 opciones (o ninguna, para respuesta libre).`);
  };
  (Array.isArray(config.pasos) ? config.pasos : []).forEach((paso, i) => {
    const nombre = `El paso ${i + 1}`;
    if (!esObjeto(paso)) return err.push(`${nombre} está dañado.`);
    id(paso.id, nombre);
    if (!TIPOS_PASO.includes(paso.tipo)) return err.push(`${nombre} tiene un tipo desconocido: "${paso.tipo}".`);
    if (paso.tipo === 'registro') {
      const campos = lista(paso.campos, 'campos', nombre);
      if (!campos.length) err.push(`${nombre} (registro) necesita al menos un campo.`);
      campos.forEach(c => {
        id(c.id, `${nombre}: un campo`);
        if (c.opciones !== undefined && (!Array.isArray(c.opciones) || c.opciones.some(o => typeof o !== 'string')))
          err.push(`Las opciones del campo "${c.etiqueta}" tienen que ser una lista de textos.`);
        else if (c.tipo === 'seleccion' && (c.opciones?.length || 0) < 2) err.push(`El campo "${c.etiqueta}" necesita al menos 2 opciones.`);
      });
      if (paso.obligatorio && i !== 0) err.push('El registro obligatorio tiene que ser el primer paso.');
    } else if (paso.tipo === 'lista') {
      const preguntas = lista(paso.preguntas, 'preguntas', nombre);
      if (!preguntas.length) err.push(`${nombre} (lista) necesita al menos una pregunta.`);
      preguntas.forEach(q => pregunta(q, nombre));
      opciones(paso.opciones, nombre);
    } else {
      if (esObjeto(paso.pregunta)) pregunta(paso.pregunta, nombre);
      else err.push(`${nombre} (pregunta) no tiene la pregunta: falta el texto.`);
      opciones(paso.opciones, nombre);
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
