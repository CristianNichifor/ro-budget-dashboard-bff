import { err, ok, type Result } from "neverthrow";
import type { AppError } from "../../../../common/errors";
import { upstreamUnavailable } from "../../../../common/errors";
import type {
  LciPoint,
  MonthlyWagePoint,
  MonthlyWageSeries,
  SesAnchor,
} from "../types";

/**
 * INS does not publish the national average monthly wage as a clean JSON
 * series, so this module synthesises an honest estimate instead:
 *
 * - the *level* comes from the Structure of Earnings Survey mean gross
 *   annual earnings (Eurostat, every 4 years), divided by 12;
 * - the *trend* comes from the quarterly labour cost index (LCI, year-on-
 *   year % change), which is chained forwards and backwards from the SES
 *   anchor year.
 *
 * Pure function: no I/O, no floats (plain arithmetic on the upstream
 * numbers), errors via Result.
 */

const QUARTER_RE = /^(\d{4})-Q([1-4])$/;

export const MONTHLY_WAGE_NOTE =
  "Estimare: nivelul mediu anual brut din Ancheta structurală a câștigurilor (Eurostat, la 4 ani), ajustat cu indicele trimestrial al costului muncii. Nu este salariul mediu oficial publicat de INS.";

export function synthesizeMonthlyWage(
  lci: LciPoint[],
  ses: SesAnchor[]
): Result<Omit<MonthlyWageSeries, "sourceUpdated">, AppError> {
  const anchors = [...ses].sort((a, b) => b.year.localeCompare(a.year));
  const latest = anchors[0];
  if (latest === undefined) {
    return err(upstreamUnavailable("no SES anchor for wage synthesis"));
  }

  const anchorYear = Number(latest.year);
  const anchorMonthlyGrossEur = latest.meanGrossEur / 12;

  const pctByQuarter = new Map<string, number>();
  const years = new Set<number>();
  const quartersWithData = new Set<number>();
  for (const point of lci) {
    const match = QUARTER_RE.exec(point.quarter);
    if (match === null) {
      continue;
    }
    pctByQuarter.set(point.quarter, point.pctChange);
    years.add(Number(match[1]));
    quartersWithData.add(Number(match[2]));
  }

  if (years.size === 0) {
    return err(upstreamUnavailable("no LCI points for wage synthesis"));
  }

  const minYear = Math.min(...years);
  const maxYear = Math.max(...years);

  const levels = new Map<string, number>();
  for (const q of [...quartersWithData].sort((a, b) => a - b)) {
    const quarter = String(q);
    levels.set(`${anchorYear}-Q${quarter}`, anchorMonthlyGrossEur);

    for (let y = anchorYear + 1; y <= maxYear; y += 1) {
      const key = `${y}-Q${quarter}`;
      const pct = pctByQuarter.get(key);
      const previous = levels.get(`${y - 1}-Q${quarter}`);
      if (pct === undefined || previous === undefined) {
        break;
      }
      levels.set(key, previous * (1 + pct / 100));
    }

    for (let y = anchorYear - 1; y >= minYear; y -= 1) {
      const nextKey = `${y + 1}-Q${quarter}`;
      const pct = pctByQuarter.get(nextKey);
      const next = levels.get(nextKey);
      if (pct === undefined || next === undefined) {
        break;
      }
      levels.set(`${y}-Q${quarter}`, next / (1 + pct / 100));
    }
  }

  const monthly: MonthlyWagePoint[] = [];
  for (const [quarter, value] of levels) {
    monthly.push({ quarter, grossMonthlyEur: Math.round(value) });
  }
  monthly.sort((a, b) => a.quarter.localeCompare(b.quarter));

  if (monthly.length === 0) {
    return err(upstreamUnavailable("wage synthesis produced no points"));
  }

  return ok({ monthly, estimated: true, note: MONTHLY_WAGE_NOTE });
}
