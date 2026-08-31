# Finanzas (Fase 1)

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
cuota_msi, compra_msi, gasto, aportacion, rubro, metodo_pago RESTART IDENTITY
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

Diferencias con el diseño, por datos que el backend de Fase 1 no tiene todavía:
- **Home**: sin el tile de "% de ingreso comprometido" (necesita `Ingreso`, Fase 2).
- **Compra a meses**: se agregó un selector de **Rubro** que el mockup no traía — el
  backend exige `compra_msi.rubro_id` y el diseño no lo contemplaba.
- **Métodos de pago**: sin "saldo" ni "% de utilización" por tarjeta — no son datos
  derivables de lo que hay hoy (no existe "saldo actual del corte" como endpoint), y
  tampoco se guardan los últimos 4 dígitos de la tarjeta.
- **Cronograma en "Compra a meses"**: la vista previa antes de guardar es un estimado
  simple (monto ÷ plazo); las fechas reales del ciclo de corte/pago sólo se muestran
  después de guardar, con los datos que regresa el POST — evita duplicar la lógica de
  `generarCuotas` en TypeScript.

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
| GET | `/api/resumen` | `?periodo=YYYY-MM` (default: mes actual) |

`/api/resumen` es la vista de la Fase 1: disponible por rubro, avance de cada bolsa de
ahorro y compromiso MSI de los próximos 6 meses por mes y por tarjeta.

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
- **"% de ingreso comprometido" en el home**: el diseño lo pide en la tarjeta principal,
  pero requiere `Ingreso` (Fase 2, no existe todavía). El frontend lo omite por ahora en
  vez de inventar el dato; se agrega cuando exista el endpoint de ingresos.

## Deploy
Render lee el `backend/Dockerfile`. Variables: `DATABASE_URL` (Neon), `APP_TOKEN`,
`CORS_ORIGIN` (el dominio de Vercel). El esquema se aplica solo al arrancar.
