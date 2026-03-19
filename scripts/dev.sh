#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cleanup() {
  echo ""
  echo "[financehub] Encerrando processos locais..."
  kill "${API_PID:-}" "${WORKER_PID:-}" "${WEB_PID:-}" 2>/dev/null || true
}

trap cleanup EXIT INT TERM

echo "[financehub] Subindo infraestrutura docker..."
docker compose -f "$ROOT_DIR/docker-compose.yml" up -d

echo "[financehub] Iniciando API (.NET 10)..."
dotnet run --project "$ROOT_DIR/backend/src/FinanceHub.Api" &
API_PID=$!

echo "[financehub] Iniciando Worker (.NET 10)..."
dotnet run --project "$ROOT_DIR/backend/src/FinanceHub.Worker" &
WORKER_PID=$!

echo "[financehub] Iniciando Frontend (Vite)..."
npm --prefix "$ROOT_DIR/frontend/financehub-web" run dev -- --host &
WEB_PID=$!

echo "[financehub] Ambiente pronto"
echo "- Web: http://localhost:5173"
echo "- API: http://localhost:5098"
echo "- RabbitMQ UI: http://localhost:15672"
echo "Pressione Ctrl+C para parar."

wait "$API_PID" "$WORKER_PID" "$WEB_PID"
