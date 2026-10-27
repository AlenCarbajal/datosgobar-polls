# Estética

La estética se arma en tres niveles. Cada nivel pisa al anterior:

1. **Valores por defecto** del código (`ESTETICA_DEFECTO` en `js/tema.js`).
2. **Preset**: un estilo guardado en el repositorio (`temas/<nombre>.css` y su entrada en `PRESETS`, en `js/tema.js`).
3. **Campos de la sesión**: lo que fijás a mano en la sección **Estética** del editor.

Un campo vacío en el editor usa el valor del preset. Un color inválido también.

## Desde el editor de la sesión

En `admin.html`, abrí la sesión y bajá a **Estética**. La **Vista previa** de al lado muestra cada cambio al instante. Tocá **Guardar** para aplicarlo.

| Campo | Efecto |
|---|---|
| **Estilo** | El preset. Trae sus colores, tipografía y logo. |
| **Nombre de la organización** | Se muestra en el encabezado si no hay logo. También es el texto alternativo del logo. |
| **Logo (dirección de la imagen)** | Una dirección `https://…` o un archivo del repositorio, como `img/logo.png`. Va sobre el color principal: usá una versión clara. |
| **Texto del encabezado** | Se muestra en la Bienvenida del celular y de la pantalla, y en el encabezado de la pantalla. |
| **Color principal (encabezado)** | Fondo del encabezado. |
| **Color de acento (botones y barras)** | Botones, barras de resultados, opción elegida y anillo de foco. **Volver al color del estilo** quita el color fijado. |
| **Tipografía** | La del sistema, o una de Google Fonts: Montserrat, Roboto, Open Sans, Lato, Source Sans 3, Merriweather. |
| **Esquinas** | Rectas (0 px), suaves (8 px) o redondeadas (16 px). |

El preset por defecto de las sesiones nuevas es el de `preset` en `config.js`. También es la estética de `admin.html` y de las páginas sin sesión.

## Contraste automático

El color del texto sobre el color principal y sobre el de acento se elige solo: blanco o casi negro (`#1A1A1A`), el que tenga más contraste según WCAG 2.1.

Si ninguno de los dos llega a 4,5:1, el editor muestra un aviso debajo de los colores: "El color principal no deja leer bien el texto encima…". Elegí un color más oscuro o más claro hasta que el aviso desaparezca.

El acento usado como texto o como anillo de foco sobre fondo claro se oscurece solo (`--acento-texto`). Así un acento claro, como un amarillo, sigue legible.

## Tokens

Todos los colores del CSS salen de estas variables. Los valores por defecto están en `css/base.css`.

`js/tema.js` escribe estos según la sesión. Un preset no los puede pisar desde su CSS:

| Token | Efecto |
|---|---|
| `--color-principal` | Fondo del encabezado. |
| `--color-acento` | Botones, barras y opción elegida. |
| `--texto-sobre-principal` | Texto del encabezado. Se calcula del color principal. |
| `--texto-sobre-acento` | Texto de los botones. Se calcula del color de acento. |
| `--fuente` | Tipografía de toda la página. |
| `--radio` | Radio de las esquinas de botones, tarjetas y campos. |

Un preset define estos en `temas/<nombre>.css`:

| Token | Efecto |
|---|---|
| `--fondo` | Fondo de la página. |
| `--superficie` | Fondo de tarjetas, campos y formularios. |
| `--borde` | Bordes de tarjetas y separadores. |
| `--borde-campo` | Bordes de campos y opciones. Necesita 3:1 sobre `--superficie` y `--fondo`. |
| `--texto` | Texto principal. También el color oscuro del QR: tiene que ser oscuro. |
| `--texto-suave` | Textos secundarios y ayudas. |
| `--exito` | Respuestas enviadas y preguntas respondidas. |
| `--error` | Mensajes de error, borde de campos inválidos y botones de borrar. |
| `--aviso` | Avisos. |

Estos se derivan solos de los anteriores con `color-mix()`. Un preset puede pisarlos:

| Token | Efecto |
|---|---|
| `--principal-suave` | Fondo de etiquetas, de la barra de progreso y de la pista de las barras de resultados. |
| `--acento-suave` | Fondo de la opción elegida. |
| `--exito-suave` | Fondo de lo ya respondido. |
| `--error-suave` | Disponible para fondos de error. Hoy ningún componente lo usa. |
| `--aviso-suave` | Fondo de los avisos. |
| `--acento-texto` | Acento usado como texto o borde sobre fondo claro: código de la sesión, enlaces, borde de la opción elegida. |
| `--barra-secundaria` | Relleno de las barras con la clase `barra--secundaria` (se ve en `demo/tema.html`). |
| `--foco` | Anillo de foco del teclado. Necesita 3:1 sobre `--superficie` y `--fondo`. |

## Crear un preset

1. Copiá `temas/neutro.css` como `temas/<nombre>.css`. El nombre va en minúsculas, sin espacios.
2. Cambiá los valores de los tokens.
3. En `js/tema.js`, sumá el nombre a `PRESETS` con sus valores propios:

   ```js
   export const PRESETS = {
     neutro: {},
     'datos-gob-ar': { /* … */ },
     'mi-preset': {
       colorPrincipal: '#123456', colorAcento: '#0A7A5A', tipografia: 'Lato',
       logo: 'img/mi-logo.png', esquinas: 'redondeadas',
     },
   };
   ```

   Los colores principal y de acento, la tipografía, el logo y las esquinas del preset van acá, no en el CSS. Los colores van como `#RRGGBB`. La tipografía tiene que ser una de la lista del editor.

4. Si usás un logo propio, subilo a `img/`.
5. Hacé commit y esperá a que GitHub Pages publique.
6. En el editor de una sesión, abrí **Estilo**.

Deberías ver `mi-preset` en la lista y la **Vista previa** con sus colores.

Para que sea el preset de las sesiones nuevas, poné su nombre en `preset` de `config.js`.
