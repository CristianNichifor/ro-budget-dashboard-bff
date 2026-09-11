import { Decimal } from "decimal.js";
import type {
  InflationPoint,
  MonetaryContext,
  RealWagePoint,
} from "../../../../common/types";

/**
 * Deflates the nominal net salary with the cumulative CPI index.
 * First data point is the base year (index = 100).
 * Pure function — decimal.js only.
 */
export function computeRealWageSeries(
  points: InflationPoint[]
): RealWagePoint[] {
  let cumulativeCpi = new Decimal(100);

  return points.map((point, index) => {
    if (index > 0) {
      cumulativeCpi = cumulativeCpi.mul(
        new Decimal(1).plus(new Decimal(point.cpiPercent).div(100))
      );
    }

    const nominal = new Decimal(point.avgNetSalary);
    const real = nominal.div(cumulativeCpi.div(100));

    return {
      year: point.year,
      nominal: nominal.toNumber(),
      real: real.toNumber(),
    };
  });
}

/**
 * Debt service ratio: interest payments as a share of revenue.
 * "For every 100 lei collected, X lei go to paying interest on past debt."
 * Returns a percentage string (rounded to 2 decimals).
 */
export function computeDebtServiceRatio(
  interestPayment: string,
  revenue: string
): string {
  if (new Decimal(revenue).isZero()) {
    return "0";
  }
  return new Decimal(interestPayment)
    .div(revenue)
    .mul(100)
    .toDecimalPlaces(2)
    .toFixed(2);
}

export function buildMonetaryContext(
  inflationSeries: InflationPoint[],
  inflationTarget: number,
  debt: { total: string; interestPayment: string; averageRate: number },
  budgetSummary: { revenue: string }
): MonetaryContext {
  const last = inflationSeries.at(-1);

  return {
    inflation: {
      current: last?.cpiPercent ?? 0,
      target: inflationTarget,
      history: inflationSeries,
    },
    realWage: computeRealWageSeries(inflationSeries),
    debt: {
      total: debt.total,
      interestPayment: debt.interestPayment,
      averageRate: debt.averageRate,
      debtServiceRatio: computeDebtServiceRatio(
        debt.interestPayment,
        budgetSummary.revenue
      ),
    },
  };
}
