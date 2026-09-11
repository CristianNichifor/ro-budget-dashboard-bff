import type { Result } from "neverthrow";
import type { AppError } from "../../../common/errors";
import type { AdoptedTotals } from "./types";

/**
 * Source of adopted-budget data (MFP datasets on data.gov.ro). The adopted
 * law is public and immutable, so this source is always live — there is no
 * static demo variant, unlike the execution source.
 */
export interface AdoptedBudgetDataSource {
  getAdopted(year: string): Promise<Result<AdoptedTotals, AppError>>;
  supportedYears(): number[];
}
