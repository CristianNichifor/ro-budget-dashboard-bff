import { buildApp } from "../src/app/build-app";
import { loadConfig } from "../src/infra/config";

/**
 * Smoke test of the live transparenta.eu integration (P8).
 *
 * Boots the BFF with DATA_SOURCE=hackforfacts against the public API and
 * exercises the budget endpoints end-to-end. No server socket is opened —
 * requests run through fastify.inject, like the integration tests.
 *
 * Usage:  pnpm smoke:live
 *         (override: HACK_FOR_FACTS_BASE_URL / HACK_FOR_FACTS_YEAR env vars)
 */

const config = loadConfig({
  NODE_ENV: "test",
  PORT: "0",
  DATA_SOURCE: "hackforfacts",
  HACK_FOR_FACTS_BASE_URL:
    process.env.HACK_FOR_FACTS_BASE_URL ?? "https://api.transparenta.eu",
  HACK_FOR_FACTS_YEAR: process.env.HACK_FOR_FACTS_YEAR ?? "2024",
  HACK_FOR_FACTS_TIMEOUT_MS: process.env.HACK_FOR_FACTS_TIMEOUT_MS ?? "20000",
});

const app = buildApp({ config });
await app.ready();

const checks: { name: string; url: string }[] = [
  { name: "summary", url: "/api/budget/summary" },
  { name: "destinations", url: "/api/budget/destinations" },
];

let failed = 0;

for (const check of checks) {
  const started = Date.now();
  const response = await app.inject({ method: "GET", url: check.url });
  const ok = response.statusCode === 200;
  if (!ok) {
    failed += 1;
  }
  console.log(
    `${ok ? "OK  " : "FAIL"} ${check.name.padEnd(12)} ${response.statusCode} (${Date.now() - started}ms)`
  );
}

// Drill into the first destination to verify institutions too.
const destinations = await app.inject({
  method: "GET",
  url: "/api/budget/destinations",
});
if (destinations.statusCode === 200) {
  const parsed = JSON.parse(destinations.body) as Array<{ id?: string }>;
  const firstId = parsed[0]?.id;
  if (firstId !== undefined) {
    const started = Date.now();
    const response = await app.inject({
      method: "GET",
      url: `/api/budget/institutions?category=${encodeURIComponent(firstId)}`,
    });
    const ok = response.statusCode === 200;
    if (!ok) {
      failed += 1;
    }
    console.log(
      `${ok ? "OK  " : "FAIL"} institutions ${response.statusCode} (${Date.now() - started}ms)`
    );
  } else {
    failed += 1;
    console.log("FAIL institutions — no destinations returned");
  }
} else {
  failed += 1;
  console.log("FAIL institutions — destinations call failed");
}

await app.close();

if (failed > 0) {
  console.error(`\n${failed} check(s) failed`);
  process.exit(1);
}

console.log("\nLive smoke test passed");
