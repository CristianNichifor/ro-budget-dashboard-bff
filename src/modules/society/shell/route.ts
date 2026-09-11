import type { FastifyPluginAsync } from "fastify";
import type { AppError } from "../../../common/errors";
import type { SocietyDataSource } from "../core/ports";

interface SocietyRouteDependencies {
  source: SocietyDataSource;
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

export const societyRoutes: FastifyPluginAsync<{
  dependencies: SocietyRouteDependencies;
}> = async (app, options) => {
  const { source } = options.dependencies;

  app.get("/population", async (_request, reply) => {
    const result = await source.getPopulation();
    if (result.isErr()) {
      return reply.code(statusFor(result.error)).send(result.error);
    }
    return result.value;
  });

  app.get("/spending", async (_request, reply) => {
    const result = await source.getSpending();
    if (result.isErr()) {
      return reply.code(statusFor(result.error)).send(result.error);
    }
    return result.value;
  });

  app.get("/education", async (_request, reply) => {
    const result = await source.getEducation();
    if (result.isErr()) {
      return reply.code(statusFor(result.error)).send(result.error);
    }
    return result.value;
  });

  app.get("/health", async (_request, reply) => {
    const result = await source.getHealth();
    if (result.isErr()) {
      return reply.code(statusFor(result.error)).send(result.error);
    }
    return result.value;
  });

  app.get("/demographics", async (_request, reply) => {
    const result = await source.getDemographics();
    if (result.isErr()) {
      return reply.code(statusFor(result.error)).send(result.error);
    }
    return result.value;
  });
};
