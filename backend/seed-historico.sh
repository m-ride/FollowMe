#!/usr/bin/env bash
# Backfilla 2 meses adicionales (pasado y antepasado) de aportaciones/gastos/ingresos
# sobre los rubros/métodos que ya sembró seed-demo.sh, con montos que varían un poco
# mes a mes — para poder revisar /api/tendencia (tasa de ahorro, gasto fijo/
# discrecional) con datos reales en vez de un solo mes plano.
# Uso: ./backend/seed-demo.sh && ./backend/seed-historico.sh
set -euo pipefail
API=${API:-http://localhost:8081/api}
TOK=${APP_TOKEN:-dev}
post() { curl -sf -X POST "$API/$1" -H "Authorization: Bearer $TOK" -H 'Content-Type: application/json' -d "$2"; }
get() { curl -sf "$API/$1" -H "Authorization: Bearer $TOK"; }

# Resuelve ids por nombre (los que puso seed-demo.sh) en vez de hardcodear — si el
# nombre no existe (seed-demo.sh no corrió, o el catálogo cambió) truena temprano.
id_de() {
  local id
  id=$(get "$1" | jq -r --arg n "$2" '[.[] | select(.nombre==$n)][0].id // empty')
  if [ -z "$id" ]; then
    echo "no encontré \"$2\" en /$1 — ¿corriste seed-demo.sh primero?" >&2
    exit 1
  fi
  echo "$id"
}

BBVA=$(id_de metodos-pago "BBVA Azul")
BANORTE=$(id_de metodos-pago "Banorte Oro")
DEBITO=$(id_de metodos-pago "Débito Nu")
EFECTIVO=$(id_de metodos-pago "Efectivo")
SUPER=$(id_de rubros "Súper y despensa")
COMIDA=$(id_de rubros "Comida fuera")
TRANSPORTE=$(id_de rubros "Transporte")
CASA=$(id_de rubros "Casa y servicios")
ENTRETENIMIENTO=$(id_de rubros "Entretenimiento")

mes_atras() { date -d "$(date +%Y-%m-01) -$1 month" +%Y-%m 2>/dev/null || date -v-"$1"m +%Y-%m; }

sembrar_mes() {
  local periodo=$1 factor=$2 fecha="${1}-15"
  echo "  -> $periodo (factor ${factor}%)"
  post aportaciones "{\"rubro_id\":$SUPER,\"fuente\":\"yo\",\"monto\":$((400000*factor/100)),\"periodo\":\"$periodo\"}" >/dev/null
  post aportaciones "{\"rubro_id\":$SUPER,\"fuente\":\"pareja\",\"monto\":$((300000*factor/100)),\"periodo\":\"$periodo\"}" >/dev/null
  post aportaciones "{\"rubro_id\":$COMIDA,\"fuente\":\"yo\",\"monto\":150000,\"periodo\":\"$periodo\"}" >/dev/null
  post aportaciones "{\"rubro_id\":$COMIDA,\"fuente\":\"pareja\",\"monto\":100000,\"periodo\":\"$periodo\"}" >/dev/null
  post aportaciones "{\"rubro_id\":$TRANSPORTE,\"fuente\":\"yo\",\"monto\":180000,\"periodo\":\"$periodo\"}" >/dev/null
  post aportaciones "{\"rubro_id\":$CASA,\"fuente\":\"yo\",\"monto\":600000,\"periodo\":\"$periodo\"}" >/dev/null
  post aportaciones "{\"rubro_id\":$CASA,\"fuente\":\"pareja\",\"monto\":300000,\"periodo\":\"$periodo\"}" >/dev/null
  post aportaciones "{\"rubro_id\":$ENTRETENIMIENTO,\"fuente\":\"yo\",\"monto\":120000,\"periodo\":\"$periodo\"}" >/dev/null

  post gastos "{\"rubro_id\":$SUPER,\"metodo_pago_id\":$BBVA,\"monto\":$((98000*factor/100)),\"fecha\":\"$fecha\",\"descripcion\":\"Despensa semanal\"}" >/dev/null
  post gastos "{\"rubro_id\":$SUPER,\"metodo_pago_id\":$EFECTIVO,\"monto\":43000,\"fecha\":\"$fecha\",\"descripcion\":\"Verdulería\"}" >/dev/null
  post gastos "{\"rubro_id\":$COMIDA,\"metodo_pago_id\":$BBVA,\"monto\":$((45000*factor/100)),\"fecha\":\"$fecha\",\"descripcion\":\"Cena\"}" >/dev/null
  post gastos "{\"rubro_id\":$TRANSPORTE,\"metodo_pago_id\":$DEBITO,\"monto\":80000,\"fecha\":\"$fecha\",\"descripcion\":\"Gasolina\"}" >/dev/null
  post gastos "{\"rubro_id\":$CASA,\"metodo_pago_id\":$DEBITO,\"monto\":650000,\"fecha\":\"$fecha\",\"descripcion\":\"Renta\"}" >/dev/null
  post gastos "{\"rubro_id\":$ENTRETENIMIENTO,\"metodo_pago_id\":$BANORTE,\"monto\":$((135000*factor/100)),\"fecha\":\"$fecha\",\"descripcion\":\"Streaming + cine\"}" >/dev/null

  post ingresos "{\"fuente\":\"Salario\",\"monto\":4500000,\"periodo\":\"$periodo\"}" >/dev/null
  post ingresos "{\"fuente\":\"Freelance\",\"monto\":$((800000*factor/100)),\"periodo\":\"$periodo\"}" >/dev/null
}

echo "Backfill de meses anteriores..."
sembrar_mes "$(mes_atras 1)" 90
sembrar_mes "$(mes_atras 2)" 110
echo "Listo — 3 meses de datos en total (este + 2 hacia atrás)."
