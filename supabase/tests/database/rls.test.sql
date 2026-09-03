-- pgTAP: RLS habilitado en toda tabla de public (salvaguarda del plan, §3 — no es
-- opcional, es la contraparte de no tener backend con privilegios elevados filtrando
-- a mano) + prueba real de aislamiento entre dos hogares. pgTAP corre como postgres
-- (superusuario, se salta RLS por definición de Postgres), así que las secciones que
-- SÍ deben respetar RLS impersonan usuarios reales con `set local request.jwt.claims`
-- — el mismo mecanismo que usa PostgREST para pasar el JWT del que llama.
begin;
create extension if not exists pgtap;
select plan(11);

-- --- Salvaguarda: ninguna tabla de public sin RLS habilitado ---
select ok(
  (select bool_and(c.relrowsecurity) from pg_class c
   join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind = 'r'),
  'toda tabla en public tiene RLS habilitado'
);
select is(
  (select count(*)::int from pg_class c
   join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind = 'r'),
  10,
  'siguen siendo 10 tablas en public (si agregas una, este número también debe subir — recordatorio a propósito)'
);

-- --- Fixtures: dos hogares, un usuario cada uno ---
insert into hogar (id, nombre) values (9001, 'Hogar A'), (9002, 'Hogar B');
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000a001', 'a@test.local'),
  ('00000000-0000-0000-0000-00000000b001', 'b@test.local');
insert into perfil (id, hogar_id, nombre) values
  ('00000000-0000-0000-0000-00000000a001', 9001, 'Ana'),
  ('00000000-0000-0000-0000-00000000b001', 9002, 'Beto');

-- --- Como Ana (hogar A): inserta un rubro, se ve a sí misma y a su hogar ---
set local role authenticated;
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-00000000a001","role":"authenticated"}';

select lives_ok(
  $$ insert into rubro (nombre, tipo) values ('Comida de Ana', 'gasto') $$,
  'Ana puede insertar un rubro (hogar_id lo pone el trigger, no ella)'
);
select is(
  (select hogar_id from rubro where nombre = 'Comida de Ana'),
  9001::bigint,
  'el trigger le puso el hogar_id de Ana (9001), no uno que ella haya mandado'
);
select is(
  (select count(*)::int from rubro),
  1,
  'Ana ve su propio rubro'
);
select is(
  (select count(*)::int from hogar),
  1,
  'Ana solo ve su propio hogar (1 de los 2 que existen)'
);
select is(
  (select count(*)::int from perfil),
  1,
  'Ana solo ve su propio perfil (no el de Beto, aunque ambos existen en la tabla)'
);

-- --- Como Beto (hogar B): no debe ver nada de Ana ---
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-00000000b001","role":"authenticated"}';

select is(
  (select count(*)::int from rubro),
  0,
  'Beto no ve el rubro de Ana — aislamiento real entre hogares, no solo que la migración compile'
);
select is(
  (select count(*)::int from hogar),
  1,
  'Beto ve exactamente 1 hogar (el suyo, no el de Ana)'
);

select lives_ok(
  $$ insert into rubro (nombre, tipo) values ('Renta de Beto', 'gasto') $$,
  'Beto puede insertar su propio rubro'
);
select is(
  (select hogar_id from rubro where nombre = 'Renta de Beto'),
  9002::bigint,
  'el rubro de Beto quedó en su propio hogar (9002), nunca en el de Ana'
);

select finish();
rollback;
