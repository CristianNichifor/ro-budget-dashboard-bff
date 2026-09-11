import type { Result } from "neverthrow";
import type { AppError } from "../../../common/errors";
import type { MonthlyWageSeries, RealWageSeries, WageContext } from "./types";

export interface WageDataSource {
  getContext(): Promise<Result<WageContext, AppError>>;
  getMonthly(): Promise<Result<MonthlyWageSeries, AppError>>;
  getReal(): Promise<Result<RealWageSeries, AppError>>;
}
