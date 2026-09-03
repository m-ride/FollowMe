-- Fase 4 del plan de escalado a usuarios (notas-internas/escalado_a_usuarios.md):
-- aportacion.fuente ('yo'|'pareja', un enum fijo de 2 valores) pasa a ser
-- usuario_id, cualquier miembro del hogar — un hogar de 2, 3 o 5 personas usa
-- exactamente el mismo modelo. Es el cambio de mayor riesgo del plan porque
-- resumen() hoy suma en dos columnas fijas (aportado_yo/aportado_pareja) — pasa a
-- devolver una lista de aportantes.
--
-- Nullable + ON DELETE SET NULL, mismo patrón ya usado en gasto.rubro_id/
-- metodo_pago_id: si un perfil se borra alguna vez, sus aportaciones pasadas no
-- deben desaparecer ni bloquear el borrado, solo quedar "sin aportante asignado".

alter table aportacion drop column fuente;
alter table aportacion add column usuario_id uuid references perfil(id) on delete set null;

-- resumen(): rubros[].aportado_yo/aportado_pareja -> rubros[].aportaciones[], una
-- fila por aportante con su nombre (de perfil) y el total que puso ese periodo.
-- disponible sigue siendo sum(aportaciones) - gastado - cuotas_msi, igual que antes.
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
      'aportaciones', x.aportaciones,
      'gastado', x.gastado, 'cuotas_msi', x.cuotas_msi,
      'disponible', x.total_aportado - x.gastado - x.cuotas_msi
    ) order by r.id), '[]'::jsonb)
  into v_rubros
  from rubro r
  cross join lateral (
    select
      coalesce((
        select jsonb_agg(jsonb_build_object('usuario_id', ap.usuario_id, 'nombre', p.nombre, 'monto', ap.monto) order by p.nombre)
        from aportacion ap left join perfil p on p.id = ap.usuario_id
        where ap.rubro_id = r.id and ap.periodo = v_periodo
      ), '[]'::jsonb) as aportaciones,
      coalesce((select sum(a.monto) from aportacion a where a.rubro_id=r.id and a.periodo=v_periodo),0) as total_aportado,
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
