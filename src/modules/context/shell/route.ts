import { Type } from "@sinclair/typebox";
import type { FastifyPluginAsync } from "fastify";
import { SEED_INFLATION_TARGET } from "../../../common/seed-data";
import type { AppError } from "../../../common/errors";
import type { ContextDataSource } from "../core/ports";
import { buildMonetaryContext } from "../core/use-cases/monetary-context";

const InflationPointSchema = Type.Object({
  year: Type.Integer(),
  cpiPercent: Type.Number(),
  avgNetSalary: Type.Number(),
});

const RealWagePointSchema = Type.Object({
  year: Type.Integer(),
  nominal: Type.Number(),
  real: Type.Number(),
});

const MonetaryResponseSchema = Type.Object({
  inflation: Type.Object({
    current: Type.Number(),
    target: Type.Number(),
    history: Type.Array(InflationPointSchema),
  }),
  realWage: Type.Array(RealWagePointSchema),
  debt: Type.Object({
    total: Type.String(),
    interestPayment: Type.String(),
    averageRate: Type.Number(),
    debtServiceRatio: Type.String(),
  }),
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

const TrendsQuerySchema = Type.Object({
  metric: Type.String({ minLength: 1 }),
});

const TrendsResponseSchema = Type.Object({
  metric: Type.String(),
  source: Type.String(),
  data: Type.Array(
    Type.Object({
      year: Type.Integer(),
      amount: Type.String(),
    })
  ),
});

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
    "/monetary",
    {
      schema: {
        response: { 200: MonetaryResponseSchema, ...ErrorResponses },
      },
    },
    async (_request, reply) => {
      const inflation = await source.getInflationSeries();
      if (inflation.isErr()) {
        return reply.code(statusFor(inflation.error)).send(inflation.error);
      }

      const debt = await source.getDebtContext();
      if (debt.isErr()) {
        return reply.code(statusFor(debt.error)).send(debt.error);
      }

      const summary = await source.getBudgetSummary();
      if (summary.isErr()) {
        return reply.code(statusFor(summary.error)).send(summary.error);
      }

      return buildMonetaryContext(
        inflation.value,
        SEED_INFLATION_TARGET,
        debt.value,
        summary.value
      );
    }
  );

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
