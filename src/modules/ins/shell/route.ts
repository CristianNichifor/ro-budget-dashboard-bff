import { Type } from "@sinclair/typebox";
import type { FastifyPluginAsync } from "fastify";
import { notFound } from "../../../common/errors";
import type { AppError } from "../../../common/errors";
import type { InsDataSource } from "../core/ports";

const MetricQuerySchema = Type.Object({
  code: Type.String({ minLength: 1 }),
});

const MetricResponseSchema = Type.Object({
  code: Type.String(),
  unit: Type.String(),
  label: Type.String(),
  data: Type.Array(
    Type.Object({
      year: Type.Integer(),
      value: Type.Number(),
    })
  ),
});

const CatalogEntrySchema = Type.Object({
  code: Type.String(),
  label: Type.String(),
  unit: Type.String(),
});

const CatalogResponseSchema = Type.Object({
  metrics: Type.Array(CatalogEntrySchema),
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

interface InsRouteDependencies {
  source: InsDataSource;
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

export const insRoutes: FastifyPluginAsync<{
  dependencies: InsRouteDependencies;
}> = async (app, options) => {
  const { source } = options.dependencies;

  app.get(
    "/metrics",
    {
      schema: {
        querystring: MetricQuerySchema,
        response: { 200: MetricResponseSchema, ...ErrorResponses },
      },
    },
    async (request, reply) => {
      const { code } = request.query as { code: string };
      const result = await source.getMetric(code);
      if (result.isErr()) {
        return reply.code(statusFor(result.error)).send(result.error);
      }

      if (result.value.data.length === 0) {
        return reply.code(404).send(notFound(`unknown metric: ${code}`));
      }

      return result.value;
    }
  );

  app.get(
    "/catalog",
    {
      schema: {
        response: { 200: CatalogResponseSchema, ...ErrorResponses },
      },
    },
    async (_request, reply) => {
      const result = await source.getCatalog();
      if (result.isErr()) {
        return reply.code(statusFor(result.error)).send(result.error);
      }
      return { metrics: result.value };
    }
  );
};
