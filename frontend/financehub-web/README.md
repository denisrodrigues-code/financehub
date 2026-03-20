# FinanceHub Web

Frontend do FinanceHub construído com React + Vite + TypeScript.

## Requisitos

- Node.js 20+
- npm 10+

## Executar localmente

```bash
npm install
npm run dev
```

App em `http://localhost:5173`.

Por padrao, o frontend usa proxy para API local (`http://localhost:5098`).

## Scripts

- `npm run dev`: ambiente de desenvolvimento
- `npm run build`: build de producao
- `npm run preview`: preview do build local
- `npm run lint`: lint com ESLint
- `npm run biome:check`: validacao com Biome
- `npm run biome:fix`: correcoes automaticas com Biome
- `npm run test`: testes unitarios/integracao com Vitest
- `npm run test:coverage`: cobertura de testes
- `npm run test:e2e`: testes E2E com Playwright
- `npm run test:e2e:ui`: runner visual do Playwright

## Variaveis de ambiente

- `VITE_API_BASE_URL`: URL base da API no ambiente atual.
  - Em producao, configure explicitamente (ex.: deploy Vercel).
  - Em desenvolvimento, o proxy do Vite costuma ser suficiente.

## Estrutura principal

```text
src/
  components/
  pages/
  store/
  lib/
```

## Qualidade recomendada antes de abrir PR

```bash
npm run lint
npm run biome:check
npm run test
npm run build
```
