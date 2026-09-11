import type { Result } from "neverthrow";
import type { AppError } from "../../../common/errors";
import type { InsCatalogEntry, InsMetric } from "./types";

export interface InsDataSource {
  getMetric(code: string): Promise<Result<InsMetric, AppError>>;
  getCatalog(): Promise<Result<InsCatalogEntry[], AppError>>;
}
