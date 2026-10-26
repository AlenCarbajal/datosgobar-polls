-- Para una base creada con una versión anterior de schema.sql. Ejecutar una vez en Supabase > SQL Editor.
-- Borra los registros existentes: la tabla cambia de forma (campos fijos → campos de consulta.md).

drop function if exists conteo_necesidades();
drop table registros;

create table registros (
  id bigint generated always as identity primary key,
  necesidades text[] not null default '{}' check (cardinality(necesidades) <= 30),
  datos jsonb not null default '{}' check (jsonb_typeof(datos) = 'object' and pg_column_size(datos) < 8000), -- campos de consulta.md
  creado timestamptz not null default now()
);
alter table registros enable row level security;
grant insert on registros to anon;
create policy "cualquiera se registra" on registros for insert to anon with check (true);

create function resumen_registros()
returns json
language sql stable security definer set search_path = public
as $$
  select json_build_object(
    'total', (select count(*) from registros),
    'necesidades', coalesce((
      select json_agg(x order by x.total desc)
      from (select n as necesidad, count(*) as total from registros, unnest(necesidades) as n group by n) x
    ), '[]'::json)
  )
$$;
revoke execute on function resumen_registros() from public;
grant execute on function resumen_registros() to anon;
