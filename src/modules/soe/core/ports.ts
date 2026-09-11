import type { Result } from "neverthrow";
import type { AppError } from "../../../common/errors";
import type {
  SoeByCounty,
  SoeCompany,
  SoeListed,
  SoeScatter,
  SoeSectorTrend,
  SoeSubsidies,
  SoeSummary,
} from "./types";

export interface SoeDataSource {
  getSummary(): Promise<Result<SoeSummary, AppError>>;
  getSectorTrend(): Promise<Result<SoeSectorTrend, AppError>>;
  getByCounty(): Promise<Result<SoeByCounty, AppError>>;
  getScatter(): Promise<Result<SoeScatter, AppError>>;
  getCompany(cui: string): Promise<Result<SoeCompany, AppError>>;
  getSubsidies(year?: string): Promise<Result<SoeSubsidies, AppError>>;
  getListed(): Promise<Result<SoeListed, AppError>>;
}
