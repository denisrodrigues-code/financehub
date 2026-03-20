# FinanceHub (React + .NET 10)

Projeto full stack de agregação financeira multibanco com arquitetura inspirada no documento do FinanceHub, atualizado para usar **.NET 10** no backend.

## Stack

- Frontend: React + Vite + TypeScript + Tailwind + React Query + Zustand + Recharts
- Frontend tooling: ESLint + Biome + Vitest
- Backend: .NET 10 + ASP.NET Core Minimal API + EF Core 10 + FluentValidation + MediatR
- Infra local: PostgreSQL + Redis + RabbitMQ (Docker Compose)

## Estrutura

```text
backend/
  FinanceHub.slnx
  src/
    FinanceHub.Api
    FinanceHub.Application
    FinanceHub.Domain
    FinanceHub.Infrastructure
    FinanceHub.Integrations
    FinanceHub.Worker
frontend/
  financehub-web/
docker-compose.yml
scripts/
  dev.sh
Makefile
```

## Como subir localmente

### Comando único (recomendado)

```bash
make dev
```

Esse comando sobe Docker, API, Worker e Frontend juntos.

Para reset completo do ambiente local (containers, volumes e banco limpo):

```bash
make reset
```

### Manual

1. Infra de dados/mensageria

```bash
docker compose up -d
```

2. Backend API

```bash
dotnet run --project backend/src/FinanceHub.Api
```

3. Worker

```bash
dotnet run --project backend/src/FinanceHub.Worker
```

4. Frontend

```bash
cd frontend/financehub-web
npm install
npm run dev
```

Frontend em `http://localhost:5173` com proxy para API em `http://localhost:5098`.

## Seed local

Ao iniciar a API pela primeira vez, o banco é criado e um usuário demo é semeado automaticamente:

- Email: `demo@financehub.local`
- Senha: `FinanceHub@123`

## Migrations EF Core 10

Comando usado para gerar a migration inicial:

```bash
dotnet ef migrations add InitialCreate \
  --project backend/src/FinanceHub.Infrastructure/FinanceHub.Infrastructure.csproj \
  --startup-project backend/src/FinanceHub.Api/FinanceHub.Api.csproj \
  --context FinanceHubDbContext \
  --output-dir Persistence/Migrations
```

Para aplicar no banco:

```bash
dotnet ef database update \
  --project backend/src/FinanceHub.Infrastructure/FinanceHub.Infrastructure.csproj \
  --startup-project backend/src/FinanceHub.Api/FinanceHub.Api.csproj
```

## Qualidade e testes

Backend:

```bash
dotnet test backend/FinanceHub.slnx
```

Frontend:

```bash
cd frontend/financehub-web
npm run test
npm run test:coverage
npm run lint
npm run biome:check
```

Atalhos via Make:

```bash
make test
make coverage
make lint
make build
make reset
make smoke
```

## CI

Pipeline GitHub Actions em `.github/workflows/ci.yml` com dois jobs:

- Backend: restore, build, test, coleta de cobertura e upload de artefatos
- Frontend: install, lint, biome check, test com coverage, build e upload de artefatos

Artefatos gerados na CI:

- `backend-api-publish`
- `backend-test-results`
- `frontend-dist`
- `frontend-coverage`

## Deploy

Workflow em `.github/workflows/deploy.yml` com deploy pronto para:

- Frontend: **Vercel**
- Backend: **Render** (via Deploy Hook)

Gatilhos:

- Preview: `pull_request` para `main` ou `workflow_dispatch` com target `preview`
- Production: `push` em `main` ou `workflow_dispatch` com target `production`

Scripts utilizados pelo workflow:

- `scripts/deploy-preview.sh`
- `scripts/deploy-production.sh`

Secrets obrigatórias no GitHub Actions:

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

Secrets opcionais para backend no Render:

- `RENDER_PREVIEW_DEPLOY_HOOK_URL`
- `RENDER_PRODUCTION_DEPLOY_HOOK_URL`

Opcionalmente, você pode configurar os secrets por CLI:

```bash
export VERCEL_TOKEN="..."
export VERCEL_ORG_ID="..."
export VERCEL_PROJECT_ID="..."
export RENDER_PREVIEW_DEPLOY_HOOK_URL="..."
export RENDER_PRODUCTION_DEPLOY_HOOK_URL="..."
make gh-secrets
```

Observações:

- O deploy de preview em PR de fork é ignorado (segurança de secrets).
- O frontend usa `vercel build` + `vercel deploy --prebuilt`.

## Smoke test pós-deploy

Execute uma validação rápida de frontend + API após publicar:

```bash
FRONTEND_URL="https://seu-frontend.vercel.app" \
API_URL="https://sua-api.onrender.com" \
make smoke
```

Opcional (valida endpoint autenticado):

```bash
FRONTEND_URL="https://seu-frontend.vercel.app" \
API_URL="https://sua-api.onrender.com" \
SMOKE_BEARER_TOKEN="seu_jwt" \
make smoke
```

## Principais endpoints

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `GET /api/me`
- `PUT /api/me`
- `PUT /api/me/password`
- `GET /api/dashboard/summary`
- `GET /api/banks`
- `GET/POST /api/bank-connections`
- `POST /api/bank-connections/from-directory`
- `DELETE /api/bank-connections/{connectionId}`
- `GET/POST /api/accounts`
- `PUT/DELETE /api/accounts/{accountId}`
- `GET/POST /api/transactions`
- `PUT/DELETE /api/transactions/{transactionId}`
- `GET/POST /api/categories`
- `GET/POST /api/budgets`
- `PUT/DELETE /api/budgets/{budgetId}`
- `GET /api/reports/monthly`

## Testes E2E (Playwright)

No frontend, há testes de fluxo E2E para validar navegação e impacto de transações no relatório.

```bash
cd frontend/financehub-web
npx playwright install --with-deps
npm run test:e2e
```

Modo interativo:

```bash
npm run test:e2e:ui
```

## Nota

Este setup entrega a base full stack com os módulos centrais funcionando, pronta para evoluir com:

- sincronização real com provedores Open Finance
- pipeline assíncrono completo com RabbitMQ
- autenticação/refresh em produção com rotação e revogação robusta
- observabilidade com export para Prometheus/Grafana
