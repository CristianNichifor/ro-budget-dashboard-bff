export interface InflationPoint {
  /** Year-month, e.g. "2024-01". */
  ym: string;
  /** Annual rate of change, percent. */
  annualRate: number;
}

export interface InflationSeries {
  /** BNR inflation target (constant since 2013). */
  targetPercent: number;
  monthly: InflationPoint[];
}

export interface UnemploymentPoint {
  ym: string;
  /** Seasonally adjusted, percent of labour force. */
  rate: number;
}

export interface UnemploymentSeries {
  monthly: UnemploymentPoint[];
}

export interface FxPoint {
  date: string;
  eurRon: number;
}

export interface FxSeries {
  series: FxPoint[];
}
