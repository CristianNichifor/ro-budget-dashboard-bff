import { ok, type Result } from "neverthrow";
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

export class StaticBudgetSource implements BudgetDataSource {
  async getSummary(): Promise<Result<BudgetSummary, AppError>> {
    return ok(SEED_BUDGET_SUMMARY);
  }

  async getDestinations(): Promise<Result<BudgetDestination[], AppError>> {
    return ok(SEED_BUDGET_DESTINATIONS);
  }

  async getInstitutions(
    category: string
  ): Promise<Result<BudgetInstitutions, AppError>> {
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
