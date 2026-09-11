import type { FastifyPluginAsync } from "fastify";
import type { AppError } from "../../../common/errors";
import type { EnergyDataSource } from "../core/ports";

interface EnergyRouteDependencies {
  source: EnergyDataSource;
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

export const energyRoutes: FastifyPluginAsync<{
  dependencies: EnergyRouteDependencies;
}> = async (app, options) => {
  const { source } = options.dependencies;

  app.get("/context", async (_request, reply) => {
    const result = await source.getContext();
    if (result.isErr()) {
      return reply.code(statusFor(result.error)).send(result.error);
    }
    return result.value;
  });
};
