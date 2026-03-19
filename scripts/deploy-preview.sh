#!/usr/bin/env bash
set -euo pipefail

BUNDLE_PATH="${1:-deployment}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "[deploy-preview] Bundle path: $BUNDLE_PATH"
echo "[deploy-preview] Frontend artifact: $BUNDLE_PATH/frontend/financehub-web/dist"
echo "[deploy-preview] Backend artifact: $BUNDLE_PATH/backend/publish/api"

if [[ -z "${VERCEL_TOKEN:-}" || -z "${VERCEL_ORG_ID:-}" || -z "${VERCEL_PROJECT_ID:-}" ]]; then
  echo "[deploy-preview] Secrets da Vercel ausentes (VERCEL_TOKEN, VERCEL_ORG_ID, VERCEL_PROJECT_ID)."
  exit 1
fi

echo "[deploy-preview] Deploy do frontend (Vercel preview)..."
cd "$ROOT_DIR/frontend/financehub-web"
npx --yes vercel@latest pull --yes --environment=preview --token "$VERCEL_TOKEN"
npx --yes vercel@latest build --token "$VERCEL_TOKEN"
FRONTEND_URL="$(npx --yes vercel@latest deploy --prebuilt --token "$VERCEL_TOKEN")"
echo "[deploy-preview] Frontend URL: $FRONTEND_URL"

echo "[deploy-preview] Disparando deploy do backend no Render (preview)..."
if [[ -n "${RENDER_PREVIEW_DEPLOY_HOOK_URL:-}" ]]; then
  curl -fsSL -X POST "$RENDER_PREVIEW_DEPLOY_HOOK_URL" >/dev/null
  echo "[deploy-preview] Deploy hook de preview acionado com sucesso."
else
  echo "[deploy-preview] RENDER_PREVIEW_DEPLOY_HOOK_URL nao configurada. Pulando deploy backend preview."
fi
