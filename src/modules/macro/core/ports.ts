import type { Result } from "neverthrow";
import type { AppError } from "../../../common/errors";
import type { FxSeries, InflationSeries, UnemploymentSeries } from "./types";

export interface MacroDataSource {
  getInflation(): Promise<Result<InflationSeries, AppError>>;
  getUnemployment(): Promise<Result<UnemploymentSeries, AppError>>;
  getFx(): Promise<Result<FxSeries, AppError>>;
}
