# Consulta y registro

Página para que los participantes voten o comenten, y registren qué necesitan. Incluye una pantalla para proyectar los resultados en vivo.
La página se publica con GitHub Pages y los datos se guardan en Supabase. Las dos cosas son gratis para un evento de este tamaño.

- Participantes: `https://<usuario>.github.io/<repo>/`
- Pantalla para proyectar: `https://<usuario>.github.io/<repo>/#pantalla` (muestra el QR para entrar)

## Puesta en marcha (unos 15 minutos)

1. **Supabase**: creá un proyecto en supabase.com. Andá a *SQL Editor*, pegá el contenido de `schema.sql` y ejecutalo.
2. En *Project Settings → API* copiá la **Project URL** y la **anon / publishable key**.
   Pegalas en `CONFIG` al principio del `<script>` de `index.html`. La anon key es pública por diseño: lo que protege los datos son las reglas de `schema.sql`.
3. En el mismo `CONFIG`, editá el organismo, el evento, las `preguntas` y las `necesidades`.
4. **GitHub**: creá un repo y subí `index.html`. Después andá a *Settings → Pages → Deploy from a branch → main / root*.
5. Probalo desde el celular antes del evento. Votá una vez y fijate que aparezca en `#pantalla`.

Si `supabaseUrl` está vacío, la página funciona en **modo demo**: guarda todo en el navegador y sirve para revisar cómo se ve.

## Después del evento

En Supabase, *Table Editor → votos / registros → Export to CSV*.
Los registros incluyen emails, así que no se pueden leer desde la web: solo se ven desde el panel de Supabase.

## Límites conocidos

- Hay un voto por pregunta por navegador. Alguien que use otro navegador, o que llame a la API directamente, puede votar de nuevo. Para una sala de 60 personas alcanza; si la votación fuera vinculante, haría falta login.
- La pantalla consulta los resultados cada 4 segundos.
- Supabase pausa los proyectos gratuitos después de una semana sin actividad. Entrá al proyecto el día anterior al evento.
