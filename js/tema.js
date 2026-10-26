// Estética: contraste, color de texto automático y aplicación de tokens al DOM.
// Las funciones puras no tocan `document` (se importan en tests con node).

const BLANCO = '#FFFFFF';
const OSCURO = '#1A1A1A';
const HEX = /^#[0-9a-f]{6}$/i;
const RADIOS = { rectas: '0px', suaves: '8px', redondeadas: '16px' };

export const ESTETICA_DEFECTO = {
  preset: 'neutro', organismo: '', logo: '', encabezado: '',
  colorPrincipal: '#1F2937', colorAcento: '#2563EB', tipografia: 'system-ui',
  esquinas: 'suaves', firma: false,
};

// Valores propios de cada preset de temas/. Un preset nuevo se agrega acá y en temas/<nombre>.css.
export const PRESETS = {
  neutro: {},
  'datos-gob-ar': {
    colorPrincipal: '#232D4F', colorAcento: '#393793', tipografia: 'Montserrat',
    logo: 'img/logo-datos-gob-ar-blanco.png', firma: true,
  },
};

function luminancia(hex) {
  const [r, g, b] = [1, 3, 5].map(i => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// Razón de contraste WCAG 2.1 entre dos colores #RRGGBB (1 a 21).
export function contraste(a, b) {
  const [l1, l2] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

export function colorTextoSobre(fondo) {
  return contraste(fondo, BLANCO) >= contraste(fondo, OSCURO) ? BLANCO : OSCURO;
}

// Contrato: la `estetica` guardada en una sesión tiene SOLO los campos que el admin fijó a mano.
// Precedencia: ESTETICA_DEFECTO < PRESETS[preset] < campos de la sesión.
// Lo vacío (''/null/undefined) o inválido se ignora y cae al valor del preset o del defecto.
export function resolverEstetica(estetica) {
  estetica ??= {};
  const preset = Object.hasOwn(PRESETS, estetica.preset) ? estetica.preset : 'neutro';
  const e = { ...ESTETICA_DEFECTO, ...PRESETS[preset] };
  for (const [k, v] of Object.entries(estetica)) if (v !== undefined && v !== null && v !== '') e[k] = v;
  e.preset = preset;
  for (const k of ['colorPrincipal', 'colorAcento']) {
    if (!HEX.test(e[k])) e[k] = PRESETS[preset][k] || ESTETICA_DEFECTO[k];
  }
  if (!Object.hasOwn(RADIOS, e.esquinas)) e.esquinas = ESTETICA_DEFECTO.esquinas;
  return e;
}

function link(id, href) {
  let l = document.getElementById(id);
  if (!l) {
    l = Object.assign(document.createElement('link'), { id, rel: 'stylesheet' });
    document.head.append(l);
  }
  l.href = href;
}

export function aplicarTema(estetica, raiz = document.documentElement) {
  const e = resolverEstetica(estetica);
  const css = {
    '--color-principal': e.colorPrincipal,
    '--color-acento': e.colorAcento,
    '--texto-sobre-principal': colorTextoSobre(e.colorPrincipal),
    '--texto-sobre-acento': colorTextoSobre(e.colorAcento),
    '--fuente': e.tipografia === 'system-ui' ? 'system-ui, sans-serif' : `'${e.tipografia}', system-ui, sans-serif`,
    '--radio': RADIOS[e.esquinas],
  };
  for (const [k, v] of Object.entries(css)) raiz.style.setProperty(k, v);
  raiz.toggleAttribute('data-firma', !!e.firma);

  // Relativo a este módulo, así funciona desde cualquier página (raíz o demo/).
  link('tema', new URL(`../temas/${e.preset}.css`, import.meta.url).href);
  if (e.tipografia === 'system-ui') document.getElementById('fuente')?.remove();
  else link('fuente', `https://fonts.googleapis.com/css2?family=${encodeURIComponent(e.tipografia).replace(/%20/g, '+')}:wght@400;500;600;700;800&display=swap`);
}
