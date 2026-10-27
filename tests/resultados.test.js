import { test } from 'node:test';
import assert from 'node:assert/strict';
import { contar } from '../js/resultados.js';
import { cfg } from './fixture.js';

test('contar usa el total de respuestas, incluida la opción con texto', () => {
  const r = contar(cfg(), [
    { pregunta_id: 'q1', opcion_id: 'o1' }, { pregunta_id: 'q1', opcion_id: 'o1' },
    { pregunta_id: 'q1', opcion_id: 'o3', texto: 'falta X', creado: '2' },
    { pregunta_id: 'q9', opcion_id: 'o1' },
  ]);
  assert.equal(r.q1.total, 3);
  assert.deepEqual(r.q1.opciones.map(o => [o.id, o.n, o.pct]), [['o1', 2, 67], ['o2', 0, 0], ['o3', 1, 33]]);
  assert.deepEqual(r.q1.textos, ['falta X']);
  assert.equal(r.q9, undefined);
});
test('contar ordena los textos con los más nuevos primero', () => {
  const r = contar(cfg(), [
    { pregunta_id: 'q3', texto: 'viejo', creado: '2026-01-01' },
    { pregunta_id: 'q3', texto: 'nuevo', creado: '2026-01-02' },
    { pregunta_id: 'q3', texto: '', creado: '2026-01-03' },
  ]);
  assert.deepEqual(r.q3.textos, ['nuevo', 'viejo']);
  assert.equal(r.q3.total, 3);
});
