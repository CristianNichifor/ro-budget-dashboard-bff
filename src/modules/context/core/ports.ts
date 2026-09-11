import type { Result } from "neverthrow";
import type { AppError } from "../../../common/errors";
import type {
  BudgetSummary,
  InflationPoint,
  YearAmount,
} from "../../../common/types";

export interface ContextTrend {
  metric: string;
  source: string;
  data: YearAmount[];
}

export interface ContextDataSource {
  getInflationSeries(): Promise<Result<InflationPoint[], AppError>>;
  getDebtContext(): Promise<
    Result<
      { total: string; interestPayment: string; averageRate: number },
      AppError
    >
  >;
  getBudgetSummary(): Promise<Result<BudgetSummary, AppError>>;
  getTrend(metric: string): Promise<Result<ContextTrend, AppError>>;
}
