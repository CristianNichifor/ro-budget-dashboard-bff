import { Hono, type Context } from "hono";
import { cors } from "hono/cors";
import type { AppError } from "../src/common/errors";
import { notFound } from "../src/common/errors";
import { SEED_INFLATION_TARGET } from "../src/common/seed-data";
import { loadConfig, type AppConfig } from "../src/infra/config";
import { buildBudgetSource } from "../src/modules/budget/shell/repo";
import type { BudgetDataSource } from "../src/modules/budget/core/ports";
import { buildContextSource } from "../src/modules/context/shell/repo";
import type { ContextDataSource } from "../src/modules/context/core/ports";
import { buildMonetaryContext } from "../src/modules/context/core/use-cases/monetary-context";
import { buildInsSource } from "../src/modules/ins/shell/repo";
import type { InsDataSource } from "../src/modules/ins/core/ports";
import { buildInvestmentsSource } from "../src/modules/investments/shell/repo";
import type { InvestmentsSource } from "../src/modules/investments/core/ports";
import { calculateSalaryBreakdown } from "../src/modules/salary/core/use-cases/calculate-salary";
import { staticTaxRates } from "../src/modules/salary/shell/repo";
import { serializeSalaryBreakdown } from "../src/modules/salary/shell/serialize";

type Env = Record<string, string | undefined>;

interface Sources {
  budget: BudgetDataSource;
  context: ContextDataSource;
  ins: InsDataSource;
  investments: InvestmentsSource;
}

interface AppVariables {
  sources: Sources;
}

function buildSources(config: AppConfig): Sources {
  return {
    budget: buildBudgetSource(config),
    context: buildContextSource(),
    ins: buildInsSource(config),
    investments: buildInvestmentsSource(config),
  };
}

function statusFor(error: AppError): 400 | 404 | 500 | 502 {
  if (error.code === "NOT_FOUND") {
    return 404;
  }
  if (error.code === "UPSTREAM_UNAVAILABLE") {
    return 502;
  }
  if (error.code === "INVALID_INPUT") {
    return 400;
  }
  return 500;
}

function errorReply(c: Context, error: AppError): Response {
  return c.json(error, statusFor(error) as 400 | 404 | 500 | 502);
}

const app = new Hono<{ Bindings: Env; Variables: AppVariables }>();

app.use("/api/*", cors({ origin: "*" }), async (c, next) => {
  c.set("sources", buildSources(loadConfig(c.env)));
  await next();
});

app.get("/health/live", (c) => c.json({ status: "ok" }));
app.get("/health/ready", (c) => c.json({ status: "ready" }));

app.get("/api/budget/summary", async (c) => {
  const result = await c.get("sources").budget.getSummary();
  if (result.isErr()) {
    return errorReply(c, result.error);
  }
  return c.json(result.value);
});

app.get("/api/budget/destinations", async (c) => {
  const result = await c.get("sources").budget.getDestinations();
  if (result.isErr()) {
    return errorReply(c, result.error);
  }
  return c.json(result.value);
});

app.get("/api/budget/institutions", async (c) => {
  const category = c.req.query("category") ?? "";
  const result = await c.get("sources").budget.getInstitutions(category);
  if (result.isErr()) {
    return errorReply(c, result.error);
  }
  if (result.value.institutions.length === 0) {
    return c.json(notFound(`unknown category: ${category}`), 404);
  }
  return c.json(result.value);
});

app.get("/api/context/monetary", async (c) => {
  const { context } = c.get("sources");
  const inflation = await context.getInflationSeries();
  if (inflation.isErr()) {
    return errorReply(c, inflation.error);
  }
  const debt = await context.getDebtContext();
  if (debt.isErr()) {
    return errorReply(c, debt.error);
  }
  const summary = await context.getBudgetSummary();
  if (summary.isErr()) {
    return errorReply(c, summary.error);
  }
  return c.json(
    buildMonetaryContext(
      inflation.value,
      SEED_INFLATION_TARGET,
      debt.value,
      summary.value
    )
  );
});

app.get("/api/context/trends", async (c) => {
  const metric = c.req.query("metric") ?? "";
  const result = await c.get("sources").context.getTrend(metric);
  if (result.isErr()) {
    return errorReply(c, result.error);
  }
  if (result.value.data.length === 0) {
    return c.json(notFound(`unknown metric: ${metric}`), 404);
  }
  return c.json(result.value);
});

app.get("/api/ins/catalog", async (c) => {
  const result = await c.get("sources").ins.getCatalog();
  if (result.isErr()) {
    return errorReply(c, result.error);
  }
  return c.json({ metrics: result.value });
});

app.get("/api/ins/metrics", async (c) => {
  const code = c.req.query("code") ?? "";
  const result = await c.get("sources").ins.getMetric(code);
  if (result.isErr()) {
    return errorReply(c, result.error);
  }
  if (result.value.data.length === 0) {
    return c.json(notFound(`unknown metric: ${code}`), 404);
  }
  return c.json(result.value);
});

app.get("/api/investments/by-county", async (c) => {
  const result = await c.get("sources").investments.getByCounty();
  if (result.isErr()) {
    return errorReply(c, result.error);
  }
  return c.json(result.value);
});

app.get("/api/salary/calculate", (c) => {
  const gross = c.req.query("gross") ?? "";
  const result = calculateSalaryBreakdown(gross, staticTaxRates.get());
  if (result.isErr()) {
    return errorReply(c, result.error);
  }
  return c.json(serializeSalaryBreakdown(result.value));
});

app.notFound((c) => c.json({ code: "NOT_FOUND", message: "not found" }, 404));

export default app;
