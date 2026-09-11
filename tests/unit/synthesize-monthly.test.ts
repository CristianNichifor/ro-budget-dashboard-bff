import { describe, expect, it } from "vitest";
import { synthesizeMonthlyWage } from "../../src/modules/wages/core/use-cases/synthesize-monthly";

describe("synthesizeMonthlyWage", () => {
  it("anchors the level to SES and chains LCI changes forward and backward", () => {
    const result = synthesizeMonthlyWage(
      [
        { quarter: "2021-Q1", pctChange: 5 },
        { quarter: "2022-Q1", pctChange: 10 },
        { quarter: "2023-Q1", pctChange: 20 },
      ],
      [{ year: "2022", meanGrossEur: 12000 }]
    );

    expect(result.isOk()).toBe(true);
    if (!result.isOk()) {
      return;
    }
    expect(result.value.estimated).toBe(true);
    expect(result.value.monthly).toEqual([
      { quarter: "2021-Q1", grossMonthlyEur: 909 }, // 1000 / 1.10
      { quarter: "2022-Q1", grossMonthlyEur: 1000 }, // anchor: 12000 / 12
      { quarter: "2023-Q1", grossMonthlyEur: 1200 }, // 1000 * 1.20
    ]);
  });

  it("sorts quarters ascending regardless of input order", () => {
    const result = synthesizeMonthlyWage(
      [
        { quarter: "2023-Q2", pctChange: 0 },
        { quarter: "2022-Q2", pctChange: 0 },
      ],
      [{ year: "2022", meanGrossEur: 12000 }]
    );

    expect(result.isOk()).toBe(true);
    if (!result.isOk()) {
      return;
    }
    expect(result.value.monthly.map((p) => p.quarter)).toEqual([
      "2022-Q2",
      "2023-Q2",
    ]);
  });

  it("fails when there is no SES anchor", () => {
    const result = synthesizeMonthlyWage(
      [{ quarter: "2022-Q1", pctChange: 1 }],
      []
    );
    expect(result.isErr()).toBe(true);
  });

  it("fails when there are no LCI points", () => {
    const result = synthesizeMonthlyWage(
      [],
      [{ year: "2022", meanGrossEur: 12000 }]
    );
    expect(result.isErr()).toBe(true);
  });
});
