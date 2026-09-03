-- Fase 1 del plan de escalado a usuarios (ver notas-internas/escalado_a_usuarios.md):
-- puerto 1:1 del schema actual de backend/schema.sql (Neon), consolidando el historial
-- de ALTERs de esa versión en las definiciones finales de una vez, sin hogar_id ni RLS
-- todavía — eso llega en una migración posterior, deliberadamente por separado (§8).
--
-- Diferencia intencional con backend/schema.sql: aquí NO se usa "IF NOT EXISTS" en los
-- CREATE TABLE — las migraciones de Supabase son versionadas y se aplican una sola vez
-- en orden, a diferencia del schema.sql de Go que se re-ejecuta completo en cada boot.

create table metodo_pago (
  id         bigserial primary key,
  nombre     text not null,
  tipo       text not null check (tipo in ('efectivo','debito','credito')),
  -- solo para tipo=credito
  limite     bigint,
  dia_corte  int check (dia_corte between 1 and 31),
  dia_pago   int check (dia_pago  between 1 and 31),
  check (tipo <> 'credito' or (limite is not null and dia_corte is not null and dia_pago is not null))
);

create table rubro (
  id                   bigserial primary key,
  nombre               text not null,
  tipo                 text not null check (tipo in ('gasto','ahorro')),
  monto_objetivo       bigint,
  clasificacion        text check (clasificacion in ('fijo','discrecional')),
  es_fondo_emergencia  boolean not null default false
);
-- A lo más un rubro marcado como fondo de emergencia, sin validarlo a mano en código.
create unique index uq_rubro_fondo_emergencia on rubro(es_fondo_emergencia) where es_fondo_emergencia;

create table aportacion (
  id       bigserial primary key,
  rubro_id bigint not null references rubro(id) on delete cascade,
  fuente   text not null check (fuente in ('yo','pareja')),
  monto    bigint not null check (monto > 0),
  periodo  char(7) not null  -- 'YYYY-MM'
);

create table gasto (
  id             bigserial primary key,
  -- nullable a propósito: borrar un rubro/método de pago no debe perder el gasto ni
  -- bloquearse por FK — se queda "sin asignar" y aparece en pendientes (ver frontend).
  rubro_id       bigint references rubro(id) on delete set null,
  metodo_pago_id bigint references metodo_pago(id) on delete set null,
  monto          bigint not null check (monto > 0),
  fecha          date not null,
  descripcion    text not null default ''
);

create table compra_msi (
  id           bigserial primary key,
  tarjeta_id   bigint references metodo_pago(id) on delete set null,
  rubro_id     bigint references rubro(id) on delete set null,
  descripcion  text not null default '',
  monto_total  bigint not null check (monto_total > 0),
  plazo_meses  int not null check (plazo_meses between 1 and 48),
  fecha_compra date not null
);

create table cuota_msi (
  id                bigserial primary key,
  compra_id         bigint not null references compra_msi(id) on delete cascade,
  numero_cuota      int not null,
  monto             bigint not null,
  fecha_vencimiento date not null,
  pagada            boolean not null default false,
  unique (compra_id, numero_cuota)
);

create table ingreso (
  id      bigserial primary key,
  fuente  text not null,
  monto   bigint not null check (monto > 0),
  periodo char(7) not null  -- 'YYYY-MM'
);

-- Snapshot de patrimonio neto, hacia adelante únicamente (sin reconstrucción
-- retroactiva — no hay datos históricos de balances antes de que esto existiera).
create table patrimonio_historico (
  periodo       char(7) primary key,
  monto         bigint not null,
  registrado_en timestamptz not null default now()
);

create index idx_gasto_fecha    on gasto(fecha);
create index idx_aportacion_per on aportacion(periodo);
create index idx_cuota_venc     on cuota_msi(fecha_vencimiento) where not pagada;
create index idx_ingreso_per    on ingreso(periodo);
