SHELL := /bin/bash

.PHONY: up down dev reset build test coverage lint gh-secrets smoke

up:
	docker compose up -d

down:
	docker compose down

dev:
	./scripts/dev.sh

reset:
	./scripts/reset-local.sh

build:
	dotnet build backend/FinanceHub.slnx
	cd frontend/financehub-web && npm run build

test:
	dotnet test backend/FinanceHub.slnx
	cd frontend/financehub-web && npm run test

coverage:
	dotnet test backend/FinanceHub.slnx --collect:"XPlat Code Coverage" --results-directory backend/TestResults
	cd frontend/financehub-web && npm run test:coverage

lint:
	cd frontend/financehub-web && npm run lint && npm run biome:check

gh-secrets:
	./scripts/configure-gh-secrets.sh

smoke:
	./scripts/post-deploy-check.sh
