#!/usr/bin/env bash
# Siembra datos de demo realistas (no de prueba desechable como smoke.sh) para
# revisar la UI con algo que se parezca a uso real. Requiere la DB vacía o casi:
# corre TRUNCATE primero si vas a re-sembrar.
# Uso: docker compose up -d && ./backend/seed-demo.sh
set -euo pipefail
API=${API:-http://localhost:8081/api}
TOK=${APP_TOKEN:-dev}
post() { curl -sf -X POST "$API/$1" -H "Authorization: Bearer $TOK" -H 'Content-Type: application/json' -d "$2"; }

MES=$(date +%Y-%m)
MES_PASADO=$(date -d "$(date +%Y-%m-01) -1 month" +%Y-%m 2>/dev/null || date -v-1m +%Y-%m)

echo "Métodos de pago..."
BBVA=$(post metodos-pago '{"nombre":"BBVA Azul","tipo":"credito","limite":4500000,"dia_corte":15,"dia_pago":5}' | jq .id)
BANORTE=$(post metodos-pago '{"nombre":"Banorte Oro","tipo":"credito","limite":3000000,"dia_corte":20,"dia_pago":10}' | jq .id)
DEBITO=$(post metodos-pago '{"nombre":"Débito Nu","tipo":"debito"}' | jq .id)
EFECTIVO=$(post metodos-pago '{"nombre":"Efectivo","tipo":"efectivo"}' | jq .id)

echo "Rubros de gasto..."
SUPER=$(post rubros '{"nombre":"Súper y despensa","tipo":"gasto"}' | jq .id)
COMIDA=$(post rubros '{"nombre":"Comida fuera","tipo":"gasto"}' | jq .id)
TRANSPORTE=$(post rubros '{"nombre":"Transporte","tipo":"gasto"}' | jq .id)
CASA=$(post rubros '{"nombre":"Casa y servicios","tipo":"gasto"}' | jq .id)
ENTRETENIMIENTO=$(post rubros '{"nombre":"Entretenimiento","tipo":"gasto"}' | jq .id)

echo "Bolsas de ahorro..."
EMERGENCIA=$(post rubros '{"nombre":"Fondo de emergencia","tipo":"ahorro","monto_objetivo":6000000}' | jq .id)
VIAJE=$(post rubros '{"nombre":"Viaje a Japón","tipo":"ahorro","monto_objetivo":4000000}' | jq .id)
COCHE=$(post rubros '{"nombre":"Enganche coche","tipo":"ahorro","monto_objetivo":8000000}' | jq .id)

echo "Aportaciones del mes a rubros de gasto..."
post aportaciones "{\"rubro_id\":$SUPER,\"fuente\":\"yo\",\"monto\":400000,\"periodo\":\"$MES\"}" >/dev/null
post aportaciones "{\"rubro_id\":$SUPER,\"fuente\":\"pareja\",\"monto\":300000,\"periodo\":\"$MES\"}" >/dev/null
post aportaciones "{\"rubro_id\":$COMIDA,\"fuente\":\"yo\",\"monto\":150000,\"periodo\":\"$MES\"}" >/dev/null
post aportaciones "{\"rubro_id\":$COMIDA,\"fuente\":\"pareja\",\"monto\":100000,\"periodo\":\"$MES\"}" >/dev/null
post aportaciones "{\"rubro_id\":$TRANSPORTE,\"fuente\":\"yo\",\"monto\":180000,\"periodo\":\"$MES\"}" >/dev/null
post aportaciones "{\"rubro_id\":$CASA,\"fuente\":\"yo\",\"monto\":600000,\"periodo\":\"$MES\"}" >/dev/null
post aportaciones "{\"rubro_id\":$CASA,\"fuente\":\"pareja\",\"monto\":300000,\"periodo\":\"$MES\"}" >/dev/null
post aportaciones "{\"rubro_id\":$ENTRETENIMIENTO,\"fuente\":\"yo\",\"monto\":120000,\"periodo\":\"$MES\"}" >/dev/null

echo "Aportaciones acumuladas a bolsas de ahorro (mes pasado + este mes)..."
post aportaciones "{\"rubro_id\":$EMERGENCIA,\"fuente\":\"yo\",\"monto\":1000000,\"periodo\":\"$MES_PASADO\"}" >/dev/null
post aportaciones "{\"rubro_id\":$EMERGENCIA,\"fuente\":\"yo\",\"monto\":800000,\"periodo\":\"$MES\"}" >/dev/null
post aportaciones "{\"rubro_id\":$VIAJE,\"fuente\":\"pareja\",\"monto\":1530000,\"periodo\":\"$MES_PASADO\"}" >/dev/null
post aportaciones "{\"rubro_id\":$COCHE,\"fuente\":\"yo\",\"monto\":400000,\"periodo\":\"$MES\"}" >/dev/null

echo "Gastos del mes..."
HOY=$(date +%F)
post gastos "{\"rubro_id\":$SUPER,\"metodo_pago_id\":$BBVA,\"monto\":98000,\"fecha\":\"$HOY\",\"descripcion\":\"Despensa semanal\"}" >/dev/null
post gastos "{\"rubro_id\":$SUPER,\"metodo_pago_id\":$EFECTIVO,\"monto\":43000,\"fecha\":\"$HOY\",\"descripcion\":\"Verdulería\"}" >/dev/null
post gastos "{\"rubro_id\":$SUPER,\"metodo_pago_id\":$DEBITO,\"monto\":186000,\"fecha\":\"$HOY\",\"descripcion\":\"Costco\"}" >/dev/null
post gastos "{\"rubro_id\":$COMIDA,\"metodo_pago_id\":$BBVA,\"monto\":45000,\"fecha\":\"$HOY\",\"descripcion\":\"Cena viernes\"}" >/dev/null
post gastos "{\"rubro_id\":$TRANSPORTE,\"metodo_pago_id\":$DEBITO,\"monto\":80000,\"fecha\":\"$HOY\",\"descripcion\":\"Gasolina\"}" >/dev/null
post gastos "{\"rubro_id\":$CASA,\"metodo_pago_id\":$DEBITO,\"monto\":650000,\"fecha\":\"$HOY\",\"descripcion\":\"Renta\"}" >/dev/null
post gastos "{\"rubro_id\":$ENTRETENIMIENTO,\"metodo_pago_id\":$BANORTE,\"monto\":135000,\"fecha\":\"$HOY\",\"descripcion\":\"Streaming + cine\"}" >/dev/null

echo "Compras a meses..."
post compras-msi "{\"tarjeta_id\":$BBVA,\"rubro_id\":$CASA,\"descripcion\":\"Refrigerador Mabe\",\"monto_total\":1200000,\"plazo_meses\":12,\"fecha_compra\":\"$HOY\"}" >/dev/null
post compras-msi "{\"tarjeta_id\":$BANORTE,\"rubro_id\":$ENTRETENIMIENTO,\"descripcion\":\"Laptop\",\"monto_total\":1800000,\"plazo_meses\":6,\"fecha_compra\":\"$HOY\"}" >/dev/null

echo "Listo. Resumen:"
curl -sf "$API/resumen" -H "Authorization: Bearer $TOK" | jq .
