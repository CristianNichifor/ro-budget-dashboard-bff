import { describe, expect, it } from "vitest";
import {
  FIRST_SUPPORTED_YEAR,
  availableBudgetYears,
  validateBudgetYear,
} from "../../src/modules/budget/core/years";

describe("availableBudgetYears", () => {
  it("grows from the first supported year to the given year", () => {
    expect(availableBudgetYears(new Date(2026, 0, 15))).toEqual([
      2020, 2021, 2022, 2023, 2024, 2025, 2026,
    ]);
  });

  it("returns a single year when the clock reads the first supported year", () => {
    expect(availableBudgetYears(new Date(FIRST_SUPPORTED_YEAR, 6, 1))).toEqual([
      FIRST_SUPPORTED_YEAR,
    ]);
  });
});

describe("validateBudgetYear", () => {
  it("accepts supported years", () => {
    for (const year of ["2020", "2024", String(new Date().getFullYear())]) {
      expect(validateBudgetYear(year).isOk()).toBe(true);
    }
  });

  it("rejects malformed years", () => {
    for (const year of ["", "abcd", "20", "20245", "-2024"]) {
      const result = validateBudgetYear(year);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe("INVALID_INPUT");
      }
    }
  });

  it("rejects years before the supported range", () => {
    expect(validateBudgetYear("1999").isErr()).toBe(true);
  });

  it("rejects future years", () => {
    const future = String(new Date().getFullYear() + 1);
    expect(validateBudgetYear(future).isErr()).toBe(true);
  });
});
