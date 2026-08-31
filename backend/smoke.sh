#!/usr/bin/env bash
# Recorre el loop de la Fase 1 contra una API viva y verifica los cálculos.
# Uso: docker compose up -d && ./backend/smoke.sh
set -euo pipefail
API=${API:-http://localhost:8081/api}
TOK=${APP_TOKEN:-dev}
post() { curl -sf -X POST "$API/$1" -H "Authorization: Bearer $TOK" -H 'Content-Type: application/json' -d "$2"; }
get()  { curl -sf "$API/$1" -H "Authorization: Bearer $TOK"; }

MES=$(date +%Y-%m)
TARJ=$(post metodos-pago '{"nombre":"Nu","tipo":"credito","limite":5000000,"dia_corte":15,"dia_pago":5}' | jq .id)
COMIDA=$(post rubros '{"nombre":"Comida","tipo":"gasto"}' | jq .id)
FONDO=$(post rubros '{"nombre":"Emergencia","tipo":"ahorro","monto_objetivo":6000000}' | jq .id)

post aportaciones "{\"rubro_id\":$COMIDA,\"fuente\":\"yo\",\"monto\":400000,\"periodo\":\"$MES\"}" >/dev/null
post aportaciones "{\"rubro_id\":$COMIDA,\"fuente\":\"pareja\",\"monto\":100000,\"periodo\":\"$MES\"}" >/dev/null
post aportaciones "{\"rubro_id\":$FONDO,\"fuente\":\"yo\",\"monto\":1500000,\"periodo\":\"$MES\"}" >/dev/null
post gastos "{\"rubro_id\":$COMIDA,\"metodo_pago_id\":$TARJ,\"monto\":120000,\"fecha\":\"$(date +%F)\",\"descripcion\":\"super\"}" >/dev/null

CUOTAS=$(post compras-msi "{\"tarjeta_id\":$TARJ,\"rubro_id\":$COMIDA,\"descripcion\":\"licuadora\",\"monto_total\":100000,\"plazo_meses\":3,\"fecha_compra\":\"$(date +%F)\"}" | jq '.cuotas | length')
[ "$CUOTAS" = 3 ] || { echo "esperaba 3 cuotas, hubo $CUOTAS"; exit 1; }

R=$(get "resumen?periodo=$MES")
DISP=$(echo "$R" | jq --argjson id "$COMIDA" '.rubros[] | select(.id==$id) | .disponible')
CUOTA_MES=$(echo "$R" | jq --argjson id "$COMIDA" '.rubros[] | select(.id==$id) | .cuotas_msi')
# 400000 + 100000 − 120000 − cuota del mes
[ "$DISP" = "$((500000 - 120000 - CUOTA_MES))" ] || { echo "disponible $DISP no cuadra"; exit 1; }

AVANCE=$(echo "$R" | jq --argjson id "$FONDO" '.ahorro[] | select(.id==$id) | .avance_pct')
[ "$AVANCE" = "25" ] || { echo "avance $AVANCE != 25"; exit 1; }

# compromiso_msi.total es global (todas las tarjetas, todas las corridas previas
# contra esta misma DB) — no idempotente. Se filtra por la tarjeta de esta corrida.
TOTAL=$(echo "$R" | jq --argjson id "$TARJ" '[.compromiso_msi.meses[].por_tarjeta[] | select(.tarjeta_id==$id) | .monto] | add')
[ "$TOTAL" = 100000 ] || { echo "compromiso $TOTAL != 100000"; exit 1; }

# sin token la API rechaza
curl -sf -o /dev/null "$API/rubros" && { echo "la API respondió sin token"; exit 1; }

echo "smoke OK — disponible=$DISP cuotas_mes=$CUOTA_MES compromiso=$TOTAL"
