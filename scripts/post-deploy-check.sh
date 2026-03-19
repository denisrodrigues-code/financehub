#!/usr/bin/env bash
set -euo pipefail

FRONTEND_URL="${FRONTEND_URL:-}"
API_URL="${API_URL:-}"
TIMEOUT_SECONDS="${TIMEOUT_SECONDS:-20}"

if [[ -z "$FRONTEND_URL" || -z "$API_URL" ]]; then
  echo "[post-deploy-check] Defina FRONTEND_URL e API_URL."
  echo "Exemplo: FRONTEND_URL=https://app.exemplo.com API_URL=https://api.exemplo.com ./scripts/post-deploy-check.sh"
  exit 1
fi

echo "[post-deploy-check] FRONTEND_URL=$FRONTEND_URL"
echo "[post-deploy-check] API_URL=$API_URL"

health_code="$(curl -fsS -o /tmp/financehub-health.json -w "%{http_code}" --max-time "$TIMEOUT_SECONDS" "$API_URL/health")"
if [[ "$health_code" != "200" ]]; then
  echo "[post-deploy-check] /health retornou HTTP $health_code"
  exit 1
fi

if ! grep -q '"status":"ok"' /tmp/financehub-health.json; then
  echo "[post-deploy-check] /health nao retornou status ok"
  cat /tmp/financehub-health.json
  exit 1
fi

frontend_code="$(curl -fsS -L -o /tmp/financehub-frontend.html -w "%{http_code}" --max-time "$TIMEOUT_SECONDS" "$FRONTEND_URL")"
if [[ "$frontend_code" != "200" ]]; then
  echo "[post-deploy-check] Frontend retornou HTTP $frontend_code"
  exit 1
fi

if ! grep -Eiq '<!doctype html>|<html' /tmp/financehub-frontend.html; then
  echo "[post-deploy-check] Conteudo do frontend nao parece HTML valido"
  exit 1
fi

if [[ -n "${SMOKE_BEARER_TOKEN:-}" ]]; then
  echo "[post-deploy-check] Validando endpoint autenticado /api/dashboard/summary"
  summary_code="$(curl -fsS -o /tmp/financehub-summary.json -w "%{http_code}" --max-time "$TIMEOUT_SECONDS" -H "Authorization: Bearer $SMOKE_BEARER_TOKEN" "$API_URL/api/dashboard/summary")"
  if [[ "$summary_code" != "200" ]]; then
    echo "[post-deploy-check] /api/dashboard/summary retornou HTTP $summary_code"
    exit 1
  fi
fi

echo "[post-deploy-check] Smoke test concluido com sucesso."
