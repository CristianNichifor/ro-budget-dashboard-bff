import { Type } from "@sinclair/typebox";
import type { FastifyPluginAsync } from "fastify";
import type { AppError } from "../../../common/errors";
import type { ContextDataSource } from "../core/ports";

const TrendsQuerySchema = Type.Object({
  metric: Type.String({ minLength: 1 }),
});

const TrendsResponseSchema = Type.Object({
  metric: Type.String(),
  source: Type.String(),
  sourceUpdated: Type.String(),
  data: Type.Array(
    Type.Object({
      year: Type.Integer(),
      amount: Type.String(),
    })
  ),
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

interface ContextRouteDependencies {
  source: ContextDataSource;
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

export const contextRoutes: FastifyPluginAsync<{
  dependencies: ContextRouteDependencies;
}> = async (app, options) => {
  const { source } = options.dependencies;

  app.get(
    "/trends",
    {
      schema: {
        querystring: TrendsQuerySchema,
        response: { 200: TrendsResponseSchema, ...ErrorResponses },
      },
    },
    async (request, reply) => {
      const { metric } = request.query as { metric: string };
      const result = await source.getTrend(metric);
      if (result.isErr()) {
        return reply.code(statusFor(result.error)).send(result.error);
      }

      if (result.value.data.length === 0) {
        return reply.code(404).send({
          code: "NOT_FOUND",
          message: `unknown metric: ${metric}`,
        });
      }

      return result.value;
    }
  );
};
