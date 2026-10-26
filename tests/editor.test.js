import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  nuevaConfig, pasoNuevo, pegarPreguntas, mover, asignar, obtener, fijarEstetica,
  avisosContraste, errorCodigo, leerConfigJson, revisarTextos, completar,
} from '../js/editor.js';
import { validarConfig } from '../js/sesion.js';
import { resolverEstetica } from '../js/tema.js';
import { cfg } from './fixture.js';

test('nuevaConfig: título, mensaje final, estética sin campos fijados y un paso lista Ok/No sin preguntas', () => {
  const c = nuevaConfig('Mi consulta', 'neutro');
  assert.equal(c.titulo, 'Mi consulta');
  assert.equal(c.instrucciones, '');
  assert.deepEqual(c.final, { titulo: '¡Gracias por participar!', texto: '' });
  assert.deepEqual(c.estetica, { preset: 'neutro' });
  assert.equal(c.pasos.length, 1);
  const [p] = c.pasos;
  assert.equal(p.tipo, 'lista');
  assert.equal(p.titulo, 'Preguntas');
  assert.deepEqual(p.opciones.map(o => o.texto), ['Ok', 'No']);
  assert.deepEqual(p.preguntas, []);
  // Hasta que se carguen preguntas, la validación lo dice:
  assert.deepEqual(validarConfig(c), ['El paso 1 (lista) necesita al menos una pregunta.']);
});

test('pasoNuevo: cada tipo arranca con ids únicos y su forma', () => {
  const r = pasoNuevo('registro'), l = pasoNuevo('lista'), g = pasoNuevo('pregunta');
  assert.equal(r.tipo, 'registro'); assert.equal(r.obligatorio, false); assert.equal(r.campos.length, 1);
  assert.equal(l.tipo, 'lista'); assert.deepEqual(l.preguntas, []);
  assert.equal(g.tipo, 'pregunta'); assert.equal(typeof g.pregunta.id, 'string'); assert.equal(g.opciones.length, 2);
  const ids = [r.id, r.campos[0].id, l.id, ...l.opciones.map(o => o.id), g.id, g.pregunta.id, ...g.opciones.map(o => o.id)];
  assert.equal(new Set(ids).size, ids.length);
});

test('pegarPreguntas: agrega bloques con id nuevo y devuelve cuántas', () => {
  const paso = pasoNuevo('lista');
  paso.preguntas.push({ id: 'q0', texto: 'Ya estaba' });
  const n = pegarPreguntas(paso, '## Salud\nDescripción de salud\n- Hospitales\n- Vacunas\n## Educación\n');
  assert.equal(n, 2);
  assert.deepEqual(paso.preguntas.map(q => q.texto), ['Ya estaba', 'Salud', 'Educación']);
  assert.equal(paso.preguntas[1].descripcion, 'Descripción de salud');
  assert.deepEqual(paso.preguntas[1].etiquetas, ['Hospitales', 'Vacunas']);
  assert.notEqual(paso.preguntas[1].id, paso.preguntas[2].id);
  assert.equal(pegarPreguntas(paso, '   \n'), 0);
});

test('mover: sube y baja dentro de los límites', () => {
  const a = ['x', 'y', 'z'];
  assert.equal(mover(a, 0, -1), false);
  assert.equal(mover(a, 2, 1), false);
  assert.equal(mover(a, 1, -1), true);
  assert.deepEqual(a, ['y', 'x', 'z']);
  assert.equal(mover(a, 1, 1), true);
  assert.deepEqual(a, ['y', 'z', 'x']);
});

test('obtener / asignar por ruta; undefined borra la clave', () => {
  const c = cfg();
  assert.equal(obtener(c, 'pasos.1.preguntas.0.texto'), 'A');
  asignar(c, 'pasos.1.preguntas.0.texto', 'Nuevo');
  assert.equal(c.pasos[1].preguntas[0].texto, 'Nuevo');
  asignar(c, 'pasos.1.opciones.2.pideTexto', undefined);
  assert.equal(Object.hasOwn(c.pasos[1].opciones[2], 'pideTexto'), false);
});

test('fijarEstetica: guarda solo lo fijado y lo vacío vuelve al estilo', () => {
  let e = { preset: 'datos-gob-ar' };
  e = fijarEstetica(e, 'colorPrincipal', '#112233');
  assert.deepEqual(e, { preset: 'datos-gob-ar', colorPrincipal: '#112233' });
  e = fijarEstetica(e, 'colorPrincipal', '');
  assert.deepEqual(e, { preset: 'datos-gob-ar' });
  assert.equal(resolverEstetica(e).colorPrincipal, '#232D4F');
  e = fijarEstetica(e, 'firma', false);
  assert.equal(e.firma, false);
  e = fijarEstetica(e, 'firma', null);
  assert.equal(Object.hasOwn(e, 'firma'), false);
});

test('avisosContraste: avisa solo si ni el texto blanco ni el oscuro alcanzan 4.5', () => {
  assert.deepEqual(avisosContraste({}), []);
  assert.deepEqual(avisosContraste({ colorAcento: '#FFD700' }), []); // amarillo: el texto oscuro lo resuelve
  const avisos = avisosContraste({ colorPrincipal: '#777777', colorAcento: '#787878' });
  assert.equal(avisos.length, 2);
  assert.match(avisos[0], /color principal/);
  assert.match(avisos[1], /color de acento/);
});

test('errorCodigo: formato y unicidad', () => {
  assert.equal(errorCodigo('jornada26', ['otra']), '');
  assert.match(errorCodigo('ab', []), /entre 3 y 30/);
  assert.match(errorCodigo('', []), /entre 3 y 30/);
  assert.match(errorCodigo('otra', ['otra']), /Ya hay una sesión/);
});

test('leerConfigJson: acepta una config o una sesión exportada; rechaza lo que no lo es', () => {
  const c = cfg();
  assert.deepEqual(leerConfigJson(JSON.stringify(c)), c);
  assert.deepEqual(leerConfigJson(JSON.stringify({ codigo: 'x', config: c })), c);
  assert.throws(() => leerConfigJson('{no es json'), /no es un JSON válido/);
  assert.throws(() => leerConfigJson('{"titulo":"x"}'), /no parece la configuración/);
  assert.throws(() => leerConfigJson('[]'), /no parece la configuración/);
});

test('revisarTextos: preguntas, opciones y campos sin texto', () => {
  assert.deepEqual(revisarTextos(cfg()), []);
  const c = cfg();
  c.pasos[1].preguntas[1].texto = '  ';
  c.pasos[1].opciones[0].texto = '';
  c.pasos[0].campos[0].etiqueta = '';
  c.pasos[2].pregunta.texto = '';
  assert.deepEqual(revisarTextos(c), [
    'El paso 1 tiene un campo sin nombre.',
    'El paso 2 tiene una opción sin texto.',
    'El paso 2 tiene una pregunta sin texto.',
    'El paso 3 tiene una pregunta sin texto.',
  ]);
});

test('completar: agrega lo que falta sin tocar lo que hay', () => {
  const c = completar({ titulo: 'X', pasos: [{ id: 'l', tipo: 'lista' }, { id: 'g', tipo: 'pregunta' }, { id: 'r', tipo: 'registro' }] });
  assert.deepEqual(c.estetica, {});
  assert.deepEqual(c.final, { titulo: '', texto: '' });
  assert.deepEqual(c.pasos[0], { id: 'l', tipo: 'lista', preguntas: [], opciones: [] });
  assert.equal(typeof c.pasos[1].pregunta.id, 'string');
  assert.deepEqual(c.pasos[2], { id: 'r', tipo: 'registro', campos: [] });
  assert.equal(c.titulo, 'X');
});

test('leerConfigJson: rechaza configs dañadas con mensajes en castellano, sin lanzar TypeError', () => {
  const con = (f) => { const c = cfg(); f(c); return () => leerConfigJson(JSON.stringify(c)); };
  assert.throws(con(c => { c.pasos = [null]; }), /No se puede usar este JSON: .*paso 1 está dañado/);
  assert.throws(con(c => { c.pasos[1].opciones = 'x'; }), /opciones tiene que ser una lista/);
  assert.throws(con(c => { c.pasos[2].tipo = 'raro'; }), /tipo desconocido/);
  assert.throws(con(c => { delete c.pasos[1].preguntas[0].id; }), /una pregunta no tiene id/);
  assert.throws(con(c => { c.estetica = 'x'; }), /estética .* dañada/);
  for (const f of [c => { c.pasos = [null]; }, c => { c.pasos[1].opciones = 'x'; }])
    assert.throws(con(f), (e) => !(e instanceof TypeError));
});

test('leerConfigJson: una tipografía o esquinas desconocidas se descartan (vuelve a la del estilo)', () => {
  const c = cfg();
  c.estetica = { preset: 'neutro', tipografia: 'Comic Sans', esquinas: 'raras', colorPrincipal: '#112233' };
  assert.deepEqual(leerConfigJson(JSON.stringify(c)).estetica, { preset: 'neutro', colorPrincipal: '#112233' });
});
