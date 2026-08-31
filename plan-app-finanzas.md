# Plan: App de Finanzas Personales

## 1. Objetivo
Control de gastos + métodos de pago + tarjetas de crédito con MSI + aportaciones variables de pareja por rubro + visibilidad de salud financiera con prioridades claras.

## 2. Decisiones de producto ya tomadas
- **Plataforma:** Web/PWA
- **Relación con pareja:** solo tú registras en la app; ella no tiene cuenta, solo define montos de aportación que tú capturas
- **Aportaciones de pareja:** variables, se capturan mes a mes (no son fijas recurrentes)
- **Detalle de MSI:** cada compra individual con su cronograma de pagos completo (no solo saldo total)
- **Deuda actual:** no hay saldo con interés en tarjetas, todo lo que se debe es MSI

## 3. Modelo de datos

### Métodos de pago
```
MetodoPago     (id, nombre, tipo: efectivo | debito | credito)
TarjetaCredito (extiende MetodoPago: limite, dia_corte, dia_pago)
```

### Compras a meses sin intereses (MSI)
```
CompraMSI (id, tarjeta_id, descripcion, monto_total, plazo_meses, fecha_compra)
CuotaMSI  (id, compra_id, numero_cuota, monto, fecha_vencimiento, pagada)
```
Las cuotas se generan automáticamente al registrar la compra. La compra en sí NO se vuelve a contar como "gasto" cada mes — solo su cuota correspondiente impacta el rubro.

### Presupuesto y rubros
```
Rubro      (id, nombre, tipo: gasto | ahorro)
Aportacion (id, rubro_id, fuente: yo | pareja, monto, periodo)
Gasto      (id, rubro_id, metodo_pago_id, monto, fecha, descripcion)
```
`tipo: ahorro` usa saldo acumulado (SUM aportaciones − SUM retiros) en vez de "disponible que se resetea cada mes".

### Salud financiera
```
Ingreso (id, fuente, monto, periodo)
```
`CompromisoFuturoMSI` y las métricas de salud (abajo) son vistas calculadas, no tablas nuevas.

## 4. Cálculos clave
- `Disponible(rubro, mes) = Aportaciones(yo+pareja) − Gastos del rubro en el mes`
- `Saldo tarjeta = Gastos normales sin cortar + Cuotas MSI del corte actual`
- `Compromiso futuro = SUM(CuotaMSI pendientes) agrupado por mes, próximos 6 meses`
- `Tasa de ahorro = (Ingreso − Gasto total) / Ingreso`
- `% Utilización de crédito = Saldo tarjeta / Límite de la tarjeta`
- `% Ingreso comprometido en MSI = Compromiso mensual MSI / Ingreso mensual` — guardrail sugerido: no superar 20-30%

## 5. Marco de prioridad financiera (dado que no hay deuda con interés)
1. Mini-colchón de emergencia — evita comprometer más MSI ante imprevistos
2. Guardrail activo de % de ingreso comprometido en MSI — frena nuevas compras, no acelera pago de lo ya comprometido (no tiene caso, no genera interés)
3. Fondo de emergencia completo (3-6 meses de gastos fijos)
4. Tasa de ahorro / inversión general

El gasto discrecional no es una meta aparte: es el mecanismo que financia 1, 3 y 4.

## 6. Ahorro (definido)
```
Rubro (id, nombre, tipo: gasto | ahorro, monto_objetivo NULLABLE)
```
Varias bolsas de ahorro con nombre propio. `% avance = SaldoAcumulado / monto_objetivo`.

## 7. Stack técnico y hosting (definido)
- **Backend:** Go
- **Frontend:** TypeScript (PWA)
- **Local dev:** Docker / Docker Compose
- **Hosting backend:** Render (free web service, deploy directo con Dockerfile, sin tarjeta; cold start ~30s tras 15 min sin uso — aceptable para uso personal)
- **Base de datos:** Neon (Postgres free permanente, sin tarjeta, 0.5GB, con branching)
- **Hosting frontend:** Vercel (free tier)
- Alternativa evaluada y descartada por ahora: VM único en Oracle Cloud Always Free (más control, pero recortes recientes de capacidad y sin backups automáticos — no vale la pena vs. la simplicidad de Render+Neon+Vercel para este caso)

## 8. Alcance / Roadmap (definido)

### Fase 1 — Loop principal (completo y correcto, sin atajos)
- Registrar gasto, asociado a rubro y método de pago
- Ver disponible por rubro (aportaciones yo + pareja − gastos del mes)
- Registrar compra MSI y generar su cronograma de cuotas
- Ver compromiso futuro MSI (próximos 6 meses, por tarjeta y total)
- Registrar aportación a una bolsa de ahorro y ver % de avance

### Fase 2 — Salud financiera extendida
- Ingreso total y tasa de ahorro
- % de utilización de crédito por tarjeta
- Patrimonio neto (activos − pasivos) en el tiempo
- Guardrail de % de ingreso comprometido en MSI
- Clasificación de gasto fijo vs discrecional

### Fase 3 — Alertas y refinamiento
- Alertas (compromiso MSI excedido, gasto discrecional por encima del rubro, utilización de crédito alta)
- Tendencia mes a mes (no solo snapshot actual)
- Fondo de emergencia como categoría con reglas propias (prioridad, no compite con otras metas)

## 9. Abierto / pendiente de definir
- Diseño de pantallas/vistas principales
