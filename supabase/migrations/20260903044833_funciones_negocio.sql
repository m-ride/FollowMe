-- Fase 2 del plan de escalado a usuarios (notas-internas/escalado_a_usuarios.md):
-- portar la lógica de negocio de backend/{msi,resumen,tendencia}.go a funciones de
-- Postgres, llamadas vía supabase.rpc(...). Cada función replica exactamente el
-- comportamiento de su equivalente en Go — los comentarios señalan el archivo/función
-- origen para poder comparar línea por línea.
--
-- SECURITY INVOKER (el default): estas funciones corren con los privilegios y las
-- políticas RLS del usuario que las llama, no con privilegios elevados — cuando la
-- fase 3 agregue hogar_id + RLS a las tablas, estas funciones heredan ese filtro
-- automáticamente, sin tener que repetirlo aquí.

-- ============================================================================
-- en_dia / generar_cuotas — puerto de backend/msi.go (generarCuotas, enDia, mesDe)
-- ============================================================================

-- enDia: fija el día del mes recortando al último día si el mes es más corto
-- (día 31 en febrero -> 28/29), en vez de desbordar al mes siguiente.
create or replace function en_dia(mes date, dia int)
returns date
language sql
immutable
as $$
  select make_date(
    extract(year from mes)::int,
    extract(month from mes)::int,
    least(dia, extract(day from ((date_trunc('month', mes) + interval '1 month' - interval '1 day')))::int)
  );
$$;

-- generarCuotas: reparte monto_total (centavos) en `plazo` cuotas y las agenda según
-- el ciclo de la tarjeta — la compra cae en el corte de este mes si ocurrió en o antes
-- del día de corte, si no cae en el siguiente; el pago de ese corte es en el mismo mes
-- cuando dia_pago > dia_corte, si no al mes siguiente. El sobrante de la división se
-- carga a las primeras cuotas, así SUM(monto) == monto_total.
create or replace function generar_cuotas(
  monto_total bigint,
  plazo int,
  fecha_compra date,
  dia_corte int,
  dia_pago int
)
returns table(numero_cuota int, monto bigint, fecha_vencimiento date)
language plpgsql
immutable
as $$
declare
  v_base bigint := monto_total / plazo;
  v_resto bigint := monto_total % plazo;
  v_corte date := date_trunc('month', fecha_compra)::date;
  v_primer_pago date;
  i int;
begin
  if extract(day from fecha_compra)::int > dia_corte then
    v_corte := (v_corte + interval '1 month')::date;
  end if;

  v_primer_pago := v_corte;
  if dia_pago <= dia_corte then
    v_primer_pago := (v_primer_pago + interval '1 month')::date;
  end if;

  for i in 0..(plazo - 1) loop
    numero_cuota := i + 1;
    monto := v_base + (case when i < v_resto then 1 else 0 end);
    fecha_vencimiento := en_dia((v_primer_pago + (i * interval '1 month'))::date, dia_pago);
    return next;
  end loop;
end;
$$;

-- ============================================================================
-- crear_compra_msi — puerto de backend/main.go (crearCompraMSI)
-- ============================================================================

-- Inserta la compra y genera sus cuotas en una sola transacción (una función de
-- Postgres ya es transaccional — si algo falla a medio loop, no queda nada a medias,
-- igual que el tx.Rollback() del Go). Valida que la tarjeta sea de tipo credito, igual
-- que el Go original ("tarjeta_id %d no es una tarjeta de crédito").
create or replace function crear_compra_msi(
  p_tarjeta_id bigint,
  p_rubro_id bigint,
  p_descripcion text,
  p_monto_total bigint,
  p_plazo_meses int,
  p_fecha_compra date
)
returns bigint
language plpgsql
as $$
declare
  v_dia_corte int;
  v_dia_pago int;
  v_compra_id bigint;
  c record;
begin
  select dia_corte, dia_pago into v_dia_corte, v_dia_pago
  from metodo_pago where id = p_tarjeta_id and tipo = 'credito';

  if not found then
    raise exception 'tarjeta_id % no es una tarjeta de crédito', p_tarjeta_id;
  end if;

  insert into compra_msi (tarjeta_id, rubro_id, descripcion, monto_total, plazo_meses, fecha_compra)
  values (p_tarjeta_id, p_rubro_id, p_descripcion, p_monto_total, p_plazo_meses, p_fecha_compra)
  returning id into v_compra_id;

  for c in select * from generar_cuotas(p_monto_total, p_plazo_meses, p_fecha_compra, v_dia_corte, v_dia_pago) loop
    insert into cuota_msi (compra_id, numero_cuota, monto, fecha_vencimiento)
    values (v_compra_id, c.numero_cuota, c.monto, c.fecha_vencimiento);
  end loop;

  return v_compra_id;
end;
$$;

-- ============================================================================
-- resumen — puerto de backend/resumen.go (resumen)
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

  -- Disponible del mes = aportaciones (yo + pareja) − gastos − cuotas MSI que vencen
  -- en el mes. La compra MSI no se cuenta completa, sólo su cuota.
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

  -- Ahorro: saldo acumulado de siempre (aportaciones − retiros), no se resetea por mes.
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

  -- fondo de emergencia: guarda el rubro marcado (a lo más uno, índice único).
  select r.id, x.saldo into v_fondo_rubro_id, v_fondo_saldo
  from rubro r
  cross join lateral (
    select coalesce((select sum(a.monto) from aportacion a where a.rubro_id=r.id),0)
         - coalesce((select sum(g.monto) from gasto g where g.rubro_id=r.id),0) as saldo
  ) x
  where r.tipo = 'ahorro' and r.es_fondo_emergencia
  limit 1;

  -- Compromiso futuro: cuotas pendientes de los próximos 6 meses, agrupadas por mes y
  -- tarjeta. jsonb_agg anidado + GROUP BY no compone bien en una sola pasada, así que
  -- va en dos pasos explícitos (por tarjeta, luego por mes).
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

  -- ojo: llamar jsonb_array_elements() dos veces en el mismo SELECT (una por campo)
  -- produce un producto cruzado, no el mismo elemento — por eso una sola llamada en
  -- el FROM, referenciada una vez.
  select (elem->>'total')::bigint into v_compromiso_mes_actual
  from jsonb_array_elements(v_compromiso_meses) elem
  where elem->>'mes' = v_periodo;
  v_compromiso_mes_actual := coalesce(v_compromiso_mes_actual, 0);

  -- --- Fase 2: salud financiera ---

  select coalesce(sum(monto),0) into v_ingreso_total from ingreso where periodo = v_periodo;

  -- Gasto del mes partido por clasificación del rubro (fijo/discrecional/sin
  -- clasificar) — LEFT JOIN (no INNER): un gasto que se quedó sin rubro (rubro_id
  -- NULL, porque el rubro se borró) debe seguir contando en el total, cae en "sin
  -- clasificar" igual que un rubro sin clasificacion.
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

  -- Pasivo para patrimonio neto: TODA cuota pendiente, no solo los próximos 6 meses.
  select coalesce(sum(monto),0) into v_pasivo_total from cuota_msi where not pagada;

  -- Utilización de crédito: gasto normal del mes + cuotas MSI que vencen el mes, por
  -- tarjeta. Por mes calendario, no por ciclo de corte exacto — igual que "Disponible".
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

  -- Fondo de emergencia (Fase 3): objetivo 3-6 meses de gasto fijo promedio de los
  -- últimos 3 meses calendario completos (no incluye el mes en curso).
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

  -- Snapshot de patrimonio neto hacia adelante: solo se graba cuando se consulta el
  -- mes calendario actual del servidor (v_hoy), no un periodo pasado/futuro pedido a
  -- propósito — igual que el Go original.
  if v_periodo = v_hoy then
    insert into patrimonio_historico (periodo, monto) values (v_periodo, v_patrimonio_neto)
    on conflict (periodo) do update set monto = excluded.monto, registrado_en = now();
  end if;

  -- Pendientes: registros que se quedaron sin método de pago o sin rubro porque el
  -- original se borró (ON DELETE SET NULL) — ver pantalla "Pendientes".
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

-- ============================================================================
-- tendencia / tendencia_rubros / tendencia_tarjetas — puerto de backend/tendencia.go
-- ============================================================================

create or replace function tendencia(p_meses int default 12)
returns jsonb
language plpgsql
as $$
declare
  v_result jsonb;
begin
  if p_meses < 1 or p_meses > 24 then
    raise exception 'meses debe ser un entero entre 1 y 24';
  end if;

  with meses as (
    select to_char(d,'YYYY-MM') as periodo
    from generate_series(date_trunc('month', now()) - (p_meses - 1) * interval '1 month',
                          date_trunc('month', now()), interval '1 month') d
  ),
  ing as (select periodo, sum(monto) as t from ingreso group by periodo),
  gas as (
    select to_char(g.fecha,'YYYY-MM') as periodo, r.clasificacion, sum(g.monto) as t
    from gasto g left join rubro r on r.id = g.rubro_id group by 1, 2
  ),
  por_mes as (
    select m.periodo,
      coalesce(i.t,0) as ingreso,
      coalesce(sum(g.t) filter (where g.clasificacion='fijo'),0) as gasto_fijo,
      coalesce(sum(g.t) filter (where g.clasificacion='discrecional'),0) as gasto_discrecional,
      coalesce(sum(g.t) filter (where g.clasificacion is null),0) as gasto_sin_clasificar
    from meses m
    left join ing i on i.periodo = m.periodo
    left join gas g on g.periodo = m.periodo
    group by m.periodo, i.t
  )
  select jsonb_agg(jsonb_build_object(
      'periodo', periodo, 'ingreso', ingreso,
      'gasto_fijo', gasto_fijo, 'gasto_discrecional', gasto_discrecional,
      'gasto_sin_clasificar', gasto_sin_clasificar,
      'gasto_total', gasto_fijo + gasto_discrecional + gasto_sin_clasificar,
      'tasa_ahorro', case when ingreso > 0
        then ((ingreso - (gasto_fijo + gasto_discrecional + gasto_sin_clasificar))::double precision / ingreso) * 100
        else null end
    ) order by periodo)
  into v_result
  from por_mes;

  return jsonb_build_object('meses', jsonb_strip_nulls(coalesce(v_result, '[]'::jsonb)));
end;
$$;

-- gasto mensual por rubro (solo tipo=gasto) de los últimos N meses — a diferencia de
-- tendencia(), que solo parte el gasto en fijo/discrecional/sin clasificar, esto deja
-- ver si una categoría puntual viene subiendo o bajando mes con mes.
create or replace function tendencia_rubros(p_meses int default 6)
returns jsonb
language plpgsql
as $$
declare
  v_meses jsonb;
  v_rubros jsonb;
begin
  if p_meses < 1 or p_meses > 24 then
    raise exception 'meses debe ser un entero entre 1 y 24';
  end if;

  select jsonb_agg(to_char(d,'YYYY-MM') order by d)
  into v_meses
  from generate_series(date_trunc('month', now()) - (p_meses - 1) * interval '1 month',
                        date_trunc('month', now()), interval '1 month') d;

  with meses as (
    select to_char(d,'YYYY-MM') as periodo
    from generate_series(date_trunc('month', now()) - (p_meses - 1) * interval '1 month',
                          date_trunc('month', now()), interval '1 month') d
  ),
  por_rubro_mes as (
    select r.id, r.nombre, m.periodo,
      coalesce((select sum(g.monto) from gasto g where g.rubro_id=r.id and to_char(g.fecha,'YYYY-MM')=m.periodo),0) as monto
    from rubro r cross join meses m
    where r.tipo = 'gasto'
  )
  select jsonb_agg(jsonb_build_object(
      'rubro_id', id, 'nombre', nombre,
      'montos', montos
    ) order by id)
  into v_rubros
  from (
    select id, nombre, jsonb_agg(monto order by periodo) as montos
    from por_rubro_mes
    group by id, nombre
  ) g;

  return jsonb_build_object('meses', coalesce(v_meses, '[]'::jsonb), 'rubros', coalesce(v_rubros, '[]'::jsonb));
end;
$$;

-- % de utilización mensual por tarjeta de crédito de los últimos N meses — misma
-- fórmula simplificada que resumen() usa para el mes actual, repetida mes a mes.
create or replace function tendencia_tarjetas(p_meses int default 6)
returns jsonb
language plpgsql
as $$
declare
  v_meses jsonb;
  v_tarjetas jsonb;
begin
  if p_meses < 1 or p_meses > 24 then
    raise exception 'meses debe ser un entero entre 1 y 24';
  end if;

  select jsonb_agg(to_char(d,'YYYY-MM') order by d)
  into v_meses
  from generate_series(date_trunc('month', now()) - (p_meses - 1) * interval '1 month',
                        date_trunc('month', now()), interval '1 month') d;

  with meses as (
    select to_char(d,'YYYY-MM') as periodo
    from generate_series(date_trunc('month', now()) - (p_meses - 1) * interval '1 month',
                          date_trunc('month', now()), interval '1 month') d
  ),
  por_tarjeta_mes as (
    select m.id, m.nombre, m.limite, me.periodo,
      coalesce((select sum(g.monto) from gasto g where g.metodo_pago_id=m.id and to_char(g.fecha,'YYYY-MM')=me.periodo),0)
      + coalesce((select sum(q.monto) from cuota_msi q join compra_msi c on c.id=q.compra_id
                  where c.tarjeta_id=m.id and to_char(q.fecha_vencimiento,'YYYY-MM')=me.periodo and not q.pagada),0)
      as saldo
    from metodo_pago m cross join meses me
    where m.tipo = 'credito'
  )
  select jsonb_agg(jsonb_build_object(
      'id', id, 'nombre', nombre, 'limite', limite,
      'pct_utilizacion', pcts
    ) order by id)
  into v_tarjetas
  from (
    select id, nombre, limite,
      jsonb_agg(case when limite > 0 then (saldo::double precision / limite) * 100 else 0 end order by periodo) as pcts
    from por_tarjeta_mes
    group by id, nombre, limite
  ) g;

  return jsonb_build_object('meses', coalesce(v_meses, '[]'::jsonb), 'tarjetas', coalesce(v_tarjetas, '[]'::jsonb));
end;
$$;
