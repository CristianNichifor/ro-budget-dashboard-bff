/**
 * Justice module: intentional homicide offences, prison population and
 * police officer headcount — all from Eurostat.
 */
export interface HomicidePoint {
  year: string;
  /** Recorded intentional homicide offences (ICCS0101), count. */
  count: number;
}

export interface PrisonPoint {
  year: string;
  /** Actual number of persons held in prison, count. */
  prisoners: number;
}

export interface PolicePoint {
  year: string;
  /** Police officers (ISCO OC5412), count. */
  officers: number;
}

export interface JusticeContext {
  homicides: HomicidePoint[];
  prison: PrisonPoint[];
  police: PolicePoint[];
  /** Eurostat dataset last-updated date, ISO (YYYY-MM-DD). */
  sourceUpdated: string;
}
