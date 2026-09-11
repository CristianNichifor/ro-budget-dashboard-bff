import type { Result } from "neverthrow";
import type { AppError } from "../../../common/errors";
import type {
  BudgetDestination,
  BudgetSubDestination,
  BudgetSummary,
} from "../../../common/types";

export interface BudgetInstitutions {
  category: string;
  total: string;
  institutions: BudgetSubDestination[];
}

export interface BudgetDataSource {
  getSummary(year: string): Promise<Result<BudgetSummary, AppError>>;
  getDestinations(year: string): Promise<Result<BudgetDestination[], AppError>>;
  getInstitutions(
    year: string,
    category: string
  ): Promise<Result<BudgetInstitutions, AppError>>;
  getYears(): number[];
}
