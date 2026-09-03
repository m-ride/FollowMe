# Supabase — Fase 1 del plan de escalado a usuarios

Esto es trabajo en progreso de la migración descrita en
`notas-internas/escalado_a_usuarios.md` (no versionado en git — pídesela al
autor del proyecto si la necesitas). **No está conectado al frontend ni
reemplaza al backend de Go/Render en producción todavía** — es la Fase 1:
validar que el schema actual funciona igual vía PostgREST puro, sin backend
propio, antes de sumarle multi-tenant (hogares/RLS) y usuarios reales.

## Correr en local

```bash
npm install                    # instala el CLI de Supabase (raíz del repo)
npx supabase start             # levanta Postgres + Auth + PostgREST en Docker
npx supabase db reset          # aplica las migraciones desde cero
npx supabase test db --local   # pgTAP — generar_cuotas/en_dia contra los mismos casos que msi_test.go
bash supabase/smoke.sh         # e2e vía PostgREST/RPC — resumen()/tendencia()/crear_compra_msi()
npx supabase stop              # apaga el stack cuando termines
```

`supabase start` imprime las URLs y llaves locales (anon/service role) —
son fijas para cualquier proyecto local, no son secretas, no hace falta
guardarlas en ningún lado.

## Qué hay aquí

- `migrations/20260903043702_schema_base.sql` — el mismo modelo de datos de
  `backend/schema.sql` (Neon) portado 1:1, **sin** `hogar_id` ni RLS
  todavía — eso es la Fase 3 del plan.
- `migrations/20260903044833_funciones_negocio.sql` — puerto de
  `backend/{msi,resumen,tendencia}.go` a funciones de Postgres
  (`generar_cuotas`, `crear_compra_msi`, `resumen`, `tendencia`,
  `tendencia_rubros`, `tendencia_tarjetas`), llamadas vía
  `supabase.rpc(...)`. Cada función tiene un comentario señalando de qué
  archivo/función de Go viene, para comparar línea por línea.
- `tests/database/generar_cuotas.test.sql` — pgTAP con los mismos 4 casos
  que `backend/msi_test.go` (compra antes/después del corte, pago antes del
  corte, día 31 recortado a fin de mes). Verificado manualmente que los
  valores devueltos coinciden exactamente con los del test de Go.
- `smoke.sh` — equivalente a `backend/smoke.sh`: usa **el mismo escenario
  numérico exacto** (mismos montos, mismo cálculo esperado de disponible/
  avance/compromiso) para poder comparar 1:1 que `resumen()`/`tendencia()`/
  `crear_compra_msi()` en Postgres dan los mismos resultados que sus
  equivalentes en Go. No necesita ser idempotente (a diferencia del de Go)
  porque corre contra una DB que se resetea con `db reset`.

## Qué falta (ver el plan completo en notas-internas/)

Fase 3 en adelante: `hogar`/`perfil`/RLS (con el check de CI que exige RLS
habilitado en toda tabla), `aportacion.fuente` → `usuario_id`, reescribir
`api.ts` del frontend con `supabase-js`, y finalmente el cutover de
producción (Neon/Render se dan de baja).
