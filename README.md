# Finanzas (Fase 1 + 2)

Go + Postgres en el backend. Todo el dinero se maneja en **centavos** (enteros), nunca
en flotantes. Frontend: PWA en TypeScript vanilla (sin framework) + Vite.

## Backend — correr en local
```bash
docker compose up -d --build
./backend/smoke.sh          # recorre el loop completo y verifica los cálculos
cd backend && go test ./... # cronograma MSI (sin base de datos)
```
La API queda en `http://localhost:8081/api`, la base en el puerto `5433`.

`./backend/seed-demo.sh` siembra datos de demo realistas (varios rubros, tarjetas,
bolsas de ahorro con avance, un rubro sobrepasado a propósito) para revisar el
frontend con algo parecido a uso real, no con los datos desechables de `smoke.sh`.
Corre `smoke.sh` después y vas a mezclar ambos — si quieres la demo limpia, trunca la
DB primero (`docker exec followme-db-1 psql -U postgres -d finanzas -c "TRUNCATE
cuota_msi, compra_msi, gasto, aportacion, ingreso, rubro, metodo_pago RESTART IDENTITY
CASCADE;"`).

## Frontend — correr en local
```bash
cd web
npm install
cp .env.example .env   # ajusta VITE_APP_TOKEN si no usas "dev"
npm run dev             # http://localhost:5173, requiere la API arriba
```
Diseño fuente en `diseño de aplicacion/` (handoff de Claude Design): dirección de
inicio **1a** confirmada. Las 7 pantallas están construidas y conectadas a la API real
— ver `web/src/screens/`. `/gastos` (lista de todos los movimientos) se agregó sin
estar en el diseño original: el ítem del nav ya existía y sin pantalla real era un
callejón sin salida.

El diseño (las 6 pantallas del handoff) no incluía cómo crear categorías/bolsas, cómo
aportar a un rubro de gasto ("presupuesto"), ni cómo editar o borrar algo ya cargado —
se agregó todo eso porque sin ello la app no se puede usar de verdad: nueva categoría/
bolsa (`/rubro/nuevo`), aportación desde el detalle de un rubro de gasto, editar
(nombre/meta/límite) en rubro y método de pago, borrar gasto/aportación/compra MSI. El
botón central del nav dejó de ir directo a "nuevo gasto": ahora abre un menú corto con
las 4 acciones de crear.

Diferencias con el diseño:
- **Compra a meses**: se agregó un selector de **Rubro** que el mockup no traía — el
  backend exige `compra_msi.rubro_id` y el diseño no lo contemplaba.
- **Cronograma en "Compra a meses"**: la vista previa antes de guardar es un estimado
  simple (monto ÷ plazo); las fechas reales del ciclo de corte/pago sólo se muestran
  después de guardar, con los datos que regresa el POST — evita duplicar la lógica de
  `generarCuotas` en TypeScript.
- **Métodos de pago**: sí muestra saldo y % de utilización por tarjeta (Fase 2, ver
  abajo), pero no los últimos 4 dígitos — ese dato nunca se guarda.

## Candado de acceso
El link de Vercel es público. En vez de token horneado en el build (`VITE_` lo expone a
cualquiera que abra el inspector), la app pide un código de acceso una vez por
dispositivo (`web/src/gate.ts`), lo valida contra la API real, y lo guarda solo en
`localStorage` — nunca viaja en el JS. En dev local, `VITE_APP_TOKEN` en `.env` sigue
saltando el candado por comodidad. Sigue siendo un solo código compartido, no cuentas
separadas — cualquiera con el código ve y edita los mismos datos.

## Fase 2 — salud financiera
Pantalla nueva `/salud` (enlazada desde Home, no es un tab del nav de abajo — igual que
Métodos de pago). Decisiones de diseño que el plan dejaba abiertas:
- **Patrimonio neto**: número actual (`ahorro total − compromiso MSI pendiente TOTAL`,
  no solo los próximos 6 meses que usa `/api/resumen` en otras partes). Sin histórico
  todavía — el plan mismo separa "tendencia mes a mes" como cosa de Fase 3.
- **Fijo vs discrecional**: se clasifica por **rubro** (`rubro.clasificacion`), no por
  gasto individual — misma granularidad que ya usa toda la app. Un rubro sin clasificar
  cuenta aparte (`gasto_sin_clasificar`), nunca se mezcla ni se oculta.
- **Guardrail MSI**: aviso visual en 20% (ámbar) y 30% (rojo) de ingreso comprometido,
  como dice el plan — no bloquea la compra, solo avisa. Se muestra también *antes* de
  guardar una compra nueva (con la cuota mensual estimada sumada al compromiso actual).
- **Saldo de tarjeta / % utilización**: simplificado a mes calendario (gasto normal del
  mes + cuotas MSI que vencen ese mes), igual que "Disponible" en el resto de la app —
  no por ciclo de corte exacto día a día. Ver `resumen.go`.
- **`Ingreso.fuente`**: texto libre (ej. "Salario", "Freelance"), no está limitado a
  yo/pareja como `aportacion.fuente`.

## API
Todas las rutas piden `Authorization: Bearer $APP_TOKEN` cuando la variable está definida.

| Método | Ruta | Notas |
|---|---|---|
| POST/GET | `/api/metodos-pago` | `tipo`: efectivo \| debito \| credito. Crédito exige `limite`, `dia_corte`, `dia_pago` |
| PATCH | `/api/metodos-pago/{id}` | Edita nombre/límite/corte/pago. `tipo` no se puede cambiar (ver más abajo) |
| POST/GET | `/api/rubros` | `tipo`: gasto \| ahorro. Ahorro acepta `monto_objetivo` |
| PATCH | `/api/rubros/{id}` | Edita nombre/monto_objetivo. `tipo` tampoco se puede cambiar |
| POST | `/api/aportaciones` | `fuente`: yo \| pareja, `periodo`: `YYYY-MM` |
| DELETE | `/api/aportaciones/{id}` | Corregir un monto mal capturado es borrar y volver a capturar |
| POST/GET | `/api/gastos` | `?periodo=YYYY-MM` filtra |
| DELETE | `/api/gastos/{id}` | |
| POST/GET | `/api/compras-msi` | genera el cronograma de cuotas al crear |
| DELETE | `/api/compras-msi/{id}` | Borra también sus cuotas (`ON DELETE CASCADE`) |
| PATCH | `/api/cuotas/{id}` | `{"pagada":true}` |
| POST/GET | `/api/ingresos` | `?periodo=YYYY-MM` filtra |
| DELETE | `/api/ingresos/{id}` | |
| GET | `/api/resumen` | `?periodo=YYYY-MM` (default: mes actual) |

`/api/resumen` trae todo: disponible por rubro, avance de ahorro, compromiso MSI a 6
meses, y (Fase 2) `ingreso_total`, `tarjetas[]` (saldo/% utilización) y `salud`
(tasa de ahorro, % ingreso comprometido en MSI, patrimonio neto, gasto fijo/discrecional).

**Por qué no hay `PATCH`/`DELETE` para todo:** rubro y método de pago son configuración
(su nombre, límite o meta cambian con el tiempo sin que tenga sentido borrar y
recrear), así que llevan edición real. Gasto, aportación y compra MSI son movimientos
— corregir uno mal capturado es borrarlo y volver a capturarlo, no editarlo in situ.
`tipo` es inmutable en ambos editables: pasar un rubro de gasto a ahorro (o un método
de débito a crédito) cambia qué campos son válidos, no es un simple cambio de nombre.

## Decisiones que el plan dejaba abiertas
- **`compra_msi.rubro_id`**: el plan dice que "la cuota impacta el rubro" pero el modelo
  no traía rubro en la compra. Se agregó, y el disponible del mes resta la cuota que vence
  en ese mes, no la compra completa.
- **Fechas de cuota**: la cuota cae en el ciclo real de la tarjeta (corte / pago), y el día
  se recorta al último del mes si hace falta. Está aislado en `generarCuotas` por si el
  banco calcula distinto y hay que ajustar.
- **Auth**: un solo token compartido, sin cuentas — el plan dice que la pareja no tiene cuenta.

## Deploy
Render lee el `backend/Dockerfile`. Variables: `DATABASE_URL` (Neon), `APP_TOKEN`,
`CORS_ORIGIN` (el dominio de Vercel). El esquema se aplica solo al arrancar.
