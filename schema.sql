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
  participante uuid unique, -- el mismo de sus votos: une a cada persona con sus respuestas
  necesidades text[] not null default '{}' check (cardinality(necesidades) <= 30),
  datos jsonb not null default '{}' check (jsonb_typeof(datos) = 'object' and pg_column_size(datos) < 8000), -- campos de consulta.md
  creado timestamptz not null default now()
);

alter table votos enable row level security;
alter table registros enable row level security;

grant select, insert on votos to anon;
grant insert on registros to anon;

create policy "cualquiera vota" on votos for insert to anon with check (true);
create policy "cualquiera ve resultados" on votos for select to anon using (true);
create policy "cualquiera se registra" on registros for insert to anon with check (true);
-- registros NO es legible desde la web (tiene datos personales): se ve y exporta desde el panel de Supabase.

-- La pantalla del presentador solo necesita totales, no los datos personales.
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

-- ===== Modo presentador =====
-- El celular de cada participante muestra el paso que eligió el presentador.
-- Si ya ejecutaste lo de arriba, ejecutá solo este bloque.

create table estado (
  id int primary key default 1 check (id = 1), -- una sola fila
  paso text not null default 'inicio' check (length(paso) <= 50),
  actualizado timestamptz not null default now()
);
insert into estado default values;
alter table estado enable row level security;
grant select on estado to anon;
create policy "cualquiera ve el paso" on estado for select to anon using (true);

-- Sin políticas: nadie la lee desde la web. Cambiá la clave por una larga y difícil de adivinar.
create table clave_presentador (clave text primary key);
alter table clave_presentador enable row level security;
revoke all on clave_presentador from anon, authenticated;
insert into clave_presentador values ('CAMBIAR-ESTA-CLAVE');

create function cambiar_paso(p_clave text, p_paso text)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not exists (select 1 from clave_presentador where clave = p_clave) then
    raise exception 'clave incorrecta';
  end if;
  update estado set paso = p_paso, actualizado = now() where id = 1;
end
$$;

revoke execute on function cambiar_paso(text, text) from public;
grant execute on function cambiar_paso(text, text) to anon;

-- ===== Tiempo real =====
-- Avisa al instante a la pantalla cuando llega un voto y a los celulares cuando cambia el paso.
-- Si ya ejecutaste lo de arriba, ejecutá solo esta línea.
alter publication supabase_realtime add table votos, estado;
