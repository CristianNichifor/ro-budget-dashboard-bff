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
  sourceUpdated: string;
}

export interface UnemploymentPoint {
  ym: string;
  /** Seasonally adjusted, percent of labour force. */
  rate: number;
}

export interface UnemploymentSeries {
  monthly: UnemploymentPoint[];
  sourceUpdated: string;
}

export interface FxPoint {
  date: string;
  eurRon: number;
}

export interface FxSeries {
  series: FxPoint[];
  sourceUpdated: string;
}

export interface GdpGrowthPoint {
  /** Year-quarter, e.g. "2026-Q2". */
  quarter: string;
  /** Quarter-on-quarter change, percent (seasonally & calendar adjusted). */
  pctChange: number;
}

export interface GdpGrowthSeries {
  quarterly: GdpGrowthPoint[];
  sourceUpdated: string;
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
  sourceUpdated: string;
}

export interface DebtPoint {
  year: string;
  /** General government consolidated gross debt, percent of GDP. */
  percentGdp: number;
}

export interface DebtSeries {
  yearly: DebtPoint[];
  sourceUpdated: string;
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
  sourceUpdated: string;
}

export interface DemographicPoint {
  year: string;
  /** Population 65+ per 100 persons aged 15–64 (OLDDEP1). */
  oldAgeDependency: number;
}

export interface DemographicSeries {
  yearly: DemographicPoint[];
  sourceUpdated: string;
}

export interface DeficitPoint {
  /** Year-quarter, e.g. "2025-Q4". */
  quarter: string;
  /** General government deficit (−)/surplus (+), percent of GDP (GFS). */
  percentGdp: number;
}

export interface DeficitSeries {
  quarterly: DeficitPoint[];
  sourceUpdated: string;
}

export interface EmploymentPoint {
  quarter: string;
  /** Employment rate 20–64, seasonally adjusted, percent. */
  rate: number;
}

export interface EmploymentSeries {
  quarterly: EmploymentPoint[];
  sourceUpdated: string;
}

export interface CurrentAccountPoint {
  quarter: string;
  /** Current account balance, million EUR (negative = deficit). */
  balanceMioEur: number;
}

export interface CurrentAccountSeries {
  quarterly: CurrentAccountPoint[];
  sourceUpdated: string;
}

export interface RatePoint {
  /** Date of the rate observation, ISO YYYY-MM-DD. */
  date: string;
  /** ECB deposit facility rate, percent. */
  depositRate: number;
}

export interface RatesSeries {
  ecb: RatePoint[];
  sourceUpdated: string;
}

export interface GdpRegionPoint {
  /** NUTS2 region code, e.g. "RO11". */
  code: string;
  /** Region display name. */
  label: string;
  /** GDP per inhabitant, PPS, index EU27_2020 = 100. */
  indexEu27: number;
}

export interface GdpRegionsSeries {
  year: string;
  regions: GdpRegionPoint[];
  sourceUpdated: string;
}
