import { Type } from "@sinclair/typebox";
import type { FastifyPluginAsync } from "fastify";
import type { Decimal } from "decimal.js";
import type { AppError } from "../../../common/errors";
import type { BudgetDataSource } from "../../budget/core/ports";
import type { AdoptedBudgetDataSource } from "../core/ports";
import { buildBudgetComparison } from "../core/parser";
import { ADOPTED_SCOPE_NOTE } from "../core/types";

const AdoptedFundResponseSchema = Type.Object({
  id: Type.String(),
  name: Type.String(),
  revenue: Type.String(),
  expenditure: Type.String(),
  deficit: Type.String(),
});

const AdoptedResponseSchema = Type.Object({
  year: Type.Integer(),
  revenue: Type.String(),
  expenditure: Type.String(),
  deficit: Type.String(),
  funds: Type.Array(AdoptedFundResponseSchema),
  warnings: Type.Array(Type.String()),
  note: Type.String(),
});

const YearQuerySchema = Type.Object({
  year: Type.Optional(Type.String({ pattern: "^[0-9]{4}$" })),
});

const ComparisonQuerySchema = Type.Object({
  years: Type.Optional(Type.String({ pattern: "^[0-9]{4}(,[0-9]{4})*$" })),
});

const ComparisonSideSchema = Type.Object({
  revenue: Type.String(),
  expenditure: Type.String(),
  deficit: Type.String(),
});

const ComparisonExecutedSchema = Type.Object({
  revenue: Type.String(),
  expenditure: Type.String(),
  deficit: Type.String(),
  deficitPercentGdp: Type.String(),
});

const ComparisonPointSchema = Type.Object({
  year: Type.Integer(),
  adopted: ComparisonSideSchema,
  executed: Type.Union([ComparisonExecutedSchema, Type.Null()]),
  deficitDelta: Type.Union([Type.String(), Type.Null()]),
  note: Type.String(),
});

const ComparisonResponseSchema = Type.Object({
  points: Type.Array(ComparisonPointSchema),
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

interface AdoptedRouteDependencies {
  adoptedSource: AdoptedBudgetDataSource;
  budgetSource: BudgetDataSource;
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

function money(value: Decimal): string {
  return value.toFixed(0);
}

export const budgetAdoptedRoutes: FastifyPluginAsync<{
  dependencies: AdoptedRouteDependencies;
}> = async (app, options) => {
  const { adoptedSource, budgetSource } = options.dependencies;

  app.get(
    "/adopted",
    {
      schema: {
        querystring: YearQuerySchema,
        response: { 200: AdoptedResponseSchema, ...ErrorResponses },
      },
    },
    async (request, reply) => {
      const year =
        (request.query as { year?: string }).year ??
        String(adoptedSource.supportedYears().at(-1) ?? 2025);
      const result = await adoptedSource.getAdopted(year);
      if (result.isErr()) {
        return reply.code(statusFor(result.error)).send(result.error);
      }
      const totals = result.value;
      return {
        year: totals.year,
        revenue: money(totals.revenue),
        expenditure: money(totals.expenditure),
        deficit: money(totals.deficit),
        funds: totals.funds.map((fund) => ({
          id: fund.id,
          name: fund.name,
          revenue: money(fund.revenue),
          expenditure: money(fund.expenditure),
          deficit: money(fund.deficit),
        })),
        warnings: totals.warnings,
        note: ADOPTED_SCOPE_NOTE,
      };
    }
  );

  app.get(
    "/comparison",
    {
      schema: {
        querystring: ComparisonQuerySchema,
        response: { 200: ComparisonResponseSchema, ...ErrorResponses },
      },
    },
    async (request, reply) => {
      // Execution data exists from 2020 onward — older adopted years are
      // served by /adopted but excluded from the default comparison range.
      const comparisonYears = adoptedSource
        .supportedYears()
        .filter((year) => year >= 2020);
      const yearsParam =
        (request.query as { years?: string }).years ??
        comparisonYears.join(",");

      const points = [];
      for (const year of yearsParam.split(",")) {
        const adopted = await adoptedSource.getAdopted(year);
        if (adopted.isErr()) {
          return reply.code(statusFor(adopted.error)).send(adopted.error);
        }

        const executedResult = await budgetSource.getSummary(year);
        // The static demo source answers every year with the 2026 seed —
        // only accept an execution summary whose year matches the request.
        const executed =
          executedResult.isOk() && executedResult.value.year === Number(year)
            ? executedResult.value
            : null;

        const comparison = buildBudgetComparison(
          Number(year),
          adopted.value,
          executed
        );
        points.push({
          year: comparison.year,
          adopted: {
            revenue: money(comparison.adopted.revenue),
            expenditure: money(comparison.adopted.expenditure),
            deficit: money(comparison.adopted.deficit),
          },
          executed:
            comparison.executed === null
              ? null
              : {
                  revenue: money(comparison.executed.revenue),
                  expenditure: money(comparison.executed.expenditure),
                  deficit: money(comparison.executed.deficit),
                  deficitPercentGdp:
                    comparison.executed.deficitPercentGdp.toFixed(1),
                },
          deficitDelta:
            comparison.deficitDelta === null
              ? null
              : money(comparison.deficitDelta),
          note: comparison.note,
        });
      }

      return { points };
    }
  );
};
