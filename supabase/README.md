# Supabase — Fase 1 del plan de escalado a usuarios

Esto es trabajo en progreso de la migración descrita en
`notas-internas/escalado_a_usuarios.md` (no versionado en git — pídesela al
autor del proyecto si la necesitas). **No está conectado al frontend ni
reemplaza al backend de Go/Render en producción todavía** — es la Fase 1:
validar que el schema actual funciona igual vía PostgREST puro, sin backend
propio, antes de sumarle multi-tenant (hogares/RLS) y usuarios reales.

## Correr en local

```bash
npm install               # instala el CLI de Supabase (raíz del repo)
npx supabase start        # levanta Postgres + Auth + PostgREST en Docker
npx supabase db reset     # aplica las migraciones desde cero
bash supabase/smoke.sh    # CRUD real vía PostgREST — sin esto no se sabe si algo se rompió
npx supabase stop         # apaga el stack cuando termines
```

`supabase start` imprime las URLs y llaves locales (anon/service role) —
son fijas para cualquier proyecto local, no son secretas, no hace falta
guardarlas en ningún lado.

## Qué hay aquí

- `migrations/` — el schema, versionado. `20260903043702_schema_base.sql`
  es el mismo modelo de datos de `backend/schema.sql` (Neon) portado 1:1,
  **sin** `hogar_id` ni RLS todavía — eso es la Fase 3 del plan.
- `smoke.sh` — equivalente a `backend/smoke.sh`, pero contra el stack local
  de Supabase en vez de la API de Go. No necesita ser idempotente (a
  diferencia del de Go) porque corre contra una DB que se resetea con
  `db reset`, no una persistente compartida.

## Qué falta (ver el plan completo en notas-internas/)

Fase 2 en adelante: portar `generarCuotas`/`resumen()`/`tendencia()` a
funciones de Postgres, `hogar`/`perfil`/RLS, `aportacion.fuente` →
`usuario_id`, reescribir `api.ts` del frontend con `supabase-js`, y
finalmente el cutover de producción (Neon/Render se dan de baja).
