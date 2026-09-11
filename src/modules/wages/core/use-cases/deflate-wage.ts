import { Decimal } from "decimal.js";
import { err, ok, type Result } from "neverthrow";
import type { AppError } from "../../../../common/errors";
import { upstreamUnavailable } from "../../../../common/errors";
import type {
  HicpIndexPoint,
  MonthlyWagePoint,
  RealWagePoint,
  RealWageSeries,
} from "../types";

const QUARTER_RE = /^(\d{4})-Q([1-4])$/;

const QUARTER_MONTHS: Record<string, string[]> = {
  "1": ["01", "02", "03"],
  "2": ["04", "05", "06"],
  "3": ["07", "08", "09"],
  "4": ["10", "11", "12"],
};

export const REAL_WAGE_NOTE =
  "Estimare: câștigul mediu lunar brut estimat (Eurostat) ajustat cu indicele prețurilor HICP (2015=100), exprimat în euro la prețuri constante.";

/**
 * Deflates the estimated monthly gross earnings with the HICP index so the
 * nominal and real series are comparable. Each quarter is deflated by the
 * average HICP index of its three months. Pure function — decimal.js only.
 */
export function deflateWageSeries(
  monthly: MonthlyWagePoint[],
  hicp: HicpIndexPoint[]
): Result<Omit<RealWageSeries, "sourceUpdated">, AppError> {
  const indexByYm = new Map(hicp.map((point) => [point.ym, point.index]));

  const series: RealWagePoint[] = [];
  for (const point of monthly) {
    const match = QUARTER_RE.exec(point.quarter);
    if (match === null) {
      continue;
    }
    const year = match[1];
    const quarterNumber = match[2];
    if (year === undefined || quarterNumber === undefined) {
      continue;
    }
    const quarterMonths = QUARTER_MONTHS[quarterNumber];
    if (quarterMonths === undefined) {
      continue;
    }
    const months = quarterMonths.map((month: string) => `${year}-${month}`);
    const indices = months
      .map((ym) => indexByYm.get(ym))
      .filter((value): value is number => value !== undefined);

    if (indices.length === 0) {
      continue;
    }

    const averageIndex =
      indices.reduce((sum, value) => sum + value, 0) / indices.length;
    const real = new Decimal(point.grossMonthlyEur)
      .div(new Decimal(averageIndex).div(100))
      .toDecimalPlaces(0)
      .toNumber();

    series.push({
      quarter: point.quarter,
      nominalEur: point.grossMonthlyEur,
      realEur: real,
    });
  }

  series.sort((a, b) => a.quarter.localeCompare(b.quarter));

  if (series.length === 0) {
    return err(upstreamUnavailable("no HICP index overlap for wage series"));
  }

  return ok({ series, estimated: true, note: REAL_WAGE_NOTE });
}
