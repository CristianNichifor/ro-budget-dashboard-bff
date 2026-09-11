import type { Result } from "neverthrow";
import type { AppError } from "../../../common/errors";
import type { InsMetric } from "./types";

export interface InsDataSource {
  getMetric(code: string): Promise<Result<InsMetric, AppError>>;
}
