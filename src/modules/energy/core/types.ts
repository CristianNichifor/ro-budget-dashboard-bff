/**
 * Energy module: household electricity prices, the renewables share of
 * gross final energy consumption, and energy import dependency — all from
 * Eurostat.
 */
export interface ElectricityPricePoint {
  /** Half-year period, e.g. "2023-S1". */
  period: string;
  /** Household price, EUR per kWh (all taxes included). */
  eurPerKwh: number;
}

export interface RenewablesPoint {
  year: string;
  /** Share of renewable energy in gross final consumption, percent. */
  pct: number;
}

export interface ImportDependencyPoint {
  year: string;
  /** Energy import dependency (all products), percent of consumption. */
  pct: number;
}

export interface EnergyContext {
  electricity: ElectricityPricePoint[];
  renewables: RenewablesPoint[];
  importDependency: ImportDependencyPoint[];
  /** Eurostat dataset last-updated date, ISO (YYYY-MM-DD). */
  sourceUpdated: string;
}
