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

## Primera pregunta o supertema
- Tema asociado (opcional)
- Otro tema

## Segunda pregunta, sin temas

## Registro: ¿Qué necesita tu organismo de nosotros?
- Asistencia técnica
- Capacitación
```

- `#` es el título; las líneas sueltas debajo, las instrucciones.
- Cada `##` es un paso de la presentación. Se vota con **Ok / No / Comentar / Omitir**.
- Los `-` debajo de una pregunta son sus temas, que se muestran como etiquetas.
- `## Registro: ...` es el formulario de necesidades: el texto después de `Registro:` es la pregunta y los `-` son las opciones. Si no ponés esta sección, no hay registro.

No renombres una pregunta que ya se votó: los votos quedan atados a su título.
Para validar el archivo antes de subirlo: `node test.js`.

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

En Supabase, *Table Editor → votos / registros → Export to CSV*.
Los registros incluyen emails, así que no se pueden leer desde la web: solo se ven desde el panel de Supabase.

## Cómo funciona

- Todo es una página estática (`index.html` + `consulta.js` + `consulta.md`). No hay servidor propio.
- Los cambios de paso y los votos llegan al instante por Supabase Realtime. Si se corta la conexión, la página vuelve a consultar sola: los celulares cada 10 segundos y la pantalla cada 15. En los pasos de registro y cierre, la pantalla consulta cada 3 segundos, porque los registros no tienen aviso en vivo: son datos privados.

## Límites conocidos

- Hay un voto por pregunta por navegador. Alguien que use otro navegador, o que llame a la API directamente, puede votar de nuevo. Para una consulta no vinculante en una sala alcanza; si fuera vinculante, haría falta login.
- "Omitir" no se guarda: solo cierra la pregunta en ese celular.
- Los comentarios se proyectan sin moderación.
