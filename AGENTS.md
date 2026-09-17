# AGENTS.md

Convenții pentru `ro-budget-dashboard-bff` (aliniate cu hack-for-facts-eb-server).

## Comenzi

- `pnpm dev` — tsx watch (necesită `.env`)
- `pnpm check` — typecheck + lint + test + format:check
- `pnpm test` — vitest (unit core + integration via `app.inject`)
- `pnpm smoke:live` — smoke test împotriva API-ului public transparenta.eu
- `pnpm worker:dev` — Cloudflare Worker local (Hono, aceleași surse; port 8787)
- `pnpm worker:deploy` — deploy Worker pe Cloudflare (https://api.buget.cristian-nichifor.com)
- Deploy: `cp .env.example .env && docker compose up -d --build` (stack BFF+frontend, sibling repo). CI publică imaginea pe GHCR la push pe `main`/tag-uri `v*`; smoke-ul live rulează săptămânal/manual.

## Reguli

1. **Functional Core / Imperative Shell**: `modules/*/core` = funcții pure (`decimal.js`, `neverthrow Result`, fără I/O, fără throw); `modules/*/shell` = adaptoare (route-uri Fastify, repo-uri de date, `worker/index.ts` Hono — aceleași surse, fără Fastify în bundle).
2. **No floats**: banii sunt `Decimal` în core și `string` în JSON. Serializare doar în shell (lei 2 zecimale, procente 4).
3. **Porturi peste implementări**: sursele de date implementează `*DataSource`; alege sursa prin `DATA_SOURCE` în config.
4. **TypeBox** pentru contractele HTTP; erorile mapate în coduri: 400/404/502/500.
5. **Conventional Commits** + Husky (lint-staged + commitlint).

## Convenții Fastify

- `response` schema declară TOATE codurile posibile (altfel `reply.code()` nu tipizează).
- Teste: `buildApp({ config })` + `app.inject()` — nu porni socket-ul în teste.


## How this repo is gated

- `dev` is the default branch and where work lands. Pull requests are required, and **no status check is required yet**.
- `main` is production. It is restricted: only an admin can advance it, so an agent can open a pull request against it but cannot merge one.
- This repo ships Cloudflare (Workers or Pages) via wrangler. That fires on a merge to `main`, which is the restricted branch — so an agent's work reaching `dev` deploys nothing.

*(Appended from measured repository settings. Branch rules are enforced by
GitHub; this section describes them, it does not create them.)*
