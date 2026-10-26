-- Une cada registro con los votos de esa persona (votos.participante = registros.participante).
-- Ejecutar una vez en Supabase > SQL Editor. Borra los registros de prueba existentes.
truncate registros;
alter table registros add column participante uuid unique;
