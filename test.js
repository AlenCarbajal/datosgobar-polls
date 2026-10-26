// node test.js — valida el lector y que consulta.md se pueda leer.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { leerConsulta } from './consulta.js';

const ej = leerConsulta(`# Título
Primera línea.
Segunda línea.

## Registro: ¿Qué necesitás?
Contanos para ayudarte.
- Capacitación
### Tus datos
- Nombre *
- E-mail *
- Teléfono

## Población y sociedad
Datos sobre la población.
- Género
* Discapacidad

## Población y sociedad
### esto se ignora
## ¿Sí o no?
`);
assert.equal(ej.titulo, 'Título');
assert.equal(ej.instrucciones, 'Primera línea. Segunda línea.');
assert.equal(ej.modo, 'guiado');
assert.deepEqual(ej.preguntas.map(p => p.id), ['poblacion-y-sociedad', 'poblacion-y-sociedad-2', 'si-o-no']);
assert.deepEqual(ej.preguntas[0].temas, ['Género', 'Discapacidad']);
assert.equal(ej.preguntas[0].descripcion, 'Datos sobre la población.');
assert.deepEqual(ej.preguntas[2].temas, []);
assert.deepEqual(ej.pasos, ['registro', 'poblacion-y-sociedad', 'poblacion-y-sociedad-2', 'si-o-no']);
assert.deepEqual(ej.registro, {
  titulo: '¿Qué necesitás?', descripcion: 'Contanos para ayudarte.', opciones: ['Capacitación'], tituloCampos: 'Tus datos',
  campos: [
    { nombre: 'Nombre', obligatorio: true, tipo: 'text' },
    { nombre: 'E-mail', obligatorio: true, tipo: 'email' },
    { nombre: 'Teléfono', obligatorio: false, tipo: 'text' },
  ],
});

const libre = leerConsulta(`# T\nModo: libre\n## A\n## B\n## Registro: R\n- x\n## C`);
assert.equal(libre.modo, 'libre');
assert.equal(libre.instrucciones, '');
assert.deepEqual(libre.pasos, ['lista', 'registro']);

const c = leerConsulta(readFileSync(new URL('consulta.md', import.meta.url), 'utf8'));
assert.ok(c.preguntas.length, 'consulta.md no tiene preguntas (## Título)');
assert.ok(c.preguntas.every(p => p.id.length <= 50));
const r = c.registro;
console.log(`ok: consulta.md (modo ${c.modo}) tiene ${c.preguntas.length} preguntas y ${r ? `registro con ${r.opciones.length} opciones y ${r.campos.length} campos` : 'sin registro'}; pasos: ${c.pasos.length}`);
