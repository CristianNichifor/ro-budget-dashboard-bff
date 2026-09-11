import type { FastifyPluginAsync } from "fastify";
import type { AppError } from "../../../common/errors";
import type { MacroDataSource } from "../core/ports";

interface MacroRouteDependencies {
  source: MacroDataSource;
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

export const macroRoutes: FastifyPluginAsync<{
  dependencies: MacroRouteDependencies;
}> = async (app, options) => {
  const { source } = options.dependencies;

  app.get("/inflation", async (_request, reply) => {
    const result = await source.getInflation();
    if (result.isErr()) {
      return reply.code(statusFor(result.error)).send(result.error);
    }
    return result.value;
  });

  app.get("/unemployment", async (_request, reply) => {
    const result = await source.getUnemployment();
    if (result.isErr()) {
      return reply.code(statusFor(result.error)).send(result.error);
    }
    return result.value;
  });

  app.get("/fx", async (_request, reply) => {
    const result = await source.getFx();
    if (result.isErr()) {
      return reply.code(statusFor(result.error)).send(result.error);
    }
    return result.value;
  });
};
