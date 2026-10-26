-- Sesiones configurables. Pegar en Supabase > SQL Editor y ejecutar.
-- Se puede ejecutar más de una vez. Convive con las tablas de la versión anterior
-- (votos, registros, estado, clave_presentador): no las toca.

-- ===== Administradores =====
-- Quien entra al admin con un email de esta tabla puede crear y cambiar sesiones.
create table if not exists admins (email text primary key);
alter table admins enable row level security;

create or replace function es_admin()
returns boolean
language sql stable security definer set search_path = public, pg_temp
as $$
  -- Los usuarios anónimos de Supabase Auth nunca son admins.
  select coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false
     and exists (select 1 from admins where lower(email) = lower(auth.jwt() ->> 'email'))
$$;
revoke execute on function es_admin() from public;
grant execute on function es_admin() to anon, authenticated;

revoke all on admins from anon, authenticated;
grant select, insert, delete on admins to authenticated;
drop policy if exists "admins ven admins" on admins;
create policy "admins ven admins" on admins for select to authenticated using (es_admin());
drop policy if exists "admins agregan admins" on admins;
create policy "admins agregan admins" on admins for insert to authenticated with check (es_admin());
drop policy if exists "admins quitan admins" on admins;
create policy "admins quitan admins" on admins for delete to authenticated using (es_admin());

-- ===== Sesiones =====
create table if not exists sesiones (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique check (codigo ~ '^[a-z0-9-]{3,30}$'),
  config jsonb not null,
  paso text not null default 'inicio',
  ronda int not null default 0,
  archivada boolean not null default false,
  creado timestamptz not null default now(),
  actualizado timestamptz not null default now()
);
alter table sesiones enable row level security;

create or replace function tocar_actualizado()
returns trigger
language plpgsql
as $$
begin
  new.actualizado := now();
  return new;
end
$$;
drop trigger if exists sesiones_actualizado on sesiones;
create trigger sesiones_actualizado before update on sesiones
  for each row execute function tocar_actualizado();

revoke all on sesiones from anon, authenticated;
grant select on sesiones to anon, authenticated;
grant insert, update, delete on sesiones to authenticated;
drop policy if exists "cualquiera ve sesiones activas" on sesiones;
create policy "cualquiera ve sesiones activas" on sesiones for select to anon, authenticated
  using (not archivada or es_admin());
drop policy if exists "admins crean sesiones" on sesiones;
create policy "admins crean sesiones" on sesiones for insert to authenticated with check (es_admin());
drop policy if exists "admins cambian sesiones" on sesiones;
create policy "admins cambian sesiones" on sesiones for update to authenticated
  using (es_admin()) with check (es_admin());
drop policy if exists "admins borran sesiones" on sesiones;
create policy "admins borran sesiones" on sesiones for delete to authenticated using (es_admin());

-- ===== Respuestas =====
-- participante es un UUID anónimo; queda legible para que Realtime envíe la fila completa.
create table if not exists respuestas (
  id bigint generated always as identity primary key,
  sesion_id uuid not null references sesiones on delete cascade,
  pregunta_id text not null,
  participante uuid not null,
  opcion_id text,
  texto text check (length(texto) <= 1000),
  creado timestamptz not null default now(),
  unique (sesion_id, pregunta_id, participante) -- una respuesta por persona por pregunta
);
alter table respuestas enable row level security;

-- Rechaza respuestas que no corresponden a la config de la sesión.
create or replace function validar_respuesta()
returns trigger
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  s sesiones%rowtype;
  opciones jsonb;
  op jsonb;
begin
  select * into s from sesiones where id = new.sesion_id;
  if not found or s.archivada then
    raise exception 'la sesión no existe o está archivada';
  end if;

  select coalesce(p -> 'opciones', '[]'::jsonb) into opciones
  from jsonb_array_elements(s.config -> 'pasos') p
  where (p ->> 'tipo' = 'lista'
         and exists (select 1 from jsonb_array_elements(p -> 'preguntas') q where q ->> 'id' = new.pregunta_id))
     or (p ->> 'tipo' = 'pregunta' and p -> 'pregunta' ->> 'id' = new.pregunta_id)
  limit 1;
  if not found then
    raise exception 'pregunta inexistente';
  end if;

  if jsonb_array_length(opciones) = 0 then -- texto libre
    if new.opcion_id is not null or coalesce(btrim(new.texto), '') = '' then
      raise exception 'esta pregunta pide texto y ninguna opción';
    end if;
    return new;
  end if;

  select o into op from jsonb_array_elements(opciones) o where o ->> 'id' = new.opcion_id;
  if not found then
    raise exception 'opción inexistente';
  end if;
  if op ->> 'pideTexto' = 'obligatorio' and coalesce(btrim(new.texto), '') = '' then
    raise exception 'esta opción pide texto';
  end if;
  return new;
end
$$;
revoke execute on function validar_respuesta() from public, anon, authenticated;
drop trigger if exists respuestas_validar on respuestas;
create trigger respuestas_validar before insert on respuestas
  for each row execute function validar_respuesta();

revoke all on respuestas from anon, authenticated;
grant select on respuestas to anon, authenticated;
grant insert (sesion_id, pregunta_id, participante, opcion_id, texto) on respuestas to anon, authenticated; -- creado no se elige
drop policy if exists "cualquiera responde" on respuestas;
create policy "cualquiera responde" on respuestas for insert to anon, authenticated with check (true);
drop policy if exists "cualquiera ve respuestas" on respuestas;
create policy "cualquiera ve respuestas" on respuestas for select to anon, authenticated using (true);

-- ===== Inscripciones =====
-- Datos personales: solo los admins las leen.
create table if not exists inscripciones (
  id bigint generated always as identity primary key,
  sesion_id uuid not null references sesiones on delete cascade,
  participante uuid not null,
  datos jsonb not null check (jsonb_typeof(datos) = 'object' and pg_column_size(datos) < 8000),
  creado timestamptz not null default now(),
  unique (sesion_id, participante)
);
alter table inscripciones enable row level security;

revoke all on inscripciones from anon, authenticated;
grant insert (sesion_id, participante, datos) on inscripciones to anon, authenticated; -- creado no se elige
grant select on inscripciones to authenticated;
drop policy if exists "cualquiera se inscribe en sesiones activas" on inscripciones;
create policy "cualquiera se inscribe en sesiones activas" on inscripciones for insert to anon, authenticated
  with check (exists (select 1 from sesiones s where s.id = sesion_id and not s.archivada));
drop policy if exists "admins ven inscripciones" on inscripciones;
create policy "admins ven inscripciones" on inscripciones for select to authenticated using (es_admin());

-- La pantalla solo necesita el total, no los datos personales.
create or replace function resumen_inscripciones(p_sesion uuid)
returns json
language sql stable security definer set search_path = public, pg_temp
as $$
  select json_build_object('total', (select count(*) from inscripciones where sesion_id = p_sesion))
$$;
revoke execute on function resumen_inscripciones(uuid) from public;
grant execute on function resumen_inscripciones(uuid) to anon, authenticated;

-- ===== Reiniciar =====
-- Borra respuestas e inscripciones y vuelve al inicio. ronda + 1 hace que los celulares olviden lo anterior.
create or replace function reiniciar_sesion(p_sesion uuid)
returns void
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  if not es_admin() then
    raise exception 'solo un admin puede reiniciar la sesión';
  end if;
  delete from respuestas where sesion_id = p_sesion;
  delete from inscripciones where sesion_id = p_sesion;
  update sesiones set paso = 'inicio', ronda = ronda + 1 where id = p_sesion;
end
$$;
revoke execute on function reiniciar_sesion(uuid) from public, anon;
grant execute on function reiniciar_sesion(uuid) to authenticated;

-- ===== Tiempo real =====
-- Avisa a pantalla y celulares cuando cambia una sesión o llega una respuesta.
do $$ begin
  alter publication supabase_realtime add table sesiones;
exception when duplicate_object then null;
end $$;
do $$ begin
  alter publication supabase_realtime add table respuestas;
exception when duplicate_object then null;
end $$;

-- ===== Primer admin =====
-- ¡Antes! Quien se registre con un email de esta tabla sería admin. Por eso:
--   1. Authentication > Sign In / Providers: desactivar "Allow new users to sign up".
--   2. Authentication > Users > Add user, con "Auto Confirm User", para crear tu usuario.
--   3. Recién entonces, con ese mismo email, ejecutar:
-- insert into admins values ('tu@email');
