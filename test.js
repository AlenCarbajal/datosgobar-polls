// node test.js — valida el lector y que consulta.md se pueda leer.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { leerConsulta } from './consulta.js';

const ej = leerConsulta(`# Título
Primera línea.
Segunda línea.

## Población y sociedad
- Género
* Discapacidad

## Población y sociedad
## ¿Sí o no?

## Registro:
- Capacitación
`);
assert.equal(ej.titulo, 'Título');
assert.equal(ej.instrucciones, 'Primera línea. Segunda línea.');
assert.deepEqual(ej.preguntas.map(p => p.id), ['poblacion-y-sociedad', 'poblacion-y-sociedad-2', 'si-o-no']);
assert.deepEqual(ej.preguntas[0].temas, ['Género', 'Discapacidad']);
assert.deepEqual(ej.preguntas[2].temas, []);
assert.deepEqual(ej.registro, { titulo: '¿Qué necesitás de nosotros?', opciones: ['Capacitación'] });

const c = leerConsulta(readFileSync(new URL('consulta.md', import.meta.url), 'utf8'));
assert.ok(c.preguntas.length, 'consulta.md no tiene preguntas (## Título)');
assert.ok(c.preguntas.every(p => p.id.length <= 50));
console.log(`ok: consulta.md tiene ${c.preguntas.length} preguntas y ${c.registro ? c.registro.opciones.length + ' opciones de registro' : 'sin registro'}`);
