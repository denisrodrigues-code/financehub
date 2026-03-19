#!/usr/bin/env bash
set -euo pipefail

if ! command -v gh >/dev/null 2>&1; then
  echo "[configure-gh-secrets] GitHub CLI (gh) nao encontrado."
  echo "Instale: https://cli.github.com/"
  exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
  echo "[configure-gh-secrets] Voce nao esta autenticado no gh."
  echo "Execute: gh auth login"
  exit 1
fi

required_vars=(
  VERCEL_TOKEN
  VERCEL_ORG_ID
  VERCEL_PROJECT_ID
)

optional_vars=(
  RENDER_PREVIEW_DEPLOY_HOOK_URL
  RENDER_PRODUCTION_DEPLOY_HOOK_URL
)

for var in "${required_vars[@]}"; do
  if [[ -z "${!var:-}" ]]; then
    echo "[configure-gh-secrets] Variavel obrigatoria ausente: $var"
    echo "Exemplo: export $var=\"valor\""
    exit 1
  fi
done

echo "[configure-gh-secrets] Configurando secrets obrigatorias..."
for var in "${required_vars[@]}"; do
  printf "%s" "${!var}" | gh secret set "$var"
  echo "- $var: OK"
done

echo "[configure-gh-secrets] Configurando secrets opcionais (se existirem)..."
for var in "${optional_vars[@]}"; do
  if [[ -n "${!var:-}" ]]; then
    printf "%s" "${!var}" | gh secret set "$var"
    echo "- $var: OK"
  else
    echo "- $var: pulado"
  fi
done

echo "[configure-gh-secrets] Finalizado."
