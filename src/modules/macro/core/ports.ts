import type { Result } from "neverthrow";
import type { AppError } from "../../../common/errors";
import type {
  DebtSeries,
  DemographicSeries,
  FxSeries,
  GdpGrowthSeries,
  GdpPerCapitaSeries,
  InflationSeries,
  TradeSeries,
  UnemploymentSeries,
} from "./types";

export interface MacroDataSource {
  getInflation(): Promise<Result<InflationSeries, AppError>>;
  getUnemployment(): Promise<Result<UnemploymentSeries, AppError>>;
  getFx(): Promise<Result<FxSeries, AppError>>;
  getGdpGrowth(): Promise<Result<GdpGrowthSeries, AppError>>;
  getGdpPerCapita(): Promise<Result<GdpPerCapitaSeries, AppError>>;
  getDebt(): Promise<Result<DebtSeries, AppError>>;
  getTrade(): Promise<Result<TradeSeries, AppError>>;
  getDemographics(): Promise<Result<DemographicSeries, AppError>>;
}
