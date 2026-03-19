#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "[financehub] Parando e removendo containers/volumes..."
docker compose -f "$ROOT_DIR/docker-compose.yml" down -v

echo "[financehub] Subindo infraestrutura limpa..."
docker compose -f "$ROOT_DIR/docker-compose.yml" up -d

echo "[financehub] Aplicando migrations no banco..."
dotnet dotnet-ef database update \
  --project "$ROOT_DIR/backend/src/FinanceHub.Infrastructure/FinanceHub.Infrastructure.csproj" \
  --startup-project "$ROOT_DIR/backend/src/FinanceHub.Api/FinanceHub.Api.csproj"

echo "[financehub] Reset concluido."
echo "Ao iniciar a API, o seed demo sera executado automaticamente."
