/**
 * Wage context types. The national monthly average wage has no clean
 * public JSON source (INS TEMPO is not a first-class API), so this module
 * serves honest proxies:
 * - the quarterly labour cost index (LCI, % vs same quarter last year)
 * - the 4-yearly Structure of Earnings Survey mean gross annual earnings.
 */
export interface LciPoint {
  quarter: string;
  /** Year-on-year change of the labour cost index, percent. */
  pctChange: number;
}

export interface SesAnchor {
  year: string;
  /** Mean gross annual earnings, EUR (SES, every 4 years). */
  meanGrossEur: number;
}

export interface WageContext {
  lciQuarterly: LciPoint[];
  sesAnchors: SesAnchor[];
  note: string;
  sourceUpdated: string;
}

export interface MonthlyWagePoint {
  /** Year-quarter label, e.g. "2024-Q1". */
  quarter: string;
  /** Estimated mean gross monthly earnings, EUR. */
  grossMonthlyEur: number;
}

export interface MonthlyWageSeries {
  monthly: MonthlyWagePoint[];
  /** Always true: this is a synthesis, not the official INS series. */
  estimated: boolean;
  note: string;
  sourceUpdated: string;
}

export interface HicpIndexPoint {
  /** Year-month, e.g. "2020-01". */
  ym: string;
  /** Harmonised index of consumer prices, 2015 = 100. */
  index: number;
}

export interface RealWagePoint {
  /** Year-quarter, e.g. "2024-Q1". */
  quarter: string;
  /** Estimated mean gross monthly earnings, EUR (current prices). */
  nominalEur: number;
  /** Nominal earnings deflated by the HICP index (2015 = 100), EUR. */
  realEur: number;
}

export interface RealWageSeries {
  series: RealWagePoint[];
  /** Always true: the underlying wage is a synthesis, not the INS series. */
  estimated: boolean;
  note: string;
  sourceUpdated: string;
}
