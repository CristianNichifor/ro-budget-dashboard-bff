/**
 * Labour module: NEET rate, youth unemployment and the job vacancy rate —
 * all from Eurostat.
 */
export interface NeetPoint {
  year: string;
  /** Share of 15–29-year-olds not in employment, education or training, %. */
  pct: number;
}

export interface YouthUnemploymentPoint {
  /** Year-month, e.g. "2024-01". */
  ym: string;
  /** Unemployment rate under 25, seasonally adjusted, %. */
  rate: number;
}

export interface VacancyPoint {
  /** Year-quarter, e.g. "2024-Q1". */
  quarter: string;
  /** Job vacancy rate (all NACE B-S), seasonally adjusted, %. */
  pct: number;
}

export interface LabourContext {
  neet: NeetPoint[];
  youthUnemployment: YouthUnemploymentPoint[];
  vacancies: VacancyPoint[];
  /** Eurostat dataset last-updated date, ISO (YYYY-MM-DD). */
  sourceUpdated: string;
}
