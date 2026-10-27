// Formulario de administración (admin.html): entrar, lista de sesiones, editor y admins. Requiere Supabase.
import { CONFIG } from '../config.js';
import { $, esc, mensaje, dibujarQr } from './ui.js';
import { normalizarCodigo, validarConfig, cambiosBloqueados, pasosDeSesion } from './sesion.js';
import { armarCsv } from './csv.js';
import { aplicarTema, resolverEstetica, PRESETS } from './tema.js';
import { crearApi } from './datos.js';
import * as ed from './editor.js';

aplicarTema({ preset: CONFIG.preset });
const api = crearApi({ supabase: window.supabase.createClient(CONFIG.supabaseUrl, CONFIG.supabaseKey) });

let yo = '';          // email de quien entró, en minúsculas
let sesiones = [];
let actual = null;    // fila de la sesión que se edita
let original = null;  // su config tal como está guardada
let borrador = null;  // la config que se está editando

const VISTAS = ['cargando', 'entrar', 'no-autorizado', 'panel', 'editor'];
const mostrar = (v) => { for (const x of VISTAS) $('#' + x).hidden = x !== v; };
const enlace = (pagina, codigo) => new URL(`${pagina}?s=${encodeURIComponent(codigo)}`, location.href).href;
const sinGuardar = () => !$('#editor').hidden && JSON.stringify(borrador) !== JSON.stringify(original);
const falla = (e) => e?.message || String(e);

function descargar(nombre, texto, tipo) {
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([texto], { type: tipo })), download: nombre });
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function invalido(campo, msj, texto) {
  campo.setAttribute('aria-invalid', 'true');
  campo.focus();
  mensaje(msj, texto);
}

// Pide un texto en un <dialog>. Devuelve el valor, o null si se cancela.
function pedir({ titulo, texto, etiqueta, boton, normalizar = (v) => v.trim(), validar }) {
  const d = $('#dialogo'), form = d.querySelector('form'), input = $('#dialogo-valor'), msj = $('#dialogo-msj');
  $('#dialogo-titulo').textContent = titulo;
  $('#dialogo-texto').textContent = texto;
  $('#dialogo-etiqueta').textContent = etiqueta;
  $('#dialogo-ok').textContent = boton;
  input.value = ''; input.removeAttribute('aria-invalid'); msj.textContent = '';
  // Se resuelve a mano: tras un submit cancelado, Chrome no siempre dispara "close" en el <dialog>.
  return new Promise(res => {
    const fin = (valor) => {
      form.removeEventListener('submit', alEnviar);
      d.removeEventListener('close', alCerrar);
      if (d.open) d.close();
      res(valor);
    };
    const alCerrar = () => fin(null); // Escape
    const alEnviar = (ev) => {
      ev.preventDefault();
      if (ev.submitter?.value === 'cancelar') return fin(null);
      input.value = normalizar(input.value);
      const err = validar(input.value);
      if (err) invalido(input, msj, err);
      else fin(input.value);
    };
    form.addEventListener('submit', alEnviar);
    d.addEventListener('close', alCerrar);
    d.showModal();
  });
}

// ---------- Entrar ----------
async function inicio() {
  try {
    const u = await api.usuario();
    $('#cuenta').hidden = !u;
    if (!u) return mostrar('entrar');
    yo = u.email.toLowerCase();
    $('#quien').textContent = u.email;
    if (!(await api.esAdmin())) return mostrar('no-autorizado');
    mostrar('panel');
    // Ya entró: si falla la carga, se queda en el panel con el aviso (no vuelve al formulario de entrar).
    await listar().catch(e => mensaje($('#lista-msj'), 'No se pudo cargar la lista de sesiones: ' + falla(e) + '. Recargá la página.'));
    await listarAdmins().catch(e => mensaje($('#admins-msj'), 'No se pudo cargar la lista de admins: ' + falla(e) + '.'));
  } catch (e) {
    mostrar('entrar');
    mensaje($('#entrar-msj'), 'No se pudo conectar. Revisá la conexión y recargá la página.');
  }
}

$('#entrar').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const email = $('#email'), clave = $('#clave'), msj = $('#entrar-msj'), b = ev.submitter;
  email.removeAttribute('aria-invalid'); clave.removeAttribute('aria-invalid'); msj.textContent = '';
  if (!email.checkValidity()) return invalido(email, msj, 'Escribí tu email (por ejemplo, nombre@ejemplo.org).');
  if (!clave.value) return invalido(clave, msj, 'Escribí tu contraseña.');
  b.disabled = true;
  try {
    await api.entrar(email.value.trim(), clave.value);
    clave.value = '';
    await inicio();
  } catch {
    mensaje(msj, 'No pudimos entrar. Revisá el email y la contraseña.');
  } finally { b.disabled = false; }
});

$('#salir').addEventListener('click', async () => {
  if (sinGuardar() && !confirm('Hay cambios sin guardar. ¿Salir igual?')) return;
  borrador = original; // ya confirmó: que beforeunload no vuelva a preguntar
  await api.salir().catch(() => {});
  location.reload();
});

addEventListener('beforeunload', (ev) => { if (sinGuardar()) { ev.preventDefault(); ev.returnValue = ''; } });

// ---------- Lista de sesiones ----------
function estadoDe(s) {
  if (s.archivada) return 'Archivada';
  const nombres = { inicio: 'En la bienvenida', cierre: 'En el cierre', final: 'En el mensaje final' };
  if (nombres[s.paso]) return nombres[s.paso];
  const i = Array.isArray(s.config?.pasos) ? pasosDeSesion(s.config).indexOf(s.paso) : -1;
  return i > 0 ? `En el paso ${i} de ${s.config.pasos.length}` : nombres.inicio;
}

async function listar() {
  sesiones = await api.listarSesiones();
  const boton = (accion, texto, clase = 'boton--secundario') => `<button type="button" class="boton ${clase}" data-s="${accion}">${texto}</button>`;
  $('#sesiones').innerHTML = sesiones.length ? sesiones.map(s => `
    <li class="tarjeta sesion${s.archivada ? ' sesion--archivada' : ''}" data-id="${esc(s.id)}">
      <h3 id="s-${esc(s.id)}">${esc(s.config?.titulo || 'Sin título')}</h3>
      <p class="sesion__dato"><span class="sesion__codigo">${esc(s.codigo)}</span> · ${esc(estadoDe(s))}</p>
      <p class="acciones acciones--chicas" role="group" aria-labelledby="s-${esc(s.id)}">
        ${boton('editar', 'Editar', '')}
        <a class="boton boton--secundario" href="${esc(enlace('pantalla.html', s.codigo))}" target="_blank" rel="noopener">Abrir pantalla</a>
        ${boton('copiar', 'Copiar link de participantes')}
        ${boton('qr', 'Ver QR')}
        ${boton('csv', 'Exportar CSV')}
        ${boton('duplicar', 'Duplicar')}
        ${boton('archivar', s.archivada ? 'Desarchivar' : 'Archivar')}
        ${boton('reiniciar', 'Reiniciar resultados', 'boton--peligro')}
      </p>
    </li>`).join('') : '<li class="suave">Todavía no hay sesiones. Creá la primera arriba.</li>';
}

const accionesSesion = {
  editar: (s) => abrirEditor(s),
  async copiar(s, msj) {
    const url = enlace('participar.html', s.codigo);
    try { await navigator.clipboard.writeText(url); mensaje(msj, `Link copiado: ${url}`, false); }
    catch { mensaje(msj, `Copiá este link: ${url}`, false); }
  },
  qr(s) {
    const url = enlace('participar.html', s.codigo);
    $('#qr-link').textContent = url;
    $('#dialogo-qr').showModal();
    dibujarQr($('#qr'), url, 240);
  },
  async csv(s, msj) {
    const [rs, is] = await Promise.all([api.respuestas(s.id), api.inscripciones(s.id)]);
    descargar(`${s.codigo}-respuestas.csv`, armarCsv(s.config, rs, is), 'text/csv;charset=utf-8');
    mensaje(msj, `Descargado: ${rs.length} respuestas.`, false);
  },
  async duplicar(s, msj) {
    const codigo = await pedir({
      titulo: 'Duplicar sesión', texto: `Se crea una copia de "${s.config?.titulo}" sin respuestas.`,
      etiqueta: 'Código de la copia', boton: 'Duplicar', normalizar: normalizarCodigo,
      validar: (v) => ed.errorCodigo(v, sesiones.map(x => x.codigo)),
    });
    if (codigo == null) return;
    try { await api.crearSesion(codigo, structuredClone(s.config)); }
    catch (e) { if (e.code === '23505') return mensaje(msj, 'Ya hay una sesión con ese código. Probá con otro.'); throw e; }
    await listar();
    mensaje(msj, `Listo: se creó "${codigo}".`, false);
  },
  async archivar(s, msj) {
    await api.archivar(s.id, !s.archivada);
    await listar();
    mensaje(msj, s.archivada ? `"${s.codigo}" volvió a estar disponible.` : `"${s.codigo}" quedó archivada: ya no se puede entrar.`, false);
  },
  async reiniciar(s, msj) {
    const ok = await pedir({
      titulo: 'Reiniciar resultados',
      texto: `Se borran todas las respuestas y registros de "${s.config?.titulo}" y vuelve a la Bienvenida. No se puede deshacer.`,
      etiqueta: `Para confirmar, escribí el código: ${s.codigo}`, boton: 'Borrar resultados',
      validar: (v) => v === s.codigo ? '' : 'El código no coincide.',
    });
    if (ok == null) return;
    await api.reiniciar(s.id);
    await listar();
    mensaje(msj, `Se borraron los resultados de "${s.codigo}".`, false);
  },
};

$('#sesiones').addEventListener('click', async (ev) => {
  const b = ev.target.closest('[data-s]');
  if (!b) return;
  const s = sesiones.find(x => x.id === b.closest('[data-id]').dataset.id);
  const msj = $('#lista-msj');
  msj.textContent = '';
  b.disabled = true;
  try { await accionesSesion[b.dataset.s](s, msj); }
  catch (e) { mensaje(msj, 'No se pudo completar: ' + falla(e)); }
  finally { b.disabled = false; }
});

// ---------- Crear ----------
const codigoNuevo = $('#nuevo-codigo');
codigoNuevo.addEventListener('input', () => {
  const c = normalizarCodigo(codigoNuevo.value);
  $('#nuevo-codigo-ayuda').textContent = c ? `Link para participar: ${enlace('participar.html', c)}` : '';
});
codigoNuevo.addEventListener('change', () => { codigoNuevo.value = normalizarCodigo(codigoNuevo.value); });

$('#crear').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const titulo = $('#nuevo-titulo'), msj = $('#crear-msj');
  const codigo = codigoNuevo.value = normalizarCodigo(codigoNuevo.value);
  titulo.removeAttribute('aria-invalid'); codigoNuevo.removeAttribute('aria-invalid'); msj.textContent = '';
  if (!titulo.value.trim()) return invalido(titulo, msj, 'Escribí un título.');
  const err = ed.errorCodigo(codigo, sesiones.map(s => s.codigo));
  if (err) return invalido(codigoNuevo, msj, err);
  try {
    const s = await api.crearSesion(codigo, ed.nuevaConfig(titulo.value.trim(), CONFIG.preset));
    ev.target.reset();
    $('#nuevo-codigo-ayuda').textContent = '';
    await listar();
    abrirEditor(s);
  } catch (e) {
    mensaje(msj, e.code === '23505' ? 'Ya hay una sesión con ese código. Elegí otro.' : 'No se pudo crear: ' + falla(e));
  }
});

// ---------- Admins ----------
async function listarAdmins() {
  const lista = await api.admins();
  $('#admins').innerHTML = lista.map(e => e.toLowerCase() === yo
    ? `<li><span>${esc(e)} <span class="suave">(vos)</span></span></li>`
    : `<li><span>${esc(e)}</span><button type="button" class="boton boton--secundario" data-quitar="${esc(e)}" aria-label="Quitar a ${esc(e)}">Quitar</button></li>`).join('');
}

$('#admins').addEventListener('click', async (ev) => {
  const email = ev.target.closest('[data-quitar]')?.dataset.quitar;
  if (!email || email.toLowerCase() === yo) return;
  if (!confirm(`¿Quitar a ${email}? Ya no va a poder administrar.`)) return;
  try { await api.quitarAdmin(email); await listarAdmins(); mensaje($('#admins-msj'), `Se quitó a ${email}.`, false); }
  catch (e) { mensaje($('#admins-msj'), 'No se pudo quitar: ' + falla(e)); }
});

$('#agregar-admin').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const input = $('#admin-email'), msj = $('#admins-msj');
  input.removeAttribute('aria-invalid');
  if (!input.checkValidity()) return invalido(input, msj, 'Escribí un email válido.');
  try {
    await api.agregarAdmin(input.value);
    mensaje(msj, `Listo. Si ${input.value.trim()} todavía no tiene cuenta, creala en Supabase.`, false);
    ev.target.reset();
    await listarAdmins();
  } catch (e) {
    mensaje(msj, e.code === '23505' ? 'Ese email ya está autorizado.' : 'No se pudo autorizar: ' + falla(e));
  }
});

// ---------- Editor ----------
const TIPOS = { lista: 'Lista de preguntas', pregunta: 'Pregunta guiada', registro: 'Registro' };
const TIPOS_CAMPO = { texto: 'Texto corto', texto_largo: 'Texto largo', email: 'Email', telefono: 'Teléfono', numero: 'Número', seleccion: 'Desplegable (elegir de una lista)' };
const PIDE = [['', 'No pide texto'], ['opcional', 'Pide texto (opcional)'], ['obligatorio', 'Pide texto (obligatorio)']];
const { TIPOGRAFIAS, ESQUINAS } = ed;
const nombreFuente = (f) => f === 'system-ui' ? 'La del sistema' : f;

function abrirEditor(s) {
  actual = s;
  borrador = ed.completar(structuredClone(s.config));
  original = structuredClone(borrador);
  $('#editor-titulo').textContent = `Editar: ${s.codigo}`;
  $('#errores').hidden = true;
  $('#guardar-msj').textContent = '';
  $('#importar-msj').textContent = '';
  pintarEditor();
  mostrar('editor');
  scrollTo(0, 0);
}

function pintarEditor() {
  for (const el of document.querySelectorAll('#editor > .tarjeta [data-ruta]')) el.value = ed.obtener(borrador, el.dataset.ruta) ?? '';
  pintarEstetica();
  pintarPasos();
}

$('#volver').addEventListener('click', async () => {
  if (sinGuardar() && !confirm('Hay cambios sin guardar. ¿Volver a la lista igual?')) return;
  borrador = original = null;
  mostrar('panel');
  await listar().catch(e => mensaje($('#lista-msj'), 'No se pudo cargar la lista: ' + falla(e)));
});

// Texto, casillas y listas de una línea por ítem se escriben directo en el borrador.
function leerValor(el) {
  if (el.type === 'checkbox') return el.checked;
  if (el.dataset.forma === 'lineas') return el.value.split('\n').map(s => s.trim()).filter(Boolean);
  if (el.dataset.forma === 'opcional') return el.value || undefined;
  return el.value;
}

$('#editor').addEventListener('input', (ev) => {
  const el = ev.target, ruta = el.dataset.ruta;
  if (!ruta || !borrador) return;
  ed.asignar(borrador, ruta, leerValor(el));
  if (ruta.endsWith('.tipo')) { // tipo de campo de registro: las opciones solo existen en "seleccion"
    const campo = ed.obtener(borrador, ruta.slice(0, -5));
    if (campo.tipo === 'seleccion') campo.opciones ??= [];
    else delete campo.opciones;
    pintarPasos(el.id);
  }
});

// --- Estética: se guarda solo lo que se fija a mano (lo demás sale del estilo elegido) ---
const vista = $('#vista');
const vistaPrevia = () => vista.contentWindow?.postMessage({ estetica: borrador.estetica }, location.origin);
vista.addEventListener('load', () => { if (borrador) vistaPrevia(); });

function pintarAvisos() {
  $('#avisos-contraste').innerHTML = ed.avisosContraste(borrador.estetica).map(a => `<p class="mensaje mensaje--aviso">${esc(a)}</p>`).join('');
}

function pintarEstetica(foco) {
  const e = borrador.estetica, r = resolverEstetica(e), estilo = resolverEstetica({ preset: r.preset });
  const texto = (k, etiqueta, ayuda) => `
    <label class="campo" for="e-${k}">${etiqueta}</label>
    <input id="e-${k}" data-estetica="${k}" value="${esc(e[k] ?? '')}" placeholder="${esc(estilo[k] || '')}" aria-describedby="e-${k}-ayuda">
    <p class="ayuda" id="e-${k}-ayuda">${ayuda}</p>`;
  const color = (k, etiqueta) => `
    <label class="campo" for="e-${k}">${etiqueta}</label>
    <div class="color"><input type="color" id="e-${k}" data-estetica="${k}" value="${esc(r[k].toLowerCase())}">
      ${Object.hasOwn(e, k) ? `<button type="button" class="enlace" data-limpiar="${k}">Volver al color del estilo</button>` : '<span class="ayuda">El del estilo</span>'}</div>`;
  const elegir = (k, etiqueta, opciones, actual, heredado) => `
    <label class="campo" for="e-${k}">${etiqueta}</label>
    <select id="e-${k}" data-estetica="${k}">
      <option value="">Como el estilo (${esc(heredado)})</option>
      ${opciones.map(([v, t]) => `<option value="${esc(v)}"${v === actual ? ' selected' : ''}>${esc(t)}</option>`).join('')}
    </select>`;
  $('#estetica').innerHTML = `
    <label class="campo" for="e-preset">Estilo</label>
    <select id="e-preset" data-estetica="preset" aria-describedby="e-preset-ayuda">
      ${Object.keys(PRESETS).map(p => `<option${p === r.preset ? ' selected' : ''}>${esc(p)}</option>`).join('')}
    </select>
    <p class="ayuda" id="e-preset-ayuda">Cada estilo trae sus colores, letra y logo. Lo que cambies abajo tiene prioridad; un campo vacío usa lo del estilo.</p>
    ${texto('organismo', 'Nombre de la organización', 'Se muestra si no hay logo.')}
    ${texto('logo', 'Logo (dirección de la imagen)', 'Una dirección https://… o un archivo del sitio, como img/logo.png. Conviene claro: va sobre el color principal.')}
    ${texto('encabezado', 'Texto del encabezado', 'Por ejemplo, el nombre de la actividad.')}
    ${color('colorPrincipal', 'Color principal (encabezado)')}
    ${color('colorAcento', 'Color de acento (botones y barras)')}
    <div id="avisos-contraste" role="status"></div>
    ${elegir('tipografia', 'Tipografía', TIPOGRAFIAS.map(f => [f, nombreFuente(f)]), e.tipografia, nombreFuente(estilo.tipografia))}
    ${elegir('esquinas', 'Esquinas', Object.entries(ESQUINAS), e.esquinas, ESQUINAS[estilo.esquinas])}`;
  pintarAvisos();
  vistaPrevia();
  if (foco) document.getElementById(foco)?.focus();
}

$('#estetica').addEventListener('input', (ev) => {
  const k = ev.target.dataset.estetica;
  if (!k) return;
  let v = ev.target.value;
  if (!v.trim()) v = '';
  borrador.estetica = ed.fijarEstetica(borrador.estetica, k, v);
  pintarAvisos();
  vistaPrevia();
});
// Redibujar recién al soltar el selector de color (redibujar durante "input" lo cerraría).
$('#estetica').addEventListener('change', (ev) => {
  if (['preset', 'colorPrincipal', 'colorAcento'].includes(ev.target.dataset.estetica)) pintarEstetica(ev.target.id);
});
$('#estetica').addEventListener('click', (ev) => {
  const k = ev.target.dataset.limpiar;
  if (!k) return;
  borrador.estetica = ed.fijarEstetica(borrador.estetica, k, null);
  pintarEstetica('e-' + k);
});

// --- Pasos ---
const fid = (ruta) => 'f-' + ruta;

function entrada(ruta, etiqueta, { largo = false, lineas = false } = {}) {
  const v = ed.obtener(borrador, ruta);
  const valor = esc(lineas ? (v || []).join('\n') : v ?? '');
  const attrs = `id="${fid(ruta)}" data-ruta="${ruta}"${lineas ? ' data-forma="lineas"' : ''}`;
  return `<label class="campo" for="${fid(ruta)}">${etiqueta}</label>`
    + (largo || lineas ? `<textarea ${attrs} rows="2">${valor}</textarea>` : `<input ${attrs} value="${valor}">`);
}

const casilla = (ruta, etiqueta) =>
  `<label class="check"><input type="checkbox" data-ruta="${ruta}"${ed.obtener(borrador, ruta) ? ' checked' : ''}> ${etiqueta}</label>`;

function desplegable(ruta, etiqueta, opciones, forma = '') {
  const v = ed.obtener(borrador, ruta) ?? '';
  return `<label class="campo" for="${fid(ruta)}">${etiqueta}</label>
    <select id="${fid(ruta)}" data-ruta="${ruta}"${forma ? ` data-forma="${forma}"` : ''}>
      ${opciones.map(([val, t]) => `<option value="${esc(val)}"${val === v ? ' selected' : ''}>${esc(t)}</option>`).join('')}
    </select>`;
}

const ordenar = (ruta, i, n, nombre) => `<span class="mini-acciones">
    <button type="button" class="boton boton--secundario" data-accion="subir" data-ruta="${ruta}" data-i="${i}"${i === 0 ? ' disabled' : ''} aria-label="Subir ${nombre} ${i + 1}">↑</button>
    <button type="button" class="boton boton--secundario" data-accion="bajar" data-ruta="${ruta}" data-i="${i}"${i === n - 1 ? ' disabled' : ''} aria-label="Bajar ${nombre} ${i + 1}">↓</button>
    <button type="button" class="boton boton--peligro" data-accion="quitar" data-ruta="${ruta}" data-i="${i}" aria-label="Quitar ${nombre} ${i + 1}">Quitar</button>
  </span>`;

function editorOpciones(ruta) {
  const ops = ed.obtener(borrador, ruta);
  return `<fieldset class="item-editor"><legend class="campo">Opciones de respuesta</legend>
    <p class="ayuda">Entre 2 y 6, o ninguna para que respondan con texto libre. "Pide texto" sirve para opciones como "Comentar" u "Otro".</p>
    ${ops.map((o, j) => `<div class="opcion-fila">
      <div>${entrada(`${ruta}.${j}.texto`, `Opción ${j + 1}`)}</div>
      <div>${desplegable(`${ruta}.${j}.pideTexto`, '¿Pide texto?', PIDE, 'opcional')}</div>
      ${ordenar(ruta, j, ops.length, 'opción')}
    </div>`).join('')}
    <p class="acciones"><button type="button" class="boton boton--secundario" data-accion="agregar-opcion" data-ruta="${ruta}"${ops.length >= 6 ? ' disabled' : ''}>+ Agregar opción</button></p>
  </fieldset>`;
}

function editorPregunta(ruta, nombre) {
  return entrada(`${ruta}.texto`, nombre)
    + entrada(`${ruta}.descripcion`, 'Descripción <small>(opcional)</small>', { largo: true })
    + entrada(`${ruta}.etiquetas`, 'Etiquetas <small>(opcional, una por línea)</small>', { lineas: true });
}

function cuerpoPaso(p, r) {
  if (!TIPOS[p.tipo]) return '<p class="mensaje mensaje--aviso">Este tipo de paso no se puede editar acá. Quitalo o corregí el JSON.</p>';
  if (p.tipo === 'registro') return entrada(`${r}.titulo`, 'Título')
    + entrada(`${r}.descripcion`, 'Descripción <small>(opcional)</small>', { largo: true })
    + casilla(`${r}.obligatorio`, 'Obligatorio: nadie responde sin registrarse (tiene que ser el primer paso)')
    + `<fieldset class="item-editor"><legend class="campo">Campos</legend>
      ${p.campos.map((c, j) => `<div class="item-editor">
        ${entrada(`${r}.campos.${j}.etiqueta`, `Campo ${j + 1}: nombre`)}
        ${desplegable(`${r}.campos.${j}.tipo`, 'Tipo', Object.entries(TIPOS_CAMPO))}
        ${c.tipo === 'seleccion' ? entrada(`${r}.campos.${j}.opciones`, 'Opciones del desplegable <small>(una por línea)</small>', { lineas: true }) : ''}
        ${casilla(`${r}.campos.${j}.obligatorio`, 'Obligatorio')}
        ${ordenar(`${r}.campos`, j, p.campos.length, 'campo')}
      </div>`).join('')}
      <p class="acciones"><button type="button" class="boton boton--secundario" data-accion="agregar-campo" data-ruta="${r}.campos">+ Agregar campo</button></p>
    </fieldset>`;
  if (p.tipo === 'pregunta') return editorPregunta(`${r}.pregunta`, 'Pregunta') + editorOpciones(`${r}.opciones`);
  return entrada(`${r}.titulo`, 'Título de la lista')
    + editorOpciones(`${r}.opciones`)
    + `<p class="ayuda">Estas opciones valen para todas las preguntas de la lista.</p>
    <h4>Preguntas (${p.preguntas.length})</h4>
    ${p.preguntas.map((q, j) => `<div class="item-editor">
      ${editorPregunta(`${r}.preguntas.${j}`, `Pregunta ${j + 1}`)}
      ${ordenar(`${r}.preguntas`, j, p.preguntas.length, 'pregunta')}
    </div>`).join('')}
    <p class="acciones"><button type="button" class="boton boton--secundario" data-accion="agregar-pregunta" data-ruta="${r}.preguntas">+ Agregar pregunta</button></p>
    <details class="pegar"${p.preguntas.length ? '' : ' open'}><summary>Pegar varias preguntas de una vez</summary>
      <p class="ayuda">Una pregunta por línea. Para sumar descripción y etiquetas, empezá cada pregunta con "## " y abajo escribí la descripción y las etiquetas con "- ", así:</p>
      <pre class="ayuda">## Salud\nDatos de hospitales y vacunación.\n- Hospitales\n- Vacunas</pre>
      <label class="campo" for="pegar-${r}">Texto a pegar</label>
      <textarea id="pegar-${r}" rows="6"></textarea>
      <p class="acciones"><button type="button" class="boton" data-accion="pegar" data-ruta="${r}">Agregar estas preguntas</button></p>
    </details>`;
}

function pintarPasos(foco) {
  const n = borrador.pasos.length;
  $('#pasos').innerHTML = borrador.pasos.map((p, i) => `
    <section class="tarjeta paso" aria-labelledby="h-pasos.${i}">
      <div class="paso__cabeza"><h3 id="h-pasos.${i}" tabindex="-1">Paso ${i + 1} · ${esc(TIPOS[p.tipo] || p.tipo)}</h3>${ordenar('pasos', i, n, 'paso')}</div>
      ${cuerpoPaso(p, `pasos.${i}`)}
    </section>`).join('') || '<p class="tarjeta suave">Todavía no hay pasos. Agregá uno abajo.</p>';
  if (typeof foco === 'string') document.getElementById(foco)?.focus();
  else if (foco) foco();
}

$('#editor').addEventListener('click', (ev) => {
  const b = ev.target.closest('[data-accion]');
  if (!b || !borrador) return;
  const { accion, ruta, tipo } = b.dataset, i = Number(b.dataset.i);
  const lista = ruta && ed.obtener(borrador, ruta);
  const ultimo = () => lista.length - 1;
  switch (accion) {
    case 'agregar-paso':
      borrador.pasos.push(ed.pasoNuevo(tipo));
      return pintarPasos(`h-pasos.${borrador.pasos.length - 1}`);
    case 'agregar-pregunta': lista.push(ed.preguntaNueva()); return pintarPasos(fid(`${ruta}.${ultimo()}.texto`));
    case 'agregar-opcion': lista.push(ed.opcionNueva()); return pintarPasos(fid(`${ruta}.${ultimo()}.texto`));
    case 'agregar-campo': lista.push(ed.campoNuevo()); return pintarPasos(fid(`${ruta}.${ultimo()}.etiqueta`));
    case 'quitar': {
      if (ruta === 'pasos' && !confirm(`¿Quitar el paso ${i + 1} con todo su contenido?`)) return;
      lista.splice(i, 1);
      const paso = ruta === 'pasos' ? Math.min(i, ultimo()) : Number(ruta.split('.')[1]);
      return pintarPasos(`h-pasos.${paso}`);
    }
    case 'subir': case 'bajar': {
      const j = i + (accion === 'subir' ? -1 : 1);
      ed.mover(lista, i, j - i);
      const boton = (a) => document.querySelector(`[data-accion="${a}"][data-ruta="${CSS.escape(ruta)}"][data-i="${j}"]:not(:disabled)`);
      return pintarPasos(() => (boton(accion) || boton(accion === 'subir' ? 'bajar' : 'subir'))?.focus());
    }
    case 'pegar': {
      const n = ed.pegarPreguntas(lista, document.getElementById('pegar-' + ruta).value);
      return pintarPasos(() => {
        const destino = document.getElementById(n ? fid(`${ruta}.preguntas.${lista.preguntas.length - n}.texto`) : 'pegar-' + ruta);
        destino?.focus();
        mensaje($('#guardar-msj'), n ? `Se agregaron ${n} preguntas. Revisalas y tocá Guardar.` : 'No había preguntas en el texto pegado.', !n);
      });
    }
  }
});

// --- Guardar ---
$('#guardar').addEventListener('click', async () => {
  const b = $('#guardar'), msj = $('#guardar-msj'), caja = $('#errores');
  b.disabled = true;
  msj.className = ''; msj.textContent = 'Guardando…';
  try {
    // Las otras revisiones suponen una config bien formada: solo corren si validarConfig no encontró nada.
    let errores = validarConfig(borrador);
    if (!errores.length) errores = [...ed.revisarTextos(borrador), ...cambiosBloqueados(original, borrador, await api.conteos(actual.id))];
    if (errores.length) {
      caja.innerHTML = `<b>No se guardó. Corregí esto:</b><ul>${errores.map(e => `<li>${esc(e)}</li>`).join('')}</ul>`;
      caja.hidden = false;
      msj.textContent = '';
      caja.focus();
      return;
    }
    caja.hidden = true;
    await api.guardarConfig(actual.id, borrador);
    original = structuredClone(borrador);
    actual.config = structuredClone(borrador);
    mensaje(msj, 'Guardado.', false);
  } catch (e) {
    mensaje(msj, `No se pudo guardar (${falla(e)}). Tus cambios siguen acá: probá de nuevo.`);
  } finally { b.disabled = false; }
});

// --- Importar / exportar JSON ---
$('#exportar-json').addEventListener('click', () => descargar(`${actual.codigo}.json`, JSON.stringify(borrador, null, 2), 'application/json'));
$('#importar-archivo').addEventListener('change', async (ev) => {
  const f = ev.target.files[0];
  if (f) $('#importar-texto').value = await f.text();
});
$('#importar').addEventListener('click', () => {
  const msj = $('#importar-msj');
  try {
    const c = ed.leerConfigJson($('#importar-texto').value);
    if (!confirm('Esto reemplaza toda la configuración de esta sesión. ¿Seguir? (No se guarda hasta que toques Guardar.)')) return;
    borrador = ed.completar(c); // c ya pasó leerConfigJson (forma + validarConfig)
    pintarEditor();
    mensaje(msj, 'Listo. Revisá la sesión y tocá Guardar.', false);
  } catch (e) { mensaje(msj, e.message); }
});

inicio();
