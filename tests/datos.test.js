import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { crearApi } from '../js/datos.js';
import { validarConfig } from '../js/sesion.js';

const sesionEjemplo = JSON.parse(readFileSync(new URL('../demo/sesion-ejemplo.json', import.meta.url)));
const memoria = () => { const m = new Map(); return { getItem: k => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k) }; };
const nueva = () => crearApi({ almacen: memoria(), sesionEjemplo });
const resp = { sesion_id: sesionEjemplo.id, pregunta_id: 'q1', participante: 'p', opcion_id: 'o1', texto: null };

test('demo: responder dos veces lanza 23505', async () => {
  const api = nueva();
  await api.responder(resp);
  await assert.rejects(api.responder(resp), { code: '23505' });
  assert.equal((await api.respuestas(sesionEjemplo.id)).length, 1);
});
test('demo: inscribir dos veces lanza 23505', async () => {
  const api = nueva();
  const i = { sesion_id: sesionEjemplo.id, participante: 'p', datos: { nombre: 'A' } };
  await api.inscribir(i);
  await assert.rejects(api.inscribir(i), { code: '23505' });
  assert.deepEqual(await api.resumenInscripciones(sesionEjemplo.id), { total: 1 });
});
test('demo: cambiarPaso avisa a los suscriptores', async () => {
  const api = nueva();
  let visto; api.escuchar(sesionEjemplo.id, { alSesion: s => (visto = s.paso) });
  await api.cambiarPaso(sesionEjemplo.id, 'cierre');
  assert.equal(visto, 'cierre');
});
test('demo: responder avisa y desuscribir corta los avisos', async () => {
  const api = nueva();
  const vistas = []; const parar = api.escuchar(sesionEjemplo.id, { alRespuesta: (...a) => vistas.push(a.length ? a[0] : undefined) });
  await api.responder(resp);
  parar();
  await api.responder({ ...resp, pregunta_id: 'q2' });
  assert.deepEqual(vistas, [undefined]); // sin argumento: refetch
});
test('demo: reiniciar borra todo, vuelve a inicio y sube la ronda', async () => {
  const api = nueva();
  await api.responder(resp);
  await api.inscribir({ sesion_id: sesionEjemplo.id, participante: 'p', datos: {} });
  await api.cambiarPaso(sesionEjemplo.id, 'cierre');
  await api.reiniciar(sesionEjemplo.id);
  const s = await api.sesionPorCodigo('demo');
  assert.equal(s.paso, 'inicio');
  assert.equal(s.ronda, sesionEjemplo.ronda + 1);
  assert.equal((await api.respuestas(sesionEjemplo.id)).length, 0);
  assert.equal((await api.resumenInscripciones(sesionEjemplo.id)).total, 0);
});
test('demo: los métodos de admin piden Supabase', async () => {
  await assert.rejects(nueva().listarSesiones(), { message: 'El formulario de administración necesita Supabase' });
});
test('demo: sesionPorCodigo', async () => {
  const api = nueva();
  assert.equal((await api.sesionPorCodigo(sesionEjemplo.codigo)).id, sesionEjemplo.id);
  assert.equal(await api.sesionPorCodigo('no-existe'), null);
});
test('sesion-ejemplo es válida', () => {
  assert.deepEqual(validarConfig(sesionEjemplo.config), []);
  assert.ok(sesionEjemplo.config.final.texto);
});

// Supabase simulado: verifica qué se envía, sin red.
function falsoSupabase() {
  const llamadas = [];
  const q = (t) => { const o = { t, ops: [] }; llamadas.push(o);
    const p = new Proxy(function () {}, { get: (_, k) => k === 'then' ? (f) => f({ data: null, error: null }) : (...a) => { o.ops.push([k, ...a]); return p; } });
    return p; };
  return { llamadas, from: q, rpc: (n, a) => { llamadas.push({ rpc: n, a }); return Promise.resolve({ data: { total: 0 }, error: null }); } };
}
test('supabase: insertar no pide la fila de vuelta y reiniciar usa p_sesion', async () => {
  const sb = falsoSupabase(); const api = crearApi({ supabase: sb });
  await api.responder(resp);
  await api.inscribir({ sesion_id: 's', participante: 'p', datos: {} });
  assert.ok(sb.llamadas.slice(0, 2).every(c => c.ops.every(([k]) => k !== 'select')));
  await api.reiniciar('s');
  assert.deepEqual(sb.llamadas.at(-1), { rpc: 'reiniciar_sesion', a: { p_sesion: 's' } });
});
test('supabase: agregarAdmin guarda el email en minúsculas y sin espacios', async () => {
  const sb = falsoSupabase(); await crearApi({ supabase: sb }).agregarAdmin('  Ana@Mail.COM ');
  assert.deepEqual(sb.llamadas[0].ops[0], ['insert', { email: 'ana@mail.com' }]);
});
test('supabase: quitarAdmin compara exacto con el email en minúsculas', async () => {
  const sb = falsoSupabase(); await crearApi({ supabase: sb }).quitarAdmin(' A*na@Mail.com ');
  assert.deepEqual(sb.llamadas[0].ops.at(-1), ['eq', 'email', 'a*na@mail.com']);
});
