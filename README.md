# Consulta y registro

Página para que los participantes voten o comenten, y registren qué necesitan. Incluye una pantalla para proyectar los resultados en vivo.
La página se publica con GitHub Pages y los datos se guardan en Supabase. Las dos cosas son gratis para un evento de este tamaño.

- Participantes: `https://alencarbajal.github.io/datosgobar-polls/`
- Pantalla para proyectar y manejar: `https://alencarbajal.github.io/datosgobar-polls/#pantalla/TU-CLAVE`

## Cómo se presenta

1. Proyectá la pantalla en **Bienvenida**: muestra un QR grande para que la gente se sume. Los celulares quedan esperando.
2. Avanzá con **Siguiente** o con las flechas, AvPág/RePág o un control remoto de presentaciones. Cada celular pasa solo a la misma pregunta en unos 3 segundos, sin recargar.
3. El orden es: Bienvenida → una pregunta a la vez → Registro de necesidades → Cierre (con todos los resultados).

Sin la clave (`#pantalla` a secas), la pantalla es de solo lectura. Podés proyectar esa versión y manejar el paso desde otro dispositivo, por ejemplo tu celular, con `#pantalla/TU-CLAVE`.
Proyectá en pantalla completa (F11) para que no se vea la clave en la barra de direcciones.

## Puesta en marcha (unos 15 minutos)

1. **Supabase**: creá un proyecto en supabase.com. Andá a *SQL Editor*, pegá el contenido de `schema.sql` y ejecutalo.
2. En *Project Settings → API* copiá la **Project URL** y la **anon / publishable key**.
   Pegalas en `CONFIG` al principio del `<script>` de `index.html`. La anon key es pública por diseño: lo que protege los datos son las reglas de `schema.sql`.
3. Cambiá la clave del presentador. En el *SQL Editor* ejecutá `update clave_presentador set clave = 'tu-clave-larga';`.
4. En el mismo `CONFIG`, editá el organismo, el evento, las `preguntas` y las `necesidades`.
5. **GitHub**: creá un repo y subí `index.html`. Después andá a *Settings → Pages → Deploy from a branch → main / root*.
6. Probalo desde el celular antes del evento. Votá una vez y fijate que aparezca en la pantalla del presentador.

Si `supabaseUrl` está vacío, la página funciona en **modo demo**: guarda todo en el navegador y sirve para revisar cómo se ve.

## Después del evento

En Supabase, *Table Editor → votos / registros → Export to CSV*.
Los registros incluyen emails, así que no se pueden leer desde la web: solo se ven desde el panel de Supabase.

## Límites conocidos

- Hay un voto por pregunta por navegador. Alguien que use otro navegador, o que llame a la API directamente, puede votar de nuevo. Para una sala de 60 personas alcanza; si la votación fuera vinculante, haría falta login.
- La pantalla y los celulares consultan la base cada 3 segundos.
- Supabase pausa los proyectos gratuitos después de una semana sin actividad. Entrá al proyecto el día anterior al evento.
