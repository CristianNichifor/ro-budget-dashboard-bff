import type { Result } from "neverthrow";
import type { AppError } from "../../../common/errors";
import type {
  DemographicsSeries,
  EducationSeries,
  HealthSeries,
  PopulationSeries,
  SocietySpending,
} from "./types";

export interface SocietyDataSource {
  getPopulation(): Promise<Result<PopulationSeries, AppError>>;
  getSpending(): Promise<Result<SocietySpending, AppError>>;
  getEducation(): Promise<Result<EducationSeries, AppError>>;
  getHealth(): Promise<Result<HealthSeries, AppError>>;
  getDemographics(): Promise<Result<DemographicsSeries, AppError>>;
}
