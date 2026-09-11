import { err, ok, type Result } from "neverthrow";
import type { AppError } from "../../../common/errors";
import {
  SEED_BUDGET_DESTINATIONS,
  SEED_BUDGET_SUMMARY,
} from "../../../common/seed-data";
import type {
  BudgetDestination,
  BudgetSubDestination,
  BudgetSummary,
} from "../../../common/types";
import type { BudgetDataSource, BudgetInstitutions } from "../core/ports";
import { validateBudgetYear } from "../core/years";

export class StaticBudgetSource implements BudgetDataSource {
  getYears(): number[] {
    return [SEED_BUDGET_SUMMARY.year];
  }

  async getSummary(year: string): Promise<Result<BudgetSummary, AppError>> {
    const validated = validateBudgetYear(year);
    if (validated.isErr()) {
      return err(validated.error);
    }
    return ok(SEED_BUDGET_SUMMARY);
  }

  async getDestinations(
    year: string
  ): Promise<Result<BudgetDestination[], AppError>> {
    const validated = validateBudgetYear(year);
    if (validated.isErr()) {
      return err(validated.error);
    }
    return ok(SEED_BUDGET_DESTINATIONS);
  }

  async getInstitutions(
    year: string,
    category: string
  ): Promise<Result<BudgetInstitutions, AppError>> {
    const validated = validateBudgetYear(year);
    if (validated.isErr()) {
      return err(validated.error);
    }
    const destination = SEED_BUDGET_DESTINATIONS.find(
      (item) => item.id === category
    );

    if (destination === undefined) {
      return ok({
        category,
        total: "0",
        institutions: [] as BudgetSubDestination[],
      });
    }

    return ok({
      category,
      total: destination.amount,
      institutions: destination.subDestinations ?? [],
    });
  }
}
