-- Agrega la pregunta de necesidades al final de la sesión "temas" SIN borrar registros ni respuestas.
-- Correr en Supabase → SQL Editor. Si ya está agregada, no hace nada.
update sesiones
set config = jsonb_set(config, '{pasos}', (config->'pasos') || $paso$
{
  "id": "necesidades",
  "tipo": "pregunta",
  "pregunta": {
    "id": "necesidades-1",
    "texto": "¿Qué necesitás de nuestra parte?"
  },
  "opciones": [
    {
      "id": "asistencia",
      "texto": "Asistencia técnica"
    },
    {
      "id": "instalacion",
      "texto": "Instalación Portal Andino propio"
    },
    {
      "id": "migracion",
      "texto": "Actualización/Migración Portal Andino"
    },
    {
      "id": "apis",
      "texto": "Consulta por APIs/otro servicio"
    },
    {
      "id": "capacitacion",
      "texto": "Capacitación"
    },
    {
      "id": "otros",
      "texto": "Otros",
      "pideTexto": "obligatorio"
    }
  ]
}
$paso$::jsonb)
where codigo = 'temas' and not (config->'pasos') @> '[{"id": "necesidades"}]';
select codigo, paso, jsonb_path_query_array(config, '$.pasos[*].id') as pasos from sesiones where codigo = 'temas';
