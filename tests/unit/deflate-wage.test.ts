import { describe, expect, it } from "vitest";
import { deflateWageSeries } from "../../src/modules/wages/core/use-cases/deflate-wage";

describe("deflateWageSeries", () => {
  const monthly = [
    { quarter: "2022-Q1", grossMonthlyEur: 1000 },
    { quarter: "2023-Q1", grossMonthlyEur: 1100 },
  ];

  it("keeps nominal when the HICP index is 100", () => {
    const result = deflateWageSeries(monthly, [
      { ym: "2022-01", index: 100 },
      { ym: "2022-02", index: 100 },
      { ym: "2022-03", index: 100 },
      { ym: "2023-01", index: 100 },
      { ym: "2023-02", index: 100 },
      { ym: "2023-03", index: 100 },
    ]);

    expect(result.isOk()).toBe(true);
    if (!result.isOk()) {
      return;
    }
    expect(result.value.series[0]?.realEur).toBe(1000);
    expect(result.value.series[1]?.realEur).toBe(1100);
  });

  it("deflates earnings by the average HICP index of the quarter", () => {
    const result = deflateWageSeries(
      [{ quarter: "2023-Q1", grossMonthlyEur: 1100 }],
      [
        { ym: "2023-01", index: 110 },
        { ym: "2023-02", index: 120 },
        { ym: "2023-03", index: 130 },
      ]
    );

    expect(result.isOk()).toBe(true);
    if (!result.isOk()) {
      return;
    }
    // Average index = 120 → real = 1100 / 1.20 = 916.67 → rounded 917.
    expect(result.value.series[0]?.realEur).toBe(917);
  });

  it("sorts quarters ascending and skips quarters without HICP coverage", () => {
    const result = deflateWageSeries(
      [
        { quarter: "2023-Q2", grossMonthlyEur: 1200 },
        { quarter: "2022-Q1", grossMonthlyEur: 1000 },
      ],
      [{ ym: "2022-03", index: 100 }]
    );

    expect(result.isOk()).toBe(true);
    if (!result.isOk()) {
      return;
    }
    expect(result.value.series.map((p) => p.quarter)).toEqual(["2022-Q1"]);
  });

  it("fails when there is no overlap between wage and HICP series", () => {
    const result = deflateWageSeries(monthly, []);
    expect(result.isErr()).toBe(true);
  });
});
