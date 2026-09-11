import { Type } from "@sinclair/typebox";
import type { FastifyPluginAsync } from "fastify";
import type { InvestmentsSource } from "../core/ports";

const CountyInvestmentSchema = Type.Object({
  county: Type.String(),
  region: Type.String(),
  amount: Type.String(),
});

const InvestmentsResponseSchema = Type.Object({
  year: Type.Integer(),
  total: Type.String(),
  counties: Type.Array(CountyInvestmentSchema),
});

const ErrorResponseSchema = Type.Object({
  code: Type.String(),
  message: Type.String(),
});

const ErrorResponses = {
  500: ErrorResponseSchema,
  502: ErrorResponseSchema,
} as const;

interface InvestmentsRouteDependencies {
  source: InvestmentsSource;
}

export const investmentsRoutes: FastifyPluginAsync<{
  dependencies: InvestmentsRouteDependencies;
}> = async (app, { dependencies }) => {
  const { source } = dependencies;

  app.get(
    "/by-county",
    {
      schema: {
        response: {
          200: InvestmentsResponseSchema,
          ...ErrorResponses,
        },
      },
    },
    async (_request, reply) => {
      const result = await source.getByCounty();
      if (result.isErr()) {
        return reply.code(502).send(result.error);
      }
      return result.value;
    }
  );
};
