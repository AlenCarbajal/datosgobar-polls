// Lógica pura del editor de sesiones (sin DOM): se usa desde js/admin.js y desde los tests.
import { nuevoId, codigoValido, validarConfig } from './sesion.js';
import { leerBloques } from './pegar.js';
import { resolverEstetica, contraste, colorTextoSobre } from './tema.js';

export const TIPOGRAFIAS = ['system-ui', 'Montserrat', 'Roboto', 'Open Sans', 'Lato', 'Source Sans 3', 'Merriweather'];
export const ESQUINAS = { rectas: 'Rectas', suaves: 'Suaves', redondeadas: 'Redondeadas' };

export const opcionNueva = (texto = '') => ({ id: nuevoId('o'), texto });
export const preguntaNueva = (texto = '') => ({ id: nuevoId('q'), texto });
export const campoNuevo = () => ({ id: nuevoId('c'), etiqueta: '', tipo: 'texto', obligatorio: false });

export function pasoNuevo(tipo) {
  if (tipo === 'registro') return { id: nuevoId('r'), tipo, titulo: 'Contanos quién sos', descripcion: '', obligatorio: false,
    campos: [{ ...campoNuevo(), etiqueta: 'Nombre', obligatorio: true }] };
  if (tipo === 'pregunta') return { id: nuevoId('g'), tipo, pregunta: preguntaNueva(), opciones: [opcionNueva('Sí'), opcionNueva('No')] };
  return { id: nuevoId('l'), tipo: 'lista', titulo: 'Preguntas', opciones: [opcionNueva('Ok'), opcionNueva('No')], preguntas: [] };
}

// Estética: solo el preset (los demás campos se heredan hasta que el admin los fije).
export const nuevaConfig = (titulo, preset) => ({
  titulo, instrucciones: '', estetica: { preset }, pasos: [pasoNuevo('lista')],
  final: { titulo: '¡Gracias por participar!', texto: '' },
});

export function pegarPreguntas(paso, texto) {
  const nuevas = leerBloques(texto).map(b => ({ ...preguntaNueva(b.texto), descripcion: b.descripcion, etiquetas: b.etiquetas }));
  paso.preguntas.push(...nuevas);
  return nuevas.length;
}

export function mover(lista, i, delta) {
  const j = i + delta;
  if (j < 0 || j >= lista.length) return false;
  [lista[i], lista[j]] = [lista[j], lista[i]];
  return true;
}

// Rutas tipo "pasos.1.preguntas.0.texto".
export const obtener = (obj, ruta) => ruta.split('.').reduce((o, k) => o?.[k], obj);
export function asignar(obj, ruta, valor) {
  const claves = ruta.split('.');
  const ultima = claves.pop();
  const destino = obtener(obj, claves.join('.')) ?? obj;
  if (valor === undefined) delete destino[ultima];
  else destino[ultima] = valor;
}

// Contrato R7: la estética guarda solo lo que el admin fijó; vacío/null borra el campo y vuelve al estilo.
export function fijarEstetica(estetica, campo, valor) {
  const e = { ...estetica };
  if (valor === '' || valor == null) delete e[campo];
  else e[campo] = valor;
  return e;
}

export function avisosContraste(estetica) {
  const e = resolverEstetica(estetica);
  const pobre = (c) => contraste(c, colorTextoSobre(c)) < 4.5;
  const avisos = [];
  for (const [k, nombre] of [['colorPrincipal', 'color principal'], ['colorAcento', 'color de acento']])
    if (pobre(e[k])) avisos.push(`El ${nombre} no deja leer bien el texto encima (ni blanco ni oscuro). Elegí uno más oscuro o más claro.`);
  return avisos;
}

export function errorCodigo(codigo, existentes) {
  if (!codigoValido(codigo)) return 'El código tiene que tener entre 3 y 30 letras, números o guiones.';
  if (existentes.includes(codigo)) return 'Ya hay una sesión con ese código. Elegí otro.';
  return '';
}

// Acepta la config sola o una sesión entera ({ codigo, config, … }). Solo devuelve configs válidas.
export function leerConfigJson(texto) {
  let x;
  try { x = JSON.parse(texto); } catch { throw new Error('El texto no es un JSON válido. Copialo completo, desde la primera { hasta la última }.'); }
  const objeto = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
  const c = objeto(x) && objeto(x.config) ? x.config : x;
  if (!objeto(c) || !Array.isArray(c.pasos))
    throw new Error('El JSON no parece la configuración de una sesión (le faltan los pasos).');
  const errores = validarConfig(c);
  if (errores.length) throw new Error('No se puede usar este JSON: ' + errores.join(' '));
  const e = c.estetica ??= {};
  if ('tipografia' in e && !TIPOGRAFIAS.includes(e.tipografia)) delete e.tipografia; // desconocida: usa la del estilo
  if ('esquinas' in e && !Object.hasOwn(ESQUINAS, e.esquinas)) delete e.esquinas;
  return c;
}

// Lo que validarConfig no mira: textos vacíos que se verían en blanco en la pantalla.
export function revisarTextos(config) {
  const err = [];
  const vacio = (s) => !String(s ?? '').trim();
  config.pasos.forEach((p, i) => {
    const n = `El paso ${i + 1}`;
    if (p.campos?.some(c => vacio(c.etiqueta))) err.push(`${n} tiene un campo sin nombre.`);
    if (p.opciones?.some(o => vacio(o.texto))) err.push(`${n} tiene una opción sin texto.`);
    const qs = p.tipo === 'lista' ? p.preguntas || [] : p.tipo === 'pregunta' && p.pregunta ? [p.pregunta] : [];
    if (qs.some(q => vacio(q.texto))) err.push(`${n} tiene una pregunta sin texto.`);
  });
  return err;
}

// Rellena lo que una config importada o vieja puede no traer, para que el editor no falle al dibujarla.
export function completar(config) {
  config.titulo ??= ''; config.instrucciones ??= ''; config.estetica ??= {};
  config.final ??= { titulo: '', texto: '' };
  if (!Array.isArray(config.pasos)) config.pasos = [];
  for (const p of config.pasos) {
    if (!p || typeof p !== 'object') continue;
    if (p.tipo === 'registro') p.campos ??= [];
    if (p.tipo === 'lista') p.preguntas ??= [];
    if (p.tipo === 'pregunta') p.pregunta ??= preguntaNueva();
    if (p.tipo !== 'registro') p.opciones ??= [];
  }
  return config;
}
