#!/usr/bin/env bash
set -euo pipefail

BUNDLE_PATH="${1:-deployment}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "[deploy-production] Bundle path: $BUNDLE_PATH"
echo "[deploy-production] Frontend artifact: $BUNDLE_PATH/frontend/financehub-web/dist"
echo "[deploy-production] Backend artifact: $BUNDLE_PATH/backend/publish/api"

if [[ -z "${VERCEL_TOKEN:-}" || -z "${VERCEL_ORG_ID:-}" || -z "${VERCEL_PROJECT_ID:-}" ]]; then
  echo "[deploy-production] Secrets da Vercel ausentes (VERCEL_TOKEN, VERCEL_ORG_ID, VERCEL_PROJECT_ID)."
  exit 1
fi

echo "[deploy-production] Deploy do frontend (Vercel production)..."
cd "$ROOT_DIR/frontend/financehub-web"
npx --yes vercel@latest pull --yes --environment=production --token "$VERCEL_TOKEN"
npx --yes vercel@latest build --prod --token "$VERCEL_TOKEN"
FRONTEND_URL="$(npx --yes vercel@latest deploy --prebuilt --prod --token "$VERCEL_TOKEN")"
echo "[deploy-production] Frontend URL: $FRONTEND_URL"

echo "[deploy-production] Disparando deploy do backend no Render (production)..."
if [[ -n "${RENDER_PRODUCTION_DEPLOY_HOOK_URL:-}" ]]; then
  curl -fsSL -X POST "$RENDER_PRODUCTION_DEPLOY_HOOK_URL" >/dev/null
  echo "[deploy-production] Deploy hook de producao acionado com sucesso."
else
  echo "[deploy-production] RENDER_PRODUCTION_DEPLOY_HOOK_URL nao configurada. Pulando deploy backend production."
fi
