import type { Result } from "neverthrow";
import type { AppError } from "../../../common/errors";
import type { InvestmentsByCounty } from "./types";

export interface InvestmentsSource {
  getByCounty(): Promise<Result<InvestmentsByCounty, AppError>>;
}
