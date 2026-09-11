import { err, ok, type Result } from "neverthrow";
import type { AppError } from "../../../common/errors";
import { invalidInput } from "../../../common/errors";

/**
 * Supported budget years. transparenta.eu carries execution reports from
 * 2020 onward; the range grows automatically up to the current year (the
 * in-progress year is included — its amounts grow as monthly reports land).
 */
export const FIRST_SUPPORTED_YEAR = 2020;

export function availableBudgetYears(now: Date = new Date()): number[] {
  const end = now.getFullYear();
  const years: number[] = [];
  for (let year = FIRST_SUPPORTED_YEAR; year <= end; year += 1) {
    years.push(year);
  }
  return years;
}

export function validateBudgetYear(year: string): Result<string, AppError> {
  if (!/^\d{4}$/.test(year)) {
    return err(invalidInput(`invalid budget year: ${year}`));
  }
  const numeric = Number(year);
  const max = new Date().getFullYear();
  if (numeric < FIRST_SUPPORTED_YEAR || numeric > max) {
    return err(
      invalidInput(`budget year out of range: ${FIRST_SUPPORTED_YEAR}..${max}`)
    );
  }
  return ok(year);
}
