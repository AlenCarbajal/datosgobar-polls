# Problemas conocidos

## Síntoma, causa y solución

| Síntoma | Causa | Solución |
|---|---|---|
| Un celular muestra una versión vieja de la página después de publicar un cambio en GitHub. | GitHub Pages deja que el navegador guarde los archivos hasta 10 minutos. | Publicá los cambios de código al menos 10 minutos antes de usarlos. Si no llegás, recargá la página en ese celular. Los cambios hechos en `admin.html` no tienen esta demora: van por Supabase. |
| Con mucha gente conectada, algunos celulares tardan unos segundos en pasar al paso nuevo, o el contador de "personas conectadas" se queda corto. | El plan gratuito de Supabase admite unas 200 conexiones simultáneas de Realtime. Quien no consigue conexión no recibe los avisos al instante. | Nada que hacer en el momento: cada celular vuelve a consultar el paso cada 10 segundos y al desbloquear la pantalla. La pantalla consulta las respuestas cada 15 segundos (cada 3 en un paso de registro). Para más conexiones, pasá a un plan pago de Supabase. |
| Ninguna página carga la sesión. En el panel de Supabase el proyecto aparece pausado. | Supabase pausa los proyectos gratuitos después de 7 días sin uso. | En el panel del proyecto, tocá **Restore project** y esperá a que vuelva. Entrá al proyecto unos días antes de usarlo. |
| `admin.html` dice "Tu cuenta no está autorizada. Pedile a quien administra que agregue tu email." | El email de la cuenta no está en la tabla `admins`. | Pedile a alguien que ya administra que lo agregue en **Personas que pueden administrar**. Si no hay nadie, ejecutá en **SQL Editor**: `insert into admins values ('tu@email');` |
| `admin.html` dice "No pudimos entrar. Revisá el email y la contraseña." | El usuario no existe en Supabase, la contraseña es otra o el usuario no está confirmado. | Revisá **Authentication** → **Users**. Si falta, crealo con **Add user** → **Create new user** y **Auto Confirm User**. |
| La pantalla no muestra **← Anterior** / **Siguiente →**. | En ese navegador no hay una cuenta de administración iniciada. | Abrí `admin.html` en el mismo navegador, entrá y recargá la pantalla. |
| La pantalla dice "No se pudo cambiar el paso. Revisá la conexión y que sigas con la sesión iniciada en el formulario." | Se perdió la conexión o la cuenta de administración se cerró. | Revisá la conexión. Entrá de nuevo en `admin.html` y recargá la pantalla. |
| El celular dice "No encontramos una sesión activa con ese código." | El código está mal escrito, o la sesión está archivada. | Revisá el código en `admin.html`. Si la sesión está archivada, tocá **Desarchivar**. |
| El celular dice "No pudimos abrir la sesión". | La página no está en HTTPS ni en `localhost`, el navegador no permite guardar datos del sitio, o `config.js` tiene una URL o key equivocadas. | Abrí la página por `https://` o por `http://localhost`. Desactivá el modo que bloquea datos del sitio. Revisá `config.js` (ver [Instalación](instalacion.md), paso 7). |
| Una página abierta con doble clic (`file://…`) queda en blanco. | Las páginas son módulos de JavaScript y el navegador no los carga desde archivos locales. | Servilas con `python3 -m http.server 8000` y abrí `http://localhost:8000/…`. |
| No hay contador de "personas conectadas" en `?demo`. | El modo demo no usa Realtime. | Es lo esperado. El contador funciona con Supabase. |

## Límites del funcionamiento

**Una respuesta por pregunta y por navegador.** Cada navegador genera un id anónimo de participante y lo guarda. La base acepta una sola respuesta por pregunta para cada id. Otro navegador, una ventana privada o borrar los datos del sitio generan un id nuevo, que puede responder otra vez.

**El id anónimo de participante es público.** Cualquiera con la publishable key puede leer las respuestas, incluido el id de cada participante. Con ese id, alguien podría guardar a propósito una respuesta a una pregunta que esa persona todavía no contestó. Cuando la persona responda, su celular la muestra como ya respondida y su respuesta no se guarda. Los datos de registro no son públicos: solo los leen las cuentas de administración.

**No responder no deja rastro.** No hay botón para omitir una pregunta. Una pregunta sin responder no se guarda: no cuenta en los totales ni aparece en el CSV.

**Los comentarios se proyectan sin moderación.** Los textos de las opciones que piden texto y de las preguntas de texto libre aparecen en la pantalla apenas se envían. No hay forma de ocultarlos antes.

**`participar.html` y `pantalla.html` necesitan un contexto seguro.** El navegador solo genera el id de participante en HTTPS o en `localhost`. GitHub Pages ya publica en HTTPS. Para probar desde otro dispositivo de tu red, no uses `http://192.168.…`: publicá en GitHub Pages o usá un túnel con HTTPS.

**`admin.html` no funciona en `?demo`.** Crear y editar sesiones necesita Supabase.
