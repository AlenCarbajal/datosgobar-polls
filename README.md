# Sesiones de preguntas en vivo

Página web estática para hacer preguntas a un público desde el celular y proyectar los resultados en vivo.
Los archivos se publican con GitHub Pages y los datos se guardan en un proyecto de Supabase.

## Guías

1. [Instalación](docs/guia/instalacion.md): dar de alta tu propia instancia.
2. [Sesiones](docs/guia/sesiones.md): crear, presentar, exportar y reiniciar.
3. [Estética](docs/guia/estetica.md): colores, logo, tipografía y presets.
4. [Problemas conocidos](docs/guia/problemas.md): síntomas, causas y soluciones.

## Páginas

| Página | Para qué |
|---|---|
| `participar.html?s=CODIGO` | Lo que abre cada participante en su celular. |
| `pantalla.html?s=CODIGO` | Lo que se proyecta. La maneja una cuenta de administración. |
| `admin.html` | Formulario para crear y editar sesiones. |

Agregá `?demo` a `participar.html` o `pantalla.html` para probar sin Supabase.

## Requisitos

- Una cuenta de GitHub.
- Una cuenta de Supabase.

## Licencia

Licencia: a definir.
