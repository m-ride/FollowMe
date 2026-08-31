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

CREATE TABLE IF NOT EXISTS aportacion (
  id       BIGSERIAL PRIMARY KEY,
  rubro_id BIGINT NOT NULL REFERENCES rubro(id) ON DELETE CASCADE,
  fuente   TEXT NOT NULL CHECK (fuente IN ('yo','pareja')),
  monto    BIGINT NOT NULL CHECK (monto > 0),
  periodo  CHAR(7) NOT NULL  -- 'YYYY-MM'
);

CREATE TABLE IF NOT EXISTS gasto (
  id             BIGSERIAL PRIMARY KEY,
  rubro_id       BIGINT NOT NULL REFERENCES rubro(id),
  metodo_pago_id BIGINT NOT NULL REFERENCES metodo_pago(id),
  monto          BIGINT NOT NULL CHECK (monto > 0),
  fecha          DATE NOT NULL,
  descripcion    TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS compra_msi (
  id           BIGSERIAL PRIMARY KEY,
  tarjeta_id   BIGINT NOT NULL REFERENCES metodo_pago(id),
  rubro_id     BIGINT NOT NULL REFERENCES rubro(id),
  descripcion  TEXT NOT NULL DEFAULT '',
  monto_total  BIGINT NOT NULL CHECK (monto_total > 0),
  plazo_meses  INT NOT NULL CHECK (plazo_meses BETWEEN 1 AND 48),
  fecha_compra DATE NOT NULL
);

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

CREATE INDEX IF NOT EXISTS idx_gasto_fecha      ON gasto(fecha);
CREATE INDEX IF NOT EXISTS idx_aportacion_per   ON aportacion(periodo);
CREATE INDEX IF NOT EXISTS idx_cuota_venc       ON cuota_msi(fecha_vencimiento) WHERE NOT pagada;
CREATE INDEX IF NOT EXISTS idx_ingreso_per      ON ingreso(periodo);
