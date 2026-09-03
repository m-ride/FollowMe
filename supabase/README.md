# Supabase — plan de escalado a usuarios (Fases 1-3)

Esto es trabajo en progreso de la migración descrita en
`notas-internas/escalado_a_usuarios.md` (no versionado en git — pídesela al
autor del proyecto si la necesitas). **No está conectado al frontend ni
reemplaza al backend de Go/Render en producción todavía.**

## Correr en local

```bash
npm install                    # instala el CLI de Supabase (raíz del repo)
npx supabase start             # levanta Postgres + Auth + PostgREST en Docker
npx supabase db reset          # aplica las migraciones desde cero
npx supabase test db --local   # pgTAP — generar_cuotas + aislamiento RLS entre hogares
bash supabase/smoke.sh         # e2e vía Auth+PostgREST/RPC, con sesión real
npx supabase stop              # apaga el stack cuando termines
```

`supabase start` imprime las URLs y llaves locales (anon/service role) —
son fijas para cualquier proyecto local, no son secretas, no hace falta
guardarlas en ningún lado.

## Qué hay aquí

- `migrations/20260903043702_schema_base.sql` — el mismo modelo de datos de
  `backend/schema.sql` (Neon) portado 1:1, sin `hogar_id` ni RLS.
- `migrations/20260903044833_funciones_negocio.sql` — puerto de
  `backend/{msi,resumen,tendencia}.go` a funciones de Postgres
  (`generar_cuotas`, `crear_compra_msi`, `resumen`, `tendencia`,
  `tendencia_rubros`, `tendencia_tarjetas`), llamadas vía
  `supabase.rpc(...)`. Cada función tiene un comentario señalando de qué
  archivo/función de Go viene, para comparar línea por línea.
- `migrations/20260903045900_hogares_perfiles_rls.sql` — `hogar` + `perfil`,
  `hogar_id` en las 8 tablas de datos con un trigger (`set_hogar_id`) que
  siempre lo pone desde el perfil del usuario autenticado — el cliente
  nunca lo manda, no hay forma de insertar en el hogar de alguien más. RLS
  habilitado en las 10 tablas de `public`, una sola política por tabla de
  datos (`hogar_id = mi_hogar_id()`). `mi_hogar_id()` es `security definer`
  a propósito (comentado en la migración el porqué es seguro).
- `tests/database/generar_cuotas.test.sql` — pgTAP con los mismos 4 casos
  que `backend/msi_test.go` (compra antes/después del corte, pago antes del
  corte, día 31 recortado a fin de mes). Verificado manualmente que los
  valores devueltos coinciden exactamente con los del test de Go.
- `tests/database/rls.test.sql` — la prueba real de aislamiento: dos
  hogares, dos usuarios, uno inserta un rubro, el otro confirma que ve 0
  filas. También el check de "ninguna tabla de public sin RLS habilitado"
  (la salvaguarda obligatoria del plan, §3).
- `smoke.sh` — dos partes. (1) equivalente a `backend/smoke.sh`: usa **el
  mismo escenario numérico exacto** para comparar 1:1 que `resumen()`/
  `tendencia()`/`crear_compra_msi()` en Postgres dan los mismos resultados
  que sus equivalentes en Go. (2) da de alta un usuario real (vía service
  role, como haría el admin de un hogar — ver §5 del plan), inicia sesión
  como esa persona para todas las operaciones (ya no se puede operar solo
  con la llave `anon`, RLS lo bloquea), y al final crea un **segundo**
  hogar/usuario para confirmar por HTTP real que no ve ni una fila del
  primero. No necesita ser idempotente (a diferencia de `backend/smoke.sh`)
  porque corre contra una DB que se resetea con `db reset`.

- `migrations/20260903050941_aportantes.sql` — `aportacion.fuente`
  (`'yo'|'pareja'`, enum fijo de 2 valores) se reemplaza por `usuario_id`
  (cualquier `perfil` del hogar). `resumen()` actualizado:
  `rubros[].aportado_yo/aportado_pareja` pasa a ser
  `rubros[].aportaciones[]`, una fila por aportante con su nombre (de
  `perfil`) y el monto. `smoke.sh` ahora da de alta un segundo miembro del
  mismo hogar para probar que el arreglo trae a los dos, no solo que el
  campo existe.

- **`web/src/api.ts` reescrito con `supabase-js`** — CRUD simple vía
  PostgREST directo, `resumen`/`tendencia*`/`crear_compra_msi` vía
  `supabase.rpc(...)`. `web/src/gate.ts` es ahora un login real (email +
  password, `supabase.auth.signInWithPassword`) en vez del candado de un
  solo secreto compartido — la sesión la persiste sola `supabase-js`
  (`web/src/supabase.ts`). Pantallas con pills "Tú/Pareja" (`nuevoGasto.ts`,
  `detalleRubro.ts`, `ahorro.ts`) ahora arman un selector dinámico de los
  miembros reales del hogar. `NOMBRE`/`PAREJA_NOMBRE` (antes env vars de
  build) se reemplazan por el nombre real de cada `perfil`.
  Probado de punta a punta con Playwright contra el stack local (login,
  crear gasto, crear compra MSI con cronograma, borrar método de pago y
  verlo aparecer en Pendientes, exportar respaldo) — no solo que compile.
  **`web/.env` sigue apuntando al stack local — nada de esto toca
  producción todavía** (Vercel/Render no se tocan hasta el cutover).

## Qué falta (ver el plan completo en notas-internas/)

El cutover de producción: crear el proyecto real de Supabase en la nube,
migrar los datos reales de Neon, apuntar `web/.env` de Vercel a ese
proyecto, y dar de baja Neon/Render.
