# Consulta y registro

Página para que los participantes voten o comenten cada pregunta y registren qué necesitan. Incluye una pantalla para proyectar los resultados en vivo.
La página se publica con GitHub Pages y los datos se guardan en Supabase. Las dos cosas son gratis para un evento de este tamaño.

- Participantes: `https://alencarbajal.github.io/datosgobar-polls/`
- Pantalla para proyectar y manejar: `https://alencarbajal.github.io/datosgobar-polls/#pantalla/TU-CLAVE`
- Prueba sin tocar la base real: agregá `?demo`, por ejemplo `.../datosgobar-polls/?demo#pantalla` en una pestaña y `.../datosgobar-polls/?demo` en otra del mismo navegador.

## Armar una consulta: `consulta.md`

Las preguntas están en [`consulta.md`](consulta.md), un archivo de texto. Para cambiarlas, en GitHub abrí el archivo, tocá el lápiz (*Edit*), editá y tocá *Commit changes*. Se publica solo en uno o dos minutos.

```md
# Título de la consulta
Instrucciones para los participantes (una o más líneas).

Modo: libre

## Primera pregunta o supertema
Una breve descripción (opcional).
- Tema asociado (opcional)
- Otro tema

## Segunda pregunta, sin temas

## Registro: ¿Qué necesita tu organismo de nosotros?
- Asistencia técnica
- Capacitación

### Tus datos
- Nombre *
- Apellido *
- Email *
- Organismo *
- Teléfono
```

- `#` es el título; las líneas sueltas debajo, las instrucciones.
- `Modo: libre` o `Modo: guiado` (si no se pone, es guiado). Ver *Dos modos* más abajo.
- Las líneas sueltas debajo de un `##` son su descripción.
- Cada `##` es un paso de la presentación. Se vota con **Ok / No / Comentar / Omitir**.
- Los `-` debajo de una pregunta son sus temas, que se muestran como etiquetas.
- `## Registro: ...` es el formulario de registro. El texto después de `Registro:` es el título y los `-` son opciones para marcar (si no hay, no se muestran).
- `### ...` dentro del registro empieza la lista de **datos a pedir**: cada `-` es un campo. Con `*` al final es obligatorio. Si el nombre incluye "mail", se valida como email. Los campos cambian según la ocasión sin tocar la base.
- Los pasos se presentan en el orden del archivo: si querés el registro al principio, ponelo antes de las preguntas.

No renombres una pregunta que ya se votó: los votos quedan atados a su título.
Para validar el archivo antes de subirlo: `node test.js`.

## Dos modos

**Guiado** (`Modo: guiado`): el presentador va pregunta por pregunta y todos los celulares lo siguen.

**Libre** (`Modo: libre`): todas las preguntas forman un solo paso, *Consulta abierta*. En el celular se ve la lista; cada persona entra a la que quiera, vota y vuelve a la lista, donde las que ya respondió quedan en verde ("3 de 14 respondidas"). La pantalla muestra un resumen en vivo de todas; tocando una se ve el detalle con sus comentarios. Los pasos quedan: Bienvenida → Consulta abierta → Registro → Cierre.

## Cómo se presenta

1. Proyectá la pantalla en **Bienvenida**: muestra un QR grande y cuántas personas hay conectadas. Los celulares quedan esperando.
2. Avanzá con **Siguiente**, con las flechas, AvPág/RePág o con un control remoto de presentaciones. Los celulares pasan a la misma pregunta al instante, sin recargar.
3. Los votos aparecen en la pantalla apenas se envían.
4. El orden es: Bienvenida → una pregunta a la vez → Registro → Cierre (con todos los resultados).

Sin la clave (`#pantalla` a secas), la pantalla es de solo lectura. Podés proyectar esa versión y manejar el paso desde otro dispositivo, por ejemplo tu celular, con `#pantalla/TU-CLAVE`.
Proyectá en pantalla completa (F11) para que no se vea la clave en la barra de direcciones.

## Puesta en marcha (una sola vez)

1. **Supabase**: creá un proyecto en supabase.com. En *SQL Editor*, pegá el contenido de `schema.sql` y ejecutalo.
2. En *Project Settings → API* copiá la **Project URL** y la **anon / publishable key**. Pegalas en `CONFIG`, en `index.html`. La key es pública por diseño: lo que protege los datos son las reglas de `schema.sql`.
3. Cambiá la clave del presentador. En el *SQL Editor* ejecutá `update clave_presentador set clave = 'tu-clave-larga';`.
4. **GitHub Pages**: en *Settings → Pages* elegí *Deploy from a branch → main / root*.

## Antes de cada evento

En el *SQL Editor* de Supabase, borrá las pruebas y volvé a la bienvenida:

```sql
truncate votos, registros;
update estado set paso = 'inicio';
```

Supabase pausa los proyectos gratuitos después de una semana sin actividad. Entrá al proyecto el día anterior.

## Después del evento

- Votos: en Supabase, *Table Editor → votos → Export to CSV*.
- Registros: los datos de cada persona quedan en la columna `datos`. Para tener una columna por campo, ejecutá algo así en el *SQL Editor* (con los nombres de tus campos) y exportá el resultado a CSV:

```sql
select creado, array_to_string(necesidades, ', ') as opciones,
       datos->>'Nombre' as nombre, datos->>'Apellido' as apellido,
       datos->>'Email' as email, datos->>'Organismo' as organismo
from registros order by creado;
```

Los registros incluyen emails, así que no se pueden leer desde la web: solo se ven desde el panel de Supabase.

## Cómo funciona

- Todo es una página estática (`index.html` + `consulta.js` + `consulta.md`). No hay servidor propio.
- Si ya tenías la base de una versión anterior, ejecutá los archivos de `migraciones/` que falten.
- Los cambios de paso y los votos llegan al instante por Supabase Realtime. Si se corta la conexión, la página vuelve a consultar sola: los celulares cada 10 segundos y la pantalla cada 15. En los pasos de registro y cierre, la pantalla consulta cada 3 segundos, porque los registros no tienen aviso en vivo: son datos privados.

## Límites conocidos

- Hay un voto por pregunta por navegador. Alguien que use otro navegador, o que llame a la API directamente, puede votar de nuevo. Para una consulta no vinculante en una sala alcanza; si fuera vinculante, haría falta login.
- "Omitir" (modo guiado) no se guarda: solo cierra la pregunta en ese celular. En modo libre no hay Omitir: se vuelve a la lista.
- Lo que cada persona ya respondió se recuerda en su navegador: si cambia de celular o borra los datos del navegador, ve todo sin marcar (igual no puede votar dos veces la misma pregunta desde el mismo navegador).
- Los comentarios se proyectan sin moderación.
