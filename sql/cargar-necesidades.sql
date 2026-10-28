-- Carga (o recarga) la consulta de necesidades en la sesión "necesidades" y borra sus registros y respuestas.
-- Correr en Supabase → SQL Editor. Se puede repetir: cada vez deja la sesión limpia en la Bienvenida.
begin;
insert into sesiones (codigo, config) values ('necesidades', $cfg$
{
  "titulo": "¿Qué necesitás de nuestra parte?",
  "instrucciones": "Registrate y elegí la opción que mejor describa lo que necesitás.",
  "estetica": {
    "preset": "datos-gob-ar",
    "organismo": "datos.gob.ar",
    "logo": "img/logo-datos-gob-ar-blanco.png"
  },
  "pasos": [
    {
      "id": "rbioz2m",
      "tipo": "registro",
      "titulo": "Registrate para participar",
      "descripcion": "Completá tus datos para que podamos contactarte.",
      "obligatorio": true,
      "campos": [
        {
          "id": "cegqx00",
          "etiqueta": "Nombre",
          "tipo": "texto",
          "obligatorio": true
        },
        {
          "id": "ccrnx7t",
          "etiqueta": "Apellido",
          "tipo": "texto",
          "obligatorio": true
        },
        {
          "id": "ci8iiu8",
          "etiqueta": "Email",
          "tipo": "email",
          "obligatorio": true
        },
        {
          "id": "cpk9383",
          "etiqueta": "Organismo",
          "tipo": "texto",
          "obligatorio": true
        }
      ]
    },
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
  ],
  "final": {
    "titulo": "¡Gracias!",
    "texto": "Vamos a ponernos en contacto."
  }
}
$cfg$::jsonb)
on conflict (codigo) do update
  set config = excluded.config, paso = 'inicio', ronda = sesiones.ronda + 1, archivada = false;
delete from respuestas where sesion_id = (select id from sesiones where codigo = 'necesidades');
delete from inscripciones where sesion_id = (select id from sesiones where codigo = 'necesidades');
commit;
select codigo, paso, ronda, config->>'titulo' as titulo,
  (select count(*) from inscripciones i where i.sesion_id = s.id) as registros,
  (select count(*) from respuestas r where r.sesion_id = s.id) as respuestas
from sesiones s where codigo = 'necesidades';
