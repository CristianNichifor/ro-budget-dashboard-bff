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

export interface GdpGrowthPoint {
  /** Year-quarter, e.g. "2026-Q2". */
  quarter: string;
  /** Quarter-on-quarter change, percent (seasonally & calendar adjusted). */
  pctChange: number;
}

export interface GdpGrowthSeries {
  quarterly: GdpGrowthPoint[];
}

export interface GdpPerCapitaPoint {
  year: string;
  /** Purchasing power standard per capita (EU27_2020 base). */
  pps: number;
  /** Volume index, EU27_2020 = 100. */
  eu27Index: number;
}

export interface GdpPerCapitaSeries {
  yearly: GdpPerCapitaPoint[];
}

export interface DebtPoint {
  year: string;
  /** General government consolidated gross debt, percent of GDP. */
  percentGdp: number;
}

export interface DebtSeries {
  yearly: DebtPoint[];
}

export interface TradePoint {
  year: string;
  /** Exports of goods and services, percent of GDP. */
  exportsPctGdp: number;
  /** Imports of goods and services, percent of GDP. */
  importsPctGdp: number;
  /** Exports minus imports, percent of GDP. */
  balancePctGdp: number;
}

export interface TradeSeries {
  yearly: TradePoint[];
}

export interface DemographicPoint {
  year: string;
  /** Population 65+ per 100 persons aged 15–64 (OLDDEP1). */
  oldAgeDependency: number;
}

export interface DemographicSeries {
  yearly: DemographicPoint[];
}
