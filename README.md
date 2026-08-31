# Finanzas — backend (Fase 1)

Go + Postgres. Todo el dinero se maneja en **centavos** (enteros), nunca en flotantes.

## Correr en local
```bash
docker compose up -d --build
./backend/smoke.sh          # recorre el loop completo y verifica los cálculos
cd backend && go test ./... # cronograma MSI (sin base de datos)
```
La API queda en `http://localhost:8081/api`, la base en el puerto `5433`.

## API
Todas las rutas piden `Authorization: Bearer $APP_TOKEN` cuando la variable está definida.

| Método | Ruta | Notas |
|---|---|---|
| POST/GET | `/api/metodos-pago` | `tipo`: efectivo \| debito \| credito. Crédito exige `limite`, `dia_corte`, `dia_pago` |
| POST/GET | `/api/rubros` | `tipo`: gasto \| ahorro. Ahorro acepta `monto_objetivo` |
| POST | `/api/aportaciones` | `fuente`: yo \| pareja, `periodo`: `YYYY-MM` |
| POST/GET | `/api/gastos` | `?periodo=YYYY-MM` filtra |
| POST/GET | `/api/compras-msi` | genera el cronograma de cuotas al crear |
| PATCH | `/api/cuotas/{id}` | `{"pagada":true}` |
| GET | `/api/resumen` | `?periodo=YYYY-MM` (default: mes actual) |

`/api/resumen` es la vista de la Fase 1: disponible por rubro, avance de cada bolsa de
ahorro y compromiso MSI de los próximos 6 meses por mes y por tarjeta.

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
