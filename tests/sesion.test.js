import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as s from '../js/sesion.js';
import { cfg } from './fixture.js';

test('normalizarCodigo', () => assert.equal(s.normalizarCodigo(' Jornada Ñandú 26 '), 'jornada-nandu-26'));
test('codigoValido', () => {
  assert.equal(s.codigoValido('ab'), false);
  assert.equal(s.codigoValido('jornada-26'), true);
  assert.equal(s.codigoValido('a'.repeat(31)), false);
});
test('nuevoId', () => assert.match(s.nuevoId('q'), /^q[a-z0-9]{6}$/));
test('pasosDeSesion', () => assert.deepEqual(s.pasosDeSesion(cfg()), ['inicio', 'r1', 'l1', 'g1', 'cierre', 'final']));
test('buscarPregunta', () => {
  assert.equal(s.buscarPregunta(cfg(), 'q2').paso.id, 'l1');
  assert.equal(s.buscarPregunta(cfg(), 'q3').pregunta.texto, '¿Algo?');
  assert.equal(s.buscarPregunta(cfg(), 'zz'), null);
});
test('opcionesDe: lista comparte, pregunta propia, inexistente vacía', () => {
  assert.deepEqual(s.opcionesDe(cfg(), 'q2').map(o => o.id), ['o1', 'o2', 'o3']);
  assert.deepEqual(s.opcionesDe(cfg(), 'q3'), []);
  assert.deepEqual(s.opcionesDe(cfg(), 'zz'), []);
});
test('validarConfig acepta una config correcta', () => assert.deepEqual(s.validarConfig(cfg()), []));
test('validarConfig rechaza', () => {
  const una = cfg(); una.pasos[1].opciones = [{ id: 'o1', texto: 'Ok' }];
  assert.match(s.validarConfig(una).join(), /entre 2 y 6 opciones/);
  const siete = cfg(); siete.pasos[1].opciones = Array.from({ length: 7 }, (_, i) => ({ id: 'o' + i, texto: 'x' + i }));
  assert.match(s.validarConfig(siete).join(), /entre 2 y 6 opciones/);
  const tarde = cfg(); tarde.pasos.reverse();
  assert.match(s.validarConfig(tarde).join(), /registro obligatorio.*primer paso/);
  const dup = cfg(); dup.pasos[1].preguntas[1].id = 'q1';
  assert.match(s.validarConfig(dup).join(), /id repetido/);
  const sinTitulo = cfg(); sinTitulo.titulo = ' ';
  assert.match(s.validarConfig(sinTitulo).join(), /título/);
});
test('validarConfig: otros rechazos', () => {
  const m = (f) => { const c = cfg(); f(c); return s.validarConfig(c).join(); };
  assert.match(m(c => { c.pasos[0].campos = []; }), /registro\) necesita al menos un campo/);
  assert.match(m(c => { c.pasos[1].preguntas = []; }), /lista\) necesita al menos una pregunta/);
  assert.match(m(c => { c.pasos[0].campos[0] = { id: 'c1', etiqueta: 'Rol', tipo: 'seleccion', obligatorio: false, opciones: ['a'] }; }), /"Rol" necesita al menos 2 opciones/);
  assert.match(m(c => { c.final.titulo = ''; }), /mensaje final/);
  assert.match(m(c => { c.pasos = []; }), /al menos un paso/);
  assert.match(m(c => { c.pasos[1].opciones[0].id = 'q1'; }), /id repetido: q1/);
  assert.match(m(c => { delete c.pasos[2].pregunta; }), /no tiene la pregunta/);
  assert.match(m(c => { c.titulo = 5; }), /título/);
  assert.match(s.validarConfig(null).join(), /vacía o dañada/);
  assert.match(s.validarConfig(undefined).join(), /vacía o dañada/);
});
test('config con paso pregunta sin pregunta no rompe el resto', () => {
  const c = cfg(); delete c.pasos[2].pregunta;
  assert.equal(s.buscarPregunta(c, 'q3'), null);
  assert.deepEqual(s.cambiosBloqueados(cfg(), c, { q3: 1 }).length, 1);
});
test('cambiosBloqueados', () => {
  const vieja = cfg(), nueva = cfg();
  nueva.pasos[1].preguntas.pop();                          // borra q2
  nueva.pasos[1].opciones[2].pideTexto = 'opcional';       // cambia o3
  assert.equal(s.cambiosBloqueados(vieja, nueva, {}).length, 0);
  const e = s.cambiosBloqueados(vieja, nueva, { q2: 3, 'q1:o3': 1 });
  assert.equal(e.length, 2);
  assert.match(e.join('\n'), /pregunta "B"/);
  assert.match(e.join('\n'), /opción "Comentar" de|opción "Comentar" pide/);
  const renombre = cfg(); renombre.pasos[1].preguntas[0].texto = 'A corregida';
  assert.deepEqual(s.cambiosBloqueados(vieja, renombre, { q1: 5 }), []);
});
test('cambiosBloqueados: borrar opción con votos', () => {
  const nueva = cfg(); nueva.pasos[1].opciones.pop();
  const e = s.cambiosBloqueados(cfg(), nueva, { 'q1:o3': 2 });
  assert.equal(e.length, 1);
  assert.match(e[0], /borrar la opción "Comentar" de "A"/);
});
test('cambiosBloqueados: pasar entre texto libre y opciones', () => {
  const nueva = cfg(); nueva.pasos[2].opciones = [{ id: 'x1', texto: 'Sí' }, { id: 'x2', texto: 'No' }];
  const e = s.cambiosBloqueados(cfg(), nueva, { q3: 4 });
  assert.equal(e.length, 1);
  assert.match(e[0], /"¿Algo\?".*respuesta libre y opciones/);
  assert.deepEqual(s.cambiosBloqueados(cfg(), nueva, {}), []);
});
test('claveLocal incluye la ronda', () =>
  assert.equal(s.claveLocal({ id: 'x', ronda: 2 }, 'votado', 'q1'), 'x:2:votado:q1'));

test('validarConfig: datos dañados se rechazan sin lanzar', () => {
  const m = (f) => { const c = cfg(); f(c); return s.validarConfig(c).join(' | '); };
  assert.match(m(c => { c.pasos.push(null); }), /paso 4 está dañado/);
  assert.match(m(c => { c.pasos[2].tipo = 'raro'; }), /tipo desconocido: "raro"/);
  assert.match(m(c => { delete c.pasos[1].id; }), /paso 2 no tiene id/);
  assert.match(m(c => { c.pasos[1].preguntas[0].id = ''; }), /una pregunta no tiene id/);
  assert.match(m(c => { delete c.pasos[1].opciones[0].id; }), /una opción no tiene id/);
  assert.match(m(c => { delete c.pasos[0].campos[0].id; }), /un campo no tiene id/);
  assert.match(m(c => { c.pasos[1].opciones[2].pideTexto = 'siempre'; }), /"pide texto" desconocido/);
  assert.match(m(c => { c.pasos[1].opciones = 'x'; }), /opciones tiene que ser una lista/);
  assert.match(m(c => { c.pasos[1].preguntas = {}; }), /preguntas tiene que ser una lista/);
  assert.match(m(c => { c.pasos[0].campos = 'x'; }), /campos tiene que ser una lista/);
  assert.match(m(c => { c.pasos[1].preguntas[0].etiquetas = 'a'; }), /etiquetas .* lista de textos/);
  assert.match(m(c => { c.pasos[1].preguntas.push(7); }), /hay preguntas dañadas/);
  assert.match(m(c => { c.pasos[1].opciones.push(null); }), /hay opciones dañadas/);
  assert.match(m(c => { c.pasos[0].campos[0].opciones = 'a'; }), /opciones del campo .* lista de textos/);
  assert.match(m(c => { c.pasos[2].pregunta = 'x'; }), /no tiene la pregunta/);
  assert.match(m(c => { c.estetica = 'x'; }), /estética .* dañada/);
  assert.match(s.validarConfig([]).join(), /vacía o dañada/);
});
