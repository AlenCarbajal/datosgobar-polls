#!/usr/bin/env bash
# Prueba lo que se puede hacer con la publishable key (sin login).
# Uso: bash herramientas/verificar-seguridad.sh <url> <publishable_key> <codigo_de_sesion>
# La sesión debe existir, no estar archivada y tener una opción con pideTexto "obligatorio".
# No deja datos: solo intenta escrituras que deben ser rechazadas. Requiere curl y jq.
set -u
[ $# -eq 3 ] || { echo "Uso: $0 <url> <publishable_key> <codigo_de_sesion>" >&2; exit 2; }
URL="${1%/}/rest/v1"; KEY="$2"; CODIGO="$3"
command -v jq >/dev/null || { echo "Falta jq" >&2; exit 2; }
fallas=0

# pedir METODO RUTA [JSON] → deja el código HTTP en $code y el cuerpo en $body
pedir() {
  local out
  out=$(curl -sS -X "$1" "$URL/$2" -H "apikey: $KEY" -H 'Content-Type: application/json' \
    -H 'Prefer: return=representation' ${3:+--data "$3"} -w $'\n%{http_code}')
  code="${out##*$'\n'}"; body="${out%$'\n'*}"
}
chequeo() { # chequeo "descripción" condición...
  local d="$1"; shift
  if "$@"; then echo "OK    $d"; else echo "FALLA $d (HTTP $code: $body)"; fallas=$((fallas + 1)); fi
}
negado() { [ "$code" -ge 400 ] || [ "$body" = "[]" ]; }       # error o nada visible/afectado
rechazado_con() { [ "$code" -ge 400 ] && jq -e --arg m "$1" '.message | contains($m)' <<<"$body" >/dev/null 2>&1; }
tiene_total() { jq -e '.total | numbers' <<<"$body" >/dev/null 2>&1; }

pedir GET "sesiones?codigo=eq.$CODIGO&select=id,config"
SESION=$(jq -r '.[0].id // empty' <<<"$body" 2>/dev/null)
[ -n "$SESION" ] || { echo "No encontré la sesión '$CODIGO' (HTTP $code: $body)" >&2; exit 2; }
read -r PREGUNTA OPCION < <(jq -r '[.[0].config.pasos[]
  | (if .tipo == "lista" then .preguntas[].id elif .tipo == "pregunta" then .pregunta.id else empty end) as $q
  | .opciones[]? | select(.pideTexto == "obligatorio") | [$q, .id]] | first // empty | @tsv' <<<"$body")
[ -n "${OPCION:-}" ] || { echo "La sesión no tiene ninguna opción con pideTexto obligatorio" >&2; exit 2; }
PARTICIPANTE=$(uuidgen | tr 'A-Z' 'a-z')

pedir GET 'inscripciones?select=*&limit=1'
chequeo 'no se puede leer inscripciones' negado
pedir GET 'admins?select=*&limit=1'
chequeo 'no se puede leer admins' negado
# El cambio es inocuo (archivada ya es false) por si la protección fallara.
pedir PATCH "sesiones?id=eq.$SESION" '{"archivada":false}'
chequeo 'no se puede modificar sesiones' negado
pedir POST 'rpc/reiniciar_sesion' "{\"p_sesion\":\"$SESION\"}"
chequeo 'reiniciar_sesion falla sin login' test "$code" -ge 400
pedir POST respuestas "{\"sesion_id\":\"$SESION\",\"pregunta_id\":\"$PREGUNTA\",\"participante\":\"$PARTICIPANTE\",\"opcion_id\":\"no-existe\"}"
chequeo 'respuesta con opción inexistente es rechazada' rechazado_con 'opción inexistente'
pedir POST respuestas "{\"sesion_id\":\"$SESION\",\"pregunta_id\":\"$PREGUNTA\",\"participante\":\"$PARTICIPANTE\",\"opcion_id\":\"$OPCION\",\"texto\":\"  \"}"
chequeo 'respuesta sin el texto obligatorio es rechazada' rechazado_con 'pide texto'
pedir POST 'rpc/resumen_inscripciones' "{\"p_sesion\":\"$SESION\"}"
chequeo 'resumen_inscripciones responde {"total": n}' tiene_total

[ "$fallas" -eq 0 ] || { echo "$fallas chequeo(s) fallaron"; exit 1; }
