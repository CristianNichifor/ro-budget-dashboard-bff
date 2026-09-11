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

  app.get("/gdp-growth", async (_request, reply) => {
    const result = await source.getGdpGrowth();
    if (result.isErr()) {
      return reply.code(statusFor(result.error)).send(result.error);
    }
    return result.value;
  });

  app.get("/gdp-per-capita", async (_request, reply) => {
    const result = await source.getGdpPerCapita();
    if (result.isErr()) {
      return reply.code(statusFor(result.error)).send(result.error);
    }
    return result.value;
  });

  app.get("/gdp-regions", async (_request, reply) => {
    const result = await source.getGdpRegions();
    if (result.isErr()) {
      return reply.code(statusFor(result.error)).send(result.error);
    }
    return result.value;
  });

  app.get("/debt", async (_request, reply) => {
    const result = await source.getDebt();
    if (result.isErr()) {
      return reply.code(statusFor(result.error)).send(result.error);
    }
    return result.value;
  });

  app.get("/trade", async (_request, reply) => {
    const result = await source.getTrade();
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

  app.get("/deficit", async (_request, reply) => {
    const result = await source.getDeficit();
    if (result.isErr()) {
      return reply.code(statusFor(result.error)).send(result.error);
    }
    return result.value;
  });

  app.get("/employment", async (_request, reply) => {
    const result = await source.getEmployment();
    if (result.isErr()) {
      return reply.code(statusFor(result.error)).send(result.error);
    }
    return result.value;
  });

  app.get("/current-account", async (_request, reply) => {
    const result = await source.getCurrentAccount();
    if (result.isErr()) {
      return reply.code(statusFor(result.error)).send(result.error);
    }
    return result.value;
  });

  app.get("/rates", async (_request, reply) => {
    const result = await source.getRates();
    if (result.isErr()) {
      return reply.code(statusFor(result.error)).send(result.error);
    }
    return result.value;
  });
};
