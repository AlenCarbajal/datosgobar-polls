import { test } from 'node:test';
import assert from 'node:assert/strict';
import { armarCsv } from '../js/csv.js';
import { cfg } from './fixture.js';

test('armarCsv escapa y une la inscripción', () => {
  const csv = armarCsv(cfg(),
    [{ pregunta_id: 'q1', opcion_id: 'o3', texto: 'dice "sí", y\nmás', participante: 'p1', creado: '2026-01-01T00:00:00Z' }],
    [{ participante: 'p1', datos: { c1: 'Ana' }, creado: '2026-01-01T00:00:00Z' },
     { participante: 'p2', datos: { c1: 'Juan' }, creado: '2026-01-01T00:00:00Z' }]);
  const filas = csv.slice(1).split('\r\n');
  assert.equal(csv[0], '﻿');
  assert.equal(filas[0], 'fecha,participante,Nombre,pregunta,opcion,texto');
  assert.equal(filas[1], '2026-01-01T00:00:00Z,p1,Ana,A,Comentar,"dice ""sí"", y\nmás"');
  assert.equal(filas.at(-1), '2026-01-01T00:00:00Z,p2,Juan,,,');
});
test('armarCsv: respuesta sin inscripción deja vacío el registro', () => {
  const csv = armarCsv(cfg(), [{ pregunta_id: 'q3', texto: 'hola', participante: 'p9', creado: 'x' }], []);
  assert.equal(csv.slice(1).split('\r\n')[1], 'x,p9,,¿Algo?,,hola');
});
test('armarCsv neutraliza fórmulas', () => {
  const fila = (texto) => armarCsv(cfg(), [{ pregunta_id: 'q3', texto, participante: 'p', creado: 'x' }], [])
    .slice(1).split('\r\n')[1].replace('x,p,,¿Algo?,,', '');
  assert.equal(fila('=HYPERLINK("x")'), `"'=HYPERLINK(""x"")"`);
  assert.equal(fila('+54 11'), "'+54 11");
  assert.equal(fila('-'), "'-");
});
test('armarCsv: datos de campos que ya no están en la config van en columnas extra', () => {
  const csv = armarCsv(cfg(), [], [{ participante: 'p1', datos: { c1: 'Ana', viejo: 'x', otro: 'y' }, creado: 'z' },
    { participante: 'p2', datos: { otro: 'w' }, creado: 'z' }]);
  const filas = csv.slice(1).split('\r\n');
  assert.equal(filas[0], 'fecha,participante,Nombre,viejo,otro,pregunta,opcion,texto');
  assert.equal(filas[1], 'z,p1,Ana,x,y,,,');
  assert.equal(filas[2], 'z,p2,,,w,,,');
});
