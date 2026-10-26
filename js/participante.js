// Vista del participante (participar.html?s=codigo): sigue el paso que elige quien presenta.
import { CONFIG } from '../config.js';
import { $, esc, mensaje, cargarSesion } from './ui.js';
import { normalizarCodigo, codigoValido, pasosDeSesion, buscarPregunta, claveLocal } from './sesion.js';
import { aplicarTema, resolverEstetica } from './tema.js';

const YA_EXISTE = '23505'; // ya respondió esa pregunta o ya se inscribió: se trata como hecho
const app = $('#app');

let pid = localStorage.getItem('pid');
if (!pid) localStorage.setItem('pid', pid = crypto.randomUUID());

let api, sesion, demo = false, codigo, timer;
let pendiente = null; // sesión nueva que llegó con un formulario a medio completar: se aplica al enviar o volver
let elegida = null;   // paso lista: pregunta abierta en este celular

// Marcas locales: incluyen la ronda, así "Reiniciar" en admin las olvida.
const marcado = (...partes) => localStorage.getItem(claveLocal(sesion, ...partes)) === '1';
const marcar = (...partes) => localStorage.setItem(claveLocal(sesion, ...partes), '1');

const aviso = () => demo ? '<p class="mensaje mensaje--aviso">Modo de prueba: las respuestas se guardan solo en este navegador.</p>' : '';
const espera = (titulo, texto = '', antes = '') =>
  `<div class="espera"><div class="pulso" aria-hidden="true"></div>${antes}<h1>${titulo}</h1>${texto ? `<p class="suave">${texto}</p>` : ''}</div>`;
const hecho = (texto) => `<p class="hecho"><span aria-hidden="true">✓</span> ${texto}</p>`;
const reducido = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

// Encabezado del celular: solo el logo, o el nombre de la organización. El texto del evento va en la espera.
function pintarMarca() {
  const e = resolverEstetica(sesion ? sesion.config.estetica : { preset: CONFIG.preset });
  const html = e.logo ? `<img class="encabezado__logo" src="${esc(e.logo)}" alt="${esc(e.organismo || 'Logo de la organización')}">`
    : e.organismo ? `<span class="encabezado__organismo">${esc(e.organismo)}</span>` : '';
  $('#marca').innerHTML = html;
  $('#marca').hidden = !html;
}

// ---------- Código de la sesión ----------
function formCodigo(error = '') {
  app.innerHTML = `
    <h1>Ingresá el código</h1>
    <p class="suave">Lo ves en la pantalla, junto al código QR.</p>
    <form class="tarjeta" id="form-codigo" novalidate>
      ${error ? `<p class="mensaje mensaje--error" role="alert">${error}</p>` : ''}
      <label class="campo" for="codigo">Código de la sesión</label>
      <input id="codigo" autocomplete="off" autocapitalize="none" spellcheck="false" aria-describedby="codigo-error">
      <p class="mensaje mensaje--error" id="codigo-error" hidden></p>
      <p class="acciones"><button class="boton boton--ancho">Entrar</button></p>
    </form>`;
  $('#form-codigo').onsubmit = (e) => {
    e.preventDefault();
    const input = $('#codigo'), c = normalizarCodigo(input.value);
    if (!codigoValido(c)) {
      input.setAttribute('aria-invalid', 'true');
      Object.assign($('#codigo-error'), { hidden: false, textContent: 'Revisá el código: tiene entre 3 y 30 letras, números o guiones.' });
      return input.focus();
    }
    location.search = (demo ? '?demo&s=' : '?s=') + c;
  };
}

// ---------- Registro ----------
// Para que el celular ofrezca autocompletar con los datos guardados de la persona.
const AUTOCOMPLETAR = [[/mail/i, 'email'], [/apellido/i, 'family-name'], [/nombre/i, 'given-name'],
  [/tel[eé]fono|celular/i, 'tel'], [/organismo|organizaci|empresa|instituci/i, 'organization']];
const TIPOS = { email: 'email', telefono: 'tel', numero: 'number' };
const autocompletar = (c) => ({ email: 'email', telefono: 'tel' })[c.tipo] || AUTOCOMPLETAR.find(([re]) => re.test(c.etiqueta))?.[1] || 'on';

function campo(c) {
  const id = esc('campo-' + c.id);
  const attrs = `id="${id}" name="${esc(c.id)}" autocomplete="${autocompletar(c)}" aria-describedby="${id}-error"`;
  const control = c.tipo === 'texto_largo' ? `<textarea ${attrs} maxlength="1000"></textarea>`
    : c.tipo === 'seleccion' ? `<select ${attrs}><option value="">Elegí una opción</option>${(c.opciones || []).map(o => `<option>${esc(o)}</option>`).join('')}</select>`
    : `<input type="${TIPOS[c.tipo] || 'text'}" ${attrs} maxlength="200"${c.tipo === 'numero' ? ' inputmode="decimal"' : ''}>`;
  return `<label class="campo" for="${id}">${esc(c.etiqueta)}${c.obligatorio ? '' : ' <small>(opcional)</small>'}</label>
    ${control}<p class="mensaje mensaje--error" id="${id}-error" hidden></p>`;
}

// Encabezado del formulario: solo título y descripción del paso.
const formRegistro = (paso) => marcado('inscripto')
  ? `<div class="tarjeta"><h2>${esc(paso.titulo)}</h2>${hecho('Recibimos tu registro. ¡Gracias!')}</div>`
  : `<form class="tarjeta" id="registro" data-paso="${esc(paso.id)}" novalidate>
      <h2>${esc(paso.titulo)}</h2>
      ${paso.descripcion ? `<p class="suave">${esc(paso.descripcion)}</p>` : ''}
      ${paso.campos.map(campo).join('')}
      <p class="mensaje" role="status" id="msg"></p>
      <p class="acciones"><button type="submit" class="boton boton--ancho">Registrar</button></p>
    </form>`;

function conectarRegistro(form) {
  form.onsubmit = async (e) => {
    e.preventDefault();
    const paso = sesion.config.pasos.find(p => p.id === form.dataset.paso);
    const datos = {};
    let primero = null;
    for (const c of paso.campos) {
      const el = form.elements.namedItem(c.id), v = el.value.trim();
      const problema = c.obligatorio && !v ? `Completá ${c.etiqueta}.`
        : v && !el.checkValidity() ? `Revisá ${c.etiqueta}: parece incompleto.` : '';
      el.setAttribute('aria-invalid', String(!!problema));
      Object.assign(document.getElementById(el.id + '-error'), { hidden: !problema, textContent: problema });
      if (problema) primero ??= el;
      else if (v) datos[c.id] = v;
    }
    if (primero) return primero.focus();
    const boton = form.querySelector('[type=submit]');
    boton.disabled = true;
    try { await api.inscribir({ sesion_id: sesion.id, participante: pid, datos }); }
    catch (err) {
      if (err?.code !== YA_EXISTE) { boton.disabled = false; return mensaje($('#msg'), 'No pudimos guardar el registro. Revisá la conexión y probá de nuevo.'); }
    }
    marcar('inscripto');
    seguir();
  };
}

// ---------- Preguntas ----------
const etiquetas = (lista) => lista.map(t => `<li class="etiqueta">${esc(t)}</li>`).join('');

function formPregunta(q, opciones = []) {
  if (marcado('votado', q.id)) return `<div class="tarjeta"><h2>${esc(q.texto)}</h2>
    ${hecho('Ya registramos tu respuesta. Mirá la pantalla para ver los resultados.')}</div>`;
  const et = q.etiquetas || [];
  return `<form class="tarjeta pregunta" id="pregunta" data-pregunta="${esc(q.id)}" novalidate>
    <h2>${esc(q.texto)}</h2>
    ${q.descripcion ? `<p class="descripcion" id="desc">${esc(q.descripcion)}</p>
      <button type="button" class="enlace" id="ver-mas" aria-expanded="false" aria-controls="desc" hidden>Ver más</button>` : ''}
    ${et.length ? `<ul class="etiquetas">${etiquetas(et.slice(0, 6))}${et.length > 6
      ? `<li><button type="button" class="etiqueta etiqueta--mas" id="mas-etiquetas" aria-label="Ver ${et.length - 6} etiquetas más">+${et.length - 6}</button></li>` : ''}</ul>` : ''}
    ${opciones.length ? `<fieldset class="opciones"><legend class="campo">Tu respuesta</legend>
      ${opciones.map(o => `<label class="opcion"><input type="radio" name="opcion" value="${esc(o.id)}" data-pide="${esc(o.pideTexto || '')}"><span>${esc(o.texto)}</span></label>`).join('')}
    </fieldset>` : ''}
    <div id="caja-texto"${opciones.length ? ' hidden' : ''}>
      <label class="campo" for="texto">${opciones.length ? 'Comentario <small id="texto-nota"></small>' : 'Tu respuesta'}</label>
      <textarea id="texto" maxlength="1000"></textarea>
    </div>
    <p class="mensaje" role="status" id="msg"></p>
    <p class="acciones"><button type="submit" class="boton boton--ancho">Enviar</button></p>
  </form>`;
}

// Avance automático: lleva la vista (y el foco) a lo próximo que hay que tocar.
function enfocar(el, bloque) {
  el.focus({ preventScroll: true });
  el.scrollIntoView({ behavior: reducido() ? 'auto' : 'smooth', block: bloque });
}

function conectarPregunta(form) {
  const id = form.dataset.pregunta, caja = $('#caja-texto'), texto = $('#texto'), msg = $('#msg');
  const enviar = form.querySelector('[type=submit]'), desc = $('#desc'), ver = $('#ver-mas');
  if (desc && desc.scrollHeight > desc.clientHeight + 1) {
    ver.hidden = false;
    ver.onclick = () => {
      const abierta = desc.classList.toggle('abierta');
      ver.textContent = abierta ? 'Ver menos' : 'Ver más';
      ver.setAttribute('aria-expanded', String(abierta));
    };
  }
  const mas = $('#mas-etiquetas');
  if (mas) mas.onclick = () => {
    const ul = mas.closest('ul');
    ul.innerHTML = etiquetas(buscarPregunta(sesion.config, id).pregunta.etiquetas);
    ul.firstElementChild.setAttribute('tabindex', '-1');
    ul.firstElementChild.focus(); // el botón desaparece: el foco no se pierde
  };
  form.addEventListener('change', (e) => {
    if (e.target.name !== 'opcion') return;
    const pide = e.target.dataset.pide;
    caja.hidden = !pide;
    texto.removeAttribute('aria-invalid');
    msg.textContent = '';
    if (pide) {
      $('#texto-nota').textContent = pide === 'obligatorio' ? '(obligatorio)' : '(opcional)';
      enfocar(texto, 'center');
    } else enfocar(enviar, 'nearest');
  });
  form.onsubmit = async (e) => {
    e.preventDefault();
    const radios = form.querySelectorAll('[name=opcion]'), elegido = form.querySelector('[name=opcion]:checked');
    const t = caja.hidden ? '' : texto.value.trim();
    if (radios.length && !elegido) { mensaje(msg, 'Elegí una opción antes de enviar.'); return radios[0].focus(); }
    if ((!radios.length || elegido.dataset.pide === 'obligatorio') && !t) {
      texto.setAttribute('aria-invalid', 'true');
      mensaje(msg, radios.length ? 'Escribí tu comentario antes de enviar.' : 'Escribí tu respuesta antes de enviar.');
      return texto.focus();
    }
    enviar.disabled = true; // doble toque: un solo envío
    try { await api.responder({ sesion_id: sesion.id, pregunta_id: id, participante: pid, opcion_id: elegido?.value ?? null, texto: t || null }); }
    catch (err) {
      if (err?.code !== YA_EXISTE) { enviar.disabled = false; return mensaje(msg, 'No pudimos guardar tu respuesta. Revisá la conexión y probá de nuevo.'); }
    }
    marcar('votado', id);
    const enLista = elegida !== null;
    elegida = null; // en una lista vuelve a la lista, con esta en verde
    seguir();
    if (enLista) scrollTo(0, 0);
  };
}

function lista(paso) {
  const qs = paso.preguntas, i = qs.findIndex(q => q.id === elegida);
  if (i >= 0) return `<div class="barra-superior">
      <button type="button" class="boton boton--secundario" id="volver">← Lista</button><span>${i + 1} de ${qs.length}</span>
    </div>` + formPregunta(qs[i], paso.opciones);
  const hechas = qs.filter(q => marcado('votado', q.id)).length;
  return `<h1>${esc(paso.titulo)}</h1>
    <p class="progreso-texto" id="progreso">${hechas} de ${qs.length} respondidas</p>
    <progress class="progreso" value="${hechas}" max="${qs.length}" aria-labelledby="progreso"></progress>
    <ul class="lista">${qs.map(q => {
      const ok = marcado('votado', q.id);
      return `<li><button type="button" class="item${ok ? ' item--hecho' : ''}" data-id="${esc(q.id)}">
        <span>${esc(q.texto)}</span><span class="item__estado">${ok ? '✓ Respondida' : 'Responder →'}</span></button></li>`;
    }).join('')}</ul>`;
}

// ---------- Vista según el paso ----------
function dibujar() {
  const { config } = sesion;
  const paso = pasosDeSesion(config).includes(sesion.paso) ? sesion.paso : 'inicio';
  const { encabezado } = resolverEstetica(config.estetica);
  const bienvenida = (encabezado ? `<p class="eyebrow">${esc(encabezado)}</p>` : '') + `<h1>${esc(config.titulo)}</h1>`;
  const primero = config.pasos[0];
  let html;
  if (paso !== 'final' && primero?.tipo === 'registro' && primero.obligatorio && !marcado('inscripto'))
    html = (paso === 'inicio' ? bienvenida : '') + formRegistro(primero); // se registran mientras esperan
  else if (paso === 'inicio')
    html = espera(esc(config.titulo), `${esc(config.instrucciones)} Cuando empiece, vas a ver acá cada pregunta sin recargar la página.`,
      encabezado ? `<p class="eyebrow">${esc(encabezado)}</p>` : '');
  else if (paso === 'cierre') html = espera('¡Gracias! Mirá la pantalla.');
  else if (paso === 'final') html = `<div class="espera"><h1>${esc(config.final.titulo)}</h1><p class="suave">${esc(config.final.texto)}</p></div>`;
  else {
    const p = config.pasos.find(x => x.id === paso);
    html = p.tipo === 'registro' ? formRegistro(p) : p.tipo === 'pregunta' ? formPregunta(p.pregunta, p.opciones) : lista(p);
  }
  app.innerHTML = aviso() + html;

  $('#volver')?.addEventListener('click', () => { elegida = null; seguir(); scrollTo(0, 0); });
  app.querySelectorAll('.item').forEach(b => b.onclick = () => { elegida = b.dataset.id; dibujar(); scrollTo(0, 0); });
  if ($('#pregunta')) conectarPregunta($('#pregunta'));
  if ($('#registro')) conectarRegistro($('#registro'));
  const form = app.querySelector('form');
  form?.addEventListener('input', () => form.classList.toggle('con-datos', sucio()));
}

// ¿El formulario visible tiene algo elegido o escrito sin enviar?
const sucio = () => [...(app.querySelector('form')?.elements || [])]
  .some(e => e.type === 'radio' ? e.checked : !!e.value?.trim());

// ---------- Cambios de la sesión (Realtime + respaldo cada 10 s) ----------
const igual = (a, b) => ['paso', 'ronda', 'archivada', 'config'].every(k => JSON.stringify(a[k]) === JSON.stringify(b[k]));

function aplicar(s) {
  if (s.paso !== sesion.paso || s.ronda !== sesion.ronda) elegida = null;
  const tema = JSON.stringify(s.config.estetica) !== JSON.stringify(sesion.config.estetica);
  sesion = s;
  pendiente = null;
  if (tema) { aplicarTema(s.config.estetica); pintarMarca(); }
  dibujar();
}

// Después de enviar o volver: aplica lo que haya quedado en espera.
const seguir = () => pendiente ? aplicar(pendiente) : dibujar();

function recibir(s) {
  if (!sesion) return;
  if (!s || s.archivada) { sesion = null; clearTimeout(timer); return formCodigo('No encontramos una sesión activa con ese código.'); }
  if (igual(s, sesion)) { pendiente = null; return; }
  // Con algo a medio escribir no se re-dibuja (se perdería). Un reinicio (ronda nueva) sí se aplica ya.
  if (s.ronda === sesion.ronda && sucio()) { pendiente = s; return; }
  aplicar(s);
}

async function sondear() {
  clearTimeout(timer);
  if (!sesion) return;
  try { recibir(await api.sesionPorCodigo(codigo)); } catch { /* sin conexión: el próximo intento lo resuelve */ }
  if (sesion) timer = setTimeout(sondear, 10000);
}

// Teclado del celular: al achicarse la vista, el campo con foco vuelve a quedar visible.
window.visualViewport?.addEventListener('resize', () => {
  const a = document.activeElement;
  if (a?.matches('textarea, input, select')) a.scrollIntoView({ block: 'center' });
});

try {
  const r = await cargarSesion();
  demo = new URLSearchParams(location.search).has('demo');
  if (r) ({ api, demo, codigo } = r);
  if (r?.sesion) {
    sesion = r.sesion;
    pintarMarca();
    dibujar();
    api.escuchar(sesion.id, { alSesion: recibir, participante: pid });
    document.addEventListener('visibilitychange', () => { if (!document.hidden) sondear(); }); // al desbloquear el celular
    timer = setTimeout(sondear, 10000);
  } else {
    pintarMarca();
    formCodigo(r ? 'No encontramos una sesión activa con ese código.' : '');
  }
} catch {
  pintarMarca();
  app.innerHTML = espera('No pudimos conectarnos', 'Revisá tu conexión y recargá la página.');
}
