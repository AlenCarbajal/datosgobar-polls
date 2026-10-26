-- Pegar en Supabase > SQL Editor y ejecutar una vez.

create table votos (
  id bigint generated always as identity primary key,
  pregunta text not null check (length(pregunta) <= 50),
  participante uuid not null,
  opcion text not null check (opcion in ('favor', 'contra', 'comentario')),
  comentario text check (length(comentario) <= 1000),
  creado timestamptz not null default now(),
  unique (pregunta, participante) -- un voto por persona por pregunta
);

create table registros (
  id bigint generated always as identity primary key,
  necesidades text[] not null check (cardinality(necesidades) between 1 and 20),
  organismo text not null check (length(organismo) between 1 and 200),
  nombre text check (length(nombre) <= 200),
  email text check (length(email) <= 200),
  detalle text check (length(detalle) <= 2000),
  creado timestamptz not null default now()
);

alter table votos enable row level security;
alter table registros enable row level security;

grant select, insert on votos to anon;
grant insert on registros to anon;

create policy "cualquiera vota" on votos for insert to anon with check (true);
create policy "cualquiera ve resultados" on votos for select to anon using (true);
create policy "cualquiera se registra" on registros for insert to anon with check (true);
-- registros NO es legible desde la web (tiene emails): se ve y exporta desde el panel de Supabase.

-- La pantalla del presentador solo necesita los totales por necesidad, no los datos personales.
create function conteo_necesidades()
returns table (necesidad text, total bigint)
language sql stable security definer set search_path = public
as $$
  select n, count(*) from registros, unnest(necesidades) as n group by n order by 2 desc
$$;

revoke execute on function conteo_necesidades() from public;
grant execute on function conteo_necesidades() to anon;
