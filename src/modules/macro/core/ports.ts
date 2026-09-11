import type { Result } from "neverthrow";
import type { AppError } from "../../../common/errors";
import type {
  CurrentAccountSeries,
  DebtSeries,
  DeficitSeries,
  DemographicSeries,
  EmploymentSeries,
  FxSeries,
  GdpGrowthSeries,
  GdpPerCapitaSeries,
  GdpRegionsSeries,
  InflationSeries,
  RatesSeries,
  TradeSeries,
  UnemploymentSeries,
} from "./types";

export interface MacroDataSource {
  getInflation(): Promise<Result<InflationSeries, AppError>>;
  getUnemployment(): Promise<Result<UnemploymentSeries, AppError>>;
  getFx(): Promise<Result<FxSeries, AppError>>;
  getGdpGrowth(): Promise<Result<GdpGrowthSeries, AppError>>;
  getGdpPerCapita(): Promise<Result<GdpPerCapitaSeries, AppError>>;
  getGdpRegions(): Promise<Result<GdpRegionsSeries, AppError>>;
  getDebt(): Promise<Result<DebtSeries, AppError>>;
  getTrade(): Promise<Result<TradeSeries, AppError>>;
  getDemographics(): Promise<Result<DemographicSeries, AppError>>;
  getDeficit(): Promise<Result<DeficitSeries, AppError>>;
  getEmployment(): Promise<Result<EmploymentSeries, AppError>>;
  getCurrentAccount(): Promise<Result<CurrentAccountSeries, AppError>>;
  getRates(): Promise<Result<RatesSeries, AppError>>;
}
