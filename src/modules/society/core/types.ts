/**
 * Society module: population and social spending (COFOG). Population comes
 * from Eurostat annual data; health and education spending are COFOG
 * functions expressed as percent of GDP.
 */
export interface PopulationPoint {
  year: string;
  /** Total population, persons. */
  population: number;
}

export interface PopulationSeries {
  yearly: PopulationPoint[];
  /** Eurostat dataset last-updated date, ISO (YYYY-MM-DD). */
  sourceUpdated: string;
}

export interface CofogSpendingPoint {
  year: string;
  /** General government spending on the function, percent of GDP. */
  percentGdp: number;
}

export interface SocietySpending {
  health: CofogSpendingPoint[];
  education: CofogSpendingPoint[];
  /** Eurostat dataset last-updated date, ISO (YYYY-MM-DD). */
  sourceUpdated: string;
}

export interface PctPoint {
  year: string;
  /** Percent of the reference population. */
  pct: number;
}

export interface EducationSeries {
  /** Early leavers from education and training, % of population 18–24. */
  earlyLeavers: PctPoint[];
  /** Tertiary educational attainment, % of population 25–34. */
  tertiaryAttainment: PctPoint[];
  /** Eurostat dataset last-updated date, ISO (YYYY-MM-DD). */
  sourceUpdated: string;
}

export interface HealthSeries {
  /** Practising physicians, number. */
  physicians: { year: string; count: number }[];
  /** Eurostat dataset last-updated date, ISO (YYYY-MM-DD). */
  sourceUpdated: string;
}

export interface DemographicsSeries {
  /** Median age of the population, years. */
  medianAge: { year: string; age: number }[];
  /** Crude rate of net migration, per 1 000 persons. */
  netMigration: { year: string; per1000: number }[];
  /** Eurostat dataset last-updated date, ISO (YYYY-MM-DD). */
  sourceUpdated: string;
}
