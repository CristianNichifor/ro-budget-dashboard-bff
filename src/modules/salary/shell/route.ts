import { Type } from "@sinclair/typebox";
import type { FastifyPluginAsync } from "fastify";
import type { Decimal } from "decimal.js";
import type { AppError } from "../../../common/errors";
import type { SalaryBreakdown } from "../core/types";
import type { TaxRatesProvider } from "../core/ports";
import { calculateSalaryBreakdown } from "../core/use-cases/calculate-salary";

const SalaryQuerySchema = Type.Object({
  gross: Type.String({ minLength: 1 }),
});

const SalaryEntrySchema = Type.Object({
  labelKey: Type.String(),
  amount: Type.String(),
});

const SalaryResponseSchema = Type.Object({
  gross: Type.String(),
  cas: Type.String(),
  cass: Type.String(),
  incomeTax: Type.String(),
  employerContribution: Type.String(),
  estimatedVat: Type.String(),
  net: Type.String(),
  employerCost: Type.String(),
  stateShare: Type.String(),
  statePercent: Type.String(),
  entries: Type.Array(SalaryEntrySchema),
});

const ErrorResponseSchema = Type.Object({
  code: Type.String(),
  message: Type.String(),
});

const ErrorResponses = {
  400: ErrorResponseSchema,
  500: ErrorResponseSchema,
} as const;

interface SalaryRouteDependencies {
  taxRates: TaxRatesProvider;
}

const MONEY_DECIMALS = 2;
const PERCENT_DECIMALS = 4;

function toLei(value: Decimal): string {
  return value.toDecimalPlaces(MONEY_DECIMALS).toFixed(MONEY_DECIMALS);
}

function serialize(breakdown: SalaryBreakdown) {
  return {
    gross: toLei(breakdown.gross),
    cas: toLei(breakdown.cas),
    cass: toLei(breakdown.cass),
    incomeTax: toLei(breakdown.incomeTax),
    employerContribution: toLei(breakdown.employerContribution),
    estimatedVat: toLei(breakdown.estimatedVat),
    net: toLei(breakdown.net),
    employerCost: toLei(breakdown.employerCost),
    stateShare: toLei(breakdown.stateShare),
    statePercent: breakdown.statePercent
      .toDecimalPlaces(PERCENT_DECIMALS)
      .toFixed(PERCENT_DECIMALS),
    entries: breakdown.entries.map((entry) => ({
      labelKey: entry.labelKey,
      amount: toLei(entry.amount),
    })),
  };
}

function statusFor(error: AppError): 400 | 500 {
  if (error.code === "INVALID_INPUT") {
    return 400;
  }
  return 500;
}

export const salaryRoutes: FastifyPluginAsync<{
  dependencies: SalaryRouteDependencies;
}> = async (app, options) => {
  const { taxRates } = options.dependencies;

  app.get(
    "/calculate",
    {
      schema: {
        querystring: SalaryQuerySchema,
        response: {
          200: SalaryResponseSchema,
          ...ErrorResponses,
        },
      },
    },
    async (request, reply) => {
      const { gross } = request.query as { gross: string };
      const result = calculateSalaryBreakdown(gross, taxRates.get());

      if (result.isErr()) {
        return reply.code(statusFor(result.error)).send(result.error);
      }

      return serialize(result.value);
    }
  );
};
