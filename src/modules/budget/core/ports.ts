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
  getSummary(): Promise<Result<BudgetSummary, AppError>>;
  getDestinations(): Promise<Result<BudgetDestination[], AppError>>;
  getInstitutions(
    category: string
  ): Promise<Result<BudgetInstitutions, AppError>>;
}
