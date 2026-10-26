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
test('cambiosBloqueados', () => {
  const vieja = cfg(), nueva = cfg();
  nueva.pasos[1].preguntas.pop();                          // borra q2
  nueva.pasos[1].opciones[2].pideTexto = 'opcional';       // cambia o3
  assert.equal(s.cambiosBloqueados(vieja, nueva, {}).length, 0);
  const e = s.cambiosBloqueados(vieja, nueva, { q2: 3, 'q1:o3': 1 });
  assert.equal(e.length, 2);
  const renombre = cfg(); renombre.pasos[1].preguntas[0].texto = 'A corregida';
  assert.deepEqual(s.cambiosBloqueados(vieja, renombre, { q1: 5 }), []);
});
test('claveLocal incluye la ronda', () =>
  assert.equal(s.claveLocal({ id: 'x', ronda: 2 }, 'votado', 'q1'), 'x:2:votado:q1'));
