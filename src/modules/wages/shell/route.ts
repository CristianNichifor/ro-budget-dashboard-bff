import type { FastifyPluginAsync } from "fastify";
import { Type } from "@sinclair/typebox";
import type { AppError } from "../../../common/errors";
import type { WageDataSource } from "../core/ports";

interface WageRouteDependencies {
  source: WageDataSource;
}

const RealWagePointSchema = Type.Object({
  quarter: Type.String(),
  nominalEur: Type.Number(),
  realEur: Type.Number(),
});

const RealWageResponseSchema = Type.Object({
  series: Type.Array(RealWagePointSchema),
  estimated: Type.Boolean(),
  note: Type.String(),
  sourceUpdated: Type.String(),
});

const ErrorResponseSchema = Type.Object({
  code: Type.String(),
  message: Type.String(),
});

const ErrorResponses = {
  400: ErrorResponseSchema,
  404: ErrorResponseSchema,
  500: ErrorResponseSchema,
  502: ErrorResponseSchema,
} as const;

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

export const wageRoutes: FastifyPluginAsync<{
  dependencies: WageRouteDependencies;
}> = async (app, options) => {
  const { source } = options.dependencies;

  app.get("/context", async (_request, reply) => {
    const result = await source.getContext();
    if (result.isErr()) {
      return reply.code(statusFor(result.error)).send(result.error);
    }
    return result.value;
  });

  app.get("/monthly", async (_request, reply) => {
    const result = await source.getMonthly();
    if (result.isErr()) {
      return reply.code(statusFor(result.error)).send(result.error);
    }
    return result.value;
  });

  app.get(
    "/real",
    {
      schema: {
        response: { 200: RealWageResponseSchema, ...ErrorResponses },
      },
    },
    async (_request, reply) => {
      const result = await source.getReal();
      if (result.isErr()) {
        return reply.code(statusFor(result.error)).send(result.error);
      }
      return result.value;
    }
  );
};
