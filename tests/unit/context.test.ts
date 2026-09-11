import { describe, expect, it } from "vitest";
import { SEED_INFLATION_SERIES } from "../../src/common/seed-data";
import {
  buildMonetaryContext,
  computeDebtServiceRatio,
  computeRealWageSeries,
} from "../../src/modules/context/core/use-cases/monetary-context";

describe("computeRealWageSeries", () => {
  it("keeps the base year nominal equal to real", () => {
    const series = computeRealWageSeries(SEED_INFLATION_SERIES);
    const first = series[0];

    expect(first).toBeDefined();
    if (first === undefined) {
      return;
    }
    expect(first.real).toBeCloseTo(first.nominal, 6);
  });

  it("deflates the wage when inflation is positive", () => {
    const series = computeRealWageSeries(SEED_INFLATION_SERIES);
    const last = series.at(-1);

    expect(last).toBeDefined();
    if (last === undefined) {
      return;
    }
    expect(last.real).toBeLessThan(last.nominal);
  });
});

describe("computeDebtServiceRatio", () => {
  it("computes interest payments as a share of revenue", () => {
    const ratio = computeDebtServiceRatio("59407395000", "728990724000");

    expect(Number(ratio)).toBeCloseTo(8.15, 1);
  });

  it("returns zero when revenue is zero", () => {
    expect(computeDebtServiceRatio("100", "0")).toBe("0");
  });
});

describe("buildMonetaryContext", () => {
  it("assembles inflation, real wage and debt into one context", () => {
    const context = buildMonetaryContext(
      SEED_INFLATION_SERIES,
      2.5,
      {
        total: "883000000000",
        interestPayment: "59407395000",
        averageRate: 6.8,
      },
      { revenue: "728990724000" }
    );

    expect(context.inflation.current).toBeCloseTo(9.69, 2);
    expect(context.inflation.target).toBe(2.5);
    expect(context.realWage).toHaveLength(SEED_INFLATION_SERIES.length);
    expect(Number(context.debt.debtServiceRatio)).toBeCloseTo(8.15, 1);
  });
});
