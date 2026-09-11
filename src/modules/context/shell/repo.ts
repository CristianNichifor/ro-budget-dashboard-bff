import { ok, type Result } from "neverthrow";
import type { AppError } from "../../../common/errors";
import {
  SEED_BUDGET_SUMMARY,
  SEED_DEBT,
  SEED_HEALTH_BUDGET_TREND,
  SEED_INFLATION_SERIES,
} from "../../../common/seed-data";
import type {
  BudgetSummary,
  InflationPoint,
  YearAmount,
} from "../../../common/types";
import type { ContextDataSource, ContextTrend } from "../core/ports";

const SEED_TRENDS: Record<string, { source: string; data: YearAmount[] }> = {
  "health-budget": {
    source: "hack-for-facts-eb-server (demo)",
    data: SEED_HEALTH_BUDGET_TREND,
  },
};

export class StaticContextSource implements ContextDataSource {
  async getInflationSeries(): Promise<Result<InflationPoint[], AppError>> {
    return ok(SEED_INFLATION_SERIES);
  }

  async getDebtContext(): Promise<
    Result<
      { total: string; interestPayment: string; averageRate: number },
      AppError
    >
  > {
    return ok(SEED_DEBT);
  }

  async getBudgetSummary(): Promise<Result<BudgetSummary, AppError>> {
    return ok(SEED_BUDGET_SUMMARY);
  }

  async getTrend(metric: string): Promise<Result<ContextTrend, AppError>> {
    const trend = SEED_TRENDS[metric];

    if (trend === undefined) {
      return ok({ metric, source: "unknown", data: [] });
    }

    return ok({ metric, source: trend.source, data: trend.data });
  }
}

export function buildContextSource(): ContextDataSource {
  return new StaticContextSource();
}
