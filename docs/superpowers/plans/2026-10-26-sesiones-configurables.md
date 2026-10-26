# Sesiones configurables — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar la consulta fija en `consulta.md` por sesiones que se arman desde un formulario de administración (con login), guardadas en Supabase, con dinámicas, preguntas, opciones, campos y estética configurables, y una guía técnica para que cualquiera instale su propia copia.

**Architecture:** Sitio estático sin build (HTML + módulos ES + CSS) servido por GitHub Pages. Tres páginas (`participar.html`, `pantalla.html`, `admin.html`) comparten módulos en `js/`: lógica pura testeable con `node --test` (`sesion.js`, `resultados.js`, `csv.js`, `pegar.js`, `tema.js`) y un acceso a datos (`datos.js`) con dos implementaciones: Supabase (Postgres + RLS + Auth con contraseña + Realtime) y demo en `localStorage`. La estética son variables CSS derivadas de dos colores más presets en `temas/`.

**Tech Stack:** HTML/CSS/JS (ES modules, sin bundler) · supabase-js 2.45.4 (UMD, CDN con SRI) · qrcodejs 1.0.0 (CDN con SRI) · Supabase (Postgres, Auth, Realtime) · Node ≥ 22 solo para tests (`node --test`) · Mermaid en Markdown (lo renderiza GitHub) para diagramas.

**Spec:** `docs/superpowers/specs/2026-10-26-sesiones-configurables-design.md`

## Global Constraints

- Sin paso de build ni npm en el sitio. Dependencias solo por CDN con versión fija e `integrity`:
  - `https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js` → `sha384-GFr3yTh5lJznCbZfpTtXnwboFsxqtTQoeTZCRHhE0579KrRmlCzen5AA8ohaB5ug`
  - `https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js` → `sha384-3zSEDfvllQohrq0PHL1fOXJuC/jSOO34H46t6UQfobFOmxE5BpjjaIJY5F2/bMnU`
- **No tocar** `index.html`, `consulta.md`, `consulta.js`, `schema.sql`, `migraciones/`, `test.js` ni las tablas `votos`, `registros`, `estado`, `clave_presentador` hasta la Tarea 11. Las tablas nuevas se llaman `sesiones`, `respuestas`, `inscripciones`, `admins`.
- Interfaz en español rioplatense, sin jerga. Toda la copia nueva sigue el tono de la existente.
- Preguntas de selección única con **0 opciones (texto libre) o entre 2 y 6 opciones**. Opción con `pideTexto`: `"obligatorio"` | `"opcional"` | ausente.
- Código de sesión: `^[a-z0-9-]{3,30}$`. Texto de respuesta ≤ 1000. `datos` de inscripción < 8000 bytes.
- Un registro con `obligatorio: true` solo puede ser el **primer** paso.
- Pasos de una sesión en ejecución: `['inicio', ...config.pasos.map(p => p.id), 'cierre', 'final']`. El botón que lleva a `final` dice **"Finalizar"**.
- Accesibilidad: contraste AA, foco visible, `<label>` reales, errores en línea, zonas táctiles ≥ 44 px, resultados con número además de color.
- Ningún color literal en CSS fuera de `temas/*.css` y de la declaración de tokens en `css/base.css`.
- Datos personales (`inscripciones`) y `admins` nunca legibles con la *publishable key*.
- Commits sin `Co-Authored-By` ni menciones a Claude/Anthropic (hay un hook que los rechaza).
- **Desvío del spec (decisión al planificar):** `respuestas.participante` queda legible públicamente. El spec pedía ocultarlo, pero Realtime necesita poder leer la fila completa para enviar el `INSERT`, y con permisos por columna deja de enviarlo. El UUID es anónimo; lo que lo vincula a una persona (`inscripciones`) sigue privado.

## Review Focus

1. **Recargar o reabrir el celular a mitad de la sesión** → sigue en el mismo paso, con sus respondidas en verde y sin pedir registro de nuevo; tras "Reiniciar" en admin, olvida todo eso. (Test: `claveLocal` incluye `ronda`; verificación manual en Tarea 7.)
2. **El admin corrige un texto mientras alguien escribe un comentario** → el celular no pierde lo escrito: si hay un formulario con datos sin enviar, el cambio de `config` se aplica después de enviar o volver. (Verificación manual en Tarea 7.)
3. **El participante escribe el código con mayúsculas, espacios o tildes** (" Jornada 26 ") → entra igual. (Test: `normalizarCodigo` en Tarea 1.)
4. **Doble toque en Enviar o red lenta que reintenta** → una sola respuesta guardada y el celular la muestra como hecha. (Test del backend demo en Tarea 6: segundo `responder` lanza `{ code: '23505' }`; la vista lo trata como hecho.)
5. **Una organización elige colores con poco contraste** (p. ej. acento amarillo) → el texto sobre ese color sigue legible y el formulario avisa. (Tests de `colorTextoSobre` y `contraste` en Tarea 4; aviso en Tarea 9.)

---

## Estructura de archivos

```
config.js                 Configuración de la instalación (URL y key de Supabase, preset por defecto)
participar.html           Vista del participante (?s=codigo)
pantalla.html             Vista proyectada (?s=codigo)
admin.html                Formulario de administración
css/base.css              Tokens, layout y componentes compartidos
temas/neutro.css          Preset por defecto
temas/datos-gob-ar.css    Preset con la identidad de datos.gob.ar
img/                      Logos (ya existe img/logo-datos-gob-ar-blanco.png)
js/sesion.js              Puro: ids, códigos, pasos, validación de config, bloqueos de edición, claves locales
js/resultados.js          Puro: conteo por opción, grilla del resumen
js/csv.js                 Puro: exportación CSV
js/pegar.js               Puro: carga rápida de preguntas desde texto
js/tema.js                Contraste, color de texto, aplicar estética al DOM
js/datos.js               API de datos: Supabase o demo
js/ui.js                  Helpers de DOM compartidos (esc, $, mensaje, qr, cargarSesion)
js/participante.js        Lógica de participar.html
js/pantalla.js            Lógica de pantalla.html
js/admin.js               Lógica de admin.html
demo/sesion-ejemplo.json  Sesión de ejemplo para ?demo (genérica)
sql/schema.sql            Esquema completo, idempotente
herramientas/importar-consulta.js   consulta.md → JSON de config (uso único)
herramientas/verificar-seguridad.sh Pruebas de RLS con la publishable key
tests/*.test.js           Tests con node --test
README.md, docs/guia/     Documentación de usuario (Tarea 10)
```

## Forma de los datos (referencia para todas las tareas)

```ts
type Opcion   = { id: string; texto: string; pideTexto?: 'obligatorio' | 'opcional' };
type Pregunta = { id: string; texto: string; descripcion?: string; etiquetas?: string[] };
type Campo    = { id: string; etiqueta: string; tipo: 'texto'|'email'|'telefono'|'numero'|'texto_largo'|'seleccion';
                  obligatorio: boolean; opciones?: string[] };            // opciones solo para 'seleccion'
type Paso =
  | { id: string; tipo: 'registro'; titulo: string; descripcion?: string; obligatorio: boolean; campos: Campo[] }
  | { id: string; tipo: 'lista'; titulo: string; opciones: Opcion[]; preguntas: Pregunta[] }   // opciones compartidas
  | { id: string; tipo: 'pregunta'; pregunta: Pregunta; opciones: Opcion[] };
type Estetica = { preset: string; organismo: string; logo: string; encabezado: string;
                  colorPrincipal: string; colorAcento: string; tipografia: string;
                  esquinas: 'rectas'|'suaves'|'redondeadas'; firma: boolean };
type Config = { titulo: string; instrucciones: string; estetica: Estetica; pasos: Paso[];
                final: { titulo: string; texto: string } };
type Sesion = { id: string; codigo: string; config: Config; paso: string; ronda: number; archivada: boolean };
type Respuesta   = { id: number; sesion_id: string; pregunta_id: string; participante: string;
                     opcion_id: string|null; texto: string|null; creado: string };
type Inscripcion = { sesion_id: string; participante: string; datos: Record<string, string>; creado: string };
```

Decisión al planificar: en un paso `lista` las opciones son **compartidas** por todas sus preguntas (el caso real: Ok/No/Comentar para 14 supertemas). Un paso `pregunta` tiene las suyas.

---

### Task 1: Lógica de sesión (`js/sesion.js`)

**Files:**
- Create: `js/sesion.js`, `tests/sesion.test.js`

**Interfaces:**
- Produces:
  - `nuevoId(prefijo: string): string` — `prefijo` + 6 caracteres `[a-z0-9]` aleatorios.
  - `normalizarCodigo(texto: string): string` — trim, minúsculas, sin tildes, espacios → `-`, descarta lo que no sea `[a-z0-9-]`.
  - `codigoValido(codigo: string): boolean`
  - `pasosDeSesion(config: Config): string[]`
  - `buscarPregunta(config, preguntaId): { pregunta: Pregunta, paso: Paso } | null`
  - `opcionesDe(config, preguntaId): Opcion[]`
  - `validarConfig(config: Config): string[]` — mensajes en español; `[]` si es válida.
  - `cambiosBloqueados(vieja: Config, nueva: Config, conteos: Record<string, number>): string[]` — `conteos` con claves `preguntaId` y `` `${preguntaId}:${opcionId}` ``.
  - `claveLocal(sesion: {id, ronda}, ...partes: string[]): string` → `` `${id}:${ronda}:${partes.join(':')}` ``.

- [ ] **Step 1: Escribir los tests**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as s from '../js/sesion.js';

const cfg = () => ({
  titulo: 'T', instrucciones: '', estetica: {}, final: { titulo: 'Gracias', texto: '' },
  pasos: [
    { id: 'r1', tipo: 'registro', titulo: 'R', obligatorio: true,
      campos: [{ id: 'c1', etiqueta: 'Nombre', tipo: 'texto', obligatorio: true }] },
    { id: 'l1', tipo: 'lista', titulo: 'L',
      opciones: [{ id: 'o1', texto: 'Ok' }, { id: 'o2', texto: 'No' }, { id: 'o3', texto: 'Comentar', pideTexto: 'obligatorio' }],
      preguntas: [{ id: 'q1', texto: 'A' }, { id: 'q2', texto: 'B' }] },
    { id: 'g1', tipo: 'pregunta', pregunta: { id: 'q3', texto: '¿Algo?' }, opciones: [] },
  ],
});

test('normalizarCodigo', () => assert.equal(s.normalizarCodigo(' Jornada Ñandú 26 '), 'jornada-nandu-26'));
test('codigoValido', () => {
  assert.equal(s.codigoValido('ab'), false);
  assert.equal(s.codigoValido('jornada-26'), true);
  assert.equal(s.codigoValido('a'.repeat(31)), false);
});
test('nuevoId', () => assert.match(s.nuevoId('q'), /^q[a-z0-9]{6}$/));
test('pasosDeSesion', () => assert.deepEqual(s.pasosDeSesion(cfg()), ['inicio', 'r1', 'l1', 'g1', 'cierre', 'final']));
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
```

- [ ] **Step 2: Correr y ver que falla** — Run: `node --test tests/` · Expected: FAIL (`Cannot find module '../js/sesion.js'`).
- [ ] **Step 3: Implementar `js/sesion.js`** con las firmas de arriba. Reglas de `validarConfig`: título no vacío; al menos 1 paso; ids únicos entre pasos, preguntas, opciones y campos; `registro` con ≥ 1 campo, `seleccion` con ≥ 2 opciones; `registro` obligatorio solo en índice 0; `lista` con ≥ 1 pregunta; opciones `0` o `2..6` (en `lista`, `0` también es válido = texto libre); `final.titulo` no vacío. `cambiosBloqueados` reporta: pregunta con conteo > 0 que ya no existe; opción con conteo > 0 que ya no existe; opción con conteo > 0 cuyo `pideTexto` cambió; pregunta con conteo > 0 que pasó de tener opciones a 0 o viceversa.
- [ ] **Step 4: Correr y ver que pasa** — Run: `node --test tests/` · Expected: PASS.
- [ ] **Step 5: Commit** — `git add js/sesion.js tests/sesion.test.js && git commit -m "Lógica de sesión: pasos, validación y bloqueos de edición"`

### Task 2: Resultados y exportación (`js/resultados.js`, `js/csv.js`)

**Files:**
- Create: `js/resultados.js`, `js/csv.js`, `tests/resultados.test.js`, `tests/csv.test.js`

**Interfaces:**
- Consumes: `opcionesDe`, `buscarPregunta` (Task 1).
- Produces:
  - `contar(config, respuestas: Respuesta[]): Record<preguntaId, { total: number, opciones: {id, texto, n, pct}[], textos: string[] }>` — `pct = Math.round(n * 100 / total)` sobre **todas** las respuestas de la pregunta; `textos` = respuestas con `texto` no vacío, más nuevas primero. Respuestas de preguntas inexistentes se ignoran.
  - `grillaPara(n: number, ancho: number, alto: number): { columnas: number, filas: number }` — elige `columnas` en `1..n` minimizando `|(ancho/columnas) / (alto/ceil(n/columnas)) − 1.8|`; en empate, menos filas.
  - `armarCsv(config, respuestas, inscripciones): string` — BOM `﻿`, separador `,`, fin de línea `\r\n`, comillas RFC 4180. Columnas: `fecha, participante, <etiqueta de cada campo de registro…>, pregunta, opcion, texto`. Una fila por respuesta; además una fila por inscripto sin respuestas (pregunta/opción/texto vacíos).

- [ ] **Step 1: Escribir los tests**

```js
// tests/resultados.test.js (usa cfg() igual al de Task 1; extraerlo a tests/fixture.js y reutilizar)
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
test('grillaPara', () => {
  assert.deepEqual(grillaPara(14, 1600, 800), { columnas: 4, filas: 4 });
  assert.deepEqual(grillaPara(6, 1600, 900), { columnas: 3, filas: 2 });
  assert.deepEqual(grillaPara(1, 1600, 800), { columnas: 1, filas: 1 });
});
// tests/csv.test.js
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
```

- [ ] **Step 2:** Run: `node --test tests/` · Expected: FAIL (módulos inexistentes).
- [ ] **Step 3:** Implementar `contar`, `grillaPara` en `js/resultados.js` y `armarCsv` en `js/csv.js`.
- [ ] **Step 4:** Run: `node --test tests/` · Expected: PASS.
- [ ] **Step 5:** `git add js/resultados.js js/csv.js tests/ && git commit -m "Conteo por opción, grilla del resumen y CSV"`

### Task 3: Carga rápida desde texto e importación (`js/pegar.js`)

**Files:**
- Create: `js/pegar.js`, `tests/pegar.test.js`, `herramientas/importar-consulta.js`

**Interfaces:**
- Consumes: `nuevoId` (Task 1).
- Produces:
  - `leerBloques(texto: string): { texto: string, descripcion: string, etiquetas: string[] }[]` — si hay líneas `## `, cada una abre una pregunta; las líneas `- ` o `* ` son etiquetas; el resto, descripción (unida con espacio). Si no hay ninguna `## `, cada línea no vacía es una pregunta sin descripción ni etiquetas.
  - CLI `node herramientas/importar-consulta.js <consulta.md>` → imprime en stdout un `Config` JSON válido según `validarConfig`: registro (si existe) con sus campos, un paso `lista` con todas las preguntas y opciones `Ok` / `No` / `Comentar` (`pideTexto: 'obligatorio'`), `final: { titulo: '¡Gracias por participar!', texto: '' }`, estética preset `datos-gob-ar`. Usa `leerConsulta` del `consulta.js` existente para leer el archivo.

- [ ] **Step 1: Tests**

```js
test('leerBloques con ##', () => assert.deepEqual(leerBloques('## A\nDesc uno\ndos\n- x\n* y\n\n## B'), [
  { texto: 'A', descripcion: 'Desc uno dos', etiquetas: ['x', 'y'] },
  { texto: 'B', descripcion: '', etiquetas: [] }]));
test('leerBloques sin ##: una pregunta por línea', () =>
  assert.deepEqual(leerBloques('Uno\n\n Dos \n').map(b => b.texto), ['Uno', 'Dos']));
test('importar-consulta produce una config válida', () => {
  const salida = execFileSync('node', ['herramientas/importar-consulta.js', 'consulta.md'], { encoding: 'utf8' });
  const config = JSON.parse(salida);
  assert.deepEqual(validarConfig(config), []);
  assert.equal(config.pasos.find(p => p.tipo === 'lista').preguntas.length, 14);
  assert.equal(config.pasos[0].tipo, 'registro');
});
```

- [ ] **Step 2:** Run: `node --test tests/` · Expected: FAIL.
- [ ] **Step 3:** Implementar `js/pegar.js` y `herramientas/importar-consulta.js`.
- [ ] **Step 4:** Run: `node --test tests/` · Expected: PASS.
- [ ] **Step 5:** `git add js/pegar.js tests/pegar.test.js herramientas/importar-consulta.js && git commit -m "Carga rápida de preguntas desde texto e importación de consulta.md"`

### Task 4: Estética: tokens, presets y contraste (`js/tema.js`, `css/`, `temas/`)

**Files:**
- Create: `js/tema.js`, `tests/tema.test.js`, `css/base.css`, `temas/neutro.css`, `temas/datos-gob-ar.css`, `demo/tema.html` (página de muestra con todos los componentes, sin datos)

**Interfaces:**
- Produces:
  - `contraste(a: string, b: string): number` — razón WCAG 2.1 entre dos hex `#RRGGBB`.
  - `colorTextoSobre(fondo: string): '#FFFFFF' | '#1A1A1A'` — el de mayor contraste.
  - `ESTETICA_DEFECTO: Estetica` — `{ preset: 'neutro', organismo: '', logo: '', encabezado: '', colorPrincipal: '#1F2937', colorAcento: '#2563EB', tipografia: 'system-ui', esquinas: 'suaves', firma: false }`.
  - `aplicarTema(estetica: Partial<Estetica>, raiz = document.documentElement): void` — mezcla con `ESTETICA_DEFECTO`, setea `--color-principal`, `--color-acento`, `--texto-sobre-principal`, `--texto-sobre-acento`, `--fuente`, `--radio` (`rectas` 0 / `suaves` 8px / `redondeadas` 16px), `data-firma`, y carga `temas/<preset>.css` (un `<link id="tema">`; si el preset no existe, `neutro`). Si `tipografia` no es `system-ui`, agrega el `<link>` de Google Fonts.
- Tokens que `css/base.css` define y **todo** el CSS usa: `--color-principal`, `--color-acento`, `--texto-sobre-principal`, `--texto-sobre-acento`, `--fondo`, `--superficie`, `--borde`, `--texto`, `--texto-suave`, `--exito`, `--error`, `--aviso`, `--radio`, `--fuente`, y derivados con `color-mix(in srgb, …)`: `--principal-suave`, `--acento-suave`, `--exito-suave`. Componentes: `.boton` (`.boton--secundario`), `.tarjeta`, `.opcion` (con indicador de elegido: círculo + check, no solo tinte), `.etiqueta`, `.eyebrow`, `.progreso`, `.barra`.
- `temas/datos-gob-ar.css`: Montserrat; `--color-principal: #232D4F; --color-acento: #393793;` violeta `#B369ED` para barras secundarias; mosaico de tiles con glifos (`≠ á ↑ @ ≥ π »`) visible solo con `[data-firma]`; logo por defecto `img/logo-datos-gob-ar-blanco.png` documentado en el archivo.

- [ ] **Step 1: Tests**

```js
test('contraste', () => {
  assert.equal(Math.round(contraste('#FFFFFF', '#000000')), 21);
  assert.ok(contraste('#232D4F', '#FFFFFF') > 12);
});
test('colorTextoSobre', () => {
  assert.equal(colorTextoSobre('#232D4F'), '#FFFFFF');
  assert.equal(colorTextoSobre('#F5C518'), '#1A1A1A');
});
```

- [ ] **Step 2:** Run: `node --test tests/` · Expected: FAIL.
- [ ] **Step 3:** Implementar `js/tema.js` (las funciones puras no tocan `document`), `css/base.css`, los dos presets y `demo/tema.html`.
- [ ] **Step 4:** Run: `node --test tests/` · Expected: PASS. Además: `grep -nE '#[0-9A-Fa-f]{3,6}\b' css/base.css` solo muestra la declaración de tokens.
- [ ] **Step 5:** Verificar a ojo `demo/tema.html` con `?preset=neutro` y `?preset=datos-gob-ar` y con `colorAcento=#F5C518` (texto legible en botones).
- [ ] **Step 6:** `git add js/tema.js tests/tema.test.js css/ temas/ demo/tema.html && git commit -m "Estética: tokens, presets neutro y datos-gob-ar, contraste automático"`

### Task 5: Esquema de base y verificación de seguridad (`sql/schema.sql`)

**Files:**
- Create: `sql/schema.sql`, `herramientas/verificar-seguridad.sh`

**Interfaces:**
- Produces (Postgres):
  - `admins (email text primary key)` — RLS sin políticas para `anon`; `select` solo si `es_admin()`.
  - `es_admin() returns boolean` — `security definer`; `exists (select 1 from admins where lower(email) = lower(auth.jwt() ->> 'email'))`.
  - `sesiones (id uuid pk default gen_random_uuid(), codigo text unique check (codigo ~ '^[a-z0-9-]{3,30}$'), config jsonb not null, paso text not null default 'inicio', ronda int not null default 0, archivada bool not null default false, creado timestamptz default now(), actualizado timestamptz default now())`. `select` para `anon` y `authenticated` donde `not archivada or es_admin()`; `insert/update/delete` solo `es_admin()`.
  - `respuestas (id bigint identity pk, sesion_id uuid references sesiones on delete cascade, pregunta_id text, participante uuid, opcion_id text null, texto text null check (length(texto) <= 1000), creado timestamptz default now(), unique (sesion_id, pregunta_id, participante))`. `insert` y `select` para `anon`. Trigger `before insert` `validar_respuesta()`: sesión existe y no archivada; la pregunta existe en `config`; si la pregunta tiene opciones, `opcion_id` es una de ellas; si no tiene, `opcion_id` es null y `texto` no vacío; si la opción tiene `pideTexto = 'obligatorio'`, `texto` no vacío. Error con `raise exception` (llega como 400).
  - `inscripciones (id bigint identity pk, sesion_id uuid references sesiones on delete cascade, participante uuid, datos jsonb not null check (jsonb_typeof(datos) = 'object' and pg_column_size(datos) < 8000), creado timestamptz default now(), unique (sesion_id, participante))`. `insert` para `anon` (sesión no archivada); `select` solo `es_admin()`.
  - `resumen_inscripciones(p_sesion uuid) returns json` → `{"total": n}`; `security definer`; `execute` para `anon`.
  - `reiniciar_sesion(p_sesion uuid) returns void` → si no `es_admin()` `raise exception`; borra respuestas e inscripciones de la sesión; `paso = 'inicio'`, `ronda = ronda + 1`.
  - `alter publication supabase_realtime add table sesiones, respuestas;` (idempotente: dentro de un bloque `do` que ignora "already member").
  - El archivo termina con el comentario de cómo dar de alta el primer admin: `insert into admins values ('tu@email');`.
- `herramientas/verificar-seguridad.sh <url> <publishable_key> <codigo_de_sesion_existente>` imprime `OK`/`FALLA` por cada chequeo: no lee `inscripciones`; no lee `admins`; no puede `update` en `sesiones`; `reiniciar_sesion` falla sin login; `respuestas` con opción inexistente es rechazada; `respuestas` con `pideTexto` obligatorio y sin texto es rechazada; `resumen_inscripciones` responde `{"total": …}`. Sale con código ≠ 0 si alguno falla.

- [ ] **Step 1:** Escribir `herramientas/verificar-seguridad.sh` (es el test de esta tarea).
- [ ] **Step 2:** Escribir `sql/schema.sql`.
- [ ] **Step 3:** **Pedir al usuario** que lo ejecute en el SQL Editor de su Supabase, cree una sesión de prueba con `insert into sesiones (codigo, config) values ('prueba-seguridad', '<salida de importar-consulta.js>');` y se agregue en `admins`. No continuar sin su confirmación.
- [ ] **Step 4:** Run: `bash herramientas/verificar-seguridad.sh "$URL" "$KEY" prueba-seguridad` · Expected: todas las líneas `OK`, exit 0.
- [ ] **Step 5:** `git add sql/schema.sql herramientas/verificar-seguridad.sh && git commit -m "Esquema de sesiones con RLS, validación de respuestas y verificación"`

### Task 6: Acceso a datos (`js/datos.js`, `config.js`, `demo/sesion-ejemplo.json`)

**Files:**
- Create: `js/datos.js`, `config.js`, `demo/sesion-ejemplo.json`, `tests/datos.test.js`

**Interfaces:**
- Consumes: esquema de Task 5; `claveLocal` no (lo usan las vistas).
- Produces:
  - `config.js`: `export const CONFIG = { supabaseUrl: '', supabaseKey: '', preset: 'neutro' }` (con los valores reales de esta instalación).
  - `crearApi({ supabase }: { supabase: SupabaseClient }) | ({ almacen, sesionEjemplo }: { almacen: Storage, sesionEjemplo: Sesion }): Api`
  - `Api`:
    - `sesionPorCodigo(codigo): Promise<Sesion | null>`
    - `escuchar(sesionId, { alSesion?(s: Sesion), alRespuesta?(r: Respuesta), alPresentes?(n: number), comoPantalla?: boolean }): () => void` — `alSesion` en cada `UPDATE` (trae `paso`, `ronda`, `config`); Presence con clave `participante` o `` `pantalla-${participante}` `` (la pantalla también hace `track`, y no se cuenta). Devuelve la función para desuscribir.
    - `responder({ sesion_id, pregunta_id, participante, opcion_id, texto }): Promise<void>` — lanza `{ code: '23505' }` si ya existía.
    - `inscribir({ sesion_id, participante, datos }): Promise<void>` — idem.
    - `respuestas(sesionId): Promise<Respuesta[]>` · `resumenInscripciones(sesionId): Promise<{ total }>`
    - Admin: `entrar(email, clave)`, `salir()`, `usuario(): Promise<{ email } | null>`, `esAdmin(): Promise<boolean>`, `listarSesiones(): Promise<Sesion[]>`, `crearSesion(codigo, config): Promise<Sesion>`, `guardarConfig(id, config)`, `archivar(id, archivada)`, `cambiarPaso(id, paso)`, `reiniciar(id)`, `inscripciones(id): Promise<Inscripcion[]>`, `conteos(id): Promise<Record<string, number>>` (para `cambiosBloqueados`), `admins(): Promise<string[]>`, `agregarAdmin(email)`, `quitarAdmin(email)`.
  - Demo (`almacen`): guarda en claves `demo:*`; `escuchar` usa el evento `storage` entre pestañas y además avisa a los suscriptores de la misma pestaña; métodos de admin lanzan `Error('El formulario de administración necesita Supabase')`; `cambiarPaso` sí funciona (para manejar la pantalla en demo).
  - `demo/sesion-ejemplo.json`: sesión genérica (sin contenido de ningún organismo): registro opcional con Nombre y Email, una `lista` de 4 preguntas con Ok/No/Comentar, una `pregunta` guiada con 4 opciones, `final` con texto.

- [ ] **Step 1: Tests (backend demo con un `almacen` en memoria)**

```js
const memoria = () => { const m = new Map(); return { getItem: k => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k) }; };
test('demo: responder dos veces lanza 23505', async () => {
  const api = crearApi({ almacen: memoria(), sesionEjemplo });
  const r = { sesion_id: sesionEjemplo.id, pregunta_id: 'q1', participante: 'p', opcion_id: 'o1', texto: null };
  await api.responder(r);
  await assert.rejects(api.responder(r), { code: '23505' });
  assert.equal((await api.respuestas(sesionEjemplo.id)).length, 1);
});
test('demo: cambiarPaso avisa a los suscriptores', async () => {
  const api = crearApi({ almacen: memoria(), sesionEjemplo });
  let visto; api.escuchar(sesionEjemplo.id, { alSesion: s => (visto = s.paso) });
  await api.cambiarPaso(sesionEjemplo.id, 'cierre');
  assert.equal(visto, 'cierre');
});
test('demo: sesionPorCodigo', async () => {
  const api = crearApi({ almacen: memoria(), sesionEjemplo });
  assert.equal((await api.sesionPorCodigo(sesionEjemplo.codigo)).id, sesionEjemplo.id);
  assert.equal(await api.sesionPorCodigo('no-existe'), null);
});
test('sesion-ejemplo es válida', () => assert.deepEqual(validarConfig(sesionEjemplo.config), []));
```

- [ ] **Step 2:** Run: `node --test tests/` · Expected: FAIL.
- [ ] **Step 3:** Implementar `js/datos.js` (Supabase con `supabase.channel('sesion:' + id)`, filtros `filter: 'id=eq.' + id` en `sesiones` y `'sesion_id=eq.' + id` en `respuestas`), `config.js` y la sesión de ejemplo.
- [ ] **Step 4:** Run: `node --test tests/` · Expected: PASS.
- [ ] **Step 5:** `git add js/datos.js config.js demo/sesion-ejemplo.json tests/datos.test.js && git commit -m "Acceso a datos: Supabase y demo"`

### Task 7: Vista del participante (`participar.html`, `js/participante.js`, `js/ui.js`)

**Files:**
- Create: `participar.html`, `js/participante.js`, `js/ui.js`

**Interfaces:**
- Consumes: Tasks 1, 4, 6.
- Produces: `js/ui.js` → `esc(s)`, `$(sel)`, `mensaje(el, texto, esError = true)`, `dibujarQr(el, texto, lado)`, `cargarSesion(): Promise<{ api, sesion, demo } | null>` (lee `?s=` y `?demo`, normaliza el código, aplica el tema; con `?demo` usa `demo/sesion-ejemplo.json`).

Comportamiento (copiar del `index.html` actual lo que ya funciona: polling 10 s, `visibilitychange`, manejo de `23505`, validaciones del registro, autocompletar):
- Sin `?s=`: formulario "Ingresá el código" → `participar.html?s=<normalizado>`. Código inexistente o archivado: "No encontramos una sesión activa con ese código."
- Registro obligatorio (paso 0): se muestra desde `inicio` hasta registrarse, en cualquier paso salvo `final`. Encabezado del formulario: solo título y descripción del paso (sin etiquetas "Registro" ni "Tus datos" apiladas).
- Encabezado en el celular: solo el logo (o el nombre de la organización si no hay logo); el texto `encabezado` se muestra en la pantalla de espera, no en la barra.
- `pregunta`: una pregunta. `lista`: lista con barra de progreso "N de M" y respondidas en verde; detalle con "← Lista" en una barra superior compacta.
- Detalle de pregunta: descripción recortada a 3 líneas con "Ver más"; etiquetas visibles hasta 6 y luego "+N"; las opciones deben quedar visibles sin scroll en 375×667 con la pregunta de mayor descripción de la sesión de ejemplo.
- Al tocar una opción: si `pideTexto`, aparece el cuadro de texto, se desplaza a él y recibe foco; si no, se desplaza y enfoca *Enviar*. *Enviar* a ancho completo y fijo abajo una vez elegida una opción. Sin opciones: solo cuadro de texto.
- `cierre`: "¡Gracias! Mirá la pantalla." · `final`: `config.final.titulo` y `config.final.texto`.
- Marcas locales con `claveLocal(sesion, 'votado', preguntaId)` y `claveLocal(sesion, 'inscripto')`.
- `alSesion` con `config` nueva: si el formulario visible tiene una opción elegida o texto escrito, guardar la config y re-dibujar recién al enviar o volver; si no, re-dibujar ya.

- [ ] **Step 1:** Implementar.
- [ ] **Step 2:** Verificar en el navegador con `participar.html?demo` en 375×667: cada punto de la lista de comportamiento, uno por uno, incluido el avance automático en las dos variantes y el teclado no tapando el cuadro de texto.
- [ ] **Step 3:** Verificar Review Focus 1 y 2: recargar a mitad de la lista (siguen en verde); en otra pestaña `cambiarPaso` + cambio de texto de una pregunta con un comentario a medio escribir (no se pierde).
- [ ] **Step 4:** `git add participar.html js/participante.js js/ui.js && git commit -m "Vista del participante con sesiones configurables"`

### Task 8: Vista proyectada (`pantalla.html`, `js/pantalla.js`)

**Files:**
- Create: `pantalla.html`, `js/pantalla.js`

**Interfaces:**
- Consumes: Tasks 1, 2, 4, 6, 7 (`ui.js`).

Comportamiento:
- Escala para proyector: `html { font-size: clamp(16px, 1.25vw, 40px) }`; ningún texto menor a `1rem`.
- Controles (Anterior / nombre del paso / Siguiente o **Finalizar** cuando el próximo es `final`) en una barra inferior que se oculta tras 3 s sin mover el mouse; teclado: →, AvPág, espacio avanzan; ←, RePág retroceden. Solo con `esAdmin()` (o en demo); si no, nada de controles.
- `inicio`: título de la sesión como lo más grande, QR, dirección corta (`host/participar.html?s=codigo`) y el código, contador de conectados.
- `pregunta` y detalle de `lista`: una barra por opción con texto, cantidad y porcentaje escritos; textos más recientes (hasta 8).
- Resumen de `lista`: grilla con `grillaPara(n, ancho, alto)` del área disponible, sin scroll; cada tarjeta muestra la opción con más respuestas y su porcentaje, y el total. Clic abre el detalle (solo en esa pantalla).
- `registro`: total de inscriptos (`resumenInscripciones`, polling 3 s en ese paso).
- `cierre`: resumen de todas las preguntas. `final`: `config.final` en grande.
- QR chico en una esquina con el código, en todos los pasos menos `inicio` y `final`.
- Realtime + respaldo: copiar de `index.html` (`refrescar` 15 s, deduplicar por `id`, `ultimoCambio`).

- [ ] **Step 1:** Implementar.
- [ ] **Step 2:** Verificar con `pantalla.html?demo` y `participar.html?demo` en dos pestañas, a 1280×720 y 1920×1080: sin scroll en el resumen de 14 tarjetas (probar con una copia local de `demo/sesion-ejemplo.json` con 14 preguntas, sin commitearla), barras con números, Finalizar en el último paso, controles ocultos a los 3 s.
- [ ] **Step 3:** `git add pantalla.html js/pantalla.js && git commit -m "Vista proyectada: escala de proyector, resultados por opción y Finalizar"`

### Task 9: Formulario de administración (`admin.html`, `js/admin.js`)

**Files:**
- Create: `admin.html`, `js/admin.js`

**Interfaces:**
- Consumes: Tasks 1–4, 6, 7 (`ui.js`).

Comportamiento:
- Login con email y contraseña (`api.entrar`). Logueado pero no admin: "Tu cuenta no está autorizada. Pedile a quien administra que agregue tu email."
- Lista de sesiones: código, título, estado; acciones: Editar, Duplicar (pide código nuevo), Archivar/Desarchivar, Abrir pantalla, Copiar link de participantes, Ver QR, Exportar CSV (`armarCsv`), Reiniciar (confirmar escribiendo el código; `api.reiniciar`).
- Crear sesión: código (normalizado en vivo, validado con `codigoValido` y unicidad) y título; arranca con `ESTETICA_DEFECTO` y `final.titulo = '¡Gracias por participar!'`.
- Editor: datos generales (título, instrucciones, texto final); estética (preset, organismo, logo URL, encabezado, dos colores con `<input type="color">`, tipografía de una lista corta, esquinas, firma) con **vista previa en vivo** y aviso si `contraste(colorPrincipal, '#FFFFFF') < 4.5` y el texto automático no lo resuelve; pasos con agregar/quitar/subir/bajar; dentro de cada paso, sus campos, preguntas y opciones (2–6, con "pide texto"). Carga rápida: en un paso `lista`, un `<textarea>` "Pegar preguntas" que usa `leerBloques`.
- Guardar: `validarConfig` + `cambiosBloqueados` (con `api.conteos`); si hay errores, se listan arriba y no se guarda.
- Importar/Exportar la config como JSON (para copiar sesiones entre instalaciones).
- Admins: listar, agregar, quitar (no se puede quitar el propio email).

- [ ] **Step 1:** Implementar.
- [ ] **Step 2:** Verificar contra Supabase (cuenta creada por el usuario en *Authentication → Users*): crear sesión, cargar 14 preguntas pegando el contenido de `consulta.md`, guardar, abrir `participar.html?s=` y `pantalla.html?s=`, votar, editar un texto en vivo, intentar borrar una pregunta votada (bloqueado), exportar CSV, reiniciar.
- [ ] **Step 3:** Importar la consulta actual: `node herramientas/importar-consulta.js consulta.md` → Importar JSON en una sesión con código `jornada26`.
- [ ] **Step 4:** `git add admin.html js/admin.js && git commit -m "Formulario de administración de sesiones"`

### Task 10: Documentación de usuario (`README.md`, `docs/guia/`)

**Files:**
- Modify: `README.md` (reescribir)
- Create: `docs/guia/instalacion.md`, `docs/guia/sesiones.md`, `docs/guia/estetica.md`, `docs/guia/problemas.md`

Reglas de escritura (obligatorias):
- Único objetivo: que una persona dé de alta y use su propia instancia leyendo la guía.
- Estrictamente técnica. Sin historia del proyecto, sin mencionar eventos, organismos ni casos de uso concretos, sin adjetivos de venta ("fácil", "potente", "simple", "rápido", "gratis" como argumento; "gratuito" solo como dato del plan de Supabase), sin frases de relleno ni enumeraciones decorativas con comas.
- Frases cortas en imperativo. Un paso = una acción con su resultado verificable ("Debería ver…").
- Nombres exactos de menús de Supabase y GitHub entre comillas tipográficas o en negrita, tal como aparecen.
- Diagramas en Mermaid, solo estos:
  1. `instalacion.md`: arquitectura (`flowchart LR`: navegador del participante / pantalla / admin → GitHub Pages (archivos) y → Supabase (Auth, Postgres, Realtime)).
  2. `instalacion.md`: secuencia de instalación (`flowchart TD` de los pasos).
  3. `sesiones.md`: ciclo de una sesión (`stateDiagram-v2`: inicio → pasos → cierre → final; reinicio vuelve a inicio).
  4. `sesiones.md`: qué ve cada pantalla en cada paso (tabla, no diagrama).
- Contenido:
  - `README.md`: qué es en dos frases, enlaces a las cuatro guías, requisitos (cuenta de GitHub, cuenta de Supabase), licencia.
  - `instalacion.md`: copiar el repo (Use this template / Fork) → crear proyecto Supabase → ejecutar `sql/schema.sql` → desactivar *signups* en Auth → crear usuario en "Authentication → Users → Add user" con "Auto Confirm User" → `insert into admins` → copiar URL y publishable key a `config.js` → GitHub Pages ("Settings → Pages → Deploy from a branch → main / root") → probar con `participar.html?demo` → `herramientas/verificar-seguridad.sh`.
  - `sesiones.md`: crear y editar sesiones, tipos de paso, opciones y "pide texto", carga rápida (formato de `leerBloques` con ejemplo), presentar (teclado, Finalizar), exportar, reiniciar, qué no se puede editar con respuestas y por qué.
  - `estetica.md`: los tres niveles; lista de tokens con su efecto; cómo crear un preset copiando `temas/neutro.css`; contraste automático.
  - `problemas.md`: tabla síntoma → causa → solución (celular con versión vieja por la caché de 10 min de GitHub Pages; Realtime ~200 conexiones en plan gratuito y respaldo por polling; proyecto pausado tras 7 días sin uso; "Tu cuenta no está autorizada").
- [ ] **Step 1:** Escribir los archivos.
- [ ] **Step 2:** Verificar: `grep -niE 'jornada|datos abiertos|evento|fácil|potente|simple|increíble|planific' README.md docs/guia/*.md` no devuelve nada (salvo el nombre del preset `datos-gob-ar` en `estetica.md`). Los bloques Mermaid se ven en la vista previa de GitHub.
- [ ] **Step 3:** Seguir `instalacion.md` al pie de la letra en un proyecto Supabase nuevo (lo crea el usuario) hasta ver la sesión de ejemplo funcionando; corregir cada paso donde haya que adivinar.
- [ ] **Step 4:** `git add README.md docs/guia && git commit -m "Guía de instalación y uso"`

### Task 11: Reemplazo de la versión anterior (solo con confirmación explícita del usuario, después de su evento)

**Files:**
- Modify: `index.html` (pasa a ser la entrada por código, igual que `participar.html` sin `?s=`, o redirige a ella)
- Delete: `consulta.md`, `consulta.js`, `test.js`, `schema.sql`, `migraciones/`, `docs/superpowers/` (antes de publicar el repo)
- Create: `sql/borrar-version-anterior.sql` (`drop table if exists votos, registros, estado, clave_presentador cascade; drop function if exists resumen_registros(), cambiar_paso(text, text);`)

- [ ] **Step 1:** Preguntar al usuario si ya puede retirarse la versión anterior y si quiere exportar antes los datos de `votos`/`registros`. No seguir sin un sí.
- [ ] **Step 2:** Hacer los cambios; `node --test tests/` · Expected: PASS.
- [ ] **Step 3:** Pedir al usuario que ejecute `sql/borrar-version-anterior.sql`.
- [ ] **Step 4:** `git commit -m "Retirar la versión de consulta única"`
