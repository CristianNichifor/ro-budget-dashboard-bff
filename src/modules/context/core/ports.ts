import type { Result } from "neverthrow";
import type { AppError } from "../../../common/errors";
import type { YearAmount } from "../../../common/types";

export interface ContextTrend {
  metric: string;
  source: string;
  sourceUpdated: string;
  data: YearAmount[];
}

export interface ContextDataSource {
  getTrend(metric: string): Promise<Result<ContextTrend, AppError>>;
}
