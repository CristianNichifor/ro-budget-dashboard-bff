# ro-budget-dashboard-bff

Backend-for-frontend pentru [ro-budget-dashboard](https://github.com/your-org/ro-budget-dashboard): agreghează datele bugetare (Open Budget 2026 / hack-for-facts-eb-server) cu context INS și BNR, într-un contract tipizat consumat de frontend.

> **Status: P2.** Sursa implicită este `static` (seed-uri demo). Sursa `hackforfacts` este un client best-effort a cărui mapare GraphQL trebuie verificată împotriva schemei live.

## Tech stack

Aliniat cu `hack-for-facts-eb-server` / `transparenta-eu-ins-loader`:

- **Fastify 5** (schema validation TypeBox, CORS, rate-limit)
- **TypeScript ESM strict**, Node ≥ 20.19, pnpm
- **neverthrow** — core-ul întoarce `Result<T, AppError>`, nu aruncă
- **decimal.js** — regula „no floats”: sumele trec granița API ca `string`
- **pino** logging
- Quality gates: ESLint (import-x) + Prettier + Husky + lint-staged + commitlint

## Endpoints

| Metodă | Path                                       | Descriere                                                                       |
| ------ | ------------------------------------------ | ------------------------------------------------------------------------------- |
| GET    | `/health/live`, `/health/ready`            | Probe                                                                           |
| GET    | `/api/salary/calculate?gross=9427`         | Calcul povară fiscală (CAS/CASS/impozit/CAM/TVA)                                |
| GET    | `/api/budget/summary`                      | Venituri / cheltuieli / deficit                                                 |
| GET    | `/api/budget/destinations`                 | Destinații cu sub-destinații (drill-down)                                       |
| GET    | `/api/budget/institutions?category=pensii` | Detaliu categorie                                                               |
| GET    | `/api/context/monetary`                    | Inflație, salariu real, serviciul datoriei                                      |
| GET    | `/api/context/trends?metric=health-budget` | Serii temporale bugetare                                                        |
| GET    | `/api/ins/metrics?code=infant-mortality`   | Indicatori INS (mortalitate infantilă, pensionari, pensie medie, paturi spital) |

Coduri de eroare: `400 INVALID_INPUT`, `404 NOT_FOUND`, `502 UPSTREAM_UNAVAILABLE`, `500 INTERNAL`.

## Comenzi

```bash
pnpm install
cp .env.example .env
pnpm dev          # tsx watch, port 3000
pnpm check        # typecheck + lint + test + format:check
pnpm test         # unit (core) + integration (fastify inject)
pnpm build        # tsc + tsc-alias → dist/
pnpm start        # node dist/api.js
pnpm bnr:update --input export.json  # actualizează seed-ul BNR (trimestrial)
pnpm bnr:validate                    # validează seed-ul BNR curent
```

## Arhitectura

Functional Core / Imperative Shell, ca în eb-server:

```
src/
├── api.ts                    # Entry point
├── app/build-app.ts          # Composition root (wiring)
├── common/                   # Tipuri + erori + seed-uri partajate
├── infra/                    # config, logger
└── modules/
    ├── salary/   core/ (types, ports, use-cases)  shell/ (route, repo)
    ├── budget/   core/ (types, ports)             shell/ (route, repos)
    └── context/  core/ (types, ports, use-cases)  shell/ (route, repo)
```

Reguli:

1. **Core-ul nu face I/O** — use-case-urile sunt pure (`decimal.js`, `Result`).
2. **Porturile** (`*DataSource`) separă sursele; `StaticBudgetSource` (demo) și `HackForFactsSource` (upstream) implementează același port.
3. **Banii sunt `string` la graniță**; serializarea (lei: 2 zecimale, procente: 4) se face doar în shell.

## Surse de date

| Sursă               | Status | Note                                                                                                                                       |
| ------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `static` (implicit) | P2 ✓   | Seed-uri demo identice cu cele din frontend                                                                                                |
| `hackforfacts`      | P2 ⚠️  | Client GraphQL best-effort; maparea câmpurilor trebuie verificată pe schema live (`executionAnalytics`, `aggregatedLineItems`, `datasets`) |
| INS / BNR           | P3/P4  | de adăugat prin porturi noi                                                                                                                |

## Git workflow

Conventional Commits; Husky rulează lint-staged + commitlint.
