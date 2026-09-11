# ro-budget-dashboard-bff

Backend-for-frontend pentru [ro-budget-dashboard](https://github.com/CristianNichifor/ro-budget-dashboard): agreghează datele bugetare (Open Budget 2026 / hack-for-facts-eb-server) cu context INS și BNR, într-un contract tipizat consumat de frontend.

> **Status: P8.** Sursa implicită este `static` (seed-uri demo). Sursa `hackforfacts` servește datele live din API-ul public transparenta.eu (`https://api.transparenta.eu/graphql`) — vezi „Surse de date”.

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
| GET    | `/api/ins/catalog`                         | Catalogul indicatorilor INS disponibili (P7)                                    |
| GET    | `/api/investments/by-county`               | Investiții publice pe județe (P6)                                               |

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
pnpm smoke:live                      # smoke test împotriva API-ului public transparenta.eu
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

| Sursă               | Status | Note                                                                                                                                                                                                  |
| ------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `static` (implicit) | P2 ✓   | Seed-uri demo identice cu cele din frontend                                                                                                                                                           |
| `hackforfacts`      | P8 ✓   | Client GraphQL cu mapare verificată pe schema upstream: `executionAnalytics` (sumar), `aggregatedLineItems` (destinații), `entityAnalytics` (instituții). Anul se setează prin `HACK_FOR_FACTS_YEAR`. |
| INS / BNR           | P3/P4  | de adăugat prin porturi noi                                                                                                                                                                           |

### Date reale: API-ul public transparenta.eu

transparenta.eu rulează deja eb-server-ul public, fără autentificare: `https://api.transparenta.eu/graphql`. Nu e nevoie să hostezi nimic — setează `DATA_SOURCE=hackforfacts` (vezi `.env.example`) și BFF-ul servește datele live; frontend-ul păstrează fallback-ul static dacă API-ul nu răspunde. Verifică integrarea cu `pnpm smoke:live`.

Caveat-uri constatate pe instanța live:

- **Filtrele noastre trimit `report_type: PRINCIPAL_AGGREGATED`.** Fără el, upstream-ul însumează toate tipurile de raport stocate (principal + secundar + detaliat + angajamente) și fiecare leu apare de 2–3 ori (ex. cheltuieli 2024: 2,05 trn lei cu totul, 878 mld corect). Cu filtrul activ, deficitul %PIB 2024 iese 8,8% — față de 8,65% oficial.
- **Totalurile rămân „brute”, nu consolidate**: execuțiile la nivel de ordonator principal includ transferurile intra-bugetare, deci cheltuielile (~878 mld) și veniturile (~722 mld) ies peste execuția consolidată oficială (~752 / ~575 mld); deficitul și %PIB coincid fiindcă transferurile se anulează.
- Introspectarea GraphQL este dezactivată (maparea e verificată pe schema din repo + smoke test); unele valori ale enum-ului `ReportType` din repo dau eroare pe instanța live — live-ul pare în urma repo-ului.
- Latenta e de ordinul secundelor la prima cerere → `HACK_FOR_FACTS_TIMEOUT_MS` implicit 20000.
- Datele acoperă până la ~2024; nume fără diacritice în unele câmpuri.

## Docker

Stack complet (BFF + frontend, frontend-ul e în repo-ul sibling):

```bash
cp .env.example .env
docker compose up -d --build   # http://localhost:8080
```

sau doar BFF-ul:

```bash
docker build -t ro-budget-dashboard-bff .
docker run -p 3000:3000 --env-file .env ro-budget-dashboard-bff
```

Imaginea de runtime conține doar dependențele de producție + `dist/` (entrypoint `node dist/api.js`).

CI: `.github/workflows/ci.yml` rulează `pnpm check` + build pe fiecare PR și publică imaginea pe GHCR la push pe `main`/tag-uri `v*`; `.github/workflows/smoke-live.yml` rulează `pnpm smoke:live` săptămânal/manual.

## Cloudflare Workers (deploy principal, gratis)

Același nucleu (surse, mapping, Decimal) rulează ca Worker pe Cloudflare — `worker/index.ts` (Hono) reutilizează modulele din `src/`, fără Fastify în bundle.

```bash
pnpm worker:dev      # local: http://localhost:8787
pnpm worker:deploy   # https://ro-budget-dashboard-bff.cn-webify.workers.dev
```

- Config în `wrangler.toml`: `DATA_SOURCE` (`hackforfacts` live / `static` demo), URL-ul și timeout-urile upstream — editabile și din dashboard-ul Cloudflare.
- Free tier Workers: 100k invocări/zi (fiecare pagină face ~6 apeluri → ~16k pagini/zi).
- CI: `.github/workflows/deploy-worker.yml` — deploy la push pe `main` (necesită secretele `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID`).

## Git workflow

Conventional Commits; Husky rulează lint-staged + commitlint.
