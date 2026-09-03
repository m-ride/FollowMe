-- Fase 3 del plan de escalado a usuarios (notas-internas/escalado_a_usuarios.md):
-- hogar + perfil + Row Level Security. Esta es la migración que de verdad introduce
-- el aislamiento multi-tenant — antes de esto, todo el schema es de un solo hogar
-- implícito. RLS pasa a ser el único mecanismo que decide qué filas ve cada quien
-- (no hay backend con privilegios elevados de por medio — ver §3 del plan).

-- ============================================================================
-- hogar / perfil
-- ============================================================================

create table hogar (
  id         bigserial primary key,
  nombre     text not null,
  creado_en  timestamptz not null default now()
);

-- Puente entre "quién inició sesión" (auth.users, de Supabase Auth) y "a qué hogar
-- pertenece y cómo se llama dentro de la app". Un usuario = un hogar para v1 (ver
-- notas-internas/escalado_a_usuarios.md §9) — si hace falta pertenencia a varios
-- hogares más adelante, esto deja de ser 1:1 y se vuelve una tabla de membresía.
create table perfil (
  id        uuid primary key references auth.users(id) on delete cascade,
  hogar_id  bigint not null references hogar(id) on delete cascade,
  nombre    text not null,
  creado_en timestamptz not null default now()
);
create index idx_perfil_hogar on perfil(hogar_id);

-- mi_hogar_id(): SECURITY DEFINER a propósito — sin esto, la política RLS de
-- `perfil` (que necesita leer perfil para saber tu hogar_id) y la lectura de perfil
-- misma se muerden la cola: para pasar la política tendrías que poder leer tu propia
-- fila, pero leer tu propia fila exige pasar la política. security definer se salta
-- RLS para esta lectura puntual — es seguro porque SIEMPRE usa auth.uid() del que
-- llama, nunca un id que reciba como parámetro, así que no hay forma de pedir el
-- hogar_id de alguien más. set search_path fijo por la misma razón que cualquier
-- SECURITY DEFINER en Postgres: evita que alguien secuestre la función cambiando el
-- search_path de la sesión.
create or replace function mi_hogar_id()
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select hogar_id from perfil where id = auth.uid();
$$;

-- Toda tabla de datos gana hogar_id, siempre puesto por este trigger — nunca por lo
-- que mande el cliente. Un INSERT desde supabase-js jamás necesita (ni puede)
-- especificar hogar_id: sale siempre del perfil de quien está autenticado. Cierra
-- por completo la posibilidad de que alguien intente insertar en el hogar de otro.
create or replace function set_hogar_id()
returns trigger
language plpgsql
as $$
begin
  new.hogar_id := mi_hogar_id();
  return new;
end;
$$;

-- perfil.hogar_id tampoco se puede mover después de creado — evita que alguien se
-- "cambie" de hogar editando su propio perfil.
create or replace function bloquear_cambio_hogar()
returns trigger
language plpgsql
as $$
begin
  new.hogar_id := old.hogar_id;
  return new;
end;
$$;
create trigger perfil_hogar_fijo before update on perfil
  for each row execute function bloquear_cambio_hogar();

-- ============================================================================
-- hogar_id en cada tabla existente + trigger que lo puebla
-- ============================================================================

alter table metodo_pago         add column hogar_id bigint not null references hogar(id) on delete cascade;
alter table rubro               add column hogar_id bigint not null references hogar(id) on delete cascade;
alter table aportacion          add column hogar_id bigint not null references hogar(id) on delete cascade;
alter table gasto               add column hogar_id bigint not null references hogar(id) on delete cascade;
alter table compra_msi          add column hogar_id bigint not null references hogar(id) on delete cascade;
alter table cuota_msi           add column hogar_id bigint not null references hogar(id) on delete cascade;
alter table ingreso             add column hogar_id bigint not null references hogar(id) on delete cascade;
alter table patrimonio_historico add column hogar_id bigint not null references hogar(id) on delete cascade;

create trigger set_hogar_id before insert on metodo_pago          for each row execute function set_hogar_id();
create trigger set_hogar_id before insert on rubro                for each row execute function set_hogar_id();
create trigger set_hogar_id before insert on aportacion           for each row execute function set_hogar_id();
create trigger set_hogar_id before insert on gasto                for each row execute function set_hogar_id();
create trigger set_hogar_id before insert on compra_msi           for each row execute function set_hogar_id();
create trigger set_hogar_id before insert on cuota_msi            for each row execute function set_hogar_id();
create trigger set_hogar_id before insert on ingreso              for each row execute function set_hogar_id();
create trigger set_hogar_id before insert on patrimonio_historico for each row execute function set_hogar_id();

-- Correcciones a índices/PKs que eran "únicos globalmente" y ahora deben ser
-- "únicos por hogar" — sin esto, dos hogares distintos no podrían tener cada uno su
-- propio fondo de emergencia, ni su propio patrimonio_historico del mismo mes.
alter table patrimonio_historico drop constraint patrimonio_historico_pkey;
alter table patrimonio_historico add primary key (hogar_id, periodo);

drop index uq_rubro_fondo_emergencia;
create unique index uq_rubro_fondo_emergencia on rubro(hogar_id) where es_fondo_emergencia;

-- ============================================================================
-- Row Level Security
-- ============================================================================

alter table hogar               enable row level security;
alter table perfil              enable row level security;
alter table metodo_pago         enable row level security;
alter table rubro               enable row level security;
alter table aportacion          enable row level security;
alter table gasto               enable row level security;
alter table compra_msi          enable row level security;
alter table cuota_msi           enable row level security;
alter table ingreso             enable row level security;
alter table patrimonio_historico enable row level security;

-- hogar: solo lectura del propio. Nadie puede crear/editar/borrar un hogar desde el
-- cliente — eso es exclusivo del admin/service role (ver §5 del plan, control de
-- acceso: el alta de personas nunca pasa por RLS de un usuario normal).
create policy solo_mi_hogar on hogar
  for select using (id = mi_hogar_id());

-- perfil: se ve a sí mismo y a sus compañeros de hogar (para el selector de N
-- personas en aportaciones). Puede editar su propio nombre, nunca su hogar_id
-- (bloqueado también por el trigger de arriba, cinturón y tirantes) ni el de nadie
-- más. Insert/delete no tienen política -> denegado por default para un usuario
-- normal, igual que crear un hogar.
create policy ver_mi_hogar on perfil
  for select using (hogar_id = mi_hogar_id());
create policy editar_mi_perfil on perfil
  for update using (id = auth.uid()) with check (id = auth.uid());

-- Las 8 tablas de datos comparten la misma política: solo tu hogar, en las cuatro
-- operaciones. El INSERT siempre pasa el check porque el trigger set_hogar_id ya
-- puso el valor correcto antes de que RLS lo evalúe (BEFORE INSERT corre primero).
create policy hogar_aisla on metodo_pago
  for all using (hogar_id = mi_hogar_id()) with check (hogar_id = mi_hogar_id());
create policy hogar_aisla on rubro
  for all using (hogar_id = mi_hogar_id()) with check (hogar_id = mi_hogar_id());
create policy hogar_aisla on aportacion
  for all using (hogar_id = mi_hogar_id()) with check (hogar_id = mi_hogar_id());
create policy hogar_aisla on gasto
  for all using (hogar_id = mi_hogar_id()) with check (hogar_id = mi_hogar_id());
create policy hogar_aisla on compra_msi
  for all using (hogar_id = mi_hogar_id()) with check (hogar_id = mi_hogar_id());
create policy hogar_aisla on cuota_msi
  for all using (hogar_id = mi_hogar_id()) with check (hogar_id = mi_hogar_id());
create policy hogar_aisla on ingreso
  for all using (hogar_id = mi_hogar_id()) with check (hogar_id = mi_hogar_id());
create policy hogar_aisla on patrimonio_historico
  for all using (hogar_id = mi_hogar_id()) with check (hogar_id = mi_hogar_id());

-- ============================================================================
-- Ajuste a resumen() (Fase 2): su ON CONFLICT (periodo) apuntaba a la PK vieja de
-- patrimonio_historico, que esta migración cambió a (hogar_id, periodo). El insert
-- en sí no necesita mencionar hogar_id — el trigger set_hogar_id ya lo pone — pero
-- el target del ON CONFLICT sí tiene que nombrar la PK real o Postgres lo rechaza.
-- ============================================================================

create or replace function resumen(p_periodo text default null)
returns jsonb
language plpgsql
as $$
declare
  v_periodo text := coalesce(p_periodo, to_char(now(), 'YYYY-MM'));
  v_hoy text := to_char(now(), 'YYYY-MM');
  v_inicio date;
  v_rubros jsonb;
  v_ahorro jsonb;
  v_ahorro_total bigint;
  v_ingreso_total bigint;
  v_gasto_fijo bigint := 0;
  v_gasto_discrecional bigint := 0;
  v_gasto_sin_clasificar bigint := 0;
  v_gasto_total_mes bigint;
  v_pasivo_total bigint;
  v_tarjetas jsonb;
  v_compromiso_meses jsonb;
  v_compromiso_total bigint;
  v_compromiso_mes_actual bigint := 0;
  v_patrimonio_neto bigint;
  v_tasa_ahorro double precision;
  v_pct_msi double precision;
  v_fondo jsonb := 'null'::jsonb;
  v_fondo_rubro_id bigint;
  v_fondo_saldo bigint;
  v_fondo_promedio bigint;
  v_gastos_sin_metodo int;
  v_compras_sin_tarjeta int;
  v_gastos_sin_rubro int;
  v_compras_sin_rubro int;
  rec record;
begin
  if v_periodo !~ '^\d{4}-\d{2}$' then
    raise exception 'periodo debe ser YYYY-MM';
  end if;
  v_inicio := (v_periodo || '-01')::date;

  select coalesce(jsonb_agg(jsonb_build_object(
      'id', r.id, 'nombre', r.nombre, 'clasificacion', r.clasificacion,
      'aportado_yo', x.aportado_yo, 'aportado_pareja', x.aportado_pareja,
      'gastado', x.gastado, 'cuotas_msi', x.cuotas_msi,
      'disponible', x.aportado_yo + x.aportado_pareja - x.gastado - x.cuotas_msi
    ) order by r.id), '[]'::jsonb)
  into v_rubros
  from rubro r
  cross join lateral (
    select
      coalesce((select sum(a.monto) from aportacion a where a.rubro_id=r.id and a.periodo=v_periodo and a.fuente='yo'),0) as aportado_yo,
      coalesce((select sum(a.monto) from aportacion a where a.rubro_id=r.id and a.periodo=v_periodo and a.fuente='pareja'),0) as aportado_pareja,
      coalesce((select sum(g.monto) from gasto g where g.rubro_id=r.id and to_char(g.fecha,'YYYY-MM')=v_periodo),0) as gastado,
      coalesce((select sum(q.monto) from cuota_msi q join compra_msi c on c.id=q.compra_id
                where c.rubro_id=r.id and to_char(q.fecha_vencimiento,'YYYY-MM')=v_periodo),0) as cuotas_msi
  ) x
  where r.tipo = 'gasto';

  select
    coalesce(jsonb_agg(jsonb_build_object(
      'id', r.id, 'nombre', r.nombre, 'saldo', x.saldo,
      'monto_objetivo', r.monto_objetivo,
      'avance_pct', case when r.monto_objetivo > 0 then (x.saldo::double precision / r.monto_objetivo) * 100 else null end,
      'es_fondo_emergencia', r.es_fondo_emergencia
    ) order by r.id), '[]'::jsonb),
    coalesce(sum(x.saldo), 0)
  into v_ahorro, v_ahorro_total
  from rubro r
  cross join lateral (
    select coalesce((select sum(a.monto) from aportacion a where a.rubro_id=r.id),0)
         - coalesce((select sum(g.monto) from gasto g where g.rubro_id=r.id),0) as saldo
  ) x
  where r.tipo = 'ahorro';

  select r.id, x.saldo into v_fondo_rubro_id, v_fondo_saldo
  from rubro r
  cross join lateral (
    select coalesce((select sum(a.monto) from aportacion a where a.rubro_id=r.id),0)
         - coalesce((select sum(g.monto) from gasto g where g.rubro_id=r.id),0) as saldo
  ) x
  where r.tipo = 'ahorro' and r.es_fondo_emergencia
  limit 1;

  with por_tarjeta as (
    select to_char(q.fecha_vencimiento,'YYYY-MM') as mes, c.tarjeta_id, mp.nombre, sum(q.monto) as monto
    from cuota_msi q
    join compra_msi c on c.id = q.compra_id
    join metodo_pago mp on mp.id = c.tarjeta_id
    where not q.pagada
      and q.fecha_vencimiento >= v_inicio
      and q.fecha_vencimiento < (v_inicio + interval '6 months')
    group by 1, c.tarjeta_id, mp.nombre
  ),
  por_mes as (
    select mes, sum(monto) as total,
      jsonb_agg(jsonb_build_object('tarjeta_id', tarjeta_id, 'nombre', nombre, 'monto', monto) order by tarjeta_id) as por_tarjeta
    from por_tarjeta
    group by mes
  )
  select coalesce(jsonb_agg(jsonb_build_object('mes', mes, 'total', total, 'por_tarjeta', por_tarjeta) order by mes), '[]'::jsonb),
    coalesce(sum(total), 0)
  into v_compromiso_meses, v_compromiso_total
  from por_mes;

  select (elem->>'total')::bigint into v_compromiso_mes_actual
  from jsonb_array_elements(v_compromiso_meses) elem
  where elem->>'mes' = v_periodo;
  v_compromiso_mes_actual := coalesce(v_compromiso_mes_actual, 0);

  select coalesce(sum(monto),0) into v_ingreso_total from ingreso where periodo = v_periodo;

  for rec in
    select r.clasificacion, sum(g.monto) as monto
    from gasto g left join rubro r on r.id = g.rubro_id
    where to_char(g.fecha,'YYYY-MM') = v_periodo
    group by r.clasificacion
  loop
    if rec.clasificacion is null then
      v_gasto_sin_clasificar := rec.monto;
    elsif rec.clasificacion = 'fijo' then
      v_gasto_fijo := rec.monto;
    elsif rec.clasificacion = 'discrecional' then
      v_gasto_discrecional := rec.monto;
    end if;
  end loop;
  v_gasto_total_mes := v_gasto_fijo + v_gasto_discrecional + v_gasto_sin_clasificar;

  select coalesce(sum(monto),0) into v_pasivo_total from cuota_msi where not pagada;

  select coalesce(jsonb_agg(jsonb_build_object(
      'id', m.id, 'nombre', m.nombre, 'limite', m.limite, 'saldo_actual', x.saldo,
      'pct_utilizacion', case when m.limite > 0 then (x.saldo::double precision / m.limite) * 100 else 0 end
    ) order by m.id), '[]'::jsonb)
  into v_tarjetas
  from metodo_pago m
  cross join lateral (
    select
      coalesce((select sum(g.monto) from gasto g where g.metodo_pago_id=m.id and to_char(g.fecha,'YYYY-MM')=v_periodo),0)
      + coalesce((select sum(q.monto) from cuota_msi q join compra_msi c on c.id=q.compra_id
                  where c.tarjeta_id=m.id and to_char(q.fecha_vencimiento,'YYYY-MM')=v_periodo and not q.pagada),0)
      as saldo
  ) x
  where m.tipo = 'credito';

  v_patrimonio_neto := v_ahorro_total - v_pasivo_total;

  if v_ingreso_total > 0 then
    v_tasa_ahorro := ((v_ingreso_total - v_gasto_total_mes)::double precision / v_ingreso_total) * 100;
    v_pct_msi := (v_compromiso_mes_actual::double precision / v_ingreso_total) * 100;
  end if;

  if v_fondo_rubro_id is not null then
    select coalesce(avg(t),0)::bigint into v_fondo_promedio from (
      select sum(g.monto) as t from gasto g join rubro r on r.id=g.rubro_id
      where r.clasificacion = 'fijo'
        and g.fecha >= date_trunc('month', now()) - interval '3 months'
        and g.fecha < date_trunc('month', now())
      group by to_char(g.fecha,'YYYY-MM')
    ) s;

    v_fondo := jsonb_build_object(
      'rubro_id', v_fondo_rubro_id,
      'saldo', v_fondo_saldo,
      'gasto_fijo_promedio_mensual', v_fondo_promedio,
      'objetivo_min', v_fondo_promedio * 3,
      'objetivo_max', v_fondo_promedio * 6,
      'avance_pct_min', case when v_fondo_promedio * 3 > 0 then (v_fondo_saldo::double precision / (v_fondo_promedio * 3)) * 100 else null end
    );
  end if;

  -- Snapshot hacia adelante: solo se graba para el mes calendario actual del
  -- servidor. hogar_id lo pone set_hogar_id (trigger) — el ON CONFLICT debe nombrar
  -- la PK real de la tabla, que ahora es (hogar_id, periodo).
  if v_periodo = v_hoy then
    insert into patrimonio_historico (periodo, monto) values (v_periodo, v_patrimonio_neto)
    on conflict (hogar_id, periodo) do update set monto = excluded.monto, registrado_en = now();
  end if;

  select count(*) into v_gastos_sin_metodo from gasto where metodo_pago_id is null;
  select count(*) into v_compras_sin_tarjeta from compra_msi where tarjeta_id is null;
  select count(*) into v_gastos_sin_rubro from gasto where rubro_id is null;
  select count(*) into v_compras_sin_rubro from compra_msi where rubro_id is null;

  return jsonb_strip_nulls(jsonb_build_object(
    'periodo', v_periodo,
    'rubros', v_rubros,
    'ahorro', v_ahorro,
    'ingreso_total', v_ingreso_total,
    'tarjetas', v_tarjetas,
    'salud', jsonb_build_object(
      'tasa_ahorro', v_tasa_ahorro,
      'pct_ingreso_comprometido_msi', v_pct_msi,
      'patrimonio_neto', v_patrimonio_neto,
      'gasto_fijo', v_gasto_fijo,
      'gasto_discrecional', v_gasto_discrecional,
      'gasto_sin_clasificar', v_gasto_sin_clasificar
    ),
    'fondo_emergencia', v_fondo,
    'compromiso_msi', jsonb_build_object('meses', v_compromiso_meses, 'total', v_compromiso_total),
    'pendientes', jsonb_build_object(
      'gastos_sin_metodo', v_gastos_sin_metodo,
      'compras_sin_tarjeta', v_compras_sin_tarjeta,
      'gastos_sin_rubro', v_gastos_sin_rubro,
      'compras_sin_rubro', v_compras_sin_rubro
    )
  ));
end;
$$;
