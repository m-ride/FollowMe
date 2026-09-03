-- pgTAP para generar_cuotas/en_dia — mismos casos que backend/msi_test.go
-- (TestGenerarCuotas), para poder comparar 1:1 que el puerto a PL/pgSQL se comporta
-- exactamente igual que el Go original.
begin;
create extension if not exists pgtap;
select plan(9);

-- Caso 1: 1000.00 en 3 MSI, compra antes del corte (10 <= 15) -> corte enero, pago
-- enero (20 > 15). El sobrante de la división va a las primeras cuotas.
select is(
  (select sum(monto) from generar_cuotas(100000, 3, '2026-01-10', 15, 20))::bigint,
  100000::bigint,
  'caso 1: suma de cuotas == monto_total'
);
select is(
  (select monto from generar_cuotas(100000, 3, '2026-01-10', 15, 20) where numero_cuota = 1),
  33334::bigint,
  'caso 1: primera cuota se lleva el sobrante'
);
select is(
  (select monto from generar_cuotas(100000, 3, '2026-01-10', 15, 20) where numero_cuota = 3),
  33333::bigint,
  'caso 1: ultima cuota sin sobrante'
);
select is(
  (select fecha_vencimiento from generar_cuotas(100000, 3, '2026-01-10', 15, 20) where numero_cuota = 1),
  '2026-01-20'::date,
  'caso 1: primer vencimiento'
);
select is(
  (select fecha_vencimiento from generar_cuotas(100000, 3, '2026-01-10', 15, 20) where numero_cuota = 3),
  '2026-03-20'::date,
  'caso 1: tercer vencimiento'
);

-- Caso 2: compra después del corte (16 > 15) -> se va al corte siguiente.
select is(
  (select fecha_vencimiento from generar_cuotas(100, 1, '2026-01-16', 15, 20) where numero_cuota = 1),
  '2026-02-20'::date,
  'caso 2: post-corte'
);

-- Caso 3: pago antes del corte (5 <= 20) -> el pago de ese corte cae al mes siguiente.
select is(
  (select fecha_vencimiento from generar_cuotas(100, 1, '2026-01-05', 20, 5) where numero_cuota = 1),
  '2026-02-05'::date,
  'caso 3: pago-antes-corte'
);

-- Caso 4: día 31 en un mes corto se recorta, no se desborda a marzo.
select is(
  (select fecha_vencimiento from generar_cuotas(300, 3, '2025-12-01', 5, 31) where numero_cuota = 3),
  '2026-02-28'::date,
  'caso 4: clamp febrero'
);

select is(en_dia('2026-02-01'::date, 31), '2026-02-28'::date, 'en_dia recorta al último día del mes');

select finish();
rollback;
