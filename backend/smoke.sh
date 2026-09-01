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

# --- Fase 3 ---

# fondo de emergencia: es un singleton (índice único) — limpiar cualquier rubro
# marcado por una corrida anterior de este mismo script antes de marcar el propio,
# para que esto sea rerunnable contra la misma DB persistente.
PREV_FONDO=$(get rubros | jq -r '[.[] | select(.es_fondo_emergencia==true)][0]')
if [ "$PREV_FONDO" != "null" ]; then
  PREV_ID=$(echo "$PREV_FONDO" | jq -r .id)
  PREV_NOMBRE=$(echo "$PREV_FONDO" | jq -r .nombre)
  curl -sf -X PATCH "$API/rubros/$PREV_ID" -H "Authorization: Bearer $TOK" -H 'Content-Type: application/json' \
    -d "{\"nombre\":\"$PREV_NOMBRE\",\"es_fondo_emergencia\":false}" >/dev/null
fi
curl -sf -X PATCH "$API/rubros/$FONDO" -H "Authorization: Bearer $TOK" -H 'Content-Type: application/json' \
  -d '{"nombre":"Emergencia","monto_objetivo":6000000,"es_fondo_emergencia":true}' >/dev/null
FONDO_RESP=$(get "resumen?periodo=$MES")
FONDO_ID=$(echo "$FONDO_RESP" | jq '.fondo_emergencia.rubro_id')
[ "$FONDO_ID" = "$FONDO" ] || { echo "fondo_emergencia.rubro_id $FONDO_ID != $FONDO"; exit 1; }

# tendencia: el mes actual debe aparecer con al menos las aportaciones/gastos de esta corrida.
TEND_MESES=$(get "tendencia?meses=3" | jq '.meses | length')
[ "$TEND_MESES" = 3 ] || { echo "tendencia trajo $TEND_MESES meses, esperaba 3"; exit 1; }

# aportaciones ahora tiene GET — debe listar al menos las que creó esta corrida.
APORT_COUNT=$(get "aportaciones?periodo=$MES" | jq 'length')
[ "$APORT_COUNT" -ge 3 ] || { echo "GET aportaciones trajo $APORT_COUNT, esperaba al menos 3"; exit 1; }

# export: debe incluir el rubro marcado como fondo de emergencia.
EXPORT_FONDO=$(get "export" | jq --argjson id "$FONDO" '.rubro[] | select(.id==$id) | .es_fondo_emergencia')
[ "$EXPORT_FONDO" = "true" ] || { echo "export no trae es_fondo_emergencia=true en rubro $FONDO"; exit 1; }

# sin token la API rechaza
curl -sf -o /dev/null "$API/rubros" && { echo "la API respondió sin token"; exit 1; }

echo "smoke OK — disponible=$DISP cuotas_mes=$CUOTA_MES compromiso=$TOTAL fondo_emergencia=$FONDO_ID tendencia_meses=$TEND_MESES"
