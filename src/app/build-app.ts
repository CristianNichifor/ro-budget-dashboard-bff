import fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import type { AppConfig } from "../infra/config";
import { buildBudgetSource } from "../modules/budget/shell/repo";
import { budgetRoutes } from "../modules/budget/shell/route";
import { contextRoutes } from "../modules/context/shell/route";
import { buildContextSource } from "../modules/context/shell/repo";
import { buildInsSource } from "../modules/ins/shell/repo";
import { insRoutes } from "../modules/ins/shell/route";
import { investmentsRoutes } from "../modules/investments/shell/route";
import { buildInvestmentsSource } from "../modules/investments/shell/repo";
import { salaryRoutes } from "../modules/salary/shell/route";
import { staticTaxRates } from "../modules/salary/shell/repo";
import { soeRoutes } from "../modules/soe/shell/route";
import { buildSoeSource } from "../modules/soe/shell/repo";
import { macroRoutes } from "../modules/macro/shell/route";
import { buildMacroSource } from "../modules/macro/shell/repo";

export interface AppDependencies {
  config: AppConfig;
}

export function buildApp({ config }: AppDependencies): FastifyInstance {
  const app = fastify({
    logger: config.nodeEnv === "test" ? false : { level: config.logLevel },
    disableRequestLogging: config.nodeEnv !== "development",
  });

  void app.register(cors, {
    origin: config.corsOrigin
      .split(",")
      .map((origin) => origin.trim())
      .filter((origin) => origin.length > 0),
  });

  void app.register(rateLimit, {
    max: 200,
    timeWindow: "1 minute",
  });

  app.get("/health/live", async () => ({ status: "ok" }));
  app.get("/health/ready", async () => ({ status: "ready" }));

  const budgetSource = buildBudgetSource(config);
  const contextSource = buildContextSource();
  const insSource = buildInsSource(config);

  void app.register(salaryRoutes, {
    prefix: "/api/salary",
    dependencies: { taxRates: staticTaxRates },
  });

  void app.register(budgetRoutes, {
    prefix: "/api/budget",
    dependencies: {
      source: budgetSource,
      defaultYear: config.hackForFactsYear,
    },
  });

  void app.register(contextRoutes, {
    prefix: "/api/context",
    dependencies: { source: contextSource },
  });

  void app.register(insRoutes, {
    prefix: "/api/ins",
    dependencies: { source: insSource },
  });

  const investmentsSource = buildInvestmentsSource(config);
  void app.register(investmentsRoutes, {
    prefix: "/api/investments",
    dependencies: { source: investmentsSource },
  });

  const soeSource = buildSoeSource(config);
  void app.register(soeRoutes, {
    prefix: "/api/soe",
    dependencies: { source: soeSource },
  });

  const macroSource = buildMacroSource(config);
  void app.register(macroRoutes, {
    prefix: "/api/macro",
    dependencies: { source: macroSource },
  });

  return app;
}
