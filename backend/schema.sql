-- ponytail: idempotent schema applied at boot. Cambiar a migraciones versionadas
-- cuando haya datos reales que preservar en un ALTER destructivo.

CREATE TABLE IF NOT EXISTS metodo_pago (
  id         BIGSERIAL PRIMARY KEY,
  nombre     TEXT NOT NULL,
  tipo       TEXT NOT NULL CHECK (tipo IN ('efectivo','debito','credito')),
  -- solo para tipo=credito
  limite     BIGINT,
  dia_corte  INT CHECK (dia_corte BETWEEN 1 AND 31),
  dia_pago   INT CHECK (dia_pago  BETWEEN 1 AND 31),
  CHECK (tipo <> 'credito' OR (limite IS NOT NULL AND dia_corte IS NOT NULL AND dia_pago IS NOT NULL))
);

CREATE TABLE IF NOT EXISTS rubro (
  id             BIGSERIAL PRIMARY KEY,
  nombre         TEXT NOT NULL,
  tipo           TEXT NOT NULL CHECK (tipo IN ('gasto','ahorro')),
  monto_objetivo BIGINT
);
-- Fase 2: clasificación fijo/discrecional, solo aplica a tipo=gasto. ALTER (no en el
-- CREATE) porque ya hay filas reales en producción — CREATE IF NOT EXISTS no las toca.
ALTER TABLE rubro ADD COLUMN IF NOT EXISTS clasificacion TEXT CHECK (clasificacion IN ('fijo','discrecional'));
-- Fase 3: fondo de emergencia, un rubro de ahorro marcado con reglas propias (prioridad,
-- objetivo 3-6 meses de gasto fijo). El índice único parcial garantiza como máximo uno
-- marcado sin validarlo a mano en Go.
ALTER TABLE rubro ADD COLUMN IF NOT EXISTS es_fondo_emergencia BOOLEAN NOT NULL DEFAULT FALSE;
CREATE UNIQUE INDEX IF NOT EXISTS uq_rubro_fondo_emergencia ON rubro(es_fondo_emergencia) WHERE es_fondo_emergencia;

CREATE TABLE IF NOT EXISTS aportacion (
  id       BIGSERIAL PRIMARY KEY,
  rubro_id BIGINT NOT NULL REFERENCES rubro(id) ON DELETE CASCADE,
  fuente   TEXT NOT NULL CHECK (fuente IN ('yo','pareja')),
  monto    BIGINT NOT NULL CHECK (monto > 0),
  periodo  CHAR(7) NOT NULL  -- 'YYYY-MM'
);

CREATE TABLE IF NOT EXISTS gasto (
  id             BIGSERIAL PRIMARY KEY,
  rubro_id       BIGINT REFERENCES rubro(id),
  metodo_pago_id BIGINT REFERENCES metodo_pago(id),
  monto          BIGINT NOT NULL CHECK (monto > 0),
  fecha          DATE NOT NULL,
  descripcion    TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS compra_msi (
  id           BIGSERIAL PRIMARY KEY,
  tarjeta_id   BIGINT REFERENCES metodo_pago(id),
  rubro_id     BIGINT REFERENCES rubro(id),
  descripcion  TEXT NOT NULL DEFAULT '',
  monto_total  BIGINT NOT NULL CHECK (monto_total > 0),
  plazo_meses  INT NOT NULL CHECK (plazo_meses BETWEEN 1 AND 48),
  fecha_compra DATE NOT NULL
);

-- Borrar un método de pago ya no debe bloquearse por FK: los gastos/compras que lo
-- usaban se quedan con metodo_pago_id/tarjeta_id NULL (en vez de perder el registro
-- completo) y aparecen en /api/resumen.pendientes para que el usuario les asigne un
-- método nuevo — ver pantalla "Pendientes" en el frontend. Idempotente: DROP+ADD
-- porque Postgres no tiene "ALTER CONSTRAINT ... ON DELETE" directo.
ALTER TABLE gasto ALTER COLUMN metodo_pago_id DROP NOT NULL;
ALTER TABLE gasto DROP CONSTRAINT IF EXISTS gasto_metodo_pago_id_fkey;
ALTER TABLE gasto ADD CONSTRAINT gasto_metodo_pago_id_fkey
  FOREIGN KEY (metodo_pago_id) REFERENCES metodo_pago(id) ON DELETE SET NULL;

ALTER TABLE compra_msi ALTER COLUMN tarjeta_id DROP NOT NULL;
ALTER TABLE compra_msi DROP CONSTRAINT IF EXISTS compra_msi_tarjeta_id_fkey;
ALTER TABLE compra_msi ADD CONSTRAINT compra_msi_tarjeta_id_fkey
  FOREIGN KEY (tarjeta_id) REFERENCES metodo_pago(id) ON DELETE SET NULL;

-- Mismo trato para borrar un rubro: los gastos/compras que lo usaban quedan con
-- rubro_id NULL (pendientes), no bloqueados ni perdidos. La aportación sí se
-- cascada-borra (aportacion(rubro_id) ON DELETE CASCADE, ya en su CREATE TABLE de
-- arriba): sin el rubro que fondeaba, esas aportaciones no tienen a dónde ir.
ALTER TABLE gasto ALTER COLUMN rubro_id DROP NOT NULL;
ALTER TABLE gasto DROP CONSTRAINT IF EXISTS gasto_rubro_id_fkey;
ALTER TABLE gasto ADD CONSTRAINT gasto_rubro_id_fkey
  FOREIGN KEY (rubro_id) REFERENCES rubro(id) ON DELETE SET NULL;

ALTER TABLE compra_msi ALTER COLUMN rubro_id DROP NOT NULL;
ALTER TABLE compra_msi DROP CONSTRAINT IF EXISTS compra_msi_rubro_id_fkey;
ALTER TABLE compra_msi ADD CONSTRAINT compra_msi_rubro_id_fkey
  FOREIGN KEY (rubro_id) REFERENCES rubro(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS cuota_msi (
  id                BIGSERIAL PRIMARY KEY,
  compra_id         BIGINT NOT NULL REFERENCES compra_msi(id) ON DELETE CASCADE,
  numero_cuota      INT NOT NULL,
  monto             BIGINT NOT NULL,
  fecha_vencimiento DATE NOT NULL,
  pagada            BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE (compra_id, numero_cuota)
);

-- Fase 2: salud financiera.
CREATE TABLE IF NOT EXISTS ingreso (
  id      BIGSERIAL PRIMARY KEY,
  fuente  TEXT NOT NULL,
  monto   BIGINT NOT NULL CHECK (monto > 0),
  periodo CHAR(7) NOT NULL  -- 'YYYY-MM'
);

-- Fase 3: snapshot de patrimonio neto, hacia adelante únicamente (sin reconstrucción
-- retroactiva — no hay datos históricos de balances antes de que esto existiera).
CREATE TABLE IF NOT EXISTS patrimonio_historico (
  periodo       CHAR(7) PRIMARY KEY,
  monto         BIGINT NOT NULL,
  registrado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gasto_fecha      ON gasto(fecha);
CREATE INDEX IF NOT EXISTS idx_aportacion_per   ON aportacion(periodo);
CREATE INDEX IF NOT EXISTS idx_cuota_venc       ON cuota_msi(fecha_vencimiento) WHERE NOT pagada;
CREATE INDEX IF NOT EXISTS idx_ingreso_per      ON ingreso(periodo);
