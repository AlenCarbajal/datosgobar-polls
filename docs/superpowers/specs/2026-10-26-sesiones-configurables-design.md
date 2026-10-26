# Sesiones configurables — diseño

Fecha: 2026-10-26 · Repo: `AlenCarbajal/datosgobar-polls` · Estado: para revisión

## Para qué es

**Producto genérico y de código abierto.** El repositorio se publica para que **cualquier organismo, ONG o persona** lo use gratis. datos.gob.ar es solo el primer caso de uso: nada del producto puede depender de su identidad. La estética por defecto es **neutra**; la de datos.gob.ar es un *preset* más.

Una herramienta propia, gratuita y sin servidor, para reemplazar a Mentimeter en consultas presenciales (~60 personas en una sala; diseñar para hasta 200). Hoy existe una versión que funciona para **un** evento (Jornada de Datos Abiertos 2026): las preguntas viven en `consulta.md` dentro del repo, la clave del presentador va en la URL y cada cambio de consulta exige editar archivos y publicar.

El objetivo de este refactor es que **armar una consulta nueva no requiera tocar código ni el repositorio**: quien organiza entra con su email a un formulario, arma la sesión (pasos, dinámicas, preguntas, opciones, campos, estética), la guarda y la proyecta. Y que cualquier otra área u organismo pueda **replicar la herramienta** copiando el repo y creando su propio Supabase, con su propia estética.

## Qué existe hoy (punto de partida)

Archivos: `index.html` (≈480 líneas: vista participante, vista pantalla, estilos), `consulta.js` (lector de `consulta.md`), `consulta.md`, `schema.sql`, `migraciones/`, `test.js`, `README.md`. Publicado en GitHub Pages; datos en Supabase (proyecto gratuito ya creado y en uso).

Comportamiento que hay que **conservar** (funciona y se probó):

- Participantes entran por QR; el celular sigue el paso que elige el presentador **al instante** (Supabase Realtime, `postgres_changes` sobre la fila de estado) con polling de respaldo (10 s celular / 15 s pantalla) y re-sincronización al desbloquear el celular (`visibilitychange`).
- Pantalla del presentador: bienvenida con QR grande y **contador de personas conectadas** (Realtime Presence; ojo: Supabase solo envía la lista de presentes a quien también hace `track`, por eso la pantalla se anuncia con una clave `pantalla-…` y no se cuenta).
- Votos llegan a la pantalla al instante (`INSERT` en Realtime) y se suman a lo que ya hay, con deduplicación por `id`.
- Dinámica **guiada** (una pregunta por paso, todos siguen al presentador) y **libre** (lista de preguntas; cada persona entra a la que quiere, vota, vuelve; las respondidas quedan en verde con "N de M respondidas"; la pantalla muestra tarjetas resumen y detalle al tocar una).
- **Registro** con campos configurables; si va primero es obligatorio: se pide apenas escanean el QR (durante la bienvenida) y nadie responde sin registrarse, aunque llegue tarde. El registro queda unido a sus respuestas por un `participante` (UUID anónimo guardado en `localStorage`).
- Datos personales **nunca legibles desde la web pública**; la pantalla solo ve totales vía función `security definer`.
- Un voto por persona por pregunta (unique en base; error `23505` se trata como "ya hecho").
- Modo `?demo` (todo en `localStorage`, sincroniza pestañas con el evento `storage`) para probar sin tocar la base.
- Identidad visual gob.ar / Datos Abiertos (Montserrat; navy `#232D4F`, índigo `#393793`, violeta `#B369ED`; mosaico de tiles con glifos en el header), accesible (foco visible, contraste AA, labels reales, mensajes de error en línea).

## Contexto de calendario

La Jornada de Datos Abiertos 2026 es **en pocos días** y usa la versión actual. **La versión nueva se construye en paralelo sin tocar la que está en uso**: archivos nuevos (no se reemplaza `index.html` hasta después del evento) y tablas nuevas en el mismo Supabase (no se modifican ni borran `votos`, `registros`, `estado`, `clave_presentador`). El reemplazo y el borrado de lo viejo son un paso final, separado y explícito, después del evento. *(Por eso las tablas nuevas necesitan nombres que no choquen con las actuales; queda a criterio de quien construye.)*

## Objetivos

1. **Formulario de administración** (`admin.html` o vista `#admin`) para crear, editar, duplicar, archivar y reiniciar sesiones, sin tocar código.
2. **Acceso de quien organiza/presenta con email y contraseña** (Supabase Auth), limitado a una **lista de emails autorizados**. Reemplaza la clave en la URL. *(Decidido por el usuario: las cuentas se crean desde el panel de Supabase; no se envían correos, así que no hace falta SMTP.)*
3. **Sesiones múltiples** guardadas en Supabase, cada una con un **código corto** (`jornada26`) y dirección propia. Las viejas quedan con sus resultados.
4. **Pasos configurables**, cada uno de un tipo de dinámica:
   - **Registro**: campos variables en cantidad y tipo.
   - **Pregunta (guiada)**: una pregunta; todos los celulares la muestran mientras el presentador está en ese paso.
   - **Lista (libre)**: un grupo de preguntas; cada persona elige cuál responder y vuelve a la lista (respondidas en verde).
   - Bienvenida y Cierre son automáticos (primer y último paso de contenido), no se configuran como pasos, pero sí sus textos.
   - **Finalizar** *(pedido del usuario)*: hoy, en el último paso, "Siguiente" no lleva a ningún lado. El botón del último paso debe decir **"Finalizar"** y llevar a una pantalla final con un **mensaje propio editable** (título y texto, configurados en la sesión), que se muestra en la pantalla proyectada y en los celulares. Desde ahí, "Anterior" vuelve al Cierre.
5. **Preguntas con opciones propias, de 2 a 6**, de **selección única** *(decisión mía: el usuario no pidió selección múltiple)*. Cada opción puede marcarse como **"pide texto"** (obligatorio u opcional), p. ej. "Comentar", "Otro", "No, porque…". Además una pregunta puede ser **de texto libre** (sin opciones).
6. **Avance automático al tocar una opción**: si la opción no pide texto → desplaza y enfoca el botón *Enviar*; si pide texto → desplaza y enfoca el cuadro de texto (abre el teclado).
7. **Estética personalizable en tres niveles** *(pedido del usuario: "elementos de modificación simple y otros más complejos")*:
   - **Simple, desde el formulario de cada sesión**: logo (subido como URL o archivo del repo), nombre de la organización, texto del encabezado, color principal y color de acento. Todo lo demás (fondos suaves, bordes, estados elegido/hecho, barras) se **deriva** de esos dos colores con `color-mix()`, y el color del texto sobre cada color se elige automáticamente (blanco o oscuro) para cumplir contraste AA. El formulario avisa si un color elegido no alcanza el contraste.
   - **Intermedio, también desde el formulario**: tipografía (lista corta de Google Fonts), forma de las esquinas (rectas / suaves / redondeadas), estilo del encabezado (sólido / con firma visual) y una *firma visual* opcional (el mosaico de tiles con glifos de datos.gob.ar pasa a ser una opción de su preset, no parte fija del producto).
   - **Avanzado, en el repo**: *presets* de estética como archivos (`temas/<nombre>.css` o `.json`) que cualquiera puede copiar y editar; el preset se elige por sesión. Incluir al menos `neutro` (por defecto) y `datos-gob-ar` (identidad actual con el logo oficial blanco `img/logo-datos-gob-ar-blanco.png`, Montserrat, navy `#232D4F`, índigo `#393793`, violeta `#B369ED`, mosaico).
   - Todos los colores del CSS salen de *tokens* (variables). No puede quedar ningún color fijo suelto (hoy hay varios: `#EFEEFA`, `#F6F4FC`, `#EEF7EE`, `#FFF6DB`, …).
8. **Replicable en ~20 minutos**: copiar el repo, crear un proyecto Supabase, ejecutar un único `schema.sql`, pegar URL y *publishable key* en un archivo de configuración, agregar el primer email autorizado, activar GitHub Pages.
9. **Exportar y reiniciar desde el formulario**: descargar CSV de respuestas (con los datos de registro de cada persona) y borrar los resultados de una sesión, sin SQL a mano.

## No objetivos (por ahora)

- Selección múltiple, ranking, nube de palabras, escalas, quizzes con puntaje, más de 6 opciones.
- Cuentas para participantes (siguen anónimos + registro opcional).
- Moderación de comentarios antes de proyectarlos (el usuario la descartó antes).
- Plataforma multi-organización con un solo despliegue compartido (cada organización replica su copia).
- Edición colaborativa simultánea de una misma sesión en el formulario.
- Idiomas además del español.
- Compatibilidad con navegadores muy viejos (se asume navegador móvil moderno; ES modules).

## Anti-objetivos (aunque "funcione", sería un fracaso)

- Que crear o cambiar una consulta requiera editar archivos, hacer commits o esperar un despliegue.
- Que algún dato personal del registro o la lista de admins sea legible con la *publishable key*.
- Que dependa de un servicio pago, de un servidor propio o de un paso de *build* (bundler, npm). Debe seguir siendo HTML/JS/CSS estático que se sirve tal cual. *(Decisión mía para mantener la replicación trivial; dependencias por CDN con versión fija e `integrity`, como hoy.)*
- Que se pierda la sincronización instantánea presentador ↔ celulares o el contador de conectados.
- Que editar el texto de una pregunta ya votada desvincule sus votos (problema actual: el id sale del título). Los ids deben ser estables.
- Que una persona no técnica se pierda en el formulario: tiene que poder armar las 14 preguntas de la consulta actual en pocos minutos.

## Decisiones tomadas después de la revisión

- **Capacidad** *(decisión mía)*: Realtime gratis admite ~200 conexiones simultáneas. Objetivo real ~60; el límite se documenta. Si un celular no logra conectarse en tiempo real, sigue funcionando con el polling de respaldo (y no aparece en el contador de conectados).
- **Editar una sesión con respuestas** *(decisión mía)*: se pueden editar textos (preguntas, descripciones, opciones, etiquetas, estética) y el cambio llega en vivo a celulares y pantalla (escuchan el `UPDATE` de la fila de la sesión, que trae la `config`). **No** se puede borrar una pregunta u opción que ya tiene respuestas, ni cambiar una pregunta entre "con opciones" y "texto libre", ni cambiar el "pide texto" de una opción con respuestas: el editor lo impide y explica por qué.
- **Reiniciar resultados** *(decisión mía)*: borra **respuestas y registros** de esa sesión, vuelve el paso a Bienvenida e incrementa un contador `ronda` en la sesión; los celulares guardan sus marcas locales ("respondida", "registrado") por `sesion + ronda`, así que tras reiniciar las olvidan. Confirmación escribiendo el código de la sesión.
- **`?demo`** *(decisión mía)*: cubre participante y pantalla con una sesión de ejemplo incluida en el repo. El admin requiere Supabase.

## Restricciones

- Supabase plan gratuito (Auth, Postgres, Realtime). GitHub Pages (cache de 10 min en HTML; se mantiene la advertencia de no publicar cambios de código justo antes de un evento — con este diseño los cambios de **contenido** ya no pasan por el deploy).
- Participantes en celular, con red de evento (puede haber cortes): mantener polling de respaldo y reintentos.
- Español rioplatense en toda la interfaz; tono simple, sin jerga.
- Accesibilidad no negociable (ver arriba).
- El repo tiene un hook que rechaza commits con menciones a Claude/Anthropic (sin `Co-Authored-By`).

## Cómo se arma (decidido)

### Hosting y configuración de instalación

- Sitio estático en GitHub Pages (funciona igual en Netlify/Cloudflare Pages). `.nojekyll` se mantiene.
- Un archivo `config.js` (o `config.json`) en el repo con **solo**: URL de Supabase, *publishable key*, y valores de estética por defecto de la instalación. Es el único archivo que se edita al replicar. La *publishable key* es pública por diseño; la seguridad la dan las políticas RLS.
- `consulta.md` deja de ser la fuente de las consultas. *(Ver "Migración".)*

### Acceso de administración

- Supabase Auth con **email y contraseña** (`signInWithPassword`). Las cuentas las crea quien administra la instalación en *Authentication → Users → Add user* (con *Auto Confirm*). El registro público de cuentas (*signups*) queda **desactivado** y se documenta en la instalación. Sin envío de correos.
- Tabla `admins (email text primary key)`: una cuenta de Supabase solo puede administrar si su email está ahí. El primer email se agrega con una línea SQL al instalar (documentado). Desde el formulario, un admin puede agregar/quitar emails autorizados (la cuenta en sí se sigue creando en el panel de Supabase).
- La sesión de login persiste en el navegador (comportamiento por defecto de supabase-js), así que se puede manejar la pantalla desde el celular del presentador.
- Toda escritura de sesiones, cambio de paso, lectura de registros, exportación y reinicio exige estar logueado **y** que `auth.jwt() ->> 'email'` esté en `admins`. Se aplica en RLS / funciones `security definer`, no solo en la interfaz.
- La pantalla del presentador: si hay sesión de admin en ese navegador, muestra los controles; si no, es solo lectura (y se puede proyectar esa versión y manejar desde el celular logueado, como hoy).

### Modelo de datos (Supabase)

- `sesiones`: `id uuid`, `codigo text unique` (minúsculas, letras/números/guiones, ≤ 30), `config jsonb` (todo el contenido: título, instrucciones, estética, pasos con sus preguntas/campos), `paso text` (paso actual), `archivada bool`, `creado/actualizado`. Lectura pública de `codigo, config, paso` de sesiones no archivadas (los participantes necesitan la config; no es secreta). Escritura solo admins. El cambio de paso de la sesión reemplaza a la tabla `estado` y a `cambiar_paso(clave, …)`.
- `respuestas`: `id`, `sesion_id`, `pregunta_id`, `participante uuid`, `opcion_id` (null en texto libre), `texto` (≤ 1000), `creado`; `unique (sesion_id, pregunta_id, participante)`. Insert público; select público **sin** `participante` *(decisión mía: hoy se expone; no hace falta)*. Validación en base (trigger o check en función de insert): la pregunta y la opción existen en la `config` de esa sesión, la sesión no está archivada, y si la opción pide texto obligatorio, `texto` no está vacío.
- `registros`: `id`, `sesion_id`, `participante uuid`, `datos jsonb` (clave = id del campo, más una copia de la etiqueta para exportar legible), `creado`; `unique (sesion_id, participante)`. Insert público; select solo admins.
- Función `resumen_registros(sesion_id)` → `{ total }` para la pantalla (sin datos personales).
- Realtime: `sesiones` (UPDATE de `paso`) y `respuestas` (INSERT), filtrados por `sesion_id`. Presence por canal `sesion:<id>`.
- Un único `schema.sql` idempotente para instalaciones nuevas. Para la base actual, una migración en `migraciones/` que crea lo nuevo; las tablas viejas (`votos`, `registros` actual, `estado`, `clave_presentador`) se pueden borrar después *(contienen solo datos de prueba — confirmar con el usuario antes de borrar)*.

### Config de una sesión (forma del JSON)

Ids estables generados al crear cada elemento (cortos, p. ej. 8 caracteres), nunca derivados del texto.

```jsonc
{
  "titulo": "Consulta sobre supertemas y temas asociados",
  "instrucciones": "Entrá a cada supertema…",
  "estetica": { "organismo": "datos.gob.ar", "logo": "", "evento": "Jornada de Datos Abiertos 2026",
                "colorPrincipal": "#232D4F", "colorAcento": "#393793" },
  "pasos": [
    { "id": "r1", "tipo": "registro", "titulo": "Registrate para participar", "descripcion": "…",
      "obligatorio": true,
      "campos": [ { "id": "c1", "etiqueta": "Nombre", "tipo": "texto", "obligatorio": true },
                  { "id": "c3", "etiqueta": "Email", "tipo": "email", "obligatorio": true } ] },
    { "id": "l1", "tipo": "lista", "titulo": "Supertemas",
      "preguntas": [ { "id": "q1", "texto": "Población y sociedad", "descripcion": "…",
                       "etiquetas": ["Género y diversidad sexual", "…"],
                       "opciones": [ { "id": "o1", "texto": "Ok" },
                                     { "id": "o2", "texto": "No" },
                                     { "id": "o3", "texto": "Comentar", "pideTexto": "obligatorio" } ] } ] },
    { "id": "g1", "tipo": "pregunta", "pregunta": { "id": "q20", "texto": "¿…?", "opciones": [ … ] } }
  ]
}
```

Tipos de campo de registro: `texto`, `email`, `telefono`, `numero`, `texto_largo`, `seleccion` (desplegable con sus opciones). Un registro **obligatorio** debe ser el primer paso.

### Vistas

- **Participante** (`/?s=codigo`, o `/` con un campo para escribir el código): igual que hoy, más el avance automático al tocar una opción, opciones propias (2–6) y estética de la sesión. Sesión inexistente o archivada → mensaje claro.
- **Pantalla** (`/pantalla.html?s=codigo` o `#pantalla`): igual que hoy; los resultados muestran **una barra por opción** (hasta 6, con su porcentaje y cantidad) en lugar del "% Ok"; comentarios = respuestas con texto; tarjetas resumen en pasos de lista.
- **Admin**: login por email; lista de sesiones (crear, duplicar, archivar, abrir pantalla, copiar link y QR de participantes); editor de una sesión (estética, pasos en orden con agregar/quitar/reordenar, preguntas y opciones dentro de cada paso, campos de registro); exportar CSV; reiniciar resultados (con confirmación); gestionar emails autorizados.
- **Atajo de carga rápida en el editor**: pegar una lista de líneas para crear varias preguntas/etiquetas/opciones de una vez (las 14 preguntas actuales con sus etiquetas deben poder cargarse sin tipear una por una).

### Migración del evento actual

- La consulta actual (14 supertemas con descripciones y temas oficiales del vocabulario `temas-datos-gob-ar`, registro con Nombre/Apellido/Email/Organismo, modo libre, opciones Ok/No/Comentar) se crea como la primera sesión, código propuesto `jornada26`.
- *(Decisión mía)* Se provee una importación única desde `consulta.md` (script o botón en admin) para no cargarla a mano; después `consulta.md` y `consulta.js` se eliminan del flujo.

### Pruebas

- Lógica pura (validación de config, conteo de resultados, armado de CSV, parser de "pegar lista") en módulos ES sin DOM, con `node test.js` (sin frameworks), como hoy.
- Políticas de seguridad verificadas con la *publishable key* contra la base real: no se leen registros ni admins; no se escribe en sesiones sin login; respuestas inválidas rechazadas.
- Recorrido completo en `?demo` (que debe seguir existiendo, con una sesión de ejemplo incluida) y luego contra Supabase.

## Requisitos de interfaz que salen de la crítica de diseño

Crítica completa hecha el 2026-10-26 sobre la versión actual (celular y pantalla proyectada). Lo que el refactor debe resolver:

**Celular**
- En el detalle de una pregunta, **las opciones quedan debajo del pliegue** (la descripción y 8 etiquetas las empujan fuera de la vista). Las opciones deben verse sin hacer scroll en un celular de 375×667: descripción recortada a 2–3 líneas con "Ver más", etiquetas compactas (o colapsadas a 2 filas con "+N").
- **Estado "elegido" débil** (solo un tinte claro): sumar indicador explícito (círculo/check) y borde más marcado.
- El cuadro de comentario aparece siempre con "(opcional si elegís Ok o No)": mostrarlo **solo cuando la opción elegida pide texto** (o como "Agregar comentario" colapsado si es opcional). Encaja con el avance automático.
- Botón principal (*Enviar*, *Registrar*) a **ancho completo** y fijo abajo en el celular cuando hay una elección hecha.
- "← Volver a la lista" compite visualmente con el contenido: pasarlo a una barra superior compacta con el progreso ("3 de 14").
- Registro: hay tres niveles de etiquetas apilados ("Registro" + título + "Tus datos"); dejar título y descripción.
- Encabezado del celular: logo y texto del evento se aprietan en dos líneas; en celular mostrar solo el logo (o el nombre) y el evento en la pantalla de espera.

**Pantalla proyectada**
- **Los controles del presentador (Anterior/Siguiente/nombre del paso) se ven en la proyección.** Separarlos: barra mínima que se oculta sola (o modo "proyección" sin controles, manejando desde el teclado/celular).
- **Tipografía demasiado chica para proyectar** (11–14 px en etiquetas, leyendas y encabezado). Escala pensada para proyector (base ≈ 1,6–2 vw; nada menor a ~20 px a 1080p).
- **El resumen de 14 preguntas no entra en 720p** y obliga a hacer scroll, cosa que no se puede en una proyección: el resumen debe ajustar su densidad al espacio (filas compactas con barra, o paginado automático).
- **"% Ok" engaña**: se calcula solo sobre Ok+No e ignora "Comentar". Con 2–6 opciones, mostrar **una barra por opción** (o una barra apilada con leyenda) con cantidad y porcentaje **sobre el total de respuestas**, con el número escrito dentro o al lado (no solo color).
- Bienvenida: el título de la consulta es una etiqueta chiquita; debe ser lo más grande junto al QR. Mostrar una **dirección corta y el código de la sesión** en grande (no la URL larga).
- El QR lateral ocupa 260 px en todos los pasos: reducirlo a una esquina con el código.

**Consistencia**
- Radios de esquina mezclados (6/8/10/999 px), variantes de botón sueltas (`.omitir`, `.volver`, `#ant`), y la clase "etiqueta chica violeta" usada para cinco cosas distintas: unificar en un set chico de componentes.

**Accesibilidad**
- Los pares de color actuales pasan AA. Con colores elegidos por cada organización eso deja de estar garantizado: de ahí el cálculo automático de color de texto y el aviso en el formulario.
- Barras de resultados: no depender solo del color (número y etiqueta junto a cada barra).

## Lo que queda a criterio de quien construye

- Estructura de archivos (una página con rutas por hash vs. `index.html` / `pantalla.html` / `admin.html` + módulos compartidos), siempre sin build.
- Diseño visual del formulario de admin dentro de la identidad existente.
- Cómo se generan los ids cortos y los códigos sugeridos.
- Si la validación de respuestas en base se hace con trigger o con una función RPC de insert.
- Detalles de reordenamiento en el editor (botones subir/bajar alcanzan; no hace falta drag & drop).
- Formato exacto del CSV (una fila por respuesta, con columnas de registro de esa persona y etiquetas legibles de pregunta/opción).
