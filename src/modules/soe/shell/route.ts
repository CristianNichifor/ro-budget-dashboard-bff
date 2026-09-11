import type { FastifyPluginAsync } from "fastify";
import type { AppError } from "../../../common/errors";
import type { SoeDataSource } from "../core/ports";

interface SoeRouteDependencies {
  source: SoeDataSource;
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

export const soeRoutes: FastifyPluginAsync<{
  dependencies: SoeRouteDependencies;
}> = async (app, options) => {
  const { source } = options.dependencies;

  app.get("/summary", async (_request, reply) => {
    const result = await source.getSummary();
    if (result.isErr()) {
      return reply.code(statusFor(result.error)).send(result.error);
    }
    return result.value;
  });

  app.get("/sector-trend", async (_request, reply) => {
    const result = await source.getSectorTrend();
    if (result.isErr()) {
      return reply.code(statusFor(result.error)).send(result.error);
    }
    return result.value;
  });

  app.get("/by-county", async (_request, reply) => {
    const result = await source.getByCounty();
    if (result.isErr()) {
      return reply.code(statusFor(result.error)).send(result.error);
    }
    return result.value;
  });

  app.get("/scatter", async (_request, reply) => {
    const result = await source.getScatter();
    if (result.isErr()) {
      return reply.code(statusFor(result.error)).send(result.error);
    }
    return result.value;
  });

  app.get("/companies/:cui", async (request, reply) => {
    const { cui } = request.params as { cui: string };
    if (!/^\d{1,12}$/.test(cui)) {
      return reply.code(400).send({
        code: "INVALID_INPUT",
        message: "invalid cui",
      });
    }
    const result = await source.getCompany(cui);
    if (result.isErr()) {
      return reply.code(statusFor(result.error)).send(result.error);
    }
    return result.value;
  });

  app.get("/subsidies", async (request, reply) => {
    const { year } = request.query as { year?: string };
    const result = await source.getSubsidies(year);
    if (result.isErr()) {
      return reply.code(statusFor(result.error)).send(result.error);
    }
    return result.value;
  });

  app.get("/listed", async (_request, reply) => {
    const result = await source.getListed();
    if (result.isErr()) {
      return reply.code(statusFor(result.error)).send(result.error);
    }
    return result.value;
  });
};
