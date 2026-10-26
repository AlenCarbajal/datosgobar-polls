// Helpers de DOM compartidos por participar, pantalla y admin.
import { CONFIG } from '../config.js';
import { normalizarCodigo, codigoValido } from './sesion.js';
import { aplicarTema } from './tema.js';
import { crearApi } from './datos.js';

export const $ = (sel) => document.querySelector(sel);
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);

export function mensaje(el, texto, esError = true) {
  el.className = 'mensaje ' + (esError ? 'mensaje--error' : 'mensaje--exito');
  el.textContent = texto;
}

// Usa qrcodejs (CDN) si la página lo cargó. Colores de los tokens: --texto siempre es oscuro, así el QR se lee.
export function dibujarQr(el, texto, lado) {
  el.replaceChildren();
  if (!window.QRCode) { el.textContent = texto; return; }
  const token = (k) => getComputedStyle(document.documentElement).getPropertyValue(k).trim();
  new window.QRCode(el, { text: texto, width: lado, height: lado, colorDark: token('--texto'), colorLight: token('--superficie') });
}

// Lee ?s= y ?demo. null = no hay código (mostrar el formulario). `sesion` null = no existe o está archivada.
// Con ?demo y sin ?s= usa la sesión de ejemplo; ?demo&s= (vacío) muestra el formulario.
export async function cargarSesion() {
  const q = new URLSearchParams(location.search);
  const demo = q.has('demo');
  const ejemplo = demo ? await (await fetch(new URL('../demo/sesion-ejemplo.json', import.meta.url))).json() : null;
  const codigo = normalizarCodigo(q.get('s') ?? (demo ? ejemplo.codigo : ''));
  if (!codigo) { aplicarTema({ preset: CONFIG.preset }); return null; }
  if (codigo !== q.get('s')) {
    q.set('s', codigo);
    history.replaceState(null, '', '?' + String(q).replace(/=(?=&|$)/g, '') + location.hash); // "?demo&s=x", no "?demo=&s=x"
  }
  const api = demo
    ? crearApi({ almacen: localStorage, sesionEjemplo: ejemplo })
    : crearApi({ supabase: window.supabase.createClient(CONFIG.supabaseUrl, CONFIG.supabaseKey) });
  const s = codigoValido(codigo) ? await api.sesionPorCodigo(codigo) : null;
  const sesion = s && !s.archivada ? s : null;
  aplicarTema(sesion ? sesion.config.estetica : { preset: CONFIG.preset });
  return { api, sesion, demo, codigo };
}
