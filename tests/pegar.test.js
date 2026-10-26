import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { leerBloques } from '../js/pegar.js';
import { validarConfig } from '../js/sesion.js';

const raiz = fileURLToPath(new URL('..', import.meta.url));

test('leerBloques con ##', () => assert.deepEqual(leerBloques('## A\nDesc uno\ndos\n- x\n* y\n\n## B'), [
  { texto: 'A', descripcion: 'Desc uno dos', etiquetas: ['x', 'y'] },
  { texto: 'B', descripcion: '', etiquetas: [] }]));
test('leerBloques sin ##: una pregunta por línea', () =>
  assert.deepEqual(leerBloques('Uno\n\n Dos \n').map(b => b.texto), ['Uno', 'Dos']));
test('importar-consulta produce una config válida', () => {
  const salida = execFileSync('node', ['herramientas/importar-consulta.js', 'consulta.md'], { encoding: 'utf8', cwd: raiz });
  const config = JSON.parse(salida);
  assert.deepEqual(validarConfig(config), []);
  assert.equal(config.pasos.find(p => p.tipo === 'lista').preguntas.length, 14);
  assert.equal(config.pasos[0].tipo, 'registro');
});
