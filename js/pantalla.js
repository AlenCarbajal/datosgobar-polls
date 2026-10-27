// Vista proyectada (pantalla.html?s=codigo): la maneja quien presenta (admin con sesión iniciada, o ?demo),
// con los botones de abajo o con el teclado / un control remoto de presentaciones.
import { CONFIG } from '../config.js';
import { $, esc, dibujarQr, cargarSesion } from './ui.js';
import { normalizarCodigo, codigoValido, pasosDeSesion, opcionesDe } from './sesion.js';
import { contar, grillaPara } from './resultados.js';
import { aplicarTema, resolverEstetica } from './tema.js';

const escena = $('#escena');
let api, sesion, codigo, demo = false, manda = false, timer, ocultar;
let respuestas = [], inscriptos = 0, presentes = null;
let detalle = null;   // pregunta abierta desde un resumen (solo en esta pantalla)
let ultimoCambio = 0; // una lectura que salió antes de terminar un cambio de paso trae el paso viejo: se ignora
let enCurso = 0;      // cambios de paso sin confirmar
const qrGrande = document.createElement('div'), qrChico = document.createElement('div'); // se dibujan una vez y se mueven

const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;
const pasoActual = () => pasosDeSesion(sesion.config).includes(sesion.paso) ? sesion.paso : 'inicio';
const pasoDe = (id) => sesion.config.pasos.find(p => p.id === id);
const todas = (config) => config.pasos.flatMap(p => p.tipo === 'lista' ? p.preguntas : p.tipo === 'pregunta' ? [p.pregunta] : []);
const nombrePaso = (id) => ({ inicio: 'Bienvenida', cierre: 'Cierre', final: 'Mensaje final' })[id]
  ?? (p => p.tipo === 'pregunta' ? p.pregunta.texto : p.titulo)(pasoDe(id));
// contar() no trae las preguntas sin respuestas: van en cero.
const conteo = (c, id) => c[id] || { total: 0, textos: [], opciones: opcionesDe(sesion.config, id).map(o => ({ ...o, n: 0, pct: 0 })) };

function estado(texto) { Object.assign($('#estado'), { hidden: !texto, textContent: texto }); }

function pintarMarca() {
  const e = resolverEstetica(sesion ? sesion.config.estetica : { preset: CONFIG.preset });
  $('#marca').innerHTML = e.logo ? `<img class="encabezado__logo" src="${esc(e.logo)}" alt="${esc(e.organismo || 'Logo de la organización')}">`
    : e.organismo ? `<span class="encabezado__organismo">${esc(e.organismo)}</span>` : '';
  $('#evento').textContent = e.encabezado;
}

// ---------- Escenas ----------
const textoPresentes = () => presentes === null ? '' : plural(presentes, 'persona conectada', 'personas conectadas');

function bienvenida(config) {
  const { encabezado } = resolverEstetica(config.estetica);
  return `<div class="bienvenida"><div>
      ${encabezado ? `<p class="eyebrow">${esc(encabezado)}</p>` : ''}
      <h1 class="titulo-grande">${esc(config.titulo)}</h1>
      <p>Sumate desde tu celular: escaneá el código QR.</p>
      <p>Código: <span class="codigo">${esc(codigo)}</span></p>
      <p id="presentes"${presentes === null ? ' hidden' : ''}>${textoPresentes()}</p>
    </div><div class="qr" id="qr-grande"></div></div>`;
}

function cabeza(titulo, eyebrow = '', descripcion = '', volver = false) {
  return `<div class="cabeza"><div>
      ${volver ? '<button type="button" class="boton boton--secundario" data-detalle="">← Volver al resumen</button>' : ''}
      ${eyebrow ? `<p class="eyebrow">${esc(eyebrow)}</p>` : ''}
      <h1>${esc(titulo)}</h1>
      ${descripcion ? `<p class="descripcion">${esc(descripcion)}</p>` : ''}
    </div><div class="qr-chico"><p><span class="suave">Código</span><b>${esc(codigo)}</b></p><div class="qr" id="qr-chico"></div></div></div>`;
}

// La opción con más respuestas va en el color de acento; las demás, en el secundario.
const barra = (o, max) => `<div class="barra${o.n === max ? '' : ' barra--secundaria'}" style="--valor: ${o.pct}%"><span>${esc(o.texto)}</span>`
  + `<b>${o.pct}% <span class="suave">· ${o.n}</span></b><span class="barra__pista"></span></div>`;
const barras = (opciones) => opciones.map(o => barra(o, Math.max(...opciones.map(x => x.n)))).join('');

function resultado(q, c) {
  const { total, opciones, textos } = conteo(c, q.id);
  return `<div class="detalle${textos.length ? '' : ' detalle--solo'}"><div>
      <p class="total"><b>${total}</b> ${total === 1 ? 'respuesta' : 'respuestas'}</p>
      ${barras(opciones)}
    </div>
    ${textos.length ? `<ul class="textos" aria-label="Textos más recientes">${textos.slice(0, 8).map(t => `<li>“${esc(t)}”</li>`).join('')}</ul>` : ''}
  </div>`;
}

// Cada tarjeta: las mismas barras con etiqueta que el detalle, de mayor a menor y en una línea por opción, y el total.
function mini(q, c) {
  const { total, opciones } = conteo(c, q.id);
  const dato = opciones.length ? `<span class="mini__barras">${barras([...opciones].sort((a, b) => b.n - a.n))}</span>`
    : '<span class="mini__dato">Respuesta libre</span>';
  return `<button type="button" class="mini" data-detalle="${esc(q.id)}"><span class="mini__texto">${esc(q.texto)}</span>
    ${dato}<span class="suave mini__total">${plural(total, 'respuesta', 'respuestas')}</span></button>`;
}

function dibujar() {
  const { config } = sesion, paso = pasoActual(), p = pasoDe(paso), c = contar(config, respuestas);
  const corta = location.host + location.pathname.replace(/[^/]*$/, 'participar.html') + '?s=' + codigo;
  const resumible = paso === 'cierre' ? todas(config) : p?.tipo === 'lista' ? p.preguntas : null;
  const i = resumible ? resumible.findIndex(q => q.id === detalle) : -1;
  if (!qrGrande.childElementCount) {
    const destino = location.protocol + '//' + corta + (demo ? '&demo' : '');
    dibujarQr(qrGrande, destino, 512);
    dibujarQr(qrChico, destino, 256);
  }
  escena.innerHTML = paso === 'inicio' ? bienvenida(config)
    : paso === 'final' ? `<div class="grande"><h1 class="titulo-grande">${esc(config.final.titulo)}</h1><p>${esc(config.final.texto)}</p></div>`
    : i >= 0 ? cabeza(resumible[i].texto, paso === 'cierre' ? `Resumen · ${i + 1} de ${resumible.length}` : `${p.titulo} · ${i + 1} de ${resumible.length}`,
        resumible[i].descripcion, true) + resultado(resumible[i], c)
    : resumible ? cabeza(paso === 'cierre' ? 'Resumen' : p.titulo, paso === 'cierre' ? config.titulo : '')
        + (resumible.length ? `<div class="resumen">${resumible.map(q => mini(q, c)).join('')}</div>` : '')
    : p.tipo === 'registro' ? cabeza(p.titulo) + `<div class="grande"><span class="numero">${inscriptos}</span>
        <p>${inscriptos === 1 ? 'persona registrada' : 'personas registradas'}</p></div>`
    : cabeza(p.pregunta.texto, 'Pregunta', p.pregunta.descripcion) + resultado(p.pregunta, c);
  $('#qr-grande')?.append(qrGrande);
  $('#qr-chico')?.append(qrChico);
  ajustarGrilla();
  controles();
}

function ajustarGrilla() {
  const g = $('.resumen');
  if (!g) return;
  const { columnas, filas } = grillaPara(g.childElementCount, g.clientWidth, g.clientHeight);
  g.style.gridTemplateColumns = `repeat(${columnas}, minmax(0, 1fr))`;
  g.style.gridTemplateRows = `repeat(${filas}, minmax(0, 1fr))`;
  g.style.maxHeight = `calc(${filas} * 15rem + ${filas - 1} * .75rem)`; // con pocas preguntas, tarjetas de hasta 15rem
  for (const b of g.querySelectorAll('.mini__barras')) {
    const filas = [...b.children], total = b.parentElement.querySelector('.mini__total');
    filas.forEach(f => { f.hidden = false; });
    const limite = b.getBoundingClientRect().bottom + 1;
    const ocultas = filas.filter(f => f.getBoundingClientRect().bottom > limite);
    ocultas.forEach(f => { f.hidden = true; });
    if (ocultas.length) total.dataset.mas = `+${ocultas.length} ${ocultas.length === 1 ? 'opción' : 'opciones'}`;
    else delete total.dataset.mas;
  }
}

// Con respuestas nuevas: en la bienvenida solo cambia el contador; el resto se redibuja.
const pintar = () => { if (sesion && !['inicio', 'final'].includes(pasoActual())) dibujar(); };

// ---------- Controles ----------
function controles() {
  if (!manda) return;
  const pasos = pasosDeSesion(sesion.config), i = pasos.indexOf(pasoActual());
  $('#ant').disabled = i === 0;
  $('#sig').hidden = pasos[i] === 'final';
  $('#sig').textContent = pasos[i + 1] === 'final' ? 'Finalizar' : 'Siguiente →';
  $('#paso-nombre').textContent = nombrePaso(pasos[i]);
}

// Visible mientras el mouse está sobre la barra (o hay foco de teclado en ella); al salir, se oculta.
function mostrarControles(cerca = true) {
  clearTimeout(ocultar);
  if (cerca) document.body.classList.remove('quieto');
  else ocultar = setTimeout(() => document.body.classList.add('quieto'), 400);
}

function ver(paso) { sesion = { ...sesion, paso }; detalle = null; dibujar(); }

// Escrituras en cola: una a la vez y, si mientras tanto se pulsó de nuevo, solo el último destino.
let destino = null, escribiendo = false, confirmado;
async function mover(delta) {
  if (!sesion) return;
  const pasos = pasosDeSesion(sesion.config), anterior = pasoActual();
  const nuevo = pasos[Math.min(pasos.length - 1, Math.max(0, pasos.indexOf(anterior) + delta))];
  if (nuevo === anterior) return;
  if (!escribiendo) confirmado = anterior;
  destino = nuevo;
  ver(nuevo);
  if (escribiendo) return;
  escribiendo = true; enCurso++;
  const id = sesion.id;
  while (destino !== null && sesion) {
    const n = destino; destino = null;
    try {
      await api.cambiarPaso(id, n);
      confirmado = n;
      estado('');
      if (sesion && pasoDe(n)?.tipo === 'registro') refrescar(); // traer el total de inscriptos ya
    } catch {
      if (sesion && destino === null && pasoActual() === n) ver(confirmado);
      estado('No se pudo cambiar el paso. Revisá la conexión y que sigas con la sesión iniciada en el formulario.');
    }
  }
  destino = null; escribiendo = false;
  if (--enCurso === 0) ultimoCambio = Date.now();
}

function activarControles() {
  const barra = $('#controles');
  barra.hidden = false;
  barra.addEventListener('mousedown', e => e.preventDefault()); // un clic no deja el foco en el botón (la barra espaciadora seguiría "clicándolo")
  barra.addEventListener('focusin', mostrarControles);
  $('#ant').onclick = () => mover(-1);
  $('#sig').onclick = () => mover(1);
  addEventListener('mousemove', e => mostrarControles(e.clientY >= innerHeight - barra.offsetHeight));
  document.documentElement.addEventListener('mouseleave', () => mostrarControles(false));
  // Flechas, AvPág/RePág y barra espaciadora: funcionan con un control remoto de presentaciones.
  addEventListener('keydown', e => {
    if (e.repeat) return;
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.key === ' ' && e.target.closest?.('button')) return; // con teclado, espacio activa el botón con foco
    if (['ArrowRight', 'PageDown', ' '].includes(e.key)) { e.preventDefault(); mover(1); }
    if (['ArrowLeft', 'PageUp'].includes(e.key)) { e.preventDefault(); mover(-1); }
  });
  controles();
  ocultar = setTimeout(() => document.body.classList.add('quieto'), 3000); // al abrir se ve 3 s
}

// ---------- Datos: Realtime + respaldo cada 15 s (3 s en un registro) ----------
function recibir(s, inicio) {
  if (!s || s.archivada) {
    sesion = null; clearTimeout(timer);
    $('#controles').hidden = true;
    escena.innerHTML = '<div class="grande"><h1>Esta sesión ya no está disponible</h1></div>';
    return;
  }
  if (!sesion) return; // se archivó y ya no hay nada que mostrar
  if (enCurso || inicio <= ultimoCambio) s = { ...s, paso: sesion.paso }; // lectura vieja: el paso local manda
  const reinicio = s.ronda !== sesion.ronda, tema = JSON.stringify(s.config.estetica) !== JSON.stringify(sesion.config.estetica);
  if (s.paso !== sesion.paso) detalle = null;
  sesion = s;
  if (tema) { aplicarTema(s.config.estetica); pintarMarca(); }
  dibujar();
  if (reinicio) { respuestas = []; refrescar(); } // se borraron las respuestas: vaciar y traer la lista nueva
}

async function refrescar() {
  clearTimeout(timer);
  if (!sesion) return;
  const inicio = Date.now(), id = sesion.id;
  try {
    const [s, rs] = await Promise.all([api.sesionPorCodigo(codigo), api.respuestas(id)]);
    if (!sesion) return;
    // Una respuesta que llegó por Realtime durante la lectura no se pierde; si hubo reinicio (otra ronda), manda la lista nueva.
    respuestas = s && s.ronda !== sesion.ronda ? rs : [...new Map([...respuestas, ...rs].map(r => [r.id, r])).values()];
    if (pasoDe(s?.paso)?.tipo === 'registro' || pasoDe(pasoActual())?.tipo === 'registro')
      inscriptos = (await api.resumenInscripciones(id).catch(() => null))?.total ?? inscriptos; // si falla, que no corte lo demás
    recibir(s, inicio);
    estado('');
  } catch {
    estado('Sin conexión con la base. Reintentando…');
  }
  clearTimeout(timer);
  if (sesion) timer = setTimeout(refrescar, pasoDe(pasoActual())?.tipo === 'registro' ? 3000 : 15000);
}

function alRespuesta(r) {
  if (!sesion) return;
  if (!r) return refrescar(); // demo: avisa sin la fila
  if (respuestas.some(x => x.id === r.id)) return;
  respuestas.push(r);
  pintar();
}

function alPresentes(n) {
  presentes = n;
  const el = $('#presentes');
  if (el) Object.assign(el, { hidden: false, textContent: textoPresentes() });
}

// ---------- Sin código ----------
function formCodigo(error = '') {
  escena.innerHTML = `<form class="tarjeta formulario" id="form-codigo" novalidate>
      <h1>Abrir la pantalla</h1>
      ${error ? `<p class="mensaje mensaje--error" role="alert">${esc(error)}</p>` : ''}
      <label class="campo" for="codigo">Código de la sesión</label>
      <input id="codigo" autocomplete="off" autocapitalize="none" spellcheck="false" aria-describedby="codigo-error">
      <p class="mensaje mensaje--error" id="codigo-error" hidden></p>
      <p class="acciones"><button class="boton">Abrir</button></p>
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

// ---------- Arranque ----------
try {
  demo = new URLSearchParams(location.search).has('demo');
  const r = await cargarSesion();
  if (r) ({ api, demo, codigo } = r);
  if (r?.sesion) {
    sesion = r.sesion;
    pintarMarca();
    dibujar();
    escena.addEventListener('click', e => { // abrir una pregunta del resumen, o volver
      const b = e.target.closest('[data-detalle]');
      if (b) { detalle = b.dataset.detalle || null; dibujar(); }
    });
    addEventListener('keydown', e => { if (e.key === 'Escape' && sesion && detalle) { detalle = null; dibujar(); } });
    addEventListener('resize', ajustarGrilla);
    document.fonts?.ready.then(ajustarGrilla); // la tipografía del tema cambia cuánto entra en cada tarjeta
    api.escuchar(sesion.id, { alSesion: s => recibir(s, Date.now()), alRespuesta, alPresentes, comoPantalla: true });
    refrescar();
    manda = demo || await api.esAdmin().catch(() => false);
    if (manda && sesion) activarControles();
  } else {
    pintarMarca();
    formCodigo(r ? 'No encontramos una sesión activa con ese código.' : '');
  }
} catch {
  pintarMarca();
  escena.innerHTML = '<div class="grande"><h1>No pudimos abrir la sesión</h1><p>Revisá la conexión y recargá la página.</p></div>';
}
