import { err, ok, type Result } from "neverthrow";
import { z } from "zod";
import type { AppConfig } from "../../../infra/config";
import type { AppError } from "../../../common/errors";
import type { BudgetDestination, BudgetSummary } from "../../../common/types";
import type { BudgetDataSource, BudgetInstitutions } from "../core/ports";

/**
 * Best-effort client for hack-for-facts-eb-server (GraphQL-first, Fastify 5).
 *
 * NOTE (P2): the GraphQL field mapping below is written against the server
 * README's documented query categories (executionAnalytics,
 * aggregatedLineItems, datasets). It must be verified against the live
 * schema before DATA_SOURCE=hackforfacts is used in production.
 */

const GRAPHQL_SUMMARY_QUERY = `
  query DashboardSummary {
    executionAnalytics {
      revenue
      expenditure
    }
  }
`;

const GraphQLResponseSchema = z.object({
  data: z.record(z.string(), z.unknown()).nullable().optional(),
  errors: z.array(z.object({ message: z.string() })).optional(),
});

async function postGraphQL(
  config: AppConfig,
  query: string
): Promise<Result<unknown, AppError>> {
  try {
    const response = await fetch(`${config.hackForFactsBaseUrl}/graphql`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query }),
      signal: AbortSignal.timeout(config.hackForFactsTimeoutMs),
    });

    if (!response.ok) {
      return err({
        code: "UPSTREAM_UNAVAILABLE",
        message: `hack-for-facts responded with ${response.status}`,
      });
    }

    const parsed = GraphQLResponseSchema.safeParse(await response.json());
    if (!parsed.success) {
      return err({
        code: "UPSTREAM_UNAVAILABLE",
        message: "unexpected GraphQL response shape",
      });
    }

    if (parsed.data.errors !== undefined && parsed.data.errors.length > 0) {
      return err({
        code: "UPSTREAM_UNAVAILABLE",
        message: parsed.data.errors.map((item) => item.message).join("; "),
      });
    }

    return ok(parsed.data.data);
  } catch {
    return err({
      code: "UPSTREAM_UNAVAILABLE",
      message: "could not reach hack-for-facts-eb-server",
    });
  }
}

export class HackForFactsSource implements BudgetDataSource {
  constructor(private readonly config: AppConfig) {}

  async getSummary(): Promise<Result<BudgetSummary, AppError>> {
    const result = await postGraphQL(this.config, GRAPHQL_SUMMARY_QUERY);
    if (result.isErr()) {
      return err(result.error);
    }
    // TODO(P2): verify the real field mapping against the live schema.
    return err({
      code: "UPSTREAM_UNAVAILABLE",
      message:
        "summary field mapping not implemented — verify GraphQL schema first",
    });
  }

  async getDestinations(): Promise<Result<BudgetDestination[], AppError>> {
    return err({
      code: "UPSTREAM_UNAVAILABLE",
      message:
        "destinations field mapping not implemented — verify GraphQL schema first",
    });
  }

  async getInstitutions(
    _category: string
  ): Promise<Result<BudgetInstitutions, AppError>> {
    return err({
      code: "UPSTREAM_UNAVAILABLE",
      message:
        "institutions field mapping not implemented — verify GraphQL schema first",
    });
  }
}
