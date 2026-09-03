#!/usr/bin/env bash
# Smoke test del stack local de Supabase (Fase 1 del plan de escalado — ver
# notas-internas/escalado_a_usuarios.md): confirma que el CRUD vía PostgREST
# funciona igual que el backend de Go que reemplaza, incluyendo el
# comportamiento ON DELETE SET NULL de metodo_pago/rubro sobre gasto/compra_msi.
#
# A diferencia de backend/smoke.sh (corre contra una DB persistente y por eso
# tiene que ser idempotente), este corre contra el stack local de `supabase
# start`, que se resetea con `supabase db reset` — no hace falta idempotencia,
# cada corrida empieza de una base limpia.
#
# Uso: npx supabase start && npx supabase db reset && ./supabase/smoke.sh
set -euo pipefail

REST=${REST:-http://127.0.0.1:54321/rest/v1}
# Llave anon estándar del stack local de Supabase (no es secreta, es la misma
# para cualquier proyecto local — ver supabase/config.toml / salida de `start`).
ANON_KEY=${ANON_KEY:-eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0}

req() {
  local method=$1 path=$2 body=${3:-}
  curl -sf -X "$method" "$REST/$path" \
    -H "apikey: $ANON_KEY" -H "Authorization: Bearer $ANON_KEY" \
    -H "Content-Type: application/json" -H "Prefer: return=representation" \
    ${body:+-d "$body"}
}

echo "Métodos de pago..."
BBVA=$(req POST metodo_pago '{"nombre":"BBVA Azul","tipo":"credito","limite":4500000,"dia_corte":15,"dia_pago":5}' | jq .[0].id)
EFECTIVO=$(req POST metodo_pago '{"nombre":"Efectivo","tipo":"efectivo"}' | jq .[0].id)

echo "Rubros..."
COMIDA=$(req POST rubro '{"nombre":"Comida","tipo":"gasto"}' | jq .[0].id)
EMERGENCIA=$(req POST rubro '{"nombre":"Emergencia","tipo":"ahorro","monto_objetivo":6000000}' | jq .[0].id)

echo "Aportaciones..."
req POST aportacion "{\"rubro_id\":$COMIDA,\"fuente\":\"yo\",\"monto\":400000,\"periodo\":\"2026-09\"}" >/dev/null
req POST aportacion "{\"rubro_id\":$COMIDA,\"fuente\":\"pareja\",\"monto\":100000,\"periodo\":\"2026-09\"}" >/dev/null

echo "Gasto..."
GASTO=$(req POST gasto "{\"rubro_id\":$COMIDA,\"metodo_pago_id\":$BBVA,\"monto\":120000,\"fecha\":\"2026-09-02\",\"descripcion\":\"super\"}" | jq .[0].id)

echo "Compra MSI + cuota..."
COMPRA=$(req POST compra_msi "{\"tarjeta_id\":$BBVA,\"rubro_id\":$COMIDA,\"descripcion\":\"licuadora\",\"monto_total\":300000,\"plazo_meses\":3,\"fecha_compra\":\"2026-09-02\"}" | jq .[0].id)
req POST cuota_msi "{\"compra_id\":$COMPRA,\"numero_cuota\":1,\"monto\":100000,\"fecha_vencimiento\":\"2026-10-05\"}" >/dev/null

echo "Borrar método de pago con historial real..."
req DELETE "metodo_pago?id=eq.$BBVA" >/dev/null
GASTO_METODO=$(req GET "gasto?id=eq.$GASTO&select=metodo_pago_id" | jq .[0].metodo_pago_id)
[ "$GASTO_METODO" = "null" ] || { echo "gasto.metodo_pago_id no quedó NULL tras borrar el método: $GASTO_METODO"; exit 1; }
COMPRA_TARJETA=$(req GET "compra_msi?id=eq.$COMPRA&select=tarjeta_id" | jq .[0].tarjeta_id)
[ "$COMPRA_TARJETA" = "null" ] || { echo "compra_msi.tarjeta_id no quedó NULL tras borrar el método: $COMPRA_TARJETA"; exit 1; }

echo "Borrar rubro: gasto/compra quedan sin rubro, aportaciones se cascada-borran..."
req DELETE "rubro?id=eq.$COMIDA" >/dev/null
GASTO_RUBRO=$(req GET "gasto?id=eq.$GASTO&select=rubro_id" | jq .[0].rubro_id)
[ "$GASTO_RUBRO" = "null" ] || { echo "gasto.rubro_id no quedó NULL tras borrar el rubro: $GASTO_RUBRO"; exit 1; }
APORT_RESTANTES=$(req GET "aportacion?rubro_id=eq.$COMIDA" | jq 'length')
[ "$APORT_RESTANTES" = "0" ] || { echo "las aportaciones del rubro borrado no se cascada-borraron: $APORT_RESTANTES restantes"; exit 1; }

echo "Fondo de emergencia: índice único evita dos marcados a la vez..."
req PATCH "rubro?id=eq.$EMERGENCIA" '{"es_fondo_emergencia":true}' >/dev/null
if req POST rubro '{"nombre":"Otro ahorro","tipo":"ahorro","es_fondo_emergencia":true}' >/dev/null 2>&1; then
  echo "debió fallar por el índice único de es_fondo_emergencia"; exit 1
fi

echo "smoke (supabase local) OK — gasto=$GASTO compra=$COMPRA metodo_borrado=$BBVA rubro_borrado=$COMIDA"
